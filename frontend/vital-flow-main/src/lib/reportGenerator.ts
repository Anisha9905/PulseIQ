import { jsPDF } from "jspdf";
import { UserProfile, GlucoseReading, AlertItem } from "@/store/glucoseStore";

export interface ReportData {
  user: UserProfile | null;
  currentGlucose: number;
  trend: string;
  healthScore: number;
  healthCategory: string;
  healthExplanation: string;
  healthRecommendations: string[];
  heartRate: number;
  temperature: number;
  stress: string;
  spo2: number;
  activity: string;
  confidence: number;
  calibration: number;
  history: GlucoseReading[];
  alerts: AlertItem[];
  calibrationEntries?: any[];
}

function normalizeStatus(value: string | undefined, fallback: string) {
  const text = (value || fallback).toString().trim().toLowerCase();
  if (text.includes("high") || text.includes("elevated")) return "High";
  if (text.includes("moderate") || text.includes("medium")) return "Moderate";
  if (text.includes("low") || text.includes("stable") || text.includes("optimal") || text.includes("normal")) return "Low";
  return fallback;
}

function safeText(value: unknown, fallback = "Not Available") {
  if (value === undefined || value === null || value === "") return fallback;
  return String(value);
}

function formatNumber(value: unknown, suffix = "") {
  const parsed = Number(value);
  if (Number.isFinite(parsed) && parsed > 0) return `${parsed}${suffix}`;
  return "Not Available";
}

