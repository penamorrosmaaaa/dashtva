import React, { useEffect, useState, useMemo, useCallback } from "react";
import {
  Box, Text, Flex, Spinner, Select, IconButton, CheckboxGroup,
  Checkbox, HStack, VStack, Slider, SliderTrack, SliderFilledTrack,
  SliderThumb, Button, Badge, Stat, StatLabel, StatNumber, StatHelpText,
  StatArrow, Grid, GridItem, Tooltip, Divider, ButtonGroup, Input, Wrap,
  RangeSlider, RangeSliderTrack, RangeSliderFilledTrack, RangeSliderThumb
} from "@chakra-ui/react";
import {
  FaChevronLeft,
  FaChevronRight,
  FaChartLine,
  FaInfoCircle,
  FaCalendarAlt
} from "react-icons/fa";
import Papa from "papaparse";
import { Bar, Radar, Line } from "react-chartjs-2";
import {
  Chart as ChartJS, RadialLinearScale, CategoryScale, LinearScale,
  BarElement, PointElement, LineElement, Title, Tooltip as ChartTooltip,
  Legend, Filler
} from "chart.js";
import ChartDataLabels from "chartjs-plugin-datalabels";
import "./Lighthouse.css"; // Assuming you have the same CSS file
import { FaChevronDown, FaChevronUp } from "react-icons/fa";
import CountUp from 'react-countup';
import Map from './Map';
import MatrixRain from "./MatrixRain";
import { sampleCorrelation, rSquared } from 'simple-statistics'; // Import specific functions

ChartJS.register(
  RadialLinearScale, CategoryScale, LinearScale,
  BarElement, PointElement, LineElement,
  Title, ChartTooltip, Legend, ChartDataLabels, Filler
);

