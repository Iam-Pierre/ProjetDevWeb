document.addEventListener("DOMContentLoaded", () => {
    const top10Btn = document.getElementById("top10");
    const categoryBtn = document.getElementById("categoryBtn");
    const categorySelect = document.getElementById("category");
    const resultatsDiv = document.getElementById("resultats");

    const FALLBACK_IMAGE = "/static/manque.png";

    // --- Fonction de log pour le debug ---
    const debug = (msg, data = "") => console.log(`[DEBUG] ${msg}`, data);

    async function fetchJson(url) {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Erreur HTTP: ${response.status}`);
        return await response.json();
    }

    // --- Rendu d'une carte ---
    async function buildCard(serie) {
        const nomSecurise = (serie.name || serie.nom || "Inconnu").replace(/'/g, "\\'");
        const imageUrl = serie.image?.medium || serie.image_url || FALLBACK_IMAGE;
        
        // On essaie de choper les saisons via l'ID
        let nbSaisons = "N/A";
        if (serie.id) {
            try {
                const seasons = await fetchJson(`https://api.tvmaze.com/shows/${serie.id}/seasons`);
                nbSaisons = seasons.length;
            } catch(e) {}
        }

        const card = document.createElement("div");
        card.className = "card serie-card";
        card.innerHTML = `
            <img class="logo" src="${imageUrl}" alt="Poster">
            <div class="serie-content">
                <h3>${serie.name || serie.nom || "Titre inconnu"}</h3>
                <button type="button" class="btn-trailer" onclick="window.TrailerYoutube('${nomSecurise}')">▶️ Trailer</button>
                <p><strong>Note :</strong> ${serie.rating?.average || serie.rating || "N/A"}/10</p>
                <p><strong>Saisons :</strong> ${nbSaisons}</p>
                <div class="summary-box">${serie.summary || "Aucun résumé."}</div>
                <div class="card-actions">
                    <select class="ressenti-select" id="select-${serie.id}">
                        <option value="vu_aime">Vu & Aimé</option>
                        <option value="interesse">Intéressé</option>
                        <option value="pas_interesse">Pas intéressé</option>
                    </select>
                    <button type="button" class="btn-avis" onclick="window.EnregistrerAvis(${serie.id}, '${nomSecurise}', '${imageUrl}')">Sauvegarder</button>
                </div>
            </div>`;
        return card;
    }

    // --- Affichage des résultats ---
    async function afficherSeries(data) {
        resultatsDiv.innerHTML = "";
        if (!data || data.length === 0) {
            resultatsDiv.innerHTML = "<p>Aucun résultat trouvé pour cette sélection.</p>";
            return;
        }
        for (const item of data) {
            // TVmaze renvoie parfois {score: ..., show: {...}}
            const s = item.show ? item.show : item; 
            const card = await buildCard(s);
            resultatsDiv.appendChild(card);
        }
    }

    // --- Événement Catégorie ---
    if (categoryBtn) {
        categoryBtn.addEventListener("click", async () => {
            const cat = categorySelect.value;
            debug("Valeur du select récupérée :", cat);

            if (!cat || cat === "") {
                alert("Veuillez choisir une catégorie !");
                return;
            }

            resultatsDiv.innerHTML = "<p>Chargement des séries...</p>";
            
            try {
                const url = `/api/series_by_category?category=${encodeURIComponent(cat)}`;
                debug("Appel de l'URL :", url);
                
                const data = await fetchJson(url);
                debug("Données reçues du serveur :", data);
                
                await afficherSeries(data);
            } catch (e) {
                console.error("Erreur Fetch :", e);
                resultatsDiv.innerHTML = "<p>Erreur lors de la récupération des données.</p>";
            }
        });
    }

    // --- Événement Top 10 ---
    if (top10Btn) {
        top10Btn.addEventListener("click", async () => {
            resultatsDiv.innerHTML = "<p>Chargement du Top 10...</p>";
            try {
                const data = await fetchJson("/api/top10");
                await afficherSeries(data);
            } catch (e) { console.error(e); }
        });
    }

    // --- Fonctions Globales ---
    window.TrailerYoutube = async (nom) => {
        try {
            const resp = await fetch(`/api/get_trailer?nom=${encodeURIComponent(nom)}`);
            const d = await resp.json();
            window.open(d.video_url || `https://www.youtube.com/results?search_query=${nom}+trailer`, '_blank');
        } catch(e) { window.open(`https://www.youtube.com/results?search_query=${nom}+trailer`, '_blank'); }
    };

    window.EnregistrerAvis = async (id, nom, img) => {
        const res = document.getElementById(`select-${id}`).value;
        await fetch("/api/avis", {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({tvmaze_id: id, nom: nom, image_url: img, ressenti: res})
        });
        alert("Enregistré !");
    };
});