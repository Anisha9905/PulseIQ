"""
PulseIQ ESP32 Bluetooth Classic Receiver & WebSocket Bridge
============================================================
Connects to ESP32 ("PulseIQ_ESP32") over Bluetooth Classic Serial SPP / COM Port,
parses sensor data telemetry, and forwards validated packets to the PulseIQ Node.js backend WebSocket server (ws://localhost:5000).

Expected ESP32 Data Format:
"Temp: 22.1 C | GSR: 1345 | HR: 76 BPM | STATE: CALM | Accel: -7560,-3616,-13396"
"""

import sys
import time
import re
import json
import datetime
import logging
import argparse

# Try importing serial and websocket modules; handle missing dependencies gracefully
try:
    import serial
    import serial.tools.list_ports
except ImportError:
    serial = None

try:
    import websocket
except ImportError:
    websocket = None

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] [BluetoothReceiver] %(message)s"
)
logger = logging.getLogger("PulseIQ_BT")

REGEX_ESP32 = re.compile(
    r"Temp:\s*(?P<temp>[-+]?\d*\.?\d+)\s*C\s*\|\s*"
    r"GSR:\s*(?P<gsr>\d+)\s*\|\s*"
    r"HR:\s*(?P<hr>\d+)\s*BPM\s*\|\s*"
    r"STATE:\s*(?P<state>[\w\s]+?)\s*\|\s*"
    r"Accel:\s*(?P<ax>[-+]?\d+),(?P<ay>[-+]?\d+),(?P<az>[-+]?\d+)",
    re.IGNORECASE
)

def parse_esp32_line(line: str) -> dict:
    """
    Parses raw ESP32 string line into structured JSON telemetry object.
    Sample input:
    "Temp: 22.1 C | GSR: 1345 | HR: 76 BPM | STATE: CALM | Accel: -7560,-3616,-13396"
    "Temp: 34.5 C | GSR: 2150 | HR: 0 BPM | STATE: NO CONTACT | Accel: 100,200,300"
    """
    if not line or not isinstance(line, str):
        return None

    cleaned = line.strip()
    match = REGEX_ESP32.search(cleaned)
    if not match:
        return None

    try:
        temp = float(match.group("temp"))
        gsr = int(match.group("gsr"))
        hr = int(match.group("hr"))
        state = match.group("state").strip().upper()
        ax = int(match.group("ax"))
        ay = int(match.group("ay"))
        az = int(match.group("az"))

        # Range validation
        if not (-10.0 <= temp <= 60.0):
            logger.warning(f"Invalid temperature range: {temp} C")
            return None
        if not (0 <= gsr <= 10000):
            logger.warning(f"Invalid GSR range: {gsr}")
            return None
        if not (0 <= hr <= 230):
            logger.warning(f"Invalid heart rate range: {hr} BPM")
            return None

        return {
            "temperature": round(temp, 1),
            "gsr": gsr,
            "heartRate": hr,
            "state": state,
            "accelX": ax,
            "accelY": ay,
            "accelZ": az,
            "timestamp": datetime.datetime.utcnow().isoformat() + "Z"
        }
    except (ValueError, TypeError) as exc:
        logger.error(f"Error parsing values from line '{cleaned}': {exc}")
        return None

def find_esp32_port(device_name="PulseIQ_ESP32"):
    """
    Scans system COM ports to locate virtual serial port corresponding to PulseIQ_ESP32
    or standard ESP32 USB-to-UART bridge chips (CP210x, CH340, FT232, USB Serial Device).
    """
    if not serial:
        return None
    ports = serial.tools.list_ports.comports()
    if not ports:
        return None

    # Keywords for common ESP32 USB-to-UART bridge chips
    usb_keywords = ["cp210", "ch340", "usb serial", "ft232", "silicon labs", "uart", "esp32", "pulseiq"]

    # 1. Match USB Serial bridge chips
    for port in ports:
        desc = f"{port.device} {port.description} {port.hwid}".lower()
        if any(kw in desc for kw in usb_keywords):
            logger.info(f"Auto-detected ESP32 USB serial port: {port.device} ({port.description})")
            return port.device

    # 2. Match Bluetooth Serial ports
    for port in ports:
        desc = f"{port.device} {port.description} {port.hwid}".lower()
        if "bluetooth" in desc:
            logger.info(f"Auto-detected ESP32 Bluetooth serial port: {port.device} ({port.description})")
            return port.device

    # 3. Fallback: If only one serial port is active on the system, use it
    if len(ports) == 1:
        logger.info(f"Auto-selected single active serial port: {ports[0].device} ({ports[0].description})")
        return ports[0].device

    return None


