const OpenAI = require("openai");
const SymptomCheck = require("../models/SymptomCheck");
const { getAccessibleProfile } = require("./familyProfileService");

const DEFAULT_DISCLAIMER = "This is a preliminary symptom check and not a medical diagnosis.";
const DEFAULT_AI_DISCLAIMER = "This is a preliminary AI-assisted symptom check for informational use only and not a medical diagnosis.";
const DEFAULT_HF_MODEL = process.env.HF_TEXT_ANALYZER_MODEL || "openai/gpt-oss-120b:fastest";
const DEFAULT_OPENAI_MODEL = process.env.OPENAI_ANALYZER_MODEL || "gpt-5";
const SYMPTOM_SYNONYMS = {
  "high fever": "fever",
  "low fever": "fever",
  "temperature": "fever",
  "body pain": "body ache",
  "body pains": "body ache",
  "joint pain": "joint pain",
  "muscle pain": "body ache",
  "runny nose": "runny nose",
  "blocked nose": "nasal congestion",
  "stuffy nose": "nasal congestion",
  "sinus pressure": "facial pain",
  "face pain": "facial pain",
  "pain while urinating": "burning urination",
  "burning urine": "burning urination",
  "burning when urinating": "burning urination",
  "urine burning": "burning urination",
  "frequent urine": "frequent urination",
  "passing urine often": "frequent urination",
  "pain behind eyes": "eye pain",
  "retro orbital pain": "eye pain",
  "loose motion": "diarrhea",
  "loose motions": "diarrhea",
  "vomitting": "vomiting",
  "breathing difficulty": "shortness of breath",
  "trouble breathing": "shortness of breath",
  "breathlessness": "shortness of breath",
};

function normalizeSymptomList(symptoms) {
  const normalized = Array.isArray(symptoms)
    ? symptoms
      .flatMap((item) => String(item || "").split(","))
    : String(symptoms || "").split(",");

  return [...new Set(
    normalized
      .map((item) => item.trim().toLowerCase())
      .map((item) => SYMPTOM_SYNONYMS[item] || item)
      .filter(Boolean),
  )];
}

function hasAllSymptoms(symptoms, required) {
  return required.every((symptom) => symptoms.includes(symptom));
}

function hasAnySymptoms(symptoms, candidates) {
  return candidates.some((symptom) => symptoms.includes(symptom));
}

function countMatchingSymptoms(symptoms, candidates) {
  return candidates.filter((symptom) => symptoms.includes(symptom)).length;
}

function parseBloodPressure(value) {
  const match = /^(\d{2,3})\s*\/\s*(\d{2,3})$/.exec(String(value || "").trim());
  if (!match) {
    return null;
  }

  return {
    systolic: Number(match[1]),
    diastolic: Number(match[2]),
  };
}

function getProvider() {
  if (process.env.HF_TOKEN) {
    return "huggingface";
  }

  if (process.env.OPENAI_API_KEY) {
    return "openai";
  }

  return null;
}

function getClient(provider) {
  if (provider === "huggingface") {
    return new OpenAI({
      apiKey: process.env.HF_TOKEN,
      baseURL: "https://router.huggingface.co/v1",
    });
  }

  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
}

function getModel(provider) {
  return provider === "huggingface" ? DEFAULT_HF_MODEL : DEFAULT_OPENAI_MODEL;
}

function parseJsonText(content) {
  const raw = String(content || "").trim();
  if (!raw) {
    throw new Error("Model returned an empty response");
  }

  const fenced = raw.match(/```json\s*([\s\S]*?)```/i);
  return JSON.parse(fenced ? fenced[1].trim() : raw);
}

function normalizePrecautions(precautions) {
  if (!Array.isArray(precautions)) {
    return [];
  }

  return precautions
    .map((item) => String(item || "").trim())
    .filter(Boolean)
    .slice(0, 5);
}

function cleanResultShape(result) {
  return {
    possibleCategory: String(result.possibleCategory || "General symptom review recommended").trim(),
    possibleIllness: String(result.possibleIllness || result.possibleCategory || "General viral or non-specific symptom pattern").trim(),
    recommendedSpecialty: String(result.recommendedSpecialty || "General Physician").trim(),
    urgency: ["low", "medium", "high"].includes(String(result.urgency || "").toLowerCase())
      ? String(result.urgency).toLowerCase()
      : "low",
    advice: String(result.advice || "Monitor symptoms closely and book a consultation if they persist, worsen, or new symptoms appear.").trim(),
    precautions: normalizePrecautions(result.precautions),
    disclaimer: String(result.disclaimer || DEFAULT_DISCLAIMER).trim(),
  };
}

