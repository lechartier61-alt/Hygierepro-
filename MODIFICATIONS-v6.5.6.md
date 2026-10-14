# HygieSafe v6.5.6 — Base Produits Internet

## Objectif

Transformer le scan EAN/GTIN en reconnaissance produit automatique sans rendre HygieSafe dépendant d’une base externe.

## Recherche automatique

Ordre de résolution :

1. article déjà configuré dans l’établissement ;
2. produit déjà validé et mémorisé par l’établissement ;
3. cache externe HygieSafe encore valide ;
4. Open Food Facts API v3 ;
5. UPCitemdb en secours ;
6. saisie manuelle si aucune source ne connaît le code.

Open Food Facts est interrogé avec un User-Agent HygieSafe identifiable et uniquement pour des lectures produit. Les informations affichées conservent l’attribution de leur source. UPCitemdb peut fonctionner sans clé via son endpoint Trial ; une clé DEV/PRO peut être fournie avec les variables d’environnement prévues.

## Mémoire établissement

La table `organization_product_memory` mémorise uniquement les fiches réellement validées dans un établissement. Un même code peut donc avoir une fiche corrigée propre à chaque client. La sauvegarde complète ZIP inclut ce catalogue mémorisé.

## Cache externe

`external_product_cache` évite les appels répétitifs :
- produit trouvé : 30 jours ;
- produit absent : 24 heures ;
- erreur réseau/quota : 15 minutes.

Le cache d’erreur évite de marteler un fournisseur indisponible. Les entrées expirées depuis plus de 30 jours sont supprimées par la rétention.

## Scanner / UX

- recherche automatique après un scan EAN/GTIN ou GS1 ;
- carte produit avec image, nom, marque, conditionnement, catégorie et allergènes lorsqu’ils sont disponibles ;
- source et attribution visibles ;
- bouton de consultation de la source ;
- lien de vérification GTIN via Verified by GS1 ;
- nom Internet utilisé comme proposition si l’OCR est absent ou peu fiable ;
- produit validé mémorisé automatiquement lors d’un scan en série/réception ou d’une traçabilité ;
- création manuelle d’un produit inconnu puis reconnaissance immédiate aux scans suivants ;
- bouton **Produits reconnus** dans le Scanner pour consulter et rechercher le catalogue appris de l’établissement ;
- panne/timeout/429 d’une API externe non bloquants.

## Base de données

Migration : `027_product_lookup_catalog.sql`.

Tables : `external_product_cache`, `organization_product_memory`. Version applicative : `6.5.6`.

## Configuration

```text
PRODUCT_LOOKUP_OPENFOODFACTS=true
PRODUCT_LOOKUP_UPCITEMDB=true
PRODUCT_LOOKUP_TIMEOUT_MS=4500
UPCITEMDB_USER_KEY=
UPCITEMDB_KEY_TYPE=3scale
```

Aucun secret supplémentaire n’est obligatoire pour Open Food Facts ou le mode Trial UPCitemdb.
