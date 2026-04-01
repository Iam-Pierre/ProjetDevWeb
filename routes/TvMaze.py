
import math
import os
from flask import Blueprint, render_template, request, send_file,Flask, session
from matplotlib import category
import requests
import pandas as pd
import matplotlib.pyplot as plt
from extensions import db


apiTvMaze = Blueprint('apiTvMaze', __name__)


@apiTvMaze.route('/avis', methods=['GET'])
def accueil():
    data = requests.get("https://api.tvmaze.com/shows").json()
    categorie = []
    data = pd.json_normalize(data)
    data = data['genres'].explode().unique()
    
    # Remplacer les valeurs manquantes par Autre et mettre les catégories dans une liste
    for i in data:
        if isinstance(i, str):
            categorie.append(i)
        else:
            categorie.append("Autre")
    
    # Trier les catégories par ordre alphabétique
    categorie = sorted(categorie)
    return render_template('avis.html', categories=categorie)  


@apiTvMaze.route('/api/search_series', methods=['GET'])
def api_shows():
    # Récupérer les paramètres de la requête + mettre en place les filtres + retourner les résultats
    # Ici j'appelle api externe depuis le backend
    query = request.args.get('query')

    df = requests.get("https://api.tvmaze.com/search/shows?q=" + query).json()
    df = pd.json_normalize(df)
    
    df['show.rating.average'] = df['show.rating.average'].fillna(1)
    data_filtered = df
    return data_filtered.to_json(orient='records')


@apiTvMaze.route('/api/top10', methods=['GET'])
def top10():
    df = requests.get("https://api.tvmaze.com/shows").json()
    df = pd.json_normalize(df)
    
    df['rating.average'] = df['rating.average'].fillna(1)
    data_filtered = (df[df['rating.average'] >= 8.5]).sort_values(by='rating.average', ascending=False).head(10)
    

    return data_filtered.to_json(orient='records')

@apiTvMaze.route('/api/series_by_category', methods=['GET'])
def series_by_category():
    cat = request.args.get('category')
    df = requests.get("https://api.tvmaze.com/shows").json()
    df = pd.json_normalize(df)

    # Remplacer les valeurs manquantes par "Autre"
    df['genres'] = df['genres'].fillna("Autre")
    
    # Fonction lambda qui prend la liste genre, voit si la catégorie choisie est dans la liste et retourne True ou False 
    # Si True alors la série est gardée 
    data_filtered = df[df['genres'].apply(lambda genres: cat in genres if isinstance(genres, list) else False)].head(20)

    print(data_filtered)
    return data_filtered.to_json(orient='records')
    



if __name__ == '__main__':
    apiTvMaze.run(host="127.0.0.1", port=4000, debug=True)


