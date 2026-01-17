import os
from flask import Blueprint, jsonify, request, session
from flask_cors import CORS
from pymongo import MongoClient
from datetime import datetime, date
from bson.objectid import ObjectId
import pytz
import traceback

home_bp = Blueprint('home_bp', __name__, url_prefix='/home_bp')
CORS(home_bp, supports_credentials=True, origins=["http://localhost:5173"])

# --- Database Connection ---
try:
    # ใช้ Environment Variable หรือค่า Default
    mongo_uri = os.getenv("MONGODB_URI", "mongodb://localhost:27017/")
    client = MongoClient(mongo_uri)
    db = client['mydatabase']  # ตรวจสอบชื่อ DB ให้ตรงกัน
    
    exam_plans_collection = db["exam_plans"]
    study_sessions_collection = db["study_sessions"]
    
    THAI_TZ = pytz.timezone('Asia/Bangkok')
    print("✅ MongoDB Connected (Home)")
except Exception as e:
    print(f"❌ DB Error: {e}")

# --- Routes ---

@home_bp.route('/plans', methods=['GET'])
def get_all_plans():
    try:
        # [FIX 1] แก้ปัญหาเห็นข้อมูลคนอื่น: ต้องเช็ค user_id จาก Session
        user_id = session.get("user_id")
        if not user_id:
            return jsonify({"error": "Unauthorized"}), 401

        # สร้าง Query กรองเฉพาะของ User คนนี้
        query = {
            "user_id": ObjectId(user_id)
        }

        # ดึงข้อมูลจาก DB
        plans = list(exam_plans_collection.find(query, {
            "_id": 1, "exam_title": 1, "status": 1, "exam_date": 1, "subjects": 1
        }).sort("createdAt", -1))
        
        # แปลงข้อมูลให้เป็น Format ที่ Frontend อ่านง่าย
        for p in plans: 
            p["_id"] = str(p["_id"])
            if "exam_date" in p and isinstance(p["exam_date"], datetime):
                p["exam_date"] = p["exam_date"].strftime("%Y-%m-%d")
                
        print(f"📚 Returning {len(plans)} plans for user {user_id}")
        return jsonify(plans), 200

    except Exception as e:
        print(f"❌ Error in get_all_plans: {e}")
        return jsonify({"error": str(e)}), 500

@home_bp.route('/study_summary/<plan_id>', methods=['GET'])
def get_study_summary(plan_id):
    try:
        # ตรวจสอบสิทธิ์ (Optional: เพื่อความปลอดภัยยิ่งขึ้น)
        user_id = session.get("user_id")
        if not user_id:
             return jsonify({"error": "Unauthorized"}), 401

        plan_oid = ObjectId(plan_id)

        # 1. ดึงข้อมูล Plan มาด้วย เพื่อเอารายชื่อวิชาจริงๆ
        plan = exam_plans_collection.find_one({"_id": plan_oid})
        if not plan:
            return jsonify({"error": "Plan not found"}), 404

        # 2. ดึง Sessions มาคำนวณวันและเวลาเรียน
        sessions = list(study_sessions_collection.find({"exam_id": plan_oid}))

        # Helper สำหรับแปลงเวลา
        def parse_time(t_str):
            try:
                return datetime.strptime(t_str, "%H:%M")
            except:
                return datetime.strptime("00:00", "%H:%M")

        days_read_set = set()
        days_remaining_set = set()
        total_minutes = 0
        today_study_info = []
        
        # หาวันปัจจุบัน (Timezone ไทย)
        now_utc = datetime.now(pytz.utc)
        now_thai = now_utc.astimezone(THAI_TZ)
        today_str = now_thai.strftime("%Y-%m-%d")

        for s in sessions:
            # แปลงวันที่ให้เป็น String มาตรฐาน
            s_date = s.get('date')
            if isinstance(s_date, datetime):
                s_date = s_date.strftime("%Y-%m-%d")
            else:
                s_date = str(s_date).split('T')[0]
            
            s_status = s.get('status')
            
            # นับวัน (เฉพาะที่ไม่ใช่การเลื่อนตาราง หรือจะนับรวมก็ได้แล้วแต่ Logic)
            # ในที่นี้สมมติว่านับหมดที่มีในตาราง
            if s_status == 'completed':
                days_read_set.add(s_date)
            
            # ถ้าวันที่ >= วันนี้ และยังไม่เสร็จ ถือว่าเป็นวันที่เหลือ
            if s_date >= today_str and s_status != 'completed':
                 days_remaining_set.add(s_date)

            # คำนวณเวลาที่ใช้ไป (เฉพาะ Completed)
            if s_status == 'completed':
                 start = s.get('startTime', '00:00')
                 end = s.get('endTime', '00:00')
                 try:
                    t1 = parse_time(start)
                    t2 = parse_time(end)
                    diff = (t2 - t1).total_seconds()
                    if diff < 0: diff += 86400 
                    total_minutes += (diff / 60)
                 except:
                    pass
            
            # ข้อมูลของ "วันนี้"
            if s_date == today_str and s_status != 'completed':
                 today_study_info.append({
                     "subject": s.get('subject'),
                     "startTime": s.get('startTime'),
                     "endTime": s.get('endTime'),
                     "status": s_status
                 })

        # --- [FIX 2] แก้ปัญหานับวิชาเกิน (เลข 4) ---
        # ใช้วิธีดึงจาก Plan โดยตรง จะได้รายชื่อวิชาที่ถูกต้อง (เช่น 3 วิชา)
        real_subjects = plan.get('subjects', [])
        subject_count = len(real_subjects)
        
        # Fallback: ถ้าข้อมูลใน Plan ไม่มี (Data เก่า) ให้นับจาก Session แต่กรองคำว่า "เลื่อน" ออก
        if subject_count == 0 and sessions:
             unique_from_sessions = {
                 s['subject'] for s in sessions 
                 if s.get('subject') and "เลื่อน" not in s.get('subject', '')
             }
             subject_count = len(unique_from_sessions)
        # ----------------------------------------

        result = {
            "days_read": len(days_read_set),
            "days_remaining": len(days_remaining_set),
            "subject_count": subject_count,  # ค่าที่แก้ไขแล้ว
            "total_duration_minutes": total_minutes,
            "today_study": today_study_info
        }
        
        return jsonify(result), 200

    except Exception as e:
        print(f"❌ Error in get_study_summary: {e}")
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500