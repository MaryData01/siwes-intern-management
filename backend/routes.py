from flask import Blueprint, jsonify, request
from datetime import datetime
from models import get_db, MongoUser, MongoIntern, MongoAttendance
from bson import ObjectId
from auth import token_required, role_required
from werkzeug.security import generate_password_hash, check_password_hash

routes_bp = Blueprint('routes', __name__)

def get_surname(full_name):
    parts = full_name.strip().split()
    return parts[-1] if parts else ""

# ----------------- SUPERVISOR DASHBOARD -----------------

@routes_bp.route('/api/supervisor/dashboard', methods=['GET'])
@token_required
@role_required('supervisor')
def get_supervisor_dashboard(current_user):
    db = get_db()
    
    # Get active intern user IDs
    active_user_ids = [str(u['_id']) for u in db.users.find({'role': 'intern', 'is_active': True})]
    
    # Get active interns
    active_interns = [MongoIntern(doc) for doc in db.interns.find({'user_id': {'$in': active_user_ids}})]
    total_interns = len(active_interns)
    
    # Calculate average attendance rate for active interns
    total_att_records = 0
    total_present = 0
    for intern in active_interns:
        for att in intern.attendance_records:
            total_att_records += 1
            if att.status == 'Present':
                total_present += 1
                
    avg_attendance = (total_present / total_att_records * 100) if total_att_records > 0 else 0.0
    
    # Interns table details
    interns_list = []
    # Query all interns
    all_interns = [MongoIntern(doc) for doc in db.interns.find({})]
    for intern in all_interns:
        # Calculate attendance %
        att_records = intern.attendance_records
        att_total = len(att_records)
        att_present = sum(1 for r in att_records if r.status == 'Present')
        att_pct = (att_present / att_total * 100) if att_total > 0 else 0.0
        
        u = intern.user
        interns_list.append({
            'id': intern.id,
            'name': u.name if u else '',
            'phone': u.phone if u else '',
            'email_address': (u.email_address if u else '') or '',
            'school': intern.school,
            'course_of_study': intern.course_of_study,
            'specialization': intern.specialization,
            'attendance_rate': round(att_pct, 1),
            'is_active': u.is_active if u else False,
            'industry_department': current_user.industry_department or 'Software Department'
        })
        
    # Bar Chart: Attendance count per week (Present interns on Thursdays)
    attendance_dates = sorted(db.attendance.distinct('date'))
    attendance_chart_data = []
    
    active_intern_ids = [intern.id for intern in active_interns]
    
    for att_date in attendance_dates:
        # Count present active interns on this date
        present_count = db.attendance.count_documents({
            'date': att_date,
            'status': 'Present',
            'intern_id': {'$in': active_intern_ids}
        })
        
        attendance_chart_data.append({
            'date': att_date,
            'count': present_count
        })

    return jsonify({
        'stats': {
            'total_interns': total_interns,
            'avg_attendance': round(avg_attendance, 1)
        },
        'interns': interns_list,
        'attendance_chart': attendance_chart_data
    })

# ----------------- INTERN CRUD -----------------

@routes_bp.route('/api/supervisor/interns', methods=['GET', 'POST'])
@token_required
@role_required('supervisor')
def manage_interns(current_user):
    db = get_db()
    if request.method == 'GET':
        interns = [MongoIntern(doc) for doc in db.interns.find({})]
        return jsonify([intern.to_dict() for intern in interns])
        
    elif request.method == 'POST':
        data = request.get_json()
        if not data:
            return jsonify({'message': 'No input data provided'}), 400
            
        name = data.get('name', '').strip()
        phone = data.get('phone', '').strip()
        email_address = data.get('email_address', '').strip()
        school = data.get('school', '').strip()
        course_of_study = data.get('course_of_study', '').strip()
        specialization = data.get('specialization', '').strip()
        
        if not all([name, phone, school, course_of_study, specialization]):
            return jsonify({'message': 'Name, Phone, School, Course of Study, and Specialization are required'}), 400
            
        # Check unique name (login username)
        name_regex = {"$regex": f"^{name}$", "$options": "i"}
        if db.users.find_one({'name': name_regex}):
            return jsonify({'message': f'Intern with name "{name}" already exists. Name must be unique.'}), 400
            
        # Check unique phone
        if db.users.find_one({'phone': phone}):
            return jsonify({'message': f'User with phone number {phone} already exists.'}), 400
            
        # Check unique email_address if provided
        if email_address and db.users.find_one({'email_address': email_address}):
            return jsonify({'message': f'User with email {email_address} already exists.'}), 400
            
        # Create default password from surname
        surname = get_surname(name)
        if not surname:
            return jsonify({'message': 'Name must contain at least a surname (e.g. Mary Johnson)'}), 400
            
        password_hash = generate_password_hash(surname)
        
        user_id = db.users.insert_one({
            'name': name,
            'phone': phone,
            'email_address': email_address if email_address else None,
            'password_hash': password_hash,
            'role': 'intern',
            'is_active': True,
            'security_question': 'What is the name of your first pet?',
            'security_answer_hash': generate_password_hash('dog')
        }).inserted_id
        
        intern_id = db.interns.insert_one({
            'user_id': str(user_id),
            'school': school,
            'course_of_study': course_of_study,
            'specialization': specialization,
            'created_at': datetime.utcnow().isoformat()
        }).inserted_id
        
        intern = MongoIntern(db.interns.find_one({'_id': intern_id}))
        return jsonify({'message': 'Intern registered successfully', 'intern': intern.to_dict()}), 210

