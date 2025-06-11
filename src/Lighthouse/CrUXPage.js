import React, { useState, useEffect, useMemo } from "react";
import {
  Box,
  Text,
  Flex,
  Spinner,
  Select,
  Grid,
  useToast,
  IconButton,
  Tooltip,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  useDisclosure,
  Heading,
  Divider,
  Badge,
  VStack,
  HStack,
} from "@chakra-ui/react";
import Papa from "papaparse";
import { FaExpand, FaArrowDown, FaArrowUp, FaMinus } from "react-icons/fa";
import Plot from "react-plotly.js";
import "./Lighthouse.css";
import MatrixRain from "./MatrixRain";

// ---
// Common Helper Functions
// ---

// Parse "YYYY-MM-DD" -> Date
const parseDate = (dateStr) => {
  if (!dateStr) return new Date(0);
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day);
};

// Format "YYYY-MM-DD" range -> "MMM DD,YYYY - MMM DD,YYYY"
const formatDateRange = (start, end) => {
  if (!start || !end) return "N/A";
  const sDate = parseDate(start);
  const eDate = parseDate(end);
  const opts = { month: "short", day: "numeric", year: "numeric" };
  return `${sDate.toLocaleDateString(undefined, opts)} - ${eDate.toLocaleDateString(undefined, opts)}`;
};

// Format numeric with or without decimals
const formatNumber = (val) => {
  const num = parseFloat(val);
  if (isNaN(num)) return "N/A";
  return Number.isInteger(num) ? num.toString() : num.toFixed(1);
};

// Calculate linear regression and trend
function calculateTrend(data) {
  if (!data || data.length < 2) return { slope: 0, intercept: 0, trend: 'neutral' };
  
  // Convert dates to numeric values (days since first date)
  const firstDate = parseDate(data[0].date).getTime();
  const points = data.map(d => ({
    x: (parseDate(d.date).getTime() - firstDate) / (1000 * 60 * 60 * 24), // days
    y: d.value
  }));
  
  // Calculate means
  const n = points.length;
  const meanX = points.reduce((sum, p) => sum + p.x, 0) / n;
  const meanY = points.reduce((sum, p) => sum + p.y, 0) / n;
  
  // Calculate slope and intercept
  let numerator = 0;
  let denominator = 0;
  
  points.forEach(p => {
    numerator += (p.x - meanX) * (p.y - meanY);
    denominator += (p.x - meanX) * (p.x - meanX);
  });
  
  const slope = denominator !== 0 ? numerator / denominator : 0;
  const intercept = meanY - slope * meanX;
  
  // Determine trend based on slope magnitude relative to mean
  const slopePercentage = Math.abs(slope) / meanY * 100;
  let trend = 'neutral';
  
  if (slopePercentage > 1) { // More than 1% change per day is significant
    trend = slope > 0 ? 'negative' : 'positive'; // For web metrics, higher is worse
  }
  
  return { slope, intercept, trend };
}

// Get trend color based on metric type
function getTrendColor(trend, metric) {
  // For web performance metrics, lower is better
  if (trend === 'positive') return '#10B981'; // Green
  if (trend === 'negative') return '#EF4444'; // Red
  return '#6B7280'; // Gray for neutral
}

// Get trend icon
function getTrendIcon(trend) {
  if (trend === 'positive') return <FaArrowDown color="#10B981" />;
  if (trend === 'negative') return <FaArrowUp color="#EF4444" />;
  return <FaMinus color="#6B7280" />;
}

// Identify the most recent date for marking with a vertical line
function getMostRecentDate(dataArray) {
  let maxTime = 0;
  dataArray.forEach((item) => {
    const t = parseDate(item.date).getTime();
    if (t > maxTime) maxTime = t;
  });
  return maxTime > 0 ? new Date(maxTime) : null;
}

// Mark current date line and annotation
function getCurrentDateLineAndAnnotation(date) {
  if (!date) return {};
  const isoString = date.toISOString().split("T")[0];
  return {
    shapes: [
      {
        type: "line",
        xref: "x",
        yref: "paper",
        x0: isoString,
        x1: isoString,
        y0: 0,
        y1: 1,
        line: {
          color: "rgba(255, 255, 255, 0.3)",
          width: 2,
          dash: "dot",
        },
      },
    ],
    annotations: [
      {
        x: isoString,
        y: 1,
        xref: "x",
        yref: "paper",
        text: "Latest",
        showarrow: true,
        arrowhead: 2,
        ax: 0,
        ay: -40,
        font: { color: "rgba(255, 255, 255, 0.7)", size: 10 },
      },
    ],
  };
}

// Performance label: Good / Needs Improvement / Poor
function getPerformanceCategory(metric, avgValue, thresholds) {
  if (isNaN(avgValue)) return "Poor";
  const val = parseFloat(avgValue);
  if (val <= thresholds[metric].good) return "Good";
  if (val <= thresholds[metric].needsImprovement) return "Needs Improvement";
  return "Poor";
}

