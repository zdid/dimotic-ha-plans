"""Commandes WebSocket des plans : lecture pour tous les utilisateurs, import et éditeur réservés aux administrateurs."""

from __future__ import annotations

from typing import Any

import voluptuous as vol

from homeassistant.components import websocket_api
import base64
import json
import re
from pathlib import Path

from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers import entity_registry as er

from .const import CONF_SITE, DOMAIN, IMAGES_DIR, MAX_IMAGE_BYTES
from .editor import EditError, blank_svg, clean_plan_id, clean_positions, clean_texts, image_extension, new_image_name
from .exporter import export_plans
from .importer import ImportError_, normalize, valid_image_name


def _store(hass: HomeAssistant):
    return hass.data.get(DOMAIN, {}).get("store")


@callback
def async_register(hass: HomeAssistant) -> None:
    websocket_api.async_register_command(hass, ws_list)
    websocket_api.async_register_command(hass, ws_import)
    websocket_api.async_register_command(hass, ws_get)
    websocket_api.async_register_command(hass, ws_export)
    websocket_api.async_register_command(hass, ws_generate)
    for handler in (ws_save, ws_create, ws_rename, ws_delete, ws_set_image):
        websocket_api.async_register_command(hass, handler)


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


@websocket_api.websocket_command({vol.Required("type"): "dimotic_plans/floorplans/export", vol.Optional("plan_ids"): [str]})
@websocket_api.require_admin
@websocket_api.async_response
async def ws_export(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]) -> None:
    """Plans (positions avec `entity_id` actuel et « quoi », textes) et leurs images en base64 — pour l'assembleur d'écrans ESP."""
    store = _store(hass)
    if store is None:
        connection.send_error(msg["id"], "not_configured", "Intégration Plans non configurée.")
        return
    registry = er.async_get(hass)
    images_dir = Path(hass.config.path(IMAGES_DIR))

    def quoi_of(entity_id: str) -> str | None:
        state = hass.states.get(entity_id)
        tax = state.attributes.get("attributs_taxonomie") if state is not None else None
        return tax.get("quoi") if isinstance(tax, dict) else None

    def read_image(name: str) -> bytes | None:
        if not valid_image_name(name):
            return None
        path = images_dir / name
        return path.read_bytes() if path.is_file() else None

    try:
        result = await hass.async_add_executor_job(export_plans, store.floorplans, msg.get("plan_ids"), registry.async_get, quoi_of, read_image)
    except (KeyError, FileNotFoundError) as err:
        connection.send_error(msg["id"], "not_found", str(err.args[0] if err.args else err))
        return
    connection.send_result(msg["id"], result)


@websocket_api.websocket_command({vol.Required("type"): "dimotic_plans/generate", vol.Required("device"): str, vol.Optional("action", default="firmware"): vol.In(["firmware", "amorce"])})
@websocket_api.require_admin
@websocket_api.async_response
async def ws_generate(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]) -> None:
    """Bouton « Générer » : demande à l'assembleur d'écrans ESP (application esps-assemble de dimotic-ha) d'assembler l'appareil et de le faire fabriquer.

    Publie `{device, action}` (non conservé) sur `dimotic/esps-assemble/<site>/generer` par le MQTT de HA ; le site est réglé dans les options.
    """
    site = ""
    for entry in hass.config_entries.async_entries(DOMAIN):
        site = str(entry.options.get(CONF_SITE, "")).strip()
    if not site:
        connection.send_error(msg["id"], "no_site", "Site non renseigné : Paramètres → Appareils et services → Plans → Configurer.")
        return
    device = msg["device"].strip()
    if not re.fullmatch(r"[a-z0-9][a-z0-9_-]*", device):
        connection.send_error(msg["id"], "invalid", "Nom d'appareil invalide.")
        return
    try:
        from homeassistant.components import mqtt
        await mqtt.async_publish(hass, f"dimotic/esps-assemble/{site}/generer", json.dumps({"appareil": device, "action": msg["action"]}), 1, False)
    except Exception as err:  # MQTT absent ou déconnecté : message lisible côté panneau
        connection.send_error(msg["id"], "mqtt_unavailable", f"Publication MQTT impossible : {err}")
        return
    connection.send_result(msg["id"], {"site": site, "device": device, "action": msg["action"]})


# --- Éditeur (administrateurs) ---------------------------------------------------------------------------------------

IMAGE_SCHEMA = vol.Schema({vol.Required("name"): str, vol.Required("data"): str})


def _decode_image(image: dict[str, str]) -> tuple[str, bytes]:
    ext = image_extension(image["name"])
    try:
        data = base64.b64decode(image["data"], validate=True)
    except ValueError as err:
        raise EditError("image illisible") from err
    if not data or len(data) > MAX_IMAGE_BYTES:
        raise EditError("image vide ou trop volumineuse (10 Mo au plus)")
    return ext, data


def _remove_unused_image(directory: Path, name: str) -> None:
    if valid_image_name(name):
        (directory / name).unlink(missing_ok=True)


