// FILE: src/Lighthouse/Lighthouse.js
import React from "react";
import { Box } from "@chakra-ui/react";
import GeneralOverview from "./GeneralOverview";
import VerticalOverview from "./VerticalOverview";
import LocalOverview from "./LocalOverview";
import ImageOverview from "./ImageOverview";
import './Lighthouse.css'; // Keep the import

const Lighthouse = () => {
  return (
    <Box className="lighthouse-scope" as="main" pt="0px" px={6} overflowX="hidden">
      <Box id="general" mb={20}>
        <GeneralOverview />
      </Box>
      <Box id="vertical" mb={20}>
        <VerticalOverview />
      </Box>
      <Box id="local" mb={20}>
        <LocalOverview />
      </Box>
      <Box id="image" mb={20}>
        <ImageOverview />
      </Box>
    </Box>
  );
};

export default Lighthouse;
