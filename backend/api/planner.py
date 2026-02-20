from flask import Blueprint, jsonify, session, request, make_response
from flask_cors import CORS
from pymongo import MongoClient
from bson.objectid import ObjectId
from datetime import datetime, timedelta
import os
import math
import uuid
import random 
from collections import Counter
import traceback
import pytz 


planner_bp = Blueprint("planner_bp", __name__)

CORS(planner_bp, supports_credentials=True, methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"])


client = MongoClient(os.getenv("MONGODB_URI", "mongodb://localhost:27017/"))
db = client["mydatabase"] 

subjects_collection = db["subject"]
exam_plans_collection = db["exam_plans"]
study_sessions_collection = db["study_sessions"]
fixed_schedules_collection = db["fixed_schedules"]


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

def is_time_overlap(start1, end1, start2, end2):

    return max(start1, start2) < min(end1, end2)

#Algorithm จัดตาราง 
def generate_weighted_schedule(subjects, study_slots):

    if not subjects or not study_slots:
        return []

    total_priority = sum(s.get('priority', 1) for s in subjects)
    if total_priority == 0:
        return [
            {**slot, 'subject': 'Free Slot', 'status': 'pending', 'slot_id': str(uuid.uuid4())}
            for slot in study_slots
        ]

    total_slots = len(study_slots)
    slots_per_point = total_slots / total_priority
    
    task_pool = []
    allocated_count = 0
    

    
    # เติม Pool ตามน้ำหนัก Priority
    for s in subjects:
        count = math.floor(s['priority'] * slots_per_point)
        allocated_count += count
        for _ in range(count):
            task_pool.append(s)

    # เติมเศษที่เหลือ
    remainder = total_slots - allocated_count
    sorted_subjects = sorted(subjects, key=lambda s: s['priority'], reverse=True)
    
    idx = 0
    while remainder > 0:
        subj = sorted_subjects[idx % len(sorted_subjects)]
        task_pool.append(subj)
        remainder -= 1
        idx += 1

    # สลับลำดับใน Pool เพื่อความหลากหลาย
    random.shuffle(task_pool)

    final_schedule = []
    last_subject_name = None

    # หยอดลง Slot 
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



@planner_bp.route("/api/settings/fixed-schedule", methods=["POST", "GET"])
def handle_fixed_schedule():
    if "user_id" not in session:
        return jsonify({"message": "Unauthorized"}), 401
    
    user_id = ObjectId(session["user_id"])

    if request.method == "POST":
        try:
            schedules = request.json.get("schedules", [])
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
        
        # แปลง ObjectId และ Date ให้เป็น String เพื่อส่งกลับ JSON
        for s in sessions:
            s["_id"] = str(s["_id"])
            s["exam_id"] = str(s["exam_id"])
            s["user_id"] = str(s["user_id"])
            
            if "date" in s:
                if isinstance(s["date"], (datetime)):
                    s["date"] = s["date"].strftime("%Y-%m-%d")
                else:
                    s["date"] = str(s["date"]).split("T")[0]
            
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

        exam_date_raw = data["examDate"]
        exam_date_str = exam_date_raw.split("T")[0].strip()
        print(f"[DEBUG] Exam Date Target: {exam_date_str}")

        # ดึง Fixed Schedule มาเพื่อตรวจสอบเวลาว่าง
        user_fixed_schedules = list(fixed_schedules_collection.find({"user_id": user_id}))
        fixed_map = {}
        for fs in user_fixed_schedules:
            day_name = fs.get('day')
            s_min = time_to_minutes(fs.get('startTime'))
            e_min = time_to_minutes(fs.get('endTime'))
            if day_name not in fixed_map:
                fixed_map[day_name] = []
            fixed_map[day_name].append((s_min, e_min))

        raw_study_plan = data["studyPlan"]
        available_time_slots = []
        slot_duration = 60 # กำหนดความยาวต่อคาบ (นาที)

        for day in raw_study_plan:
            day_date_str = day['date'].split("T")[0].strip()
            
            # กรองวันสอบออก (ไม่ให้อ่านหนังสือในวันสอบ)
            if day_date_str == exam_date_str:
                print(f"[FILTER] Skipping exam date overlap: {day_date_str}")
                continue
                                 
            current_date_obj = datetime.strptime(day_date_str, "%Y-%m-%d")
            day_of_week = current_date_obj.strftime("%A")

            start_min = time_to_minutes(day['startTime'])
            end_min = time_to_minutes(day['endTime'])
            
            current_time = start_min
            # แบ่งเวลาเป็น Slot ย่อยๆ
            while current_time + slot_duration <= end_min:
                slot_start = current_time
                slot_end = current_time + slot_duration
                
                # Check Fixed Schedule (เช็คว่าชนกับเวลาเรียนปกติไหม)
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

        # บันทึกแผนแม่บท
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

        # บันทึกรายวิชาย่อย (Sessions)
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
            
            # Format Date
            if "date" in sess:
                if isinstance(sess["date"], datetime):
                    sess["date"] = sess["date"].strftime("%Y-%m-%d")
                else:
                    sess["date"] = str(sess["date"]).split("T")[0]
            
            study_plan.append(sess)

        plan["_id"] = str(plan["_id"])
        plan["user_id"] = str(plan["user_id"])
        
        if "exam_date" in plan and plan["exam_date"]:
            if isinstance(plan["exam_date"], datetime):
                plan["exam_date"] = plan["exam_date"].strftime("%Y-%m-%d")
        
        plan["study_plan"] = study_plan
        
        return jsonify(plan), 200

    except Exception as e:
        return jsonify({"message": "Error", "error": str(e)}), 500

@planner_bp.route("/api/exam-plan/<plan_id>/progress", methods=["PUT"])
def update_progress(plan_id):
    """
    API สำหรับบันทึก Progress (CheckBox)
    """
    if "user_id" not in session:
        return jsonify({"message": "Unauthorized"}), 401

    try:
        data = request.json
        chapters = data.get("chapters", [])
        
        for ch in chapters:
            if "slot_id" in ch and "status" in ch:
                study_sessions_collection.update_one(
                    {"slot_id": ch["slot_id"], "user_id": ObjectId(session["user_id"])},
                    {"$set": {"status": ch["status"]}}
                )
        
        return jsonify({"message": "Progress updated"}), 200
    except Exception as e:
        return jsonify({"message": "Error", "error": str(e)}), 500


@planner_bp.route("/api/exam-plan/<plan_id>/reschedule", methods=["POST", "OPTIONS"])
def reschedule_plan(plan_id):
    """
    API สำหรับเลื่อนตาราง (Reschedule)
    หลักการ: เลื่อนงานที่ค้างตั้งแต่วันที่ระบุ +1 วันไปเรื่อยๆ (Shift Right)
    """
    if request.method == 'OPTIONS': 
        return make_response(jsonify({"message": "OK"}), 200)
    
    if "user_id" not in session: 
        return jsonify({"message": "Unauthorized"}), 401

    try:
        user_id = ObjectId(session["user_id"])
        plan_oid = ObjectId(plan_id)
        
        # รับวันที่ต้องการเลื่อน
        raw_date = request.json.get("date")
        postpone_date_str = str(raw_date).split('T')[0]
        
        # สร้างตัวแปร datetime ไว้เผื่อ Database เก็บเป็น Date Object
        try:
            postpone_date_dt = datetime.strptime(postpone_date_str, "%Y-%m-%d")
        except:
            postpone_date_dt = datetime.now()

        print(f"[RESCHEDULE] Triggered for date: {postpone_date_str}")

        # ค้นหาตารางที่ยังไม่เสร็จ (pending) ตั้งแต่วันนั้นเป็นต้นไป
        query = {
            "exam_id": plan_oid,
            "status": "pending",
            "$or": [
                {"date": {"$gte": postpone_date_str}},       
                {"date": {"$gte": postpone_date_dt}}          
            ]
        }
        
        affected_sessions = list(
            study_sessions_collection.find(query).sort([("date", 1), ("startTime", 1)])
        )
        
        if not affected_sessions:
            return jsonify({
                "message": "ไม่พบตารางที่ต้องเลื่อน (อาจจะเสร็จหมดแล้ว หรือวันที่ไม่ตรง)",
                "rescheduled_count": 0
            }), 200

        # จัดกลุ่มตามวันที่เดิม (เพื่อ Shift ไปทีละวัน)
        date_groups = {}
        for sess in affected_sessions:
            raw_s_date = sess.get("date")
            s_date_str = ""
            
            if isinstance(raw_s_date, str):
                s_date_str = raw_s_date.split('T')[0]
            elif isinstance(raw_s_date, datetime):
                s_date_str = raw_s_date.strftime("%Y-%m-%d")
            
            if s_date_str:
                if s_date_str not in date_groups:
                    date_groups[s_date_str] = []
                date_groups[s_date_str].append(sess)
        
        sorted_dates = sorted(date_groups.keys())
        
        # สร้างรายการใหม่ (เลื่อนวัน +1)
        new_sessions_to_insert = []
        
        for original_date_str in sorted_dates:
            sessions_on_date = date_groups[original_date_str]
            
            try:
                original_date_obj = datetime.strptime(original_date_str, "%Y-%m-%d")
                new_date_obj = original_date_obj + timedelta(days=1)
                new_date_str = new_date_obj.strftime("%Y-%m-%d") 
            except Exception as e:
                continue

            for sess in sessions_on_date:
                # สร้าง Object ใหม่
                new_sess = {
                    "exam_id": plan_oid,
                    "user_id": user_id,
                    "subject": sess.get("subject", "Free Slot"),
                    "date": new_date_str,          
                    "startTime": sess["startTime"],
                    "endTime": sess["endTime"],
                    "status": "postponed",         
                    "status": "pending", 
                    "isExam": sess.get("isExam", False),
                    "color": sess.get("color", "#3B82F6"),
                    "slot_id": str(uuid.uuid4())   
                }
                new_sessions_to_insert.append(new_sess)

        # ลบตารางเก่าทิ้ง
        delete_ids = [s["_id"] for s in affected_sessions]
        if delete_ids:
            study_sessions_collection.delete_many({"_id": {"$in": delete_ids}})

        # บันทึกตารางใหม่
        if new_sessions_to_insert:
            study_sessions_collection.insert_many(new_sessions_to_insert)
            
            

        return jsonify({
            "message": f"เลื่อนตารางสำเร็จ! ({len(new_sessions_to_insert)} รายการ)",
            "rescheduled_count": len(new_sessions_to_insert)
        }), 200

    except Exception as e:
        print(f"[ERROR] Reschedule failed: {e}")
        print(traceback.format_exc())
        return jsonify({
            "message": "เกิดข้อผิดพลาดในการเลื่อนตาราง",
            "error": str(e)
        }), 500