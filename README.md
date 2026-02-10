# Clipyzee 🎥✂️

**AI Video Clipping SaaS**

Clipyzee is an automated video processing platform that ingests YouTube videos, transcribes them using speech-to-text AI, identifies interesting segments based on rule-based heuristics, and automatically clips them into standalone video files.

---

## 🚀 Features

- **YouTube Ingestion**: Download audio and video from YouTube URLs.
- **Speech-to-Text**: Offline transcription using OpenAI Whisper (local execution).
- **Smart Clipping**: Rule-based selection of interesting clips (15-45s) based on keywords and speech patterns.
- **Automated Video Editing**: Precision cutting of video segments using FFmpeg.
- **Queue-Based Architecture**: Scalable background processing with BullMQ and Redis.

---

## 🏗 System Architecture

The system consists of two main components:

1. **Backend API (`/backend`)**
   - Built with **NestJS**.
   - Handles job creation and management.
   - interact with PostgreSQL database via Prisma.
   - Pushes jobs to Redis queue.

2. **Worker Service (`/worker`)**
   - Built with **Node.js (TypeScript) + Python**.
   - Consumes jobs from Redis.
   - Executes the heavy lifting:
     1.  **Download**: Fetches audio via `yt-dlp`.
     2.  **Transcribe**: Runs execution of Python script (`transcribe.py`) with Whisper model.
     3.  **Analyze**: Selects best clips based on configured rules.
     4.  **Process**: Downloads full video and cuts clips using `FFmpeg`.

---

## 🛠 Tech Stack

- **Runtime**: Node.js (TypeScript)
- **Framework**: NestJS (Backend)
- **Database**: PostgreSQL (Prisma ORM)
- **Queue**: Redis (BullMQ)
- **AI/ML**: OpenAI Whisper (Python)
- **Media Processing**: FFmpeg, yt-dlp

---

## 📋 Prerequisites

Ensure you have the following installed:

- **Node.js** (v18+)
- **Python** (v3.8+)
- **FFmpeg** (Accessible in system PATH)
- **yt-dlp** (Accessible in system PATH)
- **Redis**
- **PostgreSQL**

---

## 📦 Installation & Setup

### 1. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Configure Environment
cp .env.example .env
# Update DATABASE_URL and REDIS connection details in .env

# Run Migrations
npx prisma migrate dev

# Start Server
npm run start:dev
```

### 2. Worker Setup

The worker requires both Node.js dependencies and a Python virtual environment for Whisper.

```bash
cd worker

# Install Node dependencies
npm install

# Setup Python Virtual Environment
python3 -m venv venv
source venv/bin/activate

# Install Python dependencies (Whisper, etc.)
pip install -r requirements.txt

# Configure Environment
cp .env.example .env

# Start Worker
npm run dev
```

---

## 🏃‍♂️ Usage

1.  **Start Redis and Postgres**.
2.  **Run the Backend**: `npm run start:dev` in `/backend`.
3.  **Run the Worker**: `npm run dev` in `/worker`.
4.  **Submit a Job**:
    *   POST request to the backend with a YouTube URL.
    *   The job will be queued.
5.  **Check Output**:
    *   Processed clips will appear in `worker/output/<jobId>/`.

---

## 🧩 Clip Selection Logic

The worker uses a deterministic rule-based approach to select clips:

- **Duration**: Clips must be between **15s and 45s**.
- **Windowing**: Analyzes rolling windows of ~30s.
- **Keywords**: Looks for high-signal words (e.g., "kenapa", "jadi", "resolusi").
- **Anti-Filler**: Rejects segments with >30% filler words ("anu", "ehm").

---

## ⚠️ Notes

- **Performance**: Whisper runs on CPU implementation by default. For GPU acceleration, ensure standard PyTorch CUDA support is available.
- **Storage**: Temporary audio/video files are cleaned up automatically. Only final clips are retained.
