from flask import Blueprint, jsonify, session, request
from flask_cors import CORS
from pymongo import MongoClient
from bson.objectid import ObjectId
from datetime import datetime
import os
import math
import uuid
import random 
from collections import Counter
import traceback
import pytz 

# --- Configuration ---
planner_bp = Blueprint("planner_bp", __name__)
CORS(planner_bp, supports_credentials=True, methods=["GET", "POST", "PUT", "DELETE"])

client = MongoClient(os.getenv("MONGODB_URI", "mongodb://localhost:27017/"))
db = client["mydatabase"]

subjects_collection = db["subject"]
exam_plans_collection = db["exam_plans"]
study_sessions_collection = db["study_sessions"]
# [NEW] Collection สำหรับเก็บเวลาที่ไม่ว่าง (Fixed Schedule)
fixed_schedules_collection = db["fixed_schedules"]

# ตั้งค่า Timezone ไทย
THAI_TZ = pytz.timezone('Asia/Bangkok')

# --- Helper Functions ---
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

# [NEW] ฟังก์ชันเช็คว่าเวลาชนกันไหม
def is_time_overlap(start1, end1, start2, end2):
    # Logic: max(start1, start2) < min(end1, end2) แปลว่าชนกัน
    return max(start1, start2) < min(end1, end2)

# --- Algorithm จัดตาราง (เหมือนเดิม) ---
def generate_weighted_schedule(subjects, study_slots):
    if not subjects or not study_slots:
        return []

    # 1. คำนวณ Priority รวม
    total_priority = sum(s.get('priority', 1) for s in subjects)
    if total_priority == 0:
        return [
            {**slot, 'subject': 'Free Slot', 'status': 'pending', 'slot_id': str(uuid.uuid4())}
            for slot in study_slots
        ]

    total_slots = len(study_slots)
    slots_per_point = total_slots / total_priority
    
    # 2. สร้าง Task Pool
    task_pool = []
    
    allocated_count = 0
    for s in subjects:
        count = math.floor(s['priority'] * slots_per_point)
        allocated_count += count
        for _ in range(count):
            task_pool.append(s)

    # จัดการเศษเหลือ
    remainder = total_slots - allocated_count
    sorted_subjects = sorted(subjects, key=lambda s: s['priority'], reverse=True)
    
    idx = 0
    while remainder > 0:
        subj = sorted_subjects[idx % len(sorted_subjects)]
        task_pool.append(subj)
        remainder -= 1
        idx += 1

    # 3. สุ่มลำดับ
    random.shuffle(task_pool)

    # 4. หยอดลงตาราง
    final_schedule = []
    last_subject_name = None

    for i in range(total_slots):
        if not task_pool:
            final_schedule.append({
                **study_slots[i],
                'subject': 'Free Slot',
                'status': 'pending',
                'slot_id': str(uuid.uuid4())
            })
            continue

        selected_index = -1
        for pool_idx, task in enumerate(task_pool):
            if task['name'] != last_subject_name:
                selected_index = pool_idx
                break
        
        if selected_index == -1:
            selected_index = 0

        selected_task = task_pool.pop(selected_index)
        
        final_schedule.append({
            **study_slots[i],
            'subject': selected_task['name'],
            'status': 'pending',
            'slot_id': str(uuid.uuid4()),
            'color': selected_task.get('color', '#EF4444') 
        })

        last_subject_name = selected_task['name']

    return final_schedule

# --- Routes ---

# [NEW] Route สำหรับบันทึก/แก้ไข Fixed Schedule (หน้า Setting)
@planner_bp.route("/api/settings/fixed-schedule", methods=["POST", "GET"])
def handle_fixed_schedule():
    if "user_id" not in session:
        return jsonify({"message": "Unauthorized"}), 401
    
    user_id = ObjectId(session["user_id"])

    if request.method == "POST":
        try:
            # Data format: [{"day": "Monday", "startTime": "09:00", "endTime": "12:00", "title": "Math Class"}]
            schedules = request.json.get("schedules", [])
            
            # ลบอันเก่าออกก่อน แล้วลงใหม่ (หรือจะใช้ update ก็ได้แต่แบบนี้ง่ายกว่าสำหรับ setting)
            fixed_schedules_collection.delete_many({"user_id": user_id})
            
            if schedules:
                for item in schedules:
                    item["user_id"] = user_id
                fixed_schedules_collection.insert_many(schedules)
            
            return jsonify({"message": "Saved fixed schedule successfully"}), 200
        except Exception as e:
            return jsonify({"message": "Error saving", "error": str(e)}), 500

    elif request.method == "GET":
        try:
            schedules = list(fixed_schedules_collection.find({"user_id": user_id}, {"_id": 0, "user_id": 0}))
            return jsonify(schedules), 200
        except Exception as e:
             return jsonify({"message": "Error fetching", "error": str(e)}), 500


@planner_bp.route("/api/schedule", methods=["GET"])
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

