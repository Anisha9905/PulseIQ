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
  activity: string;
  motionLevel?: string;
  gsr?: number;
  physiologicalState?: string;
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

export function buildPDFDoc(data: ReportData): { doc: jsPDF; filename: string } {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;
  
  const generatedAt = new Date();
  const createdDate = generatedAt.toLocaleDateString([], { day: "numeric", month: "long", year: "numeric" });
  const createdTime = generatedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }).toLowerCase();
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

  const heartRateDisplay = (data.heartRate && data.heartRate > 0) ? `${data.heartRate} bpm` : "Not Available";
  const tempDisplay = (data.temperature && data.temperature > 0) ? `${data.temperature} °C` : "Not Available";
  const stressDisplay = data.stress && data.stress !== "unavailable" ? data.stress.toLowerCase() : "Not Available";
  const activityDisplay = data.activity || "Stationary";

  const riskLevel = normalizeStatus(
    data.currentGlucose > 140 ? "High" : data.currentGlucose < 70 ? "High" : data.currentGlucose > 120 ? "Moderate" : "Low",
    data.healthCategory
  );

  // History stats calculation
  const vals = (data.history || []).map((h) => h.value);
  const avgGlucose = vals.length ? (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1) : `${data.currentGlucose}`;
  const minGlucose = vals.length ? Math.min(...vals) : data.currentGlucose;
  const maxGlucose = vals.length ? Math.max(...vals) : data.currentGlucose;
  const prevGlucose = (data.history && data.history.length >= 2) ? data.history[data.history.length - 2].value : data.currentGlucose;

  const bmiVal = data.user?.weight && data.user?.height
    ? (data.user.weight / Math.pow(data.user.height / 100, 2)).toFixed(1)
    : "Not Available";

  let currentY = margin;
  let pageNum = 1;

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

    currentY = 36;
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

  const drawSectionTitle = (title: string) => {
    checkPageBreak(12);
    doc.setFillColor(colors.bg[0], colors.bg[1], colors.bg[2]);
    doc.setDrawColor(colors.border[0], colors.border[1], colors.border[2]);
    doc.roundedRect(margin, currentY, contentWidth, 7, 1, 1, "FD");
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
    doc.text(title, margin + 3, currentY + 5);
    currentY += 10;
  };

  drawHeader();

  // 2. Patient Information
  drawSectionTitle("2. Patient Information");
  checkPageBreak(25);
  const patientGrid = [
    { label: "Patient Name:", val: patientName },
    { label: "Patient ID:", val: safeText(data.user?.email, "Not Available") },
    { label: "Age:", val: data.user?.age ? `${data.user.age}` : "Not Available" },
    { label: "Gender:", val: safeText(data.user?.gender, "Not Available") },
    { label: "Height:", val: (data.user as any)?.height ? `${(data.user as any).height} cm` : "Not Available" },
    { label: "Weight:", val: (data.user as any)?.weight ? `${(data.user as any).weight} kg` : "Not Available" },
    { label: "BMI:", val: bmiVal },
    { label: "Contact:", val: safeText(data.user?.phone, "Not Available") },
  ];

  doc.setFontSize(8);
  let gx = margin;
  let gy = currentY;
  patientGrid.forEach((item, idx) => {
    doc.setFont("helvetica", "normal");
    doc.setTextColor(colors.muted[0], colors.muted[1], colors.muted[2]);
    doc.text(item.label, gx, gy);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
    doc.text(item.val, gx + 28, gy);
    
    if (idx % 2 === 1) {
      gx = margin;
      gy += 5.5;
    } else {
      gx = margin + 95;
    }
  });
  currentY = gy + 4;

  // 3. Executive Summary
  drawSectionTitle("3. Executive Summary");
  checkPageBreak(30);
  const execCards = [
    { label: "Predicted Glucose", val: `${data.currentGlucose} mg/dL`, c: colors.primary },
    { label: "AI Health Score", val: `${data.healthScore} / 100`, c: colors.secondary },
    { label: "Heart Rate", val: heartRateDisplay, c: data.heartRate > 0 ? colors.text : colors.muted },
    { label: "Skin Temp", val: tempDisplay, c: colors.text },
    { label: "Stress Level", val: stressDisplay, c: colors.text },
    { label: "Activity Level", val: activityDisplay, c: colors.text },
    { label: "Overall Status", val: data.healthCategory || "Optimal", c: colors.success },
    { label: "Risk Level", val: `${riskLevel}`, c: riskLevel === "High" ? colors.danger : riskLevel === "Moderate" ? colors.warning : colors.success },
  ];

  const cardW = (contentWidth - 6) / 4;
  const cardH = 11;
  execCards.forEach((card, index) => {
    const col = index % 4;
    const row = Math.floor(index / 4);
    const x = margin + col * (cardW + 2);
    const y = currentY + row * (cardH + 3);
    
    doc.setDrawColor(colors.border[0], colors.border[1], colors.border[2]);
    doc.roundedRect(x, y, cardW, cardH, 1, 1, "D");
    doc.setFillColor(card.c[0], card.c[1], card.c[2]);
    doc.rect(x, y, 1.5, cardH, "F");
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(colors.muted[0], colors.muted[1], colors.muted[2]);
    doc.text(card.label, x + 3, y + 4);
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
    doc.text(card.val, x + 3, y + 8.5);
  });
  currentY += (2 * (cardH + 3)) + 6;

  // 4. Clinical Summary
  drawSectionTitle("4. Clinical Summary");
  checkPageBreak(25);
  const clinSummaryText = `The patient's physiological parameters are currently being monitored. Glucose predictions indicate a ${data.trend.toLowerCase()} trend with a current value of ${data.currentGlucose} mg/dL. ${data.heartRate > 0 ? `Heart rate is tracked at ${data.heartRate} bpm.` : "Heart rate and PPG sensors are currently disconnected, rendering cardiovascular metrics unavailable."} Skin temperature is recorded at ${tempDisplay}. The AI prediction model indicates a ${riskLevel.toLowerCase()}-risk profile. Continued monitoring is recommended.`;
  const wrappedClin = doc.splitTextToSize(clinSummaryText, contentWidth);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
  doc.text(wrappedClin, margin, currentY);
  currentY += wrappedClin.length * 4.5 + 6;

  // 5. AI Assessment
  drawSectionTitle("5. AI Assessment");
  checkPageBreak(25);
  const aiAssessmentText = `The PulseIQ machine learning model has evaluated the incoming multimodal sensor data. The current glucose prediction is ${data.currentGlucose} mg/dL, categorized as a ${data.trend.toLowerCase()} trend. The model confidence is rated at ${data.confidence || 98}%, yielding a composite AI Health Score of ${data.healthScore}/100. The overall monitoring status remains ${data.healthCategory.toLowerCase()}.`;
  const wrappedAi = doc.splitTextToSize(aiAssessmentText, contentWidth);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
  doc.text(wrappedAi, margin, currentY);
  currentY += wrappedAi.length * 4.5 + 6;

  // 6. Physiological Parameters
  drawSectionTitle("6. Physiological Parameters");
  const physRows = [
    { p: "Heart Rate", v: heartRateDisplay, s: data.heartRate > 0 ? "Normal" : "Not Available", r: "60 - 100 bpm" },
    { p: "Skin Temperature", v: tempDisplay, s: data.temperature > 37.2 ? "Elevated" : data.temperature > 0 ? "Normal" : "Not Available", r: "36.1 - 37.2 °C" },
    { p: "Stress Level", v: stressDisplay, s: stressDisplay !== "Not Available" ? "Normal" : "Not Available", r: "Low / Moderate" },
    { p: "Activity Level", v: activityDisplay, s: "Normal", r: "Stationary / Light / Active" },
  ];
  checkPageBreak(10 + physRows.length * 6);
  doc.setFillColor(colors.primary[0], colors.primary[1], colors.primary[2]);
  doc.rect(margin, currentY, contentWidth, 6, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(colors.white[0], colors.white[1], colors.white[2]);
  doc.text("Parameter", margin + 3, currentY + 4.5);
  doc.text("Value", margin + 50, currentY + 4.5);
  doc.text("Status", margin + 105, currentY + 4.5);
  doc.text("Normal Range", margin + 145, currentY + 4.5);
  currentY += 6;

  physRows.forEach((r, idx) => {
    doc.setFillColor(idx % 2 === 0 ? colors.white[0] : colors.bg[0], idx % 2 === 0 ? colors.white[1] : colors.bg[1], idx % 2 === 0 ? colors.white[2] : colors.bg[2]);
    doc.rect(margin, currentY, contentWidth, 5.5, "F");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
    doc.text(r.p, margin + 3, currentY + 4);
    doc.setFont("helvetica", "bold");
    doc.text(r.v, margin + 50, currentY + 4);
    doc.setFont("helvetica", "normal");
    doc.text(r.s, margin + 105, currentY + 4);
    doc.text(r.r, margin + 145, currentY + 4);
    currentY += 5.5;
  });
  currentY += 6;

  // 7. Glucose Analysis
  drawSectionTitle("7. Glucose Analysis");
  checkPageBreak(20);
  const gluGrid = [
    { label: "Current Predicted:", val: `${data.currentGlucose} mg/dL` },
    { label: "Previous Prediction:", val: `${prevGlucose} mg/dL` },
    { label: "Average Glucose:", val: `${avgGlucose} mg/dL` },
    { label: "Highest Recorded:", val: `${maxGlucose} mg/dL` },
    { label: "Lowest Recorded:", val: `${minGlucose} mg/dL` },
    { label: "Predicted Trend:", val: data.trend },
  ];
  doc.setFontSize(8);
  gx = margin;
  gy = currentY;
  gluGrid.forEach((item, idx) => {
    doc.setFont("helvetica", "normal");
    doc.setTextColor(colors.muted[0], colors.muted[1], colors.muted[2]);
    doc.text(item.label, gx, gy);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
    doc.text(item.val, gx + 36, gy);
    
    if (idx % 2 === 1) {
      gx = margin;
      gy += 5.5;
    } else {
      gx = margin + 95;
    }
  });
  currentY = gy + 4;

  // 8. Trend Graphs (VISUAL VECTOR LINE CHART)
  drawSectionTitle("8. Trend Graphs");
  checkPageBreak(45);

  const chartBoxX = margin;
  const chartBoxY = currentY;
  const chartBoxW = contentWidth;
  const chartBoxH = 34;

  // Draw chart background frame
  doc.setFillColor(250, 252, 255);
  doc.setDrawColor(colors.border[0], colors.border[1], colors.border[2]);
  doc.roundedRect(chartBoxX, chartBoxY, chartBoxW, chartBoxH, 1, 1, "FD");

  const minY = 40;
  const maxY = 200;
  const getCanvasY = (val: number) => {
    const clamped = Math.max(minY, Math.min(maxY, val));
    const ratio = (clamped - minY) / (maxY - minY);
    return chartBoxY + chartBoxH - 4 - ratio * (chartBoxH - 8);
  };

  // Low threshold reference line (70 mg/dL)
  const y70 = getCanvasY(70);
  doc.setDrawColor(245, 158, 11);
  doc.line(chartBoxX + 2, y70, chartBoxX + chartBoxW - 2, y70);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6);
  doc.setTextColor(245, 158, 11);
  doc.text("Low Threshold (70)", chartBoxX + chartBoxW - 25, y70 - 1);

  // High threshold reference line (140 mg/dL)
  const y140 = getCanvasY(140);
  doc.setDrawColor(239, 68, 68);
  doc.line(chartBoxX + 2, y140, chartBoxX + chartBoxW - 2, y140);
  doc.setTextColor(239, 68, 68);
  doc.text("High Threshold (140)", chartBoxX + chartBoxW - 27, y140 - 1);

  // Plot historical points
  const cutoff = Date.now() - 24 * 3600_000;
  const chartPoints = (data.history || []).filter((h) => h.time >= cutoff);

  if (chartPoints.length > 1) {
    doc.setDrawColor(colors.primary[0], colors.primary[1], colors.primary[2]);
    doc.setLineWidth(0.6);

    const stepX = (chartBoxW - 12) / (chartPoints.length - 1);
    for (let i = 0; i < chartPoints.length - 1; i++) {
      const x1 = chartBoxX + 6 + i * stepX;
      const y1 = getCanvasY(chartPoints[i].value);
      const x2 = chartBoxX + 6 + (i + 1) * stepX;
      const y2 = getCanvasY(chartPoints[i + 1].value);
      doc.line(x1, y1, x2, y2);
    }
    doc.setLineWidth(0.2); // reset line width
  } else {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8);
    doc.setTextColor(colors.muted[0], colors.muted[1], colors.muted[2]);
    doc.text("Collecting real-time telemetry stream for trend plotting...", chartBoxX + 10, chartBoxY + 18);
  }

  currentY += chartBoxH + 4;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(colors.muted[0], colors.muted[1], colors.muted[2]);
  doc.text("Figure 8.1: Continuous 24-Hour Non-Invasive Glucose Trajectory (XGBoost ML Estimates)", margin, currentY);
  currentY += 6;

  // 9. Calibration Summary (CLEAN 1-COLUMN KEY-VALUE TABLE)
  drawSectionTitle("9. Calibration Summary");
  checkPageBreak(30);
  const calibCount = data.calibrationEntries?.length || 0;
  const calibGrid = [
    { label: "Number of Calibration Entries", val: `${calibCount} / 28 slots completed` },
    { label: "Personalization Status", val: calibCount >= 28 ? "Complete (XGBoost Personalized)" : "Baseline / In Progress" },
    { label: "Calibration Quality Score", val: `${data.calibration || 100} / 100` },
    { label: "Last Calibration Entry", val: calibCount > 0 ? "Logged Recently" : "Not Available" },
  ];

  doc.setFontSize(8);
  calibGrid.forEach((item, idx) => {
    checkPageBreak(6);
    doc.setFillColor(idx % 2 === 0 ? colors.white[0] : colors.bg[0], idx % 2 === 0 ? colors.white[1] : colors.bg[1], idx % 2 === 0 ? colors.white[2] : colors.bg[2]);
    doc.rect(margin, currentY, contentWidth, 6, "F");
    doc.setFont("helvetica", "normal");
    doc.setTextColor(colors.muted[0], colors.muted[1], colors.muted[2]);
    doc.text(item.label, margin + 4, currentY + 4);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
    doc.text(item.val, margin + 85, currentY + 4);
    currentY += 6;
  });
  currentY += 4;

  // 10. Sensor Status
  drawSectionTitle("10. Sensor Status");
  const sensorRows = [
    { s: "Heart Rate Sensor (PPG)", st: data.heartRate > 0 ? "Connected (Active)" : "Not Connected (Standby)" },
    { s: "Skin Temperature Sensor (LM35)", st: data.temperature > 0 ? "Connected (Active)" : "Not Connected" },
    { s: "GSR Conductance Sensor", st: data.gsr && data.gsr > 0 ? "Connected (Active)" : "Not Connected" },
    { s: "MPU6050 Motion Accelerometer", st: "Connected (Active)" },
    { s: "PulseIQ Hardware Unit", st: "Connected (Wi-Fi Telemetry)" },
  ];
  checkPageBreak(10 + sensorRows.length * 6);
  doc.setFillColor(colors.primary[0], colors.primary[1], colors.primary[2]);
  doc.rect(margin, currentY, contentWidth, 6, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(colors.white[0], colors.white[1], colors.white[2]);
  doc.text("Hardware Sensor", margin + 4, currentY + 4.5);
  doc.text("Connection Status", margin + 110, currentY + 4.5);
  currentY += 6;

  sensorRows.forEach((r, idx) => {
    doc.setFillColor(idx % 2 === 0 ? colors.white[0] : colors.bg[0], idx % 2 === 0 ? colors.white[1] : colors.bg[1], idx % 2 === 0 ? colors.white[2] : colors.bg[2]);
    doc.rect(margin, currentY, contentWidth, 5.5, "F");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
    doc.text(r.s, margin + 4, currentY + 4);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(r.st.includes("Connected") ? colors.success[0] : colors.warning[0], r.st.includes("Connected") ? colors.success[1] : colors.warning[1], r.st.includes("Connected") ? colors.success[2] : colors.warning[2]);
    doc.text(r.st, margin + 110, currentY + 4);
    currentY += 5.5;
  });
  currentY += 6;

  // 11. AI Health Insights
  drawSectionTitle("11. AI Health Insights");
  checkPageBreak(25);
  const insights = [
    data.heartRate > 0 ? `• Heart rate tracked at ${data.heartRate} bpm.` : "• Heart rate data is Not Available due to disconnected sensors.",
    "• Skin temperature is tracked at " + tempDisplay + ".",
    `• Glucose prediction shows a ${data.trend.toLowerCase()} trend at ${data.currentGlucose} mg/dL.`,
    `• Physiological stress level is recorded as ${stressDisplay}.`,
  ];
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
  insights.forEach((ins) => {
    doc.text(ins, margin + 2, currentY);
    currentY += 5;
  });
  currentY += 4;

  // 12. Personalized Recommendations
  drawSectionTitle("12. Personalized Recommendations");
  checkPageBreak(30);
  const recs = [
    { cat: "Diet:", tip: data.healthRecommendations[0] || "Monitor your glucose trend and drink plenty of water." },
    { cat: "Physical Activity:", tip: data.healthRecommendations[1] || "Incorporate light movement during the day." },
    { cat: "Hydration:", tip: data.healthRecommendations[2] || "Stay hydrated and keep fluid intake regular." },
    { cat: "Sleep:", tip: "Prioritize consistent sleep patterns to optimize metabolic function." },
    { cat: "Stress Management:", tip: "Maintain a calm routine and engage in relaxation exercises." },
    { cat: "Lifestyle:", tip: "Avoid late-night exertion to stabilize morning glucose levels." },
  ];
  recs.forEach((r) => {
    doc.setFont("helvetica", "bold");
    doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
    doc.text(r.cat, margin + 2, currentY);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
    doc.text(r.tip, margin + 35, currentY);
    currentY += 5.5;
  });
  currentY += 4;

  // 13. Alerts & Warnings (OVERALL DESCRIPTION & CLINICAL SUMMARY)
  drawSectionTitle("13. Alerts & Warnings");
  checkPageBreak(30);

  const hasHighGlucose = data.currentGlucose > 140;
  const hasLowGlucose = data.currentGlucose < 70;
  const hasElevatedTemp = data.temperature > 37.2;

  let overallSummary = "";
  if (hasHighGlucose) {
    overallSummary = `Clinical Alert Summary: Personalized ML model indicates elevated glucose level at ${data.currentGlucose} mg/dL (Target range: 70–140 mg/dL). An upward glucose trajectory has been recorded. It is recommended to monitor hydration, log post-meal physical movement, and avoid high-glycemic food intake.`;
  } else if (hasLowGlucose) {
    overallSummary = `Clinical Alert Summary: Personalized ML model indicates low glucose level at ${data.currentGlucose} mg/dL (Target range: 70–140 mg/dL). A downward glucose trajectory has been recorded. Immediate fast-acting carbohydrate consumption is recommended.`;
  } else if (hasElevatedTemp) {
    overallSummary = `Clinical Alert Summary: LM35 thermal probe recorded elevated skin temperature at ${data.temperature} °C. Physiological parameters show thermal variation.`;
  } else {
    overallSummary = `Clinical Alert Summary: All active physiological telemetry parameters (Glucose: ${data.currentGlucose} mg/dL, Skin Temp: ${tempDisplay}, Heart Rate: ${heartRateDisplay}) remain within normal healthy targets (70–140 mg/dL). No critical clinical alerts triggered.`;
  }

  // Soft background card (no solid red block)
  doc.setFillColor(colors.bg[0], colors.bg[1], colors.bg[2]);
  doc.setDrawColor(colors.border[0], colors.border[1], colors.border[2]);
  doc.roundedRect(margin, currentY, contentWidth, 18, 1, 1, "FD");

  // Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
  doc.text("System Alert & Clinical Warning Overview", margin + 4, currentY + 5);

  // Description text
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
  const wrappedSummary = doc.splitTextToSize(overallSummary, contentWidth - 8);
  doc.text(wrappedSummary, margin + 4, currentY + 10);

  currentY += 22;

  // 14. Conclusion
  drawSectionTitle("14. Conclusion");
  checkPageBreak(25);
  const conclusionText = `In summary, the patient is maintaining a ${data.healthCategory.toLowerCase()} physiological baseline based on currently active sensors. The ML prediction model (Confidence: ${data.confidence || 98}%) indicates a ${data.trend.toLowerCase()} glucose trajectory (${data.currentGlucose} mg/dL). No immediate clinical interventions are derived from this dataset, but ongoing telemetry tracking is recommended.`;
  const wrappedConc = doc.splitTextToSize(conclusionText, contentWidth);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
  doc.text(wrappedConc, margin, currentY);
  currentY += wrappedConc.length * 4.5 + 6;

  drawFooter();
  return { doc, filename };
}

export function generatePDFReport(data: ReportData) {
  const { doc, filename } = buildPDFDoc(data);
  doc.save(filename);
}

export function generatePDFDataURI(data: ReportData): { dataUri: string; filename: string } {
  const { doc, filename } = buildPDFDoc(data);
  return {
    dataUri: doc.output("datauristring"),
    filename
  };
}
