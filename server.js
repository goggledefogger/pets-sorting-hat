import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';
import multer from 'multer';
import fs from 'fs';

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

// Configure Multer for memory storage (handling image uploads)
const upload = multer({ storage: multer.memoryStorage() });

app.use(cors());
app.use(express.json());

// --- Audio Cache for Static Phrases ---
// These phrases are used often and don't change, so we pre-generate them
const audioCache = new Map();
const STATIC_PHRASES = [
  // Intro/Navigation phrases
  "First, let me get a good look at you...",
  "Hmm, interesting appearance. Now, tell me about your personality.",
  // Thinking phrases
  "Hmm... let me see...",
  "Analyzing the aura...",
  "Interesting features...",
  "Digging into the soul...",
  // Fallback phrases
  "Welcome to the Hogwarts Pet Sorting Ceremony!"
];

// Convert raw PCM audio data to WAV format
// Gemini TTS returns raw PCM (Linear16, 24kHz, mono) which browsers can't play directly
function pcmToWav(pcmData, sampleRate = 24000, numChannels = 1, bitsPerSample = 16) {
  const byteRate = sampleRate * numChannels * bitsPerSample / 8;
  const blockAlign = numChannels * bitsPerSample / 8;
  const dataSize = pcmData.length;
  const headerSize = 44;
  const totalSize = headerSize + dataSize;

  const buffer = Buffer.alloc(totalSize);

  // RIFF header
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(totalSize - 8, 4); // File size minus RIFF header
  buffer.write('WAVE', 8);

  // fmt  subchunk
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16); // Subchunk1Size (16 for PCM)
  buffer.writeUInt16LE(1, 20); // AudioFormat (1 = PCM)
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(bitsPerSample, 34);

  // data subchunk
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  // Copy PCM data after header
  pcmData.copy(buffer, headerSize);

  return buffer;
}

// Sorting Hat TTS Voice Configuration for Gemini 2.5 Flash TTS
const SORTING_HAT_TTS_PROMPT = `# AUDIO PROFILE: The Sorting Hat
## Ancient, Theatrical Wizard Artifact

## THE SCENE
A grand candlelit hall at Hogwarts. The ancient Sorting Hat sits atop a creature's head, reading their very soul. The atmosphere is magical, suspenseful, and slightly whimsical.

### DIRECTOR'S NOTES
Style:
- Theatrical and dramatic with a heart of gold
- Dry British wit, slightly pompous but warm
- Build suspense naturally, savoring each revelation
- "Vocal smile" when amused, gravitas when pronouncing judgment
- Deep, resonant voice befitting a 1,000-year-old magical artifact

Pacing:
- Deliberate and unhurried for observations ("Hmm... most curious...")
- Quicken with excitement during discoveries
- Slow, dramatic pause before revealing the house name
- Crescendo to a powerful, triumphant proclamation for house announcements (GRYFFINDOR!, SLYTHERIN!, etc.)

Accent: Refined British, ancient and timeless

#### TRANSCRIPT
`;

