// On récupère le formulaire de recherche
const form = document.getElementById("formRecherche");
const note = document.getElementById('note')
const categoryBtn = document.getElementById('categoryBtn')
const top10 = document.getElementById('top10');
const resultsDiv = document.getElementById("resultats");





//  Methode avec API externe dans le backend
form.addEventListener('submit', function (event) {
    event.preventDefault();
    data = Object.fromEntries(new FormData(form));

    params = { query: data.serie + "&limit=60", category: data.category }

    fetch(`/api/search_series?${new URLSearchParams(params)}`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json'
        }
    })
        .then(function (response) { return response.json(); })
        .then(async rawdata => {
            let data = rawdata;
                             resultsDiv.innerHTML = "";

            // Affichage des résultats div dans le html
            let i;
            for (i = 0; i < data.length; i++) {
                let DeleteBtnContainer = document.createElement("div");
                let DeleteBtn = document.createElement("button");

                const serie = data[i];
                //Trouver le nombre de sasison de la série
                const nombreDeSaisons = await getNbSaisons(serie["show.id"]);
                const content_serie = buildSeriContent(serie, nombreDeSaisons);
                //On mets le contenu dans le resultats div
                resultsDiv.innerHTML += content_serie;

                //Pour chaque card on ajoute un bouton supprimer
                DeleteBtn.textContent = "Supprimer";
                DeleteBtn.id = "deleteBtn";
                DeleteBtn.dataset.key = serie["show.id"];

                DeleteBtnContainer.appendChild(DeleteBtn);

                resultsDiv.appendChild(DeleteBtnContainer);
            }

        }
        )
        ;
})

top10.addEventListener('click', function (event) {
    event.preventDefault(); 
    fetch('/api/top10', {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json'
        }
    })
        .then(function (response) { return response.json(); })
        .then(async rawdata => {
          let data = rawdata;

            resultsDiv.innerHTML = "";
            let i;
            for (i = 0; i < data.length; i++) {
                let DeleteBtnContainer = document.createElement("div");
                let DeleteBtn = document.createElement("button");

                const serie = data[i];
                //Trouver le nombre de sasison de la série
                const nombreDeSaisons = await getNbSaisons(serie["id"]);
                const content_serie = buildSeriContent(serie, nombreDeSaisons);
                //On mets le contenu dans le resultats div
                resultsDiv.innerHTML += content_serie;

                //Pour chaque card on ajoute un bouton supprimer
                DeleteBtn.textContent = "Supprimer";
                DeleteBtn.id = "deleteBtn";
                DeleteBtn.dataset.key = serie["show.id"];

                DeleteBtnContainer.appendChild(DeleteBtn);

                resultsDiv.appendChild(DeleteBtnContainer);
                     };

        })
        ;
})

// Methode pour parcourir les séries par catégorie en cliquant sur le bouton Parcourir
categoryBtn.addEventListener('click', function (event) {
    event.preventDefault();
    const category = document.getElementById('category').value;
    fetch(`/api/series_by_category?category=${category}`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json'
        }
    })
        .then(function (response) { return response.json(); })
        .then(async rawdata => {
            let data = rawdata;
            resultsDiv.innerHTML = "";

            // Affichage des résultats div dans le html
            
            let i;  
            for (i = 0; i < data.length; i++) {
                let DeleteBtnContainer = document.createElement("div");
                let DeleteBtn = document.createElement("button");

                const serie = data[i];
                //Trouver le nombre de sasison de la série
                const nombreDeSaisons = await getNbSaisons(serie["id"]);
                const content_serie = buildSeriContent(serie, nombreDeSaisons);
                //On mets le contenu dans le resultats div
                resultsDiv.innerHTML += content_serie;

                //Pour chaque card on ajoute un bouton supprimer
                DeleteBtn.textContent = "Supprimer";
                DeleteBtn.id = "deleteBtn";
                DeleteBtn.dataset.key = serie["show.id"];

                DeleteBtnContainer.appendChild(DeleteBtn);

                resultsDiv.appendChild(DeleteBtnContainer);
            }

        }
        )
        ;
});


 //Trouver le nombre de sasison de la série
 async function getNbSaisons(showId) {
    const response = await fetch(`https://api.tvmaze.com/shows/${showId}/seasons`);
    const seasons = await response.json();
    let nombreDeSaisons = 0;
    for (let j = 0; j < seasons.length; j++) {
        if (seasons[j].number > nombreDeSaisons) {
            nombreDeSaisons = seasons[j].number;
        }
    }
    return nombreDeSaisons;
}


