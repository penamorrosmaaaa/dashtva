// CompanyLeaderboard.jsx
import React, { useState, useMemo } from "react";
import {
  Box,
  Text,
  VStack,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Flex,
  Select,
  Badge,
  HStack,
  IconButton,
} from "@chakra-ui/react";
import { FaSort, FaSortUp, FaSortDown } from "react-icons/fa";

const CompanyLeaderboard = ({ companyPerformance, aztecaCompanies }) => {
  const [sortBy, setSortBy] = useState("score"); // 'score', 'change'
  const [sortOrder, setSortOrder] = useState("desc"); // 'asc', 'desc'

  const sortedCompanyPerformance = useMemo(() => {
    if (!companyPerformance) return [];

    return [...companyPerformance].sort((a, b) => {
      let aValue, bValue;

      if (sortBy === "score") {
        aValue = a.score;
        bValue = b.score;
      } else if (sortBy === "change") {
        // For 'change', we only consider companies that had a previous score to calculate change
        aValue = a.previousScore > 0 ? a.change : -Infinity;
        bValue = b.previousScore > 0 ? b.change : -Infinity;
      }

      if (sortOrder === "asc") {
        return aValue - bValue;
      } else {
        return bValue - aValue;
      }
    });
  }, [companyPerformance, sortBy, sortOrder]);

  const handleSort = (column) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortOrder("desc"); // Default to desc for new sort
    }
  };

  const getSortIcon = (column) => {
    if (sortBy === column) {
      return sortOrder === "asc" ? <FaSortUp /> : <FaSortDown />;
    }
    return <FaSort />;
  };

  return (
    <Box className="anb-chart-container" p={6} width="100%" maxW="1200px">
      <Text className="anb-chart-title" mb={4}>
        Company Leaderboard
      </Text>

      <Flex mb={4} align="center" gap={4}>
        <Text color="white">Filter:</Text>
        <Select
          width="200px"
          value={sortBy}
          onChange={(e) => {
            setSortBy(e.target.value);
            setSortOrder("desc"); // Reset sort order when changing filter
          }}
          bg="rgba(255,255,255,0.1)"
          color="white"
          borderColor="rgba(255,255,255,0.2)"
        >
          <option value="score">Top by Score</option>
          <option value="change">Top Improvers by % Change</option>
        </Select>
      </Flex>

      <VStack spacing={4} align="stretch">
        <Table variant="simple" colorScheme="whiteAlpha">
          <Thead>
            <Tr>
              <Th color="white" cursor="pointer" onClick={() => handleSort("name")}>
                <HStack>
                  <Text>Company</Text> {getSortIcon("name")}
                </HStack>
              </Th>
              <Th color="white" cursor="pointer" onClick={() => handleSort("score")}>
                <HStack>
                  <Text>Score</Text> {getSortIcon("score")}
                </HStack>
              </Th>
              <Th color="white" cursor="pointer" onClick={() => handleSort("change")}>
                <HStack>
                  <Text>% Change</Text> {getSortIcon("change")}
                </HStack>
              </Th>
            </Tr>
          </Thead>
          <Tbody>
            {sortedCompanyPerformance.map((company) => (
              <Tr
                key={company.name}
                bg={
                  aztecaCompanies.includes(company.name)
                    ? "rgba(74, 108, 247, 0.15)" // Azteca color with transparency
                    : "rgba(255, 95, 109, 0.15)" // Competition color with transparency
                }
                _hover={{
                  bg: aztecaCompanies.includes(company.name)
                    ? "rgba(74, 108, 247, 0.25)"
                    : "rgba(255, 95, 109, 0.25)",
                }}
              >
                <Td color="white">
                  <HStack>
                    <Box width="12px" height="12px" borderRadius="50%" bg={company.color} />
                    <Text fontWeight="bold">{company.name}</Text>
                    {aztecaCompanies.includes(company.name) && (
                      <Badge ml={1} colorScheme="blue" fontSize="xs">
                        TVA
                      </Badge>
                    )}
                  </HStack>
                </Td>
                <Td color="white">{company.score.toFixed(1)}</Td>
                <Td color="white">
                  {company.previousScore > 0 ? (
                    <Badge colorScheme={company.change >= 0 ? "green" : "red"}>
                      {company.change >= 0 ? "+" : ""}
                      {company.change}%
                    </Badge>
                  ) : (
                    <Text fontSize="sm" color="gray.400">N/A</Text>
                  )}
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </VStack>
    </Box>
  );
};

export default CompanyLeaderboard;