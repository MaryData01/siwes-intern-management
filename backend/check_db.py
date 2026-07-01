from dotenv import load_dotenv
load_dotenv()
from models import get_db

db = get_db()
count = db.users.count_documents({})
print("Users in database:", count)

if count == 0:
    print("Database is empty - running seed...")
    from app import seed_database
    seed_database()
    print("Seed complete! Users now:", db.users.count_documents({}))
else:
    print("Users found:")
    for user in db.users.find():
        print(f"  - {user.get('name')} | {user.get('email_address')} | role: {user.get('role')}")