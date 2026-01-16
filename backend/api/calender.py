from flask import Flask, request, jsonify, Blueprint, session, make_response
from flask_cors import CORS
import secrets 
import math
import random 
from pymongo import MongoClient
from bson.objectid import ObjectId
from bson.errors import InvalidId
from datetime import datetime, date, timedelta
import os
import traceback 
from collections import Counter 
import pytz 

# --- 1. Blueprint Setup ---
calender_bp = Blueprint('calender', __name__, url_prefix='/calender')

CORS(calender_bp, 
     origins=["http://localhost:5173"], 
     supports_credentials=True,       
     methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"] 
)

# --- 2. Database Connection ---
client = MongoClient(os.getenv("MONGODB_URI", "mongodb://localhost:27017/"))
db = client['mydatabase']

subjects_collection = db["subject"]
exam_plans_collection = db["exam_plans"]      
study_sessions_collection = db["study_sessions"] 

# [3] ตั้งค่า Timezone
THAI_TZ = pytz.timezone('Asia/Bangkok')

# --- 3. Helper Functions ---

def time_to_minutes(time_str):
    try:
        hours, minutes = map(int, time_str.split(':'))
        return (hours * 60) + minutes
    except Exception:
        return 0

def minutes_to_time(total_minutes):
    hours = total_minutes // 60
    minutes = total_minutes % 60
    return f"{hours:02d}:{minutes:02d}"

# [UPGRADE] Algorithm จัดตารางแบบ Smart Interleaving 
def generate_weighted_schedule(subjects, study_slots):
    if not subjects or not study_slots:
        return []

    # 1. คำนวณ Priority
    total_priority = sum(max(1, s.get('priority', 1)) for s in subjects) 
    
    if total_priority == 0: 
        return [{**slot, 'subject': 'Free Slot', 'slot_id': f"slot_{secrets.token_hex(8)}", 'status': 'pending'} for slot in study_slots]

    total_slots = len(study_slots)
    slots_per_point = total_slots / total_priority
    
    # 2. สร้าง Task Pool
    task_pool = []
    sorted_subjects = sorted(subjects, key=lambda s: s.get('priority', 1), reverse=True)

    allocated_count = 0
    for s in sorted_subjects:
        p_val = max(1, s.get('priority', 1))
        count = math.floor(p_val * slots_per_point)
        allocated_count += count
        for _ in range(count):
            task_pool.append(s)

    # เติมส่วนที่เหลือ (Remainder)
    remainder = total_slots - allocated_count
    idx = 0
    while remainder > 0:
        subj = sorted_subjects[idx % len(sorted_subjects)]
        task_pool.append(subj)
        remainder -= 1
        idx += 1

    # 3. สลับลำดับใน Pool 
    random.shuffle(task_pool)

    # 4. หยอดลงตาราง (Distribution)
    final_schedule = []
    last_subject_name = None

    for i in range(total_slots):
        if not task_pool:
            # กรณีเหลือ Slot ว่าง
            final_schedule.append({
                **study_slots[i],
                'subject': 'Free Slot',
                'status': 'pending',
                'slot_id': f"slot_{secrets.token_hex(8)}"
            })
            continue

        # Anti-clustering logic
        selected_idx = 0
        if len(task_pool) > 1 and task_pool[0]['name'] == last_subject_name:
            for k in range(1, min(5, len(task_pool))): 
                if task_pool[k]['name'] != last_subject_name:
                    selected_idx = k
                    break
        
        selected_task = task_pool.pop(selected_idx)
        last_subject_name = selected_task['name']

        final_schedule.append({
            **study_slots[i], 
            'subject': selected_task['name'],
            'color': selected_task.get('color', '#EF4444'), 
            'status': 'pending',
            'slot_id': f"slot_{secrets.token_hex(8)}"
        })

    return final_schedule

# --- 4. Routes ---

