import os
import datetime
import jwt
from flask import request, jsonify, Blueprint
from werkzeug.security import generate_password_hash, check_password_hash
from functools import wraps
from bson import ObjectId
from models import get_db, MongoUser

auth_bp = Blueprint('auth', __name__)

def get_jwt_secret():
    return os.environ.get('JWT_SECRET', 'fallback-secret-for-siwes-intern-system-development-only')

def generate_token(user):
    secret = get_jwt_secret()
    payload = {
        'exp': datetime.datetime.utcnow() + datetime.timedelta(days=7),
        'iat': datetime.datetime.utcnow(),
        'sub': user.id,
        'role': user.role
    }
    return jwt.encode(payload, secret, algorithm='HS256')

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        if 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            try:
                token = auth_header.split(" ")[1]
            except IndexError:
                return jsonify({'message': 'Token format is invalid'}), 401
                
        if not token:
            return jsonify({'message': 'Token is missing'}), 401
            
        try:
            secret = get_jwt_secret()
            data = jwt.decode(token, secret, algorithms=['HS256'])
            
            db = get_db()
            try:
                user_doc = db.users.find_one({'_id': ObjectId(data['sub'])})
            except Exception:
                user_doc = None
                
            current_user = MongoUser(user_doc) if user_doc else None
            if not current_user or not current_user.is_active:
                return jsonify({'message': 'User is inactive or deleted'}), 401
        except jwt.ExpiredSignatureError:
            return jsonify({'message': 'Token has expired'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'message': 'Token is invalid'}), 401
            
        return f(current_user, *args, **kwargs)
    return decorated

def role_required(role):
    def decorator(f):
        @wraps(f)
        def decorated(current_user, *args, **kwargs):
            if current_user.role != role:
                return jsonify({'message': f'Access forbidden: requires {role} role'}), 403
            return f(current_user, *args, **kwargs)
        return decorated
    return decorator

def get_surname(full_name):
    parts = full_name.strip().split()
    return parts[-1] if parts else ""

@auth_bp.route('/api/auth/login', methods=['POST'])
def login():
    data = request.get_json()
    if not data or not data.get('username') or not data.get('password'):
        return jsonify({'message': 'Please provide username and password'}), 400
        
    username = data.get('username').strip().lower()
    password = data.get('password')
    
    print(f"DEBUG LOGIN: username input: '{username}', password: '{password}'")
    
    db = get_db()
    username_regex = {"$regex": f"^{username}$", "$options": "i"}
    
    # Try supervisor lookup by email_address or phone or name (case-insensitive)
    user_doc = db.users.find_one({
        'role': 'supervisor',
        '$or': [
            {'email_address': username_regex},
            {'phone': username},
            {'name': username_regex}
        ]
    })
    
    if not user_doc and username == 'supervisor':
        user_doc = db.users.find_one({'role': 'supervisor'})
        
    # If not found, try intern lookup by full name or phone (case-insensitive)
    if not user_doc:
        user_doc = db.users.find_one({
            'role': 'intern',
            '$or': [
                {'name': username_regex},
                {'phone': username},
                {'email_address': username_regex}
            ]
        })
        
    user = MongoUser(user_doc) if user_doc else None
    
    print(f"DEBUG LOGIN: user found: {user is not None}")
    if user:
        pwd_match = check_password_hash(user.password_hash, password)
        print(f"DEBUG LOGIN: name: '{user.name}', role: '{user.role}', active: {user.is_active}, pwd_match: {pwd_match}")
        
    if not user:
        return jsonify({'message': 'Invalid username or password'}), 401
        
    if not user.is_active:
        return jsonify({'message': 'Account is deactivated'}), 403
        
    if not check_password_hash(user.password_hash, password):
        return jsonify({'message': 'Invalid username or password'}), 401
        
    token = generate_token(user)
    
    # Determine if they are using default credentials
    is_default_password = False
    if user.role == 'supervisor':
        if check_password_hash(user.password_hash, 'supervisor123'):
            is_default_password = True
    else:
        surname = get_surname(user.name)
        if surname and check_password_hash(user.password_hash, surname):
            is_default_password = True
                
    return jsonify({
        'token': token,
        'user': user.to_dict(),
        'is_default_password': is_default_password
    })

