import React, { useEffect, useState, useMemo } from "react";
import {
  Box, Text, Flex, Spinner, Select, IconButton, CheckboxGroup,
  Checkbox, HStack, VStack, Slider, SliderTrack, SliderFilledTrack,
  SliderThumb, Button, Badge, Stat, StatLabel, StatNumber, StatHelpText,
  StatArrow, Grid, GridItem, Tooltip, Divider, ButtonGroup, Input
} from "@chakra-ui/react";
import { 
  FaChevronLeft, 
  FaChevronRight, 
  FaChartLine,
  FaInfoCircle,
  FaCalendarAlt
} from "react-icons/fa";
import { FaChevronDown, FaChevronUp } from "react-icons/fa";
import CountUp from 'react-countup';

import Papa from "papaparse";
import { Radar, Bar } from "react-chartjs-2";
import {
  Chart as ChartJS, RadialLinearScale, CategoryScale, LinearScale,
  BarElement, PointElement, LineElement, Title, Tooltip as ChartTooltip, 
  Legend, Filler
} from "chart.js";
import ChartDataLabels from "chartjs-plugin-datalabels";
import "./Lighthouse.css";
import { Wrap } from "@chakra-ui/react";



ChartJS.register(
  RadialLinearScale, CategoryScale, LinearScale,
  BarElement, PointElement, LineElement,
  Title, ChartTooltip, Legend, ChartDataLabels, Filler
);

