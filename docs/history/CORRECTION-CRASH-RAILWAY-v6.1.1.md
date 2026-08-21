# Correction crash Railway v6.1.1

## Cause
`DATABASE_URL` n'était pas définie dans le service HygiePro. Le driver PostgreSQL tombait alors sur sa connexion locale par défaut (`localhost:5432`), inexistante dans le container Railway.

## Corrections du pack
- erreur explicite si `DATABASE_URL` manque ;
- migrations déplacées vers `preDeployCommand` Railway ;
- `startCommand` réduit à `npm start` ;
- documentation Railway mise à jour ;
- exemple `DATABASE_SSL=false` pour la connexion privée Railway ;
- version serveur passée à 6.1.1.

## Action obligatoire dans Railway
Ajouter PostgreSQL au projet puis créer une variable de référence `DATABASE_URL` dans le service HygiePro.
