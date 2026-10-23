 function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }import express from 'express';
import http from 'http';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Parse port: dev server must bind to port 3000 (port 8080 is reserved for nginx reverse proxy)
function resolvePort() {
  const portArgIdx = process.argv.indexOf('--port');
  if (portArgIdx !== -1 && process.argv[portArgIdx + 1]) {
    const p = parseInt(process.argv[portArgIdx + 1], 10);
    if (!isNaN(p)) return p;
  }
  if (process.env.APP_PORT) {
    const p = parseInt(process.env.APP_PORT, 10);
    if (!isNaN(p)) return p;
  }
  // Cloud Run / container sets PORT=8080 for nginx ingress; backend app must use 3000
  if (process.env.PORT && process.env.PORT !== '8080') {
    const p = parseInt(process.env.PORT, 10);
    if (!isNaN(p)) return p;
  }
  return 3000;
}

const PORT = resolvePort();

app.use(express.json({ limit: '50mb' }));

// Initialize Google GenAI client
const apiKey = process.env.GEMINI_API_KEY;
let ai = null;
if (apiKey) {
  ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// AI Endpoints
app.post('/api/ai/script-to-video', async (req, res) => {
  try {
    if (!ai) {
      return res.status(503).json({ error: 'Gemini API key is not configured.' });
    }
    const { prompt, duration = 15, style = 'dynamic', aspectRatio = '16:9' } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const systemPrompt = `You are an expert video director and CapCut video editor.
Given a topic or script, create a structured video scene breakdown for a ${duration}-second video in ${aspectRatio} aspect ratio with a "${style}" editing vibe.
Return a valid JSON object with:
{
  "projectTitle": string,
  "themeColor": string (hex code e.g. #8b5cf6),
  "musicGenre": string,
  "scenes": [
    {
      "id": string,
      "startTime": number (seconds),
      "duration": number (seconds),
      "headline": string,
      "subtext": string,
      "visualDescription": string,
      "suggestedFilter": string (e.g., 'cinematic' | 'vintage' | 'cyberpunk' | 'warm' | 'cool' | 'dramatic'),
      "suggestedTransition": string (e.g., 'fade' | 'zoom' | 'slide' | 'glitch' | 'dissolve'),
      "stickerEmoji": string,
      "voiceoverScript": string
    }
  ]
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: 'application/json',
      },
    });

    const jsonText = response.text || '{}';
    const parsed = JSON.parse(jsonText);
    res.json(parsed);
  } catch (error) {
    console.error('script-to-video error:', error);
    res.status(500).json({ error: _optionalChain([error, 'optionalAccess', _ => _.message]) || 'Failed to generate video script' });
  }
});

app.post('/api/ai/tts', async (req, res) => {
  try {
    if (!ai) {
      return res.status(503).json({ error: 'Gemini API key is not configured.' });
    }
    const { text, voice = 'Kore', style = 'Friendly, clear creator voiceover' } = req.body;
    if (!text) {
      return res.status(400).json({ error: 'Text is required for TTS' });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash-lite-tts',
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: String(text).slice(0, 800),
              speechMetadata: {
                style,
              },
            },
          ],
        },
      ],
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voice },
          },
        },
      },
    });

    const base64Audio = _optionalChain([response, 'access', _2 => _2.candidates, 'optionalAccess', _3 => _3[0], 'optionalAccess', _4 => _4.content, 'optionalAccess', _5 => _5.parts, 'optionalAccess', _6 => _6[0], 'optionalAccess', _7 => _7.inlineData, 'optionalAccess', _8 => _8.data]);
    if (!base64Audio) {
      return res.status(500).json({ error: 'No audio returned from Gemini TTS' });
    }

    res.json({
      audioBase64: base64Audio,
      mimeType: 'audio/wav',
    });
  } catch (error) {
    console.error('tts error:', error);
    res.status(500).json({ error: _optionalChain([error, 'optionalAccess', _9 => _9.message]) || 'TTS generation failed' });
  }
});

app.post('/api/ai/auto-captions', async (req, res) => {
  try {
    if (!ai) {
      return res.status(503).json({ error: 'Gemini API key is not configured.' });
    }
    const { text, audioBase64, language = 'en' } = req.body;

    if (audioBase64) {
      const response = await ai.models.generateContent({
        model: 'gemini-3.5-transcribe',
        contents: {
          parts: [
            {
              inlineData: {
                mimeType: 'audio/mp3',
                data: audioBase64,
              },
            },
            {
              text: `Transcribe this audio and generate timestamped subtitle segments for video captions in JSON format:
              {
                "captions": [
                  { "start": number (seconds), "end": number (seconds), "text": string }
                ]
              }`,
            },
          ],
        },
        config: {
          responseMimeType: 'application/json',
        },
      });
      const parsed = JSON.parse(response.text || '{"captions":[]}');
      return res.json(parsed);
    }

    // If providing raw text to segment into rhythmic punchy TikTok/Reels captions
    if (text) {
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: `Split the following spoken transcript into punchy, synchronized short video caption segments (approx 1-3 seconds each, 2-5 words per caption):
        Transcript: "${text}"
        Return JSON:
        {
          "captions": [
            { "start": number (seconds from 0), "end": number (seconds), "text": string }
          ]
        }`,
        config: {
          responseMimeType: 'application/json',
        },
      });
      const parsed = JSON.parse(response.text || '{"captions":[]}');
      return res.json(parsed);
    }

    res.status(400).json({ error: 'Either text or audioBase64 must be provided' });
  } catch (error) {
    console.error('auto-captions error:', error);
    res.status(500).json({ error: _optionalChain([error, 'optionalAccess', _10 => _10.message]) || 'Auto captions failed' });
  }
});

app.post('/api/ai/smart-highlights', async (req, res) => {
  try {
    if (!ai) {
      return res.status(503).json({ error: 'Gemini API key is not configured.' });
    }
    const { clipName = 'Video Clip', duration = 60, context = '' } = req.body;
    const clipDur = Math.max(5, parseFloat(duration) || 60);
    const targetHighlightDuration = Math.min(clipDur, Math.max(15, Math.min(30, Math.round(clipDur * 0.4))));

    const prompt = `You are an expert viral video editor and content strategist.
Given a video clip titled "${clipName}" with total length ${clipDur.toFixed(1)} seconds (context: "${context || 'entertainment/vlog/story'}").
Find the single most engaging and viral 15-30 second segment (target duration: ${targetHighlightDuration}s) that has the strongest hook, emotion, or key takeaway.
Return JSON:
{
  "start": number (start time in seconds between 0 and ${(clipDur - targetHighlightDuration).toFixed(1)}),
  "duration": number (duration in seconds between 15 and 30, max ${clipDur}),
  "title": string (punchy highlight title),
  "hookText": string (suggested text overlay for the hook),
  "reason": string (why this is the best retention moment)
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    const start = Math.max(0, Math.min(clipDur - 5, parseFloat(parsed.start) || 0));
    const finalDuration = Math.min(clipDur - start, parseFloat(parsed.duration) || targetHighlightDuration);

    res.json({
      start: Math.round(start * 10) / 10,
      duration: Math.round(finalDuration * 10) / 10,
      title: parsed.title || 'Viral Peak Moment',
      hookText: parsed.hookText || 'Watch this!',
      reason: parsed.reason || 'Optimal viewer retention section',
    });
  } catch (error) {
    console.error('smart-highlights error:', error);
    res.status(500).json({ error: error?.message || 'Failed to detect smart highlights' });
  }
});

app.post('/api/ai/translate-captions', async (req, res) => {
  try {
    if (!ai) {
      return res.status(503).json({ error: 'Gemini API key is not configured.' });
    }
    const { captions = [], targetLanguage = 'Spanish' } = req.body;
    if (!Array.isArray(captions) || captions.length === 0) {
      return res.status(400).json({ error: 'No captions provided for translation' });
    }

    const prompt = `You are a professional subtitle translator and localizer.
Translate each caption line into ${targetLanguage}. Keep the translations punchy, natural, and formatted for video captions (TikTok / Reels style).
Preserve the exact start time and duration for each subtitle entry.
Source captions:
${JSON.stringify(captions.map((c) => ({ id: c.id, text: c.text, start: c.start, duration: c.duration })))}

Return JSON:
{
  "translatedCaptions": [
    {
      "id": string (match source id),
      "text": string (translated subtitle text),
      "start": number,
      "duration": number
    }
  ]
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const parsed = JSON.parse(response.text || '{"translatedCaptions":[]}');
    res.json(parsed);
  } catch (error) {
    console.error('translate-captions error:', error);
    res.status(500).json({ error: error?.message || 'Failed to translate captions' });
  }
});

app.post('/api/ai/smart-cut', async (req, res) => {
  try {
    if (!ai) {
      return res.status(503).json({ error: 'Gemini API key is not configured.' });
    }
    const { transcript, videoDuration = 30 } = req.body;
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: `Given this video transcript of total duration ${videoDuration}s:
      "${transcript || 'General conversational clip'}"
      Identify the highlight retention segments and identify filler / silence cuts.
      Return JSON:
      {
        "highlights": [
          { "start": number, "end": number, "reason": string }
        ],
        "suggestedCuts": [
          { "start": number, "end": number, "reason": string }
        ]
      }`,
      config: {
        responseMimeType: 'application/json',
      },
    });
    const parsed = JSON.parse(response.text || '{}');
    res.json(parsed);
  } catch (error) {
    console.error('smart-cut error:', error);
    res.status(500).json({ error: _optionalChain([error, 'optionalAccess', _11 => _11.message]) || 'Smart cut failed' });
  }
});

app.post('/api/ai/generate-overlay', async (req, res) => {
  try {
    if (!ai) {
      return res.status(503).json({ error: 'Gemini API key is not configured.' });
    }
    const { prompt, aspectRatio = '1:1' } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite-image',
      contents: {
        parts: [
          {
            text: `High quality graphic overlay, sticker, badge or transparent background element for video: ${prompt}. Clean borders, vivid colors.`,
          },
        ],
      },
      config: {
        imageConfig: {
          aspectRatio: aspectRatio ,
        },
      },
    });

    let imageData = null;
    for (const part of _optionalChain([response, 'access', _12 => _12.candidates, 'optionalAccess', _13 => _13[0], 'optionalAccess', _14 => _14.content, 'optionalAccess', _15 => _15.parts]) || []) {
      if (part.inlineData) {
        imageData = `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
        break;
      }
    }

    if (!imageData) {
      return res.status(500).json({ error: 'No image data returned from Gemini' });
    }

    res.json({ imageUrl: imageData });
  } catch (error) {
    console.error('generate-overlay error:', error);
    res.status(500).json({ error: _optionalChain([error, 'optionalAccess', _16 => _16.message]) || 'Failed to generate overlay image' });
  }
});

// Vite middleware in dev or static files in production
async function startServer() {
  const server = http.createServer(app);

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`[Server] Port ${PORT} is already in use.`);
    } else {
      console.error('[Server] Unexpected server error:', err);
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    try {
      globalThis.__dirname = path.resolve(__dirname, 'node_modules/vite-plugin-pwa/dist');
      // AI Studio environment disables HMR; disable Vite WS server to prevent disconnect errors
      const vite = await createViteServer({
        server: {
          middlewareMode: true,
          hmr: false,
        },
        appType: 'spa',
      });
      app.use(vite.middlewares);
    } catch (viteErr) {
      console.error('[Server] Failed to initialize Vite middleware:', viteErr);
    }
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`ClipForge Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
