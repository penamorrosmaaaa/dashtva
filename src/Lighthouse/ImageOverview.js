import React, { useEffect, useState, useMemo, useCallback } from "react";
import {
  Box, Text, Flex, Spinner, Select, IconButton, CheckboxGroup,
  Checkbox, HStack, VStack, Slider, SliderTrack, SliderFilledTrack,
  SliderThumb, Button, Badge, Stat, StatLabel, StatNumber, StatHelpText,
  StatArrow, Grid, GridItem, Tooltip, Divider, ButtonGroup, Input, Wrap,
  RangeSlider, RangeSliderTrack, RangeSliderFilledTrack, RangeSliderThumb // Added for heatmap date range
} from "@chakra-ui/react";
import { 
  FaChevronLeft, 
  FaChevronRight, 
  FaChartLine,
  FaInfoCircle,
  FaChevronUp,
  FaChevronDown
} from "react-icons/fa";
import Papa from "papaparse";
import { Bar, Radar, Line } from "react-chartjs-2";
import {
  Chart as ChartJS, RadialLinearScale, CategoryScale, LinearScale,
  BarElement, PointElement, LineElement, Title, Tooltip as ChartTooltip, 
  Legend, Filler
} from "chart.js";
import ChartDataLabels from "chartjs-plugin-datalabels";
import CountUp from 'react-countup';
import { sampleCorrelation } from 'simple-statistics'; // Import for R-squared calculation

// Note: These components are referenced but not included in the original code
// You'll need to implement them separately or remove the references
// import "./Lighthouse.css";
// import MatrixRain from "./MatrixRain"; // Placeholder for MatrixRain

ChartJS.register(
  RadialLinearScale, CategoryScale, LinearScale,
  BarElement, PointElement, LineElement,
  Title, ChartTooltip, Legend, ChartDataLabels, Filler
);

