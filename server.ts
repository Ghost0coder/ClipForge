import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

app.use(express.json({ limit: '50mb' }));

// Initialize Google GenAI client
const apiKey = process.env.GEMINI_API_KEY;
let ai: GoogleGenAI | null = null;
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
  } catch (error: any) {
    console.error('script-to-video error:', error);
    res.status(500).json({ error: error?.message || 'Failed to generate video script' });
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

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) {
      return res.status(500).json({ error: 'No audio returned from Gemini TTS' });
    }

    res.json({
      audioBase64: base64Audio,
      mimeType: 'audio/wav',
    });
  } catch (error: any) {
    console.error('tts error:', error);
    res.status(500).json({ error: error?.message || 'TTS generation failed' });
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
  } catch (error: any) {
    console.error('auto-captions error:', error);
    res.status(500).json({ error: error?.message || 'Auto captions failed' });
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
  } catch (error: any) {
    console.error('smart-cut error:', error);
    res.status(500).json({ error: error?.message || 'Smart cut failed' });
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
          aspectRatio: aspectRatio as any,
        },
      },
    });

    let imageData = null;
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        imageData = `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
        break;
      }
    }

    if (!imageData) {
      return res.status(500).json({ error: 'No image data returned from Gemini' });
    }

    res.json({ imageUrl: imageData });
  } catch (error: any) {
    console.error('generate-overlay error:', error);
    res.status(500).json({ error: error?.message || 'Failed to generate overlay image' });
  }
});

// Vite middleware in dev or static files in production
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`ClipForge Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
