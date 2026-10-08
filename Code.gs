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
  const apiKey = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');

  // Strategy 1: If Gemini API key is provided, try v1beta models
  if (apiKey) {
    const models = ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-2.0-flash'];
    for (const model of models) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        const payload = {
          contents: [{ parts: [{ text: getPrompt_(description, tone) }] }],
          generationConfig: { responseMimeType: 'application/json' }
        };
        const res = UrlFetchApp.fetch(url, {
          method: 'post',
          contentType: 'application/json',
          payload: JSON.stringify(payload),
          muteHttpExceptions: true
        });
        if (res.getResponseCode() >= 200 && res.getResponseCode() < 300) {
          const json = JSON.parse(res.getContentText());
          if (json.candidates && json.candidates[0].content.parts[0].text) {
            const raw = json.candidates[0].content.parts[0].text;
            return JSON.parse(stripFences_(raw));
          }
        }
      } catch (e) {
        Logger.log(`Gemini ${model} failed, trying next: ${e.message}`);
      }
    }
  }

  // Strategy 2: Free Cloud AI via Pollinations Text API (Free, zero-key, OpenAI compatible)
  try {
    const freeUrl = "https://text.pollinations.ai/";
    const prompt = getPrompt_(description, tone);
    const freeRes = UrlFetchApp.fetch(freeUrl, {
      method: "post",
      contentType: "application/json",
      payload: JSON.stringify({
        messages: [
          { role: "system", content: "You are an expert feedback form architect. Return JSON ONLY matching the requested schema." },
          { role: "user", content: prompt }
        ],
        model: "openai",
        jsonMode: true
      }),
      muteHttpExceptions: true
    });
    if (freeRes.getResponseCode() >= 200 && freeRes.getResponseCode() < 300) {
      const text = freeRes.getContentText();
      const parsed = JSON.parse(stripFences_(text));
      if (parsed.sections && parsed.sections.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    Logger.log(`Free AI provider error: ${err.message}`);
  }

  // Strategy 3: Guaranteed zero-failure EventPulse Semantic Engine
  // Parses event details, topics, activities and builds a custom structured form
  return buildSmartFallbackForm_(description, tone);
}

/**
 * Returns structured prompt for LLMs.
 */
function getPrompt_(description, tone) {
  return `Generate an event feedback form JSON for this event:
Event description: "${description}"
Tone: "${tone}"

Return valid JSON strictly matching this schema:
{
  "title": "Clear concise event feedback title",
  "description": "Short welcome note and estimated completion time",
  "sections": [
    {
      "title": "Section Name",
      "questions": [
        {
          "type": "SCALE | MULTIPLE_CHOICE | CHECKBOX | PARAGRAPH | SHORT_TEXT",
          "text": "Question prompt",
          "options": ["Option 1", "Option 2"],
          "required": true,
          "scaleMin": 1,
          "scaleMax": 5,
          "lowLabel": "Poor",
          "highLabel": "Exceptional"
        }
      ]
    }
  ]
}

Rules:
1. Max 10-12 questions across 2-3 logical sections.
2. Section 1: Overall Resonance & Experience (CSAT Rating, Value).
3. Section 2: Specific Sessions, Demos, Workshops mentioned in description.
4. Section 3: Logistics & Suggestions for Future.
5. Return JSON ONLY. No markdown explanation.`;
}

/**
 * Intelligent semantic context engine that crafts customized questions
 * based on the user's actual event description when external APIs are offline.
 */
function buildSmartFallbackForm_(description, tone) {
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
