from flask import Flask, session, jsonify
from flask_cors import CORS
from api.signup import register_bp
from api.login import login_bp
import os

# --- 1. Import ของใหม่ (จากไฟล์ที่เราเพิ่งสร้าง) ---
from api.scheduler_jobs import check_and_send_notifications
# --- (Import ของเดิม) ---
from apscheduler.schedulers.background import BackgroundScheduler
import atexit 

from datetime import datetime
from bson.objectid import ObjectId 
from flask_pymongo import PyMongo
from api.planner import planner_bp
from api.profile import profile_bp
from api.subject import subject_bp
from api.calender import calender_bp
from api.home import home_bp
from api.time import api_bp
from api.admin import admin_bp
# (Import 'mail' และ 'send_notification_email' จาก email_service)
from api.email_service import mail, send_notification_email
from api.tasks import tasks_bp

app = Flask(__name__)
app.secret_key = 'your_secret_key'
from dotenv import load_dotenv 

load_dotenv()
CORS(app, supports_credentials=True, origins=['http://localhost:5173'], methods=["GET", "POST", "PUT", "DELETE"])

# (ข้อมูลเทสของคุณ - ไม่ได้แก้ไข)
study_plan_data = [
    { "date": "2025-11-29", "startTime": "09:00", "endTime": "17:00", "subject": "คณิต" },
    { "date": "2025-11-30", "startTime": "09:00", "endTime": "17:00", "subject": "วิทย์" }
]
@app.route('/api/study_plan', methods=['GET'])
def get_study_plan():
    return jsonify(study_plan_data)

# (Blueprints - ไม่ได้แก้ไข)
app.register_blueprint(register_bp)
app.register_blueprint(login_bp)
app.register_blueprint(planner_bp)
app.register_blueprint(profile_bp)
app.register_blueprint(subject_bp)
app.register_blueprint(calender_bp)
app.register_blueprint(home_bp)
app.register_blueprint(api_bp)
app.register_blueprint(admin_bp)
app.register_blueprint(tasks_bp)
# -----------------------------------------------------------------------------
# 1. SETUP FLASK-MAIL (ไม่ได้แก้ไข)
# -----------------------------------------------------------------------------
app.config['MAIL_SERVER'] = 'smtp.gmail.com'
app.config['MAIL_PORT'] = 587
app.config['MAIL_USE_TLS'] = True
app.config['MAIL_USE_SSL'] = False
app.config['MAIL_DEBUG'] = True 

app.config['MAIL_USERNAME'] = os.getenv('MAIL_USERNAME')
app.config['MAIL_PASSWORD'] = os.getenv('MAIL_PASSWORD')
app.config['MAIL_DEFAULT_SENDER'] = os.getenv('MAIL_USERNAME')
mail.init_app(app) # (ผูก Mail กับ App ที่นี่ที่เดียว)

# -----------------------------------------------------------------------------
# (Endpoint เทสเมล - ไม่ได้แก้ไข)
@app.route("/test-email")
def test_email():
    try:
        with app.app_context():
            send_notification_email(
                subject="Test ส่งจริง",
                recipient_email="puripay2647@gmail.com" 
            )
        return jsonify({"message": "ส่งอีเมลเทสสำเร็จ!"}), 200
    except Exception as e:
        return jsonify({"message": f"เกิดข้อผิดพลาด: {str(e)}"}), 500
# -----------------------------------------------------------------------------
# (Mongo - ไม่ได้แก้ไข)
app.config["MONGO_URI"] = "mongodb://localhost:27017/mydatabase" 
mongo = PyMongo(app)
print("Connected to MongoDB at mongodb://localhost:27017/mydatabase")

# (!!) ลบบรรทัด 'mail.init_app(app)' ที่ซ้ำซ้อนตรงนี้ออก (ถ้ามี)


# -----------------------------------------------------------------------------
# 2. (เพิ่ม!) SETUP SCHEDULER
# -----------------------------------------------------------------------------
scheduler = BackgroundScheduler(daemon=True)

# สั่งให้ "ปลุก" ฟังก์ชัน check_and_send_notifications
scheduler.add_job(
    check_and_send_notifications,
    trigger='interval',
    minutes=1, # (ปลุกทุก 1 นาที - สำหรับเทส)
    args=[app] # (ส่ง app เข้าไปใน Job)
)
scheduler.start()

# สั่งให้ปิด Scheduler เมื่อเราปิด Flask App
atexit.register(lambda: scheduler.shutdown())
print("Scheduler started... checking every 1 minute.")
# -----------------------------------------------------------------------------


if __name__ == "__main__":
    # 3. (สำคัญ!) แก้ไข 'app.run'
    # เพิ่ม 'use_reloader=False' เพื่อป้องกัน Scheduler ทำงาน 2 รอบ
    app.run(port=5000, debug=True, use_reloader=False)