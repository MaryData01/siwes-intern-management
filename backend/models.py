import os
from datetime import datetime
from pymongo import MongoClient
from bson import ObjectId

_mongo_client = None

def get_db():
    global _mongo_client
    if _mongo_client is None:
        mongo_uri = os.environ.get('MONGODB_URI')
        if not mongo_uri:
            print("WARNING: MONGODB_URI environment variable is not set!")
            mongo_uri = "mongodb://localhost:27017/siwes"
        _mongo_client = MongoClient(mongo_uri)
    
    try:
        db = _mongo_client.get_default_database()
    except Exception:
        db = _mongo_client['siwes']
    return db

class MongoUser:
    def __init__(self, doc):
        self._doc = doc
        
    @property
    def id(self):
        return str(self._doc['_id'])
        
    def __getattr__(self, name):
        if name in self._doc:
            return self._doc[name]
        return None
        
    def __setattr__(self, name, value):
        if name == '_doc':
            super().__setattr__(name, value)
        else:
            self._doc[name] = value
            get_db().users.update_one({'_id': self._doc['_id']}, {'$set': {name: value}})
            
    @property
    def intern_profile(self):
        db = get_db()
        intern_doc = db.interns.find_one({'user_id': self.id})
        return MongoIntern(intern_doc) if intern_doc else None

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'email_address': self.email_address,
            'phone': self.phone,
            'role': self.role,
            'is_active': self.is_active,
            'industry_department': self.industry_department,
            'security_question': self.security_question
        }

class MongoIntern:
    def __init__(self, doc):
        self._doc = doc
        
    @property
    def id(self):
        return str(self._doc['_id'])
        
    def __getattr__(self, name):
        if name in self._doc:
            return self._doc[name]
        return None
        
    def __setattr__(self, name, value):
        if name == '_doc':
            super().__setattr__(name, value)
        else:
            self._doc[name] = value
            get_db().interns.update_one({'_id': self._doc['_id']}, {'$set': {name: value}})
            
    @property
    def user(self):
        db = get_db()
        try:
            user_doc = db.users.find_one({'_id': ObjectId(self._doc['user_id'])})
        except Exception:
            user_doc = None
        return MongoUser(user_doc) if user_doc else None
        
    @property
    def attendance_records(self):
        db = get_db()
        records = list(db.attendance.find({'intern_id': self.id}))
        records = sorted(records, key=lambda x: x['date'])
        return [MongoAttendance(r) for r in records]
        
    def to_dict(self):
        u = self.user
        att_records = self.attendance_records
        att_total = len(att_records)
        att_present = sum(1 for r in att_records if r.status == 'Present')
        att_pct = (att_present / att_total * 100) if att_total > 0 else 0.0
        
        return {
            'id': self.id,
            'user_id': self.user_id,
            'name': u.name if u else '',
            'phone': u.phone if u else '',
            'email_address': u.email_address if u else '',
            'is_active': u.is_active if u else False,
            'school': self.school,
            'course_of_study': self.course_of_study,
            'specialization': self.specialization,
            'attendance_rate': round(att_pct, 1),
            'created_at': self.created_at
        }

class MongoAttendance:
    def __init__(self, doc):
        self._doc = doc
        
    @property
    def id(self):
        return str(self._doc['_id'])
        
    def __getattr__(self, name):
        if name in self._doc:
            return self._doc[name]
        return None
        
    def __setattr__(self, name, value):
        if name == '_doc':
            super().__setattr__(name, value)
        else:
            self._doc[name] = value
            get_db().attendance.update_one({'_id': self._doc['_id']}, {'$set': {name: value}})
            
    def to_dict(self):
        return {
            'id': self.id,
            'intern_id': self.intern_id,
            'date': self.date,
            'status': self.status,
            'created_at': self.created_at
        }
