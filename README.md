# FormCraft ✨
(https://script.google.com/macros/s/AKfycbyVwLPp0R2CcFgoMcFOgB4Hb_pw5y7_o0vRNcjZIctdcMVoZhlPDd3d1-6gIhtifzStRQ/exec)
> Turn any event into a feedback form in seconds

## What It Does
FormCraft takes a plain-text description of any event (workshop, hackathon, seminar, cultural fest, etc.) and uses Gemini AI to auto-generate a customized Google Form for collecting attendee feedback. Users describe their event, pick a tone (Formal, Friendly, or Short), and get a ready-to-share feedback form in seconds.

## How It Works
1. User describes the event in a text box and selects a tone
2. The app sends the description to Gemini 2.5 Flash (JSON mode) which generates structured feedback questions specific to the event's purpose, sessions, and technical details
3. Apps Script builds a real Google Form using FormApp API with sections, scale items, multiple choice, checkboxes, and text fields
4. The user gets direct links to fill out or edit the generated form

## Tech Stack
| Layer | Technology |
|-------|------------|
| Frontend | HTML/CSS/JS (designed with Google Stitch) |
| Animation | Motion (motion.dev) with anime.js fallback |
| Backend | Google Apps Script |
| AI | Gemini 2.5 Flash (JSON mode) |
| Form Creation | Google Forms API (FormApp) |
| Hosting | Apps Script Web App deployment |

## Features
- AI-generated questions specific to each event's activities and sessions
- Multiple tone options (Formal, Friendly, Short)
- Automatic Google Form creation with proper question types (Rating scales, Multiple choice, Checkboxes, Text)
- Organized sections with page breaks
- Animated, responsive UI with smooth transitions
- Accessible (respects prefers-reduced-motion)
- Error handling with retry logic

## Setup
1. Create a new Google Apps Script project at [script.google.com](https://script.google.com)
2. Copy `Code.gs` content into the default `Code.gs` file
3. Create a new HTML file named `Index` and paste `Index.html` content
4. Copy `appsscript.json` content (enable "Show manifest file" in Project Settings first)
5. Get a Gemini API key from [Google AI Studio](https://aistudio.google.com/apikey)
6. Go to Project Settings → Script Properties → Add: Key = `GEMINI_API_KEY`, Value = your key
7. Deploy → New deployment → Web app → Execute as: Me, Access: Anyone
8. Open the deployment URL and authorize the required permissions on first run

## Project Structure
```
Code.gs          # Backend: Gemini API calls + Google Form builder
Index.html       # Frontend: UI with animations and form interaction
appsscript.json  # Apps Script manifest with OAuth scopes
README.md        # This file
```

## Built With
- [Google Apps Script](https://developers.google.com/apps-script)
- [Gemini API](https://ai.google.dev/)
- [Motion](https://motion.dev/) for animations
- [Google Stitch](https://stitch.withgoogle.com/) for UI design
- [Google Forms API](https://developers.google.com/apps-script/reference/forms)

## License
MIT
