"""Stockage des plans dans HA (`.storage/dimotic_plans.floorplans`).

Forme (reprise de HAPLAN de dimotic-ha, voir la conception « HAPLAN dans HA ») :
  { "floorplans": { "<id>": { "filename": "plan.png",
                              "positions": [ { "entity_id": "light.x", "registry_id": "<id du registre>|null", "x": 0.5, "y": 0.2 } ],
                              "texts": [ { "id": "t1", "text": "Salon", "x": 0.1, "y": 0.1, "size": "medium", "color": "#FFFFFF" } ] } } }
x et y sont normalisés entre 0 et 1. `registry_id` est l'identifiant stable du registre d'entités : il survit aux
renommages d'`entity_id` (les positions ne deviennent plus obsolètes).
"""

from __future__ import annotations

from typing import Any

from homeassistant.core import HomeAssistant
from homeassistant.helpers.storage import Store

from .const import STORAGE_KEY, STORAGE_VERSION

EMPTY: dict[str, Any] = {"floorplans": {}}


class PlanStore:
    """Lecture/écriture des plans, avec écriture différée par HA."""

    def __init__(self, hass: HomeAssistant) -> None:
        self._store: Store[dict[str, Any]] = Store(hass, STORAGE_VERSION, STORAGE_KEY)
        self._data: dict[str, Any] = {"floorplans": {}}

    async def async_load(self) -> None:
        loaded = await self._store.async_load()
        self._data = loaded if isinstance(loaded, dict) and isinstance(loaded.get("floorplans"), dict) else {"floorplans": {}}

    @property
    def floorplans(self) -> dict[str, Any]:
        return self._data["floorplans"]

    def summary(self) -> list[dict[str, Any]]:
        """Liste sans le détail des positions : id, fichier, nombre de positions et de textes."""
        return [
            {
                "id": plan_id,
                "filename": plan.get("filename", ""),
                "positions": len(plan.get("positions", [])),
                "texts": len(plan.get("texts", [])),
            }
            for plan_id, plan in self.floorplans.items()
        ]

    def async_schedule_save(self) -> None:
        self._store.async_delay_save(lambda: self._data, 1)
