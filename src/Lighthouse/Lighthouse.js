import React, { useState, useEffect } from "react";
import {
  Box,
  Button,
  HStack,
  Text,
  VStack,
  Flex,
  Progress,
} from "@chakra-ui/react";
import Papa from "papaparse";

import GeneralOverview from "./GeneralOverview";
import VerticalOverview from "./VerticalOverview";
import LocalOverview from "./LocalOverview";
import ImageOverview from "./ImageOverview";
import AMPOverview from "./AMPOverview";
import AiChat from "./AiChat";
import CombinedPerformanceMaps from "./CrUXPage.js";

import "./Lighthouse.css";

const SHEET_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vRzIonikYeUwzVTUUO7bDLQ1DDzqzKB-BFIJ4tzJMqMlNFnxPF0eVRypNmykYVP0Pn-w1tfnOCTaKaP/pub?output=csv";

const Lighthouse = () => {
  const [activeSection, setActiveSection] = useState("general");
  const [csvData, setCsvData] = useState([]);
  const [csvReady, setCsvReady] = useState(false);
  const [showIntro, setShowIntro] = useState(true);
  const [introPhase, setIntroPhase] = useState(0);

  // Simple 3-phase intro
  useEffect(() => {
    const timer = setTimeout(() => {
      setIntroPhase(1); // Show logo
      setTimeout(() => {
        setIntroPhase(2); // Fade out
        setTimeout(() => {
          setShowIntro(false); // Remove intro
        }, 500);
      }, 1500);
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  // Load CSV data
  useEffect(() => {
    Papa.parse(SHEET_URL, {
      download: true,
      header: true,
      skipEmptyLines: true,
      complete: ({ data }) => {
        setCsvData(data);
        setCsvReady(true);
      },
      error: err => console.error("Error CSV:", err),
    });
  }, []);

  const renderSection = () => {
    switch (activeSection) {
      case "general": return <GeneralOverview />;
      case "vertical": return <VerticalOverview />;
      case "local": return <LocalOverview />;
      case "image": return <ImageOverview />;
      case "amp": return <AMPOverview />;
      case "crux": return <CombinedPerformanceMaps />;
      default: return null;
    }
  };

  // Simplified intro screen
  const IntroScreen = () => (
    <Box
      position="fixed"
      top="0"
      left="0"
      width="100vw"
      height="100vh"
      bg="black"
      zIndex="10000"
      display="flex"
      alignItems="center"
      justifyContent="center"
      opacity={introPhase === 2 ? 0 : 1}
      transition="opacity 0.5s ease-out"
      pointerEvents={showIntro ? "all" : "none"}
    >
      <VStack spacing={8}>
        {/* Simple animated logo/text */}
        <Box
          opacity={introPhase >= 1 ? 1 : 0}
          transform={`scale(${introPhase >= 1 ? 1 : 0.8})`}
          transition="all 0.6s ease-out"
        >
          <Text
            fontSize={{ base: "3rem", md: "5rem" }}
            fontFamily="'Orbitron', sans-serif"
            fontWeight="900"
            color="#00f7ff"
            textShadow="0 0 30px #00f7ff"
            letterSpacing="3px"
          >
            LIGHTHOUSE
          </Text>
          <Text
            fontSize={{ base: "1rem", md: "1.2rem" }}
            fontFamily="'Roboto Mono', monospace"
            color="#00f7ff"
            textAlign="center"
            opacity="0.7"
            mt={2}
          >
            AI ANALYTICS SYSTEM
          </Text>
        </Box>

        {/* Simple loading indicator */}
        <Box
          width="200px"
          opacity={introPhase >= 1 ? 0.8 : 0}
          transition="opacity 0.4s ease-out 0.3s"
        >
          <Progress
            size="xs"
            isIndeterminate
            colorScheme="cyan"
            bg="rgba(0, 247, 255, 0.1)"
            sx={{
              '& > div': {
                background: 'linear-gradient(90deg, #00f7ff, #0080ff)',
                boxShadow: '0 0 10px #00f7ff',
              }
            }}
          />
        </Box>
      </VStack>

      {/* Optional: Keep subtle background effect */}
      <Box className="matrix-rain-boot" opacity="0.3" />
    </Box>
  );

  return (
    <>
      {showIntro && <IntroScreen />}

      <Box
        className="lighthouse-scope"
        as="main"
        minH="100vh"
        overflowX="hidden"
        opacity={!showIntro ? 1 : 0}
        transition="opacity 0.5s ease-in"
      >
        {/* Keep your existing background effects */}
        <div className="tv-glitch-overlay" />
        <div className="grid-overlay" />
        <div className="binary-rain" />
        <div className="data-stream" />
        <div className="corner-accent top-left" />
        <div className="corner-accent top-right" />

        <Box textAlign="center" pt={{ base: 6, md: 10 }} mb={0} className="nav-container" pos="relative" zIndex="10">
          <HStack spacing={{ base: 2, md: 4 }} justify="center" className="cyber-nav">
            <Button className="cyber-nav-btn" onClick={() => setActiveSection("general")} data-section="general">General</Button>
            <Button className="cyber-nav-btn" onClick={() => setActiveSection("vertical")} data-section="vertical">Vertical</Button>
            <Button className="cyber-nav-btn" onClick={() => setActiveSection("local")} data-section="local">Local</Button>
            <Button className="cyber-nav-btn" onClick={() => setActiveSection("image")} data-section="image">Image</Button>
            <Button className="cyber-nav-btn" onClick={() => setActiveSection("amp")} data-section="amp">AMP</Button>
            <Button className="cyber-nav-btn" onClick={() => setActiveSection("crux")} data-section="crux">CrUX</Button>

            {csvReady && (
              <Box className="ai-chat-wrapper">
                <AiChat visibleData={csvData} inline />
                <Box className="ai-pulse-ring" />
                <Box className="ai-pulse-ring" />
              </Box>
            )}
          </HStack>
        </Box>

        <Box className="main-content section-transition" pt={5} pos="relative" zIndex="5">
          {renderSection()}
        </Box>
      </Box>
    </>
  );
};

export default Lighthouse;