// Enhanced metric card component
const MetricCard = ({ metric, data, averages, thresholds, units, definitions, onExpand }) => {
  const { slope, intercept, trend } = calculateTrend(data);
  const trendColor = getTrendColor(trend, metric);
  const trendIcon = getTrendIcon(trend);
  
  const avgVal = parseFloat(averages[metric]);
  const performance = getPerformanceCategory(metric, avgVal, thresholds);
  const performanceColor =
    performance === "Good"
      ? "#10B981"
      : performance === "Needs Improvement"
      ? "#F59E0B"
      : "#EF4444";

  const mostRecentDate = getMostRecentDate(data);
  const { shapes, annotations } = getCurrentDateLineAndAnnotation(mostRecentDate);

  const trace = {
    x: data.map((p) => p.date),
    y: data.map((p) => p.value),
    type: "scatter",
    mode: "lines+markers",
    line: {
      color: trendColor,
      width: 3,
      shape: "spline",
    },
    marker: {
      size: 8,
      color: trendColor,
      line: {
        color: "rgba(255, 255, 255, 0.8)",
        width: 2
      }
    },
    name: metric,
    hovertemplate: `
      <b>${metric}</b><br>
      <b>Date:</b> %{x|%b %d, %Y}<br>
      <b>Value:</b> %{y} ${units[metric]}<extra></extra>
    `,
    connectgaps: true,
  };

  // Add trend line
  const trendLine = {
    x: data.map((p) => p.date),
    y: data.map((p, i) => {
      const daysSinceStart = i * (data.length > 1 ? (parseDate(data[data.length - 1].date).getTime() - parseDate(data[0].date).getTime()) / (1000 * 60 * 60 * 24) / (data.length - 1) : 0);
      return intercept + slope * daysSinceStart;
    }),
    type: "scatter",
    mode: "lines",
    line: {
      color: trendColor,
      width: 1,
      dash: "dot",
    },
    showlegend: false,
    hoverinfo: "skip",
  };

  return (
    <Tooltip
      label={
        <VStack align="start" spacing={2} p={2}>
          <Text fontWeight="bold" fontSize="md">{metric}</Text>
          <Text fontSize="sm">{definitions[metric]}</Text>
          <Divider borderColor="rgba(255,255,255,0.2)" />
          <HStack spacing={4}>
            <VStack align="start" spacing={1}>
              <Text fontSize="xs" color="#10B981">Good: ≤ {formatNumber(thresholds[metric].good)}{units[metric]}</Text>
              <Text fontSize="xs" color="#F59E0B">Needs Work: ≤ {formatNumber(thresholds[metric].needsImprovement)}{units[metric]}</Text>
              <Text fontSize="xs" color="#EF4444">Poor: &gt; {formatNumber(thresholds[metric].needsImprovement)}{units[metric]}</Text>
            </VStack>
          </HStack>
        </VStack>
      }
      bg="rgba(26, 32, 44, 0.95)"
      color="white"
      fontSize="sm"
      placement="top"
      hasArrow
      borderRadius="lg"
      border="1px solid rgba(255,255,255,0.1)"
      p={3}
    >
      <Box
        bg="linear-gradient(135deg, rgba(26, 32, 44, 0.8) 0%, rgba(45, 55, 72, 0.8) 100%)"
        backdropFilter="blur(10px)"
        border="1px solid rgba(255,255,255,0.1)"
        borderRadius="xl"
        p={4}
        h="100%"
        transition="all 0.3s ease"
        _hover={{
          transform: "translateY(-2px)",
          boxShadow: "0 10px 30px rgba(0, 247, 255, 0.2)",
          border: "1px solid rgba(0, 247, 255, 0.3)",
        }}
        position="relative"
        overflow="hidden"
      >
        {/* Background gradient effect */}
        <Box
          position="absolute"
          top="-50%"
          right="-50%"
          width="200%"
          height="200%"
          background="radial-gradient(circle, rgba(0, 247, 255, 0.1) 0%, transparent 70%)"
          opacity={0.5}
          pointerEvents="none"
        />

        {/* Header */}
        <Flex justify="space-between" align="center" mb={3}>
          <HStack spacing={2}>
            <Text color="white" fontSize="sm" fontWeight="bold">
              {metric}
            </Text>
            <Box>{trendIcon}</Box>
          </HStack>
          <IconButton
            aria-label="Expand Graph"
            icon={<FaExpand />}
            color="white"
            bg="transparent"
            _hover={{ bg: "rgba(255,255,255,0.1)" }}
            size="sm"
            onClick={() => onExpand([trace, trendLine], metric)}
          />
        </Flex>

        {/* Score Display */}
        <VStack spacing={1} align="center" mb={3}>
          <Text 
            fontSize="3xl" 
            fontWeight="bold" 
            bgGradient={`linear(to-r, ${performanceColor}, ${performanceColor}DD)`}
            bgClip="text"
          >
            {formatNumber(averages[metric])}
          </Text>
          <Text fontSize="xs" color="gray.400">
            {units[metric]}
          </Text>
          <Badge
            colorScheme={
              performance === "Good" ? "green" : 
              performance === "Needs Improvement" ? "yellow" : "red"
            }
            variant="subtle"
            fontSize="xs"
            px={2}
            py={1}
            borderRadius="full"
          >
            {performance}
          </Badge>
        </VStack>

        {/* Mini Chart */}
        <Box width="100%" height="120px" mt={2}>
          <Plot
            data={[trace, trendLine]}
            layout={{
              autosize: true,
              margin: { l: 30, r: 10, t: 10, b: 30 },
              xaxis: {
                tickfont: { size: 8, color: "rgba(255,255,255,0.5)" },
                type: "date",
                showgrid: false,
                zeroline: false,
                showline: false,
                tickformat: "%b",
                dtick: "M1",
              },
              yaxis: {
                tickfont: { size: 8, color: "rgba(255,255,255,0.5)" },
                showgrid: true,
                gridcolor: "rgba(255,255,255,0.05)",
                zeroline: false,
                showline: false,
              },
              shapes: shapes,
              annotations: annotations,
              showlegend: false,
              hovermode: "x unified",
              paper_bgcolor: "transparent",
              plot_bgcolor: "transparent",
            }}
            config={{
              displayModeBar: false,
              responsive: true,
            }}
            style={{ width: "100%", height: "100%" }}
          />
        </Box>
      </Box>
    </Tooltip>
  );
};

// ---
// PerformanceMapLocal Component
// ---

