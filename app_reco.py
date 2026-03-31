from flask import Flask, render_template, request, jsonify
from tvmaze import get_candidates_from_tvmaze
from gemini import generer_recommandations

app = Flask(__name__)


@app.route("/")
def page_recommandations():
    return render_template("recommandations.html")


@app.route("/api/recommandations", methods=["POST"])
def api_recommandations():
    data = request.get_json() or {}
    texte = data.get("texte", "").strip()

    # Profil simulé temporaire pour ton proto
    profil = {
        "aime": ["Dark", "Breaking Bad", "Black Mirror"],
        "neutre": ["Lupin"],
        "naime_pas": ["Elite"],
        "interesse": [],
        "pas_interesse": [],
        "texte_libre": texte
    }

    try:
        candidates = get_candidates_from_tvmaze(texte or "dark")
        recommandations = generer_recommandations(
            profil=profil,
            series_candidates=candidates,
            nb_recos=5
        )
        return jsonify({"ok": True, "recommandations": recommandations})
    except Exception as e:
        return jsonify({"ok": False, "error": str(e)}), 500


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5001, debug=True)