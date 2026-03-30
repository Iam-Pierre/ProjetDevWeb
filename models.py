import hashlib
from extensions import db
import secrets

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    quota_used = db.Column(db.Integer, default=0, nullable=False)
    quota_max = db.Column(db.Integer, default=100, nullable=False)

    def consume_quota(self, amount=1):
        if self.quota_used + amount > self.quota_max:
            return False
        self.quota_used += amount
        db.session.commit()
        return True
    
    @classmethod
    def get_by_username(cls, username):
        return cls.query.filter_by(username=username).first()

class ApiKey(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    label = db.Column(db.String(100), nullable=False)
    key_hash = db.Column(db.String(255), unique=True, nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    user = db.relationship("User", backref="api_keys")

    def to_dict(self):
        return {
            "id": self.id,
            "label": self.label
        }

    @classmethod
    def get_by_key(cls, raw_key):
        key_hash = hashlib.sha256(raw_key.encode()).hexdigest()
        return cls.query.filter_by(key_hash=key_hash).first()

    @classmethod
    def new(cls, user, label):
        raw_key = secrets.token_urlsafe(32)
        key_hash = hashlib.sha256(raw_key.encode()).hexdigest()

        api_key = cls(label=label,key_hash=key_hash,user_id=user.id)

        db.session.add(api_key)
        db.session.commit()

        return raw_key, api_key
