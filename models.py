import hashlib
from extensions import db
import secrets
from datetime import datetime

class User(db.Model):
    """Gère les comptes utilisateurs et l'authentification."""
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    
    # Lien vers tous les avis de cet utilisateur
    avis = db.relationship('Avis', backref='user', lazy=True, cascade="all, delete-orphan")

class Serie(db.Model):
    """
    Cache enrichi des séries TV basé sur les données de TVmaze.
    """
    id = db.Column(db.Integer, primary_key=True)
    tvmaze_id = db.Column(db.Integer, unique=True, nullable=False)
    title = db.Column(db.String(255), nullable=False)
    image_url = db.Column(db.String(500), nullable=True)
    
    # Nouveaux champs basés sur ton API
    genres = db.Column(db.String(255))      # Ex: "Drama, Sci-Fi"
    status = db.Column(db.String(50))      # Ex: "Ended" ou "Running"
    premiere = db.Column(db.String(50))    # Date de début
    fin = db.Column(db.String(50))         # Date de fin
    rating = db.Column(db.Float)           # Note moyenne (ex: 8.5)
    saisons = db.Column(db.Integer)        # Nombre de saisons
    resume = db.Column(db.Text)            # Le résumé (show.summary)

    # Relation vers les avis
    avis = db.relationship('Avis', backref='serie', lazy=True)

class Avis(db.Model):
    """
    Table pivot stockant les choix de l'utilisateur.
    C'est cette table qui "sauvegarde" l'état du menu déroulant.
    """
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    serie_id = db.Column(db.Integer, db.ForeignKey('serie.id'), nullable=False)
    
    # Les 5 états autorisés (String pour la simplicité, ou Enum pour la rigueur)
    # Valeurs : 'vu_aime', 'vu_pas_aime', 'vu_neutre', 'interesse', 'pas_interesse'
    ressenti = db.Column(db.String(30), nullable=False)
    
    date_maj = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Sécurité : Empêche un utilisateur d'avoir 2 lignes pour la même série
    __table_args__ = (db.UniqueConstraint('user_id', 'serie_id', name='_user_serie_uc'),)