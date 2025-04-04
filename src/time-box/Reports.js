/***************************************
 * Reports.js
 * Contains the ReportsModal component and related report functions.
 ***************************************/
import React, { useState } from "react";
import { Bar, Pie } from "react-chartjs-2";
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
import "./Reports.css";

// Register Chart.js components
ChartJS.register(BarElement, CategoryScale, LinearScale, Title, Tooltip, Legend, ArcElement);

/* --- Color Palette --- */
const colorPalette = [
  "#FF6384", "#36A2EB", "#FFCE56", "#4BC0C0", "#9966FF", "#FF9F40",
  "#F67019", "#FA8072", "#8B008B", "#8B0000", "#00CED1", "#556B2F",
  "#B8860B", "#C71585", "#2E8B57", "#CD5C5C", "#20B2AA", "#DDA0DD",
  "#6495ED", "#FFB6C1",
];
function getColor(index) {
  return colorPalette[index % colorPalette.length];
}

/* --- Utility functions --- */
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

/** Return half-hour time slots from startHour..endHour. */
export function getQuarterHourSlots(startHour, endHour) {
  const slots = [];
  if (startHour >= endHour) return slots;
  for (let h = startHour; h < endHour; h++) {
    for (let m = 0; m < 60; m += 30) {
      slots.push({ hour: h, minute: m });
    }
  }
  // push exact ending hour
  slots.push({ hour: endHour, minute: 0 });
  return slots;
}

/* --- Report helper functions --- */
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

/** Usage for a single date (skips weekends). */
function usageInSingleDay(dt, activeData, defaultStart, defaultEnd) {
  // Example skip weekends (Sunday=0, Saturday=6)
  if (dt.getDay() === 0 || dt.getDay() === 6) {
    return { usageMap: {}, freeHours: 0, totalHours: 0 };
  }

  const ds = formatDate(dt);
  const day = activeData?.timeBox ? activeData.timeBox[ds] : null;
  if (!day || !dayHasContent(day) || day.vacation) {
    return { usageMap: {}, freeHours: 0, totalHours: 0 };
  }

  // We'll use day.startHour/day.endHour if present, otherwise fall back to default
  const startHour = day.startHour ?? defaultStart;
  const endHour = day.endHour ?? defaultEnd;

  let freeHours = 0;
  let totalHours = 0;
  const usageMap = {};

  const slots = getQuarterHourSlots(startHour, endHour);
  slots.forEach(({ hour, minute }) => {
    totalHours += 0.5;
    const label = formatTime(hour, minute);
    const tasks = day.schedule?.[label]
      ? Array.isArray(day.schedule[label])
        ? day.schedule[label]
        : [day.schedule[label]]
      : [];

    if (tasks.length === 0) {
      freeHours += 0.5;
    } else {
      let anyText = false;
      tasks.forEach((t) => {
        if (t.text && t.text.trim() !== "") {
          anyText = true;
          usageMap[t.text] = (usageMap[t.text] || 0) + 0.5;
        }
      });
      if (!anyText) freeHours += 0.5;
    }
  });

  return { usageMap, freeHours, totalHours };
}