@calender_bp.route("/api/schedule", methods=["GET"])
def get_all_schedule():
    if "user_id" not in session: return jsonify({"message": "Unauthorized"}), 401
    try:
        user_id = ObjectId(session["user_id"])
        
        sessions = list(study_sessions_collection.find({"user_id": user_id}))
        
        for s in sessions:
            s["_id"] = str(s["_id"])
            s["exam_id"] = str(s["exam_id"])
            s["user_id"] = str(s["user_id"])
            
        return jsonify(sessions), 200
    except Exception as e:
        return jsonify({"message": "Error fetching schedule", "error": str(e)}), 500

@calender_bp.route("/api/subjects/", methods=["GET"])
def get_user_subjects():
    if "user_id" not in session: return jsonify({"message": "Unauthorized"}), 401
    try:
        user_id = ObjectId(session["user_id"])
        cursor = subjects_collection.find({"user_id": user_id})
        subjects_list = []
        
        for doc in cursor:
            # [FIX] แปลงวันที่เป็น String เพื่อป้องกัน Error หน้าขาว
            exam_date_str = "-"
            if "exam_date" in doc and doc["exam_date"]:
                if isinstance(doc["exam_date"], (datetime, date)):
                    exam_date_str = doc["exam_date"].strftime("%Y-%m-%d")
                elif isinstance(doc["exam_date"], str):
                    exam_date_str = doc["exam_date"]
                else:
                    exam_date_str = str(doc["exam_date"])

            subjects_list.append({
                "_id": str(doc["_id"]), 
                "title": doc.get("title", "No Title"), 
                "priority": doc.get("priority", 1),
                "color": doc.get("color", "#3B82F6"),
                "exam_date": exam_date_str, # ส่งค่าที่แปลงแล้ว
                "topics": doc.get("topics", [])
            })
            
        return jsonify(subjects_list), 200
    except Exception as e:
        return jsonify({"message": "Error", "error": str(e)}), 500

@calender_bp.route("/api/exam-plan/", methods=["POST"])
def add_exam_plan():
    if "user_id" not in session: return jsonify({"message": "Unauthorized"}), 401
    try:
        data = request.json
        required_fields = ["examTitle", "examDate", "studyPlan", "examSubjects"]
        if not all(field in data for field in required_fields):
             return jsonify({"message": "ข้อมูลไม่ครบถ้วน"}), 400

        study_plan_slots_raw = data["studyPlan"] 
        available_time_slots = [] 
        slot_duration = 60 

        for day in study_plan_slots_raw:
            current_slot_start = time_to_minutes(day['startTime'])
            day_end = time_to_minutes(day['endTime'])
            while current_slot_start < day_end and (current_slot_start + slot_duration) <= day_end:
                available_time_slots.append({
                    'date': day['date'], 
                    'startTime': minutes_to_time(current_slot_start),
                    'endTime': minutes_to_time(current_slot_start + slot_duration),
                })
                current_slot_start += slot_duration
        
        if not available_time_slots:
             return jsonify({"message": "เวลาไม่พอสำหรับอ่านหนังสือ"}), 400

        exam_subjects = data["examSubjects"]
        scheduled_plan = generate_weighted_schedule(exam_subjects, available_time_slots)
        
        user_id = session["user_id"]
        new_plan = {
            "user_id": ObjectId(user_id),
            "exam_title": data["examTitle"],
            "subjects": exam_subjects, 
            "exam_date": data["examDate"],
            "study_plan_raw": study_plan_slots_raw,
            "createdAt": datetime.now(THAI_TZ), # ใช้เวลาไทย
            "status": "active"
        }
        plan_result = exam_plans_collection.insert_one(new_plan)
        plan_id = plan_result.inserted_id

        sessions_to_insert = []
        for slot in scheduled_plan:
            slot["exam_id"] = plan_id
            slot["user_id"] = ObjectId(user_id)
            sessions_to_insert.append(slot)

        if sessions_to_insert:
            study_sessions_collection.insert_many(sessions_to_insert)

        return jsonify({
            "message": "บันทึกแผนเรียบร้อย",
            "plan_id": str(plan_id),
            "generatedSchedule": scheduled_plan 
        }), 201

    except Exception as e:
        print(f"[ERROR] add_exam_plan: {e}")
        return jsonify({"message": "Error creating plan", "error": str(e)}), 500

