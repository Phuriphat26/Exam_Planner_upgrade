from flask import Blueprint, request, jsonify, session
from flask_cors import cross_origin
from pymongo import MongoClient
from werkzeug.security import check_password_hash
from bson.objectid import ObjectId  

login_bp = Blueprint('login', __name__, url_prefix='/login')

client = MongoClient('mongodb://localhost:27017/')
db = client['mydatabase']
users_collection = db['users']

@login_bp.route('/', methods=['POST'])
@cross_origin(supports_credentials=True, origins=['http://localhost:5173'])
def login():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')

    user = users_collection.find_one({'username': username})

    if user and check_password_hash(user['password'], password):
        user_role = user.get('role', 'user')

        # เก็บลง session 
        session['user_id'] = str(user['_id'])
        session['username'] = user['username']
        session['role'] = user_role

        # ส่ง user_id กลับไปให้ Frontend
        return jsonify({
            'success': True,
            'role': user_role,
            'user_id': str(user['_id'])  
        })
        # --------------------------------

    return jsonify({'success': False, 'message': 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง'}), 401

@login_bp.route('/check', methods=['GET'])
@cross_origin(supports_credentials=True, origins=['http://localhost:5173'])
def check_login():
    if 'user_id' in session:
        return jsonify({
            'logged_in': True,
            'username': session.get('username'),
            'role': session.get('role')
        })
    return jsonify({'logged_in': False})

@login_bp.route('/logout', methods=['POST'])
@cross_origin(supports_credentials=True, origins=['http://localhost:5173'])
def logout():
    session.clear()
    return jsonify({'success': True})