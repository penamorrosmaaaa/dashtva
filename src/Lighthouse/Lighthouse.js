import React, { useState, useEffect } from "react";
import {
  Box,
  Button,
  HStack,
  Text,
  VStack,
  Flex,
  Progress,
  keyframes, // Available if you want to define keyframes in JS for Chakra, though most of your animations seem CSS-driven
} from "@chakra-ui/react";
import Papa from "papaparse";

import GeneralOverview from "./GeneralOverview";
import VerticalOverview from "./VerticalOverview";
import LocalOverview from "./LocalOverview";
import ImageOverview from "./ImageOverview";
import AMPOverview from "./AMPOverview";
import AiChat from "./AiChat";

import "./Lighthouse.css"; // Crucial for all the impressive visuals

/* ------------------------------------------------------------------ */
/* ✅  URL del CSV (se carga UNA vez y queda global)                  */
/* ------------------------------------------------------------------ */
const SHEET_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vRzIonikYeUwzVTUUO7bDLQ1DDzqzKB-BFIJ4tzJMqMlNFnxPF0eVRypNmykYVP0Pn-w1tfnOCTaKaP/pub?output=csv";

const Lighthouse = () => {
  const [activeSection, setActiveSection] = useState("general");
  const [csvData, setCsvData] = useState([]);
  const [csvReady, setCsvReady] = useState(false);
  const [initComplete, setInitComplete] = useState(false);
  const [bootSequence, setBootSequence] = useState(0);
  const [aiMessages, setAiMessages] = useState([]);
  const [showMainContent, setShowMainContent] = useState(false);

  // Boot sequence messages - ENHANCED FOR AI/FINANCE/DATA THEME
  const bootMessages = [
    "INITIALIZING SENTIENT ANALYTICS CORE...",
    "INGESTING REAL-TIME MARKET DATA STREAMS...",
    "COMPILING ECONOMETRIC MODELS & RISK MATRICES...",
    "LOADING DEEP LEARNING NEURAL NETWORKS (DLNN)...",
    "CALIBRATING PREDICTIVE ALGORITHMS & ANOMALY DETECTORS...",
    "DECRYPTING VOLUMETRIC DATA MATRICES & SECURE LEDGERS...",
    "ESTABLISHING QUANTUM-ENCRYPTED DATA PIPELINES...",
    "ANALYZING MULTI-DIMENSIONAL FINANCIAL INDICATORS...",
    "OPTIMIZING COGNITIVE PROCESSING CLUSTERS...",
    "LIGHTHOUSE AI SYSTEM FULLY OPERATIONAL. ENGAGE INTELLIGENCE."
  ];

  /* ------------------------------------------------------------------ */
  /* 🚀 AI Boot Sequence Animation                                      */
  /* ------------------------------------------------------------------ */
  useEffect(() => {
    const messageInterval = setInterval(() => {
      setBootSequence(prev => {
        if (prev < bootMessages.length - 1) {
          setAiMessages(current => [...current, bootMessages[prev]]);
          return prev + 1;
        } else {
          // Display the final message
          setAiMessages(current => [...current, bootMessages[bootMessages.length - 1]]);
          clearInterval(messageInterval);
          setTimeout(() => {
            setInitComplete(true);
            setTimeout(() => setShowMainContent(true), 500); // Content fade-in after boot screen fades
          }, 1500); // Slightly longer pause on the final message
          return prev;
        }
      });
    }, 450); // Adjusted timing for new messages

    return () => clearInterval(messageInterval);
  }, [bootMessages]); // Added bootMessages to dependency array as it's used in effect

  /* ------------------------------------------------------------------ */
  /* 1️⃣  Cargar CSV solo la PRIMERA vez                               */
  /* ------------------------------------------------------------------ */
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

  /* ------------------------------------------------------------------ */
  /* 2️⃣  Render dinámico de secciones                                 */
  /* ------------------------------------------------------------------ */
  const renderSection = () => {
    switch (activeSection) {
      case "general": return <GeneralOverview />;
      case "vertical": return <VerticalOverview />;
      case "local": return <LocalOverview />;
      case "image": return <ImageOverview />;
      case "amp": return <AMPOverview />;
      default: return null;
    }
  };

  /* ------------------------------------------------------------------ */
  /* 🎭 Boot Screen Component                                           */
  /* ------------------------------------------------------------------ */
  const BootScreen = () => {
    // NEW: State for dynamic data feed text during boot
    const [dynamicFeedText, setDynamicFeedText] = useState("AWAITING DATA LINK...");

    useEffect(() => {
      let intervalId;
      if (bootSequence > 0 && bootSequence < bootMessages.length - 2) { // Show during intermediate boot stages
        const texts = [
          "ENCRYPTED FINANCIAL PACKETS STREAMING...",
          "PARSING QUANTUM ANALYTICS LAYER...",
          "VERIFYING DATA INTEGRITY CHECKSUMS...",
          "COMPILING PREDICTIVE MODEL INPUTS...",
          "ACCESSING SECURE DATAVAULTS...",
          "SYNTHESIZING MARKET INTELLIGENCE...",
          "SCANNING ECONOMIC INDICATORS...",
          "CALIBRATING FORECASTING MODULES..."
        ];
        let currentIndex = 0;
        setDynamicFeedText(texts[currentIndex]); // Initial text

        intervalId = setInterval(() => {
          currentIndex = (currentIndex + 1) % texts.length;
          setDynamicFeedText(texts[currentIndex]);
        }, 650); // Change text periodically
      } else if (bootSequence >= bootMessages.length -2) {
        setDynamicFeedText("SYSTEM DIAGNOSTICS COMPLETE...");
      } else {
        setDynamicFeedText("AWAITING DATA LINK...");
      }
      return () => clearInterval(intervalId);
    }, [bootSequence]); // Effect depends on bootSequence

    return (
      <Box
        className="ai-boot-screen"
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
        opacity={initComplete ? 0 : 1}
        pointerEvents={initComplete ? "none" : "all"}
        transition="opacity 1s ease-out"
      >
        <Box className="matrix-rain-boot" /> {/* From Lighthouse.css */}
        
        <VStack spacing={6} position="relative" zIndex="2"> {/* Adjusted spacing */}
          <Box className="ai-core-container" position="relative">
            <Box className="ai-core" /> {/* From Lighthouse.css */}
            <Box className="ai-core-rings" /> {/* From Lighthouse.css */}
            <Box className="ai-core-particles" /> {/* From Lighthouse.css */}
          </Box>

          {/* NEW: Ephemeral Data Visualization Placeholder */}
          {(bootSequence > 0 && bootSequence < bootMessages.length -1) && (
            <Box
              className="ephemeral-data-feed" // Style this class in Lighthouse.css
              width="350px"
              maxW="80vw"
              height="40px"
              border="1px solid"
              borderColor="rgba(0, 247, 255, 0.3)" // Cyan with alpha
              borderRadius="sm"
              overflow="hidden"
              position="relative"
              p={2}
              my={1}
              textAlign="center"
              _before={{ // Optional: subtle scanning line effect (needs CSS @keyframes)
                content: '""',
                position: 'absolute',
                top: '0',
                left: '-100%',
                width: '100%',
                height: '100%',
                background: 'linear-gradient(90deg, transparent, rgba(0, 247, 255, 0.15), transparent)',
                animation: 'scannerEffect 2s linear infinite', // Define scannerEffect in Lighthouse.css
              }}
            >
              <Text fontFamily="monospace" fontSize="11px" color="#00f7ff" opacity="0.75" letterSpacing="1px">
                {dynamicFeedText}
              </Text>
            </Box>
          )}

          <VStack
            spacing={1} // Reduced spacing for tighter message block
            width="700px" // Wider for new messages
            maxW="90vw"
            className="boot-messages"
            minHeight="180px" // Adjusted minHeight
          >
            {aiMessages.map((msg, idx) => (
              <Text
                key={idx}
                className="boot-text" // Ensure this class handles typewriter and appearance
                fontSize="13px" // Slightly smaller for more text
                fontFamily="'Roboto Mono', monospace" // Alternative monospace
                color={idx === aiMessages.length - 1 ? "#39ff14" : "#00f7ff"} // Final message green, others cyan
                opacity={idx === aiMessages.length - 1 ? 1 : 0.65}
                textShadow={idx === aiMessages.length - 1 ? "0 0 15px #39ff14" : "0 0 10px #00f7ff"}
                letterSpacing="1.5px"
                // Ensure your CSS 'typewriter' animation is robust or consider a JS approach if issues
                animation={`${idx === aiMessages.length - 1 ? 'typewriter-final' : 'typewriter-intermediate'} 0.5s steps(${msg.length}) forwards`}
              >
                {msg}
              </Text>
            ))}
          </VStack>

          <Box width="450px" maxW="80vw"> {/* Slightly wider progress bar */}
            <Progress
              value={(bootSequence / (bootMessages.length -1)) * 100}
              size="sm" // Slightly thicker
              colorScheme="customCyan" // Use a custom scheme if needed, or stick to cyan
              hasStripe
              isAnimated
              bg="rgba(0, 247, 255, 0.05)" // More subtle background
              sx={{
                '& > div': {
                  background: 'linear-gradient(90deg, #00f7ff, #6a00ff, #ff00ff)', // More vibrant gradient
                  boxShadow: '0 0 15px #00f7ff, 0 0 5px #ff00ff', // Enhanced glow
                }
              }}
            />
          </Box>

          <HStack spacing={5} className="loading-indicators">
            {[...Array(3)].map((_, i) => (
              <Box
                key={i}
                className="loading-dot" // From Lighthouse.css
                w="12px" h="12px" borderRadius="50%" bg="#00f7ff"
                animation={`pulse 1.5s ease-in-out ${i * 0.25}s infinite`}
              />
            ))}
          </HStack>
        </VStack>
        <Box className="holo-grid-boot" /> {/* From Lighthouse.css */}
      </Box>
    );
  };

  /* ------------------------------------------------------------------ */
  /* 3️⃣  UI principal                                                 */
  /* ------------------------------------------------------------------ */
  return (
    <>
      {!initComplete && <BootScreen />}

      <Box
        className={`lighthouse-scope ${showMainContent ? 'content-loaded' : ''}`}
        as="main" minH="100vh" overflowX="hidden"
        opacity={showMainContent ? 1 : 0}
        transition="opacity 0.5s ease-in"
      >
        <div className="tv-glitch-overlay" /> {/* From Lighthouse.css */}
        
        <div className="grid-overlay" /> {/* From Lighthouse.css */}
        <div className="binary-rain" /> {/* From Lighthouse.css */}
        <div className="data-stream" /> {/* From Lighthouse.css */}
        <div className="data-stream" /> {/* From Lighthouse.css */}
        <div className="data-stream" /> {/* From Lighthouse.css */}
        
        <div className="corner-accent top-left" /> {/* From Lighthouse.css */}
        <div className="corner-accent top-right" /> {/* From Lighthouse.css */}

        {showMainContent && (
          <Box
            className="welcome-text-container" // Changed class for clarity
            position="fixed" top="50%" left="50%"
            transform="translate(-50%, -50%)"
            zIndex="9999" pointerEvents="none"
            animation="welcomeSequence 3s ease-out forwards" // Ensure 'welcomeSequence' handles fade and scale
          >
            <Text
              fontSize={{ base: "2.5rem", md: "4rem" }} // Responsive font size
              fontFamily="'Orbitron', sans-serif"
              fontWeight="900"
              color="#00f7ff"
              textShadow="0 0 20px #00f7ff, 0 0 40px #00f7ff, 0 0 60px #00f7ff" // Enhanced glow
              letterSpacing="4px"
              opacity="0" // Animation will handle fade-in
              className="glitch-text futuristic-title" // Add 'futuristic-title' for more specific styling
              data-text="LIGHTHOUSE AI" // For glitch effect
            >
              LIGHTHOUSE AI
            </Text>
          </Box>
        )}

        <Box textAlign="center" pt={{ base: 6, md: 10 }} mb={0} className="nav-container" pos="relative" zIndex="10">
          <HStack spacing={{ base: 2, md: 4 }} justify="center" className="cyber-nav">
            {/* Buttons remain structurally similar, ensure .cyber-nav-btn CSS is impactful */}
            <Button className="cyber-nav-btn" onClick={() => setActiveSection("general")} data-section="general">General</Button>
            <Button className="cyber-nav-btn" onClick={() => setActiveSection("vertical")} data-section="vertical">Vertical</Button>
            <Button className="cyber-nav-btn" onClick={() => setActiveSection("local")} data-section="local">Local</Button>
            <Button className="cyber-nav-btn" onClick={() => setActiveSection("image")} data-section="image">Image</Button>
            <Button className="cyber-nav-btn" onClick={() => setActiveSection("amp")} data-section="amp">AMP</Button>

            {csvReady && (
              <Box className="ai-chat-wrapper">
                <AiChat visibleData={csvData} inline />
                <Box className="ai-pulse-ring" /> {/* From Lighthouse.css */}
                <Box className="ai-pulse-ring" /> {/* From Lighthouse.css */}
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