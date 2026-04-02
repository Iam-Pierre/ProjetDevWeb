from flask import Flask, render_template, session, redirect
from extensions import db, sess
from models import User

from routes.auth import apiAuth
from routes.accueil import apiAccueil
from routes.recommendation import apiRecommendation
from routes.categoriesSeries import apiCategoriesSeries
from routes.mesSeries import apiSeries

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
app.register_blueprint(apiRecommendation)
app.register_blueprint(apiCategoriesSeries)
app.register_blueprint(apiSeries)

with app.app_context():
    db.create_all()


@app.route("/", methods=["GET"])
def home():
    username = session.get("user", None)

    if username is not None:
        user = User.get_by_username(username)
        return render_template("accueil.html", user=user)

    return render_template("auth.html")


@app.route("/recommandation", methods=["GET"])
def recommandation():
    username = session.get("user", None)

    if username is not None:
        return render_template("recommandation.html")

    return redirect("/")


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=True)