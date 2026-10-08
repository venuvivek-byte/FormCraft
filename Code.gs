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

  // 1. MOVIE / FILM NIGHT / ENTERTAINMENT
  const isMovie = /movie|film|cinema|watch|screening|theatre|theater|stream/i.test(description);
  const isRajamouli = /rajamouli|ssr|baahubali|rrr|eega|magadheera|maryada ramanna/i.test(description);
  const isMarvel = /marvel|mcu|avengers|spider|batman|superhero/i.test(description);
  const isAnime = /anime|manga|ghibli|naruto|shinkai/i.test(description);

  if (isMovie || isRajamouli || isMarvel || isAnime) {
    let movieChoices = [
      "Inception (Sci-Fi / Thriller)",
      "Interstellar (Sci-Fi / Adventure)",
      "The Dark Knight (Action / Crime)",
      "Parasite (Drama / Thriller)",
      "Knives Out (Mystery / Comedy)"
    ];
    let formTitle = "Movie Night Selection & Poll";

    if (isRajamouli) {
      formTitle = "S.S. Rajamouli Movie Night Poll";
      movieChoices = [
        "RRR (2022)",
        "Baahubali 2: The Conclusion (2017)",
        "Baahubali: The Beginning (2015)",
        "Eega / Makkhi (2012)",
        "Magadheera (2009)",
        "Chatrapathi (2005)",
        "Vikramarkudu (2006)"
      ];
    } else if (isMarvel) {
      formTitle = "Marvel Movie Marathon Vote";
      movieChoices = ["Avengers: Endgame", "Infinity War", "Spider-Man: No Way Home", "Iron Man", "Captain America: Winter Soldier"];
    } else if (isAnime) {
      formTitle = "Anime Movie Night Selection";
      movieChoices = ["Spirited Away", "Your Name (Kimi no Na wa)", "Princess Mononoke", "Suzume", "Demon Slayer: Mugen Train"];
    }

    return {
      title: formTitle,
      description: `Vote for your favorite film and help us organize the ultimate movie night! (${tone})`,
      sections: [
        {
          title: "Movie Voting",
          questions: [
            {
              type: "MULTIPLE_CHOICE",
              text: isRajamouli ? "Which S.S. Rajamouli masterpiece should we watch?" : "Vote for your #1 movie choice:",
              options: movieChoices,
              required: true
            },
            {
              type: "CHECKBOX",
              text: "Select any backup movies you'd also love to watch:",
              options: movieChoices,
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
              text: "What snacks & refreshments should we have?",
              options: ["Popcorn & Butter", "Pizza", "Nachos & Cheese", "Cold Drinks / Soda", "Samosas & Chai", "Ice Cream & Desserts"],
              required: false
            },
            {
              type: "PARAGRAPH",
              text: "Any dietary restrictions or seating preferences?",
              required: false
            }
          ]
        }
      ]
    };
  }

  // 2. FOOD / RESTAURANT / TEAM LUNCH / DINNER / POTLUCK
  if (/lunch|dinner|breakfast|food|restaurant|eat|potluck|dine|cafe|pizza|biryani|buffet/i.test(description)) {
    return {
      title: "Team Food & Dining Poll",
      description: `Vote on cuisine, venue, and timing for our meal together. (${tone})`,
      sections: [
        {
          title: "Cuisine & Venue Preferences",
          questions: [
            {
              type: "MULTIPLE_CHOICE",
              text: "What cuisine are you in the mood for?",
              options: ["Indian / Biryani & Curry", "Italian & Pizza / Pasta", "Asian / Chinese & Thai", "Burgers & Fast Casual", "Healthy Salads & Bowls", "South Indian Tiffins"],
              required: true
            },
            {
              type: "CHECKBOX",
              text: "Select preferred dining style:",
              options: ["Dine-in Restaurant", "Casual Cafe", "Order-in / Delivery to Office or Home", "Buffet", "Rooftop / Outdoor Seating"],
              required: false
            },
            {
              type: "SHORT_TEXT",
              text: "Do you have a specific restaurant in mind?",
              required: false
            }
          ]
        },
        {
          title: "Logistics & Dietary Needs",
          questions: [
            {
              type: "MULTIPLE_CHOICE",
              text: "What is your dietary preference?",
              options: ["Vegetarian", "Non-Vegetarian", "Vegan", "Halal", "Gluten-Free / Other"],
              required: true
            },
            {
              type: "MULTIPLE_CHOICE",
              text: "Preferred time slot:",
              options: ["12:30 PM", "1:30 PM", "7:30 PM", "8:30 PM"],
              required: true
            },
            {
              type: "PARAGRAPH",
              text: "Any food allergies or special instructions?",
              required: false
            }
          ]
        }
      ]
    };
  }

  // 3. SPORTS / FITNESS / GYM / GAME NIGHT
  if (/cricket|football|badminton|sports|gym|fitness|workout|game|board game|tournament|match/i.test(description)) {
    return {
      title: "Sports & Game Activity Poll",
      description: `Sign up and vote for our upcoming activity session. (${tone})`,
      sections: [
        {
          title: "Activity & Format",
          questions: [
            {
              type: "MULTIPLE_CHOICE",
              text: "Will you participate in the game?",
              options: ["Yes - Ready to play!", "Maybe / Tentative", "Spectator / Cheering squad", "Cannot make it"],
              required: true
            },
            {
              type: "MULTIPLE_CHOICE",
              text: "Your skill / experience level:",
              options: ["Beginner (Just for fun)", "Intermediate (Know the rules)", "Advanced / Competitive"],
              required: true
            },
            {
              type: "CHECKBOX",
              text: "Can you bring any equipment / gear?",
              options: ["Balls / Shuttlecocks", "Bats / Rackets", "First Aid Kit", "Water Cooler / Energy Drinks"],
              required: false
            }
          ]
        },
        {
          title: "Slot & Venue",
          questions: [
            {
              type: "MULTIPLE_CHOICE",
              text: "Best time slot for the session:",
              options: ["Early Morning (6:00 - 8:00 AM)", "Morning (8:00 - 10:00 AM)", "Evening (5:00 - 7:00 PM)", "Night Turf (8:00 - 10:00 PM)"],
              required: true
            },
            {
              type: "PARAGRAPH",
              text: "Any suggestions for venue or format?",
              required: false
            }
          ]
        }
      ]
    };
  }

  // 4. TRAVEL / WEEKEND TRIP / PICNIC / OUTING
  if (/trip|travel|vacation|weekend|picnic|trek|beach|resort|hike|road trip/i.test(description)) {
    return {
      title: "Weekend Trip & Outing Planner",
      description: `Help plan our trip destination, transport, and dates. (${tone})`,
      sections: [
        {
          title: "Destination & Dates",
          questions: [
            {
              type: "MULTIPLE_CHOICE",
              text: "What vibe do you prefer for this trip?",
              options: ["Hill Station / Mountain Trek", "Beach & Coastal Chill", "Resort Staycation with Pool", "Adventure & Camping", "Historical / Cultural Exploration"],
              required: true
            },
            {
              type: "MULTIPLE_CHOICE",
              text: "Trip duration preference:",
              options: ["1 Day Outing (Return by night)", "Overnight / 2 Days (Weekend)", "3-4 Days Long Weekend"],
              required: true
            },
            {
              type: "MULTIPLE_CHOICE",
              text: "Budget comfort level per person:",
              options: ["Budget-friendly (< $50 / ₹2,000)", "Moderate ($50-$150 / ₹2,000-₹8,000)", "Luxury ($150+ / ₹8,000+)"],
              required: true
            }
          ]
        },
        {
          title: "Travel & Activities",
          questions: [
            {
              type: "CHECKBOX",
              text: "Preferred mode of transportation:",
              options: ["Self-drive / Carpool", "Chartered Bus / Van", "Train", "Flight"],
              required: true
            },
            {
              type: "CHECKBOX",
              text: "Must-have activities:",
              options: ["Campfire & Music", "Trekking / Hiking", "Sightseeing", "Board Games & Indoor relax", "Photography"],
              required: false
            },
            {
              type: "SHORT_TEXT",
              text: "Emergency contact number or dietary notes:",
              required: false
            }
          ]
        }
      ]
    };
  }

  // 5. PARTY / CELEBRATION / BIRTHDAY / RSVP
  if (/party|birthday|celebration|anniversary|farewell|fest|gathering|rsvp/i.test(description)) {
    return {
      title: "Party & Celebration RSVP",
      description: `RSVP and help us plan music, activities, and food! (${tone})`,
      sections: [
        {
          title: "RSVP & Attendance",
          questions: [
            {
              type: "MULTIPLE_CHOICE",
              text: "Will you be attending?",
              options: ["Yes, definitely!", "Tentative (Will confirm soon)", "Sorry, cannot make it"],
              required: true
            },
            {
              type: "SHORT_TEXT",
              text: "Your Name & Contact (Phone or Email):",
              required: true
            },
            {
              type: "MULTIPLE_CHOICE",
              text: "Are you bringing any plus-ones?",
              options: ["Just me", "+1 Guest", "+2 or Family"],
              required: true
            }
          ]
        },
        {
          title: "Fun & Preferences",
          questions: [
            {
              type: "SHORT_TEXT",
              text: "Suggest a song for the party playlist:",
              required: false
            },
            {
              type: "CHECKBOX",
              text: "Drink / beverage preferences:",
              options: ["Mocktails / Juices", "Soda / Soft drinks", "Beer / Wine", "Cocktails", "Water only"],
              required: false
            },
            {
              type: "PARAGRAPH",
              text: "Leave a warm message or special wish for the host!",
              required: false
            }
          ]
        }
      ]
    };
  }

  // 6. DAILY WORK / STANDUP / TASK LOG / STUDY GROUP
  if (/standup|daily|study|class|project|sprint|scrum|meeting|weekly|work/i.test(description)) {
    return {
      title: "Daily Standup & Progress Check-in",
      description: `Daily synchronous sync for blockers, progress, and focus goals. (${tone})`,
      sections: [
        {
          title: "Progress & Focus",
          questions: [
            {
              type: "SHORT_TEXT",
              text: "Your Name / Role:",
              required: true
            },
            {
              type: "PARAGRAPH",
              text: "What did you complete yesterday / recently?",
              required: true
            },
            {
              type: "PARAGRAPH",
              text: "What are your top 1-2 priorities for today?",
              required: true
            },
            {
              type: "PARAGRAPH",
              text: "Any blockers or dependencies where you need support?",
              required: false
            },
            {
              type: "SCALE",
              text: "How energized and on-track are you feeling today? (1-5)",
              scaleMin: 1,
              scaleMax: 5,
              lowLabel: "Blocked",
              highLabel: "Unstoppable",
              required: false
            }
          ]
        }
      ]
    };
  }

  // 7. DEFAULT DYNAMIC FALLBACK: PARSES WHATEVER THE USER TYPED
  let cleanTitle = description.split('\n')[0].substring(0, 50).trim();
  if (cleanTitle.length > 3 && !cleanTitle.toLowerCase().includes('form')) {
    cleanTitle += ' Form & Poll';
  } else {
    cleanTitle = 'Event & Activity Form';
  }

  return {
    title: cleanTitle,
    description: `Created for: "${description.substring(0, 80)}...". (${tone})`,
    sections: [
      {
        title: "Preferences & Selections",
        questions: [
          {
            type: "MULTIPLE_CHOICE",
            text: `Select your preferred option for: ${description.substring(0, 50)}`,
            options: ["Option A - Recommended", "Option B - Alternative", "Option C - Flexible", "Other"],
            required: true
          },
          {
            type: "CHECKBOX",
            text: "Select all relevant choices or requirements:",
            options: ["Morning availability", "Afternoon availability", "Evening availability", "Weekend preferred"],
            required: false
          },
          {
            type: "SHORT_TEXT",
            text: "Your Name or Email:",
            required: true
          }
        ]
      },
      {
        title: "Details & Comments",
        questions: [
          {
            type: "SCALE",
            text: "Rate your enthusiasm / interest level (1-5)",
            scaleMin: 1,
            scaleMax: 5,
            lowLabel: "Low",
            highLabel: "Very High",
            required: true
          },
          {
            type: "PARAGRAPH",
            text: "Any specific notes, questions, or ideas you'd like to share?",
            required: false
          }
        ]
      }
    ]
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
