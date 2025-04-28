/***************************************
 * Reports.js
 * Updated: 
 * - Heatmap arranged as calendar (M‑F columns, weeks stacked), short date e.g. "7/7/24"
 * - Bar charts only show hrs in data labels (no %)
 * - Added a button to toggle data labels on/off
 * - Double-click on bar/pie → Usage Evolution
 * - Time Slot Busy Overview (with anomaly highlighting)
 * - Trend arrows, predictive suggestions, category forecasting, and drill-down usage evolution remain intact.
 ***************************************/

import React, { useState, useRef, useEffect, useMemo } from "react";
import { Bar, Pie, Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  BarElement,
  CategoryScale,
  LinearScale,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  LineElement,
  PointElement,
} from "chart.js";
import ChartDataLabels from "chartjs-plugin-datalabels"; // plugin for data labels
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import "./Reports.css";

// Register all needed Chart.js elements + the data labels plugin
ChartJS.register(
  BarElement,
  CategoryScale,
  LinearScale,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  LineElement,
  PointElement,
  ChartDataLabels
);

/* --- Color Palette --- */
const colorPalette = [
  "#FF6384","#36A2EB","#FFCE56","#4BC0C0","#9966FF","#FF9F40","#F67019","#FA8072","#8B008B","#8B0000",
  "#00CED1","#556B2F","#B8860B","#C71585","#2E8B57","#CD5C5C","#20B2AA","#DDA0DD","#6495ED","#FFB6C1",
];
function getColor(index) {
  return colorPalette[index % colorPalette.length];
}

