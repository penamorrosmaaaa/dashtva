import React, { useState, useEffect, useRef } from "react";
import {
  Box, Textarea, Button, VStack, Text, Select, useToast, HStack,
  IconButton, Drawer, DrawerOverlay, DrawerContent, DrawerHeader,
  DrawerBody, useDisclosure, Flex
} from "@chakra-ui/react";
import { FiZap, FiX, FiMaximize2, FiMinimize2, FiSend } from "react-icons/fi";
import { motion } from "framer-motion";
import "./AiChatWhoop.css";
import { Checkbox, CheckboxGroup, Stack } from "@chakra-ui/react";
import Plot from "react-plotly.js";

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

/* ------------------------------------------------------------------ */
/*  FUNCIÓN QUE CREA EL CONTEXTO PARA OPENAI                           */
/* ------------------------------------------------------------------ */
const buildSystemContext = () => {
    return {
      role: "system",
      content: `
You are an expert web performance analyst helping a media company evaluate Lighthouse performance across news websites. Keep responses conversational and concise like a performance coach.

Here is the full context of the system you're working with:

📅 DAILY WORKFLOW
- Each day, the system extracts up to 10 new URLs of each content type (nota, video, image) for each media outlet.
- These URLs are extracted from sitemap.xml, .txt, or RSS feeds using robust retry logic and parsed via \`lxml\`.
- The system avoids duplicate URLs **within the same day**.

🏷️ TYPES OF CONTENT
- 'nota': standard articles, excluding URLs with 'video'
- 'video': video-based articles (e.g., containing '/video/', ending in '-video', etc.)
- 'img': image galleries, extracted from image sitemaps if more than one \`<image:image>\` is present

📊 METRICS (captured via Lighthouse and stored in Google Sheets)
Each URL is tested using Lighthouse in headless Chrome, and the following metrics are captured:
- Score: overall Lighthouse performance score (0–100)
- CLS: Cumulative Layout Shift
- LCP: Largest Contentful Paint
- SI: Speed Index
- TBT: Total Blocking Time
- FCP: First Contentful Paint

🏢 COMPANIES — Organized in 3 groups

1. 🟣 TV Azteca Main Brands
   - Azteca 7
   - Azteca UNO
   - ADN40
   - Deportes
   - A+
   - Noticias

2. 🟡 TV Azteca Local Brands
   - Quintana Roo
   - Bajío
   - Ciudad Juárez
   - Yúcatan
   - Jalisco
   - Puebla
   - Veracruz
   - Baja California
   - Morelos
   - Guerrero
   - Chiapas
   - Sinaloa
   - Aguascalientes
   - Queretaro
   - Chihuahua
   - Laguna

3. 🔴 Competition Companies
   - Heraldo
   - Televisa
   - Milenio
   - Universal
   - As
   - Infobae
   - NYTimes
   - Terra

4. 🖼️ Image Brands (specialized image sitemaps)
   - IMG.AZTECA7
   - IMG.AZTECAUNO
   - IMG.AZTECANOTICIAS

📈 DATA FORMAT
Each row in the Google Sheet includes 9 columns per group:
[Date, Type, URL, Score, CLS, LCP, SI, TBT, FCP]

🧠 YOUR ROLE
As the AI assistant:
- Be conversational and friendly, like a performance coach
- Keep responses concise and actionable
- Understand the differences between outlet groups
- Distinguish content types: 'nota' vs. 'video' vs. 'img'
- Use metrics to compare companies on any given day or over time
- Provide insights like "which outlet had the best score", "which company improved the most in LCP", or "how does Azteca compare to its competitors this week"
- Make sure to use precise metric values and name the company group if relevant
- After answering a question, suggest 2-3 relevant follow-up questions that a user might ask next

Be clear, accurate, and analytical. If data is missing or null, acknowledge it.
      `.trim()
    };
  };

