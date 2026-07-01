import os
from flask import Flask, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
from werkzeug.security import generate_password_hash
from datetime import datetime, date

# Load environment variables
load_dotenv()

from models import get_db
from auth import auth_bp
from routes import routes_bp

def create_app():
    app = Flask(__name__)
    CORS(app)
    
    # Configure and verify MongoDB connection
    mongo_uri = os.environ.get('MONGODB_URI')
    if not mongo_uri:
        print("WARNING: MONGODB_URI environment variable is not set! App will still start, but database requests will fail.")
    else:
        try:
            db = get_db()
            # Run a dummy command to force connection verification
            db.command("ping")
            print("MongoDB connection verified successfully.")
        except Exception as e:
            print("WARNING: MongoDB connection failed:", e)
    
    # Register Blueprints
    app.register_blueprint(auth_bp)
    app.register_blueprint(routes_bp)
    
    @app.route('/')
    def index():
        return jsonify({
            'status': 'active',
            'system': 'SIWES Intern Management API',
            'database': 'MongoDB Atlas' if mongo_uri else 'Not connected'
        })
        
    # Seed database if users collection is empty
    try:
        seed_database()
    except Exception as e:
        print("Error during database seeding:", e)
        
    return app

def seed_database():
    db = get_db()
    
    # Check if supervisor exists or users collection is empty
    if db.users.count_documents({}) == 0:
        print("Users collection is empty. Seeding database...")
        
        # 1. Seed Supervisor
        supervisor_id = db.users.insert_one({
            'name': 'SIWES Supervisor',
            'email_address': 'supervisor@siwes.com',
            'phone': '08000000000',
            'password_hash': generate_password_hash('supervisor123'),
            'role': 'supervisor',
            'is_active': True,
            'industry_department': 'Software Department',
            'security_question': 'What was the name of your first school?',
            'security_answer_hash': generate_password_hash('primary')
        }).inserted_id
        
        print("Supervisor seeded: supervisor@siwes.com / supervisor123 / phone: 08000000000")
        
        # 2. Seed Mock Interns
        intern_data = [
            {
                'name': 'Mary Johnson',
                'phone': '08011112222',
                'email_address': 'mary.johnson@example.com',
                'school': 'University of Lagos',
                'course_of_study': 'Computer Science',
                'specialization': 'Software Engineering',
                'surname': 'Johnson'
            },
            {
                'name': 'David Adeleke',
                'phone': '08033334444',
                'email_address': 'david.adeleke@example.com',
                'school': 'Covenant University',
                'course_of_study': 'Electrical Engineering',
                'specialization': 'Embedded Systems',
                'surname': 'Adeleke'
            },
            {
                'name': 'Chinedu Okafor',
                'phone': '08055556666',
                'email_address': 'chinedu.okafor@example.com',
                'school': 'University of Ibadan',
                'course_of_study': 'Information Technology',
                'specialization': 'Cybersecurity',
                'surname': 'Okafor'
            }
        ]
        
        intern_ids_map = {}
        for item in intern_data:
            user_id = db.users.insert_one({
                'name': item['name'],
                'phone': item['phone'],
                'email_address': item['email_address'],
                'password_hash': generate_password_hash(item['surname']),
                'role': 'intern',
                'is_active': True,
                'security_question': 'What is the name of your first pet?',
                'security_answer_hash': generate_password_hash('dog')
            }).inserted_id
            
            intern_id = db.interns.insert_one({
                'user_id': str(user_id),
                'school': item['school'],
                'course_of_study': item['course_of_study'],
                'specialization': item['specialization'],
                'created_at': datetime.utcnow().isoformat()
            }).inserted_id
            
            intern_ids_map[item['name']] = str(intern_id)
        
        # 3. Seed Thursday Attendance dates
        att_dates = [
            '2026-06-04',
            '2026-06-11',
            '2026-06-18',
            '2026-06-25'
        ]
        
        att_statuses = {
            'Mary Johnson': ['Present', 'Present', 'Present', 'Present'],
            'David Adeleke': ['Present', 'Absent', 'Present', 'Present'],
            'Chinedu Okafor': ['Present', 'Present', 'Absent', 'Present']
        }
        
        for i, att_date in enumerate(att_dates):
            for name, status_list in att_statuses.items():
                intern_id = intern_ids_map.get(name)
                if intern_id:
                    db.attendance.insert_one({
                        'intern_id': intern_id,
                        'date': att_date,
                        'status': status_list[i],
                        'created_at': datetime.utcnow().isoformat()
                    })
                    
        print("Demo data successfully seeded.")

if __name__ == '__main__':
    app = create_app()
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=True)
