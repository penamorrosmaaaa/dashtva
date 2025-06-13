import React, { useState, useEffect, useRef, forwardRef } from 'react';
import {
  Box, Flex, Text, Button, useBreakpointValue, Image,
} from '@chakra-ui/react';
import { Link as RouterLink } from 'react-router-dom';
import { FaLock } from 'react-icons/fa';
import {
  AiOutlineEye, AiOutlineCalendar, AiOutlineClockCircle,
} from 'react-icons/ai';
import nasaVideo from '../assets/150253-798222949.mp4';
import logoImage from '../assets/Diseño sin título (1).png';
import { GiLighthouse } from 'react-icons/gi';
import { FaCreditCard } from 'react-icons/fa'; // ✅ NEW: Import the icon for Tarjetas QA
import CSRDashboard from '../Csr/CsrDashboardUploader.js';


/**
 * Wrap react-router's RouterLink so Chakra doesn't complain about string refs.
 */
const ForwardedRouterLink = forwardRef((props, ref) => (
  <span ref={ref} style={{ display: 'contents' }}>
    <RouterLink {...props} />
  </span>
));
ForwardedRouterLink.displayName = 'ForwardedRouterLink';

/* ────────────────────────────────────────────────────────────────
   KEYFRAMES & GLOBAL CLASSES
   ──────────────────────────────────────────────────────────────── */
const animations = `
  /* 1. Card entrance */
  @keyframes floatFromCenter {
    0%   { transform: scale(.2); opacity: 0; }
    50%  { transform: scale(1.1); opacity: .8; }
    100% { transform: scale(1);   opacity: 1; }
  }
  @keyframes drawBoxLine {
    to { stroke-dashoffset: 0; }
  }

  /* 2. Color‑cycling stroke after the card outline draws. */
  @keyframes cycleStrokeColor {
    0%   { stroke: #FFFFFF; }
    25%  { stroke: #FF00FF; }
    50%  { stroke: #00FFFF; }
    75%  { stroke: #FFFF00; }
    100% { stroke: #FFFFFF; }
  }

  /* 3. Aurora glow on card hover */
  .auroraHover {
    position: relative;
    z-index: 1;
  }
  .auroraHover::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0; bottom: 0;
    z-index: -1;
    opacity: 0;
    background: linear-gradient(
      120deg,
      rgba(0,255,180,0.3),
      rgba(0,150,255,0.3),
      rgba(255,255,255,0.2)
    );
    background-size: 200% 200%;
    animation: auroraGlide 4s ease-in-out infinite;
    filter: blur(20px);
    transition: opacity 0.5s;
  }
  .auroraHover:hover::before {
    opacity: 1;
  }
  @keyframes auroraGlide {
    0%   { background-position: 0% 50%; }
    50%  { background-position: 100% 50%; }
    100% { background-position: 0% 50%; }
  }

  /* ──────────────────────────────────────────────────────────
     4. COSMIC INTRO: purple nebula + stars + comets, but
        NO white lines (starburst) or dot. Just the swirl & twinkles.
  ────────────────────────────────────────────────────────── */

  .cosmicOverlay {
    position: fixed;
    inset: 0;
    z-index: 9999;
    pointer-events: none;
    background: #000;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  /* Purple swirling nebula behind the stars. */
  .purpleNebula {
    position: absolute;
    width: 2000px;
    height: 2000px;
    border-radius: 50%;
    background: radial-gradient(
      circle at 30% 30%,
      rgba(158,0,255,0.25),
      rgba(140,0,255,0.15) 40%,
      rgba(100,0,200,0.07) 60%,
      rgba(80,0,160,0) 100%
    );
    pointer-events: none;
    animation: swirlNebula 120s infinite linear;
    opacity: 0.7;
    filter: blur(100px);
  }
  @keyframes swirlNebula {
    0% { transform: translate(-50%, -50%) rotate(0deg); }
    100% { transform: translate(-50%, -50%) rotate(360deg); }
  }

  /* Twinkling stars (small white dots) */
  .star {
    position: absolute;
    width: 2px;
    height: 2px;
    border-radius: 50%;
    background: white;
    box-shadow: 0 0 4px 1px rgba(255,255,255,.8);
    animation: starTwinkle 3s ease-in-out infinite alternate,
               starDrift 60s linear infinite;
  }
  @keyframes starTwinkle {
    0%, 100% { opacity: 0.8; }
    50%      { opacity: 0.2; }
  }
  @keyframes starDrift {
    0%   { transform: translate(0, 0); }
    100% { transform: translate(0, 300px); }
  }

  /* Comets shooting across */
  .comet {
    position: absolute;
    width: 3px;
    height: 3px;
    background: linear-gradient(to right, white, rgba(255,255,255,0));
    border-radius: 50%;
    box-shadow: 0 0 6px 2px rgba(255,255,255,.8);
  }
  @keyframes shootAcross {
    0% {
      transform: translateX(-10%) translateY(0);
      opacity: 1;
    }
    50% {
      opacity: 1;
    }
    100% {
      transform: translateX(120%) translateY(-50vh);
      opacity: 0;
    }
  }

  /* 5. Zoom in the video from ~1.2 → 1 at the start for that "expanding" effect. */
  @keyframes videoZoomIn {
    0%   { transform: scale(1.2); opacity: 0; }
    100% { transform: scale(1);   opacity: 1; }
  }

  /* 6. Fade out & scale out the cosmic overlay from ~2.5s–5s if you like. */
  @keyframes cosmicOverlayExit {
    0%   { transform: scale(1);   opacity: 1; }
    100% { transform: scale(10);  opacity: 0; }
  }
`;

