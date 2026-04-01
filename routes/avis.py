from flask import Blueprint, render_template, request, g
import requests

from extensions import db
from models import Serie, Avis
from routes.auth import login_required

apiAvis = Blueprint("apiAvis", __name__)

TVMAZE_BASE_URL = "https://api.tvmaze.com"
FALLBACK_IMAGE = "/static/manque.png"


# ==========================================================
# Helpers TVMaze
# ==========================================================

def fetch_tvmaze_json(endpoint, params=None):
    """
    Appelle l'API TVMaze et retourne le JSON.
    Lève une exception si la requête échoue.
    """
    response = requests.get(
        f"{TVMAZE_BASE_URL}{endpoint}",
        params=params,
        timeout=10
    )
    response.raise_for_status()
    return response.json()


def serialize_show(show):
    """
    Normalise une série TVMaze dans un format unique
    pour simplifier le frontend.
    """
    image = show.get("image") or {}
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


def get_all_shows():
    """
    Récupère une liste globale de séries.
    """
    return fetch_tvmaze_json("/shows")


def get_all_categories():
    """
    Construit la liste des genres disponibles.
    """
    shows = get_all_shows()
    categories = set()

    for show in shows:
        for genre in show.get("genres") or []:
            if isinstance(genre, str) and genre.strip():
                categories.add(genre.strip())

    return sorted(categories)


# ==========================================================
# Page principale
# ==========================================================

@apiAvis.route("/avis", methods=["GET"])
@login_required
def page_avis():
    """
    Affiche la page des avis.
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
    Recherche de séries par nom.
    """
    query = (request.args.get("query") or "").strip()

    if not query:
        return {"error": "Le paramètre 'query' est requis."}, 400

    try:
        results = fetch_tvmaze_json("/search/shows", params={"q": query})

        shows = []
        for item in results:
            show = item.get("show")
            if show:
                shows.append(serialize_show(show))

        return shows

    except requests.RequestException:
        return {"error": "Impossible de contacter TVMaze."}, 502


@apiAvis.route("/api/top10", methods=["GET"])
@login_required
def api_top10():
    """
    Retourne un top 10 des séries les mieux notées.
    """
    try:
        shows = get_all_shows()
        normalized = [serialize_show(show) for show in shows]

        normalized.sort(
            key=lambda s: s["rating"] if s["rating"] is not None else 0,
            reverse=True
        )

        return normalized[:10]

    except requests.RequestException:
        return {"error": "Impossible de contacter TVMaze."}, 502


@apiAvis.route("/api/series_by_category", methods=["GET"])
@login_required
def api_series_by_category():
    """
    Retourne jusqu'à 20 séries d'une catégorie donnée.
    """
    category = (request.args.get("category") or "").strip()

    if not category:
        return {"error": "Le paramètre 'category' est requis."}, 400

    try:
        shows = get_all_shows()

        filtered = []
        for show in shows:
            genres = show.get("genres") or []
            if category in genres:
                filtered.append(serialize_show(show))

        return filtered[:20]

    except requests.RequestException:
        return {"error": "Impossible de contacter TVMaze."}, 502


# ==========================================================
# APIs avis utilisateur
# ==========================================================

@apiAvis.route("/api/avis", methods=["POST"])
@login_required
def enregistrer_avis():
    """
    Crée ou met à jour l'avis d'un utilisateur sur une série.
    """
    data = request.get_json() or {}

    tvmaze_id = data.get("tvmaze_id")
    nom = (data.get("nom") or "").strip()
    image_url = (data.get("image_url") or "").strip() or FALLBACK_IMAGE
    ressenti = (data.get("ressenti") or "").strip()

    if not tvmaze_id:
        return {"error": "tvmaze_id manquant."}, 400

    if not nom:
        return {"error": "nom manquant."}, 400

    if not ressenti:
        return {"error": "ressenti manquant."}, 400

    # Retrouver ou créer la série
    serie = Serie.query.filter_by(tvmaze_id=tvmaze_id).first()

    if serie is None:
        serie = Serie(
            tvmaze_id=tvmaze_id,
            title=nom,
            image_url=image_url
        )
        db.session.add(serie)
        db.session.flush()
    else:
        # Met à jour les infos si besoin
        serie.title = nom
        serie.image_url = image_url

    # Retrouver ou créer l'avis utilisateur
    avis = Avis.query.filter_by(
        user_id=g.user.id,
        serie_id=serie.id
    ).first()

    if avis is None:
        avis = Avis(
            user_id=g.user.id,
            serie_id=serie.id,
            ressenti=ressenti
        )
        db.session.add(avis)
    else:
        avis.ressenti = ressenti

    db.session.commit()
    return {"ok": True}


@apiAvis.route("/api/avis", methods=["GET"])
@login_required
def get_avis():
    """
    Retourne tous les avis de l'utilisateur connecté.
    """
    avis_list = Avis.query.filter_by(user_id=g.user.id).all()

    resultat = []
    for avis in avis_list:
        resultat.append({
            "tvmaze_id": avis.serie.tvmaze_id,
            "nom": avis.serie.title,
            "image_url": avis.serie.image_url,
            "ressenti": avis.ressenti
        })

    return {"avis": resultat}


@apiAvis.route("/api/delete-series", methods=["POST"])
@login_required
def delete_series():
    """
    Supprime l'avis de l'utilisateur sur une série.
    Si plus aucun avis ne référence cette série,
    on supprime aussi la série.
    """
    data = request.get_json() or {}
    tvmaze_id = data.get("tvmaze_id")

    if not tvmaze_id:
        return {"error": "tvmaze_id manquant."}, 400

    serie = Serie.query.filter_by(tvmaze_id=tvmaze_id).first()
    if serie is None:
        return {"error": "Série introuvable."}, 404

    avis = Avis.query.filter_by(
        user_id=g.user.id,
        serie_id=serie.id
    ).first()

    if avis is None:
        return {"error": "Avis introuvable."}, 404

    db.session.delete(avis)
    db.session.flush()

    remaining_avis = Avis.query.filter_by(serie_id=serie.id).first()
    if remaining_avis is None:
        db.session.delete(serie)

    db.session.commit()
    return {"ok": True}