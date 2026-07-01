import os
from flask import Flask, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
from werkzeug.security import generate_password_hash
from datetime import datetime, date

# Load environment variables
load_dotenv()

from models import db, User, Intern, Attendance
from auth import auth_bp
from routes import routes_bp

def create_app():
    app = Flask(__name__)
    CORS(app)
    
    # Configure database URI
    db_url = os.environ.get('SUPABASE_DB_URL')
    use_sqlite = False
    
    if db_url and 'postgresql' in db_url:
        try:
            import psycopg2
            # Quick connection test with a 2-second timeout
            conn = psycopg2.connect(db_url, connect_timeout=2)
            conn.close()
        except Exception as e:
            print("PostgreSQL database connection failed, falling back to SQLite:", e)
            use_sqlite = True
            
    if not db_url or use_sqlite:
        db_url = 'sqlite:///intern_management.db'
        
    app.config['SQLALCHEMY_DATABASE_URI'] = db_url
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    
    db.init_app(app)
    
    # Register Blueprints
    app.register_blueprint(auth_bp)
    app.register_blueprint(routes_bp)
    
    @app.route('/')
    def index():
        return jsonify({
            'status': 'active',
            'system': 'SIWES Intern Management API',
            'database': 'PostgreSQL' if 'postgresql' in db_url else 'SQLite fallback'
        })
        
    # Initialize and seed database
    with app.app_context():
        # For development re-creation, we can drop tables if structure changes, 
        # but since we are running locally, let's keep it safe. 
        # Wait, if schema changed, it is best to drop tables and recreate them so that SQLite runs cleanly! ---dropped
        # Let's drop all tables and recreate them to avoid schema mismatch errors!
        db.create_all()
        seed_database()
        
    return app

def seed_database():
    # 1. Seed Supervisor
    supervisor = User.query.filter_by(role='supervisor').first()
    if not supervisor:
        supervisor = User(
            name='SIWES Supervisor',
            email_address='supervisor@siwes.com',
            phone='08000000000',
            password_hash=generate_password_hash('supervisor123'),
            role='supervisor',
            is_active=True,
            industry_department='Software Department',
            security_question='What was the name of your first school?',
            security_answer_hash=generate_password_hash('primary')
        )
        db.session.add(supervisor)
        db.session.commit()
        print("Supervisor seeded: supervisor@siwes.com / supervisor123 / phone: 08000000000")
        
        # 2. Seed Mock Interns
        if Intern.query.count() == 0:
            print("Seeding mock interns and attendance logs...")
            
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
            
            interns_objs = []
            for item in intern_data:
                user = User(
                    name=item['name'],
                    phone=item['phone'],
                    email_address=item['email_address'],
                    password_hash=generate_password_hash(item['surname']),
                    role='intern',
                    is_active=True,
                    security_question='What is the name of your first pet?',
                    security_answer_hash=generate_password_hash('dog') # default answers
                )
                db.session.add(user)
                db.session.flush()
                
                intern = Intern(
                    user_id=user.id,
                    school=item['school'],
                    course_of_study=item['course_of_study'],
                    specialization=item['specialization']
                )
                db.session.add(intern)
                interns_objs.append(intern)
            db.session.flush()
            
            # 3. Seed Thursday Attendance dates
            att_dates = [
                date(2026, 6, 4),
                date(2026, 6, 11),
                date(2026, 6, 18),
                date(2026, 6, 25)
            ]
            
            att_statuses = {
                'Mary Johnson': ['Present', 'Present', 'Present', 'Present'],
                'David Adeleke': ['Present', 'Absent', 'Present', 'Present'],
                'Chinedu Okafor': ['Present', 'Present', 'Absent', 'Present']
            }
            
            for i, att_date in enumerate(att_dates):
                for intern in interns_objs:
                    status = att_statuses[intern.user.name][i]
                    att_rec = Attendance(
                        intern_id=intern.id,
                        date=att_date,
                        status=status
                    )
                    db.session.add(att_rec)
                    
            db.session.commit()
            print("Demo data successfully seeded.")

if __name__ == '__main__':
    app = create_app()
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=True)
