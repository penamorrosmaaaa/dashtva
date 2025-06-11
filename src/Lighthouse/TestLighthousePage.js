import React, { useState, useEffect, useCallback } from "react";
import {
  Box,
  Input,
  Button,
  Text,
  VStack,
  HStack,
  Spinner,
  Alert,
  AlertIcon,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  useDisclosure,
  IconButton,
  Progress,
  Badge,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  SimpleGrid,
  Heading,
  Divider,
  List,
  ListItem,
  ListIcon,
  Collapse,
  useColorModeValue,
  Image,
  ButtonGroup,
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon,
  Flex,
  Grid,
  GridItem,
  Link,
  Tooltip,
  Select,
} from "@chakra-ui/react";
import { createClient } from "@supabase/supabase-js";
import {
  ViewIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  CheckCircleIcon,
  WarningIcon,
  CloseIcon,
  InfoIcon,
  ExternalLinkIcon,
  SearchIcon,
} from "@chakra-ui/icons";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const supabase = createClient(
  "https://srngkmygeyteanwhkbvg.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNybmdrbXlnZXl0ZWFud2hrYnZnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkxNTA5ODIsImV4cCI6MjA2NDcyNjk4Mn0._TxDXrrykWJ6DyVjO5m5AEmKc8ZT6GDOXV1kJBDhoKM"
);

// Score color helper
const getScoreColor = (score) => {
  if (score >= 90) return "green.500";
  if (score >= 50) return "orange.500";
  return "red.500";
};

const getScoreBadgeColor = (score) => {
  if (score >= 90) return "green";
  if (score >= 50) return "orange";
  return "red";
};

// Format milliseconds to seconds
const formatMs = (ms) => {
  if (ms === undefined || ms === null) return "N/A";
  return (ms / 1000).toFixed(1) + " s";
};

