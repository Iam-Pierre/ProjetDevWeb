# routes/tvmaze_service.py
import requests


TVMAZE_BASE_URL = "https://api.tvmaze.com"

# Image d'erreurs si load pas le film
FALLBACK_IMAGE = "/static/manque.png"


def fetch_json(url, params=None, timeout=10):
    response = requests.get(url, params=params, timeout=timeout)

    # exception
    response.raise_for_status()

    # transforme la réponse en dictionnair
    return response.json()


def fetch_tvmaze_json(endpoint, params=None):
    return fetch_json(f"{TVMAZE_BASE_URL}{endpoint}", params=params)


def serialize_show(show):
    # si pas d'image
    image = show.get("image") or {}

    # si pas de note
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
    return {"erreur"}, 502


def get_all_shows():
    return fetch_tvmaze_json("/shows")


def get_all_categories():
    shows = get_all_shows()

    categories = {
        genre.strip()
        for show in shows
        for genre in (show.get("genres") or [])
        if isinstance(genre, str) and genre.strip()
    }

    return sorted(categories)