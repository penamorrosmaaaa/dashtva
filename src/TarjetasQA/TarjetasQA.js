import React from 'react';
import { Box } from '@chakra-ui/react';
import ExcelUploader from '../components/ExcelUploader';

const TarjetasQA = () => {
  return (
    <Box p={4}>
      <ExcelUploader />
      <Box mt={4} w="100%" h="calc(100vh - 250px)">
        <iframe
          src="/qa-dashboard.html"
          title="QA Dashboard"
          width="100%"
          height="100%"
          style={{ border: 'none' }}
        />
      </Box>
    </Box>
  );
};

export default TarjetasQA;
