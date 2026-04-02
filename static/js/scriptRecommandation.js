document.getElementById("accueil-btn").addEventListener("click", () => {
    window.location.href = "/";
});

document.getElementById("series-btn").addEventListener("click", () => {
    window.location.href = "/series";
});

document.getElementById("categories-btn").addEventListener("click", () => {
    window.location.href = "/categories/series";
});

//btn génération
const btnGenerer = document.getElementById("btnGenerer");

const zoneMessage = document.getElementById("message");

// cartes de recommandation
const zoneRecommandations = document.getElementById("recommandations");

// texte libre que l'user peut mettre
const texteInput = document.getElementById("preferencesInput");



btnGenerer.addEventListener("click", async () => {
    zoneRecommandations.innerHTML = "";
    zoneMessage.textContent = "Chargement...";

    const texte = texteInput.value.trim();

    const url = new URL("/api/recommandation", window.location.origin);

    if (texte !== "") {
        url.searchParams.set("texte", texte);
    }

    try {
        // appel api Flask
        const response = await fetch(url);
        const raw = await response.text();

        let data;
        try {
            data = JSON.parse(raw);
        } catch (e) {
            console.error("Réponse JSON :", raw);
            zoneMessage.textContent = "réponse invalide";
            return;
        }

        // Si le backend renvoie une erreur logique
        if (!data.ok) {
            zoneMessage.textContent = data.error || "Erreur pendant la recommandation";
            return;
        }

        // Si aucune recommandation
        if (!data.recommendations || data.recommendations.length === 0) {
            zoneMessage.textContent = data.message || "Aucune recommandation trouvée";
            return;
        }

        // sinon on affiche les cartes
        zoneMessage.textContent = "Recommandations générées.";
        afficherRecommandations(data.recommendations);

    } catch (error) {
        zoneMessage.textContent = "Erreur reco";
    }
});


function afficherRecommandations(recommandations) {

    zoneRecommandations.innerHTML = "";

    // pour chaque série recommandée
    recommandations.forEach((serie) => {
        const card = document.createElement("div");
        card.className = "card";


        const genres = serie.genres && serie.genres.length > 0
            ? serie.genres.join(", ")
            : "Genres inconnus";

        const rating = serie.rating !== null && serie.rating !== undefined
            ? serie.rating
            : "N/A";

        const imageHtml = serie.image_url
            ? `<img src="${serie.image_url}" alt="${serie.title}" style="width:100%; border-radius:6px;">`
            : "";

        const summaryHtml = serie.summary
            ? `<p>${serie.summary}</p>`
            : "";


        card.innerHTML = `
            ${imageHtml}
            <h3>${serie.title}</h3>
            <p><strong>Pourquoi ?</strong> ${serie.reason}</p>
            <p><strong>Genres :</strong> ${genres}</p>
            <p><strong>Note :</strong> ${rating}</p>
            ${summaryHtml}
        `;


        zoneRecommandations.appendChild(card);
    });
}