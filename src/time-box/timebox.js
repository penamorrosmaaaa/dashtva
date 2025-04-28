/***************************************
 * App.js (React + Firebase Firestore)
 ***************************************/
import React, { useState, useEffect } from "react";
import { Bar, Pie } from "react-chartjs-2";
import Confetti from "react-confetti";
import { FaEllipsisH, FaGripVertical, FaTrash } from "react-icons/fa";

import {
  Chart as ChartJS,
  BarElement,
  CategoryScale,
  LinearScale,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from "chart.js";
import CategoryBuilderTable from "./CategoryBuilderTable";
import "./App.css";
import { initializeApp } from "firebase/app";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
} from "firebase/firestore";

import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';

// Newly created Chat component
import Chat from "./Chat";

// NEW: Import the reports modal from Reports.js
import ReportsModal from "./Reports";


// 2) Your Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyCR9IO7GQ...",
  authDomain: "my-timebox-project.firebaseapp.com",
  projectId: "my-timebox-project",
  storageBucket: "my-timebox-project.appspot.com",
  messagingSenderId: "338798659890",
  appId: "1:338798659890:web:7681a1e4fdb7e86425af2b",
  measurementId: "G-E4DJTTLEWE",
};

// 3) Initialize Firebase
const app = initializeApp(firebaseConfig);
// 4) Initialize Firestore
const db = getFirestore(app);

// Register Chart.js components
ChartJS.register(
  BarElement,
  CategoryScale,
  LinearScale,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

/** Helpers for date/time formatting */
function getNextDay(date) {
  let d = new Date(date);
  do {
    d.setDate(d.getDate() + 1);
  } while (d.getDay() === 0 || d.getDay() === 6);
  return d;
}
function getPrevDay(date) {
  let d = new Date(date);
  do {
    d.setDate(d.getDate() - 1);
  } while (d.getDay() === 0 || d.getDay() === 6);
  return d;
}
export function formatDate(date) {
  if (!(date instanceof Date) || isNaN(date)) return "";
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
export function formatTime(hour, minute) {
  let suffix = "AM";
  let displayHour = hour;
  if (hour === 0) displayHour = 12;
  else if (hour === 12) suffix = "PM";
  else if (hour > 12) {
    displayHour = hour - 12;
    suffix = "PM";
  }
  const minStr = minute === 0 ? "00" : String(minute).padStart(2, "0");
  return `${displayHour}:${minStr} ${suffix}`;
}
export function getQuarterHourSlots(startHour, endHour) {
  const slots = [];
  if (startHour >= endHour) return slots;
  for (let h = startHour; h < endHour; h++) {
    for (let m = 0; m < 60; m += 30) {
      slots.push({ hour: h, minute: m });
    }
  }
  slots.push({ hour: endHour, minute: 0 });
  return slots;
}

/**
 * Helper: Ensure that the day's object in the timeBox has the full structure.
 * This makes sure that properties like priorities, brainDump, schedule, etc.,
 * are defined and in the proper format.
 */
function ensureDayStructure(draft, dateStr) {
  if (!draft.timeBox) draft.timeBox = {};
  if (!draft.timeBox[dateStr]) {
    draft.timeBox[dateStr] = {
      priorities: [],
      brainDump: [],
      schedule: {},
      homeOffice: false,
      vacation: false,
      confettiShown: false,
      startHour: draft.defaultStartHour || 7,
      endHour: draft.defaultEndHour || 23,
    };
  } else {
    const day = draft.timeBox[dateStr];
    if (!Array.isArray(day.priorities)) day.priorities = [];
    if (!Array.isArray(day.brainDump)) day.brainDump = [];
    if (!day.schedule || typeof day.schedule !== 'object') day.schedule = {};
    if (typeof day.startHour !== "number") day.startHour = draft.defaultStartHour || 7;
    if (typeof day.endHour !== "number") day.endHour = draft.defaultEndHour || 23;
    if (typeof day.confettiShown !== "boolean") day.confettiShown = false;
    if (typeof day.homeOffice !== "boolean") day.homeOffice = false;
    if (typeof day.vacation !== "boolean") day.vacation = false;
  }
}

/** Google Sheet constants and sync function remain unchanged */
const GOOGLE_SHEET_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vS4qcyZ0P11t2tZ6SDAr10nIBP9twgHq2weqhR0kTu47BWox5-nW3_gYF2zplWNDAFa807qASM0D3S5/pubhtml";
const SHEET_NAMES = ["Charly", "Gudino", "Gabriel", "Cindy"];
async function syncUsersFromSheet() {
  try {
    const res = await fetch(GOOGLE_SHEET_URL);
    const html = await res.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    const tables = doc.querySelectorAll("table");
    const syncedUsers = {};

    tables.forEach((table, tableIndex) => {
      const sheetName = SHEET_NAMES[tableIndex] || `Sheet${tableIndex + 1}`;
      const rows = table.querySelectorAll("tr");
      for (let r = 1; r < rows.length; r++) {
        const cells = rows[r].querySelectorAll("td");
        if (cells.length < 2) return;
        const empNumber = cells[0].textContent.trim();
        const fullName = cells[1].textContent.trim();
        if (!fullName) return;
        const username = fullName.toLowerCase();
        const adminNumbers = ["1050028", "1163755", "60092284", "1129781"];
        let role = "employee";
        let allowedAreas = [];
        if (adminNumbers.includes(empNumber)) {
          role = "admin";
          const adminAllowedAreasMap = {
            "1050028": ["Gudino"],
            "1163755": ["Gabriel"],
            "60092284": ["Cindy"],
            "1129781": ["Charly"],
          };
          allowedAreas = adminAllowedAreasMap[empNumber] || [];
        }
        const userObj = {
          role,
          password: empNumber,
          fullName,
          sheet: sheetName,
          ...(role === "admin"
            ? { allowedAreas }
            : { area: sheetName.toLowerCase() }),
          defaultStartHour: 7,
          defaultEndHour: 23,
          defaultPreset: { start: 7, end: 23 },
        };

        if (!syncedUsers[username]) {
          syncedUsers[username] = userObj;
          saveUserToFirestore(userObj);
        }
      }
    });
    return syncedUsers;
  } catch (err) {
    console.error("Error syncing users from sheet:", err);
    return {};
  }
}

/** 
 * Load the user's doc from Firestore.
 */
async function loadUserFromFirestore(userObj) {
  const key = userObj.fullName.toLowerCase();
  const docRef = doc(db, "users", key);
  console.log("Loading from Firestore, doc ID:", key);

  try {
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      console.log("Firestore doc found for:", key, data);
      Object.assign(userObj, data);
      if (!userObj.timeBox) userObj.timeBox = {};
      if (typeof userObj.defaultStartHour !== "number") {
        userObj.defaultStartHour = 7;
        userObj.defaultPreset = { start: 7, end: 23 };
      }
      if (typeof userObj.defaultEndHour !== "number") {
        userObj.defaultEndHour = 23;
        if (!userObj.defaultPreset) userObj.defaultPreset = {};
        userObj.defaultPreset.end = 23;
      }
    } else {
      console.warn("No Firestore doc found for:", key);
      if (!userObj.timeBox) userObj.timeBox = {};
    }
  } catch (err) {
    console.error("Error loading user from Firestore:", err);
  }
  return userObj;
}

/** 
 * Save the user's data to Firestore without erasing old timeBox days.
 */
async function saveUserToFirestore(userObj) {
  if (!userObj?.fullName) {
    console.error("User object is missing fullName!");
    return;
  }
  const key = userObj.fullName.toLowerCase();
  const docRef = doc(db, "users", key);

  try {
    let existingDoc = {};
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      existingDoc = snap.data();
    }

    const oldTimeBox = existingDoc.timeBox || {};
    const newTimeBox = userObj.timeBox || {};
    const mergedTimeBox = { ...oldTimeBox, ...newTimeBox };

    const finalData = {
      ...existingDoc,
      ...userObj,
      timeBox: mergedTimeBox,
    };

    await setDoc(docRef, finalData, { merge: true });
    console.log(`User "${key}" saved to Firestore successfully (merge=true).`);
  } catch (error) {
    console.error("Error saving user to Firestore:", error);
  }
}

