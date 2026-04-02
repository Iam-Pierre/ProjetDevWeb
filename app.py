from flask import Flask, render_template, session, redirect
from extensions import db, sess
from models import User
from routes.auth import apiAuth
from routes.accueil import apiAccueil
from routes.avis import apiAvis, get_all_categories
from routes.recommendation import apiRecommendation



app = Flask(__name__)

app.config["SECRET_KEY"] = "dev-secret"
app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///app.db"
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

app.config["SESSION_TYPE"] = "sqlalchemy"
app.config["SESSION_SQLALCHEMY"] = db

db.init_app(app)
sess.init_app(app)

app.register_blueprint(apiAuth)
app.register_blueprint(apiAccueil)
app.register_blueprint(apiAvis)
app.register_blueprint(apiRecommendation)

with app.app_context():
    db.create_all()

@app.route('/', methods=['GET'])
def home():
    username = session.get("user",None)
    if username is not None:
        user = User.get_by_username(username)
        return render_template("accueil.html", user=user)
    return render_template("auth.html")


@app.route('/avis', methods=['GET'])
def avis():
    username = session.get("user", None)
    if username is not None:
        return render_template("avis.html")
    return redirect("/")

@app.route('/recommandation', methods=['GET'])
def recommandation():
    username = session.get("user", None)
    if username is not None:
        return render_template("recommandation.html")
    return redirect("/")

@app.route('/series', methods=['GET'])
def series():
    username = session.get("user",None)
    if username is not None:
        user = User.get_by_username(username)
        return render_template("mesSeries.html", user=user)
    
@app.route('/categories/series', methods=['GET'])
def categoriesSeries():
    username = session.get("user",None)
    if username is not None:
        user = User.get_by_username(username)

        liste_des_genres = get_all_categories()

    
        
        return render_template("categoriesSeries.html", user=user, categories = liste_des_genres)


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=True)

    