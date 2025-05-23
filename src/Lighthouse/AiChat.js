import React, { useState, useEffect, useRef } from "react";
import {
  Box, Textarea, Button, VStack, Text, Select, useToast, HStack,
  IconButton, Drawer, DrawerOverlay, DrawerContent, DrawerHeader,
  DrawerBody, useDisclosure, Flex, Badge, Divider
} from "@chakra-ui/react";
import { FiZap, FiX, FiMaximize2, FiMinimize2, FiSend, FiFilter, FiRefreshCw } from "react-icons/fi";
import { motion } from "framer-motion";
import "./AiChatWhoop.css";
import { Checkbox, CheckboxGroup, Stack } from "@chakra-ui/react";
import Plot from "react-plotly.js";
import { format, parseISO, startOfWeek, startOfMonth } from "date-fns";

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

// Enhanced color palette for TV Azteca
const CHART_COLORS = {
  azteca: ['#ff6b35', '#f72585', '#7209b7', '#560bad', '#480ca8', '#3a0ca3'],
  competition: ['#00f5ff', '#00bbf9', '#0077b6', '#005f73', '#0a9396', '#94d2bd'],
  local: ['#f77f00', '#fcbf49', '#eae2b7', '#f4a261', '#e76f51', '#e63946'],
  general: ['#00f0ff', '#ff006e', '#fb5607', '#ffbe0b', '#8338ec', '#3a86ff']
};