class ESP32BluetoothBridge:
    def __init__(self, port=None, baudrate=115200, ws_url="ws://localhost:5000", test_mode=False):
        self.port = port
        self.baudrate = baudrate
        self.ws_url = ws_url
        self.test_mode = test_mode
        self.ws = None

    def connect_websocket(self):
        """
        Establishes WebSocket connection to backend server.
        """
        if not websocket:
            logger.warning("websocket-client not installed. WebSocket forwarding disabled.")
            return False
        try:
            self.ws = websocket.create_connection(self.ws_url, timeout=5)
            logger.info(f"WebSocket connected to PulseIQ backend at {self.ws_url}")
            # Notify backend that Bluetooth receiver is active
            init_msg = json.dumps({
                "type": "esp32_status",
                "status": "CONNECTED",
                "device": "PulseIQ_ESP32"
            })
            self.ws.send(init_msg)
            return True
        except Exception as err:
            logger.error(f"Failed to connect to backend WebSocket at {self.ws_url}: {err}")
            self.ws = None
            return False

    def send_telemetry(self, parsed_data: dict):
        """
        Sends parsed sensor packet to backend WebSocket.
        """
        payload = json.dumps({
            "type": "esp32_sensor_data",
            "data": parsed_data
        })
        if self.ws:
            try:
                self.ws.send(payload)
                logger.info(f"Forwarded sensor data to backend: Temp={parsed_data['temperature']}C, GSR={parsed_data['gsr']}, HR={parsed_data['heartRate']}BPM, STATE={parsed_data['state']}")
            except Exception as e:
                logger.error(f"Error sending payload to WebSocket: {e}")
                self.ws = None
        else:
            logger.info(f"[Local Print] Sensor Packet: {parsed_data}")

    def run_test_loop(self):
        """
        Simulates raw Bluetooth lines for end-to-end testing when hardware is offline.
        """
        logger.info("Starting Simulated ESP32 Bluetooth Loop (Test Mode)...")
        sample_lines = [
            "Temp: 34.5 C | GSR: 1345 | HR: 76 BPM | STATE: CALM | Accel: -7560,-3616,-13396",
            "Temp: 35.1 C | GSR: 950 | HR: 92 BPM | STATE: STRESSED | Accel: -7520,-3600,-13400",
            "Temp: 34.8 C | GSR: 2150 | HR: 0 BPM | STATE: NO CONTACT | Accel: -5120,-1200,-11000",
            "Temp: 34.6 C | GSR: 1200 | HR: 75 BPM | STATE: CALM | Accel: -7550,-3610,-13390"
        ]
        idx = 0
        while True:
            if not self.ws:
                self.connect_websocket()

            raw_line = sample_lines[idx % len(sample_lines)]
            idx += 1
            logger.info(f"Raw Bluetooth line received: {raw_line}")
            parsed = parse_esp32_line(raw_line)
            if parsed:
                self.send_telemetry(parsed)
            else:
                logger.warning(f"Invalid sensor packet rejected: {raw_line}")
            time.sleep(2)

    def run(self):
        """
        Main execution loop with automatic reconnection logic.
        """
        if self.test_mode:
            self.run_test_loop()
            return

        if not serial:
            logger.error("pyserial is not installed. Run 'pip install pyserial websocket-client' to use live Bluetooth.")
            sys.exit(1)

        while True:
            # 1. Resolve target COM port
            target_port = self.port or find_esp32_port()
            if not target_port:
                logger.warning("PulseIQ_ESP32 Bluetooth device not found on COM ports. Retrying in 5s... (Ensure device is paired in Windows Bluetooth settings)")
                time.sleep(5)
                continue

            # 2. Connect to Serial Bluetooth Port
            try:
                logger.info(f"Connecting to ESP32 Bluetooth serial port: {target_port} at {self.baudrate} baud...")
                ser = serial.Serial(target_port, self.baudrate, timeout=3)
                logger.info(f"Bluetooth connected to {target_port} successfully!")
                
                # Connect WebSocket to backend
                self.connect_websocket()

                while ser.is_open:
                    line_bytes = ser.readline()
                    if not line_bytes:
                        continue
                    try:
                        raw_line = line_bytes.decode("utf-8", errors="replace").strip()
                    except Exception as dec_err:
                        logger.warning(f"Decoding error: {dec_err}")
                        continue

                    if not raw_line:
                        continue

                    logger.info(f"Raw Bluetooth line received: {raw_line}")
                    parsed = parse_esp32_line(raw_line)
                    if parsed:
                        if not self.ws:
                            self.connect_websocket()
                        self.send_telemetry(parsed)
                    else:
                        logger.warning(f"Invalid sensor packet format: '{raw_line}'")

            except serial.SerialException as s_err:
                logger.error(f"Bluetooth connection error on port {target_port}: {s_err}")
                logger.info("Attempting automatic reconnection in 5 seconds...")
                if self.ws:
                    try:
                        self.ws.send(json.dumps({"type": "esp32_status", "status": "RECONNECTING"}))
                    except Exception:
                        pass
                time.sleep(5)

def main():
    parser = argparse.ArgumentParser(description="PulseIQ ESP32 Bluetooth Receiver Bridge")
    parser.add_argument("--port", type=str, default=None, help="COM port name (e.g. COM3 or /dev/rfcomm0)")
    parser.add_argument("--baud", type=int, default=115200, help="Baud rate (default 115200)")
    parser.add_argument("--ws-url", type=str, default="ws://localhost:5000", help="PulseIQ Backend WebSocket URL")
    parser.add_argument("--test", action="store_true", help="Run in simulation test mode without serial hardware")
    args = parser.parse_args()

    bridge = ESP32BluetoothBridge(
        port=args.port,
        baudrate=args.baud,
        ws_url=args.ws_url,
        test_mode=args.test
    )
    bridge.run()

if __name__ == "__main__":
    main()
