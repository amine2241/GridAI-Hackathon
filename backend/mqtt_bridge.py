import json
import paho.mqtt.client as mqtt
from datetime import datetime
import os
import asyncio
import uuid
import threading
from dotenv import load_dotenv

load_dotenv()

from app.agents.iot_analyzer_agent import iot_analyzer_agent
from app.agents.models import AgentDeps

BROKER = os.getenv("MQTT_BROKER", "broker.hivemq.com")
PORT = int(os.getenv("MQTT_PORT", 1883))
INCIDENT_TOPIC = os.getenv("MQTT_TOPIC", "anas/python")

def log_incident(raw, analysis):
    with open("incidents.log", "a") as f:
        f.write(f"{datetime.now()}\nRAW: {json.dumps(raw)}\nAI: {analysis}\n\n")

def log_telemetry(data):
    with open("telemetry.log", "a") as f:
        f.write(f"{datetime.now()} | {json.dumps(data)}\n")

async def process_incident(data, loop):
    print(f"\n[AI] Analyzing incident for device: {data.get('device_id', 'unknown')}")
    
    raw_log_input = json.dumps(data)
    
    deps = AgentDeps(
        thread_id=f"mqtt-{uuid.uuid4()}",
        user_id="iot_device",
        user_email=data.get("customer_email", "abdo.elgharbaoui3@gmail.com"),
        workflow_id="iot-backend",
        current_date=datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    )

    try:
        analysis_res = await iot_analyzer_agent.run(raw_log_input, deps=deps)
        analysis = analysis_res.output
        
        print(f"[AI] Analysis Complete: {analysis.priority} priority - {analysis.incident_subject}")
        print(f"     Reasoning: {analysis.reasoning}")
        
        if analysis.ticket_id:
            print(f"✅ TICKET CREATED: {analysis.ticket_id} (Status: {analysis.ticket_status})")
        else:
            print(f"ℹ️ No ticket created (Priority: {analysis.priority})")

        log_incident(data, analysis.model_dump())
        print("[Done] Processing finished.")

    except Exception as e:
        print(f"[Error] Failed to process incident: {e}")

def create_on_connect(topic):
    def on_connect(client, userdata, flags, rc):
        if rc == 0:
            print(f"Connected to MQTT broker at {BROKER}")
            client.subscribe(topic)
        else:
            print(f"Failed to connect, return code {rc}")
    return on_connect

def create_on_message(loop):
    def on_message(client, userdata, msg):
        payload = msg.payload.decode()
        try:
            data = json.loads(payload)
        except Exception as e:
            print(f"Invalid JSON received: {payload}")
            return

        print(f"\n[MQTT] Message received on {msg.topic}")
        
        if data.get("type") != "incident":
            print("[MQTT] Telemetry update — logging only.")
            log_telemetry(data)
            return

        print("[MQTT] INCIDENT DETECTED — Triggering AI Pipeline")
        
        asyncio.run_coroutine_threadsafe(process_incident(data, loop), loop)
    return on_message

def start_mqtt_bridge():
    print("🚀 Starting MQTT Bridge Service...")
    
    loop = asyncio.new_event_loop()
    
    client = mqtt.Client()
    client.on_connect = create_on_connect(INCIDENT_TOPIC)
    client.on_message = create_on_message(loop)

    def run_loop(loop):
        asyncio.set_event_loop(loop)
        loop.run_forever()

    threading.Thread(target=run_loop, args=(loop,), daemon=True).start()

    try:
        client.connect(BROKER, PORT)
        client.loop_start() 
        print("✅ MQTT Bridge Service active")
        return client
    except Exception as e:
        print(f"❌ Failed to start MQTT Bridge: {e}")
        return None

if __name__ == "__main__":
    print("🚀 MQTT Bridge (Standalone Mode)")
    start_mqtt_bridge()
    
    import time
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("Stopping...")
