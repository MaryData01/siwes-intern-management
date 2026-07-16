from flask import Blueprint, jsonify, request
from datetime import datetime
from collections import defaultdict
from bson import ObjectId
from bson.errors import InvalidId
from auth import token_required, role_required
from werkzeug.security import generate_password_hash, check_password_hash
import re

routes_bp = Blueprint('routes', __name__)

# ─── HELPERS ────────────────────────────────────────────────────────────────

def calculate_duration(start_date, end_date):
    if not start_date or not end_date:
        return "-"
    try:
        start = datetime.strptime(start_date, '%Y-%m-%d')
        end   = datetime.strptime(end_date,   '%Y-%m-%d')
        diff_days = (end - start).days
        if diff_days < 0:
            return "Invalid dates"
        months = diff_days // 30
        weeks  = (diff_days % 30) // 7
        parts  = []
        if months: parts.append(f"{months} month{'s' if months > 1 else ''}")
        if weeks:  parts.append(f"{weeks} week{'s' if weeks > 1 else ''}")
        if not parts:
            return f"{diff_days} day{'s' if diff_days != 1 else ''}"
        return " and ".join(parts)
    except Exception:
        return "-"

def safe_regex(text):
    """Escape special regex chars so a name like 'John (Jr.)' doesn't crash MongoDB."""
    return re.escape(str(text))

def name_parts(user_doc):
    """
    Return (first_name, middle_name, surname) from a user document.
    Handles both new docs (with explicit fields) and old docs (name-only).
    """
    fn = user_doc.get('first_name') or ''
    mn = user_doc.get('middle_name') or ''
    sn = user_doc.get('surname') or ''
    if fn and sn:
        return fn, mn, sn
    # Fall back: parse from combined name field
    parts = (user_doc.get('name') or '').strip().split()
    if len(parts) >= 2:
        return parts[0], '', parts[-1]
    elif len(parts) == 1:
        return parts[0], '', parts[0]
    return '', '', ''

def get_db():
    from models import get_db as _get_db
    return _get_db()


# ─── SUPERVISOR DASHBOARD ────────────────────────────────────────────────────

@routes_bp.route('/api/supervisor/dashboard', methods=['GET'])
@token_required
@role_required('supervisor')
def get_supervisor_dashboard(current_user):
    db = get_db()

    # 1. All intern-role users  (1 query)
    all_intern_user_docs = {
        str(u['_id']): u
        for u in db.users.find({'role': 'intern'})
    }

    # 2. All intern docs  (1 query)
    all_intern_docs = list(db.interns.find({}))

    # 3. ALL attendance in one shot  (1 query — kills the N+1 problem)
    all_intern_ids = [str(doc['_id']) for doc in all_intern_docs]
    all_attendance = list(db.attendance.find({'intern_id': {'$in': all_intern_ids}}))

    # Group attendance by intern_id
    att_map = defaultdict(list)
    for att in all_attendance:
        att_map[att['intern_id']].append(att)

    # Derive active intern IDs for chart
    active_intern_ids = set()
    for doc in all_intern_docs:
        uid = doc.get('user_id', '')
        if all_intern_user_docs.get(uid, {}).get('is_active'):
            active_intern_ids.add(str(doc['_id']))

    ind_dept = current_user.get('industry_department', '') or 'Software Department'

    # Build interns list + running attendance totals
    active_count = 0
    total_records = 0
    total_present = 0
    interns_list  = []

    for doc in all_intern_docs:
        intern_id = str(doc['_id'])
        uid       = doc.get('user_id', '')
        u         = all_intern_user_docs.get(uid, {})
        is_active = u.get('is_active', False)

        att_records  = att_map[intern_id]
        att_total    = len(att_records)
        att_present  = sum(1 for r in att_records if r.get('status') == 'Present')
        att_pct      = round(att_present / att_total * 100, 1) if att_total else 0.0

        if is_active:
            active_count  += 1
            total_records += att_total
            total_present += att_present

        fn, mn, sn = name_parts(u)

        interns_list.append({
            'id':                  intern_id,
            'name':                u.get('name', ''),
            'first_name':          fn,
            'middle_name':         mn,
            'surname':             sn,
            'phone':               u.get('phone', ''),
            'email_address':       u.get('email_address', '') or '',
            'sex':                 u.get('sex', '') or '',
            'school':              doc.get('school', ''),
            'course_of_study':     doc.get('course_of_study', ''),
            'specialization':      doc.get('specialization', ''),
            'level':               doc.get('level', '') or '',
            'start_date':          doc.get('start_date', '') or '',
            'end_date':            doc.get('end_date', '') or '',
            'duration':            calculate_duration(doc.get('start_date'), doc.get('end_date')),
            'attendance_rate':     att_pct,
            'is_active':           is_active,
            'industry_department': ind_dept,
        })

    avg_attendance = round(total_present / total_records * 100, 1) if total_records else 0.0

    # Attendance chart from already-loaded data
    date_counts = defaultdict(int)
    for att in all_attendance:
        if att.get('intern_id') in active_intern_ids and att.get('status') == 'Present':
            date_counts[att.get('date', '')] += 1

    attendance_chart_data = [
        {'date': d, 'count': c}
        for d, c in sorted(date_counts.items()) if c
    ]

    return jsonify({
        'stats':           {'total_interns': active_count, 'avg_attendance': avg_attendance},
        'interns':         interns_list,
        'attendance_chart': attendance_chart_data,
    })


