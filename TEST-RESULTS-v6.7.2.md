# Résultats de tests — HygieSafe v6.7.2

## Nouveau dashboard

- `test:v672` : **20/20**
- syntaxe JavaScript : **OK** sur `public/`, `src/` et `scripts/`

## Régressions rejouées

- Paramètres & accueil v6.7.1 : **18/18**
- Production v6.7.x : **29/29**
- Scanner auto + journées v6.6.0 : **26/26**
- Sécurité : **10/10**
- Parcours utilisateur : **24/24**
- Tutoriels & rôles : **12/12**
- Scanner UX : **13/13**
- Scanner Pro : **17/17**
- Produits : **15/15**
- Horaires & températures : **6/6**
- Admin observabilité : **20/20**
- Admin UX / prix : **10/10**
- Admin bootstrap : **8/8**
- Inscription SQL : **OK**
- Railway / Resend : **8/8**
- Facture → commandes : **3/3**

Le test ZIP complet qui importe `archiver` nécessite toujours les dépendances npm installées localement ou sur Railway.
