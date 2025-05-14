// FILE: src/Header.js

import React from 'react';
import { Box, Image, useBreakpointValue } from '@chakra-ui/react';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import logoImage from './assets/Diseño sin título (1).png';
import dcImage from './assets/DC.png';
import poImage from './assets/PO.png';
import tbImage from './assets/TB.png';
import lighthouseImage from './assets/Lighthouse.png'; // ✅ NEW

const Header = () => {
  const logoSize = useBreakpointValue({ base: '100px', md: '150px' });
  const location = useLocation();
  const isDigitalCalendar = location.pathname === '/Digital-Calendar';
  const isPopularObjects = location.pathname === '/PopularObjects';
  const isTimeBox = location.pathname === '/Time-Box';
  const isLighthouse = location.pathname === '/Lighthouse'; // ✅ NEW

  const starElements = Array.from({ length: 120 }).map((_, i) => {
    const left = Math.random() * 100;
    const top = Math.random() * 100;
    const delay = Math.random() * 5;
    return (
      <Box
        key={`header-star-${i}`}
        className="star"
        style={{
          position: 'absolute',
          left: `${left}%`,
          top: `${top}%`,
          animationDelay: `${delay}s, ${delay}s`,
        }}
      />
    );
  });

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
      overflow="hidden"
    >
      {/* Stars CSS */}
      <style>{`
        .star {
          width: 2px;
          height: 2px;
          border-radius: 50%;
          background: white;
          box-shadow: 0 0 4px 1px rgba(255,255,255,0.8);
          animation:
            starTwinkle 3s ease-in-out infinite alternate,
            starJitter 5s ease-in-out infinite alternate;
        }
        @keyframes starTwinkle {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.5; }
        }
        @keyframes starJitter {
          0%   { transform: translate(0, 0); }
          25%  { transform: translate(3px, -2px); }
          50%  { transform: translate(-2px, 3px); }
          75%  { transform: translate(2px, 2px); }
          100% { transform: translate(-3px, -3px); }
        }
      `}</style>

      {/* Stars container */}
      <Box
        position="absolute"
        top="0"
        left="0"
        width="100%"
        height="100%"
        zIndex={0}
        overflow="hidden"
        pointerEvents="none"
      >
        {starElements}
      </Box>

      {/* Logo & titles */}
      <Box display="flex" alignItems="center" gap={6} zIndex={1}>
        <RouterLink to="/landing">
          <Image
            src={logoImage}
            alt="Digital Benchmarks Logo"
            width={logoSize}
            cursor="pointer"
          />
        </RouterLink>

        {isDigitalCalendar && (
          <Image src={dcImage} alt="Digital Calendar Title" height="50px" />
        )}
        {isPopularObjects && (
          <Image src={poImage} alt="Popular Objects Title" height="50px" />
        )}
        {isTimeBox && (
          <Image src={tbImage} alt="Time Box Title" height="50px" />
        )}
        {isLighthouse && (
          <Image src={lighthouseImage} alt="Lighthouse Title" height="50px" />
        )}
      </Box>
    </Box>
  );
};

export default Header;
