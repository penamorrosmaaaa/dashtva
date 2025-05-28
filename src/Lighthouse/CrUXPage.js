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
} from "@chakra-ui/react";
import Papa from "papaparse";
import { FaExpand } from "react-icons/fa";
import Plot from "react-plotly.js";
import "./Lighthouse.css"; // Ensure this CSS file is imported
import MatrixRain from "./MatrixRain";

// ---
// Common Helper Functions (can be moved to a separate file if many components use them)
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
  const isoString = date.toISOString().split("T")[0]; // 'YYYY-MM-DD'
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
          color: "white", // Changed to white for dark background
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
        text: "",
        showarrow: true,
        arrowhead: 2,
        ax: 0,
        ay: -40,
        font: { color: "white" }, // Changed to white for dark background
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

// Local - Group “Local”
const LOCAL_GROUPS = {
  Local: [
    "QuintanaRoo", "Bajio", "CiudadJuarez", "Yucatan", "Jalisco", "Puebla",
    "Veracruz", "BajaCalifornia", "Morelos", "Guerrero", "Chiapas", "Sinaloa",
    "Aguascalientes", "Queretaro", "Chihuahua", "Laguna",
  ],
};
const LOCAL_GROUP_NAMES = Object.keys(LOCAL_GROUPS);
const LOCAL_INDIVIDUAL_COMPANIES = Object.values(LOCAL_GROUPS).flat();

