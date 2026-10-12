"""Constantes de l'intégration Plans (domaine figé : `dimotic_plans`)."""

DOMAIN = "dimotic_plans"

CONF_TITLE = "title"
CONF_ICON = "icon"
DEFAULT_TITLE = "Plans"
DEFAULT_ICON = "mdi:floor-plan"

PANEL_URL_PATH = "plans"
PANEL_COMPONENT = "dimotic-plans-panel"
STATIC_URL = "/dimotic_plans_static"

STORAGE_KEY = "dimotic_plans.floorplans"
STORAGE_VERSION = 1

IMAGES_DIR = "dimotic_plans/images"          # relatif au dossier de configuration de HA
IMAGE_URL = "/api/dimotic_plans/image"       # vue authentifiée (le panneau passe par auth/sign_path)
IMAGE_NAME_RE = r"^[A-Za-z0-9._ -]{1,100}\.(png|jpg|jpeg|webp|svg)$"
MAX_IMAGE_BYTES = 10 * 1024 * 1024
TEXT_SIZES = ("small", "medium", "large")
