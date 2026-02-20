from pymongo import MongoClient
from bson.objectid import ObjectId
from datetime import datetime, timedelta
import pytz 
import os


from api.email_service import send_notification_email


MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/mydatabase")
client = MongoClient(MONGO_URI)
db = client["mydatabase"]


users_collection = db["users"] 
exam_plans_collection = db["exam_plans"]


TIMEZONE = pytz.timezone('Asia/Bangkok') 

def check_and_send_notifications(app):

    

    with app.app_context():
        
        now_bkk = datetime.now(TIMEZONE)
        print(f"[{now_bkk.strftime('%Y-%m-%d %H:%M:%S')}] Running notification check...")

        # ค้นหา "แผน" ทั้งหมดที่ยัง "active"
        active_plans = list(exam_plans_collection.find({"status": "active"}))
        
        if not active_plans:
            print("No active plans found.")
            return

        for plan in active_plans:
            user_id = plan.get("user_id")
            
            #ค้นหาอีเมลของผู้ใช้
           
            user = users_collection.find_one({"_id": ObjectId(user_id)})
            if not user or "email" not in user:
                print(f"Skipping plan {plan['_id']}: User or email not found.")
                continue 
            
            recipient_email = user["email"]
            
            plan_modified = False
            updates_to_make = {}

            # วนลูปดู "ช่องเวลา" (Slot) ทั้งหมดในแผน
            for index, slot in enumerate(plan.get("study_plan", [])):
                
                # เช็คว่า "ยังไม่อ่าน" (pending) หรือไม่?
                if slot.get("status") == "pending":
                    try:
                        # แปลง (Parse) วันที่และเวลาจาก DB
                        slot_date_str = slot.get("date").split("T")[0] 
                        slot_time_str = slot.get("startTime") 
                        
                        slot_dt_str = f"{slot_date_str} {slot_time_str}"
                        
                        slot_datetime_bkk = TIMEZONE.localize(
                            datetime.strptime(slot_dt_str, "%Y-%m-%d %H:%M")
                        )

                        # เช็คว่าถึงเวลาหรือยัง?
                        time_diff_seconds = (now_bkk - slot_datetime_bkk).total_seconds()
                        
                        # (ส่งเมลถ้าเวลาปัจจุบัน อยู่ระหว่าง "เวลาใน Slot" ถึง "เวลาใน Slot + 5 นาที")
                        if 0 <= time_diff_seconds < 300: # (5 นาที)
                            
                            print(f"  -> SENDING: Subject '{slot.get('subject')}' to {recipient_email}")
                            
                            # ส่งอีเมล!
                            send_notification_email(
                                subject=slot.get("subject", "Reading Task"),
                                recipient_email=recipient_email
                            )
                            
                            # อัปเดตสถานะ ป้องกันการส่งซ้ำ
                            # (เปลี่ยน 'pending' เป็น 'notified'
                            updates_to_make[f"study_plan.{index}.status"] = "notified"
                            plan_modified = True

                    except Exception as e:
                        print(f"  -> ERROR parsing date/time for slot {slot.get('slot_id')}: {e}")

            # อัปเดตสถานะลง DB (ทีเดียว)
            if plan_modified:
                exam_plans_collection.update_one(
                    {"_id": plan["_id"]},
                    {"$set": updates_to_make}
                )
                print(f"  -> Updated {len(updates_to_make)} slots status for plan {plan['_id']}")