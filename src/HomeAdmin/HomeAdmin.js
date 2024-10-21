// src/HomeAdmin/HomeAdmin.js

import React from 'react';
import { Box, Button, HStack } from '@chakra-ui/react';
import { FiFolder } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import DigitalBenchmarksMenu from '../components/DigitalBenchmarksMenu';
import eyeIcon from '../assets/eye-svgrepo-com.svg';

const HomeAdmin = () => {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('authenticatedUser'); // Ensure consistent key removal
    navigate('/login', { replace: true }); // Redirect to the login page
  };

  return (
    <Box p={0} width="100vw" height="100vh" position="relative">
      {/* Digital Benchmarks Menu */}
      <DigitalBenchmarksMenu
        title="ADMIN - Popular Objects"
        icon={eyeIcon}
        zIndex="10" // Adjust zIndex if necessary
      />

      {/* Embed Google Sheet - Always Full Screen */}
      <Box
        width="100%"
        height="100vh"
        position="fixed"
        top="0"
        left="0"
        zIndex="0" // Ensure it doesn't overlap other components
        bg="white"
        p={0}
        m={0}
        overflow="hidden"
      >
        {/* Admin Buttons: Drive */}
        <HStack
          position="absolute"
          top="20px"
          right="20px"
          spacing={4}
          zIndex="1"
        >
          {/* Drive Button */}
          <Button
            as="a"
            href="https://drive.google.com/drive/folders/1qZP_dE9Hk7QTjSaf3hQPqHjgKbVHOGk5?usp=sharing"
            target="_blank"
            rel="noopener noreferrer"
            colorScheme="blue"
            onClick={(e) => e.stopPropagation()}
            aria-label="Google Drive"
            leftIcon={<FiFolder />}
          >
            Drive
          </Button>
        </HStack>

        <iframe
          src="https://docs.google.com/spreadsheets/d/1I7rzIKf_CNjdP1iYGHivom5eS8YtGlSaP7ltG-HVw3w/edit?usp=sharing"
          width="100%"
          height="100%"
          style={{ border: '0' }}
          allowFullScreen
          title="Admin Popular Objects Sheet"
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

export default HomeAdmin;
