# Audit total LGY.fr V6.7

## Corrections appliquées
- accueil nettoyé : ancien fond supprimé, texte conservé à gauche ;
- image d’accueil séparée et remplaçable depuis l’administration ;
- possibilité de masquer complètement l’image ;
- sections Services et À propos activables ou désactivables ;
- amélioration responsive de toutes les pages client ;
- focus clavier, tailles tactiles et états vides améliorés ;
- panier et commande plus lisibles ;
- récapitulatif fixe seulement sur les grands écrans ;
- tableaux et onglets administrateur protégés contre les débordements ;
- paramètres regroupés en modules professionnels ;
- téléversement sécurisé PNG/JPEG/WebP, 5 Mo maximum ;
- ancienne image téléversée supprimée au remplacement ;
- bouton d’enregistrement des paramètres toujours accessible ;
- téléphone de contact généré depuis les paramètres.

## Vérifications
- syntaxe de `server.js` ;
- syntaxe de `public/app.js` ;
- démarrage du serveur ;
- route `/api/health` ;
- route publique `/api/settings`.

## Limites avant ouverture commerciale
- données JSON à migrer vers PostgreSQL ;
- Stripe à connecter ;
- e-mails transactionnels et récupération de mot de passe ;
- tests finaux sur iPhone, Android, tablette et imprimante réelle.
