from flask import Flask, session, jsonify
from flask_cors import CORS
from api.signup import register_bp
from api.login import login_bp
import os


from api.scheduler_jobs import check_and_send_notifications
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
from api.email_service import mail, send_notification_email
from api.tasks import tasks_bp

app = Flask(__name__)
app.secret_key = 'your_secret_key'
from dotenv import load_dotenv 

load_dotenv()
CORS(app, supports_credentials=True, origins=['http://localhost:5173'], methods=["GET", "POST", "PUT", "DELETE"])


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

app.config['MAIL_SERVER'] = 'smtp.gmail.com'
app.config['MAIL_PORT'] = 587
app.config['MAIL_USE_TLS'] = True
app.config['MAIL_USE_SSL'] = False
app.config['MAIL_DEBUG'] = True 

app.config['MAIL_USERNAME'] = os.getenv('MAIL_USERNAME')
app.config['MAIL_PASSWORD'] = os.getenv('MAIL_PASSWORD')
app.config['MAIL_DEFAULT_SENDER'] = os.getenv('MAIL_USERNAME')
mail.init_app(app) 


app.config["MONGO_URI"] = "mongodb://localhost:27017/mydatabase" 
mongo = PyMongo(app)
print("Connected to MongoDB at mongodb://localhost:27017/mydatabase")

scheduler = BackgroundScheduler(daemon=True)


scheduler.add_job(
    check_and_send_notifications,
    trigger='interval',
    minutes=1, 
    args=[app] 
)
scheduler.start()


atexit.register(lambda: scheduler.shutdown())
print("Scheduler started... checking every 1 minute.")
# -----------------------------------------------------------------------------


if __name__ == "__main__":
 
    app.run(port=5000, debug=True, use_reloader=False)

######hiuaWESHcf