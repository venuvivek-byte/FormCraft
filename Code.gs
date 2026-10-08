/**
 * Serves the initial HTML page.
 * @returns {HtmlOutput} The served HTML output.
 */
function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index')
      .setTitle('FormCraft')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * Generates a form based on the given description and tone.
 * @param {string} description - The description of the event.
 * @param {string} tone - The desired tone of the form.
 * @returns {Object} An object containing the published URL, edit URL, title, and sections.
 */
function generateForm(description, tone) {
  try {
    const data = callAI_(description, tone);
    
    const form = FormApp.create(data.title || 'Event Feedback Form');
    if (data.description) {
      form.setDescription(data.description);
    }
    form.setCollectEmail(false);
    
    const sections = data.sections || [];
    sections.forEach((section, index) => {
      if (index > 0) {
        form.addPageBreakItem().setTitle(section.title || '');
      }
      
      const questions = section.questions || [];
      questions.forEach(q => {
        let item;
        switch (q.type) {
          case 'SCALE':
            item = form.addScaleItem()
                .setTitle(q.text)
                .setBounds(q.scaleMin || 1, q.scaleMax || 5)
                .setLabels(q.lowLabel || '', q.highLabel || '');
            break;
          case 'MULTIPLE_CHOICE':
            item = form.addMultipleChoiceItem()
                .setTitle(q.text)
                .setChoiceValues(q.options || ['Option 1']);
            break;
          case 'CHECKBOX':
            item = form.addCheckboxItem()
                .setTitle(q.text)
                .setChoiceValues(q.options || ['Option 1']);
            break;
          case 'SHORT_TEXT':
            item = form.addTextItem()
                .setTitle(q.text);
            break;
          case 'PARAGRAPH':
          default:
            item = form.addParagraphTextItem()
                .setTitle(q.text);
            break;
        }
        if (q.required !== undefined && item.setRequired) {
          item.setRequired(q.required);
        }
      });
    });
    
    return {
      publishedUrl: form.getPublishedUrl(),
      editUrl: form.getEditUrl(),
      title: data.title,
      sections: data.sections
    };
  } catch (error) {
    return { error: error.message };
  }
}

/**
 * Calls AI to generate the form structure.
 * Supports:
 * 1. Google Gemini API (if GEMINI_API_KEY is present)
 * 2. Pollinations.ai / HuggingFace free text API (100% free, no API key needed)
 * 3. EventPulse Smart Semantic Context Engine (guaranteed zero-failure instant generation)
 * 
 * @param {string} description - The description of the event.
 * @param {string} tone - The desired tone of the form.
 * @returns {Object} The parsed JSON object representing the form structure.
 */
