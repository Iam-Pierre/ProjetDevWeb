from flask import Blueprint, render_template, request, g, jsonify
import os
import requests

from extensions import db
from models import Serie, Avis
from routes.auth import login_required

# Création du blueprint pour regrouper toutes les routes liées aux avis
apiAvis = Blueprint("apiAvis", __name__)

# URL de base de l'API TVMaze
TVMAZE_BASE_URL = "https://api.tvmaze.com"

# Image par défaut si une série n'a pas d'image
FALLBACK_IMAGE = "/static/manque.png"


# ==========================================================
# Helpers généraux
# ==========================================================

def fetch_json(url, params=None, timeout=10):
    """
    Cette fonction sert à faire un appel HTTP GET vers une API
    et à retourner directement la réponse en JSON.

    url : l'URL à appeler
    params : les paramètres éventuels de la requête
    timeout : temps max d'attente avant d'abandonner
    """
    response = requests.get(url, params=params, timeout=timeout)

    # Si l'API répond avec une erreur HTTP (404, 500, etc.),
    # cette ligne déclenche une exception
    response.raise_for_status()

    # On transforme la réponse en dictionnaire / liste Python
    return response.json()


def fetch_tvmaze_json(endpoint, params=None):
    """
    Cette fonction est spécialisée pour TVMaze.

    Au lieu d'écrire à chaque fois l'URL complète :
    https://api.tvmaze.com/...
    on donne juste l'endpoint, par exemple "/shows"
    """
    return fetch_json(f"{TVMAZE_BASE_URL}{endpoint}", params=params)


def serialize_show(show):
    """
    Cette fonction prend une série renvoyée par TVMaze
    et la transforme dans un format plus simple et uniforme.

    Le but :
    -> avoir toujours les mêmes clés côté frontend
    -> éviter de manipuler directement la structure brute de TVMaze
    """

    # Certaines séries n'ont pas forcément d'image
    image = show.get("image") or {}

    # Certaines séries n'ont pas forcément de note
    rating = show.get("rating") or {}

    return {
        "id": show.get("id"),
        "name": show.get("name"),
        "image_url": image.get("medium") or FALLBACK_IMAGE,
        "genres": show.get("genres") or [],
        "status": show.get("status"),
        "premiered": show.get("premiered"),
        "ended": show.get("ended"),
        "rating": rating.get("average"),
        "summary": show.get("summary"),
    }


def tvmaze_error():
    """
    Petite fonction utilitaire pour éviter de répéter
    le même message d'erreur dans plusieurs routes.
    """
    return {"error": "Impossible de contacter TVMaze."}, 502


def get_all_shows():
    """
    Récupère une liste globale de séries depuis TVMaze.
    """
    return fetch_tvmaze_json("/shows")


def get_all_categories():
    """
    Cette fonction construit la liste de tous les genres disponibles.
    Idée :
    1. On récupère toutes les séries
    2. On parcourt tous leurs genres
    3. On stocke les genres dans un set pour éviter les doublons
    4. On trie le résultat à la fin
    """
    shows = get_all_shows()

    categories = {
        genre.strip()
        for show in shows
        for genre in (show.get("genres") or [])
        if isinstance(genre, str) and genre.strip()
    }

    return sorted(categories)


# ==========================================================
# Page principale
# ==========================================================

@apiAvis.route("/avis", methods=["GET"])
@login_required
def page_avis():
    """
    Affiche la page HTML des avis.

    On essaie de charger les catégories pour remplir
    par exemple un select côté frontend.

    Si jamais TVMaze ne répond pas,
    on évite de faire planter la page :
    on envoie juste une liste vide.
    """
    try:
        categories = get_all_categories()
    except Exception:
        categories = []

    return render_template("avis.html", categories=categories)


# ==========================================================
# APIs séries
# ==========================================================

