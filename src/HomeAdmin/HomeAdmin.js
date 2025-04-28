// src/HomeAdmin/HomeAdmin.js

import React, { useState } from 'react';
import { Box, Button, HStack, Input, Text, VStack } from '@chakra-ui/react';
import { FiFolder } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import DigitalBenchmarksMenu from '../components/DigitalBenchmarksMenu';
import eyeIcon from '../assets/eye-svgrepo-com.svg';

const HomeAdmin = () => {
  const [pinInput, setPinInput] = useState('');
  const [isAuthorized, setIsAuthorized] = useState(false);
  const navigate = useNavigate();

  const handlePinSubmit = (e) => {
    e.preventDefault();
    if (pinInput.trim() === '13456') {
      setIsAuthorized(true);
    } else {
      alert('Incorrect PIN');
      navigate('/landing', { replace: true });
    }
  };

  if (!isAuthorized) {
    return (
      <Box
        position="fixed"
        top="0"
        left="0"
        width="100vw"
        height="100vh"
        bg="linear-gradient(90deg, #000000, #7800ff)"
        display="flex"
        alignItems="center"
        justifyContent="center"
        color="white"
        zIndex="1000" // Ensure the PIN form is on top
      >
        <form onSubmit={handlePinSubmit}>
          <VStack spacing={4}>
            <Text fontSize="xl">Enter PIN to Access Admin Page</Text>
            <Input
              type="password"
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value)}
              placeholder="Enter PIN"
              width="300px"
              textAlign="center"
            />
            <Button type="submit" colorScheme="teal">
              Submit
            </Button>
          </VStack>
        </form>
      </Box>
    );
  }

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
        top="200"
        left="0"
        zIndex="0" // Ensure it doesn't overlap the PIN form
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
    </Box>
  );
};

export default HomeAdmin;
