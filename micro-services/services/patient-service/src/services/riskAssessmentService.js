const RiskAssessment = require("../models/RiskAssessment");

const DEFAULT_DISCLAIMER = "This is a simple risk estimation and not a medical diagnosis.";

function toNumber(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function toBoolean(value) {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    return value.trim().toLowerCase() === "true";
  }

  return Boolean(value);
}

function normalizeExerciseFrequency(value) {
  const normalized = String(value || "").trim().toLowerCase();
  const allowed = ["regularly", "sometimes", "rarely"];
  return allowed.includes(normalized) ? normalized : "sometimes";
}

function calculateBmi(heightCm, weightKg) {
  const heightM = heightCm / 100;
  return Number((weightKg / (heightM * heightM)).toFixed(1));
}

function getBmiCategory(bmi) {
  if (bmi < 18.5) {
    return "Underweight";
  }

  if (bmi < 25) {
    return "Normal";
  }

  if (bmi < 30) {
    return "Overweight";
  }

  return "Obese";
}

function getBloodPressureCategory(systolic, diastolic) {
  if (systolic >= 140 || diastolic >= 90) {
    return "High";
  }

  if (systolic >= 120 || diastolic >= 80) {
    return "Elevated";
  }

  return "Normal";
}

function getBloodSugarCategory(fastingBloodSugar) {
  if (fastingBloodSugar === null) {
    return "Not provided";
  }

  if (fastingBloodSugar >= 126) {
    return "High";
  }

  if (fastingBloodSugar >= 100) {
    return "Prediabetes range";
  }

  return "Normal";
}

function getRecommendedSpecialty(score, bloodSugar, systolic, diastolic) {
  if ((bloodSugar !== null && bloodSugar >= 126) || score >= 8) {
    return "General Physician / Endocrinologist";
  }

  if (systolic >= 140 || diastolic >= 90) {
    return "General Physician / Cardiologist";
  }

  return "General Physician";
}

function buildAdvice(riskLevel) {
  if (riskLevel === "High") {
    return "Higher risk indicators were detected. Please consult a doctor for a full medical assessment.";
  }

  if (riskLevel === "Medium") {
    return "Some risk indicators are present. Consider discussing these results with a doctor and improving lifestyle habits.";
  }

  return "Current inputs suggest a lower risk estimate. Continue healthy habits and repeat assessment if your health values change.";
}

