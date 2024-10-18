// LandingPage.js

import React, { useState, useEffect } from 'react';
import { Box, Flex, Image, Text, Button } from '@chakra-ui/react';
import { Link as RouterLink } from 'react-router-dom';
import { FaLock } from 'react-icons/fa';
import { AiOutlineEye, AiOutlineCalendar } from 'react-icons/ai';
import nasaImage from '../assets/nasa-Q1p7bh3SHj8-unsplash.jpg';
import logoImage from '../assets/Diseño sin título (1).png';
import lighthouseIcon from '../assets/lighthouse-svgrepo-com.svg';

const LandingPage = ({ handleLogout }) => {
  const [showLock, setShowLock] = useState(null);
  const [contentVisible, setContentVisible] = useState(false);

  useEffect(() => {
    // Trigger transition effect after a small delay
    setTimeout(() => {
      setContentVisible(true);
    }, 300);
  }, []);

  const handleMouseEnter = (id) => setShowLock(id);
  const handleMouseLeave = () => setShowLock(null);

  return (
    <Box
      color="white"
      width="100vw"
      height="100vh"
      position="relative"
      overflow="hidden"
      bg="linear-gradient(90deg, #000000, #7800ff)"
    >
      {/* Background Image */}
      <Image
        src={nasaImage}
        alt="NASA background"
        position="absolute"
        top="0"
        left="0"
        width="100%"
        height="100%"
        objectFit="cover"
        opacity="0.6"
        zIndex="0"
      />

      {/* Logout Button */}
      <Button
        position="absolute"
        top="20px"
        right="20px"
        variant="link"
        color="white"
        onClick={handleLogout}
        aria-label="Logout"
        zIndex="2"  // Set zIndex higher than other elements to bring it to the front
        _hover={{ textDecoration: 'none', color: 'white' }}
        _active={{ bg: 'transparent' }}
      >
        Logout
      </Button>

      {/* Centered Logo and Boxes with Transition Effect */}
      <Flex
        direction="column"
        align="center"
        justify="center"
        height="75vh"
        zIndex="1"
        position="relative"
        gap={10}
        style={{
          opacity: contentVisible ? 1 : 0,
          transform: contentVisible ? 'scale(1)' : 'scale(0.5)', // Transition from smaller size
          transition: 'opacity 1.5s ease, transform 1.5s ease', // Smooth transition
        }}
      >
        {/* Logo in the Center */}
        <Image src={logoImage} alt="Digital Benchmarks Logo" width="200px" />

        {/* Centered Boxes for Navigation */}
        <Flex justify="center" align="center" gap={14} position="relative" mt={4}>
          {/* Popular Objects */}
          <Flex
            direction="column"
            align="center"
            justify="center"
            as={RouterLink}
            to="/PopularObjects"
            border="2px solid white"
            borderRadius="lg"
            p={4}
            w="300px"
            h="150px"
            position="relative"
            _hover={{ transform: 'scale(1.05)' }}
            onMouseEnter={() => handleMouseEnter('popular')}
            onMouseLeave={handleMouseLeave}
          >
            {showLock === 'popular' && (
              <Button
                as={RouterLink}
                to="/ADMIN-PopularObjects"
                leftIcon={<FaLock />}
                aria-label="Admin - Popular Objects"
                position="absolute"
                top="10px"
                right="10px"
                color="white"
                variant="link"
                _hover={{ textDecoration: 'none', color: 'white' }}
                _active={{ bg: 'transparent' }}
              />
            )}
            <AiOutlineEye size="60px" />
            <Text mt={6} fontSize="lg" fontWeight="bold" fontFamily="Arial">
              Popular Objects
            </Text>
          </Flex>

          {/* Lighthouse */}
          <Flex
            direction="column"
            align="center"
            justify="center"
            border="2px solid white"
            borderRadius="lg"
            p={4}
            w="300px"
            h="150px"
            position="relative"
            _hover={{ transform: 'scale(1.05)' }}
          >
            <Image
              src={lighthouseIcon}
              alt="Lighthouse Icon"
              width="60px"
              filter="invert(1)"
            />
            <Text mt={6} fontSize="lg" fontWeight="bold" fontFamily="Arial">
              Lighthouse
            </Text>
          </Flex>

          {/* Digital Calendar */}
          <Flex
            direction="column"
            align="center"
            justify="center"
            as={RouterLink}
            to="/Digital-Calendar"
            border="2px solid white"
            borderRadius="lg"
            p={4}
            w="300px"
            h="150px"
            position="relative"
            _hover={{ transform: 'scale(1.05)' }}
            onMouseEnter={() => handleMouseEnter('calendar')}
            onMouseLeave={handleMouseLeave}
          >
            {showLock === 'calendar' && (
              <Button
                as={RouterLink}
                to="/ADMIN-DIGITAL-CALENDAR"
                leftIcon={<FaLock />}
                aria-label="Admin - Digital Calendar"
                position="absolute"
                top="10px"
                right="10px"
                color="white"
                variant="link"
                _hover={{ textDecoration: 'none', color: 'white' }}
                _active={{ bg: 'transparent' }}
              />
            )}
            <AiOutlineCalendar size="60px" />
            <Text mt={6} fontSize="lg" fontWeight="bold" fontFamily="Arial">
              Digital Calendar
            </Text>
          </Flex>
        </Flex>
      </Flex>
    </Box>
  );
};

export default LandingPage;