function evaluateSymptomRules(payload) {
  const symptoms = normalizeSymptomList(payload.symptoms);
  const bloodPressure = parseBloodPressure(payload.bloodPressure);
  const temperature = payload.temperature !== undefined && payload.temperature !== null && payload.temperature !== ""
    ? Number(payload.temperature)
    : null;
  const sugarLevel = payload.sugarLevel !== undefined && payload.sugarLevel !== null && payload.sugarLevel !== ""
    ? Number(payload.sugarLevel)
    : null;
  const isSevere = payload.severity === "severe";

  if (hasAllSymptoms(symptoms, ["chest pain", "shortness of breath"])) {
    return cleanResultShape({
      possibleCategory: "Possible urgent cardiac or breathing-related issue",
      possibleIllness: "Possible chest-related emergency pattern",
      recommendedSpecialty: "Emergency / Cardiologist",
      urgency: "high",
      advice: "Seek urgent medical attention as soon as possible, especially if symptoms are ongoing, worsening, or associated with sweating, faintness, or arm or jaw pain.",
      precautions: [
        "Avoid exertion and get immediate medical help",
        "Do not delay care if the pain is persistent or worsening",
        "Keep emergency contact support nearby",
      ],
      disclaimer: DEFAULT_DISCLAIMER,
    });
  }

  if (hasAllSymptoms(symptoms, ["fever", "cough", "sore throat"])) {
    return cleanResultShape({
      possibleCategory: "Possible respiratory infection",
      possibleIllness: "Possible viral fever, throat infection, or flu-like illness",
      recommendedSpecialty: "General Physician",
      urgency: isSevere || (temperature !== null && temperature >= 39) ? "high" : "medium",
      advice: "Rest, stay hydrated, and arrange a consultation if symptoms continue, temperature stays high, or breathing becomes uncomfortable.",
      precautions: [
        "Drink warm fluids and stay well hydrated",
        "Rest and avoid heavy activity until the fever settles",
        "Prefer light meals and avoid iced drinks if they worsen throat irritation",
        "Monitor temperature and seek review if it keeps rising",
      ],
      disclaimer: DEFAULT_DISCLAIMER,
    });
  }

  if (hasAllSymptoms(symptoms, ["fever", "body ache"]) || hasAllSymptoms(symptoms, ["fever", "fatigue"])) {
    return cleanResultShape({
      possibleCategory: "Possible fever-related viral illness",
      possibleIllness: "Possible viral fever or flu-like illness",
      recommendedSpecialty: "General Physician",
      urgency: isSevere || (temperature !== null && temperature >= 39) ? "high" : "medium",
      advice: "Use supportive care, monitor the fever trend, and book a review if symptoms persist beyond a few days or get worse.",
      precautions: [
        "Rest and keep fluid intake up",
        "Use light clothing and avoid overheating",
        "Prefer warm fluids and simple meals",
        "Avoid strenuous work until the fever improves",
      ],
      disclaimer: DEFAULT_DISCLAIMER,
    });
  }

  if (
    symptoms.includes("fever")
    && countMatchingSymptoms(symptoms, ["body ache", "joint pain", "headache", "eye pain", "rash", "fatigue"]) >= 2
  ) {
    return cleanResultShape({
      possibleCategory: "Possible mosquito-borne fever pattern",
      possibleIllness: "Possible dengue-like viral illness pattern",
      recommendedSpecialty: "General Physician",
      urgency: isSevere || (temperature !== null && temperature >= 39) ? "high" : "medium",
      advice: "Arrange a prompt medical review, especially if the fever is persistent, body pain is marked, or new warning symptoms such as vomiting or bleeding appear.",
      precautions: [
        "Rest and maintain good fluid intake",
        "Avoid dehydration and monitor urine output",
        "Seek urgent review if vomiting, bleeding, dizziness, or worsening weakness develops",
        "Avoid self-medicating without doctor advice if symptoms are escalating",
      ],
      disclaimer: DEFAULT_DISCLAIMER,
    });
  }

  if (countMatchingSymptoms(symptoms, ["nasal congestion", "runny nose", "facial pain", "headache", "sore throat", "cough"]) >= 3) {
    return cleanResultShape({
      possibleCategory: "Possible sinus or upper airway inflammation",
      possibleIllness: "Possible sinus infection or upper respiratory tract irritation",
      recommendedSpecialty: "General Physician / ENT Specialist",
      urgency: isSevere ? "medium" : "low",
      advice: "Use supportive care and arrange a review if facial pain increases, fever appears, or symptoms do not improve over the next several days.",
      precautions: [
        "Use warm fluids and stay hydrated",
        "Avoid smoke, dust, and other nasal irritants",
        "Warm steam or humidified air may help ease congestion",
        "Rest and monitor for worsening facial pain or fever",
      ],
      disclaimer: DEFAULT_DISCLAIMER,
    });
  }

  if (hasAllSymptoms(symptoms, ["rash", "itching"])) {
    return cleanResultShape({
      possibleCategory: "Possible skin-related irritation",
      possibleIllness: "Possible allergic rash or skin irritation",
      recommendedSpecialty: "Dermatologist",
      urgency: isSevere ? "medium" : "low",
      advice: "Arrange a dermatology review if the rash spreads, becomes painful, or is associated with swelling or breathing symptoms.",
      precautions: [
        "Avoid new creams, soaps, or cosmetics until reviewed",
        "Do not scratch the area if possible",
        "Keep the skin cool and clean",
      ],
      disclaimer: DEFAULT_DISCLAIMER,
    });
  }

  if (
    countMatchingSymptoms(symptoms, ["burning urination", "frequent urination", "lower abdominal pain"]) >= 2
    || (symptoms.includes("burning urination") && symptoms.includes("fever"))
  ) {
    return cleanResultShape({
      possibleCategory: "Possible urinary tract issue",
      possibleIllness: "Possible urinary tract infection pattern",
      recommendedSpecialty: "General Physician / Urologist",
      urgency: isSevere || symptoms.includes("fever") ? "medium" : "low",
      advice: "Book a medical review, especially if urinary burning continues, fever develops, or pain increases.",
      precautions: [
        "Drink water regularly unless a doctor has restricted fluids",
        "Do not hold urine for long periods",
        "Avoid very irritating drinks if they worsen urinary discomfort",
      ],
      disclaimer: DEFAULT_DISCLAIMER,
    });
  }

  if (hasAllSymptoms(symptoms, ["headache", "blurred vision"]) && bloodPressure && bloodPressure.systolic >= 140) {
    return cleanResultShape({
      possibleCategory: "Possible blood-pressure-related neurological concern",
      possibleIllness: "Possible high blood pressure related symptom pattern",
      recommendedSpecialty: "General Physician / Neurologist",
      urgency: "high",
      advice: "Arrange medical review promptly, especially if blood pressure stays high, the headache worsens, or weakness develops.",
      precautions: [
        "Recheck blood pressure in a calm seated position",
        "Avoid high-salt meals until reviewed",
        "Do not ignore worsening headache, weakness, or confusion",
      ],
      disclaimer: DEFAULT_DISCLAIMER,
    });
  }

  if (hasAllSymptoms(symptoms, ["fatigue", "frequent urination"]) && sugarLevel !== null && sugarLevel >= 180) {
    return cleanResultShape({
      possibleCategory: "Possible blood sugar imbalance",
      possibleIllness: "Possible hyperglycemia or diabetes-related pattern",
      recommendedSpecialty: "Endocrinologist",
      urgency: isSevere ? "high" : "medium",
      advice: "Monitor hydration and arrange a diabetes-focused consultation if sugar readings stay elevated or symptoms worsen.",
      precautions: [
        "Drink water regularly to avoid dehydration",
        "Limit sugary drinks and high-sugar snacks",
        "Monitor sugar readings again if possible",
      ],
      disclaimer: DEFAULT_DISCLAIMER,
    });
  }

  if (hasAnySymptoms(symptoms, ["stomach pain", "abdominal pain", "nausea", "vomiting", "diarrhea"])) {
    return cleanResultShape({
      possibleCategory: "Possible digestive system issue",
      possibleIllness: "Possible gastritis, food-related illness, or stomach infection pattern",
      recommendedSpecialty: "General Physician",
      urgency: isSevere ? "medium" : "low",
      advice: "Take fluids carefully and book a medical review if symptoms continue, worsen, or oral intake becomes difficult.",
      precautions: [
        "Use small amounts of fluid often to stay hydrated",
        "Prefer bland foods until the stomach settles",
        "Avoid oily or very spicy meals for now",
      ],
      disclaimer: DEFAULT_DISCLAIMER,
    });
  }

  return cleanResultShape({
    possibleCategory: "General symptom review recommended",
    possibleIllness: "Possible non-specific viral or general medical issue",
    recommendedSpecialty: "General Physician",
    urgency: isSevere ? "medium" : "low",
    advice: "Monitor symptoms closely and book a consultation if they persist, worsen, or new symptoms appear.",
    precautions: [
      "Rest and stay hydrated",
      "Track any change in symptoms or temperature",
      "Seek review sooner if symptoms intensify",
    ],
    disclaimer: DEFAULT_DISCLAIMER,
  });
}

