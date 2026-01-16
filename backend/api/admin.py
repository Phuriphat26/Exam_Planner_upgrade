from flask import Blueprint, jsonify, session
from pymongo import MongoClient
from bson import ObjectId
from datetime import datetime

# --- ตั้งค่า DB (ต้องเหมือนกับไฟล์อื่น) ---
client = MongoClient('mongodb://localhost:27017/')
db = client['mydatabase'] # ‼️ ตรวจสอบชื่อ DB ของคุณ
users_collection = db['users']
subjects_collection = db['subject']
exam_plans_collection = db['exam_plans']
study_sessions_collection = db['study_sessions']
admin_summary_log_collection = db['admin_summary_log'] # "ตารางที่ 5"
# ----------------------------------------------

admin_bp = Blueprint('admin', __name__, url_prefix='/admin')

# --- Helper: ตรวจสอบสิทธิ์ Admin ---
# เราจะใช้ @admin_required ก่อนทุก route ที่ Admin เท่านั้นที่เรียกได้
from functools import wraps

def admin_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'role' not in session or session['role'] != 'admin':
            return jsonify({'message': 'คุณไม่มีสิทธิ์เข้าถึงส่วนนี้'}), 403
        return f(*args, **kwargs)
    return decorated_function
# ------------------------------------


@admin_bp.route('/summary', methods=['GET'])
@admin_required # ⭐️ ตรวจสอบสิทธิ์ Admin ก่อน
def get_summary():
    """
    API สำหรับดึงข้อมูลสรุป 2 ส่วน: Live Stats และ Log History
    """
    try:
        # 1. ดึงสถิติ ณ ปัจจุบัน (Live Stats)
        live_stats = {
            "total_users": users_collection.count_documents({"role": "user"}),
            "total_admins": users_collection.count_documents({"role": "admin"}),
            "total_plans": exam_plans_collection.count_documents({}),
            "total_subjects": subjects_collection.count_documents({})
        }
        
        # 2. ดึงประวัติ (Log History) จาก "ตารางที่ 5"
        # เราจะใช้ Aggregation $lookup เพื่อ "Join" กับ Users เพื่อดึงชื่อ Admin
        pipeline = [
            { '$sort': { 'log_timestamp': -1 } }, # เรียงจากใหม่ไปเก่า
            {
                '$lookup': {
                    'from': 'users',             # Join กับ collection 'users'
                    'localField': 'user_id',       # Key ของ admin_summary_log
                    'foreignField': '_id',         # Key ของ users
                    'as': 'admin_info'           # ผลลัพธ์
                }
            },
            {
                '$unwind': { # คลาย Array ที่ได้จาก $lookup
                    'path': '$admin_info',
                    'preserveNullAndEmptyArrays': True # เก็บ Log ไว้แม้ Admin จะถูกลบไปแล้ว
                } 
            },
            {
                '$project': { # เลือก field ที่จะส่งกลับ
                    '_id': { '$toString': '$_id' }, # แปลง ObjectId เป็น String
                    'log_timestamp': { '$dateToString': { 'format': '%Y-%m-%dT%H:%M:%S.%LZ', 'date': '$log_timestamp' } },
                    'total_users': 1,
                    'total_plans': 1,
                    'total_subjects': 1,
                    'total_admins': 1,
                    'admin_username': '$admin_info.username' # ดึง username มาจากข้อมูลที่ Join
                }
            }
        ]
        
        log_history = list(admin_summary_log_collection.aggregate(pipeline))
        
        return jsonify({
            'live_stats': live_stats,
            'log_history': log_history
        })

    except Exception as e:
        return jsonify({'message': str(e)}), 500


@admin_bp.route('/create_summary', methods=['POST'])
@admin_required # ⭐️ ตรวจสอบสิทธิ์ Admin ก่อน
def create_summary():
    """
    API สำหรับ "กดปุ่มสรุป"
    (นี่คือ Logic ที่เราคุยกัน: INSERT ... SELECT)
    """
    try:
        admin_user_id = session.get('user_id')
        
        # 1. คำนวณ (SELECT)
        stats = {
            "total_users": users_collection.count_documents({"role": "user"}),
            "total_admins": users_collection.count_documents({"role": "admin"}),
            "total_plans": exam_plans_collection.count_documents({}),
            "total_subjects": subjects_collection.count_documents({}),
            "total_generated_sessions": study_sessions_collection.count_documents({}) # อันนี้คือโบนัส
        }
        
        # 2. บันทึก (INSERT) ลงใน "ตารางที่ 5"
        log_entry = {
            "log_timestamp": datetime.now(),
            "user_id": ObjectId(admin_user_id),
            "total_users": stats["total_users"],
            "total_admins": stats["total_admins"],
            "total_plans": stats["total_plans"],
            "total_subjects": stats["total_subjects"],
            "total_generated_sessions": stats["total_generated_sessions"]
        }
        
        admin_summary_log_collection.insert_one(log_entry)
        
        return jsonify({'success': True, 'message': 'สร้างรายงานสรุปผลสำเร็จ'}), 201

    except Exception as e:
        return jsonify({'message': str(e)}), 500