function buildSeriContent(serie, nombreDeSaisons) {
    let contenu;
    // On ajoute "show." devant le nom car l'api retourne show. et parfois sans le show 
    //Donc on évite les problemes avec le show 
    for(col in serie) {
        if (!col.includes("show")) {
        serie["show." + col] = serie[col];
        delete serie[col];
        }
    }
// Ce if est pour les séries qui n'ont pas de résumé, on met "N/A"
    if (serie["show.summary"] === null) {
        serie["show.summary"] = "N/A";
    }

    // ce if est pour les séries qui n'ont pas de genres, on met "N/A"
    if (serie["show.genres"] === null || serie["show.genres"].length === 0) {
        serie["show.genres"] = ["N/A"];
    }


    let imgUrl ;
    if(serie["show.image.medium"] != null){
        imgUrl = serie["show.image.medium"]
        console.log(imgUrl)
    }
    else {
         imgUrl = "/static/manque.png";
    }

const img = `<img class="logo" src="${imgUrl}"/>`;


    // Ce if est pour les séries qui sont pas ended, donc pas de date de fin
                if (serie["show.ended"] === null ) {
                    contenu = img + `
 <div>
             <h4>${serie["show.name"]}</h4>
             <span id="Genres">Genres : ${serie["show.genres"]}</span>
            <span id="Status">Status : ${serie["show.status"]}</span>
            <span id="Premiere">Premiere : ${serie["show.premiered"]}</span>
             <span id="Rating">Rating : ${serie["show.rating.average"]} </span>
            <span id="Saisons">Saisons : ${nombreDeSaisons}</span>
            <span id="Resume">Resume : ${serie["show.summary"]} </span>
                <select id="ressenti-${serie["show.id"]}">

                <option value="vu_aime">Vu & Aimé</option>
                <option value="vu_neutre">Vu & Neutre</option>
                <option value="vu_pas_aime">Vu & Pas aimé</option>
                <option value="interesse">Intéressé</option>
                <option value="pas_interesse">Pas intéressé</option>

            </select>

            <button class="btnAvis">Enregistrer</button>
            </button>
            </div>
                `;
                } else {
                    contenu = img + `
            <div>
             <h4>${serie["show.name"]}</h4>
             <span id="Genres">Genres : ${serie["show.genres"]}</span>
            <span id="Status">Status : ${serie["show.status"]}</span>
            <span id="Premiere">Premiere : ${serie["show.premiered"]}</span>
            <span id="Fin">Fin : ${serie["show.ended"]}</span>
             <span id="Rating">Rating : ${serie["show.rating.average"]} </span>
            <span id="Saisons">Saisons : ${nombreDeSaisons}</span>
            <span id="Resume">Resume : ${serie["show.summary"]}</span>

             <select id="ressenti-${serie["show.id"]}">

                <option value="vu_aime">Vu & Aimé</option>
                <option value="vu_neutre">Vu & Neutre</option>
                <option value="vu_pas_aime">Vu & Pas aimé</option>
                <option value="interesse">Intéressé</option>
                <option value="pas_interesse">Pas intéressé</option>

            </select>
            <button class="btnAvis">Enregistrer</button>
            </button>
             </div>
                `;
                }

                return contenu;
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



document.querySelectorAll('.deleteBtn').forEach(btn => {
    btn.addEventListener('click', async () => {
        const key = btn.dataset.key; 
        const li = btn.parentElement;
        const res = await fetch('/api/delete-series', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ key })
        });

        const result = await res.json();

        if (result.ok) {
            li.remove();
        } else {
            alert(result.error);
        }
    });
});

document.querySelector('.btnAvis').addEventListener('click', () => {
    enregistrerAvis(serie["show.id"], serie["show.name"], img);
});




document.addEventListener('click', function(e) {
    if (e.target.classList.contains('deleteBtn')) {
        const serieId = e.target.dataset.key;
        console.log("Supprimer la série :", serieId);
        // ton code de suppression ici
    }
});