@routes_bp.route('/api/supervisor/interns/<intern_id>', methods=['GET', 'PUT', 'DELETE'])
@token_required
@role_required('supervisor')
def intern_detail(current_user, intern_id):
    db = get_db()
    try:
        intern_doc = db.interns.find_one({'_id': ObjectId(intern_id)})
    except Exception:
        intern_doc = None
        
    if not intern_doc:
        return jsonify({'message': 'Intern not found'}), 404
        
    intern = MongoIntern(intern_doc)
    
    if request.method == 'GET':
        return jsonify(intern.to_dict())
        
    elif request.method == 'PUT':
        data = request.get_json()
        if not data:
            return jsonify({'message': 'No input data provided'}), 400
            
        name = data.get('name', '').strip()
        phone = data.get('phone', '').strip()
        email_address = data.get('email_address', '').strip()
        school = data.get('school', '').strip()
        course_of_study = data.get('course_of_study', '').strip()
        specialization = data.get('specialization', '').strip()
        
        if not all([name, phone, school, course_of_study, specialization]):
            return jsonify({'message': 'Name, Phone, School, Course of Study, and Specialization are required'}), 400
            
        # Check uniqueness if changed
        existing_phone = db.users.find_one({'phone': phone, '_id': {'$ne': ObjectId(intern.user_id)}})
        if existing_phone:
            return jsonify({'message': 'Phone number is already in use by another user'}), 400
            
        if email_address:
            existing_email = db.users.find_one({'email_address': email_address, '_id': {'$ne': ObjectId(intern.user_id)}})
            if existing_email:
                return jsonify({'message': 'Email address is already in use by another user'}), 400
                
        name_regex = {"$regex": f"^{name}$", "$options": "i"}
        existing_name = db.users.find_one({'name': name_regex, '_id': {'$ne': ObjectId(intern.user_id)}})
        if existing_name:
            return jsonify({'message': 'Name is already in use by another user'}), 400
            
        # Update User doc
        u = intern.user
        u.name = name
        u.phone = phone
        u.email_address = email_address if email_address else None
        
        # Update Intern doc
        intern.school = school
        intern.course_of_study = course_of_study
        intern.specialization = specialization
        
        return jsonify({'message': 'Intern details updated successfully', 'intern': intern.to_dict()})

    elif request.method == 'DELETE':
        user_id = intern.user_id
        db.users.delete_one({'_id': ObjectId(user_id)})
        db.interns.delete_one({'_id': ObjectId(intern.id)})
        db.attendance.delete_many({'intern_id': intern.id})
        return jsonify({'message': 'Intern permanently deleted'})

@routes_bp.route('/api/supervisor/interns/<intern_id>/toggle-active', methods=['POST'])
@token_required
@role_required('supervisor')
def toggle_intern_active(current_user, intern_id):
    db = get_db()
    try:
        intern_doc = db.interns.find_one({'_id': ObjectId(intern_id)})
    except Exception:
        intern_doc = None
        
    if not intern_doc:
        return jsonify({'message': 'Intern not found'}), 404
        
    intern = MongoIntern(intern_doc)
    u = intern.user
    u.is_active = not u.is_active
    
    status_str = "activated" if u.is_active else "deactivated"
    return jsonify({'message': f'Intern has been {status_str} successfully', 'is_active': u.is_active})