/** Usage for a range (skips weekends). */
function usageInRange({ days = null, months = null, years = null, baselineDate = new Date() } = {},
  activeData, defaultStart, defaultEnd
) {
  const dateKeys = activeData?.timeBox ? Object.keys(activeData.timeBox) : [];
  if (!dateKeys.length) return { usageMap: {}, freeHours: 0, totalHours: 0 };

  let boundary = null;
  if (days) {
    boundary = new Date(baselineDate);
    boundary.setDate(boundary.getDate() - days);
  } else if (months) {
    boundary = new Date(baselineDate);
    boundary.setMonth(boundary.getMonth() - months);
  } else if (years) {
    boundary = new Date(baselineDate);
    boundary.setFullYear(boundary.getFullYear() - years);
  }
  
  let freeHours = 0;
  let totalHours = 0;
  const usageMap = {};

  dateKeys.forEach((ds) => {
    const dt = parseDateStr(ds);
    if (boundary && dt < boundary) return; // outside the range
    // skip weekends
    if (dt.getDay() === 0 || dt.getDay() === 6) return;

    const day = activeData.timeBox[ds];
    if (!day || !dayHasContent(day) || day.vacation) return;

    const startHour = day.startHour ?? defaultStart;
    const endHour = day.endHour ?? defaultEnd;

    const slots = getQuarterHourSlots(startHour, endHour);
    slots.forEach(({ hour, minute }) => {
      totalHours += 0.5;
      const label = formatTime(hour, minute);
      const tasks = day.schedule?.[label]
        ? Array.isArray(day.schedule[label])
          ? day.schedule[label]
          : [day.schedule[label]]
        : [];
      if (tasks.length === 0) {
        freeHours += 0.5;
      } else {
        let anyText = false;
        tasks.forEach((t) => {
          if (t.text && t.text.trim() !== "") {
            anyText = true;
            usageMap[t.text] = (usageMap[t.text] || 0) + 0.5;
          }
        });
        if (!anyText) freeHours += 0.5;
      }
    });
  });

  return { usageMap, freeHours, totalHours };
}

/** Usage for a custom date range (skips weekends). */
function usageInCustomRange(startStr, endStr, activeData, defaultStart, defaultEnd) {
  const start = parseDateStr(startStr);
  const end = parseDateStr(endStr);

  let freeHours = 0;
  let totalHours = 0;
  const usageMap = {};

  const dateKeys = activeData?.timeBox ? Object.keys(activeData.timeBox) : [];
  dateKeys.forEach((ds) => {
    const dt = parseDateStr(ds);
    if (dt < start || dt > end) return; // outside custom range
    // skip weekends
    if (dt.getDay() === 0 || dt.getDay() === 6) return;

    const day = activeData.timeBox[ds];
    if (!day || !dayHasContent(day) || day.vacation) return;

    const startHour = day.startHour ?? defaultStart;
    const endHour = day.endHour ?? defaultEnd;

    const slots = getQuarterHourSlots(startHour, endHour);
    slots.forEach(({ hour, minute }) => {
      totalHours += 0.5;
      const label = formatTime(hour, minute);
      const tasks = day.schedule?.[label]
        ? Array.isArray(day.schedule[label])
          ? day.schedule[label]
          : [day.schedule[label]]
        : [];
      if (tasks.length === 0) {
        freeHours += 0.5;
      } else {
        let anyText = false;
        tasks.forEach((t) => {
          if (t.text && t.text.trim() !== "") {
            anyText = true;
            usageMap[t.text] = (usageMap[t.text] || 0) + 0.5;
          }
        });
        if (!anyText) freeHours += 0.5;
      }
    });
  });

  return { usageMap, freeHours, totalHours };
}

