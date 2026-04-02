from flask import Blueprint, g, request
from models import Avis
from routes.auth import login_required
from gemini import generer_recommandations

# Blueprint Flask pour recommandations
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

    # texte libre pour que l'user puisse écdrire
    texte_libre = request.args.get("texte", "").strip()

    # récup les avis des users
    avis_db = Avis.query.filter_by(user_id=g.user.id).all()

    # renvoie un message si user n'a aps laissé de message et mis d'avis
    if len(avis_db) == 0 and texte_libre == "":
        return {
            "ok": True,
            "recommendations": [],
            "message": "Ajoute des avis ou écris une préférence pour obtenir des recommandations."
        }, 200

    
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