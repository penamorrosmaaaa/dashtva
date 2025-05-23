// FILE: src/Lighthouse/AiChat.jsx
import React, { useState, useEffect } from "react";
import {
  Box, Textarea, Button, VStack, Text, Select, useToast, HStack,
  IconButton, Drawer, DrawerOverlay, DrawerContent, DrawerHeader,
  DrawerBody, useDisclosure, Spacer
} from "@chakra-ui/react";
import { FiZap, FiX, FiMaximize2, FiMinimize2 } from "react-icons/fi";
import { motion } from "framer-motion";
import "./AiChatCyberpunk.css";
import { Checkbox, CheckboxGroup, Stack } from "@chakra-ui/react";
import Plot from "react-plotly.js"; // ADD THIS


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
  You are an expert web performance analyst helping a media company evaluate Lighthouse performance across news websites.
  
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
  
  Multiple groups are stored horizontally per row. A single row can contain URLs and metrics for several companies across types.
  
  🧠 YOUR ROLE
  As the AI assistant:
  - Understand the differences between outlet groups.
  - Distinguish content types: 'nota' vs. 'video' vs. 'img'.
  - Use metrics to compare companies on any given day or over time.
  - Provide insights like "which outlet had the best score", "which company improved the most in LCP", or "how does Azteca compare to its competitors this week".
  - Make sure to use precise metric values and name the company group if relevant.
  
  Be clear, accurate, and analytical. If data is missing or null, acknowledge it.
      `.trim()
    };
  };
  

/* ------------------------------------------------------------------ */
/*  COMPONENTE PRINCIPAL                                              */
/* ------------------------------------------------------------------ */
const AiChat = ({ visibleData, inline = false }) => {
  const { isOpen, onOpen, onClose } = useDisclosure();

  /* ---------- estado local ---------- */
  const [input, setInput]         = useState("");
  const [answer, setAnswer]       = useState("");
  const [loading, setLoading]     = useState(false);
  const [tokenInfo, setTokenInfo] = useState(null);

  const [selectedDates, setSelectedDates] = useState([]);
  const [selectedType, setSelectedType] = useState("");
  const [allDates, setAllDates]         = useState([]);
  const [allTypes, setAllTypes]         = useState([]);
  const [analysis, setAnalysis]         = useState(null);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [chartData, setChartData] = useState(null);


  const toast = useToast();

  /* ---------- helpers ---------- */
  const safeParse      = v => { const n = parseFloat(String(v).replace(",",".")); return isNaN(n) ? null : n; };
  const estimateTokens = str => Math.ceil(str.length / 2.3);          // ≈
  const dayCount       = ()  => analysis ? Object.keys(analysis).length : 0;

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

        if (!agg[date])       agg[date]       = {};
        if (!agg[date][type]) agg[date][type] = {};
        if (!agg[date][type][outlet]) {
          agg[date][type][outlet] = {};
          METRICS.forEach(m => (agg[date][type][outlet][m] = { sum:0, count:0 }));
        }
        METRICS.forEach(m => {
          const v = safeParse(r[`${m}${suf}`]);
          if (v !== null) {
            agg[date][type][outlet][m].sum   += v;
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
### DATOS HISTÓRICOS
${blocks.join("\n")}

### PREGUNTA
${input}

If possible, respond with a chart JSON like:
{
  "chart": {
    "type": "pie" or "bar",
    "title": "Example Chart",
    "labels": ["Company A", "Company B"],
    "values": [50, 100]
  }
}
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
  ### CONTEXTO
  Promedio de métricas para el tipo de contenido "${selectedType}" en las fechas: ${dateLabel}.
  
  Cada valor corresponde al promedio entre los días seleccionados para cada medio.
  
  ${lines}
  
  ### PREGUNTA
${input}

### PREGUNTA
${input}

Incluye resultados para todas las marcas que tengan datos en las fechas seleccionadas, aunque el usuario haya mencionado una sola.

If possible, respond with a chart JSON like:
{
  "chart": {
    "type": "pie" or "bar",
    "title": "Example Chart",
    "labels": ["Company A", "Company B"],
    "values": [50, 100]
  }
}
`.trim();

  };
  

  /* ---------- OpenAI ---------- */
  const askOpenAI = async prompt => {
    try {
      setLoading(true);
      setTokenInfo(null);
      setChartData(null);  // 🔄 Clear old chart
  
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
            { role: "user", content: prompt },
          ],
        }),
      });
  
      const data = await res.json();
      let content = data.choices?.[0]?.message?.content || "Sin respuesta.";

