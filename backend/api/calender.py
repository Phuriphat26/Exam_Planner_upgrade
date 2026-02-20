from flask import Flask, request, jsonify, Blueprint, session, make_response
from flask_cors import CORS
import secrets 
import math
import random 
import uuid
from pymongo import MongoClient
from bson.objectid import ObjectId
from bson.errors import InvalidId
from datetime import datetime, date, timedelta
from collections import Counter 
import pytz
import traceback

calender_bp = Blueprint('calender', __name__, url_prefix='/calender')
CORS(calender_bp, supports_credentials=True, origins=["http://localhost:5173"])

client = MongoClient('mongodb://localhost:27017/')
db = client['mydatabase']

subjects_collection = db["subject"]
exam_plans_collection = db["exam_plans"]      
study_sessions_collection = db["study_sessions"] 

# ตั้งค่า Timezone
THAI_TZ = pytz.timezone('Asia/Bangkok')


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

# Algorithm จัดตาราง
def generate_weighted_schedule(subjects, study_slots):
    if not subjects or not study_slots:
        return []

    total_priority = sum(max(1, s.get('priority', 1)) for s in subjects) 
    
    if total_priority == 0: 
        return [{**slot, 'subject': 'Free Slot', 'slot_id': f"slot_{secrets.token_hex(8)}", 'status': 'pending'} for slot in study_slots]

    total_slots = len(study_slots)
    slots_per_point = total_slots / total_priority
    
    task_pool = []
    sorted_subjects = sorted(subjects, key=lambda s: s.get('priority', 1), reverse=True)

    allocated_count = 0
    for s in sorted_subjects:
        p_val = max(1, s.get('priority', 1))
        count = math.floor(p_val * slots_per_point)
        allocated_count += count
        for _ in range(count):
            task_pool.append(s)

    remainder = total_slots - allocated_count
    idx = 0
    while remainder > 0:
        subj = sorted_subjects[idx % len(sorted_subjects)]
        task_pool.append(subj)
        remainder -= 1
        idx += 1

    random.shuffle(task_pool)

    final_schedule = []
    last_subject_name = None

    for i in range(total_slots):
        if not task_pool:
            final_schedule.append({
                **study_slots[i],
                'subject': 'Free Slot',
                'status': 'pending',
                'slot_id': f"slot_{secrets.token_hex(8)}"
            })
            continue

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
            
            if "date" in s:
                if isinstance(s["date"], (datetime, date)):
                    s["date"] = s["date"].strftime("%Y-%m-%d")
                else:
                    s["date"] = str(s["date"]).split("T")[0]

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
            exam_date_str = "-"
            if "exam_date" in doc and doc["exam_date"]:
                if isinstance(doc["exam_date"], (datetime, date)):
                    exam_date_str = doc["exam_date"].strftime("%Y-%m-%d")
                else:
                    exam_date_str = str(doc["exam_date"])

            subjects_list.append({
                "_id": str(doc["_id"]), 
                "title": doc.get("title", "No Title"), 
                "priority": doc.get("priority", 1),
                "color": doc.get("color", "#3B82F6"),
                "exam_date": exam_date_str,
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
            "createdAt": datetime.now(THAI_TZ),
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

@calender_bp.route("/api/exam-plan/<plan_id>/reschedule", methods=["POST", "OPTIONS"])
def reschedule_plan(plan_id):
    if request.method == 'OPTIONS': return make_response(jsonify({"message": "OK"}), 200)
    if "user_id" not in session: return jsonify({"message": "Unauthorized"}), 401

    try:
        user_id = ObjectId(session["user_id"])
        plan_oid = ObjectId(plan_id)
        
        raw_date = request.json.get("date")
        postpone_date_str = str(raw_date).split('T')[0].strip()
        
        try: postpone_date_dt = datetime.strptime(postpone_date_str, "%Y-%m-%d")
        except: postpone_date_dt = datetime.now()


        query = {
            "exam_id": plan_oid,
            "status": "pending",
            "$or": [
                {"date": {"$gte": postpone_date_str}},
                {"date": {"$gte": postpone_date_dt}}
            ]
        }
        
        affected_sessions = list(study_sessions_collection.find(query).sort([("date", 1), ("startTime", 1)]))
        
        if not affected_sessions:
            return jsonify({"message": "ไม่พบตารางเรียนที่จะเลื่อน", "rescheduled_count": 0}), 200

        # เก็บวิชา
        pending_subjects = []
        for s in affected_sessions:
            if s.get('subject') not in ['Free Slot', 'เลื่อนตาราง (Rescheduled)', '⛔ เลื่อนตาราง (Rescheduled)']:
                pending_subjects.append(s['subject'])

        plan = exam_plans_collection.find_one({"_id": plan_oid})
        original_subjects_info = {s['name']: s for s in plan.get('subjects', [])}

        flat_subjects_pool = []
        for subj_name in pending_subjects:
             info = original_subjects_info.get(subj_name, {'name': subj_name, 'color': '#EF4444'})
             flat_subjects_pool.append({"name": subj_name, "color": info.get('color', '#EF4444')})
        
        random.shuffle(flat_subjects_pool)

        # สร้าง Slots ใหม่ 
        new_sessions_to_insert = []
        
        for s in affected_sessions:
            if s.get('status') == 'rescheduled': continue

            try:
                raw_d = s["date"]
                if isinstance(raw_d, str): d_obj = datetime.strptime(raw_d.split('T')[0], "%Y-%m-%d")
                elif isinstance(raw_d, datetime): d_obj = raw_d
                else: continue
            except: continue

         
            new_date_str = (d_obj + timedelta(days=1)).strftime("%Y-%m-%d")
            
            if flat_subjects_pool:
                subj = flat_subjects_pool.pop(0)
                s_name, s_color = subj['name'], subj['color']
            else:
                s_name, s_color = 'Free Slot', '#E5E7EB'

            new_sessions_to_insert.append({
                "exam_id": plan_oid, "user_id": user_id,
                "subject": s_name, "date": new_date_str,
                "startTime": s["startTime"], "endTime": s["endTime"],
                "status": "pending", "isExam": False, "color": s_color,
                "slot_id": f"slot_{secrets.token_hex(8)}"
            })

        # ลบของเก่า
        delete_ids = [s["_id"] for s in affected_sessions]
        if delete_ids:
            study_sessions_collection.delete_many({"_id": {"$in": delete_ids}})

        # ใส่ของใหม่
        if new_sessions_to_insert:
            study_sessions_collection.insert_many(new_sessions_to_insert)

        # ปักหมุดวันเลื่อน
        study_sessions_collection.delete_many({
            "exam_id": plan_oid, "date": postpone_date_str, "status": "rescheduled"
        })
        marker_session = {
            "exam_id": plan_oid, "user_id": user_id,
            "subject": "⛔ เลื่อนตาราง", 
            "date": postpone_date_str,
            "startTime": "00:00", "endTime": "23:59",
            "status": "rescheduled", 
            "isExam": False, "color": "#9CA3AF",
            "slot_id": f"marker_{secrets.token_hex(8)}"
        }
        study_sessions_collection.insert_one(marker_session)

        return jsonify({
            "message": "Reschedule successful",
            "rescheduled_count": len(new_sessions_to_insert)
        }), 200

    except Exception as e:
        print(f"[ERROR] {e}")
        print(traceback.format_exc())
        return jsonify({"message": "Error", "error": str(e)}), 500