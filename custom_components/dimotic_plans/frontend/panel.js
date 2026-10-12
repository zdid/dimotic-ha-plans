/* Plans — panneau personnalisé (Dimotic-HA Plans). Squelette v0.0.1 : affiche le titre réglable et la liste des plans
 * stockés dans HA. L'affichage des plans, la commande des objets et l'éditeur viennent ensuite (voir README). */
(() => {
  const STYLE = `
    :host { display: flex; flex-direction: column; height: 100vh; height: 100dvh; background: var(--primary-background-color, #fafafa);
            color: var(--primary-text-color, #212121); overflow: hidden; font-family: var(--paper-font-body1_-_font-family, Roboto, sans-serif); }
    .top { flex: none; display: flex; align-items: center; gap: 8px; padding: 0 8px; min-height: 56px; background: var(--app-header-background-color, #03a9f4); color: var(--app-header-text-color, #fff); }
    .title { font-size: 20px; }
    main { flex: 1; min-height: 0; overflow: auto; padding: 16px; }
    .card { background: var(--card-background-color, #fff); border-radius: 12px; padding: 16px; box-shadow: var(--ha-card-box-shadow, 0 1px 3px rgba(0,0,0,.2)); margin-bottom: 12px; }
    .muted { color: var(--secondary-text-color, #727272); }
    table { border-collapse: collapse; width: 100%; } td, th { text-align: left; padding: 6px 8px; border-bottom: 1px solid var(--divider-color, #e0e0e0); }
  `;
  class PlansPanel extends HTMLElement {
    constructor() { super(); this._hass = null; this._narrow = false; this._built = false; this._title = 'Plans'; this.attachShadow({ mode: 'open' }); }
    set hass(hass) { this._hass = hass; if (!this._built) this._build(); if (this._menu) this._menu.hass = hass; }
    set narrow(value) { this._narrow = value; if (this._menu) this._menu.narrow = value; }
    set panel(p) { this._title = (p && p.config && p.config.title) || 'Plans'; if (this._titleEl) this._titleEl.textContent = this._title; }
    set route(_r) {}
    _build() {
      this._built = true;
      this.shadowRoot.innerHTML = `<style>${STYLE}</style>
        <div class="top"><ha-menu-button></ha-menu-button><span class="title" id="title">${this._title}</span></div>
        <main id="main"><div class="card muted">Chargement des plans…</div></main>`;
      this._menu = this.shadowRoot.querySelector('ha-menu-button'); this._menu.hass = this._hass; this._menu.narrow = this._narrow;
      this._titleEl = this.shadowRoot.getElementById('title');
      this._load();
    }
    async _load() {
      const main = this.shadowRoot.getElementById('main');
      try {
        const res = await this._hass.callWS({ type: 'dimotic_plans/floorplans/list' });
        if (!res.floorplans.length) {
          main.innerHTML = '<div class="card"><b>Aucun plan pour le moment.</b><p class="muted">L\'import des plans de dimotic-ha et l\'éditeur arrivent dans les prochaines versions.</p></div>';
          return;
        }
        const rows = res.floorplans.map((p) => `<tr><td>${p.id}</td><td>${p.filename}</td><td>${p.positions}</td><td>${p.texts}</td></tr>`).join('');
        main.innerHTML = `<div class="card"><table><tr><th>Plan</th><th>Image</th><th>Objets</th><th>Textes</th></tr>${rows}</table></div>`;
      } catch (err) {
        main.innerHTML = `<div class="card"><b>Erreur</b><p class="muted">${(err && err.message) || err}</p></div>`;
      }
    }
  }
  if (!customElements.get('dimotic-plans-panel')) customElements.define('dimotic-plans-panel', PlansPanel);
})();
