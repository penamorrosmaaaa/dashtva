// src/NewPageAdmin/NewPageAdmin.js

import React from 'react';
import { Box, Button } from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
import DigitalBenchmarksMenu from '../components/DigitalBenchmarksMenu';
import calendarIcon from '../assets/calendar-time-svgrepo-com.svg';

const NewPageAdmin = () => {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('authenticatedUser'); // Corrected key
    navigate('/login', { replace: true }); // Redirect to the login page
  };

  return (
    <Box color="white" width="100vw" height="100vh" p={0} m={0}>
      {/* Digital Benchmarks Menu */}
      <DigitalBenchmarksMenu
        title="ADMIN - Digital Calendar"
        icon={calendarIcon}
        zIndex="10" // Adjust zIndex if necessary
      />

      {/* Embed Google Sheet - Always Full Screen */}
      <Box
        bg="linear-gradient(90deg, #000000, #7800ff)"
        width="100vw"
        height="100vh"
        position="fixed"
        top="0"
        left="0"
        zIndex="0" // Ensure it doesn't overlap other components
        p={0}
        m={0}
        overflow="hidden"
      >
        <iframe
          src="https://docs.google.com/spreadsheets/d/1oaMzcoyGzpY8Wg8EL8wlLtb4OHWzExOu/edit?usp=sharing"
          width="100%"
          height="100%"
          style={{ border: '0' }}
          allowFullScreen
          title="Admin Digital Calendar Sheet"
        ></iframe>
      </Box>

      {/* Logout Button */}
      <Button
        position="absolute"
        bottom="20px"
        right="20px"
        bg="transparent"
        color="white"
        border="2px solid white"
        _hover={{ bg: 'rgba(255, 255, 255, 0.1)' }}
        onClick={handleLogout}
        aria-label="Logout"
        zIndex="1" // Ensure the button is above the iframe
      >
        Logout
      </Button>
    </Box>
  );
};

export default NewPageAdmin;
