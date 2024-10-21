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
    <Route path="/login" element={<Navigate to="/landing" replace />} />
    <Route
      path="/landing"
      element={
        <LandingPage
          handleLogout={handleLogout}
          authenticatedUser={authenticatedUser}
        />
      }
    />
    <Route path="/" element={<Navigate to="/landing" replace />} />

    {/* Admin Routes */}
    {authenticatedUser.isAdmin && (
      <>
        <Route path="/ADMIN-PopularObjects" element={<HomeAdmin />} />
        <Route path="/ADMIN-DIGITAL-CALENDAR" element={<NewPageAdmin />} />
      </>
    )}

    {/* User Routes */}
    {authenticatedUser.permissions.includes('Digital Calendar') && (
      <Route path="/Digital-Calendar" element={<NewPage />} />
    )}

    {/* Main Application Route */}
    <Route
      path="/*"
      element={
        <MainLayout>
          {/* Main Content */}
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