# ─── INTERN CRUD ─────────────────────────────────────────────────────────────

@routes_bp.route('/api/supervisor/interns', methods=['GET', 'POST'])
@token_required
@role_required('supervisor')
def manage_interns(current_user):
    db = get_db()

    if request.method == 'GET':
        all_intern_user_docs = {str(u['_id']): u for u in db.users.find({'role': 'intern'})}
        all_intern_docs      = list(db.interns.find({}))
        all_intern_ids       = [str(doc['_id']) for doc in all_intern_docs]
        all_attendance       = list(db.attendance.find({'intern_id': {'$in': all_intern_ids}}))
        att_map              = defaultdict(list)
        for att in all_attendance:
            att_map[att['intern_id']].append(att)

        ind_dept = current_user.get('industry_department', '') or 'Software Department'
        result = []
        for doc in all_intern_docs:
            intern_id    = str(doc['_id'])
            uid          = doc.get('user_id', '')
            u            = all_intern_user_docs.get(uid, {})
            att_records  = att_map[intern_id]
            att_total    = len(att_records)
            att_present  = sum(1 for r in att_records if r.get('status') == 'Present')
            att_pct      = round(att_present / att_total * 100, 1) if att_total else 0.0
            fn, mn, sn   = name_parts(u)
            result.append({
                'id':              intern_id,
                'name':            u.get('name', ''),
                'first_name':      fn,
                'middle_name':     mn,
                'surname':         sn,
                'phone':           u.get('phone', ''),
                'email_address':   u.get('email_address', '') or '',
                'sex':             u.get('sex', '') or '',
                'school':          doc.get('school', ''),
                'course_of_study': doc.get('course_of_study', ''),
                'specialization':  doc.get('specialization', ''),
                'level':           doc.get('level', '') or '',
                'start_date':      doc.get('start_date', '') or '',
                'end_date':        doc.get('end_date', '') or '',
                'duration':        calculate_duration(doc.get('start_date'), doc.get('end_date')),
                'attendance_rate': att_pct,
                'is_active':       u.get('is_active', False),
                'industry_department': ind_dept,
            })
        return jsonify(result)

    # POST – register intern
    data = request.get_json() or {}
    first_name    = data.get('first_name', '').strip()
    middle_name   = data.get('middle_name', '').strip()
    surname       = data.get('surname', '').strip()
    phone         = data.get('phone', '').strip()
    email_address = data.get('email_address', '').strip()
    school        = data.get('school', '').strip()
    course_of_study = data.get('course_of_study', '').strip()
    specialization  = data.get('specialization', '').strip()
    start_date    = data.get('start_date', '').strip()
    end_date      = data.get('end_date', '').strip()
    level         = data.get('level', '').strip()
    sex           = data.get('sex', '').strip()

    if not all([first_name, surname, phone, school, course_of_study, specialization]):
        return jsonify({'message': 'First Name, Surname, Phone, School, Course of Study and Specialization are required'}), 400

    name = f"{first_name} {middle_name} {surname}".replace('  ', ' ').strip()

    if db.users.find_one({'name': {'$regex': f'^{safe_regex(name)}$', '$options': 'i'}}):
        return jsonify({'message': f'An intern named "{name}" already exists.'}), 400
    if db.users.find_one({'phone': phone}):
        return jsonify({'message': f'Phone number {phone} is already registered.'}), 400
    if email_address and db.users.find_one({'email_address': email_address}):
        return jsonify({'message': f'Email {email_address} is already registered.'}), 400

    user_id = db.users.insert_one({
        'name':         name,
        'first_name':   first_name,
        'middle_name':  middle_name or None,
        'surname':      surname,
        'sex':          sex or None,
        'phone':        phone,
        'email_address': email_address or None,
        'password_hash': generate_password_hash(surname),
        'role':          'intern',
        'is_active':     True,
        'security_question':    None,
        'security_answer_hash': None,
    }).inserted_id

    intern_id = db.interns.insert_one({
        'user_id':        str(user_id),
        'school':         school,
        'course_of_study': course_of_study,
        'specialization': specialization,
        'level':          level or None,
        'start_date':     start_date or None,
        'end_date':       end_date or None,
        'created_at':     datetime.utcnow().isoformat(),
    }).inserted_id

    return jsonify({'message': 'Intern registered successfully', 'intern_id': str(intern_id)}), 201