const LocalScoresOverview = () => {
  // State
  const [data, setData] = useState([]);
  const [selectedCompanies, setSelectedCompanies] = useState([]);
  const [selectedDateIndex, setSelectedDateIndex] = useState(0);
  const [previousDateIndex, setPreviousDateIndex] = useState(null);
  const [uniqueDates, setUniqueDates] = useState([]);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [showAnalytics, setShowAnalytics] = useState(true);
  const [availableYears, setAvailableYears] = useState([]);
  const [dateFilterType, setDateFilterType] = useState("all");
  const [timeRange, setTimeRange] = useState("daily");
  const [compareStartDate, setCompareStartDate] = useState(null);
  const [compareEndDate, setCompareEndDate] = useState(null);
  const [compareStartDate2, setCompareStartDate2] = useState(null);
  const [compareEndDate2, setCompareEndDate2] = useState(null);
  const [showCompanyDropdown, setShowCompanyDropdown] = useState(false);
  const [expandedCompanies, setExpandedCompanies] = useState([]);
  const [selectedRegion, setSelectedRegion] = useState("All");
  const [contentType, setContentType] = useState("nota");
  const [labelMode, setLabelMode] = useState('raw'); // 'raw', 'percent', 'none'
  const [trendCompany, setTrendCompany] = useState(null);

  // New state for Heatmap
  const [heatmapCompany, setHeatmapCompany] = useState(null);
  const [heatmapStartDate, setHeatmapStartDate] = useState(null);
  const [heatmapEndDate, setHeatmapEndDate] = useState(null);

  // NEW STATE for R-squared correlations (copied from VerticalOverview)
  const [r2Correlations, setR2Correlations] = useState(null);
  const [showR2Mode, setShowR2Mode] = useState(false); // Toggle between r and r²
  const [targetScore, setTargetScore] = useState(80); // Target score for calculator

  // Constants
  const TIME_RANGES = ['daily', 'monthly', 'yearly', 'all', 'custom'];

  const regionMap = {
    Norte: ["Ciudad Juárez", "Chihuahua", "Sinaloa", "Laguna"],
    Centro: ["Jalisco", "Querétaro", "Morelos", "Bajío", "Aguascalientes"],
    Sur: ["Chiapas", "Quintana Roo", "Yúcatan", "Guerrero"],
    Oriente: ["Veracruz", "Puebla"],
    Occidente: ["Baja California"],
  };

  const regionList = Object.keys(regionMap);


  // Define local companies
  const localCompanies = [
    "Quintana Roo", "Bajío", "Ciudad Juárez", "Yúcatan", "Jalisco",
    "Puebla", "Veracruz", "Baja California", "Morelos", "Guerrero",
    "Chiapas", "Sinaloa", "Aguascalientes", "Queretaro", "Chihuahua", "Laguna"
  ];

  const allCompanies = [...localCompanies];

  const companyColors = {
    "Quintana Roo": "#22D34C",
    "Bajío": "#FF3B3B",
    "Ciudad Juárez": "#F2C744",
    "Yúcatan": "#4A6CF7",
    "Jalisco": "#FF5F6D",
    "Puebla": "#00F7FF",
    "Veracruz": "#FF8A00",
    "Baja California": "#7B61FF",
    "Morelos": "#00C2A8",
    "Guerrero": "#FFC700",
    "Chiapas": "#FF6B6B",
    "Sinaloa": "#36D6AD",
    "Aguascalientes": "#6772E5",
    "Queretaro": "#FF4081",
    "Chihuahua": "#29B6F6",
    "Laguna": "#9C27B0"
  };

  const metricKeys = {
    "Quintana Roo": {
      score: "Score_14",
      cls: "CLS_14",
      lcp: "LCP_14",
      si: "SI_14",
      tbt: "TBT_14",
      fcp: "FCP_14"
    },
    "Bajío": {
      score: "Score_15",
      cls: "CLS_15",
      lcp: "LCP_15",
      si: "SI_15",
      tbt: "TBT_15",
      fcp: "FCP_15"
    },
    "Ciudad Juárez": {
      score: "Score_16",
      cls: "CLS_16",
      lcp: "LCP_16",
      si: "SI_16",
      tbt: "TBT_16",
      fcp: "FCP_16"
    },
    "Yúcatan": {
      score: "Score_17",
      cls: "CLS_17",
      lcp: "LCP_17",
      si: "SI_17",
      tbt: "TBT_17",
      fcp: "FCP_17"
    },
    "Jalisco": {
      score: "Score_18",
      cls: "CLS_18",
      lcp: "LCP_18",
      si: "SI_18",
      tbt: "TBT_18",
      fcp: "FCP_18"
    },
    "Puebla": {
      score: "Score_19",
      cls: "CLS_19",
      lcp: "LCP_19",
      si: "SI_19",
      tbt: "TBT_19",
      fcp: "FCP_19"
    },
    "Veracruz": {
      score: "Score_20",
      cls: "CLS_20",
      lcp: "LCP_20",
      si: "SI_20",
      tbt: "TBT_20",
      fcp: "FCP_20"
    },
    "Baja California": {
      score: "Score_21",
      cls: "CLS_21",
      lcp: "LCP_21",
      si: "SI_21",
      tbt: "TBT_21",
      fcp: "FCP_21"
    },
    "Morelos": {
      score: "Score_22",
      cls: "CLS_22",
      lcp: "LCP_22",
      si: "SI_22",
      tbt: "TBT_22",
      fcp: "FCP_22"
    },
    "Guerrero": {
      score: "Score_23",
      cls: "CLS_23",
      lcp: "LCP_23",
      si: "SI_23",
      tbt: "TBT_23",
      fcp: "FCP_23"
    },
    "Chiapas": {
      score: "Score_24",
      cls: "CLS_24",
      lcp: "LCP_24",
      si: "SI_24",
      tbt: "TBT_24",
      fcp: "FCP_24"
    },
    "Sinaloa": {
      score: "Score_25",
      cls: "CLS_25",
      lcp: "LCP_25",
      si: "SI_25",
      tbt: "TBT_25",
      fcp: "FCP_25"
    },
    "Aguascalientes": {
      score: "Score_26",
      cls: "CLS_26",
      lcp: "LCP_26",
      si: "SI_26",
      tbt: "TBT_26",
      fcp: "FCP_26"
    },
    "Queretaro": {
      score: "Score_27",
      cls: "CLS_27",
      lcp: "LCP_27",
      si: "SI_27",
      tbt: "TBT_27",
      fcp: "FCP_27"
    },
    "Chihuahua": {
      score: "Score_28",
      cls: "CLS_28",
      lcp: "LCP_28",
      si: "SI_28",
      tbt: "TBT_28",
      fcp: "FCP_28"
    },
    "Laguna": {
      score: "Score_29",
      cls: "CLS_29",
      lcp: "LCP_29",
      si: "SI_29",
      tbt: "TBT_29",
      fcp: "FCP_29"
    }
  };


  const COLORS = {
    poor: '#FF2965',
    medium: '#FFA73D',
    good: '#2BFFB9',
    local: '#4A6CF7'
  };

  const MONTHS = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  // Data Fetching
  useEffect(() => {
    Papa.parse(
      "https://docs.google.com/spreadsheets/d/e/2PACX-1vRzIonikYeUwzVTUUO7bDLQ1DDzqzKB-BFIJ4tzJMqMlNFnxPF0eVRypNmykYVP0Pn-w1tfnOCTaKaP/pub?output=csv",
      {
        download: true,
        header: true,
        skipEmptyLines: true,
        complete: ({ data: parsed }) => {
          setData(parsed);
          const dateKey = Object.keys(parsed[0])[0];
          const dates = Array.from(new Set(parsed.map(row => row[dateKey])))
            .map(d => new Date(d)).sort((a, b) => a - b);

          const years = Array.from(new Set(dates.map(d => d.getFullYear()))).sort();
          setAvailableYears(years);

          if (years.length > 0) {
            setSelectedYear(years[years.length - 1]);
          }

          setUniqueDates(dates);
          setSelectedDateIndex(dates.length - 1);

          if (dates.length > 1) {
            setPreviousDateIndex(dates.length - 2);
          }

          setSelectedCompanies(allCompanies);

          // Initialize heatmap dates and company
          if (dates.length > 0) {
            setHeatmapStartDate(dates[0]);
            setHeatmapEndDate(dates[dates.length - 1]);
            setHeatmapCompany(localCompanies[0]); // Select first local company by default
          }
        },
        error: (error) => {
          console.error("Error parsing CSV:", error);
        }
      }
    );
  }, []);

  // Define score mapping
  const localCompanyScoreKeys = {
    "Quintana Roo": "Score_14",
    "Bajío": "Score_15",
    "Ciudad Juárez": "Score_16",
    "Yúcatan": "Score_17",
    "Jalisco": "Score_18",
    "Puebla": "Score_19",
    "Veracruz": "Score_20",
    "Baja California": "Score_21",
    "Morelos": "Score_22",
    "Guerrero": "Score_23",
    "Chiapas": "Score_24",
    "Sinaloa": "Score_25",
    "Aguascalientes": "Score_26",
    "Queretaro": "Score_27",
    "Chihuahua": "Score_28",
    "Laguna": "Score_29"
  };

  // Filter dates based on selected year and month
  const filteredDates = useMemo(() => {
    if (!uniqueDates.length) return [];

    if (dateFilterType === "all") {
      return uniqueDates;
    } else if (dateFilterType === "year") {
      return uniqueDates.filter(d => d.getFullYear() === selectedYear);
    } else if (dateFilterType === "month") {
      return uniqueDates.filter(
        d => d.getFullYear() === selectedYear && d.getMonth() === selectedMonth
      );
    }

    return uniqueDates;
  }, [uniqueDates, dateFilterType, selectedYear, selectedMonth]);

  // Current date selection
  const selectedDate = filteredDates[selectedDateIndex] || uniqueDates[uniqueDates.length - 1];
  const dateStr = selectedDate?.toISOString().split("T")[0];

  const previousDate = previousDateIndex !== null ?
    (filteredDates[previousDateIndex] || uniqueDates[uniqueDates.length - 2]) : null;
  const previousDateStr = previousDate?.toISOString().split("T")[0];

  // Update date indices when filter changes
  useEffect(() => {
    if (filteredDates.length > 0) {
      setSelectedDateIndex(filteredDates.length - 1);
      if (filteredDates.length > 1) {
        setPreviousDateIndex(filteredDates.length - 2);
      } else {
        setPreviousDateIndex(null);
      }
    }
  }, [filteredDates]);

  const computeScore = (company, type = contentType, date = dateStr, isRange = false) => {
    if (!data.length) return 0;

    const dateKey = Object.keys(data[0])[0];

    // Special case: AllCombined
    if (company === "AllCombined") {
      const companies = allCompanies;
      const scores = companies.map(c => computeScore(c, type, date, isRange)).filter(s => !isNaN(s));
      const avg = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
      return parseFloat(avg.toFixed(1));
    }

    // Handle both type
    if (type === "both") {
      const notaScore = computeScore(company, "nota", date, isRange);
      const videoScore = computeScore(company, "video", date, isRange);
      const values = [notaScore, videoScore].filter(v => !isNaN(v));
      const avg = values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
      return parseFloat(avg.toFixed(1));
    }

    const scoreKey = localCompanyScoreKeys[company];
    if (!scoreKey) return 0;

    if (isRange) {
      const scores = filteredDates
        .filter(d => d <= selectedDate)
        .map(d => {
          const dStr = d.toISOString().split("T")[0];
          const rows = data.filter(row => row[dateKey] === dStr && row.Type === type);
          return rows.map(r => parseFloat(r[scoreKey])).filter(n => !isNaN(n));
        }).flat();

      const avg = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
      return parseFloat(avg.toFixed(1));
    }

    let total = 0, count = 0;
    data.forEach(row => {
      if (row[dateKey] === date && row.Type === type) {
        const score = parseFloat(row[scoreKey]);
        if (!isNaN(score)) {
          total += score;
          count++;
        }
      }
    });

    return count ? parseFloat((total / count).toFixed(1)) : 0;
  };

  const getTrendData = (company) => {
    if (!company || !data.length || !filteredDates.length) return null;

    const formatDate = (d) => d.toISOString().split("T")[0];
    const [startIdx, endIdx] = [
        Math.min(previousDateIndex ?? 0, selectedDateIndex),
        Math.max(previousDateIndex ?? 0, selectedDateIndex)
    ];
    const dateObjects = filteredDates.slice(startIdx, endIdx + 1);
    const labels = dateObjects.map(formatDate);
    const scores = dateObjects.map(d =>
      computeScore(company, contentType, formatDate(d))
    );

    const validScores = scores.filter(s => !isNaN(s));
    const avg = validScores.length
        ? validScores.reduce((a, b) => a + b, 0) / validScores.length
        : 0;
    const avgLine = new Array(validScores.length).fill(avg);

    const n = validScores.length;
    const x = [...Array(n).keys()];
    const y = validScores;

    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);

    const m = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const b = (sumY - m * sumX) / n;
    const trendLine = x.map(xi => m * xi + b);


    return {
      labels,
      datasets: [
        {
          label: `${company} Trend`,
          data: y,
          borderColor: companyColors[company] || "#00f7ff",
          backgroundColor: "transparent",
          borderWidth: 2,
          tension: 0.3,
          pointRadius: 3,
          fill: false
        },
        {
          label: `${company} Average`,
          data: avgLine,
          borderColor: "white",
          borderDash: [6, 4],
          borderWidth: 1.5,
          pointRadius: 0,
          fill: false
        },
        {
          label: `${company} Regression`,
          data: trendLine,
          borderColor: "#ffdc00",
          borderDash: [4, 3],
          borderWidth: 1.5,
          pointRadius: 0,
          slopeValue: m, // 🔥 Custom field
          fill: false
        }
      ]
    };
  };



  const linearRegression = (yValues) => {
    const n = yValues.length;
    const xValues = [...Array(n).keys()];
    const sumX = xValues.reduce((a, b) => a + b, 0);
    const sumY = yValues.reduce((a, b) => a + b, 0);
    const sumXY = xValues.reduce((sum, x, i) => sum + x * yValues[i], 0);
    const sumXX = xValues.reduce((sum, x) => sum + x * x, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    const yRegression = xValues.map(x => slope * x + intercept);
    return { regressionLine: yRegression, slope: parseFloat(slope.toFixed(2)) };
  };




  // Calculate average scores for all local companies
  const getGroupScores = useMemo(() => {
    if (!selectedDate) return { local: 0, localChange: 0 };

    const calculateAverage = (scores) => {
      const valid = scores.filter(s => !isNaN(s));
      return valid.length ? parseFloat((valid.reduce((a, b) => a + b, 0) / valid.length).toFixed(1)) : 0;
    };

    const getPreviousAverage = (scores) => {
      const valid = scores.filter(s => !isNaN(s));
      return valid.length ? parseFloat((valid.reduce((a, b) => a + b, 0) / valid.length).toFixed(1)) : 0;
    };


    const localScore = calculateAverage(localCompanies.map(c => computeScore(c, contentType, dateStr, timeRange !== "daily")));
    const prevLocalScore = getPreviousAverage(localCompanies.map(c => computeScore(c, contentType, previousDateStr, timeRange !== "daily")));


    const localChange = prevLocalScore ? ((localScore - prevLocalScore) / prevLocalScore * 100).toFixed(1) : 0;

    return {
      local: localScore,
      localChange: parseFloat(localChange)
    };
  }, [selectedDate, previousDateStr, localCompanies, timeRange, contentType]);



  const getMetricsForCompany = (company, type = contentType, date = dateStr) => {

    if (company === "AllCombined") {
      const allMetrics = allCompanies.map(c => getMetricsForCompany(c, type, date));
      const keys = ["cls", "lcp", "si", "tbt", "fcp"];
      const avg = {};

      keys.forEach(key => {
        const values = allMetrics.map(m => m[key]).filter(v => typeof v === "number" && !isNaN(v));
        avg[key] = values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
      });

      return avg;
    }

    if (type === "both") {
      const nota = getMetricsForCompany(company, "nota", date);
      const video = getMetricsForCompany(company, "video", date);

      const keys = ["cls", "lcp", "si", "tbt", "fcp"];
      const averaged = {};

      keys.forEach(key => {
        const values = [nota[key], video[key]].filter(v => typeof v === "number" && !isNaN(v));
        averaged[key] = values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
      });

      return averaged;
    }

    if (!data.length || !date || !metricKeys[company]) return {};

    const dateKey = Object.keys(data[0])[0];
    const matchingRows = data.filter(row => row[dateKey] === date && row.Type === type);

    if (matchingRows.length === 0) return {};

    const keys = metricKeys[company];
    
    let clsSum = 0, lcpSum = 0, siSum = 0, tbtSum = 0, fcpSum = 0, scoreSum = 0;
    let count = 0;

    matchingRows.forEach(row => {
      const score = parseFloat(row[keys.score]);
      const cls = parseFloat(row[keys.cls]);
      const lcp = parseFloat(row[keys.lcp]);
      const si = parseFloat(row[keys.si]);
      const tbt = parseFloat(row[keys.tbt]);
      const fcp = parseFloat(row[keys.fcp]);

      if (!isNaN(score)) scoreSum += score;
      if (!isNaN(cls)) clsSum += cls;
      if (!isNaN(lcp)) lcpSum += lcp;
      if (!isNaN(si)) siSum += si;
      if (!isNaN(tbt)) tbtSum += tbt;
      if (!isNaN(fcp)) fcpSum += fcp;
      
      count++;
    });

    if (count === 0) return {};

    return {
      overallScore: parseFloat((scoreSum / count).toFixed(1)),
      cls: parseFloat((clsSum / count).toFixed(3)),
      lcp: parseFloat((lcpSum / count).toFixed(1)),
      si: parseFloat((siSum / count).toFixed(1)),
      tbt: parseFloat((tbtSum / count).toFixed(1)),
      fcp: parseFloat((fcpSum / count).toFixed(1))
    };
  };



  // Individual company performance data
  const companyPerformance = useMemo(() => {
    const formatDate = (d) => d.toISOString().split("T")[0];

    const getAvgScoreForCompany = (company) => {
      let relevantDates = [];

      if (timeRange === "daily") {
        relevantDates = selectedDate ? [selectedDate] : [];
      } else if (timeRange === "monthly") {
        const start = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
        relevantDates = uniqueDates.filter(d => d >= start && d <= selectedDate);
      } else if (timeRange === "yearly") {
        const start = new Date(selectedDate.getFullYear(), 0, 1);
        relevantDates = uniqueDates.filter(d => d >= start && d <= selectedDate);
      } else if (timeRange === "all") {
        relevantDates = uniqueDates.filter(d => d <= selectedDate);
      } else if (timeRange === "custom" && compareStartDate && compareEndDate) {
        relevantDates = uniqueDates.filter(d => d >= compareStartDate && d <= compareEndDate);
      }

      const scores = relevantDates
        .map(d => computeScore(company, contentType, formatDate(d)))
        .filter(s => !isNaN(s));

      const avg = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
      return parseFloat(avg.toFixed(1));
    };

    const computed = selectedCompanies.map(company => {
      const currentScore = getAvgScoreForCompany(company);
      const previousScore = previousDateStr ? computeScore(company, contentType, previousDateStr) : 0;
      const change = previousScore ? ((currentScore - previousScore) / previousScore * 100).toFixed(1) : 0;

      return {
        name: company,
        score: currentScore,
        previousScore,
        change: parseFloat(change),
        color: companyColors[company]
      };
    }).sort((a, b) => b.score - a.score);

    window.companyPerformanceLocal = computed; // Expose to window for radar chart formatter
    return computed;
  }, [selectedCompanies, dateStr, previousDateStr, contentType, timeRange, selectedDate, uniqueDates, compareStartDate, compareEndDate]);



  // Top and bottom performers
  const topPerformers = useMemo(() => {
    return [...companyPerformance].sort((a, b) => b.score - a.score).slice(0, 3);
  }, [companyPerformance]);

  const bottomPerformers = useMemo(() => {
    return [...companyPerformance].sort((a, b) => a.score - b.score).slice(0, 3);
  }, [companyPerformance]);

  const mostImproved = useMemo(() => {
    return [...companyPerformance].filter(c => c.previousScore > 0).sort((a, b) => b.change - a.change).slice(0, 3);
  }, [companyPerformance]);

  const mostDeclined = useMemo(() => {
    return [...companyPerformance].filter(c => c.previousScore > 0).sort((a, b) => a.change - b.change).slice(0, 3);
  }, [companyPerformance]);

  // Chart data with responsive bar sizing
  const getBarChartData = () => {
    const formatDate = (d) => d.toISOString().split("T")[0];

    const getAvgScoreForCompany = (company, type, startDate, endDate) => {
      const scores = uniqueDates
        .filter(d => d >= startDate && d <= endDate)
        .map(d => computeScore(company, type, formatDate(d)))
        .filter(score => !isNaN(score));
      const avg = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
      return parseFloat(avg.toFixed(1));
    };

    const orderedCompanies = visibleCompanies.map(c => c.name);
    const isCombined = selectedRegion === "Combined";



    if (timeRange === "custom") {
      const labels = orderedCompanies;

      const primaryData = orderedCompanies.map(c =>
        getAvgScoreForCompany(c, contentType, compareStartDate, compareEndDate)
      );

      const comparisonData = (compareStartDate2 && compareEndDate2)
        ? orderedCompanies.map(c =>
          getAvgScoreForCompany(c, contentType, compareStartDate2, compareEndDate2)
        )
        : [];

      const datasets = [
        {
          label: "Primary Range",
          data: primaryData,
          backgroundColor: orderedCompanies.map(c => companyColors[c] || "#00f7ff"),
          barThickness: 20,
          maxBarThickness: 30
        }
      ];

      if (comparisonData.length) {
        datasets.push({
          label: "Comparison Range",
          data: comparisonData,
          backgroundColor: "#8884d8",
          barThickness: 20,
          maxBarThickness: 30
        });
      }

      return { labels, datasets };
    }

    // Default behavior for daily, monthly, yearly, all
    let displayDates = [];
    let labels = [];

    const safeFilteredDates = filteredDates || [];
    const safeUniqueDates = uniqueDates || [];

    const formatDateLabel = (date) => {
      if (!date) return "";
      if (displayDates.length > 30) {
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      } else if (displayDates.length > 10) {
        return date.getDate().toString();
      }
      return date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric'
      });
    };

    if (timeRange === "daily") {
      const startIdx = Math.min(previousDateIndex ?? 0, selectedDateIndex);
      const endIdx = Math.max(previousDateIndex ?? 0, selectedDateIndex);
      displayDates = filteredDates.slice(startIdx, endIdx + 1);
      labels = displayDates.map(d => formatDateLabel(d));
    } else if (timeRange === "monthly") {
      const monthStart = selectedDate ? new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1) : null;
      displayDates = monthStart ? safeUniqueDates.filter(d => d >= monthStart && d <= selectedDate) : [];
      labels = displayDates.map(d => formatDateLabel(d));
    } else if (timeRange === "yearly") {
      const yearStart = selectedDate ? new Date(selectedDate.getFullYear(), 0, 1) : null;
      displayDates = yearStart ? safeUniqueDates.filter(d => d >= yearStart && d <= selectedDate) : [];
      labels = displayDates.map(d => d.toLocaleDateString('en-US', { month: 'short' }));
    } else if (timeRange === "all") {
      displayDates = selectedDate ? safeUniqueDates.filter(d => d <= selectedDate) : [];
      labels = displayDates.map(d => d.toLocaleDateString('en-US', { year: 'numeric', month: 'short' }));
    }

    const totalBars = displayDates.length * orderedCompanies.length;
    const dynamicBarThickness = Math.max(2, Math.floor(800 / totalBars));

    const datasets = displayDates.map(date => {
      if (!date) return null;
      const dateStr = date.toISOString().split('T')[0];

      const values = isCombined
        ? [
          allCompanies
            .map(c => computeScore(c, contentType, dateStr))
            .filter(v => !isNaN(v))
            .reduce((a, b) => a + b, 0) / allCompanies.length
        ]
        : orderedCompanies.map(c =>
          computeScore(c, contentType, dateStr) || 0
        );

      return {
        label: formatDateLabel(date),
        data: values,
        backgroundColor: isCombined
          ? ["#00f7ff"]
          : orderedCompanies.map(c => (companyColors && companyColors[c]) || "#00f7ff"),
        barThickness: dynamicBarThickness,
        maxBarThickness: 20,
        categoryPercentage: 1.0,
        barPercentage: 1.0,
        datalabels: {
          display: displayDates.length <= 10,
          color: "white",
          font: { weight: "bold" }
        }
      };
    }).filter(Boolean);

    const chartData = { labels: orderedCompanies, datasets };
    chartData.companyPerformance = companyPerformance; // Pass companyPerformance to chartData
    return chartData;
  };

  const getRadarData = (companySet) => {
    const labels = companySet;
    const datasets = [];

    if (contentType === "nota" || contentType === "both") {
      datasets.push({
        label: "Nota",
        data: labels.map(c => computeScore(c, "nota", dateStr, timeRange !== "daily")),
        borderColor: "#00FFFF",
        pointBackgroundColor: "#00FFFF",
        backgroundColor: "#00FFFF22",
        borderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
        datalabels: {
          display: true,
          color: "white",
          font: { weight: "bold", size: 11 },
          align: "end"
        }
      });
    }

    if (contentType === "video" || contentType === "both") {
      datasets.push({
        label: "Video",
        data: labels.map(c => computeScore(c, "video", dateStr, timeRange !== "daily")),
        borderColor: "#FF00FF",
        pointBackgroundColor: "#FF00FF",
        backgroundColor: "#FF00FF22",
        borderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
        datalabels: {
          display: true,
          color: "white",
          font: { weight: "bold", size: 11 },
          align: "end"
        }
      });
    }

    return { labels, datasets };
  };



  const formatDisplayDate = (date) => {
    if (!date) return "";
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getEquitativeScore = (companies) => {
    const scores = companies.map(c => computeScore(c)).filter(s => !isNaN(s));
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    const variance = scores.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / scores.length;
    const stdDev = Math.sqrt(variance);

    const score = Math.max(0, 100 - stdDev * 2); // You can adjust multiplier (2) if needed
    return score.toFixed(1);
  };

  const equitativeScore = useMemo(() => {
    const scores = localCompanies
      .map(c => computeScore(c, contentType, dateStr, timeRange !== "daily"))
      .filter(s => !isNaN(s));
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    const variance = scores.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / scores.length;
    const stdDev = Math.sqrt(variance);
    return Math.max(0, 100 - stdDev * 2).toFixed(1);
  }, [localCompanies, contentType, dateStr, timeRange]);


  const visibleCompanies = useMemo(() => {
    if (selectedRegion === "All") return companyPerformance;

    if (selectedRegion === "Combined") {
      // Return a single dummy "All" company for combined average display
      const avgScore = computeScore("AllCombined", contentType); // handled below
      const prevAvgScore = previousDateStr ? computeScore("AllCombined", contentType, previousDateStr) : 0;
      const change = prevAvgScore ? ((avgScore - prevAvgScore) / prevAvgScore * 100).toFixed(1) : 0;

      return [{
        name: "All Combined",
        score: avgScore,
        previousScore: prevAvgScore,
        change: parseFloat(change),
        color: "#00f7ff"
      }];
    }

    const regionCompanies = regionMap[selectedRegion] || [];
    return companyPerformance.filter(c => regionCompanies.includes(c.name));
  }, [companyPerformance, selectedRegion, contentType, previousDateStr, dateStr]);

  const radarData = useMemo(() => {
    return getRadarData(visibleCompanies.map(c => c.name));
  }, [visibleCompanies, dateStr, timeRange, contentType]);


  // Heatmap data generation
  const getHeatmapData = useMemo(() => {
    if (!heatmapCompany || !heatmapStartDate || !heatmapEndDate || !data.length) {
      return { dates: [], metrics: [] };
    }

    const relevantDates = uniqueDates.filter(
      d => d >= heatmapStartDate && d <= heatmapEndDate
    ).sort((a, b) => a - b);

    const metrics = ["cls", "lcp", "si", "tbt", "fcp"];
    const heatmapScores = {};

    relevantDates.forEach(date => {
      const dateString = date.toISOString().split('T')[0];
      const companyMetrics = getMetricsForCompany(heatmapCompany, contentType, dateString);
      heatmapScores[dateString] = companyMetrics;
    });

    return {
      dates: relevantDates.map(d => d.toISOString().split('T')[0]),
      metrics: metrics,
      data: heatmapScores
    };
  }, [heatmapCompany, heatmapStartDate, heatmapEndDate, contentType, data, uniqueDates, getMetricsForCompany]);

  // Function to get color for a heatmap cell based on metric value
  const getHeatmapCellColor = (metric, value) => {
    if (value === null || isNaN(value)) {
      return "gray.700"; // No data color
    }
    // Re-using the logic from VerticalOverview for metric colors
    const getMetricColorValue = (metric, value) => {
      if (metric === "cls") {
        if (value <= 0.1) return "lime";
        if (value <= 0.25) return "orange";
        return "red";
      } else if (metric === "lcp") {
        if (value <= 2500) return "lime";
        if (value <= 4000) return "orange";
        return "red";
      } else if (metric === "si") {
        if (value <= 3400) return "lime";
        if (value <= 5800) return "orange";
        return "red";
      } else if (metric === "tbt") {
        if (value <= 200) return "lime";
        if (value <= 600) return "orange";
        return "red";
      } else if (metric === "fcp") {
        if (value <= 1800) return "lime";
        if (value <= 3000) return "orange";
        return "red";
      }
      return "white"; // Should not happen with valid metrics
    };

    const color = getMetricColorValue(metric, value);
    switch (color) {
      case "lime": return "green.500";
      case "orange": return "orange.500";
      case "red": return "red.500";
      default: return "gray.600";
    }
  };


  // Helper functions for correlation analysis (copied from VerticalOverview)
  const normalize = (arr) => {
    const min = Math.min(...arr);
    const max = Math.max(...arr);
    if (max === min) return arr.map(() => 0);
    return arr.map(v => (v - min) / (max - min));
  };

  const isNegativeMetric = (metric) => ["lcp", "tbt", "si", "fcp", "cls"].includes(metric);

  // Lighthouse 10 weights (copied from VerticalOverview)
  const LIGHTHOUSE_WEIGHTS = {
    fcp: 0.10,  // First Contentful Paint - 10%
    si: 0.10,   // Speed Index - 10%
    lcp: 0.25,  // Largest Contentful Paint - 25%
    tbt: 0.30,  // Total Blocking Time - 30%
    cls: 0.25   // Cumulative Layout Shift - 25%
  };

  // Metric thresholds for scoring (good/needs improvement/poor) (copied from VerticalOverview)
  const METRIC_THRESHOLDS = {
    fcp: { good: 1800, poor: 3000 },
    si: { good: 3400, poor: 5800 },
    lcp: { good: 2500, poor: 4000 },
    tbt: { good: 200, poor: 600 },
    cls: { good: 0.1, poor: 0.25 }
  };

  // Calculate metric score (0-100) based on Lighthouse scoring (copied from VerticalOverview)
  const calculateMetricScore = (metric, value) => {
    if (value === null || isNaN(value)) return 0;

    const LOG_NORMAL_PARAMS = {
      fcp: { median: 1800, podr: 1000 },
      si: { median: 3400, podr: 1700 },
      lcp: { median: 2500, podr: 1200 },
      tbt: { median: 300, podr: 100 },
      cls: { median: 0.1, podr: 0.01 } // special case: lower = better
    };

    const { median, podr } = LOG_NORMAL_PARAMS[metric] || {};
    if (!median || !podr) return 0;

    // Lighthouse scoring function approximation
    const logNormalScore = (value) => {
      const ln = Math.log;
      const location = Math.log(podr);
      const shape = Math.sqrt(2 * Math.log(median / podr));
      const score = 1 / (1 + Math.exp((ln(value) - location) / shape));
      return Math.max(0, Math.min(1, score));
    };

    const score = logNormalScore(value);
    return Math.round(score * 100);
  };

  // NEW: Calculate R-squared correlations for the selected heatmap company and date range (copied from VerticalOverview)
  const calculateR2Correlations = useCallback(() => {
    if (!heatmapCompany || !heatmapStartDate || !heatmapEndDate || !data.length) {
      setR2Correlations(null);
      return;
    }

    const relevantDates = uniqueDates.filter(
      d => d >= heatmapStartDate && d <= heatmapEndDate
    ).sort((a, b) => a - b);

    const correlations = {};
    const metricsToAnalyze = ["cls", "lcp", "si", "tbt", "fcp"];

    metricsToAnalyze.forEach(metric => {
      const metricValuesForR = [];
      const overallScoresForR = [];

      for (let i = 0; i < relevantDates.length; i++) {
        const dateString = relevantDates[i].toISOString().split('T')[0];
        const currentMetrics = getMetricsForCompany(heatmapCompany, contentType, dateString);

        if (currentMetrics.overallScore && !isNaN(currentMetrics.overallScore) &&
          currentMetrics[metric] !== null && !isNaN(currentMetrics[metric])) {
          metricValuesForR.push(currentMetrics[metric]);
          overallScoresForR.push(currentMetrics.overallScore);
        }
      }

      if (metricValuesForR.length >= 3) { // Need at least 3 points for meaningful correlation
        try {
          // Normalize both arrays to handle scale differences
          const normalizedMetrics = normalize(metricValuesForR);
          const normalizedScores = normalize(overallScoresForR);

          // Invert negative metrics so positive correlation = good performance
          const adjustedMetricValues = isNegativeMetric(metric)
            ? normalizedMetrics.map(v => 1 - v)
            : normalizedMetrics;

          // Calculate Pearson correlation coefficient
          const r = sampleCorrelation(adjustedMetricValues, normalizedScores);
          const r2 = r * r;

          // Calculate confidence based on sample size (simplified for display)
          const n = metricValuesForR.length;
          const standardError = n > 2 ? Math.sqrt((1 - r2) / (n - 2)) : 0;
          const confidence = 1.96 * standardError; // 95% confidence interval

          // Calculate current metric score and potential improvement
          const avgValue = metricValuesForR.reduce((a, b) => a + b, 0) / n;
          const currentMetricScore = calculateMetricScore(metric, avgValue);
          const maxPossibleScore = 100;
          const potentialImprovement = maxPossibleScore - currentMetricScore;

          correlations[metric] = {
            r: parseFloat(r.toFixed(3)),
            r2: parseFloat(r2.toFixed(3)),
            n: n,
            confidence: parseFloat(confidence.toFixed(3)),
            avgValue: avgValue,
            minValue: Math.min(...metricValuesForR),
            maxValue: Math.max(...metricValuesForR),
            weight: LIGHTHOUSE_WEIGHTS[metric],
            currentMetricScore: currentMetricScore,
            potentialImprovement: potentialImprovement,
            weightedPotentialGain: potentialImprovement * LIGHTHOUSE_WEIGHTS[metric]
          };
        } catch (e) {
          console.warn(`Could not calculate correlation for ${metric}:`, e);
          correlations[metric] = null;
        }
      } else {
        correlations[metric] = null;
      }
    });

    setR2Correlations(correlations);
  }, [heatmapCompany, heatmapStartDate, heatmapEndDate, contentType, data, uniqueDates, getMetricsForCompany]);

  // Effect to re-calculate R2 when heatmap selections change (copied from VerticalOverview)
  useEffect(() => {
    calculateR2Correlations();
  }, [heatmapCompany, heatmapStartDate, heatmapEndDate, contentType, calculateR2Correlations]);

  // NEW: R-squared Chart Data (copied from VerticalOverview)
  const getR2ChartData = useMemo(() => {
    if (!r2Correlations) {
      return { labels: [], datasets: [] };
    }

    const labels = ["CLS", "LCP", "SI", "TBT", "FCP"];
    const values = showR2Mode
      ? [ // Show R²
        r2Correlations.cls?.r2,
        r2Correlations.lcp?.r2,
        r2Correlations.si?.r2,
        r2Correlations.tbt?.r2,
        r2Correlations.fcp?.r2
      ]
      : [ // Show R
        r2Correlations.cls?.r,
        r2Correlations.lcp?.r,
        r2Correlations.si?.r,
        r2Correlations.tbt?.r,
        r2Correlations.fcp?.r
      ];

    // Add weight indicators to labels
    const labelsWithWeights = labels.map((label, idx) => {
      const metric = label.toLowerCase();
      const weight = LIGHTHOUSE_WEIGHTS[metric] * 100;
      return `${label}\n(${weight}%)`;
    });

    const backgroundColors = values.map((value, idx) => {
      if (value === null || value === undefined) return "rgba(128, 128, 128, 0.5)";

      const absValue = showR2Mode ? value : Math.abs(value);
      const metric = labels[idx].toLowerCase();
      const weight = LIGHTHOUSE_WEIGHTS[metric];

      // Enhanced colors based on both correlation and weight
      if (absValue >= 0.7 && weight >= 0.25) return "rgba(34, 211, 76, 1)"; // Strong + High weight (bright green)
      if (absValue >= 0.7) return "rgba(34, 211, 76, 0.8)"; // Strong correlation (green)
      if (absValue >= 0.4) return "rgba(255, 167, 61, 0.8)"; // Moderate correlation (orange)
      return "rgba(255, 41, 101, 0.8)"; // Weak correlation (red)
    });

    return {
      labels: labels,
      datasets: [{
        label: showR2Mode ? "R² (Variance Explained)" : "Correlation Strength (r)",
        data: values.map(v => v !== null && v !== undefined ? v : 0),
        backgroundColor: backgroundColors,
        borderColor: backgroundColors.map(c => c.replace('0.8', '1')),
        borderWidth: 2,
      }]
    };
  }, [r2Correlations, showR2Mode]);

  // Calculate expected score improvement (copied from VerticalOverview)
  const calculateScoreImpact = (metric, percentImprovement = 10) => {
    if (!r2Correlations || !r2Correlations[metric]) return null;

    const correlation = r2Correlations[metric];
    const currentAvg = correlation.avgValue;
    const thresholds = METRIC_THRESHOLDS[metric];

    // Calculate target value based on percentage improvement
    const targetValue = isNegativeMetric(metric)
      ? currentAvg * (1 - percentImprovement / 100)
      : currentAvg * (1 + percentImprovement / 100);

    // Calculate optimal target (good threshold)
    const optimalTarget = thresholds.good;

    // Calculate current and target metric scores
    const currentMetricScore = calculateMetricScore(metric, currentAvg);
    const targetMetricScore = calculateMetricScore(metric, targetValue);
    const optimalMetricScore = 100;

    // Calculate weighted score improvements
    const immediateGain = (targetMetricScore - currentMetricScore) * LIGHTHOUSE_WEIGHTS[metric];
    const maxPossibleGain = (optimalMetricScore - currentMetricScore) * LIGHTHOUSE_WEIGHTS[metric];

    return {
      metric,
      currentAvg: currentAvg.toFixed(metric === 'cls' ? 3 : 0),
      targetValue: targetValue.toFixed(metric === 'cls' ? 3 : 0),
      optimalTarget: optimalTarget.toFixed(metric === 'cls' ? 3 : 0),
      currentMetricScore: currentMetricScore,
      targetMetricScore: targetMetricScore,
      immediateScoreGain: immediateGain.toFixed(1),
      maxPossibleGain: maxPossibleGain.toFixed(1),
      weight: (LIGHTHOUSE_WEIGHTS[metric] * 100).toFixed(0),
      confidence: correlation.confidence
    };
  };

  // Calculate total possible score improvement (copied from VerticalOverview)
  const calculateTotalPossibleImprovement = () => {
    if (!r2Correlations || !heatmapCompany) return null;

    // Get the actual current score using the same method as the bar chart
    const actualCurrentScore = computeScore(heatmapCompany, contentType,
      heatmapEndDate ? heatmapEndDate.toISOString().split('T')[0] : dateStr);

    let totalCurrentWeightedScore = 0;
    let totalMaxWeightedScore = 0;
    let breakdownByMetric = [];

    Object.entries(r2Correlations).forEach(([metric, data]) => {
      if (data && data.currentMetricScore !== undefined) {
        const currentWeighted = data.currentMetricScore * LIGHTHOUSE_WEIGHTS[metric];
        const maxWeighted = 100 * LIGHTHOUSE_WEIGHTS[metric];

        totalCurrentWeightedScore += currentWeighted;
        totalMaxWeightedScore += maxWeighted;

        breakdownByMetric.push({
          metric: metric.toUpperCase(),
          currentScore: data.currentMetricScore,
          currentWeighted: currentWeighted.toFixed(1),
          maxPossible: maxWeighted.toFixed(1),
          improvement: (maxWeighted - currentWeighted).toFixed(1),
          avgValue: data.avgValue.toFixed(metric === 'cls' ? 3 : 0),
          targetValue: METRIC_THRESHOLDS[metric].good.toFixed(metric === 'cls' ? 3 : 0),
          weight: LIGHTHOUSE_WEIGHTS[metric]
        });
      }
    });

    // Sort by improvement potential
    breakdownByMetric.sort((a, b) => parseFloat(b.improvement) - parseFloat(a.improvement));

    return {
      actualCurrentScore: actualCurrentScore.toFixed(1), // Use the actual score from computeScore
      currentTotal: totalCurrentWeightedScore.toFixed(1),
      maxTotal: totalMaxWeightedScore.toFixed(1),
      totalPossibleGain: (100 - actualCurrentScore).toFixed(1),
      breakdown: breakdownByMetric
    };
  };

  // Calculate required improvements to reach target score (copied from VerticalOverview)
  const calculateTargetRequirements = (targetScoreInput) => {
    if (!r2Correlations || !heatmapCompany || !targetScoreInput) return null;

    const actualCurrentScore = computeScore(heatmapCompany, contentType,
      heatmapEndDate ? heatmapEndDate.toISOString().split('T')[0] : dateStr);

    const scoreGapNeeded = targetScoreInput - actualCurrentScore;

    if (scoreGapNeeded <= 0) {
      return { alreadyAchieved: true, currentScore: actualCurrentScore };
    }

    // Calculate improvement needed for each metric
    const metricRequirements = [];
    let cumulativeGain = 0;

    // Sort metrics by efficiency (weight * potential improvement)
    const sortedMetrics = Object.entries(r2Correlations)
      .filter(([_, data]) => data && data.potentialImprovement > 0)
      .sort((a, b) => {
        const efficiencyA = a[1].weight * a[1].potentialImprovement;
        const efficiencyB = b[1].weight * b[1].potentialImprovement;
        return efficiencyB - efficiencyA;
      });

    sortedMetrics.forEach(([metric, data]) => {
      if (cumulativeGain >= scoreGapNeeded) return;

      const currentValue = data.avgValue;
      const goodThreshold = METRIC_THRESHOLDS[metric].good;

      // Calculate how much we need to improve this metric
      let targetValue;
      let metricScoreGain;

      // Determine the target value and gain based on whether we need partial or full improvement
      if (isNegativeMetric(metric)) { // For metrics where lower is better (e.g., CLS, LCP)
        const currentScoreForMetric = calculateMetricScore(metric, currentValue);
        const optimalScoreForMetric = calculateMetricScore(metric, goodThreshold);
        const remainingScorePointsForMetric = optimalScoreForMetric - currentScoreForMetric;

        const maxGainFromThisMetric = remainingScorePointsForMetric * data.weight;

        if (remainingScorePointsForMetric <= 0) { // Metric is already "good" or better
          targetValue = currentValue; // No change needed
          metricScoreGain = 0;
        } else if (cumulativeGain + maxGainFromThisMetric >= scoreGapNeeded) {
          // We can achieve the target score with a partial improvement in this metric
          const neededGainFromThisMetric = scoreGapNeeded - cumulativeGain;
          const percentageOfImprovementNeeded = neededGainFromThisMetric / maxGainFromThisMetric;

          // Interpolate the target value based on the needed percentage of score improvement
          // This is a rough estimation, a more precise model would involve inverse log-normal
          targetValue = currentValue - (currentValue - goodThreshold) * percentageOfImprovementNeeded;
          metricScoreGain = neededGainFromThisMetric;
        } else {
          // Need full improvement to good threshold for this metric
          targetValue = goodThreshold;
          metricScoreGain = maxGainFromThisMetric;
        }

        const percentChange = ((currentValue - targetValue) / currentValue * 100).toFixed(1);

        if (metricScoreGain > 0) {
          metricRequirements.push({
            metric: metric.toUpperCase(),
            currentValue: currentValue.toFixed(metric === 'cls' ? 3 : 0),
            targetValue: targetValue.toFixed(metric === 'cls' ? 3 : 0),
            percentChange: percentChange,
            scoreGain: metricScoreGain.toFixed(1),
            weight: (data.weight * 100).toFixed(0)
          });
        }
        cumulativeGain += metricScoreGain;

      } else { // For metrics where higher is better (if any, typically not in Core Web Vitals)
        // This part would need to be implemented if there were positive metrics like "Performance Score" itself
        // For Core Web Vitals, all are negative metrics, so this block is mostly illustrative.
        // For now, it will simply skip as all Core Web Vitals are considered "negative" (lower is better).
      }
    });

    return {
      currentScore: actualCurrentScore.toFixed(1),
      targetScore: targetScoreInput,
      scoreGapNeeded: scoreGapNeeded.toFixed(1),
      achievable: cumulativeGain >= scoreGapNeeded,
      requirements: metricRequirements,
      totalGainPossible: cumulativeGain.toFixed(1)
    };
  };

  return (
    <Box pt="50px" px={6} className="glass-bg" position="relative">
      <MatrixRain /> {/* 👈 Añadido aquí */}
      <Text className="title">Local Overview</Text>


      <Flex justify="center" mt={4}>
        <Select
          value={contentType}
          onChange={(e) => setContentType(e.target.value)}
          width="200px"
          bg="rgba(255,255,255,0.1)"
          color="white"
          borderColor="rgba(255,255,255,0.2)"
          _hover={{ bg: 'rgba(255,255,255,0.15)' }}
          _focus={{ bg: 'rgba(255,255,255,0.15)' }}
        >
          <option value="nota">Nota</option>
          <option value="video">Video</option>
          <option value="both">Both</option>
        </Select>
      </Flex>




      {!selectedDate ? (
        <Flex justify="center" align="center" height="30vh">
          <Spinner size="xl" color="white" />
        </Flex>
      ) : (
        <VStack spacing={8}>
          {/* Date Navigation */}
          <Flex justify="center" align="center" mt={6} mb={4}>

            <IconButton
              icon={<FaChevronLeft />}
              onClick={() => {
                setPreviousDateIndex(selectedDateIndex);
                setSelectedDateIndex(i => Math.max(i - 1, 0));
              }}
              aria-label="Previous date"
              variant="ghost"
              color="white"
              isDisabled={selectedDateIndex === 0}
            />

            <Box textAlign="center" mx={4}>
              <Text fontSize="sm" color="rgba(255,255,255,0.7)" mb={1}>Viewing data for</Text>
              <Input
                type="date"
                value={selectedDate ? selectedDate.toISOString().split('T')[0] : ''}
                onChange={(e) => {
                  const newDate = new Date(e.target.value);
                  if (!isNaN(newDate)) {
                    const matchedDate = uniqueDates.find(d => d.toISOString().split('T')[0] === newDate.toISOString().split('T')[0]);
                    if (matchedDate) {
                      const newIndex = filteredDates.findIndex(d => d.getTime() === matchedDate.getTime());
                      if (newIndex !== -1) {
                        setPreviousDateIndex(selectedDateIndex);
                        setSelectedDateIndex(newIndex);
                      }
                    }
                  }
                }}
                list="available-dates"
                max={uniqueDates.length ? uniqueDates[uniqueDates.length - 1].toISOString().split('T')[0] : ''}
                min={uniqueDates.length ? uniqueDates[0].toISOString().split('T')[0] : ''}
                bg="rgba(255,255,255,0.1)"
                color="white"
                borderColor="rgba(255,255,255,0.2)"
                _hover={{ bg: 'rgba(255,255,255,0.15)' }}
                _focus={{ bg: 'rgba(255,255,255,0.15)' }}
                sx={{
                  '::-webkit-calendar-picker-indicator': {
                    filter: 'invert(1)', // Makes the calendar icon white
                  }
                }}
              />
              <datalist id="available-dates">
                {uniqueDates.map((date) => (
                  <option key={date.toISOString()} value={date.toISOString().split('T')[0]} />
                ))}
              </datalist>
            </Box>

            <IconButton
              icon={<FaChevronRight />}
              onClick={() => {
                setPreviousDateIndex(selectedDateIndex);
                setSelectedDateIndex(i => Math.min(i + 1, uniqueDates.length - 1));
              }}
              aria-label="Next date"
              variant="ghost"
              color="white"
              isDisabled={selectedDateIndex === uniqueDates.length - 1}
            />
          </Flex>

          {/* Performance Summary */}
          <Box width="100%" maxW="1200px" mx="auto">
            <Grid
              templateColumns={{ base: "1fr", sm: "repeat(2, 1fr)", md: "repeat(3, 1fr)", lg: "repeat(4, 1fr)", xl: "repeat(5, 1fr)" }}
              gap={4}
              width="100%"
            >


              {visibleCompanies.map((company) => {

                const showMetrics = expandedCompanies.includes(company.name);
                const metrics = getMetricsForCompany(company.name);

                const previousMetrics = getMetricsForCompany(company.name, contentType, previousDateStr);

                const getMetricChange = (current, previous) => {
                  if (previous === null || previous === 0) return null;
                  const diff = ((current - previous) / previous) * 100;
                  return parseFloat(diff.toFixed(1));
                };

                const clsChange = metrics.cls !== null && previousMetrics.cls !== null ? getMetricChange(metrics.cls, previousMetrics.cls) : null;
                const lcpChange = metrics.lcp !== null && previousMetrics.lcp !== null ? getMetricChange(metrics.lcp, previousMetrics.lcp) : null;
                const siChange = metrics.si !== null && previousMetrics.si !== null ? getMetricChange(metrics.si, previousMetrics.si) : null;
                const tbtChange = metrics.tbt !== null && previousMetrics.tbt !== null ? getMetricChange(metrics.tbt, previousMetrics.tbt) : null;
                const fcpChange = metrics.fcp !== null && previousMetrics.fcp !== null ? getMetricChange(metrics.fcp, previousMetrics.fcp) : null;

                const getMetricColor = (metric, value) => {
                  if (value === null) return "white";
                  if (metric === "cls") {
                    if (value <= 0.1) return "lime";
                    if (value <= 0.25) return "orange";
                    return "red";
                  } else if (metric === "lcp") {
                    if (value <= 2500) return "lime";
                    if (value <= 4000) return "orange";
                    return "red";
                  } else if (metric === "si") {
                    if (value <= 3400) return "lime";
                    if (value <= 5800) return "orange";
                    return "red";
                  } else if (metric === "tbt") {
                    if (value <= 200) return "lime";
                    if (value <= 600) return "orange";
                    return "red";
                  } else if (metric === "fcp") {
                    if (value <= 1800) return "lime";
                    if (value <= 3000) return "orange";
                    return "red";
                  }
                  return "white";
                };



                return (
                  <GridItem key={company.name}>
                    <Box
                      className="anb-chart-container"
                      p={3}
                      borderRadius="md"
                      minH="120px"
                    >
                      <Flex justify="space-between" align="center">
                        <Text fontWeight="bold" fontSize="sm" mb={1} color="white">
                          {company.name}
                        </Text>
                        <IconButton
                          icon={showMetrics ? <FaChevronUp /> : <FaChevronDown />}
                          size="xs"
                          variant="ghost"
                          color="white"
                          aria-label="Toggle metrics"
                          onClick={() => {
                            setExpandedCompanies(prev =>
                              prev.includes(company.name)
                                ? prev.filter(c => c !== company.name)
                                : [...prev, company.name]
                            );
                          }}
                        />
                      </Flex>

                      <Stat>
                        <StatLabel fontSize="xs" color="rgba(255,255,255,0.5)">Average</StatLabel>
                        <StatNumber
                          fontSize="xl"
                          color={
                            typeof company.score === "number" && !isNaN(company.score)
                              ? company.score >= 50
                                ? "#2BFFB9"
                                : company.score >= 35
                                  ? "#FFA73D"
                                  : "#FF2965"
                              : "white"
                          }
                        >
                          {typeof company.score === "number" && !isNaN(company.score) ? (
                            <CountUp
                              end={company.score}
                              duration={1.5}
                              decimals={1}
                            />
                          ) : (
                            "-"
                          )}
                        </StatNumber>



                        {company.previousScore > 0 && (
                          <StatHelpText fontSize="xs">
                            <StatArrow type={company.change >= 0 ? "increase" : "decrease"} />
                            {Math.abs(company.change)}%
                          </StatHelpText>
                        )}
                      </Stat>

                      {showMetrics && (
                        <Box mt={2}>
                          <Text fontSize="xs" color="white">
                            CLS: <b style={{ color: getHeatmapCellColor("cls", metrics.cls) }}>{metrics.cls !== null ? metrics.cls.toFixed(3) : 'N/A'}</b>
                            {clsChange !== null && (
                              <span style={{ marginLeft: 6, color: clsChange < 0 ? "lime" : "red" }}>
                                ({clsChange > 0 ? "+" : ""}{clsChange}%)
                              </span>
                            )}
                          </Text>
                          <Text fontSize="xs" color="white">
                            LCP: <b style={{ color: getHeatmapCellColor("lcp", metrics.lcp) }}>{metrics.lcp !== null ? metrics.lcp.toLocaleString() : 'N/A'}</b>
                            {lcpChange !== null && (
                              <span style={{ marginLeft: 6, color: lcpChange < 0 ? "lime" : "red" }}>
                                ({lcpChange > 0 ? "+" : ""}{lcpChange}%)
                              </span>
                            )}
                          </Text>
                          <Text fontSize="xs" color="white">
                            SI: <b style={{ color: getHeatmapCellColor("si", metrics.si) }}>{metrics.si !== null ? metrics.si.toLocaleString() : 'N/A'}</b>
                            {siChange !== null && (
                              <span style={{ marginLeft: 6, color: siChange < 0 ? "lime" : "red" }}>
                                ({siChange > 0 ? "+" : ""}{siChange}%)
                              </span>
                            )}
                          </Text>
                          <Text fontSize="xs" color="white">
                            TBT: <b style={{ color: getHeatmapCellColor("tbt", metrics.tbt) }}>{metrics.tbt !== null ? metrics.tbt.toLocaleString() : 'N/A'}</b>
                            {tbtChange !== null && (
                              <span style={{ marginLeft: 6, color: tbtChange < 0 ? "lime" : "red" }}>
                                ({tbtChange > 0 ? "+" : ""}{tbtChange}%)
                              </span>
                            )}
                          </Text>
                          <Text fontSize="xs" color="white">
                            FCP: <b style={{ color: getHeatmapCellColor("fcp", metrics.fcp) }}>{metrics.fcp !== null ? metrics.fcp.toLocaleString() : 'N/A'}</b>
                            {fcpChange !== null && (
                              <span style={{ marginLeft: 6, color: fcpChange < 0 ? "lime" : "red" }}>
                                ({fcpChange > 0 ? "+" : ""}{fcpChange}%)
                              </span>
                            )}
                          </Text>
                        </Box>
                      )}

                    </Box>
                  </GridItem>
                );
              })}

            </Grid>
          </Box>


          {/* Bar Chart with Companies to Display */}
          <Box className="anb-chart-container" width="100%" maxW="1200px" height="auto" pb={6}>
            <Flex justify="space-between" align="center" mb={4}>
              <Flex direction="column" align="center" mb={4}>
                <Text className="anb-chart-title" mb={2}>Individual Company Performance</Text>

                <HStack spacing={2}>
                  <Text fontSize="sm" color="white">Labels:</Text>
                  <ButtonGroup isAttached size="sm" variant="outline">
                    <Button
                      colorScheme={labelMode === 'raw' ? 'blue' : 'gray'}
                      onClick={() => setLabelMode('raw')}
                    >
                      Raw
                    </Button>
                    <Button
                      colorScheme={labelMode === 'percent' ? 'blue' : 'gray'}
                      onClick={() => setLabelMode('percent')}
                    >
                      %
                    </Button>
                    <Button
                      colorScheme={labelMode === 'none' ? 'purple' : 'gray'}
                      onClick={() => setLabelMode('none')}
                    >
                      ↔
                    </Button>
                  </ButtonGroup>
                </HStack>
              </Flex>

              <Button
                size="sm"
                leftIcon={<FaChartLine />}
                onClick={() => setShowAnalytics(!showAnalytics)}
                colorScheme={showAnalytics ? "blue" : "gray"}
              >
                {showAnalytics ? "Hide Analytics" : "Show Analytics"}
              </Button>
            </Flex>

            {/* Time Range Selector */}
            <Flex justify="center" mb={4}>
              <HStack spacing={4}>
                {TIME_RANGES.map(range => (
                  <Button
                    key={range}
                    size="sm"
                    variant={timeRange === range ? "solid" : "outline"}
                    onClick={() => setTimeRange(range)}
                    colorScheme="blue"
                    color="white"
                    borderColor="white"
                    _hover={{ bg: "blue.600" }}
                    _active={{ bg: "blue.700" }}
                    fontWeight="bold"
                  >
                    {range.charAt(0).toUpperCase() + range.slice(1)}
                  </Button>
                ))}
              </HStack>
            </Flex>

            {/* Custom Date Range Selector */}
            {timeRange === "custom" && (
              <VStack spacing={4} mb={4}>
                <Flex justify="center" gap={4}>
                  <Box>
                    <Text fontSize="sm" color="white" mb={1}>Primary Start Date</Text>
                    <Input
                      type="date"
                      value={compareStartDate ? compareStartDate.toISOString().split('T')[0] : ''}
                      onChange={(e) => setCompareStartDate(new Date(e.target.value))}
                      max={compareEndDate ? compareEndDate.toISOString().split('T')[0] : selectedDate.toISOString().split('T')[0]}
                      color="white"
                    />
                  </Box>
                  <Box>
                    <Text fontSize="sm" color="white" mb={1}>Primary End Date</Text>
                    <Input
                      type="date"
                      value={compareEndDate ? compareEndDate.toISOString().split('T')[0] : ''}
                      onChange={(e) => setCompareEndDate(new Date(e.target.value))}
                      min={compareStartDate ? compareStartDate.toISOString().split('T')[0] : ''}
                      max={selectedDate.toISOString().split('T')[0]}
                      color="white"
                    />
                  </Box>
                </Flex>
                <Flex justify="center" gap={4}>
                  <Box>
                    <Text fontSize="sm" color="white" mb={1}>Compare Start Date</Text>
                    <Input
                      type="date"
                      value={compareStartDate2 ? compareStartDate2.toISOString().split('T')[0] : ''}
                      onChange={(e) => setCompareStartDate2(new Date(e.target.value))}
                      color="white"
                    />
                  </Box>
                  <Box>
                    <Text fontSize="sm" color="white" mb={1}>Compare End Date</Text>
                    <Input
                      type="date"
                      value={compareEndDate2 ? compareEndDate2.toISOString().split('T')[0] : ''}
                      onChange={(e) => setCompareEndDate2(new Date(e.target.value))}
                      min={compareStartDate2 ? compareStartDate2.toISOString().split('T')[0] : ''}
                      color="white"
                    />
                  </Box>
                </Flex>
              </VStack>
            )}

            {/* Bar Chart */}

            <Box height="400px">
              <Bar
                data={getBarChartData()}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  onClick: (event, elements, chart) => {
                    const element = chart.getElementsAtEventForMode(event.native, 'nearest', { intersect: true }, false)[0];
                    if (element) {
                      const companyName = chart.data.labels[element.index];
                      setTrendCompany(companyName);
                      setHeatmapCompany(companyName); // Set heatmap company when clicking bar chart
                      // Adjust heatmap dates to match the range of the bar chart if needed
                      if (timeRange === "custom") {
                        setHeatmapStartDate(compareStartDate);
                        setHeatmapEndDate(compareEndDate);
                      } else {
                        // Default to a reasonable range or all dates for heatmap
                        if (uniqueDates.length > 0) {
                          setHeatmapStartDate(uniqueDates[0]);
                          setHeatmapEndDate(uniqueDates[uniqueDates.length - 1]);
                        }
                      }
                    }
                  },
                  plugins: {
                    legend: { display: false },
                    tooltip: {
                      callbacks: {
                        label: (context) => `${context.dataset.label}: ${context.parsed.y}`
                      }
                    },
                    datalabels: {
                      display: function (context) {
                        return labelMode !== 'none';
                      },
                      color: (context) => {
                        if (labelMode === 'percent') {
                          const label = context.chart.data.labels[context.dataIndex];
                          const company = window.companyPerformanceLocal?.find(c => c.name === label);
                          if (!company || isNaN(company.change)) return 'white';
                          return company.change >= 0 ? '#2BFFB9' : '#FF2965';
                        }
                        return 'white';
                      },
                      font: (context) => {
                        const bar = context.chart.getDatasetMeta(context.datasetIndex).data[context.dataIndex];
                        const width = bar.width || 30;
                        const adjusted = Math.max(8, Math.min(14, width * 0.45));
                        return {
                          size: adjusted,
                          weight: 'bold'
                        };
                      },
                      align: 'center',
                      anchor: 'center',
                      clip: false,
                      formatter: (value, context) => {
                        if (labelMode === 'none') return '';

                        const label = context.chart.data.labels[context.dataIndex];
                        const company = context.chart.data.companyPerformance?.find(c => c.name === label);

                        if (labelMode === 'percent') {
                          if (!company || isNaN(company.change)) return '';
                          return company.change >= 0 ? '⬆️' : '⬇️';
                        }

                        return Math.round(value);
                      },
                    }
                  },
                  scales: {
                    x: {
                      stacked: false,
                      grid: { display: false },
                      ticks: {
                        color: "white",
                        maxRotation: 90,
                        minRotation: 45
                      }
                    },
                    y: {
                      min: 0,
                      max: 100,
                      ticks: { color: "white" },
                      grid: { color: "rgba(255,255,255,0.1)" }
                    }
                  },
                  elements: {
                    bar: {
                      borderWidth: 0,
                      borderRadius: 2
                    }
                  },
                  barPercentage: 0.6,
                  categoryPercentage: 0.8
                }}
                plugins={[ChartDataLabels]}
                key={labelMode}
              />

            </Box>


            {trendCompany && (
              <Box className="anb-chart-container" width="100%" maxW="1200px" height="300px" mt={4}>
                <Flex justify="space-between" align="center" mb={2}>
                  <Text className="anb-chart-title">{trendCompany} Performance Trend</Text>
                  <Button size="sm" colorScheme="red" onClick={() => setTrendCompany(null)}>Close</Button>
                </Flex>
                <Line
                  data={getTrendData(trendCompany)}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    interaction: {
                      mode: 'nearest',
                      intersect: false
                    },
                    plugins: {
                      legend: { labels: { color: "#ffffff" } },
                      tooltip: {
                        enabled: true,
                        callbacks: {
                          label: function (context) {
                            const datasetLabel = context.dataset.label;
                            const value = context.parsed.y;

                            // Suppress tooltip for regression line only
                            if (datasetLabel === "Trend Line") {
                              return null;
                            }

                            return `${datasetLabel}: ${value.toFixed(1)}`;
                          }
                        }
                      },
                      datalabels: {
                        display: false // ✅ Esto apaga los números encima de los puntos
                      }

                    },
                    elements: {
                      point: {
                        radius: 3,
                        hoverRadius: 6
                      }
                    },
                    scales: {
                      x: {
                        ticks: { color: "#ffffff", maxRotation: 45 },
                        grid: { display: false },
                        reverse: true
                      },
                      y: {
                        min: 0,
                        max: 100,
                        ticks: { color: "#ffffff" },
                        grid: { color: "rgba(255,255,255,0.1)" }
                      }
                    }
                  }}
                />




              </Box>
            )}



            {/* Date Slider */}
            <Flex mt={4} align="center" justify="center" flexDirection="column" gap={4}>
              <RangeSlider
                min={0}
                max={filteredDates.length - 1}
                step={1}
                value={[previousDateIndex ?? 0, selectedDateIndex]}
                onChange={([start, end]) => {
                  setPreviousDateIndex(start);
                  setSelectedDateIndex(end);
                }}
                width="70%"
                height="40px"
                colorScheme="cyan"
                isDisabled={filteredDates.length <= 1}
              >
                <RangeSliderTrack bg="rgba(255,255,255,0.2)" height="8px">
                  <RangeSliderFilledTrack bg="#00f7ff" />
                </RangeSliderTrack>
                <RangeSliderThumb index={0} />
                <RangeSliderThumb index={1} />
              </RangeSlider>

              <Text color="white" fontSize="sm" fontWeight="medium" textAlign="center">
                {filteredDates.length > 0 && previousDateIndex !== null && selectedDateIndex !== null ? (
                  <>
                    Showing data from{" "}
                    <Text as="span" fontWeight="bold">
                      {filteredDates[Math.min(previousDateIndex, selectedDateIndex)].toLocaleDateString()}
                    </Text>{" "}
                    to{" "}
                    <Text as="span" fontWeight="bold">
                      {filteredDates[Math.max(previousDateIndex, selectedDateIndex)].toLocaleDateString()}
                    </Text>
                  </>
                ) : (
                  "No dates match the current filter"
                )}
              </Text>


            </Flex>

            {/* Company Selector - Toggle Dropdown */}
            <Box mt={6}>
              <Box
                onClick={() => setShowCompanyDropdown(prev => !prev)}
                cursor="pointer"
                display="inline-block"
                px={4}
                py={2}
                borderRadius="md"
                bg="rgba(255,255,255,0.1)"
                color="white"
                fontWeight="bold"
                _hover={{ bg: "rgba(255,255,255,0.2)" }}
              >
                {showCompanyDropdown ? "Hide Companies to Display" : "Show Companies to Display"}
              </Box>

              {showCompanyDropdown && (
                <Box mt={4}>
                  <CheckboxGroup value={selectedCompanies} onChange={setSelectedCompanies}>
                    <Wrap spacing={4} justify="center">
                      {allCompanies.map(c => (
                        <Checkbox
                          key={c}
                          value={c}
                          color="white"
                          colorScheme="blue"
                        >
                          {c}
                        </Checkbox>
                      ))}
                    </Wrap>
                  </CheckboxGroup>
                </Box>
              )}
            </Box>
          </Box>

          {/* Heatmap Section - Copied from VerticalOverview */}
          <Box className="anb-chart-container" width="100%" maxW="1200px" pb={6}>
            <Text className="anb-chart-title" mb={4}>Individual Company Performance Details</Text>

            <Flex justify="center" mb={4} wrap="wrap" gap={4}>
              <Box>
                <Text fontSize="sm" color="white" mb={1}>Select Company</Text>
                <Select
                  value={heatmapCompany || ''}
                  onChange={(e) => setHeatmapCompany(e.target.value)}
                  bg="rgba(255,255,255,0.1)"
                  color="white"
                  borderColor="rgba(255,255,255,0.2)"
                  width={{ base: "100%", md: "200px" }}
                >
                  {localCompanies.map(company => (
                    <option key={company} value={company}>{company}</option>
                  ))}
                </Select>
              </Box>
              <Box>
                <Text fontSize="sm" color="white" mb={1}>Start Date</Text>
                <Input
                  type="date"
                  value={heatmapStartDate ? heatmapStartDate.toISOString().split('T')[0] : ''}
                  onChange={(e) => setHeatmapStartDate(new Date(e.target.value))}
                  max={heatmapEndDate ? heatmapEndDate.toISOString().split('T')[0] : uniqueDates[uniqueDates.length - 1]?.toISOString().split('T')[0]}
                  color="white"
                  bg="rgba(255,255,255,0.1)"
                  borderColor="rgba(255,255,255,0.2)"
                  sx={{ '::-webkit-calendar-picker-indicator': { filter: 'invert(1)' } }}
                />
              </Box>
              <Box>
                <Text fontSize="sm" color="white" mb={1}>End Date</Text>
                <Input
                  type="date"
                  value={heatmapEndDate ? heatmapEndDate.toISOString().split('T')[0] : ''}
                  onChange={(e) => setHeatmapEndDate(new Date(e.target.value))}
                  min={heatmapStartDate ? heatmapStartDate.toISOString().split('T')[0] : uniqueDates[0]?.toISOString().split('T')[0]}
                  max={uniqueDates[uniqueDates.length - 1]?.toISOString().split('T')[0]}
                  color="white"
                  bg="rgba(255,255,255,0.1)"
                  borderColor="rgba(255,255,255,0.2)"
                  sx={{ '::-webkit-calendar-picker-indicator': { filter: 'invert(1)' } }}
                />
              </Box>
            </Flex>

            <Flex direction={{ base: "column", lg: "row" }} gap={6} justify="center" align="flex-start">
              {heatmapCompany && heatmapStartDate && heatmapEndDate && getHeatmapData.dates.length > 0 ? (
                <Box overflowX="auto" pb={4} flex="1">
                  <Text className="anb-chart-subtitle" mb={2}>Metric Values Over Time</Text>
                  <Flex>
                    {/* Empty corner for alignment */}
                    <Box w="80px" flexShrink={0}></Box>
                    {/* Date Labels */}
                    {getHeatmapData.dates.map(date => (
                      <Box
                        key={date}
                        w="50px"
                        flexShrink={0}
                        textAlign="center"
                        color="white"
                        fontSize="xs"
                        fontWeight="bold"
                        p={1}
                        borderBottom="1px solid rgba(255,255,255,0.1)"
                      >
                        {new Date(date).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}
                      </Box>
                    ))}
                  </Flex>

                  {/* Metric Rows */}
                  {getHeatmapData.metrics.map(metric => (
                    <Flex key={metric}>
                      <Box
                        w="80px"
                        flexShrink={0}
                        textAlign="right"
                        color="white"
                        fontSize="sm"
                        fontWeight="bold"
                        p={2}
                        borderRight="1px solid rgba(255,255,255,0.1)"
                        textTransform="uppercase"
                      >
                        {metric}
                      </Box>
                      {getHeatmapData.dates.map(date => {
                        const value = getHeatmapData.data[date]?.[metric];
                        return (
                          <Tooltip
                            key={`${metric}-${date}`}
                            label={`${metric.toUpperCase()}: ${value !== null && !isNaN(value) ? (metric === "cls" ? value.toFixed(3) : value.toFixed(1)) : 'N/A'}`}
                            placement="top"
                            bg="gray.700"
                            color="white"
                            fontSize="xs"
                            hasArrow
                          >
                            <Flex
                              w="50px"
                              h="40px"
                              flexShrink={0}
                              bg={getHeatmapCellColor(metric, value)}
                              justify="center"
                              align="center"
                              border="1px solid rgba(0,0,0,0.1)"
                              _hover={{ transform: "scale(1.1)", zIndex: 1 }}
                              transition="transform 0.1s ease-in-out"
                            >
                              <Text fontSize="xs" color="white" fontWeight="bold">
                                {value !== null && !isNaN(value) ? (
                                  metric === "cls" ? value.toFixed(3) : value.toFixed(1)
                                ) : '-'}
                              </Text>
                            </Flex>
                          </Tooltip>
                        );
                      })}
                    </Flex>
                  ))}
                </Box>
              ) : (
                <Text color="gray.400" textAlign="center" mt={4} flex="1">
                  Please select a company and a date range to view the heatmap.
                </Text>
              )}

              {/* NEW: R-squared Correlation Graph - Copied from VerticalOverview */}
              {heatmapCompany && r2Correlations && Object.values(r2Correlations).some(r => r !== null) ? (
                <Box
                  flex="1"
                  minW="400px"
                  maxW="550px"
                  height="auto"
                  bg="rgba(255,255,255,0.05)"
                  p={4}
                  borderRadius="md"
                  boxShadow="0 0 12px rgba(0,255,255,0.2)"
                >
                  <Flex direction="column" height="100%">
                    {/* Title with Toggle */}
                    <Flex justify="space-between" align="center" mb={2}>
                      <Text fontSize="md" color="cyan.300" fontWeight="bold">
                        Metric Impact Analysis
                      </Text>
                      <HStack spacing={2}>
                        <Button
                          size="xs"
                          onClick={() => setShowR2Mode(!showR2Mode)}
                          colorScheme="cyan"
                          variant="outline"
                        >
                          Show {showR2Mode ? 'r' : 'r²'}
                        </Button>
                      </HStack>
                    </Flex>

                    {/* Target Score Calculator */}
                    <Box mb={3} p={2} bg="rgba(255,255,255,0.05)" borderRadius="md">
                      <Flex align="center" gap={2}>
                        <Text fontSize="xs" color="white">Target Score:</Text>
                        <Input
                          type="number"
                          value={targetScore}
                          onChange={(e) => setTargetScore(parseInt(e.target.value) || 0)}
                          size="xs"
                          width="60px"
                          min="0"
                          max="100"
                          bg="rgba(255,255,255,0.1)"
                          color="white"
                          borderColor="cyan.500"
                        />
                        <Text fontSize="xs" color="gray.400">/ 100</Text>
                      </Flex>
                    </Box>

                    {/* Chart */}
                    <Box flex="1" maxH="250px">
                      <Bar
                        data={getR2ChartData}
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          plugins: {
                            legend: { display: false },
                            tooltip: {
                              callbacks: {
                                label: (context) => {
                                  const metric = context.label.toLowerCase();
                                  const corr = r2Correlations[metric];
                                  if (!corr) return `${context.label}: N/A`;

                                  const lines = [
                                    `${context.label}:`,
                                    `Weight: ${(LIGHTHOUSE_WEIGHTS[metric] * 100)}%`,
                                    `r = ${corr.r.toFixed(3)}`,
                                    `r² = ${corr.r2.toFixed(3)} (${(corr.r2 * 100).toFixed(1)}% variance)`,
                                    `n = ${corr.n} data points`,
                                    `Current: ${corr.avgValue.toFixed(metric === 'cls' ? 3 : 0)}`,
                                    `Score: ${corr.currentMetricScore}/100`,
                                    `Potential: +${corr.weightedPotentialGain.toFixed(1)} pts`
                                  ];
                                  return lines;
                                }
                              }
                            },
                            datalabels: {
                              display: true,
                              color: 'white',
                              font: { weight: 'bold', size: 11 },
                              formatter: (value) => {
                                if (showR2Mode) {
                                  return (value * 100).toFixed(0) + '%';
                                } else {
                                  return value.toFixed(2);
                                }
                              }
                            }
                          },
                          scales: {
                            x: {
                              ticks: { color: "white" },
                              grid: { display: false }
                            },
                            y: {
                              min: showR2Mode ? 0 : -1,
                              max: 1,
                              ticks: {
                                color: "white",
                                callback: function (value) {
                                  if (showR2Mode) {
                                    return (value * 100).toFixed(0) + '%';
                                  }
                                  return value.toFixed(1);
                                }
                              },
                              grid: { color: "rgba(255,255,255,0.1)" }
                            }
                          }
                        }}
                        plugins={[ChartDataLabels]}
                      />
                    </Box>

                    {/* Improvement Recommendations */}
                    <Box mt={4} p={3} bg="rgba(0,255,255,0.1)" borderRadius="md">
                      <Text fontSize="sm" fontWeight="bold" color="white" mb={2}>
                        📊 Actionable Insights (Lighthouse 10 Weights):
                      </Text>

                      {/* Total Possible Improvement */}
                      {(() => {
                        const totalImprovement = calculateTotalPossibleImprovement();
                        if (!totalImprovement) return null;

                        return (
                          <>
                            <Box mb={3} p={2} bg="rgba(255,255,255,0.05)" borderRadius="md">
                              <Text fontSize="xs" color="cyan.300" fontWeight="bold">
                                Total Score Potential: +{totalImprovement.totalPossibleGain} points
                              </Text>
                              <Text fontSize="xs" color="gray.300">
                                Current: {totalImprovement.actualCurrentScore} → Max: 100.0
                              </Text>
                            </Box>

                            <VStack align="start" spacing={2}>
                              {totalImprovement.breakdown.map(item => {
                                // Filter out items with no potential improvement
                                if (parseFloat(item.improvement) <= 0) return null;

                                return (
                                  <Box key={item.metric} width="100%">
                                    <Flex justify="space-between" align="center">
                                      <Text fontSize="xs" color="white">
                                        <Text as="span" fontWeight="bold" color="cyan.300">
                                          {item.metric}
                                        </Text> ({LIGHTHOUSE_WEIGHTS[item.metric.toLowerCase()] * 100}%):
                                      </Text>
                                      <Text fontSize="xs" color="green.300" fontWeight="bold">
                                        +{item.improvement} pts
                                      </Text>
                                    </Flex>
                                    <Text fontSize="xs" color="gray.400" ml={2}>
                                      {item.avgValue} → {item.targetValue}
                                      {item.currentScore < 50 && (
                                        <Badge ml={1} colorScheme="red" fontSize="xs">Priority</Badge>
                                      )}
                                    </Text>
                                  </Box>
                                );
                              })}
                            </VStack>

                            {/* Target Score Requirements */}
                            {(() => {
                              const targetReqs = calculateTargetRequirements(targetScore);
                              if (!targetReqs) return null;

                              if (targetReqs.alreadyAchieved) {
                                return (
                                  <Box mt={3} p={2} bg="rgba(34,211,76,0.1)" borderRadius="md">
                                    <Text fontSize="xs" color="green.300">
                                      ✅ Already achieving target! Current: {targetReqs.currentScore} ≥ Target: {targetScore}
                                    </Text>
                                  </Box>
                                );
                              }

                              return (
                                <Box mt={3} p={2} bg="rgba(148,82,209,0.1)" borderRadius="md">
                                  <Text fontSize="xs" fontWeight="bold" color="purple.300" mb={2}>
                                    🎯 To reach score {targetScore} (+{targetReqs.scoreGapNeeded} pts):
                                  </Text>

                                  {targetReqs.achievable ? (
                                    <VStack align="start" spacing={1}>
                                      {targetReqs.requirements.map((req, idx) => (
                                        <Box key={req.metric} width="100%">
                                          <Flex justify="space-between" align="center">
                                            <Text fontSize="xs" color="white">
                                              {idx + 1}. <Text as="span" fontWeight="bold">{req.metric}</Text> ({req.weight}%):
                                            </Text>
                                            <Text fontSize="xs" color="green.300">
                                              +{req.scoreGain} pts
                                            </Text>
                                          </Flex>
                                          <Text fontSize="xs" color="gray.400" ml={4}>
                                            {req.currentValue} → {req.targetValue} ({req.percentChange > 0 ? '-' : ''}{req.percentChange}%)
                                          </Text>
                                        </Box>
                                      ))}
                                    </VStack>
                                  ) : (
                                    <Text fontSize="xs" color="orange.300">
                                      ⚠️ Target score {targetScore} requires {targetReqs.scoreGapNeeded} points,
                                      but maximum possible gain is {targetReqs.totalGainPossible} points.
                                      Suggested target: {(parseFloat(targetReqs.currentScore) + parseFloat(targetReqs.totalGainPossible)).toFixed(0)}
                                    </Text>
                                  )}
                                </Box>
                              );
                            })()}

                            {/* Quick wins */}
                            <Box mt={3} p={2} bg="rgba(255,167,61,0.1)" borderRadius="md">
                              <Text fontSize="xs" fontWeight="bold" color="orange.300" mb={1}>
                                🎯 Quick Wins (10% improvement):
                              </Text>
                              {Object.entries(r2Correlations)
                                .filter(([_, corr]) => corr && corr.r2 >= 0.3) // Filter for moderate to strong correlations
                                .sort((a, b) => {
                                  const impactA = calculateScoreImpact(a[0], 10);
                                  const impactB = calculateScoreImpact(b[0], 10);
                                  return parseFloat(impactB?.immediateScoreGain || 0) - parseFloat(impactA?.immediateScoreGain || 0);
                                })
                                .slice(0, 2) // Show top 2 quick wins
                                .map(([metric, corr]) => {
                                  const impact = calculateScoreImpact(metric, 10);
                                  if (!impact || parseFloat(impact.immediateScoreGain) <= 0) return null; // Only show positive gains
                                  return (
                                    <Text key={metric} fontSize="xs" color="white">
                                      • {metric.toUpperCase()}: {impact?.currentAvg} → {impact?.targetValue}
                                      = <Text as="span" color="green.300">+{impact?.immediateScoreGain} pts</Text>
                                    </Text>
                                  );
                                })}
                            </Box>
                          </>
                        );
                      })()}

                      <Text fontSize="xs" color="gray.300" mt={3}>
                        * Based on {r2Correlations[Object.keys(r2Correlations)[0]]?.n || 0} samples
                      </Text>
                    </Box>
                  </Flex>
                </Box>
              ) : (
                <Text color="gray.400" textAlign="center" mt={4} flex="1">
                  Select a company and date range in the heatmap to see correlation analysis.
                </Text>
              )}
            </Flex>
          </Box>


          {/* Analytics Section */}
          {showAnalytics && (
            <Box className="anb-chart-container" p={6} width="100%" maxW="1200px">
              <Text className="anb-chart-title" mb={4}>Performance Analytics</Text>

              <Flex justify="flex-end" width="100%" maxW="1400px">
                <Select
                  placeholder="All Regions"
                  value={selectedRegion}
                  onChange={(e) => setSelectedRegion(e.target.value)}
                  width="200px"
                  bg="rgba(255,255,255,0.1)"
                  color="white"
                  borderColor="rgba(255,255,255,0.2)"
                  _hover={{ bg: 'rgba(255,255,255,0.15)' }}
                  _focus={{ bg: 'rgba(255,255,255,0.15)' }}
                >
                  <option value="All">All Regions (Individual)</option>
                  <option value="Combined">All Combined</option>

                  {regionList.map((region) => (
                    <option key={region} value={region}>{region}</option>
                  ))}
                </Select>
              </Flex>


              <Grid templateColumns={{ base: "1fr", md: "repeat(2, 1fr)" }} gap={6}>
                {/* Top Performers */}
                <GridItem>
                  <Box bg="rgba(255,255,255,0.05)" p={4} borderRadius="md">
                    <Text fontWeight="bold" mb={3} color={COLORS.good}>Top Performing Local Stations</Text>
                    {topPerformers.map((company, index) => (
                      <Flex key={index} justify="space-between" align="center" mb={2}>
                        <HStack>
                          <Box width="12px" height="12px" borderRadius="50%" bg={company.color} />
                          <Text color="white" fontWeight={index === 0 ? "bold" : "normal"}>
                            {company.name}
                          </Text>
                        </HStack>
                        <HStack>
                          <Text color="white" fontWeight="bold">{company.score.toFixed(1)}</Text>
                          {company.previousScore > 0 && (
                            <Badge
                              colorScheme={
                                typeof company.change === "number" && !isNaN(company.change)
                                  ? company.change >= 0 ? "green" : "red"
                                  : "gray"
                              }
                              ml={1}
                            >
                              {typeof company.change === "number" && !isNaN(company.change)
                                ? `${company.change >= 0 ? "+" : ""}${company.change}%`
                                : "-"}
                            </Badge>

                          )}
                        </HStack>
                      </Flex>
                    ))}
                  </Box>
                </GridItem>

                {/* Bottom Performers */}
                <GridItem>
                  <Box bg="rgba(255,255,255,0.05)" p={4} borderRadius="md">
                    <Text fontWeight="bold" mb={3} color={COLORS.poor}>Lowest Performing Local Stations</Text>
                    {bottomPerformers.map((company, index) => (
                      <Flex key={index} justify="space-between" align="center" mb={2}>
                        <HStack>
                          <Box width="12px" height="12px" borderRadius="50%" bg={company.color} />
                          <Text color="white" fontWeight={index === 0 ? "bold" : "normal"}>
                            {company.name}
                          </Text>
                        </HStack>
                        <HStack>
                          <Text color="white" fontWeight="bold">{company.score.toFixed(1)}</Text>
                          {company.previousScore > 0 && (
                            <Badge colorScheme={company.change >= 0 ? "green" : "red"} ml={1}>
                              {company.change >= 0 ? '+' : ''}{company.change}%
                            </Badge>
                          )}
                        </HStack>
                      </Flex>
                    ))}
                  </Box>
                </GridItem>

                {/* Most Improved */}
                <GridItem>
                  <Box bg="rgba(255,255,255,0.05)" p={4} borderRadius="md">
                    <Text fontWeight="bold" mb={3} color="cyan.400">Most Improved</Text>
                    {mostImproved.map((company, index) => (
                      <Flex key={index} justify="space-between" align="center" mb={2}>
                        <HStack>
                          <Box width="12px" height="12px" borderRadius="50%" bg={company.color} />
                          <Text color="white" fontWeight={index === 0 ? "bold" : "normal"}>
                            {company.name}
                          </Text>
                        </HStack>
                        <HStack>
                          <Text color="white">{company.score.toFixed(1)}</Text>
                          <Badge colorScheme="green" ml={1}>
                            +{company.change}%
                          </Badge>
                        </HStack>
                      </Flex>
                    ))}
                  </Box>
                </GridItem>

                {/* Most Declined */}
                <GridItem>
                  <Box bg="rgba(255,255,255,0.05)" p={4} borderRadius="md">
                    <Text fontWeight="bold" mb={3} color="orange.400">Largest Declines</Text>
                    {mostDeclined.map((company, index) => (
                      <Flex key={index} justify="space-between" align="center" mb={2}>
                        <HStack>
                          <Box width="12px" height="12px" borderRadius="50%" bg={company.color} />
                          <Text color="white" fontWeight={index === 0 ? "bold" : "normal"}>
                            {company.name}
                          </Text>
                        </HStack>
                        <HStack>
                          <Text color="white">{company.score.toFixed(1)}</Text>
                          <Badge colorScheme="red" ml={1}>
                            {company.change}%
                          </Badge>
                        </HStack>
                      </Flex>
                    ))}
                  </Box>
                </GridItem>
              </Grid>
            </Box>
          )}

          <Flex wrap="wrap" gap={10} justify="center">
            {/* Radar Chart */}
            <Box className="anb-chart-container" width="600px" height="700px">
              <Flex justify="space-between" align="center" mb={2}>
                <Text className="anb-chart-title">Local Stations Radar</Text>
                <Tooltip
                  label={
                    `This radar shows average performance across local stations.\n\n` +
                    `A more balanced shape = higher Equitative Score.\n\n` +
                    `Equitative Score: ${equitativeScore} / 100`
                  }
                  bg="gray.700"
                  color="white"
                  fontSize="sm"
                  borderRadius="md"
                  hasArrow
                  placement="left"
                  whiteSpace="pre-line"
                >
                  <Box cursor="pointer" ml={2}>
                    <FaInfoCircle color="white" />
                  </Box>
                </Tooltip>
              </Flex>

              <Radar
                data={radarData}
                options={{
                  scales: {
                    r: {
                      angleLines: { color: "rgba(255, 255, 255, 0.2)" },
                      grid: { color: "rgba(255, 255, 255, 0.2)" },
                      pointLabels: {
                        color: "white",
                        font: { size: 12, weight: "bold" }
                      },
                      ticks: {
                        color: "white",
                        font: { weight: "bold", size: 13 },
                        backdropColor: "transparent"
                      },
                      min: 0,
                      max: 100
                    }
                  },
                  plugins: {
                    legend: { display: false },
                    datalabels: {
                      display: true,
                      color: "white",
                      anchor: "end",
                      align: "start",
                      formatter: function (value, context) {
                        const datasetIndex = context.datasetIndex;
                        const companyIndex = context.dataIndex;
                        const dataset = context.chart.data.datasets[datasetIndex];
                        const currentValue = dataset.data[companyIndex];

                        if (labelMode === 'none') return '';
                        if (labelMode === 'raw') return currentValue.toFixed(1);

                        // Percent mode
                        const companyName = context.chart.data.labels[companyIndex];
                        const companyPerformanceItem = (window.companyPerformanceLocal || []).find(c => c.name === companyName); // Access global var
                        const previousScore = companyPerformanceItem?.previousScore;

                        if (!previousScore || previousScore === 0) return '-';
                        const change = ((currentValue - previousScore) / previousScore * 100).toFixed(1);
                        return `${change > 0 ? '+' : ''}${change}%`;
                      },
                      font: {
                        weight: "bold",
                        size: 11
                      }
                    },
                    tooltip: {
                      callbacks: {
                        label: (context) => `${context.dataset.label}: ${context.parsed.y}`
                      }
                    }
                  }

                }}
              />
            </Box>
          </Flex>



          {/* Insights Panel */}
          <Box p={4} bg="rgba(255,255,255,0.05)" borderRadius="lg" width="100%" maxW="1000px">
            <Text color="white" fontWeight="bold" display="flex" alignItems="center">
              <FaInfoCircle style={{ marginRight: '8px' }} /> Key Insights:
            </Text>
            <Divider my={2} />
            <VStack align="start" spacing={3} mt={2}>
              <Text color="white" fontSize="sm">
                <Text as="span" fontWeight="bold">Overall Performance: </Text>
                Average score across all local stations is {getGroupScores.local.toFixed(1)}, with a {getGroupScores.localChange >= 0 ? 'growth' : 'decline'} of {Math.abs(getGroupScores.localChange)}% from previous period.
              </Text>

              <Text color="white" fontSize="sm">
                <Text as="span" fontWeight="bold">Top Performer: </Text>
                {topPerformers.length > 0 && typeof topPerformers[0].score === "number"
                  ? `${topPerformers[0].name} leads with a score of ${topPerformers[0].score.toFixed(1)}, ${
                  topPerformers[0].change >= 0 ? "up" : "down"
                  } ${Math.abs(topPerformers[0].change)}%`
                  : "No data available."}

                {topPerformers.length > 0 ? `${topPerformers[0].name} leads with a score of ${topPerformers[0].score.toFixed(1)}, ${topPerformers[0].change >= 0 ? 'up' : 'down'} ${Math.abs(topPerformers[0].change)}% from previous period.` : 'No data available.'}
              </Text>

              <Text color="white" fontSize="sm">
                <Text as="span" fontWeight="bold">Most Improved: </Text>
                {mostImproved.length > 0 ? `${mostImproved[0].name} showed the highest improvement at +${mostImproved[0].change}% (from ${mostImproved[0].previousScore.toFixed(1)} to ${mostImproved[0].score.toFixed(1)}).` : 'No data available.'}
              </Text>

              <Text color="white" fontSize="sm">
                <Text as="span" fontWeight="bold">Largest Decline: </Text>
                {mostDeclined.length > 0 ? `${mostDeclined[0].name} had the largest decline at ${mostDeclined[0].change}% (from ${mostDeclined[0].previousScore.toFixed(1)} to ${mostDeclined[0].score.toFixed(1)}).` : 'No data available.'}
              </Text>

              <Text color="white" fontSize="sm">
                <Text as="span" fontWeight="bold">Regional Performance: </Text>
                The stations are distributed across different regions of Mexico, with varying performance levels. Consider geographic factors that might influence these scores.
              </Text>
            </VStack>
          </Box>

        </VStack>
      )}
    </Box>
  );
};

export default LocalScoresOverview;