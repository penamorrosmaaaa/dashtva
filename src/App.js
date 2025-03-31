import React, { useState, useEffect } from 'react';
import { ChakraProvider, Box } from '@chakra-ui/react';
import {
  BrowserRouter as Router,
  Route,
  Routes,
  Navigate,
  useLocation,
  useNavigate,
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
  return (
    <ChakraProvider>
      <Box width="100vw" minHeight="100vh" bg="linear-gradient(90deg, #000000, #7800ff)" color="white">
        <Router>
          <AppContent />
        </Router>
      </Box>
    </ChakraProvider>
  );
};

const AppContent = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(null); // null = loading
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const authStatus = localStorage.getItem('isAuthenticated');
    setIsAuthenticated(authStatus === 'true');
  }, []);

  useEffect(() => {
    if (isAuthenticated && location.pathname !== '/login') {
      localStorage.setItem('lastPath', location.pathname);
    }
  }, [location.pathname, isAuthenticated]);

  const handleLogin = () => {
    localStorage.setItem('isAuthenticated', 'true');
    setIsAuthenticated(true);

    const lastPath = localStorage.getItem('lastPath') || '/landing';
    navigate(lastPath, { replace: true });
  };

  const handleLogout = () => {
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('lastPath');
    setIsAuthenticated(false);
    navigate('/login', { replace: true });
  };

  // Wait for auth status to be known
  if (isAuthenticated === null) return null;

  return isAuthenticated ? (
    <AuthenticatedRoutes handleLogout={handleLogout} />
  ) : (
    <UnauthenticatedRoutes handleLogin={handleLogin} />
  );
};

const AuthenticatedRoutes = ({ handleLogout }) => (
  <Routes>
    <Route path="/landing" element={<LandingPage handleLogout={handleLogout} />} />
    <Route path="/ADMIN-PopularObjects" element={<HomeAdmin />} />
    <Route path="/ADMIN-DIGITAL-CALENDAR" element={<NewPageAdmin />} />
    <Route path="/ADMIN-TimeBox" element={<TimeBoxAdmin />} />
    <Route path="/Digital-Calendar" element={<NewPage />} />
    <Route path="/Time-Box" element={<TimeBox />} />

    <Route
      path="/"
      element={<Navigate to={localStorage.getItem('lastPath') || '/landing'} replace />}
    />
    <Route
      path="/*"
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
  </Routes>
);

const UnauthenticatedRoutes = ({ handleLogin }) => (
  <Routes>
    <Route path="/login" element={<LoginPage onLogin={handleLogin} />} />
    <Route path="*" element={<Navigate to="/login" replace />} />
  </Routes>
);

export default App;
