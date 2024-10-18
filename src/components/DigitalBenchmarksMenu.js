import React from 'react';
import { Box, Image } from '@chakra-ui/react';

const DigitalBenchmarksMenu = () => {
  return (
    <>
      {/* Logo on the Left (Fixed Position) */}
      <Box
        position="fixed"
        top="20px"
        left="50px"
        zIndex="1100"
        pointerEvents="none"
      >
      </Box>

      {/* No additional content */}
    </>
  );
};

export default DigitalBenchmarksMenu;
