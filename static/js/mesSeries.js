/*
    scriptMesSeries.js
    ------------------------------------------------------------
    - Charge les favoris depuis la DB Flask
    - Récupère les détails complets (TVmaze) pour chaque favori
    - Affiche : Résumé, Genres, Status, Rating, Saisons, Trailer
*/

document.addEventListener("DOMContentLoaded", () => {
    const mesAvisDiv = document.getElementById("mesAvis");
    const FALLBACK_IMAGE = "/static/manque.png";

    // =========================================================
    // Helpers
    // =========================================================

    function escapeHtml(value) {
        return String(value ?? "")
            .replaceAll("&", "&amp;").replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;").replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    }

    async function fetchJson(url, options = {}) {
        const response = await fetch(url, options);
        const data = await response.json().catch(() => null);
        if (!response.ok) throw new Error(data?.error || "Erreur réseau");
        return data;
    }

    // =========================================================
    // Rendu des Cartes (Full Infos)
    // =========================================================

    async function buildFullSavedCard(avis) {
        let details = {
            genres: [],
            status: "N/A",
            rating: "N/A",
            summary: "Résumé indisponible.",
            premiered: "N/A",
            nbSaisons: "N/A"
        };

        // 1. On va chercher les infos fraîches sur TVmaze avec l'ID
        try {
            const show = await fetchJson(`https://api.tvmaze.com/shows/${avis.tvmaze_id}?embed=seasons`);
            details.genres = show.genres || [];
            details.status = show.status || "N/A";
            details.rating = show.rating?.average || "N/A";
            details.summary = show.summary || "Aucun résumé.";
            details.premiered = show.premiered || "N/A";
            details.nbSaisons = show._embedded?.seasons ? Math.max(...show._embedded.seasons.map(s => s.number)) : "N/A";
        } catch (e) {
            console.error("Erreur récup détails TVmaze pour ID:", avis.tvmaze_id);
        }

        const nomSecurise = avis.nom.replace(/'/g, "\\'");
        const card = document.createElement("div");
        card.className = "card serie-card";
        card.id = `card-${avis.tvmaze_id}`;

        card.innerHTML = `
            <img class="logo" src="${escapeHtml(avis.image_url || FALLBACK_IMAGE)}" alt="${escapeHtml(avis.nom)}">
            <div class="serie-content">
                <h3>${escapeHtml(avis.nom)}</h3>
                
                <button type="button" class="btn-trailer" onclick="window.TrailerYoutube('${nomSecurise}')">
                    ▶️ Voir le Trailer
                </button>

                <p><strong>Genres :</strong> ${escapeHtml(details.genres.join(", "))}</p>
                <p><strong>Status :</strong> ${escapeHtml(details.status)}</p>
                <p><strong>Note :</strong> ${escapeHtml(details.rating)}/10</p>
                <p><strong>Saisons :</strong> ${details.nbSaisons}</p>
                
                <div class="summary-box">
                    <strong>Résumé :</strong> ${details.summary}
                </div>

                <div class="card-actions">
                    <hr>
                    <label><strong>Mon ressenti actuel :</strong></label>
                    <select class="ressenti-select" id="select-${avis.tvmaze_id}">
                        <option value="vu_aime" ${avis.ressenti === 'vu_aime' ? 'selected' : ''}>Vu & Aimé</option>
                        <option value="vu_neutre" ${avis.ressenti === 'vu_neutre' ? 'selected' : ''}>Vu & Neutre</option>
                        <option value="vu_pas_aime" ${avis.ressenti === 'vu_pas_aime' ? 'selected' : ''}>Vu & Pas aimé</option>
                        <option value="interesse" ${avis.ressenti === 'interesse' ? 'selected' : ''}>Intéressé</option>
                        <option value="pas_interesse" ${avis.ressenti === 'pas_interesse' ? 'selected' : ''}>Pas intéressé</option>
                    </select>

                    <div class="button-group">
                        <button type="button" class="btn-update" onclick="window.EnregistrerAvis(${avis.tvmaze_id}, '${nomSecurise}', '${escapeHtml(avis.image_url)}')">
                            Mettre à jour
                        </button>
                        <button type="button" class="btn-delete" onclick="window.SupprimerAvis(${avis.tvmaze_id})">
                            Supprimer
                        </button>
                    </div>
                </div>
            </div>
        `;
        return card;
    }

    // =========================================================
    // Fonctions Globales (YouTube, Update, Delete)
    // =========================================================

    window.TrailerYoutube = async function(nomSerie) {
        const nomEncode = encodeURIComponent(nomSerie);
        try {
            const data = await fetchJson(`/api/get_trailer?nom=${nomEncode}`);
            if (data.video_url) window.open(data.video_url, '_blank');
        } catch (e) {
            window.open(`https://www.youtube.com/results?search_query=${nomEncode}+trailer`, '_blank');
        }
    };

    window.EnregistrerAvis = async function(id, nom, imageUrl) {
        const select = document.getElementById(`select-${id}`);
        try {
            await fetchJson("/api/avis", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ tvmaze_id: id, nom, image_url: imageUrl, ressenti: select.value })
            });
            alert("Ressenti mis à jour !");
        } catch (e) { alert("Erreur mise à jour."); }
    };

    window.SupprimerAvis = async function(id) {
        if (!confirm("Supprimer cette série ?")) return;
        try {
            const data = await fetchJson("/api/delete-series", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ tvmaze_id: id })
            });
            if (data.ok) document.getElementById(`card-${id}`).remove();
        } catch (e) { alert("Erreur suppression."); }
    };

    // =========================================================
    // Lancement
    // =========================================================

    async function chargerMesSeries() {
        mesAvisDiv.innerHTML = "<p>Chargement de ta collection...</p>";
        try {
            const data = await fetchJson("/api/avis");
            mesAvisDiv.innerHTML = "";
            if (!data.avis || data.avis.length === 0) {
                mesAvisDiv.innerHTML = "<p>Aucune série enregistrée pour le moment.</p>";
                return;
            }
            for (const item of data.avis) {
                const card = await buildFullSavedCard(item);
                mesAvisDiv.appendChild(card);
            }
        } catch (err) { mesAvisDiv.innerHTML = "<p>Erreur lors du chargement.</p>"; }
    }

    chargerMesSeries();
});