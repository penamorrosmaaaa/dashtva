import React from 'react';
import { Box, Image, useBreakpointValue } from '@chakra-ui/react';
import { Link as RouterLink } from 'react-router-dom';
import logoImage from './assets/Diseño sin título (1).png';

const Header = () => {
  const logoSize = useBreakpointValue({ base: '100px', md: '150px' });

  return (
    <Box
      as="header"
      position="fixed"              // Keeps it locked at the top
      top="0"
      left="0"
      width="100%"
      zIndex="1000"
      p={4}
      bg="linear-gradient(90deg, #000000, #7800ff)"
      display="flex"
      alignItems="center"
      justifyContent="flex-start"
    >
      <RouterLink to="/landing">
        <Image
          src={logoImage}
          alt="Digital Benchmarks Logo"
          width={logoSize}
          cursor="pointer"
          ml="20px"
        />
      </RouterLink>
    </Box>
  );
};

export default Header;
