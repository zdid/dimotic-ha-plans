"""Assistant d'ajout et réglages (titre et icône du menu)."""

from __future__ import annotations

from typing import Any

import voluptuous as vol

from homeassistant.config_entries import ConfigEntry, ConfigFlow, ConfigFlowResult, OptionsFlow
from homeassistant.core import callback
from homeassistant.helpers import selector

from .const import CONF_ICON, CONF_SITE, CONF_TITLE, DEFAULT_ICON, DEFAULT_SITE, DEFAULT_TITLE, DOMAIN


def _schema(title: str, icon: str, site: str = DEFAULT_SITE) -> vol.Schema:
    return vol.Schema(
        {
            vol.Required(CONF_TITLE, default=title): str,
            vol.Required(CONF_ICON, default=icon): selector.IconSelector(),
            vol.Optional(CONF_SITE, default=site): str,
        }
    )


def _clean(user_input: dict[str, Any]) -> dict[str, str]:
    return {
        CONF_TITLE: (user_input.get(CONF_TITLE) or "").strip() or DEFAULT_TITLE,
        CONF_ICON: (user_input.get(CONF_ICON) or "").strip() or DEFAULT_ICON,
        CONF_SITE: (user_input.get(CONF_SITE) or "").strip(),
    }


class DimoticPlansConfigFlow(ConfigFlow, domain=DOMAIN):
    """Une seule instance par installation de HA."""

    VERSION = 1

    @staticmethod
    @callback
    def async_get_options_flow(config_entry: ConfigEntry) -> OptionsFlow:
        return DimoticPlansOptionsFlow()

    async def async_step_user(self, user_input: dict[str, Any] | None = None) -> ConfigFlowResult:
        await self.async_set_unique_id(DOMAIN)
        self._abort_if_unique_id_configured()
        if user_input is not None:
            return self.async_create_entry(title="Plans", data={}, options=_clean(user_input))
        return self.async_show_form(step_id="user", data_schema=_schema(DEFAULT_TITLE, DEFAULT_ICON))


class DimoticPlansOptionsFlow(OptionsFlow):
    """Titre et icône de l'entrée du menu de gauche (modifiables à tout moment)."""

    async def async_step_init(self, user_input: dict[str, Any] | None = None) -> ConfigFlowResult:
        if user_input is not None:
            return self.async_create_entry(title="", data=_clean(user_input))
        opts = self.config_entry.options
        return self.async_show_form(step_id="init", data_schema=_schema(opts.get(CONF_TITLE, DEFAULT_TITLE), opts.get(CONF_ICON, DEFAULT_ICON), opts.get(CONF_SITE, DEFAULT_SITE)))
