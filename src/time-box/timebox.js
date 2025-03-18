/***************************************
 * App.js (React + Firebase Firestore)
 * A single-file version that properly
 * merges the 'timeBox' without erasing
 * historical data on each login.
 ***************************************/
import React, { useState, useEffect } from "react";
import { Bar, Pie } from "react-chartjs-2";
import Confetti from "react-confetti";
import { FaEllipsisH } from "react-icons/fa";
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
import "./App.css";

// 1) Import Firebase & Firestore
import { initializeApp } from "firebase/app";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc
  // or updateDoc if you want partial merges
} from "firebase/firestore";

// 2) Your Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyCR9IO7GQatt5oU33OLxW-vDyEtiZ4Og4I",
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
ChartJS.register(BarElement, CategoryScale, LinearScale, Title, Tooltip, Legend, ArcElement);

/** 
 * Example "public" Google Sheet URL for user info and categories.
 * If you no longer need to fetch from a sheet, remove these references.
 */
const GOOGLE_SHEET_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vS4qcyZ0P11t2tZ6SDAr10nIBP9twgHq2weqhR0kTu47BWox5-nW3_gYF2zplWNDAFa807qASM0D3S5/pubhtml";

// Known sheet names
const SHEET_NAMES = ["Charly", "Cindy", "Gudiño", "Gabriel"];

/** Helpers for date/time formatting */
function getNextDay(date) {
  const d = new Date(date);
  d.setDate(d.getDate() + 1);
  return d;
}
function getPrevDay(date) {
  const d = new Date(date);
  d.setDate(d.getDate() - 1);
  return d;
}
function formatDate(date) {
  if (!(date instanceof Date) || isNaN(date)) return "";
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
function formatTime(hour, minute) {
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
function getQuarterHourSlots(startHour, endHour) {
  const slots = [];
  if (startHour >= endHour) return slots;
  for (let h = startHour; h < endHour; h++) {
    for (let m = 0; m < 60; m += 15) {
      slots.push({ hour: h, minute: m });
    }
  }
  slots.push({ hour: endHour, minute: 0 });
  return slots;
}

/** Build a hierarchy of categories from ID/name/parentId (for your 'HierarchicalSelect'). */
function buildHierarchy(rows) {
  const nodeMap = {};
  rows.forEach((r) => {
    nodeMap[r.id] = { name: r.name, children: [] };
  });
  rows.forEach((r) => {
    if (r.parentId && nodeMap[r.parentId]) {
      nodeMap[r.parentId].children.push(nodeMap[r.id]);
    }
  });
  const roots = [];
  rows.forEach((r) => {
    if (!r.parentId) {
      roots.push(nodeMap[r.id]);
    }
  });
  return roots;
}

/** Fetch categories from each sheet => { "Charly": [...], "Cindy": [...], ... } */
async function fetchCategoriesBySheet() {
  const sheetCatsMap = {};
  try {
    const res = await fetch(GOOGLE_SHEET_URL);
    const html = await res.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    const tables = doc.querySelectorAll("table");

    tables.forEach((table, index) => {
      const sheetName = SHEET_NAMES[index] || `Sheet${index + 1}`;
      const rows = table.querySelectorAll("tr");
      const rawRows = [];
      for (let r = 1; r < rows.length; r++) {
        const cells = rows[r].querySelectorAll("td");
        if (cells.length >= 3) {
          const idStr = cells[2].textContent.trim();
          const nameStr = cells[3]?.textContent.trim() || "";
          const parentStr = cells[4]?.textContent.trim() || "";
          if (idStr && nameStr) {
            const id = parseInt(idStr, 10);
            const parentId = parseInt(parentStr, 10);
            rawRows.push({
              id,
              name: nameStr,
              parentId: isNaN(parentId) ? 0 : parentId,
            });
          }
        }
      }
      sheetCatsMap[sheetName] = buildHierarchy(rawRows);
    });
  } catch (err) {
    console.error("Error fetching categories:", err);
  }
  return sheetCatsMap;
}

/** Sync user info from your Google Sheet. */
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
        if (cells.length < 2) continue;

        const empNumber = cells[0].textContent.trim(); // e.g. "1050028"
        const fullName = cells[1].textContent.trim();  // e.g. "John Smith"
        if (!fullName) continue;

        const username = fullName.toLowerCase();
        // Identify admins
        const adminNumbers = ["1050028", "1163755", "60092284", "1129781"];
        let role = "employee";
        let allowedAreas = [];
        if (adminNumbers.includes(empNumber)) {
          role = "admin";
          const adminAllowedAreasMap = {
            "1050028": ["Cindy"],
            "1163755": ["Gabriel"],
            "60092284": ["Cindy"], // updated for jgudiño
            "1129781": ["Charly"],
          };
          allowedAreas = adminAllowedAreasMap[empNumber] || [];
        }

        // Only define top-level fields here—NOT an empty `timeBox`
        // We'll let Firestore merges handle the rest.
        const userObj = {
          role,
          password: empNumber, // password is the empNumber
          fullName,
          sheet: sheetName,
          ...(role === "admin"
            ? { allowedAreas }
            : { area: sheetName.toLowerCase() }),

          // Provide *defaults* for new users:
          defaultStartHour: 7,
          defaultEndHour: 23,
          defaultPreset: { start: 7, end: 23 },
        };

        // Only save if we haven't seen this user in this run
        if (!syncedUsers[username]) {
          syncedUsers[username] = userObj;
          // If there's no existing doc, this will create it with `merge: true`.
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
 * This ensures we get the *existing* timeBox data, if any.
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

      // Merge everything from Firestore into userObj
      Object.assign(userObj, data);

      // Ensure minimal defaults if missing
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
      // It's a truly new user if doc doesn't exist
      if (!userObj.timeBox) userObj.timeBox = {};
    }
  } catch (err) {
    console.error("Error loading user from Firestore:", err);
  }
  return userObj;
}

