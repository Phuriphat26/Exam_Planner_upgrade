from pymongo import MongoClient
from bson.objectid import ObjectId
from datetime import datetime, timedelta
import pytz # (สำคัญมากสำหรับ Timezone)
import os

# (Import ฟังก์ชันส่งเมลที่เราสร้างไว้)
from api.email_service import send_notification_email

# --- ตั้งค่า Database (ให้ตรงกับใน app.py) ---
# (ใช้ MONGO_URI จาก .env ถ้ามี, หรือใช้ค่า default)
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/mydatabase")
client = MongoClient(MONGO_URI)
db = client["mydatabase"]

# (!!) สมมติว่าคุณมี Collection 'users' ที่เก็บอีเมล
users_collection = db["users"] 
exam_plans_collection = db["exam_plans"]

# --- ตั้งค่า Timezone ---
TIMEZONE = pytz.timezone('Asia/Bangkok') # (GTM+7)

def check_and_send_notifications(app):
    """
    ฟังก์ชันนี้จะถูก "ปลุก" ทุกๆ 1 นาที
    เพื่อเช็ค DB และส่งอีเมล
    """
    
    # (สำคัญ!) ต้องใช้ app_context() เพื่อให้ mail.send() ทำงานได้
    with app.app_context():
        
        now_bkk = datetime.now(TIMEZONE)
        print(f"[{now_bkk.strftime('%Y-%m-%d %H:%M:%S')}] Running notification check...")

        # 1. ค้นหา "แผน" ทั้งหมดที่ยัง "active"
        active_plans = list(exam_plans_collection.find({"status": "active"}))
        
        if not active_plans:
            print("No active plans found.")
            return

        for plan in active_plans:
            user_id = plan.get("user_id")
            
            # 2. ค้นหาอีเมลของผู้ใช้
            # (!! คุณต้องมี Collection 'users' และฟิลด์ 'email' !!)
            user = users_collection.find_one({"_id": ObjectId(user_id)})
            if not user or "email" not in user:
                print(f"Skipping plan {plan['_id']}: User or email not found.")
                continue 
            
            recipient_email = user["email"]
            
            plan_modified = False
            updates_to_make = {}

            # 3. วนลูปดู "ช่องเวลา" (Slot) ทั้งหมดในแผน
            for index, slot in enumerate(plan.get("study_plan", [])):
                
                # 4. เช็คว่า "ยังไม่อ่าน" (pending) หรือไม่?
                if slot.get("status") == "pending":
                    try:
                        # 5. แปลง (Parse) วันที่และเวลาจาก DB
                        slot_date_str = slot.get("date").split("T")[0] 
                        slot_time_str = slot.get("startTime") # (เช่น "22:00")
                        
                        slot_dt_str = f"{slot_date_str} {slot_time_str}"
                        
                        slot_datetime_bkk = TIMEZONE.localize(
                            datetime.strptime(slot_dt_str, "%Y-%m-%d %H:%M")
                        )

                        # 6. เช็คว่าถึงเวลาหรือยัง?
                        time_diff_seconds = (now_bkk - slot_datetime_bkk).total_seconds()
                        
                        # (ส่งเมลถ้าเวลาปัจจุบัน อยู่ระหว่าง "เวลาใน Slot" ถึง "เวลาใน Slot + 5 นาที")
                        if 0 <= time_diff_seconds < 300: # (5 นาที)
                            
                            print(f"  -> SENDING: Subject '{slot.get('subject')}' to {recipient_email}")
                            
                            # 7. ส่งอีเมล!
                            send_notification_email(
                                subject=slot.get("subject", "Reading Task"),
                                recipient_email=recipient_email
                            )
                            
                            # 8. อัปเดตสถานะ ป้องกันการส่งซ้ำ
                            # (เปลี่ยน 'pending' เป็น 'notified'
                            updates_to_make[f"study_plan.{index}.status"] = "notified"
                            plan_modified = True

                    except Exception as e:
                        print(f"  -> ERROR parsing date/time for slot {slot.get('slot_id')}: {e}")

            # 9. อัปเดตสถานะลง DB (ทีเดียว)
            if plan_modified:
                exam_plans_collection.update_one(
                    {"_id": plan["_id"]},
                    {"$set": updates_to_make}
                )
                print(f"  -> Updated {len(updates_to_make)} slots status for plan {plan['_id']}")