async function enrichSymptomResultWithAI(payload, ruleResult) {
  const provider = getProvider();
  if (!provider) {
    return { result: ruleResult, source: "rules" };
  }

  const client = getClient(provider);
  const model = getModel(provider);
  const symptomText = normalizeSymptomList(payload.symptoms).join(", ");

  const completion = await client.chat.completions.create({
    model,
    messages: [
      {
        role: "system",
        content: [
          "You are assisting a healthcare symptom checker.",
          "You must use cautious, non-diagnostic wording.",
          "Do not claim a final diagnosis.",
          "Return JSON only.",
          "Allowed urgency values: low, medium, high.",
          "Use fields: possibleCategory, possibleIllness, recommendedSpecialty, urgency, advice, precautions, disclaimer.",
          "possibleIllness must begin with words like 'Possible' or 'Preliminary pattern suggestive of'.",
          "advice should include simple home precautions when appropriate, such as hydration, rest, avoiding irritants, and when to seek care.",
          "If symptoms suggest fever or throat irritation, it is acceptable to suggest warm fluids and avoiding iced drinks if they worsen discomfort.",
          "If the entered symptoms fit a recognizable pattern such as dengue-like fever, sinus irritation, urinary tract irritation, respiratory infection, digestive illness, or allergy pattern, you may mention that as a possible illness pattern using cautious wording.",
          "Base your answer on the actual symptom combination and vital values provided by the user.",
        ].join(" "),
      },
      {
        role: "user",
        content: [
          `Symptoms: ${symptomText || "None provided"}`,
          `Duration: ${payload.duration || "Unknown"}`,
          `Severity: ${payload.severity || "Unknown"}`,
          `Temperature: ${payload.temperature ?? "Not provided"}`,
          `Sugar level: ${payload.sugarLevel ?? "Not provided"}`,
          `Blood pressure: ${payload.bloodPressure || "Not provided"}`,
          `Notes: ${payload.notes || "None"}`,
          `Base rule result: ${JSON.stringify(ruleResult)}`,
          "Keep the answer realistic for a telemedicine symptom checker.",
        ].join("\n"),
      },
    ],
    response_format: { type: "json_object" },
  });

  const content = completion.choices?.[0]?.message?.content || "";
  const parsed = parseJsonText(content);
  const aiResult = cleanResultShape({
    ...ruleResult,
    ...parsed,
    disclaimer: parsed.disclaimer || DEFAULT_AI_DISCLAIMER,
  });

  return {
    result: aiResult,
    source: provider,
  };
}

