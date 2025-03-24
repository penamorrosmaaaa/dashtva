import React, { useState, useEffect } from 'react';
import { ChakraProvider, Box } from '@chakra-ui/react';
import {
  BrowserRouter as Router,
  Route,
  Routes,
  Navigate,
} from 'react-router-dom';

// Component imports
import HomeAdmin from './HomeAdmin/HomeAdmin';
import NewPageAdmin from './NewPageAdmin/NewPageAdmin';
import General from './General/General';
import RequestCountGraph from './RequestCountGraph/RequestCountGraph';
import DataTable from './DataTable/DataTable';
import NewPage from './NewPage/NewPage';
import LandingPage from './LandingPage/LandingPage';
import MainLayout from './layouts/MainLayout';
import LoginPage from './LoginPage';
import TimeBox from './time-box/timebox';
import TimeBoxAdmin from './time-box/timeboxadmin';

const App = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const authStatus = localStorage.getItem('isAuthenticated');
    setIsAuthenticated(authStatus === 'true');
  }, []);

  const handleLogin = () => {
    localStorage.setItem('isAuthenticated', 'true');
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('isAuthenticated');
    setIsAuthenticated(false);
  };

  return (
    <ChakraProvider>
      {/* 
        Force white text globally with color="white". 
        Use a dark/gradient background so white text is visible. 
      */}
      <Box
        width="100vw"
        minHeight="100vh"
        bg="linear-gradient(90deg, #000000, #7800ff)"
        color="white" 
      >
        <Router>
          {isAuthenticated ? (
            <AuthenticatedRoutes handleLogout={handleLogout} />
          ) : (
            <UnauthenticatedRoutes handleLogin={handleLogin} />
          )}
        </Router>
      </Box>
    </ChakraProvider>
  );
};

const AuthenticatedRoutes = ({ handleLogout }) => (
  <Routes>
    <Route path="/login" element={<Navigate to="/landing" replace />} />
    <Route path="/landing" element={<LandingPage handleLogout={handleLogout} />} />
    <Route path="/" element={<Navigate to="/landing" replace />} />

    {/* Admin Routes */}
    <Route path="/ADMIN-PopularObjects" element={<HomeAdmin />} />
    <Route path="/ADMIN-DIGITAL-CALENDAR" element={<NewPageAdmin />} />
    <Route path="/ADMIN-TimeBox" element={<TimeBoxAdmin />} />
    <Route path="/Digital-Calendar" element={<NewPage />} />

    {/* Time-Box Routes */}
    <Route path="/Time-Box" element={<TimeBox />} />

    {/* Main Application Route */}
    <Route
      path="/*"
      element={
        <MainLayout>
          {/* 
            No need to set color="white" again here— 
            it inherits from the parent. 
          */}
          <Box maxW="1600px" py={10} bg="transparent">
            <General />
            <RequestCountGraph />
            <DataTable />
          </Box>
        </MainLayout>
      }
    />

    {/* Catch-all Route */}
    <Route path="*" element={<Navigate to="/landing" replace />} />
  </Routes>
);

const UnauthenticatedRoutes = ({ handleLogin }) => (
  <Routes>
    <Route path="*" element={<Navigate to="/login" replace />} />
    <Route path="/login" element={<LoginPage onLogin={handleLogin} />} />
  </Routes>
);

export default App;
