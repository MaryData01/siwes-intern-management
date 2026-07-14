import os, jwt
from datetime import datetime, timedelta
from functools import wraps
from flask import Blueprint, request, jsonify
from werkzeug.security import generate_password_hash, check_password_hash
from bson import ObjectId

auth_bp = Blueprint('auth', __name__)

JWT_SECRET  = os.environ.get('JWT_SECRET', 'siwes-default-secret-change-this')
JWT_EXPIRES = timedelta(hours=24)

def get_db():
    from models import get_db as _get
    return _get()

def make_token(user_doc):
    payload = {
        'user_id': str(user_doc['_id']),
        'role':    user_doc.get('role', 'intern'),
        'exp':     datetime.utcnow() + JWT_EXPIRES,
    }
    return jwt.encode(payload, JWT_SECRET, algorithm='HS256')

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        auth_header = request.headers.get('Authorization', '')
        if auth_header.startswith('Bearer '):
            token = auth_header.split(' ', 1)[1]
        if not token:
            return jsonify({'message': 'Token missing'}), 401
        try:
            data    = jwt.decode(token, JWT_SECRET, algorithms=['HS256'])
            user_id = data.get('user_id')
            db      = get_db()
            current_user = db.users.find_one({'_id': ObjectId(user_id)})
            if not current_user:
                return jsonify({'message': 'User not found'}), 401
        except jwt.ExpiredSignatureError:
            return jsonify({'message': 'Token expired'}), 401
        except Exception:
            return jsonify({'message': 'Invalid token'}), 401
        return f(current_user, *args, **kwargs)
    return decorated

def role_required(*allowed_roles):
    """
    Allow superuser to access any route.
    Otherwise require one of the listed roles.
    """
    def decorator(f):
        @wraps(f)
        def decorated(current_user, *args, **kwargs):
            role = current_user.get('role', '')
            if role == 'superuser':          # superuser passes everything
                return f(current_user, *args, **kwargs)
            if role not in allowed_roles:
                return jsonify({'message': 'Access forbidden'}), 403
            return f(current_user, *args, **kwargs)
        return decorated
    return decorator


# ─── LOGIN ────────────────────────────────────────────────────────────────────

@auth_bp.route('/api/auth/login', methods=['POST'])
def login():
    try:
        db = get_db()
        # Quick connection check
        db.command('ping')
    except Exception:
        return jsonify({'message': 'Cannot reach database. Check your internet connection and try again.'}), 503
    data = request.get_json() or {}
    username = (data.get('username') or '').strip()
    password = (data.get('password') or '').strip()

    if not username or not password:
        return jsonify({'message': 'Username and password required'}), 400

    # Case-insensitive search across name, email and phone
    import re as _re
    pattern = _re.escape(username)
    user = db.users.find_one({
        '$or': [
            {'name':          {'$regex': f'^{pattern}$', '$options': 'i'}},
            {'email_address': {'$regex': f'^{pattern}$', '$options': 'i'}},
            {'phone':         username},
        ]
    })

    # Fallback: order-independent word match (handles "Mary Adekanye" vs "Adekanye Mary")
    if not user:
        input_words = sorted(w.lower() for w in username.strip().split())
        for candidate in db.users.find({'role': {'$in': ['intern', 'supervisor', 'superuser']}}):
            stored_words = sorted(w.lower() for w in (candidate.get('name') or '').strip().split())
            if stored_words == input_words:
                user = candidate
                break

    if not user or not check_password_hash(user.get('password_hash', ''), password):
        return jsonify({'message': 'Invalid username or password'}), 401

    if not user.get('is_active', True):
        return jsonify({'message': 'Account deactivated. Contact your supervisor.'}), 403

    token = make_token(user)
    role  = user.get('role', 'intern')
    is_default = (role in ('supervisor', 'superuser') and check_password_hash(user.get('password_hash', ''), 'supervisor123'))

    response = {
        'token': token,
        'role':  role,
        'user': {
            'id':   str(user['_id']),
            'name': user.get('name', ''),
            'role': role,
            'industry_department': user.get('industry_department', ''),
        },
        'is_default_password': is_default,
    }
    if role == 'intern':
        intern_doc = db.interns.find_one({'user_id': str(user['_id'])})
        response['intern_id'] = str(intern_doc['_id']) if intern_doc else None
    return jsonify(response)