function evaluateRisk(payload) {
  const age = toNumber(payload.age);
  const heightCm = toNumber(payload.heightCm);
  const weightKg = toNumber(payload.weightKg);
  const fastingBloodSugar = toNumber(payload.fastingBloodSugar);
  const bloodPressureSystolic = toNumber(payload.bloodPressureSystolic);
  const bloodPressureDiastolic = toNumber(payload.bloodPressureDiastolic);
  const cholesterol = toNumber(payload.cholesterol);
  const familyHistoryDiabetes = toBoolean(payload.familyHistoryDiabetes);
  const familyHistoryHypertension = toBoolean(payload.familyHistoryHypertension);
  const familyHistoryHeartDisease = toBoolean(payload.familyHistoryHeartDisease);
  const smoker = toBoolean(payload.smoker);
  const sedentaryLifestyle = toBoolean(payload.sedentaryLifestyle);
  const exerciseFrequency = normalizeExerciseFrequency(payload.exerciseFrequency);

  const missingFields = [];
  if (!age) {
    missingFields.push("age");
  }
  if (!heightCm) {
    missingFields.push("heightCm");
  }
  if (!weightKg) {
    missingFields.push("weightKg");
  }
  if (!bloodPressureSystolic) {
    missingFields.push("bloodPressureSystolic");
  }
  if (!bloodPressureDiastolic) {
    missingFields.push("bloodPressureDiastolic");
  }

  if (missingFields.length) {
    return {
      status: 400,
      body: { message: `Missing required fields: ${missingFields.join(", ")}` },
    };
  }

  if (age < 1 || age > 120) {
    return {
      status: 400,
      body: { message: "Age must be between 1 and 120" },
    };
  }

  if (heightCm < 50 || heightCm > 260) {
    return {
      status: 400,
      body: { message: "Height must be between 50 cm and 260 cm" },
    };
  }

  if (weightKg < 10 || weightKg > 400) {
    return {
      status: 400,
      body: { message: "Weight must be between 10 kg and 400 kg" },
    };
  }

  const bmi = calculateBmi(heightCm, weightKg);
  const bmiCategory = getBmiCategory(bmi);
  const bloodPressureCategory = getBloodPressureCategory(bloodPressureSystolic, bloodPressureDiastolic);
  const bloodSugarCategory = getBloodSugarCategory(fastingBloodSugar);
  const explanation = [];
  const factorScores = [];
  let score = 0;
  let lifestyleContribution = 0;
  const lifestyleBreakdown = {
    smoker: 0,
    exercise: 0,
    sedentary: 0,
  };

  if (age >= 60) {
    score += 3;
    explanation.push("Age is 60 or above");
    factorScores.push({ label: "Age is 60 or above", points: 3 });
  } else if (age >= 45) {
    score += 2;
    explanation.push("Age is between 45 and 59");
    factorScores.push({ label: "Age is between 45 and 59", points: 2 });
  } else if (age >= 30) {
    score += 1;
    explanation.push("Age is between 30 and 44");
    factorScores.push({ label: "Age is between 30 and 44", points: 1 });
  }

  if (bmi >= 30) {
    score += 2;
    explanation.push("BMI is in the obesity range");
    factorScores.push({ label: "BMI is in the obesity range", points: 2 });
  } else if (bmi >= 25) {
    score += 1;
    explanation.push("BMI is in the overweight range");
    factorScores.push({ label: "BMI is in the overweight range", points: 1 });
  }

  if (familyHistoryDiabetes) {
    score += 2;
    explanation.push("Family history of diabetes is present");
    factorScores.push({ label: "Family history of diabetes is present", points: 2 });
  }

  if (familyHistoryHypertension) {
    score += 1;
    explanation.push("Family history of hypertension is present");
    factorScores.push({ label: "Family history of hypertension is present", points: 1 });
  }

  if (familyHistoryHeartDisease) {
    score += 2;
    explanation.push("Family history of heart disease is present");
    factorScores.push({ label: "Family history of heart disease is present", points: 2 });
  }

  if (fastingBloodSugar !== null) {
    if (fastingBloodSugar >= 126) {
      score += 3;
      explanation.push("Fasting blood sugar is in a higher-risk range");
      factorScores.push({ label: "Fasting blood sugar is in a higher-risk range", points: 3 });
    } else if (fastingBloodSugar >= 100) {
      score += 2;
      explanation.push("Fasting blood sugar is above normal");
      factorScores.push({ label: "Fasting blood sugar is above normal", points: 2 });
    }
  }

  if (bloodPressureSystolic >= 140 || bloodPressureDiastolic >= 90) {
    score += 2;
    explanation.push("Blood pressure is high");
    factorScores.push({ label: "Blood pressure is high", points: 2 });
  } else if (bloodPressureSystolic >= 120 || bloodPressureDiastolic >= 80) {
    score += 1;
    explanation.push("Blood pressure is elevated");
    factorScores.push({ label: "Blood pressure is elevated", points: 1 });
  }

  if (cholesterol !== null && cholesterol >= 240) {
    score += 1;
    explanation.push("Cholesterol is in a higher-risk range");
    factorScores.push({ label: "Cholesterol is in a higher-risk range", points: 1 });
  }

  if (smoker) {
    score += 2;
    explanation.push("Smoking increases overall health risk");
    factorScores.push({ label: "Smoking increases overall health risk", points: 2 });
    lifestyleContribution += 2;
    lifestyleBreakdown.smoker = 2;
  }

  if (sedentaryLifestyle) {
    score += 1;
    explanation.push("Sedentary lifestyle contributes to risk");
    factorScores.push({ label: "Sedentary lifestyle contributes to risk", points: 1 });
    lifestyleContribution += 1;
    lifestyleBreakdown.sedentary = 1;
  }

  if (exerciseFrequency === "rarely") {
    score += 1;
    explanation.push("Exercise frequency is low");
    factorScores.push({ label: "Exercise frequency is low", points: 1 });
    lifestyleContribution += 1;
    lifestyleBreakdown.exercise = 1;
  }

  const riskLevel = score >= 8 ? "High" : score >= 4 ? "Medium" : "Low";
  const advice = buildAdvice(riskLevel);
  const recommendedSpecialty = getRecommendedSpecialty(score, fastingBloodSugar, bloodPressureSystolic, bloodPressureDiastolic);
  const topRiskFactors = factorScores
    .slice()
    .sort((left, right) => right.points - left.points || left.label.localeCompare(right.label))
    .slice(0, 3)
    .map((item) => item.label);

  return {
    status: 200,
    body: {
      normalizedInput: {
        age,
        gender: String(payload.gender || "").trim().toLowerCase(),
        heightCm,
        weightKg,
        bmi,
        bmiCategory,
        familyHistoryDiabetes,
        familyHistoryHypertension,
        familyHistoryHeartDisease,
        fastingBloodSugar,
        bloodPressureSystolic,
        bloodPressureDiastolic,
        bloodPressureCategory,
        cholesterol,
        bloodSugarCategory,
        smoker,
        exerciseFrequency,
        sedentaryLifestyle,
        lifestyleContribution,
        lifestyleBreakdown,
      },
      result: {
        score,
        riskLevel,
        bmi,
        bmiCategory,
        bloodPressureCategory,
        bloodSugarCategory,
        explanation: explanation.length ? explanation : ["No major rule-based risk indicators were detected from the entered values"],
        topRiskFactors,
        lifestyleContribution,
        lifestyleBreakdown,
        advice,
        disclaimer: DEFAULT_DISCLAIMER,
        recommendedSpecialty,
      },
    },
  };
}

