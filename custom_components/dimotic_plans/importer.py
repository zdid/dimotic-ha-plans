"""Normalisation des plans HAPLAN (dimotic-ha) à importer — fonctions pures, testables sans HA.

Entrée : le contenu de `config-haplan-floorplans-v1.0.yaml` (`floorplans` : {id: {filename, positions, texts}}).
Sortie : la même forme, nettoyée, avec `registry_id` pour chaque position (identifiant stable du registre d'entités de HA,
`None` si l'entité est inconnue : position « orpheline », conservée pour être réattribuée plus tard).
"""

from __future__ import annotations

import re
from collections.abc import Callable
from typing import Any

from .const import IMAGE_NAME_RE, TEXT_SIZES


class ImportError_(ValueError):
    """Contenu à importer invalide (message affichable)."""


def _num(value: Any) -> float | None:
    if value is None:
        return None
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        raise ImportError_(f"coordonnée invalide : {value!r}")
    return float(value)


def valid_image_name(name: str) -> bool:
    return re.fullmatch(IMAGE_NAME_RE, name) is not None and "/" not in name and "\\" not in name and ".." not in name


def normalize(floorplans: dict[str, Any], resolve_registry_id: Callable[[str], str | None]) -> tuple[dict[str, Any], dict[str, Any]]:
    """Renvoie (plans nettoyés, bilan). Lève ImportError_ si la structure est inutilisable."""
    if not isinstance(floorplans, dict) or not floorplans:
        raise ImportError_("aucun plan à importer")
    out: dict[str, Any] = {}
    report = {"plans": 0, "positions": 0, "placed": 0, "texts": 0, "orphans": []}
    for plan_id, plan in floorplans.items():
        if not isinstance(plan_id, str) or not plan_id.strip() or len(plan_id) > 64:
            raise ImportError_(f"identifiant de plan invalide : {plan_id!r}")
        if not isinstance(plan, dict):
            raise ImportError_(f"plan {plan_id!r} : structure invalide")
        filename = plan.get("filename")
        if not isinstance(filename, str) or not valid_image_name(filename):
            raise ImportError_(f"plan {plan_id!r} : nom d'image invalide {filename!r}")
        positions = []
        for pos in plan.get("positions") or []:
            entity_id = pos.get("entity_id") if isinstance(pos, dict) else None
            if not isinstance(entity_id, str) or "." not in entity_id:
                raise ImportError_(f"plan {plan_id!r} : position sans entity_id valide")
            x, y = _num(pos.get("x")), _num(pos.get("y"))
            registry_id = resolve_registry_id(entity_id)
            positions.append({"entity_id": entity_id, "registry_id": registry_id, "x": x, "y": y})
            report["positions"] += 1
            if x is not None and y is not None:
                report["placed"] += 1
            if registry_id is None:
                report["orphans"].append(f"{plan_id} : {entity_id}")
        texts = []
        for txt in plan.get("texts") or []:
            if not isinstance(txt, dict) or not isinstance(txt.get("text"), str) or not txt.get("text"):
                raise ImportError_(f"plan {plan_id!r} : texte invalide")
            size = txt.get("size", "medium")
            texts.append({
                "id": str(txt.get("id") or f"t{len(texts) + 1}"),
                "text": txt["text"],
                "x": _num(txt.get("x")) or 0.0,
                "y": _num(txt.get("y")) or 0.0,
                "size": size if size in TEXT_SIZES else "medium",
                "color": str(txt.get("color") or "#FFFFFF"),
            })
        report["texts"] += len(texts)
        out[plan_id] = {"filename": filename, "positions": positions, "texts": texts}
        report["plans"] += 1
    return out, report
