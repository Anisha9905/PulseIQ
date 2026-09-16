/*
  PulseIQ - ESP32 Hardware Firmware (Direct Wi-Fi Telemetry Edition)
  ==================================================================
  Sensors & Integration:
    - GSR Sensor: Pin GPIO 33 (Galvanic Skin Response - ADC1)
    - Pulse / Heart Rate Sensor: Pin GPIO 34 (Analog Heart Rate Waveform - ADC1)
    - LM35 Temperature Sensor: Pin GPIO 35 (Calibrated Thermal Sensor - ADC1)
    - MPU6050 Accelerometer / Gyro: SDA = GPIO 21, SCL = GPIO 22
    - SSD1306 OLED Display (128x64): SDA = GPIO 21, SCL = GPIO 22 (Address 0x3C)
    - Wi-Fi HTTP POST: Streams JSON telemetry directly to backend (http://10.122.73.207:5000/api/v1/telemetry)
*/

#include <WiFi.h>
#include <HTTPClient.h>
#include <Wire.h>
#include <MPU6050.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>

// ================= WI-FI CONFIGURATION =================
const char* WIFI_SSID = "Heyyyyyyy";                   // Your Wi-Fi Name
const char* WIFI_PASS = "password12";                   // Your Wi-Fi Password

// Computer backend URL (IP: 10.122.73.207, Port: 5000)
const char* SERVER_URL = "http://10.122.73.207:5000/api/v1/telemetry";

// ================= PIN DEFINITIONS (ADC1 - WI-FI COMPATIBLE) =================
#define GSR_PIN     33    // GPIO 33 (ADC1_CH5 - Wi-Fi Compatible)
#define PULSE_PIN   34    // GPIO 34 (ADC1_CH6 - Wi-Fi Compatible)
#define LM35_PIN    35    // GPIO 35 (ADC1_CH7 - Wi-Fi Compatible)

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

unsigned long lastReconnectAttempt = 0;

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

  // 1. ADC Configuration
  analogReadResolution(12);
  analogSetAttenuation(ADC_11db);

  // 2. Initialize I2C Bus once
  Wire.begin(SDA_PIN, SCL_PIN);
  Wire.setClock(400000);
  delay(100);

  // 3. Initialize OLED Display once
  if (!display.begin(SSD1306_SWITCHCAPVCC, OLED_ADDRESS)) {
    Serial.println("OLED NOT FOUND");
  } else {
    display.clearDisplay();
    display.setTextColor(SSD1306_WHITE);
    display.setTextSize(2);
    display.setCursor(20, 10);
    display.println("PulseIQ");
    display.setTextSize(1);
    display.setCursor(15, 40);
    display.println("Connecting Wi-Fi...");
    display.display();
  }

  // 4. Initialize MPU6050
  mpu.initialize();
  delay(100);
  if (mpu.testConnection()) {
    Serial.println("MPU6050 connected successfully");
  } else {
    Serial.println("MPU6050 connection FAILED");
  }

  // 5. Connect to Wi-Fi Network
  WiFi.mode(WIFI_STA);
  WiFi.setAutoReconnect(true);
  WiFi.persistent(true);

  Serial.print("Connecting to Wi-Fi: ");
  Serial.println(WIFI_SSID);
  WiFi.begin(WIFI_SSID, WIFI_PASS);

  int wifiRetries = 0;
  while (WiFi.status() != WL_CONNECTED && wifiRetries < 40) {
    delay(500);
    Serial.print(".");
    wifiRetries++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\nWi-Fi Connected successfully!");
    Serial.print("ESP32 IP Address: ");
    Serial.println(WiFi.localIP());

    display.clearDisplay();
    display.setTextSize(1);
    display.setCursor(0, 0);
    display.println("PULSEIQ READY");
    display.setCursor(0, 20);
    display.println("Wi-Fi Connected");
    display.setCursor(0, 40);
    display.println(WiFi.localIP().toString());
    display.display();
    delay(1500);
  } else {
    Serial.println("\n[Wi-Fi WARNING] Connection timed out! Retrying in background...");
  }

  Serial.println("------------------------------------------------------------");
  Serial.println("PULSEIQ WI-FI SYSTEM READY");
  Serial.println("------------------------------------------------------------");
}

