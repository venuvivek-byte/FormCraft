# EventPulse AI ✨
> **Turn Any Event or Daily Activity into an Intelligent Google Form in Seconds**

[![Live Web App](https://img.shields.io/badge/Live%20App-Google%20Apps%20Script-brightgreen?style=for-the-badge&logo=google)](https://script.google.com/macros/s/AKfycbwigmS8AsWoRx77J0GVUmUHC3IbahWn6Cn5qT3HAtbwLOES22owmDl4RuCyZuwzNL-blA/exec)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge)](LICENSE)

---

## 🌐 Live Web App

🔗 **Live Deployment Link:**  
**[https://script.google.com/macros/s/AKfycbwigmS8AsWoRx77J0GVUmUHC3IbahWn6Cn5qT3HAtbwLOES22owmDl4RuCyZuwzNL-blA/exec](https://script.google.com/macros/s/AKfycbwigmS8AsWoRx77J0GVUmUHC3IbahWn6Cn5qT3HAtbwLOES22owmDl4RuCyZuwzNL-blA/exec)**

---

## 💡 What It Does

**EventPulse AI** is an AI-powered automation studio built for Google Workspace. It takes a plain-text prompt or description—whether it is a conference feedback survey, a movie night voting poll, a sports match roster, or a travel trip planner—and automatically generates a fully structured, ready-to-use **Google Form** directly in your Google Drive, complete with shareable live links and QR codes.

### Key Capabilities:
- **Zero-Friction Form Creation**: Describe your event or daily activity in plain language.
- **Dynamic Intent Recognition**: Understands whether you need an evaluation survey, a voting poll, an RSVP roster, or a team check-in.
- **Automatic Question Mapping**: Intelligently creates 1–5 Rating Scales, Multiple Choice choices, Multi-Select Checkboxes, and Open-Ended Paragraphs.
- **Section Breaks & Organization**: Groups questions into logical sections to minimize attendee cognitive load.
- **Live Google Drive Integration**: Uses the native Google Forms API (`FormApp`) with zero third-party database dependencies.
- **Interactive Live Preview**: Preview the form structure and attendee experience before sharing.
- **Built-in QR Code Generator**: Instantly display a clean QR code for on-stage projections, posters, or group chats.

---

## 🛠️ Architecture & Tech Stack

| Layer | Technology | Role |
|---|---|---|
| **Frontend** | HTML5, Tailwind CSS, Google Material Symbols | High-precision dark editorial studio UI |
| **Animation Engine** | [Anime.js v3.2.2](https://animejs.com/) | Choreographed A1–A13 motion design specification |
| **Backend & Hosting** | [Google Apps Script (V8 Engine)](https://developers.google.com/apps-script) | Serverless execution, OAuth, and web app hosting |
| **Form Engine** | Google Apps Script `FormApp` API | Native form instantiation and Drive synchronization |
| **AI Intelligence** | Gemini API (`gemini-2.0-flash`, `gemini-2.5-flash`) + Semantic Context Engine | Context analysis, structured question synthesis |

---

## 🎬 Anime.js Motion Design System

EventPulse AI incorporates a motion design system following the **A1–A13 specification**:

- **A1 Floating AI Orb**: Ambient breathing glow loop in the studio header.
- **A2 Ambient Particles**: Randomized floating background particles for a living canvas.
- **A3 Action Pulse**: Tactile button press scaling and state transitions.
- **A4 & A5 Neural Thinking**: Animated rotating orb and staggered neural node pulses during generation.
- **A6 Telemetry Reveal**: Staggered cards display estimated time, question counts, and coverage.
- **A7 Alternating Assemble**: Blueprint cards slide in from alternating left/right directions.
- **A8 & A9 Choice Reveals**: Rating stars pop in with spring overshoot; choice options slide horizontally.
- **A10 Transformation Pipeline**: Visual step tracker (`Event Context → AI Synthesis → Live Form`).
- **A12 & A13 Success Dock & QR**: Soft spring reveal of links, copy feedback, and modal QR code.
- **Accessibility**: Native `prefers-reduced-motion` detection respects user system preferences.

---

## 🎯 Supported Activities & Prompts

EventPulse AI adapts to any daily activity or event:

1. **Conferences & Workshops**:
   > *"2-day Cloud & AI Summit with hands-on Kubernetes lab, keynote speaker, and networking mixer."*
2. **Entertainment & Movie Nights**:
   > *"Movie night selection poll including SS Rajamouli movies like RRR and Baahubali."*
3. **Dining & Food Polls**:
   > *"Team lunch voting form for cuisines, dietary requirements, and lunch timings."*
4. **Sports & Fitness**:
   > *"Weekend turf cricket match sign-up with skill levels and equipment checklist."*
5. **Travel & Outings**:
   > *"Weekend trip planner for places to visit in New Zealand with activities and transport."*
6. **Parties & Celebrations**:
   > *"Birthday celebration RSVP with plus-ones, drink preferences, and song playlist requests."*
7. **Daily Standups & Work Tasks**:
   > *"Daily team standup form with yesterday's work, today's goals, and blockers."*

---

## 🚀 Setup & Deployment Guide

### 1. Create Google Apps Script Project
1. Visit [script.google.com](https://script.google.com) and click **New Project**.
2. Name the project **EventPulse AI**.

### 2. Copy Project Code
1. Replace `Code.gs` with the contents of [`Code.gs`](Code.gs).
2. Click **+ ➔ HTML**, name the file **`Index`**, and paste the contents of [`Index.html`](Index.html).
3. In **Project Settings** (gear icon), check **"Show 'appsscript.json' manifest file in editor"**.
4. Open `appsscript.json` and paste the contents of [`appsscript.json`](appsscript.json).

### 3. Add API Keys (Optional)
1. In **Project Settings ➔ Script Properties**, click **Add script property**.
2. Key: `GEMINI_API_KEY` (Get from [Google AI Studio](https://aistudio.google.com/apikey)).
3. *(Optional)* Key: `GROQ_API_KEY` (Get from [Groq Console](https://console.groq.com)).

### 4. Authorize & Deploy Web App
1. In the toolbar dropdown, select `authorizePermissions` and click **▶ Run**.
2. Accept the one-time Google permissions dialog (**Advanced ➔ Go to project ➔ Allow**).
3. Click **Deploy ➔ New deployment**.
4. Select **Web app**:
   - **Execute as:** `Me`
   - **Who has access:** `Anyone`
5. Copy the generated **Web App URL** (`/exec`).

---

## 📁 Repository Structure

```
├── Code.gs          # Backend: AI calling cascade, FormApp builder, semantic fallback
├── Index.html       # Frontend: EventPulse studio UI, Tailwind, Anime.js motion engine
├── appsscript.json  # Apps Script manifest with required OAuth scopes
└── README.md        # Project documentation and deployment guide
```

---

## 📄 License

This project is licensed under the [MIT License](LICENSE). Built for the CS Week AI Automation Competition (Everyday Use Track).