# ─── CHANGE PASSWORD ──────────────────────────────────────────────────────────

@auth_bp.route('/api/auth/change-password', methods=['POST'])
@token_required
def change_password(current_user):
    db   = get_db()
    data = request.get_json() or {}
    cur  = data.get('current_password', '')
    new  = data.get('new_password', '')
    if not cur or not new:
        return jsonify({'message': 'Current and new passwords are required'}), 400
    if not check_password_hash(current_user.get('password_hash', ''), cur):
        return jsonify({'message': 'Incorrect current password'}), 401
    if len(new) < 4:
        return jsonify({'message': 'Password must be at least 4 characters'}), 400
    db.users.update_one({'_id': current_user['_id']}, {'$set': {'password_hash': generate_password_hash(new)}})
    return jsonify({'message': 'Password updated successfully'})


# ─── SECURITY QUESTION ────────────────────────────────────────────────────────

@auth_bp.route('/api/auth/security-question', methods=['POST'])
@token_required
def set_security_question(current_user):
    db   = get_db()
    data = request.get_json() or {}
    sq   = data.get('security_question', '').strip()
    sa   = data.get('security_answer', '').strip()
    if not sq or not sa:
        return jsonify({'message': 'Both question and answer required'}), 400
    db.users.update_one({'_id': current_user['_id']}, {'$set': {
        'security_question':    sq,
        'security_answer_hash': generate_password_hash(sa.lower()),
    }})
    return jsonify({'message': 'Security question set successfully'})


# ─── FORGOT PASSWORD ─────────────────────────────────────────────────────────

@auth_bp.route('/api/auth/forgot-password/get-question', methods=['POST'])
def get_security_question():
    db   = get_db()
    data = request.get_json() or {}
    identifier = (data.get('identifier') or '').strip()
    if not identifier:
        return jsonify({'message': 'Name or email required'}), 400

    import re as _re
    pattern = _re.escape(identifier)
    user = db.users.find_one({
        '$or': [
            {'name':          {'$regex': f'^{pattern}$', '$options': 'i'}},
            {'email_address': {'$regex': f'^{pattern}$', '$options': 'i'}},
        ]
    })
    if not user or not user.get('security_question'):
        return jsonify({'message': 'No account found or security question not configured'}), 404
    return jsonify({'security_question': user['security_question']})


@auth_bp.route('/api/auth/forgot-password/reset', methods=['POST'])
def reset_password():
    db   = get_db()
    data = request.get_json() or {}
    identifier = (data.get('identifier') or '').strip()
    answer     = (data.get('answer') or '').strip().lower()
    new_pw     = (data.get('new_password') or '').strip()

    if not all([identifier, answer, new_pw]):
        return jsonify({'message': 'All fields required'}), 400

    import re as _re
    pattern = _re.escape(identifier)
    user = db.users.find_one({
        '$or': [
            {'name':          {'$regex': f'^{pattern}$', '$options': 'i'}},
            {'email_address': {'$regex': f'^{pattern}$', '$options': 'i'}},
        ]
    })
    if not user:
        return jsonify({'message': 'Account not found'}), 404
    if not user.get('security_answer_hash') or not check_password_hash(user['security_answer_hash'], answer):
        return jsonify({'message': 'Incorrect security answer'}), 401
    if len(new_pw) < 4:
        return jsonify({'message': 'Password must be at least 4 characters'}), 400
    db.users.update_one({'_id': user['_id']}, {'$set': {'password_hash': generate_password_hash(new_pw)}})
    return jsonify({'message': 'Password updated successfully'})