const VerticalOverview = () => {
  // State
  const [data, setData] = useState([]);
  const [selectedType, setSelectedType] = useState("video");
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



  // Constants
  const TIME_RANGES = ['daily', 'monthly', 'yearly', 'all', 'custom'];
  const competitionCompanies = [
    "Heraldo", "Televisa", "Milenio", "Universal", "As", "Infobae", "NyTimes", "Terra"
  ];
  
  const aztecaCompanies = [
    "Azteca 7", "Azteca UNO", "ADN40", "Deportes", "A+", "Noticias"
  ];
  
  const allCompanies = [...competitionCompanies, ...aztecaCompanies];

  const companyColors = {
    "Azteca UNO": "#FF3B3B",
    "Azteca 7": "#22D34C",
    "Deportes": "#2255FF",
    "ADN40": "#F2C744",
    "A+": "#A452D1",
    "Noticias": "#E46B17",
    "Milenio": "#21C285",
    "Heraldo": "#3B9EFF",
    "Universal": "#EE5253",
    "Televisa": "#20C997",
    "Terra": "#FFA726",
    "As": "#F44336",
    "Infobae": "#66E34F",
    "NyTimes": "#4285F4"
  };

  const COLORS = {
    poor: '#FF2965',
    medium: '#FFA73D',
    good: '#2BFFB9',
    azteca: '#4A6CF7',
    competition: '#FF5F6D'
  };

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
  

  const MONTHS = [
    "January", "February", "March", "April", "May", "June", 
    "July", "August", "September", "October", "November", "December"
  ];

  const metricKeys = {
    "Azteca 7": { cls: "CLS_30", lcp: "LCP_30", si: "SI_30", tbt: "TBT_30", fcp: "FCP_30" },
    "Azteca UNO": { cls: "CLS_31", lcp: "LCP_31", si: "SI_31", tbt: "TBT_31", fcp: "FCP_31" },
    "Noticias": { cls: "CLS_32", lcp: "LCP_32", si: "SI_32", tbt: "TBT_32", fcp: "FCP_32" },
    "Deportes": { cls: "CLS_33", lcp: "LCP_33", si: "SI_33", tbt: "TBT_33", fcp: "FCP_33" },
    "ADN40": { cls: "CLS_34", lcp: "LCP_34", si: "SI_34", tbt: "TBT_34", fcp: "FCP_34" },
    "A+": { cls: "CLS_35", lcp: "LCP_35", si: "SI_35", tbt: "TBT_35", fcp: "FCP_35" },
    "Milenio": { cls: "CLS_36", lcp: "LCP_36", si: "SI_36", tbt: "TBT_36", fcp: "FCP_36" },
    "Heraldo": { cls: "CLS_37", lcp: "LCP_37", si: "SI_37", tbt: "TBT_37", fcp: "FCP_37" },
    "Universal": { cls: "CLS_38", lcp: "LCP_38", si: "SI_38", tbt: "TBT_38", fcp: "FCP_38" },
    "Televisa": { cls: "CLS_39", lcp: "LCP_39", si: "SI_39", tbt: "TBT_39", fcp: "FCP_39" },
    "Terra": { cls: "CLS_40", lcp: "LCP_40", si: "SI_40", tbt: "TBT_40", fcp: "FCP_40" },
    "As": { cls: "CLS_41", lcp: "LCP_41", si: "SI_41", tbt: "TBT_41", fcp: "FCP_41" },
    "Infobae": { cls: "CLS_42", lcp: "LCP_42", si: "SI_42", tbt: "TBT_42", fcp: "FCP_42" },
    "NyTimes": { cls: "CLS_43", lcp: "LCP_43", si: "SI_43", tbt: "TBT_43", fcp: "FCP_43" }
  };
  

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

  // Score computation
  const computeScore = (company, type, date = dateStr) => {
    if (!data.length || !date) return 0;
    const keys = Object.keys(data[0]);
    const blockSize = 9;
    const index = allCompanies.indexOf(company);
    if (index === -1) return 0;
  
    const base = index * blockSize;
    const dateKey = keys[base];
    const typeKey = keys[base + 1];
    const scoreKey = keys[base + 3];
  
    if (type === "both") {
      const notaScore = computeScore(company, "nota", date);
      const videoScore = computeScore(company, "video", date);
      const both = [notaScore, videoScore].filter(s => !isNaN(s));
      if (both.length === 0) return 0;
      return parseFloat((both.reduce((a, b) => a + b, 0) / both.length).toFixed(1));
    }
  
    let total = 0, count = 0;
    data.forEach(row => {
      if (row[dateKey] === date && row[typeKey] === type) {
        const score = parseFloat(row[scoreKey]);
        if (!isNaN(score)) {
          total += score;
          count++;
        }
      }
    });
  
    return count ? parseFloat((total / count).toFixed(1)) : 0;
  };

  const getMetricsForCompany = (company, type = selectedType, date = dateStr) => {
    if (!data.length || !date) return {};
  
    const keys = Object.keys(data[0]);
    const blockSize = 9;
    const index = allCompanies.indexOf(company);
    if (index === -1) return {};
  
    const base = index * blockSize;
    const dateKey = keys[base];
    const typeKey = keys[base + 1];
    const clsKey = keys[base + 4];
    const lcpKey = keys[base + 5];
    const siKey = keys[base + 6];
    const tbtKey = keys[base + 7];
    const fcpKey = keys[base + 8];
  
    let clsSum = 0, lcpSum = 0, siSum = 0, tbtSum = 0, fcpSum = 0;
    let count = 0;
  
    data.forEach(row => {
      if (row[dateKey] === date && row[typeKey] === type) {
        const cls = parseFloat(row[clsKey]);
        const lcp = parseFloat(row[lcpKey]);
        const si = parseFloat(row[siKey]);
        const tbt = parseFloat(row[tbtKey]);
        const fcp = parseFloat(row[fcpKey]);
  
        if (!isNaN(cls)) clsSum += cls;
        if (!isNaN(lcp)) lcpSum += lcp;
        if (!isNaN(si)) siSum += si;
        if (!isNaN(tbt)) tbtSum += tbt;
        if (!isNaN(fcp)) fcpSum += fcp;
  
        count++;
      }
    });
  
    if (!count) return {};
  
    return {
      cls: parseFloat((clsSum / count).toFixed(3)),
      lcp: parseFloat((lcpSum / count).toFixed(1)),
      si: parseFloat((siSum / count).toFixed(1)),
      tbt: parseFloat((tbtSum / count).toFixed(1)),
      fcp: parseFloat((fcpSum / count).toFixed(1))
    };
  };
  
  
  

  // Calculate average scores for each group
  const getGroupScores = useMemo(() => {
    if (!selectedDate) return { azteca: 0, competition: 0 };
    
    const calculateAverage = (companies, type) => {
      let total = 0, count = 0;
      companies.forEach(company => {
        const score = computeScore(company, type);
        if (score > 0) {
          total += score;
          count++;
        }
      });
      return count ? parseFloat((total / count).toFixed(1)) : 0;
    };
    
    const getPreviousAverage = (companies, type) => {
      if (!previousDateStr) return 0;
      let total = 0, count = 0;
      companies.forEach(company => {
        const score = computeScore(company, type, previousDateStr);
        if (score > 0) {
          total += score;
          count++;
        }
      });
      return count ? parseFloat((total / count).toFixed(1)) : 0;
    };
    
    const aztecaScore = calculateAverage(aztecaCompanies, selectedType);
    const competitionScore = calculateAverage(competitionCompanies, selectedType);
    const prevAztecaScore = getPreviousAverage(aztecaCompanies, selectedType);
    const prevCompetitionScore = getPreviousAverage(competitionCompanies, selectedType);
    
    const aztecaChange = prevAztecaScore ? ((aztecaScore - prevAztecaScore) / prevAztecaScore * 100).toFixed(1) : 0;
    const competitionChange = prevCompetitionScore ? ((competitionScore - prevCompetitionScore) / prevCompetitionScore * 100).toFixed(1) : 0;
    
    return {
      azteca: aztecaScore,
      competition: competitionScore,
      aztecaChange: parseFloat(aztecaChange),
      competitionChange: parseFloat(competitionChange),
      difference: (aztecaScore - competitionScore).toFixed(1)
    };
  }, [selectedDate, previousDateStr, selectedType, aztecaCompanies, competitionCompanies]);

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
        .map(d => computeScore(company, selectedType, formatDate(d)))
        .filter(s => !isNaN(s));
  
      const avg = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
      return parseFloat(avg.toFixed(1));
    };
  
    return selectedCompanies.map(company => {
      const currentScore = getAvgScoreForCompany(company);
      const previousScore = previousDateStr ? computeScore(company, selectedType, previousDateStr) : 0;
      const change = previousScore ? ((currentScore - previousScore) / previousScore * 100).toFixed(1) : 0;
  
      return {
        name: company,
        score: currentScore,
        previousScore,
        change: parseFloat(change),
        isAzteca: aztecaCompanies.includes(company),
        color: companyColors[company]
      };
    }).sort((a, b) => b.score - a.score);
  }, [selectedCompanies, selectedType, selectedDate, timeRange, compareStartDate, compareEndDate]);
  

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
  
    const getAvgScoreForCompany = (company, startDate, endDate) => {
      const scores = uniqueDates
        .filter(d => d >= startDate && d <= endDate)
        .map(d => computeScore(company, selectedType, formatDate(d)))
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
      return {
        label: formatDateLabel(date),
        data: orderedCompanies.map(c =>
          computeScore(c, selectedType, date.toISOString().split('T')[0]) || 0
        ),
        backgroundColor: orderedCompanies.map(c =>
          (companyColors && companyColors[c]) || "#00f7ff"
        ),
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
  
  

  // Radar chart data
  const getRadarData = (companySet, isAzteca = true) => {
    const orderedCompanies = companySet.slice().sort((a, b) => {
      return allCompanies.indexOf(a) - allCompanies.indexOf(b);
    });
    
    const labels = orderedCompanies;
    const datasets = [];

    if (selectedType === "nota" || selectedType === "both") {
        datasets.push({
            label: "Nota",
            data: orderedCompanies.map(c => computeScore(c, "nota")),
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
          
      }
      
      if (selectedType === "video" || selectedType === "both") {
        datasets.push({
            label: "Video",
            data: orderedCompanies.map(c => computeScore(c, "video")),
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

  const getEquitativeScore = (companies, type) => {
    const scores = companies.map(c => computeScore(c, type)).filter(s => !isNaN(s));
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    const variance = scores.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / scores.length;
    const stdDev = Math.sqrt(variance);
  
    const score = Math.max(0, 100 - stdDev * 2); // You can adjust multiplier (2) if needed
    return score.toFixed(1);
  };
  

  return (
    <Box pt="80px" px={6} className="glass-bg">
      <Text className="title">Vertical Overview</Text>

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

          {/* Type Selector */}
          <Flex justify="center" mb={4}>
            <Select
              width="200px"
              value={selectedType}
              onChange={e => setSelectedType(e.target.value)}
              bg="rgba(255,255,255,0.1)"
              color="white"
              borderColor="rgba(255,255,255,0.2)"
            >
              <option value="nota">Nota</option>
              <option value="video">Video</option>
              <option value="both">Both</option>
            </Select>
          </Flex>


          {/* Performance Summary */}
          <Box width="100%" maxW="1200px" mx="auto">
  <Grid 
    templateColumns={{ base: "1fr", sm: "repeat(2, 1fr)", md: "repeat(3, 1fr)", lg: "repeat(4, 1fr)", xl: "repeat(5, 1fr)" }} 
    gap={4}
  >
    {companyPerformance.map((company) => {
  const showMetrics = expandedCompanies.includes(company.name);
  const metrics = getMetricsForCompany(company.name);

  const toggleExpand = () => {
    setExpandedCompanies(prev =>
      prev.includes(company.name)
        ? prev.filter(c => c !== company.name)
        : [...prev, company.name]
    );
  };

  return (
    <GridItem key={company.name}>
      <Box className="anb-chart-container" p={3} borderRadius="md" minH="120px">
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
            onClick={toggleExpand}
          />
        </Flex>
        <Stat>
          <StatLabel fontSize="xs" color="rgba(255,255,255,0.5)">Average</StatLabel>
          <StatNumber
  fontSize="xl"
  color={
    typeof company.score === "number" && !isNaN(company.score)
      ? company.score >= 50
        ? "#2BFFB9"   // Green
        : company.score >= 35
        ? "#FFA73D"   // Yellow
        : "#FF2965"   // Red
      : "white"
  }
>
  {typeof company.score === "number" && !isNaN(company.score) ? (
    <CountUp end={company.score} duration={1.5} decimals={1} />
  ) : (
    "-"
  )}
</StatNumber>

        </Stat>
        {showMetrics && metrics && (
  <Box mt={2}>
    <Text fontSize="xs" color="white">
      CLS: <b style={{ color: getMetricColor("cls", metrics.cls) }}>{metrics.cls.toFixed(3)}</b>
    </Text>
    <Text fontSize="xs" color="white">
      LCP: <b style={{ color: getMetricColor("lcp", metrics.lcp) }}>{metrics.lcp.toLocaleString()}</b>
    </Text>
    <Text fontSize="xs" color="white">
      SI: <b style={{ color: getMetricColor("si", metrics.si) }}>{metrics.si.toLocaleString()}</b>
    </Text>
    <Text fontSize="xs" color="white">
      TBT: <b style={{ color: getMetricColor("tbt", metrics.tbt) }}>{metrics.tbt.toLocaleString()}</b>
    </Text>
    <Text fontSize="xs" color="white">
      FCP: <b style={{ color: getMetricColor("fcp", metrics.fcp) }}>{metrics.fcp.toLocaleString()}</b>
    </Text>
  </Box>
)}

      </Box>
    </GridItem>
  );
})}

  </Grid>
</Box>



          {/* Bar Chart with Responsive Sizing */}
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
              colorScheme={aztecaCompanies.includes(c) ? "blue" : "red"}
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

          {/* Radar Charts */}
          <Flex wrap="wrap" gap={10} justify="center">
            <Box className="anb-chart-container" width="480px" height="480px">
            <Flex justify="space-between" align="center" mb={2}>
  <Text className="anb-chart-title">TV Azteca Radar</Text>
  <Tooltip 
  label={
    `This radar shows average performance.\n\n` +
    `A more balanced shape = higher Equitative Score.\n\n` +
    `Equitative Score: ${getEquitativeScore(aztecaCompanies, selectedType)} / 100`
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
                data={getRadarData(aztecaCompanies, true)} 
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
            <Box className="anb-chart-container" width="480px" height="480px">
              <Text className="anb-chart-title">Competition Radar</Text>
              <Tooltip 
  label={
    `This radar compares competition.\n\n` +
    `Equitative Score: ${getEquitativeScore(competitionCompanies, selectedType)} / 100`
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

              <Radar 
                data={getRadarData(competitionCompanies, false)}
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
                TV Azteca {getGroupScores.azteca > getGroupScores.competition ? 'outperforms' : 'underperforms'} competition by {Math.abs(getGroupScores.difference)} points ({Math.abs(parseFloat(getGroupScores.difference) / getGroupScores.competition * 100).toFixed(1)}%).
              </Text>
              
              <Text color="white" fontSize="sm">
                <Text as="span" fontWeight="bold">Growth Comparison: </Text>
                TV Azteca shows {getGroupScores.aztecaChange >= 0 ? 'growth' : 'decline'} of {Math.abs(getGroupScores.aztecaChange)}% while competition shows {getGroupScores.competitionChange >= 0 ? 'growth' : 'decline'} of {Math.abs(getGroupScores.competitionChange)}%.
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
                <Text as="span" fontWeight="bold">TV Azteca Performance: </Text>
                {aztecaCompanies.map(c => {
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

export default VerticalOverview;