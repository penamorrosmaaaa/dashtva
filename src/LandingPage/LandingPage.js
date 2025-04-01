import React, { useState, useEffect } from 'react';
import {
  Box,
  Flex,
  Text,
  Button,
  useBreakpointValue,
  Image,
} from '@chakra-ui/react';
import { Link as RouterLink } from 'react-router-dom';
import { FaLock } from 'react-icons/fa';
import {
  AiOutlineEye,
  AiOutlineCalendar,
  AiOutlineClockCircle,
} from 'react-icons/ai';
import nasaVideo from '../assets/150253-798222949.mp4';
import logoImage from '../assets/Diseño sin título (1).png';

const LandingPage = ({ handleLogout }) => {
  const [showLock, setShowLock] = useState(null);
  const [contentVisible, setContentVisible] = useState(false);
  const [userName, setUserName] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setContentVisible(true);
    }, 300);

    const storedName = localStorage.getItem('userName');
    if (storedName) setUserName(storedName);

    return () => clearTimeout(timer);
  }, []);

  const handleMouseEnter = (id) => setShowLock(id);
  const handleMouseLeave = () => setShowLock(null);

  const flexDirection = useBreakpointValue({ base: 'column', lg: 'row' });
  const boxWidth = useBreakpointValue({ base: '90%', md: '300px' });
  const boxHeight = useBreakpointValue({ base: '180px', md: '160px' });
  const gap = useBreakpointValue({ base: 6, lg: 10 });
  const iconSize = useBreakpointValue({ base: '50px', md: '60px' });
  const logoSize = useBreakpointValue({ base: '140px', md: '180px' });

  return (
    <Box
      color="white"
      width="100vw"
      minHeight="100vh"
      position="relative"
      py={8}
      px={4}
      overflowX="hidden"
    >
      <video
        autoPlay
        muted
        loop
        playsInline
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          opacity: 0.4,
          zIndex: 0,
        }}
      >
        <source src={nasaVideo} type="video/mp4" />
        Your browser does not support the video tag.
      </video>

      {/* Logout */}
      <Button
        position="fixed"
        top="20px"
        right="20px"
        variant="outline"
        borderColor="whiteAlpha.600"
        color="white"
        size="sm"
        zIndex="10"
        onClick={handleLogout}
        _hover={{ bg: 'whiteAlpha.200' }}
        _active={{ bg: 'whiteAlpha.300' }}
      >
        Logout
      </Button>

      {/* Main Container */}
      <Flex
        direction="column"
        align="center"
        justify="center"
        zIndex="1"
        position="relative"
        mt={6}
        gap={6}
        style={{
          opacity: contentVisible ? 1 : 0,
          transform: contentVisible ? 'scale(1)' : 'scale(0.95)',
          transition: 'opacity 1.5s ease, transform 1.2s ease',
        }}
      >
        <RouterLink to="/landing">
          <Image
            src={logoImage}
            alt="Digital Benchmarks Logo"
            width={logoSize}
            mb={2}
          />
        </RouterLink>

        {userName && (
          <Text
            fontSize={['2xl', '3xl']}
            fontWeight="medium"
            textAlign="center"
            fontFamily="'The Youngest Script', cursive"
            bg="rgba(0,0,0,0.4)"
            px={4}
            py={2}
            borderRadius="md"
            backdropFilter="blur(6px)"
          >
            Welcome back, {userName}.
          </Text>
        )}

        {/* Menu Cards */}
        <Flex
          direction={flexDirection}
          justify="center"
          align="center"
          wrap="wrap"
          gap={gap}
        >
          {[
            {
              label: 'Popular Objects',
              icon: <AiOutlineEye size={iconSize} />,
              route: '/PopularObjects',
              adminRoute: '/ADMIN-PopularObjects',
              id: 'popular',
            },
            {
              label: 'Digital Calendar',
              icon: <AiOutlineCalendar size={iconSize} />,
              route: '/Digital-Calendar',
              adminRoute: '/ADMIN-DIGITAL-CALENDAR',
              id: 'calendar',
            },
            {
              label: 'Time-Box',
              icon: <AiOutlineClockCircle size={iconSize} />,
              route: '/Time-Box',
              adminRoute: '/ADMIN-TimeBox',
              id: 'timebox',
            },
          ].map(({ label, icon, route, adminRoute, id }) => (
            <Flex
              key={id}
              direction="column"
              align="center"
              justify="center"
              as={RouterLink}
              to={route}
              border="2px solid white"
              borderRadius="xl"
              backdropFilter="blur(12px)"
              backgroundColor="rgba(255, 255, 255, 0.05)"
              boxShadow="lg"
              p={6}
              width={boxWidth}
              height={boxHeight}
              position="relative"
              _hover={{
                transform: 'scale(1.05)',
                boxShadow: '0 0 15px rgba(255,255,255,0.2)',
              }}
              onMouseEnter={() => handleMouseEnter(id)}
              onMouseLeave={handleMouseLeave}
              transition="all 0.3s ease"
              cursor="pointer"
            >
              {showLock === id && (
                <Button
                  as={RouterLink}
                  to={adminRoute}
                  leftIcon={<FaLock />}
                  aria-label={`Admin - ${label}`}
                  position="absolute"
                  top="10px"
                  right="10px"
                  size="xs"
                  colorScheme="whiteAlpha"
                  variant="ghost"
                  _hover={{
                    color: 'yellow.400',
                    transform: 'scale(1.15)',
                  }}
                  _active={{ bg: 'transparent' }}
                  transition="all 0.3s ease"
                >
                  Admin
                </Button>
              )}
              {icon}
              <Text
                mt={4}
                fontSize={['md', 'lg']}
                fontWeight="bold"
                fontFamily="Arial"
                textAlign="center"
              >
                {label}
              </Text>
            </Flex>
          ))}
        </Flex>
      </Flex>
    </Box>
  );
};

export default LandingPage;
