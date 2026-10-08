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
    const data = callGemini_(description, tone);
    
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
 * Calls the Gemini API to generate the form structure.
 * @param {string} description - The description of the event.
 * @param {string} tone - The desired tone of the form.
 * @returns {Object} The parsed JSON object representing the form structure.
 */
function callGemini_(description, tone) {
  const apiKey = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY not found in script properties.");
  }
  
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
  
  const payload = {
    systemInstruction: {
      parts: [
        {
          text: `You are an expert form generator. Generate a feedback form JSON.
Extract event purpose, activities/sessions, technical details from description.
Always include overall rating, organization/logistics section, would-recommend question.
Add one section per activity mentioned.
If technical content (workshop, hackathon, demo), add technical section: difficulty, tools, AV/Wi-Fi.
End with open suggestions question.
Maximum 15 questions. Apply the chosen tone.
Return JSON only, no extra text.`
        }
      ]
    },
    contents: [
      {
        parts: [
          { text: `Event: ${description}\nTone: ${tone}` }
        ]
      }
    ],
    generationConfig: {
      responseMimeType: 'application/json'
    }
  };
  
  const options = {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };
  
  let lastError = null;
  for (let i = 0; i < 2; i++) {
    try {
      const response = UrlFetchApp.fetch(url, options);
      const responseCode = response.getResponseCode();
      const content = response.getContentText();
      
      if (responseCode >= 200 && responseCode < 300) {
        const json = JSON.parse(content);
        if (json.candidates && json.candidates.length > 0) {
          const rawText = json.candidates[0].content.parts[0].text;
          const cleanedText = stripFences_(rawText);
          return JSON.parse(cleanedText);
        } else {
          throw new Error("Invalid response format from Gemini API.");
        }
      } else {
        throw new Error(`API Error ${responseCode}: ${content}`);
      }
    } catch (e) {
      lastError = e;
      Utilities.sleep(1000); // Wait 1 second before retry
    }
  }
  throw new Error(`Failed to call Gemini API after retries: ${lastError.message}`);
}

/**
 * Strips markdown code fences from the given text.
 * @param {string} text - The text to strip fences from.
 * @returns {string} The cleaned text.
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
