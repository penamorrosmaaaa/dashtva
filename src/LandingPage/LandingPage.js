// LandingPage.js

import React, { useState, useEffect } from 'react';
import { Box, Flex, Image, Text, Button, useBreakpointValue } from '@chakra-ui/react';
import { Link as RouterLink } from 'react-router-dom';
import { FaLock } from 'react-icons/fa';
import { AiOutlineEye, AiOutlineCalendar } from 'react-icons/ai';
import nasaImage from '../assets/nasa-Q1p7bh3SHj8-unsplash.jpg';
import logoImage from '../assets/Diseño sin título (1).png';
import lighthouseIcon from '../assets/lighthouse-svgrepo-com.svg';
import ampIcon from '../assets/amp-svgrepo-com.svg';

const LandingPage = ({ handleLogout, authenticatedUser }) => {
  const [showLock, setShowLock] = useState(null);
  const [contentVisible, setContentVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setContentVisible(true);
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  const handleMouseEnter = (id) => setShowLock(id);
  const handleMouseLeave = () => setShowLock(null);

  const flexDirection = useBreakpointValue({ base: 'column', lg: 'row' });
  const boxWidth = useBreakpointValue({ base: '90%', md: '300px' });
  const boxHeight = useBreakpointValue({ base: '160px', md: '150px' });
  const gap = useBreakpointValue({ base: 6, lg: 10 });
  const iconSize = useBreakpointValue({ base: '50px', md: '60px' });
  const lighthouseWidth = useBreakpointValue({ base: '50px', md: '60px' });
  const logoSize = useBreakpointValue({ base: '150px', md: '200px' });

  const options = [
    {
      name: 'Lighthouse',
      icon: (
        <Image
          src={lighthouseIcon}
          alt="Lighthouse Icon"
          width={lighthouseWidth}
          filter="invert(1)"
        />
      ),
      route: null, // Static, no link
      adminRoute: null,
    },
    {
      name: 'Lighthouse AMP',
      icon: (
        <Image
          src={ampIcon}
          alt="Lighthouse AMP Icon"
          width={lighthouseWidth}
          filter="invert(1)"
        />
      ),
      route: null, // Static, no link
      adminRoute: null,
    },
    {
      name: 'Popular Objects',
      icon: <AiOutlineEye size={iconSize} />,
      route: '/PopularObjects',
      adminRoute: '/ADMIN-PopularObjects',
    },
    {
      name: 'Digital Calendar',
      icon: <AiOutlineCalendar size={iconSize} />,
      route: '/Digital-Calendar',
      adminRoute: '/ADMIN-DIGITAL-CALENDAR',
    },
  ];

  return (
    <Box
      color="white"
      width="100vw"
      minHeight="100vh"
      position="relative"
      overflow="auto"
      bg="linear-gradient(90deg, #000000, #7800ff)"
      py={8}
      px={4}
    >
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
        position="fixed"
        top="20px"
        right="20px"
        variant="link"
        color="white"
        onClick={handleLogout}
        aria-label="Logout"
        zIndex="1000"
        _hover={{ textDecoration: 'none', color: 'white' }}
        _active={{ bg: 'transparent' }}
      >
        Logout
      </Button>

      <Flex
        direction="column"
        align="center"
        justify="flex-start"
        zIndex="1"
        position="relative"
        gap={10}
        style={{
          opacity: contentVisible ? 1 : 0,
          transform: contentVisible ? 'scale(1)' : 'scale(0.5)',
          transition: 'opacity 1.5s ease, transform 1.5s ease',
        }}
      >
        <Image
          src={logoImage}
          alt="Digital Benchmarks Logo"
          width={logoSize}
          mb={8}
        />

        <Flex
          direction={flexDirection}
          justify="center"
          align="center"
          gap={gap}
          wrap="wrap"
          width="100%"
        >
          {options.map((option) => {
            if (authenticatedUser.permissions.includes(option.name)) {
              return (
                <Flex
                  key={option.name}
                  direction="column"
                  align="center"
                  justify="center"
                  as={option.route ? RouterLink : 'div'}
                  to={option.route ? option.route : undefined}
                  border="2px solid white"
                  borderRadius="lg"
                  p={4}
                  width={boxWidth}
                  height={boxHeight}
                  position="relative"
                  _hover={{ transform: 'scale(1.05)' }}
                  onMouseEnter={() => handleMouseEnter(option.name)}
                  onMouseLeave={handleMouseLeave}
                  transition="transform 0.3s ease"
                  cursor={option.route ? 'pointer' : 'default'}
                  mb={{ base: 4, md: 0 }}
                >
                  {showLock === option.name && option.adminRoute && (
                    <Button
                      as={RouterLink}
                      to={option.adminRoute}
                      leftIcon={<FaLock />}
                      aria-label={`Admin - ${option.name}`}
                      position="absolute"
                      top="10px"
                      right="10px"
                      color="white"
                      variant="ghost"
                      _hover={{
                        textDecoration: 'none',
                        color: 'yellow.400',
                        transform: 'scale(1.2)',
                      }}
                      _active={{ bg: 'transparent' }}
                      transition="color 0.3s ease, transform 0.3s ease"
                    >
                      Admin
                    </Button>
                  )}
                  {option.icon}
                  <Text
                    mt={6}
                    fontSize={['md', 'lg']}
                    fontWeight="bold"
                    fontFamily="Arial"
                    textAlign="center"
                  >
                    {option.name}
                  </Text>
                </Flex>
              );
            } else {
              return null;
            }
          })}
        </Flex>
      </Flex>
    </Box>
  );
};

export default LandingPage;
