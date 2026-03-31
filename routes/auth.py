from flask import Blueprint, request, session, g
from werkzeug.security import generate_password_hash, check_password_hash
import pickle

from extensions import db
from models import User

apiAuth = Blueprint("apiAuth", __name__)

def login_required(f):
    """
        session uniquement

        grace à la variable g.user, on peut accéder à l'utilisateur connecté 
        dans les fonctions de route protégées par ce décorateur
    """
    def wrapper(*args, **kwargs):
        if "user" not in session:
            return {"error": "non autorisé"}, 401

        user = User.get_by_username(session["user"])
        if user is None:
            session.clear()
            return {"error": "non autorisé"}, 401

        g.user = user
        return f(*args, **kwargs)
    wrapper.__name__ = f.__name__
    return wrapper


def auth_required(f):
    """
        session ou clé API
        
        grace à la variable g.user, on peut accéder à l'utilisateur connecté 
        dans les fonctions de route protégées par ce décorateur
    """
    def wrapper(*args, **kwargs):
        user = None

        if "user" in session:
            user = User.get_by_username(session["user"])

        # if user is None:
        #     api_key_header = request.headers.get("X-API-Key")
        #     if api_key_header is not None:
        #         api_key = ApiKey.get_by_key(api_key_header)
        #         if api_key is not None:
        #             user = api_key.user

        if user is None:
            return {"error": "non autorisé"}, 401

        g.user = user
        return f(*args, **kwargs)
    wrapper.__name__ = f.__name__
    return wrapper