# ----------------- FORGOT PASSWORD FLOW -----------------

@auth_bp.route('/api/auth/forgot-password/question', methods=['POST'])
def get_forgot_question():
    data = request.get_json()
    if not data or not data.get('username'):
        return jsonify({'message': 'Please provide username or email'}), 400
        
    username = data.get('username').strip().lower()
    db = get_db()
    username_regex = {"$regex": f"^{username}$", "$options": "i"}
    
    # Lookup supervisor by name or phone
    user_doc = db.users.find_one({
        'role': 'supervisor',
        '$or': [
            {'name': username_regex},
            {'phone': username}
        ]
    })
    
    # Lookup intern by name or phone
    if not user_doc:
        user_doc = db.users.find_one({
            'role': 'intern',
            '$or': [
                {'name': username_regex},
                {'phone': username}
            ]
        })
        
    user = MongoUser(user_doc) if user_doc else None
    
    if not user:
        return jsonify({'message': 'User account not found'}), 404
        
    if not user.security_question:
        return jsonify({'message': 'No security question set for this account. Please contact administrator.'}), 400
        
    return jsonify({
        'username': user.name,
        'security_question': user.security_question
    })

@auth_bp.route('/api/auth/forgot-password/reset', methods=['POST'])
def reset_forgot_password():
    data = request.get_json()
    if not data or not data.get('username') or not data.get('security_answer') or not data.get('new_password'):
        return jsonify({'message': 'All recovery fields are required'}), 400
        
    username = data.get('username').strip().lower()
    security_answer = data.get('security_answer').strip().lower()
    new_password = data.get('new_password').strip()
    
    db = get_db()
    username_regex = {"$regex": f"^{username}$", "$options": "i"}
    
    # Lookup supervisor by name or phone
    user_doc = db.users.find_one({
        'role': 'supervisor',
        '$or': [
            {'name': username_regex},
            {'phone': username}
        ]
    })
    
    # Lookup intern
    if not user_doc:
        user_doc = db.users.find_one({
            'role': 'intern',
            '$or': [
                {'name': username_regex},
                {'phone': username}
            ]
        })
        
    user = MongoUser(user_doc) if user_doc else None
        
    if not user:
        return jsonify({'message': 'User account not found'}), 404
        
    if not user.security_answer_hash:
        return jsonify({'message': 'No recovery details set for this account.'}), 400
        
    if not check_password_hash(user.security_answer_hash, security_answer):
        return jsonify({'message': 'Incorrect security answer'}), 400
        
    if len(new_password) < 4:
        return jsonify({'message': 'Password must be at least 4 characters long'}), 400
        
    user.password_hash = generate_password_hash(new_password)
    return jsonify({'message': 'Password updated successfully!'})

# ----------------- INTERN ACCOUNT SECURITY -----------------

@auth_bp.route('/api/auth/account-security/change-password', methods=['POST'])
@token_required
def intern_change_password(current_user):
    data = request.get_json()
    if not data or not data.get('current_password') or not data.get('new_password'):
        return jsonify({'message': 'Current and new passwords are required'}), 400
        
    current_password = data.get('current_password')
    new_password = data.get('new_password').strip()
    
    if not check_password_hash(current_user.password_hash, current_password):
        return jsonify({'message': 'Incorrect current password'}), 400
        
    if len(new_password) < 4:
        return jsonify({'message': 'Password must be at least 4 characters long'}), 400
        
    current_user.password_hash = generate_password_hash(new_password)
    return jsonify({'message': 'Password updated successfully!'})

@auth_bp.route('/api/auth/account-security/set-question', methods=['POST'])
@token_required
def intern_set_security_question(current_user):
    data = request.get_json()
    if not data or not data.get('security_question') or not data.get('security_answer'):
        return jsonify({'message': 'Security question and answer are required'}), 400
        
    question = data.get('security_question').strip()
    answer = data.get('security_answer').strip().lower()
    
    if not question or not answer:
        return jsonify({'message': 'Security question and answer cannot be empty'}), 400
        
    current_user.security_question = question
    current_user.security_answer_hash = generate_password_hash(answer)
    return jsonify({'message': 'Security recovery question configured successfully!'})
