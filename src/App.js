// App.js

import React, { useState, useEffect } from 'react';
import { ChakraProvider, Box } from '@chakra-ui/react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';

// Import your components with correct paths
import HomeAdmin from './HomeAdmin/HomeAdmin';
import NewPageAdmin from './NewPageAdmin/NewPageAdmin';
import General from './General/General';
import RequestCountGraph from './RequestCountGraph/RequestCountGraph';
import DataTable from './DataTable/DataTable';
import NewPage from './NewPage/NewPage';
import LandingPage from './LandingPage/LandingPage';
import MainLayout from './layouts/MainLayout';
import LoginPage from './LoginPage';

const App = () => {
  const [authenticatedUser, setAuthenticatedUser] = useState(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('authenticatedUser');
    if (storedUser) {
      setAuthenticatedUser(JSON.parse(storedUser));
    }
  }, []);

  const handleLogin = (user) => {
    localStorage.setItem('authenticatedUser', JSON.stringify(user));
    setAuthenticatedUser(user);
  };

  const handleLogout = () => {
    localStorage.removeItem('authenticatedUser');
    setAuthenticatedUser(null);
  };

  return (
    <ChakraProvider>
      <Box
        width="100vw"
        minHeight="100vh"
        bg="linear-gradient(90deg, #000000, #7800ff)"
        color="white"
      >
        <Router>
          {authenticatedUser ? (
            <AuthenticatedRoutes
              handleLogout={handleLogout}
              authenticatedUser={authenticatedUser}
            />
          ) : (
            <UnauthenticatedRoutes handleLogin={handleLogin} />
          )}
        </Router>
      </Box>
    </ChakraProvider>
  );
};

const AuthenticatedRoutes = ({ handleLogout, authenticatedUser }) => (
  <Routes>
    {/* Redirect authenticated users from /login to /landing */}
    <Route path="/login" element={<Navigate to="/landing" replace />} />

    {/* Landing Page */}
    <Route
      path="/landing"
      element={
        <LandingPage
          handleLogout={handleLogout}
          authenticatedUser={authenticatedUser}
        />
      }
    />

    {/* Redirect root to /landing */}
    <Route path="/" element={<Navigate to="/landing" replace />} />

    {/* Admin Routes - Protected Based on adminPermissions */}
    <Route
      path="/ADMIN-PopularObjects"
      element={
        authenticatedUser.isAdmin &&
        Array.isArray(authenticatedUser.adminPermissions) &&
        authenticatedUser.adminPermissions.includes('/ADMIN-PopularObjects') ? (
          <HomeAdmin />
        ) : (
          <Navigate to="/landing" replace />
        )
      }
    />
    <Route
      path="/ADMIN-DIGITAL-CALENDAR"
      element={
        authenticatedUser.isAdmin &&
        Array.isArray(authenticatedUser.adminPermissions) &&
        authenticatedUser.adminPermissions.includes('/ADMIN-DIGITAL-CALENDAR') ? (
          <NewPageAdmin />
        ) : (
          <Navigate to="/landing" replace />
        )
      }
    />
    {/* Add other admin routes similarly */}
    
    {/* Main Application Routes */}
    <Route
      path="/PopularObjects"
      element={
        <MainLayout>
          <Box maxW="1600px" py={10} bg="transparent">
            <General />
            <RequestCountGraph />
            <DataTable />
          </Box>
        </MainLayout>
      }
    />
    <Route path="/Digital-Calendar" element={<NewPage />} />

    {/* Catch-all Route */}
    <Route path="*" element={<Navigate to="/landing" replace />} />
  </Routes>
);

const UnauthenticatedRoutes = ({ handleLogin }) => (
  <Routes>
    <Route path="/login" element={<LoginPage onLogin={handleLogin} />} />
    <Route path="*" element={<Navigate to="/login" replace />} />
  </Routes>
);

export default App;
