"""Tests de la normalisation des plans importés depuis HAPLAN."""

import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "custom_components"))

from dimotic_plans.importer import ImportError_, normalize, valid_image_name  # noqa: E402

KNOWN = {"light.salon": "reg-1", "switch.ballon": "reg-2"}


def test_import_complet_avec_orphelins_et_textes():
    plans, report = normalize(
        {
            "Rez de chaussée": {
                "filename": "Rez_de_chauss_e.png",
                "positions": [
                    {"entity_id": "light.salon", "x": 0.5, "y": 0.25},
                    {"entity_id": "sensor.disparu", "x": 0.1, "y": 0.2},
                    {"entity_id": "switch.ballon", "x": None, "y": None},
                ],
                "texts": [{"id": "t1", "text": "Salon", "x": 0.3, "y": 0.4, "size": "énorme"}],
            }
        },
        KNOWN.get,
    )
    plan = plans["Rez de chaussée"]
    assert [p["registry_id"] for p in plan["positions"]] == ["reg-1", None, "reg-2"]
    assert plan["texts"][0]["size"] == "medium"  # taille inconnue ramenée à « medium »
    assert report == {"plans": 1, "positions": 3, "placed": 2, "texts": 1, "orphans": ["Rez de chaussée : sensor.disparu"]}


@pytest.mark.parametrize("bad", [
    {},
    {"p": {"filename": "../etc/passwd.png", "positions": []}},
    {"p": {"filename": "plan.exe", "positions": []}},
    {"p": {"filename": "plan.png", "positions": [{"x": 0.1, "y": 0.1}]}},
    {"p": {"filename": "plan.png", "positions": [{"entity_id": "light.a", "x": "0.1", "y": 0.1}]}},
])
def test_contenus_refuses(bad):
    with pytest.raises(ImportError_):
        normalize(bad, KNOWN.get)


def test_noms_d_images():
    assert valid_image_name("Rez_de_chauss_e.png") and valid_image_name("plan original.jpg")
    for bad in ("a/b.png", "..png", "x.png/..", "plan.gif", ""):
        assert not valid_image_name(bad)
