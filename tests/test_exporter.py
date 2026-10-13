"""Tests de l'export des plans pour l'assembleur d'écrans ESP."""

import base64
import sys
from pathlib import Path
from types import SimpleNamespace

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "custom_components"))

from dimotic_plans.exporter import export_plans  # noqa: E402

PLANS = {
    "Rez de chaussée": {
        "filename": "rdc.png",
        "positions": [
            {"entity_id": "light.ancien_nom", "registry_id": "reg-1", "x": 0.5, "y": 0.25},
            {"entity_id": "switch.entree_salle", "registry_id": "reg-2", "x": 0.1, "y": 0.9},
            {"entity_id": "sensor.disparu", "registry_id": None, "x": 0.3, "y": 0.3},
        ],
        "texts": [{"id": "t1", "text": "Poêle", "x": 0.2, "y": 0.2, "size": "medium", "color": "#FFC107"}],
    },
    "Premier": {"filename": "rdc.png", "positions": [], "texts": []},
}
REGISTRE = {"reg-1": SimpleNamespace(entity_id="light.nouveau_nom"), "reg-2": SimpleNamespace(entity_id="switch.entree_salle"), "switch.entree_salle": SimpleNamespace(entity_id="switch.entree_salle")}


def lookup(cle):
    return REGISTRE.get(cle)


def quoi(entity_id):
    return {"switch.entree_salle": "Radiateur"}.get(entity_id)


def image(nom):
    return b"PNGDATA" if nom == "rdc.png" else None


def test_export_complet_entity_id_actuel_quoi_et_image():
    r = export_plans(PLANS, None, lookup, quoi, image)
    assert r["anchor"] == "bottom-left"
    positions = r["floorplans"]["Rez de chaussée"]["positions"]
    assert [p["entity_id"] for p in positions] == ["light.nouveau_nom", "switch.entree_salle", "sensor.disparu"]  # renommage suivi, orphelin gardé
    assert [p["quoi"] for p in positions] == [None, "Radiateur", None]
    assert positions[0]["x"] == 0.5 and positions[0]["y"] == 0.25
    assert r["floorplans"]["Rez de chaussée"]["texts"][0]["text"] == "Poêle"
    assert base64.b64decode(r["images"]["rdc.png"]) == b"PNGDATA"
    assert list(r["images"]) == ["rdc.png"]  # image partagée par deux plans : une seule fois


def test_export_de_certains_plans_seulement():
    r = export_plans(PLANS, ["Premier"], lookup, quoi, image)
    assert list(r["floorplans"]) == ["Premier"]


def test_plan_inconnu_et_image_absente_refuses():
    with pytest.raises(KeyError):
        export_plans(PLANS, ["inconnu"], lookup, quoi, image)
    with pytest.raises(FileNotFoundError):
        export_plans({"p": {"filename": "absente.png", "positions": [], "texts": []}}, None, lookup, quoi, image)