/* ------------------------------------------------------------------ */
/*  COMPONENTE PRINCIPAL                                              */
/* ------------------------------------------------------------------ */
const AiChat = ({ visibleData, inline = false }) => {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const messagesEndRef = useRef(null);
  const toast = useToast();

  /* ---------- estado local ---------- */
  const [input, setInput] = useState("");
  const [displayedText, setDisplayedText] = useState("");
  const [loading, setLoading] = useState(false);
  const [tokenInfo, setTokenInfo] = useState(null);
  const [selectedDates, setSelectedDates] = useState([]);
  const [selectedType, setSelectedType] = useState("");
  const [allDates, setAllDates] = useState([]);
  const [allTypes, setAllTypes] = useState([]);
  const [analysis, setAnalysis] = useState(null);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [conversationHistory, setConversationHistory] = useState(() => {
    const saved = localStorage.getItem('aiChatConversation');
    return saved ? JSON.parse(saved) : [];
  });
  const [followUpQuestions, setFollowUpQuestions] = useState([]);
  const [showControls, setShowControls] = useState(false);

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
  const estimateTokens = str => Math.ceil(str.length / 2.3);
  const dayCount = () => analysis ? Object.keys(analysis).length : 0;

  /* ---------- construir caché analizable ---------- */
  useEffect(() => {
    if (!visibleData?.length) return;
    const agg = {};

    visibleData.forEach(r => {
      MEDIA_OUTLETS.forEach((outlet, i) => {
        const suf = i === 0 ? "" : `_${i}`;
        const date = r[`Date${suf}`];
        const type = r[`Type${suf}`];
        if (!date || !type) return;

        if (!agg[date]) agg[date] = {};
        if (!agg[date][type]) agg[date][type] = {};
        if (!agg[date][type][outlet]) {
          agg[date][type][outlet] = {};
          METRICS.forEach(m => (agg[date][type][outlet][m] = { sum:0, count:0 }));
        }
        METRICS.forEach(m => {
          const v = safeParse(r[`${m}${suf}`]);
          if (v !== null) {
            agg[date][type][outlet][m].sum += v;
            agg[date][type][outlet][m].count += 1;
          }
        });
      });
    });

    /* promedios finales */
    Object.keys(agg).forEach(d => {
      Object.keys(agg[d]).forEach(t => {
        Object.keys(agg[d][t]).forEach(o => {
          METRICS.forEach(m => {
            const { sum, count } = agg[d][t][o][m];
            agg[d][t][o][m] = count ? +(sum / count).toFixed(2) : null;
          });
        });
      });
    });

    setAllDates(Object.keys(agg).sort((a,b) => new Date(b) - new Date(a)));
    const tSet = new Set();
    Object.values(agg).forEach(d => Object.keys(d).forEach(t => tSet.add(t)));
    setAllTypes([...tSet]);
    setAnalysis(agg);
  }, [visibleData]);

  /* ---------- prompt builders ---------- */
  const buildTrendPrompt = () => {
    const blocks = [];
  
    selectedDates.forEach(date => {
      const types = analysis[date];
      if (!types) return;
  
      Object.entries(types).forEach(([type, outlets]) => {
        const lines = Object.entries(outlets).map(([o, v]) =>
          METRICS.map(k => v[k] !== null ? `${k}: ${v[k]}` : null)
                 .filter(Boolean).join(", ")
          ? `${o} — ` + METRICS.map(k => v[k] !== null ? `${k}: ${v[k]}` : null)
                              .filter(Boolean).join(", ")
          : null
        ).filter(Boolean).join("\n");
  
        blocks.push(`📅 ${date} • ${type}\n${lines}`);
      });
    });
  
    return `
### CONVERSATION HISTORY
${conversationHistory.map(msg => `${msg.role === 'user' ? 'USER' : 'AI'}: ${msg.content}`).join('\n')}

### DATOS HISTÓRICOS
${blocks.join("\n")}

### PREGUNTA
${input}

Keep responses conversational and concise. If appropriate, include a visualization.

If possible, respond with a chart JSON like:
{
  "chart": {
    "type": "pie" or "bar" or "line" or "radar",
    "title": "Example Chart",
    "labels": ["Company A", "Company B"],
    "values": [50, 100]
  }
}

At the end of your response, include 2-3 suggested follow-up questions in this format:
<!-- FOLLOW_UP -->
- Question 1?
- Question 2?
- Question 3?
`.trim();
  };

  const buildSinglePrompt = (obj, dateLabel) => {
    const lines = Object.entries(obj).map(([outlet, metrics]) => {
      const metricLine = METRICS.map(metric =>
        metrics[metric] !== null ? `${metric}: ${metrics[metric]}` : null
      ).filter(Boolean).join(", ");
      
      return metricLine ? `${outlet} — ${metricLine}` : null;
    }).filter(Boolean).join("\n");
  
    return `
### CONVERSATION HISTORY
${conversationHistory.map(msg => `${msg.role === 'user' ? 'USER' : 'AI'}: ${msg.content}`).join('\n')}

### CONTEXTO
Promedio de métricas para el tipo de contenido "${selectedType}" en las fechas: ${dateLabel}.

Cada valor corresponde al promedio entre los días seleccionados para cada medio.

${lines}

### PREGUNTA
${input}

Keep responses conversational and concise. If appropriate, include a visualization.

If possible, respond with a chart JSON like:
{
  "chart": {
    "type": "pie" or "bar" or "line" or "radar",
    "title": "Example Chart",
    "labels": ["Company A", "Company B"],
    "values": [50, 100]
  }
}

At the end of your response, include 2-3 suggested follow-up questions in this format:
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
      setTokenInfo(null);
      setFollowUpQuestions([]);

      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.REACT_APP_OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-4o",
          temperature: 0.3,
          messages: [
            buildSystemContext(),
            ...conversationHistory,
            { role: "user", content: prompt },
          ],
        }),
      });

      const data = await res.json();
      let content = data.choices?.[0]?.message?.content || "Sin respuesta.";
      let chartData = null;

      // Extract chart JSON if present
      let match = content.match(/```json\s*([\s\S]*?)\s*```/);
      if (!match) match = content.match(/\{[\s\S]*"chart"[\s\S]*\}/);

      if (match) {
        try {
          const rawJson = match[1] || match[0];
          const parsed = JSON.parse(rawJson);
          if (parsed.chart) {
            chartData = parsed.chart;
            content = content.replace(match[0], "").replace(/```json|```/g, "").trim();
          }
        } catch (err) {
          console.warn("Chart JSON not valid:", err);
        }
      }

      // Extract follow-up questions
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

      const usage = data.usage || {};
      const nowTok = estimateTokens(prompt);
      const projTok = dayCount() ? Math.ceil(nowTok * 31 / dayCount()) : 0;
      setTokenInfo({ ...usage, nowTok, projTok });

    } catch (e) {
      console.error(e);
      setConversationHistory(prev => [
        ...prev,
        { role: "user", content: input },
        { role: "assistant", content: "Error al generar respuesta." }
      ]);
    } finally {
      setLoading(false);
      setInput("");
    }
  };

  /* ---------- handlers ---------- */
  const handleSend = () => {
    if (!input.trim()) {
      toast({ title:"Escribe una pregunta", status:"warning", duration:3500, isClosable:true });
      return;
    }
    
    if (!analysis) {
      toast({ title:"No hay datos disponibles", status:"warning", duration:3500, isClosable:true });
      return;
    }

    if (selectedDates.length > 0 && selectedType) {
      handleSingle();
    } else if (selectedDates.length > 0) {
      handleTrend();
    } else {
      // General question without filters
      askOpenAI(`
### PREGUNTA
${input}

Please provide a general response about the media outlet performance tracking system.
Keep it conversational and helpful.

At the end of your response, include 2-3 suggested follow-up questions in this format:
<!-- FOLLOW_UP -->
- Question 1?
- Question 2?
- Question 3?
      `);
    }
  };

  const handleSingle = () => {
    const combined = {};
  
    selectedDates.forEach(date => {
      const data = analysis?.[date]?.[selectedType];
      if (!data) return;
  
      Object.entries(data).forEach(([outlet, metrics]) => {
        if (!combined[outlet]) combined[outlet] = {};
        METRICS.forEach(metric => {
          const val = metrics[metric];
          if (val !== null) {
            if (!combined[outlet][metric]) {
              combined[outlet][metric] = { sum: 0, count: 0 };
            }
            combined[outlet][metric].sum += val;
            combined[outlet][metric].count += 1;
          }
        });
      });
    });
  
    // Promediar
    Object.keys(combined).forEach(outlet => {
      METRICS.forEach(metric => {
        const { sum, count } = combined[outlet][metric] || {};
        combined[outlet][metric] = count ? +(sum / count).toFixed(2) : null;
      });
    });
  
    askOpenAI(buildSinglePrompt(combined, selectedDates.join(", ")));
  };

  const handleTrend = () => {
    askOpenAI(buildTrendPrompt());
  };

  const handleFollowUpClick = (question) => {
    setInput(question);
    setTimeout(() => {
      handleSend();
    }, 100);
  };

  const clearConversation = () => {
    setConversationHistory([]);
    localStorage.removeItem('aiChatConversation');
    setFollowUpQuestions([]);
  };

  /* ------------------------------------------------------------------ */
  /*  UI (Botón + Drawer)                                               */
  /* ------------------------------------------------------------------ */
  const iconButton = (
    <IconButton
      aria-label="Abrir chat"
      icon={<FiZap size="22" />}
      onClick={onOpen}
      variant="ghost"
      color="#00f0ff"
      className={inline ? "ai-nav-icon cyber-nav-btn" : "ai-fab"}
      _hover={{ bg:"rgba(0,240,255,0.18)" }}
      _active={{ bg:"rgba(0,240,255,0.28)" }}
      _focus={{ boxShadow:"none" }}
    />
  );

  return (
    <>
      {iconButton}

      <Drawer
  isOpen={isOpen}
  placement="right"
  onClose={onClose}
  size={isFullScreen ? "full" : { base: "full", md: "md" }}
  blockScrollOnMount={false}  // ✅ Allows body scroll
  preserveScrollBarGap={true} // ✅ Prevents layout shift
>

        <DrawerOverlay />
        <DrawerContent
          bg="#000000"
          color="white"
          maxW={isFullScreen ? "100%" : { base: "100%", md: "480px" }}
        >
          <DrawerHeader 
            borderBottom="1px solid #222" 
            display="flex" 
            alignItems="center"
            py={3}
          >
            <Text fontSize="md" fontWeight="600" flexGrow={1}>MEDIA OUTLET ANALYZER</Text>
            <HStack spacing={1}>
              <IconButton
                icon={isFullScreen ? <FiMinimize2 /> : <FiMaximize2 />}
                variant="ghost"
                size="sm"
                onClick={() => setIsFullScreen(prev => !prev)}
                aria-label="Toggle Fullscreen"
                color="gray.400"
                _hover={{ color: "white" }}
              />
              <IconButton
                icon={<FiX />}
                variant="ghost"
                size="sm"
                onClick={onClose}
                aria-label="Close"
                color="gray.400"
                _hover={{ color: "white" }}
              />
            </HStack>
          </DrawerHeader>

          <DrawerBody p={0} display="flex" flexDir="column" bg="#000">
            {/* Messages Area */}
            <Box flex="1" overflowY="auto" px={4} py={4}>
              {conversationHistory.length === 0 && (
                <Box textAlign="center" py={8}>
                  <Text color="gray.500" fontSize="sm">How can I help?</Text>
                </Box>
              )}
              
              {conversationHistory.map((msg, idx) => (
                <Box key={idx} mb={4}>
                  {msg.role === 'user' ? (
                    <Flex justify="flex-end">
                      <Box 
                        maxW="80%" 
                        bg="#1a1a1a" 
                        color="white" 
                        px={4} 
                        py={3} 
                        borderRadius="18px"
                        borderTopRightRadius="4px"
                      >
                        <Text fontSize="sm">{msg.content}</Text>
<Text fontSize="xs" color="gray.500" mt={1} textAlign="right">
  {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
</Text>

                      </Box>
                    </Flex>
                  ) : (
                    <Flex justify="flex-start">
                      <Box maxW="80%">
                        <Flex align="center" mb={2}>
                          <Box w="24px" h="24px" borderRadius="full" bg="#00f0ff" mr={2} />
                          <Text fontSize="xs" color="gray.400">AI Coach</Text>
                        </Flex>
                        <Box 
                          bg="#1a1a1a" 
                          px={4} 
                          py={3} 
                          borderRadius="18px"
                          borderTopLeftRadius="4px"
                        >
                          <Text fontSize="sm" whiteSpace="pre-wrap">
  {idx === conversationHistory.length - 1 && loading ? displayedText : msg.content}
</Text>
<Text fontSize="xs" color="gray.500" mt={1}>
  {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
</Text>

                          
                          {/* Chart if available */}
                          {msg.chartData && (
                            <Box mt={3} bg="#0d0d0d" borderRadius="md" p={2}>
                              <Plot
                                data={[
                                  msg.chartData.type === "pie"
                                    ? {
                                        type: "pie",
                                        labels: msg.chartData.labels,
                                        values: msg.chartData.values,
                                        textfont: { color: '#fff' },
                                        marker: { 
                                          colors: ['#00f0ff', '#ff006e', '#fb5607', '#ffbe0b', '#8338ec', '#3a86ff']
                                        }
                                      }
                                    : msg.chartData.type === "radar"
                                    ? {
                                        type: "scatterpolar",
                                        r: msg.chartData.values,
                                        theta: msg.chartData.labels,
                                        fill: "toself",
                                        marker: { color: '#00f0ff' }
                                      }
                                    : msg.chartData.type === "line"
                                    ? {
                                        type: "scatter",
                                        mode: "lines+markers",
                                        x: msg.chartData.labels,
                                        y: msg.chartData.values,
                                        line: { color: '#00f0ff' },
                                        marker: { color: '#00f0ff' }
                                      }
                                    : {
                                        type: "bar",
                                        x: msg.chartData.labels,
                                        y: msg.chartData.values,
                                        marker: { color: '#00f0ff' }
                                      },
                                ]}
                                layout={{
                                  title: {
                                    text: msg.chartData.title || "",
                                    font: { color: '#fff', size: 14 }
                                  },
                                  paper_bgcolor: "#0d0d0d",
                                  plot_bgcolor: "#0d0d0d",
                                  font: { color: "#fff", size: 12 },
                                  margin: { t: 40, l: 40, r: 20, b: 40 },
                                  height: 280,
                                  showlegend: false,
                                  xaxis: { gridcolor: '#333' },
                                  yaxis: { gridcolor: '#333' },
                                  ...(msg.chartData.type === "radar"
                                    ? {
                                        polar: {
                                          bgcolor: '#0d0d0d',
                                          radialaxis: {
                                            visible: true,
                                            gridcolor: '#333',
                                            range: [0, Math.max(...msg.chartData.values) * 1.2],
                                          },
                                          angularaxis: { gridcolor: '#333' }
                                        },
                                      }
                                    : {}),
                                }}
                                config={{ 
                                  responsive: true,
                                  displayModeBar: false
                                }}
                              />
                            </Box>
                          )}
                        </Box>

                        {/* Follow-up questions */}
                        {idx === conversationHistory.length - 1 && followUpQuestions.length > 0 && (
                          <VStack align="start" spacing={2} mt={3}>
                            {followUpQuestions.map((question, i) => (
                              <Button
                                key={i}
                                variant="outline"
                                size="sm"
                                borderColor="#333"
                                color="gray.300"
                                _hover={{ bg: "#1a1a1a", borderColor: "#00f0ff" }}
                                onClick={() => handleFollowUpClick(question)}
                                textAlign="left"
                                whiteSpace="normal"
                                height="auto"
                                py={2}
                                px={3}
                                fontSize="xs"
                                fontWeight="normal"
                              >
                                {question}
                              </Button>
                            ))}
                          </VStack>
                        )}
                      </Box>
                    </Flex>
                  )}
                </Box>
              ))}
              {loading && (
  <Flex justify="flex-start" mt={2}>
    <Box maxW="80%">
      <Flex align="center" mb={2}>
        <Box w="24px" h="24px" borderRadius="full" bg="#00f0ff" mr={2} />
        <Text fontSize="xs" color="gray.400">AI Coach</Text>
      </Flex>
      <Box 
        bg="#1a1a1a" 
        px={4} 
        py={3} 
        borderRadius="18px" 
        borderTopLeftRadius="4px"
      >
        <Text fontSize="sm" color="gray.400" fontStyle="italic">
          typing<span className="dot-1">.</span><span className="dot-2">.</span><span className="dot-3">.</span>
        </Text>
      </Box>
    </Box>
  </Flex>
)}
<div ref={messagesEndRef} />

            </Box>

            {/* Filter Controls Toggle */}
            <Box px={4}>
              <Button
                size="xs"
                variant="ghost"
                onClick={() => setShowControls(!showControls)}
                color="gray.400"
                _hover={{ color: "white" }}
                fontSize="xs"
              >
                {showControls ? "Hide filters" : "Show filters"}
              </Button>
            </Box>

            {/* Filter Controls */}
            {showControls && (
              <Box px={4} py={2} borderTop="1px solid #222">
                <HStack spacing={2} mb={2}>
                  <Text fontSize="xs" color="gray.400">Filters:</Text>
                  <Button
                    size="xs"
                    variant="ghost"
                    onClick={clearConversation}
                    color="red.400"
                    _hover={{ color: "red.300" }}
                  >
                    Clear chat
                  </Button>
                </HStack>
                <HStack spacing={2} align="start">
                  <Box flex="1" maxH="100px" overflowY="auto" border="1px solid #333" borderRadius="md" p={2}>
                    <CheckboxGroup value={selectedDates} onChange={setSelectedDates}>
                      <Stack spacing={1}>
                        {allDates.map(d => (
                          <Checkbox 
                            key={d} 
                            value={d} 
                            size="sm"
                            colorScheme="cyan"
                            iconColor="black"
                          >
                            <Text fontSize="xs">{d}</Text>
                          </Checkbox>
                        ))}
                      </Stack>
                    </CheckboxGroup>
                  </Box>

                  <Select
                    size="sm"
                    placeholder="Type"
                    value={selectedType}
                    onChange={e => setSelectedType(e.target.value)}
                    bg="#1a1a1a"
                    border="1px solid #333"
                    _hover={{ borderColor: "#444" }}
                    fontSize="xs"
                    width="120px"
                  >
                    {allTypes.map(t => <option key={t} value={t}>{t}</option>)}
                  </Select>
                </HStack>
              </Box>
            )}

            {/* Input Area */}
            <Box px={4} py={3} borderTop="1px solid #222">
              <HStack spacing={2}>
                <Textarea
                  size="sm"
                  placeholder="Ask about performance metrics..."
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyPress={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  bg="#1a1a1a"
                  border="1px solid #333"
                  _hover={{ borderColor: "#444" }}
                  _focus={{ borderColor: "#00f0ff", boxShadow: "none" }}
                  rows={1}
                  resize="none"
                  fontSize="sm"
                />
                <IconButton
                  icon={<FiSend />}
                  onClick={handleSend}
                  isLoading={loading}
                  bg="#00f0ff"
                  color="black"
                  _hover={{ bg: "#00d4e6" }}
                  _active={{ bg: "#00b8cc" }}
                  size="sm"
                  borderRadius="full"
                  aria-label="Send"
                />
              </HStack>
              
              {selectedDates.length > 0 && (
                <Text fontSize="xs" color="gray.500" mt={1}>
                  {selectedDates.length} date{selectedDates.length > 1 ? 's' : ''} selected
                  {selectedType && ` • ${selectedType}`}
                </Text>
              )}
            </Box>
          </DrawerBody>
        </DrawerContent>
      </Drawer>
    </>
  );
};

export default AiChat;