# ─── EXPORT (must be defined BEFORE <intern_id> to avoid route conflict) ────

@routes_bp.route('/api/supervisor/interns/export', methods=['GET'])
@token_required
@role_required('supervisor')
def export_interns(current_user):
    db = get_db()
    start_filter = request.args.get('start_date')
    end_filter   = request.args.get('end_date')

    all_intern_user_docs = {str(u['_id']): u for u in db.users.find({'role': 'intern'})}
    all_intern_docs      = list(db.interns.find({}))
    all_intern_ids       = [str(doc['_id']) for doc in all_intern_docs]
    all_attendance       = list(db.attendance.find({'intern_id': {'$in': all_intern_ids}}))
    att_map              = defaultdict(list)
    for att in all_attendance:
        att_map[att['intern_id']].append(att)

    ind_dept = current_user.get('industry_department', '') or 'Software Department'
    result   = []

    for doc in all_intern_docs:
        intern_id   = str(doc['_id'])
        uid         = doc.get('user_id', '')
        u           = all_intern_user_docs.get(uid, {})

        # Date range filter
        if start_filter and end_filter:
            s = doc.get('start_date', '') or ''
            e = doc.get('end_date', '')   or ''
            if not s or not e or s > end_filter or e < start_filter:
                continue

        att_records = att_map[intern_id]
        att_total   = len(att_records)
        att_present = sum(1 for r in att_records if r.get('status') == 'Present')
        att_pct     = round(att_present / att_total * 100, 1) if att_total else 0.0

        result.append({
            'Full Name':          u.get('name', ''),
            'Sex':                u.get('sex', '') or '-',
            'Phone Number':       u.get('phone', ''),
            'Email Address':      u.get('email_address', '') or '-',
            'School':             doc.get('school', ''),
            'Course of Study':    doc.get('course_of_study', ''),
            'Level':              doc.get('level', '') or '-',
            'Specialization':     doc.get('specialization', ''),
            'Industry Dept':      ind_dept,
            'Start Date':         doc.get('start_date', '') or '-',
            'End Date':           doc.get('end_date', '') or '-',
            'Duration':           calculate_duration(doc.get('start_date'), doc.get('end_date')),
            'Attendance Rate (%)': att_pct,
            'Status':             'Active' if u.get('is_active') else 'Inactive',
        })

    return jsonify(result)


# ─── INDIVIDUAL INTERN ───────────────────────────────────────────────────────

