/**
 * PulseIQ ESP32 Sensor Telemetry Parser & Validator
 * Validates, cleans, and sanitizes incoming ESP32 sensor telemetry packets.
 */

function sanitizeNumber(val, defaultVal = 0) {
  const num = Number(val);
  return isNaN(num) ? defaultVal : num;
}

function parseAndValidateESP32Packet(raw) {
  if (!raw || typeof raw !== "object") {
    return { valid: false, reason: "Payload is not an object" };
  }

  const temperature = sanitizeNumber(raw.temperature, null);
  const gsr = sanitizeNumber(raw.gsr, null);
  const heartRate = sanitizeNumber(raw.heartRate, null);
  const state = (raw.state || "CALM").toString().toUpperCase();
  const accelX = sanitizeNumber(raw.accelX, 0);
  const accelY = sanitizeNumber(raw.accelY, 0);
  const accelZ = sanitizeNumber(raw.accelZ, 0);

  // Range validation rules
  if (temperature === null || temperature < -10 || temperature > 60) {
    return { valid: false, reason: `Invalid temperature value: ${raw.temperature}` };
  }

  if (gsr === null || gsr < 0 || gsr > 10000) {
    return { valid: false, reason: `Invalid GSR value: ${raw.gsr}` };
  }

  if (heartRate === null || heartRate < 0 || heartRate > 230) {
    return { valid: false, reason: `Invalid heart rate value: ${raw.heartRate}` };
  }

  // Derive human-readable activity state from acceleration vector magnitude & state string
  const accelMagnitude = Math.sqrt(accelX * accelX + accelY * accelY + accelZ * accelZ);
  let derivedActivity = "sitting";
  if (state === "ACTIVE" || accelMagnitude > 20000) {
    derivedActivity = "running";
  } else if (accelMagnitude > 15000) {
    derivedActivity = "walking";
  } else if (state === "SLEEP") {
    derivedActivity = "sleeping";
  }

  return {
    valid: true,
    data: {
      temperature: Math.round(temperature * 10) / 10,
      gsr: Math.round(gsr),
      heartRate: Math.round(heartRate),
      state,
      accelX,
      accelY,
      accelZ,
      accelMagnitude: Math.round(accelMagnitude),
      derivedActivity,
      timestamp: raw.timestamp || new Date().toISOString()
    }
  };
}

module.exports = {
  parseAndValidateESP32Packet
};