// Local - Company to URL mapping
const LOCAL_COMPANY_URLS = {
  QuintanaRoo: "https://www.aztecaquintanaroo.com",
  Bajio: "https://www.aztecabajio.com",
  CiudadJuarez: "https://www.aztecaciudadjuarez.com",
  Yucatan: "https://www.aztecayucatan.com",
  Jalisco: "https://www.aztecajalisco.com",
  Puebla: "https://www.aztecapuebla.com",
  Veracruz: "https://www.aztecaveracruz.com",
  BajaCalifornia: "https://www.tvaztecabajacalifornia.com",
  Morelos: "https://www.aztecamorelos.com",
  Guerrero: "https://www.aztecaguerrero.com",
  Chiapas: "https://www.aztecachiapas.com",
  Sinaloa: "https://www.aztecasinaloa.com",
  Aguascalientes: "https://www.aztecaaguascalientes.com",
  Queretaro: "https://www.aztecaqueretaro.com",
  Chihuahua: "https://www.aztecachihuahua.com",
  Laguna: "https://www.aztecalaguna.com",
};

// Local - Group "Local"
const LOCAL_GROUPS = {
  Local: [
    "QuintanaRoo", "Bajio", "CiudadJuarez", "Yucatan", "Jalisco", "Puebla",
    "Veracruz", "BajaCalifornia", "Morelos", "Guerrero", "Chiapas", "Sinaloa",
    "Aguascalientes", "Queretaro", "Chihuahua", "Laguna",
  ],
};
const LOCAL_GROUP_NAMES = Object.keys(LOCAL_GROUPS);
const LOCAL_INDIVIDUAL_COMPANIES = Object.values(LOCAL_GROUPS).flat();

// Local - Metrics
const LOCAL_METRICS = ["LCP", "CLS", "INP", "FCP", "TTFB"];
const LOCAL_METRIC_UNITS = { LCP: "ms", CLS: "", INP: "ms", FCP: "ms", TTFB: "ms" };
const LOCAL_THRESHOLDS = {
  FCP: { good: 1800, needsImprovement: 3000 },
  CLS: { good: 0.1, needsImprovement: 0.25 },
  INP: { good: 200, needsImprovement: 500 },
  TTFB: { good: 800, needsImprovement: 1800 },
  LCP: { good: 2500, needsImprovement: 4000 },
};
const LOCAL_METRIC_DEFINITIONS = {
  LCP: "Largest Contentful Paint measures loading performance. It marks the time at which the largest text or image is painted.",
  CLS: "Cumulative Layout Shift measures visual stability. It quantifies how much the page layout shifts during the loading phase.",
  INP: "Interaction to Next Paint measures responsiveness. It records the latency of user interactions with the page.",
  FCP: "First Contentful Paint measures when the first text or image is painted on the screen.",
  TTFB: "Time To First Byte measures the responsiveness of a web server. It marks the time from the request until the first byte is received.",
};

// Local - Aggregator
function getAggregatedLocalData(dataRows, metric) {
  const mapByDate = {};
  dataRows.forEach((row) => {
    if (row.metric === metric) {
      const dateKey = row.endDate;
      if (!mapByDate[dateKey]) {
        mapByDate[dateKey] = [];
      }
      mapByDate[dateKey].push(row.p75);
    }
  });
  const aggregated = Object.keys(mapByDate).map((date) => {
    const sum = mapByDate[date].reduce((a, b) => a + b, 0);
    const avg = sum / mapByDate[date].length;
    return { date, value: avg };
  });
  aggregated.sort((a, b) => parseDate(a.date) - parseDate(b.date));
  return aggregated;
}

// Local - Single-company data
function getLocalSingleCompanyData(dataRows, metric) {
  return dataRows
    .filter((row) => row.metric === metric)
    .sort((a, b) => parseDate(a.endDate) - parseDate(b.endDate))
    .map((row) => ({
      date: row.endDate,
      value: row.p75,
    }));
}

