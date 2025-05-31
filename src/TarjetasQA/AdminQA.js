import React, { useEffect, useState } from "react";
import {
  Box, Button, Input, VStack, Heading, useToast,
  Select, Text, Flex, IconButton, HStack
} from "@chakra-ui/react";
import { AddIcon, DeleteIcon } from "@chakra-ui/icons";
import {
  collection, doc, getDocs, setDoc, deleteDoc
} from "firebase/firestore";
import { db } from "../firebaseConfig";

const campos = [
  "sitio", "descripcion", "numeroTarjeta", "prioridad", "tipo", "plataforma",
  "desarrollador", "pm", "fechaTentativaQA", "fechaAprobacion",
  "criteriosAceptacionEntendibles", "numeroRechazos", "aceptado",
  "comentarios", "incidencias"
];

const emptyRow = () => campos.reduce((acc, c) => ({ ...acc, [c]: c === "numeroRechazos" ? 0 : "" }), {});

export default function AdminQA() {
  const toast = useToast();
  const [semanas, setSemanas] = useState([]);
  const [semanaActiva, setSemanaActiva] = useState("");
  const [datos, setDatos] = useState({});

  useEffect(() => {
    const cargarDatos = async () => {
      const snapshot = await getDocs(collection(db, "qa_tickets"));
      const todas = {};
      snapshot.forEach(docSnap => {
        todas[docSnap.id] = docSnap.data().data || [];
      });
      setDatos(todas);
      const keys = Object.keys(todas);
      setSemanas(keys);
      setSemanaActiva(keys[0] || "");
    };
    cargarDatos();
  }, []);

  const handleChange = (idx, campo, value) => {
    const copia = [...(datos[semanaActiva] || [])];
    copia[idx][campo] = campo === "numeroRechazos" ? Number(value) : value;
    const actualizados = { ...datos, [semanaActiva]: copia };
    setDatos(actualizados);
    setDoc(doc(db, "qa_tickets", semanaActiva), { data: copia });
  };

  const addRow = () => {
    const actual = [...(datos[semanaActiva] || []), emptyRow()];
    const nuevos = { ...datos, [semanaActiva]: actual };
    setDatos(nuevos);
    setDoc(doc(db, "qa_tickets", semanaActiva), { data: actual });
  };

  const addSemana = () => {
    const nueva = prompt("Nombre de la nueva semana:");
    if (!nueva || semanas.includes(nueva)) return;
    const nuevos = { ...datos, [nueva]: [emptyRow()] };
    setDatos(nuevos);
    setSemanas([...semanas, nueva]);
    setSemanaActiva(nueva);
    setDoc(doc(db, "qa_tickets", nueva), { data: [emptyRow()] });
  };

  const deleteSemana = async () => {
    if (!semanaActiva) return;
    await deleteDoc(doc(db, "qa_tickets", semanaActiva));
    const nuevos = { ...datos };
    delete nuevos[semanaActiva];
    const nuevasSemanas = semanas.filter(s => s !== semanaActiva);
    setDatos(nuevos);
    setSemanas(nuevasSemanas);
    setSemanaActiva(nuevasSemanas[0] || "");
  };

  return (
    <Box p={6} pt="140px" color="white" overflowX="auto">
      <Heading size="lg" mb={4} textAlign="center">Tarjetas QA</Heading>

      <HStack mb={4}>
        <Select
          value={semanaActiva}
          onChange={e => setSemanaActiva(e.target.value)}
          bg="black"
        >
          {semanas.map((sem, i) => (
            <option key={i} value={sem} style={{ background: "black" }}>
              {sem}
            </option>
          ))}
        </Select>
        <IconButton icon={<AddIcon />} onClick={addSemana} colorScheme="purple" />
        <IconButton icon={<DeleteIcon />} onClick={deleteSemana} colorScheme="red" />
      </HStack>

      <Box minW="1600px">
        <Box display="grid" gridTemplateColumns={`repeat(${campos.length}, 1fr)`} gap={2} mb={2}>
          {campos.map((c, i) => (
            <Text key={i} fontSize="xs" textTransform="uppercase" fontWeight="bold">
              {c}
            </Text>
          ))}
        </Box>

        {(datos[semanaActiva] || []).map((fila, rowIdx) => (
          <Box
            key={rowIdx}
            display="grid"
            gridTemplateColumns={`repeat(${campos.length}, 1fr)`}
            gap={2}
            mb={2}
          >
            {campos.map((campo, i) =>
              campo === "prioridad" ? (
                <Select
                  key={i}
                  value={fila[campo]}
                  onChange={e => handleChange(rowIdx, campo, e.target.value)}
                  bg="whiteAlpha.100"
                >
                  <option value="">--</option>
                  <option value="Alta">Alta</option>
                  <option value="Media">Media</option>
                  <option value="Baja">Baja</option>
                </Select>
              ) : (
                <Input
                  key={i}
                  value={fila[campo]}
                  onChange={e => handleChange(rowIdx, campo, e.target.value)}
                  bg="whiteAlpha.100"
                  size="sm"
                  height="auto"
                  whiteSpace="pre-wrap"
                />
              )
            )}
          </Box>
        ))}

        <Button onClick={addRow} colorScheme="purple" mt={4}>
          + Agregar fila
        </Button>
      </Box>
    </Box>
  );
}