/** 
 * Load a category tree from Firestore.
 *
 * UPDATED: When an employee logs in, we now try to find an admin
 * whose allowedAreas (in lowercase) include the employee's area.
 * If found, the category tree is loaded from that admin's key.
 */
async function loadCategoryTreeForUser(user, syncedUsers) {
  let adminKey;
  if (user.role === "admin") {
    adminKey = user.fullName.toLowerCase();
  } else {
    const userArea = user.area ? user.area.toLowerCase() : "";
    // Look for an admin in syncedUsers whose allowedAreas include userArea.
    const admin = Object.values(syncedUsers).find(
      (u) =>
        u.role === "admin" &&
        u.allowedAreas &&
        u.allowedAreas.map((a) => a.toLowerCase()).includes(userArea)
    );
    if (admin) {
      adminKey = admin.fullName.toLowerCase();
    } else {
      adminKey = user.area ? user.area.toLowerCase() : "";
    }
  }
  const catDocRef = doc(db, "categoryTrees", adminKey);
  const docSnap = await getDoc(catDocRef);
  if (docSnap.exists()) {
    return docSnap.data().tree;
  }
  return []; // default empty tree
}
async function saveCategoryTreeForUser(user, tree) {
  let adminKey;
  if (user.role === "admin") {
    adminKey = user.fullName.toLowerCase();
  } else {
    adminKey = user.area.toLowerCase();
  }
  const catDocRef = doc(db, "categoryTrees", adminKey);
  await setDoc(catDocRef, { tree }, { merge: true });
}

/** 
 * HierarchicalSelect component for picking categories in nested form.
 */
function HierarchicalSelect({ categoryTree, onChange, value, viewMode }) {
  const [selectedPath, setSelectedPath] = useState([]);
  const [otherValue, setOtherValue] = useState("");
  const [isOther, setIsOther] = useState(false);

  useEffect(() => {
    if (!value || value === "Select") {
      setSelectedPath([]);
      setOtherValue("");
      setIsOther(false);
      return;
    }
    const chain = value.split(" / ");
    let nodes = categoryTree || [];
    let matchedAll = true;
    const tempPath = [];
    for (let part of chain) {
      const found = nodes.find(
        (n) => n.name === part || n.name.startsWith("Other:")
      );
      if (!found && !part.startsWith("Other:") && part !== "Other") {
        matchedAll = false;
        break;
      }
      tempPath.push(part);
      const nodeObj = nodes.find((x) => x.name === part);
      if (!nodeObj) continue;
      nodes = nodeObj.children || [];
    }
    if (!matchedAll) {
      setIsOther(true);
      setOtherValue(value);
      setSelectedPath([]);
    } else {
      setIsOther(tempPath.some((x) => x === "Other" || x.startsWith("Other:")));
      setOtherValue(tempPath.find((x) => x.startsWith("Other:")) || "");
      setSelectedPath(tempPath);
    }
  }, [value, categoryTree]);

  function getOptions(nodes) {
    const base = ["Select"];
    nodes.forEach((n) => base.push(n.name));
    base.push("Other");
    return base;
  }

  function handleSelectChange(level, sel) {
    if (viewMode) return;
    if (sel === "Select") {
      setIsOther(false);
      setSelectedPath(selectedPath.slice(0, level));
      onChange("");
      return;
    }
    if (sel === "Other") {
      const newPath = [...selectedPath.slice(0, level), "Other"];
      setIsOther(true);
      setSelectedPath(newPath);
      onChange(newPath.join(" / "));
      return;
    }
    const newPath = [...selectedPath.slice(0, level), sel];
    setIsOther(false);
    setOtherValue("");
    setSelectedPath(newPath);
    onChange(newPath.join(" / "));
  }

  let dropdowns = [];
  let nodes = categoryTree || [];
  for (let lvl = 0; lvl <= selectedPath.length; lvl++) {
    const sel = selectedPath[lvl] || "Select";
    const opts = getOptions(nodes);
    dropdowns.push(
      <select
        key={lvl}
        value={sel}
        disabled={viewMode}
        onChange={(e) => handleSelectChange(lvl, e.target.value)}
      >
        {opts.map((o, i) => (
          <option key={i} value={o}>
            {o}
          </option>
        ))}
      </select>
    );
    if (sel === "Select" || sel === "Other" || sel.startsWith("Other:"))
      break;
    const found = nodes.find((n) => n.name === sel);
    if (!found || !found.children || found.children.length === 0) break;
    nodes = found.children;
  }

  return (
    <div>
      {dropdowns}
      {isOther && (
        <input
          type="text"
          value={otherValue.replace(/^Other:\s*/, "")}
          disabled={viewMode}
          onChange={(e) => {
            if (!viewMode) {
              const typed = e.target.value;
              setOtherValue("Other: " + typed);
              const newChain = [
                ...selectedPath.slice(0, -1),
                "Other: " + typed,
              ].join(" / ");
              onChange(newChain);
            }
          }}
          style={{ marginLeft: 5 }}
        />
      )}
    </div>
  );
}