function buildHistoryItem(item) {
  return {
    id: item._id,
    createdAt: item.createdAt,
    createdAtLabel: new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(new Date(item.createdAt)),
    age: item.age,
    gender: item.gender,
    bmi: item.bmi,
    bmiCategory: item.bmiCategory || "",
    score: item.score,
    riskLevel: item.riskLevel,
    bloodPressureCategory: item.bloodPressureCategory || "",
    bloodSugarCategory: item.bloodSugarCategory || "",
    explanation: item.explanation || [],
    topRiskFactors: item.topRiskFactors || [],
    lifestyleContribution: item.lifestyleContribution || 0,
    lifestyleBreakdown: item.lifestyleBreakdown || { smoker: 0, exercise: 0, sedentary: 0 },
    advice: item.advice || "",
    recommendedSpecialty: item.recommendedSpecialty || "General Physician",
  };
}

async function calculateRiskAssessment(patientId, payload) {
  const evaluated = evaluateRisk(payload);
  if (evaluated.status !== 200) {
    return evaluated;
  }

  const saved = await RiskAssessment.create({
    patientId,
    ...evaluated.body.normalizedInput,
    score: evaluated.body.result.score,
    riskLevel: evaluated.body.result.riskLevel,
    explanation: evaluated.body.result.explanation,
    topRiskFactors: evaluated.body.result.topRiskFactors,
    lifestyleContribution: evaluated.body.result.lifestyleContribution,
    lifestyleBreakdown: evaluated.body.result.lifestyleBreakdown,
    advice: evaluated.body.result.advice,
    disclaimer: evaluated.body.result.disclaimer,
    recommendedSpecialty: evaluated.body.result.recommendedSpecialty,
  });

  return {
    status: 200,
    body: {
      success: true,
      result: evaluated.body.result,
      savedAssessment: buildHistoryItem(saved),
    },
  };
}

async function listRiskAssessmentHistory(patientId) {
  const assessments = await RiskAssessment.find({ patientId }).sort({ createdAt: -1 });

  return {
    status: 200,
    body: {
      success: true,
      history: assessments.map(buildHistoryItem),
    },
  };
}

module.exports = {
  calculateRiskAssessment,
  listRiskAssessmentHistory,
};
