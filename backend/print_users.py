from app import create_app
from models import db, User

app = create_app()
with app.app_context():
    users = User.query.all()
    print(f"Total users in DB: {len(users)}")
    for u in users:
        print(f"ID: {u.id}, Name: '{u.name}', Email: '{u.email_address}', Phone: '{u.phone}', Role: '{u.role}', Active: {u.is_active}")
