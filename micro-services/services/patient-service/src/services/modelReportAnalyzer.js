const fs = require("fs");
const path = require("path");
const OpenAI = require("openai");

const DEFAULT_OPENAI_MODEL = process.env.OPENAI_ANALYZER_MODEL || "gpt-5";
const DEFAULT_HF_TEXT_MODEL = process.env.HF_TEXT_ANALYZER_MODEL || "openai/gpt-oss-120b:fastest";
const DEFAULT_HF_VISION_MODEL = process.env.HF_VISION_ANALYZER_MODEL || "zai-org/GLM-4.5V:fastest";
const DEFAULT_DISCLAIMER = "For informational use only — consult a doctor";

function getProvider() {
  if (process.env.HF_TOKEN) {
    return "huggingface";
  }

  if (process.env.OPENAI_API_KEY) {
    return "openai";
  }

  throw new Error("No analyzer provider configured. Set HF_TOKEN or OPENAI_API_KEY.");
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

function getModel(provider, type) {
  if (provider === "huggingface") {
    return type === "vision" ? DEFAULT_HF_VISION_MODEL : DEFAULT_HF_TEXT_MODEL;
  }

  return DEFAULT_OPENAI_MODEL;
}

function extractPrintablePdfText(fileBuffer) {
  const rawText = fileBuffer.toString("latin1");
  const printableChunks = rawText.match(/[A-Za-z0-9/%().,:;+\-\s]{4,}/g) || [];
  return printableChunks
    .map((chunk) => chunk.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join("\n");
}

function extractLocalReportText(filePath, notes) {
  const fileBuffer = fs.readFileSync(filePath);
  const extension = path.extname(filePath).toLowerCase();
  const fragments = [String(notes || "").trim()];

  if ([".txt", ".csv", ".json", ".md"].includes(extension)) {
    fragments.push(fileBuffer.toString("utf8"));
  }

  if (extension === ".pdf") {
    fragments.push(extractPrintablePdfText(fileBuffer));
  }

  return fragments.filter(Boolean).join("\n");
}

function parseJsonText(content) {
  const raw = String(content || "").trim();
  if (!raw) {
    throw new Error("Model returned an empty response");
  }

  const fenced = raw.match(/```json\s*([\s\S]*?)```/i);
  const jsonText = fenced ? fenced[1].trim() : raw;
  return JSON.parse(jsonText);
}

async function createChatCompletion(client, payload) {
  const completion = await client.chat.completions.create(payload);
  return completion.choices?.[0]?.message?.content || "";
}

async function analyzeTextWithProvider(provider, { filePath, fileName, reportType, notes }) {
  const client = getClient(provider);
  const model = getModel(provider, "text");
  const extractedText = extractLocalReportText(filePath, notes);

  if (!extractedText) {
    throw new Error("No readable text could be extracted from the report");
  }

  const content = await createChatCompletion(client, {
    model,
    messages: [
      {
        role: "system",
        content: "You analyze medical reports for structured extraction. Extract only values explicitly present. Never guess missing values. Return JSON only.",
      },
      {
        role: "user",
        content: [
          `Report file: ${fileName}`,
          `Report type: ${reportType || "Unknown"}`,
          `Patient notes: ${notes || "None"}`,
          "Return a JSON object with keys: summary, extractedValues, findings, confidence, disclaimer.",
          "Use confidence as a number between 0 and 1.",
          "Use cautious wording for findings and possible abnormal values.",
          "",
          "Report text:",
          extractedText.slice(0, 12000),
        ].join("\n"),
      },
    ],
    response_format: { type: "json_object" },
  });

  const parsed = parseJsonText(content);

  return {
    status: "done",
    analyzerType: "text_report",
    summary: parsed.summary || "AI summary unavailable",
    extractedValues: parsed.extractedValues && typeof parsed.extractedValues === "object" ? parsed.extractedValues : {},
    findings: Array.isArray(parsed.findings) ? parsed.findings : [],
    confidence: typeof parsed.confidence === "number" ? parsed.confidence : 0,
    disclaimer: parsed.disclaimer || DEFAULT_DISCLAIMER,
    analyzedAt: new Date(),
  };
}

async function analyzeImageWithProvider(provider, { filePath, fileName, reportType, notes }) {
  const client = getClient(provider);
  const model = getModel(provider, "vision");
  const fileBuffer = fs.readFileSync(filePath);
  const extension = path.extname(fileName || filePath).toLowerCase();
  const mimeType = extension === ".png"
    ? "image/png"
    : extension === ".webp"
      ? "image/webp"
      : "image/jpeg";
  const base64Image = fileBuffer.toString("base64");

  const content = await createChatCompletion(client, {
    model,
    messages: [
      {
        role: "system",
        content: "You provide preliminary observations for medical scan images and X-rays. Do not diagnose. Use wording like possible finding, no obvious abnormality detected, or low-confidence result. Return JSON only.",
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: [
              `Scan file: ${fileName}`,
              `Scan type: ${reportType || "Unknown"}`,
              `Patient notes: ${notes || "None"}`,
              "Return a JSON object with keys: summary, findings, confidence, disclaimer.",
              "Use confidence as a number between 0 and 1.",
              "Do not present the result as a diagnosis.",
            ].join("\n"),
          },
          {
            type: "image_url",
            image_url: {
              url: `data:${mimeType};base64,${base64Image}`,
            },
          },
        ],
      },
    ],
    response_format: { type: "json_object" },
  });

  const parsed = parseJsonText(content);

  return {
    status: "done",
    analyzerType: "image_scan",
    summary: parsed.summary || "Experimental scan insight unavailable",
    extractedValues: {},
    findings: Array.isArray(parsed.findings) ? parsed.findings : [],
    confidence: typeof parsed.confidence === "number" ? parsed.confidence : 0,
    disclaimer: parsed.disclaimer || DEFAULT_DISCLAIMER,
    analyzedAt: new Date(),
  };
}

async function analyzeTextReport(input) {
  return analyzeTextWithProvider(getProvider(), input);
}

async function analyzeImageScan(input) {
  return analyzeImageWithProvider(getProvider(), input);
}

module.exports = {
  analyzeImageScan,
  analyzeTextReport,
  DEFAULT_DISCLAIMER,
};
