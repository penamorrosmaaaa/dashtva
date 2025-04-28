/* src/NewPage/NewPage.js */
import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Box,
  Text,
  Flex,
  Button,
  Select,
  Grid,
  Checkbox,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  useToast,
  Tag,
  TagLabel,
  TagCloseButton,
  Collapse,
  useBreakpointValue,
} from "@chakra-ui/react";
import { ChevronUpIcon, ChevronDownIcon } from "@chakra-ui/icons";
import Papa from "papaparse";
import Plot from "react-plotly.js";

const parseDateString = (dateStr) => {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  return isNaN(d) ? null : d;
};

const formatDate = (dateStr) => {
  const d = new Date(dateStr);
  if (isNaN(d)) return "Invalid Date";
  return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
};

const formatNumber = (val) => {
  if (val == null || isNaN(val)) return "-";
  return Number(val).toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
};

const NewPage = () => {
  const [eventData, setEventData] = useState([]);
  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Year Filter
  const [yearFilter, setYearFilter] = useState("All");

  // Distribution / Pie
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedSubcategory, setSelectedSubcategory] = useState("All");

  // Table
  const [tableCategoryFilter, setTableCategoryFilter] = useState("All");
  const [tableSubcategoryFilter, setTableSubcategoryFilter] = useState("All");
  const [isTableExpanded, setIsTableExpanded] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);
  const [isPieChartVisible, setIsPieChartVisible] = useState(false);

  // Compare
  const [compareMode, setCompareMode] = useState(false);
  const [selectedCompareEvents, setSelectedCompareEvents] = useState([]);

  // Timeline Range (optional)
  const [timelineRange, setTimelineRange] = useState({ start: null, end: null });

  // Metrics Box
  const [metricsType, setMetricsType] = useState("Average");

  // Line Graph
  const [selectedGraphOption, setSelectedGraphOption] = useState("TOTAL");
  const [selectedEvents, setSelectedEvents] = useState([]);
  const pieChartRef = useRef(null);

  const toast = useToast();

  // Two CSV URLs (2024 & 2025)
  const CSV_2024_URL =
    "https://docs.google.com/spreadsheets/d/1oaMzcoyGzpY8Wg8EL8wlLtb4OHWzExOu/pub?gid=192670985&single=true&output=csv";
  const CSV_2025_URL =
    "https://docs.google.com/spreadsheets/d/1oaMzcoyGzpY8Wg8EL8wlLtb4OHWzExOu/pub?gid=1426605172&single=true&output=csv";

  const fetchCSVData = async (csvUrl) => {
    const res = await fetch(csvUrl);
    if (!res.ok) throw new Error(`Failed to fetch CSV: ${res.statusText}`);
    const text = await res.text();
    const parsed = Papa.parse(text, { header: false, skipEmptyLines: true });
    if (parsed.errors.length > 0) {
      console.error("CSV Parsing Errors:", parsed.errors);
      throw new Error("Error parsing CSV data.");
    }
    return parsed.data;
  };

  useEffect(() => {
    const fetchAll = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const [data2024, data2025] = await Promise.all([
          fetchCSVData(CSV_2024_URL),
          fetchCSVData(CSV_2025_URL),
        ]);
        const p2024 = processSheetData(data2024, "2024");
        const p2025 = processSheetData(data2025, "2025");
        const combined = [...p2024, ...p2025];
        combined.sort((a, b) => new Date(b.eventDate) - new Date(a.eventDate));
        setEventData(combined);

        // unique categories
        const uniqueCats = Array.from(new Set(combined.map((d) => d.category))).sort();
        setCategories(uniqueCats);
      } catch (err) {
        setError(err.message);
        toast({
          title: "Error",
          description: err.message,
          status: "error",
          duration: 5000,
          isClosable: true,
        });
      } finally {
        setIsLoading(false);
      }
    };
    fetchAll();
  }, [CSV_2024_URL, CSV_2025_URL, toast]);

  const processSheetData = (rows, defaultYear) => {
    const dataRows = rows.slice(5);
    const parsed = [];
    dataRows.forEach((row, i) => {
      try {
        const cat = row[3]?.trim();
        if (!cat) return; // skip empty
        const dateStr = row[5]?.trim();
        const eDate = parseDateString(dateStr);
        const yearVal = eDate ? eDate.getFullYear().toString() : defaultYear;

        const eventName = row[6]?.trim() || "";
        const eventDesc = row[7]?.trim() || "";
        const siteUsers = row[12]?.trim();
        const appsUsers = row[13]?.trim();
        const subtotal = row[14]?.trim();
        const ctv = row[15]?.trim();
        const total = row[16]?.trim();
        const aprov = row[18]?.trim();

        const wNum = row[2] ? parseInt(row[2], 10) : 0;
        const parsedSite = siteUsers ? parseFloat(siteUsers.replace(/,/g, "")) || 0 : 0;
        const parsedApps = appsUsers ? parseFloat(appsUsers.replace(/,/g, "")) || 0 : 0;

        let subVal = subtotal && subtotal !== "-" 
          ? parseFloat(subtotal.replace(/,/g, "")) || (parsedSite + parsedApps)
          : parsedSite + parsedApps;

        let ctvVal = ctv && ctv !== "-" ? parseFloat(ctv.replace(/,/g, "")) : 0;
        let totalVal = total && total !== "-" 
          ? parseFloat(total.replace(/,/g, "")) 
          : subVal + ctvVal;
        let aprovVal = aprov && aprov !== "-" 
          ? parseFloat(aprov.replace(/,/g, "")) 
          : null;

        parsed.push({
          id: `${eventName}-${dateStr}-${cat}-${i}-${defaultYear}`,
          weekNumber: wNum,
          category: cat,
          subcategory: row[4]?.trim() || "N/A",
          eventDate: eDate ? eDate.toISOString().split("T")[0] : "N/A",
          eventName,
          eventDescription: eventDesc,
          siteUsers: parsedSite,
          appsUsers: parsedApps,
          subtotal: subVal,
          ctv: ctvVal,
          total: totalVal,
          aprov: aprovVal,
          year: yearVal,
        });
      } catch (err) {
        console.error("Row error:", err);
      }
    });
    return parsed;
  };

  // Year Filter
  const yearFilteredData = useMemo(() => {
    if (yearFilter === "All") return eventData;
    return eventData.filter((d) => d.year === yearFilter);
  }, [eventData, yearFilter]);

  // subcategories for distribution
  const subcategories = useMemo(() => {
    if (selectedCategory === "All") {
      return Array.from(new Set(eventData.map((d) => d.subcategory))).sort();
    }
    return Array.from(
      new Set(
        eventData
          .filter((d) => d.category === selectedCategory)
          .map((x) => x.subcategory)
      )
    ).sort();
  }, [eventData, selectedCategory]);

  // category colors
  const categoryColors = useMemo(() => {
    const palette = [
      "blue.600",
      "green.600",
      "purple.600",
      "orange.600",
      "teal.600",
      "red.600",
      "yellow.600",
      "pink.600",
      "cyan.600",
      "gray.600",
      "indigo.600",
    ];
    const map = {};
    categories.forEach((cat, idx) => {
      map[cat] = palette[idx % palette.length];
    });
    return map;
  }, [categories]);

  // distribution filter
  const distributionFilteredData = useMemo(() => {
    let data = [...yearFilteredData];
    if (selectedCategory !== "All") {
      data = data.filter((d) => d.category === selectedCategory);
    }
    if (selectedSubcategory !== "All") {
      data = data.filter((d) => d.subcategory === selectedSubcategory);
    }
    if (timelineRange.start) {
      data = data.filter(
        (d) => new Date(d.eventDate) >= new Date(timelineRange.start)
      );
    }
    if (timelineRange.end) {
      data = data.filter(
        (d) => new Date(d.eventDate) <= new Date(timelineRange.end)
      );
    }
    return data;
  }, [yearFilteredData, selectedCategory, selectedSubcategory, timelineRange]);

  // table filter
  const tableFilteredData = useMemo(() => {
    let data = [...yearFilteredData];
    if (tableCategoryFilter !== "All") {
      data = data.filter((d) => d.category === tableCategoryFilter);
    }
    if (tableSubcategoryFilter !== "All") {
      data = data.filter((d) => d.subcategory === tableSubcategoryFilter);
    }
    if (timelineRange.start) {
      data = data.filter(
        (d) => new Date(d.eventDate) >= new Date(timelineRange.start)
      );
    }
    if (timelineRange.end) {
      data = data.filter(
        (d) => new Date(d.eventDate) <= new Date(timelineRange.end)
      );
    }
    data.sort((a, b) => new Date(b.eventDate) - new Date(a.eventDate));
    return data;
  }, [
    yearFilteredData,
    tableCategoryFilter,
    tableSubcategoryFilter,
    timelineRange,
  ]);

  // distribution stats
  const totalApps = useMemo(() => 
    distributionFilteredData.reduce((acc, d) => acc + d.appsUsers, 0)
  , [distributionFilteredData]);
  const totalSites = useMemo(() => 
    distributionFilteredData.reduce((acc, d) => acc + d.siteUsers, 0)
  , [distributionFilteredData]);
  const totalCtv = useMemo(() => 
    distributionFilteredData.reduce((acc, d) => acc + d.ctv, 0)
  , [distributionFilteredData]);
  const totalSubtotal = useMemo(() => 
    distributionFilteredData.reduce((acc, d) => acc + d.subtotal, 0)
  , [distributionFilteredData]);
  const totalTotal = useMemo(() => 
    distributionFilteredData.reduce((acc, d) => acc + d.total, 0)
  , [distributionFilteredData]);

  const averageAprov = useMemo(() => {
    const arr = distributionFilteredData
      .map((d) => d.aprov)
      .filter((val) => val !== null && val !== 0);
    if (!arr.length) return "0";
    const sum = arr.reduce((s, v) => s + v, 0);
    return formatNumber(sum / arr.length);
  }, [distributionFilteredData]);

  const averageSubtotal = useMemo(() => {
    if (!distributionFilteredData.length) return "0";
    const sum = distributionFilteredData.reduce((a, d) => a + d.subtotal, 0);
    return formatNumber(sum / distributionFilteredData.length);
  }, [distributionFilteredData]);
  
  const averageTotal = useMemo(() => {
    if (!distributionFilteredData.length) return "0";
    const sum = distributionFilteredData.reduce((a, d) => a + d.total, 0);
    return formatNumber(sum / distributionFilteredData.length);
  }, [distributionFilteredData]);
  
  const averageCtv = useMemo(() => {
    const arr = distributionFilteredData
      .map((d) => d.ctv)
      .filter((v) => v > 0);
    if (!arr.length) return "0";
    const sum = arr.reduce((s, v) => s + v, 0);
    return formatNumber(sum / arr.length);
  }, [distributionFilteredData]);

  const totalAprov = useMemo(() => {
    const arr = distributionFilteredData
      .map((d) => d.aprov)
      .filter((v) => v !== null);
    if (!arr.length) return "0";
    const sum = arr.reduce((s, v) => s + v, 0);
    return formatNumber(sum);
  }, [distributionFilteredData]);

  const pieData = useMemo(() => [
    {
      values: [totalApps, totalSites, totalCtv],
      labels: ["APPS'", "SITE", "CTV"],
      type: "pie",
      marker: {
        colors: ["#36a2eb", "#ff6384", "#ffce56"],
      },
      hoverinfo: "label+percent",
      textinfo: "label+value",
      textposition: "inside",
      textfont: {
        color: "white",
        size: 14,
        family: "Arial",
        weight: "bold",
      },
    },
  ], [totalApps, totalSites, totalCtv]);

  const averageApps = useMemo(() => {
    if (!distributionFilteredData.length) return "0";
    return formatNumber(totalApps / distributionFilteredData.length);
  }, [totalApps, distributionFilteredData]);

  const averageSites = useMemo(() => {
    if (!distributionFilteredData.length) return "0";
    return formatNumber(totalSites / distributionFilteredData.length);
  }, [totalSites, distributionFilteredData]);

  // line graph data
  const lineGraphData = useMemo(() => {
    const sorted = [...yearFilteredData].sort(
      (a, b) => new Date(a.eventDate) - new Date(b.eventDate)
    );
    return {
      dates: sorted.map((d) => d.eventDate),
      APPS: sorted.map((d) => d.appsUsers),
      SITE: sorted.map((d) => d.siteUsers),
      CTV: sorted.map((d) => d.ctv),
      SUBTOTAL: sorted.map((d) => d.subtotal),
      TOTAL: sorted.map((d) => d.total),
      events: sorted,
    };
  }, [yearFilteredData]);

  // table displayed data
  const recentEvents = useMemo(() => tableFilteredData.slice(0, 5), [tableFilteredData]);
  const displayedTableData = useMemo(
    () => (isTableExpanded ? tableFilteredData : recentEvents),
    [isTableExpanded, tableFilteredData, recentEvents]
  );

  const handleRowClick = (row) => {
    if (selectedRow && selectedRow.id === row.id) {
      setSelectedRow(null);
      setIsPieChartVisible(false);
    } else {
      setSelectedRow(row);
      setIsPieChartVisible(true);
      setTimeout(() => {
        if (pieChartRef.current) {
          pieChartRef.current.scrollIntoView({ behavior: "smooth" });
        }
      }, 100);
    }
  };

  const handleCompareSelection = (rowId) => {
    if (selectedCompareEvents.includes(rowId)) {
      setSelectedCompareEvents(selectedCompareEvents.filter((x) => x !== rowId));
    } else {
      setSelectedCompareEvents([...selectedCompareEvents, rowId]);
    }
  };
  const handleCompare = () => {
    if (selectedCompareEvents.length < 2) {
      toast({
        title: "Insufficient Selection",
        description: "Please select at least two events to compare.",
        status: "warning",
        duration: 3000,
        isClosable: true,
      });
      return;
    }
    setCompareMode(true);
  };
  const handleCancelCompare = () => {
    setCompareMode(false);
    setSelectedCompareEvents([]);
  };

  // line graph selection
  const handleEventSelection = (e) => {
    const val = e.target.value;
    if (val && !selectedEvents.includes(val)) {
      setSelectedEvents([...selectedEvents, val]);
    }
  };
  const handleRemoveSelectedEvent = (eventId) => {
    setSelectedEvents(selectedEvents.filter((id) => id !== eventId));
  };

  // build main traces for "ALL"
  function getMainTracesForAll() {
    const traceAPPS = {
      x: lineGraphData.dates,
      y: lineGraphData.APPS,
      type: "scatter",
      mode: "lines+markers",
      name: "APPS'",
      line: { color: "#36a2eb" },
      fill: "tozeroy",
      fillcolor: "#36a2eb33",
      marker: { color: "white", size: 6 },
      hoverinfo: "text",
      hovertext: lineGraphData.events.map(
        (e) => `${e.eventDescription} - ${formatDate(e.eventDate)}: ${formatNumber(e.appsUsers)}`
      ),
      hovertemplate: "%{hovertext}<extra></extra>",
    };
    const traceSITE = {
      x: lineGraphData.dates,
      y: lineGraphData.SITE,
      type: "scatter",
      mode: "lines+markers",
      name: "SITE",
      line: { color: "#ff6384" },
      fill: "tozeroy",
      fillcolor: "#ff638433",
      marker: { color: "white", size: 6 },
      hoverinfo: "text",
      hovertext: lineGraphData.events.map(
        (e) => `${e.eventDescription} - ${formatDate(e.eventDate)}: ${formatNumber(e.siteUsers)}`
      ),
      hovertemplate: "%{hovertext}<extra></extra>",
    };
    const traceCTV = {
      x: lineGraphData.dates,
      y: lineGraphData.CTV,
      type: "scatter",
      mode: "lines+markers",
      name: "CTV",
      line: { color: "#ffce56" },
      fill: "tozeroy",
      fillcolor: "#ffce5633",
      marker: { color: "white", size: 6 },
      hoverinfo: "text",
      hovertext: lineGraphData.events.map((e) => {
        const val = e.ctv > 0 ? formatNumber(e.ctv) : "-";
        return `${e.eventDescription} - ${formatDate(e.eventDate)}: ${val}`;
      }),
      hovertemplate: "%{hovertext}<extra></extra>",
    };
    return [traceAPPS, traceSITE, traceCTV];
  }

  // build main trace single
  function getMainTraceSingle(metricData, color, name) {
    return {
      x: lineGraphData.dates,
      y: metricData,
      type: "scatter",
      mode: "lines+markers",
      name,
      line: { color },
      fill: "tozeroy",
      fillcolor: color ? `${color}33` : null,
      marker: { color: "white", size: 6 },
      hoverinfo: "text",
      hovertext: lineGraphData.events.map((e, idx) => {
        const val = metricData[idx];
        return `${e.eventDescription} - ${formatDate(e.eventDate)}: ${formatNumber(val)}`;
      }),
      hovertemplate: "%{hovertext}<extra></extra>",
    };
  }

  // build selected traces
  function getSelectedTraces() {
    const selectedEventData = selectedEvents
      .map((id) => lineGraphData.events.find((ev) => ev.id === id))
      .filter(Boolean)
      .sort((a, b) => new Date(a.eventDate) - new Date(b.eventDate));

    // if "ALL", produce 3 lines per event
    if (selectedGraphOption === "ALL") {
      const lines = [];
      selectedEventData.forEach((evt) => {
        // APPS
        lines.push({
          x: [evt.eventDate],
          y: [evt.appsUsers],
          type: "scatter",
          mode: "markers+lines",
          name: `${evt.eventDescription} (${formatDate(evt.eventDate)}) - APPS'`,
          line: { color: "#36a2eb" },
          marker: { color: "white", size: 8 },
          hovertemplate:
            `${evt.eventDescription} - ${formatDate(evt.eventDate)}:<br>` + 
            `APPS': ${formatNumber(evt.appsUsers)}<extra></extra>`,
        });
        // SITE
        lines.push({
          x: [evt.eventDate],
          y: [evt.siteUsers],
          type: "scatter",
          mode: "markers+lines",
          name: `${evt.eventDescription} (${formatDate(evt.eventDate)}) - SITE`,
          line: { color: "#ff6384" },
          marker: { color: "white", size: 8 },
          hovertemplate:
            `${evt.eventDescription} - ${formatDate(evt.eventDate)}:<br>` + 
            `SITE: ${formatNumber(evt.siteUsers)}<extra></extra>`,
        });
        // CTV
        lines.push({
          x: [evt.eventDate],
          y: [evt.ctv],
          type: "scatter",
          mode: "markers+lines",
          name: `${evt.eventDescription} (${formatDate(evt.eventDate)}) - CTV`,
          line: { color: "#ffce56" },
          marker: { color: "white", size: 8 },
          hovertemplate:
            `${evt.eventDescription} - ${formatDate(evt.eventDate)}:<br>` + 
            `CTV: ${evt.ctv > 0 ? formatNumber(evt.ctv) : "-"}<extra></extra>`,
        });
      });
      return lines;
    } else {
      // one metric => single line connecting the chosen events
      const yVals = selectedEventData.map((evt) => {
        switch (selectedGraphOption) {
          case "APPS":     return evt.appsUsers;
          case "SITE":     return evt.siteUsers;
          case "CTV":      return evt.ctv;
          case "SUBTOTAL": return evt.subtotal;
          case "TOTAL":    return evt.total;
          default:         return 0;
        }
      });
      return [
        {
          x: selectedEventData.map((ev) => ev.eventDate),
          y: yVals,
          type: "scatter",
          mode: "lines+markers",
          name: "Selected Events",
          line: { color: "#ff6347" },
          fill: "tozeroy",
          fillcolor: "#ff634733",
          marker: { color: "white", size: 8 },
          hoverinfo: "text",
          hovertext: selectedEventData.map((ev, idx) => {
            const val = yVals[idx];
            return `${ev.eventDescription} (${formatDate(ev.eventDate)}): ${formatNumber(val)}`;
          }),
          hovertemplate: "%{hovertext}<extra></extra>",
        },
      ];
    }
  }

  const plotData = useMemo(() => {
    if (selectedGraphOption === "ALL") {
      // if no selected events => show 3 lines for entire dataset
      if (!selectedEvents.length) {
        return getMainTracesForAll();
      } else {
        // show only selected events lines
        return getSelectedTraces();
      }
    } else {
      // single metric
      let color = "#9966FF";
      let name = "TOTAL";
      let metricArr = lineGraphData.TOTAL;
      if (selectedGraphOption === "APPS") {
        color = "#36a2eb";
        name = "APPS'";
        metricArr = lineGraphData.APPS;
      } else if (selectedGraphOption === "SITE") {
        color = "#ff6384";
        name = "SITE";
        metricArr = lineGraphData.SITE;
      } else if (selectedGraphOption === "CTV") {
        color = "#ffce56";
        name = "CTV";
        metricArr = lineGraphData.CTV;
      } else if (selectedGraphOption === "SUBTOTAL") {
        color = "#4BC0C0";
        name = "SUBTOTAL (APPS + SITE)";
        metricArr = lineGraphData.SUBTOTAL;
      }
      const mainTrace = getMainTraceSingle(metricArr, color, name);

      if (!selectedEvents.length) {
        return [mainTrace];
      } else {
        // only selected events
        return getSelectedTraces();
      }
    }
  }, [
    selectedGraphOption,
    selectedEvents,
    lineGraphData,
    getMainTracesForAll,
    getSelectedTraces,
  ]);

  const comparisonData = useMemo(() => {
    if (selectedCompareEvents.length < 2) return null;
    const evts = yearFilteredData.filter((x) => selectedCompareEvents.includes(x.id));
    if (evts.length < 2) return null;

    const base = evts[0];
    const comps = evts.slice(1).map((evt) => {
      const appsChange =
        base.appsUsers === 0
          ? 0
          : ((evt.appsUsers - base.appsUsers) / base.appsUsers) * 100;
      const siteChange =
        base.siteUsers === 0
          ? 0
          : ((evt.siteUsers - base.siteUsers) / base.siteUsers) * 100;
      const ctvChange =
        base.ctv === 0
          ? 0
          : ((evt.ctv - base.ctv) / base.ctv) * 100;
      const subtotalChange =
        base.subtotal === 0
          ? 0
          : ((evt.subtotal - base.subtotal) / base.subtotal) * 100;
      const totalChange =
        base.total === 0
          ? 0
          : ((evt.total - base.total) / base.total) * 100;

      return {
        eventName: evt.eventName,
        eventDate: evt.eventDate,
        appsChange: appsChange.toFixed(0),
        siteChange: siteChange.toFixed(0),
        ctvChange: ctvChange.toFixed(0),
        subtotalChange: subtotalChange.toFixed(0),
        totalChange: totalChange.toFixed(0),
        eventId: evt.id,
      };
    });
    return { baseEvent: base, comparisons: comps };
  }, [selectedCompareEvents, yearFilteredData]);

  const gridTemplateColumns = useBreakpointValue({ base: "1fr", md: "1fr 1fr" });
  const plotHeight = useBreakpointValue({ base: 300, md: 500, lg: 600 });
  const piePlotWidth = useBreakpointValue({ base: 300, md: 500, lg: 600 });
  const piePlotHeight = useBreakpointValue({ base: 300, md: 500, lg: 600 });

  return (
    <Box p={0} minH="100vh" color="white" display="flex" flexDirection="column" alignItems="center">
      <Flex direction="column" width="100%" maxW="1200px">
        {/* TABLE SECTION */}
        {!isLoading && !error && (
          <Box
            bg="linear-gradient(90deg, #000000, #7800ff)"
            borderRadius="20px"
            p={[4, 6]}
            border="2.5px solid rgba(255, 255, 255, 0.8)"
            mb={6}
            mt={10}
          >
            <Flex
              justifyContent="space-between"
              alignItems="center"
              mb={4}
              flexDirection={["column", "row"]}
              gap={2}
            >
              <Text fontSize={["lg", "xl"]} fontWeight="bold" color="white">
                Events Table
              </Text>

              <Flex gap={2} flexWrap="wrap" alignItems="center">
                <Select
                  placeholder="Year Filter"
                  value={yearFilter}
                  onChange={(e) => setYearFilter(e.target.value)}
                  bg="white"
                  color="black"
                  size="sm"
                  width={["100%", "120px"]}
                >
                  <option value="All">All</option>
                  <option value="2024">2024</option>
                  <option value="2025">2025</option>
                </Select>
                <Select
                  placeholder="Filter Category"
                  value={tableCategoryFilter}
                  onChange={(e) => {
                    setTableCategoryFilter(e.target.value);
                    setTableSubcategoryFilter("All");
                  }}
                  bg="white"
                  color="black"
                  size="sm"
                  width={["100%", "200px"]}
                >
                  <option value="All">All</option>
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </Select>
                <Select
                  placeholder="Filter Subcategory"
                  value={tableSubcategoryFilter}
                  onChange={(e) => setTableSubcategoryFilter(e.target.value)}
                  bg="white"
                  color="black"
                  size="sm"
                  width={["100%", "200px"]}
                  isDisabled={tableCategoryFilter === "All"}
                >
                  <option value="All">All</option>
                  {tableCategoryFilter !== "All" &&
                    Array.from(
                      new Set(
                        yearFilteredData
                          .filter((d) => d.category === tableCategoryFilter)
                          .map((d) => d.subcategory)
                      )
                    )
                      .sort()
                      .map((subcat) => (
                        <option key={subcat} value={subcat}>
                          {subcat}
                        </option>
                      ))}
                </Select>
                <Button
                  colorScheme={compareMode ? "red" : "teal"}
                  onClick={compareMode ? handleCancelCompare : handleCompare}
                  size="sm"
                  isDisabled={selectedCompareEvents.length < 2 && !compareMode}
                >
                  {compareMode ? "Cancel Compare" : "Compare"}
                </Button>
              </Flex>
            </Flex>

            <Box overflowX="auto">
              <Table variant="simple" size="sm">
                <Thead>
                  <Tr>
                    <Th fontSize="sm" color="white" fontWeight="bold">Select</Th>
                    <Th fontSize="sm" color="white" fontWeight="bold">Week</Th>
                    <Th fontSize="sm" color="white" fontWeight="bold">Date</Th>
                    <Th fontSize="sm" color="white" fontWeight="bold">Category</Th>
                    <Th fontSize="sm" color="white" fontWeight="bold">Subcategory</Th>
                    <Th fontSize="sm" color="white" fontWeight="bold">Event Name</Th>
                    <Th fontSize="sm" color="white" fontWeight="bold">Description</Th>
                    <Th isNumeric fontSize="sm" color="white" fontWeight="bold">SITE</Th>
                    <Th isNumeric fontSize="sm" color="white" fontWeight="bold">APPS'</Th>
                    <Th isNumeric fontSize="sm" color="white" fontWeight="bold">SUBTOTAL</Th>
                    <Th isNumeric fontSize="sm" color="white" fontWeight="bold">CTV</Th>
                    <Th isNumeric fontSize="sm" color="white" fontWeight="bold">TOTAL</Th>
                    <Th fontSize="sm" color="white" fontWeight="bold">Aprov.</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {displayedTableData.map((row) => {
                    const isSelected = selectedRow && selectedRow.id === row.id;
                    return (
                      <Tr
                        key={row.id}
                        bg={isSelected ? "gray.700" : categoryColors[row.category] || "gray.600"}
                        _hover={{ bg: "gray.600", cursor: "pointer" }}
                        fontSize={["xs", "sm"]}
                        onClick={() => handleRowClick(row)}
                      >
                        <Td>
                          <Checkbox
                            isChecked={selectedCompareEvents.includes(row.id)}
                            onChange={() => handleCompareSelection(row.id)}
                            onClick={(e) => e.stopPropagation()}
                          />
                        </Td>
                        <Td>{row.weekNumber}</Td>
                        <Td>{row.eventDate}</Td>
                        <Td>{row.category}</Td>
                        <Td>{row.subcategory}</Td>
                        <Td>{row.eventName}</Td>
                        <Td>{row.eventDescription}</Td>
                        <Td isNumeric>{formatNumber(row.siteUsers)}</Td>
                        <Td isNumeric>{formatNumber(row.appsUsers)}</Td>
                        <Td isNumeric>{formatNumber(row.subtotal)}</Td>
                        <Td isNumeric>{row.ctv > 0 ? formatNumber(row.ctv) : "-"}</Td>
                        <Td isNumeric fontWeight="bold">{formatNumber(row.total)}</Td>
                        <Td>{row.aprov != null ? formatNumber(row.aprov) : "-"}</Td>
                      </Tr>
                    );
                  })}
                </Tbody>
              </Table>
            </Box>

            {tableFilteredData.length > 10 && (
              <Flex justifyContent="center" mt={2}>
                <Button
                  size="xs"
                  onClick={() => setIsTableExpanded(!isTableExpanded)}
                  leftIcon={isTableExpanded ? <ChevronUpIcon /> : <ChevronDownIcon />}
                  colorScheme="teal"
                  width={["100%", "auto"]}
                >
                  {isTableExpanded ? "Show Less" : "Show All"}
                </Button>
              </Flex>
            )}

            <Collapse in={isPieChartVisible} animateOpacity>
              {selectedRow && (
                <Box
                  ref={pieChartRef}
                  mt={4}
                  bg="linear-gradient(90deg, #000000, #7800ff)"
                  borderRadius="20px"
                  p={[4, 6]}
                  border="2.5px solid rgba(255, 255, 255, 0.8)"
                >
                  <Text
                    fontSize={["sm", "md"]}
                    mb={2}
                    textAlign="center"
                    color="white"
                    fontWeight="bold"
                  >
                    Distribution for {selectedRow.eventDescription} on {formatDate(selectedRow.eventDate)}
                  </Text>
                  <Flex justifyContent="center">
                    <Box width="100%" maxWidth={piePlotWidth} maxHeight={piePlotHeight}>
                      <Plot
                        data={[
                          {
                            values: [
                              selectedRow.appsUsers,
                              selectedRow.siteUsers,
                              selectedRow.ctv,
                            ],
                            labels: ["APPS'", "SITE", "CTV"],
                            type: "pie",
                            marker: { colors: ["#36a2eb", "#ff6384", "#ffce56"] },
                            hoverinfo: "label+percent+value",
                            textinfo: "label+value",
                            textposition: "inside",
                            textfont: {
                              color: "white",
                              size: 14,
                              family: "Arial",
                              weight: "bold",
                            },
                          },
                        ]}
                        layout={{
                          autosize: true,
                          paper_bgcolor: "transparent",
                          plot_bgcolor: "transparent",
                          showlegend: true,
                          legend: {
                            orientation: "h",
                            x: 0.3,
                            y: -0.2,
                            font: { color: "white", size: 12 },
                          },
                        }}
                        config={{ displayModeBar: false }}
                        style={{ width: "100%", height: "100%" }}
                        useResizeHandler
                      />
                    </Box>
                  </Flex>
                </Box>
              )}
            </Collapse>

            {compareMode && comparisonData && (
              <Box
                bg="linear-gradient(90deg, #000000, #7800ff)"
                borderRadius="20px"
                p={[4, 6]}
                border="2.5px solid rgba(255, 255, 255, 0.8)"
                mb={6}
                mt={4}
              >
                <Flex
                  justifyContent="space-between"
                  alignItems="center"
                  mb={4}
                  flexDirection={["column", "row"]}
                  gap={2}
                >
                  <Text fontSize={["lg", "xl"]} fontWeight="bold" color="white">
                    Comparison
                  </Text>
                  <Button
                    colorScheme="red"
                    onClick={handleCancelCompare}
                    size="sm"
                    width={["100%", "auto"]}
                  >
                    Cancel
                  </Button>
                </Flex>
                <Box overflowX="auto">
                  <Table variant="simple" size="sm">
                    <Thead>
                      <Tr>
                        <Th fontSize="sm" color="white" fontWeight="bold">Event Name</Th>
                        <Th isNumeric fontSize="sm" color="white" fontWeight="bold">APPS' Count</Th>
                        <Th isNumeric fontSize="sm" color="white" fontWeight="bold">SITE Count</Th>
                        <Th isNumeric fontSize="sm" color="white" fontWeight="bold">CTV Count</Th>
                        <Th isNumeric fontSize="sm" color="white" fontWeight="bold">SUBTOTAL</Th>
                        <Th isNumeric fontSize="sm" color="white" fontWeight="bold">TOTAL</Th>
                        <Th fontSize="sm" color="white" fontWeight="bold">APPS' Change (%)</Th>
                        <Th fontSize="sm" color="white" fontWeight="bold">SITE Change (%)</Th>
                        <Th fontSize="sm" color="white" fontWeight="bold">CTV Change (%)</Th>
                        <Th fontSize="sm" color="white" fontWeight="bold">SUBTOTAL Change (%)</Th>
                        <Th fontSize="sm" color="white" fontWeight="bold">TOTAL Change (%)</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {comparisonData?.baseEvent && (
                        <Tr>
                          <Td fontWeight="bold" color="white">
                            {comparisonData.baseEvent.eventName} - {formatDate(comparisonData.baseEvent.eventDate)}
                          </Td>
                          <Td isNumeric>{formatNumber(comparisonData.baseEvent.appsUsers)}</Td>
                          <Td isNumeric>{formatNumber(comparisonData.baseEvent.siteUsers)}</Td>
                          <Td isNumeric>
                            {comparisonData.baseEvent.ctv > 0
                              ? formatNumber(comparisonData.baseEvent.ctv)
                              : "-"}
                          </Td>
                          <Td isNumeric>{formatNumber(comparisonData.baseEvent.subtotal)}</Td>
                          <Td isNumeric>{formatNumber(comparisonData.baseEvent.total)}</Td>
                          <Td color="gray.400">-</Td>
                          <Td color="gray.400">-</Td>
                          <Td color="gray.400">-</Td>
                          <Td color="gray.400">-</Td>
                          <Td color="gray.400">-</Td>
                        </Tr>
                      )}
                      {comparisonData.comparisons.map((comp, idx) => {
                        const event = yearFilteredData.find((e) => e.id === comp.eventId);
                        const appsPos = parseFloat(comp.appsChange) >= 0;
                        const sitePos = parseFloat(comp.siteChange) >= 0;
                        const ctvPos = parseFloat(comp.ctvChange) >= 0;
                        const subPos = parseFloat(comp.subtotalChange) >= 0;
                        const totPos = parseFloat(comp.totalChange) >= 0;
                        return (
                          <Tr key={idx}>
                            <Td fontWeight="bold" color="white">
                              {event
                                ? `${event.eventName} - ${formatDate(event.eventDate)}`
                                : `${comp.eventName} - ${formatDate(comp.eventDate)}`}
                            </Td>
                            <Td isNumeric>{event ? formatNumber(event.appsUsers) : "0"}</Td>
                            <Td isNumeric>{event ? formatNumber(event.siteUsers) : "0"}</Td>
                            <Td isNumeric>
                              {event && event.ctv > 0 ? formatNumber(event.ctv) : "-"}
                            </Td>
                            <Td isNumeric>{event ? formatNumber(event.subtotal) : "0"}</Td>
                            <Td isNumeric>{event ? formatNumber(event.total) : "0"}</Td>
                            <Td color={appsPos ? "green.400" : "red.400"}>{comp.appsChange}%</Td>
                            <Td color={sitePos ? "green.400" : "red.400"}>{comp.siteChange}%</Td>
                            <Td color={ctvPos ? "green.400" : "red.400"}>{comp.ctvChange}%</Td>
                            <Td color={subPos ? "green.400" : "red.400"}>{comp.subtotalChange}%</Td>
                            <Td color={totPos ? "green.400" : "red.400"}>{comp.totalChange}%</Td>
                          </Tr>
                        );
                      })}
                    </Tbody>
                  </Table>
                </Box>
              </Box>
            )}
          </Box>
        )}

        {/* Distribution & Metrics */}
        {!isLoading && !error && (
          <Grid templateColumns={gridTemplateColumns} gap={6} mb={6}>
            <Box
              bg="linear-gradient(90deg, #000000, #7800ff)"
              borderRadius="20px"
              p={[4, 6]}
              border="2.5px solid rgba(255, 255, 255, 0.8)"
            >
              <Text fontSize={["lg", "xl"]} mb={4} textAlign="center" color="white" fontWeight="bold">
                Distribution of APPS', SITE, & CTV
              </Text>
              <Flex justifyContent="center" mb={4}>
                {totalApps === 0 && totalSites === 0 && totalCtv === 0 ? (
                  <Text fontSize="sm" color="white">No data to display.</Text>
                ) : (
                  <Box width="100%" maxWidth={piePlotWidth} maxHeight={piePlotHeight}>
                    <Plot
                      data={pieData}
                      layout={{
                        autosize: true,
                        paper_bgcolor: "transparent",
                        plot_bgcolor: "transparent",
                        showlegend: true,
                        legend: {
                          orientation: "h",
                          x: 0.3,
                          y: -0.2,
                          font: { color: "white", size: 12 },
                        },
                      }}
                      config={{ displayModeBar: false }}
                      style={{ width: "100%", height: "100%" }}
                      useResizeHandler
                    />
                  </Box>
                )}
              </Flex>
              <Flex direction="column" gap={2}>
                <Select
                  value={selectedCategory}
                  onChange={(e) => {
                    setSelectedCategory(e.target.value);
                    setSelectedSubcategory("All");
                  }}
                  placeholder="Select Category"
                  bg="white"
                  color="black"
                  size="sm"
                >
                  <option value="All">All</option>
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </Select>
                <Select
                  value={selectedSubcategory}
                  onChange={(e) => setSelectedSubcategory(e.target.value)}
                  placeholder="Select Subcategory"
                  bg="white"
                  color="black"
                  size="sm"
                  isDisabled={selectedCategory === "All"}
                >
                  <option value="All">All</option>
                  {selectedCategory !== "All" &&
                    subcategories.map((subcat) => (
                      <option key={subcat} value={subcat}>
                        {subcat}
                      </option>
                    ))}
                </Select>
              </Flex>
            </Box>

            <Box
              bg="linear-gradient(90deg, #000000, #7800ff)"
              borderRadius="20px"
              p={[4, 6]}
              border="2.5px solid rgba(255, 255, 255, 0.8)"
            >
              <Flex
                justifyContent="space-between"
                alignItems="center"
                mb={4}
                flexDirection={["column", "row"]}
                gap={2}
              >
                <Text fontSize={["lg", "xl"]} fontWeight="bold" color="white">
                  {metricsType} Metrics
                </Text>
                <Select
                  value={metricsType}
                  onChange={(e) => setMetricsType(e.target.value)}
                  bg="white"
                  color="black"
                  size="sm"
                  width={["100%", "150px"]}
                >
                  <option value="Average">Average</option>
                  <option value="Total">Total</option>
                </Select>
              </Flex>
              <Flex direction="column" gap={4} align="center">
                <Box
                  bg="linear-gradient(90deg, #000000, #7800ff)"
                  p={4}
                  borderRadius="20px"
                  width="100%"
                  textAlign="center"
                >
                  <Text fontSize="sm" fontWeight="semibold" color="white">
                    {metricsType} APPS'
                  </Text>
                  <Text fontSize="xl" fontWeight="bold" color="white">
                    {metricsType === "Average"
                      ? averageApps
                      : formatNumber(totalApps)}
                  </Text>
                </Box>
                <Box
                  bg="linear-gradient(90deg, #000000, #7800ff)"
                  p={4}
                  borderRadius="20px"
                  width="100%"
                  textAlign="center"
                >
                  <Text fontSize="sm" fontWeight="semibold" color="white">
                    {metricsType} SITE
                  </Text>
                  <Text fontSize="xl" fontWeight="bold" color="white">
                    {metricsType === "Average"
                      ? averageSites
                      : formatNumber(totalSites)}
                  </Text>
                </Box>
                <Box
                  bg="linear-gradient(90deg, #000000, #7800ff)"
                  p={4}
                  borderRadius="20px"
                  width="100%"
                  textAlign="center"
                >
                  <Text fontSize="sm" fontWeight="semibold" color="white">
                    {metricsType} SUBTOTAL
                  </Text>
                  <Text fontSize="xl" fontWeight="bold" color="white">
                    {metricsType === "Average"
                      ? averageSubtotal
                      : formatNumber(totalSubtotal)}
                  </Text>
                </Box>
                <Box
                  bg="linear-gradient(90deg, #000000, #7800ff)"
                  p={4}
                  borderRadius="20px"
                  width="100%"
                  textAlign="center"
                >
                  <Text fontSize="sm" fontWeight="semibold" color="white">
                    {metricsType} CTV
                  </Text>
                  <Text fontSize="xl" fontWeight="bold" color="white">
                    {metricsType === "Average"
                      ? averageCtv
                      : formatNumber(totalCtv)}
                  </Text>
                </Box>
                <Box
                  bg="linear-gradient(90deg, #000000, #7800ff)"
                  p={4}
                  borderRadius="20px"
                  width="100%"
                  textAlign="center"
                >
                  <Text fontSize="sm" fontWeight="semibold" color="white">
                    {metricsType} TOTAL
                  </Text>
                  <Text fontSize="xl" fontWeight="bold" color="white">
                    {metricsType === "Average"
                      ? averageTotal
                      : formatNumber(totalTotal)}
                  </Text>
                </Box>
                <Box
                  bg="linear-gradient(90deg, #000000, #7800ff)"
                  p={4}
                  borderRadius="20px"
                  width="100%"
                  textAlign="center"
                >
                  <Text fontSize="sm" fontWeight="semibold" color="white">
                    {metricsType} Aprov
                  </Text>
                  <Text fontSize="xl" fontWeight="bold" color="white">
                    {metricsType === "Average" ? averageAprov : totalAprov}
                  </Text>
                </Box>
              </Flex>
            </Box>
          </Grid>
        )}

        {!isLoading && !error && (
          <Box
            bg="linear-gradient(90deg, #000000, #7800ff)"
            borderRadius="20px"
            p={[4, 6]}
            border="2.5px solid rgba(255, 255, 255, 0.8)"
            mb={6}
          >
            <Text
              fontSize={["lg", "xl"]}
              mb={4}
              textAlign="center"
              color="white"
              fontWeight="bold"
            >
              APPS', SITE, CTV Clicks Over Time
            </Text>
            <Flex direction={["column", "row"]} justifyContent="space-between" mb={4} gap={4}>
              <Select
                placeholder="Select Graph Option"
                value={selectedGraphOption}
                onChange={(e) => setSelectedGraphOption(e.target.value)}
                bg="white"
                color="black"
                size="sm"
                width={["100%", "200px"]}
              >
                <option value="APPS">APPS'</option>
                <option value="SITE">SITE</option>
                <option value="CTV">CTV</option>
                <option value="SUBTOTAL">SUBTOTAL (APPS + SITE)</option>
                <option value="TOTAL">TOTAL (SUBTOTAL + CTV)</option>
                <option value="ALL">All</option>
              </Select>

              {/* THE KEY: Include the date in the label */}
              <Box width={["100%", "300px"]}>
                <Select
                  placeholder="Select Events"
                  onChange={handleEventSelection}
                  bg="gray.600"
                  color="white"
                  size="sm"
                  value=""
                >
                  {lineGraphData.events
                    .filter((evt) => !selectedEvents.includes(evt.id))
                    .map((evt) => {
                      // label includes date + description
                      const label = `${formatDate(evt.eventDate)} - ${evt.eventDescription || "No Description"}`;
                      return (
                        <option key={evt.id} value={evt.id}>
                          {label}
                        </option>
                      );
                    })}
                </Select>
                <Flex mt={2} wrap="wrap" gap={2}>
                  {selectedEvents.map((evId) => {
                    const found = lineGraphData.events.find((x) => x.id === evId);
                    const label = found
                      ? `${formatDate(found.eventDate)} - ${found.eventDescription}`
                      : "Unknown Event";
                    return (
                      <Tag
                        size="sm"
                        key={evId}
                        borderRadius="full"
                        variant="solid"
                        colorScheme="teal"
                      >
                        <TagLabel>{label}</TagLabel>
                        <TagCloseButton onClick={() => handleRemoveSelectedEvent(evId)} />
                      </Tag>
                    );
                  })}
                </Flex>
              </Box>
            </Flex>

            <Flex justifyContent="center">
              {lineGraphData.dates.length === 0 ? (
                <Text fontSize="sm" color="white">
                  No data to display.
                </Text>
              ) : (
                <Box width="100%" height={plotHeight || 400}>
                  <Plot
                    data={plotData}
                    layout={{
                      autosize: true,
                      paper_bgcolor: "transparent",
                      plot_bgcolor: "transparent",
                      xaxis: {
                        title: "Event Date",
                        type: "date",
                        rangeslider: { visible: true },
                        tickangle: -45,
                        automargin: true,
                        tickfont: { color: "rgba(255, 255, 255, 0.7)", size: 12 },
                        titlefont: {
                          color: "white",
                          size: 14,
                          family: "Arial",
                          weight: "bold",
                        },
                        gridcolor: "rgba(255, 255, 255, 0.2)",
                        rangeselector: {
                          buttons: [
                            { count: 1, label: "1m", step: "month", stepmode: "backward" },
                            { count: 6, label: "6m", step: "month", stepmode: "backward" },
                            { step: "all" },
                          ],
                        },
                      },
                      yaxis: {
                        title: "Count",
                        tickfont: { color: "rgba(255, 255, 255, 0.7)", size: 12 },
                        titlefont: {
                          color: "white",
                          size: 14,
                          family: "Arial",
                          weight: "bold",
                        },
                        gridcolor: "rgba(255, 255, 255, 0.2)",
                      },
                      legend: {
                        orientation: "h",
                        x: 0.5,
                        y: -0.2,
                        xanchor: "center",
                        yanchor: "top",
                        font: {
                          color: "white",
                          size: 12,
                          family: "Arial",
                          weight: "bold",
                        },
                      },
                      hoverlabel: {
                        bgcolor: "gray",
                        font: {
                          color: "white",
                          family: "Arial",
                          size: 12,
                          weight: "bold",
                        },
                      },
                    }}
                    config={{ displayModeBar: false }}
                    style={{ width: "100%", height: "100%" }}
                    useResizeHandler
                  />
                </Box>
              )}
            </Flex>
          </Box>
        )}
      </Flex>
    </Box>
  );
};

export default NewPage;
