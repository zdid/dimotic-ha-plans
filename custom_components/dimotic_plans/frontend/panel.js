/* Plans — panneau personnalisé (Dimotic-HA Plans). v0.0.2 : affiche le titre réglable et les plans stockés dans HA
 * (image + nombre d'objets, dont orphelins). L'affichage des plans, la commande des objets et l'éditeur viennent ensuite (voir README). */
(() => {
  const STYLE = `
    :host { display: flex; flex-direction: column; height: 100vh; height: 100dvh; background: var(--primary-background-color, #fafafa);
            color: var(--primary-text-color, #212121); overflow: hidden; font-family: var(--paper-font-body1_-_font-family, Roboto, sans-serif); }
    .top { flex: none; display: flex; align-items: center; gap: 8px; padding: 0 8px; min-height: 56px; background: var(--app-header-background-color, #03a9f4); color: var(--app-header-text-color, #fff); }
    .title { font-size: 20px; }
    main { flex: 1; min-height: 0; overflow: auto; padding: 16px; }
    .card { background: var(--card-background-color, #fff); border-radius: 12px; padding: 16px; box-shadow: var(--ha-card-box-shadow, 0 1px 3px rgba(0,0,0,.2)); margin-bottom: 12px; }
    .muted { color: var(--secondary-text-color, #727272); }
    h3 { margin: 0 0 8px; } img { max-width: 100%; max-height: 60vh; display: block; border-radius: 8px; background: #fff; }
    .warn { color: var(--warning-color, #ff9800); }
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
        const cards = await Promise.all(res.floorplans.map(async (p) => {
          let src = '';
          try { src = (await this._hass.callWS({ type: 'auth/sign_path', path: '/api/dimotic_plans/image/' + encodeURIComponent(p.filename) })).path; } catch (_e) { /* image absente */ }
          const orph = p.orphans ? ` · <span class="warn">${p.orphans} orpheline(s)</span>` : '';
          return `<div class="card"><h3>${p.id}</h3>${src ? `<img src="${src}" alt="${p.id}">` : ''}<p class="muted">${p.positions} objet(s)${orph} · ${p.texts} texte(s) · ${p.filename}</p></div>`;
        }));
        main.innerHTML = cards.join('');
      } catch (err) {
        main.innerHTML = `<div class="card"><b>Erreur</b><p class="muted">${(err && err.message) || err}</p></div>`;
      }
    }
  }
  if (!customElements.get('dimotic-plans-panel')) customElements.define('dimotic-plans-panel', PlansPanel);
})();
