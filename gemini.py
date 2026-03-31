import os
import json
import re
import requests
from dotenv import load_dotenv

# Charge les variables du fichier .env
load_dotenv()

# On récupère la clé API et le nom du modèle Gemini
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")

# URL de l'API Gemini
GEMINI_URL = f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent"

# URL de l'API TVmaze pour chercher une série par son nom
TVMAZE_URL = "https://api.tvmaze.com/singlesearch/shows"


def nettoyer_html(texte):
    """
    Certains résumés TVmaze contiennent des balises HTML.
    Cette fonction les enlève pour garder un texte propre.
    """
    if not texte:
        return ""
    return re.sub(r"<[^>]+>", "", texte).strip()


def construire_prompt(avis_utilisateur, texte_libre=""):
    """
    Cette fonction construit le texte qu'on envoie à Gemini.

    On sépare les séries selon le ressenti de l'utilisateur
    pour que Gemini comprenne mieux ses goûts.
    """

    series_aimees = []
    series_neutres = []
    series_pas_aimees = []
    series_interessantes = []
    series_pas_interessantes = []

    # On parcourt tous les avis enregistrés en base
    for avis in avis_utilisateur:
        titre = avis["title"]
        ressenti = avis["ressenti"]

        if ressenti == "vu_aime":
            series_aimees.append(titre)
        elif ressenti == "vu_neutre":
            series_neutres.append(titre)
        elif ressenti == "vu_pas_aime":
            series_pas_aimees.append(titre)
        elif ressenti == "interesse":
            series_interessantes.append(titre)
        elif ressenti == "pas_interesse":
            series_pas_interessantes.append(titre)

    # Si l'utilisateur n'a rien écrit, on le précise
    if texte_libre.strip() == "":
        texte_libre = "aucune précision supplémentaire"

    # Prompt simple, lisible, et facile à expliquer
    prompt = f"""
Tu es un moteur de recommandation de séries TV.

Tu dois recommander exactement 5 séries TV à partir :
- des avis passés de l'utilisateur
- d'un texte libre donné par l'utilisateur

Avis utilisateur :
- Séries aimées : {", ".join(series_aimees) if series_aimees else "aucune"}
- Séries neutres : {", ".join(series_neutres) if series_neutres else "aucune"}
- Séries non aimées : {", ".join(series_pas_aimees) if series_pas_aimees else "aucune"}
- Séries qui l'intéressent : {", ".join(series_interessantes) if series_interessantes else "aucune"}
- Séries qui ne l'intéressent pas : {", ".join(series_pas_interessantes) if series_pas_interessantes else "aucune"}

Texte libre utilisateur :
{texte_libre}

Règles :
- les avis passés sont prioritaires
- le texte libre sert à affiner la recommandation
- ne recommande jamais une série déjà citée
- réponds uniquement en JSON
- ne mets aucun texte avant ou après

Format attendu :
[
  {{
    "title": "Nom de la série",
    "reason": "courte explication en français"
  }}
]
"""
    return prompt.strip()


def appeler_gemini(prompt):
    """
    Cette fonction envoie le prompt à Gemini
    puis récupère la réponse.
    """

    if not GEMINI_API_KEY:
        raise RuntimeError("La clé API Gemini est absente.")

    headers = {
        "Content-Type": "application/json",
        "x-goog-api-key": GEMINI_API_KEY
    }

    payload = {
        "contents": [
            {
                "parts": [
                    {"text": prompt}
                ]
            }
        ]
    }

    # Appel HTTP POST vers Gemini
    response = requests.post(
        GEMINI_URL,
        headers=headers,
        json=payload,
        timeout=30
    )

    # Si erreur HTTP, on lève une exception
    response.raise_for_status()

    data = response.json()

    # On récupère le texte renvoyé par Gemini
    texte = data["candidates"][0]["content"]["parts"][0]["text"]

    # On transforme le texte JSON en liste Python
    return json.loads(texte)


def enrichir_avec_tvmaze(title, reason):
    """
    Gemini renvoie surtout un titre et une raison.
    Cette fonction interroge TVmaze pour récupérer :
    - image
    - genres
    - note
    - résumé
    """

    try:
        response = requests.get(
            TVMAZE_URL,
            params={"q": title},
            timeout=15
        )

        if response.status_code != 200:
            # Si TVmaze ne trouve rien, on renvoie quand même le minimum
            return {
                "title": title,
                "reason": reason,
                "image_url": "",
                "genres": [],
                "rating": None,
                "summary": "",
                "tvmaze_url": ""
            }

        show = response.json()

        image_url = ""
        if show.get("image"):
            image_url = show["image"].get("medium", "")

        rating = None
        if show.get("rating"):
            rating = show["rating"].get("average")

        return {
            "title": show.get("name", title),
            "reason": reason,
            "image_url": image_url,
            "genres": show.get("genres", []),
            "rating": rating,
            "summary": nettoyer_html(show.get("summary", "")),
            "tvmaze_url": show.get("url", "")
        }

    except Exception:
        # En cas d'erreur TVmaze, on garde quand même une reco minimale
        return {
            "title": title,
            "reason": reason,
            "image_url": "",
            "genres": [],
            "rating": None,
            "summary": "",
            "tvmaze_url": ""
        }


def generer_recommandations(avis_utilisateur, texte_libre=""):
    """
    Fonction principale appelée par Flask.

    Étapes :
    1. construire le prompt
    2. appeler Gemini
    3. enrichir les résultats avec TVmaze
    4. renvoyer une liste finale de recommandations
    """

    # Construction du prompt
    prompt = construire_prompt(avis_utilisateur, texte_libre)

    # Appel à Gemini
    suggestions = appeler_gemini(prompt)

    # Liste des séries déjà connues de l'utilisateur
    # pour éviter de les recommander à nouveau
    titres_deja_vus = []
    for avis in avis_utilisateur:
        titres_deja_vus.append(avis["title"].lower())

    recommandations = []

    for suggestion in suggestions:
        titre = suggestion.get("title", "").strip()
        raison = suggestion.get("reason", "").strip()

        # Si Gemini renvoie une série vide, on ignore
        if titre == "":
            continue

        # Si Gemini propose une série déjà connue, on ignore
        if titre.lower() in titres_deja_vus:
            continue

        # On enrichit avec TVmaze
        serie_complete = enrichir_avec_tvmaze(titre, raison)
        recommandations.append(serie_complete)

    return recommandations