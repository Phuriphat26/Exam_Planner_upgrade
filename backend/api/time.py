import os
from flask import Blueprint, jsonify
from flask_cors import CORS
from pymongo import MongoClient
from datetime import datetime
from bson.objectid import ObjectId
import pytz

# MongoDB Connection
try:
    client = MongoClient('mongodb://localhost:27017/')
    db = client['mydatabase']
    exam_plans_collection = db["exam_plans"]
    study_sessions_collection = db["study_sessions"]
    THAI_TZ = pytz.timezone('Asia/Bangkok')
    print("✅ (API Timer) เชื่อมต่อ MongoDB สำเร็จ")
except Exception as e:
    print(f"❌ (API Timer) เชื่อมต่อ MongoDB ล้มเหลว: {e}")
    exam_plans_collection = None
    study_sessions_collection = None

# Blueprint
api_bp = Blueprint('api_bp', __name__, url_prefix='/api')
CORS(api_bp, supports_credentials=True, origins=["http://localhost:5173"])

# API 1: ดึงรายชื่อแผนทั้งหมด
@api_bp.route('/get_all_plans', methods=['GET'])
def get_all_plans():
    if exam_plans_collection is None:
        return jsonify({"error": "Database not connected"}), 500
    
    try:
        plans_cursor = exam_plans_collection.find(
            {},
            {"_id": 1, "exam_title": 1}
        ).sort("createdAt", -1)
        
        plan_list = []
        for plan in plans_cursor:
            plan_list.append({
                "_id": str(plan["_id"]),
                "exam_title": plan.get("exam_title", "แผนไม่มีชื่อ")
            })
        
        print(f"📚 Returning {len(plan_list)} plans for Timer")
        return jsonify(plan_list), 200
    
    except Exception as e:
        print(f"❌ Error in /get_all_plans: {e}")
        return jsonify({"error": str(e)}), 500

# API 2: ดึง Event ของวันนี้ (แก้ไขให้ใช้ study_sessions)
@api_bp.route('/get_today_event/<plan_id>', methods=['GET'])
def get_study_plan_for_today(plan_id):
    if study_sessions_collection is None:
        return jsonify({"error": "Database not connected"}), 500

    try:
        print(f"\n⏰ Timer API: Getting today's event for plan {plan_id}")
        
        # วันที่วันนี้
        today_str = datetime.now(THAI_TZ).strftime('%Y-%m-%d')
        print(f"📅 Today: {today_str}")
        
        # ค้นหา session ของวันนี้
        today_session = study_sessions_collection.find_one({
            "exam_id": ObjectId(plan_id),
            "date": today_str
        })
        
        if today_session:
            result = {
                "subject": today_session.get("subject", "ไม่ระบุ"),
                "startTime": today_session.get("startTime", "09:00"),
                "endTime": today_session.get("endTime", "17:00"),
                "date": today_session.get("date")
            }
            print(f"✅ Found today's session: {result['subject']} ({result['startTime']} - {result['endTime']})")
            return jsonify(result), 200
        else:
            print(f"⚠️ No session found for today ({today_str})")
            return jsonify(None), 200

    except Exception as e:
        print(f"❌ Error in /get_today_event: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500