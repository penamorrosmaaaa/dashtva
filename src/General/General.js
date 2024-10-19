// src/components/General/General.js

import React, { useState, useEffect, useMemo } from "react";
import {
  Box,
  Text,
  Flex,
  Spinner,
  Button,
  Select,
  Grid,
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverArrow,
  PopoverCloseButton,
  PopoverHeader,
  PopoverBody,
  Input,
  IconButton,
  useToast,
} from "@chakra-ui/react";
import Papa from "papaparse";
import { FaCalendar, FaArrowLeft, FaArrowRight } from "react-icons/fa"; // Importing Calendar and Arrow Icons

// Define the time periods
const PERIODS = {
  CURRENT_WEEK: "Current Week",
  CURRENT_MONTH: "Current Month",
  CURRENT_YEAR: "Current Year",
  ALL_TIME: "All-Time",
};

// Helper function to get the start of the week (Monday)
const getStartOfWeek = (date) => {
  const d = new Date(date);
  const day = d.getDay(); // 0 (Sun) to 6 (Sat)
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is Sunday
  return new Date(d.setDate(diff));
};

// Helper function to get the end of the week (Sunday)
const getEndOfWeek = (date) => {
  const d = new Date(date);
  const day = d.getDay(); // 0 (Sun) to 6 (Sat)
  const diff = day === 0 ? 0 : 7 - day;
  return new Date(d.setDate(d.getDate() + diff));
};

// Helper function to parse dates as local dates
const parseLocalDate = (dateStr) => {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day); // Months are 0-indexed
};

// Utility function to calculate percentage change
const calculatePercentageChange = (current, previous) => {
  if (previous === 0 || previous === null) return "N/A";
  const change = ((current - previous) / previous) * 100;
  return change.toFixed(0); // No decimals
};

