from flask import Blueprint, request, session, g
from werkzeug.security import generate_password_hash, check_password_hash


from extensions import db
from models import User

apiAuth = Blueprint("apiAuth", __name__)

def login_required(f):
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

    def wrapper(*args, **kwargs):
        user = None

        if "user" in session:
            user = User.get_by_username(session["user"])

        if user is None:
            return {"error": "non autorisé"}, 401

        g.user = user
        return f(*args, **kwargs)
    wrapper.__name__ = f.__name__
    return wrapper


#routes pour s'enregistrer 

@apiAuth.route("/api/auth/register", methods=["POST"])
def register():
    data = request.get_json()

    u = data.get("username")
    p = data.get("password")

    if not u or not p:
        return {"error": "username et password requis"}, 400

    if User.get_by_username(u) is not None:
        return {"error": "username déjà utilisé"}, 400

    user = User(username=u, password_hash=generate_password_hash(p))
    db.session.add(user)
    db.session.commit()

    session["user"] = u

    return {"ok": True, "message": "enregistré et connecté"}, 201

# routes d'authentif
@apiAuth.route("/api/auth/login", methods=["POST"])
def login():
    data = request.get_json()

    u = data.get("username")
    p = data.get("password")

    user = User.get_by_username(u)

    if user is None :
        return {"error": "username  incorrect"}, 401
    
    if not check_password_hash(user.password_hash, p):
        return {"error": "password incorrect"}, 401
    
    session["user"] = u
    return {"ok": True, "message": "connecté"}, 200

@apiAuth.route("/api/auth/logout", methods=["POST"])
@login_required
def logout():
    session.clear()
    return {"ok": True, "message": "déconnecté"}, 200