@planner_bp.route("/api/subjects/", methods=["GET"])
def get_user_subjects():
    if "user_id" not in session:
        return jsonify({"message": "กรุณา login ก่อน"}), 401
    
    try:
        user_id = ObjectId(session["user_id"])
        cursor = subjects_collection.find({"user_id": user_id})
        subjects_list = []
        
        for doc in cursor:
            final_topics = doc.get("topics", [])
            if not final_topics:
                try:
                    chapter_count = int(doc.get("subject", "0"))
                    if chapter_count > 0:
                        final_topics = [f"บทที่ {i+1}" for i in range(chapter_count)]
                except (ValueError, TypeError):
                    pass

            subjects_list.append({
                "_id": str(doc["_id"]),
                "title": doc.get("title", "ไม่มีชื่อวิชา"),
                "priority": doc.get("priority", 1),
                "topics": final_topics,
                "color": doc.get("color", "#EF4444")
            })
            
        return jsonify(subjects_list), 200
    except Exception as e:
        return jsonify({"message": "Error fetching subjects", "error": str(e)}), 500

@planner_bp.route("/api/exam-plan/", methods=["POST"])
def add_exam_plan():
    if "user_id" not in session:
        return jsonify({"message": "กรุณา login ก่อน"}), 401

    try:
        data = request.json
        user_id = ObjectId(session["user_id"])
        
        if not data.get("examSubjects") or not data.get("studyPlan"):
            return jsonify({"message": "ข้อมูลไม่ครบถ้วน"}), 400

        # --- ส่วนสำคัญ: เตรียมข้อมูลวันสอบ ---
        exam_date_raw = data["examDate"]
        exam_date_str = exam_date_raw.split("T")[0].strip()
        print(f"[DEBUG] Exam Date Target: {exam_date_str}")

        # [NEW] ดึง Fixed Schedule ของ User มาเตรียมไว้
        user_fixed_schedules = list(fixed_schedules_collection.find({"user_id": user_id}))
        # จัดกลุ่มตามวัน (Monday, Tuesday...) เพื่อให้คนหาง่ายๆ
        fixed_map = {} # {'Monday': [(start_min, end_min), ...], 'Tuesday': ...}
        for fs in user_fixed_schedules:
            day_name = fs.get('day') # e.g., "Monday"
            s_min = time_to_minutes(fs.get('startTime'))
            e_min = time_to_minutes(fs.get('endTime'))
            if day_name not in fixed_map:
                fixed_map[day_name] = []
            fixed_map[day_name].append((s_min, e_min))

        # --- ส่วนสำคัญ: วนลูปสร้าง Time Slots (พร้อมกรองวันสอบ + Fixed Schedule) ---
        raw_study_plan = data["studyPlan"]
        available_time_slots = []
        slot_duration = 60 # หน่วยเป็นนาที

        for day in raw_study_plan:
            # ดึงวันที่ของ Slot นั้นๆ
            day_date_str = day['date'].split("T")[0].strip()
            
            # [CHECK] ถ้าวันที่ตรงกับวันสอบ -> ให้ข้าม (Continue)
            if day_date_str == exam_date_str:
                print(f"[FILTER] Skipping exam date overlap: {day_date_str}")
                continue
            
            # [NEW] หาวันของสัปดาห์ (e.g., "Monday") จากวันที่
            current_date_obj = datetime.strptime(day_date_str, "%Y-%m-%d")
            day_of_week = current_date_obj.strftime("%A") # Monday, Tuesday...

            # ถ้าไม่ตรงวันสอบ ให้คำนวณแบ่งเวลาเป็นชั่วโมง
            start_min = time_to_minutes(day['startTime'])
            end_min = time_to_minutes(day['endTime'])
            
            current_time = start_min
            while current_time + slot_duration <= end_min:
                slot_start = current_time
                slot_end = current_time + slot_duration
                
                # [NEW] Check Overlap with Fixed Schedule
                is_blocked = False
                if day_of_week in fixed_map:
                    for fixed_start, fixed_end in fixed_map[day_of_week]:
                        if is_time_overlap(slot_start, slot_end, fixed_start, fixed_end):
                            is_blocked = True
                            print(f"[BLOCKED] {day_date_str} {minutes_to_time(slot_start)} blocked by Fixed Schedule")
                            break
                
                if not is_blocked:
                    available_time_slots.append({
                        'date': day_date_str,
                        'startTime': minutes_to_time(slot_start),
                        'endTime': minutes_to_time(slot_end)
                    })
                
                current_time += slot_duration

        if not available_time_slots:
             return jsonify({"message": "เวลาไม่พอสำหรับอ่านหนังสือ (ติดวันสอบ หรือติดตาราง Fixed Schedule หมด)"}), 400

        # เรียกใช้ Algorithm จัดตาราง
        exam_subjects = data["examSubjects"]
        scheduled_plan = generate_weighted_schedule(exam_subjects, available_time_slots)

        exam_doc = {
            "user_id": user_id,
            "exam_title": data["examTitle"],
            "subjects": exam_subjects,
            "exam_date": data["examDate"],
            "prep_start_date": data.get("prepStartDate"),
            "prep_end_date": data.get("prepEndDate"),
            "createdAt": datetime.now(THAI_TZ)
        }
        exam_result = exam_plans_collection.insert_one(exam_doc)
        exam_id = exam_result.inserted_id

        sessions_to_insert = []
        for slot in scheduled_plan:
            slot["exam_id"] = exam_id
            slot["user_id"] = user_id
            sessions_to_insert.append(slot)

        if sessions_to_insert:
            study_sessions_collection.insert_many(sessions_to_insert)
        
        return jsonify({"message": "บันทึกแผนสำเร็จ", "planId": str(exam_id)}), 201

    except Exception as e:
        print(f"[ERROR] add_exam_plan: {e}")
        print(traceback.format_exc())
        return jsonify({"message": "Internal Server Error", "error": str(e)}), 500

