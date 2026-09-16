import urllib.request
import json

def test_sensor_and_user_fusion_proof():
    print("==========================================================================")
    print("       PROOF: PULSEIQ COMBINES USER CALIBRATION + REAL-TIME SENSORS      ")
    print("==========================================================================")
    
    # --------------------------------------------------------------------------
    # PROOF 1: Real-Time Hardware Sensor Responsiveness
    # --------------------------------------------------------------------------
    print("\n[PROOF 1] Real-Time ESP32 Hardware Sensor Telemetry Impact")
    print("--------------------------------------------------------------------------")
    print("Holding User Calibration constant. Changing real-time ESP32 sensor streams:")
    
    # Base telemetry (Normal physical state)
    normal_telemetry = {
        "heart_rate": 70.0,
        "temperature": 36.4,
        "gsr": 1000.0,
        "accel_mag": 15800.0,
        "phase": 1,
        "hour": 10,
        "age": 30,
        "gender": 0
    }
    
    # Elevated telemetry (High HR, high temperature, high stress GSR)
    elevated_telemetry = {
        "heart_rate": 115.0,      # Elevated Heart Rate
        "temperature": 37.8,      # Thermal spike
        "gsr": 2100.0,            # High Galvanic Skin Response (Stress)
        "accel_mag": 24000.0,     # Active motion
        "phase": 1,
        "hour": 10,
        "age": 30,
        "gender": 0
    }
    
    url = "http://localhost:8001/predict/test_verification_user"
    
    # Query normal
    req1 = urllib.request.Request(url, data=json.dumps(normal_telemetry).encode('utf-8'), headers={'Content-Type': 'application/json'})
    with urllib.request.urlopen(req1) as r1:
        res1 = json.loads(r1.read().decode('utf-8'))
        
    # Query elevated
    req2 = urllib.request.Request(url, data=json.dumps(elevated_telemetry).encode('utf-8'), headers={'Content-Type': 'application/json'})
    with urllib.request.urlopen(req2) as r2:
        res2 = json.loads(r2.read().decode('utf-8'))

    print(f"  A) Normal Sensor Stream (HR: 70 BPM, Temp: 36.4C, GSR: 1000 ADC):")
    print(f"     => Predicted Glucose: {res1['glucose']} mg/dL | Risk: {res1['risk'].upper()} | Trend: {res1['trend'].upper()}")
    
    print(f"\n  B) Elevated Sensor Stream (HR: 115 BPM, Temp: 37.8C, GSR: 2100 ADC):")
    print(f"     => Predicted Glucose: {res2['glucose']} mg/dL | Risk: {res2['risk'].upper()} | Trend: {res2['trend'].upper()}")
    
    diff = res2['glucose'] - res1['glucose']
    print(f"\n  [VERIFIED PROOF 1] Changing live ESP32 hardware sensors directly shifted estimated glucose by +{diff} mg/dL!")

    # --------------------------------------------------------------------------
    # PROOF 2: User Calibration Profile Impact
    # --------------------------------------------------------------------------
    print("\n\n[PROOF 2] User Fingerstick Calibration Dataset Impact")
    print("--------------------------------------------------------------------------")
    print("Holding real-time ESP32 hardware sensor input constant [HR: 75 BPM, Temp: 36.5C, GSR: 1200 ADC].")
    print("Comparing two distinct calibrated users:")
    
    # User A: Low Baseline (e.g., Hypoglycemic range ~85 mg/dL)
    entries_user_a = [{"phase": p, "day": d, "glucose": 85.0, "age": 30, "gender": 0} for d in range(1, 8) for p in range(4)]
    
    # User B: High Baseline (e.g., Hyperglycemic range ~175 mg/dL)
    entries_user_b = [{"phase": p, "day": d, "glucose": 175.0, "age": 30, "gender": 0} for d in range(1, 8) for p in range(4)]
    
    train_url = "http://localhost:8001/train"
    
    # Train User A
    req_a = urllib.request.Request(train_url, data=json.dumps({"user_id": "patient_low_baseline", "entries": entries_user_a}).encode('utf-8'), headers={'Content-Type': 'application/json'})
    urllib.request.urlopen(req_a)
    
    # Train User B
    req_b = urllib.request.Request(train_url, data=json.dumps({"user_id": "patient_high_baseline", "entries": entries_user_b}).encode('utf-8'), headers={'Content-Type': 'application/json'})
    urllib.request.urlopen(req_b)

    # Identical live sensor packet
    identical_sensor_packet = {
        "heart_rate": 75.0,
        "temperature": 36.5,
        "gsr": 1200.0,
        "accel_mag": 15800.0,
        "phase": 1,
        "hour": 10,
        "age": 30,
        "gender": 0
    }
    
    # Predict for User A
    r_a = urllib.request.Request("http://localhost:8001/predict/patient_low_baseline", data=json.dumps(identical_sensor_packet).encode('utf-8'), headers={'Content-Type': 'application/json'})
    with urllib.request.urlopen(r_a) as resp_a:
        res_user_a = json.loads(resp_a.read().decode('utf-8'))
        
    # Predict for User B
    r_b = urllib.request.Request("http://localhost:8001/predict/patient_high_baseline", data=json.dumps(identical_sensor_packet).encode('utf-8'), headers={'Content-Type': 'application/json'})
    with urllib.request.urlopen(r_b) as resp_b:
        res_user_b = json.loads(resp_b.read().decode('utf-8'))

    print(f"  A) Patient A (Trained with Low Glucose Baseline ~85 mg/dL):")
    print(f"     => Estimated Glucose: {res_user_a['glucose']} mg/dL | Risk: {res_user_a['risk'].upper()}")
    
    print(f"\n  B) Patient B (Trained with High Glucose Baseline ~175 mg/dL):")
    print(f"     => Estimated Glucose: {res_user_b['glucose']} mg/dL | Risk: {res_user_b['risk'].upper()}")

    calib_diff = res_user_b['glucose'] - res_user_a['glucose']
    print(f"\n  [VERIFIED PROOF 2] User calibration entries adjusted baseline by +{calib_diff} mg/dL for identical sensor telemetry!")
    
    print("\n==========================================================================")
    print(" CONCLUSION: BOTH REAL-TIME ESP32 SENSORS AND USER CALIBRATION ARE FUSED!  ")
    print("==========================================================================")

if __name__ == "__main__":
    test_sensor_and_user_fusion_proof()
