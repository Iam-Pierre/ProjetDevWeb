// On récupère le formulaire de recherche
const formRecherche = document.getElementById("formRecherche");

// On écoute le "submit" du formulaire (comme dans scriptAuth.js)
formRecherche.addEventListener("submit", async (e) => {
    e.preventDefault(); // on empêche le rechargement de la page

    const query = document.getElementById("searchInput").value;

    // On appelle l'API TVmaze (publique, pas besoin de clé)
    const response = await fetch(`https://api.tvmaze.com/search/shows?q=${query}`);
    const data = await response.json();

    // On affiche les résultats
    afficherResultats(data);
});


function afficherResultats(series) {
    const div = document.getElementById("resultats");
    div.innerHTML = "";

    // Si TVmaze ne trouve rien, on affiche un message
    if (series.length === 0) {
        div.innerHTML = "<p>Aucune série trouvée.</p>";
        return;
    }

    series.forEach((item) => {
        const show = item.show;

        // On vérifie si cette série est déjà dans "mes avis"
        const dejaEnregistre = document.getElementById("card-" + show.id);
            if (dejaEnregistre) {
            return; // on skip cette série, elle est déjà dans mes avis
        }

        const card = document.createElement("div");
        card.className = "card";
        card.id = "card-" + show.id;

        const imgUrl = show.image ? show.image.medium : "";

        card.innerHTML = `
            <img src="${imgUrl}" alt="${show.name}" style="width:100px">
            <h3>${show.name}</h3>
            <select id="ressenti-${show.id}">
                <option value="vu_aime">Vu & Aimé</option>
                <option value="vu_neutre">Vu & Neutre</option>
                <option value="vu_pas_aime">Vu & Pas aimé</option>
                <option value="interesse">Intéressé</option>
                <option value="pas_interesse">Pas intéressé</option>
            </select>
            <button onclick="enregistrerAvis(${show.id}, '${show.name}', '${imgUrl}')">
                Enregistrer
            </button>
        `;
        
        div.appendChild(card);
    });
}

async function enregistrerAvis(tvmaze_id, nom, imgUrl) {
    const ressenti = document.getElementById("ressenti-" + tvmaze_id).value;

    const response = await fetch("/api/avis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            tvmaze_id: tvmaze_id,
            nom: nom,
            image_url: imgUrl,
            ressenti: ressenti
        })
    });

    const data = await response.json();

    if (data.ok) {
        const card = document.getElementById("card-" + tvmaze_id);
        const mesAvis = document.getElementById("mesAvis");

        // On vérifie si la card est déjà dans "mes avis"
        // Si non, on la déplace
        if (!mesAvis.contains(card)) {
            mesAvis.appendChild(card);
        }
        // Si oui, elle reste là où elle est, le ressenti est juste mis à jour en base
    }
}


// On appelle cette fonction dès que la page est chargée
chargerAvis();

async function chargerAvis() {
    const response = await fetch("/api/avis");
    const data = await response.json();

    // Pour chaque avis enregistré, on crée une card dans "mes avis"
    data.avis.forEach((avis) => {
        const mesAvis = document.getElementById("mesAvis");

        const card = document.createElement("div");
        card.className = "card";
        card.id = "card-" + avis.tvmaze_id;

        card.innerHTML = `
            <img src="${avis.image_url}" alt="${avis.nom}" style="width:100px">
            <h3>${avis.nom}</h3>
            <select id="ressenti-${avis.tvmaze_id}">
                <option value="vu_aime" ${avis.ressenti === "vu_aime" ? "selected" : ""}>Vu & Aimé</option>
                <option value="vu_neutre" ${avis.ressenti === "vu_neutre" ? "selected" : ""}>Vu & Neutre</option>
                <option value="vu_pas_aime" ${avis.ressenti === "vu_pas_aime" ? "selected" : ""}>Vu & Pas aimé</option>
                <option value="interesse" ${avis.ressenti === "interesse" ? "selected" : ""}>Intéressé</option>
                <option value="pas_interesse" ${avis.ressenti === "pas_interesse" ? "selected" : ""}>Pas intéressé</option>
            </select>
            <button onclick="enregistrerAvis(${avis.tvmaze_id}, '${avis.nom}', '${avis.image_url}')">
                Mettre à jour
            </button>
        `;

        mesAvis.appendChild(card);
    });
}