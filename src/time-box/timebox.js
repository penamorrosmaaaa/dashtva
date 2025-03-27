/***************************************
 * App.js (React + Firebase Firestore)
 * A single-file version that properly
 * merges the 'timeBox' without erasing
 * historical data on each login.
 ***************************************/
import React, { useState, useEffect } from "react";
import { Bar, Pie } from "react-chartjs-2";
import Confetti from "react-confetti";
import { FaEllipsisH, FaGripVertical } from "react-icons/fa";
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
import { initializeApp } from "firebase/app";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc
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
 */
const GOOGLE_SHEET_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vS4qcyZ0P11t2tZ6SDAr10nIBP9twgHq2weqhR0kTu47BWox5-nW3_gYF2zplWNDAFa807qASM0D3S5/pubhtml";

// Known sheet names (added "Gudiño1")
const SHEET_NAMES = ["Charly", "Gudino", "Gabriel", "Cindy"];

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
    for (let m = 0; m < 60; m += 30) {
      slots.push({ hour: h, minute: m });
    }
  }
  slots.push({ hour: endHour, minute: 0 });
  return slots;
}

/** Build a hierarchy of categories from ID/name/parentId. */
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

/** Fetch categories from each sheet */
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

        const empNumber = cells[0].textContent.trim();
        const fullName = cells[1].textContent.trim();
        if (!fullName) continue;

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
      const found = nodes.find((n) => n.name === part || n.name.startsWith("Other:"));
      if (!found && !part.startsWith("Other:") && part !== "Other") {
        matchedAll = false;
        break;
      }
      tempPath.push(part);
      const nodeObj = nodes.find((x) => x.name === part);
      if (!nodeObj) {
        continue;
      }
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
    if (sel === "Select" || sel === "Other" || sel.startsWith("Other:")) break;
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
              const newChain = [...selectedPath.slice(0, -1), "Other: " + typed].join(" / ");
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
 * Single schedule slot row with category + repeat options.
 * MODIFIED: Added drag functionality that copies the entire slot.
 */
function ScheduleSlot({
  label,
  scheduleEntry,
  updateEntry,
  viewMode,
  categoryTree,
  slotIndex,    // index of this slot (from quarterSlots)
  taskIndex,    // index of the task in the cell
  onDragRange,  // callback to update a range of slots
  allTasks,     // the entire tasks array for the current time slot
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
    <div className="schedule-slot" 
         onDragOver={(e) => e.preventDefault()}
         onDrop={(e) => {
           e.preventDefault();
           if (window.dragData && window.dragData.startIndex !== undefined) {
             onDragRange(window.dragData.startIndex, slotIndex, window.dragData.allTasks);
           }
         }}
    >
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
        {/* Drag Button appears only on the first task of the slot */}
        {!viewMode && taskIndex === 0 && (
          <button
            className="drag-btn"
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData("text/plain", "drag");
              window.dragData = {
                startIndex: slotIndex,
                allTasks: allTasks,
              };
            }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              if (window.dragData && window.dragData.startIndex !== undefined) {
                onDragRange(window.dragData.startIndex, slotIndex, window.dragData.allTasks);
              }
            }}
            onDragEnd={(e) => {
              window.dragData = {};
            }}
            style={{ marginLeft: "5px", cursor: "move" }}
          >
            <FaGripVertical />
          </button>
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
 * Full-Screen Modal for usage reports.
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
          width: "100%",
          maxWidth: 4000,
          height: 400,
          border: "1px solid #ccc",
          marginBottom: 40,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Bar
          data={data}
          width={1000}
          height={500}
          options={{
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                labels: {
                  font: { size: 18 },
                },
              },
            },
            scales: {
              x: {
                ticks: {
                  font: { size: 16 },
                },
              },
              y: {
                ticks: {
                  font: { size: 16 },
                },
              },
            },
          }}
        />
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
    Object.values(day.schedule).some((entry) => {
      if (Array.isArray(entry)) {
        return entry.some((e) => e.text && e.text.trim() !== "");
      }
      return entry.text && entry.text.trim() !== "";
    });
  return hasPriorities || hasBrainDump || hasSchedule;
}

