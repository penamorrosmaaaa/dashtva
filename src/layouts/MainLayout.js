// src/layouts/MainLayout.js

import React from 'react';
import { Box } from '@chakra-ui/react';

const MainLayout = ({ children }) => {
  return (
    <Box position="relative" minHeight="100vh">
      {children}
    </Box>
  );
};

export default MainLayout;
