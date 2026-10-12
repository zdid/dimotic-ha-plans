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
