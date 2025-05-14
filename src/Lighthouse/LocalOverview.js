import React, { useEffect, useState, useMemo } from "react";
import {
  Box, Text, Flex, Spinner, Select, IconButton, CheckboxGroup,
  Checkbox, HStack, VStack, Slider, SliderTrack, SliderFilledTrack,
  SliderThumb, Button, Badge, Stat, StatLabel, StatNumber, StatHelpText,
  StatArrow, Grid, GridItem, Tooltip, Divider, ButtonGroup, Input, Wrap
} from "@chakra-ui/react";
import { 
  FaChevronLeft, 
  FaChevronRight, 
  FaChartLine,
  FaInfoCircle,
  FaCalendarAlt
} from "react-icons/fa";
import Papa from "papaparse";
import { Bar, Radar } from "react-chartjs-2";
import {
  Chart as ChartJS, RadialLinearScale, CategoryScale, LinearScale,
  BarElement, PointElement, LineElement, Title, Tooltip as ChartTooltip, 
  Legend, Filler
} from "chart.js";
import ChartDataLabels from "chartjs-plugin-datalabels";
import "./Lighthouse.css"; // Assuming you have the same CSS file
import { FaChevronDown, FaChevronUp } from "react-icons/fa";
import CountUp from 'react-countup';


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
}, [selectedDate, previousDateStr, localCompanies, timeRange]);



  const getMetricsForCompany = (company, type = contentType, date = dateStr) => {

    if (company === "AllCombined") {
        const allMetrics = allCompanies.map(c => getMetricsForCompany(c, type, date));
        const keys = ["cls", "lcp", "si", "tbt", "fcp"];
        const avg = {};
      
        keys.forEach(key => {
          const values = allMetrics.map(m => m[key]).filter(v => !isNaN(v));
          avg[key] = values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
        });
      
        return avg;
      }
      
    if (type === "both") {
      const nota = getMetricsForCompany(company, "nota", date);
      const video = getMetricsForCompany(company, "video", date);
  
      const keys = ["cls", "lcp", "si", "tbt", "fcp"];
      const averaged = {};
  
      keys.forEach(key => {
        const values = [nota[key], video[key]].filter(v => !isNaN(v));
        averaged[key] = values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
      });
  
      return averaged;
    }
  
    if (!data.length || !date || !metricKeys[company]) return {};
  
    const dateKey = Object.keys(data[0])[0];
    const matchingRow = data.find(row => row[dateKey] === date && row.Type === type);
    if (!matchingRow) return {};
  
    const keys = metricKeys[company];
    return {
      cls: parseFloat(matchingRow[keys.cls]) || 0,
      lcp: parseFloat(matchingRow[keys.lcp]) || 0,
      si: parseFloat(matchingRow[keys.si]) || 0,
      tbt: parseFloat(matchingRow[keys.tbt]) || 0,
      fcp: parseFloat(matchingRow[keys.fcp]) || 0
    };
  };
  
  
  

  // Individual company performance data
  const companyPerformance = useMemo(() => {
    return selectedCompanies.map(company => {
        const currentScore = computeScore(company, contentType, dateStr, timeRange !== "daily");
        const previousScore = previousDateStr ? computeScore(company, contentType, previousDateStr, timeRange !== "daily") : 0;        
      const change = previousScore ? ((currentScore - previousScore) / previousScore * 100).toFixed(1) : 0;
  
      return {
        name: company,
        score: currentScore,
        previousScore,
        change: parseFloat(change),
        color: companyColors[company]
      };
    }).sort((a, b) => b.score - a.score);
}, [selectedCompanies, dateStr, previousDateStr, contentType, timeRange]);

  

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
            getAvgScoreForCompany(c, compareStartDate2, compareEndDate2)
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
      displayDates = selectedDate ? [selectedDate] : [];
      labels = selectedDate ? [formatDateLabel(selectedDate)] : [];
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
      
  
    return { labels: orderedCompanies, datasets };
  };

  const getRadarData = (companySet) => {
    const labels = companySet;
    const datasets = [];
  
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
        font: {
          weight: "bold",
          size: 11
        },
        align: "end"
      }
    });
  
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
        font: {
          weight: "bold",
          size: 11
        },
        align: "end"
      }
    });
  
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
  
  
  
  

  return (
    <Box pt="80px" px={6} className="glass-bg">
      <Text className="title">Local Scores Overview</Text>

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

  const previousMetrics = getMetricsForCompany(company.name, previousDateStr);

  const getMetricChange = (current, previous) => {
    if (!previous || previous === 0) return null;
    const diff = ((current - previous) / previous) * 100;
    return parseFloat(diff.toFixed(1));
  };

  const clsChange = getMetricChange(metrics.cls, previousMetrics.cls);
  const lcpChange = getMetricChange(metrics.lcp, previousMetrics.lcp);
  const siChange = getMetricChange(metrics.si, previousMetrics.si);
  const tbtChange = getMetricChange(metrics.tbt, previousMetrics.tbt);
  const fcpChange = getMetricChange(metrics.fcp, previousMetrics.fcp);

  const getMetricColor = (metric, value) => {
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
      CLS: <b style={{ color: getMetricColor("cls", metrics.cls) }}>{metrics.cls.toFixed(3)}</b>
      {clsChange !== null && (
        <span style={{ marginLeft: 6, color: clsChange < 0 ? "lime" : "red" }}>
          ({clsChange > 0 ? "+" : ""}{clsChange}%)
        </span>
      )}
    </Text>
    <Text fontSize="xs" color="white">
      LCP: <b style={{ color: getMetricColor("lcp", metrics.lcp) }}>{metrics.lcp.toLocaleString()}</b>
      {lcpChange !== null && (
        <span style={{ marginLeft: 6, color: lcpChange < 0 ? "lime" : "red" }}>
          ({lcpChange > 0 ? "+" : ""}{lcpChange}%)
        </span>
      )}
    </Text>
    <Text fontSize="xs" color="white">
      SI: <b style={{ color: getMetricColor("si", metrics.si) }}>{metrics.si.toLocaleString()}</b>
      {siChange !== null && (
        <span style={{ marginLeft: 6, color: siChange < 0 ? "lime" : "red" }}>
          ({siChange > 0 ? "+" : ""}{siChange}%)
        </span>
      )}
    </Text>
    <Text fontSize="xs" color="white">
      TBT: <b style={{ color: getMetricColor("tbt", metrics.tbt) }}>{metrics.tbt.toLocaleString()}</b>
      {tbtChange !== null && (
        <span style={{ marginLeft: 6, color: tbtChange < 0 ? "lime" : "red" }}>
          ({tbtChange > 0 ? "+" : ""}{tbtChange}%)
        </span>
      )}
    </Text>
    <Text fontSize="xs" color="white">
      FCP: <b style={{ color: getMetricColor("fcp", metrics.fcp) }}>{metrics.fcp.toLocaleString()}</b>
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
              <Text className="anb-chart-title">Individual Company Performance by Date</Text>
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
                  plugins: {
                    legend: { display: false },
                    tooltip: {
                      callbacks: {
                        label: (context) => `${context.dataset.label}: ${context.parsed.y}`
                      }
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
              />
            </Box>

            {/* Date Slider */}
            <Flex mt={4} align="center" justify="center" flexDirection="column" gap={4}>
              <Slider
                value={selectedDateIndex}
                min={0}
                max={Math.max(0, filteredDates.length - 1)}
                onChange={(val) => {
                  setPreviousDateIndex(selectedDateIndex);
                  setSelectedDateIndex(val);
                }}
                width="70%"
                height="40px"
                isDisabled={filteredDates.length <= 1}
              >
                <SliderTrack bg="rgba(255,255,255,0.2)" height="8px">
                  <SliderFilledTrack bg="#00f7ff" />
                </SliderTrack>
                <SliderThumb boxSize={6} />
              </Slider>
              <Text color="white" fontSize="sm" fontWeight="medium" textAlign="center">
                {filteredDates.length > 0 ? (
                  <>
                    <Text as="span" fontWeight="bold">{selectedDateIndex + 1}</Text> of <Text as="span" fontWeight="bold">{filteredDates.length}</Text> dates shown
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

          {/* Radar Chart for Local Stations */}
          <Flex wrap="wrap" gap={10} justify="center">
            <Box className="anb-chart-container" width="600px" height="600px">
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
                      angleLines: {
                        color: "rgba(255, 255, 255, 0.2)",
                      },
                      grid: {
                        color: "rgba(255, 255, 255, 0.2)",
                      },
                      pointLabels: {
                        color: "white",
                        font: {
                          size: 12,
                          weight: "bold"
                        }
                      },
                      ticks: {
                        color: "white",
                        font: {
                          weight: "bold",
                          size: 13
                        },
                        backdropColor: "transparent"
                      },
                      min: 0,
                      max: 100
                    }
                  },
                  plugins: {
                    legend: {
                      labels: {
                        color: "white",
                        font: {
                          weight: "bold"
                        }
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