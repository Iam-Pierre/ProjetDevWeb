document.getElementById("series-btn").addEventListener("click", () => {
    window.location.href = "/series";
});

document.getElementById("categories-btn").addEventListener("click", () => {
    window.location.href = "/categories/series";
});

document.getElementById("recommandations-btn").addEventListener("click", () => {
    window.location.href = "/recommandation";
});

document.getElementById("logout-btn").addEventListener("click", async (e) => {
    
    const response = await fetch('/api/logout', {
        method: 'POST',
        });

    const data = await response.json();
    if (data.ok) {
        window.location.href = "/";  
    }
});

document.addEventListener("DOMContentLoaded", () => {
    const homeBtn = document.getElementById("home-btn");
    const seriesBtn = document.getElementById("series-btn");
    const categoriesBtn = document.getElementById("categories-btn");
    const recommandationsBtn = document.getElementById("recommandations-btn");

    const formRecherche = document.getElementById("formRecherche");
    const searchInput = document.getElementById("searchInput");
    const resultatsDiv = document.getElementById("resultats");

    const FALLBACK_IMAGE = "/static/manque.png";

    if (homeBtn) {
        homeBtn.addEventListener("click", () => {
            window.location.href = "/";
        });
    }

    if (seriesBtn) {
        seriesBtn.addEventListener("click", () => {
            window.location.href = "/series";
        });
    }

    if (categoriesBtn) {
        categoriesBtn.addEventListener("click", () => {
            window.location.href = "/categories/series";
        });
    }

    if (recommandationsBtn) {
        recommandationsBtn.addEventListener("click", () => {
            window.location.href = "/recommandation";
        });
    }

    function escapeHtml(value) {
        return String(value ?? "")
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
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

    async function fetchJson(url, options = {}) {
        const response = await fetch(url, options);
        const data = await response.json().catch(() => null);

        if (!response.ok) {
            throw new Error(data?.error || "Erreur réseau");
        }

        return data;
    }

    async function getNbSaisons(showId) {
        try {
            const seasons = await fetchJson(`https://api.tvmaze.com/shows/${showId}/seasons`);
            return Array.isArray(seasons) && seasons.length > 0
                ? Math.max(...seasons.map((s) => s.number || 0))
                : "N/A";
        } catch {
            return "N/A";
        }
    }

    function afficherMessage(message, type = "info") {
        const ancienneZone = document.getElementById("message-accueil");

        if (ancienneZone) {
            ancienneZone.remove();
        }

        const messageDiv = document.createElement("div");
        messageDiv.id = "message-accueil";
        messageDiv.className = `message message-${type}`;
        messageDiv.textContent = message;

        resultatsDiv.parentNode.insertBefore(messageDiv, resultatsDiv);

        setTimeout(() => {
            if (messageDiv) {
                messageDiv.remove();
            }
        }, 2500);
    }

    async function buildCard(serie) {
        const nbSaisons = await getNbSaisons(serie.id);
        const nomSecurise = serie.nom.replace(/'/g, "\\'");
        const genresTexte = Array.isArray(serie.genres) ? serie.genres.join(", ") : "N/A";

        const card = document.createElement("div");
        card.className = "card serie-card";
        card.dataset.serieId = serie.id;

        card.innerHTML = `
            <img class="logo" src="${escapeHtml(serie.image_url)}" alt="${escapeHtml(serie.nom)}">
            <div class="serie-content">
                <h3>${escapeHtml(serie.nom)}</h3>

                <button type="button" class="btn-trailer" onclick="window.TrailerYoutube('${nomSecurise}')">
                    Voir le Trailer
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
                    <label><strong>Ton ressenti :</strong></label>
                    <select class="ressenti-select" id="select-${serie.id}">
                        <option value="vu_aime">Vu & Aimé</option>
                        <option value="vu_neutre">Vu & Neutre</option>
                        <option value="vu_pas_aime">Vu & Pas aimé</option>
                        <option value="interesse">Intéressé</option>
                        <option value="pas_interesse">Pas intéressé</option>
                    </select>

                    <button
                        type="button"
                        class="btn-avis"
                        onclick="window.EnregistrerAvis(${serie.id}, '${nomSecurise}', '${escapeHtml(serie.image_url)}')"
                    >
                        Sauvegarder mon avis
                    </button>
                </div>
            </div>
        `;

        return card;
    }

    window.TrailerYoutube = async function(nomSerie) {
        const nomEncode = encodeURIComponent(nomSerie);

        try {
            const data = await fetchJson(`/api/get_trailer?nom=${nomEncode}`);
            if (data.video_url) {
                window.open(data.video_url, "_blank");
            }
        } catch {
            window.open(`https://www.youtube.com/results?search_query=${nomEncode}+official+trailer`, "_blank");
        }
    };

    window.EnregistrerAvis = async function(id, nom, imageUrl, genres, status) {
        const select = document.getElementById(`select-${id}`);
        const ressenti = select ? select.value : "vu_aime";
        const card = document.querySelector(`[data-serie-id="${id}"]`);

        try {
            const data = await fetchJson("/api/avis", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    tvmaze_id: id,
                    nom: nom,
                    image_url: imageUrl,
                    ressenti: ressenti,
                    genres: genres,
                    status: status
                })
            });

            if (data.ok) {
                afficherMessage(`Avis enregistré pour "${nom}".`, "success");

                if (card) {
                    card.style.transition = "opacity 0.3s ease, transform 0.3s ease";
                    card.style.opacity = "0";
                    card.style.transform = "scale(0.98)";

                    setTimeout(() => {
                        card.remove();

                        if (resultatsDiv.children.length === 0) {
                            resultatsDiv.innerHTML = "<p>Toutes les séries affichées ont été traitées.</p>";
                        }
                    }, 300);
                }
            }
        } catch {
            afficherMessage("Erreur lors de l'enregistrement de l'avis.", "error");
        }
    };

    if (formRecherche) {
        formRecherche.addEventListener("submit", async (e) => {
            e.preventDefault();

            const query = searchInput.value.trim();
            if (!query) {
                resultatsDiv.innerHTML = "<p>Veuillez saisir un nom de série.</p>";
                return;
            }

            resultatsDiv.innerHTML = "<p class='loading'>Recherche des séries...</p>";

            try {
                const rawData = await fetchJson(`/api/search_series?query=${encodeURIComponent(query)}`);

                resultatsDiv.innerHTML = "";

                if (!rawData || rawData.length === 0) {
                    resultatsDiv.innerHTML = "<p>Aucun résultat trouvé pour cette recherche.</p>";
                    return;
                }

                for (const item of rawData) {
                    const serie = normalizeSerie(item);
                    const card = await buildCard(serie);
                    resultatsDiv.appendChild(card);
                }
            } catch {
                resultatsDiv.innerHTML = "<p>Erreur lors de la connexion au serveur.</p>";
            }
        });
    }
});