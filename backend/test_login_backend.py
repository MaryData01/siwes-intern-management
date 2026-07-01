from app import create_app
from models import db, User
from sqlalchemy import func
from werkzeug.security import check_password_hash

app = create_app()
with app.app_context():
    username = "sIwEs SuPeRvIsOr"
    password = "supervisor123"
    
    # Try supervisor lookup
    user = User.query.filter(
        User.role == 'supervisor',
        (func.lower(User.email_address) == func.lower(username)) |
        (User.phone == username) |
        (func.lower(User.name) == func.lower(username))
    ).first()
    
    print(f"User found: {user is not None}")
    if user:
        print(f"User Name: '{user.name}'")
        print(f"User Email: '{user.email_address}'")
        print(f"User Password Hash: '{user.password_hash}'")
        pwd_match = check_password_hash(user.password_hash, password)
        print(f"Password Match: {pwd_match}")
