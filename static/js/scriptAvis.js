/*
    scriptAvis.js
    ------------------------------------------------------------
    Version fusionnée finale :
    - recherche via backend Flask
    - top 10
    - filtre par catégorie
    - chargement des avis enregistrés
    - déplacement dynamique d'une card vers "Mes avis"
    - suppression depuis la base + suppression visuelle
    - pas de doublons
    - commentaires propres pour compréhension
*/

document.addEventListener("DOMContentLoaded", () => {
    // =========================================================
    // Sélecteurs DOM
    // =========================================================
    const formRecherche = document.getElementById("formRecherche");
    const searchInput = document.getElementById("searchInput");
    const resultatsDiv = document.getElementById("resultats");
    const mesAvisDiv = document.getElementById("mesAvis");

    const top10Btn = document.getElementById("top10");
    const categoryBtn = document.getElementById("categoryBtn");
    const categorySelect = document.getElementById("category");

    const FALLBACK_IMAGE = "/static/manque.png";

    /*
        Map locale des séries déjà enregistrées dans "Mes avis".
        clé   = tvmaze_id
        valeur = infos utiles de la série + ressenti
    */
    const avisEnregistres = new Map();

    // =========================================================
    // Helpers utilitaires
    // =========================================================

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

    /*
        Le backend fusionné renvoie déjà un format homogène.
        Mais cette fonction garde le code robuste si un jour
        une autre source revient avec une structure différente.
    */
    function normalizeSerie(raw) {
        return {
            id: raw.id ?? raw["show.id"] ?? null,
            nom: raw.name ?? raw["show.name"] ?? "Titre inconnu",
            image_url: raw.image_url ?? raw["show.image.medium"] ?? FALLBACK_IMAGE,
            genres: raw.genres ?? raw["show.genres"] ?? [],
            status: raw.status ?? raw["show.status"] ?? null,
            premiered: raw.premiered ?? raw["show.premiered"] ?? null,
            ended: raw.ended ?? raw["show.ended"] ?? null,
            rating: raw.rating ?? raw["show.rating.average"] ?? null,
            summary: raw.summary ?? raw["show.summary"] ?? null
        };
    }

    // =========================================================
    // Fonctions API
    // =========================================================

    async function apiGetJson(url) {
        const response = await fetch(url, {
            method: "GET",
            headers: {
                "Content-Type": "application/json"
            }
        });

        const data = await response.json().catch(() => null);

        if (!response.ok) {
            const message = data?.error || `Erreur HTTP ${response.status}`;
            throw new Error(message);
        }

        return data;
    }

    async function apiPostJson(url, payload) {
        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json().catch(() => null);

        if (!response.ok) {
            const message = data?.error || `Erreur HTTP ${response.status}`;
            throw new Error(message);
        }

        return data;
    }

    async function rechercherSeries(query) {
        const params = new URLSearchParams({ query });
        const rawData = await apiGetJson(`/api/search_series?${params.toString()}`);
        return rawData.map(normalizeSerie);
    }

    async function chargerTop10() {
        const rawData = await apiGetJson("/api/top10");
        return rawData.map(normalizeSerie);
    }

    async function chargerSeriesParCategorie(category) {
        const params = new URLSearchParams({ category });
        const rawData = await apiGetJson(`/api/series_by_category?${params.toString()}`);
        return rawData.map(normalizeSerie);
    }

    async function chargerAvisDepuisBase() {
        const data = await apiGetJson("/api/avis");
        return Array.isArray(data.avis) ? data.avis : [];
    }

    async function enregistrerAvisEnBase(serie, ressenti) {
        return apiPostJson("/api/avis", {
            tvmaze_id: serie.id,
            nom: serie.nom,
            image_url: serie.image_url,
            ressenti
        });
    }

    async function supprimerSerieEnBase(tvmazeId) {
        return apiPostJson("/api/delete-series", {
            tvmaze_id: tvmazeId
        });
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
        } catch (error) {
            console.error("Impossible de récupérer les saisons :", error);
            return 0;
        }
    }
    
    // =========================================================
    // Rendu des cards
    // =========================================================

    function stripHtml(html) {
        const tmp = document.createElement("div");
        tmp.innerHTML = html;
        return tmp.textContent || tmp.innerText || "";
    }

    function buildCardHtml(serie, options = {}) {
        const {
            ressentiSelectionne = "vu_aime",
            boutonLabel = "Enregistrer",
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
                        ${escapeHtml(boutonLabel)}
                    </button>

                    ${
                        afficherBoutonSupprimer
                            ? `
                                <button
                                    type="button"
                                    class="btn-delete"
                                    data-id="${serie.id}"
                                >
                                    Supprimer
                                </button>
                            `
                            : ""
                    }
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

        card.innerHTML = buildCardHtml(serie, {
            ...options,
            nombreDeSaisons
        });

        return card;
    }

    function afficherMessageResultats(message) {
        resultatsDiv.innerHTML = `<p>${escapeHtml(message)}</p>`;
    }

    async function ajouterSerieDansResultats(serie) {
        // Ne jamais réafficher une série déjà enregistrée
        if (avisEnregistres.has(Number(serie.id))) {
            return;
        }

        // Éviter aussi les doublons visuels dans les résultats
        if (resultatsDiv.querySelector(`#card-${serie.id}`)) {
            return;
        }

        const card = await creerCarteSerie(serie, {
            boutonLabel: "Enregistrer",
            afficherBoutonSupprimer: false
        });

        resultatsDiv.appendChild(card);
    }

    async function ajouterSerieDansMesAvis(serie, ressenti = "vu_aime") {
        const cardExistante = mesAvisDiv.querySelector(`#card-${serie.id}`);

        // Si elle existe déjà dans "Mes avis", on met à jour le select
        if (cardExistante) {
            const select = cardExistante.querySelector(".ressenti-select");
            const bouton = cardExistante.querySelector(".btn-avis");

            if (select) {
                select.value = ressenti;
            }

            if (bouton) {
                bouton.textContent = "Mettre à jour";
            }

            return;
        }

        // Si la card existe dans les résultats, on la déplace
        const cardDansResultats = resultatsDiv.querySelector(`#card-${serie.id}`);
        if (cardDansResultats) {
            const select = cardDansResultats.querySelector(".ressenti-select");
            const bouton = cardDansResultats.querySelector(".btn-avis");

            if (select) {
                select.value = ressenti;
            }

            if (bouton) {
                bouton.textContent = "Mettre à jour";
            }

            // Ajouter le bouton supprimer si absent
            const actions = cardDansResultats.querySelector(".card-actions");
            if (actions && !cardDansResultats.querySelector(".btn-delete")) {
                const deleteBtn = document.createElement("button");
                deleteBtn.type = "button";
                deleteBtn.className = "btn-delete";
                deleteBtn.dataset.id = String(serie.id);
                deleteBtn.textContent = "Supprimer";
                actions.appendChild(deleteBtn);
            }

            mesAvisDiv.appendChild(cardDansResultats);
            return;
        }

        // Sinon, on la crée directement dans Mes avis
        const card = await creerCarteSerie(serie, {
            ressentiSelectionne: ressenti,
            boutonLabel: "Mettre à jour",
            afficherBoutonSupprimer: true
        });

        mesAvisDiv.appendChild(card);
    }

    async function afficherListeSeries(series) {
        resultatsDiv.innerHTML = "";

        const seriesFiltrees = series.filter((serie) => !avisEnregistres.has(Number(serie.id)));

        if (seriesFiltrees.length === 0) {
            afficherMessageResultats("Aucune série à afficher.");
            return;
        }

        for (const serie of seriesFiltrees) {
            await ajouterSerieDansResultats(serie);
        }
    }

    // =========================================================
    // Chargement initial des avis
    // =========================================================

    async function chargerAvis() {
        try {
            const avis = await chargerAvisDepuisBase();
            mesAvisDiv.innerHTML = "";

            for (const avisItem of avis) {
                const serie = normalizeSerie({
                    id: avisItem.tvmaze_id,
                    name: avisItem.nom,
                    image_url: avisItem.image_url
                });

                avisEnregistres.set(Number(serie.id), {
                    ...serie,
                    ressenti: avisItem.ressenti
                });

                await ajouterSerieDansMesAvis(serie, avisItem.ressenti);
            }
        } catch (error) {
            console.error("Erreur lors du chargement des avis :", error);
            mesAvisDiv.innerHTML = "<p>Impossible de charger les avis enregistrés.</p>";
        }
    }

    // =========================================================
    // Handlers
    // =========================================================

    async function handleRecherche(event) {
        event.preventDefault();

        const query = searchInput?.value.trim();

        if (!query) {
            afficherMessageResultats("Veuillez saisir un nom de série.");
            return;
        }

        try {
            const series = await rechercherSeries(query);
            await afficherListeSeries(series);
        } catch (error) {
            console.error("Erreur lors de la recherche :", error);
            afficherMessageResultats("Une erreur est survenue pendant la recherche.");
        }
    }

    async function handleTop10(event) {
        event.preventDefault();

        try {
            const series = await chargerTop10();
            await afficherListeSeries(series);
        } catch (error) {
            console.error("Erreur lors du chargement du top 10 :", error);
            afficherMessageResultats("Impossible de charger le top 10.");
        }
    }

    async function handleCategorie(event) {
        event.preventDefault();

        const category = categorySelect?.value?.trim();

        if (!category) {
            afficherMessageResultats("Veuillez choisir une catégorie.");
            return;
        }

        try {
            const series = await chargerSeriesParCategorie(category);
            await afficherListeSeries(series);
        } catch (error) {
            console.error("Erreur lors du chargement par catégorie :", error);
            afficherMessageResultats("Impossible de charger les séries de cette catégorie.");
        }
    }

    async function handleGlobalClick(event) {
        const boutonAvis = event.target.closest(".btn-avis");
        const boutonDelete = event.target.closest(".btn-delete");

        // Enregistrement ou mise à jour d'un avis
        if (boutonAvis) {
            const card = boutonAvis.closest(".serie-card");
            if (!card) {
                return;
            }

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
                image_url: imageUrl,
                genres: [],
                status: null,
                premiered: null,
                ended: null,
                rating: null,
                summary: null
            };

            try {
                const data = await enregistrerAvisEnBase(serie, ressenti);

                if (data.ok) {
                    avisEnregistres.set(tvmazeId, {
                        ...serie,
                        ressenti
                    });

                    await ajouterSerieDansMesAvis(serie, ressenti);
                }
            } catch (error) {
                console.error("Erreur lors de l'enregistrement :", error);
                alert("Impossible d'enregistrer l'avis.");
            }

            return;
        }

        // Suppression d'un avis
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
                }
            } catch (error) {
                console.error("Erreur lors de la suppression :", error);
                alert("Impossible de supprimer cette série.");
            }
        }
    }

    // =========================================================
    // Bind events
    // =========================================================

    if (formRecherche) {
        formRecherche.addEventListener("submit", handleRecherche);
    }

    if (top10Btn) {
        top10Btn.addEventListener("click", handleTop10);
    }

    if (categoryBtn) {
        categoryBtn.addEventListener("click", handleCategorie);
    }

    // Délégation globale pour gérer les éléments créés dynamiquement
    document.addEventListener("click", handleGlobalClick);

    // =========================================================
    // Lancement initial
    // =========================================================
    chargerAvis();

    // À mettre vers la fin de scriptAvis.js
    window.TrailerYoutube = async function(nomSerie) {
        console.log("Recherche du trailer pour : " + nomSerie);
        const nomEncode = encodeURIComponent(nomSerie);

        try {
            const response = await fetch(`/api/get_trailer?nom=${nomEncode}`);
            if (!response.ok) throw new Error("Erreur serveur");

            const data = await response.json();
            if (data.video_url) {
                window.open(data.video_url, '_blank');
            }
        } catch (error) {
            console.error("Erreur trailer :", error);
            const backupUrl = `https://www.youtube.com/results?search_query=${nomEncode}+official+trailer`;
            window.open(backupUrl, '_blank');
        }
    };

});