// ================= MAIN LOOP =================
void loop() {
  unsigned long currentTime = millis();

  // 1. FAST PULSE SAMPLING
  int pulseSignal = analogRead(PULSE_PIN);

  if (currentTime - lastSampleTime >= SAMPLE_INTERVAL) {
    lastSampleTime = currentTime;

    if (pulseSignal > highestPeak) highestPeak = pulseSignal;
    if (pulseSignal < lowestTrough) lowestTrough = pulseSignal;

    if (currentTime % 1000 == 0) {
      highestPeak -= 40;
      lowestTrough += 40;
    }

    dynamicThreshold = (highestPeak + lowestTrough) / 2;

    if (pulseSignal > dynamicThreshold && !isPulseActive && (currentTime - lastBeatTime > 250)) {
      isPulseActive = true;
      unsigned long ibi = currentTime - lastBeatTime;
      lastBeatTime = currentTime;
      rawBpm = 60000 / ibi;

      if (rawBpm >= 45 && rawBpm <= 200) {
        if (smoothedBpm == 0) {
          smoothedBpm = rawBpm;
        } else {
          smoothedBpm = (rawBpm * filterFactor) + (smoothedBpm * (1.0 - filterFactor));
        }
      }
    }

    if (pulseSignal < dynamicThreshold) {
      isPulseActive = false;
    }
  }

  if (currentTime - lastBeatTime > 2500) {
    smoothedBpm = 0;
    rawBpm = 0;
  }

  // 2. SENSOR READ + WI-FI TRANSMISSION + OLED UPDATE EVERY 2 SECONDS
  if (currentTime - lastDisplayTime >= DISPLAY_INTERVAL) {
    lastDisplayTime = currentTime;

    int gsrValue = analogRead(GSR_PIN);

    long adcSum = 0;
    for (int i = 0; i < 30; i++) {
      adcSum += analogRead(LM35_PIN);
      delayMicroseconds(50);
    }
    float avgAdcValue = adcSum / 30.0;
    float temperatureVoltage = (avgAdcValue / 4095.0) * 3.3;
    float temperatureC = (temperatureVoltage * 100.0) + 8.5; // calibration offset

    int16_t ax, ay, az, gx, gy, gz;
    mpu.getMotion6(&ax, &ay, &az, &gx, &gy, &gz);

    String psychologicalState = "CALM";
    if (gsrValue >= 2000) {
      psychologicalState = "NO CONTACT";
    } else if (gsrValue > 800 && smoothedBpm > 85) {
      psychologicalState = "STRESSED";
    }

    // Serial Output
    Serial.print("Temp: "); Serial.print(temperatureC, 1); Serial.print(" C");
    Serial.print(" | GSR Raw: "); Serial.print(gsrValue);
    Serial.print(" | Heart Rate: "); Serial.print(smoothedBpm > 0 ? String(smoothedBpm) + " BPM" : "0 BPM");
    Serial.print(" | STATE: "); Serial.print(psychologicalState);
    Serial.print(" | Accel: "); Serial.print(ax); Serial.print(","); Serial.print(ay); Serial.print(","); Serial.println(az);

    // Build JSON payload string
    String jsonPayload = "{\"temperature\":" + String(temperatureC, 1) + 
                         ",\"gsr\":" + String(gsrValue) + 
                         ",\"heartRate\":" + String(smoothedBpm) + 
                         ",\"state\":\"" + psychologicalState + "\"" + 
                         ",\"accelX\":" + String(ax) + 
                         ",\"accelY\":" + String(ay) + 
                         ",\"accelZ\":" + String(az) + "}";

    // Direct Wi-Fi HTTP POST to Backend Software
    if (WiFi.status() == WL_CONNECTED) {
      HTTPClient http;
      http.begin(SERVER_URL);
      http.addHeader("Content-Type", "application/json");

      int httpResponseCode = http.POST(jsonPayload);
      if (httpResponseCode > 0) {
        Serial.print("Wi-Fi Telemetry Sent! HTTP Status: ");
        Serial.println(httpResponseCode);
      } else {
        Serial.print("Wi-Fi HTTP Error: ");
        Serial.println(httpResponseCode);
      }
      http.end();
    } else {
      Serial.println("Wi-Fi disconnected. Waiting for auto-reconnect...");
    }

    // OLED Display
    display.clearDisplay();
    display.setTextColor(SSD1306_WHITE);
    display.setTextSize(1);
    display.setCursor(20, 0);
    display.println("PULSEIQ (Wi-Fi)");

    display.setCursor(0, 15);
    display.print("Temp : ");
    display.print(temperatureC, 1);
    display.println(" C");

    display.setCursor(0, 27);
    display.print("GSR  : ");
    display.println(gsrValue);

    display.setCursor(0, 39);
    display.print("HR   : ");
    if (smoothedBpm > 0) {
      display.print(smoothedBpm);
      display.println(" BPM");
    } else {
      display.println("0 BPM");
    }

    display.setCursor(0, 51);
    display.print("State: ");
    display.println(psychologicalState);

    display.display();
  }
}
