from flask import Blueprint, request, jsonify, session
from flask_cors import cross_origin
from pymongo import MongoClient
from bson.objectid import ObjectId
from datetime import datetime
import pytz
import os

# url_prefix คงเดิม
tasks_bp = Blueprint('tasks', __name__, url_prefix='/calender/api/custom-tasks')

# --- Database Connection ---
client = MongoClient('mongodb://localhost:27017/')
db = client['mydatabase']
custom_tasks_collection = db['custom_tasks']

# ตั้งค่า Timezone ไทย
THAI_TZ = pytz.timezone('Asia/Bangkok')

# --- Routes ---

# [FIX] เปลี่ยน "/" เป็น "" เพื่อไม่ให้บังคับมี slash ปิดท้าย
@tasks_bp.route("", methods=["GET", "OPTIONS"]) 
@cross_origin(supports_credentials=True, origins=['http://localhost:5173'])
def get_custom_tasks():
    if request.method == "OPTIONS":
        return jsonify({"message": "OK"}), 200

    if "user_id" not in session: 
        return jsonify({"message": "Unauthorized"}), 401
    
    try:
        user_id = ObjectId(session["user_id"])
        date_str = request.args.get("date")
        
        query = {"user_id": user_id}
        if date_str:
            query["date"] = date_str

        tasks = list(custom_tasks_collection.find(query).sort("created_at", 1))
        
        for t in tasks:
            t["_id"] = str(t["_id"])
            t["user_id"] = str(t["user_id"])
            
        return jsonify(tasks), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# [FIX] เปลี่ยน "/" เป็น "" เช่นกัน
@tasks_bp.route("", methods=["POST"])
@cross_origin(supports_credentials=True, origins=['http://localhost:5173'])
def add_custom_task():
    if "user_id" not in session: 
        return jsonify({"message": "Unauthorized"}), 401
    
    try:
        data = request.json
        user_id = ObjectId(session["user_id"])
        
        new_task = {
            "user_id": user_id,
            "title": data.get("title"),
            "date": data.get("date"),
            "isCompleted": False,
            "created_at": datetime.now(THAI_TZ)
        }
        
        result = custom_tasks_collection.insert_one(new_task)
        return jsonify({"message": "Task added", "id": str(result.inserted_id)}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ส่วนนี้ถูกต้องแล้ว (มี ID ต่อท้าย)
@tasks_bp.route("/<task_id>", methods=["PUT"])
@cross_origin(supports_credentials=True, origins=['http://localhost:5173'])
def update_custom_task(task_id):
    if "user_id" not in session: 
        return jsonify({"message": "Unauthorized"}), 401
    
    try:
        user_id = ObjectId(session["user_id"])
        data = request.json
        
        result = custom_tasks_collection.update_one(
            {"_id": ObjectId(task_id), "user_id": user_id},
            {"$set": {"isCompleted": data.get("isCompleted")}}
        )
        
        if result.matched_count == 0:
             return jsonify({"message": "Task not found"}), 404

        return jsonify({"message": "Updated successfully"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@tasks_bp.route("/<task_id>", methods=["DELETE"])
@cross_origin(supports_credentials=True, origins=['http://localhost:5173'])
def delete_custom_task(task_id):
    if "user_id" not in session: 
        return jsonify({"message": "Unauthorized"}), 401
    
    try:
        user_id = ObjectId(session["user_id"])
        
        result = custom_tasks_collection.delete_one({"_id": ObjectId(task_id), "user_id": user_id})
        
        if result.deleted_count == 0:
            return jsonify({"message": "Task not found"}), 404

        return jsonify({"message": "Deleted successfully"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500