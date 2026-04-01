from flask import Blueprint, request, session, g, jsonify
from extensions import db
from models import User, Serie, Avis
from routes.auth import login_required
import os
import requests

apiAvis = Blueprint("apiAvis", __name__)

@apiAvis.route("/api/avis", methods=["POST"])
@login_required
def enregistrer_avis():
    data = request.get_json()

    # On récupère les données envoyées par le JS
    tvmaze_id = data.get("tvmaze_id")
    nom = data.get("nom")
    image_url = data.get("image_url")
    ressenti = data.get("ressenti")

    # 1. Est-ce que cette série existe déjà dans notre base ?
    serie = Serie.query.filter_by(tvmaze_id=tvmaze_id).first()

    # Si elle n'existe pas encore, on la crée
    if serie is None:
        serie = Serie(tvmaze_id=tvmaze_id, title=nom, image_url=image_url)
        db.session.add(serie)
        db.session.flush()  # permet d'obtenir l'id de la série avant le commit

    # 2. Est-ce que l'utilisateur a déjà un avis sur cette série ?
    avis = Avis.query.filter_by(user_id=g.user.id, serie_id=serie.id).first()

    if avis is None:
        # Pas encore d'avis : on en crée un nouveau
        avis = Avis(user_id=g.user.id, serie_id=serie.id, ressenti=ressenti)
        db.session.add(avis)
    else:
        # Avis déjà existant : on le met juste à jour
        avis.ressenti = ressenti

    db.session.commit()

    return {"ok": True}

@apiAvis.route("/api/avis", methods=["GET"])
@login_required
def get_avis():
    # On récupère tous les avis de l'utilisateur connecté
    avis = Avis.query.filter_by(user_id=g.user.id).all()

    # On formate les données pour les envoyer au JS
    resultat = []
    for a in avis:
        resultat.append({
            "tvmaze_id": a.serie.tvmaze_id,
            "nom": a.serie.title,
            "image_url": a.serie.image_url,
            "ressenti": a.ressenti
        })

    return {"avis": resultat}

@apiAvis.route("/api/get_trailer", methods=["GET"])
@login_required
def get_trailer():

    nom_serie = request.args.get("nom")
    # Récupère ta clé depuis le fichier .env (très important pour la sécurité !)
    api_key = os.getenv("YOUTUBE_API_KEY") 

    if not nom_serie:
        return jsonify({"error": "Nom manquant"}), 400

    # 1. Configuration de l'appel à l'API YouTube
    search_url = "https://www.googleapis.com/youtube/v3/search"
    params = {
        'part': 'id',
        'q': f"{nom_serie} official trailer",
        'type': 'video',
        'maxResults': 1, # On ne veut QUE la première vidéo
        'key': api_key
    }

    try:
        # 2. On demande à Google l'ID de la vidéo
        response = requests.get(search_url, params=params)
        data = response.json()

        # 3. On extrait l'ID de la vidéo
        if 'items' in data and len(data['items']) > 0:
            video_id = data['items'][0]['id']['videoId']
            # On construit le lien DIRECT vers le lecteur
            direct_url = f"https://www.youtube.com/watch?v={video_id}"
            
            return jsonify({
                "ok": True, 
                "video_url": direct_url
            })
        
        return jsonify({"error": "Aucune vidéo trouvée"}), 404

    except Exception as e:
        print(f"Erreur API YouTube: {e}")
        return jsonify({"error": "Erreur serveur"}), 500