/** 
 * CategoryBuilder component for editing the category tree.
 */
function CategoryBuilder({ initialTree, onSave, onCancel }) {
  const [tree, setTree] = useState(initialTree || []);

  function renderCategoryList(categories, updateFn) {
    return categories.map((cat, idx) => (
      <div key={cat.id || idx} style={{ marginLeft: "20px", marginTop: "5px" }}>
        <input
          type="text"
          value={cat.name}
          onChange={(e) => {
            const newCat = { ...cat, name: e.target.value };
            const newCategories = [...categories];
            newCategories[idx] = newCat;
            updateFn(newCategories);
          }}
          placeholder="Category name"
        />
        <button onClick={() => {
          const newCategories = categories.filter((_, i) => i !== idx);
          updateFn(newCategories);
        }}>Delete</button>
        <div>
          {cat.children && renderCategoryList(cat.children, (newChildList) => {
            const newCat = { ...cat, children: newChildList };
            const newCategories = [...categories];
            newCategories[idx] = newCat;
            updateFn(newCategories);
          })}
        </div>
        <button onClick={() => {
          const newCat = { id: Date.now(), name: "", children: [] };
          const newChildren = cat.children ? [...cat.children, newCat] : [newCat];
          const updatedCat = { ...cat, children: newChildren };
          const newCategories = [...categories];
          newCategories[idx] = updatedCat;
          updateFn(newCategories);
        }}>Add Subcategory</button>
      </div>
    ));
  }

  return (
    <div style={{ border: "1px solid #ccc", padding: "10px", marginTop: "10px" }}>
      <h3>Category Builder</h3>
      <div>{renderCategoryList(tree, setTree)}</div>
      <button onClick={() => {
        const newMainCat = { id: Date.now(), name: "", children: [] };
        setTree([...tree, newMainCat]);
      }}>Add Main Category</button>
      <div style={{ marginTop: "10px" }}>
        <button onClick={() => onSave(tree)}>Save Categories</button>
        <button onClick={onCancel} style={{ marginLeft: "5px" }}>Cancel</button>
      </div>
    </div>
  );
}

/* Helper: Check if a day's data has any user-entered content. */
function dayHasContent(day) {
  const hasPriorities =
    day.priorities && day.priorities.some((p) => p.text && p.text.trim() !== "");
  const hasBrainDump =
    day.brainDump && day.brainDump.some((b) => b.text && b.text.trim() !== "");
  const hasSchedule =
    day.schedule &&
    Object.values(day.schedule).some((entry) => {
      if (Array.isArray(entry)) {
        return entry.some((e) => e.text && e.text.trim() !== "");
      }
      return entry.text && entry.text.trim() !== "";
    });
  return hasPriorities || hasBrainDump || hasSchedule;
}

/** 
 * ScheduleSlot component – single schedule slot row.
 */
