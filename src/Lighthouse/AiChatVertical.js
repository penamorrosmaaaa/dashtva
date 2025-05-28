import React, { useState } from 'react';
import {
  Box, VStack, Button, Textarea, useToast, Text
} from '@chakra-ui/react';

const AiChatVertical = ({ companyPerformance, groupScores, topPerformers, bottomPerformers, mostImproved, mostDeclined }) => {
  const [prompt, setPrompt] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const toast = useToast();
  const OPENAI_KEY = process.env.REACT_APP_OPENAI_KEY;

  const generatePrompt = () => {
    return `
Use the following data to generate a detailed analysis in bullet points with actionable insights and director-level language:

📊 Group Scores:
- Azteca: ${groupScores.azteca} (${groupScores.aztecaChange >= 0 ? "+" : ""}${groupScores.aztecaChange}%)
- Competition: ${groupScores.competition} (${groupScores.competitionChange >= 0 ? "+" : ""}${groupScores.competitionChange}%)
- Difference: ${groupScores.difference}

🏆 Top Performer: ${topPerformers[0]?.name} (${topPerformers[0]?.score})
📈 Most Improved: ${mostImproved[0]?.name} (${mostImproved[0]?.change}%)
📉 Declined: ${mostDeclined[0]?.name} (${mostDeclined[0]?.change}%)

🔍 Company Performance:
${companyPerformance.map(c => `- ${c.name}: ${c.score} (${c.change}%)`).join('\n')}
    `;
  };

  const handleSend = async () => {
    setLoading(true);
    setResponse('');

    try {
      const finalPrompt = generatePrompt();
      setPrompt(finalPrompt);

      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${OPENAI_KEY}`,          
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4',
          messages: [
            { role: 'system', content: 'You are a business analyst.' },
            { role: 'user', content: finalPrompt }
          ],
          temperature: 0.7,
        }),
      });

      const data = await res.json();
      const text = data.choices?.[0]?.message?.content;
      setResponse(text || 'No response.');
    } catch (err) {
      console.error(err);
      toast({
        title: 'Error generating analysis',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <VStack align="start" spacing={4} w="100%" maxW="1000px" mt={10} p={4} bg="rgba(255,255,255,0.05)" borderRadius="md">
      <Button colorScheme="teal" onClick={handleSend} isLoading={loading}>
        Generate AI Analysis
      </Button>
      {response && (
        <Box w="100%">
          <Text fontWeight="bold" color="cyan.300" mb={2}>AI Response:</Text>
          <Textarea value={response} isReadOnly size="sm" borderColor="whiteAlpha.300" minHeight="200px" />
        </Box>
      )}
    </VStack>
  );
};

export default AiChatVertical;
