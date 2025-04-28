// src/NewPageAdmin/NewPageAdmin.js

import React, { useState } from 'react';
import { Box, Button, Input, Text, VStack } from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
import DigitalBenchmarksMenu from '../components/DigitalBenchmarksMenu';
import calendarIcon from '../assets/calendar-time-svgrepo-com.svg';

const NewPageAdmin = () => {
  const [pinInput, setPinInput] = useState('');
  const [isAuthorized, setIsAuthorized] = useState(false);
  const navigate = useNavigate();

  const handlePinSubmit = (e) => {
    e.preventDefault();
    if (pinInput.trim() === 'Matesa696') {
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
        zIndex="0" // Ensure it doesn't overlap the PIN form
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

      {/* The Logout Button has been removed */}
    </Box>
  );
};

export default NewPageAdmin;