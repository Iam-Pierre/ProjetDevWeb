// Bouton qui lance la génération
const btnGenerer = document.getElementById("btnGenerer");

// Zone de message pour afficher chargement / erreur / succès
const zoneMessage = document.getElementById("message");

// Zone dans laquelle on affichera les cartes de recommandation
const zoneRecommandations = document.getElementById("recommandations");

// Champ texte libre saisi par l'utilisateur
const texteInput = document.getElementById("preferencesInput");


// Quand on clique sur le bouton
btnGenerer.addEventListener("click", async () => {
    // On vide l'affichage précédent
    zoneRecommandations.innerHTML = "";
    zoneMessage.textContent = "Chargement...";

    // Texte libre saisi par l'utilisateur
    const texte = texteInput.value.trim();

    // On construit l'URL de l'API
    const url = new URL("/api/recommandation", window.location.origin);

    // Si l'utilisateur a écrit quelque chose,
    // on l'ajoute comme paramètre GET
    if (texte !== "") {
        url.searchParams.set("texte", texte);
    }

    try {
        // Appel de l'API Flask
        const response = await fetch(url);
        const raw = await response.text();

        let data;
        try {
            data = JSON.parse(raw);
        } catch (e) {
            console.error("Réponse non JSON du backend :", raw);
            zoneMessage.textContent = "Le serveur a renvoyé une réponse invalide.";
            return;
        }

        // Si le backend renvoie une erreur logique
        if (!data.ok) {
            zoneMessage.textContent = data.error || "Erreur pendant la recommandation.";
            return;
        }

        // Si aucune recommandation
        if (!data.recommendations || data.recommendations.length === 0) {
            zoneMessage.textContent = data.message || "Aucune recommandation trouvée.";
            return;
        }

        // Sinon on affiche les cartes
        zoneMessage.textContent = "Recommandations générées.";
        afficherRecommandations(data.recommendations);

    } catch (error) {
        zoneMessage.textContent = "Erreur réseau ou serveur.";
    }
});


function afficherRecommandations(recommandations) {
    // On vide avant affichage
    zoneRecommandations.innerHTML = "";

    // Pour chaque série recommandée
    recommandations.forEach((serie) => {
        const card = document.createElement("div");
        card.className = "card";

        // Gestion simple des valeurs manquantes
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

        // On remplit le HTML de la carte
        card.innerHTML = `
            ${imageHtml}
            <h3>${serie.title}</h3>
            <p><strong>Pourquoi ?</strong> ${serie.reason}</p>
            <p><strong>Genres :</strong> ${genres}</p>
            <p><strong>Note :</strong> ${rating}</p>
            ${summaryHtml}
        `;

        // On ajoute la carte à la page
        zoneRecommandations.appendChild(card);
    });
}