const LandingCard = ({
  cardW, cardH, radius, icon: Icon, label,
  route, adminRoute, delay, floatCards, startDrawing,
}) => {
  const [showLock, setShowLock] = useState(false);
  const pathRef = useRef(null);

  useEffect(() => {
    if (pathRef.current) {
      const len = pathRef.current.getTotalLength();
      pathRef.current.style.strokeDasharray = String(len);
      pathRef.current.style.strokeDashoffset = String(len);
    }
  }, [cardW, cardH]);

  return (
    <Box
      as={ForwardedRouterLink}
      to={route}
      className="auroraHover"
      pos="relative"
      overflow="hidden"
      /* We remove glassy blur—just a transparent background. */
      bg="transparent"
      /* No backdropFilter or boxShadow. It's purely transparent. */
      style={{
        animation: floatCards ? 'floatFromCenter 1.8s ease forwards' : undefined,
        opacity: floatCards ? 1 : 0,
      }}
      cursor="pointer"
      borderRadius={`${radius}px`}
      w={`${cardW}px`}
      h={`${cardH}px`}
      onMouseEnter={() => setShowLock(true)}
      onMouseLeave={() => setShowLock(false)}
      _hover={{
        transform: 'rotateY(12deg) scale(1.07)',
        boxShadow: '0 0 20px rgba(255,255,255,0.4)', // can remove if you want no shadow
      }}
      transition="transform 0.4s ease, box-shadow 0.4s ease"
    >
      {showLock && (
        <Button
          as={ForwardedRouterLink}
          to={adminRoute}
          leftIcon={<FaLock />}
          pos="absolute"
          top="10px"
          right="10px"
          size="xs"
          variant="ghost"
          colorScheme="whiteAlpha"
          zIndex={99}
          _hover={{ color: 'yellow.400', transform: 'scale(1.15)' }}
          _active={{ bg: 'transparent' }}
          transition="all 0.3s ease"
        >
          Admin
        </Button>
      )}

      {/* Animated border w/ color cycling AFTER line draws */}
      <Box
        as="svg"
        pos="absolute"
        inset={0}
        pointerEvents="none"
        zIndex={2}
        viewBox={`0 0 ${cardW} ${cardH}`}
      >
        <rect
          ref={pathRef}
          x="1"
          y="1"
          width={cardW - 2}
          height={cardH - 2}
          rx={radius}
          ry={radius}
          fill="none"
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={
            startDrawing
              ? {
                  filter: 'drop-shadow(0 0 8px rgba(255,255,255,.8))',
                  animation: `
                    drawBoxLine 1.2s ease forwards ${delay},
                    cycleStrokeColor 5s ${parseFloat(delay) + 1.2}s infinite linear
                  `,
                }
              : {}
          }
        />
      </Box>

      {/* Card content */}
      <Flex
        pos="relative"
        zIndex={3}
        w="100%"
        h="100%"
        direction="column"
        align="center"
        justify="center"
      >
        <Icon size={useBreakpointValue({ base: '40px', md: '50px' })} />
        <Text
          mt={3}
          fontSize={['md', 'lg']}
          fontWeight="bold"
          /* Subtle neon flicker on hover */
          _hover={{
            textShadow: '0 0 8px #fff, 0 0 12px #fff',
            transition: 'text-shadow 0.3s ease',
          }}
        >
          {label}
        </Text>
      </Flex>
    </Box>
  );
};