// Format bytes to KB/MB
const formatBytes = (bytes) => {
  if (!bytes) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

// Helper to safely extract a value from a Lighthouse object or raw data
const getSafeDisplayValue = (data) => {
  if (data === undefined || data === null) {
    return "N/A";
  }
  if (typeof data === 'object') {
    if ('value' in data && (typeof data.value === 'string' || typeof data.value === 'number')) {
      return data.value;
    }
    if ('displayValue' in data && (typeof data.displayValue === 'string' || typeof data.displayValue === 'number')) {
        return data.displayValue;
    }
    try {
      return JSON.stringify(data);
    } catch (e) {
      console.error("Error stringifying object for display:", data, e);
      return "[Object]";
    }
  }
  return String(data);
};

// Metric Component
const MetricCard = ({ label, value, unit, score, displayValue }) => {
  const bgColor = useColorModeValue("white", "gray.800");
  const borderColor = useColorModeValue("gray.200", "gray.600");

  const finalDisplayValue = getSafeDisplayValue(displayValue);
  const finalValue = getSafeDisplayValue(value);

  return (
    <Box
      p={4}
      bg={bgColor}
      borderWidth="1px"
      borderColor={borderColor}
      borderRadius="md"
      shadow="sm"
    >
      <Stat>
        <StatLabel fontSize="sm" color="gray.600">{label}</StatLabel>
        <StatNumber fontSize="2xl">
          {finalDisplayValue || finalValue}
          {unit && <Text as="span" fontSize="lg" ml={1}>{unit}</Text>}
        </StatNumber>
        {score !== undefined && (
          <StatHelpText>
            <Badge colorScheme={getScoreBadgeColor(score * 100)}>
              Score: {Math.round(score * 100)}
            </Badge>
          </StatHelpText>
        )}
      </Stat>
    </Box>
  );
};

// Enhanced Audit Item Component
const AuditItem = ({ audit, isOpportunity = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const bgColor = useColorModeValue("white", "gray.800");
  const hoverBg = useColorModeValue("gray.50", "gray.700");

  const getIcon = () => {
    if (audit.score === 1) return <CheckCircleIcon color="green.500" />;
    if (audit.score === 0) return <CloseIcon color="red.500" />;
    if (audit.score === null) return <InfoIcon color="gray.500" />;
    return <WarningIcon color="orange.500" />;
  };

  const getSavingsText = () => {
    if (!audit.details) return null;
    const overallSavingsMs = audit.details.overallSavingsMs;
    const overallSavingsBytes = audit.details.overallSavingsBytes;

    if (overallSavingsMs) {
      return `Potential savings of ${formatMs(overallSavingsMs)}`;
    }
    if (overallSavingsBytes) {
      return `Potential savings of ${formatBytes(overallSavingsBytes)}`;
    }
    return null;
  };

  const finalAuditDisplayValue = getSafeDisplayValue(audit.displayValue);

  return (
    <Box
      bg={bgColor}
      p={3}
      borderRadius="md"
      borderWidth="1px"
      mb={2}
      _hover={{ bg: hoverBg }}
      transition="all 0.2s"
    >
      <Box cursor="pointer" onClick={() => setIsOpen(!isOpen)}>
        <HStack justify="space-between">
          <HStack flex={1} spacing={3}>
            {!isOpportunity && getIcon()}
            <Box flex={1}>
              <Text fontSize="sm" fontWeight={audit.score < 1 ? "medium" : "normal"}>
                {audit.title}
              </Text>
              {isOpportunity && getSavingsText() && (
                <Text fontSize="xs" color="red.600" mt={1}>
                  {getSavingsText()}
                </Text>
              )}
            </Box>
          </HStack>
          <HStack>
            {audit.displayValue && !isOpportunity && (
              <Badge colorScheme="gray" fontSize="xs">{finalAuditDisplayValue}</Badge>
            )}
            <IconButton
              size="xs"
              icon={isOpen ? <ChevronUpIcon /> : <ChevronDownIcon />}
              variant="ghost"
              aria-label="Toggle details"
              onClick={(e) => {
                e.stopPropagation();
                setIsOpen(!isOpen);
              }}
            />
          </HStack>
        </HStack>
      </Box>

      <Collapse in={isOpen} animateOpacity>
        <Box pt={3}>
          <Text fontSize="xs" color="gray.600" mb={2}>{audit.description}</Text>

          {audit.details && (
            <Box fontSize="xs">
              {audit.details.type === 'table' && audit.details.headings && audit.details.items && (
                <Box overflowX="auto">
                  <Table size="xs" variant="simple">
                    <Thead>
                      <Tr>
                        {audit.details.headings.map((heading, idx) => (
                          <Th key={idx} fontSize="xs">{heading.label || heading.text}</Th>
                        ))}
                      </Tr>
                    </Thead>
                    <Tbody>
                      {audit.details.items.slice(0, 5).map((item, rowIdx) => (
                        <Tr key={rowIdx}>
                          {audit.details.headings.map((heading, colIdx) => (
                            <Td key={colIdx} fontSize="xs">
                              {heading.key === 'url' && item.url ? (
                                <Text noOfLines={1}>{getSafeDisplayValue(item.url)}</Text>
                              ) : heading.key === 'node' && item.node ? (
                                <Text noOfLines={1}>{getSafeDisplayValue(item.node.selector || item.node.snippet)}</Text>
                              ) : (
                                <Text>{getSafeDisplayValue(item[heading.key]) || 'N/A'}</Text>
                              )}
                            </Td>
                          ))}
                        </Tr>
                      ))}
                    </Tbody>
                  </Table>
                  {audit.details.items.length > 5 && (
                    <Text fontSize="xs" color="gray.500" mt={2}>
                      And {audit.details.items.length - 5} more items...
                    </Text>
                  )}
                </Box>
              )}

              {audit.details.type === 'opportunity' && audit.details.items && Array.isArray(audit.details.items) && (
                <VStack align="stretch" spacing={2}>
                  {audit.details.items.slice(0, 3).map((item, idx) => (
                    <Box key={idx} p={2} bg="gray.50" borderRadius="sm">
                      <Text fontSize="xs" noOfLines={1}>{getSafeDisplayValue(item.url)}</Text>
                      {item.wastedBytes && (
                        <Text fontSize="xs" color="red.600">
                          Savings: {formatBytes(item.wastedBytes)}
                        </Text>
                      )}
                    </Box>
                  ))}
                </VStack>
              )}

              {audit.details.type === 'list' && audit.details.items && Array.isArray(audit.details.items) && (
                <List spacing={1}>
                  {audit.details.items.slice(0, 3).map((item, idx) => (
                    <ListItem key={idx} fontSize="xs">
                      • {getSafeDisplayValue(item).substring(0, 100)}...
                    </ListItem>
                  ))}
                </List>
              )}
            </Box>
          )}
        </Box>
      </Collapse>
    </Box>
  );
};

// Screenshot Gallery Component
const ScreenshotGallery = ({ screenshots }) => {
  if (!screenshots || screenshots.length === 0) return null;

  return (
    <Box>
      <Heading size="md" mb={4}>Screenshots</Heading>
      <SimpleGrid columns={{ base: 2, md: 3, lg: 5 }} spacing={4}>
        {screenshots.map((screenshot, idx) => (
          <Box key={idx} position="relative">
            <Image
              src={screenshot.data || `data:image/jpeg;base64,${screenshot}`}
              alt={`Screenshot ${idx + 1}`}
              borderRadius="md"
              border="1px solid"
              borderColor="gray.200"
              cursor="pointer"
              transition="transform 0.2s"
              _hover={{ transform: 'scale(1.05)' }}
            />
            {screenshot.timing && (
              <Badge
                position="absolute"
                bottom={2}
                left={2}
                colorScheme="blackAlpha"
                fontSize="xs"
              >
                {formatMs(screenshot.timing)}
              </Badge>
            )}
          </Box>
        ))}
      </SimpleGrid>
    </Box>
  );
};

// Audit Filters Component
const AuditFilters = ({ selectedFilters, onFilterChange }) => {
  const filters = ['All', 'FCP', 'LCP', 'TBT', 'CLS'];

  return (
    <HStack spacing={2} mb={4}>
      <Text fontSize="sm" color="gray.600">Show audits relevant to:</Text>
      <ButtonGroup size="xs" isAttached variant="outline">
        {filters.map((filter) => (
          <Button
            key={filter}
            onClick={() => onFilterChange(filter)}
            variant={selectedFilters.includes(filter) || (filter === 'All' && selectedFilters.length === 0) ? 'solid' : 'outline'}
            colorScheme={selectedFilters.includes(filter) || (filter === 'All' && selectedFilters.length === 0) ? 'blue' : 'gray'}
          >
            {filter}
          </Button>
        ))}
      </ButtonGroup>
    </HStack>
  );
};

// Lighthouse Report Viewer Component
const LighthouseViewer = ({ data, onClose }) => {
  const bgColor = useColorModeValue("gray.50", "gray.900");
  const cardBg = useColorModeValue("white", "gray.800");
  const [selectedFilters, setSelectedFilters] = useState([]);
  const [showPassedAudits, setShowPassedAudits] = useState(false);

  if (!data || !data.categories) {
    return (
      <Alert status="error">
        <AlertIcon />
        Invalid Lighthouse data format
      </Alert>
    );
  }

  const categories = data.categories;
  const audits = data.audits || {};

  const getScreenshots = () => {
    const screenshots = [];

    if (audits['screenshot-thumbnails'] && audits['screenshot-thumbnails'].details) {
      const items = audits['screenshot-thumbnails'].details.items || [];
      screenshots.push(...items);
    }

    if (audits['final-screenshot'] && audits['final-screenshot'].details) {
      screenshots.push(audits['final-screenshot'].details);
    }

    return screenshots;
  };

  const getAuditsByCategory = (categoryId) => {
    const category = categories[categoryId];
    if (!category || !category.auditRefs) return [];

    let filteredAudits = category.auditRefs
      .map(ref => ({
        ...audits[ref.id],
        weight: ref.weight,
        group: ref.group
      }))
      .filter(audit => audit && audit.id);

    if (selectedFilters.length > 0 && !selectedFilters.includes('All')) {
      filteredAudits = filteredAudits.filter(audit => {
        const relevantTo = audit.relevantMetrics || [];
        return selectedFilters.some(filter =>
          relevantTo.includes(filter.toLowerCase()) ||
          audit.id.includes(filter.toLowerCase())
        );
      });
    }

    if (!showPassedAudits) {
      filteredAudits = filteredAudits.filter(audit => audit.score !== 1);
    }

    return filteredAudits.sort((a, b) => {
      if (a.score !== b.score) {
        return a.score - b.score;
      }
      return (b.weight || 0) - (a.weight || 0);
    });
  };

  const getOpportunityAudits = () => {
    return Object.values(audits)
      .filter(audit =>
        audit.details &&
        (audit.details.type === 'opportunity' ||
         audit.details.overallSavingsMs ||
         audit.details.overallSavingsBytes)
      )
      .sort((a, b) => {
        const aSavings = a.details.overallSavingsMs || a.details.overallSavingsBytes || 0;
        const bSavings = b.details.overallSavingsMs || b.details.overallSavingsBytes || 0;
        return bSavings - aSavings;
      });
  };

  const getDiagnosticAudits = () => {
    return Object.values(audits)
      .filter(audit =>
        audit.details &&
        audit.details.type === 'debugdata' ||
        (categories.performance?.auditRefs?.some(ref =>
          ref.id === audit.id && ref.group === 'diagnostics'
        ))
      );
  };

  const handleFilterChange = (filter) => {
    if (filter === 'All') {
      setSelectedFilters([]);
    } else {
      setSelectedFilters(prev => {
        if (prev.includes(filter)) {
          return prev.filter(f => f !== filter);
        }
        return [...prev.filter(f => f !== 'All'), filter];
      });
    }
  };

  return (
    <Box bg={bgColor} minH="100vh">
      <ModalHeader>
        <VStack align="start" spacing={2}>
          <Heading size="md">Lighthouse Report</Heading>
          <Text fontSize="sm" color="gray.600">
            {data.requestedUrl || data.finalUrl || "URL not available"}
          </Text>
          <Text fontSize="xs" color="gray.500">
            Generated: {new Date(data.fetchTime).toLocaleString()}
          </Text>
        </VStack>
      </ModalHeader>
      <ModalCloseButton />
      <ModalBody pb={6}>
        <SimpleGrid columns={{ base: 2, md: 4 }} spacing={4} mb={6}>
          {Object.entries(categories).map(([key, category]) => (
            <Box
              key={key}
              bg={cardBg}
              p={4}
              borderRadius="lg"
              borderWidth="2px"
              borderColor={getScoreColor(category.score * 100)}
              textAlign="center"
              transition="all 0.2s"
              _hover={{ transform: 'translateY(-2px)', shadow: 'md' }}
            >
              <Box
                display="inline-flex"
                alignItems="center"
                justifyContent="center"
                w="60px"
                h="60px"
                borderRadius="full"
                borderWidth="4px"
                borderColor={getScoreColor(category.score * 100)}
                mb={2}
              >
                <Text
                  fontSize="2xl"
                  fontWeight="bold"
                  color={getScoreColor(category.score * 100)}
                >
                  {Math.round(category.score * 100)}
                </Text>
              </Box>
              <Text fontSize="sm" fontWeight="medium">{category.title}</Text>
            </Box>
          ))}
        </SimpleGrid>

        <Divider my={6} />

        {getScreenshots().length > 0 && (
          <>
            <ScreenshotGallery screenshots={getScreenshots()} />
            <Divider my={6} />
          </>
        )}

        <Tabs>
          <TabList>
            <Tab fontSize="sm">Performance</Tab>
            <Tab fontSize="sm">Metrics</Tab>
            {Object.entries(categories).filter(([key]) => key !== 'performance').map(([key, category]) => (
              <Tab key={key} fontSize="sm">{category.title}</Tab>
            ))}
          </TabList>

          <TabPanels>
            <TabPanel>
              <VStack align="stretch" spacing={6}>
                <Box>
                  <Heading size="sm" mb={4}>Metrics</Heading>
                  <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4}>
                    {audits['first-contentful-paint'] && (
                      <MetricCard
                        label="First Contentful Paint"
                        value={audits['first-contentful-paint'].numericValue}
                        displayValue={audits['first-contentful-paint'].displayValue}
                        score={audits['first-contentful-paint'].score}
                      />
                    )}
                    {audits['largest-contentful-paint'] && (
                      <MetricCard
                        label="Largest Contentful Paint"
                        value={audits['largest-contentful-paint'].numericValue}
                        displayValue={audits['largest-contentful-paint'].displayValue}
                        score={audits['largest-contentful-paint'].score}
                      />
                    )}
                    {audits['total-blocking-time'] && (
                      <MetricCard
                        label="Total Blocking Time"
                        value={audits['total-blocking-time'].numericValue}
                        displayValue={audits['total-blocking-time'].displayValue}
                        score={audits['total-blocking-time'].score}
                      />
                    )}
                    {audits['cumulative-layout-shift'] && (
                      <MetricCard
                        label="Cumulative Layout Shift"
                        value={audits['cumulative-layout-shift'].numericValue}
                        displayValue={audits['cumulative-layout-shift'].displayValue}
                        score={audits['cumulative-layout-shift'].score}
                      />
                    )}
                    {audits['speed-index'] && (
                      <MetricCard
                        label="Speed Index"
                        value={audits['speed-index'].numericValue}
                        displayValue={audits['speed-index'].displayValue}
                        score={audits['speed-index'].score}
                      />
                    )}
                    {audits['interactive'] && (
                      <MetricCard
                        label="Time to Interactive"
                        value={audits['interactive'].numericValue}
                        displayValue={audits['interactive'].displayValue}
                        score={audits['interactive'].score}
                      />
                    )}
                  </SimpleGrid>
                </Box>

                {getOpportunityAudits().length > 0 && (
                  <Box>
                    <Heading size="sm" mb={4}>Opportunities</Heading>
                    <Text fontSize="sm" color="gray.600" mb={4}>
                      These suggestions can help your page load faster. They don't directly affect the Performance score.
                    </Text>
                    <VStack align="stretch" spacing={2}>
                      {getOpportunityAudits().map((audit) => (
                        <AuditItem key={audit.id} audit={audit} isOpportunity={true} />
                      ))}
                    </VStack>
                  </Box>
                )}

                {getDiagnosticAudits().length > 0 && (
                  <Box>
                    <Heading size="sm" mb={4}>Diagnostics</Heading>
                    <Text fontSize="sm" color="gray.600" mb={4}>
                      More information about the performance of your application.
                    </Text>
                    <VStack align="stretch" spacing={2}>
                      {getDiagnosticAudits().map((audit) => (
                        <AuditItem key={audit.id} audit={audit} />
                      ))}
                    </VStack>
                  </Box>
                )}

                {data && (
                  <Box p={4} bg="blue.50" borderRadius="md">
                    <HStack>
                      <InfoIcon color="blue.500" />
                      <Text fontSize="sm">
                        View Treemap data is available for this report
                      </Text>
                      <Button
                        size="xs"
                        colorScheme="blue"
                        variant="link"
                        onClick={() => {
                          const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                          const url = URL.createObjectURL(blob);

                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `lighthouse-report-${data.requestedUrl ? new URL(data.requestedUrl).hostname : 'report'}.json`;
                          document.body.appendChild(a);
                          a.click();
                          document.body.removeChild(a);
                          URL.revokeObjectURL(url);

                          setTimeout(() => {
                            window.open('https://googlechrome.github.io/lighthouse/viewer/', '_blank');
                            alert('Please use the "Choose File" button on the Lighthouse Viewer page to upload the downloaded JSON file.');
                          }, 100);
                        }}
                      >
                        View Treemap
                      </Button>
                    </HStack>
                  </Box>
                )}
              </VStack>
            </TabPanel>

            <TabPanel>
              <VStack align="stretch" spacing={4}>
                <Text fontSize="lg" fontWeight="bold">All Performance Metrics</Text>
                <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                  {Object.entries(audits)
                    .filter(([_, audit]) => audit.numericValue !== undefined)
                    .map(([key, audit]) => (
                      <MetricCard
                        key={key}
                        label={audit.title}
                        value={audit.numericValue}
                        displayValue={audit.displayValue}
                        score={audit.score}
                      />
                    ))}
                </SimpleGrid>
              </VStack>
            </TabPanel>

            {Object.entries(categories).filter(([key]) => key !== 'performance').map(([categoryKey, category]) => (
              <TabPanel key={categoryKey}>
                <VStack align="stretch" spacing={4}>
                  <Box>
                    <HStack justify="space-between" mb={4}>
                      <Box>
                        <Text fontSize="lg" fontWeight="bold">{category.title}</Text>
                        <Text fontSize="sm" color="gray.600">{category.description}</Text>
                      </Box>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setShowPassedAudits(!showPassedAudits)}
                      >
                        {showPassedAudits ? 'Hide' : 'Show'} Passed Audits
                      </Button>
                    </HStack>

                    {categoryKey === 'performance' && (
                      <AuditFilters
                        selectedFilters={selectedFilters}
                        onFilterChange={handleFilterChange}
                      />
                    )}
                  </Box>

                  <List spacing={2}>
                    {getAuditsByCategory(categoryKey).map((audit) => (
                      <AuditItem key={audit.id} audit={audit} />
                    ))}
                  </List>

                  {!showPassedAudits && getAuditsByCategory(categoryKey).length === 0 && (
                    <Box textAlign="center" py={8}>
                      <CheckCircleIcon boxSize={12} color="green.500" mb={4} />
                      <Text fontSize="lg" fontWeight="medium">All audits passed!</Text>
                      <Text fontSize="sm" color="gray.600">
                        Click "Show Passed Audits" to see all results.
                      </Text>
                    </Box>
                  )}
                </VStack>
              </TabPanel>
            ))}
          </TabPanels>
        </Tabs>
      </ModalBody>
    </Box>
  );
};

