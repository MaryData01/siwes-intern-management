from datetime import datetime
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

class User(db.Model):
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), nullable=False)
    email_address = db.Column(db.String(255), unique=True, nullable=True) # Nullable for interns
    phone = db.Column(db.String(50), unique=True, nullable=False) # Unique and Required
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(50), nullable=False) # 'supervisor' or 'intern'
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    industry_department = db.Column(db.String(255), nullable=True) # supervisor only
    security_question = db.Column(db.String(255), nullable=True)
    security_answer_hash = db.Column(db.String(255), nullable=True)
    
    # Relationship to intern profile (1-to-1)
    intern_profile = db.relationship('Intern', backref='user', cascade='all, delete-orphan', uselist=False)

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

class Intern(db.Model):
    __tablename__ = 'interns'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    school = db.Column(db.String(255), nullable=False)
    course_of_study = db.Column(db.String(255), nullable=False) # renamed from department
    specialization = db.Column(db.String(255), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationships
    attendance_records = db.relationship('Attendance', backref='intern', cascade='all, delete-orphan')

    def to_dict(self):
        att_records = self.attendance_records
        att_total = len(att_records)
        att_present = sum(1 for r in att_records if r.status == 'Present')
        att_pct = (att_present / att_total * 100) if att_total > 0 else 0.0
        
        return {
            'id': self.id,
            'user_id': self.user_id,
            'name': self.user.name,
            'phone': self.user.phone,
            'email_address': self.user.email_address,
            'is_active': self.user.is_active,
            'school': self.school,
            'course_of_study': self.course_of_study,
            'specialization': self.specialization,
            'attendance_rate': round(att_pct, 1),
            'created_at': self.created_at.isoformat()
        }

class Attendance(db.Model):
    __tablename__ = 'attendance'
    __table_args__ = (
        db.UniqueConstraint('intern_id', 'date', name='uq_intern_date'),
    )
    
    id = db.Column(db.Integer, primary_key=True)
    intern_id = db.Column(db.Integer, db.ForeignKey('interns.id', ondelete='CASCADE'), nullable=False)
    date = db.Column(db.Date, nullable=False) # Needs to be a Thursday date
    status = db.Column(db.String(20), nullable=False) # 'Present' or 'Absent'
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    def to_dict(self):
        return {
            'id': self.id,
            'intern_id': self.intern_id,
            'date': self.date.isoformat(),
            'status': self.status,
            'created_at': self.created_at.isoformat()
        }
