import React, { useState, useEffect, useRef } from "react";
import {
  Box, Textarea, Button, VStack, Text, Select, useToast, HStack,
  IconButton, Drawer, DrawerOverlay, DrawerContent, DrawerHeader,
  DrawerBody, useDisclosure, Flex, Badge, Tooltip, Collapse,
  useColorModeValue, Divider, Progress, Fade, ScaleFade, Image,
  Kbd, SimpleGrid, Stat, StatLabel, StatNumber, StatHelpText,
  StatArrow, Circle, Square, useClipboard, Menu, MenuButton,
  MenuList, MenuItem, Portal, Wrap, WrapItem
} from "@chakra-ui/react";
import { 
  FiZap, FiX, FiMaximize2, FiMinimize2, FiSend, FiFilter, 
  FiTrash2, FiChevronDown, FiChevronUp, FiActivity, FiCopy,
  FiDownload, FiShare2, FiRefreshCw, FiClock, FiTrendingUp,
  FiBarChart2, FiPieChart, FiTarget, FiLayers, FiCommand,
  FiMic, FiHeadphones, FiVolume2, FiEye, FiMessageSquare,
  FiAward, FiShield, FiCpu, FiGlobe, FiDatabase, FiZapOff
} from "react-icons/fi";
import { motion, AnimatePresence, useMotionValue, useTransform } from "framer-motion";
import "./AiChatWhoop.css";
import { Checkbox, CheckboxGroup, Stack } from "@chakra-ui/react";
import Plot from "react-plotly.js";
import ReactMarkdown from 'react-markdown';
import { startOfISOWeek, addDays, format } from "date-fns";

const MotionBox = motion(Box);
const MotionFlex = motion(Flex);

/* ------------------------------------------------------------------ */
/*  LISTAS DE OUTLETS & MÉTRICAS                                       */
/* ------------------------------------------------------------------ */
const COMPETITION_COMPANIES = [
  "Heraldo","Televisa","Milenio","Universal","As",
  "Infobae","NyTimes","Terra",
];
const AZTECA_MAIN_COMPANIES = [
  "Azteca 7","Azteca UNO","ADN40","Deportes","A+","Noticias",
];
const LOCAL_COMPANIES = [
  "Quintana Roo","Bajío","Ciudad Juárez","Yúcatan","Jalisco","Puebla",
  "Veracruz","Baja California","Morelos","Guerrero","Chiapas","Sinaloa",
  "Aguascalientes","Queretaro","Chihuahua","Laguna",
];
const IMAGE_COMPANIES = ["IMG.AZTECA7","IMG.AZTECAUNO","IMG.AZTECANOTICIAS"];
const MEDIA_OUTLETS = [
  ...COMPETITION_COMPANIES,
  ...AZTECA_MAIN_COMPANIES,
  ...LOCAL_COMPANIES,
  ...IMAGE_COMPANIES,
];
const METRICS = ["Score","CLS","LCP","SI","TBT","FCP"];

// Quick action suggestions
const QUICK_ACTIONS = [
  { icon: FiTrendingUp, text: "Show top performers", color: "#00ff88" },
  { icon: FiBarChart2, text: "Compare all outlets", color: "#00f0ff" },
  { icon: FiTarget, text: "Find weak metrics", color: "#ff006e" },
  { icon: FiLayers, text: "Analyze by category", color: "#ffbe0b" },
];

// Metric info
const METRIC_INFO = {
  Score: { label: "Performance Score", unit: "/100", icon: FiAward, color: "#00f0ff" },
  CLS: { label: "Layout Shift", unit: "", icon: FiLayers, color: "#ff006e" },
  LCP: { label: "Largest Contentful Paint", unit: "s", icon: FiClock, color: "#ffbe0b" },
  SI: { label: "Speed Index", unit: "ms", icon: FiActivity, color: "#00ff88" },
  TBT: { label: "Total Blocking Time", unit: "ms", icon: FiShield, color: "#8338ec" },
  FCP: { label: "First Contentful Paint", unit: "s", icon: FiEye, color: "#3a86ff" },
};

/* ------------------------------------------------------------------ */
/*  FUNCIÓN QUE CREA EL CONTEXTO PARA OPENAI                           */
/* ------------------------------------------------------------------ */
const buildSystemContext = () => {
    return {
      role: "system",
      content: `
You are an expert web performance analyst helping a media company evaluate Lighthouse performance across news websites. Keep responses conversational and concise like a performance coach.

Here is the full context of the system you're working with:

📅 DATA ORGANIZATION
- Data is organized by weeks and months only (no individual day comparisons)
- Weekly data represents the average of all days in that week
- Monthly data represents the average of all days in that month

📊 METRICS (captured via Lighthouse and stored in Google Sheets)
Each URL is tested using Lighthouse in headless Chrome, and the following metrics are captured:
- Score: overall Lighthouse performance score (0–100)
- CLS: Cumulative Layout Shift
- LCP: Largest Contentful Paint
- SI: Speed Index
- TBT: Total Blocking Time
- FCP: First Contentful Paint

🏢 COMPANIES — Organized in 3 groups
1. 🟣 TV Azteca Main Brands: Azteca 7","Azteca UNO","ADN40","Deportes","A+","Noticias"
2. 🟡 TV Azteca Local Brands: Quintana Roo","Bajío","Ciudad Juárez","Yúcatan","Jalisco","Puebla",
  "Veracruz","Baja California","Morelos","Guerrero","Chiapas","Sinaloa",
  "Aguascalientes","Queretaro","Chihuahua","Laguna",
3. 🔴 Competition Companies: "Heraldo","Televisa","Milenio","Universal","As",
  "Infobae","NyTimes","Terra",
4. 🖼️ Image Brands: IMG.AZTECA7","IMG.AZTECAUNO","IMG.AZTECANOTICIAS"

📈 DATA VISUALIZATION REQUIREMENTS
- ALWAYS include a visualization when showing comparisons
- Choose the BEST chart type for the data being shown:
  - Bar charts for comparing metrics across companies
  - Line charts for trends over weeks/months
  - Radar charts for multi-metric comparisons
  - Pie charts only for market share/distribution
- Ensure all visualizations are clear and properly labeled
- Include all relevant data points in the visualization

🧠 YOUR ROLE
As the AI assistant:
- Be conversational and friendly, like a performance coach
- Keep responses concise and actionable
- Always include visualizations for comparisons
- Make sure visualizations match the data being discussed
- Provide insights like "which outlet had the best score", "which company improved the most in LCP", etc.
- After answering a question, suggest 2-3 relevant follow-up questions

Be clear, accurate, and analytical. If data is missing or null, acknowledge it.
      `.trim()
    };
  };

/* ------------------------------------------------------------------ */
/*  ANIMATED BACKGROUND COMPONENT                                      */
/* ------------------------------------------------------------------ */
const AnimatedBackground = () => (
  <Box
    position="absolute"
    top={0}
    left={0}
    right={0}
    bottom={0}
    overflow="hidden"
    opacity={0.03}
    pointerEvents="none"
  >
    <svg width="100%" height="100%">
      <defs>
        <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(0,240,255,0.5)" strokeWidth="1"/>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#grid)" />
      {[...Array(5)].map((_, i) => (
        <motion.circle
          key={i}
          r="2"
          fill="#00f0ff"
          initial={{ x: Math.random() * 100 + "%", y: Math.random() * 100 + "%" }}
          animate={{
            x: [Math.random() * 100 + "%", Math.random() * 100 + "%"],
            y: [Math.random() * 100 + "%", Math.random() * 100 + "%"],
          }}
          transition={{
            duration: 20 + i * 5,
            repeat: Infinity,
            repeatType: "reverse",
            ease: "linear"
          }}
        />
      ))}
    </svg>
  </Box>
);

/* ------------------------------------------------------------------ */
/*  TYPING INDICATOR COMPONENT                                         */
/* ------------------------------------------------------------------ */
const TypingIndicator = () => (
  <HStack spacing={1}>
    {[0, 0.2, 0.4].map((delay, i) => (
      <MotionBox
        key={i}
        w="8px"
        h="8px"
        borderRadius="full"
        bg="linear-gradient(135deg, #00f0ff 0%, #00ff88 100%)"
        initial={{ scale: 0.8, opacity: 0.3 }}
        animate={{ scale: [0.8, 1.2, 0.8], opacity: [0.3, 1, 0.3] }}
        transition={{
          duration: 1.4,
          repeat: Infinity,
          delay,
          ease: "easeInOut"
        }}
      />
    ))}
  </HStack>
);