/**
 * Save the user's data to Firestore in a way that 
 * does NOT overwrite the entire doc or erase old timeBox days.
 */
async function saveUserToFirestore(userObj) {
  if (!userObj?.fullName) {
    console.error("User object is missing fullName!");
    return;
  }
  const key = userObj.fullName.toLowerCase();
  const docRef = doc(db, "users", key);

  try {
    // 1) Load existing doc so we can preserve older days in timeBox
    let existingDoc = {};
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      existingDoc = snap.data();
    }

    // 2) Merge existing timeBox with userObj.timeBox
    const oldTimeBox = existingDoc.timeBox || {};
    const newTimeBox = userObj.timeBox || {};
    const mergedTimeBox = { ...oldTimeBox, ...newTimeBox };

    // 3) Now build an object with top-level merges
    const finalData = {
      ...existingDoc,
      ...userObj,
      timeBox: mergedTimeBox,
    };

    // 4) Write finalData with { merge: true }
    await setDoc(docRef, finalData, { merge: true });
    console.log(`User "${key}" saved to Firestore successfully (merge=true).`);
  } catch (error) {
    console.error("Error saving user to Firestore:", error);
  }
}

/** HierarchicalSelect component for picking categories in nested form. */
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
      const found = nodes.find((n) => n.name === part);
      if (!found) {
        matchedAll = false;
        break;
      }
      tempPath.push(part);
      nodes = found.children || [];
    }
    if (!matchedAll) {
      setIsOther(true);
      setOtherValue(value);
      setSelectedPath([]);
    } else {
      setIsOther(false);
      setOtherValue("");
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
      setIsOther(true);
      setSelectedPath([...selectedPath.slice(0, level), "Other"]);
      onChange(otherValue);
      return;
    }
    const newPath = [...selectedPath.slice(0, level), sel];
    setSelectedPath(newPath);
    setIsOther(false);
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
    if (sel === "Select" || sel === "Other") break;
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
          value={otherValue}
          disabled={viewMode}
          onChange={(e) => {
            if (!viewMode) {
              setOtherValue(e.target.value);
              onChange(e.target.value);
            }
          }}
          style={{ marginLeft: 5 }}
        />
      )}
    </div>
  );
}