function parseDateStr(ds) {
  const [y, m, d] = ds.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function getAllDates(activeData) {
  return activeData?.timeBox ? Object.keys(activeData.timeBox) : [];
}

/** Chooses which usage function to call based on reportRange. */
function computeReportData(
  reportRange,
  reportBaselineDate,
  customRangeStart,
  customRangeEnd,
  activeData,
  currentDate,
  startHour,
  endHour
) {
  if (!activeData) return { usageMap: {}, freeHours: 0, totalHours: 0 };

  switch (reportRange) {
    case "daily":
      return usageInSingleDay(reportBaselineDate, activeData, startHour, endHour);
    case "weekly":
      return usageInRange({ days: 7, baselineDate: reportBaselineDate }, activeData, startHour, endHour);
    case "monthly":
      return usageInRange({ months: 1, baselineDate: reportBaselineDate }, activeData, startHour, endHour);
    case "yearly":
      return usageInRange({ years: 1, baselineDate: reportBaselineDate }, activeData, startHour, endHour);
    case "alltime":
      // from 1970 onward
      return usageInRange({ baselineDate: new Date("1970-01-01") }, activeData, startHour, endHour);
    case "custom":
      return usageInCustomRange(customRangeStart, customRangeEnd, activeData, startHour, endHour);
    default:
      // fallback: daily
      return usageInSingleDay(reportBaselineDate, activeData, startHour, endHour);
  }
}

/** Count how many days were marked as homeOffice vs not. */
function computeHomeOfficeDays(activeData) {
  let homeOfficeDays = 0;
  let nonHomeOfficeDays = 0;
  const dateKeys = getAllDates(activeData);

  dateKeys.forEach((ds) => {
    const day = activeData.timeBox[ds];
    if (day?.homeOffice) homeOfficeDays++;
    else nonHomeOfficeDays++;
  });

  return { homeOfficeDays, nonHomeOfficeDays };
}

/* --- Helper functions for categories --- */

/** For Chart #1: get *all* main categories that have at least 1 slash. */
function getAllMainCategories(activeData) {
  const categories = new Set();
  if (activeData && activeData.timeBox) {
    Object.values(activeData.timeBox).forEach((day) => {
      if (!day || !day.schedule) return;
      Object.keys(day.schedule).forEach((timeLabel) => {
        const tasks = Array.isArray(day.schedule[timeLabel])
          ? day.schedule[timeLabel]
          : [day.schedule[timeLabel]];
        tasks.forEach((t) => {
          if (t && t.text) {
            // first piece before the first " / "
            const main = t.text.split(" / ")[0];
            if (main) categories.add(main);
          }
        });
      });
    });
  }
  return Array.from(categories).sort();
}

/** For Chart #2: gather all possible main categories that have >=2 parts. */
function getAll2PartMainCategories(activeData) {
  const mains = new Set();
  if (activeData && activeData.timeBox) {
    Object.values(activeData.timeBox).forEach((day) => {
      if (!day || !day.schedule) return;
      Object.keys(day.schedule).forEach((timeLabel) => {
        const tasks = Array.isArray(day.schedule[timeLabel])
          ? day.schedule[timeLabel]
          : [day.schedule[timeLabel]];
        tasks.forEach((t) => {
          if (t && t.text) {
            const parts = t.text.split(" / ");
            if (parts.length >= 2) {
              mains.add(parts[0]);
            }
          }
        });
      });
    });
  }
  return Array.from(mains).sort();
}

/** For Chart #2: for a chosen main category, gather every 2nd-part subcategory. */
function getAll2PartCategoriesForMain(main, activeData) {
  const subs = new Set();
  if (activeData && activeData.timeBox) {
    Object.values(activeData.timeBox).forEach((day) => {
      if (!day || !day.schedule) return;
      Object.keys(day.schedule).forEach((timeLabel) => {
        const tasks = Array.isArray(day.schedule[timeLabel])
          ? day.schedule[timeLabel]
          : [day.schedule[timeLabel]];
        tasks.forEach((t) => {
          if (t && t.text) {
            const parts = t.text.split(" / ");
            if (parts.length >= 2 && parts[0] === main) {
              subs.add(parts[1]);
            }
          }
        });
      });
    });
  }
  return Array.from(subs).sort();
}

/** For Chart #3: gather all main categories that have >=3 parts. */
function getAll3PartMainCategories(activeData) {
  const mains = new Set();
  if (activeData && activeData.timeBox) {
    Object.values(activeData.timeBox).forEach((day) => {
      if (!day || !day.schedule) return;
      Object.keys(day.schedule).forEach((timeLabel) => {
        const tasks = Array.isArray(day.schedule[timeLabel])
          ? day.schedule[timeLabel]
          : [day.schedule[timeLabel]];
        tasks.forEach((t) => {
          if (t && t.text) {
            const parts = t.text.split(" / ");
            if (parts.length >= 3) {
              mains.add(parts[0]);
            }
          }
        });
      });
    });
  }
  return Array.from(mains).sort();
}

/** For Chart #3: for a chosen main, gather every possible 2nd+3rd part chain. */
function getAll3PartCategoriesForMain(main, activeData) {
  const details = new Set();
  if (activeData && activeData.timeBox) {
    Object.values(activeData.timeBox).forEach((day) => {
      if (!day || !day.schedule) return;
      Object.keys(day.schedule).forEach((timeLabel) => {
        const tasks = Array.isArray(day.schedule[timeLabel])
          ? day.schedule[timeLabel]
          : [day.schedule[timeLabel]];
        tasks.forEach((t) => {
          if (t && t.text) {
            const parts = t.text.split(" / ");
            if (parts.length >= 3 && parts[0] === main) {
              // everything after main => "sub1 / sub2 / sub3"
              details.add(parts.slice(1).join(" / "));
            }
          }
        });
      });
    });
  }
  return Array.from(details).sort();
}

/* --- ReportsModal Component --- */
export default function ReportsModal({
  activeData,
  currentDate,
  startHour,
  endHour,
  reportRange,
  setReportRange,
  onClose,
  reportBaselineDate,
  setReportBaselineDate,
  customRangeStart,
  setCustomRangeStart,
  customRangeEnd,
  setCustomRangeEnd,
}) {
  // Local states for chart drill-down
  const [selectedMainChart2, setSelectedMainChart2] = useState(null);
  const [selectedMainChart3, setSelectedMainChart3] = useState(null);

  // For Chart #1, toggle between Bar or Pie
  const [mainChartType, setMainChartType] = useState("bar");

  // Compute usage data for selected range
  const { usageMap, freeHours, totalHours } = computeReportData(
    reportRange,
    reportBaselineDate,
    customRangeStart,
    customRangeEnd,
    activeData,
    currentDate,
    startHour,
    endHour
  );

  // Home Office stats
  const { homeOfficeDays, nonHomeOfficeDays } = computeHomeOfficeDays(activeData);

  // Common tooltip callback for pie charts => "Label: X hrs (Y%)"
  function createPieChartOptions() {
    return {
      responsive: false,
      maintainAspectRatio: false,
      plugins: {
        tooltip: {
          callbacks: {
            label: function (context) {
              const dataset = context.dataset;
              const rawValue = dataset.data[context.dataIndex];
              // sum up this dataset's values
              const total = dataset.data.reduce((acc, val) => acc + val, 0);
              if (total === 0) {
                // no data
                return `${context.label}: 0 hrs (0%)`;
              }
              const pct = ((rawValue / total) * 100).toFixed(1);
              return `${context.label}: ${rawValue} hrs (${pct}%)`;
            },
          },
        },
      },
    };
  }

  /* Chart 1: Usage by Main Category. Toggles Bar/Pie. Pie shows hours + % */
  function renderMainCategoryChart() {
    const allMainCats = getAllMainCategories(activeData);

    // Aggregate usage for each main cat
    const usageByMain = {};
    allMainCats.forEach((cat) => {
      usageByMain[cat] = 0;
    });
    Object.keys(usageMap).forEach((fullKey) => {
      const main = fullKey.split(" / ")[0];
      if (usageByMain[main] !== undefined) {
        usageByMain[main] += usageMap[fullKey];
      }
    });

    const labels = allMainCats.length ? allMainCats : ["No Data"];
    const dataVals = labels.map((cat) => usageByMain[cat] || 0);

    const chartData = {
      labels,
      datasets: [
        {
          label: "Usage by Main Category (hrs)",
          data: dataVals,
          backgroundColor: labels.map((_, i) => getColor(i)),
        },
      ],
    };

    const barOptions = {
      responsive: false,
      maintainAspectRatio: false,
    };
    const pieOptions = createPieChartOptions();

    return (
      <div className="chart-container">
        <div className="chart-toggle-button-group">
          <button
            className="chart-toggle-button"
            onClick={() => setMainChartType("bar")}
          >
            Bar Chart
          </button>
          <button
            className="chart-toggle-button"
            onClick={() => setMainChartType("pie")}
          >
            Pie Chart
          </button>
        </div>
        {mainChartType === "bar" ? (
          <Bar data={chartData} width={1000} height={400} options={barOptions} />
        ) : (
          <Pie data={chartData} width={1000} height={400} options={pieOptions} />
        )}
      </div>
    );
  }

  /* Chart 2: 2-Part Drill Down (Main/Sub). Always show all subcategories. */
  function renderMainAndSubChart() {
    if (!selectedMainChart2) {
      // Step 1: let user pick from any main that has >=2 parts
      const mains = getAll2PartMainCategories(activeData);
      return (
        <div style={{ textAlign: "center", margin: "20px 0" }}>
          <h3 className="reports-subheader">2-Part Categories: Select a Main Category</h3>
          {mains.map((main) => (
            <button
              key={main}
              className="category-button"
              onClick={() => setSelectedMainChart2(main)}
            >
              {main}
            </button>
          ))}
        </div>
      );
    } else {
      // Step 2: show subcategories for the chosen main
      const subs = getAll2PartCategoriesForMain(selectedMainChart2, activeData);
      const dataVals = subs.map((sub) => {
        const key = `${selectedMainChart2} / ${sub}`;
        return usageMap[key] || 0; // if none used, show 0
      });

      const chartData = {
        labels: subs.length ? subs : ["No Data"],
        datasets: [
          {
            label: `Usage for ${selectedMainChart2} (2-part detail)`,
            data: dataVals,
            backgroundColor: subs.map((_, i) => getColor(i)),
          },
        ],
      };
      const options = { responsive: false, maintainAspectRatio: false };

      return (
        <div style={{ textAlign: "center", margin: "20px 0" }}>
          <h3 className="reports-subheader">2-Part Details for {selectedMainChart2}</h3>
          <button
            className="category-button"
            onClick={() => setSelectedMainChart2(null)}
          >
            Back
          </button>
          <div className="chart-container">
            <Bar data={chartData} width={1000} height={400} options={options} />
          </div>
        </div>
      );
    }
  }

  /* Chart 3: 3-Part Drill Down (Main + 2+ subparts). Always show all subpaths. */
  function renderFullChainChart() {
    if (!selectedMainChart3) {
      // Step 1: pick from main cats that have >=3 parts total
      const mains = getAll3PartMainCategories(activeData);
      return (
        <div style={{ textAlign: "center", margin: "20px 0" }}>
          <h3 className="reports-subheader">3-Part Categories: Select a Main Category</h3>
          {mains.map((main) => (
            <button
              key={main}
              className="category-button"
              onClick={() => setSelectedMainChart3(main)}
            >
              {main}
            </button>
          ))}
        </div>
      );
    } else {
      // Step 2: show all sub-chains for that main
      const details = getAll3PartCategoriesForMain(selectedMainChart3, activeData);
      const dataVals = details.map((detail) => {
        const key = `${selectedMainChart3} / ${detail}`;
        return usageMap[key] || 0;
      });

      const chartData = {
        labels: details.length ? details : ["No Data"],
        datasets: [
          {
            label: `Usage for ${selectedMainChart3} (3-part detail)`,
            data: dataVals,
            backgroundColor: details.map((_, i) => getColor(i)),
          },
        ],
      };
      const options = { responsive: false, maintainAspectRatio: false };

      return (
        <div style={{ textAlign: "center", margin: "20px 0" }}>
          <h3 className="reports-subheader">3-Part Details for {selectedMainChart3}</h3>
          <button
            className="category-button"
            onClick={() => setSelectedMainChart3(null)}
          >
            Back
          </button>
          <div className="chart-container">
            <Bar data={chartData} width={1000} height={400} options={options} />
          </div>
        </div>
      );
    }
  }

  /* Chart 4: Free vs Busy Pie. Show both raw hours and percentage. */
  function renderFreeBusyPie() {
    if (totalHours === 0) {
      // no usage data at all
      const data = {
        labels: ["No Data"],
        datasets: [{ data: [1], backgroundColor: ["#ccc"] }],
      };
      return (
        <div className="chart-container">
          <Pie data={data} width={1000} height={400} />
        </div>
      );
    }

    // We'll store raw hours in the dataset, but show a tooltip with "X hrs (Y%)"
    const data = {
      labels: ["Free", "Busy"],
      datasets: [
        {
          data: [freeHours, totalHours - freeHours], // store raw hours
          backgroundColor: [getColor(0), getColor(1)],
        },
      ],
    };

    const pieOptions = {
      responsive: false,
      maintainAspectRatio: false,
      plugins: {
        tooltip: {
          callbacks: {
            label: function (context) {
              const rawVal = context.dataset.data[context.dataIndex];
              const total = context.dataset.data.reduce((acc, val) => acc + val, 0);
              const pct = ((rawVal / total) * 100).toFixed(1);
              const labelName = context.label === "Free" ? "Free" : "Busy";
              return `${labelName}: ${rawVal} hrs (${pct}%)`;
            },
          },
        },
      },
    };

    return (
      <div className="chart-container">
        <Pie data={data} width={1000} height={400} options={pieOptions} />
      </div>
    );
  }

  /* Chart 5: Home Office vs. Non Home Office (bar chart). */
  function renderHomeOfficeBar() {
    const chartData = {
      labels: ["Home Office Days", "Non Home Office"],
      datasets: [
        {
          label: "Days",
          data: [homeOfficeDays, nonHomeOfficeDays],
          backgroundColor: [getColor(2), getColor(3)],
        },
      ],
    };
    const options = { responsive: false, maintainAspectRatio: false };

    return (
      <div className="chart-container">
        <Bar data={chartData} width={1000} height={400} options={options} />
      </div>
    );
  }

  return (
    <div className="reports-modal-container">
      {/* Close Button */}
      <button className="reports-close-button" onClick={onClose}>
        Close
      </button>
      <h2 className="reports-header">Full-Screen Reports</h2>

      {/* Range Buttons */}
      <div className="reports-button-group">
        <button
          className="reports-button"
          onClick={() => setReportRange("daily")}
        >
          {reportRange === "daily" ? "Daily ✓" : "Daily"}
        </button>
        <button
          className="reports-button"
          onClick={() => setReportRange("weekly")}
        >
          {reportRange === "weekly" ? "Weekly ✓" : "Weekly"}
        </button>
        <button
          className="reports-button"
          onClick={() => setReportRange("monthly")}
        >
          {reportRange === "monthly" ? "Monthly ✓" : "Monthly"}
        </button>
        <button
          className="reports-button"
          onClick={() => setReportRange("yearly")}
        >
          {reportRange === "yearly" ? "Yearly ✓" : "Yearly"}
        </button>
        <button
          className="reports-button"
          onClick={() => setReportRange("alltime")}
        >
          {reportRange === "alltime" ? "All Time ✓" : "All Time"}
        </button>
        <button
          className="reports-button"
          onClick={() => setReportRange("custom")}
        >
          {reportRange === "custom" ? "Custom Range ✓" : "Custom Range"}
        </button>
      </div>

      {/* Baseline or Custom Range Inputs */}
      {reportRange !== "custom" ? (
        <div className="reports-input-container">
          <label>Baseline Date: </label>
          <input
            type="date"
            value={formatDate(reportBaselineDate)}
            onChange={(e) => setReportBaselineDate(new Date(e.target.value))}
          />
        </div>
      ) : (
        <div className="reports-input-container">
          <label>Start Date: </label>
          <input
            type="date"
            value={customRangeStart}
            onChange={(e) => setCustomRangeStart(e.target.value)}
          />
          <label style={{ marginLeft: "10px" }}>End Date: </label>
          <input
            type="date"
            value={customRangeEnd}
            onChange={(e) => setCustomRangeEnd(e.target.value)}
          />
        </div>
      )}

      {/* 5 Charts */}
      {renderMainCategoryChart()}
      {renderMainAndSubChart()}
      {renderFullChainChart()}
      {renderFreeBusyPie()}
      {renderHomeOfficeBar()}
    </div>
  );
}
