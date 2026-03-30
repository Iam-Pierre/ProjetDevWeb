from flask import Flask, render_template, session, redirect
from extensions import db, sess
from models import User
from routes import api


app = Flask(__name__, template_folder="template", static_folder="static")

app.config["SECRET_KEY"] = "dev-secret"
app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///app.db"
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

app.config["SESSION_TYPE"] = "sqlalchemy"
app.config["SESSION_SQLALCHEMY"] = db

db.init_app(app)
sess.init_app(app)

app.register_blueprint(api)

with app.app_context():
    db.create_all()

@app.route('/', methods=['GET'])
def home():
    username = session.get("user",None)
    if username is not None:
        return render_template("app.html")
    return render_template("auth.html")

@app.route('/dashboard', methods=['GET'])
def dashboard():
    username = session.get("user",None)
    if username is not None:
        user = User.get_by_username(username)
        return render_template("dashboard.html", user=user) #username est la variable qu'on récupere depuis la session
    # pour récupérer la liste de clé on utilise le nom.api_keys, pareil pour user on peut récupérer le nom de l'utilisateur de la session
    return redirect("/")


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=True)