// Generate TTS audio using Gemini 2.5 Flash TTS with retry logic
async function generateGeminiTTS(text, genAI, retryCount = 0) {
  const MAX_RETRIES = 3;
  const RETRY_DELAY_MS = 5000; // 5 seconds base delay

  try {
    // Clean up any markup tags from the text (they were for SSML, not needed now)
    const cleanText = text
      .replace(/\[sigh\]/gi, '*sighs thoughtfully*')
      .replace(/\[chuckle\]/gi, '*chuckles*')
      .replace(/\[pause\]/gi, '...')
      .replace(/\[short pause\]/gi, '...')
      .replace(/\[uhm\]/gi, 'um')
      .replace(/\[slowly\]/gi, '')
      .replace(/\[excited\]/gi, '')
      .replace(/\[whisper\]/gi, '')
      .replace(/\*/g, '');

    console.log(`[TTS] Generating audio for text (${cleanText.length} chars): "${cleanText.substring(0, 50)}..."`);

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash-preview-tts"
    });

    const result = await model.generateContent({
      contents: [{
        role: 'user',
        parts: [{ text: SORTING_HAT_TTS_PROMPT + cleanText }]
      }],
      generationConfig: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName: 'Charon' // Deep, dramatic voice for the Sorting Hat
            }
          }
        }
      }
    });

    const response = await result.response;
    console.log(`[TTS] Response received, checking for audio data...`);

    const audioData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    const mimeType = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.mimeType;

    if (audioData) {
      console.log(`[TTS] ✅ Audio generated successfully (mimeType: ${mimeType}, size: ${audioData.length} bytes)`);

      // Gemini returns raw PCM (Linear16, 24kHz, mono) - convert to WAV for browser playback
      const pcmBuffer = Buffer.from(audioData, 'base64');
      const wavBuffer = pcmToWav(pcmBuffer, 24000, 1, 16);
      const wavBase64 = wavBuffer.toString('base64');

      console.log(`[TTS] 🎵 Converted to WAV (${wavBuffer.length} bytes)`);
      return `data:audio/wav;base64,${wavBase64}`;
    }

    console.error(`[TTS] ❌ No audio data in response:`, JSON.stringify(response, null, 2));
    return null;
  } catch (error) {
    console.error(`[TTS] ❌ Error (attempt ${retryCount + 1}/${MAX_RETRIES + 1}):`, error.message);

    // Retry on rate limit (429) or server errors (5xx)
    if ((error.status === 429 || error.status >= 500) && retryCount < MAX_RETRIES) {
      const delay = RETRY_DELAY_MS * Math.pow(2, retryCount); // Exponential backoff
      console.log(`[TTS] ⏳ Retrying in ${delay / 1000}s...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return generateGeminiTTS(text, genAI, retryCount + 1);
    }

    console.error("[TTS] ❌ Final error:", error);
    return null;
  }
}

// TTS endpoint using Gemini 2.5 Flash TTS
app.post('/api/tts', async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: 'Text is required' });

    // Check cache first for instant response
    if (audioCache.has(text)) {
      console.log(`[TTS] ⚡ Cache HIT for: "${text.substring(0, 30)}..."`);
      return res.json({ audio: audioCache.get(text) });
    }

    console.log(`[TTS] Cache MISS for: "${text.substring(0, 30)}..."`);

    const genAI = getGenAI();
    if (!genAI) {
      return res.status(500).json({ error: 'Gemini API Key not configured' });
    }

    const audio = await generateGeminiTTS(text, genAI);

    if (audio) {
      // Cache the result for future requests
      audioCache.set(text, audio);
      res.json({ audio });
    } else {
      res.status(500).json({ error: 'TTS generation failed' });
    }
  } catch (error) {
    console.error("TTS Error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Initialize Gemini lazily or check for key
const getGenAI = () => {
  if (!process.env.GEMINI_API_KEY) return null;
  return new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
};

app.post('/api/sort-pet', upload.single('image'), async (req, res) => {
  try {
    const { traits } = req.body;
    const imageFile = req.file;

    const genAI = getGenAI();
    if (!genAI) {
      console.error("Gemini API Key is missing.");
      return res.status(500).json({ error: 'Gemini API Key not configured in .env' });
    }

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    let prompt = `You are THE Sorting Hat from Hogwarts - ancient, theatrical, and delightfully eccentric. You are over 1,000 years old and have seen every type of creature imaginable.

PERSONALITY TRAITS:
- Theatrical and dramatic - you LOVE suspense and mystery
- Slightly pompous but with a heart of gold
- Witty with dry, British humor
- Observant - you notice tiny details others miss
- You speak in an old-fashioned, magical way

VOICE ACTING DIRECTIONS (for speechTTS only):
Use these markup tags to guide the text-to-speech performance:
- [sigh] - a thoughtful sigh before speaking
- [chuckle] - an amused, knowing chuckle
- [pause] - a dramatic pause for suspense
- [slowly] - speak the next phrase slowly and deliberately
- [excited] - speak with growing excitement
- "..." - a trailing, mysterious pause

SPEAKING CONTENT:
- Start with thoughtful sounds: "Ahh..." or "Hmm..."
- Use archaic words: "Indeed", "Most curious", "I perceive", "Methinks"
- Reference specific physical features you observe in the photo
- Be playful and teasing, never mean
- Build suspense - do NOT reveal the house name!
- End with suspenseful anticipation like "Yes... I know EXACTLY where you belong!"
- Do NOT use asterisks (*) or markdown formatting (bold, italic) in the speech. Use only the provided tags.

Analyze this pet photo and the owner's description: "${traits}"

Decide which Hogwarts House (Gryffindor, Hufflepuff, Ravenclaw, or Slytherin).

Output a JSON object with TWO fields:
{
  "house": "Gryffindor",
  "speechParts": [
    {
      "speechTTS": "[sigh] Ahh... [pause] most curious indeed!",
      "speechDisplay": "Ahh... most curious indeed!"
    },
    {
      "speechTTS": "[chuckle] I perceive a bold spirit! [excited] Yes...",
      "speechDisplay": "I perceive a bold spirit! Yes..."
    },
    {
      "speechTTS": "I know EXACTLY where you belong!",
      "speechDisplay": "I know EXACTLY where you belong!"
    }
  ]
}

IMPORTANT: Return ONLY the JSON object. No markdown. No asterisks. Break the speech into 3-4 natural segments.`;

    const parts = [prompt];

    if (imageFile) {
      parts.push({
        inlineData: {
          data: imageFile.buffer.toString('base64'),
          mimeType: imageFile.mimetype,
        },
      });
    }

    const result = await model.generateContent(parts);
    const response = await result.response;
    const text = response.text();

    // Clean up markdown if present
    const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();

    let jsonResponse;
    try {
      jsonResponse = JSON.parse(cleanText);
    } catch (e) {
      console.error("Failed to parse JSON:", text);
      return res.status(500).json({ error: 'Failed to parse AI response', raw: text });
    }

    // Generate Audio for EACH part SEQUENTIALLY to avoid rate limits (10 req/min)
    // Ensure speechParts exists (fallback for older models/prompts)
    const speechParts = jsonResponse.speechParts || [
      {
        speechTTS: jsonResponse.speechTTS || jsonResponse.speech,
        speechDisplay: jsonResponse.speechDisplay || jsonResponse.speech
      }
    ];

    console.log(`[SORT] Generating audio for ${speechParts.length} speech parts...`);

    // Process sequentially instead of in parallel to avoid rate limits
    const audioResults = [];
    for (let i = 0; i < speechParts.length; i++) {
      console.log(`[SORT] Processing speech part ${i + 1}/${speechParts.length}...`);
      const audio = await generateGeminiTTS(speechParts[i].speechTTS || '', genAI);
      audioResults.push(audio);

      // Add a small delay between requests to respect rate limits
      if (i < speechParts.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    // Combine audio with text parts
    const finalParts = speechParts.map((part, index) => ({
      text: part.speechDisplay,
      audio: audioResults[index]
    }));

    // Return with clean speech parts for display
    res.json({
      house: jsonResponse.house,
      speechParts: finalParts
    });

  } catch (error) {
    console.error('Error processing request:', error);
    res.status(500).json({ error: error.message });
  }
});

// Pre-warm cache with static phrases (runs in background after server starts)
async function prewarmCache() {
  const genAI = getGenAI();
  if (!genAI) {
    console.log('[CACHE] ⚠️ No API key, skipping cache pre-warm');
    return;
  }

  console.log(`[CACHE] 🔥 Pre-warming cache with ${STATIC_PHRASES.length} phrases...`);

  for (let i = 0; i < STATIC_PHRASES.length; i++) {
    const phrase = STATIC_PHRASES[i];
    if (audioCache.has(phrase)) {
      console.log(`[CACHE] ✓ Already cached: "${phrase.substring(0, 30)}..."`);
      continue;
    }

    console.log(`[CACHE] Generating ${i + 1}/${STATIC_PHRASES.length}: "${phrase.substring(0, 30)}..."`);
    const audio = await generateGeminiTTS(phrase, genAI);

    if (audio) {
      audioCache.set(phrase, audio);
      console.log(`[CACHE] ✅ Cached: "${phrase.substring(0, 30)}..."`);
    } else {
      console.log(`[CACHE] ❌ Failed: "${phrase.substring(0, 30)}..."`);
    }

    // Delay between requests to respect rate limits (10 req/min)
    if (i < STATIC_PHRASES.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  console.log(`[CACHE] ✨ Pre-warm complete! ${audioCache.size} phrases cached.`);
}

app.listen(port, () => {
  console.log(`Server running on port ${port}`);

  // Pre-warm cache in background (don't await, let server start immediately)
  prewarmCache().catch(err => console.error('[CACHE] Pre-warm error:', err));
});