/* ------------------------------------------------------------------ */
/*  COMPONENTE PRINCIPAL                                              */
/* ------------------------------------------------------------------ */
const AiChat = ({ visibleData, inline = false }) => {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const messagesEndRef = useRef(null);
  const toast = useToast();
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const rotateX = useTransform(mouseY, [-100, 100], [10, -10]);
  const rotateY = useTransform(mouseX, [-100, 100], [-10, 10]);

  /* ---------- estado local ---------- */
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [conversationHistory, setConversationHistory] = useState(() => {
    const saved = localStorage.getItem('aiChatConversation');
    return saved ? JSON.parse(saved) : [];
  });
  const [followUpQuestions, setFollowUpQuestions] = useState([]);
  const [showControls, setShowControls] = useState(false);
  const [dateGrouping, setDateGrouping] = useState("weekly");
  const [availableWeeks, setAvailableWeeks] = useState([]);
  const [availableMonths, setAvailableMonths] = useState([]);
  const [selectedWeeks, setSelectedWeeks] = useState([]);
  const [selectedMonths, setSelectedMonths] = useState([]);
  const [selectedType, setSelectedType] = useState("");
  const [allTypes, setAllTypes] = useState([]);
  const [analysis, setAnalysis] = useState(null);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(true);
  const [isListening, setIsListening] = useState(false);
  const [hoveredMetric, setHoveredMetric] = useState(null);

  useEffect(() => {
    localStorage.setItem('aiChatConversation', JSON.stringify(conversationHistory));
  }, [conversationHistory]);

  useEffect(() => {
    scrollToBottom();
  }, [conversationHistory]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  /* ---------- helpers ---------- */
  const safeParse = v => { const n = parseFloat(String(v).replace(",",".")); return isNaN(n) ? null : n; };
  
  const getWeekNumber = (date) => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7);
    const week1 = new Date(d.getFullYear(), 0, 4);
    return 1 + Math.round(((d - week1) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
  };

  const getMonth = (date) => {
    const d = new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  };

  /* ---------- construir caché analizable ---------- */
  useEffect(() => {
    if (!visibleData?.length) return;
    const agg = {};
    const weeksSet = new Set();
    const monthsSet = new Set();
    const typesSet = new Set();

    visibleData.forEach(r => {
      MEDIA_OUTLETS.forEach((outlet, i) => {
        const suf = i === 0 ? "" : `_${i}`;
        const date = r[`Date${suf}`];
        const type = r[`Type${suf}`];
        if (!date || !type) return;

        typesSet.add(type);

        const weekNum = getWeekNumber(date);
        const year = new Date(date).getFullYear();
        const weekKey = `${year}-W${String(weekNum).padStart(2, '0')}`;
        weeksSet.add(weekKey);
        
        const monthKey = getMonth(date);
        monthsSet.add(monthKey);
      });
    });

    setAllTypes(Array.from(typesSet));
    setAvailableWeeks(Array.from(weeksSet).sort());
    setAvailableMonths(Array.from(monthsSet).sort());
  }, [visibleData]);

  /* ---------- prompt builders ---------- */
  const buildPrompt = (data, timeLabel) => {
    const lines = Object.entries(data).map(([outlet, metrics]) => {
      const metricLine = METRICS.map(metric =>
        metrics[metric] !== null ? `${metric}: ${metrics[metric]}` : null
      ).filter(Boolean).join(", ");
  
      return metricLine ? `${outlet} — ${metricLine}` : null;
    }).filter(Boolean).join("\n");
  
    return `
  ### CONVERSATION HISTORY
  ${conversationHistory.map(msg => `${msg.role === 'user' ? 'USER' : 'AI'}: ${msg.content}`).join('\n')}
  
  ### CONTEXT
  Metrics averages for content type "${selectedType}" during: ${timeLabel}.
  
  Each value represents the average across the selected time period for each outlet.
  
  ${lines}
  
  ### QUESTION
  ${input}
  
 ### RESPONSE INSTRUCTIONS
- Answer the user's question directly using the provided metrics.
- Be concise. Do not write a long analysis unless clearly asked for.
- If the question involves comparison, improvement, or trend detection, and there is enough data, include a chart using the format below.
- Only include a chart if it adds value to the answer.
- After that, include 2–3 suggested follow-up questions
- Always be specific if what you are providing is the average sum of the weeks/months or simply an individual week and be sure to acknowledge if the scores you ar eproviding are from nota, video, img.
- Do not include a chart if data is missing or all values are nearly zero.
- Use these types:
  - "bar" → compare brands
  - "line" → trends over time
  - "radar" → multi-metric summary per brand
  - "pie" → distribution or share
- Do not include markdown, links, or explanations around the JSON block.

  
  ### JSON FORMAT EXAMPLE
  \`\`\`json
  {
    "chart": {
      "type": "bar",
      "labels": ["Azteca UNO", "Terra", "Heraldo", "Milenio"],
      "values": [31.96, 73.36, 45.73, 34.87],
      "title": "Video Performance Comparison"
    }
  }
  \`\`\`
  
  ### FOLLOW-UP
  After the analysis, include exactly 2-3 follow-up questions using:
  <!-- FOLLOW_UP -->
  - Question 1?
  - Question 2?
  - Question 3?
  `.trim();
  };

  /* ---------- OpenAI ---------- */
  const askOpenAI = async prompt => {
    try {
      setLoading(true);
      setFollowUpQuestions([]);
      setShowQuickActions(false);

      const payload = {
        model: "gpt-4o-mini",
        temperature: 0.3,
        messages: [
          buildSystemContext(),
          ...conversationHistory,
          { role: "user", content: prompt },
        ],
      };
      
      
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.REACT_APP_OPENAI_API_KEY}`,
        },
        body: JSON.stringify(payload),
      });
      

      const data = await res.json();
      let content = data.choices?.[0]?.message?.content || "No response.";
      let chartData = null;

      let match = content.match(/```json\s*([\s\S]*?)\s*```/);
      if (!match) match = content.match(/\{[\s\S]*"chart"[\s\S]*\}/);

      if (match) {
        try {
          const rawJson = match[1] || match[0];
          const parsed = JSON.parse(rawJson);
          if (parsed.chart && parsed.chart.labels?.length && parsed.chart.values?.length) {
            chartData = parsed.chart;
          }
          
        } catch (err) {
          console.warn("Chart JSON not valid:", err);
        }
      }

      const followUpMatch = content.match(/<!-- FOLLOW_UP -->([\s\S]*)/);
      if (followUpMatch) {
        const followUpBlock = followUpMatch[1];
        const questions = followUpBlock
          .split('\n')
          .map(line => line.trim().replace(/^- /, ''))
          .filter(line => line && line.endsWith('?'));
        
        setFollowUpQuestions(questions);
        content = content.replace(followUpMatch[0], '').trim();
      }

      setConversationHistory(prev => [
        ...prev,
        { role: "user", content: input },
        { role: "assistant", content, chartData }
      ]);

    } catch (e) {
      console.error(e);
      setConversationHistory(prev => [
        ...prev,
        { role: "user", content: input },
        { role: "assistant", content: "Error generating response." }
      ]);
    } finally {
      setLoading(false);
      setInput("");
    }
  };

  /* ---------- handlers ---------- */
  const handleSend = () => {
    if (!input.trim()) {
      toast({ 
        title:"Please enter a question", 
        status:"warning", 
        duration:3500, 
        isClosable:true,
        position: "top",
        render: () => (
          <Box
            bg="rgba(255,193,7,0.1)"
            border="1px solid rgba(255,193,7,0.5)"
            borderRadius="lg"
            p={3}
            backdropFilter="blur(10px)"
          >
            <HStack>
              <FiZapOff color="#FFC107" />
              <Text color="white" fontSize="sm">Please enter a question</Text>
            </HStack>
          </Box>
        )
      });
      return;
    }
    
    if (!selectedType) {
      toast({ 
        title:"Please select a content type", 
        status:"warning", 
        duration:3500, 
        isClosable:true,
        position: "top",
        render: () => (
          <Box
            bg="rgba(255,193,7,0.1)"
            border="1px solid rgba(255,193,7,0.5)"
            borderRadius="lg"
            p={3}
            backdropFilter="blur(10px)"
          >
            <HStack>
              <FiFilter color="#FFC107" />
              <Text color="white" fontSize="sm">Please select a content type</Text>
            </HStack>
          </Box>
        )
      });
      return;
    }

    if (dateGrouping === "weekly" && selectedWeeks.length === 0) {
      toast({ 
        title:"Please select at least one week", 
        status:"warning", 
        duration:3500, 
        isClosable:true,
        position: "top",
        render: () => (
          <Box
            bg="rgba(255,193,7,0.1)"
            border="1px solid rgba(255,193,7,0.5)"
            borderRadius="lg"
            p={3}
            backdropFilter="blur(10px)"
          >
            <HStack>
              <FiClock color="#FFC107" />
              <Text color="white" fontSize="sm">Please select at least one week</Text>
            </HStack>
          </Box>
        )
      });
      return;
    }

    if (dateGrouping === "monthly" && selectedMonths.length === 0) {
      toast({ 
        title:"Please select at least one month", 
        status:"warning", 
        duration:3500, 
        isClosable:true,
        position: "top",
        render: () => (
          <Box
            bg="rgba(255,193,7,0.1)"
            border="1px solid rgba(255,193,7,0.5)"
            borderRadius="lg"
            p={3}
            backdropFilter="blur(10px)"
          >
            <HStack>
              <FiClock color="#FFC107" />
              <Text color="white" fontSize="sm">Please select at least one month</Text>
            </HStack>
          </Box>
        )
      });
      return;
    }

    if (dateGrouping === "weekly") {
      handleWeekly();
    } else if (dateGrouping === "monthly") {
      handleMonthly();
    }
  };

  const handleWeekly = () => {
    const dataByOutlet = {};
    const weekLabels = [];
  
    selectedWeeks.forEach((weekKey) => {
      const [year, weekNum] = weekKey.split("-W");
      const weekLabel = `Week ${weekNum}`;
      weekLabels.push(weekLabel);
  
      const weekDates = visibleData
        .map(r => r.Date)
        .filter(date => {
          const d = new Date(date);
          return d.getFullYear() === parseInt(year) && getWeekNumber(date) === parseInt(weekNum);
        });
  
      MEDIA_OUTLETS.forEach((outlet, outletIndex) => {
        const suffix = outletIndex === 0 ? "" : `_${outletIndex}`;
        let sum = 0, count = 0;
  
        visibleData.forEach(r => {
          if (!weekDates.includes(r.Date)) return;
          const type = r[`Type${suffix}`];
          if (type !== selectedType) return;
  
          const score = safeParse(r[`Score${suffix}`]);
          if (score !== null) {
            sum += score;
            count += 1;
          }
        });
  
        if (!dataByOutlet[outlet]) {
          dataByOutlet[outlet] = {};
          METRICS.forEach(metric => {
            dataByOutlet[outlet][metric] = [];
          });
        }
        METRICS.forEach(metric => {
          let sum = 0, count = 0;
          visibleData.forEach(r => {
            if (!weekDates.includes(r.Date)) return;
            const type = r[`Type${suffix}`];
            if (type !== selectedType) return;
        
            const value = safeParse(r[`${metric}${suffix}`]);
            if (value !== null) {
              sum += value;
              count += 1;
            }
          });
          dataByOutlet[outlet][metric].push(count > 0 ? +(sum / count).toFixed(2) : null);
        });
        
      });
    });
  
    // Clean up: remove outlets with nulls
    const cleaned = Object.fromEntries(
      Object.entries(dataByOutlet).filter(([_, val]) => val.Score.every(s => s !== null))
    );
    console.log("🧠 Prompt data being sent to AI:", cleaned);
console.log("🗓 Weeks:", weekLabels.join(", "));
console.log("📄 Prompt preview:\n", buildPrompt(cleaned, weekLabels.join(", ")));

  
    askOpenAI(buildPrompt(cleaned, weekLabels.join(", ")));
  };
  
  
  

  const handleMonthly = () => {
    const combined = {};
    const monthLabels = [];
    
    selectedMonths.forEach(monthKey => {
      const [year, month] = monthKey.split('-');
      const monthLabel = new Date(`${year}-${month}-01`).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      monthLabels.push(monthLabel);
      
      const monthDates = visibleData
        .map(r => r.Date)
        .filter(date => getMonth(date) === monthKey);
      
      monthDates.forEach(date => {
        visibleData.forEach(r => {
          if (r.Date === date) {
            MEDIA_OUTLETS.forEach((outlet, i) => {
              const suf = i === 0 ? "" : `_${i}`;
              const type = r[`Type${suf}`];
              if (type !== selectedType) return;
              
              if (!combined[outlet]) combined[outlet] = {};
              METRICS.forEach(metric => {
                const val = safeParse(r[`${metric}${suf}`]);
                if (val !== null) {
                  if (!combined[outlet][metric]) {
                    combined[outlet][metric] = { sum: 0, count: 0 };
                  }
                  combined[outlet][metric].sum += val;
                  combined[outlet][metric].count += 1;
                }
              });
            });
          }
        });
      });
    });
    
    Object.keys(combined).forEach(outlet => {
      METRICS.forEach(metric => {
        const { sum, count } = combined[outlet][metric] || {};
        combined[outlet][metric] = count ? +(sum / count).toFixed(2) : null;
      });
    });
    
    askOpenAI(buildPrompt(combined, monthLabels.join(", ")));
  };

  const handleFollowUpClick = (question) => {
    setInput(question);
    setTimeout(() => {
      handleSend();
    }, 100);
  };

  const handleQuickAction = (action) => {
    setInput(action);
    setTimeout(() => {
      handleSend();
    }, 100);
  };

  const clearConversation = () => {
    setConversationHistory([]);
    localStorage.removeItem('aiChatConversation');
    setFollowUpQuestions([]);
    setShowQuickActions(true);
  };

const formatWeekLabel = (weekKey) => {
  const [year, weekNum] = weekKey.split('-W').map(v => parseInt(v));
  const firstDayOfYear = new Date(year, 0, 1);
  const firstWeekDate = startOfISOWeek(firstDayOfYear);
  const weekStart = addDays(firstWeekDate, (weekNum - 1) * 7);
  const weekEnd = addDays(weekStart, 6);
  return `${format(weekStart, 'MMM d')}–${format(weekEnd, 'd, yyyy')}`;
};


  const formatMonthLabel = (monthKey) => {
    const [year, month] = monthKey.split('-');
    return new Date(`${year}-${month}-01`).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const handleCopyMessage = (content) => {
    navigator.clipboard.writeText(content);
    toast({
      title: "Copied to clipboard",
      status: "success",
      duration: 2000,
      position: "top",
      render: () => (
        <Box
          bg="rgba(0,255,136,0.1)"
          border="1px solid rgba(0,255,136,0.5)"
          borderRadius="lg"
          p={3}
          backdropFilter="blur(10px)"
        >
          <HStack>
            <FiCopy color="#00ff88" />
            <Text color="white" fontSize="sm">Copied to clipboard</Text>
          </HStack>
        </Box>
      )
    });
  };

  /* ------------------------------------------------------------------ */
  /*  UI (Botón + Drawer)                                               */
  /* ------------------------------------------------------------------ */
  const iconButton = (
    <Tooltip 
      label={
        <VStack spacing={1} align="start" p={1}>
          <Text fontSize="sm" fontWeight="600">AI Performance Analyzer</Text>
          <Text fontSize="xs" color="gray.300">Click to open • Powered by GPT-4</Text>
          <HStack spacing={2} mt={1}>
          </HStack>
        </VStack>
      } 
      placement="left"
      bg="rgba(0,0,0,0.9)"
      border="1px solid rgba(0,240,255,0.3)"
      borderRadius="lg"
      p={2}
      hasArrow
      arrowShadowColor="rgba(0,240,255,0.3)"
    >
      <MotionBox
        whileHover={{ scale: 1.1, rotate: 5 }}
        whileTap={{ scale: 0.95, rotate: -5 }}
        transition={{ type: "spring", stiffness: 400 }}
        position="relative"
        onMouseMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          mouseX.set(e.clientX - rect.left - rect.width / 2);
          mouseY.set(e.clientY - rect.top - rect.height / 2);
        }}
        style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
      >
        <IconButton
          aria-label="Open chat"
          icon={
            <Box position="relative">
              <Box
                position="absolute"
                inset="-8px"
                bg="radial-gradient(circle, rgba(0,240,255,0.4) 0%, transparent 70%)"
                filter="blur(15px)"
                opacity={0.6}
                className="glow-effect"
              />
              <FiZap size="28" style={{ position: 'relative', zIndex: 1 }} />
              <Box
                position="absolute"
                top="-4px"
                right="-4px"
                w="12px"
                h="12px"
                bg="linear-gradient(135deg, #00ff88 0%, #00f0ff 100%)"
                borderRadius="full"
                className="pulse-dot-enhanced"
                boxShadow="0 0 10px rgba(0,255,136,0.8)"
              />
            </Box>
          }
          onClick={onOpen}
          variant="ghost"
          bg="linear-gradient(135deg, rgba(0,240,255,0.15) 0%, rgba(0,255,136,0.15) 100%)"
          color="#00f0ff"
          className={inline ? "ai-nav-icon cyber-nav-btn" : "ai-fab-enhanced"}
          _hover={{ 
            bg:"linear-gradient(135deg, rgba(0,240,255,0.25) 0%, rgba(0,255,136,0.25) 100%)",
            transform: "translateY(-4px)",
            boxShadow: "0 15px 35px rgba(0,240,255,0.5), 0 5px 15px rgba(0,0,0,0.3)"
          }}
          _active={{ bg:"rgba(0,240,255,0.35)" }}
          _focus={{ boxShadow:"none" }}
          size="lg"
          borderRadius="20px"
          border="1px solid transparent"
          borderImage="linear-gradient(135deg, rgba(0,240,255,0.5) 0%, rgba(0,255,136,0.5) 100%) 1"
          backdropFilter="blur(10px)"
          p={6}
        />
      </MotionBox>
    </Tooltip>
  );

  return (
    <>
      {iconButton}

      <Drawer
        isOpen={isOpen}
        placement="right"
        onClose={onClose}
        size={isFullScreen ? "full" : { base: "full", md: "xl" }}
        blockScrollOnMount={false}
        preserveScrollBarGap={true}
      >
        <DrawerOverlay 
          bg="rgba(0,0,0,0.85)" 
          backdropFilter="blur(8px)"
          css={{
            background: "radial-gradient(circle at 20% 80%, rgba(0,240,255,0.1) 0%, transparent 50%), rgba(0,0,0,0.85)"
          }}
        />
        <DrawerContent
          bg="#050505"
          color="white"
          maxW={isFullScreen ? "100%" : { base: "100%", md: "600px" }}
          borderLeft="1px solid transparent"
          borderImage="linear-gradient(180deg, rgba(0,240,255,0.3) 0%, rgba(0,255,136,0.3) 100%) 1"
          overflow="hidden"
        >
          <AnimatedBackground />
          
          <DrawerHeader 
            borderBottom="1px solid rgba(255,255,255,0.08)" 
            display="flex" 
            alignItems="center"
            py={5}
            bg="rgba(0,0,0,0.5)"
            backdropFilter="blur(20px)"
            position="relative"
            zIndex={10}
          >
            <HStack spacing={4} flexGrow={1}>
              <MotionBox
                animate={{ rotate: 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              >
                <Box 
                  p={3} 
                  borderRadius="xl" 
                  bg="linear-gradient(135deg, rgba(0,240,255,0.2) 0%, rgba(0,255,136,0.2) 100%)"
                  border="1px solid rgba(0,240,255,0.3)"
                  position="relative"
                  boxShadow="0 0 30px rgba(0,240,255,0.3), inset 0 0 20px rgba(0,240,255,0.1)"
                >
                  <FiActivity size={24} color="#00f0ff" style={{ filter: 'drop-shadow(0 0 8px rgba(0,240,255,0.8))' }} />
                  <Box
                    position="absolute"
                    inset="-1px"
                    borderRadius="xl"
                    border="1px solid transparent"
                    borderImage="linear-gradient(135deg, #00f0ff 0%, #00ff88 100%) 1"
                    opacity={0.5}
                  />
                </Box>
              </MotionBox>
              <VStack align="start" spacing={0}>
                <HStack>
                  <Text fontSize="xl" fontWeight="800" letterSpacing="tight">
                    PERFORMANCE AI
                  </Text>
                  <Badge
                    bg="linear-gradient(135deg, #00f0ff 0%, #00ff88 100%)"
                    color="black"
                    fontSize="xs"
                    px={2}
                    py={0.5}
                    borderRadius="full"
                    fontWeight="700"
                  >
                    PRO
                  </Badge>
                </HStack>
                <HStack spacing={3} color="gray.400" fontSize="xs">
                  <HStack spacing={1}>
                    <Circle size="6px" bg="#00ff88" />
                    <Text>GPT-4o-mini</Text>
                  </HStack>
                  <HStack spacing={1}>
                    <FiGlobe size={12} />
                    <Text>Real-time Analysis</Text>
                  </HStack>
                  <HStack spacing={1}>
                    <FiDatabase size={12} />
                    <Text>{MEDIA_OUTLETS.length} Outlets</Text>
                  </HStack>
                </HStack>
              </VStack>
            </HStack>
            <HStack spacing={2}>
              <Tooltip label="Voice Input (Coming Soon)">
                <IconButton
                  icon={<FiMic />}
                  variant="ghost"
                  size="sm"
                  isDisabled
                  aria-label="Voice Input"
                  _hover={{ bg: "rgba(0,240,255,0.1)" }}
                />
              </Tooltip>
              <Tooltip label={isFullScreen ? "Exit fullscreen" : "Fullscreen"}>
                <IconButton
                  icon={isFullScreen ? <FiMinimize2 /> : <FiMaximize2 />}
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsFullScreen(prev => !prev)}
                  aria-label="Toggle Fullscreen"
                  color="gray.400"
                  _hover={{ color: "#00f0ff", bg: "rgba(0,240,255,0.1)" }}
                />
              </Tooltip>
              <IconButton
                icon={<FiX />}
                variant="ghost"
                size="sm"
                onClick={onClose}
                aria-label="Close"
                color="gray.400"
                _hover={{ color: "white", bg: "rgba(255,255,255,0.1)" }}
              />
            </HStack>
          </DrawerHeader>

          <DrawerBody p={0} display="flex" flexDir="column" bg="transparent" position="relative">
            {/* Metrics Overview Panel */}
            {conversationHistory.length === 0 && (
  <Box
    px={4}
    py={3}
    bg="rgba(0,0,0,0.3)"
    borderBottom="1px solid rgba(255,255,255,0.08)"
    backdropFilter="blur(10px)"
  />
)}

            {/* Messages Area */}
            <Box 
              flex="1" 
              overflowY="auto" 
              px={4} 
              py={4}
              css={{
                '&::-webkit-scrollbar': {
                  width: '6px',
                },
                '&::-webkit-scrollbar-track': {
                  background: 'rgba(255,255,255,0.02)',
                },
                '&::-webkit-scrollbar-thumb': {
                  background: 'linear-gradient(180deg, rgba(0,240,255,0.3) 0%, rgba(0,255,136,0.3) 100%)',
                  borderRadius: '24px',
                },
                '&::-webkit-scrollbar-thumb:hover': {
                  background: 'linear-gradient(180deg, rgba(0,240,255,0.5) 0%, rgba(0,255,136,0.5) 100%)',
                },
              }}
            >
              {conversationHistory.length === 0 && (
                <MotionBox
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                  textAlign="center"
                  py={8}
                >
                  <MotionBox
                    animate={{ 
                      y: [0, -10, 0],
                      rotateZ: [0, 5, -5, 0]
                    }}
                    transition={{ 
                      duration: 4,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                  >
                    <Box 
                      mx="auto" 
                      w="100px" 
                      h="100px" 
                      mb={6}
                      borderRadius="30px"
                      bg="linear-gradient(135deg, rgba(0,240,255,0.1) 0%, rgba(0,255,136,0.1) 100%)"
                      border="2px solid transparent"
                      borderImage="linear-gradient(135deg, rgba(0,240,255,0.5) 0%, rgba(0,255,136,0.5) 100%) 1"
                      display="flex"
                      alignItems="center"
                      justifyContent="center"
                      position="relative"
                      boxShadow="0 20px 40px rgba(0,240,255,0.2), inset 0 0 30px rgba(0,240,255,0.1)"
                    >
                      <FiZap size={50} color="#00f0ff" style={{ filter: 'drop-shadow(0 0 15px rgba(0,240,255,0.8))' }} />
                      <Box
                        position="absolute"
                        inset="-20px"
                        borderRadius="50px"
                        border="1px solid rgba(0,240,255,0.1)"
                        opacity={0.5}
                        className="pulse-ring"
                      />
                    </Box>
                  </MotionBox>
                  
                  <Text 
                    fontSize="2xl" 
                    fontWeight="800" 
                    mb={3}
                    bgGradient="linear(to-r, #00f0ff, #00ff88, #00f0ff)"
                    bgClip="text"
                    backgroundSize="200% 100%"
                    className="gradient-animate"
                  >
                    Welcome to Performance AI
                  </Text>
                  <Text color="gray.400" fontSize="sm" maxW="400px" mx="auto" mb={6}>
                    I analyze your media outlets' performance metrics using advanced AI. Ask me anything about speed, layout, and optimization.
                  </Text>

                  {/* Quick Actions */}
                  {showQuickActions && (
  <VStack spacing={3} maxW="400px" mx="auto">
    <Text fontSize="xs" color="white" fontWeight="600" mb={1}>QUICK ACTIONS</Text>
    <SimpleGrid columns={2} spacing={3} w="100%">
      {QUICK_ACTIONS.map((action, i) => {
        const Icon = action.icon;
        return (
          <MotionBox
            key={i}
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.98 }}
          >
            <Button
              onClick={() => handleQuickAction(action.text)}
              variant="outline"
              size="sm"
              borderColor="rgba(255,255,255,0.1)"
              bg="rgba(255,255,255,0.02)"
              _hover={{ 
                bg: "rgba(255,255,255,0.05)", 
                borderColor: action.color,
                transform: "translateY(-2px)",
                boxShadow: `0 10px 20px ${action.color}20`
              }}
              textAlign="left"
              justifyContent="flex-start"
              height="auto"
              py={4}
              px={4}
              fontSize="xs"
              fontWeight="500"
              position="relative"
              overflow="hidden"
            >
              <HStack spacing={3} align="center">
                <Box
                  p={2}
                  bg={`${action.color}20`}
                  borderRadius="lg"
                  border="1px solid"
                  borderColor={`${action.color}40`}
                >
                  <Icon size={16} color={action.color} />
                </Box>
                <Text color="white">{action.text}</Text>
              </HStack>
              <Box
                position="absolute"
                top={0}
                left={0}
                right={0}
                height="1px"
                bg={`linear-gradient(90deg, transparent, ${action.color}, transparent)`}
                opacity={0}
                transition="opacity 0.3s"
                _groupHover={{ opacity: 1 }}
              />
            </Button>
          </MotionBox>
        );
      })}
    </SimpleGrid>
  </VStack>
)}
                </MotionBox>
              )}
              
              <AnimatePresence>
                {conversationHistory.map((msg, idx) => (
                  <MotionBox
                    key={idx}
                    initial={{ opacity: 0, y: 20, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -20, scale: 0.9 }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                    mb={4}
                  >
                    {msg.role === 'user' ? (
                      <Flex justify="flex-end">
                        <MotionBox 
                          maxW="85%" 
                          bg="linear-gradient(135deg, rgba(0,240,255,0.15) 0%, rgba(0,240,255,0.05) 100%)"
                          color="white" 
                          px={5} 
                          py={3} 
                          borderRadius="20px"
                          borderTopRightRadius="4px"
                          border="1px solid rgba(0,240,255,0.3)"
                          boxShadow="0 8px 25px rgba(0,240,255,0.15)"
                          whileHover={{ scale: 1.02 }}
                          position="relative"
                          overflow="hidden"
                        >
                          <Box
                            position="absolute"
                            top={0}
                            right={0}
                            w="60px"
                            h="60px"
                            bg="radial-gradient(circle, rgba(0,240,255,0.2) 0%, transparent 70%)"
                            filter="blur(20px)"
                          />
                          <Text fontSize="sm" lineHeight="tall" position="relative">{msg.content}</Text>
                          <HStack justify="space-between" mt={2}>
                            <Text fontSize="xs" color="gray.500">
                              {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </Text>
                            <IconButton
                              icon={<FiCopy />}
                              size="xs"
                              variant="ghost"
                              onClick={() => handleCopyMessage(msg.content)}
                              aria-label="Copy message"
                              color="gray.500"
                              _hover={{ color: "#00f0ff" }}
                            />
                          </HStack>
                        </MotionBox>
                      </Flex>
                    ) : (
                      <Flex justify="flex-start">
                        <Box maxW="85%">
                          <Flex align="center" mb={3}>
                            <MotionBox
                              animate={{ rotate: [0, 360] }}
                              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                            >
                              <Box 
                                w="40px" 
                                h="40px" 
                                borderRadius="full" 
                                bg="linear-gradient(135deg, #00f0ff 0%, #00ff88 100%)"
                                display="flex"
                                alignItems="center"
                                justifyContent="center"
                                boxShadow="0 0 30px rgba(0,240,255,0.4), inset 0 0 15px rgba(255,255,255,0.2)"
                                border="2px solid rgba(255,255,255,0.2)"
                                mr={3}
                              >
                                <FiZap size={20} color="black" />
                              </Box>
                            </MotionBox>
                            <VStack align="start" spacing={0}>
                              <HStack>
                                <Text fontSize="sm" color="white" fontWeight="700">Performance AI</Text>
                                <Badge
                                  bg="rgba(0,255,136,0.2)"
                                  color="#00ff88"
                                  fontSize="xs"
                                  px={2}
                                  borderRadius="full"
                                  border="1px solid rgba(0,255,136,0.3)"
                                >
                                  <HStack spacing={1}>
                                    <Circle size="6px" bg="#00ff88" className="pulse-dot" />
                                    <Text>Online</Text>
                                  </HStack>
                                </Badge>
                              </HStack>
                              <Text fontSize="xs" color="gray.500">Powered by GPT-4 • Advanced Analysis</Text>
                            </VStack>
                          </Flex>
                          <MotionBox 
                            bg="rgba(255,255,255,0.02)"
                            px={5} 
                            py={4} 
                            borderRadius="20px"
                            borderTopLeftRadius="4px"
                            border="1px solid rgba(255,255,255,0.08)"
                            whileHover={{ borderColor: "rgba(0,240,255,0.2)" }}
                            position="relative"
                            overflow="hidden"
                          >
                            <Box
                              position="absolute"
                              top={0}
                              left={0}
                              w="100px"
                              h="100px"
                              bg="radial-gradient(circle, rgba(0,255,136,0.1) 0%, transparent 70%)"
                              filter="blur(30px)"
                            />
                            <ReactMarkdown
  children={msg.content}
  components={{
    h1: ({node, ...props}) => <Text fontSize="2xl" fontWeight="bold" mt={4} {...props} />,
    h2: ({node, ...props}) => <Text fontSize="xl" fontWeight="semibold" mt={3} {...props} />,
    h3: ({node, ...props}) => <Text fontSize="lg" fontWeight="semibold" mt={2} {...props} />,
    p: ({node, ...props}) => <Text mt={2} {...props} />,
    ul: ({node, ...props}) => <Box as="ul" pl={4} mt={2} {...props} />,
    li: ({node, ...props}) => <Box as="li" fontSize="sm" ml={2} mb={1} listStyleType="disc" {...props} />,
    strong: ({node, ...props}) => <Text as="strong" fontWeight="bold" {...props} />,
    em: ({node, ...props}) => <Text as="em" fontStyle="italic" {...props} />,
    code: ({node, ...props}) => <Box as="code" bg="gray.800" px={1} py={0.5} borderRadius="md" fontSize="xs" {...props} />
  }}
/>

                            
                            {/* Enhanced Chart Visualization */}
                            {msg.chartData && (
                              <ScaleFade in={true} initialScale={0.9}>
                                <Box 
                                  mt={4} 
                                  bg="rgba(0,0,0,0.6)" 
                                  borderRadius="xl" 
                                  p={4}
                                  border="1px solid rgba(0,240,255,0.2)"
                                  boxShadow="0 10px 30px rgba(0,240,255,0.15), inset 0 1px 0 rgba(255,255,255,0.05)"
                                  overflow="hidden"
                                  position="relative"
                                >
                                  <Box
                                    position="absolute"
                                    top={-50}
                                    right={-50}
                                    w="150px"
                                    h="150px"
                                    bg="radial-gradient(circle, rgba(0,240,255,0.1) 0%, transparent 70%)"
                                    filter="blur(40px)"
                                  />
                                  <HStack justify="space-between" mb={2}>
                                    <Badge
                                      bg="rgba(0,240,255,0.2)"
                                      color="#00f0ff"
                                      fontSize="xs"
                                      px={2}
                                      borderRadius="full"
                                    >
                                      {msg.chartData.type.toUpperCase()} CHART
                                    </Badge>
                                    <Menu>
                                      <MenuButton
                                        as={IconButton}
                                        icon={<FiShare2 />}
                                        size="xs"
                                        variant="ghost"
                                        color="gray.400"
                                        _hover={{ color: "#00f0ff" }}
                                      />
                                      <Portal>
                                        <MenuList bg="rgba(0,0,0,0.9)" border="1px solid rgba(255,255,255,0.1)">
                                          <MenuItem icon={<FiDownload />} fontSize="sm">Export Chart</MenuItem>
                                          <MenuItem icon={<FiCopy />} fontSize="sm">Copy Data</MenuItem>
                                          <MenuItem icon={<FiShare2 />} fontSize="sm">Share</MenuItem>
                                        </MenuList>
                                      </Portal>
                                    </Menu>
                                  </HStack>
                                  <Plot
                                    data={[
                                      msg.chartData.type === "pie"
                                        ? {
                                            type: "pie",
                                            labels: msg.chartData.labels,
                                            values: msg.chartData.values,
                                            textfont: { color: '#fff', size: 12 },
                                            marker: { 
                                              colors: ['#00f0ff', '#00ff88', '#ff006e', '#fb5607', '#ffbe0b', '#8338ec', '#3a86ff', '#06ffa5'],
                                              line: { color: '#050505', width: 2 }
                                            },
                                            hoverinfo: 'label+percent+value',
                                            textposition: 'auto',
                                            pull: msg.chartData.values.map((v, i) => i === 0 ? 0.1 : 0)
                                          }
                                        : msg.chartData.type === "radar"
                                        ? {
                                            type: "scatterpolar",
                                            r: msg.chartData.values,
                                            theta: msg.chartData.labels,
                                            fill: "toself",
                                            fillcolor: 'rgba(0,240,255,0.15)',
                                            line: { 
                                              color: '#00f0ff', 
                                              width: 3,
                                              shape: 'spline'
                                            },
                                            marker: { 
                                              color: '#00f0ff', 
                                              size: 10,
                                              symbol: 'circle',
                                              line: { color: '#050505', width: 2 }
                                            },
                                            name: 'Performance'
                                          }
                                        : msg.chartData.type === "line"
                                        ? {
                                            type: "scatter",
                                            mode: "lines+markers",
                                            x: msg.chartData.labels,
                                            y: msg.chartData.values,
                                            line: { 
                                              color: '#00f0ff', 
                                              width: 4,
                                              shape: 'spline'
                                            },
                                            marker: { 
                                              color: '#00f0ff',
                                              size: 10,
                                              symbol: 'circle',
                                              line: { color: '#050505', width: 2 }
                                            },
                                            fill: 'tonexty',
                                            fillcolor: 'rgba(0,240,255,0.08)'
                                          }
                                        : {
                                            type: "bar",
                                            x: msg.chartData.labels,
                                            y: msg.chartData.values,
                                            marker: { 
                                              color: msg.chartData.values.map((v, i) => {
                                                const colors = ['#00f0ff', '#00ff88', '#ff006e', '#ffbe0b'];
                                                return colors[i % colors.length];
                                              }),
                                              line: { color: 'rgba(255,255,255,0.1)', width: 1 }
                                            },
                                            text: msg.chartData.values.map(v => v.toFixed(1)),
                                            textposition: 'outside',
                                            textfont: { color: '#fff', size: 11 },
                                            hovertemplate: '%{x}<br>%{y}<extra></extra>'
                                          },
                                    ]}
                                    layout={{
                                      title: {
                                        text: msg.chartData.title || "",
                                        font: { color: '#fff', size: 18, family: 'system-ui, sans-serif', weight: 700 },
                                        x: 0.5,
                                        xanchor: 'center',
                                        y: 0.95
                                      },
                                      paper_bgcolor: "transparent",
                                      plot_bgcolor: "rgba(255,255,255,0.02)",
                                      font: { color: "#fff", size: 12 },
                                      margin: { t: 60, l: 60, r: 40, b: 60 },
                                      height: 350,
                                      showlegend: false,
                                      xaxis: { 
                                        gridcolor: 'rgba(255,255,255,0.05)',
                                        zerolinecolor: 'rgba(255,255,255,0.1)',
                                        tickfont: { size: 11 },
                                        tickangle: -45
                                      },
                                      yaxis: { 
                                        gridcolor: 'rgba(255,255,255,0.05)',
                                        zerolinecolor: 'rgba(255,255,255,0.1)',
                                        tickfont: { size: 11 }
                                      },
                                      ...(msg.chartData.type === "radar"
                                        ? {
                                            polar: {
                                              bgcolor: 'rgba(255,255,255,0.02)',
                                              radialaxis: {
                                                visible: true,
                                                gridcolor: 'rgba(255,255,255,0.05)',
                                                range: [0, Math.max(...msg.chartData.values) * 1.2],
                                                tickfont: { size: 10 },
                                                layer: 'below traces'
                                              },
                                              angularaxis: { 
                                                gridcolor: 'rgba(255,255,255,0.05)',
                                                tickfont: { size: 11 },
                                                layer: 'below traces'
                                              }
                                            },
                                          }
                                        : {}),
                                      hoverlabel: {
                                        bgcolor: 'rgba(0,0,0,0.9)',
                                        bordercolor: '#00f0ff',
                                        font: { color: '#fff', size: 12 },
                                        align: 'left'
                                      },
                                      dragmode: false,
                                      selectdirection: 'diagonal'
                                    }}
                                    config={{
                                      responsive: true,
                                      displayModeBar: "hover",
                                      scrollZoom: true,           // allows zooming with scroll wheel
                                      doubleClick: "reset",       // double-click resets the view
                                      displaylogo: false,         // hides the "Produced with Plotly" logo
                                    }}
                                    
                                  />
                                </Box>
                              </ScaleFade>
                            )}

                            <HStack justify="space-between" mt={3}>
                              <HStack spacing={2}>
                                <IconButton
                                  icon={<FiCopy />}
                                  size="xs"
                                  variant="ghost"
                                  onClick={() => handleCopyMessage(msg.content)}
                                  aria-label="Copy message"
                                  color="gray.500"
                                  _hover={{ color: "#00f0ff" }}
                                />
                                <IconButton
                                  icon={<FiRefreshCw />}
                                  size="xs"
                                  variant="ghost"
                                  aria-label="Regenerate"
                                  color="gray.500"
                                  _hover={{ color: "#00f0ff" }}
                                  isDisabled
                                />
                              </HStack>
                              <Text fontSize="xs" color="gray.600">
                                {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </Text>
                            </HStack>
                          </MotionBox>

                          {/* Enhanced Follow-up Questions */}
                          {idx === conversationHistory.length - 1 && followUpQuestions.length > 0 && (
                            <VStack align="start" spacing={2} mt={4}>
                              <HStack spacing={2} mb={1}>
                                <FiMessageSquare size={14} color="#00f0ff" />
                                <Text fontSize="xs" color="gray.400" fontWeight="700">SUGGESTED FOLLOW-UPS</Text>
                              </HStack>
                              <Wrap spacing={2}>
                                {followUpQuestions.map((question, i) => (
                                  <WrapItem key={i}>
                                    <MotionBox
                                      whileHover={{ scale: 1.05, x: 5 }}
                                      whileTap={{ scale: 0.98 }}
                                    >
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        borderColor="rgba(0,240,255,0.2)"
                                        color="gray.300"
                                        bg="rgba(0,240,255,0.02)"
                                        backdropFilter="blur(10px)"
                                        _hover={{ 
                                          bg: "rgba(0,240,255,0.1)", 
                                          borderColor: "#00f0ff",
                                          color: "white",
                                          transform: "translateX(5px)",
                                          boxShadow: "0 5px 15px rgba(0,240,255,0.2)"
                                        }}
                                        onClick={() => handleFollowUpClick(question)}
                                        textAlign="left"
                                        whiteSpace="normal"
                                        height="auto"
                                        py={3}
                                        px={4}
                                        fontSize="xs"
                                        fontWeight="500"
                                        justifyContent="space-between"
                                        rightIcon={
                                          <Box transform="rotate(-90deg)">
                                            <FiChevronDown size={14} />
                                          </Box>
                                        }
                                        position="relative"
                                        overflow="hidden"
                                      >
                                        <Box
                                          position="absolute"
                                          top={0}
                                          left={0}
                                          right={0}
                                          height="2px"
                                          bg={`linear-gradient(90deg, transparent, #00f0ff, transparent)`}
                                          transform="translateX(-100%)"
                                          transition="transform 0.3s"
                                          _groupHover={{ transform: "translateX(0)" }}
                                        />
                                        {question}
                                      </Button>
                                    </MotionBox>
                                  </WrapItem>
                                ))}
                              </Wrap>
                            </VStack>
                          )}
                        </Box>
                      </Flex>
                    )}
                  </MotionBox>
                ))}
              </AnimatePresence>
              
              {loading && (
                <MotionBox
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <Flex justify="flex-start" mt={2}>
                    <Box maxW="85%">
                      <Flex align="center" mb={3}>
                        <Box 
                          w="40px" 
                          h="40px" 
                          borderRadius="full" 
                          bg="linear-gradient(135deg, #00f0ff 0%, #00ff88 100%)"
                          display="flex"
                          alignItems="center"
                          justifyContent="center"
                          mr={3}
                          className="pulse-animation-enhanced"
                          boxShadow="0 0 30px rgba(0,240,255,0.6)"
                        >
                          <FiZap size={20} color="black" />
                        </Box>
                        <VStack align="start" spacing={0}>
                          <Text fontSize="sm" color="white" fontWeight="700">AI is analyzing...</Text>
                          <Text fontSize="xs" color="gray.500">Processing your request</Text>
                        </VStack>
                      </Flex>
                      <Box 
                        bg="rgba(255,255,255,0.02)"
                        px={5} 
                        py={4} 
                        borderRadius="20px" 
                        borderTopLeftRadius="4px"
                        border="1px solid rgba(255,255,255,0.08)"
                        position="relative"
                        overflow="hidden"
                      >
                        <Box
                          position="absolute"
                          top={0}
                          left={0}
                          right={0}
                          height="2px"
                          bg="linear-gradient(90deg, transparent, #00f0ff, transparent)"
                          className="loading-bar"
                        />
                        <TypingIndicator />
                      </Box>
                    </Box>
                  </Flex>
                </MotionBox>
              )}
              <div ref={messagesEndRef} />
            </Box>

            {/* Enhanced Filter Controls */}
            <Box borderTop="1px solid rgba(255,255,255,0.08)" bg="rgba(0,0,0,0.3)" backdropFilter="blur(10px)">
              <Collapse in={showControls} animateOpacity>
                <Box px={4} py={4}>
                  <Flex justify="space-between" align="center" mb={4}>
                    <HStack spacing={3}>
                      <Box
                        p={2}
                        bg="rgba(0,240,255,0.1)"
                        borderRadius="lg"
                        border="1px solid rgba(0,240,255,0.3)"
                      >
                        <FiFilter size={16} color="#00f0ff" />
                      </Box>
                      <VStack align="start" spacing={0}>
                        <Text fontSize="sm" fontWeight="700" color="white">Analysis Filters</Text>
                        <Text fontSize="xs" color="gray.500">Configure your analysis parameters</Text>
                      </VStack>
                    </HStack>
                    <Tooltip label="Clear all messages">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={clearConversation}
                        color="red.400"
                        bg="rgba(255,0,0,0.05)"
                        _hover={{ color: "red.300", bg: "rgba(255,0,0,0.1)" }}
                        leftIcon={<FiTrash2 size={14} />}
                        fontWeight="600"
                      >
                        Clear
                      </Button>
                    </Tooltip>
                  </Flex>
                  
                  <VStack spacing={4} align="stretch">
                    {/* Content Type Selector */}
                    <Box>
                      <HStack mb={2}>
                        <FiLayers size={12} color="#00f0ff" />
                        <Text fontSize="xs" color="gray.400" fontWeight="700">CONTENT TYPE</Text>
                      </HStack>
                      <Select
                        size="sm"
                        placeholder="Select content type"
                        value={selectedType}
                        onChange={(e) => setSelectedType(e.target.value)}
                        bg="rgba(255,255,255,0.02)"
                        border="1px solid rgba(255,255,255,0.08)"
                        _hover={{ borderColor: "rgba(0,240,255,0.3)" }}
                        _focus={{ 
                          borderColor: "#00f0ff", 
                          boxShadow: "0 0 0 1px #00f0ff",
                          bg: "rgba(255,255,255,0.05)"
                        }}
                        fontSize="sm"
                        fontWeight="500"
                      >
                        {allTypes.map(t => (
                          <option key={t} value={t} style={{ background: '#0a0a0a' }}>{t}</option>
                        ))}
                      </Select>
                    </Box>
                    
                    {/* Date Grouping Selector */}
                    <Box>
                      <HStack mb={2}>
                        <FiClock size={12} color="#00f0ff" />
                        <Text fontSize="xs" color="gray.400" fontWeight="700">TIME PERIOD</Text>
                      </HStack>
                      <HStack spacing={2}>
                        <MotionBox flex={1} whileTap={{ scale: 0.98 }}>
                          <Button
                            size="sm"
                            variant={dateGrouping === "weekly" ? "solid" : "outline"}
                            onClick={() => setDateGrouping("weekly")}
                            bg={dateGrouping === "weekly" 
                              ? "linear-gradient(135deg, #00f0ff 0%, #00d4e6 100%)" 
                              : "transparent"
                            }
                            color={dateGrouping === "weekly" ? "black" : "white"}
                            borderColor="rgba(0,240,255,0.3)"
                            _hover={{ 
                              bg: dateGrouping === "weekly" 
                                ? "linear-gradient(135deg, #00d4e6 0%, #00b8cc 100%)" 
                                : "rgba(0,240,255,0.1)",
                              transform: "translateY(-2px)",
                              boxShadow: "0 5px 15px rgba(0,240,255,0.2)"
                            }}
                            fontSize="xs"
                            fontWeight="700"
                            w="full"
                            position="relative"
                            overflow="hidden"
                          >
                            <HStack spacing={2}>
                              <FiBarChart2 size={14} />
                              <Text>Weekly</Text>
                            </HStack>
                          </Button>
                        </MotionBox>
                        <MotionBox flex={1} whileTap={{ scale: 0.98 }}>
                          <Button
                            size="sm"
                            variant={dateGrouping === "monthly" ? "solid" : "outline"}
                            onClick={() => setDateGrouping("monthly")}
                            bg={dateGrouping === "monthly" 
                              ? "linear-gradient(135deg, #00f0ff 0%, #00d4e6 100%)" 
                              : "transparent"
                            }
                            color={dateGrouping === "monthly" ? "black" : "white"}
                            borderColor="rgba(0,240,255,0.3)"
                            _hover={{ 
                              bg: dateGrouping === "monthly" 
                                ? "linear-gradient(135deg, #00d4e6 0%, #00b8cc 100%)" 
                                : "rgba(0,240,255,0.1)",
                              transform: "translateY(-2px)",
                              boxShadow: "0 5px 15px rgba(0,240,255,0.2)"
                            }}
                            fontSize="xs"
                            fontWeight="700"
                            w="full"
                            position="relative"
                            overflow="hidden"
                          >
                            <HStack spacing={2}>
                              <FiPieChart size={14} />
                              <Text>Monthly</Text>
                            </HStack>
                          </Button>
                        </MotionBox>
                      </HStack>
                    </Box>
                    
                    {/* Date Selection */}
                    <Box>
                      <HStack mb={2}>
                        <FiTarget size={12} color="#00f0ff" />
                        <Text fontSize="xs" color="gray.400" fontWeight="700">
                          SELECT {dateGrouping === "weekly" ? "WEEKS" : "MONTHS"}
                        </Text>
                      </HStack>
                      <Box 
                        maxH="180px" 
                        overflowY="auto" 
                        border="1px solid rgba(255,255,255,0.08)" 
                        borderRadius="lg" 
                        p={3}
                        bg="rgba(255,255,255,0.01)"
                        css={{
                          '&::-webkit-scrollbar': {
                            width: '4px',
                          },
                          '&::-webkit-scrollbar-track': {
                            background: 'rgba(255,255,255,0.02)',
                          },
                          '&::-webkit-scrollbar-thumb': {
                            background: 'rgba(0,240,255,0.3)',
                            borderRadius: '24px',
                          },
                          '&::-webkit-scrollbar-thumb:hover': {
                            background: 'rgba(0,240,255,0.5)',
                          },
                        }}
                      >
                        {dateGrouping === "weekly" && (
                          <CheckboxGroup value={selectedWeeks} onChange={setSelectedWeeks}>
                            <Stack spacing={2}>
                              {availableWeeks.map(week => (
                                <MotionBox
                                  key={week}
                                  whileHover={{ x: 5 }}
                                  transition={{ type: "spring", stiffness: 300 }}
                                >
                                  <Checkbox 
                                    value={week} 
                                    size="sm"
                                    colorScheme="cyan"
                                    iconColor="black"
                                    sx={{
                                      '.chakra-checkbox__control': {
                                        borderColor: 'rgba(0,240,255,0.3)',
                                        bg: 'rgba(0,240,255,0.05)',
                                        _checked: {
                                          bg: 'linear-gradient(135deg, #00f0ff 0%, #00ff88 100%)',
                                          borderColor: '#00f0ff',
                                          boxShadow: '0 0 10px rgba(0,240,255,0.5)',
                                        },
                                        _hover: {
                                          borderColor: '#00f0ff',
                                        }
                                      },
                                    }}
                                  >
                                    <Text fontSize="sm" color="gray.300" fontWeight="500">
                                      {formatWeekLabel(week)}
                                    </Text>
                                  </Checkbox>
                                </MotionBox>
                              ))}
                            </Stack>
                          </CheckboxGroup>
                        )}
                        
                        {dateGrouping === "monthly" && (
                          <CheckboxGroup value={selectedMonths} onChange={setSelectedMonths}>
                            <Stack spacing={2}>
                              {availableMonths.map(month => (
                                <MotionBox
                                  key={month}
                                  whileHover={{ x: 5 }}
                                  transition={{ type: "spring", stiffness: 300 }}
                                >
                                  <Checkbox 
                                    value={month} 
                                    size="sm"
                                    colorScheme="cyan"
                                    iconColor="black"
                                    sx={{
                                      '.chakra-checkbox__control': {
                                        borderColor: 'rgba(0,240,255,0.3)',
                                        bg: 'rgba(0,240,255,0.05)',
                                        _checked: {
                                          bg: 'linear-gradient(135deg, #00f0ff 0%, #00ff88 100%)',
                                          borderColor: '#00f0ff',
                                          boxShadow: '0 0 10px rgba(0,240,255,0.5)',
                                        },
                                        _hover: {
                                          borderColor: '#00f0ff',
                                        }
                                      },
                                    }}
                                  >
                                    <Text fontSize="sm" color="gray.300" fontWeight="500">
                                      {formatMonthLabel(month)}
                                    </Text>
                                  </Checkbox>
                                </MotionBox>
                              ))}
                            </Stack>
                          </CheckboxGroup>
                        )}
                      </Box>
                    </Box>
                  </VStack>
                </Box>
              </Collapse>
              
              {/* Filter Toggle Button */}
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowControls(!showControls)}
                color="gray.400"
                _hover={{ 
                  color: "white", 
                  bg: "rgba(255,255,255,0.05)",
                  transform: "translateY(-2px)"
                }}
                fontSize="xs"
                width="100%"
                py={4}
                leftIcon={showControls ? <FiChevronUp /> : <FiChevronDown />}
                fontWeight="600"
                position="relative"
              >
                <Box
                  position="absolute"
                  top={0}
                  left="50%"
                  transform="translateX(-50%)"
                  width="100px"
                  height="1px"
                  bg="linear-gradient(90deg, transparent, rgba(0,240,255,0.5), transparent)"
                />
                {showControls ? "Hide filters" : "Show filters"}
              </Button>
            </Box>

            {/* Enhanced Input Area */}
            <Box 
              px={4} 
              py={4} 
              borderTop="1px solid rgba(255,255,255,0.08)" 
              bg="rgba(0,0,0,0.5)"
              backdropFilter="blur(20px)"
              position="relative"
            >
              {/* Status Pills */}
              <Flex mb={3} gap={2} flexWrap="wrap">
                {selectedType && (
                  <MotionBox
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                  >
                    <Badge 
                      bg="linear-gradient(135deg, rgba(0,240,255,0.2) 0%, rgba(0,240,255,0.1) 100%)"
                      color="#00f0ff"
                      variant="subtle"
                      fontSize="xs"
                      px={3}
                      py={1}
                      borderRadius="full"
                      border="1px solid rgba(0,240,255,0.3)"
                      fontWeight="600"
                    >
                      <HStack spacing={1}>
                        <FiLayers size={10} />
                        <Text>{selectedType}</Text>
                      </HStack>
                    </Badge>
                  </MotionBox>
                )}
                {(selectedWeeks.length > 0 || selectedMonths.length > 0) && (
                  <MotionBox
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                  >
                    <Badge 
                      bg="linear-gradient(135deg, rgba(0,255,136,0.2) 0%, rgba(0,255,136,0.1) 100%)"
                      color="#00ff88"
                      variant="subtle"
                      fontSize="xs"
                      px={3}
                      py={1}
                      borderRadius="full"
                      border="1px solid rgba(0,255,136,0.3)"
                      fontWeight="600"
                    >
                      <HStack spacing={1}>
                        <FiClock size={10} />
                        <Text>
                          {dateGrouping === "weekly" 
                            ? `${selectedWeeks.length} week${selectedWeeks.length !== 1 ? 's' : ''}`
                            : `${selectedMonths.length} month${selectedMonths.length !== 1 ? 's' : ''}`
                          }
                        </Text>
                      </HStack>
                    </Badge>
                  </MotionBox>
                )}
                <Box flex={1} />
                <HStack spacing={1} color="gray.500" fontSize="xs">
                  <Kbd size="xs">↵</Kbd>
                  <Text>to send</Text>
                  <Text>•</Text>
                  <Kbd size="xs">Shift</Kbd>
                  <Text>+</Text>
                  <Kbd size="xs">↵</Kbd>
                  <Text>new line</Text>
                </HStack>
              </Flex>

              <HStack spacing={3} align="flex-end">
                <Box flex={1} position="relative">
                  <Textarea
                    placeholder="Ask about performance metrics..."
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyPress={e => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                    bg="rgba(255,255,255,0.03)"
                    border="1px solid rgba(255,255,255,0.08)"
                    _hover={{ 
                      borderColor: "rgba(0,240,255,0.2)",
                      bg: "rgba(255,255,255,0.05)"
                    }}
                    _focus={{ 
                      borderColor: "#00f0ff", 
                      boxShadow: "0 0 0 1px #00f0ff, 0 0 20px rgba(0,240,255,0.2)",
                      bg: "rgba(255,255,255,0.05)"
                    }}
                    rows={1}
                    minH="44px"
                    maxH="120px"
                    resize="none"
                    fontSize="sm"
                    color="white"
                    _placeholder={{ color: 'gray.500' }}
                    px={4}
                    py={3}
                    borderRadius="12px"
                    transition="all 0.2s"
                  />
                  <Box
                    position="absolute"
                    bottom={2}
                    right={2}
                    fontSize="xs"
                    color="gray.600"
                    pointerEvents="none"
                  >
                    {input.length > 0 && `${input.length} chars`}
                  </Box>
                </Box>
                <VStack spacing={2}>
                  <MotionBox
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <IconButton
                      icon={<FiSend size={18} />}
                      onClick={handleSend}
                      isLoading={loading}
                      bg="linear-gradient(135deg, #00f0ff 0%, #00ff88 100%)"
                      color="black"
                      _hover={{ 
                        bg: "linear-gradient(135deg, #00d4e6 0%, #00e67a 100%)",
                        transform: "translateY(-2px)",
                        boxShadow: "0 10px 30px rgba(0,240,255,0.5), 0 5px 15px rgba(0,0,0,0.3)"
                      }}
                      _active={{ 
                        bg: "linear-gradient(135deg, #00b8cc 0%, #00cc6a 100%)",
                        transform: "translateY(0)",
                      }}
                      size="md"
                      borderRadius="12px"
                      aria-label="Send"
                      boxShadow="0 5px 20px rgba(0,240,255,0.3)"
                      border="1px solid rgba(255,255,255,0.2)"
                      h="44px"
                      w="44px"
                    />
                  </MotionBox>
                </VStack>
              </HStack>
            </Box>
          </DrawerBody>
        </DrawerContent>
      </Drawer>

      <style jsx global>{`
        @keyframes pulse {
          0% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(1.5);
            opacity: 0.5;
          }
          100% {
            transform: scale(2);
            opacity: 0;
          }
        }

        @keyframes pulse-ring {
          0% {
            transform: scale(0.8);
            opacity: 1;
          }
          100% {
            transform: scale(1.4);
            opacity: 0;
          }
        }

        @keyframes glow {
          0%, 100% {
            opacity: 0.6;
          }
          50% {
            opacity: 1;
          }
        }

        @keyframes gradient-animate {
          0% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
          100% {
            background-position: 0% 50%;
          }
        }

        @keyframes loading-bar {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(200%);
          }
        }

        .pulse-dot {
          animation: pulse 2s infinite;
        }

        .pulse-dot-enhanced {
          animation: pulse 1.5s infinite;
        }

        .pulse-ring {
          animation: pulse-ring 2s infinite;
        }

        .glow-effect {
          animation: glow 2s ease-in-out infinite;
        }

        .gradient-animate {
          animation: gradient-animate 3s ease infinite;
        }

        .loading-bar {
          animation: loading-bar 2s linear infinite;
        }

        .pulse-animation-enhanced {
          animation: pulse 1s infinite;
          box-shadow: 0 0 0 0 rgba(0, 240, 255, 0.7);
        }

        .ai-fab-enhanced {
          position: fixed;
          bottom: 30px;
          right: 30px;
          z-index: 1000;
          box-shadow: 0 10px 40px rgba(0, 240, 255, 0.3), 
                      0 0 60px rgba(0, 240, 255, 0.2),
                      inset 0 0 20px rgba(0, 240, 255, 0.1);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .ai-fab-enhanced:hover {
          box-shadow: 0 15px 50px rgba(0, 240, 255, 0.4),
                      0 0 80px rgba(0, 240, 255, 0.3),
                      inset 0 0 30px rgba(0, 240, 255, 0.2);
        }

        .ai-fab-enhanced::before {
          content: '';
          position: absolute;
          inset: -2px;
          border-radius: 20px;
          padding: 2px;
          background: linear-gradient(135deg, #00f0ff, #00ff88, #00f0ff);
          -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          -webkit-mask-composite: xor;
          mask-composite: exclude;
          opacity: 0.5;
          animation: gradient-animate 3s linear infinite;
        }
      `}</style>
    </>
  );
};

export default AiChat;