# ----------------- ATTENDANCE MODULE -----------------

@routes_bp.route('/api/supervisor/attendance/dates', methods=['GET'])
@token_required
@role_required('supervisor')
def get_attendance_dates(current_user):
    db = get_db()
    dates = sorted(db.attendance.distinct('date'), reverse=True)
    return jsonify(dates)

@routes_bp.route('/api/supervisor/attendance', methods=['GET', 'POST'])
@token_required
@role_required('supervisor')
def handle_attendance(current_user):
    db = get_db()
    if request.method == 'GET':
        date_str = request.args.get('date')
        if not date_str:
            return jsonify({'message': 'Date parameter is required (YYYY-MM-DD)'}), 400
            
        # Get active intern user IDs
        active_user_ids = [str(u['_id']) for u in db.users.find({'role': 'intern', 'is_active': True})]
        
        # Get active interns
        active_interns = [MongoIntern(doc) for doc in db.interns.find({'user_id': {'$in': active_user_ids}})]
        
        records = list(db.attendance.find({'date': date_str}))
        records_map = {r['intern_id']: r['status'] for r in records}
        
        result = []
        for intern in active_interns:
            result.append({
                'intern_id': intern.id,
                'name': intern.user.name if intern.user else '',
                'phone': intern.user.phone if intern.user else '',
                'status': records_map.get(intern.id, 'Absent')
            })
            
        return jsonify({
            'date': date_str,
            'is_logged': len(records) > 0,
            'records': result
        })
        
    elif request.method == 'POST':
        data = request.get_json()
        if not data or not data.get('date') or 'records' not in data:
            return jsonify({'message': 'Date and records list are required'}), 400
            
        date_str = data.get('date')
        records = data.get('records')
        
        try:
            target_date = datetime.strptime(date_str, '%Y-%m-%d')
        except ValueError:
            return jsonify({'message': 'Invalid date format (must be YYYY-MM-DD)'}), 400
            
        if target_date.weekday() != 3:
            return jsonify({'message': 'Attendance can only be logged for Thursdays.'}), 400
            
        for rec in records:
            intern_id = rec.get('intern_id')
            status = rec.get('status')
            if status not in ['Present', 'Absent']:
                return jsonify({'message': f'Invalid status: {status}. Must be Present or Absent'}), 400
                
            db.attendance.update_one(
                {'intern_id': intern_id, 'date': date_str},
                {'$set': {'status': status, 'created_at': datetime.utcnow().isoformat()}},
                upsert=True
            )
            
        return jsonify({'message': 'Attendance saved successfully'})

# ----------------- SUPERVISOR PROFILE SETTINGS -----------------

@routes_bp.route('/api/supervisor/profile', methods=['GET', 'POST'])
@token_required
@role_required('supervisor')
def manage_supervisor_profile(current_user):
    db = get_db()
    if request.method == 'GET':
        return jsonify({
            'name': current_user.name,
            'email_address': current_user.email_address or '',
            'phone': current_user.phone,
            'industry_department': current_user.industry_department or '',
            'security_question': current_user.security_question or ''
        })
        
    elif request.method == 'POST':
        data = request.get_json()
        if not data:
            return jsonify({'message': 'No data provided'}), 400
            
        name = data.get('name', '').strip()
        email_address = data.get('email_address', '').strip()
        phone = data.get('phone', '').strip()
        industry_department = data.get('industry_department', '').strip()
        
        if not name or not phone or not industry_department:
            return jsonify({'message': 'Name, Phone, and Industry Department are required'}), 400
            
        # Check unique phone
        existing_phone = db.users.find_one({'phone': phone, '_id': {'$ne': ObjectId(current_user.id)}})
        if existing_phone:
            return jsonify({'message': 'Phone number is already in use'}), 400
            
        # Check unique email
        if email_address:
            existing_email = db.users.find_one({'email_address': email_address, '_id': {'$ne': ObjectId(current_user.id)}})
            if existing_email:
                return jsonify({'message': 'Email address is already in use'}), 400
                
        current_user.name = name
        current_user.email_address = email_address if email_address else None
        current_user.phone = phone
        current_user.industry_department = industry_department
        
        # Security question update
        security_question = data.get('security_question', '').strip()
        security_answer = data.get('security_answer', '').strip()
        
        if security_question and security_answer:
            current_user.security_question = security_question
            current_user.security_answer_hash = generate_password_hash(security_answer.lower())
        elif (security_question and not security_answer) or (not security_question and security_answer):
            return jsonify({'message': 'Both security question and answer are required to update recovery settings'}), 400
            
        # Password change
        current_password = data.get('current_password', '')
        new_password = data.get('new_password', '')
        
        if current_password or new_password:
            if not current_password or not new_password:
                return jsonify({'message': 'Both current and new passwords are required to change password'}), 400
            if not check_password_hash(current_user.password_hash, current_password):
                return jsonify({'message': 'Incorrect current password'}), 400
            if len(new_password) < 4:
                return jsonify({'message': 'New password must be at least 4 characters long'}), 400
            current_user.password_hash = generate_password_hash(new_password)
            
        return jsonify({'message': 'Profile settings updated successfully!', 'user': current_user.to_dict()})

