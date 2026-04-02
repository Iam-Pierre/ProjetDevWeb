from flask import Blueprint, render_template, request, jsonify
import os
import requests

from routes.auth import login_required
from routes.tvmaze_service import (
    fetch_json,
    serialize_show,
    tvmaze_error,
    get_all_shows,
    get_all_categories,
)

apiCategoriesSeries = Blueprint("apiCategoriesSeries", __name__)


@apiCategoriesSeries.route("/categories/series", methods=["GET"])
@login_required
def page_categories_series():
    """
    Affiche la page de découverte par catégorie / top 10.
    """
    try:
        categories = get_all_categories()
    except Exception:
        categories = []

    return render_template("categoriesSeries.html", categories=categories)


@apiCategoriesSeries.route("/api/top10", methods=["GET"])
@login_required
def api_top10():
    """
    Retourne les 10 séries les mieux notées
    parmi les séries récupérées depuis TVMaze.
    """
    try:
        shows = [serialize_show(show) for show in get_all_shows()]
        shows.sort(key=lambda s: s["rating"] or 0, reverse=True)
        return shows[:10]

    except requests.RequestException:
        return tvmaze_error()


@apiCategoriesSeries.route("/api/series_by_category", methods=["GET"])
@login_required
def api_series_by_category():
    """
    Retourne jusqu'à 20 séries d'une catégorie donnée.
    """
    category = (request.args.get("category") or "").strip()

    if not category:
        return {"error": "Le paramètre 'category' est requis."}, 400

    try:
        filtered = [
            serialize_show(show)
            for show in get_all_shows()
            if category in (show.get("genres") or [])
        ]

        return filtered[:20]

    except requests.RequestException:
        return tvmaze_error()


