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

    let prompt = `You are the Sorting Hat from Harry Potter, but for pets.
    Analyze this pet photo and the owner's description: "${traits}".

    Decide which Hogwarts House this pet belongs to (Gryffindor, Hufflepuff, Ravenclaw, or Slytherin).

    Output a JSON object with this structure:
    {
      "house": "House Name",
      "speech": "Your magical sorting speech here. Be witty, observant about the visual details in the photo, and dramatic. Keep it under 3 sentences."
    }

    IMPORTANT: Return ONLY the JSON object. No markdown formatting.`;

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

    // Generate Audio with ElevenLabs
    if (process.env.ELEVENLABS_API_KEY) {
      try {
        const voiceId = process.env.ELEVENLABS_VOICE_ID || '21m00Tcm4TlvDq8ikWAM'; // Default to Rachel if not set
        const ttsResponse = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
          method: 'POST',
          headers: {
            'Accept': 'audio/mpeg',
            'xi-api-key': process.env.ELEVENLABS_API_KEY,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            text: jsonResponse.speech,
            model_id: "eleven_monolingual_v1",
            voice_settings: {
              stability: 0.5,
              similarity_boost: 0.5,
            }
          }),
        });

        if (ttsResponse.ok) {
          const audioBuffer = await ttsResponse.arrayBuffer();
          const audioBase64 = Buffer.from(audioBuffer).toString('base64');
          jsonResponse.audio = `data:audio/mpeg;base64,${audioBase64}`;
        } else {
          console.error("ElevenLabs API Error:", await ttsResponse.text());
        }
      } catch (audioError) {
        console.error("Audio generation failed:", audioError);
      }
    }

    res.json(jsonResponse);

  } catch (error) {
    console.error('Error processing request:', error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
