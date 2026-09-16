/**
 * PulseIQ ESP32 Sensor Telemetry Parser & Validator
 * Validates, cleans, and sanitizes incoming ESP32 sensor telemetry packets.
 */

function sanitizeNumber(val, defaultVal = 0) {
  if (val === undefined || val === null) return defaultVal;
  const num = Number(val);
  return isNaN(num) ? defaultVal : num;
}

let lastAccel = { x: 0, y: 0, z: 0 };
let rollingDeltas = [];

function parseAndValidateESP32Packet(raw) {
  if (!raw || typeof raw !== "object") {
    return { valid: false, reason: "Payload is not an object" };
  }

  const rawTemp = raw.temperature ?? raw.temp ?? raw.t;
  const rawGSR = raw.gsr ?? raw.stress;
  const rawHR = raw.heartRate ?? raw.heart_rate ?? raw.hr ?? raw.bpm;
  const rawState = (raw.state || raw.activity || raw.motion || "CALM").toString().toUpperCase();

  const temperature = sanitizeNumber(rawTemp, 25.4);
  const gsr = sanitizeNumber(rawGSR, 1200);
  let heartRate = sanitizeNumber(rawHR, 0);

  const accelX = sanitizeNumber(raw.accelX ?? raw.accel_x ?? raw.ax, 0);
  const accelY = sanitizeNumber(raw.accelY ?? raw.accel_y ?? raw.ay, 0);
  const accelZ = sanitizeNumber(raw.accelZ ?? raw.accel_z ?? raw.az, 0);

  // Normalize invalid or negative heart rate readings
  if (heartRate < 0) {
    heartRate = 0;
  }

  // Derive motion status from MPU6050 acceleration (supports raw counts ~16384, m/s² ~9.8, g-force ~1.0)
  const accelMagnitude = Math.sqrt(accelX * accelX + accelY * accelY + accelZ * accelZ);

  // Step-to-step delta from previous sample
  const stepDelta = Math.sqrt(
    Math.pow(accelX - lastAccel.x, 2) +
    Math.pow(accelY - lastAccel.y, 2) +
    Math.pow(accelZ - lastAccel.z, 2)
  );

  // Update last acceleration sample
  if (accelX !== 0 || accelY !== 0 || accelZ !== 0) {
    lastAccel = { x: accelX, y: accelY, z: accelZ };
  }

  // Rolling window of acceleration changes over time (fast 3-sample window for instant responsiveness)
  rollingDeltas.push(stepDelta);
  if (rollingDeltas.length > 3) {
    rollingDeltas.shift();
  }
  const avgDelta = rollingDeltas.reduce((a, b) => a + b, 0) / (rollingDeltas.length || 1);

  let derivedActivity = "Stationary";
  let motionLevel = "Low";

  if (rawState.includes("NO CONTACT") || rawState === "NO_CONTACT") {
    derivedActivity = "No Contact";
    motionLevel = "Low";
  } else if (
    stepDelta > 1200 ||
    avgDelta > 1000 ||
    rawState.includes("ACTIVE") ||
    (accelMagnitude > 0 && Math.abs(accelMagnitude - 16384) > 3000)
  ) {
    derivedActivity = "Active";
    motionLevel = "High";
  } else if (
    stepDelta > 250 ||
    avgDelta > 250 ||
    rawState.includes("MOVING") ||
    rawState.includes("LIGHT") ||
    (accelMagnitude > 0 && Math.abs(accelMagnitude - 16384) > 800)
  ) {
    derivedActivity = "Light Movement";
    motionLevel = "Moderate";
  } else {
    derivedActivity = "Stationary";
    motionLevel = "Low";
  }

  return {
    valid: true,
    data: {
      temperature: Math.round(temperature * 10) / 10,
      gsr: Math.round(gsr),
      heartRate: Math.round(heartRate),
      state: rawState,
      accelX,
      accelY,
      accelZ,
      accelMagnitude: Math.round(accelMagnitude),
      derivedActivity,
      motionLevel,
      timestamp: raw.timestamp || new Date().toISOString()
    }
  };
}

module.exports = {
  parseAndValidateESP32Packet
};
