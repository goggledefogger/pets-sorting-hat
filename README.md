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

### Option 1: Firebase (Recommended)
This approach deploys the **Frontend** (Hosting) and **Backend** (Functions) together, ensuring the AI and Voice features work perfectly while keeping your API keys secure.

1.  **Install Firebase CLI**:
    ```bash
    npm install -g firebase-tools
    ```

2.  **Login and Init**:
    ```bash
    firebase login
    firebase init
    # Select: Hosting, Functions
    # Project: Create new or use existing
    # Hosting: Public dir = "dist", SPA = Yes
    ```

3.  **Set Secrets**:
    Securely upload your API keys from your local `.env` file to Firebase:
    ```bash
    # Ensure you are logged in and have selected a project (firebase use)
    npm run setup-secrets
    ```

    *Alternatively, set them manually:*
    ```bash
    firebase functions:secrets:set GEMINI_API_KEY
    firebase functions:secrets:set GOOGLE_CLOUD_API_KEY
    ```

4.  **Deploy**:
    ```bash
    npm run build
    firebase deploy
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
    # Install backend dependencies if running locally independent of Firebase
    npm install express cors dotenv multer @google/generative-ai @google-cloud/text-to-speech
    ```

3.  **Configure Environment Variables (Local)**
    Create a `.env` file in the root directory:
    ```env
    # Required for AI Analysis and Text-to-Speech
    GEMINI_API_KEY=your_gemini_api_key_here
    ```

4.  **Start Development**
    You can run the full stack locally using the Express server for simplicity:

    ```bash
    # Terminal 1 (Backend)
    npm run server

    # Terminal 2 (Frontend)
    npm run dev
    ```

    *Alternatively, tests Firebase Functions locally:*
    ```bash
    firebase emulators:start
    ```

## 🧩 Architecture

- **Frontend**: React + Vite (Hosted on Firebase Hosting)
- **Backend (Prod)**: Firebase Cloud Functions (Serverless v2)
- **Backend (Dev)**: Express.js (for simple local dev) OR Firebase Emulators
- **AI Model**: Gemini 2.5 Flash (for vision + text analysis)
- **TTS**: Gemini 2.5 Flash TTS (native audio generation with natural language style prompts)
- **Audio Caching**: Static phrases are pre-generated on server startup for instant playback

## 📜 License
MIT