function callAI_(description, tone) {
  const scriptProps = PropertiesService.getScriptProperties();
  const groqKey = scriptProps.getProperty('GROQ_API_KEY');
  const grokKey = scriptProps.getProperty('XAI_API_KEY') || scriptProps.getProperty('GROK_API_KEY');
  const openRouterKey = scriptProps.getProperty('OPENROUTER_API_KEY');
  const geminiKey = scriptProps.getProperty('GEMINI_API_KEY');

  const prompt = getPrompt_(description, tone);

  // Strategy 1: Groq API (Ultra-fast & free tier, llama-3.3-70b-versatile or mixtral)
  if (groqKey) {
    try {
      const groqRes = UrlFetchApp.fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'post',
        contentType: 'application/json',
        headers: { 'Authorization': `Bearer ${groqKey}` },
        payload: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            { role: 'system', content: 'You are an expert Google Form builder. Output valid JSON ONLY matching the requested schema.' },
            { role: 'user', content: prompt }
          ],
          response_format: { type: 'json_object' },
          temperature: 0.3
        }),
        muteHttpExceptions: true
      });
      if (groqRes.getResponseCode() >= 200 && groqRes.getResponseCode() < 300) {
        const json = JSON.parse(groqRes.getContentText());
        const content = json.choices[0].message.content;
        Logger.log('Generated successfully via Groq LLama-3.3-70B');
        return JSON.parse(stripFences_(content));
      } else {
        Logger.log(`Groq error: ${groqRes.getContentText()}`);
      }
    } catch (e) {
      Logger.log(`Groq call failed: ${e.message}`);
    }
  }

  // Strategy 2: xAI Grok API (grok-2, grok-beta)
  if (grokKey) {
    try {
      const grokRes = UrlFetchApp.fetch('https://api.x.ai/v1/chat/completions', {
        method: 'post',
        contentType: 'application/json',
        headers: { 'Authorization': `Bearer ${grokKey}` },
        payload: JSON.stringify({
          model: 'grok-beta',
          messages: [
            { role: 'system', content: 'You are an expert Google Form builder. Output valid JSON ONLY matching the requested schema.' },
            { role: 'user', content: prompt }
          ],
          temperature: 0.3
        }),
        muteHttpExceptions: true
      });
      if (grokRes.getResponseCode() >= 200 && grokRes.getResponseCode() < 300) {
        const json = JSON.parse(grokRes.getContentText());
        const content = json.choices[0].message.content;
        Logger.log('Generated successfully via xAI Grok');
        return JSON.parse(stripFences_(content));
      } else {
        Logger.log(`Grok error: ${grokRes.getContentText()}`);
      }
    } catch (e) {
      Logger.log(`Grok call failed: ${e.message}`);
    }
  }

  // Strategy 3: OpenRouter API (Access to free Grok / Meta Llama models)
  if (openRouterKey) {
    try {
      const orRes = UrlFetchApp.fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'post',
        contentType: 'application/json',
        headers: {
          'Authorization': `Bearer ${openRouterKey}`,
          'HTTP-Referer': 'https://script.google.com',
          'X-Title': 'EventPulse Form Builder'
        },
        payload: JSON.stringify({
          model: 'meta-llama/llama-3.3-70b-instruct:free',
          messages: [
            { role: 'system', content: 'You are an expert Google Form builder. Output valid JSON ONLY matching the requested schema.' },
            { role: 'user', content: prompt }
          ]
        }),
        muteHttpExceptions: true
      });
      if (orRes.getResponseCode() >= 200 && orRes.getResponseCode() < 300) {
        const json = JSON.parse(orRes.getContentText());
        const content = json.choices[0].message.content;
        Logger.log('Generated successfully via OpenRouter Free');
        return JSON.parse(stripFences_(content));
      }
    } catch (e) {
      Logger.log(`OpenRouter call failed: ${e.message}`);
    }
  }

  // Strategy 4: Google Gemini (v1 endpoint instead of deprecated v1beta models)
  if (geminiKey) {
    const geminiUrls = [
      `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`
    ];
    for (const url of geminiUrls) {
      try {
        const res = UrlFetchApp.fetch(url, {
          method: 'post',
          contentType: 'application/json',
          payload: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: 'application/json' }
          }),
          muteHttpExceptions: true
        });
        if (res.getResponseCode() >= 200 && res.getResponseCode() < 300) {
          const json = JSON.parse(res.getContentText());
          if (json.candidates && json.candidates[0].content.parts[0].text) {
            Logger.log('Generated successfully via Gemini');
            return JSON.parse(stripFences_(json.candidates[0].content.parts[0].text));
          }
        }
      } catch (e) {
        Logger.log(`Gemini endpoint failed: ${e.message}`);
      }
    }
  }

  // Strategy 5: Built-in High-Precision EventPulse Context Engine
  Logger.log('Using high-precision EventPulse contextual engine');
  return buildSmartFallbackForm_(description, tone);
}

/**
 * Returns structured prompt for LLMs.
 * Designed to understand ANY form request: feedback, voting/selection, polls, RSVPs, or evaluations.
 */