@planner_bp.route("/api/exam-plan/<string:plan_id>", methods=["GET"])
def get_exam_plan(plan_id):
    if "user_id" not in session:
        return jsonify({"message": "Unauthorized"}), 401

    try:
        user_id = ObjectId(session["user_id"])
        plan_oid = ObjectId(plan_id)

        plan = exam_plans_collection.find_one({"_id": plan_oid, "user_id": user_id})
        if not plan:
            return jsonify({"message": "Not found"}), 404

        sessions_cursor = study_sessions_collection.find(
            {"exam_id": plan_oid}
        ).sort([("date", 1), ("startTime", 1)])

        study_plan = []
        for sess in sessions_cursor:
            sess["_id"] = str(sess["_id"])
            del sess["exam_id"]
            del sess["user_id"]
            study_plan.append(sess)

        plan["_id"] = str(plan["_id"])
        plan["user_id"] = str(plan["user_id"])
        plan["study_plan"] = study_plan
        
        return jsonify(plan), 200

    except Exception as e:
        return jsonify({"message": "Error", "error": str(e)}), 500

@planner_bp.route("/api/exam-plan/<plan_id>/slot/<slot_id>", methods=["PUT"])
def update_slot_status(plan_id, slot_id):
    if "user_id" not in session:
        return jsonify({"message": "Unauthorized"}), 401

    try:
        new_status = request.json.get("status")
        
        result = study_sessions_collection.update_one(
            {"slot_id": slot_id, "user_id": ObjectId(session["user_id"])},
            {"$set": {"status": new_status}}
        )

        if result.matched_count == 0:
            return jsonify({"message": "Slot not found"}), 404

        return jsonify({"message": "Updated successfully"}), 200

    except Exception as e:
        return jsonify({"message": "Error", "error": str(e)}), 500

@planner_bp.route("/api/exam-plan/<plan_id>/reschedule", methods=["POST"])
def reschedule_plan(plan_id):
    if "user_id" not in session:
        return jsonify({"message": "Unauthorized"}), 401

    try:
        user_id = ObjectId(session["user_id"])
        plan_oid = ObjectId(plan_id)
        postpone_date = request.json.get("date")

        query = {
            "exam_id": plan_oid,
            "status": "pending",
            "date": {"$gte": postpone_date} 
        }
        
        affected_sessions = list(study_sessions_collection.find(query))
        
        if not affected_sessions:
            return jsonify({"message": "ไม่มีตารางที่ต้องเลื่อนในช่วงเวลานี้"}), 400

        pending_subjects = [s['subject'] for s in affected_sessions if s['subject'] != 'Free Slot']
        subject_counts = Counter(pending_subjects)
        
        subjects_for_algo = [{"name": k, "priority": v} for k, v in subject_counts.items()]
        
        slots_for_algo = []
        for s in affected_sessions:
            slots_for_algo.append({
                "date": s["date"],
                "startTime": s["startTime"],
                "endTime": s["endTime"]
            })
            
        new_schedule = generate_weighted_schedule(subjects_for_algo, slots_for_algo)

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
            "new_count": len(new_schedule)
        }), 200

    except Exception as e:
        print(traceback.format_exc())
        return jsonify({"message": "Error rescheduling", "error": str(e)}), 500

@planner_bp.route("/api/exam-plan/<plan_id>", methods=["DELETE"])
def delete_exam_plan(plan_id):
    if "user_id" not in session:
        return jsonify({"message": "Unauthorized"}), 401
    
    try:
        user_id = ObjectId(session["user_id"])
        plan_oid = ObjectId(plan_id)

        study_sessions_collection.delete_many({"exam_id": plan_oid, "user_id": user_id})
        result = exam_plans_collection.delete_one({"_id": plan_oid, "user_id": user_id})

        if result.deleted_count == 0:
            return jsonify({"message": "Plan not found"}), 404
            
        return jsonify({"message": "Deleted successfully"}), 200
        
    except Exception as e:
        return jsonify({"message": "Error", "error": str(e)}), 500