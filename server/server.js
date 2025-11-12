// server/server.js
require('dotenv').config(); // load .env locally (ignored by git)
const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
// In production, replace '*' with your frontend domain, e.g. 'https://yourdomain.com'
app.use(cors()); 
app.use(express.json());
app.use(express.static('public'));

// Gemini configuration
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'MuseMind backend is running with Gemini API!',
    timestamp: new Date().toISOString()
  });
});

// Serve homepage
app.get('/', (req, res) => {
  res.sendFile('index.html', { root: 'public' });
});

// Main poem generation endpoint
app.post('/api/generate-poem', async (req, res) => {
  try {
    const { userInput, theme } = req.body;

    if (!userInput || userInput.trim().length === 0) {
      return res.status(400).json({ error: 'Please provide your feelings or thoughts to generate a poem.' });
    }

    if (!GEMINI_API_KEY) {
      console.error('ERROR: GEMINI_API_KEY not found in environment!');
      return res.status(500).json({ error: 'Server configuration error. Please contact support.' });
    }

    const prompt = buildPrompt(userInput, theme);

    const payload = {
      contents: [
        {
          parts: [
            { text: prompt }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.9,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 1024
      }
    };

    const response = await axios.post(
      `${GEMINI_BASE_URL}?key=${encodeURIComponent(GEMINI_API_KEY)}`,
      payload,
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 30000
      }
    );

    // Defensive extraction of generated text
    let generatedPoem = '';
    if (
      response.data &&
      response.data.candidates &&
      response.data.candidates[0] &&
      response.data.candidates[0].content &&
      response.data.candidates[0].content.parts &&
      response.data.candidates[0].content.parts[0]
    ) {
      generatedPoem = response.data.candidates[0].content.parts[0].text;
    } else {
      throw new Error('Unexpected response format from Gemini API');
    }

    generatedPoem = cleanPoem(generatedPoem);

    return res.json({
      success: true,
      poem: generatedPoem,
      theme: theme,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error generating poem:', error?.message || error);

    if (error.response) {
      const status = error.response.status;
      if (status === 400) return res.status(400).json({ error: 'Invalid request to AI service. Please try a different prompt.' });
      if (status === 401 || status === 403) return res.status(500).json({ error: 'Authentication failed. Please check server configuration.' });
      if (status === 429) return res.status(429).json({ error: 'Too many requests. Please wait and try again.' });
      if (status === 503) return res.status(503).json({ error: 'AI service temporarily unavailable. Try again later.' });
      return res.status(500).json({ error: 'Failed to generate poem. Please try again.' });
    } else if (error.code === 'ECONNABORTED') {
      return res.status(504).json({ error: 'Request timed out. Please try again with a shorter prompt.' });
    } else {
      return res.status(500).json({ error: 'An unexpected error occurred. Please try again.' });
    }
  }
});

// Helper: build themed prompt
function buildPrompt(userInput, theme) {
  const themeContexts = {
    lovelines: `You are a romantic poet. Write a beautiful, heartfelt love poem (exactly 5 lines) about: ${userInput}

Requirements:
- Make it sweet, emotional, and expressive
- Focus on feelings of love, affection, and tenderness
- Use romantic and poetic language
- Keep it to exactly 5 lines
- Don't include a title
- Make each line flow naturally

Write the poem now:`,
    moodverse: `You are an emotional poet. Write a deeply emotional poem (exactly 5 lines) that captures these feelings: ${userInput}

Requirements:
- Reflect the mood authentically and powerfully
- Whether joyful, melancholic, anxious, or peaceful - capture it fully
- Use vivid, evocative language
- Keep it to exactly 5 lines
- Don't include a title
- Make each line meaningful

Write the poem now:`,
    soulscript: `You are an inspirational poet. Write an uplifting, reflective affirmation poem (exactly 5 lines) about: ${userInput}

Requirements:
- Make it inspiring, motivational, and soul-nourishing
- Focus on inner strength, personal growth, and positivity
- Use empowering and affirming language
- Keep it to exactly 5 lines
- Don't include a title
- Make each line resonate

Write the poem now:`
  };

  return themeContexts[theme] || themeContexts['moodverse'];
}

// Helper: clean generated poem
function cleanPoem(text) {
  text = (text || '').trim();
  text = text.replace(/\*\*/g, '').replace(/\*/g, '');
  text = text.replace(/^(Here's|Here is|Here's a|Here is a).*?:\s*/i, '');
  text = text.replace(/^(Title|Poem):.*?\n/gi, '');
  let lines = text.split('\n').filter(line => line.trim().length > 0);
  if (lines.length > 6) lines = lines.slice(0, 5);
  text = lines.join('\n');
  return text.trim();
}

// 404 handler (must be after routes)
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found. Use POST /api/generate-poem to generate poems.' });
});

// Start server
const port = process.env.PORT || PORT;
app.listen(port, () => {
  console.log('╔═══════════════════════════════════════╗');
  console.log('║     MuseMind Backend Server          ║');
  console.log('║        (Powered by Gemini AI)        ║');
  console.log('╚═══════════════════════════════════════╝');
  console.log(`✅ Server running on http://localhost:${port}`);
  console.log(`✅ Health check: http://localhost:${port}/api/health`);
  console.log(`✅ API endpoint: POST http://localhost:${port}/api/generate-poem`);
  console.log('\n📝 Press Ctrl+C to stop the server\n');
});
