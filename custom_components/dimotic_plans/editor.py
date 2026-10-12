"""Validation des modifications faites dans l'éditeur du panneau — fonctions pures, testables sans HA."""

from __future__ import annotations

import re
import secrets
import unicodedata
from typing import Any

from .const import TEXT_SIZES

IMAGE_EXTS = ("png", "jpg", "jpeg", "webp", "svg")
COLOR_RE = r"^#[0-9A-Fa-f]{3}([0-9A-Fa-f]{3})?$"
MAX_TEXT_LEN = 200
MAX_ITEMS = 500


class EditError(ValueError):
    """Modification refusée (message affichable)."""


def clean_plan_id(value: Any) -> str:
    """Nom d'un plan : 1 à 64 caractères imprimables, espaces de bord retirés."""
    if not isinstance(value, str):
        raise EditError("nom de plan invalide")
    name = value.strip()
    if not name or len(name) > 64 or any(unicodedata.category(c).startswith("C") for c in name):
        raise EditError("le nom du plan doit faire de 1 à 64 caractères")
    return name


def _coord(value: Any) -> float:
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        raise EditError(f"coordonnée invalide : {value!r}")
    return min(1.0, max(0.0, float(value)))


def clean_positions(positions: Any) -> list[dict[str, Any]]:
    """Positions envoyées par l'éditeur : entity_id valide, x/y bornés à [0, 1], une seule fois par plan."""
    if not isinstance(positions, list) or len(positions) > MAX_ITEMS:
        raise EditError("liste d'objets invalide")
    out, seen = [], set()
    for pos in positions:
        entity_id = pos.get("entity_id") if isinstance(pos, dict) else None
        if not isinstance(entity_id, str) or re.fullmatch(r"[a-z0-9_]+\.[a-z0-9_]+", entity_id) is None:
            raise EditError(f"objet invalide : {entity_id!r}")
        if entity_id in seen:
            raise EditError(f"objet en double : {entity_id}")
        seen.add(entity_id)
        out.append({"entity_id": entity_id, "x": _coord(pos.get("x")), "y": _coord(pos.get("y"))})
    return out


def clean_texts(texts: Any) -> list[dict[str, Any]]:
    """Textes posés sur le plan : contenu non vide (200 caractères au plus), taille connue, couleur #rgb ou #rrggbb."""
    if not isinstance(texts, list) or len(texts) > MAX_ITEMS:
        raise EditError("liste de textes invalide")
    out = []
    for txt in texts:
        if not isinstance(txt, dict):
            raise EditError("texte invalide")
        text = txt.get("text")
        if not isinstance(text, str) or not text.strip() or len(text) > MAX_TEXT_LEN:
            raise EditError("un texte doit faire de 1 à 200 caractères")
        size = txt.get("size", "medium")
        color = txt.get("color", "#212121")
        if size not in TEXT_SIZES:
            raise EditError(f"taille de texte inconnue : {size!r}")
        if not isinstance(color, str) or re.fullmatch(COLOR_RE, color) is None:
            raise EditError(f"couleur invalide : {color!r}")
        tid = txt.get("id")
        out.append({
            "id": tid if isinstance(tid, str) and 0 < len(tid) <= 40 else f"t{secrets.token_hex(4)}",
            "text": text.strip(),
            "x": _coord(txt.get("x")),
            "y": _coord(txt.get("y")),
            "size": size,
            "color": color,
        })
    return out


def image_extension(name: Any) -> str:
    """Extension (en minuscules) d'une image téléversée, parmi les formats acceptés."""
    if not isinstance(name, str) or "." not in name:
        raise EditError("nom d'image invalide")
    ext = name.rsplit(".", 1)[1].lower()
    if ext not in IMAGE_EXTS:
        raise EditError("format d'image non accepté (png, jpg, webp, svg)")
    return ext


def new_image_name(plan_id: str, ext: str) -> str:
    """Nom de fichier neuf pour l'image d'un plan (jamais réutilisé : pas de vieille image en cache navigateur)."""
    ascii_name = unicodedata.normalize("NFKD", plan_id).encode("ascii", "ignore").decode()
    slug = re.sub(r"[^A-Za-z0-9]+", "_", ascii_name).strip("_")[:40] or "plan"
    return f"{slug}-{secrets.token_hex(4)}.{ext}"


def blank_svg(width: int = 1000, height: int = 700) -> bytes:
    """« Page libre » : feuille blanche avec un cadre léger, à dessiner plus tard."""
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" viewBox="0 0 {width} {height}">'
        f'<rect x="1" y="1" width="{width - 2}" height="{height - 2}" fill="#ffffff" stroke="#bdbdbd" stroke-width="2"/></svg>'
    ).encode()
