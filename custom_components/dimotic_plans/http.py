"""Vue HTTP authentifiée qui sert les images des plans (le panneau y accède par un chemin signé)."""

from __future__ import annotations

import mimetypes
from pathlib import Path

from aiohttp import web

from homeassistant.components.http import HomeAssistantView
from homeassistant.core import HomeAssistant

from .const import IMAGE_URL, IMAGES_DIR
from .importer import valid_image_name


class PlanImageView(HomeAssistantView):
    """GET /api/dimotic_plans/image/{filename} — authentification HA requise (jeton ou chemin signé)."""

    url = IMAGE_URL + "/{filename}"
    name = "api:dimotic_plans:image"
    requires_auth = True

    def __init__(self, hass: HomeAssistant) -> None:
        self._dir = Path(hass.config.path(IMAGES_DIR))

    async def get(self, request: web.Request, filename: str) -> web.Response:
        if not valid_image_name(filename):
            return web.Response(status=404)
        path = self._dir / filename
        hass = request.app["hass"]
        exists = await hass.async_add_executor_job(path.is_file)
        if not exists:
            return web.Response(status=404)
        data = await hass.async_add_executor_job(path.read_bytes)
        ctype = mimetypes.guess_type(filename)[0] or "application/octet-stream"
        return web.Response(body=data, content_type=ctype, headers={"Cache-Control": "private, max-age=300"})
