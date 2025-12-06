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

// Helper: Convert speech to SSML
function speechToSSML(text) {
  let ssml = text
    .replace(/\*/g, '')
    .replace(/GRYFFINDOR!/gi, '<prosody pitch="+4st" rate="0.9" volume="x-loud"><emphasis level="strong">GRYFFINDOR!</emphasis></prosody>')
    .replace(/SLYTHERIN!/gi, '<prosody pitch="+4st" rate="0.9" volume="x-loud"><emphasis level="strong">SLYTHERIN!</emphasis></prosody>')
    .replace(/RAVENCLAW!/gi, '<prosody pitch="+4st" rate="0.9" volume="x-loud"><emphasis level="strong">RAVENCLAW!</emphasis></prosody>')
    .replace(/HUFFLEPUFF!/gi, '<prosody pitch="+4st" rate="0.9" volume="x-loud"><emphasis level="strong">HUFFLEPUFF!</emphasis></prosody>')
    .replace(/\[sigh\]/gi, '<break time="200ms"/><prosody pitch="-1st" rate="slow">hmm</prosody><break time="300ms"/>')
    .replace(/Hmm\.\.\./gi, '<prosody pitch="-2st" rate="0.7" volume="soft">Hmm...</prosody><break time="400ms"/>')
    .replace(/Let me see\.\.\./gi, '<prosody pitch="-1st" rate="0.8">Let me see...</prosody><break time="300ms"/>')
    .replace(/\[chuckle\]/gi, '<break time="100ms"/><prosody pitch="+1st">heh</prosody><break time="200ms"/>')
    .replace(/\[pause\]/gi, '<break time="600ms"/>')
    .replace(/\[short pause\]/gi, '<break time="400ms"/>')
    .replace(/\[uhm\]/gi, '<break time="200ms"/>')
    .replace(/\[slowly\]\s*([^.!?]+[.!?])/gi, '<prosody rate="slow">$1</prosody>')
    .replace(/\[excited\]\s*([^.!?]+[.!?])/gi, '<prosody rate="fast" pitch="+2st">$1</prosody>')
    .replace(/\[whisper\]\s*([^.!?]+[.!?])/gi, '<prosody volume="soft" rate="slow">$1</prosody>')
    .replace(/\.\.\./g, '<break time="500ms"/>')
    .replace(/EXACTLY/gi, '<emphasis level="strong">exactly</emphasis>')
    .replace(/YES/gi, '<emphasis level="moderate">Yes</emphasis>');

  return `<speak><prosody rate="110%" pitch="-2st">${ssml}</prosody></speak>`;
}

// ---------------------------------------------------------
// TTS Endpoint
// ---------------------------------------------------------
exports.tts = onRequest({ secrets: [geminiApiKey, googleCloudApiKey] }, (req, res) => {
  cors(req, res, async () => {
    try {
      if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

      const { text } = req.body;
      if (!text) return res.status(400).json({ error: 'Text is required' });

      // Use efficient fallback for API Key
      const apiKey = googleCloudApiKey.value() || geminiApiKey.value();
      if (!apiKey) return res.status(500).json({ error: 'TTS API Key not configured' });

      const ssmlText = speechToSSML(text);

      const ttsResponse = await fetch(
        `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            input: { ssml: ssmlText },
            voice: { languageCode: 'en-GB', name: 'en-GB-Neural2-D', ssmlGender: 'MALE' },
            audioConfig: { audioEncoding: 'MP3', pitch: -3.0, speakingRate: 0.85 }
          }),
        }
      );

      if (ttsResponse.ok) {
        const ttsData = await ttsResponse.json();
        res.json({ audio: `data:audio/mpeg;base64,${ttsData.audioContent}` });
      } else {
        const errText = await ttsResponse.text();
        console.error("TTS API Error:", errText);
        res.status(500).json({ error: 'TTS generation failed', details: errText });
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

        // --- Generate Audio for Speech Parts ---
        const ttsApiKey = googleCloudApiKey.value() || geminiApiKey.value();
        const speechParts = jsonResponse.speechParts || [{
            speechTTS: jsonResponse.speechTTS || jsonResponse.speech,
            speechDisplay: jsonResponse.speechDisplay || jsonResponse.speech
        }];

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
                                name: 'en-GB-Neural2-D',
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
                }
                return null;
            } catch (e) {
                console.error("TTS Loop Error", e);
                return null;
            }
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
