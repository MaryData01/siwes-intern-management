from flask import Blueprint, jsonify, request
from datetime import datetime, date
from models import db, User, Intern, Attendance
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
    # Active interns query
    active_interns = Intern.query.join(User).filter(User.is_active == True).all()
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
    # Query all interns, joined with User
    all_interns = Intern.query.all()
    for intern in all_interns:
        # Calculate attendance %
        att_records = intern.attendance_records
        att_total = len(att_records)
        att_present = sum(1 for r in att_records if r.status == 'Present')
        att_pct = (att_present / att_total * 100) if att_total > 0 else 0.0
        
        interns_list.append({
            'id': intern.id,
            'name': intern.user.name,
            'phone': intern.user.phone,
            'email_address': intern.user.email_address or '',
            'school': intern.school,
            'course_of_study': intern.course_of_study,
            'specialization': intern.specialization,
            'attendance_rate': round(att_pct, 1),
            'is_active': intern.user.is_active,
            'industry_department': current_user.industry_department or 'Software Department'
        })
        
    # Bar Chart: Attendance count per week (Present interns on Thursdays)
    # Group attendance by date and count 'Present' for active interns
    attendance_dates = db.session.query(Attendance.date).distinct().order_by(Attendance.date).all()
    attendance_chart_data = []
    
    for (att_date,) in attendance_dates:
        # Count present active interns on this date
        present_count = Attendance.query.join(Intern).join(User).filter(
            Attendance.date == att_date,
            Attendance.status == 'Present',
            User.is_active == True
        ).count()
        
        date_str = att_date.strftime('%Y-%m-%d')
        attendance_chart_data.append({
            'date': date_str,
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
    if request.method == 'GET':
        interns = Intern.query.all()
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
        if User.query.filter(db.func.lower(User.name) == db.func.lower(name)).first():
            return jsonify({'message': f'Intern with name "{name}" already exists. Name must be unique.'}), 400
            
        # Check unique phone
        if User.query.filter_by(phone=phone).first():
            return jsonify({'message': f'User with phone number {phone} already exists.'}), 400
            
        # Check unique email_address if provided
        if email_address and User.query.filter_by(email_address=email_address).first():
            return jsonify({'message': f'User with email {email_address} already exists.'}), 400
            
        # Create default password from surname
        surname = get_surname(name)
        if not surname:
            return jsonify({'message': 'Name must contain at least a surname (e.g. Mary Johnson)'}), 400
            
        password_hash = generate_password_hash(surname)
        
        user = User(
            name=name,
            phone=phone,
            email_address=email_address if email_address else None,
            password_hash=password_hash,
            role='intern',
            is_active=True
        )
        db.session.add(user)
        db.session.flush()
        
        intern = Intern(
            user_id=user.id,
            school=school,
            course_of_study=course_of_study,
            specialization=specialization
        )
        db.session.add(intern)
        db.session.commit()
        
        return jsonify({'message': 'Intern registered successfully', 'intern': intern.to_dict()}), 210

@routes_bp.route('/api/supervisor/interns/<int:intern_id>', methods=['GET', 'PUT', 'DELETE'])
@token_required
@role_required('supervisor')
def intern_detail(current_user, intern_id):
    intern = db.session.get(Intern, intern_id)
    if not intern:
        return jsonify({'message': 'Intern not found'}), 404
        
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
        existing_phone = User.query.filter(User.phone == phone, User.id != intern.user_id).first()
        if existing_phone:
            return jsonify({'message': 'Phone number is already in use by another user'}), 400
            
        if email_address:
            existing_email = User.query.filter(User.email_address == email_address, User.id != intern.user_id).first()
            if existing_email:
                return jsonify({'message': 'Email address is already in use by another user'}), 400
                
        existing_name = User.query.filter(db.func.lower(User.name) == db.func.lower(name), User.id != intern.user_id).first()
        if existing_name:
            return jsonify({'message': 'Name is already in use by another user'}), 400
            
        intern.user.name = name
        intern.user.phone = phone
        intern.user.email_address = email_address if email_address else None
        intern.school = school
        intern.course_of_study = course_of_study
        intern.specialization = specialization
        
        db.session.commit()
        return jsonify({'message': 'Intern details updated successfully', 'intern': intern.to_dict()})

    elif request.method == 'DELETE':
        user = intern.user
        db.session.delete(user)
        db.session.commit()
        return jsonify({'message': 'Intern permanently deleted'})

@routes_bp.route('/api/supervisor/interns/<int:intern_id>/toggle-active', methods=['POST'])
@token_required
@role_required('supervisor')
def toggle_intern_active(current_user, intern_id):
    intern = db.session.get(Intern, intern_id)
    if not intern:
        return jsonify({'message': 'Intern not found'}), 404
        
    intern.user.is_active = not intern.user.is_active
    db.session.commit()
    
    status_str = "activated" if intern.user.is_active else "deactivated"
    return jsonify({'message': f'Intern has been {status_str} successfully', 'is_active': intern.user.is_active})

# ----------------- ATTENDANCE MODULE -----------------

@routes_bp.route('/api/supervisor/attendance/dates', methods=['GET'])
@token_required
@role_required('supervisor')
def get_attendance_dates(current_user):
    dates = db.session.query(Attendance.date).distinct().order_by(Attendance.date.desc()).all()
    return jsonify([d[0].strftime('%Y-%m-%d') for d in dates])

@routes_bp.route('/api/supervisor/attendance', methods=['GET', 'POST'])
@token_required
@role_required('supervisor')
def handle_attendance(current_user):
    if request.method == 'GET':
        date_str = request.args.get('date')
        if not date_str:
            return jsonify({'message': 'Date parameter is required (YYYY-MM-DD)'}), 400
            
        try:
            target_date = datetime.strptime(date_str, '%Y-%m-%d').date()
        except ValueError:
            return jsonify({'message': 'Invalid date format (must be YYYY-MM-DD)'}), 400
            
        active_interns = Intern.query.join(User).filter(User.is_active == True).all()
        records = Attendance.query.filter_by(date=target_date).all()
        records_map = {r.intern_id: r.status for r in records}
        
        result = []
        for intern in active_interns:
            result.append({
                'intern_id': intern.id,
                'name': intern.user.name,
                'phone': intern.user.phone,
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
            target_date = datetime.strptime(date_str, '%Y-%m-%d').date()
        except ValueError:
            return jsonify({'message': 'Invalid date format (must be YYYY-MM-DD)'}), 400
            
        if target_date.weekday() != 3:
            return jsonify({'message': 'Attendance can only be logged for Thursdays.'}), 400
            
        for rec in records:
            intern_id = rec.get('intern_id')
            status = rec.get('status')
            if status not in ['Present', 'Absent']:
                return jsonify({'message': f'Invalid status: {status}. Must be Present or Absent'}), 400
                
            existing = Attendance.query.filter_by(intern_id=intern_id, date=target_date).first()
            if existing:
                existing.status = status
            else:
                new_att = Attendance(intern_id=intern_id, date=target_date, status=status)
                db.session.add(new_att)
                
        db.session.commit()
        return jsonify({'message': 'Attendance saved successfully'})

# ----------------- SUPERVISOR PROFILE SETTINGS -----------------

@routes_bp.route('/api/supervisor/profile', methods=['GET', 'POST'])
@token_required
@role_required('supervisor')
def manage_supervisor_profile(current_user):
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
        existing_phone = User.query.filter(User.phone == phone, User.id != current_user.id).first()
        if existing_phone:
            return jsonify({'message': 'Phone number is already in use'}), 400
            
        # Check unique email
        if email_address:
            existing_email = User.query.filter(User.email_address == email_address, User.id != current_user.id).first()
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
            
        db.session.commit()
        return jsonify({'message': 'Profile settings updated successfully!', 'user': current_user.to_dict()})

# ----------------- INTERN DASHBOARD -----------------

@routes_bp.route('/api/intern/dashboard', methods=['GET'])
@token_required
@role_required('intern')
def get_intern_dashboard(current_user):
    intern = current_user.intern_profile
    if not intern:
        return jsonify({'message': 'Intern profile not found'}), 404
        
    # Get supervisor profile for industry department
    supervisor = User.query.filter_by(role='supervisor').first()
    ind_dept = supervisor.industry_department if supervisor else 'Software Department'
    
    # Attendance summary
    att_records = Attendance.query.filter_by(intern_id=intern.id).order_by(Attendance.date.desc()).all()
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

@routes_bp.route('/api/interns/<int:intern_id>/report', methods=['GET'])
@token_required
def get_intern_report(current_user, intern_id):
    if current_user.role == 'intern' and current_user.intern_profile.id != intern_id:
        return jsonify({'message': 'Access forbidden'}), 403
        
    intern = db.session.get(Intern, intern_id)
    if not intern:
        return jsonify({'message': 'Intern not found'}), 404
        
    supervisor = User.query.filter_by(role='supervisor').first()
    ind_dept = supervisor.industry_department if supervisor else 'Software Department'
    
    # Attendance records
    att_records = Attendance.query.filter_by(intern_id=intern.id).order_by(Attendance.date).all()
    attended = sum(1 for r in att_records if r.status == 'Present')
    att_pct = (attended / len(att_records) * 100) if len(att_records) > 0 else 0.0
    
    return jsonify({
        'profile': {
            'name': intern.user.name,
            'phone': intern.user.phone,
            'email_address': intern.user.email_address or '',
            'school': intern.school,
            'course_of_study': intern.course_of_study,
            'specialization': intern.specialization,
            'is_active': intern.user.is_active,
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
