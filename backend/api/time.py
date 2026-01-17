import os
from flask import Blueprint, jsonify, session
from flask_cors import CORS
from pymongo import MongoClient
from datetime import datetime
from bson.objectid import ObjectId
import pytz
import traceback

# --- 1. การเชื่อมต่อ Database ---
try:
    # ตรวจสอบ Connection String ให้ตรงกับของคุณ
    client = MongoClient('mongodb://localhost:27017/')
    db = client['mydatabase']
    exam_plans_collection = db["exam_plans"]
    study_sessions_collection = db["study_sessions"]
    THAI_TZ = pytz.timezone('Asia/Bangkok')
    print("✅ (API Timer) MongoDB Connected")
except Exception as e:
    print(f"❌ (API Timer) DB Error: {e}")
    exam_plans_collection = None
    study_sessions_collection = None

# --- 2. สร้าง Blueprint ---
api_bp = Blueprint('api_bp', __name__, url_prefix='/api')
CORS(api_bp, supports_credentials=True, origins=["http://localhost:5173"])

# --- API 1: ดึงรายชื่อแผน (เฉพาะของ User นี้) ---
@api_bp.route('/get_all_plans', methods=['GET'])
def get_all_plans():
    if exam_plans_collection is None:
        return jsonify({"error": "Database error"}), 500
    
    try:
        # [Security Fix] ต้องดึง user_id จาก Session
        user_id = session.get("user_id")
        if not user_id:
            return jsonify({"error": "Unauthorized"}), 401

        # Query โดยกรอง user_id
        plans = list(exam_plans_collection.find(
            {"user_id": ObjectId(user_id)}, 
            {"_id": 1, "exam_title": 1}
        ).sort("createdAt", -1))
        
        # จัด Format ข้อมูลส่งกลับ
        plan_list = []
        for p in plans:
            plan_list.append({
                "_id": str(p["_id"]),
                "exam_title": p.get("exam_title", "Unknow Plan")
            })
        
        print(f"📚 Sent {len(plan_list)} plans to Timer (User: {user_id})")
        return jsonify(plan_list), 200
    
    except Exception as e:
        print(f"❌ Error /get_all_plans: {e}")
        return jsonify({"error": str(e)}), 500

# --- API 2: ดึงวิชาที่จะเรียน (ของ User นี้ + ตามเวลาจริง) ---
@api_bp.route('/get_today_event/<plan_id>', methods=['GET'])
def get_today_event(plan_id):
    if study_sessions_collection is None:
        return jsonify({"error": "Database error"}), 500

    try:
        # [Security Fix] เช็ค User
        user_id = session.get("user_id")
        if not user_id:
            return jsonify({"error": "Unauthorized"}), 401

        # เวลาปัจจุบัน
        now = datetime.now(THAI_TZ)
        today_str = now.strftime('%Y-%m-%d')
        current_time_str = now.strftime('%H:%M')

        print(f"\n⏰ checking event for Plan: {plan_id} | Time: {current_time_str}")

        # ดึงตารางเรียนทั้งหมดของ "วันนี้" (เรียงตามเวลา)
        today_sessions = list(study_sessions_collection.find({
            "exam_id": ObjectId(plan_id),
            "user_id": ObjectId(user_id),  # [Security Fix] กรอง User
            "date": today_str
        }).sort("startTime", 1))

        target_session = None

        # Logic หา Session ที่เหมาะสม
        for sess in today_sessions:
            start = sess.get("startTime", "00:00")
            end = sess.get("endTime", "23:59")
            
            # กรณี 1: กำลังเรียนอยู่ตอนนี้ (Active)
            if start <= current_time_str <= end:
                target_session = sess
                print("   -> Found ACTIVE session")
                break 
            
            # กรณี 2: ยังไม่ถึงเวลาเรียน (Upcoming) เอาอันแรกที่เจอ
            if start > current_time_str and target_session is None:
                target_session = sess
                print("   -> Found UPCOMING session")
                break 

        if target_session:
            result = {
                "subject": target_session.get("subject"),
                "startTime": target_session.get("startTime"),
                "endTime": target_session.get("endTime"),
                "status": target_session.get("status", "pending")
            }
            return jsonify(result), 200
        else:
            return jsonify(None), 200 # ไม่มีเรียนแล้ววันนี้

    except Exception as e:
        print(f"❌ Error /get_today_event: {e}")
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500