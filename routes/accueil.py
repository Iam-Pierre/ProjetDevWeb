import os

from flask import Blueprint, jsonify, request, g

from extensions import db
from models import Serie, Avis
from routes.auth import login_required
from routes.tvmaze_service import FALLBACK_IMAGE, fetch_json

import requests

from routes.tvmaze_service import fetch_tvmaze_json, serialize_show, tvmaze_error

apiAccueil = Blueprint("apiAccueil", __name__)


@apiAccueil.route("/api/avis", methods=["POST"])
@login_required
def enregistrer_avis():

    data = request.get_json() or {}

    tvmaze_id = data.get("tvmaze_id")
    nom = (data.get("nom") or "").strip()
    image_url = (data.get("image_url") or "").strip() or FALLBACK_IMAGE
    ressenti = (data.get("ressenti") or "").strip()
    genres = data.get("genres") or []
    status = data.get("status")

    if not tvmaze_id:
        return {"error": "tvmaze_id manquant."}, 400
    if not nom:
        return {"error": "nom manquant."}, 400
    if not ressenti:
        return {"error": "ressenti manquant."}, 400

    serie = Serie.query.filter_by(tvmaze_id=tvmaze_id).first()
    print(serie)

    if serie is None:
        serie = Serie(
            tvmaze_id=tvmaze_id,
            title=nom,
            image_url=image_url,
            genres=data.get("genres"),
            status=data.get("status"),
            premiere=data.get("premiered"),
            resume=data.get("summary"),

        )
        db.session.add(serie)
        db.session.flush()
    else:
        serie.title = nom
        serie.image_url = image_url


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


@apiAccueil.route("/api/avis", methods=["GET"])
@login_required
def get_avis():
    avis_list = (
        Avis.query
        .join(Serie)
        .filter(Avis.user_id == g.user.id)
        .all()
    )

    resultat = [
        {
            "id": avis.serie.tvmaze_id,
            "tvmaze_id": avis.serie.tvmaze_id,
            "name": avis.serie.title,
            "nom": avis.serie.title,
            "image_url": avis.serie.image_url or FALLBACK_IMAGE,
            "genres": avis.serie.genres or [],
            "status": avis.serie.status,
            "premiered": avis.serie.premiere,
            "ended": avis.serie.fin,
            "rating": avis.serie.rating,
            "saisons": avis.serie.saisons,
            "summary": avis.serie.resume,
            "ressenti": avis.ressenti,
        }
        for avis in avis_list
    ]

    return {"avis": resultat}


@apiAccueil.route("/api/delete-series", methods=["POST"])
@login_required
def delete_series():
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

    if Avis.query.filter_by(serie_id=serie.id).first() is None:
        db.session.delete(serie)

    db.session.commit()
    return {"ok": True}



@apiAccueil.route("/api/search_series", methods=["GET"])
@login_required
def api_search_series():
    query = (request.args.get("query") or "").strip()

    if not query:
        return {"error": "Paramètre 'query' requis"}, 400

    try:
        results = fetch_tvmaze_json("/search/shows", params={"q": query})

        shows = []
        for item in results:
            show = item.get("show")
            if show:
                shows.append(serialize_show(show))

        return shows

    except requests.RequestException:
        return tvmaze_error()

@apiAccueil.route("/api/get_trailer", methods=["GET"])
@login_required
def get_trailer():
    nom_serie = os(request.args.get("nom") or "").strip()
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

        if data.get("items"):
            video_id = data["items"][0]["id"]["videoId"]
            return jsonify({
                "ok": True,
                "video_url": f"https://www.youtube.com/watch?v={video_id}"
            })

        return jsonify({"error": "Aucune vidéo trouvée"}), 404

    except requests.RequestException:
        return jsonify({"error": "Erreur serveur"}), 500