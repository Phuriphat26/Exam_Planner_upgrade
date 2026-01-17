import os
from flask import Blueprint, jsonify, request
from flask_cors import CORS
from pymongo import MongoClient
from datetime import datetime, date
from bson.objectid import ObjectId
import pytz

home_bp = Blueprint('home_bp', __name__, url_prefix='/home_bp')
CORS(home_bp, supports_credentials=True, origins=["http://localhost:5173"])

try:
    client = MongoClient('mongodb://localhost:27017/')
    db = client['mydatabase'] 
    exam_plans_collection = db["exam_plans"]
    study_sessions_collection = db["study_sessions"]
    
    THAI_TZ = pytz.timezone('Asia/Bangkok')
    print("✅ MongoDB Connected (Home)")
except Exception as e:
    print(f"❌ DB Error: {e}")

@home_bp.route('/plans', methods=['GET'])
def get_all_plans():
    try:
        plans = list(exam_plans_collection.find({}, {"_id": 1, "exam_title": 1, "status": 1}).sort("createdAt", -1))
        for p in plans: 
            p["_id"] = str(p["_id"])
        print(f"📚 Returning {len(plans)} plans")
        return jsonify(plans), 200
    except Exception as e:
        print(f"❌ Error in get_all_plans: {e}")
        return jsonify({"error": str(e)}), 500

@home_bp.route('/study_summary/<plan_id>', methods=['GET'])
def get_study_summary_by_id(plan_id):
    try:
        if not ObjectId.is_valid(plan_id): 
            return jsonify({"error": "Invalid ID"}), 400
        plan_oid = ObjectId(plan_id)

        # ดึง sessions ทั้งหมดของแผนนี้
        sessions = list(study_sessions_collection.find({"exam_id": plan_oid}))
        
        print(f"\n{'='*60}")
        print(f"📊 Plan ID: {plan_id}")
        print(f"📊 Total sessions found: {len(sessions)}")

        # ใช้วันที่ปัจจุบัน (ในรูปแบบ string YYYY-MM-DD)
        today_datetime = datetime.now(THAI_TZ)
        today_str = today_datetime.strftime("%Y-%m-%d")
        
        print(f"📅 Today is: {today_str}")
        print(f"{'='*60}\n")
        
        days_read_set = set()
        days_remaining_set = set()
        unique_subjects = set()
        
        today_study_info = None
        total_minutes = 0

        for idx, sess in enumerate(sessions, 1):
            # 1. เก็บชื่อวิชา (ไม่นับ Free Slot)
            subj = sess.get("subject")
            if subj and subj != "Free Slot":
                unique_subjects.add(subj)

            # 2. จัดการวันที่
            raw_date = sess.get("date")
            if not raw_date: 
                print(f"   ⚠️ Session {idx}: Missing date - {sess}")
                continue

            # แปลงเป็น string YYYY-MM-DD
            if isinstance(raw_date, str):
                date_str = raw_date.split("T")[0]
            elif isinstance(raw_date, datetime):
                date_str = raw_date.strftime("%Y-%m-%d")
            else:
                print(f"   ⚠️ Session {idx}: Unknown date format - {type(raw_date)}")
                continue
            
            print(f"Session {idx:2d}: {date_str} | {subj:20s} | {sess.get('startTime', 'N/A')} - {sess.get('endTime', 'N/A')}")

            # 3. แยกประเภทวัน
            if date_str < today_str:
                days_read_set.add(date_str)
                print(f"            → ✅ Past (counted as read)")
            elif date_str > today_str:
                days_remaining_set.add(date_str)
                print(f"            → ⏰ Future (remaining)")
            else:
                # วันนี้พอดี
                days_remaining_set.add(date_str)
                print(f"            → 📍 TODAY (counted as remaining)")

            # 4. หาข้อมูลวันนี้
            if date_str == today_str:
                if today_study_info is None or (today_study_info.get('subject') == 'Free Slot' and subj != 'Free Slot'):
                    today_study_info = {
                        "subject": subj or "Free Slot",
                        "time": f"{sess.get('startTime', '')} - {sess.get('endTime', '')}"
                    }
                    print(f"            → 🎯 Set as today's study")

            # 5. คำนวณเวลาอ่านหนังสือรวม
            start, end = sess.get("startTime"), sess.get("endTime")
            if start and end and subj != "Free Slot":
                try:
                    fmt = "%H:%M"
                    t1 = datetime.strptime(start, fmt)
                    t2 = datetime.strptime(end, fmt)
                    diff = (t2 - t1).total_seconds()
                    if diff < 0: 
                        diff += 86400
                    minutes = diff / 60
                    total_minutes += minutes
                    print(f"            → ⏱️  Duration: {int(minutes)} minutes")
                except Exception as e:
                    print(f"            → ⚠️ Time parse error: {e}")

        print(f"\n{'='*60}")
        print(f"📈 SUMMARY:")
        print(f"   Days read (past):      {len(days_read_set)}")
        print(f"   Days remaining (future+today): {len(days_remaining_set)}")
        print(f"   Unique subjects:       {len(unique_subjects)} - {unique_subjects}")
        print(f"   Total minutes:         {int(total_minutes)} min ({int(total_minutes/60)}h {int(total_minutes%60)}m)")
        print(f"   Today's study:         {today_study_info}")
        print(f"{'='*60}\n")

        result = {
            "days_read": len(days_read_set),
            "days_remaining": len(days_remaining_set),
            "subject_count": len(unique_subjects),
            "total_duration_minutes": total_minutes,
            "today_study": today_study_info
        }
        
        return jsonify(result), 200

    except Exception as e:
        print(f"❌ Summary Error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500