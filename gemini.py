import os
import json
import re
from urllib import response
import requests
from dotenv import load_dotenv

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")

GEMINI_URL = f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent"

TVMAZE_URL = "https://api.tvmaze.com/singlesearch/shows"


def nettoyer_html(texte):

    if not texte:
        return ""
    return re.sub(r"<[^>]+>", "", texte).strip()


def construire_prompt(avis_utilisateur, texte_libre=""):
    series_aimees = []
    series_neutres = []
    series_pas_aimees = []
    series_interessantes = []
    series_pas_interessantes = []

    # Onparcourt tous les avis enregistrés en BDD
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

    # si rien écrit, on le précise
    if texte_libre.strip() == "":
        texte_libre = "aucune précision supplémentaire"

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

Important :
- retourne uniquement un tableau JSON valide
- n'utilise pas de balises markdown
- n'utilise pas ```json
- aucune phrase avant ou après
- exactement 5 objets
"""
    return prompt.strip()


def appeler_gemini(prompt):
    if not GEMINI_API_KEY:
        raise RuntimeError("clé API Gemini absente")

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

    response = requests.post(
        GEMINI_URL,
        headers=headers,
        json=payload,
        timeout=30
    )

    # Debug
    print("Gemini status:", response.status_code)
    print("Gemini body:", response.text[:1000])

    response.raise_for_status()

    data = response.json()

    candidates = data.get("candidates", [])
    if not candidates:
        raise RuntimeError(f"Aucun résultat renvoyé par Gemini: {data}")

    content = candidates[0].get("content", {})
    parts = content.get("parts", [])
    if not parts or "text" not in parts[0]:
        raise RuntimeError(f"Réponse Gemini sans texte : {data}")

    texte = parts[0]["text"].strip()

    #si JSON invalide
    if texte.startswith("```"):
        texte = re.sub(r"^```json\s*", "", texte)
        texte = re.sub(r"^```\s*", "", texte)
        texte = re.sub(r"\s*```$", "", texte)
        texte = texte.strip()

    try:
        return json.loads(texte)
    except json.JSONDecodeError as e:
        raise RuntimeError(f"JSON invalide renvoyé par Gemini.Texte reçu:{texte}") from e



def enrichir_avec_tvmaze(title, reason):
  
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
        # si'erreur TVmaze, on garde quand même une reco minimale
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

    prompt = construire_prompt(avis_utilisateur, texte_libre)

    # appel à gemini
    suggestions = appeler_gemini(prompt)

    # séries déjà vu pour éviter de les recommander à nouveau
    titres_deja_vus = []
    for avis in avis_utilisateur:
        titres_deja_vus.append(avis["title"].lower())

    recommandations = []

    for suggestion in suggestions:
        titre = suggestion.get("title", "").strip()
        raison = suggestion.get("reason", "").strip()

        # Si série vide, on ignore
        if titre == "":
            continue

        # Si série déjà connue, on ignore
        if titre.lower() in titres_deja_vus:
            continue

        serie_complete = enrichir_avec_tvmaze(titre, raison)
        recommandations.append(serie_complete)

    return recommandations