import React, { useEffect, useState } from "react";
import Papa from "papaparse";
import {
  Box,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Spinner,
  Text,
  useToast,
} from "@chakra-ui/react";

const SHEET_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vRzIonikYeUwzVTUUO7bDLQ1DDzqzKB-BFIJ4tzJMqMlNFnxPF0eVRypNmykYVP0Pn-w1tfnOCTaKaP/pub?output=csv";

const AiFullCSVPage = () => {
  const [data, setData]       = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const toast = useToast();

  useEffect(() => {
    Papa.parse(SHEET_URL, {
      download      : true,
      header        : true,
      skipEmptyLines: true,
      complete: ({ data }) => {
        setData(data);
        setIsLoading(false);
      },
      error: () => {
        toast({
          title      : "Error al cargar CSV",
          description: "Verifica el enlace o el formato del archivo.",
          status     : "error",
          duration   : 5000,
          isClosable : true,
        });
        setIsLoading(false);
      },
    });
  }, [toast]);

  return (
    <Box p={6} color="white" bg="gray.900" minH="100vh">
      <Text fontSize="2xl" mb={4}>📊 Vista Completa del CSV</Text>

      {isLoading ? (
        <Spinner size="xl" color="teal.300" />
      ) : (
        <Box overflowX="auto" maxH="400px" overflowY="auto">
          <Table variant="simple" size="sm">
            <Thead>
              <Tr>
                {data[0] &&
                  Object.keys(data[0]).map((col) => (
                    <Th key={col} color="gray.300" whiteSpace="nowrap">
                      {col}
                    </Th>
                  ))}
              </Tr>
            </Thead>
            <Tbody>
              {data.map((row, i) => (
                <Tr key={i}>
                  {Object.values(row).map((val, j) => (
                    <Td key={j} whiteSpace="nowrap">
                      {val}
                    </Td>
                  ))}
                </Tr>
              ))}
            </Tbody>
          </Table>
        </Box>
      )}
    </Box>
  );
};

export default AiFullCSVPage;
