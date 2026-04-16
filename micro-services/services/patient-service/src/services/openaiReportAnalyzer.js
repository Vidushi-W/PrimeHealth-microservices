const fs = require("fs");
const OpenAI = require("openai");

const DEFAULT_MODEL = process.env.OPENAI_ANALYZER_MODEL || "gpt-5";
const DEFAULT_DISCLAIMER = "For informational use only — consult a doctor";

function getClient() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
}

function buildJsonSchema(schemaName, schema) {
  return {
    type: "json_schema",
    name: schemaName,
    strict: true,
    schema,
  };
}

async function uploadFile(client, filePath, purpose) {
  return client.files.create({
    file: fs.createReadStream(filePath),
    purpose,
  });
}

async function safeDeleteFile(client, fileId) {
  if (!fileId) {
    return;
  }

  try {
    await client.files.del(fileId);
  } catch (_error) {
    // Best-effort cleanup for uploaded analysis files.
  }
}

function parseOutputJson(response) {
  const outputText = String(response.output_text || "").trim();
  if (!outputText) {
    throw new Error("Model returned an empty response");
  }

  return JSON.parse(outputText);
}

async function analyzeTextReport({ filePath, fileName, reportType, notes }) {
  const client = getClient();
  let uploadedFileId = "";

  try {
    const uploaded = await uploadFile(client, filePath, "user_data");
    uploadedFileId = uploaded.id;

    const response = await client.responses.create({
      model: DEFAULT_MODEL,
      input: [
        {
          role: "system",
          content: [
            {
              type: "input_text",
              text: "You analyze medical reports for structured extraction. Extract only information explicitly present in the report. Never guess missing values. Keep summaries factual and concise.",
            },
          ],
        },
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: [
                `Report file: ${fileName}`,
                `Report type: ${reportType || "Unknown"}`,
                `Patient notes: ${notes || "None"}`,
                "Return JSON only.",
                "Use cautious medical wording.",
                "If a value is missing, leave it as an empty string or empty array.",
              ].join("\n"),
            },
            {
              type: "input_file",
              file_id: uploaded.id,
            },
          ],
        },
      ],
      text: {
        format: buildJsonSchema("medical_report_analysis", {
          type: "object",
          additionalProperties: false,
          properties: {
            summary: { type: "string" },
            extractedValues: {
              type: "object",
              additionalProperties: { type: "string" },
            },
            findings: {
              type: "array",
              items: { type: "string" },
            },
            confidence: {
              type: "number",
            },
            disclaimer: {
              type: "string",
            },
          },
          required: ["summary", "extractedValues", "findings", "confidence", "disclaimer"],
        }),
      },
    });

    const parsed = parseOutputJson(response);

    return {
      status: "done",
      analyzerType: "text_report",
      summary: parsed.summary || "AI summary unavailable",
      extractedValues: parsed.extractedValues || {},
      findings: Array.isArray(parsed.findings) ? parsed.findings : [],
      confidence: typeof parsed.confidence === "number" ? parsed.confidence : 0,
      disclaimer: parsed.disclaimer || DEFAULT_DISCLAIMER,
      analyzedAt: new Date(),
    };
  } finally {
    await safeDeleteFile(client, uploadedFileId);
  }
}

async function analyzeImageScan({ filePath, fileName, reportType, notes }) {
  const client = getClient();
  let uploadedFileId = "";

  try {
    const uploaded = await uploadFile(client, filePath, "vision");
    uploadedFileId = uploaded.id;

    const response = await client.responses.create({
      model: DEFAULT_MODEL,
      input: [
        {
          role: "system",
          content: [
            {
              type: "input_text",
              text: "You provide preliminary visual observations for medical scans and X-rays. Do not diagnose. Use cautious phrases like possible, may suggest, or low-confidence result.",
            },
          ],
        },
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: [
                `Scan file: ${fileName}`,
                `Scan type: ${reportType || "Unknown"}`,
                `Patient notes: ${notes || "None"}`,
                "Return JSON only.",
                "Do not present the result as a diagnosis.",
                "Include a disclaimer that the output is informational only.",
              ].join("\n"),
            },
            {
              type: "input_image",
              file_id: uploaded.id,
            },
          ],
        },
      ],
      text: {
        format: buildJsonSchema("image_scan_analysis", {
          type: "object",
          additionalProperties: false,
          properties: {
            summary: { type: "string" },
            findings: {
              type: "array",
              items: { type: "string" },
            },
            confidence: {
              type: "number",
            },
            disclaimer: {
              type: "string",
            },
          },
          required: ["summary", "findings", "confidence", "disclaimer"],
        }),
      },
    });

    const parsed = parseOutputJson(response);

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
  } finally {
    await safeDeleteFile(client, uploadedFileId);
  }
}

module.exports = {
  analyzeImageScan,
  analyzeTextReport,
  DEFAULT_DISCLAIMER,
};
