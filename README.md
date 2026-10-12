# Dimotic-HA Plans

Les **plans de la maison directement dans Home Assistant** : un panneau « Plans » dans le menu de gauche (titre et icône
réglables), pour afficher les plans de la maison avec les objets placés dessus (lumières, volets, radiateurs, capteurs…),
les commander, et à terme les créer et les modifier — **sans passer par dimotic-ha**. Il remplace l'outil HAPLAN de
[dimotic-ha](https://github.com/zdid/dimotic-ha).

> **État : v0.0.1, squelette.** L'intégration s'installe, le panneau « Plans » apparaît et les plans sont stockés dans HA
> (`.storage/dimotic_plans.floorplans`). **L'import des plans existants, l'affichage, la commande des objets et l'éditeur ne sont
> pas encore faits** — voir « Feuille de route ».

## Installation (HACS)

1. **HACS** → menu ⋮ → *Dépôts personnalisés* → `https://github.com/zdid/dimotic-ha-plans`, type *Intégration* → télécharger →
   **redémarrer Home Assistant**.
2. **Paramètres → Appareils et services → Ajouter une intégration → « Plans »**.
3. Titre et icône du menu : **Configurer** sur l'intégration (par défaut « Plans » et `mdi:floor-plan`).

Le panneau est réservé aux **administrateurs** de HA.

## Feuille de route

Conception complète : [`conception-haplan-dans-ha`](https://github.com/zdid/dimotic-ha/blob/main/specs/current/conception-haplan-dans-ha_specs_v1.1.md)
dans le dépôt dimotic-ha.

1. ✅ Dépôt, stockage dans HA, panneau (squelette).
2. ⏳ **Import** des plans, images, textes et positions de HAPLAN, avec lien stable vers le registre d'entités de HA
   (les positions survivent aux renommages d'entités).
3. ⏳ **Affichage et commande** des objets dans le panneau.
4. ⏳ **Éditeur** : déplacer, ajouter, supprimer des objets et des textes, créer un plan, téléverser une image.
5. ⏳ **Export** pour les écrans ESP32 (l'outil de génération lit les plans depuis HA).

## Développement

`python3 -m pytest tests` (fonctions pures). Licence MIT.
