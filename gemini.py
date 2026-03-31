import os
import json
import google.generativeai as genai

genai.configure(api_key=os.getenv("AIzaSyDBmuoNsO5qtpFnJ-ozTViAPuNnaMbCB9Y"))

model = genai.GenerativeModel("gemini-2.5-flash")

SYSTEM_PROMPT = """
Tu es un expert en recommandation de séries TV.

Tu analyses les goûts d’un utilisateur à partir de séries qu’il a aimées, trouvées neutres ou non aimées.

Règles :
- recommande uniquement des séries TV
- évite de recommander les séries déjà mentionnées
- propose exactement 5 séries
- donne une explication courte pour chaque série
- réponds uniquement en JSON valide
- aucun texte avant ou après le JSON

Format attendu :
[
  {
    "nom": "Nom de la série",
    "explication": "Pourquoi cette série correspond au profil"
  }
]
"""


class GeminiServiceError(Exception):
    pass


def construire_profil_depuis_avis(avis_utilisateur):
    profil = {
        "aime": [],
        "neutre": [],
        "naime_pas": []
    }

    for avis in avis_utilisateur:
        titre = avis.serie.title

        if avis.ressenti == "aime":
            profil["aime"].append(titre)
        elif avis.ressenti == "neutre":
            profil["neutre"].append(titre)
        elif avis.ressenti == "naime_pas":
            profil["naime_pas"].append(titre)

    return profil


def construire_prompt(profil, texte_libre=""):
    return f"""
{SYSTEM_PROMPT}

Profil utilisateur :
- Séries aimées : {profil["aime"]}
- Séries neutres : {profil["neutre"]}
- Séries non aimées : {profil["naime_pas"]}
- Préférence libre utilisateur : {texte_libre or "aucune"}

Rappels :
- n'invente pas les goûts de l'utilisateur
- recommande 5 séries pertinentes
- réponse uniquement en JSON
"""


def parse_response(text):
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        start = text.find("[")
        end = text.rfind("]") + 1

        if start == -1 or end == 0:
            raise GeminiServiceError("Impossible d'extraire un JSON valide.")

        return json.loads(text[start:end])


def generer_recommandations_depuis_avis(avis_utilisateur, texte_libre=""):
    profil = construire_profil_depuis_avis(avis_utilisateur)
    prompt = construire_prompt(profil, texte_libre)

    try:
        response = model.generate_content(prompt)
    except Exception as exc:
        raise GeminiServiceError(f"Erreur Gemini : {exc}") from exc

    if not getattr(response, "text", None):
        raise GeminiServiceError("Réponse Gemini vide.")

    return parse_response(response.text)