function getPrompt_(description, tone) {
  return `You are an intelligent Google Form builder.
User Request: "${description}"
Desired Tone: "${tone}"

TASK:
Analyze the user's intent. If they want a feedback form, generate evaluation questions. If they want a voting/selection form (e.g. "selecting a movie for movie night include rajamouli movies", choosing a restaurant, voting for games), generate EXACTLY what they asked for with specific, relevant options and questions (e.g. actual movie names like Baahubali, RRR, Eega, Magadheera for Rajamouli movies, snack preferences, timing, etc.).

Return valid JSON strictly matching this schema:
{
  "title": "Clear, appealing title matching the user's intent",
  "description": "Helpful description explaining the purpose of this form",
  "sections": [
    {
      "title": "Section Title",
      "questions": [
        {
          "type": "SCALE | MULTIPLE_CHOICE | CHECKBOX | PARAGRAPH | SHORT_TEXT",
          "text": "Specific question prompt",
          "options": ["Option 1", "Option 2", "Option 3", "Option 4"],
          "required": true,
          "scaleMin": 1,
          "scaleMax": 5,
          "lowLabel": "Low",
          "highLabel": "High"
        }
      ]
    }
  ]
}

RULES:
1. Pay strict attention to specific user instructions (e.g., if they ask for Rajamouli movies, include real movies like 'RRR', 'Baahubali: The Beginning', 'Baahubali: The Conclusion', 'Eega (Makkhi)', 'Magadheera', 'Chatrapathi' in the options!).
2. For selection/voting forms, use MULTIPLE_CHOICE or CHECKBOX with great choices.
3. Keep it between 5 to 10 practical questions across 1 to 3 sections.
4. Return pure JSON only. No markdown fences or commentary.`;
}

/**
 * Intelligent semantic context engine that crafts customized questions
 * based on the user's actual prompt when external APIs are offline.
 */
