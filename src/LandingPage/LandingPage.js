import React, { useState, useEffect } from 'react';
import {
  Box,
  Flex,
  Image,
  Text,
  Button,
  useBreakpointValue,
} from '@chakra-ui/react';
import { Link as RouterLink } from 'react-router-dom';
import { FaLock } from 'react-icons/fa';
import { AiOutlineEye, AiOutlineCalendar } from 'react-icons/ai';
import nasaImage from '../assets/nasa-Q1p7bh3SHj8-unsplash.jpg';
import logoImage from '../assets/Diseño sin título (1).png';
import lighthouseIcon from '../assets/lighthouse-svgrepo-com.svg';
import ampIcon from '../assets/amp-svgrepo-com.svg';

const LandingPage = ({ handleLogout }) => {
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
        position="fixed" // Ensure the button stays fixed
        top="20px"
        right="20px"
        variant="link"
        color="white"
        onClick={handleLogout}
        aria-label="Logout"
        zIndex="1000" // High z-index to stay above other elements
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
          {/* Lighthouse (Static) */}
          <Flex
            direction="column"
            align="center"
            justify="center"
            border="2px solid white"
            borderRadius="lg"
            p={4}
            width={boxWidth}
            height={boxHeight}
            position="relative"
            _hover={{ transform: 'scale(1.05)' }}
            transition="transform 0.3s ease"
            cursor="default"
            mb={{ base: 4, md: 0 }}
          >
            <Image
              src={lighthouseIcon}
              alt="Lighthouse Icon"
              width={lighthouseWidth}
              filter="invert(1)"
            />
            <Text
              mt={6}
              fontSize={['md', 'lg']}
              fontWeight="bold"
              fontFamily="Arial"
              textAlign="center"
            >
              Lighthouse
            </Text>
          </Flex>

          {/* Lighthouse AMP (Static) */}
          <Flex
            direction="column"
            align="center"
            justify="center"
            border="2px solid white"
            borderRadius="lg"
            p={4}
            width={boxWidth}
            height={boxHeight}
            position="relative"
            _hover={{ transform: 'scale(1.05)' }}
            transition="transform 0.3s ease"
            cursor="default"
            mb={{ base: 4, md: 0 }}
          >
            <Image
              src={ampIcon} // New AMP Icon
              alt="Lighthouse AMP Icon"
              width={lighthouseWidth}
              filter="invert(1)"
            />
            <Text
              mt={6}
              fontSize={['md', 'lg']}
              fontWeight="bold"
              fontFamily="Arial"
              textAlign="center"
            >
              Lighthouse AMP
            </Text>
          </Flex>

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
            width={boxWidth}
            height={boxHeight}
            position="relative"
            _hover={{ transform: 'scale(1.05)' }}
            onMouseEnter={() => handleMouseEnter('popular')}
            onMouseLeave={handleMouseLeave}
            transition="transform 0.3s ease"
            cursor="pointer"
            mb={{ base: 4, md: 0 }}
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
            <AiOutlineEye size={iconSize} />
            <Text
              mt={6}
              fontSize={['md', 'lg']}
              fontWeight="bold"
              fontFamily="Arial"
              textAlign="center"
            >
              Popular Objects
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
            width={boxWidth}
            height={boxHeight}
            position="relative"
            _hover={{ transform: 'scale(1.05)' }}
            onMouseEnter={() => handleMouseEnter('calendar')}
            onMouseLeave={handleMouseLeave}
            transition="transform 0.3s ease"
            cursor="pointer"
            mb={{ base: 4, md: 0 }}
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
            <AiOutlineCalendar size={iconSize} />
            <Text
              mt={6}
              fontSize={['md', 'lg']}
              fontWeight="bold"
              fontFamily="Arial"
              textAlign="center"
            >
              Digital Calendar
            </Text>
          </Flex>
        </Flex>
      </Flex>
    </Box>
  );
};

export default LandingPage;
