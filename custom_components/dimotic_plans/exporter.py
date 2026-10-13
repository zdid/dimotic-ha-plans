"""Export des plans pour l'assembleur de sources ESPHome (application `esps-assemble` de dimotic-ha) : l'inverse de l'import.

Chaque plan est rendu avec l'`entity_id` ACTUEL de chaque objet (retrouvé par l'identifiant stable du registre) et, si l'entité existe,
son « quoi » de taxonomie (attribut `attributs_taxonomie.quoi`, posé par nommage) — il sert à choisir l'icône d'un interrupteur
(radiateur, ballon, ventilation) quand l'identifiant ne le dit pas. Les images sont jointes en base64. Les positions restent celles de
l'intégration : x et y désignent le COIN INFÉRIEUR GAUCHE de l'objet (fractions de l'image).
"""

from __future__ import annotations

import base64
from typing import Any, Callable


def export_plans(
    floorplans: dict[str, Any],
    plan_ids: list[str] | None,
    lookup: Callable[[str], Any],
    quoi_of: Callable[[str], str | None],
    read_image: Callable[[str], bytes | None],
) -> dict[str, Any]:
    """`lookup(id_ou_entity_id)` renvoie l'entrée du registre ou None ; `quoi_of(entity_id)` le « quoi » ou None ;
    `read_image(nom)` le contenu du fichier image ou None (absent)."""
    wanted = plan_ids if plan_ids else list(floorplans)
    unknown = [p for p in wanted if p not in floorplans]
    if unknown:
        raise KeyError(f"plan inconnu : {', '.join(unknown)}")
    plans: dict[str, Any] = {}
    images: dict[str, str] = {}
    for plan_id in wanted:
        plan = floorplans[plan_id]
        positions = []
        for pos in plan.get("positions", []):
            entry = lookup(pos["registry_id"]) if pos.get("registry_id") else None
            if entry is None:
                entry = lookup(pos["entity_id"])
            entity_id = entry.entity_id if entry is not None else pos["entity_id"]
            positions.append({"entity_id": entity_id, "x": pos.get("x"), "y": pos.get("y"), "quoi": quoi_of(entity_id)})
        plans[plan_id] = {"filename": plan.get("filename", ""), "positions": positions, "texts": list(plan.get("texts", []))}
        name = plan.get("filename", "")
        if name and name not in images:
            data = read_image(name)
            if data is None:
                raise FileNotFoundError(f"image introuvable : {name}")
            images[name] = base64.b64encode(data).decode("ascii")
    return {"floorplans": plans, "images": images, "anchor": "bottom-left"}
