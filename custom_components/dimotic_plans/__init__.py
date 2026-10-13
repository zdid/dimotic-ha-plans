"""Plans de la maison dans Home Assistant (panneau latéral « Plans »)."""

from __future__ import annotations

import logging
from pathlib import Path

from homeassistant.components import frontend, panel_custom
from homeassistant.components.http import StaticPathConfig
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant

from . import websocket_api as plans_ws
from .http import PlanImageView
from .const import (
    CONF_ICON,
    CONF_SITE,
    CONF_TITLE,
    DEFAULT_ICON,
    DEFAULT_TITLE,
    DOMAIN,
    PANEL_COMPONENT,
    PANEL_URL_PATH,
    STATIC_URL,
)
from .storage import PlanStore

_LOGGER = logging.getLogger(__name__)
VERSION = "0.1.8"


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    store_data = hass.data.setdefault(DOMAIN, {})
    title = entry.options.get(CONF_TITLE, DEFAULT_TITLE)
    icon = entry.options.get(CONF_ICON, DEFAULT_ICON)

    plan_store = PlanStore(hass)
    await plan_store.async_load()
    store_data["store"] = plan_store

    if not store_data.get("static_registered"):
        frontend_dir = str(Path(__file__).parent / "frontend")
        await hass.http.async_register_static_paths([StaticPathConfig(STATIC_URL, frontend_dir, False)])
        plans_ws.async_register(hass)
        hass.http.register_view(PlanImageView(hass))
        store_data["static_registered"] = True

    await panel_custom.async_register_panel(
        hass,
        webcomponent_name=PANEL_COMPONENT,
        frontend_url_path=PANEL_URL_PATH,
        module_url=f"{STATIC_URL}/panel.js?v={VERSION}",
        sidebar_title=title,
        sidebar_icon=icon,
        require_admin=False,  # affichage pour tous ; import (et futur éditeur) réservés aux administrateurs
        config={"title": title, "site": entry.options.get(CONF_SITE, "")},
    )
    entry.async_on_unload(entry.add_update_listener(_async_options_updated))
    return True


async def _async_options_updated(hass: HomeAssistant, entry: ConfigEntry) -> None:
    """Titre ou icône modifiés : on recharge pour que le menu soit mis à jour."""
    await hass.config_entries.async_reload(entry.entry_id)


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    frontend.async_remove_panel(hass, PANEL_URL_PATH)
    hass.data.get(DOMAIN, {}).pop("store", None)
    return True
