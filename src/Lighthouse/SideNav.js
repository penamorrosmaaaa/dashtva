// FILE: src/Lighthouse/SideNav.js
import React from "react";
import { Box, Button, VStack } from "@chakra-ui/react";
import { FaChartPie, FaChartBar, FaCity, FaImage } from "react-icons/fa";

const sections = [
  { id: "general", label: "General Overview", icon: FaChartPie },
  { id: "vertical", label: "Vertical Overview", icon: FaChartBar },
  { id: "local", label: "Local Overview", icon: FaCity },
  { id: "image", label: "Image Overview", icon: FaImage },
];

const scrollToSection = (id) => {
  const section = document.getElementById(id);
  if (section) {
    section.scrollIntoView({ behavior: "smooth" });
  }
};

const SideNav = () => {
  return (
    <Box
      as="nav"
      width="220px"
      height="100vh"
      bg="linear-gradient(180deg, rgba(10,10,25,0.8), rgba(30,30,60,0.3))"
      backdropFilter="blur(12px)"
      borderRight="2px solid rgba(0,247,255,0.2)"
      boxShadow="0 0 30px rgba(0,247,255,0.1)"
      p={4}
      display="flex"
      flexDirection="column"
      justifyContent="center"
    >
      <VStack spacing={4}>
        {sections.map(({ id, label, icon: Icon }) => (
          <Button
            key={id}
            leftIcon={<Icon />}
            onClick={() => scrollToSection(id)}
            bg="rgba(80,0,200,0.3)"
            _hover={{
              bg: "rgba(120,0,255,0.4)",
              boxShadow: "0 0 12px rgba(0,247,255,0.6)",
              transform: "scale(1.05)",
            }}
            color="#fff"
            fontSize="sm"
            width="180px"
            justifyContent="flex-start"
            border="1px solid rgba(0,247,255,0.2)"
            backdropFilter="blur(6px)"
            transition="all 0.3s ease"
            fontFamily="Orbitron, sans-serif"
          >
            {label}
          </Button>
        ))}
      </VStack>
    </Box>
  );
};

export default SideNav;