@calender_bp.route("/api/exam-plans/", methods=["GET"])
def get_exam_plans():
    if "user_id" not in session: return jsonify({"message": "Unauthorized"}), 401
    try:
        user_id = ObjectId(session["user_id"])
        plans = list(exam_plans_collection.find({"user_id": user_id}).sort("createdAt", -1))
        
        for plan in plans:
            plan["_id"] = str(plan["_id"])
            plan["user_id"] = str(plan["user_id"])
            
            # [FIX] แปลงวันที่ exam_date ใน List แผน
            if "exam_date" in plan and plan["exam_date"]:
                if isinstance(plan["exam_date"], (datetime, date)):
                    plan["exam_date"] = plan["exam_date"].strftime("%Y-%m-%d")
                else:
                    plan["exam_date"] = str(plan["exam_date"])

        return jsonify(plans), 200
    except Exception as e:
        return jsonify({"message": "Error", "error": str(e)}), 500

@calender_bp.route("/api/exam-plan/<plan_id>", methods=["GET"])
def get_single_exam_plan(plan_id):
    if "user_id" not in session: return jsonify({"message": "Unauthorized"}), 401
    try:
        user_id = ObjectId(session["user_id"])
        plan_oid = ObjectId(plan_id)

        plan = exam_plans_collection.find_one({"_id": plan_oid, "user_id": user_id})
        if not plan: return jsonify({"message": "Not found"}), 404

        # [FIX] แปลงวันที่ในรายละเอียดแผน
        if "exam_date" in plan and plan["exam_date"]:
             if isinstance(plan["exam_date"], (datetime, date)):
                plan["exam_date"] = plan["exam_date"].strftime("%Y-%m-%d")
             else:
                plan["exam_date"] = str(plan["exam_date"])

        sessions = list(study_sessions_collection.find({"exam_id": plan_oid}).sort([("date", 1), ("startTime", 1)]))
        
        for s in sessions:
            s["_id"] = str(s["_id"])
            del s["exam_id"]
            del s["user_id"]

        plan["_id"] = str(plan["_id"])
        plan["user_id"] = str(plan["user_id"])
        
        plan["generated_schedule"] = sessions
        plan["study_plan"] = sessions 

        return jsonify(plan), 200
    except InvalidId:
        return jsonify({"message": "Invalid ID"}), 400
    except Exception as e:
        return jsonify({"message": "Error", "error": str(e)}), 500

@calender_bp.route("/api/exam-plan/<plan_id>/progress", methods=["PUT", "OPTIONS"])
def update_plan_progress(plan_id):
    if request.method == 'OPTIONS': return make_response(jsonify({"message": "OK"}), 200)
    if "user_id" not in session: return jsonify({"message": "Unauthorized"}), 401
    
    try:
        user_id = ObjectId(session["user_id"])
        data = request.json
        updated_items = data.get('chapters') 
        
        if not updated_items: return jsonify({"message": "No data"}), 400

        count = 0
        for item in updated_items:
            slot_id = item.get('slot_id')
            new_status = item.get('status')
            
            if slot_id and new_status:
                result = study_sessions_collection.update_one(
                    {"slot_id": slot_id, "user_id": user_id},
                    {"$set": {"status": new_status}}
                )
                if result.matched_count > 0: count += 1

        return jsonify({"message": f"Updated {count} slots"}), 200

    except Exception as e:
        print(f"[ERROR] update_plan_progress: {e}")
        return jsonify({"message": "Error updating progress"}), 500