// Historical Metrics Graph Component (no changes here from previous)
const MetricHistoryGraph = ({ data, metricKey, title, valueFormatter }) => {
  if (!data || data.length === 0 || !metricKey) {
    return (
      <Alert status="info" my={4}>
        <AlertIcon />
        No historical data available for the selected metric.
      </Alert>
    );
  }

  const chartData = data.map(record => ({
    time: new Date(record.created_at).toLocaleDateString() + ' ' + new Date(record.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    value: record[metricKey],
  })).reverse();

  let unit = "";
  if (["lcp", "fcp", "tbt", "si"].includes(metricKey)) {
    unit = "ms";
  } else if (metricKey === "cls") {
    unit = "";
  } else if (metricKey === "performance") {
    unit = " score";
  }

  return (
    <Box width="100%" height="300px" my={6}>
      <Heading size="md" mb={4}>Historical {title} Trends</Heading>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={chartData}
          margin={{
            top: 5,
            right: 30,
            left: 20,
            bottom: 5,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="time" />
          <YAxis
            domain={['auto', 'auto']}
            tickFormatter={valueFormatter || ((value) => value)}
          />
          <RechartsTooltip formatter={(value) => `${valueFormatter ? valueFormatter(value) : value}${unit}`} />
          <Legend />
          <Line
            type="monotone"
            dataKey="value"
            stroke="#8884d8"
            activeDot={{ r: 8 }}
            name={title}
          />
        </LineChart>
      </ResponsiveContainer>
    </Box>
  );
};

// Main Component
const TestLighthousePage = () => {
  const [url, setUrl] = useState("");
  const [searchUrl, setSearchUrl] = useState("");
  const [loading, setLoading] = useState(false); // Overall loading for initial/search fetch
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [allResults, setAllResults] = useState([]);
  const [filteredResults, setFilteredResults] = useState([]);
  const [selectedJson, setSelectedJson] = useState(null);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [selectedMetric, setSelectedMetric] = useState("performance");

  const formatMetricValue = useCallback((value) => {
    if (["lcp", "fcp", "tbt", "si"].includes(selectedMetric)) {
      return formatMs(value);
    }
    if (selectedMetric === "cls") {
      return value?.toFixed(3);
    }
    return value;
  }, [selectedMetric]);

  const runTest = async () => {
    setLoading(true); // Indicate overall loading for the new test queue
    setError("");
    setSubmitted(false);

    try {
      // Assuming your backend will process this queue entry and
      // eventually add a result to lighthouse_results with scores.
      // If you want a 'pending' state in the table *immediately*,
      // your backend would need to insert a row into lighthouse_results
      // with a status like 'pending' right after processing the queue.
      // For this example, we'll assume a new result row only appears when complete.
      const { error } = await supabase
        .from("lighthouse_queue")
        .insert([{ url, status: "pending" }]); // Assuming queue has status

      if (error) throw error;

      setSubmitted(true);
      setUrl(""); // Clear input after sending to queue
      // The real-time subscription will update the table when the test completes
    } catch (err) {
      setError("Error al enviar a Supabase: " + err.message);
    } finally {
      // setLoading(false); // Do NOT set to false immediately if waiting for result.
                           // The fetchResults in the useEffect will handle this.
    }
  };

  const fetchResults = async (targetUrl = null) => {
    setLoading(true); // Indicate loading for fetching results
    let query = supabase
      .from("lighthouse_results")
      .select("*") // Ensure all columns are selected
      .order("created_at", { ascending: false });

    if (targetUrl) {
      query = query.eq("url", targetUrl);
    } else {
    }

    const { data, error } = await query;

    if (error) {
      setError("Error fetching results: " + error.message);
    } else {
      setAllResults(data);
      if (searchUrl) {
        setFilteredResults(data.filter(res => res.url === searchUrl));
      } else {
        setFilteredResults(data);
      }
    }
    setLoading(false); // Stop loading after results are fetched
  };

  useEffect(() => {
    if (searchUrl) {
      fetchResults(searchUrl);
    } else {
      fetchResults();
    }
  }, [searchUrl]);

  useEffect(() => {
    fetchResults(searchUrl || null);

    const channel = supabase
      .channel('lighthouse_results_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'lighthouse_results' },
        (payload) => {
          console.log('Change received!', payload);
          // When a change occurs, re-fetch all results, potentially filtered by searchUrl
          fetchResults(searchUrl || null);
          // If the payload indicates a new result for the current searchUrl,
          // or if the test just completed, you might want to specifically
          // indicate that row is no longer loading.
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [searchUrl]);

  const openJson = (json) => {
    setSelectedJson(json);
    onOpen();
  };

  const handleSearch = () => {
    setSearchUrl(url);
    setError("");
    // The useEffect will trigger fetchResults based on searchUrl change
  };

  const handleClearSearch = () => {
    setSearchUrl("");
    setUrl("");
    setError("");
  };

  const getMetricTitle = (key) => {
    switch (key) {
      case "performance": return "Performance Score";
      case "lcp": return "Largest Contentful Paint (LCP)";
      case "fcp": return "First Contentful Paint (FCP)";
      case "cls": return "Cumulative Layout Shift (CLS)";
      case "tbt": return "Total Blocking Time (TBT)";
      case "si": return "Speed Index (SI)";
      default: return key;
    }
  };

  return (
    <VStack spacing={5} p={6} maxW="1200px" mx="auto">
      <Heading size="xl">Lighthouse Performance Test</Heading>
      <HStack w="100%" maxW="700px">
        <Input
          placeholder="Enter URL to test or search"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          size="lg"
        />
        <Button
          onClick={runTest}
          colorScheme="teal"
          isDisabled={!url || loading}
          size="lg"
        >
          {loading ? <Spinner size="sm" /> : "Queue Test"}
        </Button>
        <Tooltip label="Search for historical results of this URL">
          <IconButton
            aria-label="Search URL"
            icon={<SearchIcon />}
            size="lg"
            onClick={handleSearch}
            isDisabled={!url || loading}
            colorScheme="blue"
          />
        </Tooltip>
        {searchUrl && (
          <Tooltip label="Clear Search Filter">
            <IconButton
              aria-label="Clear Search"
              icon={<CloseIcon />}
              size="lg"
              onClick={handleClearSearch}
              colorScheme="red"
            />
          </Tooltip>
        )}
      </HStack>

      {error && (
        <Alert status="error" maxW="600px">
          <AlertIcon />
          {error}
        </Alert>
      )}

      {submitted && (
        <Alert status="success" maxW="600px">
          <AlertIcon />
          URL sent! Processing will begin shortly. Results will appear below.
        </Alert>
      )}

      {/* Main loading spinner (e.g., when initial fetch or search is ongoing) */}
      {loading && !filteredResults.length && (
        <HStack maxW="600px" spacing={3}>
          <Spinner size="md" />
          <Text>Loading results...</Text>
        </HStack>
      )}

      {searchUrl && (
        <Box width="100%" mt={8}>
          <Heading size="lg" mb={4}>Historical Data for: <Text as="span" color="teal.600">{searchUrl}</Text></Heading>

          <HStack mb={4}>
            <Text>Select Metric for Graph:</Text>
            <Select
              value={selectedMetric}
              onChange={(e) => setSelectedMetric(e.target.value)}
              width="200px"
            >
              <option value="performance">Performance Score</option>
              <option value="lcp">LCP</option>
              <option value="fcp">FCP</option>
              <option value="cls">CLS</option>
              <option value="tbt">TBT</option>
              <option value="si">Speed Index</option>
            </Select>
          </HStack>

          <MetricHistoryGraph
            data={filteredResults}
            metricKey={selectedMetric}
            title={getMetricTitle(selectedMetric)}
            valueFormatter={formatMetricValue}
          />

          <Heading size="md" mb={4} mt={8}>All Reports for {searchUrl}</Heading>
        </Box>
      )}

      {filteredResults.length > 0 ? (
        <Box width="100%" overflowX="auto" borderWidth="1px" borderRadius="md" p={4}>
          {!searchUrl && <Heading size="md" mb={4}>Latest Reports</Heading>}
          <Table variant="simple" size="sm">
            <Thead>
              <Tr>
                <Th>URL</Th>
                <Th>Performance</Th>
                <Th>LCP</Th>
                <Th>FCP</Th>
                <Th>CLS</Th>
                <Th>TBT</Th>
                <Th>SI</Th>
                <Th>Created</Th>
                <Th>Actions</Th>
              </Tr>
            </Thead>
            <Tbody>
              {filteredResults.map((result) => {
                // Determine if this specific result is 'loading'
                const isResultLoading = result.status === 'pending' || !result.json; // Assuming status column or lack of JSON indicates pending
                return (
                  <Tr key={result.id}>
                    <Td>
                      <Tooltip label={result.url} placement="top">
                        <Link href={result.url} isExternal maxW="200px" isTruncated>
                          {result.url} <ExternalLinkIcon mx="2px" />
                        </Link>
                      </Tooltip>
                    </Td>
                    <Td>
                      {isResultLoading ? (
                        <HStack spacing={2}>
                          <Spinner size="sm" /> <Text>Loading...</Text>
                        </HStack>
                      ) : (
                        <Badge colorScheme={getScoreBadgeColor(result.performance)}>
                          {result.performance?.toFixed(0)}
                        </Badge>
                      )}
                    </Td>
                    <Td>
                      {isResultLoading ? <Spinner size="sm" /> : formatMs(result.lcp)}
                    </Td>
                    <Td>
                      {isResultLoading ? <Spinner size="sm" /> : formatMs(result.fcp)}
                    </Td>
                    <Td>
                      {isResultLoading ? <Spinner size="sm" /> : result.cls?.toFixed(3)}
                    </Td>
                    <Td>
                      {isResultLoading ? <Spinner size="sm" /> : formatMs(result.tbt)}
                    </Td>
                    <Td>
                      {isResultLoading ? <Spinner size="sm" /> : formatMs(result.si)}
                    </Td>
                    <Td>{new Date(result.created_at).toLocaleString()}</Td>
                    <Td>
                      <IconButton
                        aria-label="View Report"
                        icon={<ViewIcon />}
                        size="sm"
                        colorScheme="blue"
                        onClick={() => openJson(result.json)}
                        isDisabled={isResultLoading} // Disable view button while loading
                      />
                    </Td>
                  </Tr>
                );
              })}
            </Tbody>
          </Table>
        </Box>
      ) : (
        !loading && !error && searchUrl && (
          <Alert status="info" maxW="600px">
            <AlertIcon />
            No results found for "{searchUrl}". Try running a new test for this URL.
          </Alert>
        )
      )}

      <Modal isOpen={isOpen} onClose={onClose} size="full">
        <ModalOverlay />
        <ModalContent>
          {selectedJson && <LighthouseViewer data={selectedJson} onClose={onClose} />}
        </ModalContent>
      </Modal>
    </VStack>
  );
};

export default TestLighthousePage;