@apiAvis.route("/api/search_series", methods=["GET"])
@login_required
def api_search_series():
    """
    Recherche des séries par nom.

    Exemple :
    /api/search_series?query=breaking bad

    Le frontend envoie un texte,
    puis on interroge l'API TVMaze avec ce texte.
    """
    query = (request.args.get("query") or "").strip()

    # Si l'utilisateur n'a rien envoyé, on renvoie une erreur 400
    if not query:
        return {"error": "Le paramètre 'query' est requis."}, 400

    try:
        # Appel à l'API TVMaze
        results = fetch_tvmaze_json("/search/shows", params={"q": query})

        # TVMaze renvoie une liste d'objets contenant chacun une clé "show"
        # Ici on garde seulement la partie utile
        shows = [
            serialize_show(item["show"])
            for item in results
            if item.get("show")
        ]

        return shows

    except requests.RequestException:
        return tvmaze_error()


@apiAvis.route("/api/top10", methods=["GET"])
@login_required
def api_top10():
    """
    Retourne un top 10 des séries les mieux notées.

    Étapes :
    1. On récupère les séries
    2. On les normalise avec serialize_show
    3. On les trie par note décroissante
    4. On garde les 10 premières
    """
    try:
        shows = [serialize_show(show) for show in get_all_shows()]

        # On trie du plus grand rating vers le plus petit
        # Si rating vaut None, on prend 0 pour éviter les erreurs
        shows.sort(key=lambda s: s["rating"] or 0, reverse=True)

        return shows[:10]

    except requests.RequestException:
        return tvmaze_error()


@apiAvis.route("/api/series_by_category", methods=["GET"])
@login_required
def api_series_by_category():
    """
    Retourne jusqu'à 20 séries d'un genre donné.

    Exemple :
    /api/series_by_category?category=Drama
    """
    category = (request.args.get("category") or "").strip()

    if not category:
        return {"error": "Le paramètre 'category' est requis."}, 400

    try:
        # On filtre seulement les séries qui contiennent le genre demandé
        filtered = [
            serialize_show(show)
            for show in get_all_shows()
            if category in (show.get("genres") or [])
        ]

        return filtered[:20]

    except requests.RequestException:
        return tvmaze_error()


# ==========================================================
# APIs avis utilisateur
# ==========================================================

@apiAvis.route("/api/avis", methods=["POST"])
@login_required
def enregistrer_avis():
    """
    Cette route sert à enregistrer l'avis d'un utilisateur sur une série.

    Elle gère 2 cas :
    - soit la série n'existe pas encore en base -> on la crée
    - soit elle existe déjà -> on met à jour les infos si besoin

    Ensuite :
    - soit l'utilisateur n'a pas encore donné son avis -> on crée l'avis
    - soit il a déjà donné un avis -> on le met à jour
    """
    data = request.get_json() or {}

    # On récupère les données envoyées par le frontend
    tvmaze_id = data.get("tvmaze_id")
    nom = (data.get("nom") or "").strip()
    image_url = (data.get("image_url") or "").strip() or FALLBACK_IMAGE
    ressenti = (data.get("ressenti") or "").strip()

    # Vérifications minimales
    if not tvmaze_id:
        return {"error": "tvmaze_id manquant."}, 400
    if not nom:
        return {"error": "nom manquant."}, 400
    if not ressenti:
        return {"error": "ressenti manquant."}, 400

    # ------------------------------------------------------
    # Étape 1 : retrouver ou créer la série
    # ------------------------------------------------------
    serie = Serie.query.filter_by(tvmaze_id=tvmaze_id).first()

    if serie is None:
        # La série n'existe pas encore en base
        serie = Serie(
            tvmaze_id=tvmaze_id,
            title=nom,
            image_url=image_url
        )
        db.session.add(serie)

        # flush() permet d'envoyer provisoirement l'objet à la base
        # pour que son id soit généré avant le commit final
        db.session.flush()
    else:
        # Si la série existe déjà, on met à jour ses infos
        # au cas où elles auraient changé
        serie.title = nom
        serie.image_url = image_url

    # ------------------------------------------------------
    # Étape 2 : retrouver ou créer l'avis de l'utilisateur
    # ------------------------------------------------------
    avis = Avis.query.filter_by(
        user_id=g.user.id,
        serie_id=serie.id
    ).first()

    if avis is None:
        # L'utilisateur n'avait jamais donné son avis sur cette série
        avis = Avis(
            user_id=g.user.id,
            serie_id=serie.id,
            ressenti=ressenti
        )
        db.session.add(avis)
    else:
        # L'utilisateur avait déjà un avis : on le remplace
        avis.ressenti = ressenti

    # Sauvegarde définitive en base
    db.session.commit()

    return {"ok": True}


