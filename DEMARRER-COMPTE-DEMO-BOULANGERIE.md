# Compte de test « Boulangerie » — HygieSafe UX2

**Démonstration :** les 528 températures sont générées automatiquement pour les essais et ne proviennent pas de mesures sur des appareils. Le compte de test reste séparé des données réelles de l'établissement.

## Données de démonstration
- Établissement : **[DÉMO] Boulangerie** ; type : boulangerie ; profil gérant.
- Équipements : Réfrigérateur 1 (0–4 °C), Réfrigérateur 2 (0–4 °C), Congélateur 1 (−25 à −18 °C). Seuils utilisés à titre d'exemple, à adapter aux exigences des denrées réelles.
- 2 relevés artificiels par jour (08h00 et 17h00, heure de Paris), chaque jour **du 19 juillet au 14 octobre 2026 inclus** : **88 jours × 2 horaires × 3 appareils = 528 valeurs**.
- 4 écarts programmés pour les essais pour vérifier les couleurs d'alerte de l'interface.
- Le fichier `DEMO-BOULANGERIE-TEMPERATURES.csv` permet d'examiner les données **sans connexion à une base**.

## Créer le compte sur une base PostgreSQL de TEST

Le compte **n'est pas déjà créé sur hygiesafe.com** : seule une personne disposant des accès serveur et base de données peut le créer. Le script ne modifie aucune entreprise existante. Il crée une entreprise isolée, un gérant et les 3 équipements plus les 528 relevés simulés, le tout en une transaction.

1. Déployer le projet sur un environnement de test, installer les dépendances Node.js et fournir une base PostgreSQL de test via `DATABASE_URL` (conserver les autres variables habituelles).
2. Initialiser/mettre à jour les tables : `npm run migrate`.
3. Lancer **seulement dans un terminal administrateur de l'environnement de test** :

   ```bash
   DEMO_SEED_CONFIRM=JE_COMPRENDS_DONNEES_SIMULEES npm run seed:demo-boulangerie
   ```

4. Le script affiche l'adresse de connexion et **un mot de passe fort généré aléatoirement** (une seule fois). Le compte de démo se connecte sur `/login.html` avec ce mot de passe.

   Adresse par défaut : `test-boulangerie@hygiesafe.test`. Le domaine `.test` ne reçoit pas d'e-mails, il est destiné aux essais. Vous pouvez changer l'identifiant avec `DEMO_BOULANGERIE_EMAIL`.

Le compte bénéficie d'une période de test de 90 jours **sans client Stripe associé**. Aucun paiement n'est simulé. On peut changer `DEMO_END_DATE` au format `YYYY-MM-DD` pour prolonger la série au jour où le script est exécuté ; par défaut la date de fin est le 14 octobre 2026, conformément à la demande initiale.

### Sécurité en production
Le script **refuse par défaut** l'environnement `NODE_ENV=production`. À réserver aux environnements de test isolés. Une autorisation explicite existe pour une démonstration techniquement nécessaire en production ; évitez-la. En production le bandeau de simulation doit rester clairement visible, et les données de démonstration doivent rester distinctes des relevés réels.

### Export ou vérification hors base

```bash
npm run export:demo-boulangerie
npm run test:demo-boulangerie
```

**Important :** un utilisateur qui se connecte verra le bandeau « MODE DÉMONSTRATION — RELEVÉS DE TEST ». Les relevés générés sont identifiés comme données de test dans l’interface, les exports CSV et les rapports PDF.

**Limitations :** aucune connexion à une instance distante n'a été effectuée ici et la base PostgreSQL n'a pas été alimentée. L'exécution du script de création doit être réalisée par une personne ayant accès à `DATABASE_URL`, sur un environnement autorisé.