@routes_bp.route('/api/supervisor/interns/<intern_id>', methods=['GET', 'PUT', 'DELETE'])
@token_required
@role_required('supervisor')
def intern_detail(current_user, intern_id):
    db = get_db()
    try:
        intern_doc = db.interns.find_one({'_id': ObjectId(intern_id)})
    except (InvalidId, Exception):
        intern_doc = None

    if not intern_doc:
        return jsonify({'message': 'Intern not found'}), 404

    uid      = intern_doc.get('user_id', '')
    try:
        user_doc = db.users.find_one({'_id': ObjectId(uid)}) if uid else None
    except Exception:
        user_doc = None

    if request.method == 'GET':
        att_records = list(db.attendance.find({'intern_id': intern_id}))
        att_total   = len(att_records)
        att_present = sum(1 for r in att_records if r.get('status') == 'Present')
        att_pct     = round(att_present / att_total * 100, 1) if att_total else 0.0
        fn, mn, sn  = name_parts(user_doc or {})
        supervisor  = db.users.find_one({'role': 'supervisor'}) or {}
        return jsonify({
            'id':              intern_id,
            'name':            (user_doc or {}).get('name', ''),
            'first_name':      fn, 'middle_name': mn, 'surname': sn,
            'phone':           (user_doc or {}).get('phone', ''),
            'email_address':   (user_doc or {}).get('email_address', '') or '',
            'sex':             (user_doc or {}).get('sex', '') or '',
            'school':          intern_doc.get('school', ''),
            'course_of_study': intern_doc.get('course_of_study', ''),
            'specialization':  intern_doc.get('specialization', ''),
            'level':           intern_doc.get('level', '') or '',
            'start_date':      intern_doc.get('start_date', '') or '',
            'end_date':        intern_doc.get('end_date', '') or '',
            'duration':        calculate_duration(intern_doc.get('start_date'), intern_doc.get('end_date')),
            'is_active':       (user_doc or {}).get('is_active', False),
            'industry_department': supervisor.get('industry_department', 'Software Department'),
            'attendance_rate': att_pct,
            'attendance_records': [{'date': r.get('date'), 'status': r.get('status')} for r in sorted(att_records, key=lambda x: x.get('date', ''))],
        })

    elif request.method == 'PUT':
        if user_doc is None:
            return jsonify({'message': 'User account not found for this intern. Cannot edit.'}), 404

        data = request.get_json() or {}
        first_name    = data.get('first_name', '').strip()
        middle_name   = data.get('middle_name', '').strip()
        surname       = data.get('surname', '').strip()
        phone         = data.get('phone', '').strip()
        email_address = data.get('email_address', '').strip()
        school        = data.get('school', '').strip()
        course_of_study = data.get('course_of_study', '').strip()
        specialization  = data.get('specialization', '').strip()
        start_date    = data.get('start_date', '').strip()
        end_date      = data.get('end_date', '').strip()
        level         = data.get('level', '').strip()
        sex           = data.get('sex', '').strip()

        if not all([first_name, surname, phone, school, course_of_study, specialization]):
            return jsonify({'message': 'First Name, Surname, Phone, School, Course of Study and Specialization are required'}), 400

        name = f"{first_name} {middle_name} {surname}".replace('  ', ' ').strip()

        # Check name uniqueness (exclude current user)
        existing = db.users.find_one({
            'name': {'$regex': f'^{safe_regex(name)}$', '$options': 'i'},
            '_id':  {'$ne': ObjectId(uid)}
        })
        if existing:
            return jsonify({'message': f'Another intern named "{name}" already exists.'}), 400

        # Check phone uniqueness
        if db.users.find_one({'phone': phone, '_id': {'$ne': ObjectId(uid)}}):
            return jsonify({'message': 'Phone number already used by another user.'}), 400

        # Check email uniqueness
        if email_address and db.users.find_one({'email_address': email_address, '_id': {'$ne': ObjectId(uid)}}):
            return jsonify({'message': 'Email address already used by another user.'}), 400

        db.users.update_one({'_id': ObjectId(uid)}, {'$set': {
            'name':         name,
            'first_name':   first_name,
            'middle_name':  middle_name or None,
            'surname':      surname,
            'sex':          sex or None,
            'phone':        phone,
            'email_address': email_address or None,
        }})
        db.interns.update_one({'_id': ObjectId(intern_id)}, {'$set': {
            'school':         school,
            'course_of_study': course_of_study,
            'specialization': specialization,
            'level':          level or None,
            'start_date':     start_date or None,
            'end_date':       end_date or None,
        }})
        return jsonify({'message': 'Intern profile updated successfully'})

    elif request.method == 'DELETE':
        db.users.delete_one({'_id': ObjectId(uid)})
        db.interns.delete_one({'_id': ObjectId(intern_id)})
        db.attendance.delete_many({'intern_id': intern_id})
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

    uid = intern_doc.get('user_id', '')
    try:
        user_doc = db.users.find_one({'_id': ObjectId(uid)}) if uid else None
    except Exception:
        user_doc = None
    if not user_doc:
        return jsonify({'message': 'User not found'}), 404

    new_status = not user_doc.get('is_active', True)
    db.users.update_one({'_id': ObjectId(uid)}, {'$set': {'is_active': new_status}})
    status_str = 'activated' if new_status else 'deactivated'
    return jsonify({'message': f'Intern {status_str} successfully', 'is_active': new_status})