// Intentar extraer JSON del gráfico
let match = content.match(/```json\s*([\s\S]*?)\s*```/); // entre bloques ```json ... ```
if (!match) match = content.match(/\{[\s\S]*\}/);        // o solo {...}

if (match) {
  try {
    const rawJson = match[1] || match[0];
    const parsed = JSON.parse(rawJson);
    if (parsed.chart) {
      setChartData(parsed.chart);
      content = content
        .replace(match[0], "")        // eliminar el bloque JSON
        .replace(/```json|```/g, "")  // eliminar etiquetas markdown
        .trim();                      // limpiar espacios extra
    }
  } catch (err) {
    console.warn("Chart JSON not valid:", err);
  }
}

setAnswer(content);

  
      // 🧠 Try to extract JSON from the message
      try {
        const match = content.match(/\{[\s\S]*\}/);
        if (match) {
          const parsed = JSON.parse(match[0]);
          if (parsed.chart) setChartData(parsed.chart);
        }
      } catch (err) {
        console.warn("No chart JSON found:", err);
      }
  
      const usage = data.usage || {};
      const nowTok = estimateTokens(prompt);
      const projTok = dayCount() ? Math.ceil(nowTok * 31 / dayCount()) : 0;
      setTokenInfo({ ...usage, nowTok, projTok });
  
    } catch (e) {
      console.error(e);
      setAnswer("Error al generar respuesta.");
    } finally {
      setLoading(false);
    }
  };
  

  /* ---------- handlers ---------- */
  const handleSingle = () => {
    if (!input || selectedDates.length === 0 || !selectedType || !analysis) {
      toast({ title:"Selecciona al menos una fecha y un tipo", status:"warning", duration:3500, isClosable:true });
      return;
    }
  
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
    if (!input || !analysis || selectedDates.length === 0) {
      toast({ title:"Falta información", status:"warning", duration:3500, isClosable:true });
      return;
    }
    askOpenAI(buildTrendPrompt());
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
  size={isFullScreen ? "full" : { base: "full", md: "sm" }}
>
        <DrawerOverlay />
        <DrawerContent
  bg="#0d0d0d"
  borderLeft="2px solid #00f0ff"
  maxW={isFullScreen ? "100%" : { base: "100%", md: "420px" }}
>

          <DrawerHeader pl={4} pr={4} display="flex" alignItems="center">
            <Text className="ai-chat-title" flexGrow={1}>Media Outlet Analyzer</Text>
            <HStack spacing={2}>
  <IconButton
    icon={isFullScreen ? <FiMinimize2 /> : <FiMaximize2 />}
    variant="ghost"
    size="sm"
    onClick={() => setIsFullScreen(prev => !prev)}
    aria-label="Toggle Fullscreen"
  />
  <IconButton
    icon={<FiX />}
    variant="ghost"
    size="sm"
    onClick={onClose}
    aria-label="Close"
  />
</HStack>

          </DrawerHeader>

          <DrawerBody p={0} display="flex" flexDir="column">
  {/* Respuesta */}
  <Box flex="1" px={{ base: 3, md: 4 }} py={4}>
    {answer && (

                <motion.div
                  className="ai-answer"
                  initial={{ opacity:0 }}
                  animate={{ opacity:1 }}
                  transition={{ duration:0.4 }}
                >
                  <Text whiteSpace="pre-wrap">{answer}</Text>

{/* 🔥 Show chart if available */}
{chartData && (
  <Box mt={6}>
    <Plot
      data={[
        chartData.type === "pie"
          ? {
              type: "pie",
              labels: chartData.labels,
              values: chartData.values,
            }
          : chartData.type === "donut"
          ? {
              type: "pie",
              labels: chartData.labels,
              values: chartData.values,
              hole: 0.4,
            }
          : chartData.type === "radar"
          ? {
              type: "scatterpolar",
              r: chartData.values,
              theta: chartData.labels,
              fill: "toself",
              name: chartData.title || "Radar Chart",
            }
          : chartData.type === "line"
          ? {
              type: "scatter",
              mode: "lines",
              x: chartData.labels,
              y: chartData.values,
            }
          : chartData.type === "area"
          ? {
              type: "scatter",
              mode: "lines",
              fill: "tozeroy",
              x: chartData.labels,
              y: chartData.values,
            }
          : chartData.type === "horizontal-bar"
          ? {
              type: "bar",
              orientation: "h",
              x: chartData.values,
              y: chartData.labels,
            }
          : {
              type: "bar",
              x: chartData.labels,
              y: chartData.values,
            },
      ]}
      
      layout={{
  title: chartData.title || "Gráfico generado por AI",
  paper_bgcolor: "#0d0d0d",
  font: { color: "#fff" },
  margin: { t: 40, l: 40, r: 20, b: 40 },
  height: 320,
  ...(chartData.type === "radar"
    ? {
        polar: {
          radialaxis: {
            visible: true,
            range: [0, Math.max(...chartData.values) * 1.2],
          },
        },
        showlegend: false,
      }
    : {}),
}}

      config={{ responsive: true }}
    />
  </Box>
)}

{tokenInfo && (

              
                    <Text mt={2} fontSize="sm" color="gray.400">
                      🔢 prompt:{tokenInfo.prompt_tokens ?? "?"} • compl:{tokenInfo.completion_tokens ?? "?"} • total:{tokenInfo.total_tokens ?? "?"}<br/>
                      🧮 ahora:{tokenInfo.nowTok} • 31d:{tokenInfo.projTok}
                    </Text>
                  )}
                </motion.div>
              )}
            </Box>

            {/* Input */}
            <Box className="ai-chat-input-area" px={{ base: 3, md: 4 }} py={4}>
            <HStack spacing={2} flexWrap="wrap">
              <Box maxH="150px" overflowY="auto" border="1px solid #333" borderRadius="md" p={2} w="100%">
  <CheckboxGroup value={selectedDates} onChange={setSelectedDates}>
    <Stack spacing={1}>
      {allDates.map(d => (
        <Checkbox key={d} value={d} color="white" _checked={{ color: "cyan.300" }}>{d}</Checkbox>

      ))}
    </Stack>
  </CheckboxGroup>
</Box>

                <Select
                  size="sm"
                  placeholder="Tipo"
                  value={selectedType}
                  onChange={e => setSelectedType(e.target.value)}
                  className="ai-select"
                >
                  {allTypes.map(t => <option key={t}>{t}</option>)}
                </Select>
              </HStack>

              <Textarea
                size="sm"
                placeholder="Pregunta…"
                value={input}
                onChange={e => setInput(e.target.value)}
                className="ai-textarea"
                mt={2}
              />

              <HStack mt={2} spacing={2}>
              <Button
  size="sm"
  className="ai-btn-primary"
  onClick={handleSingle}
  isDisabled={selectedDates.length === 0}
  isLoading={loading}
  loadingText="…"
  flex="1"
>
  Generate
</Button>

                
              </HStack>
            </Box>
          </DrawerBody>
        </DrawerContent>
      </Drawer>
    </>
  );
};

export default AiChat;