const PerformanceMapLocal = () => {
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const [selectedCompany, setSelectedCompany] = useState("Local");
  const [selectedWeek, setSelectedWeek] = useState("");
  const [availableWeeks, setAvailableWeeks] = useState([]);

  const toast = useToast();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [modalPlotData, setModalPlotData] = useState(null);
  const [modalMetric, setModalMetric] = useState("");

  useEffect(() => {
    const csvUrl =
      "https://docs.google.com/spreadsheets/d/e/2PACX-1vTjlmJmlds_-tGsyyuE---iB_dPSDjLIxWb0D5ZSqz5KiJJIOFr5_AJND3p7lMaOZ1Bz7fwl8HPP0Mg/pub?output=csv";
    Papa.parse(csvUrl, {
      download: true,
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          const parsed = results.data.map((row) => ({
            website: row["Website"]?.trim() ?? "",
            metric: row["Metric"]?.trim().toUpperCase() ?? "",
            p75: row["P75"] ? parseFloat(row["P75"]) : NaN,
            startDate: row["Start Date"]?.trim() ?? "",
            endDate: row["End Date"]?.trim() ?? "",
            weekRange:
              row["Start Date"] && row["End Date"]
                ? formatDateRange(row["Start Date"].trim(), row["End Date"].trim())
                : "N/A",
          }));

          const validData = parsed.filter((r, idx) => {
            if (!r.website) { console.warn(`Local Row ${idx + 2} missing 'Website'`); return false; }
            if (!r.metric) { console.warn(`Local Row ${idx + 2} missing 'Metric'`); return false; }
            if (isNaN(r.p75)) { console.warn(`Local Row ${idx + 2} invalid 'P75'`); return false; }
            return true;
          });

          const weeks = Array.from(new Set(validData.map((d) => d.weekRange)));
          weeks.sort((a, b) => {
            const dateA = a.split(" - ")[0] ? parseDate(a.split(" - ")[0]) : new Date(0);
            const dateB = b.split(" - ")[0] ? parseDate(b.split(" - ")[0]) : new Date(0);
            return dateA - dateB;
          });
          setAvailableWeeks(weeks);

          setData(validData);
          setIsLoading(false);
        } catch (err) {
          console.error("Error processing Local CSV data:", err);
          setError(`Failed to process Local data: ${err.message}`);
          setIsLoading(false);
        }
      },
      error: (err) => {
        console.error("Error fetching Local CSV:", err);
        setError(`Failed to fetch Local data: ${err.message}`);
        setIsLoading(false);
      },
    });
  }, []);

  const companyOptions = useMemo(() => {
    const opts = [];
    opts.push(
      <option
        key="Local"
        value="Local"
        style={{ backgroundColor: "#1a202c", color: "#e2e8f0" }}
      >
        All Local Sites
      </option>
    );

    LOCAL_INDIVIDUAL_COMPANIES.forEach((co) => {
      opts.push(
        <option
          key={co}
          value={co}
          style={{ backgroundColor: "#1a202c", color: "#e2e8f0" }}
        >
          {co}
        </option>
      );
    });
    return opts;
  }, []);

  const filteredData = useMemo(() => {
    if (!data.length) return [];
    return data.filter((row) => {
      if (selectedWeek && selectedWeek !== "All Weeks") {
        if (row.weekRange !== selectedWeek) return false;
      }
      if (selectedCompany === "Local") {
        const localCompanies = LOCAL_GROUPS["Local"];
        const localURLs = localCompanies.map((c) => LOCAL_COMPANY_URLS[c]);
        return localURLs.includes(row.website);
      } else if (selectedCompany) {
        const selectedURL = LOCAL_COMPANY_URLS[selectedCompany];
        return row.website === selectedURL;
      }
      return true;
    });
  }, [data, selectedCompany, selectedWeek]);

  const plotlySeries = useMemo(() => {
    const seriesByMetric = {};
    LOCAL_METRICS.forEach((metric) => {
      if (selectedCompany === "Local") {
        const points = getAggregatedLocalData(filteredData, metric);
        seriesByMetric[metric] = points;
      } else {
        const points = getLocalSingleCompanyData(filteredData, metric);
        seriesByMetric[metric] = points;
      }
    });
    return seriesByMetric;
  }, [filteredData, selectedCompany]);

  const averages = useMemo(() => {
    if (!filteredData.length) return {};
    const sums = {};
    const counts = {};
    LOCAL_METRICS.forEach((m) => {
      sums[m] = 0;
      counts[m] = 0;
    });
    filteredData.forEach((row) => {
      if (LOCAL_METRICS.includes(row.metric) && !isNaN(row.p75)) {
        sums[row.metric] += row.p75;
        counts[row.metric] += 1;
      }
    });
    const result = {};
    LOCAL_METRICS.forEach((m) => {
      result[m] = counts[m] > 0 ? (sums[m] / counts[m]).toFixed(2) : "N/A";
    });
    return result;
  }, [filteredData]);

  const handleExpand = (plotData, metric) => {
    setModalPlotData(plotData);
    setModalMetric(metric);
    onOpen();
  };

  const handleCompanyChange = (e) => {
    setSelectedCompany(e.target.value);
  };

  const handleWeekChange = (e) => {
    setSelectedWeek(e.target.value);
    if (e.target.value && e.target.value !== "All Weeks") {
      toast({
        title: "Week Selected",
        description: `Viewing data for: ${e.target.value}`,
        status: "info",
        duration: 3000,
        isClosable: true,
        position: "bottom-right",
      });
    }
  };

  if (isLoading) {
    return (
      <Flex justifyContent="center" alignItems="center" height="200px" bg="transparent">
        <Spinner size="xl" color="cyan.400" thickness="4px" />
        <Text ml={4} fontSize="lg" color="white">
          Loading Local data...
        </Text>
      </Flex>
    );
  }

  if (error) {
    return (
      <Flex justifyContent="center" alignItems="center" height="200px" bg="transparent">
        <Text color="red.400" fontSize="lg" textAlign="center">
          {error}
        </Text>
      </Flex>
    );
  }

  return (
    <>
      <Box
        bg="linear-gradient(135deg, rgba(26, 32, 44, 0.6) 0%, rgba(45, 55, 72, 0.6) 100%)"
        backdropFilter="blur(20px)"
        borderRadius="2xl"
        border="1px solid rgba(255,255,255,0.1)"
        p={6}
        mb={8}
        boxShadow="0 20px 40px rgba(0,0,0,0.3)"
      >
        {/* Controls Row */}
        <Flex
          width="100%"
          justifyContent="flex-start"
          alignItems="center"
          flexWrap="wrap"
          gap={4}
          mb={6}
        >
          {/* Company */}
          <HStack spacing={2}>
            <Text color="gray.300" fontSize="sm" fontWeight="medium">
              Company:
            </Text>
            <Select
              value={selectedCompany}
              onChange={handleCompanyChange}
              width="220px"
              bg="rgba(26, 32, 44, 0.8)"
              color="white"
              borderColor="rgba(255,255,255,0.2)"
              _hover={{ borderColor: "cyan.400" }}
              _focus={{ borderColor: "cyan.400", boxShadow: "0 0 0 1px var(--chakra-colors-cyan-400)" }}
              size="sm"
              borderRadius="lg"
            >
              {companyOptions}
            </Select>
          </HStack>

          {/* Week */}
          <HStack spacing={2}>
            <Text color="gray.300" fontSize="sm" fontWeight="medium">
              Week:
            </Text>
            <Select
              value={selectedWeek}
              onChange={handleWeekChange}
              placeholder="Select Week"
              width="220px"
              bg="rgba(26, 32, 44, 0.8)"
              color="white"
              borderColor="rgba(255,255,255,0.2)"
              _hover={{ borderColor: "cyan.400" }}
              _focus={{ borderColor: "cyan.400", boxShadow: "0 0 0 1px var(--chakra-colors-cyan-400)" }}
              size="sm"
              borderRadius="lg"
            >
              <option
                value="All Weeks"
                style={{ backgroundColor: "#1a202c", color: "#e2e8f0" }}
              >
                All Weeks
              </option>
              {availableWeeks.map((wk) => (
                <option
                  key={wk}
                  value={wk}
                  style={{ backgroundColor: "#1a202c", color: "#e2e8f0" }}
                >
                  {wk}
                </option>
              ))}
            </Select>
          </HStack>
        </Flex>

        {/* Metrics Grid */}
        <Grid
          templateColumns={{
            base: "repeat(1, 1fr)",
            sm: "repeat(2, 1fr)",
            md: "repeat(3, 1fr)",
            lg: "repeat(5, 1fr)",
          }}
          gap={4}
          width="100%"
        >
          {LOCAL_METRICS.map((metric) => (
            <MetricCard
              key={metric}
              metric={metric}
              data={plotlySeries[metric] || []}
              averages={averages}
              thresholds={LOCAL_THRESHOLDS}
              units={LOCAL_METRIC_UNITS}
              definitions={LOCAL_METRIC_DEFINITIONS}
              onExpand={handleExpand}
            />
          ))}
        </Grid>
      </Box>

      {/* Expanded Modal */}
      <Modal isOpen={isOpen} onClose={onClose} size="6xl" isCentered>
        <ModalOverlay bg="rgba(0,0,0,0.8)" backdropFilter="blur(10px)" />
        <ModalContent
          bg="linear-gradient(135deg, rgba(26, 32, 44, 0.95) 0%, rgba(45, 55, 72, 0.95) 100%)"
          color="white"
          border="1px solid rgba(255, 255, 255, 0.2)"
          boxShadow="0 30px 60px rgba(0, 0, 0, 0.5)"
          borderRadius="2xl"
          maxW="90vw"
        >
          <ModalHeader 
            fontSize="2xl" 
            fontWeight="bold"
            bgGradient="linear(to-r, cyan.400, blue.400)"
            bgClip="text"
          >
            {modalMetric} Performance Trends
          </ModalHeader>
          <ModalCloseButton 
            color="white" 
            _hover={{ bg: "rgba(255,255,255,0.1)" }}
            borderRadius="full"
          />
          <ModalBody pb={6}>
            {modalPlotData && (
              <Plot
                data={modalPlotData}
                layout={{
                  autosize: true,
                  margin: { l: 60, r: 50, t: 50, b: 60 },
                  xaxis: {
                    type: "date",
                    title: { text: "Date", font: { color: "rgba(255,255,255,0.8)", size: 14 } },
                    tickformat: "%B %d, %Y",
                    tickfont: { size: 12, color: "rgba(255,255,255,0.6)" },
                    gridcolor: "rgba(255,255,255,0.05)",
                    showgrid: true,
                  },
                  yaxis: {
                    title: { text: "Value", font: { color: "rgba(255,255,255,0.8)", size: 14 } },
                    tickfont: { size: 12, color: "rgba(255,255,255,0.6)" },
                    gridcolor: "rgba(255,255,255,0.05)",
                    showgrid: true,
                  },
                  showlegend: false,
                  hovermode: "x unified",
                  paper_bgcolor: "transparent",
                  plot_bgcolor: "transparent",
                }}
                config={{
                  displayModeBar: true,
                  displaylogo: false,
                  modeBarButtonsToRemove: ['pan2d', 'lasso2d', 'select2d'],
                  responsive: true,
                }}
                style={{ width: "100%", height: "500px" }}
              />
            )}
          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  );
};

