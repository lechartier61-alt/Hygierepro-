# Vérification Scanner — HygiePro v6.1

## Jeux de règles automatisés
5 scénarios représentatifs passent avec succès :
1. Jambon — DLC `28/08/26`, lot long, poids en kg, conservation 0/+4 °C.
2. Produit surgelé — production + surgélation + DDM `19.06.2028` + lot.
3. Pinsa — « à consommer avant », lot, 880 g, 0/+4 °C, EAN.
4. Emmental — date avec espaces `22 09 26`, poids 500 g, conservation 2/7 °C, EAN.
5. Poulet bilingue — production, DDM, lot, 1 kg, -18 °C, EAN.

Résultat du test : **5/5 scénarios parser OK**.

## Vérification sur les photos fournies
Une passe OCR locale a également été effectuée sur plusieurs des photos réelles fournies. Elle confirme notamment :
- jambon : DLC correctement identifiée comme `28/08/2026` ;
- produit surgelé : DDM `19/06/2028` distinguée de la date de surgélation ;
- emmental : format `22 09 26` reconnu comme DDM ;
- les lectures trop abîmées ou partielles déclenchent un champ à vérifier au lieu de remplir arbitrairement une valeur.

Les photos réelles ne sont pas incluses dans le ZIP final.

## Limite importante
Le moteur OCR ne peut pas garantir 100 % de lecture sur une étiquette froissée, masquée, fortement brillante ou hors focus. Pour cette raison, HygiePro conserve une étape obligatoire de vérification avant l'enregistrement.

Le runtime Tesseract.js complet n'a pas été exécuté dans l'environnement de génération car les dépendances npm du projet n'y sont pas installées. Le parseur, la syntaxe JavaScript et un benchmark OCR local Tesseract ont cependant été testés.