/* --- Utility Functions --- */
export function formatDate(date) {
  if (!(date instanceof Date) || isNaN(date)) return "";
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// Short date style, e.g. "7/7/24"
function formatShortDateMMDDYY(date) {
  const m = date.getMonth() + 1;
  const d = date.getDate();
  const y = String(date.getFullYear()).slice(-2);
  return `${m}/${d}/${y}`;
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
  // push exact ending hour
  slots.push({ hour: endHour, minute: 0 });
  return slots;
}

function parseDateStr(ds) {
  const [y, m, d] = ds.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function getAllDates(activeData) {
  return activeData?.timeBox ? Object.keys(activeData.timeBox) : [];
}

/** Check if a given day object has any content. */
function dayHasContent(day) {
  if (!day) return false;
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

/* --- Usage Computations --- */
function usageInSingleDay(dt, activeData, defaultStart, defaultEnd) {
  // Skip weekends
  if (dt.getDay() === 0 || dt.getDay() === 6) {
    return { usageMap: {}, freeHours: 0, totalHours: 0 };
  }
  const ds = formatDate(dt);
  const day = activeData?.timeBox ? activeData.timeBox[ds] : null;
  if (!day || !dayHasContent(day) || day.vacation) {
    return { usageMap: {}, freeHours: 0, totalHours: 0 };
  }
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
    if (!tasks.length) {
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

function usageInRange(
  { days = null, months = null, years = null, baselineDate = new Date() } = {},
  activeData,
  defaultStart,
  defaultEnd
) {
  const dateKeys = getAllDates(activeData);
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
    if (boundary && dt < boundary) return;
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
      if (!tasks.length) {
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

function usageInCustomRange(startStr, endStr, activeData, defaultStart, defaultEnd) {
  const start = parseDateStr(startStr);
  const finish = parseDateStr(endStr);
  let freeHours = 0;
  let totalHours = 0;
  const usageMap = {};
  const dateKeys = getAllDates(activeData);

  dateKeys.forEach((ds) => {
    const dt = parseDateStr(ds);
    if (dt < start || dt > finish) return;
    if (dt.getDay() === 0 || dt.getDay() === 6) return;
    const day = activeData.timeBox[ds];
    if (!day || !dayHasContent(day) || day.vacation) return;

    const sHour = day.startHour ?? defaultStart;
    const eHour = day.endHour ?? defaultEnd;
    const slots = getQuarterHourSlots(sHour, eHour);
    slots.forEach(({ hour, minute }) => {
      totalHours += 0.5;
      const label = formatTime(hour, minute);
      const tasks = day.schedule?.[label]
        ? Array.isArray(day.schedule[label])
          ? day.schedule[label]
          : [day.schedule[label]]
        : [];
      if (!tasks.length) {
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

/** Decide which usage function to call based on reportRange. */
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
      return usageInRange({ baselineDate: new Date("1970-01-01") }, activeData, startHour, endHour);
    case "custom":
      return usageInCustomRange(customRangeStart, customRangeEnd, activeData, startHour, endHour);
    default:
      return usageInSingleDay(reportBaselineDate, activeData, startHour, endHour);
  }
}

/* --- Compute Home Office Days --- */
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

/* --- Time Slot Busy Overview (with anomaly detection) --- */
function getValidDays(activeData, reportRange, reportBaselineDate, customRangeStart, customRangeEnd) {
  const dateKeys = getAllDates(activeData);
  const valid = [];
  const baseline = new Date(reportBaselineDate);

  dateKeys.forEach((ds) => {
    const dt = parseDateStr(ds);
    if (dt.getDay() === 0 || dt.getDay() === 6) return;
    const day = activeData.timeBox[ds];
    if (!day || !dayHasContent(day) || day.vacation) return;

    if (reportRange === "daily") {
      if (formatDate(baseline) === ds) valid.push(ds);
    } else if (reportRange === "weekly") {
      // Determine the Monday->Sunday range
      const dayOfWeek = baseline.getDay() === 0 ? 7 : baseline.getDay();
      const monday = new Date(baseline);
      monday.setDate(baseline.getDate() - dayOfWeek + 1);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      if (dt >= monday && dt <= sunday) valid.push(ds);
    } else if (reportRange === "monthly") {
      if (dt.getMonth() === baseline.getMonth() && dt.getFullYear() === baseline.getFullYear()) {
        valid.push(ds);
      }
    } else if (reportRange === "yearly") {
      if (dt.getFullYear() === baseline.getFullYear()) {
        valid.push(ds);
      }
    } else if (reportRange === "custom") {
      const start = parseDateStr(customRangeStart);
      const end = parseDateStr(customRangeEnd);
      if (dt >= start && dt <= end) valid.push(ds);
    } else {
      valid.push(ds);
    }
  });

  return valid.sort();
}

function computeTimeslotBusyLevels(
  activeData,
  reportRange,
  reportBaselineDate,
  customRangeStart,
  customRangeEnd,
  defaultStart,
  defaultEnd
) {
  const validDays = getValidDays(
    activeData,
    reportRange,
    reportBaselineDate,
    customRangeStart,
    customRangeEnd
  );
  // Standard quarter-hour slots
  const standardSlots = getQuarterHourSlots(defaultStart, defaultEnd);
  const results = [];
  let totalPercentage = 0;

  standardSlots.forEach((slot) => {
    const timeLabel = formatTime(slot.hour, slot.minute);
    let applicableCount = 0;
    let busyCount = 0;

    validDays.forEach((ds) => {
      const day = activeData.timeBox[ds];
      const dayStart = day.startHour ?? defaultStart;
      const dayEnd = day.endHour ?? defaultEnd;
      const slotDecimal = slot.hour + slot.minute / 60;
      if (slotDecimal < dayStart || slotDecimal >= dayEnd) return;

      applicableCount++;
      let tasks = day.schedule ? day.schedule[timeLabel] : null;
      if (tasks) {
        if (!Array.isArray(tasks)) tasks = [tasks];
        const hasTask = tasks.some((t) => t.text && t.text.trim() !== "");
        if (hasTask) busyCount++;
      }
    });

    const percentage = applicableCount > 0 ? (busyCount / applicableCount) * 100 : 0;
    totalPercentage += percentage;
    let classification = "";
    if (percentage >= 80) classification = "Very Busy";
    else if (percentage >= 60) classification = "Busy";
    else if (percentage >= 40) classification = "Moderately Busy";
    else if (percentage >= 20) classification = "Slightly Busy";
    else classification = "Not Busy";

    results.push({
      time: timeLabel,
      applicableCount,
      busyCount,
      percentage: percentage.toFixed(1),
      classification,
    });
  });

  const overallAvg = results.length ? totalPercentage / results.length : 0;
  return { busyLevels: results, overallAvg };
}

function renderTimeSlotBusyTable(
  activeData,
  reportRange,
  reportBaselineDate,
  customRangeStart,
  customRangeEnd,
  defaultStart,
  defaultEnd
) {
  const { busyLevels, overallAvg } = computeTimeslotBusyLevels(
    activeData,
    reportRange,
    reportBaselineDate,
    customRangeStart,
    customRangeEnd,
    defaultStart,
    defaultEnd
  );
  if (busyLevels.length === 0) {
    return <div>No data available for Time Slot Busy Overview</div>;
  }
  return (
    <div className="timeslot-busy-table">
      <h3>Time Slot Busy Overview</h3>
      <table>
        <caption>Busy levels per 30‑minute slot</caption>
        <thead>
          <tr>
            <th>Time</th>
            <th>Applicable Days</th>
            <th>Busy Days</th>
            <th>Busy %</th>
            <th>Classification</th>
          </tr>
        </thead>
        <tbody>
          {busyLevels.map((row, index) => {
            const isAnomaly = Math.abs(row.percentage - overallAvg) >= 20;
            return (
              <tr key={index} className={isAnomaly ? "anomaly" : ""}>
                <td>{row.time}</td>
                <td>{row.applicableCount}</td>
                <td>{row.busyCount}</td>
                <td>{row.percentage}%</td>
                <td>{row.classification}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* --- Calendar-Style Busy Heatmap (Mon→Fri) --- */
function renderBusyHeatmapCalendar(
  activeData,
  reportRange,
  reportBaselineDate,
  customRangeStart,
  customRangeEnd,
  startHour,
  endHour
) {
  const validDays = getValidDays(
    activeData,
    reportRange,
    reportBaselineDate,
    customRangeStart,
    customRangeEnd
  );
  if (!validDays.length) {
    return <div>No data available for Busy Heatmap</div>;
  }

  // Compute busy percentage for each valid day
  const dayMap = {};
  let minDate = null;
  let maxDate = null;
  validDays.forEach((ds) => {
    const dt = parseDateStr(ds);
    const usage = usageInSingleDay(dt, activeData, startHour, endHour);
    const busy = usage.totalHours - usage.freeHours;
    const pct = usage.totalHours > 0 ? (busy / usage.totalHours) * 100 : 0;
    dayMap[ds] = pct;
    if (!minDate || dt < minDate) minDate = dt;
    if (!maxDate || dt > maxDate) maxDate = dt;
  });

  // Calculate Monday-based weeks between minDate and maxDate
  function getMonday(d) {
    const temp = new Date(d);
    const day = temp.getDay() || 7; // Sunday=0 re-mapped to 7
    if (day !== 1) temp.setDate(temp.getDate() - (day - 1));
    return temp;
  }
  const startMonday = getMonday(minDate);
  const endMonday = getMonday(maxDate);
  const weeks = [];
  {
    let cur = new Date(startMonday);
    while (cur <= endMonday) {
      weeks.push(new Date(cur));
      cur.setDate(cur.getDate() + 7);
    }
  }

  // Build table grid with rows as weeks and columns as Mon→Fri
  const rows = weeks.map((weekMonday) => {
    const rowDays = [];
    for (let col = 0; col < 5; col++) {
      const cellDate = new Date(weekMonday);
      cellDate.setDate(cellDate.getDate() + col);
      const ds = formatDate(cellDate);
      const busyPct = dayMap[ds] ?? null;
      rowDays.push({ dateObj: cellDate, dateStr: ds, busyPct });
    }
    return rowDays;
  });

  return (
    <div className="busy-heatmap-calendar">
      <h3>Busy Heatmap (Calendar‑style: Mon→Fri)</h3>
      <table className="heatmap-table">
        <thead>
          <tr>
            <th>Mon</th>
            <th>Tue</th>
            <th>Wed</th>
            <th>Thu</th>
            <th>Fri</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((weekRow, i) => (
            <tr key={i}>
              {weekRow.map((cell, j) => {
                if (cell.busyPct == null) {
                  return <td key={j} className="heatmap-cell empty"></td>;
                }
                const alpha = Math.min(1, cell.busyPct / 100);
                const shortDate = formatShortDateMMDDYY(cell.dateObj);
                return (
                  <td
                    key={j}
                    className="heatmap-cell"
                    title={`${shortDate} - ${cell.busyPct.toFixed(0)}% busy`}
                    style={{ backgroundColor: `rgba(255, 99, 132, ${alpha})` }}
                  >
                    <span className="heatmap-label">
                      {shortDate}
                      <br />
                      {cell.busyPct.toFixed(0)}%
                    </span>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* --- Drillable Bar/Pie Charts (double-click to drill down) --- */
function DrillableBarChart({ data, options, width, height, onBarDoubleClick }) {
  const chartRef = useRef(null);

  const handleDoubleClick = (event) => {
    const chart = chartRef.current;
    if (!chart) return;
    const elements = chart.getElementsAtEventForMode(event, "nearest", { intersect: true }, true);
    if (elements.length > 0) {
      const index = elements[0].index;
      const category = data.labels[index];
      if (onBarDoubleClick) onBarDoubleClick(category);
    }
  };

  return (
    <div onDoubleClick={handleDoubleClick}>
      <Bar ref={chartRef} data={data} options={options} width={width} height={height} />
    </div>
  );
}

function DrillablePieChart({ data, options, width, height, onSliceDoubleClick }) {
  const chartRef = useRef(null);

  const handleDoubleClick = (event) => {
    const chart = chartRef.current;
    if (!chart) return;
    const elements = chart.getElementsAtEventForMode(event, "nearest", { intersect: true }, true);
    if (elements.length > 0) {
      const index = elements[0].index;
      const category = data.labels[index];
      if (onSliceDoubleClick) onSliceDoubleClick(category);
    }
  };

  return (
    <div onDoubleClick={handleDoubleClick}>
      <Pie ref={chartRef} data={data} options={options} width={width} height={height} />
    </div>
  );
}

/* --- Trend, Forecast, Suggestions --- */
function computeTrendData(
  reportRange,
  reportBaselineDate,
  customRangeStart,
  customRangeEnd,
  activeData,
  startHour,
  endHour
) {
  const current = computeReportData(
    reportRange,
    reportBaselineDate,
    customRangeStart,
    customRangeEnd,
    activeData,
    new Date(),
    startHour,
    endHour
  );
  let prevBaseline = new Date(reportBaselineDate);
  if (reportRange === "daily") {
    prevBaseline.setDate(prevBaseline.getDate() - 1);
  } else if (reportRange === "weekly") {
    prevBaseline.setDate(prevBaseline.getDate() - 7);
  } else if (reportRange === "monthly") {
    prevBaseline.setMonth(prevBaseline.getMonth() - 1);
  } else if (reportRange === "yearly") {
    prevBaseline.setFullYear(prevBaseline.getFullYear() - 1);
  } else {
    return null;
  }
  const previous = computeReportData(
    reportRange,
    prevBaseline,
    customRangeStart,
    customRangeEnd,
    activeData,
    new Date(),
    startHour,
    endHour
  );
  const currentBusy = current.totalHours - current.freeHours;
  const previousBusy = previous.totalHours - previous.freeHours;
  const delta = previousBusy > 0 ? ((currentBusy - previousBusy) / previousBusy) * 100 : 0;
  return { currentBusy, previousBusy, delta: delta.toFixed(1) };
}

function getTimeEfficiencyScore(freeHours, totalHours) {
  return totalHours > 0 ? ((freeHours / totalHours) * 100).toFixed(0) : "N/A";
}

function getPredictiveSuggestions(trendData) {
  const suggestions = [];
  if (!trendData) return suggestions;
  if (parseFloat(trendData.delta) > 30) {
    suggestions.push("Busy hours rose sharply. Consider scheduling breaks or reviewing tasks.");
  } else if (parseFloat(trendData.delta) < -30) {
    suggestions.push("Busy hours dropped significantly. Might be a chance to add more focus tasks.");
  }
  return suggestions;
}

function getForecastForCategory(dataPoints) {
  if (dataPoints.length < 2) return null;
  const n = dataPoints.length;
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += dataPoints[i];
    sumXY += i * dataPoints[i];
    sumX2 += i * i;
  }
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const forecast = dataPoints[n - 1] + slope;
  return { forecast: forecast.toFixed(1), slope: slope.toFixed(2) };
}

/* --- Category Helpers --- */
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
            const main = t.text.split(" / ")[0];
            if (main) categories.add(main);
          }
        });
      });
    });
  }
  return Array.from(categories).sort();
}

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

function getAll2PartCategoriesFromTree(main, categoryTree) {
  if (!Array.isArray(categoryTree)) return [];
  const mainNode = categoryTree.find((node) => node.name === main);
  if (!mainNode || !mainNode.children) return [];
  return mainNode.children.map((child) => child.name);
}

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

function getAll3PartCategoriesFromTree(main, categoryTree) {
  if (!Array.isArray(categoryTree)) return [];
  const mainNode = categoryTree.find((node) => node.name === main);
  if (!mainNode || !mainNode.children) return [];
  const all = [];
  mainNode.children.forEach((sub) => {
    if (sub.children && sub.children.length) {
      sub.children.forEach((third) => {
        all.push(`${sub.name} / ${third.name}`);
      });
    }
  });
  return all;
}

/* --- The Main Modal Component --- */
export default function ReportsModal({
  activeData,
  currentDate,
  startHour,
  endHour,
  categoryTree,
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
  // State to handle drill-down views for 2-part and 3-part categories
  const [selectedMainChart2, setSelectedMainChart2] = useState(null);
  const [selectedMainChart3, setSelectedMainChart3] = useState(null);
  const [showPercentages, setShowPercentages] = useState(false);

  // Main chart type (bar or pie) for top-level categories
  const [mainChartType, setMainChartType] = useState("bar");

  // Category selected for drill-down usage evolution line chart
  const [drillDownCategory, setDrillDownCategory] = useState(null);

  // Toggle data labels on/off
  const [showDataLabels, setShowDataLabels] = useState(true);

  // Ref for the report container (used by some components)
  const reportRef = useRef(null);

  // Compute usage for the selected time range
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

  // Compute home office stats
  const { homeOfficeDays, nonHomeOfficeDays } = computeHomeOfficeDays(activeData);

  // Compute trend info, time efficiency, and predictive suggestions
  const trendData = computeTrendData(
    reportRange,
    reportBaselineDate,
    customRangeStart,
    customRangeEnd,
    activeData,
    startHour,
    endHour
  );
  const timeEfficiencyScore = getTimeEfficiencyScore(freeHours, totalHours);
  const predictiveSuggestions = getPredictiveSuggestions(trendData);

  const baseChartOptions = useMemo(() => ({
    responsive: false,
    maintainAspectRatio: false,
    plugins: {
      datalabels: {
        display: showDataLabels,
        color: "#000",
        anchor: "end",
        align: "start",
        formatter: (value, context) => {
          // Don't show label if value is 0
          if (value === 0) return null;
          
          const dataset = context.dataset;
          const total = dataset.data.reduce((a, b) => a + b, 0);
          const percentage = Math.round((value / total) * 100);
          
          if (showPercentages) {
            return `${percentage}%`;
          } else {
            return `${value}h`;
          }
        },
        backgroundColor: 'rgba(255, 255, 255, 0.7)',
        borderColor: 'rgba(0, 0, 0, 0.1)',
        borderWidth: 1,
        borderRadius: 4,
        padding: {
          top: 4,
          bottom: 4,
          left: 6,
          right: 6
        },
        font: {
          weight: 'bold'
        }
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            const label = context.label || '';
            const value = context.raw || 0;
            const total = context.dataset.data.reduce((a, b) => a + b, 0);
            const percentage = Math.round((value / total) * 100);
            return `${label}: ${value} h (${percentage}%)`;
          }
        }
      }
    },
  }), [showDataLabels, showPercentages]);

  // Drill-down line chart data for a category
  function computeLineChartDataForCategory(category) {
    const dateKeys = getAllDates(activeData).sort();
    const labels = [];
    const dataVals = [];

    dateKeys.forEach((ds) => {
      const dt = parseDateStr(ds);
      if (dt.getDay() === 0 || dt.getDay() === 6) return;
      const day = activeData.timeBox[ds];
      if (!day || !dayHasContent(day) || day.vacation) return;

      const sHour = day.startHour ?? startHour;
      const eHour = day.endHour ?? endHour;
      const slots = getQuarterHourSlots(sHour, eHour);

      let dayUsage = 0;
      slots.forEach(({ hour, minute }) => {
        const timeLabel = formatTime(hour, minute);
        const tasks = day.schedule?.[timeLabel]
          ? Array.isArray(day.schedule[timeLabel])
            ? day.schedule[timeLabel]
            : [day.schedule[timeLabel]]
          : [];
        tasks.forEach((t) => {
          if (t && t.text && t.text.startsWith(category)) {
            dayUsage += 0.5;
          }
        });
      });

      labels.push(ds);
      dataVals.push(dayUsage);
    });

    return {
      labels,
      datasets: [
        {
          label: `Usage Evolution for ${category}`,
          data: dataVals,
          borderColor: "#007BFF",
          backgroundColor: "rgba(0,123,255,0.2)",
          pointBackgroundColor: "#007BFF",
          pointBorderColor: "#007BFF",
        },
      ],
    };
  }

  function renderDrillDownLineChart() {
    if (drillDownCategory === "Home Office Days" || drillDownCategory === "Non Home Office") {
      const validDays = getValidDays(activeData, reportRange, reportBaselineDate, customRangeStart, customRangeEnd);
      const labels = [];
      const dailyValues = [];

      validDays.forEach((ds) => {
        labels.push(ds);
        const day = activeData.timeBox[ds];
        dailyValues.push(drillDownCategory === "Home Office Days" ? (day?.homeOffice ? 1 : 0) : (day && !day.homeOffice ? 1 : 0));
      });

      const datasetLabel =
        drillDownCategory === "Home Office Days"
          ? "Home Office Days Evolution"
          : "Non Home Office Days Evolution";
      const borderColor = drillDownCategory === "Home Office Days" ? "#28a745" : "#dc3545";
      const chartDataLine = {
        labels,
        datasets: [
          {
            label: datasetLabel,
            data: dailyValues,
            borderColor,
            fill: false,
          },
        ],
      };

      return (
        <div className="chart-container drill-down-chart">
          <h3>{datasetLabel}</h3>
          <button type="button" className="category-button" onClick={() => setDrillDownCategory(null)}>
            Back
          </button>
          <Line data={chartDataLine} width={1000} height={400} />
        </div>
      );
    }

    const chartData = computeLineChartDataForCategory(drillDownCategory);
    let forecastElement = null;
    if (chartData.labels.length >= 2) {
      const forecastResult = getForecastForCategory(chartData.datasets[0].data);
      if (forecastResult) {
        const lastValue = chartData.datasets[0].data[chartData.datasets[0].data.length - 1];
        const direction =
          forecastResult.forecast > lastValue
            ? "↑"
            : forecastResult.forecast < lastValue
            ? "↓"
            : "→";
        forecastElement = (
          <div className="forecast-info">
            Forecast for next period: {forecastResult.forecast} hrs {direction} (slope: {forecastResult.slope})
          </div>
        );
      }
    }

    return (
      <div className="chart-container drill-down-chart">
        <h3>Usage Evolution for {drillDownCategory}</h3>
        <button type="button" className="category-button" onClick={() => setDrillDownCategory(null)}>
          Back
        </button>
        {forecastElement}
        <Line data={chartData} width={1000} height={400} />
      </div>
    );
  }

  function renderMainCategoryChart() {
    const allMainCats = getAllMainCategories(activeData);
    const usageByMain = {};
    allMainCats.forEach((cat) => (usageByMain[cat] = 0));

    Object.keys(usageMap).forEach((key) => {
      const main = key.split(" / ")[0];
      if (usageByMain[main] !== undefined) {
        usageByMain[main] += usageMap[key];
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
    

    if (mainChartType === "bar") {
      return (
        <div className="chart-container">
          <div className="chart-toggle-button-group">
            <button type="button" onClick={() => setMainChartType("bar")}>
              Bar Chart
            </button>
            <button type="button" onClick={() => setMainChartType("pie")}>
              Pie Chart
            </button>
          </div>
          <DrillableBarChart
            data={chartData}
            width={1000}
            height={400}
            options={baseChartOptions}
            onBarDoubleClick={handleBarDoubleClick}
          />
        </div>
      );
    }
    return (
      <div className="chart-container">
        <div className="chart-toggle-button-group">
          <button type="button" onClick={() => setMainChartType("bar")}>
            Bar Chart
          </button>
          <button type="button" onClick={() => setMainChartType("pie")}>
            Pie Chart
          </button>
        </div>
        <DrillablePieChart
          data={chartData}
          width={1000}
          height={400}
          options={baseChartOptions}
          onSliceDoubleClick={handleBarDoubleClick}
        />
      </div>
    );
  }

  function handleBarDoubleClick(category) {
    setDrillDownCategory(category);
  }

  function renderMainAndSubChart() {
    if (!selectedMainChart2) {
      const mains = getAll2PartMainCategories(activeData);
      return (
        <div style={{ textAlign: "center", margin: "20px 0" }}>
          <h3 className="reports-subheader">2-Part Categories: Select a Main</h3>
          {mains.map((m) => (
            <button key={m} type="button" className="category-button" onClick={() => setSelectedMainChart2(m)}>
              {m}
            </button>
          ))}
        </div>
      );
    }

    const subs = getAll2PartCategoriesFromTree(selectedMainChart2, categoryTree);
    const dataVals = subs.map((sub) => {
      const keyPrefix = `${selectedMainChart2} / ${sub}`;
      return Object.keys(usageMap).reduce((sum, k) => (k.startsWith(keyPrefix) ? sum + usageMap[k] : sum), 0);
    });

    const labels = subs.length ? subs : ["No Data"];
    const chartData = {
      labels,
      datasets: [
        {
          label: `Usage for ${selectedMainChart2} (2-part detail)`,
          data: dataVals,
          backgroundColor: labels.map((_, i) => getColor(i)),
        },
      ],
    };

    return (
      <div style={{ textAlign: "center", margin: "20px 0" }}>
        <h3 className="reports-subheader">2-Part Details for {selectedMainChart2}</h3>
        <button type="button" className="category-button" onClick={() => setSelectedMainChart2(null)}>
          Back
        </button>
        <div className="chart-container">
          <DrillableBarChart
            data={chartData}
            width={1000}
            height={400}
            options={baseChartOptions}
            onBarDoubleClick={(sub) => setDrillDownCategory(`${selectedMainChart2} / ${sub}`)}
          />
        </div>
      </div>
    );
  }

  function renderFullChainChart() {
    if (!selectedMainChart3) {
      const mains = getAll3PartMainCategories(activeData);
      return (
        <div style={{ textAlign: "center", margin: "20px 0" }}>
          <h3 className="reports-subheader">3-Part Categories: Select a Main</h3>
          {mains.map((m) => (
            <button key={m} type="button" className="category-button" onClick={() => setSelectedMainChart3(m)}>
              {m}
            </button>
          ))}
        </div>
      );
    }

    const details = getAll3PartCategoriesFromTree(selectedMainChart3, categoryTree);
    const dataVals = details.map((d) => {
      const key = `${selectedMainChart3} / ${d}`;
      return usageMap[key] || 0;
    });
    const labels = details.length ? details : ["No Data"];
    const chartData = {
      labels,
      datasets: [
        {
          label: `Usage for ${selectedMainChart3} (3-part detail)`,
          data: dataVals,
          backgroundColor: labels.map((_, i) => getColor(i)),
        },
      ],
    };

    return (
      <div style={{ textAlign: "center", margin: "20px 0" }}>
        <h3 className="reports-subheader">3-Part Details for {selectedMainChart3}</h3>
        <button type="button" className="category-button" onClick={() => setSelectedMainChart3(null)}>
          Back
        </button>
        <div className="chart-container">
          <DrillableBarChart
            data={chartData}
            width={1000}
            height={400}
            options={baseChartOptions}
            onBarDoubleClick={(detail) => setDrillDownCategory(`${selectedMainChart3} / ${detail}`)}
          />
        </div>
      </div>
    );
  }

  function renderFreeBusyPie() {
    if (totalHours === 0) {
      const data = {
        labels: ["No Data"],
        datasets: [{ data: [1], backgroundColor: ["#ccc"] }],
      };
      return (
        <div className="chart-container">
          <Pie data={data} width={1000} height={400} options={baseChartOptions} />
        </div>
      );
    }
    
    const data = {
      labels: ["Free", "Busy"],
      datasets: [{
        data: [freeHours, totalHours - freeHours],
        backgroundColor: [getColor(0), getColor(1)],
      }],
    };
    
    return (
      <div className="chart-container">
        <DrillablePieChart 
          data={data} 
          width={1000} 
          height={400} 
          options={{
            ...baseChartOptions,
            plugins: {
              ...baseChartOptions.plugins,
              datalabels: {
                ...baseChartOptions.plugins.datalabels,
                color: '#333', // Force dark text for better visibility
                font: {
                  weight: 'bold',
                  size: 12
                }
              }
            }
          }} 
        />
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
          backgroundColor: [getColor(2), getColor(3)],
        },
      ],
    };
    return (
      <div className="chart-container">
        <DrillableBarChart data={data} width={1000} height={400} options={baseChartOptions} onBarDoubleClick={handleBarDoubleClick} />
      </div>
    );
  }

  return (
    <div className="reports-modal-container" ref={reportRef}>
      {/* Close Modal */}
      <button type="button" className="reports-close-button" onClick={onClose}>
        Close
      </button>
      <h2 className="reports-header">Full-Screen Reports</h2>

      {/* Range Buttons */}
      <div className="reports-button-group">
        <button type="button" onClick={() => setReportRange("daily")}>
          {reportRange === "daily" ? "Daily ✓" : "Daily"}
        </button>
        <button type="button" onClick={() => setReportRange("weekly")}>
          {reportRange === "weekly" ? "Weekly ✓" : "Weekly"}
        </button>
        <button type="button" onClick={() => setReportRange("monthly")}>
          {reportRange === "monthly" ? "Monthly ✓" : "Monthly"}
        </button>
        <button type="button" onClick={() => setReportRange("yearly")}>
          {reportRange === "yearly" ? "Yearly ✓" : "Yearly"}
        </button>
        <button type="button" onClick={() => setReportRange("alltime")}>
          {reportRange === "alltime" ? "All Time ✓" : "All Time"}
        </button>
        <button type="button" onClick={() => setReportRange("custom")}>
          {reportRange === "custom" ? "Custom Range ✓" : "Custom Range"}
        </button>
      </div>


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
          <input type="date" value={customRangeStart} onChange={(e) => setCustomRangeStart(e.target.value)} />
          <label style={{ marginLeft: "10px" }}>End Date: </label>
          <input type="date" value={customRangeEnd} onChange={(e) => setCustomRangeEnd(e.target.value)} />
        </div>
      )}

      {/* Toggle Data Labels */}
<div style={{ margin: "10px 0", display: 'flex', gap: '8px', alignItems: 'center' }}>
  <button 
    type="button" 
    className="data-labels-toggle"
    onClick={() => setShowDataLabels(!showDataLabels)}
    style={{ minWidth: '140px' }}
  >
    {showDataLabels ? "Hide Data Labels" : "Show Data Labels"}
  </button>
  
  {showDataLabels && (
    <button 
      type="button" 
      className="percentage-toggle"
      onClick={() => setShowPercentages(!showPercentages)}
      style={{ minWidth: '140px' }}
    >
      {showPercentages ? "Show Hours" : "Show Percentages"}
    </button>
  )}
</div>

      {/* Main Category Chart */}
      {renderMainCategoryChart()}

      {/* 2-part Category Chart */}
      {renderMainAndSubChart()}

      {/* 3-part Category Chart */}
      {renderFullChainChart()}

      {/* Free vs Busy Pie */}
      {renderFreeBusyPie()}

      {/* Time Slot Busy Overview */}
      {renderTimeSlotBusyTable(activeData, reportRange, reportBaselineDate, customRangeStart, customRangeEnd, startHour, endHour)}

      {/* Home Office Bar */}
      {renderHomeOfficeBar()}

      {/* Calendar-Style Busy Heatmap */}
      {renderBusyHeatmapCalendar(activeData, reportRange, reportBaselineDate, customRangeStart, customRangeEnd, startHour, endHour)}

      {/* Drill-down usage line chart */}
      {drillDownCategory && renderDrillDownLineChart()}
    </div>
  );
}
