"""Commandes WebSocket des plans (réservées aux administrateurs de HA)."""

from __future__ import annotations

from typing import Any

import voluptuous as vol

from homeassistant.components import websocket_api
import base64
from pathlib import Path

from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers import entity_registry as er

from .const import DOMAIN, IMAGES_DIR, MAX_IMAGE_BYTES
from .importer import ImportError_, normalize, valid_image_name


def _store(hass: HomeAssistant):
    return hass.data.get(DOMAIN, {}).get("store")


@callback
def async_register(hass: HomeAssistant) -> None:
    websocket_api.async_register_command(hass, ws_list)
    websocket_api.async_register_command(hass, ws_import)
    websocket_api.async_register_command(hass, ws_get)


@websocket_api.websocket_command({vol.Required("type"): "dimotic_plans/floorplans/list"})
@websocket_api.async_response
async def ws_list(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]) -> None:
    store = _store(hass)
    if store is None:
        connection.send_error(msg["id"], "not_configured", "Intégration Plans non configurée.")
        return
    connection.send_result(msg["id"], {"floorplans": store.summary()})


def _write_images(directory: Path, images: dict[str, bytes]) -> None:
    directory.mkdir(parents=True, exist_ok=True)
    for name, data in images.items():
        tmp = directory / f".{name}.tmp"
        tmp.write_bytes(data)
        tmp.replace(directory / name)


@websocket_api.websocket_command(
    {
        vol.Required("type"): "dimotic_plans/floorplans/import",
        vol.Required("floorplans"): dict,
        vol.Required("images"): {str: str},
        vol.Optional("overwrite", default=False): bool,
    }
)
@websocket_api.require_admin
@websocket_api.async_response
async def ws_import(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]) -> None:
    """Importe des plans HAPLAN (dimotic-ha) : plans, positions, textes et images (base64)."""
    store = _store(hass)
    if store is None:
        connection.send_error(msg["id"], "not_configured", "Intégration Plans non configurée.")
        return
    if store.floorplans and not msg["overwrite"]:
        connection.send_error(msg["id"], "already_exists", "Des plans existent déjà : relancer avec overwrite pour les remplacer.")
        return
    registry = er.async_get(hass)

    def resolve(entity_id: str) -> str | None:
        entry = registry.async_get(entity_id)
        return entry.id if entry is not None else None

    try:
        plans, report = normalize(msg["floorplans"], resolve)
        images: dict[str, bytes] = {}
        for name, b64 in msg["images"].items():
            if not valid_image_name(name):
                raise ImportError_(f"nom d'image invalide {name!r}")
            data = base64.b64decode(b64, validate=True)
            if len(data) > MAX_IMAGE_BYTES:
                raise ImportError_(f"image {name!r} trop volumineuse")
            images[name] = data
        missing = sorted({p["filename"] for p in plans.values()} - set(images))
        if missing:
            raise ImportError_(f"images manquantes : {', '.join(missing)}")
    except (ImportError_, ValueError) as err:
        connection.send_error(msg["id"], "invalid", str(err))
        return

    await hass.async_add_executor_job(_write_images, Path(hass.config.path(IMAGES_DIR)), images)
    store.replace_all(plans)
    store.async_schedule_save()
    report["images"] = sorted(images)
    connection.send_result(msg["id"], report)


def resolve_positions(positions: list[dict[str, Any]], lookup: Any) -> list[dict[str, Any]]:
    """`entity_id` actuel de chaque position, retrouvé par l'identifiant stable du registre (renommages suivis).

    `lookup(id_ou_entity_id)` renvoie l'entrée du registre ou None. Sans entrée : position « orpheline » (gardée).
    """
    out = []
    for pos in positions:
        entry = lookup(pos["registry_id"]) if pos.get("registry_id") else None
        if entry is None:
            entry = lookup(pos["entity_id"])
        out.append({
            "entity_id": entry.entity_id if entry is not None else pos["entity_id"],
            "stored_entity_id": pos["entity_id"],
            "orphan": entry is None,
            "x": pos.get("x"),
            "y": pos.get("y"),
        })
    return out


@websocket_api.websocket_command({vol.Required("type"): "dimotic_plans/floorplans/get", vol.Required("plan_id"): str})
@websocket_api.async_response
async def ws_get(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]) -> None:
    """Un plan complet, avec l'entity_id ACTUEL de chaque objet."""
    store = _store(hass)
    if store is None:
        connection.send_error(msg["id"], "not_configured", "Intégration Plans non configurée.")
        return
    plan = store.floorplans.get(msg["plan_id"])
    if plan is None:
        connection.send_error(msg["id"], "not_found", "Plan inconnu.")
        return
    registry = er.async_get(hass)
    connection.send_result(msg["id"], {
        "id": msg["plan_id"],
        "filename": plan.get("filename", ""),
        "positions": resolve_positions(plan.get("positions", []), registry.async_get),
        "texts": plan.get("texts", []),
    })