// ---
// PerformanceMapVertical Component
// ---

// Vertical - Company-to-URL
const VERTICAL_COMPANY_URLS = {
  Milenio: "https://www.milenio.com/",
  "El Heraldo": "https://heraldodemexico.com.mx/",
  "El Universal": "https://www.eluniversal.com.mx/",
  Televisa: "https://www.televisa.com/",
  Terra: "https://www.terra.com.mx/",
  AS: "https://mexico.as.com/",
  Infobae: "https://www.infobae.com/mexico/",
  "NY Times": "https://www.nytimes.com/",
  "TV Azteca": "https://www.tvazteca.com/",
  deportes: "https://www.tvazteca.com/aztecadeportes/",
  "7": "https://www.tvazteca.com/azteca7/",
  noticias: "https://www.tvazteca.com/aztecanoticias/",
  adn40: "https://www.adn40.mx/",
  Amastv: "https://www.tvazteca.com/amastv/",
  Uno: "https://www.tvazteca.com/aztecauno/",
};

// Vertical - Groups
const VERTICAL_GROUPS = {
  "TV Azteca Companies": [
    "deportes", "7", "noticias", "adn40", "Amastv", "Uno",
  ],
  Competitors: [
    "Milenio", "El Heraldo", "El Universal", "Televisa", "Terra", "AS",
    "Infobae", "NY Times",
  ],
};

const VERTICAL_GROUP_NAMES = Object.keys(VERTICAL_GROUPS);
const VERTICAL_INDIVIDUAL_COMPANIES = ["TV Azteca", ...Object.values(VERTICAL_GROUPS).flat()];

