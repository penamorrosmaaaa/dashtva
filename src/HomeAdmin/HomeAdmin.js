// HomeAdmin.js

import React from 'react';
import { Box, Button, HStack } from '@chakra-ui/react';
import { FiFolder } from 'react-icons/fi';
import DigitalBenchmarksMenu from '../components/DigitalBenchmarksMenu';
import eyeIcon from '../assets/eye-svgrepo-com.svg';

const HomeAdmin = () => {
  return (
    <Box p={0} width="100vw" height="100vh" position="relative">
      {/* Digital Benchmarks Menu */}
      <DigitalBenchmarksMenu title="ADMIN - Popular Objects" icon={eyeIcon} />

      {/* Embed Google Sheet - Always Full Screen */}
      <Box
        width="100%"
        height="100vh"
        position="fixed"
        top="0"
        left="0"
        zIndex="900"
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
          zIndex="1000"
        >
          {/* Drive Button */}
          <Button
            as="a"
            href="https://drive.google.com/drive/folders/1qZP_dE9Hk7QTjSaf3hQPqHjgKbVHOGk5?usp=sharing" // Replace with your actual Google Drive link
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
        ></iframe>
      </Box>
    </Box>
  );
};

export default HomeAdmin;
