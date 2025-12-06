# 🧙‍♂️ Pets Sorting Hat

**Every pet belongs somewhere... let the Hat decide!**

This magical application uses **AI Vision (Gemini 2.5 Flash)** and **Neural Text-to-Speech (Google Cloud)** to analyze your pet's photo and personality, sorting them into their rightful Hogwarts House with a theatrical, voice-acted ceremony.

## ✨ Features

- **📸 Pet Analysis**: Upload a photo or use your camera to let the Hat see your pet.
- **🧠 AI Personality Sorting**: Describe your pet's traits (e.g., "brave but clumsy"), and the AI determines the best house match.
- **🗣️ Theatrical Voice & Lip Sync**: The Hat speaks! It uses Neural TTS with dynamic pitch and pacing, and its mouth animates in real-time sync with the audio.
- **🎩 Draggable Hat**: Interactive UI where you can place the Hat on your pet's head.
- **🏰 Cinematic Reveal**: A dramatic house reveal sequence with house-specific themes.

## 🚀 Deployment

### GitHub Pages (Frontend Only)
This project is configured for deployment to GitHub Pages.

**⚠️ IMPORTANT LIMITATION**:
The deployed version on GitHub Pages is **STATIC ONLY**.
- The AI Sorting and Text-to-Speech features require the backend server (`server.js`) to be running.
- On GitHub Pages, the app will load, but sorting functionality will **FAIL** unless you configure the frontend to point to a separately hosted backend (e.g., on Render/Railway).

**To Deploy:**
```bash
npm run deploy
```

## 🛠️ Local Setup

1.  **Clone the repository**
    ```bash
    git clone https://github.com/goggledefogger/pets-sorting-hat.git
    cd pets-sorting-hat
    ```

2.  **Install Dependencies**
    ```bash
    npm install
    ```

3.  **Configure Environment Variables**
    Create a `.env` file in the root directory:
    ```env
    # Required for AI Analysis
    GEMINI_API_KEY=your_gemini_api_key_here

    # Required for Text-to-Speech (Optional: falls back to Gemini key if permissible, but tailored for Google Cloud)
    GOOGLE_CLOUD_API_KEY=your_google_cloud_api_key_here
    ```

4.  **Start the Development Server**
    Run both the backend (API) and frontend (Vite):
    ```bash
    # Open two terminals:

    # Terminal 1 (Backend)
    npm run server

    # Terminal 2 (Frontend)
    npm run dev
    ```

## 🧩 Architecture

- **Frontend**: React + Vite
- **Backend**: Express.js (handles API proxying and secret storage)
- **AI Model**: Gemini 2.5 Flash (via `@google/generative-ai`)
- **TTS**: Google Cloud Text-to-Speech (Neural2 voices)
- **Styling**: Vanilla CSS with comprehensive animations

## 📜 License
MIT
