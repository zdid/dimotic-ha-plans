"""Commandes WebSocket des plans (réservées aux administrateurs de HA)."""

from __future__ import annotations

from typing import Any

import voluptuous as vol

from homeassistant.components import websocket_api
from homeassistant.core import HomeAssistant, callback

from .const import DOMAIN


def _store(hass: HomeAssistant):
    return hass.data.get(DOMAIN, {}).get("store")


@callback
def async_register(hass: HomeAssistant) -> None:
    websocket_api.async_register_command(hass, ws_list)


@websocket_api.websocket_command({vol.Required("type"): "dimotic_plans/floorplans/list"})
@websocket_api.require_admin
@websocket_api.async_response
async def ws_list(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]) -> None:
    store = _store(hass)
    if store is None:
        connection.send_error(msg["id"], "not_configured", "Intégration Plans non configurée.")
        return
    connection.send_result(msg["id"], {"floorplans": store.summary()})
