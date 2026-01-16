from flask import Blueprint, request, jsonify, session
from pymongo import MongoClient
from bson.objectid import ObjectId

profile_bp = Blueprint('profile_bp', __name__, url_prefix='/profile_bp')

client = MongoClient('mongodb://localhost:27017/')
db = client['mydatabase']
users_collection = db['users']

@profile_bp.route('/', methods=['GET'])
def profile():
    if 'user_id' not in session:
        return jsonify({'error': 'Unauthorized'}), 401

    user = users_collection.find_one({'_id': ObjectId(session['user_id'])})
    if not user:
        return jsonify({'error': 'User not found'}), 404

    user_data = {
        'username': user.get('username'),
        'email': user.get('email', '')
    }
    return jsonify(user_data), 200


@profile_bp.route('/edit', methods=['PUT'])
def edit_profile():
    if 'user_id' not in session:
        return jsonify({'error': 'Unauthorized'}), 401

    data = request.json
    if not data:
        return jsonify({'error': 'No data provided'}), 400

    update_fields = {}
    if 'username' in data:
        update_fields['username'] = data['username']
    if 'email' in data:
        update_fields['email'] = data['email']
    if 'password' in data:
        update_fields['password'] = data['password']  # ควร hash ก่อนเก็บจริงๆ

    if not update_fields:
        return jsonify({'error': 'No valid fields to update'}), 400

    result = users_collection.update_one(
        {'_id': ObjectId(session['user_id'])},
        {'$set': update_fields}
    )

    if result.modified_count == 0:
        return jsonify({'message': 'ไม่มีการเปลี่ยนแปลง'}), 200

    return jsonify({'message': 'แก้ไขข้อมูลสำเร็จ'}), 200
