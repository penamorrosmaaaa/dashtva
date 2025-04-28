import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Input,
  FormControl,
  FormLabel,
  VStack,
  Image,
} from '@chakra-ui/react';
import nasaImage from './assets/sandro-katalina-k1bO_VTiZSs-unsplash.jpg';
import logoImage from './assets/Diseño sin título (1).png';
import Papa from 'papaparse';

const LoginPage = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [credentials, setCredentials] = useState([]);

  useEffect(() => {
    Papa.parse(
      'https://docs.google.com/spreadsheets/d/e/2PACX-1vQj8n4z0RMdgG8HPRjpXN38WVg-BsISD28dDS9D9nbScWsp0sPAyzFTo-I9usPafbDJ9kXANakp2rQ6/pub?output=csv',
      {
        download: true,
        header: false,
        complete: (result) => {
          const rows = result.data;
          const creds = rows.map(([user, pass]) => ({
            username: user,
            password: pass,
          }));
          setCredentials(creds);
        },
      }
    );
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    const matchedUser = credentials.find(
      (cred) => cred.username === username && cred.password === password
    );
    if (matchedUser) {
      localStorage.setItem('userName', matchedUser.username); // ✅ Store username
      onLogin();
    } else {
      setError('Invalid credentials. Please try again.');
    }
  };

  return (
    <Box width="100vw" height="100vh" position="relative" overflow="hidden">
      <Box
        width="100vw"
        height="100vh"
        bg="linear-gradient(90deg, #000000, #7800ff)"
        position="absolute"
        top="0"
        left="0"
        opacity="0.9"
        zIndex="0"
      />
      <Image
        src={nasaImage}
        alt="NASA background"
        position="absolute"
        top="0"
        left="0"
        width="100%"
        height="100%"
        objectFit="cover"
        opacity="0.6"
        zIndex="1"
      />
      <Box
        display="flex"
        alignItems="center"
        justifyContent="center"
        height="100%"
        position="relative"
        zIndex="2"
        color="white"
        flexDirection="column"
      >
        <Image src={logoImage} alt="Logo" width="200px" mb={8} />
        <VStack spacing={4} align="stretch" width="300px">
          <form onSubmit={handleSubmit}>
            <FormControl id="username" isRequired>
              <FormLabel fontWeight="bold">Username</FormLabel>
              <Input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                bg="transparent"
                color="white"
                borderColor="whiteAlpha.700"
                _placeholder={{ color: 'whiteAlpha.700' }}
                _focus={{ borderColor: 'white' }}
                _hover={{ bg: 'transparent' }}
              />
            </FormControl>

            <FormControl id="password" mt={4} isRequired>
              <FormLabel fontWeight="bold">Password</FormLabel>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                bg="transparent"
                color="white"
                borderColor="whiteAlpha.700"
                _placeholder={{ color: 'whiteAlpha.700' }}
                _focus={{ borderColor: 'white' }}
                _hover={{ bg: 'transparent' }}
              />
            </FormControl>

            {error && (
              <Box color="red.500" mt={2} textAlign="center">
                {error}
              </Box>
            )}

            <Button
              type="submit"
              colorScheme="teal"
              width="full"
              mt={6}
              bg="transparent"
              _hover={{ bg: 'rgba(0, 0, 0, 0.2)' }}
              border="2px solid white"
            >
              Login
            </Button>
          </form>
        </VStack>
      </Box>
    </Box>
  );
};

export default LoginPage;
