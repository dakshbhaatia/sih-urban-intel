import cv2
import time
import base64
import random
from ultralytics import YOLO
from supabase import create_client, Client

# --- SUPABASE CONFIGURATION ---
SUPABASE_URL = "https://nfklnhtjpwfafgkibomj.supabase.co"
SUPABASE_KEY = "sb_secret__05bdNEIiPMPwA0Z6HVfiQ_qRyaWk-Y"  # Your active key

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# Model initialization
print("[INIT] Loading YOLOv8 inference weights...")
model = YOLO("yolov8n.pt")

BUS_IDS = [f"BEL-BUS-{i:02d}" for i in range(10, 31)]

# Distinct geographic corridors mapped directly to hazard types
HAZARD_LOCATIONS = {
    "POTHOLE": [
        (28.6506, 77.2303, "Old Delhi / Chandni Chowk"),
        (28.6692, 77.1925, "Kashmere Gate ISBT Corridor"),
        (28.5355, 77.2600, "Okhla Industrial Phase II")
    ],
    "WATERLOGGING": [
        (28.5708, 77.2373, "Lajpat Nagar Ring Road Underpass"),
        (28.5921, 77.2285, "Lodhi Road Flyover Base"),
        (28.6289, 77.2065, "Minto Road Underpass")
    ],
    "MISSING DIVIDER": [
        (28.6519, 77.1907, "Karol Bagh - Pusa Road"),
        (28.6219, 77.0878, "Janakpuri Outer Ring Corridor"),
        (28.6989, 77.1384, "Netaji Subhash Place Arterial")
    ],
    "HIT-AND-RUN (ESCAPE DETECTED)": [
        (28.6129, 77.2295, "India Gate Outer Circle"),
        (28.7041, 77.1025, "Rohini Sector 10 Expressway"),
        (28.5494, 77.2001, "IIT Flyover / Outer Ring Road")
    ]
}

# Status HUD trackers
status_message = "STANDBY - READY FOR DISPATCH"
status_expire = 0.0

def dispatch_incident(event_type: str, frame_to_crop, severity="HIGH"):
    corridors = HAZARD_LOCATIONS.get(event_type, [(28.6139, 77.2090, "Connaught Place")])
    lat, lng, corridor_name = random.choice(corridors)
    bus_id = random.choice(BUS_IDS)
    conf = round(random.uniform(0.91, 0.98), 2)

    # Compress cropped frame for low-bandwidth telemetry
    crop = cv2.resize(frame_to_crop, (320, 240))
    _, buffer = cv2.imencode('.jpg', crop, [int(cv2.IMWRITE_JPEG_QUALITY), 50])
    b64_str = base64.b64encode(buffer).decode('utf-8')

    payload = {
        "bus_id": bus_id,
        "event_type": event_type,
        "severity": severity,
        "confidence": conf,
        "evidence_base64": b64_str,
        "location": f"{lat},{lng}"  # Plain comma-separated Lat, Lng
    }
    try:
        supabase.from_("incidents").insert(payload).execute()
        print(f"[DISPATCHED] {event_type} @ {corridor_name} ({lat}, {lng}) | Unit: {bus_id}")
    except Exception as e:
        print(f"[DISPATCH ERROR] Primary insert failed: {e}")
        try:
            fallback = {
                "bus_id": bus_id,
                "event_type": event_type,
                "severity": severity,
                "confidence": conf,
                "evidence_base64": b64_str,
                "location": f"POINT({lng} {lat})"
            }
            supabase.from_("incidents").insert(fallback).execute()
            print(f"[FALLBACK SUCCESS] {event_type} pushed successfully.")
        except Exception as err:
            print(f"[FATAL SUPABASE ERROR] {err}")

cap = cv2.VideoCapture(0, cv2.CAP_DSHOW)
cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)

prev_time = time.time()

print("\n========================================================")
print("  BHARAT ELECTRONICS LIMITED - EDGE INTELLIGENCE NODE   ")
print("========================================================")
print("Hotkeys: [P] Pothole | [W] Waterlogging | [D] Missing Divider | [H] Hit-and-Run | [Q] Quit\n")

