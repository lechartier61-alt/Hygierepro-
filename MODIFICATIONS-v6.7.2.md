# HygieSafe v6.7.2 — Dashboards Pro

## Objectif

La page **Aujourd'hui** a été entièrement repensée pour ne plus ressembler à un assemblage de cartes génériques. Chaque rôle dispose désormais d'un tableau de bord adapté à son travail réel.

## Gérant

- vue de pilotage de l'établissement ;
- état global de la journée ;
- indicateurs essentiels uniquement ;
- priorités et anomalies visibles immédiatement ;
- suivi des journées équipe avec progression ;
- blocages et retards visibles sans ouvrir chaque salarié ;
- raccourcis vers Journées équipe, Contrôles, Scanner et Équipe ;
- abonnement déplacé dans une ligne secondaire discrète.

## Responsable

- vue orientée supervision du service ;
- contrôles et anomalies en priorité ;
- état des journées employés ;
- progression, retards et blocages ;
- accès direct aux commandes et au scanner.

## Employé

- vue personnelle uniquement ;
- prochaine action en évidence ;
- progression de la journée guidée ;
- étape active visible directement ;
- nombre d'étapes terminées ;
- accès rapide à Ma journée, Mes contrôles et Scanner ;
- compteurs du dashboard limités à ses propres données lorsque nécessaire.

## Admin HygieSafe

- vue globale réorganisée façon centre de pilotage ;
- clients, utilisateurs, revenus et alertes d'abord ;
- informations techniques secondaires rangées dans **Indicateurs détaillés** ;
- moins de densité visuelle sur l'écran principal.

## UX

- nouvelle hiérarchie typographique ;
- nouvelles cartes KPI compactes ;
- panneau d'état de la journée ;
- priorités cliquables ;
- barres de progression équipe ;
- design responsive mobile ;
- compatibilité avec le mode Interface concise.

## Sécurité / rôles

Le endpoint `/api/records/dashboard` ne renvoie plus à un Employé les compteurs globaux de non-conformités, DLC et températures de toute l'organisation. Les compteurs Employé sont désormais personnels.

## Migration

`031_dashboard_pro_v672.sql`
