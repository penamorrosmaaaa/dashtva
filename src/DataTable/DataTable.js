/* src/components/DataTable/DataTable.js */
import React, { useState, useMemo, useEffect } from "react";
import {
  Box,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableContainer,
  Text,
  Flex,
  Tooltip,
  Select,
  FormControl,
  FormLabel,
  Spinner,
  IconButton,
  Button,
  Input,
  ButtonGroup,
} from "@chakra-ui/react";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from "@chakra-ui/icons";
import Plot from "react-plotly.js";
import Papa from "papaparse";

// Function to get RGBA fill color based on line color
function getFillColor(lineColor) {
  if (lineColor === "red") {
    return "rgba(255, 0, 0, 0.2)";
  } else if (lineColor === "green") {
    return "rgba(0, 255, 0, 0.2)";
  }
  // Default fill color if needed
  return "rgba(0, 0, 255, 0.2)";
}

const DataTable = () => {
  // ============================
  // 1. State Declarations
  // ============================

  // State to manage all CSV data
  const [allData, setAllData] = useState([]);

  // State to manage table data
  const [tableData, setTableData] = useState([]);

  // State to track loading and error states
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // State to store the most recent date found in CSV
  const [mostRecentDate, setMostRecentDate] = useState(null);

  // State to manage the currently selected date
  const [currentDate, setCurrentDate] = useState(null);

  // State to manage the selected row for detailed graph
  const [selectedRow, setSelectedRow] = useState(null);

  // State for day of week selection
  const [selectedDay, setSelectedDay] = useState("");

  // State for comparison mode
  const [isComparing, setIsComparing] = useState(false);
  const [compareDay, setCompareDay] = useState("");

  // State to manage expand/collapse
  const [isExpanded, setIsExpanded] = useState(false);

  // State for Selected Date Range
  const [selectedDateRange, setSelectedDateRange] = useState("1W"); // Default to 1 Week

  // ============================
  // 2. Function Definitions
  // ============================

  // Function to handle row click
  const handleRowClick = (row) => {
    setSelectedRow(row);
    // Reset day selection and comparison when a new row is selected
    setSelectedDay("");
    setIsComparing(false);
    setCompareDay("");
  };

  // Function to navigate to the previous date
  const goToPreviousDate = () => {
    if (currentIndex < sortedDates.length - 1) {
      setCurrentDate(sortedDates[currentIndex + 1]);
    }
  };

  // Function to navigate to the next date
  const goToNextDate = () => {
    if (currentIndex > 0) {
      setCurrentDate(sortedDates[currentIndex - 1]);
    }
  };

  // Function to handle date range change
  const handleDateRangeChange = (range) => {
    setSelectedDateRange(range);
  };

  // ============================
  // 3. Data Fetching and Processing
  // ============================

  // Fetch and process CSV data on component mount
  useEffect(() => {
    const csvUrl =
      "https://docs.google.com/spreadsheets/d/e/2PACX-1vTVHwv5X6-u3M7f8HJNih14hSnVpBlNKFUe_O76bTUJ2PaaOAfrqIrwjWsyc9DNFKxcYoEsWutl1_K6/pub?output=csv";

    Papa.parse(csvUrl, {
      download: true,
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          const data = results.data;

          // Extract all unique dates and find the most recent one
          const dates = data
            .map((row) => row.Date)
            .filter((date) => date)
            .sort((a, b) => new Date(a) - new Date(b));

          if (dates.length === 0) {
            throw new Error("No dates found in the CSV data.");
          }

          const latestDate = dates[dates.length - 1];
          setMostRecentDate(latestDate);
          setCurrentDate(latestDate);

          // Filter data for the most recent date
          const recentData = data.filter((row) => row.Date === latestDate);

          if (recentData.length === 0) {
            throw new Error("No data available for the most recent date.");
          }

          // Convert Request Count to integer
          const processedData = recentData.map((row) => ({
            object: row.Object,
            requestCount: parseInt(row["Request Count"], 10),
          }));

          // Sort by requestCount descending
          processedData.sort((a, b) => b.requestCount - a.requestCount);

          // Take top 50
          const top50 = processedData.slice(0, 50);

          // Calculate total requests for percentage
          const totalRequests = top50.reduce(
            (sum, row) => sum + row.requestCount,
            0
          );

          // Map to tableData format with percentage and amount
          const formattedData = top50.map((row) => ({
            object: row.object,
            percentage: `${(
              (row.requestCount / totalRequests) *
              100
            ).toFixed(1)}%`,
            amount: row.requestCount.toLocaleString(),
          }));

          setTableData(formattedData);
          setAllData(data); // Store all data for historical purposes
          setLoading(false);
        } catch (err) {
          console.error("Error processing CSV data:", err);
          setError(err.message || "Failed to process data.");
          setLoading(false);
        }
      },
      error: (err) => {
        console.error("Error fetching CSV data:", err);
        setError("Failed to fetch data.");
        setLoading(false);
      },
    });
  }, []);

  // ============================
  // 4. Derived Data with useMemo
  // ============================

  // Get all unique dates sorted descending (newest first)
  const sortedDates = useMemo(() => {
    const uniqueDates = Array.from(new Set(allData.map((row) => row.Date)))
      .filter((date) => date)
      .sort((a, b) => new Date(b) - new Date(a));
    return uniqueDates;
  }, [allData]);

  const currentIndex = useMemo(() => {
    return sortedDates.indexOf(currentDate);
  }, [currentDate, sortedDates]);

  // Compute displayedData based on currentDate
  const displayedData = useMemo(() => {
    if (!currentDate) return [];

    // Filter data for the currentDate
    const recentData = allData.filter((row) => row.Date === currentDate);

    if (recentData.length === 0) {
      return [];
    }

    // Convert Request Count to integer
    const processedData = recentData.map((row) => ({
      object: row.Object,
      requestCount: parseInt(row["Request Count"], 10),
    }));

    // Sort by requestCount descending
    processedData.sort((a, b) => b.requestCount - a.requestCount);

    // Take top 50
    const top50 = processedData.slice(0, 50);

    // Calculate total requests for percentage
    const totalRequests = top50.reduce(
      (sum, row) => sum + row.requestCount,
      0
    );

    // Map to tableData format with percentage and amount
    const formattedData = top50.map((row) => ({
      object: row.object,
      percentage: `${((row.requestCount / totalRequests) * 100).toFixed(
        1
      )}%`,
      amount: row.requestCount.toLocaleString(),
    }));

    return formattedData;
  }, [currentDate, allData]);

  // Calculate the maximum length of 'object' field
  const maxObjectLength = useMemo(() => {
    if (!displayedData || displayedData.length === 0) return 0;
    return Math.max(...displayedData.map((row) => row.object.length));
  }, [displayedData]);

  // Determine the font size based on the maximum object length
  const objectFontSize = useMemo(() => {
    if (maxObjectLength > 100) return "xs";
    if (maxObjectLength > 50) return "sm";
    return "md";
  }, [maxObjectLength]);

  // Memoized historic data for the selected row to optimize performance
  const historicData = useMemo(() => {
    if (!selectedRow) return [];

    // Filter allData for the selected object
    const filtered = allData.filter(
      (row) => row.Object === selectedRow.object && row.Date
    );

    // Map to desired format
    const mappedData = filtered.map((row) => {
      // Accurate Date Parsing
      const dateParts = row.Date.split("-");
      if (dateParts.length !== 3) {
        console.error(`Invalid date format for row: ${row.Date}`);
        return {
          x: row.Date,
          y: parseInt(row["Request Count"], 10),
          dayOfWeek: null,
          isSunday: false,
        };
      }

      const [year, month, day] = dateParts.map(Number);
      if (
        isNaN(year) ||
        isNaN(month) ||
        isNaN(day) ||
        month < 1 ||
        month > 12 ||
        day < 1 ||
        day > 31
      ) {
        console.error(`Invalid date components for row: ${row.Date}`);
        return {
          x: row.Date,
          y: parseInt(row["Request Count"], 10),
          dayOfWeek: null,
          isSunday: false,
        };
      }

      // Create a UTC date to avoid timezone issues
      const dateObj = new Date(Date.UTC(year, month - 1, day));

      return {
        x: row.Date,
        y: parseInt(row["Request Count"], 10),
        dateObj: dateObj,
        dayOfWeek: dateObj.getUTCDay(),
        isSunday: dateObj.getUTCDay() === 0,
      };
    });

    // Remove any entries with invalid dates
    const validMappedData = mappedData.filter((d) => d.dayOfWeek !== null);

    // Sort by date ascending for the graph (oldest first)
    validMappedData.sort((a, b) => new Date(a.x) - new Date(b.x));

    return validMappedData;
  }, [selectedRow, allData]);

  // Calculate date ranges based on selectedDateRange
  const dateRange = useMemo(() => {
    if (!currentDate) return null;

    const endDate = new Date(currentDate);
    let startDate = new Date(currentDate);

    switch (selectedDateRange) {
      case "1W":
        startDate.setDate(startDate.getDate() - 7);
        break;
      case "1M":
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      case "6M":
        startDate.setMonth(startDate.getMonth() - 6);
        break;
      case "1Y":
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
      case "All":
        startDate = new Date(historicData[0]?.x || currentDate);
        break;
      default:
        startDate.setMonth(startDate.getMonth() - 1); // Default to 1 Month
    }

    return {
      start: startDate,
      end: endDate,
    };
  }, [currentDate, selectedDateRange, historicData]);

  // Function to filter historic data based on selected day and comparison
  const getFilteredData = () => {
    const daysMap = {
      Sunday: 0,
      Monday: 1,
      Tuesday: 2,
      Wednesday: 3,
      Thursday: 4,
      Friday: 5,
      Saturday: 6,
    };

    let primary = historicData;

    if (selectedDay !== "") {
      const dayNumber = daysMap[selectedDay];
      primary = primary.filter((d) => d.dayOfWeek === dayNumber);
    }

    let comparison = [];
    if (isComparing && compareDay !== "") {
      const compareDayNumber = daysMap[compareDay];
      comparison = historicData.filter(
        (d) => d.dayOfWeek === compareDayNumber
      );
    }

    return { primary: primary, comparison: comparison };
  };

  const filteredData = getFilteredData();

  // Prepare data traces for Plotly
  const prepareTraces = () => {
    const traces = [];

    // Primary Trace
    traces.push({
      x: filteredData.primary.map((d) => d.x),
      y: filteredData.primary.map((d) => d.y),
      type: "scatter",
      mode: "lines+markers",
      name: selectedDay === "" ? "All Days" : selectedDay,
      line: {
        color: "green",
        width: 2,
        shape: "spline",
      },
      marker: {
        color: filteredData.primary.map((d) => (d.isSunday ? "red" : "green")),
        size: 6,
      },
      fill: "tozeroy",
      fillcolor: getFillColor("green"),
      hovertemplate: "%{x|%b %d, %Y}<br>Amount: %{y}<extra></extra>",
    });

    // Comparison Trace
    if (isComparing && compareDay !== "") {
      traces.push({
        x: filteredData.comparison.map((d) => d.x),
        y: filteredData.comparison.map((d) => d.y),
        type: "scatter",
        mode: "lines+markers",
        name: `Compare: ${compareDay}`,
        line: {
          color: "orange",
          width: 2,
          shape: "spline",
        },
        marker: {
          color: "orange",
          size: 6,
        },
        fill: "tozeroy",
        fillcolor: "rgba(255, 165, 0, 0.2)",
        hovertemplate: "%{x|%b %d, %Y}<br>Amount: %{y}<extra></extra>",
      });
    }

    return traces;
  };

  const traces = prepareTraces();

  // Function to determine the graph title
  const getGraphTitle = () => {
    if (!selectedRow) return "Select a Row to View Details";

    let title = `${selectedRow.object} - Request Count Over Time`;
    if (selectedDay !== "") {
      title += ` (${selectedDay})`;
    }

    if (isComparing && compareDay !== "") {
      title += ` | Comparing with ${compareDay}`;
    }

    return title;
  };

  // Function to handle date change from date picker
  const handleDateChange = (e) => {
    const selectedDate = e.target.value;
    if (sortedDates.includes(selectedDate)) {
      setCurrentDate(selectedDate);
    } else {
      alert("Selected date does not have available data.");
    }
  };

  // Function to format date to YYYY-MM-DD
  const formatDate = (date) => {
    const d = new Date(date);
    const month = `0${d.getUTCMonth() + 1}`.slice(-2);
    const day = `0${d.getUTCDate()}`.slice(-2);
    const year = d.getUTCFullYear();
    return `${year}-${month}-${day}`;
  };

  // ============================
  // 4.1. Adjusted lastSevenDates Calculation
  // ============================

  // Generate the last seven dates starting from currentDate -1
  const lastSevenDates = useMemo(() => {
    if (!currentDate) return [];
    const dates = [];
    const current = new Date(currentDate);
    for (let i = 1; i <= 7; i++) { // Start from 1 to exclude currentDate
      const d = new Date(current);
      d.setDate(current.getDate() - i);
      dates.push(formatDate(d));
    }
    return dates;
  }, [currentDate]);

  // ============================
  // 4.2. Updated Display Last Seven Dates (Shift Labels by One Day Earlier)
  // ============================

  // Format dates for better display in headers and shift labels by one day earlier
  const displayLastSevenDates = useMemo(() => {
    return lastSevenDates.map((dateStr) => {
      const d = new Date(dateStr);
      d.setDate(d.getDate() + 1); // Shift label by one day earlier
      return d.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      });
    });
  }, [lastSevenDates]);

  // ============================
  // 4.3. Update formattedCurrentDate
  // ============================

  // Define a formatted date for table headers (e.g., "Nov 15")
  const formattedCurrentDate = useMemo(() => {
    if (!currentDate) return "";
    const d = new Date(currentDate);
    d.setDate(d.getDate() + 1); // **Add one day to the currentDate**
    return d.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });
  }, [currentDate]);

  // ============================
  // 4.4. Determine Flex direction based on isExpanded
  // ============================

  const flexDirection = useMemo(() => {
    if (isExpanded) return "column";
    return { base: "column", md: "row" };
  }, [isExpanded]);

  // ============================
  // 5. Early Returns for Loading and Error
  // ============================

  // Loading State
  if (loading) {
    return (
      <Box
        p={5}
        minH="100vh"
        color="white"
        display="flex"
        justifyContent="center"
        alignItems="center"
      >
        <Spinner size="xl" />
        <Text ml={4} fontSize="2xl">
          Loading data...
        </Text>
      </Box>
    );
  }

  // Error State
  if (error) {
    return (
      <Box
        p={5}
        minH="100vh"
        color="white"
        display="flex"
        justifyContent="center"
        alignItems="center"
      >
        <Text fontSize="2xl" color="red.500">
          {error}
        </Text>
      </Box>
    );
  }

  // ============================
  // 6. Helper Function
  // ============================

  // Helper function to get data for the past 7 days for a specific object
  const getPastSevenDaysData = (object) => {
    if (!lastSevenDates.length) return [];
    return lastSevenDates.map((date) => {
      const row = allData.find(
        (r) => r.Date === date && r.Object === object
      );
      if (!row) return "-";
      const requestCount = parseInt(row["Request Count"], 10);
      if (isNaN(requestCount) || requestCount === 0) return "-";
      return requestCount.toLocaleString();
    });
  };

  // ============================
  // 7. Render Component
  // ============================

  return (
    <Box
      p={5}
      minH="100vh"
      color="white"
      display="flex"
      flexDirection="column"
      alignItems="center"
      overflow="hidden"
    >
      {/* Table and Detailed Graph Section */}
      <Flex
        direction={flexDirection}
        width={{ base: "100%", md: "87%" }}
        overflow="hidden"
      >
        {/* Table Section */}
        <Box
          bg="linear-gradient(90deg, #000000, #7800ff)"
          border="5px solid"
          borderColor="rgba(255, 255, 255, 0.8)"
          borderRadius="20px"
          p={6}
          boxShadow="lg"
          flex="1"
          mr={{ base: 0, md: isExpanded ? 0 : 8 }}
          mb={{ base: 8, md: isExpanded ? 4 : 0 }}
          overflow="hidden"
        >
          {/* Navigation Arrows and Date Selection */}
          <Flex alignItems="center" mb={4}>
            <IconButton
              icon={<ChevronLeftIcon />}
              onClick={goToPreviousDate}
              isDisabled={currentIndex >= sortedDates.length - 1}
              aria-label="Previous Date"
              mr={2}
            />
            <Text fontSize="md" mr={2}>
              Viewing Data for:
            </Text>
            {/* Calendar Input for Date Selection */}
            <Flex alignItems="center">
              <Input
                type="date"
                value={currentDate || ""}
                onChange={handleDateChange}
                max={mostRecentDate}
                bg="white"
                color="black"
                size="sm"
                mr={2}
              />
            </Flex>
            <IconButton
              icon={<ChevronRightIcon />}
              onClick={goToNextDate}
              isDisabled={currentIndex <= 0}
              aria-label="Next Date"
              ml={2}
            />
          </Flex>

          {/* Expand/Collapse Button */}
          <Flex justifyContent="flex-end" mb={2}>
            <Button
              onClick={() => setIsExpanded(!isExpanded)}
              leftIcon={isExpanded ? <ChevronUpIcon /> : <ChevronDownIcon />}
              size="sm"
              colorScheme="none"
            >
              {isExpanded ? "Collapse" : "Expand"}
            </Button>
          </Flex>

          {/* Updated TableContainer with Hidden Scrollbar and Uniform Font Size */}
          <TableContainer
            overflowY="auto"
            maxH="600px"
            overflowX="auto"
            sx={{
              scrollbarWidth: "none", // Firefox
              msOverflowStyle: "none", // IE 10+
              "&::-webkit-scrollbar": {
                display: "none",
              },
            }}
          >
            <Table variant="simple" size="sm" sx={{ tableLayout: "auto" }}>
              <Thead>
                <Tr>
                  <Th
                    maxW="200px"
                    whiteSpace="normal"
                    wordBreak="break-word"
                    color="white"
                  >
                    Object
                  </Th>
                  {/* Conditionally hide Percentage column when expanded */}
                  {!isExpanded && (
                    <Th isNumeric color="white">
                      Percentage
                    </Th>
                  )}
                  <Th isNumeric color="white">
                    {formattedCurrentDate} {/* Updated to currentDate + 1 day */}
                  </Th>
                  {/* Conditionally render past 7 days headers in descending order */}
                  {isExpanded &&
                    displayLastSevenDates.map((date, i) => (
                      <Th
                        key={i}
                        isNumeric
                        color="white"
                        fontSize="sm"
                        p={2}
                      >
                        {date} {/* Labels shifted by one day earlier */}
                      </Th>
                    ))}
                </Tr>
              </Thead>
              <Tbody>
                {displayedData.map((row, index) => (
                  <Tr
                    key={index}
                    _hover={{
                      cursor: "pointer",
                    }}
                    onClick={() => handleRowClick(row)}
                    bg={
                      selectedRow && selectedRow.object === row.object
                        ? "rgba(255, 255, 255, 0.3)"
                        : "transparent"
                    }
                  >
                    <Td>
                      <Tooltip label={row.object} hasArrow>
                        <Text
                          whiteSpace="normal"
                          wordBreak="break-word"
                          fontSize={objectFontSize}
                        >
                          {row.object}
                        </Text>
                      </Tooltip>
                    </Td>
                    {/* Conditionally hide Percentage cell when expanded */}
                    {!isExpanded && <Td isNumeric>{row.percentage}</Td>}
                    <Td isNumeric>{row.amount}</Td>
                    {/* Conditionally render past 7 days data */}
                    {isExpanded &&
                      getPastSevenDaysData(row.object).map((count, i) => (
                        <Td key={i} isNumeric fontSize="sm" p={2}>
                          {count}
                        </Td>
                      ))}
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </TableContainer>
        </Box>

        {/* Detailed Graph Section */}
        <Box
          bg="linear-gradient(90deg, #000000, #7800ff)"
          border="5px solid"
          borderColor="rgba(255, 255, 255, 0.8)"
          borderRadius="20px"
          p={6}
          boxShadow="lg"
          flex="1"
          mt={isExpanded ? 8 : 0}
          overflow="hidden"
        >
          <Flex direction="column" alignItems="center" mb={4}>
            <Text fontSize="2xl" mb={4} textAlign="center">
              {getGraphTitle()}
            </Text>
            {selectedRow && (
              <>
                {/* Date Range Buttons */}
                <ButtonGroup mb={4} size="sm" isAttached variant="outline">
                  {/* "1W" Button */}
                  <Button
                    onClick={() => handleDateRangeChange("1W")}
                    colorScheme={selectedDateRange === "1W" ? "teal" : "gray"}
                    color="white"
                  >
                    1W
                  </Button>
                  {/* Existing Date Range Buttons */}
                  <Button
                    onClick={() => handleDateRangeChange("1M")}
                    colorScheme={selectedDateRange === "1M" ? "teal" : "gray"}
                    color="white"
                  >
                    1M
                  </Button>
                  <Button
                    onClick={() => handleDateRangeChange("6M")}
                    colorScheme={selectedDateRange === "6M" ? "teal" : "gray"}
                    color="white"
                  >
                    6M
                  </Button>
                  <Button
                    onClick={() => handleDateRangeChange("1Y")}
                    colorScheme={selectedDateRange === "1Y" ? "teal" : "gray"}
                    color="white"
                  >
                    1Y
                  </Button>
                  <Button
                    onClick={() => handleDateRangeChange("All")}
                    colorScheme={selectedDateRange === "All" ? "teal" : "gray"}
                    color="white"
                  >
                    All
                  </Button>
                </ButtonGroup>

                <Flex
                  direction={{ base: "column", md: "row" }}
                  gap={4}
                  mb={4}
                  width="100%"
                  maxW="600px"
                >
                  {/* Day-of-Week Dropdown */}
                  <FormControl>
                    <FormLabel>Select Day of Week</FormLabel>
                    <Select
                      value={selectedDay}
                      onChange={(e) => setSelectedDay(e.target.value)}
                      placeholder="Select Day"
                      bg="white"
                      color="black"
                    >
                      <option value="Monday">Monday</option>
                      <option value="Tuesday">Tuesday</option>
                      <option value="Wednesday">Wednesday</option>
                      <option value="Thursday">Thursday</option>
                      <option value="Friday">Friday</option>
                      <option value="Saturday">Saturday</option>
                      <option value="Sunday">Sunday</option>
                    </Select>
                  </FormControl>

                  {/* Compare Button */}
                  <FormControl>
                    <FormLabel>Comparison</FormLabel>
                    <Flex alignItems="center">
                      <Select
                        value={compareDay}
                        onChange={(e) => setCompareDay(e.target.value)}
                        placeholder="Select Day"
                        isDisabled={!isComparing}
                        maxW="200px"
                        bg="white"
                        color="black"
                      >
                        <option value="Monday">Monday</option>
                        <option value="Tuesday">Tuesday</option>
                        <option value="Wednesday">Wednesday</option>
                        <option value="Thursday">Thursday</option>
                        <option value="Friday">Friday</option>
                        <option value="Saturday">Saturday</option>
                        <option value="Sunday">Sunday</option>
                      </Select>
                      <Box ml={2}>
                        <Button
                          onClick={() => setIsComparing(!isComparing)}
                          colorScheme={isComparing ? "teal" : "blue"}
                          variant={isComparing ? "solid" : "outline"}
                          bg={isComparing ? "teal.400" : "blue.200"}
                          _hover={{
                            bg: isComparing ? "teal.500" : "blue.300",
                          }}
                          size="sm"
                        >
                          {isComparing ? "Cancel Compare" : "Compare"}
                        </Button>
                      </Box>
                    </Flex>
                  </FormControl>
                </Flex>
              </>
            )}
          </Flex>
          {selectedRow ? (
            <Box overflow="auto">
              <Plot
                data={traces}
                layout={{
                  autosize: true,
                  height: 500,
                  margin: { l: 50, r: 50, t: 50, b: 100 },
                  paper_bgcolor: "rgba(0,0,0,0)",
                  plot_bgcolor: "rgba(0,0,0,0)",
                  dragmode: "zoom",
                  xaxis: {
                    title: "Date",
                    type: "date",
                    showgrid: true,
                    gridcolor: "#444",
                    tickfont: { color: "white" },
                    tickangle: -45,
                    automargin: true,
                    tickformat: "%b %d, %Y",
                    // Set initial range based on selectedDateRange and currentDate
                    range: [
                      formatDate(dateRange.start),
                      formatDate(dateRange.end),
                    ],
                  },
                  yaxis: {
                    title: "Amount",
                    showgrid: true,
                    gridcolor: "#444",
                    tickfont: { color: "white" },
                    autorange: true, // Ensure y-axis adjusts automatically
                  },
                  font: {
                    color: "white",
                  },
                  legend: {
                    orientation: "h",
                    y: -0.2,
                    x: 0.5,
                    xanchor: "center",
                    yanchor: "top",
                  },
                }}
                config={{
                  displayModeBar: true,
                  displaylogo: false,
                  modeBarButtonsToRemove: [
                    "hoverClosestCartesian",
                    "hoverCompareCartesian",
                  ],
                  scrollZoom: true,
                  doubleClick: "reset", // Ensures double-click resets the zoom
                }}
                useResizeHandler={true}
                style={{ width: "100%", height: "100%" }}
              />
            </Box>
          ) : (
            <Text textAlign="center" color="gray.300">
              Click on a row to view the historic graph.
            </Text>
          )}
        </Box>
      </Flex>
    </Box>
  );
};

export default DataTable;