// Vertical - Metrics
const VERTICAL_METRICS = ["LCP", "CLS", "INP", "FCP", "TTFB"];
const VERTICAL_METRIC_DESCRIPTIONS = {
  LCP: "Largest Contentful Paint indicates how quickly the main content is visible.",
  CLS: "Cumulative Layout Shift measures the visual stability of the page load.",
  INP: "Interaction to Next Paint measures responsiveness to user input.",
  FCP: "First Contentful Paint measures how quickly the first text or image is painted.",
  TTFB: "Time to First Byte measures the time for a browser to receive the first byte of content.",
};
const VERTICAL_METRIC_UNITS = { LCP: "ms", CLS: "", INP: "ms", FCP: "ms", TTFB: "ms" };
const VERTICAL_THRESHOLDS = {
  FCP: { good: 1800, needsImprovement: 3000 },
  CLS: { good: 0.1, needsImprovement: 0.25 },
  INP: { good: 200, needsImprovement: 500 },
  TTFB: { good: 800, needsImprovement: 1800 },
  LCP: { good: 2500, needsImprovement: 4000 },
};

// Vertical - Aggregation for groups
function getAggregatedGroupData(dataRows, metric, formFactor) {
  const mapByDate = {};
  dataRows.forEach((row) => {
    if (row.metric === metric && row.formFactor === formFactor) {
      const dateKey = row.endDate;
      if (!mapByDate[dateKey]) {
        mapByDate[dateKey] = [];
      }
      mapByDate[dateKey].push(row.p75);
    }
  });
  const aggregated = Object.keys(mapByDate).map((date) => {
    const sum = mapByDate[date].reduce((acc, val) => acc + val, 0);
    const avg = sum / mapByDate[date].length;
    return { date: date, value: avg };
  });
  aggregated.sort((a, b) => parseDate(a.date) - parseDate(b.date));
  return aggregated;
}

// Vertical - Single-company data
function getVerticalSingleCompanyData(dataRows, metric, formFactor) {
  return dataRows
    .filter((row) => row.metric === metric && row.formFactor === formFactor)
    .sort((a, b) => parseDate(a.endDate) - parseDate(b.endDate))
    .map((row) => ({ date: row.endDate, value: row.p75 }));
}

