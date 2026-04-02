import hashlib
from extensions import db
import secrets
from datetime import datetime

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    
    # lien vers tous les avis de l'user
    avis = db.relationship('Avis', backref='user', lazy=True, cascade="all, delete-orphan")

    @classmethod
    def get_by_username(cls, username):
        return cls.query.filter_by(username=username).first()
class Serie(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    tvmaze_id = db.Column(db.Integer, unique=True, nullable=False)
    title = db.Column(db.String(255), nullable=False)
    image_url = db.Column(db.String(500), nullable=True)
    genres = db.Column(db.String(255))      
    status = db.Column(db.String(50))      
    premiere = db.Column(db.String(50))    
    fin = db.Column(db.String(50))         
    rating = db.Column(db.Float)           
    saisons = db.Column(db.Integer)       
    resume = db.Column(db.Text)            

    avis = db.relationship('Avis', backref='serie', lazy=True)

class Avis(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    serie_id = db.Column(db.Integer, db.ForeignKey('serie.id'), nullable=False)
    

    ressenti = db.Column(db.String(30), nullable=False)
    
    date_maj = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # empêche un utilisateur d'avoir 2 lignes pour la même série
    __table_args__ = (db.UniqueConstraint('user_id', 'serie_id', name='_user_serie_uc'),)