@routes_bp.route('/api/supervisor/interns/<intern_id>/reset-password', methods=['POST'])
@token_required
@role_required('supervisor')
def reset_intern_password(current_user, intern_id):
    db = get_db()
    try:
        intern_doc = db.interns.find_one({'_id': ObjectId(intern_id)})
    except Exception:
        intern_doc = None
    if not intern_doc:
        return jsonify({'message': 'Intern not found'}), 404

    uid = intern_doc.get('user_id', '')
    try:
        user_doc = db.users.find_one({'_id': ObjectId(uid)}) if uid else None
    except Exception:
        user_doc = None
    if not user_doc:
        return jsonify({'message': 'User not found'}), 404

    surname = user_doc.get('surname') or ''
    if not surname:
        name_words = (user_doc.get('name') or '').strip().split()
        surname = name_words[-1] if name_words else ''
    if not surname:
        return jsonify({'message': 'Cannot determine surname for this intern'}), 400

    db.users.update_one(
        {'_id': ObjectId(uid)},
        {'$set': {'password_hash': generate_password_hash(surname)}}
    )
    return jsonify({'message': f'Password reset successfully', 'new_password': surname})


# ─── ATTENDANCE ───────────────────────────────────────────────────────────────

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
            return jsonify({'message': 'Date parameter required'}), 400

        active_user_ids = [str(u['_id']) for u in db.users.find({'role': 'intern', 'is_active': True})]
        active_interns  = list(db.interns.find({'user_id': {'$in': active_user_ids}}))
        active_intern_ids = [str(doc['_id']) for doc in active_interns]

        records = list(db.attendance.find({'date': date_str, 'intern_id': {'$in': active_intern_ids}}))
        records_map = {r['intern_id']: r['status'] for r in records}

        all_users = {str(u['_id']): u for u in db.users.find({'role': 'intern'})}
        result = []
        for doc in active_interns:
            intern_id = str(doc['_id'])
            u = all_users.get(doc.get('user_id', ''), {})
            result.append({
                'intern_id': intern_id,
                'name':      u.get('name', ''),
                'status':    records_map.get(intern_id, 'Absent'),
            })
        return jsonify({'date': date_str, 'is_logged': len(records) > 0, 'records': result})

    elif request.method == 'POST':
        data = request.get_json() or {}
        date_str = data.get('date', '')
        records  = data.get('records', [])
        if not date_str or not records:
            return jsonify({'message': 'Date and records are required'}), 400
        try:
            target_date = datetime.strptime(date_str, '%Y-%m-%d')
        except ValueError:
            return jsonify({'message': 'Invalid date format (YYYY-MM-DD)'}), 400
        if target_date.weekday() != 3:
            return jsonify({'message': 'Attendance can only be logged for Thursdays.'}), 400
        for rec in records:
            if rec.get('status') not in ('Present', 'Absent'):
                return jsonify({'message': f"Invalid status: {rec.get('status')}"}), 400
            db.attendance.update_one(
                {'intern_id': rec['intern_id'], 'date': date_str},
                {'$set': {'status': rec['status'], 'created_at': datetime.utcnow().isoformat()}},
                upsert=True
            )
        return jsonify({'message': 'Attendance saved successfully'})