const PerformanceMapVertical = () => {
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const [selectedCompany, setSelectedCompany] = useState("TV Azteca Companies");
  const [selectedWeekRange, setSelectedWeekRange] = useState("all");
  const [selectedFormFactor, setSelectedFormFactor] = useState("phone");

  const { isOpen, onOpen, onClose } = useDisclosure();
  const [modalPlotData, setModalPlotData] = useState(null);
  const [modalMetric, setModalMetric] = useState("");

  const toast = useToast();

  useEffect(() => {
    const csvUrl =
      "https://docs.google.com/spreadsheets/d/e/2PACX-1vQkary38OmPhvyBG9ZgDkJbcZmP4Q0_qYVceNyQPDcrr0HERgtq2C46ImlSGnFL9Etfw4PaC9y0xcpL/pub?output=csv";
    Papa.parse(csvUrl, {
      download: true,
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          const parsedData = results.data.map((row, idx) => ({
            website: row["Website"] ? row["Website"].trim() : "",
            formFactor: row["Form Factor"]
              ? row["Form Factor"].trim().toLowerCase()
              : "",
            metric: row["Metric"] ? row["Metric"].trim().toUpperCase() : "",
            p75: row["P75"] ? parseFloat(row["P75"]) : NaN,
            startDate: row["Start Date"] ? row["Start Date"].trim() : "",
            endDate: row["End Date"] ? row["End Date"].trim() : "",
            weekRange:
              row["Start Date"] && row["End Date"]
                ? formatDateRange(row["Start Date"].trim(), row["End Date"].trim())
                : "N/A",
          }));

          const validData = parsedData.filter((row, i) => {
            if (!row.website) { console.warn(`Vertical Row ${i + 2} skipped: Missing 'Website'`); return false; }
            if (!row.metric) { console.warn(`Vertical Row ${i + 2} skipped: Missing 'Metric'`); return false; }
            if (isNaN(row.p75)) { console.warn(`Vertical Row ${i + 2} skipped: Invalid 'P75' value`); return false; }
            return true;
          });
          setData(validData);
          setIsLoading(false);
        } catch (err) {
          console.error("Error processing Vertical CSV data:", err);
          setError(`Failed to process Vertical data: ${err.message}`);
          setIsLoading(false);
        }
      },
      error: (err) => {
        console.error("Error fetching Vertical CSV data:", err);
        setError(`Failed to fetch Vertical data: ${err.message}`);
        setIsLoading(false);
      },
    });
  }, []);

  const weekOptions = useMemo(() => {
    const uniqueWeeks = [...new Set(data.map((d) => d.weekRange))].filter(
      (w) => w !== "N/A"
    );
    return ["all", ...uniqueWeeks];
  }, [data]);

  const companyOptions = useMemo(() => {
    const options = [];
    VERTICAL_GROUP_NAMES.forEach((group) => {
      options.push(
        <option 
          style={{ backgroundColor: "#1a202c", color: "#e2e8f0" }} 
          key={group} 
          value={group}
        >
          {group}
        </option>
      );
    });
    VERTICAL_INDIVIDUAL_COMPANIES.forEach((company) => {
      options.push(
        <option 
          style={{ backgroundColor: "#1a202c", color: "#e2e8f0" }} 
          key={company} 
          value={company}
        >
          {company}
        </option>
      );
    });
    return options;
  }, []);

  const filteredDataAllTime = useMemo(() => {
    if (!selectedCompany) return [];
    let filtered = data;
    if (selectedWeekRange !== "all") {
      filtered = filtered.filter((row) => row.weekRange === selectedWeekRange);
    }
    if (VERTICAL_GROUP_NAMES.includes(selectedCompany)) {
      const groupCompanies = VERTICAL_GROUPS[selectedCompany];
      const groupURLs = groupCompanies.map((c) => VERTICAL_COMPANY_URLS[c]);
      return filtered.filter((row) => groupURLs.includes(row.website));
    } else {
      const url = VERTICAL_COMPANY_URLS[selectedCompany];
      return filtered.filter((row) => row.website === url);
    }
  }, [data, selectedCompany, selectedWeekRange]);

  const plotlyData = useMemo(() => {
    const dataByMetric = {};
    VERTICAL_METRICS.forEach((metric) => {
      const series = VERTICAL_GROUP_NAMES.includes(selectedCompany)
        ? getAggregatedGroupData(filteredDataAllTime, metric, selectedFormFactor)
        : getVerticalSingleCompanyData(filteredDataAllTime, metric, selectedFormFactor);
      dataByMetric[metric] = series;
    });
    return dataByMetric;
  }, [filteredDataAllTime, selectedCompany, selectedFormFactor]);

  const averages = useMemo(() => {
    if (!filteredDataAllTime.length) return {};
    const sums = {};
    const counts = {};
    VERTICAL_METRICS.forEach((m) => {
      sums[m] = 0;
      counts[m] = 0;
    });
    filteredDataAllTime.forEach((row) => {
      if (
        VERTICAL_METRICS.includes(row.metric) &&
        !isNaN(row.p75) &&
        row.formFactor === selectedFormFactor
      ) {
        sums[row.metric] += row.p75;
        counts[row.metric] += 1;
      }
    });
    const avgs = {};
    VERTICAL_METRICS.forEach((m) => {
      avgs[m] = counts[m] ? (sums[m] / counts[m]).toFixed(2) : "N/A";
    });
    return avgs;
  }, [filteredDataAllTime, selectedFormFactor]);

  const handleExpand = (plotData, metric) => {
    setModalPlotData(plotData);
    setModalMetric(metric);
    onOpen();
  };

  if (isLoading) {
    return (
      <Flex justifyContent="center" alignItems="center" height="200px" bg="transparent">
        <Spinner size="xl" color="cyan.400" thickness="4px" />
        <Text ml={4} fontSize="lg" color="white">
          Loading Vertical data...
        </Text>
      </Flex>
    );
  }

  if (error) {
    return (
      <Flex justifyContent="center" alignItems="center" height="200px" bg="transparent">
        <Text color="red.400" fontSize="lg" textAlign="center">
          {error}
        </Text>
      </Flex>
    );
  }

  return (
    <Box
      bg="linear-gradient(135deg, rgba(26, 32, 44, 0.6) 0%, rgba(45, 55, 72, 0.6) 100%)"
      backdropFilter="blur(20px)"
      borderRadius="2xl"
      border="1px solid rgba(255,255,255,0.1)"
      p={6}
      mb={8}
      boxShadow="0 20px 40px rgba(0,0,0,0.3)"
    >
      {/* Header: Company, Week, Form Factor */}
      <Flex
        width="100%"
        justifyContent="flex-start"
        alignItems="center"
        flexWrap="wrap"
        gap={4}
        mb={6}
      >
        {/* Company Selector */}
        <HStack spacing={2}>
          <Text color="gray.300" fontSize="sm" fontWeight="medium">
            Company:
          </Text>
          <Select
            value={selectedCompany}
            onChange={(e) => setSelectedCompany(e.target.value)}
            width="220px"
            bg="rgba(26, 32, 44, 0.8)"
            color="white"
            borderColor="rgba(255,255,255,0.2)"
            _hover={{ borderColor: "cyan.400" }}
            _focus={{ borderColor: "cyan.400", boxShadow: "0 0 0 1px var(--chakra-colors-cyan-400)" }}
            size="sm"
            borderRadius="lg"
          >
            {companyOptions}
          </Select>
        </HStack>

        {/* Week and Form Factor Selectors */}
        <HStack spacing={4}>
          <HStack spacing={2}>
            <Text color="gray.300" fontSize="sm" fontWeight="medium">
              Week:
            </Text>
            <Select
              value={selectedWeekRange}
              onChange={(e) => setSelectedWeekRange(e.target.value)}
              width="220px"
              bg="rgba(26, 32, 44, 0.8)"
              color="white"
              borderColor="rgba(255,255,255,0.2)"
              _hover={{ borderColor: "cyan.400" }}
              _focus={{ borderColor: "cyan.400", boxShadow: "0 0 0 1px var(--chakra-colors-cyan-400)" }}
              size="sm"
              borderRadius="lg"
            >
              {weekOptions.map((week) => (
                <option 
                  style={{ backgroundColor: "#1a202c", color: "#e2e8f0" }} 
                  key={week} 
                  value={week}
                >
                  {week === "all" ? "All Weeks" : week}
                </option>
              ))}
            </Select>
          </HStack>

          <HStack spacing={2}>
            <Text color="gray.300" fontSize="sm" fontWeight="medium">
              Device:
            </Text>
            <Select
              value={selectedFormFactor}
              onChange={(e) => setSelectedFormFactor(e.target.value)}
              width="150px"
              bg="rgba(26, 32, 44, 0.8)"
              color="white"
              borderColor="rgba(255,255,255,0.2)"
              _hover={{ borderColor: "cyan.400" }}
              _focus={{ borderColor: "cyan.400", boxShadow: "0 0 0 1px var(--chakra-colors-cyan-400)" }}
              size="sm"
              borderRadius="lg"
            >
              <option style={{ backgroundColor: "#1a202c", color: "#e2e8f0" }} value="phone">
                Mobile
              </option>
              <option style={{ backgroundColor: "#1a202c", color: "#e2e8f0" }} value="desktop">
                Desktop
              </option>
            </Select>
          </HStack>
        </HStack>
      </Flex>

      {/* Metrics Grid */}
      <Grid
        templateColumns={{
          base: "repeat(1, 1fr)",
          sm: "repeat(2, 1fr)",
          md: "repeat(3, 1fr)",
          lg: "repeat(5, 1fr)",
        }}
        gap={4}
        width="100%"
      >
        {VERTICAL_METRICS.map((metric) => (
          <MetricCard
            key={metric}
            metric={metric}
            data={plotlyData[metric] || []}
            averages={averages}
            thresholds={VERTICAL_THRESHOLDS}
            units={VERTICAL_METRIC_UNITS}
            definitions={VERTICAL_METRIC_DESCRIPTIONS}
            onExpand={handleExpand}
          />
        ))}
      </Grid>

      {/* Modal for expanded graph */}
      <Modal isOpen={isOpen} onClose={onClose} size="6xl" isCentered>
        <ModalOverlay bg="rgba(0,0,0,0.8)" backdropFilter="blur(10px)" />
        <ModalContent
          bg="linear-gradient(135deg, rgba(26, 32, 44, 0.95) 0%, rgba(45, 55, 72, 0.95) 100%)"
          color="white"
          border="1px solid rgba(255, 255, 255, 0.2)"
          boxShadow="0 30px 60px rgba(0, 0, 0, 0.5)"
          borderRadius="2xl"
          maxW="90vw"
        >
          <ModalHeader 
            fontSize="2xl" 
            fontWeight="bold"
            bgGradient="linear(to-r, cyan.400, blue.400)"
            bgClip="text"
          >
            {modalMetric} Performance Trends
          </ModalHeader>
          <ModalCloseButton 
            color="white" 
            _hover={{ bg: "rgba(255,255,255,0.1)" }}
            borderRadius="full"
          />
          <ModalBody pb={6}>
            {modalPlotData && (
              <Plot
                data={modalPlotData}
                layout={{
                  autosize: true,
                  margin: { l: 60, r: 50, t: 50, b: 60 },
                  xaxis: {
                    type: "date",
                    title: { text: "Date", font: { color: "rgba(255,255,255,0.8)", size: 14 } },
                    tickformat: "%B %d, %Y",
                    tickfont: { size: 12, color: "rgba(255,255,255,0.6)" },
                    gridcolor: "rgba(255,255,255,0.05)",
                    showgrid: true,
                  },
                  yaxis: {
                    title: { text: "Value", font: { color: "rgba(255,255,255,0.8)", size: 14 } },
                    tickfont: { size: 12, color: "rgba(255,255,255,0.6)" },
                    gridcolor: "rgba(255,255,255,0.05)",
                    showgrid: true,
                  },
                  showlegend: false,
                  hovermode: "x unified",
                  paper_bgcolor: "transparent",
                  plot_bgcolor: "transparent",
                }}
                config={{
                  displayModeBar: true,
                  displaylogo: false,
                  modeBarButtonsToRemove: ['pan2d', 'lasso2d', 'select2d'],
                  responsive: true,
                }}
                style={{ width: "100%", height: "500px" }}
              />
            )}
          </ModalBody>
        </ModalContent>
      </Modal>
    </Box>
  );
};

