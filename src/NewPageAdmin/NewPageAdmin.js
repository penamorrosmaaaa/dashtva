// src/components/NewPageAdmin.js

import React from 'react';
import { Box, Button } from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
import DigitalBenchmarksMenu from '../components/DigitalBenchmarksMenu'; // Ensure the menu is imported
import calendarIcon from '../assets/calendar-time-svgrepo-com.svg'; // Calendar icon for Digital Calendar

const NewPageAdmin = () => {
  const navigate = useNavigate(); // Use navigate for redirection

  const handleLogout = () => {
    localStorage.removeItem('isAuthenticated'); // Remove auth flag
    navigate('/'); // Redirect to the main login page
  };

  return (
    <Box color="white" width="100vw" height="100vh" p={0} m={0}>
      {/* Digital Benchmarks Menu */}
      <DigitalBenchmarksMenu title="ADMIN - Digital Calendar" icon={calendarIcon} />

      {/* Embed Google Sheet - Always Full Screen */}
      <Box
        bg="linear-gradient(90deg, #000000, #7800ff)"
        width="100vw"
        height="100vh"
        position="fixed" // Fixed position to cover the entire viewport
        top="0"
        left="0"
        zIndex="900"
        p={0}
        m={0}
        overflow="hidden"
      >
        {/* Removed Full Screen Toggle Button */}
        
        <iframe
          src="https://docs.google.com/spreadsheets/d/1oaMzcoyGzpY8Wg8EL8wlLtb4OHWzExOu/edit?usp=sharing"
          width="100%"
          height="100%"
          style={{ border: "0" }}
          allowFullScreen
        ></iframe>
      </Box>

      {/* Logout Button */}
      <Button
        position="absolute"
        bottom="20px" // Position at the bottom of the page
        right="20px" // Right corner
        bg="transparent"
        color="white"
        border="2px solid white"
        _hover={{ bg: 'rgba(255, 255, 255, 0.1)' }}
        onClick={handleLogout}
        aria-label="Logout"
      >
        Logout
      </Button>
    </Box>
  );
};

export default NewPageAdmin;
