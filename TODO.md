# TODO — Immocongo

## Étape 1 — Responsive mobile (styles.css)
- [x] Renforcer le hero mobile (texte plus petit, boutons empilés)
- [x] Ajuster paddings/margins et espacement global <768px (cards)
- [ ] Vérifier empilement filtres sur mobile (ann-filterbar + search-row)

- [ ] Valider grille biens 1/2/3 colonnes (déjà présent, confirmer)
- [x] Vérifier dropdown hamburger mobile (aspect + accessibilité)
- [x] Fix responsive mobile - cartes 1 colonne sur <640px (appliqué dans styles.css)





## Étape 2 — Biens par défaut + chargement localStorage (script.js)
- [ ] Ajouter `defaultProperties` (5 biens Brazzaville)
- [ ] Charger depuis localStorage et fallback sur defaults si vide
- [ ] Ne pas écraser les biens admin : afficher defaults + admin si admin existe

## Étape 3 — Recherche & filtres (script.js)
- [ ] Quartier: liste autorisée demandée + comparaison robuste
- [ ] Prix min/max: comparer correctement `price` normalisé
- [ ] Type: Tous / Vente / Location OK
- [ ] Message « Aucun bien ne correspond à votre recherche » si zéro résultat

## Étape 4 — Page détail (detail.html + detail.js ou inline)
- [ ] Créer `detail.html`
- [ ] Récupérer selectedPropertyId depuis localStorage
- [ ] Rendre galerie (placeholder si pas d’images)
- [ ] Format XAF + champs chambres/sdb/surface/capacité + description
- [ ] Badge URGENT si `urgent === true`
- [ ] Boutons WhatsApp (message pré-rempli + nom du bien) + demander visite
- [ ] Bouton retour vers la liste

## Étape 5 — Navigation depuis la liste (index.html + script.js)
- [ ] Remplacer la modal « Voir détails » par redirection vers detail.html
- [ ] Stocker l’ID cliqué dans localStorage
- [ ] Conserver fav/share sans déclencher la navigation

## Étape 6 — Tests manuels
- [ ] Mobile: burger + dropdown, 1 colonne, hero lisible, filtres empilés
- [ ] Desktop/tablette: grilles correctes (3/2)
- [ ] localStorage vide: 5 biens visibles
- [ ] admin: nouveaux biens apparaissent en plus
- [ ] filtres: aucun résultat => message exact
- [ ] clic carte => detail.html avec données exactes