# ----------------- INTERN DASHBOARD -----------------

@routes_bp.route('/api/intern/dashboard', methods=['GET'])
@token_required
@role_required('intern')
def get_intern_dashboard(current_user):
    db = get_db()
    intern = current_user.intern_profile
    if not intern:
        return jsonify({'message': 'Intern profile not found'}), 404
        
    # Get supervisor profile for industry department
    supervisor_doc = db.users.find_one({'role': 'supervisor'})
    ind_dept = supervisor_doc.get('industry_department', 'Software Department') if supervisor_doc else 'Software Department'
    
    # Attendance summary
    att_records = [MongoAttendance(r) for r in db.attendance.find({'intern_id': intern.id}).sort('date', -1)]
    attended = sum(1 for r in att_records if r.status == 'Present')
    absent = sum(1 for r in att_records if r.status == 'Absent')
    attendance_pct = (attended / len(att_records) * 100) if len(att_records) > 0 else 0.0
    
    return jsonify({
        'profile': {
            'name': current_user.name,
            'phone': current_user.phone,
            'email_address': current_user.email_address or '',
            'school': intern.school,
            'course_of_study': intern.course_of_study,
            'specialization': intern.specialization,
            'industry_department': ind_dept
        },
        'attendance_summary': {
            'total_thursdays': len(att_records),
            'attended': attended,
            'absent': absent,
            'attendance_rate': round(attendance_pct, 1)
        },
        'attendance_history': [r.to_dict() for r in att_records]
    })

# ----------------- REPORT CARD EXPORT DATA -----------------

@routes_bp.route('/api/interns/<intern_id>/report', methods=['GET'])
@token_required
def get_intern_report(current_user, intern_id):
    db = get_db()
    if current_user.role == 'intern' and current_user.intern_profile.id != intern_id:
        return jsonify({'message': 'Access forbidden'}), 403
        
    try:
        intern_doc = db.interns.find_one({'_id': ObjectId(intern_id)})
    except Exception:
        intern_doc = None
        
    if not intern_doc:
        return jsonify({'message': 'Intern not found'}), 404
        
    intern = MongoIntern(intern_doc)
    supervisor_doc = db.users.find_one({'role': 'supervisor'})
    ind_dept = supervisor_doc.get('industry_department', 'Software Department') if supervisor_doc else 'Software Department'
    
    # Attendance records
    att_records = [MongoAttendance(r) for r in db.attendance.find({'intern_id': intern.id}).sort('date', 1)]
    attended = sum(1 for r in att_records if r.status == 'Present')
    att_pct = (attended / len(att_records) * 100) if len(att_records) > 0 else 0.0
    
    return jsonify({
        'profile': {
            'name': intern.user.name if intern.user else '',
            'phone': intern.user.phone if intern.user else '',
            'email_address': (intern.user.email_address if intern.user else '') or '',
            'school': intern.school,
            'course_of_study': intern.course_of_study,
            'specialization': intern.specialization,
            'is_active': intern.user.is_active if intern.user else False,
            'industry_department': ind_dept
        },
        'attendance': {
            'total': len(att_records),
            'present': attended,
            'absent': len(att_records) - attended,
            'percentage': round(att_pct, 1),
            'records': [r.to_dict() for r in att_records]
        }
    })