const ImageScoresOverview = () => {
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
  const [contentType, setContentType] = useState('nota');
  const [selectedMetric, setSelectedMetric] = useState("cls"); // Not used in this version, but kept for consistency if needed
  const [expandedCompanies, setExpandedCompanies] = useState([]);
  const [labelMode, setLabelMode] = useState("raw");
  const [trendCompany, setTrendCompany] = useState(null);

  // New state for Heatmap and R-squared
  const [heatmapCompany, setHeatmapCompany] = useState(null);
  const [heatmapStartDate, setHeatmapStartDate] = useState(null);
  const [heatmapEndDate, setHeatmapEndDate] = useState(null);
  const [r2Correlations, setR2Correlations] = useState(null);
  const [showR2Mode, setShowR2Mode] = useState(false); // Toggle between r and r²
  const [targetScore, setTargetScore] = useState(80); // Target score for calculator


  // Constants
  const TIME_RANGES = ['daily', 'monthly', 'yearly', 'all', 'custom'];
  
  // Define image companies
  const imageCompanies = [
    "img.Azteca7TVA", "img.AztecaUNOTVA", "img.AztecaNoticias"
  ];
  
  // No competition companies as requested
  const competitionCompanies = [];
  
  const allCompanies = [...imageCompanies];

  const companyColors = {
    "img.Azteca7TVA": "#22D34C",
    "img.AztecaUNOTVA": "#FF3B3B",
    "img.AztecaNoticias": "#F2C744"
  };

  const COLORS = {
    poor: '#FF2965',
    medium: '#FFA73D',
    good: '#2BFFB9',
    azteca: '#4A6CF7',
    competition: '#FF5F6D'
  };

  const MONTHS = [
    "January", "February", "March", "April", "May", "June", 
    "July", "August", "September", "October", "November", "December"
  ];

  // Metric colors from VerticalOverview
  const getMetricColor = useCallback((metric, value) => {
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
  }, []);

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
            setHeatmapCompany(allCompanies[0]); // Select first company by default
          }
        },
        error: (error) => {
          console.error("Error parsing CSV:", error);
        }
      }
    );
  }, []);

  // Define score mapping
  const imageCompanyScoreKeys = {
    "img.Azteca7TVA": "Score_30",
    "img.AztecaUNOTVA": "Score_31",
    "img.AztecaNoticias": "Score_32"
  };

  const metricKeys = {
    "img.Azteca7TVA": {
      cls: "CLS_30",
      lcp: "LCP_30",
      si: "SI_30",
      tbt: "TBT_30",
      fcp: "FCP_30"
    },
    "img.AztecaUNOTVA": {
      cls: "CLS_31",
      lcp: "LCP_31",
      si: "SI_31",
      tbt: "TBT_31",
      fcp: "FCP_31"
    },
    "img.AztecaNoticias": {
      cls: "CLS_32",
      lcp: "LCP_32",
      si: "SI_32",
      tbt: "TBT_32",
      fcp: "FCP_32"
    }
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

  const dateRangeForCurrentView = useMemo(() => {
    if (timeRange === "daily") return selectedDate ? [selectedDate] : [];
    if (timeRange === "monthly") {
      const start = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
      return uniqueDates.filter(d => d >= start && d <= selectedDate);
    }
    if (timeRange === "yearly") {
      const start = new Date(selectedDate.getFullYear(), 0, 1);
      return uniqueDates.filter(d => d >= start && d <= selectedDate);
    }
    if (timeRange === "all") {
      return uniqueDates.filter(d => d <= selectedDate);
    }
    return [selectedDate]; // fallback
  }, [timeRange, selectedDate, uniqueDates]);
  
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

  // Update selected date index again when time range changes (needed for dynamic view)
  useEffect(() => {
    if (filteredDates.length > 0) {
      setSelectedDateIndex(filteredDates.length - 1);
      setPreviousDateIndex(filteredDates.length > 1 ? filteredDates.length - 2 : null);
    }
  }, [timeRange]);

  // Linear regression calculation helper
  const calculateLinearRegression = useCallback((points) => {
    const n = points.length;
    if (n < 2) return null;
    
    const sumX = points.reduce((sum, p) => sum + p.x, 0);
    const sumY = points.reduce((sum, p) => sum + p.y, 0);
    const sumXY = points.reduce((sum, p) => sum + p.x * p.y, 0);
    const sumXX = points.reduce((sum, p) => sum + p.x * p.x, 0);
    
    const denominator = (n * sumXX - sumX * sumX);
    if (denominator === 0) return null; // Avoid division by zero
    
    const slope = (n * sumXY - sumX * sumY) / denominator;
    const intercept = (sumY - slope * sumX) / n;
    
    return { slope, intercept };
  }, []);

  // Predict score based on historical data (now a helper for getScoreForDateAndCompany)
  const predictScore = useCallback((company, targetDate, type) => {
    if (!data.length) return 0; // Just return value, no metadata
    
    const scoreKey = imageCompanyScoreKeys[company];
    if (!scoreKey) return 0; // Just return value, no metadata
    
    const dateKey = Object.keys(data[0])[0];
    const targetTime = new Date(targetDate).getTime();
    
    // Collect all historical non-zero data points
    const historicalPoints = [];
    const allRows = data.filter(row => row.Type === type);
    
    allRows.forEach(row => {
      const rowDate = new Date(row[dateKey]);
      const score = parseFloat(row[scoreKey]);
      
      if (!isNaN(score) && score > 0 && rowDate.getTime() <= targetTime) { // Only use data up to target date
        historicalPoints.push({
          x: rowDate.getTime(),
          y: score
        });
      }
    });
    
    if (historicalPoints.length < 2) {
      return 0; // Not enough data to predict, return 0
    }
    
    // Calculate regression
    const regression = calculateLinearRegression(historicalPoints);
    if (!regression) return 0; // If regression fails, return 0
    
    // Predict value
    const predictedValue = regression.slope * targetTime + regression.intercept;
    
    // Bound between 0 and 100
    const boundedValue = Math.max(0, Math.min(100, predictedValue));
    
    return parseFloat(boundedValue.toFixed(1)); // Return value
  }, [data, calculateLinearRegression]);

  // Primary function to get a single score for a company and date, with prediction logic
  const getScoreForDateAndCompany = useCallback((company, date, type) => {
    if (!data.length || !date) return 0; // Just return value
    
    const scoreKey = imageCompanyScoreKeys[company];
    if (!scoreKey) return 0; // Just return value
    const dateKey = Object.keys(data[0])[0];
    const dateString = date.toISOString().split("T")[0];

    // Try to find the actual score for the given date
    const rows = data.filter(row => row[dateKey] === dateString && row.Type === type);
    const rawScores = rows.map(row => parseFloat(row[scoreKey])).filter(n => !isNaN(n));

    // If actual non-zero scores exist, return their average
    const nonZeroScores = rawScores.filter(s => s > 0);
    if (nonZeroScores.length > 0) {
      const avg = nonZeroScores.reduce((a, b) => a + b, 0) / nonZeroScores.length;
      return parseFloat(avg.toFixed(1)); // Return value
    }

    // If no non-zero scores or no data for this date, predict
    const prediction = predictScore(company, date, type);
    return prediction; // This is already a value, not an object
  }, [data, predictScore]);


  // Score computation (now averages over a list of dates using getScoreForDateAndCompany)
  const computeScore = useCallback((company, type = "nota", dateList = [selectedDate]) => {
    if (!data.length || !dateList.length) return 0;
    
    const scores = dateList.map(d => getScoreForDateAndCompany(company, d, type)); // getScoreForDateAndCompany now returns just the value
    const avg = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
    return parseFloat(avg.toFixed(1));
  }, [data, selectedDate, getScoreForDateAndCompany]);


  // Added trend data function
  const getTrendData = useCallback((company) => {
    if (!company || !data.length || !filteredDates.length) return null;
  
    const dateObjects = filteredDates.filter(d => d <= selectedDate);
    const labels = dateObjects.map(d => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
    
    const values = dateObjects.map(d => 
      getScoreForDateAndCompany(company, d, contentType) // getScoreForDateAndCompany now returns just the value
    );
    
    // Average line
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const averageArray = values.map(() => parseFloat(avg.toFixed(2)));
  
    // Regression line
    const linearRegression = (yValues) => {
      const n = yValues.length;
      if (n < 2) return { regressionLine: [], slope: 0 };
      const xValues = [...Array(n).keys()];
      const sumX = xValues.reduce((a, b) => a + b, 0);
      const sumY = yValues.reduce((a, b) => a + b, 0);
      const sumXY = xValues.reduce((sum, x, i) => sum + x * yValues[i], 0);
      const sumXX = xValues.reduce((sum, x) => sum + x * x, 0);
  
      const denominator = (n * sumXX - sumX * sumX);
      if (denominator === 0) return { regressionLine: [], slope: 0 };
      
      const slope = (n * sumXY - sumX * sumY) / denominator;
      const intercept = (sumY - slope * sumX) / n;
  
      const yRegression = xValues.map(x => slope * x + intercept);
      return { regressionLine: yRegression, slope: parseFloat(slope.toFixed(2)) };
    };
  
    const { regressionLine, slope } = linearRegression(values);
  
    return {
      labels,
      datasets: [
        {
          label: `${company} Trend`,
          data: values,
          borderColor: companyColors[company] || "#00f7ff",
          backgroundColor: "transparent",
          borderWidth: 2,
          tension: 0.3,
          pointRadius: 3,
          pointBackgroundColor: companyColors[company] || "#00f7ff", // No conditional color for predicted points
          pointBorderColor: companyColors[company] || "#00f7ff", // No conditional color for predicted points
          pointBorderWidth: 1, // No conditional border width for predicted points
          fill: false
        },
        {
          label: `${company} Average`,
          data: averageArray,
          borderColor: "white",
          borderDash: [6, 4],
          borderWidth: 1.5,
          pointRadius: 1,
          fill: false
        },
        {
          label: `${company} Regression`,
          data: regressionLine,
          borderColor: "#ffdc00",
          borderDash: [4, 3],
          borderWidth: 1.5,
          pointRadius: 1,
          slopeValue: slope,
          fill: false
        }
      ]
    };
  }, [data, filteredDates, selectedDate, getScoreForDateAndCompany, contentType, companyColors]);
  

  const getMetricsForCompany = useCallback((company, type = contentType, date = dateStr) => {
    if (!data.length || !date || !metricKeys[company]) return {};
  
    const dateKey = Object.keys(data[0])[0];
    const rows = data.filter(row => row[dateKey] === date && row.Type === type);
    if (!rows.length) return {};
  
    const keys = metricKeys[company];
    const values = rows.map(row => ({
      cls: parseFloat(row[keys.cls]) || 0,
      lcp: parseFloat(row[keys.lcp]) || 0,
      si: parseFloat(row[keys.si]) || 0,
      tbt: parseFloat(row[keys.tbt]) || 0,
      fcp: parseFloat(row[keys.fcp]) || 0
    }));
  
    const average = (key) => {
      const vals = values.map(v => v[key]).filter(v => !isNaN(v));
      return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
    };
  
    // Include overallScore for R2 correlation calculation
    const overallScore = getScoreForDateAndCompany(company, new Date(date), type);

    return {
      overallScore: overallScore, // Added overallScore
      cls: average("cls"),
      lcp: average("lcp"),
      si: average("si"),
      tbt: average("tbt"),
      fcp: average("fcp")
    };
  }, [data, contentType, dateStr, getScoreForDateAndCompany]);

  // Calculate average scores for each group
  const getGroupScores = useMemo(() => {
    if (!selectedDate) return { azteca: 0, competition: 0 };
    
    const calculateAverage = (companies, dateList) => {
      let total = 0, count = 0;
      companies.forEach(company => {
        const score = computeScore(company, contentType, dateList);
        if (!isNaN(score)) { // Predicted scores are always numbers
          total += score;
          count++;
        }
      });
      return count ? parseFloat((total / count).toFixed(1)) : 0;
    };
    
    const aztecaScore = calculateAverage(imageCompanies, dateRangeForCurrentView);
    const competitionScore = calculateAverage(competitionCompanies, dateRangeForCurrentView); // Will be 0 as no competition companies
    
    const prevAztecaScore = calculateAverage(imageCompanies, previousDate ? [previousDate] : []);
    const prevCompetitionScore = calculateAverage(competitionCompanies, previousDate ? [previousDate] : []);
    
    const aztecaChange = prevAztecaScore ? ((aztecaScore - prevAztecaScore) / prevAztecaScore * 100).toFixed(1) : 0;
    const competitionChange = prevCompetitionScore ? ((competitionScore - prevCompetitionScore) / prevCompetitionScore * 100).toFixed(1) : 0;
    
    return {
      azteca: aztecaScore,
      competition: competitionScore,
      aztecaChange: parseFloat(aztecaChange),
      competitionChange: parseFloat(competitionChange),
      difference: (aztecaScore - competitionScore).toFixed(1)
    };
  }, [selectedDate, previousDate, imageCompanies, competitionCompanies, contentType, dateRangeForCurrentView, computeScore]);

  const companyPerformance = useMemo(() => {
    return selectedCompanies.map(company => {
      const currentScore = getScoreForDateAndCompany(company, selectedDate, contentType); // Get just the value
      const previousScore = previousDate
        ? getScoreForDateAndCompany(company, previousDate, contentType) // Get just the value
        : 0;
  
      const change = previousScore > 0
        ? ((currentScore - previousScore) / previousScore * 100).toFixed(1)
        : 0;
  
      return {
        name: company,
        score: currentScore,
        previousScore,
        change: parseFloat(change),
        isAzteca: imageCompanies.includes(company),
        color: companyColors[company],
        // isPredicted removed as per request
      };
    }).sort((a, b) => b.score - a.score);
  }, [selectedCompanies, selectedDate, previousDate, contentType, getScoreForDateAndCompany, imageCompanies, companyColors]);

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
  const getBarChartData = useCallback(() => {
    const formatDate = (d) => d.toISOString().split("T")[0];
  
    const getAvgScoreForCompany = (company, startDate, endDate) => {
      const datesInPeriod = uniqueDates.filter(d => d >= startDate && d <= endDate);
      const scores = datesInPeriod
        .map(d => getScoreForDateAndCompany(company, d, contentType)) // Get just the value
        .filter(score => !isNaN(score));
      const avg = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
      return parseFloat(avg.toFixed(1));
    };
  
    const orderedCompanies = allCompanies.filter(c => selectedCompanies.includes(c));
  
    if (timeRange === "custom") {
      const labels = orderedCompanies;
  
      const primaryData = orderedCompanies.map(c =>
        getAvgScoreForCompany(c, compareStartDate, compareEndDate)
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
      
      // Get scores (no metadata needed here)
      const scores = orderedCompanies.map(c => {
        return getScoreForDateAndCompany(c, date, contentType);
      });
      
      return {
        label: formatDateLabel(date),
        data: scores,
        backgroundColor: orderedCompanies.map((c) => companyColors[c] || "#00f7ff"), // No transparency for predicted
        borderColor: "transparent", // No border for predicted
        borderWidth: 0, // No border for predicted
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
  }, [allCompanies, compareEndDate, compareEndDate2, compareStartDate, compareStartDate2, companyColors, contentType, filteredDates, getScoreForDateAndCompany, labelMode, selectedCompanies, selectedDate, timeRange, uniqueDates]);

  // Radar chart data
  const getRadarData = useCallback((companySet, isAzteca = true) => {
    const orderedCompanies = companySet.slice().sort((a, b) => {
      return allCompanies.indexOf(a) - allCompanies.indexOf(b);
    });
    
    const labels = orderedCompanies;
    const datasets = [];

    datasets.push({
      label: "Image Scores",
      data: orderedCompanies.map(c => computeScore(c, contentType, dateRangeForCurrentView)),
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

    return { labels, datasets };
  }, [allCompanies, computeScore, contentType, dateRangeForCurrentView]);

  const formatDisplayDate = (date) => {
    if (!date) return "";
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const equitativeScore = useMemo(() => {
    const scores = imageCompanies.map(c => computeScore(c)).filter(s => !isNaN(s));
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    const variance = scores.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / scores.length;
    const stdDev = Math.sqrt(variance);
    return Math.max(0, 100 - stdDev * 2).toFixed(1);
  }, [imageCompanies, computeScore]);

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
  const getHeatmapCellColor = useCallback((metric, value) => {
    if (value === null || isNaN(value)) {
      return "gray.700"; // No data color
    }
    const color = getMetricColor(metric, value);
    switch (color) {
      case "lime": return "green.500";
      case "orange": return "orange.500";
      case "red": return "red.500";
      default: return "gray.600";
    }
  }, [getMetricColor]);

  // Helper functions for correlation analysis
  const normalize = (arr) => {
    const min = Math.min(...arr);
    const max = Math.max(...arr);
    if (max === min) return arr.map(() => 0);
    return arr.map(v => (v - min) / (max - min));
  };

  const isNegativeMetric = (metric) => ["lcp", "tbt", "si", "fcp", "cls"].includes(metric);

  // Lighthouse 10 weights
  const LIGHTHOUSE_WEIGHTS = {
    fcp: 0.10,  // First Contentful Paint - 10%
    si: 0.10,   // Speed Index - 10%
    lcp: 0.25,  // Largest Contentful Paint - 25%
    tbt: 0.30,  // Total Blocking Time - 30%
    cls: 0.25   // Cumulative Layout Shift - 25%
  };

  // Metric thresholds for scoring (good/needs improvement/poor)
  const METRIC_THRESHOLDS = {
    fcp: { good: 1800, poor: 3000 },
    si: { good: 3400, poor: 5800 },
    lcp: { good: 2500, poor: 4000 },
    tbt: { good: 200, poor: 600 },
    cls: { good: 0.1, poor: 0.25 }
  };

  // Calculate metric score (0-100) based on Lighthouse scoring
  const calculateMetricScore = useCallback((metric, value) => {
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
  }, []);
  

  // NEW: Calculate R-squared correlations for the selected heatmap company and date range
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

          // Calculate current metric score and potential improvement
          const avgValue = metricValuesForR.reduce((a, b) => a + b, 0) / metricValuesForR.length;
          const currentMetricScore = calculateMetricScore(metric, avgValue);
          const maxPossibleMetricScore = 100;
          const potentialImprovement = maxPossibleMetricScore - currentMetricScore;

          correlations[metric] = { 
            r: parseFloat(r.toFixed(3)), 
            r2: parseFloat(r2.toFixed(3)),
            n: metricValuesForR.length,
            avgValue: avgValue,
            minValue: Math.min(...metricValuesForR),
            maxValue: Math.max(...metricValuesForR),
            weight: LIGHTHOUSE_WEIGHTS[metric],
            currentMetricScore: currentMetricScore,
            potentialImprovement: potentialImprovement, // Raw score points from metric itself
            weightedPotentialGain: potentialImprovement * LIGHTHOUSE_WEIGHTS[metric] // Points contributed to overall LH score
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
  }, [heatmapCompany, heatmapStartDate, heatmapEndDate, contentType, data, uniqueDates, getMetricsForCompany, calculateMetricScore]);

  // Effect to re-calculate R2 when heatmap selections change
  useEffect(() => {
    calculateR2Correlations();
  }, [heatmapCompany, heatmapStartDate, heatmapEndDate, contentType, calculateR2Correlations]);

  // NEW: R-squared Chart Data
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

  // Calculate expected score improvement
  const calculateScoreImpact = useCallback((metric, percentImprovement = 10) => {
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
    };
  }, [r2Correlations, calculateMetricScore]);

  // Calculate total possible score improvement
  const calculateTotalPossibleImprovement = useCallback(() => {
    if (!r2Correlations || !heatmapCompany) return null;
    
    // Get the actual current score using the same method as the bar chart
    const actualCurrentScore = computeScore(heatmapCompany, contentType, 
      heatmapEndDate ? [heatmapEndDate] : [selectedDate]);
    
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
  }, [r2Correlations, heatmapCompany, computeScore, contentType, heatmapEndDate, selectedDate]);
  
  // Calculate required improvements to reach target score
  const calculateTargetRequirements = useCallback((targetScoreInput) => {
    if (!r2Correlations || !heatmapCompany || !targetScoreInput || targetScoreInput <= 0) return null;
    
    const actualCurrentScore = computeScore(heatmapCompany, contentType, 
      heatmapEndDate ? [heatmapEndDate] : [selectedDate]);
    
    const scoreGapNeeded = targetScoreInput - actualCurrentScore;
    
    if (scoreGapNeeded <= 0) {
      return { alreadyAchieved: true, currentScore: actualCurrentScore };
    }
    
    // Calculate improvement needed for each metric
    const metricRequirements = [];
    let cumulativeGain = 0;
    
    // Sort metrics by efficiency (weighted potential improvement)
    const sortedMetrics = Object.entries(r2Correlations)
      .filter(([_, data]) => data && data.weightedPotentialGain > 0) // Ensure potential gain exists
      .sort((a, b) => {
        const efficiencyA = a[1].weightedPotentialGain;
        const efficiencyB = b[1].weightedPotentialGain;
        return efficiencyB - efficiencyA;
      });
    
    for (let i = 0; i < sortedMetrics.length && cumulativeGain < scoreGapNeeded; i++) {
      const [metric, data] = sortedMetrics[i];
      const currentValue = data.avgValue;
      const goodThreshold = METRIC_THRESHOLDS[metric].good;
      
      let targetValueForMetric;
      let metricScoreGain;
      let percentChange;

      // Determine how much of this metric's potential gain is needed
      const remainingGap = scoreGapNeeded - cumulativeGain;
      const maxGainFromThisMetric = data.weightedPotentialGain;

      if (remainingGap <= maxGainFromThisMetric) {
        // We only need a partial improvement from this metric to reach the target
        metricScoreGain = remainingGap;
        // Inverse calculation to find the target raw value for the metric
        // This is a simplified linear approximation; actual Lighthouse scoring is log-normal.
        const currentMetricScore = calculateMetricScore(metric, currentValue);
        const targetMetricScoreForThisMetric = currentMetricScore + (remainingGap / data.weight);

        // Approximate target raw value using inverse of calculateMetricScore
        const LOG_NORMAL_PARAMS = {
          fcp: { median: 1800, podr: 1000 },
          si: { median: 3400, podr: 1700 },
          lcp: { median: 2500, podr: 1200 },
          tbt: { median: 300, podr: 100 },
          cls: { median: 0.1, podr: 0.01 }
        };
        const { median, podr } = LOG_NORMAL_PARAMS[metric] || {};
        const scoreFraction = targetMetricScoreForThisMetric / 100;
        
        if (isNegativeMetric(metric)) { // Lower is better
          targetValueForMetric = Math.exp(Math.log(podr) + Math.sqrt(2 * Math.log(median / podr)) * Math.log((1 / scoreFraction) - 1));
          targetValueForMetric = Math.max(goodThreshold, targetValueForMetric); // Don't suggest worse than good threshold
        } else { // Higher is better (not typically for Core Web Vitals)
          targetValueForMetric = Math.exp(Math.log(podr) + Math.sqrt(2 * Math.log(median / podr)) * Math.log((1 / scoreFraction) - 1));
          targetValueForMetric = Math.min(goodThreshold, targetValueForMetric); // Don't suggest better than good threshold if not applicable
        }

        percentChange = ((currentValue - targetValueForMetric) / currentValue * 100);
        
      } else {
        // Full improvement to good threshold is needed (and still more score needed)
        targetValueForMetric = goodThreshold;
        metricScoreGain = maxGainFromThisMetric;
        percentChange = ((currentValue - goodThreshold) / currentValue * 100);
      }
      
      metricRequirements.push({
        metric: metric.toUpperCase(),
        currentValue: currentValue.toFixed(metric === 'cls' ? 3 : 0),
        targetValue: targetValueForMetric.toFixed(metric === 'cls' ? 3 : 0),
        percentChange: percentChange.toFixed(1),
        scoreGain: metricScoreGain.toFixed(1),
        weight: (data.weight * 100).toFixed(0)
      });
      
      cumulativeGain += metricScoreGain;
    }
    
    const totalAchievableGain = sortedMetrics.reduce((sum, [_, data]) => sum + data.weightedPotentialGain, 0);

    return {
      currentScore: actualCurrentScore.toFixed(1),
      targetScore: targetScoreInput,
      scoreGapNeeded: scoreGapNeeded.toFixed(1),
      achievable: cumulativeGain >= scoreGapNeeded,
      requirements: metricRequirements,
      totalGainPossible: totalAchievableGain.toFixed(1)
    };
  }, [r2Correlations, heatmapCompany, computeScore, contentType, heatmapEndDate, selectedDate, calculateMetricScore]);


  // MatrixRain placeholder component
  const MatrixRain = () => <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'none' }} />;

  return (
    <Box pt="50px" px={6} className="glass-bg" position="relative">
      <MatrixRain />
      <Text className="title">Gallery Overview</Text>
  
  
      {!selectedDate ? (
        <>
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
  
          <Flex justify="center" align="center" height="30vh">
            <Spinner size="xl" color="white" />
          </Flex>
        </>
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
          <Flex justify="flex-end" mb={2} mr={2}>
            {/* Removed the "Predictions Active" Tooltip and Badge */}
          </Flex>

          <Box width="100%" maxW="1200px" mx="auto">
            <Grid 
              templateColumns={{ base: "1fr", sm: "repeat(2, 1fr)", md: "repeat(3, 1fr)" }}
              gap={6}
            >
              {companyPerformance.map((company) => (
                <GridItem key={company.name}>
                  <Box 
                    className="anb-chart-container" 
                    p={3} 
                    borderRadius="md"
                    minH="120px"
                    position="relative"
                    // Removed conditional border styling
                  >
                    <Text fontWeight="bold" fontSize="sm" mb={1} color="white">
                      {company.name}
                      {/* Removed conditional badge for predicted values */}
                    </Text>
                    <Stat>
                      <StatLabel fontSize="xs" color="rgba(255,255,255,0.5)">Average</StatLabel>
                      <StatNumber
                        fontSize="xl"
                        color={
                          company.score >= 50
                            ? "#2BFFB9" // Green
                            : company.score >= 35
                            ? "#FFA73D" // Yellow
                            : "#FF2965" // Red
                        }
                      >
                        <CountUp end={company.score} duration={1.5} decimals={1} />
                      </StatNumber>

                      {company.previousScore > 0 && (
                        <StatHelpText fontSize="xs">
                          <StatArrow type={company.change >= 0 ? "increase" : "decrease"} />
                          {Math.abs(company.change)}%
                        </StatHelpText>
                      )}
                    </Stat>

                    {/* METRICS: CLS, LCP, SI, TBT, FCP */}
                    {(() => {
                      const showMetrics = expandedCompanies.includes(company.name);
                      const metrics = getMetricsForCompany(company.name, contentType, dateStr);
                      const previousMetrics = getMetricsForCompany(company.name, contentType, previousDateStr);

                      const getChange = (curr, prev) => {
                        if (!prev || prev === 0) return null;
                        return ((curr - prev) / prev * 100).toFixed(1);
                      };

                      const getColor = (metric, value) => {
                        if (metric === "cls") return value <= 0.1 ? "lime" : value <= 0.25 ? "orange" : "red";
                        if (metric === "lcp") return value <= 2500 ? "lime" : value <= 4000 ? "orange" : "red";
                        if (metric === "si") return value <= 3400 ? "lime" : value <= 5800 ? "orange" : "red";
                        if (metric === "tbt") return value <= 200 ? "lime" : value <= 600 ? "orange" : "red";
                        if (metric === "fcp") return value <= 1800 ? "lime" : value <= 3000 ? "orange" : "red";
                        return "white";
                      };

                      return (
                        <>
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
                          {showMetrics && (
                            <Box mt={2}>
                              {["cls", "lcp", "si", "tbt", "fcp"].map(metric => {
                                const value = metrics[metric];
                                const prev = previousMetrics[metric];
                                const change = getChange(value, prev);
                                return (
                                  <Text fontSize="xs" color="white" key={metric}>
                                    {metric.toUpperCase()}: <b style={{ color: getColor(metric, value) }}>
                                      {metric === "cls" ? value?.toFixed(3) : value?.toLocaleString()}
                                    </b>
                                  </Text>
                                );
                              })}
                            </Box>
                          )}
                        </>
                      );
                    })()}
                  </Box>
                </GridItem>
              ))}
            </Grid>
          </Box>

          {/* Bar Chart with Companies to Display */}
          <Box className="anb-chart-container" width="100%" maxW="1200px" height="auto" pb={6}>
            <Flex justify="space-between" align="center" mb={4}>
              <Text className="anb-chart-title">Individual Company Performance</Text>
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

            {/* Label Mode Toggle */}
            <Flex justify="center" mb={2}>
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
                      display: function(context) {
                        return labelMode !== 'none';
                      },
                      color: (context) => {
                        if (labelMode === 'percent') {
                          const label = context.chart.data.labels[context.dataIndex];
                          const company = companyPerformance?.find(c => c.name === label);
                          if (!company || isNaN(company.change)) return 'white';
                          return company.change >= 0 ? '#2BFFB9' : '#FF2965';
                        }
                        return 'white';
                      },
                      font: (context) => {
                        const bar = context.chart.getDatasetMeta(context.datasetIndex).data[context.dataIndex];
                        const width = bar.width || 30;
                        const adjusted = Math.max(10, Math.min(16, width * 0.5));
                        return {
                          size: adjusted,
                          weight: 'bold'
                        };
                      },
                      formatter: (value, context) => {
                        if (labelMode === 'none') return '';
                        
                        const label = context.chart.data.labels[context.dataIndex];
                        const company = companyPerformance?.find(c => c.name === label);
                        
                        if (labelMode === 'percent') {
                          if (!company || isNaN(company.change)) return '';
                          return company.change >= 0 ? '⬆️' : '⬇️';
                        }
                        return Math.round(value);
                      },
                      anchor: 'end',
                      align: 'top'
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
                    plugins: {
                      legend: { labels: { color: "#ffffff" } },
                      tooltip: {
                        callbacks: {
                          label: (context) => {
                            const dataset = context.dataset;
                            if (dataset.label?.includes("Regression") && dataset.slopeValue !== undefined) {
                              return `${dataset.label} (Slope): ${dataset.slopeValue}`;
                            }
                            return `${dataset.label}: ${context.parsed.y.toFixed(1)}`;
                          }
                        }
                      },
                      datalabels: {
                        display: false
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
                        grid: { display: false }
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
                          colorScheme={imageCompanies.includes(c) ? "blue" : "red"}
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

          {/* Heatmap Section */}
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
                  {allCompanies.map(company => (
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
                            label={`${metric.toUpperCase()}: ${value !== null && !isNaN(value) ? value.toFixed(metric === "cls" ? 3 : 1) : 'N/A'}`}
                            placement="top"
                            bg="gray.700"
                            color="white"
                            fontSize="xs"
                            hasArrow
                            _hover={{ transform: "scale(1.1)", zIndex: 1 }}
                            transition="transform 0.1s ease-in-out"
                          >
                            <Flex
                              w="50px"
                              h="40px"
                              flexShrink={0}
                              bg={getHeatmapCellColor(metric, value)}
                              justify="center"
                              align="center"
                              border="1px solid rgba(0,0,0,0.1)"
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

              {/* NEW: R-squared Correlation Graph */}
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
                                callback: function(value) {
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
                                  <Box p={2} bg="rgba(34,211,76,0.1)" borderRadius="md" mt={3}>
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
                                            {req.currentValue} → {req.targetValue} ({req.percentChange}%)
                                          </Text>
                                        </Box>
                                      ))}
                                    </VStack>
                                  ) : (
                                    <Text fontSize="xs" color="orange.300">
                                      ⚠️ Target score {targetScore} requires {targetReqs.scoreGapNeeded} points, 
                                      but maximum possible gain is {targetReqs.totalGainPossible} points.
                                      Suggested reachable target: {(parseFloat(targetReqs.currentScore) + parseFloat(targetReqs.totalGainPossible)).toFixed(0)}
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
                                .filter(([_, corr]) => corr && corr.r2 >= 0.3) // Only show metrics with at least moderate correlation
                                .sort((a, b) => {
                                  const impactA = calculateScoreImpact(a[0], 10);
                                  const impactB = calculateScoreImpact(b[0], 10);
                                  return parseFloat(impactB?.immediateScoreGain || 0) - parseFloat(impactA?.immediateScoreGain || 0);
                                })
                                .slice(0, 2)
                                .map(([metric, corr]) => {
                                  const impact = calculateScoreImpact(metric, 10);
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
              
              <Grid templateColumns={{ base: "1fr", md: "repeat(2, 1fr)" }} gap={6}>
                {/* Top Performers */}
                <GridItem>
                  <Box bg="rgba(255,255,255,0.05)" p={4} borderRadius="md">
                    <Text fontWeight="bold" mb={3} color={COLORS.good}>Top Performing Companies</Text>
                    {topPerformers.map((company, index) => (
                      <Flex key={index} justify="space-between" align="center" mb={2}>
                        <HStack>
                          <Box width="12px" height="12px" borderRadius="50%" bg={company.color} />
                          <Text color="white" fontWeight={index === 0 ? "bold" : "normal"}>
                            {company.name}
                            {company.isAzteca && (
                              <Badge ml={2} colorScheme="blue" fontSize="xs">TVA</Badge>
                            )}
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
                
                {/* Bottom Performers */}
                <GridItem>
                  <Box bg="rgba(255,255,255,0.05)" p={4} borderRadius="md">
                    <Text fontWeight="bold" mb={3} color={COLORS.poor}>Lowest Performing Companies</Text>
                    {bottomPerformers.map((company, index) => (
                      <Flex key={index} justify="space-between" align="center" mb={2}>
                        <HStack>
                          <Box width="12px" height="12px" borderRadius="50%" bg={company.color} />
                          <Text color="white" fontWeight={index === 0 ? "bold" : "normal"}>
                            {company.name}
                            {company.isAzteca && (
                              <Badge ml={2} colorScheme="blue" fontSize="xs">TVA</Badge>
                            )}
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
                            {company.isAzteca && (
                              <Badge ml={2} colorScheme="blue" fontSize="xs">TVA</Badge>
                            )}
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
                            {company.isAzteca && (
                              <Badge ml={2} colorScheme="blue" fontSize="xs">TVA</Badge>
                            )}
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

          {/* Radar Charts - Only show Azteca since there are no competition companies */}
          <Flex wrap="wrap" gap={10} justify="center">
            <Box className="anb-chart-container" width="480px" height="600px">
              <Flex justify="space-between" align="center" mb={2}>
                <Text className="anb-chart-title">TV Azteca Image Radar</Text>
                <Tooltip 
                  label={
                    `This radar shows average performance.\n\n` +
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
                data={getRadarData(imageCompanies, true)} 
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
                Average image score across all TV Azteca properties for the selected <Text as="span" fontStyle="italic">{timeRange}</Text> period is {getGroupScores.azteca.toFixed(1)}, with a {getGroupScores.aztecaChange >= 0 ? 'growth' : 'decline'} of {Math.abs(getGroupScores.aztecaChange)}% from previous period.
              </Text>
              
              <Text color="white" fontSize="sm">
                <Text as="span" fontWeight="bold">Top Performer: </Text>
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
                <Text as="span" fontWeight="bold">Property Breakdown: </Text>
                {imageCompanies.map(c => {
                  const company = companyPerformance.find(cp => cp.name === c);
                  return company ? `${company.name}: ${company.score.toFixed(1)} (${company.change >= 0 ? '+' : ''}${company.change}%)` : '';
                }).filter(Boolean).join(', ')}
              </Text>
            </VStack>
          </Box>
        </VStack>
      )}
    </Box>
  );
};

export default ImageScoresOverview;
