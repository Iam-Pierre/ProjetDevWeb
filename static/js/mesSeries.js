document.getElementById("accueil-btn").addEventListener("click", () => {
    window.location.href = "/";
});

document.getElementById("categories-btn").addEventListener("click", () => {
    window.location.href = "/categories/series";
});

document.getElementById("recommandations-btn").addEventListener("click", () => {
    window.location.href = "/recommandation";
});

document.addEventListener("DOMContentLoaded", () => {
    const homeBtn = document.getElementById("saccueil-btn");
    const categoriesBtn = document.getElementById("categories-btn");
    const recommandationsBtn = document.getElementById("recommandations-btn");

    const mesAvisDiv = document.getElementById("mesAvis");
    const FALLBACK_IMAGE = "/static/manque.png";
    const avisEnregistres = new Map();

    if (homeBtn) {
        homeBtn.addEventListener("click", () => {
            window.location.href = "/";
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

    function safeText(value, fallback = "N/A") {
        if (value === null || value === undefined || value === "") {
            return fallback;
        }
        return String(value);
    }

    function safeArrayToText(value, fallback = "N/A") {
        if (!Array.isArray(value) || value.length === 0) {
            return fallback;
        }
        return value.join(", ");
    }

    function stripHtml(html) {
        const tmp = document.createElement("div");
        tmp.innerHTML = html || "";
        return tmp.textContent || tmp.innerText || "";
    }

    function normalizeSerie(raw) {
        return {
            id: raw.id ?? raw.tvmaze_id ?? raw["show.id"] ?? null,
            nom: raw.name ?? raw.nom ?? raw["show.name"] ?? "Titre inconnu",
            image_url: raw.image_url ?? raw["show.image.medium"] ?? FALLBACK_IMAGE,
            genres: raw.genres ?? raw["show.genres"] ?? [],
            status: raw.status ?? raw["show.status"] ?? null,
            premiered: raw.premiered ?? raw["show.premiered"] ?? null,
            ended: raw.ended ?? raw["show.ended"] ?? null,
            rating: raw.rating ?? raw["show.rating.average"] ?? null,
            summary: raw.summary ?? raw["show.summary"] ?? null
        };
    }

    async function apiGetJson(url) {
        const response = await fetch(url, {
            method: "GET",
            headers: { "Content-Type": "application/json" }
        });

        const data = await response.json().catch(() => null);

        if (!response.ok) {
            throw new Error(data?.error || `Erreur HTTP ${response.status}`);
        }

        return data;
    }

    async function apiPostJson(url, payload) {
        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        const data = await response.json().catch(() => null);

        if (!response.ok) {
            throw new Error(data?.error || `Erreur HTTP ${response.status}`);
        }

        return data;
    }

    async function chargerAvisDepuisBase() {
        const data = await apiGetJson("/api/avis");
        return Array.isArray(data.avis) ? data.avis : [];
    }

async function enregistrerAvisEnBase(serie, ressenti) {
    console.log(serie)
    return apiPostJson("/api/avis", {
        tvmaze_id: serie.id,
        nom: serie.nom,
        image_url: serie.image_url,
        genres: serie.genres,
        status: serie.status,
        premiere: serie.premiered,   
        fin: serie.ended,            
        rating: serie.rating,
        resume: serie.summary,       
        ressenti: ressenti
    });
}

    async function supprimerSerieEnBase(tvmazeId) {
        return apiPostJson("/api/delete-series", { tvmaze_id: tvmazeId });
    }

    async function getNbSaisons(showId) {
        try {
            const seasons = await apiGetJson(`https://api.tvmaze.com/shows/${showId}/seasons`);

            if (!Array.isArray(seasons) || seasons.length === 0) {
                return 0;
            }

            let maxSeason = 0;
            for (const season of seasons) {
                if (typeof season.number === "number" && season.number > maxSeason) {
                    maxSeason = season.number;
                }
            }

            return maxSeason;
        } catch {
            return 0;
        }
    }

    function buildCardHtml(serie, options = {}) {
        const {
            ressentiSelectionne = "vu_aime",
            afficherBoutonSupprimer = false,
            nombreDeSaisons = null
        } = options;

        const genresTexte = safeArrayToText(serie.genres);
        const statusTexte = safeText(serie.status);
        const premieredTexte = safeText(serie.premiered);
        const endedTexte = safeText(serie.ended, "");
        const ratingTexte = safeText(serie.rating);
        const saisonsTexte =
            typeof nombreDeSaisons === "number" && nombreDeSaisons > 0
                ? String(nombreDeSaisons)
                : "N/A";
        const summaryTexte = safeText(serie.summary);
        const nomPourLien = serie.nom.replace(/'/g, "\\'");

        return `
            <img class="logo" src="${escapeHtml(serie.image_url)}" alt="${escapeHtml(serie.nom)}">
            <div class="serie-content">
                <h3>${escapeHtml(serie.nom)}</h3>

                <button type="button" class="btn-trailer" onclick="TrailerYoutube('${nomPourLien}')">
                    ▶️ Trailer
                </button>

                <p><strong>Genres :</strong> ${escapeHtml(genresTexte)}</p>
                <p><strong>Status :</strong> ${escapeHtml(statusTexte)}</p>
                <p><strong>Première :</strong> ${escapeHtml(premieredTexte)}</p>
                ${endedTexte ? `<p><strong>Fin :</strong> ${escapeHtml(endedTexte)}</p>` : ""}
                <p><strong>Rating :</strong> ${escapeHtml(ratingTexte)}</p>
                <p><strong>Saisons :</strong> ${escapeHtml(saisonsTexte)}</p>
                <p><strong>Résumé :</strong> ${escapeHtml(stripHtml(summaryTexte))}</p>

                <div class="card-actions">
                    <select class="ressenti-select" id="ressenti-${serie.id}">
                        <option value="vu_aime" ${ressentiSelectionne === "vu_aime" ? "selected" : ""}>Vu & Aimé</option>
                        <option value="vu_neutre" ${ressentiSelectionne === "vu_neutre" ? "selected" : ""}>Vu & Neutre</option>
                        <option value="vu_pas_aime" ${ressentiSelectionne === "vu_pas_aime" ? "selected" : ""}>Vu & Pas aimé</option>
                        <option value="interesse" ${ressentiSelectionne === "interesse" ? "selected" : ""}>Intéressé</option>
                        <option value="pas_interesse" ${ressentiSelectionne === "pas_interesse" ? "selected" : ""}>Pas intéressé</option>
                    </select>

                    <button
                        type="button"
                        class="btn-avis"
                        data-id="${serie.id}"
                        data-nom="${escapeHtml(serie.nom)}"
                        data-image-url="${escapeHtml(serie.image_url)}"
                    >
                        Mettre à jour
                    </button>

                    ${afficherBoutonSupprimer ? `
                        <button type="button" class="btn-delete" data-id="${serie.id}">
                            Supprimer
                        </button>
                    ` : ""}
                </div>
            </div>
        `;
    }

    async function creerCarteSerie(serie, options = {}) {
        const card = document.createElement("div");
        card.className = "card serie-card";
        card.id = `card-${serie.id}`;
        card.dataset.tvmazeId = String(serie.id);

        const nombreDeSaisons = await getNbSaisons(serie.id);
        card.innerHTML = buildCardHtml(serie, { ...options, nombreDeSaisons });

        return card;
    }

    async function ajouterSerieDansMesAvis(serie, ressenti = "vu_aime") {
        const cardExistante = mesAvisDiv.querySelector(`#card-${serie.id}`);

        if (cardExistante) {
            const select = cardExistante.querySelector(".ressenti-select");
            if (select) {
                select.value = ressenti;
            }
            return;
        }

        const card = await creerCarteSerie(serie, {
            ressentiSelectionne: ressenti,
            afficherBoutonSupprimer: true
        });

        mesAvisDiv.appendChild(card);
    }

    async function chargerAvis() {
        try {
            const avis = await chargerAvisDepuisBase();
            mesAvisDiv.innerHTML = "";

            if (avis.length === 0) {
                mesAvisDiv.innerHTML = "<p>Aucune série enregistrée pour le moment.</p>";
                return;
            }

            for (const avisItem of avis) {
                const serie = normalizeSerie(avisItem);
                avisEnregistres.set(Number(serie.id), {
                    ...serie,
                    ressenti: avisItem.ressenti
                });
                await ajouterSerieDansMesAvis(serie, avisItem.ressenti);
            }
        } catch (error) {
            console.error("Erreur chargement avis :", error);
            mesAvisDiv.innerHTML = "<p>Impossible de charger les avis enregistrés.</p>";
        }
    }

    async function handleGlobalClick(event) {
        const boutonAvis = event.target.closest(".btn-avis");
        const boutonDelete = event.target.closest(".btn-delete");

        if (boutonAvis) {
            const card = boutonAvis.closest(".serie-card");
            if (!card) {
                return;
            }
            console.log(boutonAvis.dataset);
            const tvmazeId = Number(boutonAvis.dataset.id);
            const nom = boutonAvis.dataset.nom;
            const imageUrl = boutonAvis.dataset.imageUrl;
            const select = card.querySelector(".ressenti-select");

            if (!tvmazeId || !select) {
                return;
            }

            const ressenti = select.value;

            const serie = {
                id: tvmazeId,
                nom,
                image_url: imageUrl
            };

            try {
                const data = await enregistrerAvisEnBase(serie, ressenti);

                if (data.ok) {
                    avisEnregistres.set(tvmazeId, { ...serie, ressenti });
                    await ajouterSerieDansMesAvis(serie, ressenti);
                }
            } catch (error) {
                console.error("Erreur lors de l'enregistrement :", error);
                alert("Impossible d'enregistrer l'avis.");
            }

            return;
        }

        if (boutonDelete) {
            const card = boutonDelete.closest(".serie-card");
            if (!card) {
                return;
            }

            const tvmazeId = Number(boutonDelete.dataset.id);
            if (!tvmazeId) {
                return;
            }

            try {
                const data = await supprimerSerieEnBase(tvmazeId);

                if (data.ok) {
                    avisEnregistres.delete(tvmazeId);
                    card.remove();

                    if (!mesAvisDiv.querySelector(".serie-card")) {
                        mesAvisDiv.innerHTML = "<p>Aucune série enregistrée pour le moment.</p>";
                    }
                }
            } catch (error) {
                console.error("Erreur lors de la suppression :", error);
                alert("Impossible de supprimer cette série.");
            }
        }
    }

    document.addEventListener("click", handleGlobalClick);

    chargerAvis();

    window.TrailerYoutube = async function(nomSerie) {
        const nomEncode = encodeURIComponent(nomSerie);

        try {
            const response = await fetch(`/api/get_trailer?nom=${nomEncode}`);
            if (!response.ok) {
                throw new Error("Erreur serveur");
            }

            const data = await response.json();
            if (data.video_url) {
                window.open(data.video_url, "_blank");
            }
        } catch {
            window.open(`https://www.youtube.com/results?search_query=${nomEncode}+official+trailer`, "_blank");
        }
    };
});