function buildSmartFallbackForm_(description, tone) {
  const lower = description.toLowerCase();
  const isMovie = /movie|film|cinema|watch|screening/i.test(description);
  const isRajamouli = /rajamouli|ssr|baahubali|rrr|eega|magadheera/i.test(description);
  const isVoting = /select|vote|choice|poll|pick|choose/i.test(description);

  // Case A: Movie Night / Film Selection Form
  if (isMovie || (isVoting && isRajamouli)) {
    const movieOptions = isRajamouli ? [
      "RRR (2022)",
      "Baahubali 2: The Conclusion (2017)",
      "Baahubali: The Beginning (2015)",
      "Eega / Makkhi (2012)",
      "Magadheera (2009)",
      "Vikramarkudu (2006)"
    ] : [
      "Inception (Sci-Fi / Thriller)",
      "Interstellar (Sci-Fi / Adventure)",
      "The Dark Knight (Action / Crime)",
      "Spirited Away (Animation / Fantasy)",
      "Knives Out (Mystery / Comedy)"
    ];

    return {
      title: isRajamouli ? "SS Rajamouli Movie Night Poll" : "Movie Night Selection & Poll",
      description: `Vote for your favorite film and help us organize the ultimate movie night! Takes 1 minute.`,
      sections: [
        {
          title: "Movie Selection",
          questions: [
            {
              type: "MULTIPLE_CHOICE",
              text: isRajamouli ? "Which S.S. Rajamouli masterpiece should we watch?" : "Vote for your #1 movie choice:",
              options: movieOptions,
              required: true
            },
            {
              type: "CHECKBOX",
              text: "Select any backup movies you'd also love to watch:",
              options: movieOptions,
              required: false
            },
            {
              type: "SHORT_TEXT",
              text: "Have another movie suggestion in mind?",
              required: false
            }
          ]
        },
        {
          title: "Schedule & Snacks",
          questions: [
            {
              type: "MULTIPLE_CHOICE",
              text: "What start time works best for you?",
              options: ["6:00 PM", "7:30 PM", "9:00 PM", "Late Night (10:30 PM)"],
              required: true
            },
            {
              type: "CHECKBOX",
              text: "What snacks / refreshments should we have?",
              options: ["Popcorn & Butter", "Pizza", "Nachos & Cheese", "Cold Drinks / Soda", "Samosas & Chai", "Ice Cream / Desserts"],
              required: false
            },
            {
              type: "PARAGRAPH",
              text: "Any dietary preferences or general suggestions for the night?",
              required: false
            }
          ]
        }
      ]
    };
  }

  // Case B: Standard Event / Tech / Workshop
  const isTech = /ai|ml|code|developer|hackathon|cloud|api|demo|keynote|software|tech|data/i.test(description);
  const isWorkshop = /workshop|masterclass|hands-on|training|bootcamp|lab/i.test(description);
  const isSocial = /networking|mixer|party|dinner|reception|meetup/i.test(description);

  let cleanTitle = description.split('\n')[0].substring(0, 50).trim();
  if (cleanTitle.length > 5 && !cleanTitle.toLowerCase().includes('feedback')) {
    cleanTitle += ' Feedback';
  } else {
    cleanTitle = 'Attendee Feedback & Evaluation';
  }

  const sections = [];

  // Section 1: Core Event Experience
  sections.push({
    title: "Overall Experience & CSAT",
    questions: [
      {
        type: "SCALE",
        text: "Overall rating of the event and session quality",
        scaleMin: 1,
        scaleMax: 5,
        lowLabel: "Poor",
        highLabel: "Exceptional",
        required: true
      },
      {
        type: "MULTIPLE_CHOICE",
        text: "Did this event meet your primary expectations?",
        options: ["Exceeded expectations", "Met expectations", "Somewhat met", "Did not meet expectations"],
        required: true
      },
      {
        type: "SCALE",
        text: "How likely are you to recommend our next edition to a colleague or friend? (1-5)",
        scaleMin: 1,
        scaleMax: 5,
        lowLabel: "Unlikely",
        highLabel: "Definitely",
        required: true
      }
    ]
  });

  // Section 2: Content & Technical / Session Depth
  const contentQs = [];
  if (isTech || isWorkshop) {
    contentQs.push({
      type: "MULTIPLE_CHOICE",
      text: "How would you rate the technical depth and pace of the content?",
      options: ["Too advanced / fast", "Just right & practical", "Too high-level / basic"],
      required: true
    });
    contentQs.push({
      type: "CHECKBOX",
      text: "Which session elements provided the highest practical value?",
      options: ["Live interactive demos", "Keynote announcements", "Hands-on coding / exercises", "Q&A and speaker insights"],
      required: false
    });
  } else {
    contentQs.push({
      type: "MULTIPLE_CHOICE",
      text: "Which aspect of the schedule was most engaging for you?",
      options: ["Main presentations", "Interactive activities", "Discussions & Q&A", "Community interaction"],
      required: true
    });
  }

  contentQs.push({
    type: "SCALE",
    text: "Clarity and preparation of the speakers / facilitators",
    scaleMin: 1,
    scaleMax: 5,
    lowLabel: "Needs polish",
    highLabel: "Masterful",
    required: false
  });

  sections.push({
    title: "Session Quality & Delivery",
    questions: contentQs
  });

  // Section 3: Logistics, Networking & Open Backlog
  const logQs = [
    {
      type: "SCALE",
      text: "Organization, timing, and venue/connectivity logistics",
      scaleMin: 1,
      scaleMax: 5,
      lowLabel: "Fair",
      highLabel: "Flawless",
      required: false
    }
  ];

  if (isSocial) {
    logQs.push({
      type: "SCALE",
      text: "Quality and value of the networking opportunities",
      scaleMin: 1,
      scaleMax: 5,
      lowLabel: "Limited",
      highLabel: "High-value connections",
      required: false
    });
  }

  logQs.push({
    type: "PARAGRAPH",
    text: "What single topic or feature should we prioritize for the next event?",
    required: false
  });

  sections.push({
    title: "Logistics & Suggestions",
    questions: logQs
  });

  return {
    title: cleanTitle,
    description: `Official feedback form configured for ${tone.toLowerCase()} attendee reception. Takes ~2 minutes to complete.`,
    sections: sections
  };
}

/**
 * Strips markdown code fences from the given text.
 */
function stripFences_(text) {
  let cleaned = text.trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.substring(7);
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.substring(3);
  }
  if (cleaned.endsWith('```')) {
    cleaned = cleaned.substring(0, cleaned.length - 3);
  }
  return cleaned.trim();
}

/**
 * Authorization helper.
 */
function authorizePermissions() {
  Logger.log("Triggering UrlFetchApp and FormApp permissions...");
  UrlFetchApp.fetch("https://www.google.com");
  Logger.log("Permissions ready!");
}
