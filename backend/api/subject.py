from flask import Blueprint, request, jsonify, session
from flask_cors import CORS
from pymongo import MongoClient
from bson.objectid import ObjectId
from datetime import datetime, date
import traceback

subject_bp = Blueprint("subject_bp", __name__, url_prefix='/subject')

CORS(subject_bp, supports_credentials=True)

client = MongoClient("mongodb://localhost:27017/")
db = client["mydatabase"]
courses_collection = db["subject"]


def validate_and_structure_course(data):
    """
    ฟังก์ชันสำหรับ Validate และจัดเตรียมข้อมูลก่อนบันทึกลง DB
    """
    errors = []
    structured_data = {}

    # Required Fields (ข้อมูลพื้นฐาน)
    if not data.get("title"): errors.append("Missing 'title'")
    
    subject_code = data.get("subject_code") or data.get("subject")
    
    if not subject_code:
        errors.append("Missing 'subject_code' (or 'subject')")
    else:
        structured_data["subject_code"] = subject_code
    
    # Numeric Validation (ตัวเลข)
    try:
        credits = int(data.get("credits", 0))
        if credits < 0: errors.append("Credits must be positive")
        structured_data["credits"] = credits

        # Priority (ความสำคัญ 1-3)
        priority = int(data.get("priority", 2)) 
        if not (1 <= priority <= 3): errors.append("Priority must be 1-3")
        structured_data["priority"] = priority

        # Difficulty (ความยาก 1-5)
        difficulty = int(data.get("difficulty", 3)) 
        if not (1 <= difficulty <= 5): errors.append("Difficulty must be 1-5")
        structured_data["difficulty"] = difficulty

    except (ValueError, TypeError):
        errors.append("Credits, Priority, or Difficulty must be numbers")

 
    exam_date_raw = data.get("exam_date")
    if exam_date_raw:

        if isinstance(exam_date_raw, str) and exam_date_raw.strip() == "":
            structured_data["exam_date"] = None
        else:
            structured_data["exam_date"] = exam_date_raw 
    else:
        structured_data["exam_date"] = None


    topics = data.get("topics", [])
    if isinstance(topics, list):
        formatted_topics = []
        for t in topics:
            if isinstance(t, str):
                formatted_topics.append({"name": t, "completed": False})
            elif isinstance(t, dict) and "name" in t:
                formatted_topics.append({
                    "name": t["name"], 
                    "completed": t.get("completed", False)
                })
        structured_data["topics"] = formatted_topics
    else:
        structured_data["topics"] = []


    structured_data["title"] = data.get("title")
    structured_data["color"] = data.get("color", "#3B82F6") 
    structured_data["description"] = data.get("description", "")

    return structured_data, errors



@subject_bp.route("/", methods=["GET"])
def get_all_courses():
    try:
        if "user_id" not in session:
            return jsonify({"message": "กรุณา login ก่อนใช้งาน"}), 401

        user_id = session["user_id"]
        user_obj_id = ObjectId(user_id)
        
        subjects_cursor = courses_collection.find(
            {"user_id": user_obj_id}
        ).sort("priority", -1)
        
        subjects_list = []
        for subject in subjects_cursor:
            subject['_id'] = str(subject['_id'])
            subject['user_id'] = str(subject['user_id'])
            
            if "exam_date" in subject and subject["exam_date"]:

                if isinstance(subject["exam_date"], (datetime, date)):
                    subject["exam_date"] = subject["exam_date"].strftime("%Y-%m-%d")
                else:
         
                    subject["exam_date"] = str(subject["exam_date"])
            else:
                subject["exam_date"] = "-" 
            
            subjects_list.append(subject)

        return jsonify(subjects_list), 200

    except Exception:
        print(traceback.format_exc())
        return jsonify({"message": "Internal Server Error"}), 500

@subject_bp.route("/", methods=["POST"])
def add_course():
    try:
        if "user_id" not in session:
            return jsonify({"message": "กรุณา login ก่อนใช้งาน"}), 401

        raw_data = request.json
        if not raw_data:
            return jsonify({"message": "No input data"}), 400

        user_obj_id = ObjectId(session["user_id"])
        
        items_to_process = raw_data if isinstance(raw_data, list) else [raw_data]
        valid_courses = []

        for item in items_to_process:
            structured_data, errors = validate_and_structure_course(item)
            
            if errors:
                print(f"[DEBUG] Validation Error: {errors}")
                return jsonify({
                    "message": f"Validation Failed: {', '.join(errors)}", 
                    "errors": errors, 
                    "failed_item": item.get("title", "Unknown")
                }), 400
            
            structured_data["user_id"] = user_obj_id
            structured_data["created_at"] = datetime.now()
            valid_courses.append(structured_data)

        if valid_courses:
            courses_collection.insert_many(valid_courses)
            return jsonify({"message": f"Successfully added {len(valid_courses)} courses"}), 201
        
        return jsonify({"message": "No valid data to insert"}), 400

    except Exception:
        print(traceback.format_exc())
        return jsonify({"message": "Internal Server Error"}), 500

@subject_bp.route("/<subject_id>", methods=["PUT"])
def update_course(subject_id):
    try:
        if "user_id" not in session:
            return jsonify({"message": "กรุณา login ก่อนใช้งาน"}), 401

        data = request.json
        if not data:
            return jsonify({"message": "No input data"}), 400

        structured_data, errors = validate_and_structure_course(data)
        
        if errors:
            return jsonify({"message": f"Validation Failed: {', '.join(errors)}"}), 400

        structured_data["updated_at"] = datetime.now()

        result = courses_collection.update_one(
            {"_id": ObjectId(subject_id), "user_id": ObjectId(session["user_id"])},
            {"$set": structured_data}
        )

        if result.matched_count == 0:
            return jsonify({"message": "Course not found or unauthorized"}), 404
        
        return jsonify({"message": "Course updated successfully"}), 200

    except Exception:
        print(traceback.format_exc())
        return jsonify({"message": "Internal Server Error"}), 500

@subject_bp.route("/<subject_id>", methods=["DELETE"])
def delete_course(subject_id):
    try:
        if "user_id" not in session:
            return jsonify({"message": "Unauthorized"}), 401

        result = courses_collection.delete_one({
            "_id": ObjectId(subject_id),
            "user_id": ObjectId(session["user_id"])
        })

        if result.deleted_count == 1:
            return jsonify({"message": "Deleted successfully"}), 200
        else:
            return jsonify({"message": "Course not found"}), 404

    except Exception:
        print(traceback.format_exc())
        return jsonify({"message": "Internal Server Error"}), 500