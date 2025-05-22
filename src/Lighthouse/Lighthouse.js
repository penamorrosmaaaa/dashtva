import React, { useState, useEffect } from "react";
import {
  Box,
  Button,
  HStack,
} from "@chakra-ui/react";
import Papa from "papaparse";

import GeneralOverview  from "./GeneralOverview";
import VerticalOverview from "./VerticalOverview";
import LocalOverview    from "./LocalOverview";
import ImageOverview    from "./ImageOverview";
import AMPOverview      from "./AMPOverview";
import AiChat           from "./AiChat";

import "./Lighthouse.css";

/* ------------------------------------------------------------------ */
/*  ✅  URL del CSV (se carga UNA vez y queda global)                  */
/* ------------------------------------------------------------------ */
const SHEET_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vRzIonikYeUwzVTUUO7bDLQ1DDzqzKB-BFIJ4tzJMqMlNFnxPF0eVRypNmykYVP0Pn-w1tfnOCTaKaP/pub?output=csv";

const Lighthouse = () => {
  const [activeSection, setActiveSection] = useState("general");
  const [csvData, setCsvData]   = useState([]);
  const [csvReady, setCsvReady] = useState(false);

  /* ------------------------------------------------------------------ */
  /*  1️⃣  Cargar CSV solo la PRIMERA vez                               */
  /* ------------------------------------------------------------------ */
  useEffect(() => {
    Papa.parse(SHEET_URL, {
      download      : true,
      header        : true,
      skipEmptyLines: true,
      complete: ({ data }) => {
        setCsvData(data);
        setCsvReady(true);
      },
      error: err => console.error("Error CSV:", err),
    });
  }, []);

  /* ------------------------------------------------------------------ */
  /*  2️⃣  Render dinámico de secciones                                 */
  /* ------------------------------------------------------------------ */
  const renderSection = () => {
    switch (activeSection) {
      case "general":  return <GeneralOverview  />;
      case "vertical": return <VerticalOverview />;
      case "local":    return <LocalOverview    />;
      case "image":    return <ImageOverview    />;
      case "amp":      return <AMPOverview      />;
      default:         return null;
    }
  };

  /* ------------------------------------------------------------------ */
  /*  3️⃣  UI principal                                                 */
  /* ------------------------------------------------------------------ */
  return (
    <Box className="lighthouse-scope" as="main" minH="100vh" overflowX="hidden">
      <div className="tv-glitch-overlay" />

      {/* ------------  HEADER DE NAVEGACIÓN + BOTÓN AI  --------------- */}
      <Box textAlign="center" pt={10} mb={0}>
        <HStack spacing={4} justify="center" className="cyber-nav">
          <Button className="cyber-nav-btn" onClick={() => setActiveSection("general")}>General</Button>
          <Button className="cyber-nav-btn" onClick={() => setActiveSection("vertical")}>Vertical</Button>
          <Button className="cyber-nav-btn" onClick={() => setActiveSection("local")}>Local</Button>
          <Button className="cyber-nav-btn" onClick={() => setActiveSection("image")}>Image</Button>
          <Button className="cyber-nav-btn" onClick={() => setActiveSection("amp")}>AMP</Button>

          {/* 🔥 Icono AI justo al lado de AMP (versión inline) */}
          {csvReady && <AiChat visibleData={csvData} inline />}
        </HStack>
      </Box>

      {/* ---------------  CONTENIDO PRINCIPAL  ------------------------ */}
      <Box className="main-content">
        {renderSection()}
      </Box>
    </Box>
  );
};

export default Lighthouse;
