/****************************************************
 * Chat.js - With localStorage-based read tracking
 ****************************************************/
import React, { useState, useEffect, useRef } from "react";
import {
  getFirestore,
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { FaCommentAlt, FaCheck, FaCheckDouble } from "react-icons/fa";
import "./Chat.css";

/** Public Google Sheet URL from your existing code */
const GOOGLE_SHEET_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vS4qcyZ0P11t2tZ6SDAr10nIBP9twgHq2weqhR0kTu47BWox5-nW3_gYF2zplWNDAFa807qASM0D3S5/pubhtml";

/** Known sheet names */
const SHEET_NAMES = ["Charly", "Gudino", "Gabriel", "Cindy"];

/** Duplicate sync logic from App.js to get user fullNames */
async function syncUsersFromSheet() {
  const syncedUsers = {};
  try {
    const res = await fetch(GOOGLE_SHEET_URL);
    const html = await res.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    const tables = doc.querySelectorAll("table");

    tables.forEach((table, tableIndex) => {
      const sheetName = SHEET_NAMES[tableIndex] || `Sheet${tableIndex + 1}`;
      const rows = table.querySelectorAll("tr");
      for (let r = 1; r < rows.length; r++) {
        const cells = rows[r].querySelectorAll("td");
        if (cells.length < 2) continue;
        const empNumber = cells[0].textContent.trim();
        const fullName = cells[1].textContent.trim();
        if (!fullName) continue;

        const username = fullName.toLowerCase();
        if (!syncedUsers[username]) {
          syncedUsers[username] = { fullName, empNumber };
        }
      }
    });
  } catch (err) {
    console.error("Error syncing users from sheet (Chat.js):", err);
  }
  return syncedUsers;
}

/** Format Firestore timestamp "like WhatsApp" */
function formatTimestamp(timestamp) {
  if (!timestamp) return "";
  const dateObj = timestamp.toDate ? timestamp.toDate() : timestamp;
  return dateObj.toLocaleString("en-US", {
    dateStyle: "medium", // e.g. "Mar 28, 2025"
    timeStyle: "short",  // e.g. "11:45 AM"
  });
}

export default function Chat({ currentUser }) {
  const db = getFirestore();

  // Toggle the entire chat panel
  const [showChat, setShowChat] = useState(false);

  // All messages from Firestore
  const [allMessages, setAllMessages] = useState([]);

  // For typing new message
  const [newMessage, setNewMessage] = useState("");

  // The conversation we're viewing: "all" or a user’s fullName
  const [recipient, setRecipient] = useState("all");

  // All user names from the Google sheet
  const [allUsers, setAllUsers] = useState([]);

  // For auto-scroll
  const chatEndRef = useRef(null);

  /**
   * knownMessageIds: we store message IDs we've already *seen* so
   * we don't re-increment unread for older messages on snapshot re-fires.
   *
   * We'll load/save these from localStorage so we persist across sessions.
   */
  const [knownMessageIds, setKnownMessageIds] = useState(() => new Set());

  /**
   * unreadCounts: { [conversationKey]: number }
   *  e.g. { "all": 2, "Gabriel": 3, ... }
   */
  const [unreadCounts, setUnreadCounts] = useState({});

  /**
   * readMessageIds: set of message IDs that are "read" locally.
   * We'll also load/save these from localStorage for persistence.
   */
  const [readMessageIds, setReadMessageIds] = useState(() => new Set());

  // 1) Load user list from Google Sheets
  useEffect(() => {
    async function loadUsers() {
      const sheetUsers = await syncUsersFromSheet();
      const names = Object.values(sheetUsers).map((u) => u.fullName);
      names.sort();
      setAllUsers(names);
    }
    loadUsers();
  }, []);

  // 2) On first mount OR when currentUser changes, load known/read message IDs from localStorage
  useEffect(() => {
    if (!currentUser?.fullName) return;

    const userKey = currentUser.fullName.toLowerCase().replace(/\s+/g, "_");
    const knownStr = localStorage.getItem(`knownMsgIds_${userKey}`) || "[]";
    const readStr = localStorage.getItem(`readMsgIds_${userKey}`) || "[]";

    try {
      const knownArr = JSON.parse(knownStr);
      const readArr = JSON.parse(readStr);
      setKnownMessageIds(new Set(knownArr));
      setReadMessageIds(new Set(readArr));
    } catch (err) {
      console.error("Error parsing localStorage read/known IDs:", err);
      setKnownMessageIds(new Set());
      setReadMessageIds(new Set());
    }
  }, [currentUser]);

  // 3) Subscribe to Firestore messages
  useEffect(() => {
    const colRef = collection(db, "chatMessages");
    const q = query(colRef, orderBy("createdAt", "asc"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      // Build a fresh array of all messages
      const loaded = [];
      snapshot.forEach((doc) => {
        loaded.push({ id: doc.id, ...doc.data() });
      });
      setAllMessages(loaded);

      // Process docChanges to find truly new docs
      const changes = snapshot.docChanges();
      changes.forEach((change) => {
        if (change.type === "added") {
          const docId = change.doc.id;
          const msg = change.doc.data();

          // If we already know it or we've read it, skip
          if (knownMessageIds.has(docId) || readMessageIds.has(docId)) {
            return;
          }

          // It's truly new to this user
          setKnownMessageIds((prev) => {
            const newSet = new Set(prev);
            newSet.add(docId);
            persistKnownMessageIds(newSet);
            return newSet;
          });

          // figure out which conversation this message belongs to
          const convKey = getConversationKey(msg, currentUser?.fullName);
          // If it doesn't involve me, do nothing
          if (!convKey) return;

          // If the chat is open AND user is exactly on that conversation,
          // then mark it read right away
          const isChatOpenOnThisConv = showChat && recipient === convKey;
          if (isChatOpenOnThisConv) {
            markMessageAsReadLocally(docId);
          } else {
            // Otherwise increment unread
            incrementUnread(convKey);
          }
        }
      });
    });

    return () => unsubscribe();
    // We specifically watch for changes in `db`, `showChat`, `recipient`,
    // `currentUser`, `knownMessageIds`, `readMessageIds`
  }, [db, showChat, recipient, currentUser, knownMessageIds, readMessageIds]);

  // 4) Build conversation dropdown: "all" plus everyone except me
  const possibleRecipients = [
    "all",
    ...allUsers.filter((u) => u !== currentUser?.fullName && u.trim() !== ""),
  ];

  // 5) Filter messages for display in the current conversation
  const displayedMessages = allMessages.filter((msg) =>
    isMessageVisible(msg, currentUser?.fullName, recipient)
  );

  // 6) Whenever we open the chat or switch conv, mark those displayed messages read
  useEffect(() => {
    if (!showChat) return;

    // Mark everything in displayedMessages as read
    displayedMessages.forEach((msg) => {
      const convKey = getConversationKey(msg, currentUser?.fullName);
      if (convKey === recipient) {
        markMessageAsReadLocally(msg.id);
      }
    });

    // Also set unreadCounts for this conversation to 0
    setUnreadCounts((prev) => ({
      ...prev,
      [recipient]: 0,
    }));
  }, [showChat, recipient, displayedMessages, currentUser]);

  // 7) Whenever messages or conversation changes, auto-scroll
  useEffect(() => {
    if (showChat && chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [allMessages, showChat, recipient]);

  // 8) Send a new message
  async function handleSend(e) {
    e.preventDefault();
    if (!newMessage.trim() || !currentUser?.fullName) return;

    try {
      const docRef = await addDoc(collection(db, "chatMessages"), {
        text: newMessage.trim(),
        sender: currentUser.fullName,
        recipient,
        createdAt: serverTimestamp(),
      });
      setNewMessage("");

      // Mark my own message as read for me
      markMessageAsReadLocally(docRef.id);
    } catch (err) {
      console.error("Error sending chat message:", err);
    }
  }

  // 9) Toggling the chat open/close
  function handleToggleChat() {
    const wasClosed = !showChat;
    setShowChat(!showChat);

    // If we are about to open, reset unread for the current conversation
    if (wasClosed) {
      setUnreadCounts((prev) => ({
        ...prev,
        [recipient]: 0,
      }));
      displayedMessages.forEach((msg) => markMessageAsReadLocally(msg.id));
    }
  }

  // HELPER: increment unread for a conversation
  function incrementUnread(conv) {
    setUnreadCounts((prev) => {
      const oldVal = prev[conv] || 0;
      return {
        ...prev,
        [conv]: oldVal + 1,
      };
    });
  }

  // HELPER: mark a message as read locally
  function markMessageAsReadLocally(messageId) {
    setReadMessageIds((prev) => {
      if (prev.has(messageId)) return prev; // already in read set
      const newSet = new Set(prev);
      newSet.add(messageId);
      persistReadMessageIds(newSet);
      return newSet;
    });
  }

  // HELPER: persist known message IDs to localStorage
  function persistKnownMessageIds(newSet) {
    if (!currentUser?.fullName) return;
    const userKey = currentUser.fullName.toLowerCase().replace(/\s+/g, "_");
    localStorage.setItem(
      `knownMsgIds_${userKey}`,
      JSON.stringify(Array.from(newSet))
    );
  }

  // HELPER: persist read message IDs to localStorage
  function persistReadMessageIds(newSet) {
    if (!currentUser?.fullName) return;
    const userKey = currentUser.fullName.toLowerCase().replace(/\s+/g, "_");
    localStorage.setItem(
      `readMsgIds_${userKey}`,
      JSON.stringify(Array.from(newSet))
    );
  }

  // HELPER: total unread across all conversations
  const totalUnread = Object.values(unreadCounts).reduce(
    (sum, x) => sum + (x || 0),
    0
  );

  return (
    <div className="chat-outer-container">
      {/* Toggle Button with red badge for total unread */}
      <button
        className="chat-toggle-btn"
        onClick={handleToggleChat}
        title={showChat ? "Hide Chat" : "Show Chat"}
        style={{ position: "relative" }}
      >
        <FaCommentAlt size={20} />
        {totalUnread > 0 && (
          <span className="notif-badge">{totalUnread}</span>
        )}
      </button>

      {showChat && (
        <div className="chat-container">
          <h4 style={{ marginBottom: "10px" }}>
            {recipient === "all" ? "Team Chat" : `Chat with: ${recipient}`}
          </h4>

          {/* Recipient dropdown. Show (N) if unread */}
          <div style={{ marginBottom: 10 }}>
            <label htmlFor="recipientSelect">Recipient: </label>
            <select
              id="recipientSelect"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
            >
              {possibleRecipients.map((r) => {
                const count = unreadCounts[r] || 0;
                // Only show (N) if not currently viewing that conversation
                const label =
                  r === recipient
                    ? r
                    : count > 0
                    ? `${r} (${count})`
                    : r;
                return (
                  <option key={r} value={r}>
                    {label === "all" ? "Entire Team" : label}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Message list */}
          <div className="chat-messages">
            {displayedMessages.map((msg) => {
              const isMe = msg.sender === currentUser?.fullName;
              const msgTime = formatTimestamp(msg.createdAt);
              const read = readMessageIds.has(msg.id);

              let checkIcon = null;
              // If I'm the sender => always show double-check
              // If I'm the recipient => single-check if !read, double-check if read
              if (isMe) {
                checkIcon = (
                  <FaCheckDouble style={{ marginLeft: 4, fontSize: "0.8em" }} />
                );
              } else {
                checkIcon = read ? (
                  <FaCheckDouble style={{ marginLeft: 4, fontSize: "0.8em" }} />
                ) : (
                  <FaCheck style={{ marginLeft: 4, fontSize: "0.8em" }} />
                );
              }

              return (
                <div
                  key={msg.id}
                  className={isMe ? "chat-bubble me" : "chat-bubble"}
                >
                  {/* Show sender’s name if it's the group chat or if I'm *not* the sender */}
                  {(recipient === "all" || !isMe) && (
                    <div className="sender-name">{msg.sender}</div>
                  )}
                  <div className="message-text">{msg.text}</div>
                  <div className="message-time">
                    {msgTime}
                    {checkIcon}
                  </div>
                </div>
              );
            })}
            <div ref={chatEndRef} />
          </div>

          {/* Input form */}
          <form onSubmit={handleSend} className="chat-input-area">
            <input
              type="text"
              placeholder="Type a message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              className="chat-input"
            />
            <button type="submit" className="chat-send-btn">
              Send
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

/**
 * isMessageVisible: whether a message belongs in the current conversation.
 */
function isMessageVisible(msg, myName, currentConversation) {
  if (!myName) return false;
  // Group conversation => only show if msg.recipient === "all"
  if (currentConversation === "all") {
    return msg.recipient === "all";
  }
  // 1:1 => must be between me & the chosen user
  const isMeSenderAndTheyRecipient =
    msg.sender === myName && msg.recipient === currentConversation;
  const isTheySenderAndMeRecipient =
    msg.sender === currentConversation && msg.recipient === myName;
  return isMeSenderAndTheyRecipient || isTheySenderAndMeRecipient;
}

/**
 * getConversationKey: figure out which conversation this message belongs to
 * if it involves me. If "all" => it's group. If direct => the "other person's name."
 * If it doesn't involve me, return null.
 */
function getConversationKey(msg, myName) {
  if (!myName) return null;
  if (msg.recipient === "all") {
    // group chat => always "all"
    return "all";
  }
  const isMeSender = msg.sender === myName;
  const isMeRecipient = msg.recipient === myName;

  if (isMeSender) {
    // I'm the sender => conversation is with msg.recipient
    return msg.recipient;
  } else if (isMeRecipient) {
    // I'm the recipient => conversation is with msg.sender
    return msg.sender;
  }
  // doesn't involve me
  return null;
}