# ─── SUPERVISOR PROFILE ───────────────────────────────────────────────────────

@routes_bp.route('/api/supervisor/profile', methods=['GET', 'POST'])
@token_required
@role_required('supervisor')
def manage_supervisor_profile(current_user):
    db = get_db()

    if request.method == 'GET':
        return jsonify({
            'name':                current_user.get('name', ''),
            'email_address':       current_user.get('email_address', '') or '',
            'phone':               current_user.get('phone', ''),
            'industry_department': current_user.get('industry_department', '') or '',
            'security_question':   current_user.get('security_question', '') or '',
        })

    data = request.get_json() or {}
    user_id = str(current_user['_id'])

    # ── Biodata save
    if 'name' in data:
        name  = data.get('name', '').strip()
        phone = data.get('phone', '').strip()
        email = data.get('email_address', '').strip()
        dept  = data.get('industry_department', '').strip()
        if not name or not phone or not dept:
            return jsonify({'message': 'Name, Phone and Industry Department are required'}), 400
        if db.users.find_one({'phone': phone, '_id': {'$ne': ObjectId(user_id)}}):
            return jsonify({'message': 'Phone number already in use'}), 400
        if email and db.users.find_one({'email_address': email, '_id': {'$ne': ObjectId(user_id)}}):
            return jsonify({'message': 'Email address already in use'}), 400
        db.users.update_one({'_id': ObjectId(user_id)}, {'$set': {
            'name': name, 'phone': phone,
            'email_address': email or None,
            'industry_department': dept,
        }})
        updated = db.users.find_one({'_id': ObjectId(user_id)})
        return jsonify({'message': 'Profile saved successfully!', 'user': {
            'name': updated.get('name'), 'phone': updated.get('phone'),
            'email_address': updated.get('email_address', ''),
            'industry_department': updated.get('industry_department', ''),
            'role': updated.get('role'),
        }})

    # ── Password change
    if 'current_password' in data:
        cur = data.get('current_password', '')
        new = data.get('new_password', '')
        con = data.get('confirm_password', '')
        if not cur or not new:
            return jsonify({'message': 'Current and new passwords are required'}), 400
        if not check_password_hash(current_user.get('password_hash', ''), cur):
            return jsonify({'message': 'Incorrect current password'}), 400
        if new != con:
            return jsonify({'message': 'New passwords do not match'}), 400
        if len(new) < 4:
            return jsonify({'message': 'Password must be at least 4 characters'}), 400
        db.users.update_one({'_id': ObjectId(user_id)}, {'$set': {'password_hash': generate_password_hash(new)}})
        return jsonify({'message': 'Password updated successfully'})

    # ── Security question
    if 'security_question' in data:
        sq = data.get('security_question', '').strip()
        sa = data.get('security_answer', '').strip()
        if not sq or not sa:
            return jsonify({'message': 'Both security question and answer are required'}), 400
        db.users.update_one({'_id': ObjectId(user_id)}, {'$set': {
            'security_question':    sq,
            'security_answer_hash': generate_password_hash(sa.lower()),
        }})
        return jsonify({'message': 'Security question configured successfully'})

    return jsonify({'message': 'No recognised update fields provided'}), 400


# ─── INTERN DASHBOARD ─────────────────────────────────────────────────────────

