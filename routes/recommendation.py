from flask import Blueprint, g, request
from models import Avis
from routes.auth import login_required
from gemini import generer_recommandations

# Blueprint Flask dédié aux recommandations
apiRecommendation = Blueprint("apiRecommendation", __name__)


@apiRecommendation.route("/api/recommandation", methods=["GET"])
@login_required
def get_recommandations():
    """
    Route appelée par le JavaScript de la page recommandation.

    Elle :
    1. récupère les avis de l'utilisateur connecté
    2. récupère le texte libre envoyé dans l'URL
    3. appelle Gemini
    4. renvoie les recommandations en JSON
    """

    # Texte libre saisi par l'utilisateur dans l'input
    texte_libre = request.args.get("texte", "").strip()

    # On récupère tous les avis de l'utilisateur connecté
    avis_db = Avis.query.filter_by(user_id=g.user.id).all()

    # Si l'utilisateur n'a aucun avis et aucun texte, on renvoie un message
    if len(avis_db) == 0 and texte_libre == "":
        return {
            "ok": True,
            "recommendations": [],
            "message": "Ajoute des avis ou écris une préférence pour obtenir des recommandations."
        }, 200

    # On prépare une version simple des avis pour Gemini
    avis_utilisateur = []

    for avis in avis_db:
        avis_utilisateur.append({
            "title": avis.serie.title,
            "ressenti": avis.ressenti
        })

    try:
        recommandations = generer_recommandations(avis_utilisateur, texte_libre)

        return {
            "ok": True,
            "recommendations": recommandations
        }, 200

    except Exception as e:
        return {
            "ok": False,
            "error": str(e)
        }, 500