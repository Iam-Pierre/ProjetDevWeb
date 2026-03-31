from flask import Blueprint, request, session, g
from werkzeug.security import generate_password_hash, check_password_hash
import pickle

from extensions import db
from models import User

apiAvis = Blueprint("apiAvis", __name__)