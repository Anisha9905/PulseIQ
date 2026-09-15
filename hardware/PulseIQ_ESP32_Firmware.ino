/*
  PulseIQ - ESP32 Hardware Firmware (Arduino / C++)
  ================================================
  Sensors & Integration:
    - GSR Sensor: Pin GPIO 13 (Galvanic Skin Response)
    - Pulse / Heart Rate Sensor: Pin GPIO 34 (Analog Heart Rate Waveform)
    - LM35 Temperature Sensor: Pin GPIO 15 (Calibrated Thermal Sensor)
    - MPU6050 Accelerometer / Gyro: SDA = GPIO 21, SCL = GPIO 22
    - SSD1306 OLED Display (128x64): SDA = GPIO 21, SCL = GPIO 22 (Address 0x3C)
    - Bluetooth Classic SPP: Device Name "PulseIQ_ESP32"

  Telemetry Output Format (Sent over Bluetooth every 2 seconds):
    Temp: 22.1 C | GSR: 1345 | HR: 76 BPM | STATE: CALM | Accel: -7560,-3616,-13396
*/

#include <Wire.h>
#include <MPU6050.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include "BluetoothSerial.h"

// ================= BLUETOOTH =================
BluetoothSerial SerialBT;

// ================= PIN DEFINITIONS (ADC1) =================
#define GSR_PIN     33    // GPIO 33
#define PULSE_PIN   34    // GPIO 34
#define LM35_PIN    35    // GPIO 35

#define SDA_PIN     21
#define SCL_PIN     22

// ================= OLED =================
#define SCREEN_WIDTH  128
#define SCREEN_HEIGHT 64
#define OLED_ADDRESS  0x3C

Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, -1);

// ================= MPU6050 =================
MPU6050 mpu;

// ================= TIMING CONFIGURATIONS =================
unsigned long lastSampleTime = 0;
const int SAMPLE_INTERVAL = 2;

unsigned long lastBeatTime = 0;

unsigned long lastDisplayTime = 0;
const int DISPLAY_INTERVAL = 2000;

// ================= PULSE SIGNAL & BPM VARIABLES =================
int highestPeak = 2048;
int lowestTrough = 2048;
int dynamicThreshold = 2048;

int rawBpm = 0;
int smoothedBpm = 0;

float filterFactor = 0.2;

bool isPulseActive = false;

// ================= SETUP =================
void setup() {

  Serial.begin(115200);
  delay(1000);

  // ================= BLUETOOTH START =================
  SerialBT.begin("PulseIQ_ESP32");

  Serial.println("Bluetooth Started");
  Serial.println("Device Name: PulseIQ_ESP32");

  // ================= ADC CONFIGURATION =================
  analogReadResolution(12);
  analogSetAttenuation(ADC_11db);

  // ================= I2C =================
  Wire.begin(SDA_PIN, SCL_PIN);

  // ================= MPU6050 =================
  mpu.initialize();
  delay(100);

  if (mpu.testConnection()) {
    Serial.println("MPU6050 connected successfully");
  } else {
    Serial.println("MPU6050 connection FAILED");
  }

  // ================= OLED =================
  if (!display.begin(SSD1306_SWITCHCAPVCC, OLED_ADDRESS)) {
    Serial.println("OLED NOT FOUND");
  } else {
    Serial.println("OLED connected successfully");

    display.clearDisplay();
    display.setTextColor(SSD1306_WHITE);

    display.setTextSize(2);
    display.setCursor(20, 10);
    display.println("PulseIQ");

    display.setTextSize(1);
    display.setCursor(28, 40);
    display.println("Starting...");

    display.display();

    delay(1500);
  }

  Serial.println("------------------------------------------------------------");
  Serial.println("PULSEIQ SYSTEM READY");
  Serial.println("Bluetooth: PulseIQ_ESP32");
  Serial.println("------------------------------------------------------------");

  // Send startup message to Bluetooth
  SerialBT.println("================================");
  SerialBT.println("       PULSEIQ SYSTEM");
  SerialBT.println("================================");
  SerialBT.println("Bluetooth connected successfully");
  SerialBT.println("Waiting for sensor data...");
  SerialBT.println();
}

