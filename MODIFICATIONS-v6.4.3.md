# HygieSafe v6.4.3 — Railway / Resend

- Le serveur Express écoute explicitement sur `0.0.0.0` et sur la variable `PORT` fournie par Railway.
- Ajout de `/health/live` pour distinguer la disponibilité du processus de la disponibilité PostgreSQL.
- `/health` retourne aussi l'état non secret des intégrations e-mail et Stripe.
- Une configuration Resend partielle ne fait plus tomber tout le site : les inscriptions restent fermées jusqu'à présence de `RESEND_API_KEY` + `RESEND_FROM`.
- Stripe n'est considéré actif que lorsque la clé secrète et le secret webhook sont tous les deux présents.
- Timeout de healthcheck Railway porté à 180 s.

## Railway
Vérifier dans `Settings > Networking > Public Networking` que le Target Port correspond au `PORT` affiché dans les logs (actuellement 8080 sur le déploiement signalé).

Variables Resend attendues :
```text
RESEND_API_KEY=re_...
RESEND_FROM=HygieSafe <noreply@mail.hygiesafe.com>
```
