# Sources de données produits — HygieSafe v6.5.7

## Open Food Facts
HygieSafe interroge Open Food Facts à la demande lors d'un scan. Les données retournées sont affichées avec la source et l'attribution ODbL. Depuis la v6.5.7, HygieSafe ne persiste plus les fiches Open Food Facts dans son cache propriétaire et ne les fusionne plus avec les données UPCitemdb.

Lorsqu'un utilisateur choisit de mémoriser un produit, le catalogue de l'établissement conserve uniquement le code-barres et le nom opérationnel confirmé par l'utilisateur. Les métadonnées externes (image, allergènes, marque, catégories, etc.) ne sont pas recopiées dans ce catalogue local.

## UPCitemdb
UPCitemdb n'est utilisé qu'en solution de secours lorsqu'Open Food Facts ne retourne pas de produit. Son cache technique est séparé logiquement : `external_product_cache` n'est désormais utilisé que pour la source `upcitemdb`.

## GS1
HygieSafe fournit un lien de vérification vers Verified by GS1. Aucune donnée GS1 payante ou privée n'est aspirée automatiquement sans contrat/API dédiée.
