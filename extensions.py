from flask_sqlalchemy import SQLAlchemy
from flask_session import Session

#Initialisation de la BD et de la session

db = SQLAlchemy()
sess = Session()