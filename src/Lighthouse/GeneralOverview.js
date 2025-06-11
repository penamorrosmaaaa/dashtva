import React, { useEffect, useState, useMemo, useRef, useCallback } from "react";
import {
  Box,
  Text,
  Flex,
  Spinner,
  Select,
  HStack,
  VStack,
  IconButton,
  useToast,
  Button,
  ButtonGroup,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  ModalFooter,
  Menu,
  MenuButton,
  MenuList,
  Input,
  Tooltip as ChakraTooltip,
  Badge,
  Divider,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  StatArrow,
  Grid,
  GridItem,
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverArrow,
  PopoverCloseButton,
  PopoverHeader,
  PopoverBody,
  Checkbox,
  CheckboxGroup,
  Stack,
} from "@chakra-ui/react";
import {
  FaChevronDown,
  FaChevronLeft,
  FaChevronRight,
  FaInfoCircle,
  FaExchangeAlt,
} from "react-icons/fa";
import Papa from "papaparse";
import { Line, Bar } from "react-chartjs-2"; // Removed Scatter import
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import "./Lighthouse.css";
import ChartDataLabels from "chartjs-plugin-datalabels";
import CountUp from "react-countup";
import { saveAs } from "file-saver";
import MatrixRain from "./MatrixRain";

// Register ChartJS components
ChartJS.register(
  ChartDataLabels,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

// Constants
const COMPETITION_COMPANIES = [
  "Heraldo",
  "Televisa",
  "Milenio",
  "Universal",
  "As",
  "Infobae",
  "NyTimes",
  "Terra",
];
const AZTECA_COMPANIES = ["Azteca 7", "Azteca UNO", "ADN40", "Azteca Deportes", "A+", "Azteca Noticias"];
const ALL_COMPANIES = [...COMPETITION_COMPANIES, ...AZTECA_COMPANIES]; // Combined list
const TIME_RANGES = ["daily", "weekly", "monthly", "yearly", "all", "custom", "select"];
const BLOCK_SIZE = 9; // Number of columns per company in the CSV
const COLORS = {
  poor: "#FF2965",
  medium: "#FFA73D",
  good: "#2BFFB9",
  azteca: ["#4A6CF7", "#6A8BFF", "#8CABFF", "#AEC6FF", "#D0E0FF", "#F0F5FF"],
  competition: "#763EBC",
};

// Consistent company colors from VerticalOverview
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


const GeneralOverview = () => {
  // State
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedType, setSelectedType] = useState("both");
  const [uniqueDates, setUniqueDates] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [timeRange, setTimeRange] = useState("daily");
  const [compareMode, setCompareMode] = useState(false);
  const [compareStartDate, setCompareStartDate] = useState(null);
  const [compareEndDate, setCompareEndDate] = useState(null);
  const [insightsModalOpen, setInsightsModalOpen] = useState(false);
  const [currentInsights, setCurrentInsights] = useState("");
  const [labelMode, setLabelMode] = useState("none");
  const [selectedDatesForSelect, setSelectedDatesForSelect] = useState([]); // New state for selected dates
  const [groupMode, setGroupMode] = useState(false);
  const [selectedWeeklyGroups, setSelectedWeeklyGroups] = useState([]);
  const [selectedMonthlyGroups, setSelectedMonthlyGroups] = useState([]);
  const [selectedYearlyGroups, setSelectedYearlyGroups] = useState([]);

  const toast = useToast();

  // Helper to get column keys for a specific company
  const getCompanyKeys = useCallback((company) => {
    const allKeys = Object.keys(data[0] || {});
    const companyIndex = ALL_COMPANIES.indexOf(company);
    if (companyIndex === -1) return null;

    const base = companyIndex * BLOCK_SIZE;
    return {
      dateKey: allKeys[base],
      typeKey: allKeys[base + 1],
      scoreKey: allKeys[base + 3],
      // Add other metric keys if needed for future extensions
      // clsKey: allKeys[base + 4],
      // lcpKey: allKeys[base + 5],
      // siKey: allKeys[base + 6],
      // tbtKey: allKeys[base + 7],
      // fcpKey: allKeys[base + 8],
    };
  }, [data]);

  // NEW: Function to compute a single score for a company, type, and date,
  // including linear regression for zero values.
  const getIndividualScore = useCallback((company, type, date) => {
    if (!data.length || !date) return 0;

    const keys = getCompanyKeys(company);
    if (!keys) return 0;

    const { dateKey, typeKey, scoreKey } = keys;
    const dateStr = date.toISOString().split("T")[0];

    let score = 0;
    let found = false;

    // Try to find the actual score for the given date
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      if (row[dateKey] === dateStr && (type === "both" || row[typeKey] === type)) {
        const val = parseFloat(row[scoreKey]);
        if (!isNaN(val) && val !== 0) { // Only consider non-zero real values
          score = val;
          found = true;
          break;
        }
      }
    }

    // If score is 0 or not found, try to predict using linear regression
    if (!found || score === 0) {
      const historicalX = []; // Indices of dates with non-zero scores
      const historicalY = []; // Non-zero scores

      const sortedUniqueDates = uniqueDates.map(d => d.toISOString().split("T")[0]).sort();
      const targetDateIndex = sortedUniqueDates.indexOf(dateStr);

      if (targetDateIndex === -1) return 0; // Date not found in unique dates

      // Collect historical non-zero data points for this company/type
      sortedUniqueDates.forEach((dStr, index) => {
        let sum = 0;
        let count = 0;
        data.forEach(row => {
          if (row[dateKey] === dStr && (type === "both" || row[typeKey] === type)) {
            const val = parseFloat(row[scoreKey]);
            if (!isNaN(val) && val !== 0) {
              sum += val;
              count++;
            }
          }
        });
        if (count > 0) {
          historicalX.push(index);
          historicalY.push(sum / count);
        }
      });

      // Perform linear regression if enough historical data points exist
      if (historicalX.length >= 2) {
        const n = historicalX.length;
        const sumX = historicalX.reduce((a, b) => a + b, 0);
        const sumY = historicalY.reduce((a, b) => a + b, 0);
        const sumXY = historicalX.reduce((acc, xi, i) => acc + xi * historicalY[i], 0);
        const sumX2 = historicalX.reduce((acc, xi) => acc + xi * xi, 0);

        const denominator = (n * sumX2 - sumX * sumX);
        if (denominator === 0) return 0; // Avoid division by zero if all x values are the same

        const m = (n * sumXY - sumX * sumY) / denominator;
        const b = (sumY - m * sumX) / n;

        const predicted = m * targetDateIndex + b;
        // Bound predicted values between 0-100
        return Math.max(0, Math.min(100, parseFloat(predicted.toFixed(1))));
      }
    }

    return parseFloat(score.toFixed(1)); // Return actual score if found and non-zero
  }, [data, uniqueDates, getCompanyKeys]);


  const exportWeeklyCSV = () => {
    if (!data.length || !generateChartData.dateRange?.length) return;

    const header = [
      "Date",
      "Company",
      "Score",
      "Change",
      "Status",
      "Label Mode",
      "Time Range",
    ];

    const rows = [];

    ALL_COMPANIES.forEach((company) => {
      generateChartData.dateRange.forEach((date) => {
        const { score, change, status } = getCompanyScore(company, date); // Pass date to getCompanyScore
        rows.push([
          date.toISOString().split("T")[0],
          company,
          score,
          change ?? "-",
          status,
          labelMode,
          timeRange,
        ]);
      });
    });

    // Add summary stats
    rows.push([]);
    rows.push(["", "TV Azteca Average", aztecaScore]);
    rows.push(["", "Competition Average", competitionScore]);
    rows.push(["", "Azteca Growth", `${calculateTrendAnalysis.azteca.growth}%`]);
    rows.push(["", "Competition Growth", `${calculateTrendAnalysis.competition.growth}%`]);
    rows.push(["", "Azteca Projection", calculateTrendAnalysis.azteca.projection]);
    rows.push(["", "Competition Projection", calculateTrendAnalysis.competition.projection]);
    rows.push(["", "Current Gap", calculateTrendAnalysis.comparison.current]);
    rows.push(["", "Trend", calculateTrendAnalysis.comparison.trend]);

    const csv = Papa.unparse([header, ...rows]);

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    saveAs(blob, `Weekly_Report_${new Date().toISOString().split("T")[0]}.csv`);
  };

  const weeklyGroups = useMemo(() => {
    const result = [];
    for (let i = 0; i < uniqueDates.length; i += 7) {
      const chunk = uniqueDates.slice(i, i + 7);
      if (chunk.length) {
        const label = `${chunk[0].toLocaleDateString()} - ${chunk[chunk.length - 1].toLocaleDateString()}`;
        result.push({ key: `${chunk[0].toISOString()}_${chunk[chunk.length - 1].toISOString()}`, label, dates: chunk });
      }
    }
    return result;
  }, [uniqueDates]);
  
  const monthlyGroups = useMemo(() => {
    const map = {};
    uniqueDates.forEach((date) => {
      const key = `${date.getFullYear()}-${date.getMonth()}`;
      if (!map[key]) map[key] = [];
      map[key].push(date);
    });
    return Object.entries(map).map(([key, dates]) => ({
      key,
      label: dates[0].toLocaleDateString("en-US", { year: "numeric", month: "long" }),
      dates,
    }));
  }, [uniqueDates]);
  
  const yearlyGroups = useMemo(() => {
    const map = {};
    uniqueDates.forEach((date) => {
      const key = `${date.getFullYear()}`;
      if (!map[key]) map[key] = [];
      map[key].push(date);
    });
    return Object.entries(map).map(([key, dates]) => ({
      key,
      label: key,
      dates,
    }));
  }, [uniqueDates]);
  
  // Calculate previous period data for comparison
  const getComparisonData = useMemo(() => {
    if (!selectedDate || !uniqueDates.length) return {};

    const currentIndex = uniqueDates.findIndex(
      (d) => d.getTime() === selectedDate.getTime()
    );
    if (currentIndex === -1) return {};

    let previousDate = null;
    let previousPeriodLabel = "";

    if (timeRange === "daily" && currentIndex > 0) {
      previousDate = uniqueDates[currentIndex - 1];
      previousPeriodLabel = "Previous Day";
    } else if (timeRange === "monthly") {
      const prevMonth = new Date(selectedDate);
      prevMonth.setMonth(prevMonth.getMonth() - 1);
      previousDate = uniqueDates.find(
        (d) => d.getMonth() === prevMonth.getMonth() && d.getFullYear() === prevMonth.getFullYear()
      );
      previousPeriodLabel = "Previous Month";
    } else if (timeRange === "yearly") {
      const prevYear = new Date(selectedDate);
      prevYear.setFullYear(prevYear.getFullYear() - 1);
      previousDate = uniqueDates.find((d) => d.getFullYear() === prevYear.getFullYear());
      previousPeriodLabel = "Previous Year";
    }

    if (!previousDate) return {};

    const calculatePreviousAverage = (companies) => {
      let total = 0, count = 0;
      companies.forEach(company => {
        const score = getIndividualScore(company, selectedType, previousDate);
        if (!isNaN(score) && score !== 0) { // Consider predicted scores as valid
          total += score;
          count++;
        }
      });
      return count ? parseFloat((total / count).toFixed(1)) : 0;
    };

    return {
      previousCompetitionScore: calculatePreviousAverage(COMPETITION_COMPANIES),
      previousAztecaScore: calculatePreviousAverage(AZTECA_COMPANIES),
      previousPeriodLabel,
    };
  }, [data, selectedDate, selectedType, timeRange, uniqueDates, getIndividualScore]);

  // Generate chart data based on time range
  const generateChartData = useMemo(() => {
    if (!selectedDate || !uniqueDates.length)
      return {
        competition: [],
        azteca: [],
        labels: [],
        dateRange: [],
      };

    let dateRange = [];
    let labels = [];

    if (timeRange === "daily") {
      dateRange = [selectedDate];
      labels = [selectedDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })];
    } else if (timeRange === "weekly") {
      const weekStart = new Date(selectedDate);
      weekStart.setDate(weekStart.getDate() - 6);
      dateRange = uniqueDates.filter((d) => d >= weekStart && d <= selectedDate);
      labels = dateRange.map((d) =>
        d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
      );
    } else if (timeRange === "monthly") {
      const monthStart = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
      dateRange = uniqueDates.filter((d) => d >= monthStart && d <= selectedDate);
      labels = dateRange.map((d) => d.toLocaleDateString("en-US", { day: "numeric" }));
    } else if (timeRange === "yearly") {
      const yearStart = new Date(selectedDate.getFullYear(), 0, 1);
      dateRange = uniqueDates.filter((d) => d >= yearStart && d <= selectedDate);
      labels = dateRange.map((d) =>
        d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
      );
    } else if (timeRange === "all") {
      dateRange = uniqueDates.filter((d) => d <= selectedDate);
      labels = dateRange.map((d) =>
        d.toLocaleDateString("en-US", {
          weekday: "short",
          year: "numeric",
          month: "short",
          day: "numeric",
        })
      );
    } else if (timeRange === "custom" && compareStartDate && compareEndDate) {
      dateRange = uniqueDates.filter((d) => d >= compareStartDate && d <= compareEndDate);
      labels = dateRange.map((d) =>
        d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
      );
    } else if (timeRange === "select" && selectedDatesForSelect.length > 0) {
      dateRange = selectedDatesForSelect.sort((a, b) => a - b);
      labels = dateRange.map((d) =>
        d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
      );
    } else if (timeRange === "weeklyGroup") {
      const selected = weeklyGroups.filter((g) => selectedWeeklyGroups.includes(g.key));
      selected.forEach((group) => {
        dateRange.push(...group.dates);
        labels.push(group.label);
      });
    } else if (timeRange === "monthlyGroup") {
      const selected = monthlyGroups.filter((g) => selectedMonthlyGroups.includes(g.key));
      selected.forEach((group) => {
        dateRange.push(...group.dates);
        labels.push(group.label);
      });
    } else if (timeRange === "yearlyGroup") {
      const selected = yearlyGroups.filter((g) => selectedYearlyGroups.includes(g.key));
      selected.forEach((group) => {
        dateRange.push(...group.dates);
        labels.push(group.label);
      });
    }
    
    const calculateAverages = (companies) => {
      return dateRange.map((date) => {
        let total = 0, count = 0;
        companies.forEach(company => {
          const score = getIndividualScore(company, selectedType, date);
          if (!isNaN(score)) { // Predicted scores are always numbers
            total += score;
            count++;
          }
        });
        return count ? parseFloat((total / count).toFixed(1)) : 0;
      });
    };

    return {
      competition: calculateAverages(COMPETITION_COMPANIES),
      azteca: calculateAverages(AZTECA_COMPANIES),
      labels,
      dateRange, // Include the actual date objects for tooltips
    };
  }, [
    selectedDate,
    selectedType,
    timeRange,
    uniqueDates,
    compareStartDate,
    compareEndDate,
    selectedDatesForSelect,
    weeklyGroups,
    monthlyGroups,
    yearlyGroups,
    getIndividualScore
  ]);

  const { competitionScore, aztecaScore } = useMemo(() => {
    if (!data.length || !generateChartData.dateRange?.length)
      return { competitionScore: "N/A", aztecaScore: "N/A" };

    const calculateAverageOverDates = (companies) => {
      let total = 0, count = 0;
      generateChartData.dateRange.forEach((date) => {
        companies.forEach(company => {
          const score = getIndividualScore(company, selectedType, date);
          if (!isNaN(score)) { // Predicted scores are always numbers
            total += score;
            count++;
          }
        });
      });
      return count ? (total / count).toFixed(1) : "N/A";
    };

    return {
      competitionScore: calculateAverageOverDates(COMPETITION_COMPANIES),
      aztecaScore: calculateAverageOverDates(AZTECA_COMPANIES),
    };
  }, [data, selectedType, generateChartData.dateRange, getIndividualScore]);

  // Calculate trend analysis and projections
  const calculateTrendAnalysis = useMemo(() => {
    const allHistoricalData = {
      competition: [],
      azteca: [],
      dates: [],
    };

    if (!data.length || !uniqueDates.length) {
      return {
        competition: { growth: 0, slope: 0, projection: 0 },
        azteca: { growth: 0, slope: 0, projection: 0 },
        comparison: { current: 0, trend: "" },
      };
    }

    let filteredDates = uniqueDates;

    if (timeRange === "weekly") {
      const weekStart = new Date(selectedDate);
      weekStart.setDate(weekStart.getDate() - 6);
      filteredDates = uniqueDates.filter((d) => d >= weekStart && d <= selectedDate);
    } else if (timeRange === "monthly") {
      const monthStart = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
      filteredDates = uniqueDates.filter((d) => d >= monthStart && d <= selectedDate);
    } else if (timeRange === "yearly") {
      const yearStart = new Date(selectedDate.getFullYear(), 0, 1);
      filteredDates = uniqueDates.filter((d) => d >= yearStart && d <= selectedDate);
    } else if (timeRange === "all") {
      filteredDates = uniqueDates.filter((d) => d <= selectedDate);
    } else if (timeRange === "custom" && compareStartDate && compareEndDate) {
      filteredDates = uniqueDates.filter((d) => d >= compareStartDate && d <= compareEndDate);
    } else if (timeRange === "select" && selectedDatesForSelect.length > 0) {
      filteredDates = selectedDatesForSelect.sort((a, b) => a - b);
    } else if (timeRange === "daily") {
      filteredDates = [selectedDate];
    } else if (timeRange === "weeklyGroup") {
      const selected = weeklyGroups.filter((g) => selectedWeeklyGroups.includes(g.key));
      selected.forEach((group) => {
        filteredDates.push(...group.dates);
      });
    } else if (timeRange === "monthlyGroup") {
      const selected = monthlyGroups.filter((g) => selectedMonthlyGroups.includes(g.key));
      selected.forEach((group) => {
        filteredDates.push(...group.dates);
      });
    } else if (timeRange === "yearlyGroup") {
      const selected = yearlyGroups.filter((g) => selectedYearlyGroups.includes(g.key));
      selected.forEach((group) => {
        filteredDates.push(...group.dates);
      });
    }


    filteredDates.forEach((date) => {
      let compTotal = 0, compCount = 0;
      COMPETITION_COMPANIES.forEach(company => {
        const score = getIndividualScore(company, selectedType, date);
        if (!isNaN(score)) {
          compTotal += score;
          compCount++;
        }
      });

      let aztecaTotal = 0, aztecaCount = 0;
      AZTECA_COMPANIES.forEach(company => {
        const score = getIndividualScore(company, selectedType, date);
        if (!isNaN(score)) {
          aztecaTotal += score;
          aztecaCount++;
        }
      });

      if (compCount > 0 && aztecaCount > 0) {
        const compAvg = parseFloat((compTotal / compCount).toFixed(1));
        const aztecaAvg = parseFloat((aztecaTotal / aztecaCount).toFixed(1));

        allHistoricalData.competition.push(compAvg);
        allHistoricalData.azteca.push(aztecaAvg);
        allHistoricalData.dates.push(date);
      }
    });

    if (!allHistoricalData.competition.length || !allHistoricalData.azteca.length) {
      return {
        competition: { growth: 0, slope: 0, projection: 0 },
        azteca: { growth: 0, slope: 0, projection: 0 },
        comparison: { current: 0, trend: "" },
      };
    }

    const sortedIndices = allHistoricalData.dates
      .map((_, i) => i)
      .sort((a, b) => allHistoricalData.dates[a] - allHistoricalData.dates[b]);

    allHistoricalData.competition = sortedIndices.map((i) => allHistoricalData.competition[i]);
    allHistoricalData.azteca = sortedIndices.map((i) => allHistoricalData.azteca[i]);
    allHistoricalData.dates = sortedIndices.map((i) => allHistoricalData.dates[i]);

    const calcGrowth = (arr) =>
      arr.length > 1 ? ((arr[arr.length - 1] - arr[0]) / Math.max(0.1, Math.abs(arr[0]))) * 100 : 0;

    const calcSlope = (arr) =>
      arr.length > 1 ? (arr[arr.length - 1] - arr[0]) / Math.max(1, arr.length - 1) : 0;

    const compGrowth = calcGrowth(allHistoricalData.competition);
    const aztecaGrowth = calcGrowth(allHistoricalData.azteca);
    const compSlope = calcSlope(allHistoricalData.competition);
    const aztecaSlope = calcSlope(allHistoricalData.azteca);
    const compProjection = allHistoricalData.competition.at(-1) + compSlope * 3;
    const aztecaProjection = allHistoricalData.azteca.at(-1) + aztecaSlope * 3;
    const currentGap = allHistoricalData.azteca.at(-1) - allHistoricalData.competition.at(-1);

    const trend =
      aztecaGrowth > compGrowth
        ? "Gaining ground"
        : aztecaGrowth < compGrowth
        ? "Losing ground"
        : "Maintaining position";

    return {
      competition: {
        growth: compGrowth.toFixed(1),
        slope: compSlope.toFixed(2),
        projection: compProjection.toFixed(1),
      },
      azteca: {
        growth: aztecaGrowth.toFixed(1),
        slope: aztecaSlope.toFixed(2),
        projection: aztecaProjection.toFixed(1),
      },
      comparison: {
        current: currentGap.toFixed(1),
        trend,
      },
      allHistoricalData,
    };
  }, [
    data,
    selectedType,
    uniqueDates,
    selectedDate,
    compareStartDate,
    compareEndDate,
    timeRange,
    selectedDatesForSelect,
    weeklyGroups,
    monthlyGroups,
    yearlyGroups,
    getIndividualScore
  ]);

  // Effects
  useEffect(() => {
    const fetchData = async () => {
      try {
        const csvUrl =
          "https://docs.google.com/spreadsheets/d/e/2PACX-1vRzIonikYeUwzVTUUO7bDLQ1DDzqzKB-BFIJ4tzJMqMlNFnxPF0eVRypNmykYVP0Pn-w1tfnOCTaKaP/pub?output=csv";

        Papa.parse(csvUrl, {
          download: true,
          header: true,
          skipEmptyLines: true,
          complete: ({ data: parsed }) => {
            setData(parsed);
            setIsLoading(false);
          },
          error: (err) => {
            console.error("CSV Load Error", err);
            setIsLoading(false);
            toast({
              title: "Error loading data",
              description: "Failed to fetch performance data",
              status: "error",
              duration: 5000,
              isClosable: true,
            });
          },
        });
      } catch (error) {
        console.error("Fetch Error", error);
        setIsLoading(false);
      }
    };

    fetchData();
  }, [toast]);

  useEffect(() => {
    if (!isLoading && data.length) {
      const dateKey = Object.keys(data[0])[0];
      const dates = Array.from(new Set(data.map((row) => row[dateKey])))
        .map((d) => new Date(d))
        .sort((a, b) => a - b);
      setUniqueDates(dates);
      setSelectedDate(dates[dates.length - 1]);
    }
  }, [data, isLoading]);

  // Activate compare mode properly
  useEffect(() => {
    if (compareMode && !compareStartDate && !compareEndDate && uniqueDates.length > 0) {
      // Default to last week if available
      const lastWeekIndex = uniqueDates.length > 7 ? uniqueDates.length - 7 : 0;
      setCompareStartDate(uniqueDates[lastWeekIndex]);
      setCompareEndDate(uniqueDates[uniqueDates.length - 1]);
      setTimeRange("custom");
    }
  }, [compareMode, compareStartDate, compareEndDate, uniqueDates]);

  // Handlers
  const goToPreviousDate = () => {
    if (!selectedDate) return;
    const currentIndex = uniqueDates.findIndex((d) => d.getTime() === selectedDate.getTime());
    if (currentIndex > 0) {
      setSelectedDate(uniqueDates[currentIndex - 1]);
    }
  };

  const goToNextDate = () => {
    if (!selectedDate) return;
    const currentIndex = uniqueDates.findIndex((d) => d.getTime() === selectedDate.getTime());
    if (currentIndex < uniqueDates.length - 1) {
      setSelectedDate(uniqueDates[currentIndex + 1]);
    }
  };

  const formatDisplayDate = (date) => {
    if (!date) return "";
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const getCompanyScore = (company, date = selectedDate) => { // Added date parameter
    if (!data.length || !date)
      return { score: "N/A", status: "N/A", change: null };

    const score = getIndividualScore(company, selectedType, date);
    const num = parseFloat(score);

    const status = isNaN(num)
      ? "N/A"
      : num < 50
      ? "POOR"
      : num < 90
      ? "NEEDS IMPROVEMENT"
      : "GOOD";

    // Calculate previous period score for change
    let previousScore = null;
    let percentChange = null;

    if (date && uniqueDates.length > 1) {
      const currentIndex = uniqueDates.findIndex(d => d.getTime() === date.getTime());
      if (currentIndex > 0) {
        const prevDate = uniqueDates[currentIndex - 1];
        const prevScore = getIndividualScore(company, selectedType, prevDate);
        if (!isNaN(prevScore) && prevScore !== 0) {
          previousScore = prevScore;
          if (!isNaN(num)) {
            percentChange = (((num - prevScore) / prevScore) * 100).toFixed(1);
          }
        }
      }
    }

    return {
      score,
      status,
      change: percentChange,
    };
  };

  const toggleCompareMode = () => {
    if (compareMode) {
      setCompareStartDate(null);
      setCompareEndDate(null);
      setTimeRange("daily");
    } else {
      setTimeRange("custom");
    }
    setCompareMode(!compareMode);
  };

  const handleDateSelectChange = (dateStrings) => {
    const dates = dateStrings.map((d) => new Date(d));
    setSelectedDatesForSelect(dates);
    if (dates.length > 0) {
      setTimeRange("select");
    } else {
      setTimeRange("daily"); // Revert to daily if no dates are selected
    }
  };

  const generateInsights = (graphType) => {
    const isAzteca = graphType === "azteca";
    const isCompetition = graphType === "competition";
    const isTrend = graphType === "trend";

    const dataset = isAzteca
      ? generateChartData.azteca
      : isCompetition
      ? generateChartData.competition
      : {
          azteca: generateChartData.azteca,
          competition: generateChartData.competition,
        };

    const labels = generateChartData.labels;
    const lastDateObj = generateChartData.dateRange?.at(-1);
    const prevDateObj =
      generateChartData.dateRange?.length > 1 ? generateChartData.dateRange.at(-2) : null;

    const labelNow = lastDateObj
      ? lastDateObj.toLocaleDateString("en-US", {
          weekday: "long",
          month: "long",
          day: "numeric",
          year: "numeric",
        })
      : "latest date";

    const labelBefore = prevDateObj
      ? prevDateObj.toLocaleDateString("en-US", {
          weekday: "long",
          month: "long",
          day: "numeric",
          year: "numeric",
        })
      : null;

    // TREND COMPARISON GRAPH
    if (isTrend) {
      const valAz = dataset.azteca.at(-1);
      const valComp = dataset.competition.at(-1);
      const gap = (valAz - valComp).toFixed(1);
      const lead = gap > 0 ? "TV Azteca is ahead" : "the competition leads";

      const azSlope = parseFloat(calculateTrendAnalysis.azteca.slope);
      const compSlope = parseFloat(calculateTrendAnalysis.competition.slope);
      const slopeGap = (azSlope - compSlope).toFixed(2);
      const azProj = parseFloat(calculateTrendAnalysis.azteca.projection);
      const compProj = parseFloat(calculateTrendAnalysis.competition.projection);
      const projGap = (azProj - compProj).toFixed(1);

      const trendInsight =
        azSlope > compSlope
          ? `TV Azteca is catching up with a stronger upward trend (+${slopeGap}/period).`
          : azSlope < compSlope
          ? `Competition is pulling ahead with stronger momentum (-${slopeGap}/period).`
          : `Both maintain equal momentum over time.`;

      const forecastInsight =
        azProj > compProj
          ? `Forecast shows Azteca may overtake competition (${azProj} vs ${compProj}).`
          : azProj < compProj
          ? `Forecast suggests competition will maintain lead (${compProj} vs ${azProj}).`
          : `Forecasted performances are tied (${azProj}).`;

      return {
        title: "Trend Comparison",
        overview: `${lead} by ${Math.abs(gap)} points as of ${labelNow}.`,
        growth: `TV Azteca is at ${valAz}, Competition at ${valComp}.`,
        patterns: `You're viewing the "${timeRange}" trend line across all selected dates.`,
        projections: `${trendInsight} ${forecastInsight}`,
        rawData: {
          competitionVsAzteca: gap,
          aztecaGrowth: calculateTrendAnalysis.azteca.growth,
          competitionGrowth: calculateTrendAnalysis.competition.growth,
          aztecaSlope: calculateTrendAnalysis.azteca.slope,
          competitionSlope: calculateTrendAnalysis.competition.slope,
          aztecaProjection: calculateTrendAnalysis.azteca.projection,
          competitionProjection: calculateTrendAnalysis.competition.projection,
        },
      };
    }

    // BAR CHART (TV AZTECA or COMPETITION)
    const visibleData = dataset;
    const latestValue = visibleData.at(-1);
    const prevValue = visibleData.length > 1 ? visibleData.at(-2) : null;
    const diff = prevValue !== null ? (latestValue - prevValue).toFixed(1) : null;
    const companyLabel = isAzteca ? "TV Azteca" : "The competition";

    // Insights
    let overview = `${companyLabel} scored ${latestValue} in ${labelNow}.`;
    let growth = "";
    let patterns = `You're currently viewing the "${timeRange}" time range.`;
    let projections = "";

    if (diff !== null) {
      if (diff > 0) {
        growth = `This represents an increase of ${diff} points since ${labelBefore}.`;
      } else if (diff < 0) {
        growth = `This reflects a decline of ${Math.abs(diff)} points compared to ${labelBefore}.`;
      } else {
        growth = `There was no change from ${labelBefore} to ${labelNow}.`;
      }
    } else {
      growth = "No prior data is available for comparison.";
    }

    // Optional simple forecast logic
    if (visibleData.length >= 3) {
      const last3 = visibleData.slice(-3);
      const slope = ((last3[2] - last3[0]) / 2).toFixed(2);
      const change1 = last3[1] - last3[0];
      const change2 = last3[2] - last3[1];
      const trend =
        slope > 1
          ? "strong upward trend"
          : slope > 0.2
          ? "moderate improvement"
          : slope < -1
          ? "sharp decline"
          : slope < -0.2
          ? "moderate decline"
          : "stable performance";

      const momentum =
        Math.abs(change2) > Math.abs(change1)
          ? change2 > 0
            ? "gaining momentum"
            : "losing momentum"
          : "momentum is leveling";

      const historicalAvg = (visibleData.reduce((a, b) => a + b, 0) / visibleData.length).toFixed(1);
      const aboveOrBelow = latestValue > historicalAvg ? "above" : "below";
      const diffFromAvg = Math.abs(latestValue - historicalAvg).toFixed(1);

      projections = `
          This shows a ${trend}, currently ${momentum}.
          The latest score of ${latestValue} is ${diffFromAvg} points ${aboveOrBelow} the ${timeRange} average of ${historicalAvg}.
          If the trend persists, the next expected value could be ${(
            latestValue + parseFloat(slope)
          ).toFixed(1)}.
        `.trim();
    }

    return {
      title: `${companyLabel} Insight`,
      overview,
      growth,
      patterns,
      projections,
      rawData: {
        lastValue: latestValue,
        prevValue,
        diff,
        aztecaGrowth: calculateTrendAnalysis.azteca.growth,
        competitionGrowth: calculateTrendAnalysis.competition.growth,
        competitionVsAzteca: calculateTrendAnalysis.comparison.current,
      },
    };
  };

  // Helper function for time series analysis
  const analyzeTimeSeries = (aztecaData, competitionData, dates) => {
    if (aztecaData.length < 5 || competitionData.length < 5) return "";

    // Look for trends over time
    const recentAzteca = aztecaData.slice(-5);
    const recentComp = competitionData.slice(-5);

    // Calculate recent trend
    let aztecaTrend = 0;
    let compTrend = 0;

    for (let i = 1; i < recentAzteca.length; i++) {
      aztecaTrend += recentAzteca[i] - recentAzteca[i - 1];
      compTrend += recentComp[i] - recentComp[i - 1];
    }

    aztecaTrend /= recentAzteca.length - 1;
    compTrend /= recentComp.length - 1;

    // Format dates for display
    const startDate = dates[0].toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });

    const endDate = dates[dates.length - 1].toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });

    // Analyze recent momentum
    const momentum =
      aztecaTrend > 0.5 && compTrend < 0.2
        ? "TV Azteca has strong positive momentum compared to competition"
        : aztecaTrend > 0.2 && aztecaTrend > compTrend
        ? "TV Azteca has moderate positive momentum"
        : aztecaTrend < -0.5 && compTrend > 0
        ? "TV Azteca shows concerning negative momentum"
        : compTrend > aztecaTrend
        ? "Competition currently has stronger momentum"
        : "Both TV Azteca and competition show similar momentum patterns";

    return `Analysis based on data from ${startDate} to ${endDate}: ${momentum}.`;
  };

  const openInsightsModal = (graphType) => {
    setCurrentInsights(generateInsights(graphType));
    setInsightsModalOpen(true);
  };

  const renderComparisonBadge = (currentValue, previousValue) => {
    if (!previousValue || isNaN(currentValue) || isNaN(previousValue)) return null;

    const difference = currentValue - previousValue;
    const percentageChange = ((difference / previousValue) * 100).toFixed(1);
    const isPositive = difference >= 0;

    return (
      <Badge ml={2} colorScheme={isPositive ? "green" : "red"} fontSize="0.8em">
        {isPositive ? "+" : ""}
        {percentageChange}% vs previous
      </Badge>
    );
  };

  // Components
  const renderGauge = (label, value) => {
    const num = parseFloat(value);
    const pct = isNaN(num) ? 0 : Math.min(num / 100, 1);
    const status = num < 50 ? "POOR" : num < 90 ? "NEEDS IMPROVEMENT" : "GOOD";
    const color = num < 50 ? COLORS.poor : num < 90 ? COLORS.medium : COLORS.good;
    const companies = label === "Competition" ? COMPETITION_COMPANIES : AZTECA_COMPANIES;
    const previousValue =
      label === "Competition"
        ? getComparisonData.previousCompetitionScore
        : getComparisonData.previousAztecaScore;

    return (
      <Box className="anb-chart-container" p={6} borderRadius="12px">
        <VStack spacing={4} align="center">
          <Box position="relative" width="160px" height="160px">
            <Box
              position="relative"
              width="160px"
              height="160px"
              borderRadius="50%"
              border="12px solid"
              borderColor="rgba(255, 255, 255, 0.1)"
              mb={2}
            >
              <Box
                position="absolute"
                top="-12px"
                left="-12px"
                width="160px"
                height="160px"
                borderRadius="50%"
                border="12px solid transparent"
                borderTop={`12px solid ${color}`}
                borderRight={`12px solid ${color}`}
                transform={`rotate(${45 + pct * 270}deg)`}
                transition="transform 0.5s ease"
              />
              <Box
                position="absolute"
                top="50%"
                left="50%"
                transform="translate(-50%, -50%)"
                textAlign="center"
              >
                <Text fontSize="32px" fontWeight="bold" color="white" lineHeight="1" mb="4px">
                  {isNaN(num) ? (
                    "N/A"
                  ) : (
                    <CountUp end={num} duration={1.5} decimals={1} />
                  )}
                </Text>

                <Text fontSize="12px" color="rgba(255, 255, 255, 0.7)" textTransform="uppercase">
                  {label}
                </Text>
                {previousValue && !isNaN(num) && (
                  <Text fontSize="10px" color={num >= previousValue ? COLORS.good : COLORS.poor}>
                    {num >= previousValue ? "↑" : "↓"}{" "}
                    {Math.abs(num - previousValue).toFixed(1)}%
                  </Text>
                )}
              </Box>
            </Box>
          </Box>

          <Text
            fontSize="12px"
            color={color}
            fontWeight="bold"
            textTransform="uppercase"
            textAlign="center"
            width="100%"
          >
            {status}
            {timeRange !== "custom" && renderComparisonBadge(num, previousValue)}
          </Text>

          <VStack spacing={2} align="flex-start" width="100%" maxH="200px" overflowY="auto">
            {companies.map((company) => {
              const { score, status, change } = getCompanyScore(company);
              const statusColor =
                status === "POOR"
                  ? COLORS.poor
                  : status === "NEEDS IMPROVEMENT"
                  ? COLORS.medium
                  : COLORS.good;

              return (
                <HStack key={company} spacing={2} width="100%">
                  <Box width="8px" height="8px" borderRadius="50%" bg={statusColor} />
                  <Text fontSize="12px" color="white" fontWeight="bold">
                    {company}
                  </Text>
                  <Text fontSize="12px" color="rgba(255,255,255,0.7)" ml="auto" fontWeight="bold">
                    {score}
                  </Text>
                  {change && (
                    <Badge
                      size="xs"
                      colorScheme={parseFloat(change) >= 0 ? "green" : "red"}
                      ml={1}
                    >
                      {parseFloat(change) >= 0 ? "+" : ""}
                      {change}%
                    </Badge>
                  )}
                </HStack>
              );
            })}
          </VStack>
        </VStack>
      </Box>
    );
  };

  const renderPerformanceChart = (title, isCompetition = true) => {
    // Get dates corresponding to the labels for tooltip display
    const dateObjects = generateChartData.dateRange;

    const dataPoints = isCompetition ? generateChartData.competition : generateChartData.azteca;

    // Calculate Average Score
    const averageScore =
      dataPoints.length > 0 ? dataPoints.reduce((sum, val) => sum + val, 0) / dataPoints.length : 0;

    // Calculate Trend Line Data (Simple Linear Regression)
    let slope = 0; // 👈 make it accessible later
    const trendData = (() => {
      const n = dataPoints.length;
      if (n < 2) return dataPoints.map(() => averageScore);

      const sumX = dataPoints.reduce((acc, _, index) => acc + index, 0);
      const sumY = dataPoints.reduce((acc, val) => acc + val, 0);
      const sumXY = dataPoints.reduce((acc, val, index) => acc + index * val, 0);
      const sumX2 = dataPoints.reduce((acc, _, index) => acc + index * index, 0);

      const denominator = n * sumX2 - sumX * sumX;
      slope = denominator !== 0 ? (n * sumXY - sumX * sumY) / denominator : 0;
      const intercept = (sumY - slope * sumX) / n;

      return dataPoints.map((_, i) => intercept + slope * i);
    })();

    const chartData = {
      labels: generateChartData.labels,
      datasets: [
        {
          type: "bar", // Explicitly define as bar chart
          label: isCompetition ? "Competition Score" : "TV Azteca Score",
          data: dataPoints,
          backgroundColor: isCompetition ? COLORS.competition : COLORS.azteca[0],
          borderColor: "rgba(255,255,255,0.2)",
          borderWidth: 1,
          order: 2, // Render bars first
        },
        {
          type: "line",
          label: "Trend Line",
          data: trendData,
          borderColor:
            slope > 0
              ? "green"
              : slope < 0
              ? "red"
              : "yellow", // Color based on slope
          borderWidth: 4,
          pointRadius: 0,
          fill: false,
          tension: 0.1,
          order: 1,
        },

        {
          type: "line",
          label: "Average Score",
          data: Array(dataPoints.length).fill(averageScore),
          borderColor: "yellow",
          borderDash: [5, 5],
          borderWidth: 4, // ⬅️ increased thickness
          pointRadius: 0,
          fill: false,
          order: 0,
        },
        
      ],
    };

    const chartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          grid: { display: false },
          ticks: {
            color: "white",
            font: { weight: "bold" },
          },
        },
        y: {
          grid: { color: "rgba(255,255,255,0.1)" },
          ticks: {
            color: "white",
            font: { weight: "bold" },
          },
          // REMOVE min and max here
          // min: 0,
          // max: 100,
        },
      },
      plugins: {
        legend: {
          display: true, // Display legend for trend and average lines
          labels: {
            color: "white",
            font: {
              weight: "bold",
            },
            filter: (legendItem, chartData) => {
              // Only show legend for 'Trend Line' and 'Average Score'
              return legendItem.text === "Trend Line" || legendItem.text === "Average Score";
            },
          },
        },
        tooltip: {
          mode: "index", // Show all datasets at the hovered index
          intersect: false, // Show tooltip even if not directly over a point/bar
          callbacks: {
            label: function (context) {
              const label = context.dataset.label;
              const value = context.raw?.toFixed(1) ?? "-";

              // If it's the trend line, append slope
              if (label === "Trend Line") {
                return `${label}: ${value} (slope: ${slope >= 0 ? "+" : ""}${slope.toFixed(2)})`;
              }

              return `${label}: ${value}`;
            },

            title: function (context) {
              // Custom title to show the exact date
              const index = context[0].dataIndex;
              return dateObjects[index]
                ? dateObjects[index].toLocaleDateString("en-US", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })
                : context[0].label;
            },
          },
        },
        datalabels: {
          display: (context) => labelMode !== "none" && context.dataset.type === "bar", // Only display for bar elements
          color: "white",
          font: (context) => {
            const chart = context.chart;
            const meta = context.chart.getDatasetMeta(context.datasetIndex);
            const bar = meta.data[context.dataIndex];

            // width of the bar (bar chart) or spacing between points (line chart)
            let width = 0;
            if (bar && bar.width) {
              width = bar.width; // for bar charts
            } else if (bar && bar.x !== undefined && bar.base !== undefined) {
              width = Math.abs(bar.x - bar.base); // fallback
            } else {
              width = chart.width / context.chart.data.labels.length;
            }

            const size = Math.max(8, Math.min(0.5 * width, 16)); // Scale between 8 and 16
            return {
              weight: "bold",
              size,
            };
          },
          anchor: "end",
          align: "top",
          formatter: (value, context) => {
            if (labelMode === "none") return "";
            if (labelMode === "percent") {
              const index = context.dataIndex;
              const dataset = context.dataset.data;
              if (index === 0 || !dataset[index - 1]) return "-";
              const prev = dataset[index - 1];
              if (prev === 0) return "-";
              const change = ((value - prev) / prev) * 100;
              return `${change > 0 ? "+" : ""}${change.toFixed(1)}%`;
            }
            return value; // raw value
          },
        },
      },
    };

    return (
      <Box className="anb-chart-container" flex={1}>
        <Flex justify="space-between" align="center">
          <Text className="anb-chart-title">{title}</Text>
          <HStack spacing={3}>
            <HStack spacing={1}>
              <Text fontSize="xs" color="white"></Text>
              <ButtonGroup isAttached size="sm" variant="outline">
                <Button colorScheme={labelMode === "raw" ? "blue" : "gray"} onClick={() => setLabelMode("raw")}>
                  Raw
                </Button>
                <Button
                  colorScheme={labelMode === "percent" ? "green" : "gray"}
                  onClick={() => setLabelMode("percent")}
                >
                  %
                </Button>
                <Button onClick={() => setLabelMode("none")} colorScheme={labelMode === "none" ? "purple" : "gray"}>
                  ↔
                </Button>
              </ButtonGroup>
            </HStack>
            <ChakraTooltip label="Show Insights">
              <IconButton
                icon={<FaInfoCircle />}
                aria-label="Show Insights"
                size="sm"
                variant="ghost"
                color="white"
                onClick={() => openInsightsModal(isCompetition ? "competition" : "azteca")}
              />
            </ChakraTooltip>
          </HStack>
        </Flex>

        <Flex mb={4} justify="center">
        <HStack spacing={2} wrap="wrap" justify="center">
  {TIME_RANGES.map((range) => (
    <Button
      key={range}
      size="sm"
      variant={timeRange === range ? "solid" : "outline"}
      colorScheme={timeRange === range ? "blue" : "whiteAlpha"}
      onClick={() => setTimeRange(range)}
      textTransform="capitalize"
    >
      {range}
    </Button>
  ))}

  {/* GROUP BUTTON - RIGHT AFTER SELECT */}
  <Menu closeOnSelect={false}>
  <MenuButton
    as={Button}
    leftIcon={<FaChevronDown />}
    size="sm"
    colorScheme="purple"
    variant="solid"
  >
    Group By
  </MenuButton>
  <MenuList bg="#1A202C" borderColor="rgba(255,255,255,0.2)" color="white" minW="250px">
    <Box px={3} py={2}>
      <Text fontWeight="bold" mb={2}>Weekly</Text>
      <CheckboxGroup
        value={selectedWeeklyGroups}
        onChange={(values) => {
          setSelectedWeeklyGroups(values);
          setTimeRange("weeklyGroup");
        }}
      >
        <VStack align="start" maxHeight="150px" overflowY="auto">
          {weeklyGroups.map(({ key, label }) => (
            <Checkbox key={key} value={key}>
              {label}
            </Checkbox>
          ))}
        </VStack>
      </CheckboxGroup>
    </Box>

    <Divider my={2} />

    <Box px={3} py={2}>
      <Text fontWeight="bold" mb={2}>Monthly</Text>
      <CheckboxGroup
        value={selectedMonthlyGroups}
        onChange={(values) => {
          setSelectedMonthlyGroups(values);
          setTimeRange("monthlyGroup");
        }}
      >
        <VStack align="start" maxHeight="150px" overflowY="auto">
          {monthlyGroups.map(({ key, label }) => (
            <Checkbox key={key} value={key}>
              {label}
            </Checkbox>
          ))}
        </VStack>
      </CheckboxGroup>
    </Box>

    <Divider my={2} />

    <Box px={3} py={2}>
      <Text fontWeight="bold" mb={2}>Yearly</Text>
      <CheckboxGroup
        value={selectedYearlyGroups}
        onChange={(values) => {
          setSelectedYearlyGroups(values);
          setTimeRange("yearlyGroup");
        }}
      >
        <VStack align="start" maxHeight="150px" overflowY="auto">
          {yearlyGroups.map(({ key, label }) => (
            <Checkbox key={key} value={key}>
              {label}
            </Checkbox>
          ))}
        </VStack>
      </CheckboxGroup>
    </Box>
  </MenuList>
</Menu>


</HStack>

        </Flex>

        {timeRange === "custom" && (
          <Flex mb={4} justify="center" gap={4}>
            <Box>
              <Text fontSize="sm" color="white" mb={1}>
                Start Date
              </Text>
              <Input
                type="date"
                value={compareStartDate ? compareStartDate.toISOString().split("T")[0] : ""}
                onChange={(e) => {
                  setCompareStartDate(new Date(e.target.value));
                  setTimeRange("custom"); // Force update on start date change
                }}
                max={compareEndDate ? compareEndDate.toISOString().split("T")[0] : selectedDate.toISOString().split("T")[0]}
              />
            </Box>
            <Box>
              <Text fontSize="sm" color="white" mb={1}>
                End Date
              </Text>
              <Input
                type="date"
                value={compareEndDate ? compareEndDate.toISOString().split("T")[0] : ""}
                onChange={(e) => {
                  setCompareEndDate(new Date(e.target.value));
                  setTimeRange("custom"); // Force update on end date change
                }}
                min={compareStartDate ? compareStartDate.toISOString().split("T")[0] : ""}
                max={selectedDate.toISOString().split("T")[0]}
              />
            </Box>
          </Flex>
        )}

        {timeRange === "select" && (
          <Flex mb={4} justify="center" gap={4}>
            <Popover>
              <PopoverTrigger>
                <Button
                  leftIcon={<FaChevronDown />}
                  size="md"
                  colorScheme="purple"
                  variant="outline"
                  color="white"
                >
                  Select Dates ({selectedDatesForSelect.length})
                </Button>
              </PopoverTrigger>
              <PopoverContent bg="#1A202C" borderColor="rgba(255,255,255,0.2)" color="white">
                <PopoverArrow bg="#1A202C" />
                <PopoverCloseButton />
                <PopoverHeader borderColor="rgba(255,255,255,0.2)">Available Dates</PopoverHeader>
                <PopoverBody>
                  <CheckboxGroup
                    onChange={handleDateSelectChange}
                    value={selectedDatesForSelect.map((d) => d.toISOString().split("T")[0])}
                  >
                    <Stack maxHeight="200px" overflowY="auto">
                      {uniqueDates.map((date) => (
                        <Checkbox key={date.toISOString()} value={date.toISOString().split("T")[0]}>
                          {date.toLocaleDateString("en-US", {
                            month: "long",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </Checkbox>
                      ))}
                    </Stack>
                  </CheckboxGroup>
                </PopoverBody>
              </PopoverContent>
            </Popover>
          </Flex>
        )}

        <Box height="300px">
          <Bar data={chartData} options={chartOptions} />
        </Box>
      </Box>
    );
  };

  // Removed renderCorrelationScatter function entirely
  // const renderCorrelationScatter = () => { ... };

  const renderTrendChart = () => {
    // Get dates corresponding to the labels for tooltip display
    const dateObjects =
      timeRange === "daily"
        ? [selectedDate]
        : timeRange === "monthly"
        ? uniqueDates.filter(
            (d) => d >= new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1) && d <= selectedDate
          )
        : timeRange === "yearly"
        ? uniqueDates.filter((d) => d >= new Date(selectedDate.getFullYear(), 0, 1) && d <= selectedDate)
        : timeRange === "all"
        ? uniqueDates.filter((d) => d <= selectedDate)
        : timeRange === "custom" && compareStartDate && compareEndDate
        ? uniqueDates.filter((d) => d >= compareStartDate && d <= compareEndDate)
        : timeRange === "select" && selectedDatesForSelect.length > 0
        ? selectedDatesForSelect.sort((a, b) => a - b)
        : [];

    const chartData = {
      labels: generateChartData.labels,
      datasets: [
        {
          label: "Competition",
          data: generateChartData.competition,
          borderColor: COLORS.competition,
          backgroundColor: "rgba(255, 95, 109, 0.1)",
          tension: 0.3,
          borderWidth: 2,
          fill: true,
        },
        {
          label: "TV Azteca",
          data: generateChartData.azteca,
          borderColor: COLORS.azteca[0],
          backgroundColor: "rgba(74, 108, 247, 0.1)",
          tension: 0.3,
          borderWidth: 2,
          fill: true,
        },
      ],
    };

    const chartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: {
            color: "white",
            font: {
              family: "'Livvic', sans-serif",
              weight: "bold",
            },
          },
        },
        tooltip: {
          mode: "index",
          intersect: false,
          callbacks: {
            title: function (context) {
              const index = context[0].dataIndex;
              // Format the date to show exact date when available
              return dateObjects[index]
                ? dateObjects[index].toLocaleDateString("en-US", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })
                : context[0].label;
            },
          },
        },
        datalabels: {
          display: (context) => labelMode !== "none",
          color: "white",
          font: (context) => {
            const chart = context.chart;
            const meta = context.chart.getDatasetMeta(context.datasetIndex);
            const bar = meta.data[context.dataIndex];

            // width of the bar (bar chart) or spacing between points (line chart)
            let width = 0;
            if (bar && bar.width) {
              width = bar.width; // for bar charts
            } else if (bar && bar.x !== undefined && bar.base !== undefined) {
              width = Math.abs(bar.x - bar.base); // fallback
            } else {
              width = chart.width / context.chart.data.labels.length;
            }

            const size = Math.max(8, Math.min(0.5 * width, 16)); // Scale between 8 and 16
            return {
              weight: "bold",
              size,
            };
          },
          anchor: "end",
          align: "top",
          formatter: (value, context) => {
            if (labelMode === "none") return "";
            if (labelMode === "percent") {
              const index = context.dataIndex;
              const dataset = context.dataset.data;
              if (index === 0 || !dataset[index - 1]) return "-";
              const prev = dataset[index - 1];
              if (prev === 0) return "-";
              const change = ((value - prev) / prev) * 100;
              return `${change > 0 ? "+" : ""}${change.toFixed(1)}%`;
            }
            return value; // raw value
          },
        },
      },
      scales: {
        x: {
          grid: { color: "rgba(255,255,255,0.1)" },
          ticks: {
            color: "white",
            font: { weight: "bold" },
          },
        },
        y: {
          grid: { color: "rgba(255,255,255,0.1)" },
          ticks: {
            color: "white",
            font: { weight: "bold" },
          },
          // REMOVE min and max here
          // min: 0,
          // max: 100,
        },
      },
      interaction: {
        mode: "nearest",
        axis: "x",
        intersect: false,
      },
    };

    return (
      <Box className="anb-chart-container" mt={8} mb={8} maxW="1200px" mx="auto">
        <Flex justify="space-between" align="center">
          <Text className="anb-chart-title">Performance Trend</Text>
          <HStack spacing={3}>
            <HStack spacing={1}>
              <Text fontSize="xs" color="white"></Text>
              <ButtonGroup isAttached size="sm" variant="outline">
                <Button colorScheme={labelMode === "raw" ? "blue" : "gray"} onClick={() => setLabelMode("raw")}>
                  Raw
                </Button>
                <Button
                  colorScheme={labelMode === "percent" ? "green" : "gray"}
                  onClick={() => setLabelMode("percent")}
                >
                  %
                </Button>
                <Button onClick={() => setLabelMode("none")} colorScheme={labelMode === "none" ? "purple" : "gray"}>
                  ↔
                </Button>
              </ButtonGroup>
            </HStack>
            <ChakraTooltip label="Show Insights">
              <IconButton
                icon={<FaInfoCircle />}
                aria-label="Show Insights"
                size="sm"
                variant="ghost"
                color="white"
                onClick={() => openInsightsModal("trend")}
              />
            </ChakraTooltip>
          </HStack>
        </Flex>

        <Box height="300px">
          <Line data={chartData} options={chartOptions} />
        </Box>
      </Box>
    );
  };

  const renderAnalyticsPanel = () => {
    const insights = calculateTrendAnalysis;

    return (
      <Box className="anb-chart-container" mt={8} mb={8} maxW="1200px" mx="auto">
        <Text className="anb-chart-title" mb={4}>
          Advanced Analytics
        </Text>
        <Flex align="center" gap={2} mb={4} wrap="wrap">
          <Text fontSize="sm" color="rgba(255,255,255,0.6)">
            Based on all historical data from
          </Text>
          <Input
            type="date"
            value={compareStartDate ? compareStartDate.toISOString().split("T")[0] : ""}
            onChange={(e) => {
              setCompareStartDate(new Date(e.target.value));
              setTimeRange("custom"); // force update on start date change
            }}
            max={compareEndDate ? compareEndDate.toISOString().split("T")[0] : selectedDate?.toISOString().split("T")[0]}
            bg="rgba(255,255,255,0.1)"
            borderColor="rgba(255,255,255,0.2)"
            color="white"
            size="sm"
            width="auto"
            _hover={{ bg: "rgba(255,255,255,0.15)" }}
            _focus={{ bg: "rgba(255,255,255,0.15)" }}
          />
          <Text fontSize="sm" color="rgba(255,255,255,0.6)">
            to
          </Text>
          <Input
            type="date"
            value={compareEndDate ? compareEndDate.toISOString().split("T")[0] : ""}
            onChange={(e) => {
              setCompareEndDate(new Date(e.target.value));
              setTimeRange("custom"); // force update on end date change
            }}
            min={compareStartDate ? compareStartDate.toISOString().split("T")[0] : ""}
            max={selectedDate?.toISOString().split("T")[0]}
            bg="rgba(255,255,255,0.1)"
            borderColor="rgba(255,255,255,0.2)"
            color="white"
            size="sm"
            width="auto"
            _hover={{ bg: "rgba(255,255,255,0.15)" }}
            _focus={{ bg: "rgba(255,255,255,0.15)" }}
          />
        </Flex>

        <Grid templateColumns={{ base: "1fr", md: "repeat(2, 1fr)", lg: "repeat(4, 1fr)" }} gap={6}>
          {/* Growth Rates */}
          <GridItem>
            <Box p={4} bg="rgba(255,255,255,0.05)" borderRadius="md">
              <Text fontWeight="bold" color="white" mb={2}>
                Growth Rates
              </Text>
              <Flex justify="space-between" align="center">
                <VStack align="flex-start" spacing={1}>
                  <Stat>
                    <StatLabel color="rgba(255,255,255,0.7)">Competition</StatLabel>
                    <StatNumber fontSize="20px" color={COLORS.competition}>
                      {calculateTrendAnalysis.competition.growth}%
                    </StatNumber>
                  </Stat>
                </VStack>
                <VStack align="flex-start" spacing={1}>
                  <Stat>
                    <StatLabel color="rgba(255,255,255,0.7)">TV Azteca</StatLabel>
                    <StatNumber fontSize="20px" color={COLORS.azteca[0]}>
                      {calculateTrendAnalysis.azteca.growth}%
                    </StatNumber>
                    <StatHelpText>
                      <StatArrow
                        type={
                          parseFloat(calculateTrendAnalysis.azteca.growth) >
                          parseFloat(calculateTrendAnalysis.competition.growth)
                            ? "increase"
                            : "decrease"
                        }
                      />
                      {Math.abs(
                        parseFloat(calculateTrendAnalysis.azteca.growth) -
                          parseFloat(calculateTrendAnalysis.competition.growth)
                      ).toFixed(1)}
                      % vs Comp
                    </StatHelpText>
                  </Stat>
                </VStack>
              </Flex>
            </Box>
          </GridItem>

          {/* Rate of Change */}
          <GridItem>
            <Box p={4} bg="rgba(255,255,255,0.05)" borderRadius="md">
              <Text fontWeight="bold" color="white" mb={2}>
                Rate of Change (per day)
              </Text>
              <Flex justify="space-between" align="center">
                <VStack align="flex-start" spacing={1}>
                  <Stat>
                    <StatLabel color="rgba(255,255,255,0.7)">Competition</StatLabel>
                    <StatNumber fontSize="20px" color={COLORS.competition}>
                      {calculateTrendAnalysis.competition.slope}
                    </StatNumber>
                  </Stat>
                </VStack>
                <VStack align="flex-start" spacing={1}>
                  <Stat>
                    <StatLabel color="rgba(255,255,255,0.7)">TV Azteca</StatLabel>
                    <StatNumber fontSize="20px" color={COLORS.azteca[0]}>
                      {calculateTrendAnalysis.azteca.slope}
                    </StatNumber>
                    <StatHelpText>
                      <StatArrow
                        type={
                          parseFloat(calculateTrendAnalysis.azteca.slope) >
                          parseFloat(calculateTrendAnalysis.competition.slope)
                            ? "increase"
                            : "decrease"
                        }
                      />
                      {Math.abs(
                        parseFloat(calculateTrendAnalysis.azteca.slope) -
                          parseFloat(calculateTrendAnalysis.competition.slope)
                      ).toFixed(2)}{" "}
                      difference
                    </StatHelpText>
                  </Stat>
                </VStack>
              </Flex>
            </Box>
          </GridItem>

          {/* Projections */}
          <GridItem>
            <Box p={4} bg="rgba(255,255,255,0.05)" borderRadius="md">
              <Text fontWeight="bold" color="white" mb={2}>
                3-Day Projection
              </Text>
              <Flex justify="space-between" align="center">
                <VStack align="flex-start" spacing={1}>
                  <Stat>
                    <StatLabel color="rgba(255,255,255,0.7)">Competition</StatLabel>
                    <StatNumber fontSize="20px" color={COLORS.competition}>
                      {calculateTrendAnalysis.competition.projection}
                    </StatNumber>
                  </Stat>
                </VStack>
                <VStack align="flex-start" spacing={1}>
                  <Stat>
                    <StatLabel color="rgba(255,255,255,0.7)">TV Azteca</StatLabel>
                    <StatNumber fontSize="20px" color={COLORS.azteca[0]}>
                      {calculateTrendAnalysis.azteca.projection}
                    </StatNumber>
                    <StatHelpText>
                      <StatArrow
                        type={
                          parseFloat(calculateTrendAnalysis.azteca.projection) >
                          parseFloat(calculateTrendAnalysis.competition.projection)
                            ? "increase"
                            : "decrease"
                        }
                      />
                      {Math.abs(
                        parseFloat(calculateTrendAnalysis.azteca.projection) -
                          parseFloat(calculateTrendAnalysis.competition.projection)
                      ).toFixed(1)}{" "}
                      point gap
                    </StatHelpText>
                  </Stat>
                </VStack>
              </Flex>
            </Box>
          </GridItem>

          {/* Comparison */}
          <GridItem>
            <Box p={4} bg="rgba(255,255,255,0.05)" borderRadius="md">
              <Text fontWeight="bold" color="white" mb={2}>
                Current Daily Comparison
              </Text>
              <Stat>
                <StatLabel color="rgba(255,255,255,0.7)">Gap vs Competition</StatLabel>
                <StatNumber
                  fontSize="20px"
                  color={parseFloat(calculateTrendAnalysis.comparison.current) >= 0 ? COLORS.good : COLORS.poor}
                >
                  {calculateTrendAnalysis.comparison.current > 0 ? "+" : ""}
                  {calculateTrendAnalysis.comparison.current}
                </StatNumber>
                <StatHelpText>{calculateTrendAnalysis.comparison.trend}</StatHelpText>
              </Stat>
              <Text fontSize="xs" color="white" mt={2}>
                {calculateTrendAnalysis.allHistoricalData?.azteca.length > 0 &&
                calculateTrendAnalysis.allHistoricalData?.competition.length > 0
                  ? `At current rate, ${
                      parseFloat(calculateTrendAnalysis.azteca.slope) >
                      parseFloat(calculateTrendAnalysis.competition.slope)
                        ? "will increase lead by"
                        : "gap will widen by"
                    }
                    ${Math.abs(
                      parseFloat(calculateTrendAnalysis.azteca.slope) -
                        parseFloat(calculateTrendAnalysis.competition.slope)
                    ).toFixed(1)}
                    per period`
                  : ""}
              </Text>
            </Box>
          </GridItem>
        </Grid>
      </Box>
    );
  };

  return (
    <Box pt="50px" px={6} className="glass-bg" position="relative">
      <MatrixRain /> {/* 👈 This line adds the Matrix background */}
      <Text className="title" mb={4}>
        General Overview
      </Text>
      {/* Date Navigation */}
      <Flex justify="center" align="center" mt={6} mb={4}>
        <IconButton
          icon={<FaChevronLeft />}
          onClick={goToPreviousDate}
          aria-label="Previous date"
          variant="ghost"
          color="white"
          isDisabled={
            !selectedDate || uniqueDates.findIndex((d) => d.getTime() === selectedDate.getTime()) === 0
          }
        />

<Box textAlign="center" mx={4}>
  <Text fontSize="sm" color="rgba(255,255,255,0.7)" mb={1}>
    Viewing data for
  </Text>
  <Input
    type="date"
    value={selectedDate ? selectedDate.toISOString().split("T")[0] : ""}
    onChange={(e) => {
      const newDate = new Date(e.target.value);
      const matchedDate = uniqueDates.find(
        (d) => d.toISOString().split("T")[0] === newDate.toISOString().split("T")[0]
      );
      if (matchedDate) setSelectedDate(matchedDate);
    }}
    list="available-dates"
    max={uniqueDates.length ? uniqueDates[uniqueDates.length - 1].toISOString().split("T")[0] : ""}
    min={uniqueDates.length ? uniqueDates[0].toISOString().split("T")[0] : ""}
    bg="rgba(255,255,255,0.1)"
    color="white"
    borderColor="rgba(255,255,255,0.2)"
    _hover={{ bg: "rgba(255,255,255,0.15)" }}
    _focus={{ bg: "rgba(255,255,255,0.15)" }}
    sx={{
      "::-webkit-calendar-picker-indicator": {
        filter: "invert(1)",
      },
    }}
  />
  <datalist id="available-dates">
    {uniqueDates.map((date) => (
      <option key={date.toISOString()} value={date.toISOString().split("T")[0]} />
    ))}
  </datalist>
</Box>


        

        <IconButton
          icon={<FaChevronRight />}
          onClick={goToNextDate}
          aria-label="Next date"
          variant="ghost"
          color="white"
          isDisabled={
            !selectedDate ||
            uniqueDates.findIndex((d) => d.getTime() === selectedDate.getTime()) === uniqueDates.length - 1
          }
        />

        <Button
          ml={4}
          leftIcon={<FaExchangeAlt />}
          onClick={toggleCompareMode}
          colorScheme={compareMode ? "blue" : "gray"}
          size="sm"
          color="white"
        >
          Compare Mode
          

        </Button>
      </Flex>

      {groupMode && (
  <Flex justify="center" gap={8} wrap="wrap" mt={4}>
    {/* Weekly Dropdown */}
    <Box>
      <Text color="white" fontSize="sm" mb={1}>Weekly</Text>
      <Select
        multiple
        placeholder="Select Weeks"
        value={selectedWeeklyGroups}
        onChange={(e) =>
          setSelectedWeeklyGroups(
            Array.from(e.target.selectedOptions).map((opt) => opt.value)
          )
        }
        color="white"
        bg="rgba(255,255,255,0.1)"
        borderColor="rgba(255,255,255,0.2)"
      >
        {weeklyGroups.map(({ key, label }) => (
          <option key={key} value={key}>{label}</option>
        ))}
      </Select>
    </Box>

    {/* Monthly Dropdown */}
    <Box>
      <Text color="white" fontSize="sm" mb={1}>Monthly</Text>
      <Select
        multiple
        placeholder="Select Months"
        value={selectedMonthlyGroups}
        onChange={(e) =>
          setSelectedMonthlyGroups(
            Array.from(e.target.selectedOptions).map((opt) => opt.value)
          )
        }
        color="white"
        bg="rgba(255,255,255,0.1)"
        borderColor="rgba(255,255,255,0.2)"
      >
        {monthlyGroups.map(({ key, label }) => (
          <option key={key} value={key}>{label}</option>
        ))}
      </Select>
    </Box>

    {/* Yearly Dropdown */}
    <Box>
      <Text color="white" fontSize="sm" mb={1}>Yearly</Text>
      <Select
        multiple
        placeholder="Select Years"
        value={selectedYearlyGroups}
        onChange={(e) =>
          setSelectedYearlyGroups(
            Array.from(e.target.selectedOptions).map((opt) => opt.value)
          )
        }
        color="white"
        bg="rgba(255,255,255,0.1)"
        borderColor="rgba(255,255,255,0.2)"
      >
        {yearlyGroups.map(({ key, label }) => (
          <option key={key} value={key}>{label}</option>
        ))}
      </Select>
    </Box>
  </Flex>
)}

      {/* Content Type Selector */}
      <Flex justify="center" align="center" mt={4} mb={6}>
        <Select
          width="200px"
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value)}
          className="anb-select"
          icon={<FaChevronDown />}
          bg="rgba(255,255,255,0.1)"
          borderColor="rgba(255,255,255,0.2)"
          color="white"
          _hover={{ bg: "rgba(255,255,255,0.15)" }}
          _focus={{ bg: "rgba(255,255,255,0.15)" }}
        >
          <option value="nota">Nota</option>
          <option value="video">Video</option>
          <option value="both">Both</option>
        </Select>
      </Flex>
      {isLoading ? (
        <Flex justify="center" align="center" height="30vh">
          <Spinner size="xl" color="white" />
        </Flex>
      ) : (
        <>
          {/* Score Gauges */}
          <Flex wrap="wrap" justify="center" gap={12} mt={6}>
            {renderGauge("Competition", competitionScore)}
            {renderGauge("TV Azteca", aztecaScore)}
          </Flex>
          {/* Performance Charts */}
          <Flex direction={{ base: "column", md: "row" }} gap={8} mt={8} mb={8} maxW="1200px" mx="auto">
            {renderPerformanceChart("Competition", true)}
            {renderPerformanceChart("TV Azteca", false)}
          </Flex>
          {/* Advanced Analytics Panel */}
          {renderAnalyticsPanel()}
          {/* Trend Chart */}
          {renderTrendChart()}
          {/* Removed Correlation Scatter Plot */}
          {/* {renderCorrelationScatter()} */}
        </>
      )}
      {/* Insights Modal */}
      <Modal isOpen={insightsModalOpen} onClose={() => setInsightsModalOpen(false)} size="xl">
        <ModalOverlay />
        <ModalContent bg="#1A202C" color="white">
          <ModalHeader>{currentInsights?.title || "Data Analysis Insights"}</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {currentInsights && (
              <VStack align="start" spacing={4}>
                {currentInsights.overview && (
                  <Box p={4} borderRadius="md" bg="rgba(255,255,255,0.05)">
                    <Text fontWeight="bold" mb={2}>
                      📊 Key Insight
                    </Text>
                    <Text>{currentInsights.overview}</Text>
                  </Box>
                )}

                {currentInsights.growth && (
                  <Box p={4} borderRadius="md" bg="rgba(255,255,255,0.05)">
                    <Text fontWeight="bold" mb={2}>
                      📈 Recent Shift
                    </Text>
                    <Text>{currentInsights.growth}</Text>
                  </Box>
                )}

                {currentInsights.patterns && currentInsights.patterns !== "N/A" && (
                  <Box p={4} borderRadius="md" bg="rgba(255,255,255,0.05)">
                    <Text fontWeight="bold" mb={2}>
                      📐 Pattern Detected
                    </Text>
                    <Text>{currentInsights.patterns}</Text>
                  </Box>
                )}

                {currentInsights.projections && (
                  <Box p={4} borderRadius="md" bg="rgba(255,255,255,0.05)">
                    <Text fontWeight="bold" mb={2}>
                      🔮 Forward-Looking Forecast
                    </Text>
                    <Text>{currentInsights.projections}</Text>
                  </Box>
                )}

                {currentInsights?.rawData && <Divider my={2} />}

                {currentInsights?.rawData && (
                  <Grid templateColumns="repeat(2, 1fr)" gap={4}>
                    {currentInsights.rawData.aztecaGrowth && (
                      <Stat>
                        <StatLabel>TV Azteca Growth Rate</StatLabel>
                        <StatNumber fontSize="lg" color={COLORS.azteca[0]}>
                          {currentInsights.rawData.aztecaGrowth}%
                        </StatNumber>
                      </Stat>
                    )}
                    {currentInsights.rawData.competitionGrowth && (
                      <Stat>
                        <StatLabel>Competition Growth Rate</StatLabel>
                        <StatNumber fontSize="lg" color={COLORS.competition}>
                          {currentInsights.rawData.competitionGrowth}%
                        </StatNumber>
                      </Stat>
                    )}
                    {currentInsights.rawData.aztecaSlope && (
                      <Stat>
                        <StatLabel>Avg Change/Period</StatLabel>
                        <StatNumber>{currentInsights.rawData.aztecaSlope}</StatNumber>
                      </Stat>
                    )}
                    {currentInsights.rawData.competitionVsAzteca && (
                      <Stat>
                        <StatLabel>Current Performance Gap</StatLabel>
                        <StatNumber
                          color={
                            parseFloat(currentInsights.rawData.competitionVsAzteca) >= 0
                              ? COLORS.good
                              : COLORS.poor
                          }
                        >
                          {currentInsights.rawData.competitionVsAzteca}
                        </StatNumber>
                      </Stat>
                    )}
                  </Grid>
                )}
              </VStack>
            )}
          </ModalBody>

          <ModalFooter>
            <Button colorScheme="blue" onClick={() => setInsightsModalOpen(false)}>
              Close
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default GeneralOverview;