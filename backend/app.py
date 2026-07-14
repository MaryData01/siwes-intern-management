import os
from flask import Flask, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
from werkzeug.security import generate_password_hash
from datetime import datetime

load_dotenv()

from models import get_db
from auth import auth_bp
from routes import routes_bp

def create_app():
    app = Flask(__name__)
    CORS(app, resources={r"/api/*": {"origins": "*"}})

    mongo_uri = os.environ.get('MONGODB_URI')
    if not mongo_uri:
        print("WARNING: MONGODB_URI not set!")
    else:
        try:
            db = get_db()
            db.command("ping")
            print("MongoDB connection verified successfully.")
        except Exception as e:
            print(f"WARNING: MongoDB connection failed: {e}")

    app.register_blueprint(auth_bp)
    app.register_blueprint(routes_bp)

    @app.route('/')
    def index():
        return jsonify({
            'status':   'active',
            'system':   'SIWES Intern Management API',
            'database': 'MongoDB Atlas' if mongo_uri else 'Not connected',
        })

    try:
        seed_database()
    except Exception as e:
        print(f"Seeding error: {e}")

    return app


def seed_database():
    db = get_db()
    if db.users.count_documents({}) > 0:
        return  # Already seeded – never wipe existing data

    print("Empty database detected. Seeding default accounts...")

    # ── Superuser (Mary / system owner)
    db.users.insert_one({
        'name':                'System Admin',
        'first_name':          'System',
        'middle_name':         None,
        'surname':             'Admin',
        'email_address':       'admin@siwes.com',
        'phone':               '00000000000',
        'password_hash':       generate_password_hash('admin2026'),
        'role':                'superuser',
        'is_active':           True,
        'industry_department': None,
        'security_question':   'What is the name of this system?',
        'security_answer_hash': generate_password_hash('siwes'),
    })
    print("Superuser seeded: admin@siwes.com / admin2026")

    # ── Supervisor
    supervisor_id = db.users.insert_one({
        'name':                'SIWES Supervisor',
        'first_name':          'SIWES',
        'middle_name':         None,
        'surname':             'Supervisor',
        'email_address':       'supervisor@siwes.com',
        'phone':               '08000000000',
        'password_hash':       generate_password_hash('supervisor123'),
        'role':                'supervisor',
        'is_active':           True,
        'industry_department': 'Software Department',
        'security_question':   'What was the name of your first school?',
        'security_answer_hash': generate_password_hash('primary'),
    }).inserted_id
    print("Supervisor seeded: supervisor@siwes.com / supervisor123")

    # ── Demo interns
    demo_interns = [
        {
            'first_name': 'Mary', 'middle_name': None, 'surname': 'Johnson',
            'phone': '08011112222', 'email_address': 'mary.johnson@example.com',
            'sex': 'Female',
            'school': 'University of Lagos', 'course_of_study': 'Computer Science',
            'specialization': 'Software Engineering', 'level': '400 Level',
            'start_date': '2026-01-06', 'end_date': '2026-07-04',
        },
        {
            'first_name': 'David', 'middle_name': None, 'surname': 'Adeleke',
            'phone': '08033334444', 'email_address': 'david.adeleke@example.com',
            'sex': 'Male',
            'school': 'Covenant University', 'course_of_study': 'Electrical Engineering',
            'specialization': 'Embedded Systems', 'level': '300 Level',
            'start_date': '2026-01-06', 'end_date': '2026-07-04',
        },
        {
            'first_name': 'Chinedu', 'middle_name': None, 'surname': 'Okafor',
            'phone': '08055556666', 'email_address': 'chinedu.okafor@example.com',
            'sex': 'Male',
            'school': 'University of Ibadan', 'course_of_study': 'Information Technology',
            'specialization': 'Cybersecurity', 'level': '400 Level',
            'start_date': '2026-01-06', 'end_date': '2026-07-04',
        },
    ]

    att_dates    = ['2026-06-04', '2026-06-11', '2026-06-18', '2026-06-25']
    att_statuses = [
        ['Present', 'Present', 'Present', 'Present'],
        ['Present', 'Absent',  'Present', 'Present'],
        ['Present', 'Present', 'Absent',  'Present'],
    ]

    for idx, intern_data in enumerate(demo_interns):
        name = intern_data['first_name'] + ' ' + intern_data['surname']
        user_id = db.users.insert_one({
            'name':         name,
            'first_name':   intern_data['first_name'],
            'middle_name':  intern_data['middle_name'],
            'surname':      intern_data['surname'],
            'sex':          intern_data['sex'],
            'phone':        intern_data['phone'],
            'email_address': intern_data['email_address'],
            'password_hash': generate_password_hash(intern_data['surname']),
            'role':          'intern',
            'is_active':     True,
            'security_question':    'What is the name of your first pet?',
            'security_answer_hash': generate_password_hash('dog'),
        }).inserted_id

        intern_id = db.interns.insert_one({
            'user_id':        str(user_id),
            'school':         intern_data['school'],
            'course_of_study': intern_data['course_of_study'],
            'specialization': intern_data['specialization'],
            'level':          intern_data['level'],
            'start_date':     intern_data['start_date'],
            'end_date':       intern_data['end_date'],
            'created_at':     datetime.utcnow().isoformat(),
        }).inserted_id

        for d_idx, att_date in enumerate(att_dates):
            db.attendance.insert_one({
                'intern_id': str(intern_id),
                'date':      att_date,
                'status':    att_statuses[idx][d_idx],
                'created_at': datetime.utcnow().isoformat(),
            })

    print("Demo data seeded successfully.")


if __name__ == '__main__':
    app  = create_app()
    port = int(os.environ.get('PORT', 5004))
    app.run(host='0.0.0.0', port=port, debug=True)
