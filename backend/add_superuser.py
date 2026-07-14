"""
Run this ONCE to add the superuser account to your live MongoDB database.
Usage:  python add_superuser.py
"""
from dotenv import load_dotenv
load_dotenv()

from models import get_db
from werkzeug.security import generate_password_hash

db = get_db()

# Check if superuser already exists
existing = db.users.find_one({'role': 'superuser'})
if existing:
    print(f"Superuser already exists: {existing.get('email_address')} / {existing.get('name')}")
    print("No changes made.")
else:
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
    print("Superuser created successfully!")
    print("Login: admin@siwes.com / admin2026")
    print("IMPORTANT: Change this password after your first login.")