async def _editor_call(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any], work) -> None:
    """Exécute `work(store)` ; transforme les refus (EditError) en erreur WebSocket lisible."""
    store = _store(hass)
    if store is None:
        connection.send_error(msg["id"], "not_configured", "Intégration Plans non configurée.")
        return
    try:
        result = await work(store)
    except EditError as err:
        connection.send_error(msg["id"], "invalid", str(err))
        return
    store.async_schedule_save()
    connection.send_result(msg["id"], result)


def _plan_or_error(store, plan_id: str) -> dict[str, Any]:
    plan = store.floorplans.get(plan_id)
    if plan is None:
        raise EditError("plan inconnu")
    return plan


def _images_dir(hass: HomeAssistant) -> Path:
    return Path(hass.config.path(IMAGES_DIR))


def _image_in_use(store, name: str) -> bool:
    return any(p.get("filename") == name for p in store.floorplans.values())


@websocket_api.websocket_command({
    vol.Required("type"): "dimotic_plans/floorplans/save",
    vol.Required("plan_id"): str,
    vol.Required("positions"): list,
    vol.Required("texts"): list,
})
@websocket_api.require_admin
@websocket_api.async_response
async def ws_save(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]) -> None:
    """Remplace les objets et les textes d'un plan (enregistrement de l'éditeur)."""
    async def work(store):
        plan = _plan_or_error(store, msg["plan_id"])
        positions = clean_positions(msg["positions"])
        texts = clean_texts(msg["texts"])
        registry = er.async_get(hass)
        previous = {p["entity_id"]: p.get("registry_id") for p in plan.get("positions", [])}
        for pos in positions:
            entry = registry.async_get(pos["entity_id"])
            # Objet orphelin conservé tel quel : on garde l'identifiant qu'il avait.
            pos["registry_id"] = entry.id if entry is not None else previous.get(pos["entity_id"])
        plan["positions"] = positions
        plan["texts"] = texts
        return {"positions": len(positions), "texts": len(texts)}
    await _editor_call(hass, connection, msg, work)


@websocket_api.websocket_command({
    vol.Required("type"): "dimotic_plans/floorplans/create",
    vol.Required("plan_id"): str,
    vol.Optional("image"): IMAGE_SCHEMA,
})
@websocket_api.require_admin
@websocket_api.async_response
async def ws_create(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]) -> None:
    """Nouveau plan, avec une image téléversée ou une page blanche."""
    async def work(store):
        plan_id = clean_plan_id(msg["plan_id"])
        if plan_id in store.floorplans:
            raise EditError("un plan porte déjà ce nom")
        ext, data = _decode_image(msg["image"]) if "image" in msg else ("svg", blank_svg())
        name = new_image_name(plan_id, ext)
        await hass.async_add_executor_job(_write_images, _images_dir(hass), {name: data})
        store.floorplans[plan_id] = {"filename": name, "positions": [], "texts": []}
        return {"plan_id": plan_id, "filename": name}
    await _editor_call(hass, connection, msg, work)


@websocket_api.websocket_command({
    vol.Required("type"): "dimotic_plans/floorplans/rename",
    vol.Required("plan_id"): str,
    vol.Required("new_id"): str,
})
@websocket_api.require_admin
@websocket_api.async_response
async def ws_rename(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]) -> None:
    """Renomme un plan en gardant sa place dans l'ordre des onglets."""
    async def work(store):
        _plan_or_error(store, msg["plan_id"])
        new_id = clean_plan_id(msg["new_id"])
        if new_id != msg["plan_id"] and new_id in store.floorplans:
            raise EditError("un plan porte déjà ce nom")
        reordered = {(new_id if k == msg["plan_id"] else k): v for k, v in store.floorplans.items()}
        store.replace_all(reordered)
        return {"plan_id": new_id}
    await _editor_call(hass, connection, msg, work)


@websocket_api.websocket_command({vol.Required("type"): "dimotic_plans/floorplans/delete", vol.Required("plan_id"): str})
@websocket_api.require_admin
@websocket_api.async_response
async def ws_delete(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]) -> None:
    """Supprime un plan (et son image si aucun autre plan ne l'utilise)."""
    async def work(store):
        plan = _plan_or_error(store, msg["plan_id"])
        del store.floorplans[msg["plan_id"]]
        name = plan.get("filename", "")
        if name and not _image_in_use(store, name):
            await hass.async_add_executor_job(_remove_unused_image, _images_dir(hass), name)
        return {"deleted": msg["plan_id"]}
    await _editor_call(hass, connection, msg, work)


@websocket_api.websocket_command({
    vol.Required("type"): "dimotic_plans/floorplans/set_image",
    vol.Required("plan_id"): str,
    vol.Required("image"): IMAGE_SCHEMA,
})
@websocket_api.require_admin
@websocket_api.async_response
async def ws_set_image(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]) -> None:
    """Change l'image d'un plan (objets et textes gardés à leurs positions relatives)."""
    async def work(store):
        plan = _plan_or_error(store, msg["plan_id"])
        ext, data = _decode_image(msg["image"])
        name = new_image_name(msg["plan_id"], ext)
        await hass.async_add_executor_job(_write_images, _images_dir(hass), {name: data})
        old = plan.get("filename", "")
        plan["filename"] = name
        if old and not _image_in_use(store, old):
            await hass.async_add_executor_job(_remove_unused_image, _images_dir(hass), old)
        return {"filename": name}
    await _editor_call(hass, connection, msg, work)