// ================= MAIN LOOP =================
void loop() {

  unsigned long currentTime = millis();

  // ==========================================================
  // 1. FAST PULSE SAMPLING
  // ==========================================================

  int pulseSignal = analogRead(PULSE_PIN);

  if (currentTime - lastSampleTime >= SAMPLE_INTERVAL) {

    lastSampleTime = currentTime;

    // Track peaks
    if (pulseSignal > highestPeak)
      highestPeak = pulseSignal;

    // Track troughs
    if (pulseSignal < lowestTrough)
      lowestTrough = pulseSignal;

    // Slowly bring limits back toward center
    if (currentTime % 1000 == 0) {
      highestPeak -= 40;
      lowestTrough += 40;
    }

    // Calculate dynamic threshold
    dynamicThreshold = (highestPeak + lowestTrough) / 2;

    // ========================================================
    // HEARTBEAT DETECTION
    // ========================================================

    if (
      pulseSignal > dynamicThreshold &&
      !isPulseActive &&
      (currentTime - lastBeatTime > 250)
    ) {

      isPulseActive = true;

      unsigned long ibi = currentTime - lastBeatTime;

      lastBeatTime = currentTime;

      rawBpm = 60000 / ibi;

      // Validate BPM
      if (rawBpm >= 45 && rawBpm <= 200) {

        if (smoothedBpm == 0) {
          smoothedBpm = rawBpm;
        } else {
          smoothedBpm = (rawBpm * filterFactor) + (smoothedBpm * (1.0 - filterFactor));
        }
      }
    }

    // Reset beat trigger
    if (pulseSignal < dynamicThreshold) {
      isPulseActive = false;
    }
  }

  // ==========================================================
  // 2. HEART RATE TIMEOUT
  // ==========================================================

  if (currentTime - lastBeatTime > 2500) {
    smoothedBpm = 0;
    rawBpm = 0;
  }

  // ==========================================================
  // 3. SENSOR + OLED + BLUETOOTH UPDATE EVERY 2 SECONDS
  // ==========================================================

  if (currentTime - lastDisplayTime >= DISPLAY_INTERVAL) {

    lastDisplayTime = currentTime;

    // ========================================================
    // GSR
    // ========================================================

    int gsrValue = analogRead(GSR_PIN);

    // ========================================================
    // LM35
    // ========================================================

    long adcSum = 0;

    for (int i = 0; i < 30; i++) {
      adcSum += analogRead(LM35_PIN);
      delayMicroseconds(50);
    }

    float avgAdcValue = adcSum / 30.0;

    float temperatureVoltage = (avgAdcValue / 4095.0) * 3.3;

    float temperatureC = temperatureVoltage * 100.0;

    // Existing prototype calibration
    float calibrationOffset = 8.5;

    temperatureC += calibrationOffset;

    // ========================================================
    // MPU6050
    // ========================================================

    int16_t ax, ay, az;
    int16_t gx, gy, gz;

    mpu.getMotion6(
      &ax,
      &ay,
      &az,
      &gx,
      &gy,
      &gz
    );

    // ========================================================
    // GSR STATE
    // ========================================================

    String psychologicalState = "CALM";

    if (gsrValue >= 2000) {
      psychologicalState = "NO CONTACT";
    }
    else if (gsrValue > 800 && smoothedBpm > 85) {
      psychologicalState = "STRESSED";
    }

    // ========================================================
    // SERIAL MONITOR OUTPUT
    // ========================================================

    Serial.print("Temp: ");
    Serial.print(temperatureC, 1);
    Serial.print(" C");

    Serial.print(" | GSR Raw: ");
    Serial.print(gsrValue);

    Serial.print(" | Heart Rate: ");

    if (smoothedBpm > 0) {
      Serial.print(smoothedBpm);
      Serial.print(" BPM");
    } else {
      Serial.print("0 BPM");
    }

    Serial.print(" | STATE: ");
    Serial.print(psychologicalState);

    Serial.print(" | Accel: ");
    Serial.print(ax);
    Serial.print(",");
    Serial.print(ay);
    Serial.print(",");
    Serial.print(az);

    Serial.print(" | Gyro: ");
    Serial.print(gx);
    Serial.print(",");
    Serial.print(gy);
    Serial.print(",");
    Serial.println(gz);

    // ========================================================
    // BLUETOOTH OUTPUT
    // ========================================================

    SerialBT.print("Temp: ");
    SerialBT.print(temperatureC, 1);
    SerialBT.print(" C");

    SerialBT.print(" | GSR: ");
    SerialBT.print(gsrValue);

    SerialBT.print(" | HR: ");

    if (smoothedBpm > 0) {
      SerialBT.print(smoothedBpm);
      SerialBT.print(" BPM");
    } else {
      SerialBT.print("0 BPM");
    }

    SerialBT.print(" | STATE: ");
    SerialBT.print(psychologicalState);

    SerialBT.print(" | Accel: ");
    SerialBT.print(ax);
    SerialBT.print(",");
    SerialBT.print(ay);
    SerialBT.print(",");
    SerialBT.println(az);

    // ========================================================
    // OLED DISPLAY
    // ========================================================

    display.clearDisplay();

    display.setTextColor(SSD1306_WHITE);

    // Title
    display.setTextSize(1);
    display.setCursor(42, 0);
    display.println("PULSEIQ");

    // Temperature
    display.setTextSize(1);
    display.setCursor(0, 15);
    display.print("Temp: ");
    display.print(temperatureC, 1);
    display.println(" C");

    // GSR
    display.setCursor(0, 27);
    display.print("GSR : ");
    display.println(gsrValue);

    // Heart Rate
    display.setCursor(0, 39);
    display.print("HR  : ");

    if (smoothedBpm > 0) {
      display.print(smoothedBpm);
      display.println(" BPM");
    } else {
      display.println("0 BPM");
    }

    // State
    display.setCursor(0, 51);
    display.print("State: ");
    display.println(psychologicalState);

    display.display();
  }
}
