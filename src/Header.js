import React from 'react';
import { Box, Image, useBreakpointValue } from '@chakra-ui/react';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import logoImage from './assets/Diseño sin título (1).png';
import dcImage from './assets/DC.png'; // Digital Calendar
import poImage from './assets/PO.png'; // Popular Objects
import tbImage from './assets/TB.png'; // Time Box

const Header = () => {
  const logoSize = useBreakpointValue({ base: '100px', md: '150px' });
  const location = useLocation();
  const isDigitalCalendar = location.pathname === '/Digital-Calendar';
  const isPopularObjects = location.pathname === '/PopularObjects';
  const isTimeBox = location.pathname === '/Time-Box';

  return (
    <Box
      as="header"
      position="fixed"
      top="0"
      left="0"
      width="100%"
      zIndex="1000"
      p={4}
      bg="linear-gradient(90deg, #000000, #7800ff)"
      display="flex"
      alignItems="center"
      justifyContent="center"
    >
      <Box display="flex" alignItems="center" gap={6}>
        <RouterLink to="/landing">
          <Image
            src={logoImage}
            alt="Digital Benchmarks Logo"
            width={logoSize}
            cursor="pointer"
          />
        </RouterLink>

        {isDigitalCalendar && (
          <Image
            src={dcImage}
            alt="Digital Calendar Title"
            height="50px"
          />
        )}

        {isPopularObjects && (
          <Image
            src={poImage}
            alt="Popular Objects Title"
            height="50px"
          />
        )}

        {isTimeBox && (
          <Image
            src={tbImage}
            alt="Time Box Title"
            height="50px"
          />
        )}
      </Box>
    </Box>
  );
};

export default Header;