// ---
// Main Combined Component
// ---
const CombinedPerformanceMaps = () => {
  return (
    <>
      <MatrixRain />
      <Box 
        pt="100px" 
        px={6} 
        minH="100vh"
        position="relative"
      >
        {/* Background gradient overlay */}
        <Box
          position="fixed"
          top="0"
          left="0"
          right="0"
          bottom="0"
          bg="linear-gradient(180deg, rgba(26, 32, 44, 0.9) 0%, rgba(45, 55, 72, 0.8) 50%, rgba(26, 32, 44, 0.9) 100%)"
          pointerEvents="none"
          zIndex="0"
        />

        {/* Content container */}
        <Box position="relative" zIndex="1">
          <VStack spacing={8} align="stretch">
            {/* Main Title */}
            <Box textAlign="center" mb={8}>
              <Heading 
                as="h1" 
                size="2xl" 
                bgGradient="linear(to-r, cyan.300, blue.400, purple.500)"
                bgClip="text"
                fontWeight="bold"
                mb={2}
              >
                Chrome UX Report Overview
              </Heading>
              <Text color="gray.400" fontSize="lg">
                Real-world performance metrics from Chrome users
              </Text>
            </Box>

            {/* Local Section */}
            <Box>
              <HStack mb={6} spacing={3}>
                <Box
                  h="1px"
                  flex="1"
                  bgGradient="linear(to-r, transparent, cyan.400, transparent)"
                />
                <Heading 
                  as="h2" 
                  size="lg" 
                  color="cyan.400"
                  textTransform="uppercase"
                  letterSpacing="wider"
                  fontSize="xl"
                >
                  Local Sites
                </Heading>
                <Box
                  h="1px"
                  flex="1"
                  bgGradient="linear(to-r, transparent, cyan.400, transparent)"
                />
              </HStack>
              <PerformanceMapLocal />
            </Box>

            {/* Divider */}
            <Box position="relative" py={4}>
              <Divider 
                borderColor="transparent"
                borderWidth="2px"
                borderStyle="solid"
                borderImage="linear-gradient(to right, transparent, rgba(0, 247, 255, 0.3), transparent) 1"
              />
            </Box>

            {/* Vertical Section */}
            <Box>
              <HStack mb={6} spacing={3}>
                <Box
                  h="1px"
                  flex="1"
                  bgGradient="linear(to-r, transparent, purple.400, transparent)"
                />
                <Heading 
                  as="h2" 
                  size="lg" 
                  color="purple.400"
                  textTransform="uppercase"
                  letterSpacing="wider"
                  fontSize="xl"
                >
                  Vertical Sites
                </Heading>
                <Box
                  h="1px"
                  flex="1"
                  bgGradient="linear(to-r, transparent, purple.400, transparent)"
                />
              </HStack>
              <PerformanceMapVertical />
            </Box>
          </VStack>
        </Box>
      </Box>
    </>
  );
};

export default CombinedPerformanceMaps;