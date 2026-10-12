/* Plans — panneau personnalisé (Dimotic-HA Plans). v0.0.3 : un onglet par plan, objets placés sur l'image
 * (icône et couleur selon l'état, valeur des capteurs, mise à jour en direct), clic = fiche de l'entité (more-info).
 * La commande directe des objets et l'éditeur viennent ensuite (voir README). */
(() => {
  const STYLE = `
    :host { display: flex; flex-direction: column; height: 100vh; height: 100dvh; background: var(--primary-background-color, #fafafa);
            color: var(--primary-text-color, #212121); overflow: hidden; font-family: var(--paper-font-body1_-_font-family, Roboto, sans-serif); }
    .top { flex: none; display: flex; align-items: center; gap: 8px; padding: 0 8px; min-height: 56px; background: var(--app-header-background-color, #03a9f4); color: var(--app-header-text-color, #fff); }
    .title { font-size: 20px; }
    .tabs { flex: none; display: flex; gap: 8px; padding: 8px 16px 0; overflow-x: auto; }
    .tab { border: 1px solid var(--divider-color, #ccc); background: var(--card-background-color, #fff); color: inherit; border-radius: 16px; padding: 6px 14px; cursor: pointer; white-space: nowrap; font: inherit; }
    .tab.on { background: var(--primary-color, #03a9f4); border-color: var(--primary-color, #03a9f4); color: var(--text-primary-color, #fff); }
    main { flex: 1; min-height: 0; overflow: auto; padding: 12px 16px 16px; display: flex; flex-direction: column; align-items: center; }
    .card { background: var(--card-background-color, #fff); border-radius: 12px; padding: 16px; box-shadow: var(--ha-card-box-shadow, 0 1px 3px rgba(0,0,0,.2)); }
    .muted { color: var(--secondary-text-color, #727272); }
    .warn { color: var(--warning-color, #ff9800); }
    .plan { position: relative; background: #fff; border-radius: 12px; box-shadow: var(--ha-card-box-shadow, 0 1px 3px rgba(0,0,0,.2)); line-height: 0; }
    .plan img { display: block; width: 100%; height: 100%; border-radius: 12px; }
    .obj { position: absolute; transform: translate(-50%, -50%); display: flex; flex-direction: column; align-items: center; cursor: pointer;
           line-height: 1.1; -webkit-tap-highlight-color: transparent; user-select: none; }
    .obj .ico { width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center;
                background: rgba(255,255,255,.92); border: 2px solid #9e9e9e; color: #616161; box-shadow: 0 1px 3px rgba(0,0,0,.35); }
    .obj.on .ico { border-color: #ffa000; color: #ffa000; background: #fff8e1; }
    .obj.unav .ico { border-style: dashed; opacity: .5; }
    .obj.orphan .ico { border-color: var(--error-color, #db4437); color: var(--error-color, #db4437); }
    .obj ha-state-icon, .obj ha-icon { --mdc-icon-size: 22px; }
    .obj .val { margin-top: 2px; padding: 1px 5px; border-radius: 8px; background: rgba(255,255,255,.92); color: #212121; font-size: 12px; font-weight: 500;
                box-shadow: 0 1px 2px rgba(0,0,0,.3); white-space: nowrap; }
    .txt { position: absolute; transform: translate(-50%, -50%); line-height: 1.1; white-space: nowrap; pointer-events: none; font-weight: 500; }
    .foot { margin-top: 8px; font-size: 13px; }
  `;
  const TEXT_PX = { small: 14, medium: 20, large: 28 };
  const ON_STATES = new Set(['on', 'open', 'opening', 'closing', 'heat', 'cool', 'heat_cool', 'auto', 'dry', 'fan_only', 'playing', 'home', 'unlocked']);
  const VALUE_DOMAINS = new Set(['sensor', 'number', 'input_number']);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  class PlansPanel extends HTMLElement {
    constructor() {
      super(); this._hass = null; this._narrow = false; this._built = false; this._title = 'Plans';
      this._plans = []; this._current = null; this._detail = null; this._src = ''; this._objs = [];
      this.attachShadow({ mode: 'open' });
      this._ro = new ResizeObserver(() => this._fit());
    }
    set hass(hass) { this._hass = hass; if (!this._built) this._build(); if (this._menu) this._menu.hass = hass; this._refresh(); }
    set narrow(value) { this._narrow = value; if (this._menu) this._menu.narrow = value; }
    set panel(p) { this._title = (p && p.config && p.config.title) || 'Plans'; if (this._titleEl) this._titleEl.textContent = this._title; }
    set route(_r) {}
    disconnectedCallback() { this._ro.disconnect(); }
    connectedCallback() { const m = this.shadowRoot.getElementById('main'); if (m) this._ro.observe(m); }

    _build() {
      this._built = true;
      this.shadowRoot.innerHTML = `<style>${STYLE}</style>
        <div class="top"><ha-menu-button></ha-menu-button><span class="title" id="title">${esc(this._title)}</span></div>
        <div class="tabs" id="tabs"></div>
        <main id="main"><div class="card muted">Chargement des plans…</div></main>`;
      this._menu = this.shadowRoot.querySelector('ha-menu-button'); this._menu.hass = this._hass; this._menu.narrow = this._narrow;
      this._titleEl = this.shadowRoot.getElementById('title');
      this._ro.observe(this.shadowRoot.getElementById('main'));
      this._loadList();
    }

    _error(err) {
      this.shadowRoot.getElementById('main').innerHTML = `<div class="card"><b>Erreur</b><p class="muted">${esc((err && err.message) || err)}</p></div>`;
    }

    async _loadList() {
      try {
        const res = await this._hass.callWS({ type: 'dimotic_plans/floorplans/list' });
        this._plans = res.floorplans;
        if (!this._plans.length) {
          this.shadowRoot.getElementById('main').innerHTML = '<div class="card"><b>Aucun plan pour le moment.</b><p class="muted">L\'éditeur arrive dans une prochaine version.</p></div>';
          return;
        }
        let saved = null; try { saved = localStorage.getItem('dimotic_plans.current'); } catch (_e) { /* stockage indisponible */ }
        this._renderTabs();
        this._show(this._plans.some((p) => p.id === saved) ? saved : this._plans[0].id);
      } catch (err) { this._error(err); }
    }

    _renderTabs() {
      const tabs = this.shadowRoot.getElementById('tabs');
      tabs.style.display = this._plans.length > 1 ? '' : 'none';
      tabs.innerHTML = this._plans.map((p) => `<button class="tab${p.id === this._current ? ' on' : ''}" data-id="${esc(p.id)}">${esc(p.id)}</button>`).join('');
      tabs.querySelectorAll('.tab').forEach((b) => b.addEventListener('click', () => this._show(b.dataset.id)));
    }

    async _show(id) {
      this._current = id; this._renderTabs();
      try { localStorage.setItem('dimotic_plans.current', id); } catch (_e) { /* stockage indisponible */ }
      const main = this.shadowRoot.getElementById('main');
      try {
        const detail = await this._hass.callWS({ type: 'dimotic_plans/floorplans/get', id });
        let src = '';
        try { src = (await this._hass.callWS({ type: 'auth/sign_path', path: '/api/dimotic_plans/image/' + encodeURIComponent(detail.filename) })).path; } catch (_e) { /* image absente */ }
        if (this._current !== id) return;
        this._detail = detail;
        const orphans = detail.positions.filter((p) => p.orphan).length;
        main.innerHTML = `<div class="plan" id="plan">${src ? `<img id="img" src="${src}" alt="${esc(id)}">` : ''}</div>
          <div class="foot muted">${detail.positions.length} objet(s)${orphans ? ` · <span class="warn">${orphans} orphelin(s)</span>` : ''}</div>`;
        const plan = main.querySelector('#plan');
        const img = main.querySelector('#img');
        if (img) img.addEventListener('load', () => this._fit());
        else { plan.style.width = '600px'; plan.style.height = '400px'; }
        for (const t of detail.texts || []) {
          const el = document.createElement('div');
          el.className = 'txt'; el.textContent = t.text;
          const light = /^#?(f{3}|f{6})$/i.test(String(t.color || '').trim());
          el.style.cssText = `left:${t.x * 100}%;top:${t.y * 100}%;font-size:${TEXT_PX[t.size] || 20}px;color:${light ? '#212121' : (t.color || '#212121')}`;
          plan.appendChild(el);
        }
        this._objs = detail.positions.map((p) => {
          const el = document.createElement('div');
          el.className = 'obj'; el.style.left = `${p.x * 100}%`; el.style.top = `${p.y * 100}%`;
          el.innerHTML = '<div class="ico"></div><div class="val" hidden></div>';
          el.addEventListener('click', () => this.dispatchEvent(new CustomEvent('hass-more-info', { detail: { entityId: p.entity_id }, bubbles: true, composed: true })));
          plan.appendChild(el);
          return { p, el, ico: el.firstChild, val: el.lastChild, last: undefined };
        });
        this._refresh();
      } catch (err) { this._error(err); }
    }

    /* Plus grande taille de l'image qui tient dans la zone, proportions gardées. */
    _fit() {
      const main = this.shadowRoot.getElementById('main');
      const img = this.shadowRoot.getElementById('img');
      const plan = this.shadowRoot.getElementById('plan');
      if (!img || !plan || !img.naturalWidth) return;
      const w = main.clientWidth - 32, h = main.clientHeight - 48;
      const r = Math.min(w / img.naturalWidth, h / img.naturalHeight);
      plan.style.width = `${Math.max(1, Math.floor(img.naturalWidth * r))}px`;
      plan.style.height = `${Math.max(1, Math.floor(img.naturalHeight * r))}px`;
    }

    _refresh() {
      if (!this._hass || !this._objs.length) return;
      for (const o of this._objs) {
        const st = this._hass.states[o.p.entity_id];
        if (st === o.last && o.ico.firstChild) continue;
        o.last = st;
        const domain = o.p.entity_id.split('.')[0];
        const name = st ? (st.attributes.friendly_name || o.p.entity_id) : o.p.entity_id;
        o.el.className = 'obj' + (!st ? ' orphan' : st.state === 'unavailable' || st.state === 'unknown' ? ' unav' : ON_STATES.has(st.state) ? ' on' : '');
        let icon = o.ico.firstChild;
        if (st) {
          if (!icon || icon.localName !== 'ha-state-icon') { o.ico.innerHTML = ''; icon = document.createElement('ha-state-icon'); o.ico.appendChild(icon); }
          icon.hass = this._hass; icon.stateObj = st;
        } else if (!icon || icon.localName !== 'ha-icon') {
          o.ico.innerHTML = '<ha-icon icon="mdi:help-circle-outline"></ha-icon>';
        }
        let val = '';
        if (st && VALUE_DOMAINS.has(domain) && st.state !== 'unavailable' && st.state !== 'unknown') {
          const n = Number(st.state);
          const unit = st.attributes.unit_of_measurement || '';
          val = Number.isFinite(n) ? `${Math.round(n * 10) / 10}${unit ? ' ' + unit : ''}` : st.state;
        } else if (st && domain === 'climate' && st.attributes.current_temperature != null) {
          val = `${st.attributes.current_temperature}°`;
        } else if (st && domain === 'cover' && st.attributes.current_position != null) {
          val = `${st.attributes.current_position} %`;
        }
        o.val.hidden = !val; o.val.textContent = val;
        o.el.title = st ? `${name} : ${this._hass.formatEntityState ? this._hass.formatEntityState(st) : st.state}` : `${o.p.entity_id} (introuvable)`;
      }
    }
  }
  if (!customElements.get('dimotic-plans-panel')) customElements.define('dimotic-plans-panel', PlansPanel);
})();
