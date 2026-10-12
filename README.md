# Dimotic-HA Plans

Les **plans de la maison directement dans Home Assistant** : un panneau « Plans » dans le menu de gauche (titre et icône
réglables), pour afficher les plans de la maison avec les objets placés dessus (lumières, volets, radiateurs, capteurs…),
les commander, et à terme les créer et les modifier — **sans passer par dimotic-ha**. Il remplace l'outil HAPLAN de
[dimotic-ha](https://github.com/zdid/dimotic-ha).

> **État : v0.1.3.** Le panneau « Plans » affiche un onglet par plan, avec les **objets placés sur l'image** : icône seule,
> colorée selon l'état (allumé/ouvert en orange, indisponible très pâle), valeur des capteurs, température des thermostats
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

Conception complète : [`conception-haplan-dans-ha`](https://github.com/zdid/dimotic-ha/blob/main/specs/current/conception-haplan-dans-ha_specs_v1.1.md)
dans le dépôt dimotic-ha.

1. ✅ Dépôt, stockage dans HA, panneau (squelette, v0.0.1).
2. ✅ (v0.0.2) **Import** des plans, images, textes et positions de HAPLAN, avec lien stable vers le registre d'entités de HA
   (les positions survivent aux renommages d'entités).
3. ✅ (v0.0.3) **Affichage** des objets dans le panneau ; (v0.0.6) **commande d'un clic**.
4. ✅ (v0.1.0) **Éditeur**.
5. ⏳ **Export** pour les écrans ESP32 (l'outil de génération lit les plans depuis HA).

## Développement

`python3 -m pytest tests` (fonctions pures). Licence MIT.
