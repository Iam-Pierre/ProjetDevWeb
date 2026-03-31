import requests


class TVMazeServiceError(Exception):
    pass


def get_candidates_from_tvmaze(query: str, limit: int = 12):
    query = (query or "").strip()
    if not query:
        query = "dark"

    url = "https://api.tvmaze.com/search/shows"
    params = {"q": query}

    try:
        response = requests.get(url, params=params, timeout=10)
        response.raise_for_status()
    except requests.RequestException as exc:
        raise TVMazeServiceError(f"Erreur TVmaze : {exc}") from exc

    raw_data = response.json()

    candidates = []
    for item in raw_data[:limit]:
        show = item.get("show", {})

        candidates.append({
            "tvmaze_id": show.get("id"),
            "nom": show.get("name", ""),
            "genres": show.get("genres", []),
            "resume": (show.get("summary") or "").replace("<p>", "").replace("</p>", "").replace("<b>", "").replace("</b>", ""),
            "image_url": (show.get("image") or {}).get("medium")
        })

    if not candidates:
        raise TVMazeServiceError("Aucune série candidate trouvée via TVmaze.")

    return candidates