// Local - Metrics (same as vertical, but defined here for local context)
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
        style={{ backgroundColor: "#2d3748", color: "#e2e8f0" }} // Dark background for options
      >
        Local
      </option>
    );

    LOCAL_INDIVIDUAL_COMPANIES.forEach((co) => {
      opts.push(
        <option
          key={co}
          value={co}
          style={{ backgroundColor: "#2d3748", color: "#e2e8f0" }} // Dark background for options
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

  const mostRecentDate = useMemo(() => {
    let allPoints = [];
    Object.values(plotlySeries).forEach((arr) => {
      allPoints = allPoints.concat(arr);
    });
    const dt = getMostRecentDate(allPoints);
    return dt;
  }, [plotlySeries]);


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
        status: "success",
        duration: 3000,
        isClosable: true,
        containerStyle: {
            backgroundColor: 'rgba(45, 55, 72, 0.9)', // Dark background for toast
            color: 'white',
        }
      });
    }
  };

  if (isLoading) {
    return (
      <Flex justifyContent="center" alignItems="center" height="200px" bg="transparent">
        <Spinner size="xl" color="white" /> {/* White spinner */}
        <Text ml={4} fontSize="lg" color="white"> {/* White text */}
          Loading Local data...
        </Text>
      </Flex>
    );
  }

  if (error) {
    return (
      <Flex justifyContent="center" alignItems="center" height="200px" bg="transparent">
        <Text color="red.400" fontSize="lg" textAlign="center"> {/* Red text for error */}
          {error}
        </Text>
      </Flex>
    );
  }

  return (
    <>
      <Flex
        direction="column"
        gap={4}
        width="100%"
        maxW="1200px"
        align="center"
        p={4}
        mx="auto"
        className="anb-chart-container" // Re-using styling from LocalScoresOverview
      >
        {/* Controls Row */}
        <Flex
          width="100%"
          justifyContent="flex-start"
          alignItems="center"
          flexWrap="wrap"
          gap={4}
          bg="transparent" // Transparent background for the flex container
        >
          {/* Company */}
          <Flex alignItems="center" gap={2}>
            <Text color="white" fontSize="md" fontWeight="semibold"> {/* White text */}
              Company:
            </Text>
            <Select
              value={selectedCompany}
              onChange={handleCompanyChange}
              width="200px"
              bg="rgba(255,255,255,0.1)"
              color="white"
              borderColor="rgba(255,255,255,0.2)"
              _hover={{ bg: 'rgba(255,255,255,0.15)' }}
              _focus={{ bg: 'rgba(255,255,255,0.15)' }}
              size="sm"
            >
              {companyOptions}
            </Select>
          </Flex>

          {/* Week */}
          <Flex alignItems="center" gap={2}>
            <Text color="white" fontSize="md" fontWeight="semibold"> {/* White text */}
              Week:
            </Text>
            <Select
              value={selectedWeek}
              onChange={handleWeekChange}
              placeholder="Select Week"
              width="200px"
              bg="rgba(255,255,255,0.1)"
              color="white"
              borderColor="rgba(255,255,255,0.2)"
              _hover={{ bg: 'rgba(255,255,255,0.15)' }}
              _focus={{ bg: 'rgba(255,255,255,0.15)' }}
              size="sm"
            >
              <option
                value="All Weeks"
                style={{ backgroundColor: "#2d3748", color: "#e2e8f0" }} // Dark background for options
              >
                All Weeks
              </option>
              {availableWeeks.map((wk) => (
                <option
                  key={wk}
                  value={wk}
                  style={{ backgroundColor: "#2d3748", color: "#e2e8f0" }} // Dark background for options
                >
                  {wk}
                </option>
              ))}
            </Select>
          </Flex>
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
          overflowX="auto"
          mt={4} // Added margin top for separation from controls
        >
          {LOCAL_METRICS.map((metric) => {
            const pts = plotlySeries[metric] || [];
            const trace = {
              x: pts.map((p) => p.date),
              y: pts.map((p) => p.value),
              type: "scatter",
              mode: "lines+markers",
              line: {
                color: "#00f7ff", // Aqua blue color for lines
                width: 2,
                shape: "linear",
              },
              marker: {
                size: 6,
                color: "#00f7ff", // Aqua blue color for markers
              },
              name: "All",
              hovertemplate: `
                <b>All</b><br>
                <b>Date:</b> %{x|%b %d}<br>
                <b>Value:</b> %{y} ${LOCAL_METRIC_UNITS[metric]}<extra></extra>
              `,
              connectgaps: true,
            };

            const avgVal = parseFloat(averages[metric]);
            const performance = getPerformanceCategory(metric, avgVal, LOCAL_THRESHOLDS);
            const performanceColor =
              performance === "Good"
                ? "#2BFFB9" // Good
                : performance === "Needs Improvement"
                ? "#FFA73D" // Needs Improvement
                : "#FF2965"; // Poor

            const { shapes, annotations } = getCurrentDateLineAndAnnotation(mostRecentDate);

            return (
              <Tooltip
                key={metric}
                label={
                  <>
                    <Text fontWeight="bold" color="white">{metric} Performance:</Text>
                    <Text color="white">
                      Good: ≤ {formatNumber(LOCAL_THRESHOLDS[metric].good)}
                      {LOCAL_METRIC_UNITS[metric]}
                    </Text>
                    <Text color="white">
                      Needs Improvement: ≤ {formatNumber(LOCAL_THRESHOLDS[metric].needsImprovement)}
                      {LOCAL_METRIC_UNITS[metric]}
                    </Text>
                    <Text color="white">
                      Poor: &gt; {formatNumber(LOCAL_THRESHOLDS[metric].needsImprovement)}
                      {LOCAL_METRIC_UNITS[metric]}
                    </Text>
                    <Box mt={2}>
                      <Text fontWeight="bold" color="white">What is {metric}?</Text>
                      <Text fontSize="sm" color="white">{LOCAL_METRIC_DEFINITIONS[metric]}</Text>
                    </Box>
                  </>
                }
                bg="rgba(45, 55, 72, 0.9)" // Dark transparent background
                color="white" // White text
                fontSize="sm"
                placement="top"
                hasArrow
              >
                <Box
                  className="anb-chart-container" // Apply common chart container style
                  p={3} // Adjust padding to match LocalScoresOverview
                  borderRadius="md"
                  minH="120px" // Adjust min height as needed
                  display="flex"
                  flexDirection="column"
                  justifyContent="space-between"
                  position="relative"
                >
                  <Flex direction="column" align="center">
                    {/* Title & Expand */}
                    <Flex width="100%" justifyContent="space-between" alignItems="center">
                      <Box
                        height="50px"
                        display="flex"
                        alignItems="center"
                        justifyContent="center"
                        textAlign="center"
                        flex="1"
                      >
                        <Text color="white" fontSize="sm" fontWeight="bold" isTruncated>
                          {metric}
                        </Text>
                      </Box>
                      <IconButton
                        aria-label="Expand Graph"
                        icon={<FaExpand />}
                        color="white" // White icon
                        bg="transparent"
                        _hover={{ bg: "rgba(255,255,255,0.1)" }} // Subtle hover
                        size="sm"
                        onClick={() => handleExpand([trace], metric)}
                      />
                    </Flex>

                    {/* Average & Performance */}
                    <Flex direction="column" justify="center" align="center" mt={2}>
                      <Text color="#00f7ff" fontSize="2xl" fontWeight="bold" textAlign="center"> {/* Aqua blue for score */}
                        {formatNumber(averages[metric])} {LOCAL_METRIC_UNITS[metric]}
                      </Text>
                      <Text color={performanceColor} fontSize="sm" fontWeight="bold" mt={1}>
                        {performance}
                      </Text>
                    </Flex>
                  </Flex>

                  {/* Plotly Graph */}
                  <Box mt={4} width="100%" height="150px" position="relative">
                    <Plot
                      data={[trace]}
                      layout={{
                        autosize: true,
                        margin: { l: 40, r: 10, t: 10, b: 30 },
                        xaxis: {
                          tickfont: { size: 10, color: "white" }, // White ticks
                          type: "date",
                          showgrid: false,
                          zeroline: false,
                          showline: false,
                          ticks: "",
                          tickformat: "%b %d",
                          dtick: "M1",
                          showticklabels: true,
                        },
                        yaxis: {
                          tickfont: { size: 10, color: "white" }, // White ticks
                          showgrid: false,
                          zeroline: false,
                          showline: false,
                          ticks: "",
                          showticklabels: true,
                          title: { text: "" },
                        },
                        shapes: shapes,
                        annotations: annotations,
                        showlegend: false,
                        hovermode: "closest",
                        paper_bgcolor: "transparent", // Transparent
                        plot_bgcolor: "transparent", // Transparent
                      }}
                      config={{
                        displayModeBar: false,
                        responsive: true,
                        hovermode: "closest",
                      }}
                      style={{ width: "100%", height: "100%" }}
                    />
                  </Box>
                </Box>
              </Tooltip>
            );
          })}
        </Grid>
      </Flex>

      {/* Expanded Modal */}
      <Modal isOpen={isOpen} onClose={onClose} size="xl" isCentered>
        <ModalOverlay />
        <ModalContent
          bg="rgba(45, 55, 72, 0.95)" // Dark, transparent background
          color="white" // White text
          border="1px solid rgba(255, 255, 255, 0.1)" // Subtle border
          boxShadow="0 8px 16px rgba(0, 0, 0, 0.2)" // Dark shadow
        >
          <ModalHeader color="#00f7ff">{modalMetric}</ModalHeader> {/* Aqua blue header */}
          <ModalCloseButton color="white" /> {/* White close button */}
          <ModalBody>
            {modalPlotData && (
              <Plot
                data={modalPlotData}
                layout={{
                  autosize: true,
                  margin: { l: 50, r: 50, t: 50, b: 50 },
                  xaxis: {
                    type: "date",
                    title: "Date",
                    tickformat: "%B %d, %Y",
                    dtick: "M1",
                    showticklabels: true,
                    titlefont: { size: 14, color: "white" }, // White text
                    tickfont: { size: 12, color: "white" }, // White text
                  },
                  yaxis: {
                    tickfont: { size: 12, color: "white" }, // White text
                    showgrid: true,
                    zeroline: false,
                    showline: false,
                    ticks: "",
                    showticklabels: true,
                    title: { text: "" },
                  },
                  showlegend: false,
                  hovermode: "closest",
                  paper_bgcolor: "transparent", // Transparent
                  plot_bgcolor: "transparent", // Transparent
                }}
                config={{
                  displayModeBar: true,
                  responsive: true,
                  hovermode: "closest",
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

// Vertical - Metrics (same as local)
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

// Colors (originally for traces)
const COLORS_TV_AZTECA = {
  phone: "#00f7ff",    // Aqua Blue for phone (consistent with LocalOverview)
  desktop: "#4A6CF7", // A slightly different blue for desktop if desired, or keep #00f7ff
};
const COLORS_COMPETITORS = {
  phone: "#FF3B3B",    // Red for phone (different from TV Azteca)
  desktop: "#F2C744", // Yellow for desktop (different from TV Azteca)
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
        <option style={{ backgroundColor: "#2d3748", color: "#e2e8f0" }} key={group} value={group}>
          {group}
        </option>
      );
    });
    VERTICAL_INDIVIDUAL_COMPANIES.forEach((company) => {
      options.push(
        <option style={{ backgroundColor: "#2d3748", color: "#e2e8f0" }} key={company} value={company}>
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

  const mostRecentDate = useMemo(() => {
    if (!filteredDataAllTime.length) return null;
    let maxDt = new Date(0);
    filteredDataAllTime.forEach((r) => {
      const d = parseDate(r.endDate);
      if (d > maxDt) {
        maxDt = d;
      }
    });
    return maxDt.getTime() === 0 ? null : maxDt;
  }, [filteredDataAllTime]);

  const isAztecaSelection =
    selectedCompany === "TV Azteca" || selectedCompany === "TV Azteca Companies";
  const getColor = (isAzteca, formFactor) => {
    if (isAzteca) return COLORS_TV_AZTECA[formFactor];
    return COLORS_COMPETITORS[formFactor];
  };

  const handleExpand = (plotData, metric) => {
    setModalPlotData(plotData);
    setModalMetric(metric);
    onOpen();
  };

  if (isLoading) {
    return (
      <Flex justifyContent="center" alignItems="center" height="200px" bg="transparent">
        <Spinner size="xl" color="white" /> {/* White spinner */}
        <Text ml={4} fontSize="lg" color="white"> {/* White text */}
          Loading Vertical data...
        </Text>
      </Flex>
    );
  }

  if (error) {
    return (
      <Flex justifyContent="center" alignItems="center" height="200px" bg="transparent">
        <Text color="red.400" fontSize="lg" textAlign="center"> {/* Red text for error */}
          {error}
        </Text>
      </Flex>
    );
  }

  return (
    <Flex
      direction="column"
      gap={4}
      width="100%"
      maxW="1200px"
      align="center"
      p={4}
      mx="auto"
      className="anb-chart-container" // Re-using styling from LocalScoresOverview
    >
      {/* Header: Company, Week, Form Factor */}
      <Flex
        width="100%"
        justifyContent="flex-start"
        alignItems="center"
        flexWrap="wrap"
        gap={4}
        bg="transparent" // Transparent background
      >
        {/* Company Selector */}
        <Flex alignItems="center" gap={2}>
          <Text color="white" fontSize="md" fontWeight="semibold"> {/* White text */}
            Company:
          </Text>
          <Select
            value={selectedCompany}
            onChange={(e) => setSelectedCompany(e.target.value)}
            width="200px"
            bg="rgba(255,255,255,0.1)"
            color="white"
            borderColor="rgba(255,255,255,0.2)"
            _hover={{ bg: 'rgba(255,255,255,0.15)' }}
            _focus={{ bg: 'rgba(255,255,255,0.15)' }}
            size="sm"
          >
            {companyOptions}
          </Select>
        </Flex>

        {/* Week and Form Factor Selectors */}
        <Flex alignItems="center" gap={2}>
          <Text color="white" fontSize="md" fontWeight="semibold"> {/* White text */}
            Week:
          </Text>
          <Select
            value={selectedWeekRange}
            onChange={(e) => setSelectedWeekRange(e.target.value)}
            width="200px"
            bg="rgba(255,255,255,0.1)"
            color="white"
            borderColor="rgba(255,255,255,0.2)"
            _hover={{ bg: 'rgba(255,255,255,0.15)' }}
            _focus={{ bg: 'rgba(255,255,255,0.15)' }}
            size="sm"
          >
            {weekOptions.map((week) => (
              <option style={{ backgroundColor: "#2d3748", color: "#e2e8f0" }} key={week} value={week}>
                {week}
              </option>
            ))}
          </Select>

          <Text color="white" fontSize="md" fontWeight="semibold"> {/* White text */}
            Form Factor:
          </Text>
          <Select
            value={selectedFormFactor}
            onChange={(e) => setSelectedFormFactor(e.target.value)}
            width="200px"
            bg="rgba(255,255,255,0.1)"
            color="white"
            borderColor="rgba(255,255,255,0.2)"
            _hover={{ bg: 'rgba(255,255,255,0.15)' }}
            _focus={{ bg: 'rgba(255,255,255,0.15)' }}
            size="sm"
          >
            <option style={{ backgroundColor: "#2d3748", color: "#e2e8f0" }} value="phone">
              Mobile
            </option>
            <option style={{ backgroundColor: "#2d3748", color: "#e2e8f0" }} value="desktop">
              Desktop
            </option>
          </Select>
        </Flex>
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
        overflowX="auto"
        mt={4} // Added margin top for separation from controls
      >
        {VERTICAL_METRICS.map((metric) => {
          const seriesData = plotlyData[metric] || [];
          const trace = {
            x: seriesData.map((pt) => pt.date),
            y: seriesData.map((pt) => pt.value),
            type: "scatter",
            mode: "lines+markers",
            line: {
              color: getColor(isAztecaSelection, selectedFormFactor),
              width: 2,
              shape: "linear",
            },
            marker: {
              size: 6,
              color: getColor(isAztecaSelection, selectedFormFactor),
            },
            name:
              selectedFormFactor === "phone"
                ? "Mobile"
                : "Desktop",
            hovertemplate: `
                <b>${selectedFormFactor === "phone" ? "Mobile" : "Desktop"}</b><br>
                <b>Date:</b> %{x|%b %d}<br>
                <b>Value:</b> %{y} ${VERTICAL_METRIC_UNITS[metric]}<extra></extra>
              `,
            connectgaps: true,
          };

          const avgVal = parseFloat(averages[metric] || "NaN");
          const performance = getPerformanceCategory(metric, avgVal, VERTICAL_THRESHOLDS);
          const performanceColor =
            performance === "Good"
              ? "#2BFFB9" // Good
              : performance === "Needs Improvement"
              ? "#FFA73D" // Needs Improvement
              : "#FF2965"; // Poor

          const { shapes, annotations } = getCurrentDateLineAndAnnotation(mostRecentDate);

          return (
            <Tooltip
              key={metric}
              label={
                <>
                  <Text fontWeight="bold" color="white">
                    {metric} Performance:
                  </Text>
                  <Text color="white">{VERTICAL_METRIC_DESCRIPTIONS[metric]}</Text>
                  <Text color="white">
                    Good: ≤ {formatNumber(VERTICAL_THRESHOLDS[metric].good)}
                    {VERTICAL_METRIC_UNITS[metric]}
                  </Text>
                  <Text color="white">
                    Needs Improvement: ≤{" "}
                    {formatNumber(VERTICAL_THRESHOLDS[metric].needsImprovement)}
                    {VERTICAL_METRIC_UNITS[metric]}
                  </Text>
                  <Text color="white">
                    Poor: &gt; {formatNumber(VERTICAL_THRESHOLDS[metric].needsImprovement)}
                    {VERTICAL_METRIC_UNITS[metric]}
                  </Text>
                </>
              }
              bg="rgba(45, 55, 72, 0.9)" // Dark transparent background
              color="white" // White text
              fontSize="sm"
              placement="top"
              hasArrow
            >
              <Box
                className="anb-chart-container" // Apply common chart container style
                p={3} // Adjust padding to match LocalScoresOverview
                borderRadius="md"
                minH="120px" // Adjust min height as needed
                display="flex"
                flexDirection="column"
                justifyContent="space-between"
                position="relative"
              >
                <Flex direction="column" align="center">
                  {/* Title & Expand */}
                  <Flex
                    width="100%"
                    justifyContent="space-between"
                    alignItems="center"
                  >
                    <Box
                      height="50px"
                      display="flex"
                      alignItems="center"
                      justifyContent="center"
                      textAlign="center"
                      flex="1"
                    >
                      <Text color="white" fontSize="sm" fontWeight="bold" isTruncated>
                        {metric}
                      </Text>
                    </Box>
                    <IconButton
                      aria-label="Expand Graph"
                      icon={<FaExpand />}
                      color="white" // White icon
                      bg="transparent"
                      _hover={{ bg: "rgba(255,255,255,0.1)" }} // Subtle hover
                      size="sm"
                      onClick={() => handleExpand([trace], metric)}
                    />
                  </Flex>

                  {/* Averages + Performance */}
                  <Flex direction="column" justify="center" align="center" mt={2}>
                    <Text color="#00f7ff" fontSize="2xl" fontWeight="bold" textAlign="center"> {/* Aqua blue for score */}
                      {formatNumber(averages[metric])} {VERTICAL_METRIC_UNITS[metric]}
                    </Text>
                    <Text color={performanceColor} fontSize="sm" fontWeight="bold" mt={1}>
                      {performance}
                    </Text>
                  </Flex>
                </Flex>

                {/* Graph */}
                <Box mt={4} width="100%" height="150px" position="relative">
                  <Plot
                    data={[trace]}
                    layout={{
                      autosize: true,
                      margin: { l: 40, r: 10, t: 10, b: 30 },
                      xaxis: {
                        tickfont: { size: 10, color: "white" }, // White ticks
                        type: "date",
                        showgrid: false,
                        zeroline: false,
                        showline: false,
                        ticks: "",
                        tickformat: "%b %d",
                        dtick: "M1",
                        showticklabels: true,
                      },
                      yaxis: {
                        tickfont: { size: 10, color: "white" }, // White ticks
                        showgrid: false,
                        zeroline: false,
                        showline: false,
                        ticks: "",
                        showticklabels: true,
                        title: { text: "" },
                      },
                      shapes: shapes,
                      annotations: annotations,
                      showlegend: false,
                      hovermode: "closest",
                      paper_bgcolor: "transparent", // Transparent
                      plot_bgcolor: "transparent", // Transparent
                    }}
                    config={{
                      displayModeBar: false,
                      responsive: true,
                      hovermode: "closest",
                    }}
                    style={{ width: "100%", height: "100%" }}
                  />
                </Box>
              </Box>
            </Tooltip>
          );
        })}
      </Grid>

      {/* Modal for expanded graph (shared modal for both components) */}
      <Modal isOpen={isOpen} onClose={onClose} size="xl" isCentered>
        <ModalOverlay />
        <ModalContent
          bg="rgba(45, 55, 72, 0.95)" // Dark, transparent background
          color="white" // White text
          border="1px solid rgba(255, 255, 255, 0.1)" // Subtle border
          boxShadow="0 8px 16px rgba(0, 0, 0, 0.2)" // Dark shadow
        >
          <ModalHeader color="#00f7ff">{modalMetric}</ModalHeader> {/* Aqua blue header */}
          <ModalCloseButton color="white" /> {/* White close button */}
          <ModalBody>
            {modalPlotData && (
              <Plot
                data={modalPlotData}
                layout={{
                  autosize: true,
                  margin: { l: 50, r: 50, t: 50, b: 50 },
                  xaxis: {
                    type: "date",
                    title: "Date",
                    tickformat: "%B %d, %Y",
                    dtick: "M1",
                    showticklabels: true,
                    titlefont: { size: 14, color: "white" }, // White text
                    tickfont: { size: 12, color: "white" }, // White text
                  },
                  yaxis: {
                    tickfont: { size: 12, color: "white" }, // White text
                    showgrid: true,
                    zeroline: false,
                    showline: false,
                    ticks: "",
                    showticklabels: true,
                    title: { text: "" },
                  },
                  showlegend: false,
                  hovermode: "closest",
                  paper_bgcolor: "transparent", // Transparent
                  plot_bgcolor: "transparent", // Transparent
                }}
                config={{
                  displayModeBar: true,
                  responsive: true,
                  hovermode: "closest",
                }}
                style={{ width: "100%", height: "500px" }}
              />
            )}
          </ModalBody>
        </ModalContent>
      </Modal>
    </Flex>
  );
};


// ---
const CombinedPerformanceMaps = () => {
  return (
    <>
      <MatrixRain />
      <Box pt="100px" px={6} className="glass-bg">
        <Heading as="h1" size="xl" mb={6} className="title">
          CrUX Overview
        </Heading>

        <Heading as="h2" size="lg" mt={10} mb={4} ml={4} className="anb-chart-title" textAlign="left">
          LOCAL
        </Heading>
        <PerformanceMapLocal />

        <Divider my={10} borderColor="rgba(255,255,255,0.2)" />

        <Heading as="h2" size="lg" mt={10} mb={4} ml={4} className="anb-chart-title" textAlign="left">
          VERTICAL
        </Heading>
        <PerformanceMapVertical />
      </Box>
    </>
  );
};

export default CombinedPerformanceMaps;
