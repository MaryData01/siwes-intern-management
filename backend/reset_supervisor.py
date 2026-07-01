from dotenv import load_dotenv
load_dotenv()
from models import get_db
from werkzeug.security import generate_password_hash

db = get_db()

result = db.users.update_one(
    {"role": "supervisor"},
    {"$set": {
        "name": "SIWES Supervisor",
        "email_address": "supervisor@siwes.com",
        "phone": "08000000000",
        "password_hash": generate_password_hash("supervisor123"),
        "industry_department": "Software Department"
    }}
)

print("Supervisor reset:", result.modified_count, "document updated")

# Verify
supervisor = db.users.find_one({"role": "supervisor"})
print("Supervisor now:", supervisor.get("name"), "|", supervisor.get("email_address"))