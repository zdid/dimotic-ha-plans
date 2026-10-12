"""Tests de la partie pure du stockage des plans."""

import sys
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "custom_components"))

from dimotic_plans.storage import PlanStore  # noqa: E402


def _store_with(plans):
    with patch("dimotic_plans.storage.Store"):
        store = PlanStore(hass=None)  # type: ignore[arg-type]
    store._data = {"floorplans": plans}
    return store


def test_resume_compte_positions_et_textes():
    store = _store_with({
        "Premier": {"filename": "Premier.png", "positions": [{"entity_id": "light.a", "x": 0.1, "y": 0.2}], "texts": []},
        "original": {"filename": "plan-original.png", "positions": [], "texts": [{"id": "t1"}, {"id": "t2"}]},
    })
    resume = {p["id"]: p for p in store.summary()}
    assert resume["Premier"] == {"id": "Premier", "filename": "Premier.png", "positions": 1, "orphans": 1, "texts": 0}  # sans registry_id = orpheline
    assert resume["original"]["texts"] == 2


def test_aucun_plan():
    assert _store_with({}).summary() == []


def test_resolution_par_identifiant_du_registre():
    from types import SimpleNamespace

    from dimotic_plans.websocket_api import resolve_positions

    registry = {"reg-1": SimpleNamespace(entity_id="light.salon_renomme"), "switch.ballon": SimpleNamespace(entity_id="switch.ballon")}
    out = resolve_positions(
        [
            {"entity_id": "light.salon", "registry_id": "reg-1", "x": 0.1, "y": 0.2},
            {"entity_id": "switch.ballon", "registry_id": None, "x": 0.3, "y": 0.4},
            {"entity_id": "light.disparue", "registry_id": "reg-x", "x": 0.5, "y": 0.6},
        ],
        registry.get,
    )
    assert [p["entity_id"] for p in out] == ["light.salon_renomme", "switch.ballon", "light.disparue"]
    assert [p["orphan"] for p in out] == [False, False, True]
    assert out[0]["stored_entity_id"] == "light.salon"
