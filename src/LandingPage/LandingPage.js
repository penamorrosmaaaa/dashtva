import React, { useState, useEffect } from 'react';
import {
  Box,
  Flex,
  Text,
  Button,
  useBreakpointValue,
  Image,
} from '@chakra-ui/react';
import { Link as RouterLink } from 'react-router-dom';
import { FaLock } from 'react-icons/fa';
import {
  AiOutlineEye,
  AiOutlineCalendar,
  AiOutlineClockCircle,
} from 'react-icons/ai';
import nasaVideo from '../assets/150253-798222949.mp4';
import logoImage from '../assets/Diseño sin título (1).png';

/* ----------------------------------------------------------------
   1) KEYFRAMES
   - Curtains (2.5s)
   - FloatFromCenter (slower: 1.8s)
   - DrawBoxLine (with a path, corners connected)
   - Glow effect using drop-shadow
------------------------------------------------------------------ */
const animations = `
  /* CURTAINS over 2.5s */
  @keyframes curtainLeft {
    0%   { left: 0; }
    100% { left: -50vw; }
  }
  @keyframes curtainRight {
    0%   { right: 0; }
    100% { right: -50vw; }
  }

  /* Float from center, slower (1.8s), slight overshoot at 50% */
  @keyframes floatFromCenter {
    0% {
      transform: scale(0.2);
      opacity: 0;
    }
    50% {
      transform: scale(1.1);
      opacity: 0.8;
    }
    100% {
      transform: scale(1);
      opacity: 1;
    }
  }

  /* Path-based line drawing from stroke-dashoffset = perimeter -> 0 */
  @keyframes drawBoxLine {
    0%   { stroke-dashoffset: var(--dashOffset); }
    100% { stroke-dashoffset: 0; }
  }
`;

