const form = document.querySelector('form')
const note = document.getElementById('note');

form.addEventListener('submit', function (event) {
    event.preventDefault();
    console.log(Object.fromEntries(new FormData(form)))
    data = Object.fromEntries(new FormData(form));

    params = {q: data.nom}
    let url = new URLSearchParams(params);
   
    console.log(url.toString());
    fetch(`https://api.tvmaze.com/search/shows?${url}&limit=15`, { 
  method: 'GET'})
.then(function(response) { return response.json(); })
.then( rawdata => { 
    let data = rawdata ;

    const resultsDiv = document.getElementById("tvmaze");
    resultsDiv.innerHTML ="";

    let i;
    for(i = 0; i < data.length; i++){
        serie = data[i];
      
        serie = serie.show;
         if(serie.rating.average === null){
                serie.rating.average = "N/A";
            }
        if(!serie.image.medium){
           
         resultsDiv.innerHTML += 
        `
            <div>
             <img class="logo" src="manque.png"/>
             <h4>${serie.name}</h4>
             <span id="rating">${serie.rating.average}</span>
             <button id="Affiche">Afficher</button>
             </div>
                `;
        }
        else{
              resultsDiv.innerHTML += 
            `
            <div>
             <img class="logo" src='${serie.image.medium}'/>
             <h4>${serie.name}</h4>
             <span id="rating">${serie.rating.average}</span>
             </div>
                `;
        }
              
    }

}

)
;
})


 // Methode avec API externe dans le backend

// form.addEventListener('submit', function (event) {
//     event.preventDefault();
//     data = Object.fromEntries(new FormData(form));

//     console.log(data);

//        params = {query: data.nom + "&limit=60", note: data.note}
   
//     fetch(`/api/shows?${new URLSearchParams(params)}`, {
//         method: 'GET',
//         headers: {
//             'Content-Type': 'application/json'
//         }
//     })
//     .then(function(response) { return response.json(); })
//     .then( rawdata => { 
//         let data = rawdata  ;

//     const resultsDiv = document.getElementById("tvmaze");
//     resultsDiv.innerHTML ="";

//     let i;
//     for(i = 0; i < data.length; i++){
//         serie = data[i];
                          
//         if(serie["show.image.medium"] === null){
           
//          resultsDiv.innerHTML += 
//         `
//             <div>
//              <img class="logo" src="/static/manque.png"/>
//              <h4>${serie["show.name"]}</h4>
//              <span id="rating">${serie["show.rating.average"]}</span>
//              <button id="Affiche">Afficher</button>
//              </div>
//                 `;
//         }
        
//         else{
//               resultsDiv.innerHTML += 
//             `
//             <div>
//              <img class="logo" src='${serie["show.image.medium"]}'/>
//              <h4>${serie["show.name"]}</h4>
//              <span id="rating">${serie["show.rating.average"]}</span>
//              </div>
//                 `;
//         }
              
//     }

//     } 
//     )
//     ;
// })