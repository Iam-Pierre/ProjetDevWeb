/*
    scriptAvis.js - Version "Full Infos" + Trailer + Ressenti
*/

document.addEventListener("DOMContentLoaded", () => {
    const formRecherche = document.getElementById("formRecherche");
    const searchInput = document.getElementById("searchInput");
    const resultatsDiv = document.getElementById("resultats");

    const FALLBACK_IMAGE = "/static/manque.png";

    // =========================================================
    // Helpers & Normalisation (On garde TOUT)
    // =========================================================

    function escapeHtml(value) {
        return String(value ?? "")
            .replaceAll("&", "&amp;").replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;").replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    }

    function normalizeSerie(raw) {
        return {
            id: raw.id ?? raw["show.id"] ?? null,
            nom: raw.name ?? raw["show.name"] ?? "Titre inconnu",
            image_url: raw.image_url ?? raw["show.image.medium"] ?? FALLBACK_IMAGE,
            genres: raw.genres ?? raw["show.genres"] ?? [],
            status: raw.status ?? raw["show.status"] ?? "N/A",
            premiered: raw.premiered ?? raw["show.premiered"] ?? "N/A",
            ended: raw.ended ?? raw["show.ended"] ?? "",
            rating: raw.rating ?? raw["show.rating.average"] ?? "N/A",
            summary: raw.summary ?? raw["show.summary"] ?? "Aucun résumé disponible."
        };
    }

    // =========================================================
    // Appels API
    // =========================================================

    async function fetchJson(url, options = {}) {
        const response = await fetch(url, options);
        const data = await response.json().catch(() => null);
        if (!response.ok) throw new Error(data?.error || "Erreur réseau");
        return data;
    }

    async function getNbSaisons(showId) {
        try {
            const seasons = await fetchJson(`https://api.tvmaze.com/shows/${showId}/seasons`);
            return Array.isArray(seasons) && seasons.length > 0 
                ? Math.max(...seasons.map(s => s.number || 0)) 
                : "N/A";
        } catch { return "N/A"; }
    }

    // =========================================================
    // Rendu des Cartes (Affichage Maximum d'Infos)
    // =========================================================

    async function buildCard(serie) {
        const nbSaisons = await getNbSaisons(serie.id);
        const nomSecurise = serie.nom.replace(/'/g, "\\'");
        const genresTexte = Array.isArray(serie.genres) ? serie.genres.join(", ") : "N/A";
        
        const card = document.createElement("div");
        card.className = "card serie-card";
        card.innerHTML = `
            <img class="logo" src="${escapeHtml(serie.image_url)}" alt="${escapeHtml(serie.nom)}">
            <div class="serie-content">
                <h3>${escapeHtml(serie.nom)}</h3>
                
                <button type="button" class="btn-trailer" onclick="window.TrailerYoutube('${nomSecurise}')">
                    ▶️ Voir le Trailer
                </button>

                <p><strong>Genres :</strong> ${escapeHtml(genresTexte)}</p>
                <p><strong>Status :</strong> ${escapeHtml(serie.status)}</p>
                <p><strong>Première :</strong> ${escapeHtml(serie.premiered)}</p>
                ${serie.ended ? `<p><strong>Fin :</strong> ${escapeHtml(serie.ended)}</p>` : ""}
                <p><strong>Rating :</strong> ${escapeHtml(serie.rating)}/10</p>
                <p><strong>Saisons :</strong> ${nbSaisons}</p>
                <div class="summary-box">
                    <strong>Résumé :</strong> ${serie.summary}
                </div>
                
                <div class="card-actions">
                    <hr>
                    <label><strong>Ton ressenti :</strong></label>
                    <select class="ressenti-select" id="select-${serie.id}">
                        <option value="vu_aime">Vu & Aimé</option>
                        <option value="vu_neutre">Vu & Neutre</option>
                        <option value="vu_pas_aime">Vu & Pas aimé</option>
                        <option value="interesse">Intéressé</option>
                        <option value="pas_interesse">Pas intéressé</option>
                    </select>
                    <button type="button" class="btn-avis" onclick="window.EnregistrerAvis(${serie.id}, '${nomSecurise}', '${escapeHtml(serie.image_url)}')">
                        Sauvegarder mon avis
                    </button>
                </div>
            </div>
        `;
        return card;
    }

    // =========================================================
    // Fonctions Globales
    // =========================================================

    window.TrailerYoutube = async function(nomSerie) {
        const nomEncode = encodeURIComponent(nomSerie);
        try {
            const data = await fetchJson(`/api/get_trailer?nom=${nomEncode}`);
            if (data.video_url) window.open(data.video_url, '_blank');
        } catch (e) {
            window.open(`https://www.youtube.com/results?search_query=${nomEncode}+official+trailer`, '_blank');
        }
    };

    window.EnregistrerAvis = async function(id, nom, imageUrl) {
        const select = document.getElementById(`select-${id}`);
        const ressenti = select ? select.value : "vu_aime";

        try {
            const data = await fetchJson("/api/avis", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ tvmaze_id: id, nom: nom, image_url: imageUrl, ressenti: ressenti })
            });
            if (data.ok) alert(`Avis enregistré pour "${nom}" !`);
        } catch (e) {
            alert("Erreur lors de l'enregistrement de l'avis.");
        }
    };

    // =========================================================
    // Événement Recherche
    // =========================================================

    formRecherche.addEventListener("submit", async (e) => {
        e.preventDefault();
        const query = searchInput.value.trim();
        if (!query) return;

        resultatsDiv.innerHTML = "<p class='loading'>Recherche des meilleures séries...</p>";
        
        try {
            const rawData = await fetchJson(`/api/search_series?query=${encodeURIComponent(query)}`);
            
            resultatsDiv.innerHTML = "";
            if (!rawData || rawData.length === 0) {
                resultatsDiv.innerHTML = "<p>Aucun résultat trouvé pour cette recherche.</p>";
            } else {
                for (const item of rawData) {
                    const s = normalizeSerie(item);
                    const card = await buildCard(s);
                    resultatsDiv.appendChild(card);
                }
            }
        } catch (err) {
            resultatsDiv.innerHTML = "<p>Erreur lors de la connexion au serveur.</p>";
        }
    });
});