/** Main App Component */
export default function App() {
  const [loggedInUser, setLoggedInUser] = useState(null);
  const [displayUser, setDisplayUser] = useState(null);
  const [syncedUsers, setSyncedUsers] = useState({});
  const [categoriesBySheet, setCategoriesBySheet] = useState({});
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
      const catsMap = await fetchCategoriesBySheet();
      setCategoriesBySheet(catsMap);
    }
    init();
  }, []);

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
    localStorage.setItem("username", username);
    localStorage.setItem("password", password);
  }

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

  function handleBackToMyAgenda() {
    setDisplayUser(loggedInUser);
    setViewingTarget(false);
    setViewMode(false);
    setMessage("Back to your agenda.");
    const cats = pickCategoryTreeForUser(loggedInUser);
    setCategoryTree(cats);
  }

  // PRIORITIES FUNCTIONS
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
          vacation: false,
          confettiShown: false,
          startHour: draft.defaultStartHour || 7,
          endHour: draft.defaultEndHour || 23,
        };
      }
      // NEW: add default "priority" field set to "medium"
      draft.timeBox[currentDateStr].priorities.push({ text: "", completed: false, priority: "medium" });
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
          vacation: false,
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
  // NEW: Function to update the priority level and sort the priorities
  function updatePriorityLevel(idx, level) {
    if (!canViewAgenda || viewMode) return;
    updateActiveData((draft) => {
      if (!draft.timeBox[currentDateStr]) {
        draft.timeBox[currentDateStr] = {
          priorities: [],
          brainDump: [],
          schedule: {},
          homeOffice: false,
          vacation: false,
          confettiShown: false,
          startHour: draft.defaultStartHour || 7,
          endHour: draft.defaultEndHour || 23,
        };
      }
      draft.timeBox[currentDateStr].priorities[idx].priority = level;
      // Sort priorities so that high > medium > low
      draft.timeBox[currentDateStr].priorities.sort((a, b) => {
        const levels = { high: 3, medium: 2, low: 1 };
        return levels[b.priority || "medium"] - levels[a.priority || "medium"];
      });
    });
  }

  // BRAIN DUMP FUNCTIONS
  function addBrainDumpItem() {
    if (!canViewAgenda || viewMode) return;
    updateActiveData((draft) => {
      if (!draft.timeBox[currentDateStr]) {
        draft.timeBox[currentDateStr] = {
          priorities: [],
          brainDump: [],
          schedule: {},
          homeOffice: false,
          vacation: false,
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
          vacation: false,
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

  // SCHEDULE FUNCTIONS
  function updateScheduleSlot(label, newEntry, index = 0) {
    if (!canViewAgenda || viewMode) return;
    updateActiveData((draft) => {
      if (!draft.timeBox[currentDateStr]) {
        draft.timeBox[currentDateStr] = {
          priorities: [],
          brainDump: [],
          schedule: {},
          homeOffice: false,
          vacation: false,
          confettiShown: false,
          startHour: draft.defaultStartHour || 7,
          endHour: draft.defaultEndHour || 23,
        };
      }
      if (!draft.timeBox[currentDateStr].schedule[label]) {
        draft.timeBox[currentDateStr].schedule[label] = [newEntry];
      } else {
        if (!Array.isArray(draft.timeBox[currentDateStr].schedule[label])) {
          draft.timeBox[currentDateStr].schedule[label] = [draft.timeBox[currentDateStr].schedule[label]];
        }
        draft.timeBox[currentDateStr].schedule[label][index] = newEntry;
      }
    });
  }
  function addScheduleTask(label) {
    if (!canViewAgenda || viewMode) return;
    updateActiveData((draft) => {
      if (!draft.timeBox[currentDateStr]) {
        draft.timeBox[currentDateStr] = {
          priorities: [],
          brainDump: [],
          schedule: {},
          homeOffice: false,
          vacation: false,
          confettiShown: false,
          startHour: draft.defaultStartHour || 7,
          endHour: draft.defaultEndHour || 23,
        };
      }
      if (!draft.timeBox[currentDateStr].schedule[label]) {
        draft.timeBox[currentDateStr].schedule[label] = [{ text: "", repeat: "none" }];
      } else {
        if (!Array.isArray(draft.timeBox[currentDateStr].schedule[label])) {
          draft.timeBox[currentDateStr].schedule[label] = [draft.timeBox[currentDateStr].schedule[label]];
        }
        draft.timeBox[currentDateStr].schedule[label].push({ text: "", repeat: "none" });
      }
    });
  }
  function removeScheduleTask(label, taskIndex) {
    if (!canViewAgenda || viewMode) return;
    updateActiveData((draft) => {
      if (draft.timeBox[currentDateStr] &&
          draft.timeBox[currentDateStr].schedule &&
          draft.timeBox[currentDateStr].schedule[label]) {
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

  // REPORT FUNCTIONS
  function parseDateStr(ds) {
    const [y, m, d] = ds.split("-").map(Number);
    return new Date(y, m - 1, d);
  }
  function getAllDates() {
    return activeData?.timeBox ? Object.keys(activeData.timeBox) : [];
  }
  function usageInSingleDay(dt) {
    if (dt.getDay() === 0 || dt.getDay() === 6) {
      return { usageMap: {}, freeHours: 0, totalHours: 0 };
    }
    const ds = formatDate(dt);
    const day = activeData?.timeBox[ds];
    if (!day || !dayHasContent(day) || day.vacation) {
      return { usageMap: {}, freeHours: 0, totalHours: 0 };
    }
    const { startHour = 7, endHour = 23, schedule = {} } = day;
    let freeHours = 0;
    let totalHours = 0;
    const usageMap = {};
    const slots = getQuarterHourSlots(startHour, endHour);
    slots.forEach(({ hour, minute }) => {
      totalHours += 0.5;
      const label = formatTime(hour, minute);
      let tasks = schedule[label] ? (Array.isArray(schedule[label]) ? schedule[label] : [schedule[label]]) : [];
      const entry = tasks[0] || {};
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
      if (dt.getDay() === 0 || dt.getDay() === 6) return;
      const day = activeData.timeBox[ds];
      if (!day || !dayHasContent(day) || day.vacation) return;
      const slots = getQuarterHourSlots(day.startHour, day.endHour);
      slots.forEach(({ hour, minute }) => {
        totalHours += 0.25;
        const label = formatTime(hour, minute);
        let tasks = day.schedule[label] ? (Array.isArray(day.schedule[label]) ? day.schedule[label] : [day.schedule[label]]) : [];
        const entry = tasks[0] || {};
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

  let homeOfficeDays = 0;
  let nonHomeOfficeDays = 0;
  if (canViewAgenda && activeData?.timeBox) {
    const dateKeys = Object.keys(activeData.timeBox);
    dateKeys.forEach((ds) => {
      const day = activeData.timeBox[ds];
      if (day?.homeOffice) homeOfficeDays++;
      else nonHomeOfficeDays++;
    });
  }

  const quarterSlots = canViewAgenda ? getQuarterHourSlots(startHour, endHour) : [];

  // NEW: Function to update a range of schedule slots via drag
  function updateScheduleRange(startIndex, endIndex, allTasks) {
    if (!canViewAgenda || viewMode) return;
    const start = Math.min(startIndex, endIndex);
    const end = Math.max(startIndex, endIndex);
    updateActiveData((draft) => {
      for (let i = start; i <= end; i++) {
        const slot = quarterSlots[i];
        if (!slot) continue;
        const slotLabel = formatTime(slot.hour, slot.minute);
        draft.timeBox[currentDateStr].schedule[slotLabel] = [...allTasks];
      }
    });
  }

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
              vacation: false,
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
          <div className={`incomplete-msg ${totalIncomplete > 0 ? "show" : ""}`} style={{ marginTop: 10 }}>
            {totalIncomplete > 0
              ? `You have ${totalIncomplete} incomplete item(s) today.`
              : "All tasks complete for today!"}
          </div>
        )}
        {canViewAgenda && (
          <div className="section">
            <h3>Top Priorities</h3>
            {[...priorities]
              .sort((a, b) => {
                const levels = { high: 3, medium: 2, low: 1 };
                return levels[b.priority || "medium"] - levels[a.priority || "medium"];
              })
              .map((p) => {
                const originalIdx = priorities.indexOf(p);
                return (
                  <div
                    className="priority-row"
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
                    <input
                      type="text"
                      className={p.completed ? "completed" : ""}
                      disabled={viewMode}
                      value={p.text}
                      onChange={(e) => updatePriorityText(originalIdx, e.target.value)}
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
                );
              })}
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
        {isLoggedIn && isAdmin && (
          <div style={{ marginTop: 30 }}>
            <button className="reports-btn" onClick={() => setShowReports(!showReports)}>
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
              <button onClick={handleLoadEmployee} style={{ marginLeft: 8 }}>
                Load Employee Agenda
              </button>
              {viewingTarget && (
                <button onClick={handleBackToMyAgenda} style={{ marginLeft: 8 }}>
                  Back to My Agenda
                </button>
              )}
            </div>
          </div>
        )}
      </div>
      {/* RIGHT COLUMN: Schedule Table */}
      <div className="right-column">
        {canViewAgenda && (
          <>
            <div
              className="date-row"
              style={{
                display: "flex",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "10px",
                marginBottom: 20,
              }}
            >
              <label>Date:</label>
              <input
                type="date"
                value={formatDate(currentDate)}
                onChange={(e) => {
                  const d = new Date(e.target.value);
                  if (!isNaN(d.getTime())) {
                    setCurrentDate(d);
                  }
                }}
              />
              <button onClick={() => setCurrentDate(getPrevDay(currentDate))}>&lt;</button>
              <button onClick={() => setCurrentDate(getNextDay(currentDate))}>&gt;</button>
              <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
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
                            vacation: false,
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
                <label>Mark Home Office</label>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                <input
                  type="checkbox"
                  disabled={viewMode}
                  checked={vacation}
                  onChange={(e) => {
                    if (!viewMode) {
                      updateActiveData((draft) => {
                        if (!draft.timeBox[currentDateStr]) {
                          draft.timeBox[currentDateStr] = {
                            priorities: [],
                            brainDump: [],
                            schedule: {},
                            homeOffice: false,
                            vacation: false,
                            confettiShown: false,
                            startHour: draft.defaultStartHour || 7,
                            endHour: draft.defaultEndHour || 23,
                          };
                        }
                        draft.timeBox[currentDateStr].vacation = e.target.checked;
                      });
                    }
                  }}
                />
                <label>Mark Vacation</label>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                <label>
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
            </div>
            {isWeekend ? (
              <div style={{ color: "red", marginTop: 10 }}>
                This is a weekend. No schedule available.
              </div>
            ) : vacation ? (
              <div style={{ color: "blue", marginTop: 10 }}>
                This day is marked as Vacation. Schedule is blocked.
              </div>
            ) : (
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
                    const dayTotalMinutes = (endHour - startHour) * 60;
                    const slotMinutes = ((hour - startHour) * 60 + minute);
                    const progressPercentage = Math.min(Math.max((slotMinutes / dayTotalMinutes) * 100, 0), 100);
                    
                    let tasks = dayObj.schedule?.[label];
                    if (tasks) {
                      if (!Array.isArray(tasks)) {
                        tasks = [tasks];
                      }
                    } else {
                      tasks = [{ text: "", repeat: "none" }];
                    }
                    return (
                      <tr key={idx}>
                        <td className="hour-cell">
                          {label}
                          <div
                            className="progress-bar"
                            style={{
                              marginTop: "4px",
                              height: "8px",
                              backgroundColor: "#e0e0e0",
                              borderRadius: "4px",
                            }}
                          >
                            <div
                              style={{
                                width: `${progressPercentage}%`,
                                height: "100%",
                                backgroundColor: "#76c7c0",
                                borderRadius: "4px",
                              }}
                            ></div>
                          </div>
                        </td>
                        <td>
                          {tasks.map((task, taskIndex) => (
                            <div key={taskIndex} style={{ display: "flex", alignItems: "center", marginBottom: 4 }}>
                              <ScheduleSlot
                                label={label}
                                scheduleEntry={task}
                                updateEntry={(newVal) => updateScheduleSlot(label, newVal, taskIndex)}
                                viewMode={viewMode}
                                categoryTree={categoryTree}
                                slotIndex={idx}
                                taskIndex={taskIndex}
                                onDragRange={updateScheduleRange}
                                allTasks={tasks}
                              />
                              {!viewMode && (
                                <button className="remove-btn" onClick={() => removeScheduleTask(label, taskIndex)}>
                                  ✕
                                </button>
                              )}
                            </div>
                          ))}
                          {!viewMode && (
                            <button className="add-task-btn" onClick={() => addScheduleTask(label)}>
                              + Add Task
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </>
        )}
      </div>
    </div>
  );
}