@apiAvis.route("/api/avis", methods=["GET"])
@login_required
def get_avis():
    """
    Retourne tous les avis de l'utilisateur connecté.

    On filtre avec user_id = utilisateur courant
    pour que chacun ne voie que ses propres avis.
    """
    avis_list = Avis.query.filter_by(user_id=g.user.id).all()

    resultat = [
        {
            "tvmaze_id": avis.serie.tvmaze_id,
            "nom": avis.serie.title,
            "image_url": avis.serie.image_url,
            "ressenti": avis.ressenti
        }
        for avis in avis_list
    ]

    return {"avis": resultat}


@apiAvis.route("/api/delete-series", methods=["POST"])
@login_required
def delete_series():
    """
    Supprime l'avis de l'utilisateur sur une série.

    Et si après suppression plus personne n'a d'avis sur cette série,
    on supprime aussi la série de la base pour éviter de garder
    des données inutiles.
    """
    data = request.get_json() or {}
    tvmaze_id = data.get("tvmaze_id")

    if not tvmaze_id:
        return {"error": "tvmaze_id manquant."}, 400

    # On cherche la série
    serie = Serie.query.filter_by(tvmaze_id=tvmaze_id).first()
    if serie is None:
        return {"error": "Série introuvable."}, 404

    # On cherche l'avis de l'utilisateur connecté sur cette série
    avis = Avis.query.filter_by(
        user_id=g.user.id,
        serie_id=serie.id
    ).first()

    if avis is None:
        return {"error": "Avis introuvable."}, 404

    # On supprime l'avis
    db.session.delete(avis)
    db.session.flush()

    # On vérifie s'il reste encore des avis liés à cette série
    if Avis.query.filter_by(serie_id=serie.id).first() is None:
        db.session.delete(serie)

    db.session.commit()
    return {"ok": True}


# ==========================================================
# API trailer YouTube
# ==========================================================

@apiAvis.route("/api/get_trailer", methods=["GET"])
@login_required
def get_trailer():
    """
    Cette route cherche une bande-annonce YouTube
    pour une série donnée.

    Le frontend envoie le nom de la série,
    puis on utilise l'API YouTube pour récupérer
    le premier résultat vidéo.
    """
    nom_serie = (request.args.get("nom") or "").strip()

    # Clé API stockée dans le .env
    api_key = os.getenv("YOUTUBE_API_KEY")

    if not nom_serie:
        return jsonify({"error": "Nom manquant"}), 400

    search_url = "https://www.googleapis.com/youtube/v3/search"

    params = {
        "part": "id",
        "q": f"{nom_serie} official trailer",
        "type": "video",
        "maxResults": 1,
        "key": api_key
    }

    try:
        data = fetch_json(search_url, params=params)

        # Si au moins une vidéo est trouvée
        if data.get("items"):
            video_id = data["items"][0]["id"]["videoId"]

            # On construit le lien YouTube
            return jsonify({
                "ok": True,
                "video_url": f"https://www.youtube.com/watch?v={video_id}"
            })

        return jsonify({"error": "Aucune vidéo trouvée"}), 404

    except requests.RequestException:
        return jsonify({"error": "Erreur serveur"}), 500