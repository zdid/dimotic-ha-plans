# Dimotic-HA Plans

Les **plans de la maison directement dans Home Assistant** : un panneau « Plans » dans le menu de gauche (titre et icône
réglables), pour afficher les plans de la maison avec les objets placés dessus (lumières, volets, radiateurs, capteurs…),
les commander, et à terme les créer et les modifier — **sans passer par dimotic-ha**. Il remplace l'outil HAPLAN de
[dimotic-ha](https://github.com/zdid/dimotic-ha).

> **État : v0.1.6.** Le panneau « Plans » affiche un onglet par plan, avec les **objets placés sur l'image** : icône seule,
> colorée selon son type et son état (lumière allumée ambre avec halo, prise verte, chauffage orange-rouge, volet violet, capteurs selon leur grandeur : température rouge, humidité bleue, puissance jaune… ; indisponible très pâle), valeur des capteurs, température des thermostats
> et position des volets à droite de l'icône, mise à jour en direct. **Un clic allume/éteint** les lumières, prises,
> ventilateurs et booléens ; pour les autres (volets, thermostats, capteurs…) il ouvre la fiche de l'entité.
> **Appui long ou clic droit** : fiche de l'entité. Les objets suivent les renommages d'entités (lien par l'identifiant
> du registre).
>
> **Éditeur (administrateurs, bouton « Modifier »)** : glisser les objets et les textes (souris ou doigt), flèches du
> clavier (1 px, Maj : 10 px), **magnétisme** sur les autres éléments (ligne rose) puis sur une **grille** (aucune, 0,5 %, 1 % ou 2 % de l'image ; invisible sauf « Afficher » ; les flèches avancent alors d'un pas), ajouter un objet (choix par la **taxonomie** QUOI/OÙ posée par nommage — attribut `attributs_taxonomie` — avec recherche ; entités sans taxonomie et secondaires cachées par défaut) ou un texte, retirer,
> créer un plan (image ou page blanche), le renommer, changer son image, le supprimer. Rien n'est écrit avant « Enregistrer ».
>
> **Point d'ancrage** : la position d'un objet est le **coin inférieur gauche de son icône**, celle d'un texte le coin
> inférieur gauche du texte (alignements faciles). x et y sont en fraction de l'image (0 à 1).

## Installation (HACS)

1. **HACS** → menu ⋮ → *Dépôts personnalisés* → `https://github.com/zdid/dimotic-ha-plans`, type *Intégration* → télécharger →
   **redémarrer Home Assistant**.
2. **Paramètres → Appareils et services → Ajouter une intégration → « Plans »**.
3. Titre et icône du menu : **Configurer** sur l'intégration (par défaut « Plans » et `mdi:floor-plan`).

Le panneau est visible par **tous les utilisateurs** de HA ; l'import (et le futur éditeur) est réservé aux **administrateurs**.

## Feuille de route

Conception complète : [`conception-haplan-dans-ha`](https://github.com/zdid/dimotic-ha/blob/main/specs/current/conception-haplan-dans-ha_specs_v1.2.md)
dans le dépôt dimotic-ha.

1. ✅ Dépôt, stockage dans HA, panneau (squelette, v0.0.1).
2. ✅ (v0.0.2) **Import** des plans, images, textes et positions de HAPLAN, avec lien stable vers le registre d'entités de HA
   (les positions survivent aux renommages d'entités).
3. ✅ (v0.0.3) **Affichage** des objets dans le panneau ; (v0.0.6) **commande d'un clic**.
4. ✅ (v0.1.0) **Éditeur**.
5. ⏳ **Export** pour les écrans ESP32 (l'outil de génération lit les plans depuis HA).

## Développement

`python3 -m pytest tests` (fonctions pures). Licence MIT.

## Écrans ESP (depuis v0.1.8)

Avec l'application `esps-assemble` de dimotic-ha (assembleur de sources ESPHome) :

- **Export** : la commande WebSocket `dimotic_plans/floorplans/export` (administrateurs) renvoie les plans (positions avec l'`entity_id` **actuel**
  et le « quoi » de la taxonomie, textes) et leurs images en base64 ; l'assembleur s'en sert pour fabriquer les pages de plans des écrans.
- **Bouton « Générer »** : renseigner le **site** dans *Paramètres → Appareils et services → Plans → Configurer* (ex. `stfort`, `noisy`) ; le panneau
  affiche alors, pour les administrateurs, la liste « Écrans ESP » (appareils de l'assembleur qui ont des pages de plans, avec leur état) et un bouton
  **Générer** par appareil (dans la barre du haut : icône + nombre d'écrans, puis une liste déroulante pour choisir l'écran). Il publie la demande `dimotic/esps-assemble/<site>/generer` par le MQTT de HA ; l'assembleur assemble, l'usine compile, le
  poseur envoie à l'écran.

## Affichage (depuis v0.1.10)

- **Thème** : un bouton de la barre du haut fait défiler *auto → clair → sombre* (choix mémorisé dans le navigateur ; *auto* suit le thème de HA). En
  sombre, l'image du plan est inversée (teintes conservées), les valeurs de capteurs passent en texte clair sur fond sombre, les couleurs foncées des textes
  libres deviennent claires.
- **Barre unique** : menu, plans (liste déroulante), écrans ESP, thème et « Modifier » sur une seule ligne (le titre se masque sur téléphone).
- **Téléphone** : un balayage horizontal change de plan (boucle du dernier au premier et inversement) ; inactif en édition.