function ScheduleSlot({
  label,
  scheduleEntry,
  updateEntry,
  viewMode,
  categoryTree,
  slotIndex,
  taskIndex,
  onDragRange,
  allTasks,
  onRemove,
}) {
  const [showRepeatOptions, setShowRepeatOptions] = useState(false);
  const repeatVal = scheduleEntry.repeat || "none";

  const handleTextChange = (val) => {
    if (viewMode) return;
    updateEntry({ ...scheduleEntry, text: val });
  };
  const handleRepeatChange = (val) => {
    if (viewMode) return;
    updateEntry({ ...scheduleEntry, repeat: val });
  };

  return (
    <div
      className="schedule-slot"
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        if (window.dragData && window.dragData.startIndex !== undefined) {
          onDragRange(
            window.dragData.startIndex,
            slotIndex,
            window.dragData.allTasks
          );
        }
      }}
    >
      <div style={{ flexGrow: 1, display: "flex", alignItems: "center" }}>
        {categoryTree && categoryTree.length > 0 ? (
          <HierarchicalSelect
            categoryTree={categoryTree}
            onChange={handleTextChange}
            value={scheduleEntry.text || ""}
            viewMode={viewMode}
          />
        ) : (
          <input
            type="text"
            disabled={viewMode}
            value={scheduleEntry.text || ""}
            onChange={(e) => handleTextChange(e.target.value)}
          />
        )}
        {!viewMode && (
          <FaTrash
            size={16}
            style={{ cursor: "pointer", marginLeft: 8 }}
            onClick={onRemove}
          />
        )}
      </div>

      <div style={{ marginLeft: 5, position: "relative" }}>
        <FaEllipsisH
          size={20}
          style={{
            cursor: viewMode ? "not-allowed" : "pointer",
            opacity: viewMode ? 0.5 : 1
          }}
          onClick={() => {
            if (!viewMode) setShowRepeatOptions(!showRepeatOptions);
          }}
        />
        {showRepeatOptions && (
          <div
            style={{
              position: "absolute",
              top: "100%",
              right: 0,
              backgroundColor: "#fff",
              border: "1px solid #ccc",
              padding: "5px",
              zIndex: 999,
            }}
          >
            {["none", "daily", "weekly", "monthly"].map((r) => (
              <label key={r} style={{ display: "block" }}>
                <input
                  type="radio"
                  name={`repeat-${label}`}
                  disabled={viewMode}
                  checked={repeatVal === r}
                  onChange={() => handleRepeatChange(r)}
                />
                {r}
              </label>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}


/**
 * Update a range of schedule slots via drag.
 */
function updateScheduleRange(startIndex, endIndex, allTasks, canViewAgenda, viewMode, updateActiveData, quarterSlots, currentDateStr) {
  if (!canViewAgenda || viewMode) return;
  const start = Math.min(startIndex, endIndex);
  const end = Math.max(startIndex, endIndex);
  updateActiveData((draft) => {
    ensureDayStructure(draft, currentDateStr);
    for (let i = start; i <= end; i++) {
      const slot = quarterSlots[i];
      if (!slot) continue;
      const slotLabel = formatTime(slot.hour, slot.minute);
      draft.timeBox[currentDateStr].schedule[slotLabel] = [...allTasks];
    }
  });
}

/** 
 * Main App Component
 */
export default function App() {
  const [loggedInUser, setLoggedInUser] = useState(null);
  const [displayUser, setDisplayUser] = useState(null);
  const [syncedUsers, setSyncedUsers] = useState({});
  const [categoryTree, setCategoryTree] = useState([]);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [currentDate, setCurrentDate] = useState(new Date());
  const currentDateStr = formatDate(currentDate);
  const [showConfetti, setShowConfetti] = useState(false);
  const [targetUser, setTargetUser] = useState("");
  const [viewingTarget, setViewingTarget] = useState(false);
  const [viewMode, setViewMode] = useState(false);
  const [showReports, setShowReports] = useState(false);
  const [reportRange, setReportRange] = useState("daily");
  const [calendarView, setCalendarView] = useState("daily");


  // NEW: State variables for report baseline and custom range
  const [reportBaselineDate, setReportBaselineDate] = useState(new Date());
  const [customRangeStart, setCustomRangeStart] = useState(formatDate(new Date()));
  const [customRangeEnd, setCustomRangeEnd] = useState(formatDate(new Date()));

  // NEW: State for showing the category builder (for admins)
  const [showCategoryBuilder, setShowCategoryBuilder] = useState(false);

  const isLoggedIn = !!loggedInUser && loggedInUser.password === password;
  const isAdmin = isLoggedIn && loggedInUser.role === "admin";
  const activeData = viewingTarget && displayUser ? displayUser : loggedInUser;
  const canViewAgenda = !!activeData && isLoggedIn;

  useEffect(() => {
    const storedUser = localStorage.getItem("username");
    const storedPass = localStorage.getItem("password");
    if (storedUser && storedPass) {
      setUsername(storedUser);
      setPassword(storedPass);
      if (!loggedInUser) {
        setTimeout(() => handleLogin(), 50);
      }
    }
  }, []);

  const dayObj = canViewAgenda ? (activeData.timeBox[currentDateStr] || {}) : {};
  const {
    startHour = 7,
    endHour = 23,
    priorities = [],
    brainDump = [],
    homeOffice = false,
    vacation = false,
  } = dayObj;

  const totalIncomplete =
    priorities.filter((p) => !p.completed).length +
    brainDump.filter((b) => !b.completed).length;

  function updateActiveData(fn) {
    if (!activeData) return;
    let copy;
    if (viewingTarget) {
      copy = { ...displayUser, timeBox: { ...displayUser.timeBox } };
    } else {
      copy = { ...loggedInUser, timeBox: { ...loggedInUser.timeBox } };
    }
    const originallyExisted =
      copy.timeBox && copy.timeBox[currentDateStr] !== undefined;
    fn(copy);
    if (copy.timeBox && copy.timeBox[currentDateStr]) {
      if (!originallyExisted && !dayHasContent(copy.timeBox[currentDateStr])) {
        delete copy.timeBox[currentDateStr];
      }
    }
    if (viewingTarget) {
      setDisplayUser(copy);
    } else {
      setLoggedInUser(copy);
    }
    if (!viewMode) {
      saveUserToFirestore(copy);
    }
  }

  useEffect(() => {
    async function init() {
      const users = await syncUsersFromSheet();
      setSyncedUsers(users);
    }
    init();
  }, []);

  // Load user record and category tree.
  async function loadUserRecord(record, isEmployeeView) {
    try {
      const updatedRecord = await loadUserFromFirestore(record);
      if (!isEmployeeView) {
        setLoggedInUser(updatedRecord);
        setDisplayUser(updatedRecord);
        setViewingTarget(false);
      } else {
        setDisplayUser(updatedRecord);
        setViewingTarget(true);
      }
      setViewMode(isEmployeeView);
      setMessage("");
      // Pass syncedUsers so that the admin lookup works correctly.
      const tree = await loadCategoryTreeForUser(updatedRecord, syncedUsers);
      setCategoryTree(tree);
      if (updatedRecord.password !== password && !isEmployeeView) {
        setMessage("Incorrect password (or blank if brand-new user).");
      }
      return updatedRecord;
    } catch (err) {
      console.error("Error loading user from Firestore:", err);
      if (!isEmployeeView) {
        setLoggedInUser(record);
        setDisplayUser(record);
        setViewingTarget(false);
      } else {
        setDisplayUser(record);
        setViewingTarget(true);
      }
      setViewMode(isEmployeeView);
      setMessage("Could not fetch from Firestore, using local fallback.");
      return record;
    }
  }

  useEffect(() => {
    if (!displayUser) return;
    if (viewMode) return;
    saveUserToFirestore(displayUser);
  }, [displayUser, viewMode]);

  useEffect(() => {
    if (!loggedInUser) return;
    if (viewMode && viewingTarget) return;
    saveUserToFirestore(loggedInUser);
  }, [loggedInUser, viewMode, viewingTarget]);

  function getUserRecord(uname) {
    const norm = uname.trim().toLowerCase();
    const user = syncedUsers[norm];
    if (!user) return null;
    return {
      ...user,
      timeBox: user.timeBox || {},
      defaultStartHour: user.defaultStartHour ?? 7,
      defaultEndHour: user.defaultEndHour ?? 23,
      defaultPreset: {
        start: user.defaultStartHour ?? 7,
        end: user.defaultEndHour ?? 23,
      },
    };
  }

  async function handleLogin() {
    if (!username) {
      setMessage("Please enter a username.");
      return;
    }
    const record = getUserRecord(username);
    if (!record) {
      setMessage("User not recognized. Check spelling of the full name from your sheet.");
      return;
    }
    await loadUserRecord(record, false);
    localStorage.setItem("username", username);
    localStorage.setItem("password", password);
  }

  async function handleLoadEmployee() {
    if (!targetUser) return;
    let employeeRecord = getUserRecord(targetUser);
    if (!employeeRecord) {
      employeeRecord = {
        role: "employee",
        password: "",
        fullName: targetUser,
        sheet: "UnknownSheet",
        timeBox: {},
        defaultStartHour: 7,
        defaultEndHour: 23,
        defaultPreset: { start: 7, end: 23 },
      };
    }
    await loadUserRecord(employeeRecord, true);
    setMessage(`Loaded agenda for ${targetUser}`);
  }

  function handleBackToMyAgenda() {
    setDisplayUser(loggedInUser);
    setViewingTarget(false);
    setViewMode(false);
    setMessage("Back to your agenda.");
    loadCategoryTreeForUser(loggedInUser, syncedUsers).then((tree) => setCategoryTree(tree));
  }

  // PRIORITIES FUNCTIONS
  function addPriority() {
    if (!canViewAgenda || viewMode) return;
    updateActiveData((draft) => {
      ensureDayStructure(draft, currentDateStr);
      draft.timeBox[currentDateStr].priorities.push({
        text: "",
        completed: false,
        priority: "medium",
      });
    });
  }
  function togglePriorityCompleted(idx) {
    if (!canViewAgenda || viewMode) return;
    updateActiveData((draft) => {
      ensureDayStructure(draft, currentDateStr);
      draft.timeBox[currentDateStr].priorities[idx].completed =
        !draft.timeBox[currentDateStr].priorities[idx].completed;
    });
  }
  function updatePriorityText(idx, txt) {
    if (!canViewAgenda || viewMode) return;
    updateActiveData((draft) => {
      ensureDayStructure(draft, currentDateStr);
      draft.timeBox[currentDateStr].priorities[idx].text = txt;
    });
  }
  function removePriority(idx) {
    if (!canViewAgenda || viewMode) return;
    updateActiveData((draft) => {
      ensureDayStructure(draft, currentDateStr);
      draft.timeBox[currentDateStr].priorities.splice(idx, 1);
    });
  }
  function updatePriorityLevel(idx, level) {
    if (!canViewAgenda || viewMode) return;
    updateActiveData((draft) => {
      ensureDayStructure(draft, currentDateStr);
      draft.timeBox[currentDateStr].priorities[idx].priority = level;
      const levels = { high: 3, medium: 2, low: 1 };
      draft.timeBox[currentDateStr].priorities.sort((a, b) => {
        return levels[b.priority || "medium"] - levels[a.priority || "medium"];
      });
    });
  }

  // BRAIN DUMP FUNCTIONS
  function addBrainDumpItem() {
    if (!canViewAgenda || viewMode) return;
    updateActiveData((draft) => {
      ensureDayStructure(draft, currentDateStr);
      draft.timeBox[currentDateStr].brainDump.push({
        text: "",
        completed: false,
      });
    });
  }
  function toggleBrainDumpCompleted(i) {
    if (!canViewAgenda || viewMode) return;
    updateActiveData((draft) => {
      ensureDayStructure(draft, currentDateStr);
      draft.timeBox[currentDateStr].brainDump[i].completed =
        !draft.timeBox[currentDateStr].brainDump[i].completed;
    });
  }
  function updateBrainDumpText(i, txt) {
    if (!canViewAgenda || viewMode) return;
    updateActiveData((draft) => {
      ensureDayStructure(draft, currentDateStr);
      draft.timeBox[currentDateStr].brainDump[i].text = txt;
    });
  }
  function removeBrainDumpItem(i) {
    if (!canViewAgenda || viewMode) return;
    updateActiveData((draft) => {
      ensureDayStructure(draft, currentDateStr);
      draft.timeBox[currentDateStr].brainDump.splice(i, 1);
    });
  }

  // SCHEDULE FUNCTIONS
  function updateScheduleSlot(label, newEntry, index = 0) {
    if (!canViewAgenda || viewMode) return;
    updateActiveData((draft) => {
      ensureDayStructure(draft, currentDateStr);
      if (!draft.timeBox[currentDateStr].schedule[label]) {
        draft.timeBox[currentDateStr].schedule[label] = [newEntry];
      } else {
        if (!Array.isArray(draft.timeBox[currentDateStr].schedule[label])) {
          draft.timeBox[currentDateStr].schedule[label] = [
            draft.timeBox[currentDateStr].schedule[label],
          ];
        }
        draft.timeBox[currentDateStr].schedule[label][index] = newEntry;
      }
    });
  }
  function addScheduleTask(label) {
    if (!canViewAgenda || viewMode) return;
    updateActiveData((draft) => {
      ensureDayStructure(draft, currentDateStr);
      if (!draft.timeBox[currentDateStr].schedule[label]) {
        draft.timeBox[currentDateStr].schedule[label] = [{ text: "", repeat: "none" }];
      } else {
        if (!Array.isArray(draft.timeBox[currentDateStr].schedule[label])) {
          draft.timeBox[currentDateStr].schedule[label] = [
            draft.timeBox[currentDateStr].schedule[label],
          ];
        }
        draft.timeBox[currentDateStr].schedule[label].push({ text: "", repeat: "none" });
      }
    });
  }
  function removeScheduleTask(label, taskIndex) {
    if (!canViewAgenda || viewMode) return;
    updateActiveData((draft) => {
      ensureDayStructure(draft, currentDateStr);
      if (
        draft.timeBox[currentDateStr] &&
        draft.timeBox[currentDateStr].schedule &&
        draft.timeBox[currentDateStr].schedule[label]
      ) {
        if (Array.isArray(draft.timeBox[currentDateStr].schedule[label])) {
          draft.timeBox[currentDateStr].schedule[label].splice(taskIndex, 1);
        } else {
          delete draft.timeBox[currentDateStr].schedule[label];
        }
      }
    });
  }

  // START/END HOUR FUNCTIONS
  function setStartHourVal(h) {
    if (!canViewAgenda || viewMode) return;
    updateActiveData((draft) => {
      draft.defaultStartHour = parseInt(h, 10);
      if (!draft.defaultPreset) draft.defaultPreset = {};
      draft.defaultPreset.start = parseInt(h, 10);
      ensureDayStructure(draft, currentDateStr);
      draft.timeBox[currentDateStr].startHour = parseInt(h, 10);
    });
  }
  function setEndHourVal(h) {
    if (!canViewAgenda || viewMode) return;
    updateActiveData((draft) => {
      draft.defaultEndHour = parseInt(h, 10);
      if (!draft.defaultPreset) draft.defaultPreset = {};
      draft.defaultPreset.end = parseInt(h, 10);
      ensureDayStructure(draft, currentDateStr);
      draft.timeBox[currentDateStr].endHour = parseInt(h, 10);
    });
  }

  useEffect(() => {
    if (!canViewAgenda) return;
    if (totalIncomplete === 0 && (priorities.length > 0 || brainDump.length > 0)) {
      if (!dayObj.confettiShown) {
        setShowConfetti(true);
        updateActiveData((draft) => {
          ensureDayStructure(draft, currentDateStr);
          draft.timeBox[currentDateStr].confettiShown = true;
        });
        setTimeout(() => setShowConfetti(false), 7000);
      }
    } else {
      setShowConfetti(false);
    }
  }, [canViewAgenda, totalIncomplete, priorities, brainDump, dayObj.confettiShown, currentDateStr]);

  useEffect(() => {
    if (!canViewAgenda) return;
    if (viewMode) return;
    updateActiveData((draft) => {
      const ds = currentDateStr;
      ensureDayStructure(draft, ds);
      let today = draft.timeBox[ds];
      if (today.vacation) return;
      const slots = getQuarterHourSlots(today.startHour, today.endHour);
      const yest = new Date(currentDate);
      yest.setDate(yest.getDate() - 1);
      const yStr = formatDate(yest);
      const wAgo = new Date(currentDate);
      wAgo.setDate(wAgo.getDate() - 7);
      const wStr = formatDate(wAgo);
      slots.forEach(({ hour, minute }) => {
        const label = formatTime(hour, minute);
        let currentSlot = today.schedule[label];
        if (!currentSlot) {
          currentSlot = [{}];
          today.schedule[label] = currentSlot;
        } else if (!Array.isArray(currentSlot)) {
          currentSlot = [currentSlot];
          today.schedule[label] = currentSlot;
        }
        if (!currentSlot[0] || !currentSlot[0].text) {
          const ySlot = draft.timeBox[yStr]?.schedule?.[label];
          if (ySlot) {
            const arrYSlot = Array.isArray(ySlot) ? ySlot : [ySlot];
            if (arrYSlot[0] && arrYSlot[0].repeat === "daily" && arrYSlot[0].text) {
              today.schedule[label] = [...arrYSlot];
              return;
            }
          }
          const wSlot = draft.timeBox[wStr]?.schedule?.[label];
          if (wSlot) {
            const arrWSlot = Array.isArray(wSlot) ? wSlot : [wSlot];
            if (arrWSlot[0] && arrWSlot[0].repeat === "weekly" && arrWSlot[0].text) {
              today.schedule[label] = [...arrWSlot];
              return;
            }
          }
        }
      });
      draft.timeBox[ds] = today;
    });
  }, [canViewAgenda, currentDateStr, currentDate, viewMode]);

  const isWeekend = currentDate.getDay() === 0 || currentDate.getDay() === 6;

  return (
    <div className="container" style={{ color: "black" }}>
      {isLoggedIn && showConfetti && (
        <Confetti width={window.innerWidth} height={window.innerHeight} />
      )}

      {/* Render Reports modal for admins */}
      {showReports && isAdmin && (
        <ReportsModal
          activeData={activeData}
          categoryTree={categoryTree}
          currentDate={currentDate}
          startHour={startHour}
          endHour={endHour}
          reportRange={reportRange}
          setReportRange={setReportRange}
          reportBaselineDate={reportBaselineDate}
          setReportBaselineDate={setReportBaselineDate}
          customRangeStart={customRangeStart}
          setCustomRangeStart={setCustomRangeStart}
          customRangeEnd={customRangeEnd}
          setCustomRangeEnd={setCustomRangeEnd}
          onClose={() => setShowReports(false)}
        />
      )}

      {/* LEFT COLUMN */}
      <div className="left-column">
        {isLoggedIn && (
          <div className="animated-title">
            Time Box for {loggedInUser?.fullName}
          </div>
        )}

        {!isLoggedIn && (
          <div className="login-section">
            <label>Username:</label>
            <input
              type="text"
              value={username}
              disabled={isLoggedIn}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Exact fullName from sheet"
            />
            <label>Password:</label>
            <input
              type="password"
              value={password}
              disabled={isLoggedIn}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Employee Number"
            />
            {!isLoggedIn && (
              <button onClick={handleLogin} style={{ marginTop: 5 }}>
                Login
              </button>
            )}
          </div>
        )}

        {message && <div style={{ color: "blue", marginTop: 6 }}>{message}</div>}

        {isLoggedIn && (
          <div
            className={`incomplete-msg ${totalIncomplete > 0 ? "show" : ""}`}
            style={{ marginTop: 10 }}
          >
            {totalIncomplete > 0
              ? `You have ${totalIncomplete} incomplete item(s) today.`
              : "All tasks complete for today!"}
          </div>
        )}

        {canViewAgenda && (
          <div className="section">
          <h3>TOP PRIORITIES</h3>
          {[...priorities]
  .sort((a, b) => {
    const levels = { high: 3, medium: 2, low: 1 };
    return levels[b.priority || "medium"] - levels[a.priority || "medium"];
  })
  .map((p, originalIdx) => (
    <div
      className={`priority-row ${p.completed ? "completed-item" : ""}`}
      key={originalIdx}
      style={{
        borderLeft: `4px solid ${
          p.priority === "high" ? "red" : p.priority === "medium" ? "orange" : "green"
        }`,
        paddingLeft: "5px",
        marginBottom: "5px",
      }}
    >
      <input
        type="checkbox"
        disabled={viewMode}
        checked={p.completed}
        onChange={() => togglePriorityCompleted(originalIdx)}
      />
      <textarea
        className={p.completed ? "completed" : ""}
        disabled={viewMode}
        value={p.text}
        onChange={(e) => {
          updatePriorityText(originalIdx, e.target.value);
          e.target.style.height = 'auto';
          e.target.style.height = (e.target.scrollHeight) + 'px';
        }}
        onFocus={(e) => {
          e.target.style.height = 'auto';
          e.target.style.height = (e.target.scrollHeight) + 'px';
        }}
      />
      <select
        value={p.priority || "medium"}
        disabled={viewMode}
        onChange={(e) => updatePriorityLevel(originalIdx, e.target.value)}
        style={{ marginLeft: "5px" }}
      >
        <option value="high">High</option>
        <option value="medium">Medium</option>
        <option value="low">Low</option>
      </select>
      {!viewMode && (
        <button className="remove-btn" onClick={() => removePriority(originalIdx)}>
          ✕
        </button>
      )}
    </div>
  ))}
          {!viewMode && (
            <button className="add-btn" onClick={addPriority}>
              + Add Priority
            </button>
          )}
        </div>
        )}

        {canViewAgenda && (
          <div className="section">
          <h3>BRAIN DUMP</h3>
          {/* In the brain dump section */}
          {brainDump.map((b, i) => (
  <div className={`brain-dump-row ${b.completed ? "completed-item" : ""}`} key={i}>
    <input
      type="checkbox"
      disabled={viewMode}
      checked={b.completed}
      onChange={() => toggleBrainDumpCompleted(i)}
    />
    <textarea
      className={b.completed ? "completed" : ""}
      disabled={viewMode}
      value={b.text}
      onChange={(e) => {
        updateBrainDumpText(i, e.target.value);
        e.target.style.height = 'auto';
        e.target.style.height = (e.target.scrollHeight) + 'px';
      }}
      onFocus={(e) => {
        e.target.style.height = 'auto';
        e.target.style.height = (e.target.scrollHeight) + 'px';
      }}
    />
    {!viewMode && (
      <button className="remove-btn" onClick={() => removeBrainDumpItem(i)}>
        ✕
      </button>
    )}
  </div>
))}
          {!viewMode && (
            <button className="add-btn" onClick={addBrainDumpItem}>
              + Add Idea
            </button>
          )}
        </div>
        )}

        {isLoggedIn && isAdmin && (
          <div style={{ marginTop: 30 }}>
            <button className="reports-btn" onClick={() => setShowReports(!showReports)}>
              Reports
            </button>
            <div style={{ marginTop: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "10px" }}>
                <select
                  className="reports-btn"
                  value={targetUser}
                  onChange={(e) => setTargetUser(e.target.value)}
                >
                  <option value="">-- Select Employee --</option>
                  {Object.keys(syncedUsers)
                    .filter((uname) => {
                      const emp = syncedUsers[uname];
                      if (!emp || emp.role !== "employee") return false;
                      return (
                        isAdmin &&
                        loggedInUser.allowedAreas &&
                        loggedInUser.allowedAreas.includes(emp.sheet)
                      );
                    })
                    .map((uname) => (
                      <option key={uname} value={uname}>
                        {syncedUsers[uname].fullName} ({syncedUsers[uname].sheet})
                      </option>
                    ))}
                </select>
                <button className="reports-btn" onClick={handleLoadEmployee}>
                  Load Employee Agenda
                </button>
              </div>

              {viewingTarget && (
                <button className="reports-btn" onClick={handleBackToMyAgenda}>
                  Back to My Agenda
                </button>
              )}
            </div>
            {/* Category Builder toggle for admins */}
            <div style={{ marginTop: 10 }}>
              <button 
                className="reports-btn" 
                onClick={() => setShowCategoryBuilder(!showCategoryBuilder)}
              >
                {showCategoryBuilder ? "Close Category Builder" : "Edit Categories"}
              </button>
            </div>
            {showCategoryBuilder && (
              <CategoryBuilderTable
                initialTree={categoryTree}
                onSave={async (newTree) => {
                  setCategoryTree(newTree);
                  await saveCategoryTreeForUser(loggedInUser, newTree);
                  setShowCategoryBuilder(false);
                }}
                onCancel={() => setShowCategoryBuilder(false)}
              />
            )}
          </div>
        )}

        {/* Chat Component */}
        {isLoggedIn && (
          <div style={{ marginTop: "30px" }}>
            <Chat currentUser={loggedInUser} />
          </div>
        )}
      </div>

                        {/* ——— RIGHT COLUMN: Schedule Table ——— */}
      <div
        className="right-column"
        style={{
          border: homeOffice ? "2px solid blue" : "none",
          padding: homeOffice ? "8px" : undefined
        }}
      >
        {canViewAgenda && (
          <>
            {/* Header row */}
            <div
              className="date-row"
              style={{
                display: "flex",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "8px",
                marginBottom: 16,
                fontSize: "0.9rem"
              }}
            >
              <label>Date:</label>
              <input
                type="date"
                value={formatDate(currentDate)}
                onChange={e => {
                  const d = new Date(e.target.value);
                  if (!isNaN(d)) setCurrentDate(d);
                }}
              />
              <button onClick={() => setCurrentDate(getPrevDay(currentDate))}>
                &lt;
              </button>
              <button onClick={() => setCurrentDate(getNextDay(currentDate))}>
                &gt;
              </button>
              <label style={{ marginLeft: 16 }}>
                <input
                  type="checkbox"
                  disabled={viewMode}
                  checked={homeOffice}
                  onChange={e =>
                    updateActiveData(draft => {
                      ensureDayStructure(draft, currentDateStr);
                      draft.timeBox[currentDateStr].homeOffice = e.target.checked;
                    })
                  }
                />{" "}
                Home Office
              </label>
              <label style={{ marginLeft: 16 }}>
                <input
                  type="checkbox"
                  disabled={viewMode}
                  checked={vacation}
                  onChange={e =>
                    updateActiveData(draft => {
                      ensureDayStructure(draft, currentDateStr);
                      draft.timeBox[currentDateStr].vacation = e.target.checked;
                    })
                  }
                />{" "}
                Vacation
              </label>
              <label style={{ marginLeft: 16 }}>
                Start:
                <select
                  value={startHour}
                  onChange={e => setStartHourVal(e.target.value)}
                  disabled={viewMode}
                >
                  {Array.from({ length: 24 }, (_, i) => (
                    <option key={i} value={i}>
                      {i}:00
                    </option>
                  ))}
                </select>
              </label>
              <label>
                End:
                <select
                  value={endHour}
                  onChange={e => setEndHourVal(e.target.value)}
                  disabled={viewMode}
                >
                  {Array.from({ length: 25 }, (_, i) => (
                    <option key={i} value={i}>
                      {i}:00
                    </option>
                  ))}
                </select>
              </label>
              <label style={{ marginLeft: 16 }}>
                View:
                <select
                  value={calendarView}
                  onChange={e => setCalendarView(e.target.value)}
                >
                  <option value="daily">Daily</option>
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </label>
            </div>

            {/* Weekend / Vacation / Daily / Monthly / Yearly */}
            {isWeekend ? (
              <div style={{ color: "red", marginTop: 10 }}>
                This is a weekend. No schedule available.
              </div>
            ) : vacation ? (
              <div style={{ color: "blue", marginTop: 10 }}>
                This day is marked as Vacation. Schedule is blocked.
              </div>
            ) : calendarView === "daily" ? (
              <table className="schedule-table">
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Task / Activity</th>
                  </tr>
                </thead>
                <tbody>
                  {getQuarterHourSlots(startHour, endHour).map(
                    ({ hour, minute }, idx) => {
                      const label = formatTime(hour, minute);
                      const raw =
                        dayObj.schedule?.[label] || [{ text: "", repeat: "none" }];
                      const tasks = Array.isArray(raw) ? raw : [raw];
                      return (
                        <tr key={idx}>
                          <td className="hour-cell">{label}</td>
                          <td>
                            {tasks.map((task, tIdx) => (
                              <ScheduleSlot
                              key={tIdx}
                              label={label}
                              scheduleEntry={task}
                              updateEntry={nv => updateScheduleSlot(label, nv, tIdx)}
                              viewMode={viewMode}
                              categoryTree={categoryTree}
                              slotIndex={idx}
                              taskIndex={tIdx}
                              onDragRange={(s,e,all) =>
                                updateScheduleRange(
                                  s,
                                  e,
                                  all,
                                  canViewAgenda,
                                  viewMode,
                                  updateActiveData,
                                  getQuarterHourSlots(startHour, endHour),
                                  currentDateStr
                                )
                              }
                              allTasks={tasks}
                              onRemove={() => removeScheduleTask(label, tIdx)}
                            />
                            
                            ))}
                            {!viewMode && (
                              <button
                                className="add-task-btn"
                                onClick={() => addScheduleTask(label)}
                              >
                                + Add Task
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    }
                  )}
                </tbody>
              </table>
            ) : calendarView === "monthly" ? (
              <Calendar
                view="month"
                value={currentDate}
                onClickDay={(d) => {
                  setCalendarView("daily");
                  setCurrentDate(d);
                }}
                tileDisabled={({ date, view }) => {
                  if (view !== "month") return false;
                  const key = formatDate(date);
                  const day = activeData.timeBox[key] || {};
                  return date.getDay() === 0 || date.getDay() === 6 || Boolean(day.vacation);
                }}
                tileContent={({ date, view }) => {
                  if (view !== "month") return null;
                  
                  // Skip weekends entirely
                  if (date.getDay() === 0 || date.getDay() === 6) {
                    return null;
                  }
            
                  const key = formatDate(date);
                  const day = activeData.timeBox[key] || {};
                  
                  if (day.vacation) {
                    return <div className="vacation-cell" />;
                  }
            
                  const slots = getQuarterHourSlots(day.startHour || startHour, day.endHour || endHour);
                  let filled = 0;
                  
                  slots.forEach(({ hour, minute }) => {
                    const label = formatTime(hour, minute);
                    const tasks = day.schedule?.[label] || [];
                    const taskArray = Array.isArray(tasks) ? tasks : [tasks];
                    if (taskArray.some(t => t?.text?.trim())) filled++;
                  });
            
                  const percentage = Math.round((filled / slots.length) * 100);
                  const color = `hsl(${percentage}, 80%, 50%)`;
                  
                  return (
                    <div 
                      className="day-cell" 
                      style={{ 
                        backgroundColor: color,
                        border: day.homeOffice ? "2px solid blue" : "none"
                      }}
                    >
                      {percentage}%
                    </div>
                  );
                }}
                formatShortWeekday={(locale, date) => {
                  return date.getDay() === 0 || date.getDay() === 6 ? '' : ['M', 'T', 'W', 'T', 'F'][date.getDay() - 1];
                }}
              />
            ) : (
              // In the yearly Calendar component
              <Calendar
                view="year"
                value={currentDate}
                onClickMonth={(date) => {
                  setCalendarView("monthly");
                  setCurrentDate(date);
                }}
                onDoubleClickYear={({ date }) => {
                  setCalendarView("monthly");
                  setCurrentDate(date);
                }}
                tileContent={({ date, view }) => {
                  if (view !== "year") return null;
                  const month = date.getMonth();
                  let totalSlots = 0;
                  let filledSlots = 0;
                  
                  Object.entries(activeData.timeBox || {}).forEach(([k, day]) => {
                    const dt = new Date(k);
                    if (dt.getMonth() === month && dt.getDay() !== 0 && dt.getDay() !== 6 && !day.vacation) {
                      const timeSlots = getQuarterHourSlots(day.startHour || startHour, day.endHour || endHour);
                      
                      timeSlots.forEach(({ hour, minute }) => {
                        const label = formatTime(hour, minute);
                        const tasks = day.schedule?.[label] ? 
                          (Array.isArray(day.schedule[label]) ? day.schedule[label] : [day.schedule[label]]) : [];
                        
                        totalSlots++;
                        if (tasks.some(t => t.text && t.text.trim() !== "")) {
                          filledSlots++;
                        }
                      });
                    }
                  });
                  
                  const percentage = totalSlots > 0 ? Math.round((filledSlots / totalSlots) * 100) : 0;
                  const color = percentage >= 80 ? "green" : 
                               percentage >= 50 ? "orange" : "red";
                  const label = date.toLocaleString("default", {
                    month: "short"
                  });
                  
                  return (
                    <div style={{ textAlign: "center" }}>
                      <div
                        style={{
                          background: color,
                          borderRadius: 4,
                          padding: "2px 4px",
                          color: "#fff",
                          fontSize: 12,
                          display: "inline-block"
                        }}
                      >
                        {label}
                      </div>
                      <div style={{ fontSize: 10 }}>{percentage}%</div>
                    </div>
                  );
                }}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