@routes_bp.route('/api/intern/dashboard', methods=['GET'])
@token_required
@role_required('intern')
def get_intern_dashboard(current_user):
    db = get_db()
    user_id  = str(current_user['_id'])
    intern_doc = db.interns.find_one({'user_id': user_id})
    if not intern_doc:
        return jsonify({'message': 'Intern profile not found'}), 404

    intern_id   = str(intern_doc['_id'])
    supervisor  = db.users.find_one({'role': 'supervisor'}) or {}
    ind_dept    = supervisor.get('industry_department', 'Software Department')

    att_records = list(db.attendance.find({'intern_id': intern_id}))
    att_records.sort(key=lambda x: x.get('date', ''), reverse=True)
    attended    = sum(1 for r in att_records if r.get('status') == 'Present')
    absent      = len(att_records) - attended
    att_pct     = round(attended / len(att_records) * 100, 1) if att_records else 0.0
    fn, mn, sn  = name_parts(current_user)

    return jsonify({
        'profile': {
            'name':            current_user.get('name', ''),
            'first_name':      fn, 'middle_name': mn, 'surname': sn,
            'phone':           current_user.get('phone', ''),
            'email_address':   current_user.get('email_address', '') or '',
            'sex':             current_user.get('sex', '') or '',
            'school':          intern_doc.get('school', ''),
            'course_of_study': intern_doc.get('course_of_study', ''),
            'specialization':  intern_doc.get('specialization', ''),
            'level':           intern_doc.get('level', '') or '',
            'industry_department': ind_dept,
            'start_date':      intern_doc.get('start_date', '') or '',
            'end_date':        intern_doc.get('end_date', '') or '',
            'duration':        calculate_duration(intern_doc.get('start_date'), intern_doc.get('end_date')),
        },
        'attendance_summary': {
            'total_thursdays': len(att_records),
            'attended':        attended,
            'absent':          absent,
            'attendance_rate': att_pct,
        },
        'attendance_history': [
            {'date': r.get('date'), 'status': r.get('status'), 'id': str(r['_id'])}
            for r in att_records
        ],
    })


# ─── REPORT (shared – supervisor + intern) ───────────────────────────────────

@routes_bp.route('/api/interns/<intern_id>/report', methods=['GET'])
@token_required
def get_intern_report(current_user, intern_id):
    db = get_db()
    if current_user.get('role') == 'intern':
        my_intern = db.interns.find_one({'user_id': str(current_user['_id'])})
        if not my_intern or str(my_intern['_id']) != intern_id:
            return jsonify({'message': 'Access forbidden'}), 403

    try:
        intern_doc = db.interns.find_one({'_id': ObjectId(intern_id)})
    except Exception:
        intern_doc = None
    if not intern_doc:
        return jsonify({'message': 'Intern not found'}), 404

    uid = intern_doc.get('user_id', '')
    try:
        user_doc = db.users.find_one({'_id': ObjectId(uid)}) if uid else None
    except Exception:
        user_doc = None

    supervisor = db.users.find_one({'role': 'supervisor'}) or {}
    ind_dept   = supervisor.get('industry_department', 'Software Department')

    att_records = list(db.attendance.find({'intern_id': intern_id}))
    att_records.sort(key=lambda x: x.get('date', ''))
    attended    = sum(1 for r in att_records if r.get('status') == 'Present')
    att_pct     = round(attended / len(att_records) * 100, 1) if att_records else 0.0
    fn, mn, sn  = name_parts(user_doc or {})

    return jsonify({
        'profile': {
            'name':            (user_doc or {}).get('name', ''),
            'first_name':      fn, 'middle_name': mn, 'surname': sn,
            'phone':           (user_doc or {}).get('phone', ''),
            'email_address':   (user_doc or {}).get('email_address', '') or '',
            'sex':             (user_doc or {}).get('sex', '') or '',
            'school':          intern_doc.get('school', ''),
            'course_of_study': intern_doc.get('course_of_study', ''),
            'specialization':  intern_doc.get('specialization', ''),
            'level':           intern_doc.get('level', '') or '',
            'industry_department': ind_dept,
            'start_date':      intern_doc.get('start_date', '') or '',
            'end_date':        intern_doc.get('end_date', '') or '',
            'duration':        calculate_duration(intern_doc.get('start_date'), intern_doc.get('end_date')),
            'is_active':       (user_doc or {}).get('is_active', False),
        },
        'attendance': {
            'total':      len(att_records),
            'present':    attended,
            'absent':     len(att_records) - attended,
            'percentage': att_pct,
            'records':    [{'date': r.get('date'), 'status': r.get('status')} for r in att_records],
        },
    })