const General = () => {
  // State variables
  const [totalData, setTotalData] = useState([]);
  const [envivoData, setEnvivoData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [comparisonMode, setComparisonMode] = useState("percentage"); // 'percentage' or 'raw'
  const [selectedPeriod, setSelectedPeriod] = useState(PERIODS.CURRENT_MONTH); // **Default to Current Month**
  const [averageData, setAverageData] = useState({
    totalAvg: "N/A",
    envivoAvg: "N/A",
  });
  
  // **New State for Selected Date**
  const [selectedDate, setSelectedDate] = useState(null); // Stores the user-selected date

  const toast = useToast(); // For user feedback

  // Fetch and parse CSV data
  useEffect(() => {
    const csvUrl =
      "https://docs.google.com/spreadsheets/d/e/2PACX-1vTVHwv5X6-u3M7f8HJNih14hSnVpBlNKFUe_O76bTUJ2PaaOAfrqIrwjWsyc9DNFKxcYoEsWutl1_K6/pub?output=csv";

    Papa.parse(csvUrl, {
      download: true,
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          const parsedData = results.data;

          // Debug: Log first few rows to verify data
          console.log("Parsed CSV Data Sample:", parsedData.slice(0, 5));

          // Process total request counts per day
          const totalRequestsMap = {};
          const envivoRequestsMap = {};

          parsedData.forEach((row, index) => {
            const date = row["Date"]?.trim();
            const object = row["Object"]?.trim();
            const requestCountStr = row["Request Count"]?.trim();
            const requestCount = parseInt(requestCountStr, 10);

            if (!date || isNaN(requestCount)) {
              console.warn(`Skipping row ${index + 2} due to missing date or request count.`);
              return;
            }

            // Aggregate total requests
            if (!totalRequestsMap[date]) {
              totalRequestsMap[date] = 0;
            }
            totalRequestsMap[date] += requestCount;

            // Aggregate envivo query requests
            // Ensure exact match with leading slash
            if (object.toLowerCase() === "/envivo/query") {
              if (!envivoRequestsMap[date]) {
                envivoRequestsMap[date] = 0;
              }
              envivoRequestsMap[date] += requestCount;
            }
          });

          // Convert maps to sorted arrays
          const sortedDates = Object.keys(totalRequestsMap).sort(
            (a, b) => parseLocalDate(a) - parseLocalDate(b)
          );

          const totalRequestsData = sortedDates.map((date) => ({
            date,
            totalRequests: totalRequestsMap[date],
          }));

          const envivoRequestsData = sortedDates.map((date) => ({
            date,
            envivoRequests: envivoRequestsMap[date] || 0,
          }));

          // Debug: Log aggregated data
          console.log("Total Requests Data:", totalRequestsData);
          console.log("Envivo Requests Data:", envivoRequestsData);

          setTotalData(totalRequestsData);
          setEnvivoData(envivoRequestsData);
          setIsLoading(false);
        } catch (err) {
          console.error("Error processing CSV data:", err);
          setError("Failed to process data.");
          setIsLoading(false);
        }
      },
      error: (err) => {
        console.error("Error fetching CSV data:", err);
        setError("Failed to fetch data.");
        setIsLoading(false);
      },
    });
  }, []);

  // **Helper Function to Filter Data Based on Selected Period or Selected Date**
  const filterData = (period, date) => {
    if (totalData.length === 0) return { filteredTotal: [], filteredEnvivo: [] };

    if (date) {
      // If a specific date is selected
      const totalForDate = totalData.find((d) => d.date === date);
      const envivoForDate = envivoData.find((d) => d.date === date);
      return {
        filteredTotal: totalForDate ? [totalForDate] : [],
        filteredEnvivo: envivoForDate ? [envivoForDate] : [],
      };
    } else {
      // Filter based on the selected period
      const latestDateStr = totalData[totalData.length - 1].date;
      const latestDate = parseLocalDate(latestDateStr);

      console.log(`Selected Period: ${period}`);
      console.log(`Latest Date: ${latestDate.toISOString().split('T')[0]}`);

      let filteredTotal = [];
      let filteredEnvivo = [];

      switch (period) {
        case PERIODS.CURRENT_WEEK:
          const startOfWeek = getStartOfWeek(latestDate);
          const endOfWeek = getEndOfWeek(latestDate);
          console.log(`Start of Week (Monday): ${startOfWeek.toISOString().split('T')[0]}`);
          console.log(`End of Week (Sunday): ${endOfWeek.toISOString().split('T')[0]}`);
          filteredTotal = totalData.filter((d) => {
            const current = parseLocalDate(d.date);
            return current >= startOfWeek && current <= endOfWeek;
          });
          filteredEnvivo = envivoData.filter((d) => {
            const current = parseLocalDate(d.date);
            return current >= startOfWeek && current <= endOfWeek;
          });
          break;

        case PERIODS.CURRENT_MONTH:
          const currentMonth = latestDate.getMonth(); // 0-11
          const currentYear = latestDate.getFullYear();
          filteredTotal = totalData.filter(
            (d) =>
              parseLocalDate(d.date).getMonth() === currentMonth &&
              parseLocalDate(d.date).getFullYear() === currentYear
          );
          filteredEnvivo = envivoData.filter(
            (d) =>
              parseLocalDate(d.date).getMonth() === currentMonth &&
              parseLocalDate(d.date).getFullYear() === currentYear
          );
          break;

        case PERIODS.CURRENT_YEAR:
          const year = latestDate.getFullYear();
          filteredTotal = totalData.filter(
            (d) => parseLocalDate(d.date).getFullYear() === year
          );
          filteredEnvivo = envivoData.filter(
            (d) => parseLocalDate(d.date).getFullYear() === year
          );
          break;

        case PERIODS.ALL_TIME:
        default:
          filteredTotal = [...totalData];
          filteredEnvivo = [...envivoData];
          break;
      }

      console.log(`Filtered Total Data Count: ${filteredTotal.length}`);
      console.log(`Filtered Envivo Data Count: ${filteredEnvivo.length}`);

      return { filteredTotal, filteredEnvivo };
    }
  };

  // Calculate averages based on selected period or selected date
  useEffect(() => {
    const { filteredTotal, filteredEnvivo } = filterData(selectedPeriod, selectedDate);

    if (filteredTotal.length === 0) {
      setAverageData({
        totalAvg: "N/A",
        envivoAvg: "N/A",
      });
      return;
    }

    const totalSum = filteredTotal.reduce((sum, d) => sum + d.totalRequests, 0);
    const envivoSum = filteredEnvivo.reduce((sum, d) => sum + d.envivoRequests, 0);

    const totalAvg = (totalSum / filteredTotal.length).toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }); // No decimals
    const envivoAvg = (envivoSum / filteredEnvivo.length).toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }); // No decimals

    setAverageData({
      totalAvg,
      envivoAvg,
    });
  }, [selectedPeriod, selectedDate, totalData, envivoData]);

  // **Function to Find Data from 7 Days Ago**
  const findDataSevenDaysAgo = (date, dataSet) => {
    const current = new Date(date);
    current.setDate(current.getDate() - 7);
    const formattedDate = current.toISOString().split("T")[0];
    const previousData = dataSet.find((d) => d.date === formattedDate);
    return previousData ? previousData : null;
  };

  // Calculate changes for Total Requests
  const currentTotalRequest = useMemo(() => {
    if (selectedDate) {
      const data = totalData.find((d) => d.date === selectedDate);
      return data ? data.totalRequests : null; // Corrected: 'data' instead of 'd'
    }
    if (totalData.length === 0) return null;
    return totalData[totalData.length - 1].totalRequests;
  }, [totalData, selectedDate]);

  const previousTotalRequest = useMemo(() => {
    if (currentTotalRequest === null) return null;
    const currentDate = selectedDate || totalData[totalData.length - 1].date;
    const previousData = findDataSevenDaysAgo(currentDate, totalData);
    return previousData ? previousData.totalRequests : null;
  }, [totalData, currentTotalRequest, selectedDate]);

  const totalRequestChange = useMemo(() => {
    if (previousTotalRequest === null || currentTotalRequest === null) return "N/A";
    const change = currentTotalRequest - previousTotalRequest;
    return change.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 }); // No decimals
  }, [currentTotalRequest, previousTotalRequest]);

  const totalPercentageChange = useMemo(() => {
    if (previousTotalRequest === null || currentTotalRequest === null) return "N/A";
    return calculatePercentageChange(currentTotalRequest, previousTotalRequest);
  }, [currentTotalRequest, previousTotalRequest]);

  // Calculate changes for Envivo Query
  const currentEnvivoRequest = useMemo(() => {
    if (selectedDate) {
      const data = envivoData.find((d) => d.date === selectedDate);
      return data ? data.envivoRequests : null;
    }
    if (envivoData.length === 0) return null;
    return envivoData[envivoData.length - 1].envivoRequests;
  }, [envivoData, selectedDate]);

  const previousEnvivoRequest = useMemo(() => {
    if (currentEnvivoRequest === null) return null;
    const currentDate = selectedDate || envivoData[envivoData.length - 1].date;
    const previousData = findDataSevenDaysAgo(currentDate, envivoData);
    return previousData ? previousData.envivoRequests : null;
  }, [envivoData, currentEnvivoRequest, selectedDate]);

  const envivoRequestChange = useMemo(() => {
    if (previousEnvivoRequest === null || currentEnvivoRequest === null) return "N/A";
    const change = currentEnvivoRequest - previousEnvivoRequest;
    return change.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 }); // No decimals
  }, [currentEnvivoRequest, previousEnvivoRequest]);

  const envivoPercentageChange = useMemo(() => {
    if (previousEnvivoRequest === null || currentEnvivoRequest === null) return "N/A";
    return calculatePercentageChange(currentEnvivoRequest, previousEnvivoRequest);
  }, [currentEnvivoRequest, previousEnvivoRequest]);

  // Toggle comparison mode
  const toggleComparisonMode = () => {
    setComparisonMode((prev) => (prev === "percentage" ? "raw" : "percentage"));
  };

  // **Compute the Latest or Selected Date Label**
  const latestDateLabel = useMemo(() => {
    if (selectedDate) {
      const selected = parseLocalDate(selectedDate);
      const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
      return `Viewing data for ${selected.toLocaleDateString(undefined, options)}`;
    }

    if (totalData.length === 0) return "No data available";
    const latestDateStr = totalData[totalData.length - 1].date;
    const latestDate = parseLocalDate(latestDateStr);
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return `Viewing data for ${latestDate.toLocaleDateString(undefined, options)}`;
  }, [selectedDate, totalData]);

  // **Handle Date Selection**
  const handleDateChange = (e) => {
    const date = e.target.value;
    if (date) {
      setSelectedDate(date);
      toast({
        title: "Date Selected",
        description: `Viewing data for ${date}`,
        status: "success",
        duration: 3000,
        isClosable: true,
      });
    }
  };

  // **Function to Reset Selected Date**
  const resetSelectedDate = () => {
    setSelectedDate(null);
    toast({
      title: "Date Reset",
      description: "Viewing data based on selected period.",
      status: "info",
      duration: 3000,
      isClosable: true,
    });
  };

  // **Helper Function for Color Coding**
  const comparisonColor = (change) => {
    if (change === "N/A") return "gray.400";
    return change >= 0 ? "green.400" : "red.400";
  };

  // **Handle Arrow Navigation**
  const navigateDate = (direction) => {
    if (!totalData.length) return;

    // Determine the current date
    const currentDate = selectedDate || totalData[totalData.length - 1].date;
    const currentIndex = totalData.findIndex((d) => d.date === currentDate);

    if (direction === "left" && currentIndex > 0) {
      const newDate = totalData[currentIndex - 1].date;
      setSelectedDate(newDate);
      toast({
        title: "Date Changed",
        description: `Viewing data for ${newDate}`,
        status: "success",
        duration: 3000,
        isClosable: true,
      });
    } else if (direction === "right" && currentIndex < totalData.length - 1) {
      const newDate = totalData[currentIndex + 1].date;
      setSelectedDate(newDate);
      toast({
        title: "Date Changed",
        description: `Viewing data for ${newDate}`,
        status: "success",
        duration: 3000,
        isClosable: true,
      });
    }
  };

  return (
    <>
      {isLoading ? (
        <Flex justifyContent="center" alignItems="center" height="50vh">
          <Spinner size="xl" color="teal.500" />
          <Text ml={4} fontSize="xl">
            Loading data...
          </Text>
        </Flex>
      ) : error ? (
        <Text color="red.500" fontSize="xl">
          {error}
        </Text>
      ) : (
        <Flex
          direction="column"
          gap={10}
          width="100%"
          maxW="1200px"
          align="center"
          bg="transparent"  // Explicitly set the background to transparent
          mx="auto" // Center this Flex container
        >
          {/* **Header with Latest Date Label and Navigation Icons** */}
          <Flex
            width="100%"
            maxW="800px"
            justifyContent="space-between"
            alignItems="center"
          >
            <Flex alignItems="center" gap={2}>
              {/* Left Arrow Icon */}
              <IconButton
                aria-label="Previous Day"
                icon={<FaArrowLeft />}
                colorScheme="whiteAlpha"
                variant="ghost"
                color="white"
                onClick={() => navigateDate("left")}
                isDisabled={
                  selectedDate
                    ? totalData.findIndex((d) => d.date === selectedDate) === 0
                    : totalData.length === 0
                }
                size="sm"
                _hover={{ background: "transparent" }} // No hover background
              />

              {/* Date Label */}
              <Text
                fontSize="lg"          // Uniform font size
                fontWeight="bold"      // Bold font
                color="white"          // White color
              >
                {latestDateLabel}
              </Text>

              {/* Right Arrow Icon */}
              <IconButton
                aria-label="Next Day"
                icon={<FaArrowRight />}
                colorScheme="whiteAlpha"
                variant="ghost"
                color="white"
                onClick={() => navigateDate("right")}
                isDisabled={
                  selectedDate
                    ? selectedDate === totalData[totalData.length - 1].date
                    : totalData.length === 0
                }
                size="sm"
                _hover={{ background: "transparent" }} // No hover background
              />
            </Flex>

            {/* **Date Selection Button with Calendar Icon** */}
            <Popover placement="bottom-end">
              <PopoverTrigger>
                <IconButton
                  aria-label="Select Date"
                  icon={<FaCalendar />}
                  colorScheme="whiteAlpha"
                  variant="ghost" // Transparent background
                  _hover={{ background: "transparent" }} // No hover background
                  color="white"
                  size="sm"
                />
              </PopoverTrigger>
              <PopoverContent
                bg="white"
                border="1px solid #ccc"
                boxShadow="md"
                borderRadius="md"
              >
                <PopoverArrow />
                <PopoverCloseButton />
                <PopoverHeader>Select a Date</PopoverHeader>
                <PopoverBody>
                  <Input
                    type="date"
                    onChange={handleDateChange}
                    max={totalData.length > 0 ? totalData[totalData.length - 1].date : undefined}
                    min={totalData.length > 0 ? totalData[0].date : undefined}
                    value={selectedDate || ""}
                    bg="transparent" // Transparent background
                    borderColor="gray.300" // Light border color
                    _hover={{ borderColor: "gray.400" }} // Slight border color on hover
                    _focus={{ borderColor: "teal.500", boxShadow: "none" }} // Focus styles
                    color="black" // Set font color to black for visibility
                  />
                  {selectedDate && (
                    <Button
                      mt={4}
                      colorScheme="red"
                      size="sm"
                      onClick={resetSelectedDate}
                      width="100%"
                      variant="outline"
                      _hover={{ background: "transparent" }} // No hover background
                    >
                      Clear Selection
                    </Button>
                  )}
                </PopoverBody>
              </PopoverContent>
            </Popover>
          </Flex>

          {/* Main Data Display: Daily Counts */}
          <Flex
            direction={{ base: "column", md: "row" }}
            gap={10}
            width="100%"
            maxW="800px"
            justifyContent="center"
          >
            {/* Daily Request Count Box */}
            <Box
              bg="linear-gradient(90deg, #000000, #7800ff)" // Linear gradient background
              borderRadius="20px" // Rounded corners
              border="5px solid rgba(255, 255, 255, 0.8)" // White border with transparency
              boxShadow="0px 0px 15px rgba(200, 200, 200, 0.5)" // Shiny glow effect
              p={6}
              flex="1"
            >
              <Flex justifyContent="space-between" alignItems="center" mb={4}>
                <Text
                  fontSize="lg"          // Uniform font size
                  fontWeight="bold"      // Bold font
                  color="white"          // White color
                >
                  Daily Request Count
                </Text>
                <Button onClick={toggleComparisonMode} colorScheme="teal" size="sm">
                  Show {comparisonMode === "percentage" ? "Raw" : "Percentage"}
                </Button>
              </Flex>
              <Flex direction="column" alignItems="center">
                <Text fontSize="4xl" fontWeight="bold">
                  {selectedDate
                    ? (totalData.find((d) => d.date === selectedDate)?.totalRequests || "N/A").toLocaleString()
                    : (currentTotalRequest !== null ? currentTotalRequest.toLocaleString() : "N/A")}
                </Text>
                <Flex alignItems="center" mt={2}>
                  {comparisonMode === "percentage" ? (
                    <>
                      <Text
                        fontSize="lg"
                        color={comparisonColor(totalPercentageChange)}
                        mr={2}
                      >
                        {totalPercentageChange === "N/A" ? "N/A" : `${totalPercentageChange}%`}
                      </Text>
                      <Text fontSize="md">compared to last week</Text>
                    </>
                  ) : (
                    <>
                      <Text
                        fontSize="lg"
                        color={comparisonColor(totalRequestChange)}
                        mr={2}
                      >
                        {totalRequestChange === "N/A"
                          ? "N/A"
                          : `${totalRequestChange >= 0 ? "+" : ""}${totalRequestChange}`}
                      </Text>
                      <Text fontSize="md">compared to last week</Text>
                    </>
                  )}
                </Flex>
              </Flex>
            </Box>

            {/* Daily Envivo Query Count Box */}
            <Box
              bg="linear-gradient(90deg, #000000, #7800ff)" // Linear gradient background
              borderRadius="20px" // Rounded corners
              border="5px solid rgba(255, 255, 255, 0.8)" // White border with transparency
              boxShadow="0px 0px 15px rgba(200, 200, 200, 0.5)" // Shiny glow effect
              p={6}
              flex="1"
            >
              <Flex justifyContent="space-between" alignItems="center" mb={4}>
                <Text
                  fontSize="lg"          // Uniform font size
                  fontWeight="bold"      // Bold font
                  color="white"          // White color
                >
                  Daily Envivo Query Count
                </Text>
                <Button onClick={toggleComparisonMode} colorScheme="teal" size="sm">
                  Show {comparisonMode === "percentage" ? "Raw" : "Percentage"}
                </Button>
              </Flex>
              <Flex direction="column" alignItems="center">
                <Text fontSize="4xl" fontWeight="bold">
                  {selectedDate
                    ? (envivoData.find((d) => d.date === selectedDate)?.envivoRequests || "N/A").toLocaleString()
                    : (currentEnvivoRequest !== null
                      ? currentEnvivoRequest.toLocaleString()
                      : "N/A")}
                </Text>
                <Flex alignItems="center" mt={2}>
                  {comparisonMode === "percentage" ? (
                    <>
                      <Text
                        fontSize="lg"
                        color={comparisonColor(envivoPercentageChange)}
                        mr={2}
                      >
                        {envivoPercentageChange === "N/A" ? "N/A" : `${envivoPercentageChange}%`}
                      </Text>
                      <Text fontSize="md">compared to last week</Text>
                    </>
                  ) : (
                    <>
                      <Text
                        fontSize="lg"
                        color={comparisonColor(envivoRequestChange)}
                        mr={2}
                      >
                        {envivoRequestChange === "N/A"
                          ? "N/A"
                          : `${envivoRequestChange >= 0 ? "+" : ""}${envivoRequestChange}`}
                      </Text>
                      <Text fontSize="md">compared to last week</Text>
                    </>
                  )}
                </Flex>
              </Flex>
            </Box>
          </Flex>

          {/* Averages Display */}
          <Box
            bg="linear-gradient(90deg, #000000, #7800ff)" // Linear gradient background
            borderRadius="20px" // Rounded corners
            border="5px solid rgba(255, 255, 255, 0.8)" // White border with transparency
            boxShadow="0px 0px 15px rgba(200, 200, 200, 0.5)" // Shiny glow effect
            p={6}
            width="100%"
            maxW="800px"
            mb={10} // Added margin-bottom for additional padding after this section
          >
            <Flex justifyContent="space-between" alignItems="center" mb={4}>
              <Text
                fontSize="lg"          // Uniform font size
                fontWeight="bold"      // Bold font
                color="white"          // White color
              >
                Averages for {selectedPeriod}
              </Text>
              {/* Select Time Period Dropdown */}
              <Select
                value={selectedPeriod}
                onChange={(e) => {
                  setSelectedPeriod(e.target.value);
                  setSelectedDate(null); // Reset selected date when period changes
                }}
                placeholder="Select"
                size="sm" // Smaller size
                width="150px" // Fixed small width
                aria-label="Select Time Period" // Accessibility
              >
                {Object.values(PERIODS).map((period) => (
                  <option key={period} value={period}>
                    {period}
                  </option>
                ))}
              </Select>
            </Flex>
            <Grid templateColumns="repeat(2, 1fr)" gap={6}>
              <Box textAlign="center">
                <Text
                  fontSize="md"          // Uniform font size
                  fontWeight="bold"      // Bold font
                  color="white"          // White color
                >
                  Request Count
                </Text>
                <Text fontSize="2xl">
                  {averageData.totalAvg !== "N/A"
                    ? averageData.totalAvg.toLocaleString()
                    : "N/A"}
                </Text>
              </Box>
              <Box textAlign="center">
                <Text
                  fontSize="md"          // Uniform font size
                  fontWeight="bold"      // Bold font
                  color="white"          // White color
                >
                  Envivo Query Count
                </Text>
                <Text fontSize="2xl">
                  {averageData.envivoAvg !== "N/A"
                    ? averageData.envivoAvg.toLocaleString()
                    : "N/A"}
                </Text>
              </Box>
            </Grid>
          </Box>
        </Flex>
      )}
    </>
  );
};

export default General;
