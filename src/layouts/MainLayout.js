import React from 'react';
import { Box } from '@chakra-ui/react';

const MainLayout = ({ children }) => {
  return (
    <Box 
      pt="120px" // Enough top padding to ensure content starts below fixed header
      px="20px"
    >
      {children}
    </Box>
  );
};

export default MainLayout;
