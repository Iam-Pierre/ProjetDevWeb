const form = document.querySelector('form');
const note = document.getElementById('note')
const categoryBtn = document.getElementById('categoryBtn')
const top10 = document.getElementById('top10');

//  Methode avec API externe dans le backend
form.addEventListener('submit', function (event) {
    event.preventDefault();
    data = Object.fromEntries(new FormData(form));


    params = { query: data.nom + "&limit=60", category: data.category }

    fetch(`/api/search_series?${new URLSearchParams(params)}`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json'
        }
    })
        .then(function (response) { return response.json(); })
        .then(async rawdata => {
            let data = rawdata;

            // Affichage des résultats div dans le html
            const resultsDiv = document.getElementById("tvmaze");
            resultsDiv.innerHTML = "";

            let i;
            for (i = 0; i < data.length; i++) {
                const serie = data[i];
                //Trouver le nombre de sasison de la série
                const nombreDeSaisons = await getNbSaisons(serie["show.id"]);
                const content_serie = buildSeriContent(serie, nombreDeSaisons);
                resultsDiv.innerHTML += content_serie;

            }

        }
        )
        ;
})


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

// Fonction pour générer le HTML d'une série avec la gestion des données manquantes 
function buildSeriContent(serie, nombreDeSaisons) {
    
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


    // Ce if est pour les séries qui sont pas ended, donc pas de date de fin
                if (serie["show.ended"] === null ) {
                    contenu = `
            <div>
             <h4>${serie["show.name"]}</h4>
             <span id="Genres">'Genres : ${serie["show.genres"]}'</span>
            <span id="Status">'Status : ${serie["show.status"]}'</span>
            <span id="Premiere">'Premiere : ${serie["show.premiered"]}'</span>
             <span id="Rating">'Rating : ${serie["show.rating.average"]} '</span>
            <span id="Saisons">'Saisons : ${nombreDeSaisons}'</span>
            <span id="Resume">'Resume : ${serie["show.summary"]} '</span>
             </div>
                `;
                } else {
                    contenu = `
            <div>
             <h4>${serie["show.name"]}</h4>
             <span id="Genres">'Genres : ${serie["show.genres"]}'</span>
            <span id="Status">'Status : ${serie["show.status"]}'</span>
            <span id="Premiere">'Premiere : ${serie["show.premiered"]}'</span>
            <span id="Fin">'Fin : ${serie["show.ended"]}'</span>
             <span id="Rating">'Rating : ${serie["show.rating.average"]} '</span>
            <span id="Saisons">'Saisons : ${nombreDeSaisons}'</span>
            <span id="Resume">'Resume : ${serie["show.summary"]} '</span>
             </div>
                `;
                }
                // ce if est pour les séries qui n'ont pas d'image, on met une image par défaut
                if (serie["show.image.medium"] === null) {
                    contenu = `<img class="logo" src="/static/manque.png"/>` + contenu;
                }
                else {
                    contenu =  `<img class="logo" src='${serie["show.image.medium"]}'/>` + contenu;
                }
                return contenu;
}


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
            // Affichage des résultats div dans le html
            const resultsDiv = document.getElementById("tvmaze");
            resultsDiv.innerHTML = "";
            let i;
            console.log(data);
            for (i = 0; i < data.length; i++) {
                serie = data[i];
                
                //Trouver le nombre de sasison de la série
                const nombreDeSaisons = await getNbSaisons(serie["id"]);
                const content_serie = buildSeriContent(serie, nombreDeSaisons);
                resultsDiv.innerHTML += content_serie;

            };

        })
        ;
})

// Methode pour parcourir les séries par catégorie en cliquant sur le bouton Parcourir
categoryBtn.addEventListener('click', function (event) {
    event.preventDefault();
    const category = document.getElementById('category').value;
console.log(category);
    fetch(`/api/series_by_category?category=${category}`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json'
        }
    })
        .then(function (response) { return response.json(); })
        .then(async rawdata => {
            let data = rawdata;

            // Affichage des résultats div dans le html

            const resultsDiv = document.getElementById("tvmaze");
            resultsDiv.innerHTML = "";
            
            let i;  
            console.log(data);
            for (i = 0; i < data.length; i++) {
                const serie = data[i];
                //Trouver le nombre de sasison de la série
                const nombreDeSaisons = await getNbSaisons(serie["id"]);
                const content_serie = buildSeriContent(serie, nombreDeSaisons);
                resultsDiv.innerHTML += content_serie;
            }

        }
        )
        ;
});