async function checkSymptoms(patientId, payload, profileId) {
  const normalizedSymptoms = normalizeSymptomList(payload.symptoms);
  const duration = String(payload.duration || "").trim();
  const severity = String(payload.severity || "").trim().toLowerCase();

  if (!normalizedSymptoms.length) {
    return {
      status: 400,
      body: { message: "At least one symptom is required" },
    };
  }

  if (!duration) {
    return {
      status: 400,
      body: { message: "Duration is required" },
    };
  }

  if (!["mild", "moderate", "severe"].includes(severity)) {
    return {
      status: 400,
      body: { message: "Severity must be mild, moderate, or severe" },
    };
  }

  const normalizedPayload = {
    ...payload,
    symptoms: normalizedSymptoms,
    severity,
    temperature: payload.temperature !== undefined && payload.temperature !== "" ? Number(payload.temperature) : null,
    sugarLevel: payload.sugarLevel !== undefined && payload.sugarLevel !== "" ? Number(payload.sugarLevel) : null,
    bloodPressure: payload.bloodPressure || "",
    notes: payload.notes || "",
  };

  const ruleResult = evaluateSymptomRules(normalizedPayload);
  let result = ruleResult;
  let analysisSource = "rules";

  const profile = await getAccessibleProfile(patientId, profileId);
  if (!profile) {
    return {
      status: 404,
      body: { message: "Patient profile not found" },
    };
  }

  try {
    const enriched = await enrichSymptomResultWithAI(normalizedPayload, ruleResult);
    result = enriched.result;
    analysisSource = enriched.source;
  } catch (_error) {
    result = ruleResult;
  }

  const savedCheck = await SymptomCheck.create({
    patientId,
    profileId: profile._id,
    symptoms: normalizedSymptoms,
    duration,
    severity,
    temperature: normalizedPayload.temperature,
    sugarLevel: normalizedPayload.sugarLevel,
    bloodPressure: normalizedPayload.bloodPressure,
    notes: normalizedPayload.notes,
    possibleCategory: result.possibleCategory,
    possibleIllness: result.possibleIllness,
    recommendedSpecialty: result.recommendedSpecialty,
    urgency: result.urgency,
    advice: result.advice,
    precautions: result.precautions,
    disclaimer: result.disclaimer,
  });

  return {
    status: 200,
    body: {
      success: true,
      result,
      analysisSource,
      historyId: savedCheck._id,
    },
  };
}

module.exports = {
  checkSymptoms,
};