/* ------------------------------------------------------------------ */
/*  FUNCIÓN QUE CREA EL CONTEXTO PARA OPENAI                           */
/* ------------------------------------------------------------------ */
const buildSystemContext = () => {
    return {
      role: "system",
      content: `
You are an AI performance analyst for TV Azteca, specializing in web performance metrics across media outlets. Your role is to provide actionable insights for improving digital performance.

**IMPORTANT VISUALIZATION RULES:**
- ALWAYS return chart data as a clean JSON object without markdown code blocks
- NEVER wrap chart JSON in triple backticks or code blocks
- The chart JSON should be directly parseable
- Include rich, detailed charts with proper titles and data
- Use appropriate chart types based on the data being analyzed

Here is the full context of the system you're working with:

📅 DAILY WORKFLOW
- Each day, the system extracts up to 10 new URLs of each content type (nota, video, img) for each media outlet.
- These URLs are extracted from sitemap.xml, .txt, or RSS feeds using robust retry logic.
- The system avoids duplicate URLs within the same day.

🏷️ TYPES OF CONTENT
- **nota**: Standard articles (news stories, written content)
- **video**: Video-based content (video articles, streaming content)
- **img**: Image galleries (photo stories, visual content)

📊 METRICS (Lighthouse Performance Scores)
- **Score**: Overall performance score (0-100) - Higher is better
- **CLS**: Cumulative Layout Shift - Visual stability (Lower is better)
- **LCP**: Largest Contentful Paint - Loading performance (Lower is better)
- **SI**: Speed Index - How quickly content loads (Lower is better)
- **TBT**: Total Blocking Time - Interactivity (Lower is better)
- **FCP**: First Contentful Paint - Initial render time (Lower is better)

🏢 COMPANY GROUPS

1. 🟣 **TV Azteca Main Brands** (Our primary channels)
   - Azteca 7, Azteca UNO, ADN40, Deportes, A+, Noticias

2. 🟡 **TV Azteca Local Brands** (Regional presence)
   - Quintana Roo, Bajío, Ciudad Juárez, Yúcatan, Jalisco, Puebla, Veracruz, 
   - Baja California, Morelos, Guerrero, Chiapas, Sinaloa, Aguascalientes, 
   - Queretaro, Chihuahua, Laguna

3. 🔴 **Competition** (Benchmark targets)
   - Heraldo, Televisa, Milenio, Universal, As, Infobae, NYTimes, Terra

4. 🖼️ **Image Brands** (Visual content specialists)
   - IMG.AZTECA7, IMG.AZTECAUNO, IMG.AZTECANOTICIAS

📈 ANALYSIS APPROACH
- Focus on TV Azteca's performance relative to competitors
- Identify specific areas for improvement with actionable recommendations
- Highlight wins and opportunities
- Provide technical insights that engineering teams can act on

🎯 YOUR ROLE
As TV Azteca's AI performance coach:
- Be direct and actionable in your insights
- Focus on what TV Azteca can improve
- Benchmark against competition to show where we stand
- Provide specific technical recommendations
- Celebrate wins but always look for optimization opportunities
- Keep responses professional but engaging
- When showing data, make it visually compelling

Remember: You're helping TV Azteca become the fastest media platform in Mexico!
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
  const [analysisMode, setAnalysisMode] = useState("average");
  const [weeklyGroups, setWeeklyGroups] = useState({});
  const [monthlyGroups, setMonthlyGroups] = useState({});

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
  const groupDatesBy = (dates, mode) => {
    const grouped = {};
    dates.forEach(date => {
      const parsed = parseISO(date);
      const label =
        mode === "week"
          ? format(startOfWeek(parsed, { weekStartsOn: 1 }), "'Week of' MMM d")
          : format(startOfMonth(parsed), "MMMM yyyy");

      if (!grouped[label]) grouped[label] = [];
      grouped[label].push(date);
    });
    return grouped;
  };

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
    const sortedDates = Object.keys(agg).sort((a,b) => new Date(b) - new Date(a));
    setWeeklyGroups(groupDatesBy(sortedDates, "week"));
    setMonthlyGroups(groupDatesBy(sortedDates, "month"));

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

### PERFORMANCE DATA
${blocks.join("\n")}

### USER QUESTION
${input}

Focus on TV Azteca's performance and provide actionable insights.

**CRITICAL**: Return visualization data as a direct JSON object (not wrapped in markdown):
{
  "chart": {
    "type": "bar" | "line" | "radar" | "pie" | "scatter",
    "title": "Clear, descriptive title",
    "labels": ["Label1", "Label2", ...],
    "values": [value1, value2, ...],
    "datasets": [  // For multi-series charts
      {
        "name": "Series 1",
        "data": [...]  // Use 'data' instead of 'values' for datasets
      }
    ]
  }
}

Include 2-3 follow-up questions:
<!-- FOLLOW_UP -->
- How does TV Azteca compare to Televisa in video performance?
- Which local brand needs the most optimization?
- What's the trend for our main channels this week?
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

### CONTEXT
Average metrics for content type "${selectedType}" on dates: ${dateLabel}.
Each value represents the average across selected days for each outlet.

${lines}

### USER QUESTION
${input}

Focus on TV Azteca's performance. Provide specific, actionable insights.

**CRITICAL**: Return visualization data as a direct JSON object:
{
  "chart": {
    "type": "bar" | "line" | "radar" | "pie",
    "title": "Clear title focusing on TV Azteca",
    "labels": [...],
    "values": [...],
    "datasets": [  // For comparing multiple outlets
      {
        "name": "Outlet 1",
        "data": [...]  // Use 'data' for dataset values
      }
    ]
  }
}

Include follow-up questions:
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
          model: "gpt-4o-mini",
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

      // Extract chart JSON - improved parsing
      let chartMatch = content.match(/\{[\s\S]*?"chart"[\s\S]*?\}/);
      
      // If not found, try to find any JSON-like structure
      if (!chartMatch) {
        // Look for JSON that might be on multiple lines
        const jsonPattern = /\{\s*"chart"\s*:\s*\{[\s\S]*?\}\s*\}/;
        chartMatch = content.match(jsonPattern);
      }
      
      if (chartMatch) {
        try {
          // Clean the JSON string
          let chartJson = chartMatch[0];
          // Remove any potential line breaks or extra spaces
          chartJson = chartJson.replace(/\n/g, ' ').replace(/\s+/g, ' ');
          
          const parsed = JSON.parse(chartJson);
          if (parsed.chart) {
            chartData = parsed.chart;
            // Remove the JSON from the content completely
            content = content.replace(chartMatch[0], '').trim();
            
            // Also remove any lingering brackets
            content = content.replace(/^\s*\{\s*\}\s*$/gm, '').trim();
          }
        } catch (err) {
          console.warn("Failed to parse chart JSON:", err);
          // Try one more time with a more aggressive approach
          try {
            // Extract everything between first { and last }
            const startIdx = content.indexOf('{"chart"');
            if (startIdx !== -1) {
              let bracketCount = 0;
              let endIdx = startIdx;
              for (let i = startIdx; i < content.length; i++) {
                if (content[i] === '{') bracketCount++;
                if (content[i] === '}') bracketCount--;
                if (bracketCount === 0) {
                  endIdx = i;
                  break;
                }
              }
              const jsonStr = content.substring(startIdx, endIdx + 1);
              const parsed = JSON.parse(jsonStr);
              if (parsed.chart) {
                chartData = parsed.chart;
                content = content.replace(jsonStr, '').trim();
              }
            }
          } catch (finalErr) {
            console.error("Could not parse chart data:", finalErr);
          }
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

      // Add default follow-up questions if none were provided
      if (followUpQuestions.length === 0 && !loading) {
        setFollowUpQuestions([
          "How does TV Azteca compare to competitors today?",
          "Which content type performs best for our main channels?",
          "What are the top 3 improvements we should make?"
        ]);
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
        { role: "assistant", content: "Error al generar respuesta. Por favor, intenta de nuevo." }
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
        title:"Escribe una pregunta sobre el rendimiento", 
        status:"warning", 
        duration:3500, 
        isClosable:true 
      });
      return;
    }
    
    if (!analysis) {
      toast({ 
        title:"No hay datos de rendimiento disponibles", 
        status:"warning", 
        duration:3500, 
        isClosable:true 
      });
      return;
    }

    if (selectedDates.length > 0 && selectedType) {
      if (analysisMode === "average") {
        handleSingle();
      } else {
        handleTrend();
      }
    } else if (selectedDates.length > 0) {
      handleTrend();
    } else {
      // General question without filters
      askOpenAI(`
### PREGUNTA
${input}

Provide insights about TV Azteca's web performance monitoring system.
Focus on how we can improve our digital platforms.

Include follow-up questions:
<!-- FOLLOW_UP -->
- How can we improve our video content performance?
- What metrics should we focus on for better user experience?
- How do we compare to our main competitors?
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
  
    // Average the values
    Object.keys(combined).forEach(outlet => {
      METRICS.forEach(metric => {
        const { sum, count } = combined[outlet][metric] || {};
        combined[outlet][metric] = count ? +(sum / count).toFixed(2) : null;
      });
    });
  
    askOpenAI(buildSinglePrompt(combined, selectedDates.join(", ")));
  };

  const handleTrend = () => {
    const buildAggregatedPrompt = (groups, labelType) => {
      const groupedAverages = {};
  
      groups.forEach(([label, dates]) => {
        const combined = {};
        dates.forEach(date => {
          const daily = analysis?.[date];
          if (!daily) return;
  
          Object.entries(daily).forEach(([type, outlets]) => {
            Object.entries(outlets).forEach(([outlet, metrics]) => {
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
        });
  
        Object.keys(combined).forEach(outlet => {
          METRICS.forEach(metric => {
            const { sum, count } = combined[outlet][metric] || {};
            combined[outlet][metric] = count ? +(sum / count).toFixed(2) : null;
          });
        });
  
        groupedAverages[label] = combined;
      });
  
      const blocks = Object.entries(groupedAverages).map(([label, outlets]) => {
        const lines = Object.entries(outlets).map(([outlet, metrics]) => {
          const metricLine = METRICS.map(metric =>
            metrics[metric] !== null ? `${metric}: ${metrics[metric]}` : null
          ).filter(Boolean).join(", ");
          return metricLine ? `${outlet} — ${metricLine}` : null;
        }).filter(Boolean).join("\n");
  
        return `📅 ${label}${selectedType ? ` • ${selectedType}` : ""}\n${lines}`;
      });
  
      return `
### CONVERSATION HISTORY
${conversationHistory.map(msg => `${msg.role === 'user' ? 'USER' : 'AI'}: ${msg.content}`).join('\n')}
  
### PERFORMANCE COMPARISON BY ${labelType.toUpperCase()}
${blocks.join("\n")}
  
### USER QUESTION
${input}
  
Focus on TV Azteca's performance trends and improvements needed.

**CRITICAL**: Return visualization data as a direct JSON object:
{
  "chart": {
    "type": "line" | "bar",
    "title": "TV Azteca ${labelType} Performance",
    "labels": [...],
    "values": [...],
    "datasets": [  // For comparing multiple series
      {
        "name": "Series name",
        "data": [...]  // Use 'data' for dataset values
      }
    ]
  }
}
  
<!-- FOLLOW_UP -->
- Which TV Azteca channel improved the most?
- How do we compare to Televisa this ${labelType}?
- What specific optimizations should we prioritize?
`.trim();
    };
  
    // Check for weekly/monthly groupings
    const weeklyMatch = Object.entries(weeklyGroups).filter(([_, dates]) =>
      dates.every(d => selectedDates.includes(d))
    );
    const weeklyFlat = weeklyMatch.flatMap(([_, d]) => d);
    const isFullWeekly = weeklyFlat.length === selectedDates.length;
  
    const monthlyMatch = Object.entries(monthlyGroups).filter(([_, dates]) =>
      dates.every(d => selectedDates.includes(d))
    );
    const monthlyFlat = monthlyMatch.flatMap(([_, d]) => d);
    const isFullMonthly = monthlyFlat.length === selectedDates.length;
  
    if (isFullWeekly && weeklyMatch.length > 0) {
      askOpenAI(buildAggregatedPrompt(weeklyMatch, "semana"));
    } else if (isFullMonthly && monthlyMatch.length > 0) {
      askOpenAI(buildAggregatedPrompt(monthlyMatch, "mes"));
    } else {
      askOpenAI(buildTrendPrompt());
    }
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
    toast({
      title: "Conversación limpiada",
      status: "success",
      duration: 2000,
      isClosable: true
    });
  };

  /* ------------------------------------------------------------------ */
  /*  UI COMPONENTS                                                     */
  /* ------------------------------------------------------------------ */
  const renderChart = (chartData) => {
    if (!chartData) return null;

    // Determine color scheme based on content
    let colors = CHART_COLORS.general;
    if (chartData.title?.toLowerCase().includes('azteca')) {
      colors = CHART_COLORS.azteca;
    } else if (chartData.labels?.some(l => COMPETITION_COMPANIES.includes(l))) {
      colors = CHART_COLORS.competition;
    }

    const chartConfig = {
      data: [],
      layout: {
        title: {
          text: chartData.title || "Performance Analysis",
          font: { color: '#fff', size: 16, family: 'Arial, sans-serif' }
        },
        paper_bgcolor: "#0d0d0d",
        plot_bgcolor: "#0d0d0d",
        font: { color: "#fff", size: 12 },
        margin: { t: 50, l: 50, r: 30, b: 50 },
        height: 320,
        showlegend: chartData.datasets ? true : false,
        legend: {
          orientation: "h",
          y: -0.2,
          font: { size: 10 }
        },
        xaxis: { 
          gridcolor: '#333',
          tickfont: { size: 11 }
        },
        yaxis: { 
          gridcolor: '#333',
          tickfont: { size: 11 }
        }
      },
      config: { 
        responsive: true,
        displayModeBar: false
      }
    };

    // Handle multi-series data with datasets
    if (chartData.datasets && Array.isArray(chartData.datasets)) {
      chartData.datasets.forEach((dataset, idx) => {
        const trace = {
          name: dataset.name || dataset.label, // Support both 'name' and 'label'
          x: chartData.labels,
          y: dataset.values || dataset.data, // Support both 'values' and 'data'
          type: chartData.type === 'line' ? 'scatter' : chartData.type,
          mode: chartData.type === 'line' ? 'lines+markers' : undefined,
          marker: { 
            color: colors[idx % colors.length],
            size: 8
          },
          line: chartData.type === 'line' ? {
            color: colors[idx % colors.length],
            width: 2
          } : undefined
        };
        chartConfig.data.push(trace);
      });
    } else {
      // Single series data
      const trace = {
        type: chartData.type === 'line' ? 'scatter' : chartData.type,
        mode: chartData.type === 'line' ? 'lines+markers' : undefined,
        x: chartData.type === 'pie' ? undefined : chartData.labels,
        y: chartData.type === 'pie' ? undefined : chartData.values,
        labels: chartData.type === 'pie' ? chartData.labels : undefined,
        values: chartData.type === 'pie' ? chartData.values : undefined,
        theta: chartData.type === 'radar' ? chartData.labels : undefined,
        r: chartData.type === 'radar' ? chartData.values : undefined,
        fill: chartData.type === 'radar' ? 'toself' : undefined,
        marker: { 
          color: chartData.type === 'pie' ? colors : colors[0],
          size: chartData.type === 'line' ? 8 : undefined
        },
        line: chartData.type === 'line' ? {
          color: colors[0],
          width: 2
        } : undefined,
        textfont: chartData.type === 'pie' ? { color: '#fff' } : undefined,
        hovertemplate: '%{label}: %{value}<extra></extra>'
      };
      chartConfig.data.push(trace);
    }

    // Special layout for radar charts
    if (chartData.type === 'radar') {
      chartConfig.layout.polar = {
        bgcolor: '#0d0d0d',
        radialaxis: {
          visible: true,
          gridcolor: '#333',
          range: [0, Math.max(...chartData.values) * 1.2],
        },
        angularaxis: { gridcolor: '#333' }
      };
    }

    return <Plot {...chartConfig} />;
  };

  const iconButton = (
    <IconButton
      aria-label="Abrir AI Performance Analyzer"
      icon={<FiZap size="22" />}
      onClick={onOpen}
      variant="ghost"
      color="#ff6b35"
      className={inline ? "ai-nav-icon cyber-nav-btn" : "ai-fab"}
      _hover={{ bg:"rgba(255,107,53,0.18)" }}
      _active={{ bg:"rgba(255,107,53,0.28)" }}
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
        blockScrollOnMount={false}
        preserveScrollBarGap={true}
      >
        <DrawerOverlay />
        <DrawerContent
          bg="#000000"
          color="white"
          maxW={isFullScreen ? "100%" : { base: "100%", md: "520px" }}
        >
          <DrawerHeader 
            borderBottom="1px solid #222" 
            display="flex" 
            alignItems="center"
            py={3}
            bg="#0a0a0a"
          >
            <Box flexGrow={1}>
              <Text fontSize="md" fontWeight="700" color="#ff6b35">
                TV AZTECA PERFORMANCE AI
              </Text>
              <Text fontSize="xs" color="gray.500">
                Analizador de rendimiento web
              </Text>
            </Box>
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
                  <Text color="gray.400" fontSize="lg" mb={2}>
                    ¡Hola! Soy tu asistente de rendimiento
                  </Text>
                  <Text color="gray.500" fontSize="sm">
                    Pregúntame sobre el rendimiento de TV Azteca vs la competencia
                  </Text>
                  <VStack mt={4} spacing={2}>
                    <Button
                      size="sm"
                      variant="outline"
                      borderColor="#333"
                      color="gray.300"
                      _hover={{ bg: "#1a1a1a", borderColor: "#ff6b35" }}
                      onClick={() => handleFollowUpClick("¿Cómo está el rendimiento de TV Azteca hoy?")}
                      fontSize="xs"
                    >
                      ¿Cómo está nuestro rendimiento hoy?
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      borderColor="#333"
                      color="gray.300"
                      _hover={{ bg: "#1a1a1a", borderColor: "#ff6b35" }}
                      onClick={() => handleFollowUpClick("Compara Azteca 7 vs Televisa en videos")}
                      fontSize="xs"
                    >
                      Azteca 7 vs Televisa en videos
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      borderColor="#333"
                      color="gray.300"
                      _hover={{ bg: "#1a1a1a", borderColor: "#ff6b35" }}
                      onClick={() => handleFollowUpClick("¿Qué canal necesita más optimización?")}
                      fontSize="xs"
                    >
                      ¿Qué canal necesita optimización?
                    </Button>
                  </VStack>
                </Box>
              )}
              
              {conversationHistory.map((msg, idx) => (
                <Box key={idx} mb={4}>
                  {msg.role === 'user' ? (
                    <Flex justify="flex-end">
                      <Box 
                        maxW="80%" 
                        bg="linear-gradient(135deg, #ff6b35 0%, #f72585 100%)" 
                        color="white" 
                        px={4} 
                        py={3} 
                        borderRadius="18px"
                        borderTopRightRadius="4px"
                        boxShadow="0 2px 8px rgba(255,107,53,0.3)"
                      >
                        <Text fontSize="sm">{msg.content}</Text>
                        <Text fontSize="xs" color="rgba(255,255,255,0.8)" mt={1} textAlign="right">
                          {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </Text>
                      </Box>
                    </Flex>
                  ) : (
                    <Flex justify="flex-start">
                      <Box maxW="85%">
                        <Flex align="center" mb={2}>
                          <Box 
                            w="28px" 
                            h="28px" 
                            borderRadius="full" 
                            bg="linear-gradient(135deg, #ff6b35 0%, #f72585 100%)" 
                            mr={2} 
                            display="flex"
                            alignItems="center"
                            justifyContent="center"
                          >
                            <FiZap size="14" color="white" />
                          </Box>
                          <Text fontSize="xs" color="gray.400" fontWeight="600">
                            TV Azteca AI
                          </Text>
                        </Flex>
                        <Box 
                          bg="#1a1a1a" 
                          px={4} 
                          py={3} 
                          borderRadius="18px"
                          borderTopLeftRadius="4px"
                          border="1px solid #2a2a2a"
                        >
                          <Text fontSize="sm" whiteSpace="pre-wrap">
                            {idx === conversationHistory.length - 1 && loading ? displayedText : msg.content}
                          </Text>
                          
                          {idx === conversationHistory.length - 1 && tokenInfo?.total_tokens && (
                            <HStack mt={2} spacing={3}>
                              <Badge colorScheme="purple" fontSize="xs">
                                {tokenInfo.total_tokens} tokens
                              </Badge>
                              <Text fontSize="xs" color="gray.500">
                                {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </Text>
                            </HStack>
                          )}
                          
                          {/* Render Chart */}
                          {msg.chartData && (
                            <Box mt={3} bg="#0d0d0d" borderRadius="md" p={2} border="1px solid #2a2a2a">
                              {renderChart(msg.chartData)}
                            </Box>
                          )}
                        </Box>

                        {/* Follow-up questions */}
                        {idx === conversationHistory.length - 1 && followUpQuestions.length > 0 && (
                          <VStack align="start" spacing={2} mt={3}>
                            <Text fontSize="xs" color="gray.400" fontWeight="600">
                              Sugerencias:
                            </Text>
                            {followUpQuestions.map((question, i) => (
                              <Button
                                key={i}
                                variant="outline"
                                size="sm"
                                borderColor="#333"
                                color="gray.300"
                                _hover={{ bg: "#1a1a1a", borderColor: "#ff6b35", color: "#ff6b35" }}
                                onClick={() => handleFollowUpClick(question)}
                                textAlign="left"
                                whiteSpace="normal"
                                height="auto"
                                py={2}
                                px={3}
                                fontSize="xs"
                                fontWeight="normal"
                                width="full"
                                justifyContent="flex-start"
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
                      <Box 
                        w="28px" 
                        h="28px" 
                        borderRadius="full" 
                        bg="linear-gradient(135deg, #ff6b35 0%, #f72585 100%)" 
                        mr={2}
                        display="flex"
                        alignItems="center"
                        justifyContent="center"
                      >
                        <FiZap size="14" color="white" />
                      </Box>
                      <Text fontSize="xs" color="gray.400" fontWeight="600">TV Azteca AI</Text>
                    </Flex>
                    <Box 
                      bg="#1a1a1a" 
                      px={4} 
                      py={3} 
                      borderRadius="18px" 
                      borderTopLeftRadius="4px"
                    >
                      <Text fontSize="sm" color="gray.400" fontStyle="italic">
                        Analizando datos de rendimiento
                        <span className="dot-1">.</span>
                        <span className="dot-2">.</span>
                        <span className="dot-3">.</span>
                      </Text>
                    </Box>
                  </Box>
                </Flex>
              )}
              <div ref={messagesEndRef} />
            </Box>

            {/* Filter Controls Toggle */}
            <Box px={4} borderTop="1px solid #222">
              <Button
                size="xs"
                variant="ghost"
                onClick={() => setShowControls(!showControls)}
                color="gray.400"
                _hover={{ color: "#ff6b35" }}
                fontSize="xs"
                leftIcon={<FiFilter />}
              >
                {showControls ? "Ocultar filtros" : "Mostrar filtros"}
              </Button>
            </Box>

            {/* Filter Controls */}
            {showControls && (
              <Box px={4} py={3} borderTop="1px solid #222" bg="#0a0a0a">
                <HStack spacing={2} mb={3} flexWrap="wrap">
                  <Text fontSize="xs" color="gray.400" fontWeight="600">Opciones:</Text>
                  
                  <Button
                    size="xs"
                    variant="ghost"
                    onClick={clearConversation}
                    color="red.400"
                    _hover={{ color: "red.300" }}
                    leftIcon={<FiRefreshCw size="12" />}
                  >
                    Limpiar chat
                  </Button>

                  <Divider orientation="vertical" h="20px" />

                  <Text fontSize="xs" color="gray.400">Modo:</Text>
                  <Button
                    size="xs"
                    variant={analysisMode === "average" ? "solid" : "outline"}
                    colorScheme="orange"
                    onClick={() => setAnalysisMode("average")}
                  >
                    Promedio
                  </Button>
                  <Button
                    size="xs"
                    variant={analysisMode === "individual" ? "solid" : "outline"}
                    colorScheme="orange"
                    onClick={() => setAnalysisMode("individual")}
                  >
                    Individual
                  </Button>
                </HStack>

                <HStack spacing={2} align="start">
                  {/* Date Selection */}
                  <Box flex="1" maxH="120px" overflowY="auto" border="1px solid #333" borderRadius="md" p={2} bg="#0d0d0d">
                    <Text fontSize="xs" color="gray.400" mb={2} fontWeight="600">
                      Seleccionar fechas:
                    </Text>
                    <CheckboxGroup value={selectedDates} onChange={setSelectedDates}>
                      <Stack spacing={1}>
                        {/* Weekly Groups */}
                        {Object.entries(weeklyGroups).map(([label, dates]) => (
                          <Box key={label}>
                            <Checkbox
                              size="sm"
                              colorScheme="orange"
                              isChecked={dates.every(d => selectedDates.includes(d))}
                              onChange={e => {
                                if (e.target.checked) {
                                  setSelectedDates(prev => Array.from(new Set([...prev, ...dates])));
                                } else {
                                  setSelectedDates(prev => prev.filter(d => !dates.includes(d)));
                                }
                              }}
                            >
                              <Text fontSize="xs" fontWeight="bold">{label}</Text>
                            </Checkbox>
                            <Stack pl={4} spacing={0}>
                              {dates.map(d => (
                                <Checkbox key={d} value={d} size="sm" colorScheme="orange">
                                  <Text fontSize="xs">{d}</Text>
                                </Checkbox>
                              ))}
                            </Stack>
                          </Box>
                        ))}

                        {/* Monthly Groups */}
                        {Object.entries(monthlyGroups).map(([label, dates]) => (
                          <Box key={label} mt={2}>
                            <Checkbox
                              size="sm"
                              colorScheme="purple"
                              isChecked={dates.every(d => selectedDates.includes(d))}
                              onChange={e => {
                                if (e.target.checked) {
                                  setSelectedDates(prev => Array.from(new Set([...prev, ...dates])));
                                } else {
                                  setSelectedDates(prev => prev.filter(d => !dates.includes(d)));
                                }
                              }}
                            >
                              <Text fontSize="xs" fontWeight="bold">{label}</Text>
                            </Checkbox>
                          </Box>
                        ))}
                      </Stack>
                    </CheckboxGroup>
                  </Box>

                  {/* Content Type Selection */}
                  <Box>
                    <Text fontSize="xs" color="gray.400" mb={1} fontWeight="600">
                      Tipo de contenido:
                    </Text>
                    <Select
                      size="sm"
                      placeholder="Todos"
                      value={selectedType}
                      onChange={e => setSelectedType(e.target.value)}
                      bg="#1a1a1a"
                      border="1px solid #333"
                      _hover={{ borderColor: "#ff6b35" }}
                      _focus={{ borderColor: "#ff6b35", boxShadow: "0 0 0 1px #ff6b35" }}
                      fontSize="xs"
                      width="140px"
                    >
                      <option value="nota">📝 Nota</option>
                      <option value="video">🎥 Video</option>
                      <option value="img">🖼️ Imagen</option>
                    </Select>
                  </Box>
                </HStack>
              </Box>
            )}

            {/* Input Area */}
            <Box px={4} py={3} borderTop="1px solid #222" bg="#0a0a0a">
              <HStack spacing={2}>
                <Textarea
                  size="sm"
                  placeholder="Pregunta sobre el rendimiento de TV Azteca..."
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
                  _hover={{ borderColor: "#ff6b35" }}
                  _focus={{ borderColor: "#ff6b35", boxShadow: "0 0 0 1px #ff6b35" }}
                  rows={1}
                  resize="none"
                  fontSize="sm"
                />
                <IconButton
                  icon={<FiSend />}
                  onClick={handleSend}
                  isLoading={loading}
                  bg="linear-gradient(135deg, #ff6b35 0%, #f72585 100%)"
                  color="white"
                  _hover={{ transform: "scale(1.05)" }}
                  _active={{ transform: "scale(0.95)" }}
                  size="sm"
                  borderRadius="full"
                  aria-label="Send"
                  boxShadow="0 2px 8px rgba(255,107,53,0.4)"
                />
              </HStack>
              
              {selectedDates.length > 0 && (
                <HStack mt={2} spacing={2} flexWrap="wrap">
                  <Badge colorScheme="orange" fontSize="xs">
                    {selectedDates.length} fecha{selectedDates.length > 1 ? 's' : ''}
                  </Badge>
                  {selectedType && (
                    <Badge colorScheme="purple" fontSize="xs">
                      {selectedType === 'nota' ? '📝 Nota' : selectedType === 'video' ? '🎥 Video' : '🖼️ Imagen'}
                    </Badge>
                  )}
                </HStack>
              )}
            </Box>
          </DrawerBody>
        </DrawerContent>
      </Drawer>
    </>
  );
};

export default AiChat;