export function generatePDFReport(data: ReportData) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;
  
  const generatedAt = new Date();
  const createdDate = generatedAt.toLocaleDateString([], { year: "numeric", month: "long", day: "numeric" });
  const createdTime = generatedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const reportId = `PIQ-MED-${Math.floor(100000 + Math.random() * 900000)}`;
  
  const patientName = safeText(data.user?.name, "Patient");
  const sanitizedName = patientName.replace(/\s+/g, "_").replace(/[^a-zA-Z0-9_-]/g, "") || "Patient";
  const filename = `PulseIQ_Diagnostic_Report_${sanitizedName}_${generatedAt.toISOString().split("T")[0]}.pdf`;

  const colors = {
    primary: [25, 118, 210],    // Medical Blue
    secondary: [2, 136, 209],   // Light Medical Blue
    success: [46, 125, 50],     // Dark Green
    warning: [239, 108, 0],     // Orange
    danger: [198, 40, 40],      // Dark Red
    text: [33, 33, 33],         // Dark Gray
    muted: [97, 116, 142],      // Muted Blue-Gray
    border: [207, 216, 220],    // Light Gray Border
    bg: [245, 247, 250],        // Soft Background
    white: [255, 255, 255],
  } as const;

  // The user stated: "no heartand ppg sesnor are connected"
  const heartSensorConnected = false;
  const ppgSensorConnected = false;

  // Since sensors are disconnected, overwrite data with "Not Available"
  const heartRateValue = heartSensorConnected ? data.heartRate : 0;
  const spo2Value = ppgSensorConnected ? data.spo2 : 0;

  const riskLevel = normalizeStatus(
    data.currentGlucose > 140 ? "High" : data.currentGlucose < 70 ? "High" : data.currentGlucose > 120 ? "Moderate" : "Low",
    data.healthCategory
  );
  
  let currentY = margin;
  let pageNum = 1;

  // ── Layout Engine ─────────────────────────────────────────────────────────

  const checkPageBreak = (requiredHeight: number) => {
    if (currentY + requiredHeight > pageHeight - margin - 15) {
      drawFooter();
      doc.addPage();
      pageNum++;
      currentY = margin;
      drawHeader();
    }
  };

  const drawHeader = () => {
    doc.setFillColor(colors.primary[0], colors.primary[1], colors.primary[2]);
    doc.rect(0, 0, pageWidth, 28, "F");
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(colors.white[0], colors.white[1], colors.white[2]);
    doc.text("PulseIQ", margin, 12);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(230, 240, 255);
    doc.text("AI-Based Non-Invasive Glucose Trend Prediction System", margin, 18);
    doc.text("Health Assessment Report", margin, 24);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(colors.white[0], colors.white[1], colors.white[2]);
    doc.text(`Report ID: ${reportId}`, pageWidth - margin, 14, { align: "right" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(230, 240, 255);
    doc.text(`Date: ${createdDate} ${createdTime}`, pageWidth - margin, 20, { align: "right" });

    currentY = 38;
  };

  const drawFooter = () => {
    doc.setDrawColor(colors.border[0], colors.border[1], colors.border[2]);
    doc.line(margin, pageHeight - 15, pageWidth - margin, pageHeight - 15);
    doc.setFont("helvetica", "italic");
    doc.setFontSize(7);
    doc.setTextColor(colors.muted[0], colors.muted[1], colors.muted[2]);
    doc.text(`Report ID: ${reportId}  |  Generated on ${createdDate}`, margin, pageHeight - 10);
    doc.text(`Page ${pageNum}`, pageWidth - margin, pageHeight - 10, { align: "right" });
  };

  const drawSectionTitle = (title: string, icon: string) => {
    checkPageBreak(12);
    doc.setFillColor(colors.bg[0], colors.bg[1], colors.bg[2]);
    doc.setDrawColor(colors.border[0], colors.border[1], colors.border[2]);
    doc.roundedRect(margin, currentY, contentWidth, 8, 1, 1, "FD");
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
    doc.text(`${title}`, margin + 3, currentY + 5.5);
    currentY += 12;
  };

  // ── Render ───────────────────────────────────────────────────────────────

  drawHeader();

  // 2. Patient Information
  drawSectionTitle("2. Patient Information", "");
  checkPageBreak(25);
  const patientGrid = [
    { label: "Patient Name:", value: patientName },
    { label: "Patient ID:", value: data.user?.email ? data.user.email : "Not Available" },
    { label: "Age:", value: safeText(data.user?.age, "Not Available") },
    { label: "Gender:", value: safeText(data.user?.gender, "Not Available") },
    { label: "Height:", value: data.user?.height ? `${data.user.height} cm` : "Not Available" },
    { label: "Weight:", value: data.user?.weight ? `${data.user.weight} kg` : "Not Available" },
    { label: "BMI:", value: data.user?.weight && data.user?.height ? (data.user.weight / Math.pow(data.user.height / 100, 2)).toFixed(1) : "Not Available" },
    { label: "Contact:", value: safeText(data.user?.phone, "Not Available") },
  ];

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  let gx = margin;
  let gy = currentY;
  patientGrid.forEach((item, index) => {
    doc.setTextColor(colors.muted[0], colors.muted[1], colors.muted[2]);
    doc.text(item.label, gx, gy);
    doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
    doc.setFont("helvetica", "bold");
    doc.text(item.value, gx + 22, gy);
    doc.setFont("helvetica", "normal");
    
    if (index % 2 === 1) {
      gx = margin;
      gy += 6;
    } else {
      gx = margin + 90;
    }
  });
  currentY = gy + 4;

  // 3. Executive Summary
  drawSectionTitle("3. Executive Summary", "");
  checkPageBreak(30);
  const summaryCards = [
    { label: "Predicted Glucose", value: formatNumber(data.currentGlucose, " mg/dL"), c: colors.primary },
    { label: "AI Health Score", value: formatNumber(data.healthScore, " / 100"), c: colors.secondary },
    { label: "Heart Rate", value: formatNumber(heartRateValue, " bpm"), c: heartSensorConnected ? colors.text : colors.muted },
    { label: "Oxygen (SpO2)", value: formatNumber(spo2Value, "%"), c: ppgSensorConnected ? colors.text : colors.muted },
    { label: "Skin Temp", value: formatNumber(data.temperature, " °C"), c: colors.text },
    { label: "Stress Level", value: safeText(data.stress, "Not Available"), c: colors.text },
    { label: "Activity Level", value: safeText(data.activity, "Not Available"), c: colors.text },
    { label: "Overall Status", value: safeText(data.healthCategory, "Not Available"), c: colors.success },
    { label: "Risk Level", value: riskLevel, c: riskLevel === "High" ? colors.danger : riskLevel === "Moderate" ? colors.warning : colors.success },
  ];

  const cardW = (contentWidth - 6) / 3;
  const cardH = 12;
  summaryCards.forEach((card, index) => {
    const col = index % 3;
    const row = Math.floor(index / 3);
    const x = margin + col * (cardW + 3);
    const y = currentY + row * (cardH + 3);
    
    doc.setDrawColor(colors.border[0], colors.border[1], colors.border[2]);
    doc.roundedRect(x, y, cardW, cardH, 1, 1, "D");
    doc.setFillColor(card.c[0], card.c[1], card.c[2]);
    doc.rect(x, y, 2, cardH, "F");
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(colors.muted[0], colors.muted[1], colors.muted[2]);
    doc.text(card.label, x + 4, y + 4.5);
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
    doc.text(card.value, x + 4, y + 9.5);
  });
  currentY += (3 * (cardH + 3)) + 4;

  // 4. Clinical Summary
  drawSectionTitle("4. Clinical Summary", "");
  const clinicalText = `The patient's physiological parameters are currently being monitored. Glucose predictions indicate a ${safeText(data.trend).toLowerCase()} trend with a current value of ${formatNumber(data.currentGlucose, " mg/dL")}. ${heartSensorConnected ? 'Heart rate and oxygen saturation are being tracked actively.' : 'Heart rate and PPG sensors are currently disconnected, rendering cardiovascular metrics unavailable.'} Skin temperature is ${formatNumber(data.temperature, " °C")}. The AI prediction model indicates a ${riskLevel.toLowerCase()}-risk profile. Continued monitoring is recommended.`;
  const wrappedClinical = doc.splitTextToSize(clinicalText, contentWidth);
  checkPageBreak(wrappedClinical.length * 5 + 5);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
  doc.text(wrappedClinical, margin, currentY);
  currentY += wrappedClinical.length * 4.5 + 6;

  // 5. AI Assessment
  drawSectionTitle("5. AI Assessment", "");
  const aiAssessmentText = `The PulseIQ machine learning model has evaluated the incoming multimodal sensor data. The current glucose prediction is ${formatNumber(data.currentGlucose, " mg/dL")}, categorized as a ${safeText(data.trend).toLowerCase()} trend. The model confidence is rated at ${formatNumber(data.confidence, "%")}, yielding a composite AI Health Score of ${formatNumber(data.healthScore, "/100")}. The overall monitoring status remains ${safeText(data.healthCategory, "Stable").toLowerCase()}.`;
  const wrappedAI = doc.splitTextToSize(aiAssessmentText, contentWidth);
  checkPageBreak(wrappedAI.length * 5 + 5);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
  doc.text(wrappedAI, margin, currentY);
  currentY += wrappedAI.length * 4.5 + 6;

  // 6. Physiological Parameters Table
  drawSectionTitle("6. Physiological Parameters", "");
  const paramRows = [
    { param: "Heart Rate", val: formatNumber(heartRateValue, " bpm"), status: heartSensorConnected ? "Normal" : "Not Available", range: "60 - 100 bpm" },
    { param: "Oxygen Saturation", val: formatNumber(spo2Value, "%"), status: ppgSensorConnected ? "Normal" : "Not Available", range: "95 - 100 %" },
    { param: "Skin Temperature", val: formatNumber(data.temperature, " °C"), status: data.temperature > 37.2 ? "Elevated" : "Normal", range: "36.1 - 37.2 °C" },
    { param: "Stress Level", val: safeText(data.stress, "Not Available"), status: "-", range: "Low / Moderate" },
    { param: "Activity Level", val: safeText(data.activity, "Not Available"), status: "-", range: "-" },
  ];
  
  checkPageBreak(10 + paramRows.length * 6);
  doc.setFillColor(colors.primary[0], colors.primary[1], colors.primary[2]);
  doc.rect(margin, currentY, contentWidth, 7, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(colors.white[0], colors.white[1], colors.white[2]);
  doc.text("Parameter", margin + 3, currentY + 5);
  doc.text("Value", margin + 50, currentY + 5);
  doc.text("Status", margin + 95, currentY + 5);
  doc.text("Normal Range", margin + 140, currentY + 5);
  currentY += 7;

  paramRows.forEach((r, idx) => {
    doc.setFillColor(idx % 2 === 0 ? colors.white[0] : colors.bg[0], idx % 2 === 0 ? colors.white[1] : colors.bg[1], idx % 2 === 0 ? colors.white[2] : colors.bg[2]);
    doc.rect(margin, currentY, contentWidth, 6, "F");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
    doc.text(r.param, margin + 3, currentY + 4);
    doc.text(r.val, margin + 50, currentY + 4);
    doc.text(r.status, margin + 95, currentY + 4);
    doc.text(r.range, margin + 140, currentY + 4);
    currentY += 6;
  });
  currentY += 6;

  // 7. Glucose Analysis
  drawSectionTitle("7. Glucose Analysis", "");
  checkPageBreak(25);
  const validHistory = data.history.filter(h => h.value > 0);
  const avgG = validHistory.length > 0 ? (validHistory.reduce((a, b) => a + b.value, 0) / validHistory.length).toFixed(1) : "Not Available";
  const maxG = validHistory.length > 0 ? Math.max(...validHistory.map(h => h.value)).toFixed(1) : "Not Available";
  const minG = validHistory.length > 0 ? Math.min(...validHistory.map(h => h.value)).toFixed(1) : "Not Available";
  const prevG = validHistory.length >= 2 ? validHistory[validHistory.length - 2].value : "Not Available";
  
  const gGrid = [
    { label: "Current Predicted:", value: formatNumber(data.currentGlucose, " mg/dL") },
    { label: "Previous Prediction:", value: formatNumber(prevG, " mg/dL") },
    { label: "Average Glucose:", value: formatNumber(avgG, " mg/dL") },
    { label: "Highest Recorded:", value: formatNumber(maxG, " mg/dL") },
    { label: "Lowest Recorded:", value: formatNumber(minG, " mg/dL") },
    { label: "Predicted Trend:", value: safeText(data.trend) },
  ];

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  gx = margin;
  gy = currentY;
  gGrid.forEach((item, index) => {
    doc.setTextColor(colors.muted[0], colors.muted[1], colors.muted[2]);
    doc.text(item.label, gx, gy);
    doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
    doc.setFont("helvetica", "bold");
    doc.text(item.value, gx + 35, gy);
    doc.setFont("helvetica", "normal");
    
    if (index % 2 === 1) {
      gx = margin;
      gy += 6;
    } else {
      gx = margin + 90;
    }
  });
  currentY = gy + 6;

  // 8. Trend Graphs
  drawSectionTitle("8. Trend Graphs", "");
  checkPageBreak(50);
  
  const drawChart = (x: number, y: number, w: number, h: number, values: number[], title: string, color: number[]) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
    doc.text(title, x, y - 2);

    if (values.length < 2) {
      doc.setDrawColor(colors.border[0], colors.border[1], colors.border[2]);
      doc.rect(x, y, w, h);
      doc.setFont("helvetica", "italic");
      doc.setFontSize(7);
      doc.setTextColor(colors.muted[0], colors.muted[1], colors.muted[2]);
      doc.text("Insufficient data available to generate this graph.", x + w/2, y + h/2, { align: "center" });
      return;
    }

    const maxValue = Math.max(...values) + 10;
    const minValue = Math.max(0, Math.min(...values) - 10);
    const stepX = w / (values.length - 1);

    doc.setDrawColor(colors.border[0], colors.border[1], colors.border[2]);
    doc.line(x, y + h, x + w, y + h); // X axis
    doc.line(x, y, x, y + h); // Y axis

    const points = values.map((value, index) => {
      const px = x + index * stepX;
      const py = y + h - ((value - minValue) / (maxValue - minValue || 1)) * h;
      return { px, py };
    });

    doc.setDrawColor(color[0], color[1], color[2]);
    doc.setLineWidth(0.6);
    points.forEach((point, index) => {
      if (index === 0) doc.moveTo(point.px, point.py);
      else doc.lineTo(point.px, point.py);
    });
    doc.stroke();
    doc.setLineWidth(0.2);
  };

  const trendVals = validHistory.map(v => v.value);
  const calibVals = (data.calibrationEntries || []).slice(-20).map(v => Number(v.glucose_value)).filter(v => v > 0);
  
  drawChart(margin, currentY, 85, 30, trendVals, "Last 60 Minutes / Historical", colors.primary);
  drawChart(margin + 95, currentY, 85, 30, calibVals, "7 Day Calibration Graph", colors.success);
  currentY += 45;

  // 9. Calibration Summary
  drawSectionTitle("9. Calibration Summary", "");
  checkPageBreak(20);
  const calibCount = data.calibrationEntries?.length || 0;
  const calGrid = [
    { label: "Number of calibration entries:", value: String(calibCount) },
    { label: "Personalization status:", value: calibCount > 5 ? "Optimized" : "Baseline" },
    { label: "Calibration Quality:", value: formatNumber(data.calibration, " / 100") },
    { label: "Last Calibration:", value: calibCount > 0 ? new Date(data.calibrationEntries![0].recorded_at?.seconds * 1000 || Date.now()).toLocaleDateString() : "Not Available" },
  ];

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  gx = margin;
  gy = currentY;
  calGrid.forEach((item, index) => {
    doc.setTextColor(colors.muted[0], colors.muted[1], colors.muted[2]);
    doc.text(item.label, gx, gy);
    doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
    doc.setFont("helvetica", "bold");
    doc.text(item.value, gx + 45, gy);
    doc.setFont("helvetica", "normal");
    
    if (index % 2 === 1) {
      gx = margin;
      gy += 6;
    } else {
      gx = margin + 90;
    }
  });
  currentY = gy + 6;

  // 10. Sensor Status
  drawSectionTitle("10. Sensor Status", "");
  checkPageBreak(40);
  const sensors = [
    { name: "Heart Rate Sensor", status: "Not Connected" },
    { name: "SpO₂ Sensor (PPG)", status: "Not Connected" },
    { name: "MPU6050 (Accelerometer & Gyroscope)", status: "Connected" },
    { name: "GSR Sensor", status: "Not Connected" },
    { name: "PulseIQ Band", status: "Disconnected" },
  ];

  doc.setFillColor(colors.primary[0], colors.primary[1], colors.primary[2]);
  doc.rect(margin, currentY, contentWidth, 7, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(colors.white[0], colors.white[1], colors.white[2]);
  doc.text("Sensor", margin + 3, currentY + 5);
  doc.text("Status", margin + 100, currentY + 5);
  currentY += 7;

  sensors.forEach((s, idx) => {
    doc.setFillColor(idx % 2 === 0 ? colors.white[0] : colors.bg[0], idx % 2 === 0 ? colors.white[1] : colors.bg[1], idx % 2 === 0 ? colors.white[2] : colors.bg[2]);
    doc.rect(margin, currentY, contentWidth, 6, "F");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
    doc.text(s.name, margin + 3, currentY + 4);
    
    doc.setFont("helvetica", "bold");
    if (s.status === "Connected") {
      doc.setTextColor(colors.success[0], colors.success[1], colors.success[2]);
    } else {
      doc.setTextColor(colors.danger[0], colors.danger[1], colors.danger[2]);
    }
    doc.text(s.status, margin + 100, currentY + 4);
    currentY += 6;
  });
  currentY += 6;

  // 11. AI Health Insights
  drawSectionTitle("11. AI Health Insights", "");
  const insights = [
    heartSensorConnected ? `Heart rate is currently ${heartRateValue} bpm.` : "Heart rate data is Not Available due to disconnected sensors.",
    ppgSensorConnected ? `Oxygen saturation is at ${spo2Value}%.` : "Oxygen saturation readings are missing; please connect the PPG sensor.",
    `Skin temperature is tracked at ${formatNumber(data.temperature, " °C")}.`,
    `Glucose prediction shows a ${safeText(data.trend).toLowerCase()} trend.`
  ];

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
  insights.forEach(insight => {
    const wrappedInsight = doc.splitTextToSize(`• ${insight}`, contentWidth);
    checkPageBreak(wrappedInsight.length * 4.5 + 2);
    doc.text(wrappedInsight, margin, currentY);
    currentY += wrappedInsight.length * 4.5 + 2;
  });
  currentY += 4;

  // 12. Personalized Recommendations
  drawSectionTitle("12. Personalized Recommendations", "");
  const recommendationsMap = [
    { cat: "Diet", val: data.healthRecommendations[0] || "Maintain a balanced meal plan and monitor post-meal response." },
    { cat: "Physical Activity", val: data.healthRecommendations[1] || "Incorporate light movement during the day." },
    { cat: "Hydration", val: data.healthRecommendations[2] || "Stay hydrated and keep fluid intake regular." },
    { cat: "Sleep", val: "Prioritize consistent sleep patterns to optimize metabolic function." },
    { cat: "Stress Management", val: "Maintain a calm routine and engage in relaxation exercises." },
    { cat: "Lifestyle", val: "Avoid late-night exertion to stabilize morning glucose levels." }
  ];

  recommendationsMap.forEach(r => {
    checkPageBreak(12);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
    doc.text(`${r.cat}:`, margin, currentY);
    
    doc.setFont("helvetica", "normal");
    const wrappedRec = doc.splitTextToSize(r.val, contentWidth - 30);
    doc.text(wrappedRec, margin + 30, currentY);
    currentY += wrappedRec.length * 4.5 + 3;
  });
  currentY += 4;

  // 13. Alerts & Warnings
  drawSectionTitle("13. Alerts & Warnings", "");
  checkPageBreak(25);
  if (riskLevel === "High" || riskLevel === "Moderate") {
    doc.setFillColor(colors.warning[0], colors.warning[1], colors.warning[2]);
    doc.rect(margin, currentY, 2, 12, "F");
    doc.setFillColor(255, 243, 224); // Light orange background
    doc.rect(margin + 2, currentY, contentWidth - 2, 12, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(colors.warning[0], colors.warning[1], colors.warning[2]);
    doc.text(`Warning: ${riskLevel} Risk Detected`, margin + 6, currentY + 5);
    doc.setFont("helvetica", "normal");
    doc.text("Please review the predictions and consult clinical guidance if symptoms arise.", margin + 6, currentY + 9);
  } else {
    doc.setFillColor(colors.success[0], colors.success[1], colors.success[2]);
    doc.rect(margin, currentY, 2, 12, "F");
    doc.setFillColor(232, 245, 233); // Light green background
    doc.rect(margin + 2, currentY, contentWidth - 2, 12, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(colors.success[0], colors.success[1], colors.success[2]);
    doc.text("No abnormal physiological readings requiring immediate attention were detected.", margin + 6, currentY + 7.5);
  }
  currentY += 20;

  // 14. Conclusion
  drawSectionTitle("14. Conclusion", "");
  const overallStatus = safeText(data.healthCategory, "Stable");
  const conclusionText = `In summary, the patient is maintaining a ${overallStatus.toLowerCase()} physiological baseline based on currently active sensors. The ML prediction model (Confidence: ${formatNumber(data.confidence, "%")}) indicates a ${safeText(data.trend).toLowerCase()} glucose trajectory. No immediate clinical interventions are derived from this dataset.`;
  const wrappedConclusion = doc.splitTextToSize(conclusionText, contentWidth);
  checkPageBreak(wrappedConclusion.length * 5 + 5);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
  doc.text(wrappedConclusion, margin, currentY);
  currentY += wrappedConclusion.length * 4.5 + 8;

  // 15. Disclaimer
  drawSectionTitle("15. Disclaimer", "");
  const disclaimerText = "This report has been automatically generated by the PulseIQ AI-Based Non-Invasive Glucose Trend Prediction System using physiological sensor data and machine learning algorithms. It is intended for health monitoring, research, and educational purposes only. This report is not a substitute for professional medical diagnosis, treatment, or clinical decision-making. Users should consult qualified healthcare professionals before making any medical decisions.";
  const wrappedDisclaimer = doc.splitTextToSize(disclaimerText, contentWidth);
  checkPageBreak(wrappedDisclaimer.length * 5 + 5);
  doc.setFont("helvetica", "italic");
  doc.setFontSize(7);
  doc.setTextColor(colors.muted[0], colors.muted[1], colors.muted[2]);
  doc.text(wrappedDisclaimer, margin, currentY);
  currentY += wrappedDisclaimer.length * 4.5 + 6;

  // Render footer on the last page
  drawFooter();

  // ── Output ───────────────────────────────────────────────────────────────

  const canUseBlobDownload = typeof window !== "undefined" && typeof document !== "undefined" && typeof Blob !== "undefined" && typeof URL !== "undefined" && typeof URL.createObjectURL === "function";
  if (canUseBlobDownload) {
    const pdfBlob = doc.output("blob");
    const blobUrl = URL.createObjectURL(pdfBlob);
    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = filename;
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(blobUrl);
    return;
  }

  doc.save(filename);
}
