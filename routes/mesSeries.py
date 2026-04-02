from flask import Blueprint, render_template

from routes.auth import login_required

apiSeries = Blueprint("apiSeries", __name__)


@apiSeries.route("/series", methods=["GET"])
@login_required
def page_mes_series():
    """
    Affiche la page des séries enregistrées par l'utilisateur.
    """
    return render_template("mesSeries.html")