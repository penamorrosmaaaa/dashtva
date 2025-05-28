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
  FaCalendarAlt,
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
import "./Lighthouse.css"; // Assuming you have the same CSS file
import CountUp from 'react-countup';
import MatrixRain from "./MatrixRain";

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
  const [selectedMetric, setSelectedMetric] = useState("cls");
  const [expandedCompanies, setExpandedCompanies] = useState([]);
  const [labelMode, setLabelMode] = useState("raw");
  const [trendCompany, setTrendCompany] = useState(null);

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

  // Score computation
  const computeScore = (company, date = dateStr, type = "nota", dateList = [new Date(date)]) => {
    if (!data.length || !dateList.length) return 0;
    const scoreKey = imageCompanyScoreKeys[company];
    if (!scoreKey) return 0;
    const dateKey = Object.keys(data[0])[0];
  
    const scores = dateList.flatMap(d => {
      const dateString = d.toISOString().split("T")[0];
      const rows = data.filter(row => row[dateKey] === dateString && row.Type === type);
      return rows.map(row => parseFloat(row[scoreKey])).filter(n => !isNaN(n));
    });
  
    const avg = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
    return parseFloat(avg.toFixed(1));
  };

  // Added trend data function
  const getTrendData = (company) => {
    if (!company || !data.length || !filteredDates.length) return null;
  
    const formatDate = (d) => d.toISOString().split("T")[0];
    const dateObjects = filteredDates.filter(d => d <= selectedDate);
    const labels = dateObjects.map(formatDate);
    const values = dateObjects.map(d => computeScore(company, formatDate(d), contentType, [d]));
    
    // Average line
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const averageArray = values.map(() => parseFloat(avg.toFixed(2)));
  
    // Regression line
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
          pointRadius: 3, // Keep this as is for the main trend line
          fill: false
        },
        {
          label: `${company} Average`,
          data: averageArray,
          borderColor: "white",
          borderDash: [6, 4],
          borderWidth: 1.5,
          pointRadius: 1, // Set a small radius to make it hoverable
          fill: false
        },
        {
          label: `${company} Regression`,
          data: regressionLine,
          borderColor: "#ffdc00",
          borderDash: [4, 3],
          borderWidth: 1.5,
          pointRadius: 1, // Set a small radius to make it hoverable
          slopeValue: slope,
          fill: false
        }
      ]
    };
  };
  

  const getMetricsForCompany = (company, type = contentType, date = dateStr) => {
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
  
    return {
      cls: average("cls"),
      lcp: average("lcp"),
      si: average("si"),
      tbt: average("tbt"),
      fcp: average("fcp")
    };
  };

  // Calculate average scores for each group
  const getGroupScores = useMemo(() => {
    if (!selectedDate) return { azteca: 0, competition: 0 };
    
    const calculateAverage = (companies) => {
      let total = 0, count = 0;
      companies.forEach(company => {
        const score = computeScore(company);
        if (score > 0) {
          total += score;
          count++;
        }
      });
      return count ? parseFloat((total / count).toFixed(1)) : 0;
    };
    
    const getPreviousAverage = (companies) => {
      if (!previousDateStr) return 0;
      let total = 0, count = 0;
      companies.forEach(company => {
        const score = computeScore(company, previousDateStr);
        if (score > 0) {
          total += score;
          count++;
        }
      });
      return count ? parseFloat((total / count).toFixed(1)) : 0;
    };
    
    const aztecaScore = calculateAverage(imageCompanies);
    const competitionScore = calculateAverage(competitionCompanies);
    const prevAztecaScore = getPreviousAverage(imageCompanies);
    const prevCompetitionScore = getPreviousAverage(competitionCompanies);
    
    const aztecaChange = prevAztecaScore ? ((aztecaScore - prevAztecaScore) / prevAztecaScore * 100).toFixed(1) : 0;
    const competitionChange = prevCompetitionScore ? ((competitionScore - prevCompetitionScore) / prevCompetitionScore * 100).toFixed(1) : 0;
    
    return {
      azteca: aztecaScore,
      competition: competitionScore,
      aztecaChange: parseFloat(aztecaChange),
      competitionChange: parseFloat(competitionChange),
      difference: (aztecaScore - competitionScore).toFixed(1)
    };
  }, [selectedDate, previousDateStr, imageCompanies, competitionCompanies, timeRange]);

  const companyPerformance = useMemo(() => {
    return selectedCompanies.map(company => {
      const currentScore = computeScore(company, dateStr, contentType, dateRangeForCurrentView);
      const previousScore = previousDateStr
        ? computeScore(company, previousDateStr, contentType, [new Date(previousDateStr)])
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
        color: companyColors[company]
      };
    }).sort((a, b) => b.score - a.score);
  }, [selectedCompanies, dateStr, previousDateStr, timeRange, contentType, dateRangeForCurrentView]);

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
        .map(d => computeScore(company, formatDate(d)))
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
          computeScore(c, date.toISOString().split('T')[0]) || 0
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

    datasets.push({
      label: "Image Scores",
      data: orderedCompanies.map(c => computeScore(c, dateStr, contentType, dateRangeForCurrentView)),
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

  const equitativeScore = useMemo(() => {
    const scores = imageCompanies.map(c => computeScore(c)).filter(s => !isNaN(s));
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    const variance = scores.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / scores.length;
    const stdDev = Math.sqrt(variance);
    return Math.max(0, 100 - stdDev * 2).toFixed(1);
  }, [imageCompanies, dateStr, timeRange]);

  return (
    <Box pt="50px" px={6} className="glass-bg" position="relative">
      <MatrixRain /> {/* 👈 Añadido aquí */}
      <Text className="title">Image Overview</Text>
  
  
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
                  >
                    <Text fontWeight="bold" fontSize="sm" mb={1} color="white">
                      {company.name}
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
                      tooltip: { // Keep tooltip enabled for hovering
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
                      datalabels: { // This is the plugin for the numbers on top of points
                        display: false // Set display to false to remove these labels
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