/** Single schedule slot row with category + repeat options. */
function ScheduleSlot({ label, scheduleEntry, updateEntry, viewMode, categoryTree }) {
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
    <div style={{ display: "flex", alignItems: "center" }}>
      <div style={{ flexGrow: 1 }}>
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
      </div>
      <div style={{ marginLeft: 5, position: "relative" }}>
        <FaEllipsisH
          size={20}
          style={{ cursor: viewMode ? "not-allowed" : "pointer", opacity: viewMode ? 0.5 : 1 }}
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
 * Full-Screen Modal for usage reports:
 *  - Bar chart for category usage
 *  - Pie chart for free vs busy
 *  - Bar chart for home office vs non-home
 */
function ReportsModal({
  usageMap,
  freeHours,
  totalHours,
  homeOfficeDays,
  nonHomeOfficeDays,
  reportRange,
  setReportRange,
  onClose,
}) {
  const colorPalette = [
    "#FF6384",
    "#36A2EB",
    "#FFCE56",
    "#4BC0C0",
    "#9966FF",
    "#FF9F40",
    "#F67019",
    "#FA8072",
    "#8B008B",
  ];

  function renderUsageBar() {
    const labels = Object.keys(usageMap).length ? Object.keys(usageMap) : ["No Data"];
    const dataVals = labels.map((l) => usageMap[l] || 0);
    const bgColors = labels.map((_, i) => colorPalette[i % colorPalette.length]);
    const data = {
      labels,
      datasets: [
        {
          label: "Category Usage (hrs)",
          data: dataVals,
          backgroundColor: bgColors,
        },
      ],
    };
    return (
      <div
        style={{
          width: "90%",
          maxWidth: 1000,
          height: 400,
          border: "1px solid #ccc",
          marginBottom: 40,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Bar data={data} options={{ responsive: false, maintainAspectRatio: false }} />
      </div>
    );
  }

  function renderPieChart() {
    if (totalHours === 0) {
      const data = {
        labels: ["No Data"],
        datasets: [{ data: [1], backgroundColor: ["#ccc"] }],
      };
      return (
        <div
          style={{
            width: "90%",
            maxWidth: 600,
            height: 400,
            border: "1px solid #ccc",
            marginBottom: 40,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <Pie data={data} options={{ responsive: false, maintainAspectRatio: false }} />
        </div>
      );
    }
    const busyHours = totalHours - freeHours;
    const data = {
      labels: ["Free (hrs)", "Busy (hrs)"],
      datasets: [
        {
          data: [freeHours, busyHours],
          backgroundColor: [colorPalette[1], colorPalette[0]],
        },
      ],
    };
    return (
      <div
        style={{
          width: "90%",
          maxWidth: 600,
          height: 400,
          border: "1px solid #ccc",
          marginBottom: 40,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Pie data={data} options={{ responsive: false, maintainAspectRatio: false }} />
      </div>
    );
  }

  function renderHomeOfficeBar() {
    const data = {
      labels: ["Home Office Days", "Non Home Office"],
      datasets: [
        {
          label: "Days",
          data: [homeOfficeDays, nonHomeOfficeDays],
          backgroundColor: [colorPalette[2], colorPalette[3]],
        },
      ],
    };
    return (
      <div
        style={{
          width: "90%",
          maxWidth: 600,
          height: 400,
          border: "1px solid #ccc",
          marginBottom: 40,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Bar data={data} options={{ responsive: false, maintainAspectRatio: false }} />
      </div>
    );
  }

  return (
    <div
      style={{
        position: "fixed",
        zIndex: 9999,
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        backgroundColor: "#fff",
        overflow: "auto",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        paddingBottom: 50,
      }}
    >
      <button
        style={{
          alignSelf: "flex-end",
          margin: "10px",
          padding: "8px 16px",
          fontSize: 14,
          cursor: "pointer",
        }}
        onClick={onClose}
      >
        Close
      </button>
      <h2 style={{ marginTop: 0 }}>Full-Screen Reports</h2>
      <div style={{ margin: "10px 0" }}>
        <button onClick={() => setReportRange("daily")}>
          {reportRange === "daily" ? "Daily ✓" : "Daily"}
        </button>
        <button onClick={() => setReportRange("weekly")} style={{ marginLeft: 5 }}>
          {reportRange === "weekly" ? "Weekly ✓" : "Weekly"}
        </button>
        <button onClick={() => setReportRange("monthly")} style={{ marginLeft: 5 }}>
          {reportRange === "monthly" ? "Monthly ✓" : "Monthly"}
        </button>
        <button onClick={() => setReportRange("yearly")} style={{ marginLeft: 5 }}>
          {reportRange === "yearly" ? "Yearly ✓" : "Yearly"}
        </button>
        <button onClick={() => setReportRange("alltime")} style={{ marginLeft: 5 }}>
          {reportRange === "alltime" ? "All Time ✓" : "All Time"}
        </button>
      </div>
      {renderUsageBar()}
      {renderPieChart()}
      {renderHomeOfficeBar()}
    </div>
  );
}

/** Helper function to check if a day's data has any user-entered content */
function dayHasContent(day) {
  const hasPriorities =
    day.priorities && day.priorities.some((p) => p.text && p.text.trim() !== "");
  const hasBrainDump =
    day.brainDump && day.brainDump.some((b) => b.text && b.text.trim() !== "");
  const hasSchedule =
    day.schedule &&
    Object.values(day.schedule).some((entry) => entry.text && entry.text.trim() !== "");
  return hasPriorities || hasBrainDump || hasSchedule;
}

/** Main App Component */
export default function App() {
  // Logged-in user (the admin or employee who typed username+password)
  const [loggedInUser, setLoggedInUser] = useState(null);
  // For admins: the user whose agenda is being viewed
  const [displayUser, setDisplayUser] = useState(null);

  // Local caches
  const [syncedUsers, setSyncedUsers] = useState({});
  const [categoriesBySheet, setCategoriesBySheet] = useState({});
  const [categoryTree, setCategoryTree] = useState([]);

  // For login
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  // Agenda states
  const [currentDate, setCurrentDate] = useState(new Date());
  const currentDateStr = formatDate(currentDate);

  // UI states
  const [showConfetti, setShowConfetti] = useState(false);

  // Admin
  const [targetUser, setTargetUser] = useState("");
  const [viewingTarget, setViewingTarget] = useState(false);
  const [viewMode, setViewMode] = useState(false);

  // Full-screen reports
  const [showReports, setShowReports] = useState(false);
  const [reportRange, setReportRange] = useState("daily");

  // Determine roles
  const isLoggedIn = !!loggedInUser && loggedInUser.password === password;
  const isAdmin = isLoggedIn && loggedInUser.role === "admin";
  const activeData = viewingTarget && displayUser ? displayUser : loggedInUser;
  const canViewAgenda = !!activeData && isLoggedIn;

  // Instead of auto-creating day data on view, simply use an empty object if no data exists.
  const dayObj = canViewAgenda ? (activeData.timeBox[currentDateStr] || {}) : {};
  const {
    startHour = 7,
    endHour = 23,
    priorities = [],
    brainDump = [],
    homeOffice = false,
  } = dayObj;

  // Calculate incomplete tasks
  const totalIncomplete =
    priorities.filter((p) => !p.completed).length +
    brainDump.filter((b) => !b.completed).length;

  // Helper to safely update the active user object.
  // If day data is created but remains empty, it is removed.
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

  // On mount, fetch from Google Sheets & store in Firestore (for new users).
  useEffect(() => {
    async function init() {
      const users = await syncUsersFromSheet(); // merges new users
      setSyncedUsers(users);

      const catsMap = await fetchCategoriesBySheet();
      setCategoriesBySheet(catsMap);
    }
    init();
  }, []);

  /** Combine categories for admins or pick single sheet for employees. */
  function pickCategoryTreeForUser(u) {
    if (!u) return [];
    if (u.role === "employee") {
      return categoriesBySheet[u.sheet] || [];
    }
    if (u.role === "admin" && u.allowedAreas) {
      const arrays = u.allowedAreas.map((areaName) => categoriesBySheet[areaName] || []);
      return arrays.flat();
    }
    return [];
  }

  // Load doc from Firestore => merges in old data => set state
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
      const cats = pickCategoryTreeForUser(updatedRecord);
      setCategoryTree(cats);

      if (updatedRecord.password !== password && !isEmployeeView) {
        setMessage("Incorrect password (or blank if brand-new user).");
      }
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

      const cats = pickCategoryTreeForUser(record);
      setCategoryTree(cats);
      setMessage("Could not fetch from Firestore, using local fallback.");
    }
  }

  // Auto-save on changes to displayUser and loggedInUser
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

  /** Return a local copy of the user from sync, or null if not found. */
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

  // Basic login
  function handleLogin() {
    if (!username) {
      setMessage("Please enter a username.");
      return;
    }
    const record = getUserRecord(username);
    if (!record) {
      setMessage("User not recognized. Check spelling of the full name from your sheet.");
      return;
    }
    loadUserRecord(record, false);
  }

  // Admin: load an employee's agenda read-only
  function handleLoadEmployee() {
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
    loadUserRecord(employeeRecord, true);
    setMessage(`Loaded agenda for ${targetUser}`);
  }

  // Admin: back to your own agenda
  function handleBackToMyAgenda() {
    setDisplayUser(loggedInUser);
    setViewingTarget(false);
    setViewMode(false);
    setMessage("Back to your agenda.");
    const cats = pickCategoryTreeForUser(loggedInUser);
    setCategoryTree(cats);
  }

  // Priorities
  function addPriority() {
    if (!canViewAgenda || viewMode) return;
    updateActiveData((draft) => {
      if (!draft.timeBox) draft.timeBox = {};
      if (!draft.timeBox[currentDateStr]) {
        draft.timeBox[currentDateStr] = {
          priorities: [],
          brainDump: [],
          schedule: {},
          homeOffice: false,
          confettiShown: false,
          startHour: draft.defaultStartHour || 7,
          endHour: draft.defaultEndHour || 23,
        };
      }
      draft.timeBox[currentDateStr].priorities.push({ text: "", completed: false });
    });
  }
  function togglePriorityCompleted(idx) {
    if (!canViewAgenda || viewMode) return;
    updateActiveData((draft) => {
      if (draft.timeBox[currentDateStr] && draft.timeBox[currentDateStr].priorities) {
        draft.timeBox[currentDateStr].priorities[idx].completed =
          !draft.timeBox[currentDateStr].priorities[idx].completed;
      }
    });
  }
  function updatePriorityText(idx, txt) {
    if (!canViewAgenda || viewMode) return;
    updateActiveData((draft) => {
      if (!draft.timeBox[currentDateStr]) {
        draft.timeBox[currentDateStr] = {
          priorities: [],
          brainDump: [],
          schedule: {},
          homeOffice: false,
          confettiShown: false,
          startHour: draft.defaultStartHour || 7,
          endHour: draft.defaultEndHour || 23,
        };
      }
      draft.timeBox[currentDateStr].priorities[idx].text = txt;
    });
  }
  function removePriority(idx) {
    if (!canViewAgenda || viewMode) return;
    updateActiveData((draft) => {
      if (draft.timeBox[currentDateStr] && draft.timeBox[currentDateStr].priorities) {
        draft.timeBox[currentDateStr].priorities.splice(idx, 1);
      }
    });
  }

  // Brain Dump
  function addBrainDumpItem() {
    if (!canViewAgenda || viewMode) return;
    updateActiveData((draft) => {
      if (!draft.timeBox[currentDateStr]) {
        draft.timeBox[currentDateStr] = {
          priorities: [],
          brainDump: [],
          schedule: {},
          homeOffice: false,
          confettiShown: false,
          startHour: draft.defaultStartHour || 7,
          endHour: draft.defaultEndHour || 23,
        };
      }
      draft.timeBox[currentDateStr].brainDump.push({ text: "", completed: false });
    });
  }
  function toggleBrainDumpCompleted(i) {
    if (!canViewAgenda || viewMode) return;
    updateActiveData((draft) => {
      if (draft.timeBox[currentDateStr] && draft.timeBox[currentDateStr].brainDump) {
        draft.timeBox[currentDateStr].brainDump[i].completed =
          !draft.timeBox[currentDateStr].brainDump[i].completed;
      }
    });
  }
  function updateBrainDumpText(i, txt) {
    if (!canViewAgenda || viewMode) return;
    updateActiveData((draft) => {
      if (!draft.timeBox[currentDateStr]) {
        draft.timeBox[currentDateStr] = {
          priorities: [],
          brainDump: [],
          schedule: {},
          homeOffice: false,
          confettiShown: false,
          startHour: draft.defaultStartHour || 7,
          endHour: draft.defaultEndHour || 23,
        };
      }
      draft.timeBox[currentDateStr].brainDump[i].text = txt;
    });
  }
  function removeBrainDumpItem(i) {
    if (!canViewAgenda || viewMode) return;
    updateActiveData((draft) => {
      if (draft.timeBox[currentDateStr] && draft.timeBox[currentDateStr].brainDump) {
        draft.timeBox[currentDateStr].brainDump.splice(i, 1);
      }
    });
  }

  // Schedule
  function updateScheduleSlot(label, newEntry) {
    if (!canViewAgenda || viewMode) return;
    updateActiveData((draft) => {
      if (!draft.timeBox[currentDateStr]) {
        draft.timeBox[currentDateStr] = {
          priorities: [],
          brainDump: [],
          schedule: {},
          homeOffice: false,
          confettiShown: false,
          startHour: draft.defaultStartHour || 7,
          endHour: draft.defaultEndHour || 23,
        };
      }
      draft.timeBox[currentDateStr].schedule[label] = newEntry;
    });
  }

  // Start/End Hour (Account Settings)
  function setStartHourVal(h) {
    if (!canViewAgenda || viewMode) return;
    updateActiveData((draft) => {
      draft.defaultStartHour = parseInt(h, 10);
      if (!draft.defaultPreset) draft.defaultPreset = {};
      draft.defaultPreset.start = parseInt(h, 10);
      if (draft.timeBox[currentDateStr]) {
        draft.timeBox[currentDateStr].startHour = parseInt(h, 10);
      }
    });
  }
  function setEndHourVal(h) {
    if (!canViewAgenda || viewMode) return;
    updateActiveData((draft) => {
      draft.defaultEndHour = parseInt(h, 10);
      if (!draft.defaultPreset) draft.defaultPreset = {};
      draft.defaultPreset.end = parseInt(h, 10);
      if (draft.timeBox[currentDateStr]) {
        draft.timeBox[currentDateStr].endHour = parseInt(h, 10);
      }
    });
  }

  // Report functions
  function parseDateStr(ds) {
    const [y, m, d] = ds.split("-").map(Number);
    return new Date(y, m - 1, d);
  }
  function getAllDates() {
    return activeData?.timeBox ? Object.keys(activeData.timeBox) : [];
  }
  function usageInSingleDay(dt) {
    const ds = formatDate(dt);
    const day = activeData?.timeBox[ds];
    if (!day || !dayHasContent(day)) return { usageMap: {}, freeHours: 0, totalHours: 0 };
    const { startHour = 7, endHour = 23, schedule = {} } = day;
    let freeHours = 0;
    let totalHours = 0;
    const usageMap = {};
    const slots = getQuarterHourSlots(startHour, endHour);
    slots.forEach(({ hour, minute }) => {
      totalHours += 0.25;
      const label = formatTime(hour, minute);
      const entry = schedule[label] || {};
      if (!entry.text) {
        freeHours += 0.25;
      } else {
        usageMap[entry.text] = (usageMap[entry.text] || 0) + 0.25;
      }
    });
    return { usageMap, freeHours, totalHours };
  }
  function usageInRange({ days = null, months = null, years = null } = {}) {
    const dateKeys = getAllDates();
    if (!dateKeys.length) return { usageMap: {}, freeHours: 0, totalHours: 0 };
    let boundary = null;
    const now = new Date();
    if (days) {
      boundary = new Date(now);
      boundary.setDate(boundary.getDate() - days);
    } else if (months) {
      boundary = new Date(now);
      boundary.setMonth(boundary.getMonth() - months);
    } else if (years) {
      boundary = new Date(now);
      boundary.setFullYear(boundary.getFullYear() - years);
    }
    let freeHours = 0;
    let totalHours = 0;
    const usageMap = {};
    dateKeys.forEach((ds) => {
      const dt = parseDateStr(ds);
      if (boundary && dt < boundary) return;
      const day = activeData.timeBox[ds];
      if (!day || !dayHasContent(day)) return;
      const slots = getQuarterHourSlots(day.startHour, day.endHour);
      slots.forEach(({ hour, minute }) => {
        totalHours += 0.25;
        const label = formatTime(hour, minute);
        const entry = day.schedule[label] || {};
        if (!entry.text) {
          freeHours += 0.25;
        } else {
          usageMap[entry.text] = (usageMap[entry.text] || 0) + 0.25;
        }
      });
    });
    return { usageMap, freeHours, totalHours };
  }
  function computeReportData() {
    if (!canViewAgenda || !isAdmin) return { usageMap: {}, freeHours: 0, totalHours: 0 };
    if (reportRange === "daily") return usageInSingleDay(currentDate);
    if (reportRange === "weekly") return usageInRange({ days: 7 });
    if (reportRange === "monthly") return usageInRange({ months: 1 });
    if (reportRange === "yearly") return usageInRange({ years: 1 });
    if (reportRange === "alltime") return usageInRange({});
    return usageInSingleDay(currentDate);
  }
  const usageResult = computeReportData();
  const { usageMap, freeHours, totalHours } = usageResult;

  // Home office chart calculations
  let homeOfficeDays = 0;
  let nonHomeOfficeDays = 0;
  if (canViewAgenda && activeData?.timeBox) {
    const dateKeys = Object.keys(activeData.timeBox);
    dateKeys.forEach((ds) => {
      const day = activeData.timeBox[ds];
      if (day.homeOffice) homeOfficeDays++;
      else nonHomeOfficeDays++;
    });
  }

  // Build schedule rows
  const quarterSlots = canViewAgenda ? getQuarterHourSlots(startHour, endHour) : [];

  // Show confetti if all tasks completed
  useEffect(() => {
    if (!canViewAgenda) return;
    if (totalIncomplete === 0 && (priorities.length > 0 || brainDump.length > 0)) {
      if (!dayObj.confettiShown) {
        setShowConfetti(true);
        updateActiveData((draft) => {
          if (!draft.timeBox[currentDateStr]) {
            draft.timeBox[currentDateStr] = {
              priorities: [],
              brainDump: [],
              schedule: {},
              homeOffice: false,
              confettiShown: false,
              startHour: draft.defaultStartHour || 7,
              endHour: draft.defaultEndHour || 23,
            };
          }
          draft.timeBox[currentDateStr].confettiShown = true;
        });
        setTimeout(() => setShowConfetti(false), 4000);
      }
    } else {
      setShowConfetti(false);
    }
  }, [canViewAgenda, totalIncomplete, priorities, brainDump, dayObj.confettiShown, currentDateStr]);

  // Auto-load repeated slots from previous day/week
  useEffect(() => {
    if (!canViewAgenda) return;
    if (viewMode) return;

    updateActiveData((draft) => {
      const ds = currentDateStr;
      let today = draft.timeBox[ds] || {
        startHour: draft.defaultStartHour || 7,
        endHour: draft.defaultEndHour || 23,
        schedule: {},
      };
      const slots = getQuarterHourSlots(today.startHour, today.endHour);

      // day-1
      const yest = new Date(currentDate);
      yest.setDate(yest.getDate() - 1);
      const yStr = formatDate(yest);

      // day-7
      const wAgo = new Date(currentDate);
      wAgo.setDate(wAgo.getDate() - 7);
      const wStr = formatDate(wAgo);

      slots.forEach(({ hour, minute }) => {
        const label = formatTime(hour, minute);
        const currentSlot = today.schedule[label] || {};
        if (!currentSlot.text) {
          const ySlot = draft.timeBox[yStr]?.schedule?.[label];
          if (ySlot && ySlot.repeat === "daily" && ySlot.text) {
            today.schedule[label] = { ...ySlot };
            return;
          }
          const wSlot = draft.timeBox[wStr]?.schedule?.[label];
          if (wSlot && wSlot.repeat === "weekly" && wSlot.text) {
            today.schedule[label] = { ...wSlot };
            return;
          }
        }
      });
      draft.timeBox[ds] = today;
    });
  }, [canViewAgenda, currentDateStr, currentDate, viewMode]);

  return (
    <div className="container">
      {isLoggedIn && showConfetti && (
        <Confetti width={window.innerWidth} height={window.innerHeight} />
      )}

      {showReports && isAdmin && (
        <ReportsModal
          usageMap={usageMap}
          freeHours={freeHours}
          totalHours={totalHours}
          homeOfficeDays={homeOfficeDays}
          nonHomeOfficeDays={nonHomeOfficeDays}
          reportRange={reportRange}
          setReportRange={setReportRange}
          onClose={() => setShowReports(false)}
        />
      )}

      {/* LEFT COLUMN */}
      <div className="left-column">
        <div className="logo">The Time Box</div>

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
            <h3>Top Priorities</h3>
            {priorities.map((p, idx) => (
              <div className="priority-row" key={idx}>
                <input
                  type="checkbox"
                  disabled={viewMode}
                  checked={p.completed}
                  onChange={() => togglePriorityCompleted(idx)}
                />
                <input
                  type="text"
                  className={p.completed ? "completed" : ""}
                  disabled={viewMode}
                  value={p.text}
                  onChange={(e) => updatePriorityText(idx, e.target.value)}
                />
                {!viewMode && (
                  <button className="remove-btn" onClick={() => removePriority(idx)}>
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
            <h3>Brain Dump</h3>
            {brainDump.map((b, i) => (
              <div className="brain-dump-row" key={i}>
                <input
                  type="checkbox"
                  disabled={viewMode}
                  checked={b.completed}
                  onChange={() => toggleBrainDumpCompleted(i)}
                />
                <input
                  type="text"
                  className={b.completed ? "completed" : ""}
                  disabled={viewMode}
                  value={b.text}
                  onChange={(e) => updateBrainDumpText(i, e.target.value)}
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

        {isLoggedIn && (
          <div style={{ marginTop: 30 }}>
            {isAdmin && (
              <>
                <button
                  className="reports-btn"
                  onClick={() => {
                    setShowReports(!showReports);
                  }}
                >
                  Reports
                </button>
                <div style={{ marginTop: 10 }}>
                  <label>Select Employee:</label>
                  <select
                    value={targetUser}
                    onChange={(e) => setTargetUser(e.target.value)}
                    style={{ marginLeft: 8 }}
                  >
                    <option value="">-- Select Employee --</option>
                    {Object.keys(syncedUsers)
                      .filter((uname) => {
                        const emp = syncedUsers[uname];
                        if (!emp || emp.role !== "employee") return false;
                        return isAdmin && loggedInUser.allowedAreas && loggedInUser.allowedAreas.includes(emp.sheet);
                      })
                      .map((uname) => (
                        <option key={uname} value={uname}>
                          {syncedUsers[uname].fullName} ({syncedUsers[uname].sheet})
                        </option>
                      ))}
                  </select>
                  <button onClick={handleLoadEmployee} style={{ marginLeft: 8 }}>
                    Load Employee Agenda
                  </button>
                  {viewingTarget && (
                    <button onClick={handleBackToMyAgenda} style={{ marginLeft: 8 }}>
                      Back to My Agenda
                    </button>
                  )}
                </div>
              </>
            )}

            {canViewAgenda && (
              <div className="section" style={{ borderTop: "1px solid #ccc", marginTop: 20 }}>
                <h3>Account Settings</h3>
                <div style={{ marginBottom: 10 }}>
                  <label>Default Start Hour:</label>
                  <select
                    disabled={viewMode}
                    value={activeData?.defaultStartHour}
                    onChange={(e) => {
                      if (viewMode) return;
                      setStartHourVal(e.target.value);
                    }}
                    style={{ marginLeft: 5 }}
                  >
                    {Array.from({ length: 24 }, (_, i) => (
                      <option key={i} value={i}>
                        {i}:00
                      </option>
                    ))}
                  </select>

                  <label style={{ marginLeft: 10 }}>Default End Hour:</label>
                  <select
                    disabled={viewMode}
                    value={activeData?.defaultEndHour}
                    onChange={(e) => {
                      if (viewMode) return;
                      setEndHourVal(e.target.value);
                    }}
                    style={{ marginLeft: 5 }}
                  >
                    {Array.from({ length: 25 }, (_, i) => (
                      <option key={i} value={i}>
                        {i}:00
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* RIGHT COLUMN: Schedule Table */}
      <div className="right-column">
        {canViewAgenda && (
          <>
            <div className="date-row">
              <label>Date:</label>
              <input type="date" value={formatDate(currentDate)} onChange={(e) => {
                const d = new Date(e.target.value);
                if (!isNaN(d.getTime())) {
                  setCurrentDate(d);
                }
              }} />
              <button onClick={() => setCurrentDate(getPrevDay(currentDate))}>&lt;</button>
              <button onClick={() => setCurrentDate(getNextDay(currentDate))}>&gt;</button>
            </div>

            <div style={{ marginBottom: 10 }}>
              <input
                type="checkbox"
                disabled={viewMode}
                checked={homeOffice}
                onChange={(e) => {
                  if (!viewMode) {
                    updateActiveData((draft) => {
                      if (!draft.timeBox[currentDateStr]) {
                        draft.timeBox[currentDateStr] = {
                          priorities: [],
                          brainDump: [],
                          schedule: {},
                          homeOffice: false,
                          confettiShown: false,
                          startHour: draft.defaultStartHour || 7,
                          endHour: draft.defaultEndHour || 23,
                        };
                      }
                      draft.timeBox[currentDateStr].homeOffice = e.target.checked;
                    });
                  }
                }}
              />
              <label style={{ marginLeft: 5 }}>Mark Home Office</label>
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ marginRight: 10 }}>
                Start Hour:
                <select
                  onChange={(e) => setStartHourVal(e.target.value)}
                  value={startHour}
                  disabled={viewMode}
                  style={{ marginLeft: 5 }}
                >
                  {Array.from({ length: 24 }, (_, i) => (
                    <option key={i} value={i}>
                      {i}:00
                    </option>
                  ))}
                </select>
              </label>
              <label>
                End Hour:
                <select
                  onChange={(e) => setEndHourVal(e.target.value)}
                  value={endHour}
                  disabled={viewMode}
                  style={{ marginLeft: 5 }}
                >
                  {Array.from({ length: 25 }, (_, i) => (
                    <option key={i} value={i}>
                      {i}:00
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <table className="schedule-table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Task / Activity</th>
                </tr>
              </thead>
              <tbody>
                {quarterSlots.map(({ hour, minute }, idx) => {
                  const label = formatTime(hour, minute);
                  const entry = dayObj.schedule?.[label] || { text: "", repeat: "none" };
                  return (
                    <tr key={idx}>
                      <td className="hour-cell">{label}</td>
                      <td>
                        <ScheduleSlot
                          label={label}
                          scheduleEntry={entry}
                          updateEntry={(newVal) => updateScheduleSlot(label, newVal)}
                          viewMode={viewMode}
                          categoryTree={categoryTree}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </>
        )}
      </div>
    </div>
  );
}
