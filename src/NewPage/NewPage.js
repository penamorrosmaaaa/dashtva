/* src/NewPage/NewPage.js */

import React, { useState, useEffect, useMemo } from "react";
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

// Helper function to parse date strings like "1/12/2024" to Date objects
const parseDateString = (dateStr) => {
  if (!dateStr) return null;
  const date = new Date(dateStr); // Will parse "M/D/YYYY" in most browsers
  if (isNaN(date)) {
    console.warn(`Invalid date format encountered: "${dateStr}"`);
    return null;
  }
  return date;
};

// Helper function to format dates as "M/D/YYYY"
const formatDate = (dateStr) => {
  const date = new Date(dateStr);
  if (isNaN(date)) return "Invalid Date";
  const month = date.getMonth() + 1; // Months are zero-based
  const day = date.getDate();
  const year = date.getFullYear();
  return `${month}/${day}/${year}`;
};

// Helper function to format numbers with commas and no decimals
const formatNumber = (number) => {
  if (number === null || number === undefined) return "-";
  if (isNaN(number)) return "-";
  return Number(number).toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
};

const NewPage = () => {
  const [eventData, setEventData] = useState([]); 
  const [categories, setCategories] = useState([]); 
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Distribution Section states
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedSubcategory, setSelectedSubcategory] = useState("All");
  const [selectedGraphOption, setSelectedGraphOption] = useState("TOTAL");

  // Line Graph states
  const [selectedEvents, setSelectedEvents] = useState([]);
  const [selectedRow, setSelectedRow] = useState(null);

  // Table expansion & Pie chart visibility
  const [isTableExpanded, setIsTableExpanded] = useState(false);
  const [isPieChartVisible, setIsPieChartVisible] = useState(false);

  // Table Filters
  const [tableCategoryFilter, setTableCategoryFilter] = useState("All");
  const [tableSubcategoryFilter, setTableSubcategoryFilter] = useState("All");

  // Compare Mode
  const [compareMode, setCompareMode] = useState(false);
  const [selectedCompareEvents, setSelectedCompareEvents] = useState([]);

  // Optional: timeline range for filtering
  const [timelineRange, setTimelineRange] = useState({ start: null, end: null });

  // Metrics Type
  const [metricsType, setMetricsType] = useState("Average");

  const toast = useToast();

  // Your Google Sheets CSV URL
  const PRIMARY_CSV_URL =
    "https://docs.google.com/spreadsheets/d/e/2PACX-1vRA4x6epe-dPmk8C0RxA9Y9bgj4t7GUglqLzSn1FmPGawDdD5yawZg-ZO3hSG01yA/pub?output=csv";

  // Helper function to fetch CSV data
  const fetchCSVData = async (csvUrl) => {
    try {
      const response = await fetch(csvUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch CSV: ${response.statusText}`);
      }
      const csvText = await response.text();
      const parsed = Papa.parse(csvText, { header: false, skipEmptyLines: true });
      if (parsed.errors.length > 0) {
        console.error("CSV Parsing Errors:", parsed.errors);
        throw new Error("Error parsing CSV data.");
      }
      return parsed.data; // Array of rows
    } catch (error) {
      console.error("Error fetching CSV:", error);
      throw error;
    }
  };

  // Fetch primary CSV and process event data
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // Fetch primary CSV
        const primaryData = await fetchCSVData(PRIMARY_CSV_URL);

        // Data starts from row 10 (index 9)
        const dataRows = primaryData.slice(9);
        const allEventData = [];

        dataRows.forEach((row, index) => {
          try {
            const weekNumberStr = row[2]?.trim(); // Column C
            const weekNumber = weekNumberStr ? parseInt(weekNumberStr, 10) : 0;
            const category = row[3]?.trim();      // Column D
            const subcategory = row[4]?.trim();   // Column E

            // Column F is index 5, in format "M/D/YYYY"
            const dateStr = row[5]?.trim();       

            const eventName = row[6]?.trim();     // Column G
            const eventDescription = row[7]?.trim(); // Column H
            const siteUsers = row[12]?.trim();    // Column M
            const appsUsers = row[13]?.trim();    // Column N
            const subtotal = row[14]?.trim();     // Column O
            const ctv = row[15]?.trim();          // Column P
            const total = row[16]?.trim();        // Column Q
            const aprov = row[18]?.trim();        // Column S

            // Skip row if category is empty
            if (!category) {
              return;
            }

            // Parse date
            const eventDateObj = parseDateString(dateStr);

            // Parse numbers
            const parsedSiteUsers = siteUsers
              ? parseFloat(siteUsers.replace(/,/g, "")) || 0
              : 0;
            const parsedAppsUsers = appsUsers
              ? parseFloat(appsUsers.replace(/,/g, "")) || 0
              : 0;

            // Subtotal fallback
            const parsedSubtotal =
              subtotal && subtotal !== "-"
                ? parseFloat(subtotal.replace(/,/g, "")) ||
                  (parsedSiteUsers + parsedAppsUsers)
                : parsedSiteUsers + parsedAppsUsers;

            // CTV fallback
            const parsedCtv =
              ctv && ctv !== "-" ? parseFloat(ctv.replace(/,/g, "")) : 0;

            // Total fallback
            const parsedTotal =
              total && total !== "-"
                ? parseFloat(total.replace(/,/g, ""))
                : parsedSubtotal + parsedCtv;

            // Aprov as number or null
            const parsedAprov =
              aprov && aprov !== "-" ? parseFloat(aprov.replace(/,/g, "")) : null;

            allEventData.push({
              id: `${eventName}-${dateStr}-${category}-${subcategory}-${index}`,
              weekNumber: weekNumber || 0,
              category: category,
              subcategory: subcategory || "N/A",
              eventDate: eventDateObj
                ? eventDateObj.toISOString().split("T")[0] // store as "YYYY-MM-DD"
                : "N/A",
              eventName: eventName || "N/A",
              eventDescription: eventDescription || "",
              siteUsers: parsedSiteUsers,
              appsUsers: parsedAppsUsers,
              subtotal: parsedSubtotal,
              ctv: parsedCtv,
              total: parsedTotal,
              aprov: parsedAprov,
            });
          } catch (err) {
            console.error(`Error processing row ${index + 10}:`, err);
            // Continue for other rows
          }
        });

        // ***** Sort purely by date descending to ensure most recent date is at the top *****
        allEventData.sort((a, b) => new Date(b.eventDate) - new Date(a.eventDate));

        setEventData(allEventData);

        // Extract unique categories
        const uniqueCategories = Array.from(
          new Set(allEventData.map((d) => d.category))
        ).sort();
        setCategories(uniqueCategories);
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

    fetchData();
  }, [PRIMARY_CSV_URL, toast]);

  // Subcategories for selected category
  const subcategories = useMemo(() => {
    if (selectedCategory === "All") {
      return Array.from(new Set(eventData.map((d) => d.subcategory))).sort();
    }
    const filtered = eventData.filter((d) => d.category === selectedCategory);
    return Array.from(new Set(filtered.map((d) => d.subcategory))).sort();
  }, [eventData, selectedCategory]);

  // Dynamic Category Colors
  const categoryColors = useMemo(() => {
    const predefinedColors = [
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
      // more if needed
    ];
    const mapping = {};
    categories.forEach((cat, index) => {
      mapping[cat] = predefinedColors[index % predefinedColors.length];
    });
    return mapping;
  }, [categories]);

  // Distribution filter
  const distributionFilteredData = useMemo(() => {
    let data = [...eventData];
    if (selectedCategory !== "All") {
      data = data.filter((d) => d.category === selectedCategory);
    }
    if (selectedSubcategory !== "All") {
      data = data.filter((d) => d.subcategory === selectedSubcategory);
    }
    if (timelineRange.start) {
      data = data.filter((d) => new Date(d.eventDate) >= new Date(timelineRange.start));
    }
    if (timelineRange.end) {
      data = data.filter((d) => new Date(d.eventDate) <= new Date(timelineRange.end));
    }
    return data;
  }, [eventData, selectedCategory, selectedSubcategory, timelineRange]);

  // Table filter
  const tableFilteredData = useMemo(() => {
    let data = [...eventData];
    if (tableCategoryFilter !== "All") {
      data = data.filter((d) => d.category === tableCategoryFilter);
    }
    if (tableSubcategoryFilter !== "All") {
      data = data.filter((d) => d.subcategory === tableSubcategoryFilter);
    }
    if (timelineRange.start) {
      data = data.filter((d) => new Date(d.eventDate) >= new Date(timelineRange.start));
    }
    if (timelineRange.end) {
      data = data.filter((d) => new Date(d.eventDate) <= new Date(timelineRange.end));
    }
    // Because we want the most recent at top in the table as well,
    // we can sort again by descending date, just to be safe:
    data.sort((a, b) => new Date(b.eventDate) - new Date(a.eventDate));
    return data;
  }, [
    eventData,
    tableCategoryFilter,
    tableSubcategoryFilter,
    timelineRange,
  ]);

  // Aggregated stats for distribution
  const totalApps = useMemo(() => {
    return distributionFilteredData.reduce((sum, d) => sum + d.appsUsers, 0);
  }, [distributionFilteredData]);

  const totalSites = useMemo(() => {
    return distributionFilteredData.reduce((sum, d) => sum + d.siteUsers, 0);
  }, [distributionFilteredData]);

  const totalCtv = useMemo(() => {
    return distributionFilteredData.reduce((sum, d) => sum + d.ctv, 0);
  }, [distributionFilteredData]);

  const totalSubtotal = useMemo(() => {
    return distributionFilteredData.reduce((sum, d) => sum + d.subtotal, 0);
  }, [distributionFilteredData]);

  const totalTotal = useMemo(() => {
    return distributionFilteredData.reduce((sum, d) => sum + d.total, 0);
  }, [distributionFilteredData]);

  // AVERAGE APROV (exclude zeros/null)
  const averageAprov = useMemo(() => {
    const aprovValues = distributionFilteredData
      .map((d) => d.aprov)
      .filter((val) => val !== null && val !== 0);
    if (aprovValues.length === 0) return "0";
    const sumAprov = aprovValues.reduce((sum, val) => sum + val, 0);
    return formatNumber(sumAprov / aprovValues.length);
  }, [distributionFilteredData]);

  // SUBTOTAL, TOTAL Averages
  const averageSubtotal = useMemo(() => {
    if (distributionFilteredData.length === 0) return "0";
    return formatNumber(
      distributionFilteredData.reduce((sum, d) => sum + d.subtotal, 0) /
        distributionFilteredData.length
    );
  }, [distributionFilteredData]);

  const averageTotal = useMemo(() => {
    if (distributionFilteredData.length === 0) return "0";
    return formatNumber(
      distributionFilteredData.reduce((sum, d) => sum + d.total, 0) /
        distributionFilteredData.length
    );
  }, [distributionFilteredData]);

  // AVERAGE CTV (exclude zero)
  const averageCtv = useMemo(() => {
    const ctvValues = distributionFilteredData
      .map((d) => d.ctv)
      .filter((val) => val > 0);
    if (ctvValues.length === 0) return "0";
    const sumCtv = ctvValues.reduce((sum, val) => sum + val, 0);
    return formatNumber(sumCtv / ctvValues.length);
  }, [distributionFilteredData]);

  // TOTAL Aprov
  const totalAprov = useMemo(() => {
    const aprovValues = distributionFilteredData
      .map((d) => d.aprov)
      .filter((val) => val !== null);
    if (aprovValues.length === 0) return "0";
    const sumAprov = aprovValues.reduce((sum, val) => sum + val, 0);
    return formatNumber(sumAprov);
  }, [distributionFilteredData]);

  // Pie data
  const pieData = useMemo(() => {
    return [
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
    ];
  }, [totalApps, totalSites, totalCtv]);

  // Average APPS & SITE
  const averageApps = useMemo(() => {
    if (distributionFilteredData.length === 0) return "0";
    return formatNumber(totalApps / distributionFilteredData.length);
  }, [totalApps, distributionFilteredData]);

  const averageSites = useMemo(() => {
    if (distributionFilteredData.length === 0) return "0";
    return formatNumber(totalSites / distributionFilteredData.length);
  }, [totalSites, distributionFilteredData]);

  // Prepare data for line graph
  const lineGraphData = useMemo(() => {
    // Sort events ascending by date for the graph
    const eventsSorted = [...eventData].sort(
      (a, b) => new Date(a.eventDate) - new Date(b.eventDate)
    );

    const dates = eventsSorted.map((d) => d.eventDate);
    const APPS = eventsSorted.map((d) => d.appsUsers);
    const SITE = eventsSorted.map((d) => d.siteUsers);
    const CTV = eventsSorted.map((d) => d.ctv);
    const SUBTOTAL = eventsSorted.map((d) => d.subtotal);
    const TOTAL = eventsSorted.map((d) => d.total);

    return {
      dates,
      APPS,
      SITE,
      CTV,
      SUBTOTAL,
      TOTAL,
      events: eventsSorted,
    };
  }, [eventData]);

  // Handler for row selection in the table
  const handleRowClick = (row) => {
    if (selectedRow && selectedRow.id === row.id) {
      // Hide the pie chart if the same row is clicked
      setSelectedRow(null);
      setIsPieChartVisible(false);
    } else {
      setSelectedRow(row);
      setIsPieChartVisible(true);
    }
  };

  // Event Selection in line graph
  const handleEventSelection = (e) => {
    const selectedEventId = e.target.value;
    if (selectedEventId && !selectedEvents.includes(selectedEventId)) {
      setSelectedEvents([...selectedEvents, selectedEventId]);
    }
  };

  const handleRemoveSelectedEvent = (eventId) => {
    setSelectedEvents(selectedEvents.filter((id) => id !== eventId));
  };

  // Compare Mode
  const handleCompareSelection = (eventId) => {
    if (selectedCompareEvents.includes(eventId)) {
      setSelectedCompareEvents(
        selectedCompareEvents.filter((id) => id !== eventId)
      );
    } else {
      setSelectedCompareEvents([...selectedCompareEvents, eventId]);
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

  // Determine the line graph metric
  const lineGraphDisplayData = useMemo(() => {
    switch (selectedGraphOption) {
      case "APPS":
        return {
          y: lineGraphData.APPS,
          name: "APPS'",
          color: "#36a2eb",
        };
      case "SITE":
        return {
          y: lineGraphData.SITE,
          name: "SITE",
          color: "#ff6384",
        };
      case "CTV":
        return {
          y: lineGraphData.CTV,
          name: "CTV",
          color: "#ffce56",
        };
      case "SUBTOTAL":
        return {
          y: lineGraphData.SUBTOTAL,
          name: "SUBTOTAL (APPS + SITE)",
          color: "#4BC0C0",
        };
      case "ALL":
        return {
          y: null,
          name: "ALL",
          color: null,
        };
      default:
        // "TOTAL"
        return {
          y: lineGraphData.TOTAL,
          name: "TOTAL (SUBTOTAL + CTV)",
          color: "#9966FF",
        };
    }
  }, [lineGraphData, selectedGraphOption]);

  // 10 most recent events in the table
  const recentEvents = useMemo(() => {
    return tableFilteredData.slice(0, 10);
  }, [tableFilteredData]);

  // Displayed table data
  const displayedTableData = useMemo(() => {
    return isTableExpanded ? tableFilteredData : recentEvents;
  }, [isTableExpanded, tableFilteredData, recentEvents]);

  // Prepare plot data for line graph
  const plotData = useMemo(() => {
    if (selectedGraphOption === "ALL") {
      // Plot APPS, SITE, and CTV all together
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
        hovertext: lineGraphData.events.map(
          (e) =>
            `${e.eventDescription} - ${formatDate(e.eventDate)}: ${formatNumber(e.appsUsers)}`
        ),
        hoverinfo: "text",
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
        hovertext: lineGraphData.events.map(
          (e) =>
            `${e.eventDescription} - ${formatDate(e.eventDate)}: ${formatNumber(e.siteUsers)}`
        ),
        hoverinfo: "text",
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
        hovertext: lineGraphData.events.map(
          (e) =>
            `${e.eventDescription} - ${formatDate(e.eventDate)}: ${
              e.ctv > 0 ? formatNumber(e.ctv) : "-"
            }`
        ),
        hoverinfo: "text",
        hovertemplate: "%{hovertext}<extra></extra>",
      };

      return [traceAPPS, traceSITE, traceCTV];
    }

    // If not "ALL", we have one main trace
    const mainTrace = {
      x: lineGraphData.dates,
      y: lineGraphDisplayData.y,
      type: "scatter",
      mode: "lines+markers",
      name: lineGraphDisplayData.name,
      line: { color: lineGraphDisplayData.color },
      fill: "tozeroy",
      fillcolor: lineGraphDisplayData.color ? `${lineGraphDisplayData.color}33` : null,
      marker: { color: "white", size: 6 },
      hovertext: lineGraphData.events.map((e, idx) =>
        lineGraphDisplayData.y
          ? `${e.eventDescription} - ${formatDate(e.eventDate)}: ${formatNumber(lineGraphDisplayData.y[idx])}`
          : `${e.eventDescription} - ${formatDate(e.eventDate)}: -`
      ),
      hoverinfo: "text",
      hovertemplate: "%{hovertext}<extra></extra>",
    };

    // Selected events trace (optional)
    if (selectedEvents.length === 0) {
      return [mainTrace];
    }

    // Chronological selected events
    const selectedEventData = selectedEvents
      .map((eventId) => lineGraphData.events.find((e) => e.id === eventId))
      .filter(Boolean)
      .sort((a, b) => new Date(a.eventDate) - new Date(b.eventDate));

    const selectedTrace = {
      x: selectedEventData.map((e) => e.eventDate),
      y: selectedEventData.map((e) => {
        switch (selectedGraphOption) {
          case "APPS":
            return e.appsUsers;
          case "SITE":
            return e.siteUsers;
          case "CTV":
            return e.ctv;
          case "SUBTOTAL":
            return e.subtotal;
          case "TOTAL":
            return e.total;
          default:
            return 0;
        }
      }),
      type: "scatter",
      mode: "lines+markers",
      name: "Selected Events",
      line: { color: "#ff6347" },
      fill: "tozeroy",
      fillcolor: "#ff634733",
      marker: { color: "white", size: 8 },
      hovertext: selectedEventData.map((evt) => {
        let val = 0;
        switch (selectedGraphOption) {
          case "APPS":
            val = evt.appsUsers;
            break;
          case "SITE":
            val = evt.siteUsers;
            break;
          case "CTV":
            val = evt.ctv;
            break;
          case "SUBTOTAL":
            val = evt.subtotal;
            break;
          case "TOTAL":
            val = evt.total;
            break;
          default:
            val = 0;
        }
        return `${evt.eventDescription} - ${formatDate(evt.eventDate)}: ${formatNumber(val)}`;
      }),
      hoverinfo: "text",
      hovertemplate: "%{hovertext}<extra></extra>",
    };

    // If you want BOTH the main trace and the selected events at the same time:
    // return [mainTrace, selectedTrace];
    // Otherwise, just the selected:
    return [selectedTrace];
  }, [
    lineGraphData,
    lineGraphDisplayData,
    selectedGraphOption,
    selectedEvents,
    formatDate,
  ]);

  // Prepare comparison data
  const comparisonData = useMemo(() => {
    if (selectedCompareEvents.length < 2) return null;

    const eventsToCompare = eventData.filter((evt) =>
      selectedCompareEvents.includes(evt.id)
    );
    if (eventsToCompare.length < 2) return null;

    // Calculate % changes vs. the first in the list
    const baseEvent = eventsToCompare[0];
    const comparisons = eventsToCompare.slice(1).map((evt) => {
      const appsChange =
        baseEvent.appsUsers === 0
          ? 0
          : ((evt.appsUsers - baseEvent.appsUsers) / baseEvent.appsUsers) * 100;
      const siteChange =
        baseEvent.siteUsers === 0
          ? 0
          : ((evt.siteUsers - baseEvent.siteUsers) / baseEvent.siteUsers) * 100;
      const ctvChange =
        baseEvent.ctv === 0
          ? 0
          : ((evt.ctv - baseEvent.ctv) / baseEvent.ctv) * 100;
      const subtotalChange =
        baseEvent.subtotal === 0
          ? 0
          : ((evt.subtotal - baseEvent.subtotal) / baseEvent.subtotal) * 100;
      const totalChange =
        baseEvent.total === 0
          ? 0
          : ((evt.total - baseEvent.total) / baseEvent.total) * 100;

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

    return { baseEvent, comparisons };
  }, [selectedCompareEvents, eventData]);

  // Responsive styling
  const gridTemplateColumns = useBreakpointValue({ base: "1fr", md: "1fr 1fr" });
  const plotWidth = useBreakpointValue({ base: 300, md: 500, lg: 600 });
  const plotHeight = useBreakpointValue({ base: 300, md: 500, lg: 600 });
  const piePlotWidth = useBreakpointValue({ base: 300, md: 500, lg: 600 });
  const piePlotHeight = useBreakpointValue({ base: 300, md: 500, lg: 600 });
  const linePlotHeight = useBreakpointValue({ base: 400, md: 500, lg: 600 });

  // ------------------ Render ------------------
  return (
    <Box p={[4, 6, 10]} pt={10} color="white" minH="100vh">
      {/* ======= Events Table ======= */}
      {!isLoading && !error && (
        <Box
          bg="linear-gradient(90deg, #000000, #7800ff)"
          borderRadius="20px"
          p={[4, 6]}
          border="5px solid rgba(255, 255, 255, 0.8)"
          boxShadow="0px 0px 15px rgba(200, 200, 200, 0.5)"
          mb={6}
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
            <Flex gap={2} flexWrap="wrap">
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
                      eventData
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
                width={["100%", "auto"]}
              >
                {compareMode ? "Cancel Compare" : "Compare"}
              </Button>
            </Flex>
          </Flex>

          {/* Table */}
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
                  <Th isNumeric fontSize="sm" color="white" fontWeight="bold">
                    SITE
                  </Th>
                  <Th isNumeric fontSize="sm" color="white" fontWeight="bold">
                    APPS'
                  </Th>
                  <Th isNumeric fontSize="sm" color="white" fontWeight="bold">
                    SUBTOTAL
                  </Th>
                  <Th isNumeric fontSize="sm" color="white" fontWeight="bold">
                    CTV
                  </Th>
                  <Th isNumeric fontSize="sm" color="white" fontWeight="bold">
                    TOTAL
                  </Th>
                  <Th fontSize="sm" color="white" fontWeight="bold">Aprov.</Th>
                </Tr>
              </Thead>
              <Tbody>
                {displayedTableData.map((row) => (
                  <Tr
                    key={row.id}
                    bg={categoryColors[row.category] || "gray.600"}
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
                    <Td isNumeric>
                      {row.ctv > 0 ? formatNumber(row.ctv) : "-"}
                    </Td>
                    <Td isNumeric fontWeight="bold">
                      {formatNumber(row.total)}
                    </Td>
                    <Td>{row.aprov !== null ? formatNumber(row.aprov) : "-"}</Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </Box>

          {/* Expand/Collapse */}
          {tableFilteredData.length > 10 && (
            <Flex justifyContent="center" mt={2}>
              <Button
                size="xs"
                onClick={() => setIsTableExpanded(!isTableExpanded)}
                leftIcon={
                  isTableExpanded ? <ChevronUpIcon /> : <ChevronDownIcon />
                }
                colorScheme="teal"
                width={["100%", "auto"]}
              >
                {isTableExpanded ? "Show Less" : "Show All"}
              </Button>
            </Flex>
          )}

          {/* Detailed Pie Chart for Selected Row */}
          <Collapse in={isPieChartVisible} animateOpacity>
            {selectedRow && (
              <Box
                mt={4}
                bg="linear-gradient(90deg, #000000, #7800ff)"
                borderRadius="20px"
                p={[4, 6]}
                border="5px solid rgba(255, 255, 255, 0.8)"
                boxShadow="0px 0px 15px rgba(200, 200, 200, 0.5)"
              >
                <Text
                  fontSize={["sm", "md"]}
                  mb={2}
                  textAlign="center"
                  color="white"
                  fontWeight="bold"
                >
                  Distribution for {selectedRow.eventName} on{" "}
                  {formatDate(selectedRow.eventDate)}
                </Text>
                <Flex justifyContent="center">
                  <Box
                    width="100%"
                    maxWidth={piePlotWidth}
                    maxHeight={piePlotHeight}
                  >
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
                          marker: {
                            colors: ["#36a2eb", "#ff6384", "#ffce56"],
                          },
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
                        legend: { orientation: "h", x: 0.3, y: -0.2 },
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

          {/* Comparison Section */}
          {compareMode && comparisonData && (
            <Box
              bg="linear-gradient(90deg, #000000, #7800ff)"
              borderRadius="20px"
              p={[4, 6]}
              border="5px solid rgba(255, 255, 255, 0.8)"
              boxShadow="0px 0px 15px rgba(200, 200, 200, 0.5)"
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
                      <Th fontSize="sm" color="white" fontWeight="bold">
                        Event Name
                      </Th>
                      <Th isNumeric fontSize="sm" color="white" fontWeight="bold">
                        APPS' Count
                      </Th>
                      <Th isNumeric fontSize="sm" color="white" fontWeight="bold">
                        SITE Count
                      </Th>
                      <Th isNumeric fontSize="sm" color="white" fontWeight="bold">
                        CTV Count
                      </Th>
                      <Th isNumeric fontSize="sm" color="white" fontWeight="bold">
                        SUBTOTAL
                      </Th>
                      <Th isNumeric fontSize="sm" color="white" fontWeight="bold">
                        TOTAL
                      </Th>
                      <Th fontSize="sm" color="white" fontWeight="bold">
                        APPS' Change (%)
                      </Th>
                      <Th fontSize="sm" color="white" fontWeight="bold">
                        SITE Change (%)
                      </Th>
                      <Th fontSize="sm" color="white" fontWeight="bold">
                        CTV Change (%)
                      </Th>
                      <Th fontSize="sm" color="white" fontWeight="bold">
                        SUBTOTAL Change (%)
                      </Th>
                      <Th fontSize="sm" color="white" fontWeight="bold">
                        TOTAL Change (%)
                      </Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {/* Base Event */}
                    {comparisonData?.baseEvent && (
                      <Tr>
                        <Td fontWeight="bold" color="white">
                          {comparisonData.baseEvent.eventName} -{" "}
                          {formatDate(comparisonData.baseEvent.eventDate)}
                        </Td>
                        <Td isNumeric>
                          {formatNumber(comparisonData.baseEvent.appsUsers)}
                        </Td>
                        <Td isNumeric>
                          {formatNumber(comparisonData.baseEvent.siteUsers)}
                        </Td>
                        <Td isNumeric>
                          {comparisonData.baseEvent.ctv > 0
                            ? formatNumber(comparisonData.baseEvent.ctv)
                            : "-"}
                        </Td>
                        <Td isNumeric>
                          {formatNumber(comparisonData.baseEvent.subtotal)}
                        </Td>
                        <Td isNumeric>
                          {formatNumber(comparisonData.baseEvent.total)}
                        </Td>
                        <Td color="gray.400">-</Td>
                        <Td color="gray.400">-</Td>
                        <Td color="gray.400">-</Td>
                        <Td color="gray.400">-</Td>
                        <Td color="gray.400">-</Td>
                      </Tr>
                    )}
                    {/* Comparisons */}
                    {comparisonData.comparisons.map((comp, idx) => {
                      const event = eventData.find((e) => e.id === comp.eventId);

                      // Color coding
                      const appsChangePositive = parseFloat(comp.appsChange) >= 0;
                      const siteChangePositive = parseFloat(comp.siteChange) >= 0;
                      const ctvChangePositive = parseFloat(comp.ctvChange) >= 0;
                      const subtotalChangePositive =
                        parseFloat(comp.subtotalChange) >= 0;
                      const totalChangePositive = parseFloat(comp.totalChange) >= 0;

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
                            {event && event.ctv > 0
                              ? formatNumber(event.ctv)
                              : "-"}
                          </Td>
                          <Td isNumeric>
                            {event ? formatNumber(event.subtotal) : "0"}
                          </Td>
                          <Td isNumeric>
                            {event ? formatNumber(event.total) : "0"}
                          </Td>
                          <Td color={appsChangePositive ? "green.400" : "red.400"}>
                            {comp.appsChange}%
                          </Td>
                          <Td color={siteChangePositive ? "green.400" : "red.400"}>
                            {comp.siteChange}%
                          </Td>
                          <Td color={ctvChangePositive ? "green.400" : "red.400"}>
                            {comp.ctvChange}%
                          </Td>
                          <Td
                            color={
                              subtotalChangePositive ? "green.400" : "red.400"
                            }
                          >
                            {comp.subtotalChange}%
                          </Td>
                          <Td color={totalChangePositive ? "green.400" : "red.400"}>
                            {comp.totalChange}%
                          </Td>
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

      {/* ======= Visualization Panels ======= */}
      {!isLoading && !error && (
        <Grid templateColumns={gridTemplateColumns} gap={6} mb={6}>
          {/* Distribution Pie Chart */}
          <Box
            bg="linear-gradient(90deg, #000000, #7800ff)"
            borderRadius="20px"
            p={[4, 6]}
            border="5px solid rgba(255, 255, 255, 0.8)"
            boxShadow="0px 0px 15px rgba(200, 200, 200, 0.5)"
          >
            <Text
              fontSize={["lg", "xl"]}
              mb={4}
              textAlign="center"
              color="white"
              fontWeight="bold"
            >
              Distribution of APPS', SITE, & CTV
            </Text>
            <Flex justifyContent="center" mb={4}>
              {totalApps === 0 && totalSites === 0 && totalCtv === 0 ? (
                <Text fontSize="sm" color="white">
                  No data to display.
                </Text>
              ) : (
                <Box width="100%" maxWidth={piePlotWidth} maxHeight={piePlotHeight}>
                  <Plot
                    data={pieData}
                    layout={{
                      autosize: true,
                      paper_bgcolor: "transparent",
                      plot_bgcolor: "transparent",
                      showlegend: true,
                      legend: { orientation: "h", x: 0.3, y: -0.2 },
                    }}
                    config={{ displayModeBar: false }}
                    style={{ width: "100%", height: "100%" }}
                    useResizeHandler
                  />
                </Box>
              )}
            </Flex>
            {/* Filters for Distribution */}
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

          {/* Metrics Box (Average/Total) */}
          <Box
            bg="linear-gradient(90deg, #000000, #7800ff)"
            borderRadius="20px"
            p={[4, 6]}
            border="5px solid rgba(255, 255, 255, 0.8)"
            boxShadow="0px 0px 15px rgba(200, 200, 200, 0.5)"
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
              {/* APPS' */}
              <Box
                bg="linear-gradient(90deg, #000000, #7800ff)"
                p={4}
                borderRadius="20px"
                width="100%"
                textAlign="center"
                border="2px solid"
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
              {/* SITE */}
              <Box
                bg="linear-gradient(90deg, #000000, #7800ff)"
                p={4}
                borderRadius="20px"
                width="100%"
                textAlign="center"
                border="2px solid"
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
              {/* SUBTOTAL */}
              <Box
                bg="linear-gradient(90deg, #000000, #7800ff)"
                p={4}
                borderRadius="20px"
                width="100%"
                textAlign="center"
                border="2px solid"
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
              {/* CTV */}
              <Box
                bg="linear-gradient(90deg, #000000, #7800ff)"
                p={4}
                borderRadius="20px"
                width="100%"
                textAlign="center"
                border="2px solid"
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
              {/* TOTAL */}
              <Box
                bg="linear-gradient(90deg, #000000, #7800ff)"
                p={4}
                borderRadius="20px"
                width="100%"
                textAlign="center"
                border="2px solid"
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
              {/* Aprov */}
              <Box
                bg="linear-gradient(90deg, #000000, #7800ff)"
                p={4}
                borderRadius="20px"
                width="100%"
                textAlign="center"
                border="2px solid"
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

      {/* ======= Line Graph ======= */}
      {!isLoading && !error && (
        <Box
          bg="linear-gradient(90deg, #000000, #7800ff)"
          borderRadius="20px"
          p={[4, 6]}
          border="5px solid rgba(255, 255, 255, 0.8)"
          boxShadow="0px 0px 15px rgba(200, 200, 200, 0.5)"
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
          <Flex
            direction={["column", "row"]}
            justifyContent="space-between"
            mb={4}
            gap={4}
          >
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

            {/* Customizable Event Selection */}
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
                  .map((evt) => (
                    <option key={evt.id} value={evt.id}>
                      {evt.eventDescription || "No Description"}
                    </option>
                  ))}
              </Select>
              <Flex mt={2} wrap="wrap" gap={2}>
                {selectedEvents.map((eventId) => {
                  const event = lineGraphData.events.find((e) => e.id === eventId);
                  return (
                    <Tag
                      size="sm"
                      key={eventId}
                      borderRadius="full"
                      variant="solid"
                      colorScheme="teal"
                    >
                      <TagLabel>
                        {event ? event.eventDescription || "No Description" : "Unknown"}
                      </TagLabel>
                      <TagCloseButton
                        onClick={() => handleRemoveSelectedEvent(eventId)}
                      />
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
              <Box width="100%" maxHeight={linePlotHeight}>
                <Plot
                  data={plotData}
                  layout={{
                    autosize: true,
                    paper_bgcolor: "transparent",
                    plot_bgcolor: "transparent",
                    xaxis: {
                      title: "Event Date",
                      type: "date",
                      rangeselector: {
                        buttons: [
                          {
                            count: 1,
                            label: "1m",
                            step: "month",
                            stepmode: "backward",
                          },
                          {
                            count: 6,
                            label: "6m",
                            step: "month",
                            stepmode: "backward",
                          },
                          { step: "all" },
                        ],
                      },
                      rangeslider: { visible: true },
                      tickangle: -45,
                      automargin: true,
                      tickfont: {
                        color: "rgba(255, 255, 255, 0.7)",
                        size: 12,
                      },
                      titlefont: {
                        color: "white",
                        size: 14,
                        family: "Arial",
                        weight: "bold",
                      },
                      gridcolor: "rgba(255, 255, 255, 0.2)",
                    },
                    yaxis: {
                      title: "Count",
                      tickfont: {
                        color: "rgba(255, 255, 255, 0.7)",
                        size: 12,
                      },
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
    </Box>
  );
};

export default NewPage;