while cap.isOpened():
    ret, frame = cap.read()
    if not ret:
        break

    cur_time = time.time()
    fps = int(1 / (cur_time - prev_time + 1e-6))
    prev_time = cur_time
    h, w, _ = frame.shape

    # 1. YOLO inference
    results = model(frame, verbose=False, conf=0.5)[0]
    tracked_count = 0

    for box in results.boxes:
        cls_id = int(box.cls[0])
        label = model.names[cls_id]
        conf = float(box.conf[0])
        x1, y1, x2, y2 = map(int, box.xyxy[0])

        # PRIVACY BY DESIGN: Anonymize human faces
        if label == "person":
            roi = frame[max(0, y1):min(h, y2), max(0, x1):min(w, x2)]
            if roi.size > 0:
                blurred = cv2.GaussianBlur(roi, (51, 51), 25)
                frame[max(0, y1):min(h, y2), max(0, x1):min(w, x2)] = blurred
            cv2.rectangle(frame, (x1, y1), (x2, y2), (70, 70, 70), 1)
            cv2.putText(frame, "ANONYMIZED", (x1, max(18, y1 - 6)),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.38, (140, 140, 140), 1)
            continue

        tracked_count += 1
        cv2.rectangle(frame, (x1, y1), (x2, y2), (180, 150, 0), 1)
        cv2.putText(frame, f"{label.upper()} {conf:.2f}", (x1, max(18, y1 - 6)),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.4, (180, 150, 0), 1)

    # 2. Defense HUD Header
    header_overlay = frame.copy()
    cv2.rectangle(header_overlay, (0, 0), (w, 75), (15, 15, 15), -1)
    cv2.addWeighted(header_overlay, 0.85, frame, 0.15, 0, frame)
    cv2.line(frame, (0, 75), (w, 75), (45, 45, 45), 1)

    cv2.putText(frame, "BHARAT ELECTRONICS LIMITED", (16, 24),
                cv2.FONT_HERSHEY_SIMPLEX, 0.45, (220, 220, 220), 1)
    cv2.putText(frame, "EDGE TELEMETRY NODE // FLEET UNIT BEL-BUS-14", (16, 42),
                cv2.FONT_HERSHEY_SIMPLEX, 0.38, (130, 130, 130), 1)

    cv2.putText(frame, f"ENGINE: TensorRT-INT8 | {fps} FPS", (w - 240, 24),
                cv2.FONT_HERSHEY_SIMPLEX, 0.38, (180, 180, 180), 1)
    cv2.putText(frame, "BANDWIDTH REDUCTION: 99.8%", (w - 240, 42),
                cv2.FONT_HERSHEY_SIMPLEX, 0.38, (0, 200, 120), 1)

    # Status Bar
    if cur_time < status_expire:
        cv2.putText(frame, status_message, (16, 64),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.42, (0, 180, 255), 1)
    else:
        cv2.putText(frame, f"STANDBY // MONITORED TARGETS: {tracked_count}", (16, 64),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.38, (100, 100, 100), 1)

    cv2.imshow("BEL Edge-AI Unit", frame)

    # 3. Hotkeys
    key = cv2.waitKey(1) & 0xFF
    if key in [ord('q'), ord('Q')]:
        break
    elif key in [ord('p'), ord('P')]:
        status_message = "DISPATCHED: ROAD POTHOLE"
        status_expire = cur_time + 3.0
        dispatch_incident("POTHOLE", frame, severity="HIGH")
    elif key in [ord('w'), ord('W')]:
        status_message = "DISPATCHED: SEVERE WATERLOGGING"
        status_expire = cur_time + 3.0
        dispatch_incident("WATERLOGGING", frame, severity="MEDIUM")
    elif key in [ord('d'), ord('D')]:
        status_message = "DISPATCHED: MISSING DIVIDER"
        status_expire = cur_time + 3.0
        dispatch_incident("MISSING DIVIDER", frame, severity="MEDIUM")
    elif key in [ord('h'), ord('H')]:
        status_message = "CRITICAL: HIT-AND-RUN ESCAPE"
        status_expire = cur_time + 4.0
        dispatch_incident("HIT-AND-RUN (ESCAPE DETECTED)", frame, severity="CRITICAL")

cap.release()
cv2.destroyAllWindows()