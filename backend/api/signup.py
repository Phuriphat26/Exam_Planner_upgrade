from flask import Blueprint, request, jsonify
from pymongo import MongoClient
from werkzeug.security import generate_password_hash  

register_bp = Blueprint('register', __name__, url_prefix='/register')


client = MongoClient('mongodb://localhost:27017/')
db = client['mydatabase']
users_collection = db['users']


@register_bp.route('/', methods=['POST'])
def register():
    data = request.get_json()
    username = data.get('username')
    email = data.get('email')
    password = data.get('password')

    # ตรวจสอบข้อมูล
    if not username or not email or not password:
        return jsonify({'message': 'กรุณากรอกข้อมูลให้ครบถ้วน'}), 400

    # ตรวจสอบอีเมลซ้ำ
    if users_collection.find_one({'email': email}):
        return jsonify({'message': 'อีเมลนี้มีอยู่แล้ว'}), 400

    # เข้ารหัสผ่านก่อนบันทึก
    hashed_password = generate_password_hash(password)

    # บันทึกข้อมูลลง DB
    users_collection.insert_one({
        'username': username,
        'email': email,
        'password': hashed_password,  
        'role': 'user'               
    })

    return jsonify({'message': 'สมัครสมาชิกสำเร็จ'}), 200