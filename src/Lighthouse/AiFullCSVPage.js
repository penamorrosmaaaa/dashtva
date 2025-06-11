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
import AiChat from "../components/AiChat"; // ✅ Make sure this path is correct

const SHEET_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vRzIonikYeUwzVTUUO7bDLQ1DDzqzKB-BFIJ4tzJMqMlNFnxPF0eVRypNmykYVP0Pn-w1tfnOCTaKaP/pub?output=csv";

const AiFullCSVPage = () => {
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [localCrux, setLocalCrux] = useState([]); // ✅ simulate this from CSV later
  const [verticalCrux, setVerticalCrux] = useState([]); // ✅ simulate this from CSV later

  const toast = useToast();

  useEffect(() => {
    Papa.parse(SHEET_URL, {
      download: true,
      header: true,
      skipEmptyLines: true,
      complete: ({ data }) => {
        setData(data);
        setIsLoading(false);

        // 🧠 Simulate filtering CrUX from CSV here
        const local = data.filter(row => row.Source === "Local");
        const vertical = data.filter(row => row.Source === "Vertical" || row.Source === "Competition");

        setLocalCrux(local);
        setVerticalCrux(vertical);
      },
      error: () => {
        toast({
          title: "Error al cargar CSV",
          description: "Verifica el enlace o el formato del archivo.",
          status: "error",
          duration: 5000,
          isClosable: true,
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
        <>
          <Box overflowX="auto" maxH="400px" overflowY="auto" mb={10}>
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

          {/* ✅ Add AiChat below table with CrUX data passed in */}
          <AiChat
            embeddingData={data}
            selectedDate={null}
            selectedType={null}
            showWeaknesses={false}
            useLocalData={false}
            localCrux={localCrux}
            verticalCrux={verticalCrux}
          />
        </>
      )}
    </Box>
  );
};

export default AiFullCSVPage;
