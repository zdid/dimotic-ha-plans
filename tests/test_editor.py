"""Tests de la validation des modifications de l'éditeur."""

import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "custom_components"))

from dimotic_plans.editor import (  # noqa: E402
    EditError,
    blank_svg,
    clean_plan_id,
    clean_positions,
    clean_texts,
    image_extension,
    new_image_name,
)
from dimotic_plans.importer import valid_image_name  # noqa: E402


def test_nom_de_plan():
    assert clean_plan_id("  Rez de chaussée ") == "Rez de chaussée"
    for bad in ("", "   ", "x" * 65, "a\nb", None):
        with pytest.raises(EditError):
            clean_plan_id(bad)


def test_positions_bornees_et_sans_double():
    out = clean_positions([{"entity_id": "light.salon", "x": 1.4, "y": -0.2}, {"entity_id": "switch.ballon", "x": 0.5, "y": 0.5}])
    assert out[0] == {"entity_id": "light.salon", "x": 1.0, "y": 0.0}
    with pytest.raises(EditError):
        clean_positions([{"entity_id": "light.salon", "x": 0, "y": 0}] * 2)
    with pytest.raises(EditError):
        clean_positions([{"entity_id": "pas_un_entity_id", "x": 0, "y": 0}])
    with pytest.raises(EditError):
        clean_positions([{"entity_id": "light.salon", "x": "0.5", "y": 0}])


def test_textes():
    out = clean_texts([{"text": " Salon ", "x": 0.2, "y": 0.3, "size": "large", "color": "#123abc"}])
    assert out[0]["text"] == "Salon" and out[0]["size"] == "large" and out[0]["id"].startswith("t")
    assert clean_texts([{"id": "t1", "text": "A", "x": 0, "y": 0}])[0]["color"] == "#212121"
    for bad in ({"text": "", "x": 0, "y": 0}, {"text": "A", "x": 0, "y": 0, "size": "huge"},
                {"text": "A", "x": 0, "y": 0, "color": "red; background:url(x)"}):
        with pytest.raises(EditError):
            clean_texts([bad])


def test_images():
    assert image_extension("Plan.PNG") == "png"
    with pytest.raises(EditError):
        image_extension("plan.gif")
    name = new_image_name("Rez de chaussée / étage", "png")
    assert name.startswith("Rez_de_chaussee_etage-") and valid_image_name(name)
    assert new_image_name("Rez", "png") != new_image_name("Rez", "png")
    assert blank_svg().startswith(b"<svg")
