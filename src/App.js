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

// Global Header import
import Header from './Header';

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
import Lighthouse from './Lighthouse/Lighthouse';
import TarjetasQA from './TarjetasQA/TarjetasQA'; // ✅ NEW
import AdminQA from './TarjetasQA/AdminQA'; // ✅ NEW

const App = () => {
  return (
    <ChakraProvider>
      <Box
        width="100vw"
        minHeight="100vh"
        bg="linear-gradient(90deg, #000000, #7800ff)"
        color="white"
      >
        <Router>
          <AppContent />
        </Router>
      </Box>
    </ChakraProvider>
  );
};

const AppContent = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(null);
  const location = useLocation();
  const navigate = useNavigate();

  const hideHeader =
    location.pathname === '/login' ||
    location.pathname === '/landing' ||
    location.pathname === '/ADMIN-DIGITAL-CALENDAR';

  useEffect(() => {
    const authStatus = localStorage.getItem('isAuthenticated');
    setIsAuthenticated(authStatus === 'true');
  }, []);

  useEffect(() => {
    if (
      isAuthenticated &&
      location.pathname !== '/login' &&
      location.pathname !== '/landing'
    ) {
      localStorage.setItem('lastPath', location.pathname);
    }
  }, [location.pathname, isAuthenticated]);

  useEffect(() => {
    if (location.pathname === '/landing') {
      localStorage.removeItem('lastPath');
    }
  }, [location.pathname]);

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

  if (isAuthenticated === null) return null;

  return (
    <>
      {!hideHeader && <Header />}
      {isAuthenticated ? (
        <AuthenticatedRoutes handleLogout={handleLogout} />
      ) : (
        <UnauthenticatedRoutes handleLogin={handleLogin} />
      )}
    </>
  );
};

const AuthenticatedRoutes = ({ handleLogout }) => {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/landing" replace />} />

      {/* Admin routes */}
      <Route path="/ADMIN-PopularObjects" element={<HomeAdmin />} />
      <Route path="/ADMIN-DIGITAL-CALENDAR" element={<NewPageAdmin />} />
      <Route path="/ADMIN-TimeBox" element={<TimeBoxAdmin />} />
      <Route path="/ADMIN-TarjetasQA" element={<AdminQA />} />  // ✅ This now renders your form

      {/* Regular user routes */}
      <Route
        path="/Time-Box"
        element={
          <Box pt="200px">
            <TimeBox />
          </Box>
        }
      />
      <Route
        path="/Digital-Calendar"
        element={
          <Box pt="200px">
            <NewPage />
          </Box>
        }
      />
      <Route
        path="/Lighthouse"
        element={
          <Box pt="200px">
            <Lighthouse />
          </Box>
        }
      />
      <Route
        path="/TarjetasQA"
        element={
          <Box pt="200px">
            <TarjetasQA />
          </Box>
        }
      /> {/* ✅ NEW */}

      <Route path="/landing" element={<LandingPage handleLogout={handleLogout} />} />

      <Route
        path="*"
        element={
          <MainLayout>
            <Box pt="100px" maxW="1600px" py={20} bg="transparent">
              <General />
              <RequestCountGraph />
              <DataTable />
            </Box>
          </MainLayout>
        }
      />
    </Routes>
  );
};

const UnauthenticatedRoutes = ({ handleLogin }) => (
  <Routes>
    <Route path="/login" element={<LoginPage onLogin={handleLogin} />} />
    <Route path="*" element={<Navigate to="/login" replace />} />
  </Routes>
);

export default App;