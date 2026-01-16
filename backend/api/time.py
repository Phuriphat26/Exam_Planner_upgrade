import os
from flask import Blueprint, jsonify # <-- 1. ลบ session ออก
from pymongo import MongoClient
from datetime import date
from bson.objectid import ObjectId

# --- 1. เชื่อมต่อ MongoDB ---
try:
    client = MongoClient('mongodb://localhost:27017/')
    db = client['mydatabase']
    exam_plans_collection = db["exam_plans"]
    print("✅ (API Timer) เชื่อมต่อ MongoDB สำเร็จ")
except Exception as e:
    print(f"❌ (API Timer) เชื่อมต่อ MongoDB ล้มเหลว: {e}")
    exam_plans_collection = None 

# --- 2. สร้าง Blueprint ---
api_bp = Blueprint('api_bp', __name__, url_prefix='/api')

# --- [API 1: แก้ไข] ดึงรายชื่อแผน (ชั่วคราว: ดึง "ทุกแผน" ไม่กรอง user) ---
@api_bp.route('/get_all_plans', methods=['GET'])
def get_all_plans():
    # [แก้ไข] เปลี่ยนจาก 'if not exam_plans_collection'
    if exam_plans_collection is None:
         return jsonify({"error": "Database not connected"}), 500
    
    # [ลบออกชั่วคราว] ลบการตรวจสอบ session
    # user_id = session.get('user_id')
    # if not user_id:
    #     return jsonify({"error": "Unauthorized"}), 401

    try:
        # [แก้ไข] กรอง .find() (ชั่วคราว: ไม่กรอง user_id)
        plans_cursor = exam_plans_collection.find(
            {}, # <-- [ชั่วคราว] ดึงทุกแผน
            {"_id": 1, "exam_title": 1} 
        )
        
        plan_list = []
        for plan in plans_cursor:
            plan_list.append({
                "_id": str(plan["_id"]),
                "exam_title": plan.get("exam_title", "แผนไม่มีชื่อ")
            })
            
        return jsonify(plan_list)
    
    except Exception as e:
        print(f"❌ เกิดข้อผิดพลาดใน /get_all_plans: {e}")
        return jsonify({"error": str(e)}), 500

# --- [API 2: แก้ไข] ดึงเวลานับถอยหลัง (ชั่วคราว: ไม่ตรวจสอบสิทธิ์) ---
@api_bp.route('/get_today_event/<plan_id>', methods=['GET'])
def get_study_plan_for_today(plan_id):
    
    # [แก้ไข] เปลี่ยนจาก 'if not exam_plans_collection'
    if exam_plans_collection is None:
         return jsonify({"error": "Database not connected"}), 500

    # [ลบออกชั่วคราว] ลบการตรวจสอบ session
    # user_id = session.get('user_id')
    # if not user_id:
    #     return jsonify({"error": "Unauthorized"}), 401

    try:
        # [แก้ไข] ค้นหา Plan (ชั่วคราว: ไม่กรอง user_id)
        active_plan = exam_plans_collection.find_one(
            {
                "_id": ObjectId(plan_id),
                # "user_id": ObjectId(user_id) # <-- [ชั่วคราว]
            }
        )
        
        if not active_plan:
            # ถ้าไม่เจอ
            return jsonify(None) 

        # 4. หาวันที่ของวันนี้
        today_str = date.today().strftime('%Y-%m-%d')
        
        # (สำหรับทดสอบ)
        # today_str = "2025-10-30" # <--- วันที่ในฐานข้อมูลของคุณ
        
        # 5. ค้นหา "item" ใน study_plan ที่ตรงกับวันนี้
        study_plan_list = active_plan.get("study_plan", [])
        
        for item in study_plan_list:
            if item.get("date") == today_str:
                # เจอแผนของวันนี้!
                return jsonify(item) 
        
        # 6. ถ้าวน Loop จบแล้วไม่เจอ
        return jsonify(None) 

    except Exception as e:
        print(f"❌ เกิดข้อผิดพลาดใน /get_today_event: {e}")
        return jsonify({"error": str(e)}), 500

