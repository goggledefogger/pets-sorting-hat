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

// Convert markup tags to SSML for WaveNet with emotional expression
function speechToSSML(text) {
  let ssml = text
    .replace(/\*/g, '') // Remove asterisks
    // House Reveals - MAX EXCITEMENT
    .replace(/GRYFFINDOR!/gi, '<prosody pitch="+4st" rate="0.9" volume="x-loud"><emphasis level="strong">GRYFFINDOR!</emphasis></prosody>')
    .replace(/SLYTHERIN!/gi, '<prosody pitch="+4st" rate="0.9" volume="x-loud"><emphasis level="strong">SLYTHERIN!</emphasis></prosody>')
    .replace(/RAVENCLAW!/gi, '<prosody pitch="+4st" rate="0.9" volume="x-loud"><emphasis level="strong">RAVENCLAW!</emphasis></prosody>')
    .replace(/HUFFLEPUFF!/gi, '<prosody pitch="+4st" rate="0.9" volume="x-loud"><emphasis level="strong">HUFFLEPUFF!</emphasis></prosody>')
    // Voice acting sounds/actions
    .replace(/\[sigh\]/gi, '<break time="200ms"/><prosody pitch="-1st" rate="slow">hmm</prosody><break time="300ms"/>')
    .replace(/Hmm\.\.\./gi, '<prosody pitch="-2st" rate="0.7" volume="soft">Hmm...</prosody><break time="400ms"/>')
    .replace(/Let me see\.\.\./gi, '<prosody pitch="-1st" rate="0.8">Let me see...</prosody><break time="300ms"/>')
    .replace(/\[chuckle\]/gi, '<break time="100ms"/><prosody pitch="+1st">heh</prosody><break time="200ms"/>')
    .replace(/\[pause\]/gi, '<break time="600ms"/>')
    .replace(/\[short pause\]/gi, '<break time="400ms"/>')
    .replace(/\[uhm\]/gi, '<break time="200ms"/>')
    // Style modifiers - wrap following text in prosody
    .replace(/\[slowly\]\s*([^.!?]+[.!?])/gi, '<prosody rate="slow">$1</prosody>')
    .replace(/\[excited\]\s*([^.!?]+[.!?])/gi, '<prosody rate="fast" pitch="+2st">$1</prosody>')
    .replace(/\[whisper\]\s*([^.!?]+[.!?])/gi, '<prosody volume="soft" rate="slow">$1</prosody>')
    // Pauses for punctuation
    .replace(/\.\.\./g, '<break time="500ms"/>')
    // Emphasis for dramatic words
    .replace(/EXACTLY/gi, '<emphasis level="strong">exactly</emphasis>')
    .replace(/YES/gi, '<emphasis level="moderate">Yes</emphasis>');

  // Wrap in speak tags with theatrical delivery - faster rate
  return `<speak><prosody rate="110%" pitch="-2st">${ssml}</prosody></speak>`;
}

// TTS endpoint using WaveNet with SSML support for dramatic pauses
app.post('/api/tts', async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: 'Text is required' });

    const ttsApiKey = process.env.GOOGLE_CLOUD_API_KEY || process.env.GEMINI_API_KEY;
    if (!ttsApiKey) return res.status(500).json({ error: 'TTS API key not configured' });

    const ssmlText = speechToSSML(text);

    const ttsResponse = await fetch(
      `https://texttospeech.googleapis.com/v1/text:synthesize?key=${ttsApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: { ssml: ssmlText },
          voice: {
            languageCode: 'en-GB',
            name: 'en-GB-Studio-B', // Premium Studio voice
            ssmlGender: 'MALE'
          },
          audioConfig: {
            audioEncoding: 'MP3',
            pitch: -3.0, // Lower pitch for ancient wizard
            speakingRate: 0.85 // Slower for dramatic effect
          }
        }),
      }
    );

    if (ttsResponse.ok) {
      const ttsData = await ttsResponse.json();
      res.json({ audio: `data:audio/mpeg;base64,${ttsData.audioContent}` });
    } else {
      const error = await ttsResponse.text();
      console.error("TTS API Error:", error);
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

    // Generate Audio for EACH part in parallel
    const ttsApiKey = process.env.GOOGLE_CLOUD_API_KEY || process.env.GEMINI_API_KEY;

    // Ensure speechParts exists (fallback for older models/prompts)
    const speechParts = jsonResponse.speechParts || [
      {
        speechTTS: jsonResponse.speechTTS || jsonResponse.speech,
        speechDisplay: jsonResponse.speechDisplay || jsonResponse.speech
      }
    ];

    const audioPromises = speechParts.map(async (part) => {
      const ssmlText = speechToSSML(part.speechTTS || '');
      try {
        const ttsResponse = await fetch(
          `https://texttospeech.googleapis.com/v1/text:synthesize?key=${ttsApiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              input: { ssml: ssmlText },
              voice: {
                languageCode: 'en-GB',
                name: 'en-GB-Studio-B', // Premium Studio voice - deeper and more expressive
                ssmlGender: 'MALE'
              },
              audioConfig: {
                audioEncoding: 'MP3',
                pitch: -2.0,
                speakingRate: 1.15
              }
            }),
          }
        );

        if (ttsResponse.ok) {
          const ttsData = await ttsResponse.json();
          return `data:audio/mpeg;base64,${ttsData.audioContent}`;
        } else {
          console.error("Google TTS API Error:", await ttsResponse.text());
          return null;
        }
      } catch (audioError) {
        console.error("Audio generation failed:", audioError);
        return null;
      }
    });

    const audioResults = await Promise.all(audioPromises);

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

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