const LandingPage = ({ handleLogout }) => {
  const [overlayVisible, setOverlayVisible] = useState(true);
  const [cardsVisible, setCardsVisible] = useState(false);
  const [floatCards, setFloatCards] = useState(false);
  const [startDrawing, setStartDrawing] = useState(false);

  /*
    Approx timeline:
      - 0s–1.5s: background video scales from 1.2 → 1 (videoZoomIn)
      - 0s–2.5s: cosmicOverlay is visible with purple nebula, stars, comets
      - 2.5s–4s: cosmicOverlayExit (scales up & fades out)
      - 4s: remove cosmic overlay, reveal the landing page
  */
  useEffect(() => {
    const t = setTimeout(() => {
      setOverlayVisible(false);
      setCardsVisible(true);
      // Cards start floating ~300ms later
      setTimeout(() => setFloatCards(true), 300);
      // Card outlines start drawing ~2.1s after that
      setTimeout(() => setStartDrawing(true), 2100);
    }, 4000);
    return () => clearTimeout(t);
  }, []);

  /* Responsive values */
  const cardW    = useBreakpointValue({ base: 260, md: 300 }) || 300;
  const cardH    = useBreakpointValue({ base: 150, md: 160 }) || 160;
  const radius   = 12;
  const logoSize = useBreakpointValue({ base: '120px', md: '180px' });
  const flexDir  = useBreakpointValue({ base: 'column', lg: 'row' });
  const gap      = useBreakpointValue({ base: 6, lg: 10 });

  const cards = [
    {
      id: 'popular',
      label: 'Popular Objects',
      icon: AiOutlineEye,
      route: '/PopularObjects',
      adminRoute: '/ADMIN-PopularObjects',
      delay: '0s',
    },
    {
      id: 'calendar',
      label: 'Digital Calendar',
      icon: AiOutlineCalendar,
      route: '/Digital-Calendar',
      adminRoute: '/ADMIN-DIGITAL-CALENDAR',
      delay: '.4s',
    },
    {
      id: 'timebox',
      label: 'Time‑Box',
      icon: AiOutlineClockCircle,
      route: '/Time-Box',
      adminRoute: '/ADMIN-TimeBox',
      delay: '.8s',
    },
    {
      id: 'lighthouse',
      label: 'Lighthouse',
      icon: GiLighthouse, // You can change to a better icon
      route: '/Lighthouse',
      adminRoute: '/ADMIN-Lighthouse',
      delay: '1.2s',
    },
    {
      id: 'csr', // ✅ UPDATED
      label: 'CSR Dashboard', // ✅ UPDATED
      icon: FaCreditCard, // ✅ Or change to another icon if preferred
      route: '/CSR-Dashboard', // ✅ NEW
      adminRoute: '/ADMIN-CSR-Dashboard', // ✅ Optional
      delay: '2.0s', // ✅ Adjusted delay
    },
    {
      id: 'tarjetasqa', // ✅ NEW
      label: 'Tarjetas QA', // ✅ NEW
      icon: FaCreditCard, // ✅ NEW: Use the imported FaCreditCard icon
      route: '/TarjetasQA', // ✅ NEW
      adminRoute: '/ADMIN-TarjetasQA', // ✅ NEW
      delay: '1.6s', // ✅ NEW: Adjust delay for new card
    },
  ];


  /* Random stars: ~420. */
  const starElements = Array.from({ length: 1020 }).map((_, i) => {
    const left = Math.random() * 100;
    const top = Math.random() * 100;
    const delay = Math.random() * 2; // random twinkle offset
    return (
      <Box
        key={`star-${i}`}
        className="star"
        style={{
          left: `${left}%`,
          top: `${top}%`,
          animationDelay: `${delay}s, ${delay}s`,
        }}
      />
    );
  });

  /* Comets: let's do 3. */
  const cometElements = Array.from({ length: 0 }).map((_, i) => {
    const top = Math.random() * 80; // 0–80% from top
    const delay = Math.random() * 2;
    return (
      <Box
        key={`comet-${i}`}
        className="comet"
        style={{
          top: `${top}%`,
          animation: `shootAcross 2.5s ${delay}s ease forwards`,
        }}
      />
    );
  });

  return (
    <Box pos="relative" w="100vw" minH="100vh" color="white" overflow="hidden">
      {/* Inject keyframe styles */}
      <style>{animations}</style>

      {/* BACKGROUND VIDEO:
          Start bigger scale(1.2), then over ~1.5s, scale to 1 & fade in. */}
      <video
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          transform: 'scale(1.2)',
          animation: `videoZoomIn 1.5s ease forwards`,
          zIndex: 0,
        }}
      >
        <source src={nasaVideo} type="video/mp4" />
      </video>

      {/* Purple nebula + stars + comets. (No starburst lines or white dot) */}
      {overlayVisible && (
        <Box
          className="cosmicOverlay"
          style={{
            animation: `cosmicOverlayExit 1.5s ease 2.5s forwards`,
          }}
        >
          <Box
            className="purpleNebula"
            style={{
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
            }}
          />

          {starElements}
          {cometElements}
        </Box>
      )}

      {/* Logout button */}
      <Button
        pos="fixed"
        top="20px"
        right="20px"
        zIndex={2}
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

      {/* Main content (logo + cards) */}
      <Flex
        direction="column"
        align="center"
        justify="center"
        gap={6}
        mt={8}
        pos="relative"
        zIndex={1}
        style={{
          opacity: cardsVisible ? 1 : 0,
          transition: 'opacity 0.7s ease',
        }}
      >
        <ForwardedRouterLink to="/landing">
          <Image
            src={logoImage}
            alt="Digital Benchmarks logo"
            w={logoSize}
            mb={2}
            _hover={{
              transform: 'scale(1.05) rotateY(5deg)',
              transition: 'transform 0.5s ease',
            }}
          />
        </ForwardedRouterLink>

        <Flex direction={flexDir} justify="center" align="center" wrap="wrap" gap={gap}>
          {cards.map((c) => (
            <LandingCard
              key={c.id}
              {...c}
              cardW={cardW}
              cardH={cardH}
              radius={radius}
              floatCards={floatCards}
              startDrawing={startDrawing}
            />
          ))}
        </Flex>
      </Flex>
    </Box>
  );
};

export default LandingPage;