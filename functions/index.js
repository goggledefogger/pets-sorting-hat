/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

const { onRequest } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const logger = require("firebase-functions/logger");
const cors = require("cors")({ origin: true });
const Busboy = require("busboy");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const path = require("path");
const os = require("os");
const fs = require("fs");

// Secrets
const geminiApiKey = defineSecret("GEMINI_API_KEY");
const googleCloudApiKey = defineSecret("GOOGLE_CLOUD_API_KEY");

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

// Generate TTS audio using Gemini 2.5 Flash TTS
async function generateGeminiTTS(text, genAI) {
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
    const audioData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

    if (audioData) {
      // Gemini TTS returns PCM audio, we return as base64 WAV
      return `data:audio/wav;base64,${audioData}`;
    }
    return null;
  } catch (error) {
    console.error("Gemini TTS Error:", error);
    return null;
  }
}

// ---------------------------------------------------------
// TTS Endpoint
// ---------------------------------------------------------
exports.tts = onRequest({ secrets: [geminiApiKey] }, (req, res) => {
  cors(req, res, async () => {
    try {
      if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

      const { text } = req.body;
      if (!text) return res.status(400).json({ error: 'Text is required' });

      const apiKey = geminiApiKey.value();
      if (!apiKey) return res.status(500).json({ error: 'Gemini API Key not configured' });

      const genAI = new GoogleGenerativeAI(apiKey);
      const audio = await generateGeminiTTS(text, genAI);

      if (audio) {
        res.json({ audio });
      } else {
        res.status(500).json({ error: 'TTS generation failed' });
      }
    } catch (error) {
      console.error("TTS Error:", error);
      res.status(500).json({ error: error.message });
    }
  });
});

// ---------------------------------------------------------
// Sort Pet Endpoint (Handling File Uploads via Busboy)
// ---------------------------------------------------------
exports.sortPet = onRequest({ secrets: [geminiApiKey, googleCloudApiKey], timeoutSeconds: 60 }, (req, res) => {
  cors(req, res, () => {
    if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

    const busboy = Busboy({ headers: req.headers });
    const fields = {};
    let fileBuffer = null;
    let fileMimeType = null;

    busboy.on('field', (fieldname, val) => {
      fields[fieldname] = val;
    });

    busboy.on('file', (fieldname, file, { filename, encoding, mimeType }) => {
      const chunks = [];
      file.on('data', (data) => chunks.push(data));
      file.on('end', () => {
        fileBuffer = Buffer.concat(chunks);
        fileMimeType = mimeType;
      });
    });

    busboy.on('finish', async () => {
      try {
        const traits = fields.traits || '';

        const genAI = new GoogleGenerativeAI(geminiApiKey.value());
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        const prompt = `You are THE Sorting Hat from Hogwarts... (THEATRICAL & DRAMATIC)...
ANALYZE: "${traits}"
OUTPUT JSON ONLY: { "house": "...", "speechParts": [...] }`;
        // NOTE: Abbreviated prompt for brevity, assuming similar to original server.js but ensuring full prompt logic is kept if needed.
        // I will restore the FULL prompt below to ensure logic matches.

        const fullPrompt = `You are THE Sorting Hat from Hogwarts - ancient, theatrical, and delightfully eccentric. You are over 1,000 years old and have seen every type of creature imaginable.

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

        const parts = [fullPrompt];
        if (fileBuffer) {
          parts.push({
            inlineData: {
              data: fileBuffer.toString('base64'),
              mimeType: fileMimeType,
            },
          });
        }

        const result = await model.generateContent(parts);
        const response = await result.response;
        const text = response.text();
        const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();

        let jsonResponse;
        try {
          jsonResponse = JSON.parse(cleanText);
        } catch (e) {
            console.error("JSON PARSE ERROR", text);
            return res.status(500).json({ error: 'Failed to parse AI response' });
        }

        // --- Generate Audio for Speech Parts using Gemini TTS ---
        const speechParts = jsonResponse.speechParts || [{
            speechTTS: jsonResponse.speechTTS || jsonResponse.speech,
            speechDisplay: jsonResponse.speechDisplay || jsonResponse.speech
        }];

        const audioPromises = speechParts.map(async (part) => {
            return generateGeminiTTS(part.speechTTS || '', genAI);
        });

        const audioResults = await Promise.all(audioPromises);
        const finalParts = speechParts.map((part, index) => ({
            text: part.speechDisplay,
            audio: audioResults[index]
        }));

        res.json({
            house: jsonResponse.house,
            speechParts: finalParts
        });

      } catch (err) {
        console.error("Processing Error:", err);
        res.status(500).json({ error: err.message });
      }
    });

    busboy.end(req.rawBody);
  });
});