# [FIX] Reschedule Logic ที่ถูกต้อง (แก้จากอันเดิมที่ผิด)
@calender_bp.route("/api/exam-plan/<plan_id>/reschedule", methods=["POST", "OPTIONS"])
def reschedule_plan(plan_id):
    if request.method == 'OPTIONS': return make_response(jsonify({"message": "OK"}), 200)
    if "user_id" not in session: return jsonify({"message": "Unauthorized"}), 401

    try:
        user_id = ObjectId(session["user_id"])
        plan_oid = ObjectId(plan_id)
        # ดึงวันที่จาก frontend (คาดว่าเป็น ISO format)
        date_to_postpone_str = request.json.get('date').split('T')[0] 

        # 1. ค้นหาแผน
        plan = exam_plans_collection.find_one({"_id": plan_oid, "user_id": user_id})
        if not plan: return jsonify({"message": "Not found"}), 404

        # 2. ค้นหา Slots ในอนาคตที่ยัง Status='pending' (ยังไม่ได้ทำ)
        query = {
            "exam_id": plan_oid,
            "status": "pending",
            "date": {"$gte": date_to_postpone_str} 
        }
        
        affected_sessions = list(study_sessions_collection.find(query))
        
        if not affected_sessions:
            return jsonify({"message": "ไม่มีตารางที่ต้องเลื่อนในช่วงเวลานี้"}), 200

        # 3. [สำคัญ] นับจำนวนวิชาที่เหลืออยู่จริงใน Slots เหล่านั้น
        # เราจะไม่ Generate ใหม่จากศูนย์ แต่จะเอาของที่มีอยู่มาเกลี่ยใหม่
        pending_subjects = [s['subject'] for s in affected_sessions if s['subject'] != 'Free Slot']
        
        # ดึงข้อมูลสีและ Priority เดิมจาก Plan หลักเพื่อมาสร้าง Object สำหรับ Algorithm
        original_subjects_info = {s['name']: s for s in plan.get('subjects', [])}
        
        # สร้าง List วิชาสำหรับส่งเข้า Algorithm โดยอิงตามจำนวนที่เหลือจริง
        subject_counts = Counter(pending_subjects)

        task_pool = []
        for subj_name, count in subject_counts.items():
            info = original_subjects_info.get(subj_name, {'name': subj_name, 'color': '#EF4444', 'priority': 1})
            for _ in range(count):
                task_pool.append(info)
        
        # 4. เตรียม Slots เปล่า (Recycle เวลาเดิม)
        slots_for_algo = []
        for s in affected_sessions:
            slots_for_algo.append({
                "date": s["date"],
                "startTime": s["startTime"],
                "endTime": s["endTime"]
            })
            
        # 5. ทำการ Shuffle และ Assign ลง Slot (Logic คล้าย generate_weighted_schedule แต่ข้ามการคำนวณจำนวน)
        random.shuffle(task_pool)
        
        new_schedule = []
        last_subject_name = None
        
        for i in range(len(slots_for_algo)):
            if not task_pool:
                # ถ้าวิชาหมด แต่เวลายังเหลือ (เป็น Free Slot)
                new_schedule.append({
                    **slots_for_algo[i],
                    'subject': 'Free Slot',
                    'status': 'pending',
                    'slot_id': f"slot_{secrets.token_hex(8)}"
                })
                continue
                
            # Anti-clustering logic อย่างง่าย
            selected_idx = 0
            if len(task_pool) > 1 and task_pool[0]['name'] == last_subject_name:
                 for k in range(1, min(5, len(task_pool))):
                     if task_pool[k]['name'] != last_subject_name:
                         selected_idx = k
                         break
            
            selected_task = task_pool.pop(selected_idx)
            last_subject_name = selected_task['name']
            
            new_schedule.append({
                **slots_for_algo[i],
                'subject': selected_task['name'],
                'color': selected_task.get('color', '#EF4444'),
                'status': 'pending',
                'slot_id': f"slot_{secrets.token_hex(8)}"
            })

        # 6. ลบอันเก่า และ บันทึกอันใหม่
        delete_ids = [s["_id"] for s in affected_sessions]
        if delete_ids:
            study_sessions_collection.delete_many({"_id": {"$in": delete_ids}})

        for slot in new_schedule:
            slot["exam_id"] = plan_oid
            slot["user_id"] = user_id
        
        if new_schedule:
            study_sessions_collection.insert_many(new_schedule)

        return jsonify({
            "message": "Reschedule successful",
            "rescheduled_count": len(new_schedule)
        }), 200

    except Exception as e:
        print(f"[ERROR] reschedule: {e}")
        print(traceback.format_exc())
        return jsonify({"message": "Error rescheduling", "error": str(e)}), 500