const LandingPage = ({ handleLogout }) => {
  // STATE
  const [curtainVisible, setCurtainVisible] = useState(true);
  const [cardsVisible, setCardsVisible] = useState(false);
  const [floatCards, setFloatCards] = useState(false);
  const [startDrawing, setStartDrawing] = useState(false);

  // For the admin lock hover
  const [showLock, setShowLock] = useState(null);

  /* --------------------------------------------------------------
     2) TIMINGS
       - 2.5s for curtains
       - Then reveal container + floatFromCenter (1.8s)
       - Then draw lines
  -------------------------------------------------------------- */
  useEffect(() => {
    const curtainTimer = setTimeout(() => {
      setCurtainVisible(false);
      setCardsVisible(true);

      // small delay, then float cards from center
      setTimeout(() => setFloatCards(true), 300);

      // once floatFromCenter mostly finishes (~1.8s), start line-drawing
      setTimeout(() => setStartDrawing(true), 300 + 1800);
    }, 2500);

    return () => clearTimeout(curtainTimer);
  }, []);

  // Admin lock hover
  const handleMouseEnter = (id) => setShowLock(id);
  const handleMouseLeave = () => setShowLock(null);

  /* --------------------------------------------------------------
     3) CARD DIMENSIONS & PATH for corners
  -------------------------------------------------------------- */
  const cardWidth = useBreakpointValue({ base: 260, md: 300 });
  const cardHeight = useBreakpointValue({ base: 150, md: 160 });
  // Perimeter for a rectangle
  const perimeter = 2 * (cardWidth + cardHeight);

  // A path that traces the rectangle corners, from (1,1) around to (width-1,height-1)
  const rectPath = `
    M 1,1
    H ${cardWidth - 1}
    V ${cardHeight - 1}
    H 1
    Z
  `;

  /* --------------------------------------------------------------
     4) Cards with a short stagger for line-drawing
  -------------------------------------------------------------- */
  const cardData = [
    {
      label: 'Popular Objects',
      icon: AiOutlineEye,
      route: '/PopularObjects',
      adminRoute: '/ADMIN-PopularObjects',
      id: 'popular',
      delay: '0s',
    },
    {
      label: 'Digital Calendar',
      icon: AiOutlineCalendar,
      route: '/Digital-Calendar',
      adminRoute: '/ADMIN-DIGITAL-CALENDAR',
      id: 'calendar',
      delay: '0.4s',
    },
    {
      label: 'Time-Box',
      icon: AiOutlineClockCircle,
      route: '/Time-Box',
      adminRoute: '/ADMIN-TimeBox',
      id: 'timebox',
      delay: '0.8s',
    },
  ];

  // Layout
  const flexDirection = useBreakpointValue({ base: 'column', lg: 'row' });
  const gap = useBreakpointValue({ base: 6, lg: 10 });
  const iconSize = useBreakpointValue({ base: '40px', md: '50px' });
  const logoSize = useBreakpointValue({ base: '120px', md: '180px' });

  return (
    <Box
      position="relative"
      width="100vw"
      minHeight="100vh"
      color="white"
      overflow="hidden"
    >
      {/* 1) Inject Keyframes */}
      <style>{animations}</style>

      {/* 2) NASA video behind everything */}
      <video
        autoPlay
        muted
        loop
        playsInline
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          opacity: 0.4,
          zIndex: 0,
        }}
      >
        <source src={nasaVideo} type="video/mp4" />
      </video>

      {/* 3) Curtains (2.5s) */}
      {curtainVisible && (
        <>
          <Box
            position="fixed"
            top="0"
            left="0"
            width="50vw"
            height="100vh"
            bg="black"
            zIndex="9999"
            animation="curtainLeft 2.5s ease forwards"
          />
          <Box
            position="fixed"
            top="0"
            right="0"
            width="50vw"
            height="100vh"
            bg="black"
            zIndex="9999"
            animation="curtainRight 2.5s ease forwards"
          />
        </>
      )}

      {/* Logout Button */}
      <Button
        position="fixed"
        top="20px"
        right="20px"
        zIndex="10"
        variant="outline"
        borderColor="whiteAlpha.600"
        color="white"
        size="sm"
        onClick={handleLogout}
        _hover={{ bg: 'whiteAlpha.200' }}
        _active={{ bg: 'whiteAlpha.300' }}
      >
        Logout
      </Button>

      {/* 4) Main Container => appear after curtains */}
      <Flex
        direction="column"
        align="center"
        justify="center"
        gap={6}
        mt={8}
        position="relative"
        zIndex={1}
        style={{
          opacity: cardsVisible ? 1 : 0,
          transition: 'opacity 0.7s ease',
        }}
      >
        {/* Logo */}
        <RouterLink to="/landing">
          <Image
            src={logoImage}
            alt="Digital Benchmarks Logo"
            width={logoSize}
            mb={2}
            _hover={{
              transform: 'scale(1.05) rotateY(5deg)',
              transition: 'transform 0.5s ease',
            }}
          />
        </RouterLink>

        {/* 5) Cards */}
        <Flex
          direction={flexDirection}
          justify="center"
          align="center"
          wrap="wrap"
          gap={gap}
        >
          {cardData.map(({ label, icon: Icon, route, adminRoute, id, delay }) => (
            <Box
              key={id}
              as={RouterLink}
              to={route}
              position="relative"
              overflow="hidden"
              bg="rgba(255, 255, 255, 0.05)"
              boxShadow="lg"
              cursor="pointer"
              borderRadius="xl"
              onMouseEnter={() => handleMouseEnter(id)}
              onMouseLeave={handleMouseLeave}
              // We fix card width/height so perimeter is correct
              width={`${cardWidth}px`}
              height={`${cardHeight}px`}
              // Float from center if floatCards is true
              style={
                floatCards
                  ? {
                      animation: 'floatFromCenter 1.8s ease forwards',
                    }
                  : { opacity: 0 }
              }
              /*
                COOL 3D HOVER:
                rotateY(12deg), scale(1.07), plus a highlight shadow
              */
              _hover={{
                transform: 'rotateY(12deg) scale(1.07)',
                boxShadow: '0 0 15px rgba(255,255,255,0.3)',
              }}
              transition="transform 0.4s ease"
            >
              {/* Admin Lock => gold on hover + transform; 
                  zIndex = 99 so it is on top of everything */}
              {showLock === id && (
                <Button
                  as={RouterLink}
                  to={adminRoute}
                  leftIcon={<FaLock />}
                  position="absolute"
                  top="10px"
                  right="10px"
                  size="xs"
                  colorScheme="whiteAlpha"
                  variant="ghost"
                  zIndex={99} /* <--- ensures it's on top */
                  _hover={{
                    color: 'yellow.400',
                    transform: 'scale(1.15)',
                  }}
                  _active={{ bg: 'transparent' }}
                  transition="all 0.3s ease"
                >
                  Admin
                </Button>
              )}

              {/* 7) SVG Path for corners => line drawing */}
              <Box
                as="svg"
                position="absolute"
                zIndex={2}
                top={0}
                left={0}
                width="100%"
                height="100%"
                viewBox={`0 0 ${cardWidth} ${cardHeight}`}
                pointerEvents="none"
                style={{
                  '--dashOffset': perimeter,
                }}
              >
                <path
                  d={rectPath}
                  fill="none"
                  stroke="white"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeDasharray={perimeter}
                  strokeDashoffset={perimeter}
                  /* Glow effect */
                  style={
                    startDrawing
                      ? {
                          filter: 'drop-shadow(0 0 8px rgba(255,255,255,0.8))',
                          animation: `drawBoxLine 1.2s ease forwards ${delay}`,
                        }
                      : {}
                  }
                />
              </Box>

              {/* Actual card content */}
              <Flex
                position="relative"
                zIndex={3}
                align="center"
                justify="center"
                direction="column"
                w="100%"
                h="100%"
              >
                <Icon size={iconSize} />
                <Text
                  mt={3}
                  fontSize={['md', 'lg']}
                  fontWeight="bold"
                  textAlign="center"
                >
                  {label}
                </Text>
              </Flex>
            </Box>
          ))}
        </Flex>
      </Flex>
    </Box>
  );
};

export default LandingPage;
