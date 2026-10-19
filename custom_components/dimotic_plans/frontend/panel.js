/* Plans — panneau personnalisé (Dimotic-HA Plans). v0.1.6
 * Affichage : un onglet par plan, objets placés sur l'image (icône seule, colorée selon son type et son état — palette COLORS ; valeur des capteurs à
 * droite de l'icône ; mise à jour en direct). Point d'ancrage d'un objet = coin inférieur gauche de son icône ; d'un
 * texte = coin inférieur gauche du texte (alignements faciles).
 * Clic : bascule marche/arrêt des objets tout-ou-rien (lumière, prise, ventilateur, booléen), fiche de l'entité pour les
 * autres ; appui long ou clic droit : fiche de l'entité.
 * Éditeur (administrateurs) : déplacer (glisser, flèches du clavier), magnétisme sur les autres éléments puis sur une grille
 * invisible (pas en % de l'image, réglable, affichable), ajouter/retirer
 * objets et textes, créer/renommer/supprimer un plan, changer son image. */
(() => {
  const STYLE = `
    :host { display: flex; flex-direction: column; height: 100vh; height: 100dvh; background: var(--primary-background-color, #fafafa);
            color: var(--primary-text-color, #212121); overflow: hidden; font-family: var(--paper-font-body1_-_font-family, Roboto, sans-serif); }
    .top { flex: none; display: flex; align-items: center; gap: 8px; padding: 0 8px; min-height: 56px; background: var(--app-header-background-color, #03a9f4); color: var(--app-header-text-color, #fff); }
    .title { font-size: 20px; flex: 0 1 auto; max-width: 30%; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .top button { display: inline-flex; align-items: center; gap: 4px; border: 1px solid rgba(255,255,255,.6); background: transparent; color: inherit;
                  border-radius: 18px; padding: 6px 12px; font: inherit; cursor: pointer; }
    .top button.main { background: #fff; color: var(--primary-color, #03a9f4); border-color: #fff; font-weight: 500; }
    .top button[disabled] { opacity: .5; cursor: default; }
    .tabs { flex: 1 1 0; min-width: 0; display: flex; gap: 6px; padding: 0; }
    .plansel { max-width: 100%; font: inherit; font-size: 15px; padding: 5px 8px; border-radius: 16px; border: 1px solid rgba(255,255,255,.6); background: rgba(255,255,255,.15); color: inherit; }
    .plansel option { color: #212121; background: #fff; }
    .plansel[disabled] { opacity: .6; }
    .tools { flex: none; display: flex; flex-wrap: wrap; gap: 6px; padding: 8px 16px 0; align-items: center; }
    .tools button { display: inline-flex; align-items: center; gap: 4px; border: 1px solid var(--divider-color, #ccc); background: var(--card-background-color, #fff);
                    color: inherit; border-radius: 8px; padding: 5px 10px; font: inherit; font-size: 14px; cursor: pointer; }
    .tools button.danger { color: var(--error-color, #db4437); }
    .tools button[disabled] { opacity: .45; cursor: default; }
    .tools .sep { width: 1px; align-self: stretch; background: var(--divider-color, #ccc); margin: 0 4px; }
    .tools ha-icon { --mdc-icon-size: 18px; }
    .ecrans { position: relative; flex: none; }
    .ecrans .pop { position: absolute; right: 0; top: calc(100% + 8px); z-index: 30; min-width: min(340px, 86vw); max-width: 90vw; background: var(--card-background-color, #fff); color: var(--primary-text-color, #212121);
                   border-radius: 10px; box-shadow: 0 4px 16px rgba(0,0,0,.35); padding: 8px 14px; }
    .ecrans .pop[hidden] { display: none; }
    .ecrans .pop select { width: 100%; font: inherit; padding: 6px; border-radius: 8px; border: 1px solid var(--divider-color, #ccc); background: var(--primary-background-color, #fff); color: inherit; }
    .ecranetat { font-size: 13px; margin: 8px 0; word-break: break-word; }
    .ecrans .pop button { border: 1px solid var(--divider-color, #ccc); background: transparent; color: var(--primary-color, #03a9f4); border-radius: 8px; padding: 4px 10px; font: inherit; cursor: pointer; display: inline-flex; align-items: center; gap: 4px; }
    @media (max-width: 600px) { .title { display: none; } }
    /* Thème sombre : l'image est inversée (teintes conservées), les icônes et valeurs suivent. */
    .plan.dark { background: #1b1b1b; }
    .plan.dark img { filter: invert(1) hue-rotate(180deg); }
    .plan.dark .obj .ico { filter: drop-shadow(0 0 1px #000) drop-shadow(0 0 1px #000); }
    .plan.dark .obj.on .ico { filter: drop-shadow(0 0 1px #000) drop-shadow(0 0 4px var(--obj-color, #ffb300)); }
    .plan.dark .obj .val { background: rgba(32,32,32,.88); color: #eee; }
    .top button.theme, .top button.refresh { padding: 4px 8px; }
    .tools .hint { font-size: 13px; color: var(--secondary-text-color, #727272); }
    main { flex: 1; min-height: 0; overflow: auto; padding: 12px 16px 16px; display: flex; flex-direction: column; align-items: center; }
    .card { background: var(--card-background-color, #fff); border-radius: 12px; padding: 16px; box-shadow: var(--ha-card-box-shadow, 0 1px 3px rgba(0,0,0,.2)); }
    .muted { color: var(--secondary-text-color, #727272); }
    .warn { color: var(--warning-color, #ff9800); }
    .plan { position: relative; background: #fff; border-radius: 12px; box-shadow: var(--ha-card-box-shadow, 0 1px 3px rgba(0,0,0,.2)); line-height: 0; touch-action: manipulation; margin-top: auto; }
    .plan.edit { outline: 2px dashed var(--primary-color, #03a9f4); outline-offset: 4px; }
    .plan img { display: block; width: 100%; height: 100%; border-radius: 12px; pointer-events: none; user-select: none; }
    .obj { position: absolute; transform: translateY(-100%); display: flex; flex-direction: row; align-items: center; gap: 2px; cursor: pointer;
           line-height: 1.1; -webkit-tap-highlight-color: transparent; user-select: none; }
    .obj .ico { box-sizing: border-box; flex: none; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center;
                color: var(--obj-color, #546e7a); filter: drop-shadow(0 0 1px #fff) drop-shadow(0 0 1px #fff); }
    .obj.on .ico { filter: drop-shadow(0 0 1px #fff) drop-shadow(0 0 4px var(--obj-color, #ffb300)); }
    .obj.unav .ico { opacity: .35; }
    .obj.orphan .ico { color: var(--error-color, #db4437); }
    .obj.busy .ico { animation: busy 0.8s ease-in-out infinite; }
    @keyframes busy { 50% { transform: scale(0.8); opacity: 0.5; } }
    .obj ha-state-icon, .obj ha-icon { --mdc-icon-size: 26px; }
    .obj .val { padding: 0 4px; border-radius: 6px; background: rgba(255,255,255,.85); color: #212121; font-size: 12px; font-weight: 500; white-space: pre; }
    .txt { position: absolute; transform: translateY(-100%); line-height: 1.1; white-space: nowrap; pointer-events: none; font-weight: 500; user-select: none; }
    .edit .obj, .edit .txt { cursor: move; pointer-events: auto; touch-action: none; }
    .edit .obj.sel .ico, .edit .txt.sel { outline: 2px solid var(--primary-color, #03a9f4); outline-offset: 1px; border-radius: 4px; }
    .edit .obj::after, .edit .txt::after { content: ''; position: absolute; left: -3px; bottom: -3px; width: 6px; height: 6px; border-radius: 50%; background: var(--primary-color, #03a9f4); }
    .guide { position: absolute; background: #e91e63; pointer-events: none; display: none; z-index: 5; }
    .guide.v { top: 0; bottom: 0; width: 1px; } .guide.h { left: 0; right: 0; height: 1px; }
    .gridlines { position: absolute; inset: 0; pointer-events: none; border-radius: 12px; }
    .tools select { font: inherit; font-size: 14px; padding: 4px; border-radius: 8px; border: 1px solid var(--divider-color, #ccc); background: var(--card-background-color, #fff); color: inherit; }
    .tools label { display: inline-flex; align-items: center; gap: 4px; font-size: 14px; }
    .foot { margin-top: 8px; margin-bottom: auto; font-size: 13px; }
    .overlay { position: fixed; inset: 0; background: rgba(0,0,0,.45); display: flex; align-items: center; justify-content: center; z-index: 10; padding: 16px; }
    .dialog { background: var(--card-background-color, #fff); color: var(--primary-text-color, #212121); border-radius: 12px; padding: 20px; width: min(460px, 100%);
              max-height: 90vh; display: flex; flex-direction: column; gap: 12px; box-shadow: 0 8px 30px rgba(0,0,0,.35); box-sizing: border-box; }
    .dialog h2 { margin: 0; font-size: 20px; font-weight: 500; }
    .dialog label { display: flex; flex-direction: column; gap: 4px; font-size: 14px; }
    .dialog input[type=text], .dialog input[type=search], .dialog select { font: inherit; padding: 8px; border-radius: 6px; border: 1px solid var(--divider-color, #ccc);
              background: var(--primary-background-color, #fff); color: inherit; }
    .dialog .row { display: flex; gap: 12px; } .dialog .row > * { flex: 1 1 0; min-width: 0; }
    .dialog input[type=text], .dialog input[type=search], .dialog select { width: 100%; min-width: 0; max-width: 100%; box-sizing: border-box; text-overflow: ellipsis; }
    .dialog label.check { flex-direction: row; align-items: flex-start; gap: 6px; }
    .dialog .btns { display: flex; justify-content: flex-end; gap: 8px; margin-top: 4px; }
    .dialog .btns button { font: inherit; border: none; border-radius: 6px; padding: 8px 14px; cursor: pointer; background: transparent; color: var(--primary-color, #03a9f4); }
    .dialog .btns button.ok { background: var(--primary-color, #03a9f4); color: var(--text-primary-color, #fff); }
    .dialog .btns button.ok.danger { background: var(--error-color, #db4437); }
    .dialog .err { color: var(--error-color, #db4437); font-size: 14px; min-height: 1em; }
    .pick { overflow: auto; min-height: 120px; max-height: 50vh; border: 1px solid var(--divider-color, #ccc); border-radius: 6px; }
    .pick div { display: flex; align-items: center; gap: 10px; padding: 6px 10px; cursor: pointer; line-height: 1.2; }
    .pick div:hover { background: var(--secondary-background-color, #f0f0f0); }
    .pick span { min-width: 0; overflow-wrap: anywhere; } .pick ha-state-icon { flex: none; }
    .pick { overflow-x: hidden; }
    .pick small { display: block; color: var(--secondary-text-color, #727272); font-size: 12px; }
  `;
  const TEXT_PX = { small: 14, medium: 20, large: 28 };
  const ON_STATES = new Set(['on', 'open', 'opening', 'closing', 'heat', 'cool', 'heat_cool', 'auto', 'dry', 'fan_only', 'playing', 'home', 'unlocked']);
  const TOGGLE_DOMAINS = new Set(['light', 'switch', 'fan', 'input_boolean']);
  const VALUE_DOMAINS = new Set(['sensor', 'number', 'input_number']);
  const LONG_PRESS_MS = 500;
  /* Couleurs par type d'objet : [allumé/actif, éteint/repos]. Variables de couleur d'état de HA quand elles existent. */
  const COLORS = {
    light: ['var(--state-light-active-color, #ffb300)', '#607d8b'],
    switch: ['var(--state-switch-active-color, #43a047)', '#78909c'],
    input_boolean: ['#43a047', '#78909c'],
    fan: ['var(--state-fan-active-color, #00acc1)', '#78909c'],
    climate: ['var(--state-climate-heat-color, #ff5722)', '#5c6bc0'],
    water_heater: ['#ff7043', '#78909c'],
    cover: ['var(--state-cover-active-color, #8e24aa)', '#5e35b1'],
    lock: ['#e53935', '#43a047'],
    media_player: ['#1e88e5', '#78909c'],
    binary_sensor: ['#e53935', '#26a69a'],
  };
  const SENSOR_COLORS = {
    temperature: '#e53935', humidity: '#1e88e5', moisture: '#1e88e5', pressure: '#6d4c41', atmospheric_pressure: '#6d4c41',
    power: '#f9a825', apparent_power: '#f9a825', energy: '#fb8c00', current: '#fdd835', voltage: '#7cb342',
    battery: '#43a047', illuminance: '#fbc02d', carbon_dioxide: '#8d6e63', pm25: '#8d6e63', signal_strength: '#90a4ae',
  };
  /* Sous-types de switch que HA ne distingue pas (portage de SwitchTypeDetector de HAPLAN) : par mots-clés de l'entity_id,
     sinon de la taxonomie `attributs_taxonomie.quoi`. Icône + couleurs [allumé, éteint]. */
  const SWITCH_KINDS = [
    [/ventilation|vmc|fan/, 'mdi:fan', '#FFEB3B', '#90a4ae'],
    [/water_heater|chauffe_eau|ballon/, 'mdi:water-boiler', '#FF9800', '#2196F3'],
    [/radiateur|radiator|heating|chauffage/, 'mdi:radiator', '#F44336', '#2196F3'],
  ];
  const switchKind = (st, domain) => {
    if (domain !== 'switch' || !st) return null;
    const quoi = ((st.attributes.attributs_taxonomie || {}).quoi || '').toLowerCase();
    for (const text of [st.entity_id.toLowerCase(), quoi]) {
      const k = SWITCH_KINDS.find((x) => x[0].test(text));
      if (k) return { icon: k[1], on: k[2], off: k[3] };
    }
    return null;
  };
  const colorFor = (st, domain) => {
    const kind = switchKind(st, domain);
    if (kind) return ON_STATES.has(st.state) ? kind.on : kind.off;
    if (domain === 'sensor' || domain === 'number' || domain === 'input_number') return SENSOR_COLORS[st.attributes.device_class] || '#00897b';
    const c = COLORS[domain];
    if (!c) return '#00897b';
    return ON_STATES.has(st.state) ? c[0] : c[1];
  };
  const SNAP_PX = 6;
  const MAX_UPLOAD = 3 * 1024 * 1024;
  const GRID_STEPS = { 0: 'aucune', 0.5: '0,5 %', 1: '1 %', 2: '2 %' };
  const pref = (key, fallback) => { try { const v = localStorage.getItem('dimotic_plans.' + key); return v === null ? fallback : JSON.parse(v); } catch (_e) { return fallback; } };
  const setPref = (key, value) => { try { localStorage.setItem('dimotic_plans.' + key, JSON.stringify(value)); } catch (_e) { /* stockage indisponible */ } };
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const clamp = (v) => Math.min(1, Math.max(0, v));
  const fileToBase64 = (file) => new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(',')[1] || '');
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });

  class PlansPanel extends HTMLElement {
    constructor() {
      super(); this._hass = null; this._narrow = false; this._built = false; this._title = 'Plans';
      this._plans = []; this._current = null; this._detail = null; this._src = ''; this._objs = []; this._texts = [];
      this._edit = false; this._draft = null; this._dirty = false; this._sel = null;
      this._grid = pref('grid', 1); this._showGrid = pref('showGrid', false);
      this.attachShadow({ mode: 'open' });
      this._ro = new ResizeObserver(() => this._fit());
      this._onKey = (e) => this._key(e);
    }
    set hass(hass) {
      const first = !this._hass; const wasDark = this._built ? this._dark : null; this._hass = hass;
      if (!this._built) this._build();
      if (this._menu) this._menu.hass = hass;
      if (first) this._renderActions();
      this._startEcrans();
      if (wasDark !== null && wasDark !== this._dark) this._applyTheme();
      this._refresh();
    }
    set narrow(value) { this._narrow = value; if (this._menu) this._menu.narrow = value; }
    set panel(p) { this._title = (p && p.config && p.config.title) || 'Plans'; this._site = String((p && p.config && p.config.site) || '').trim().toLowerCase(); if (this._titleEl) this._titleEl.textContent = this._title; }
    set route(_r) {}
    connectedCallback() { const m = this.shadowRoot.getElementById('main'); if (m) this._ro.observe(m); window.addEventListener('keydown', this._onKey); }
    disconnectedCallback() {
      this._ro.disconnect(); window.removeEventListener('keydown', this._onKey);
      (this._unsubs || []).forEach((u) => { try { u(); } catch (_e) { /* déjà fermé */ } });
      this._unsubs = []; this._ecransStarted = false;
    }
    /* Thème du plan : « auto » suit le thème de HA, sinon choix fixé (mémorisé dans ce navigateur). */
    get _themeMode() { const m = pref('theme', 'auto'); return m === 'clair' || m === 'sombre' ? m : 'auto'; }
    get _dark() { const m = this._themeMode; return m === 'sombre' || (m === 'auto' && !!(this._hass && this._hass.themes && this._hass.themes.darkMode)); }
    _applyTheme() {
      const plan = this.shadowRoot.getElementById('plan');
      if (plan) plan.classList.toggle('dark', this._dark);
      (this._texts || []).forEach((o) => { try { this._styleText(o); } catch (_e) { /* texte supprimé */ } });
    }
    /* Bouton Rafraîchir : redimensionne le plan et reconstruit les valeurs. En édition avec des changements non enregistrés, on ne recharge pas (ils seraient perdus) : on repositionne seulement. */
    _rafraichir() {
      if (this._edit && this._dirty) { this._fit(); this._renderPlan(); return; }
      if (this._current) this._show(this._current); else this._fit();
    }
    _cycleTheme() { setPref('theme', { auto: 'clair', clair: 'sombre', sombre: 'auto' }[this._themeMode]); this._renderActions(); this._applyTheme(); }
    get _admin() { return !!(this._hass && this._hass.user && this._hass.user.is_admin); }

    _build() {
      this._built = true;
      this.shadowRoot.innerHTML = `<style>${STYLE}</style>
        <div class="top"><ha-menu-button></ha-menu-button><span class="title" id="title">${esc(this._title)}</span><div class="tabs" id="tabs"></div><div class="ecrans" id="ecrans" hidden></div><span id="actions"></span></div>
        <div class="tools" id="tools" hidden></div>
        <main id="main"><div class="card muted">Chargement des plans…</div></main>`;
      this._menu = this.shadowRoot.querySelector('ha-menu-button'); this._menu.hass = this._hass; this._menu.narrow = this._narrow;
      this._titleEl = this.shadowRoot.getElementById('title');
      this._ro.observe(this.shadowRoot.getElementById('main'));
      this._bindSwipe(this.shadowRoot.getElementById('main'));
      this._loadList();
    }

    /* ---------- Écrans ESP : bouton « Générer » (assembleur dimotic-ha) ---------- */

    async _startEcrans() {
      if (this._ecransStarted || !this._hass || !this._built || !this._site || !this._admin) return;
      this._ecransStarted = true; this._appareils = []; this._etats = {}; this._unsubs = this._unsubs || [];
      const sub = async (topic, cb) => {
        try { this._unsubs.push(await this._hass.connection.subscribeMessage(cb, { type: 'mqtt/subscribe', topic })); }
        catch (_e) { this._ecransErr = 'MQTT de HA indisponible'; this._drawEcrans(); }
      };
      await sub(`dimotic/esps-assemble/${this._site}/appareils`, (m) => { try { this._appareils = JSON.parse(m.payload).appareils || []; } catch (_e) { /* message illisible */ } this._drawEcrans(); });
      await sub(`dimotic/esphome/${this._site}/status/+`, (m) => { const nom = String(m.topic).split('/').pop(); try { this._etats[nom] = m.payload ? JSON.parse(m.payload) : null; } catch (_e) { /* message illisible */ } this._drawEcrans(); });
    }

    _drawEcrans() {
      const box = this.shadowRoot.getElementById('ecrans');
      if (!box) return;
      const liste = (this._appareils || []).filter((a) => a.pagesDePlans);
      box.hidden = !liste.length && !this._ecransErr;
      if (box.hidden) return;
      const ETATS = { en_attente: 'en attente', recuperation: 'récupération', reconnaissance: 'reconnaissance', compilation: 'compilation…', pret_a_poser: 'firmware prêt', envoi: 'envoi à l\'écran', verification: 'vérification', termine: 'terminé', echec: 'échec' };
      if (!liste.some((a) => a.nom === this._ecranSel)) this._ecranSel = liste.length ? liste[0].nom : null;
      const sel = liste.find((a) => a.nom === this._ecranSel);
      const st = sel ? this._etats[sel.nom] : null;
      const etatTxt = sel ? (st ? esc(ETATS[st.etat] || st.etat) + (st.detail ? ' — ' + esc(String(st.detail).slice(-80)) : '') : 'aucun état') : '';
      box.innerHTML = `<button id="ecransbtn" title="Générer les pages de plans des écrans ESP (${liste.length} écran(s))"><ha-icon icon="mdi:monitor-dashboard" style="--mdc-icon-size:18px"></ha-icon>${liste.length}</button><div class="pop" id="ecranspop"${this._ecransOpen ? '' : ' hidden'}>${this._ecransErr ? `<p class="muted">${esc(this._ecransErr)}</p>` : ''}
        ${sel ? `<select id="ecransel">${liste.map((a) => `<option value="${esc(a.nom)}"${a.nom === sel.nom ? ' selected' : ''}>${esc(a.nomAffichage || a.nom)}</option>`).join('')}</select>
        <div class="muted ecranetat">${etatTxt}</div>
        <button data-gen="${esc(sel.nom)}"><ha-icon icon="mdi:cog-play" style="--mdc-icon-size:18px"></ha-icon>Générer</button>` : ''}</div>`;
      const cb = box.querySelector('#ecransel');
      if (cb) cb.addEventListener('change', () => { this._ecranSel = cb.value; this._drawEcrans(); });
      box.querySelector('#ecransbtn').addEventListener('click', (e) => { e.stopPropagation(); this._ecransOpen = !this._ecransOpen; box.querySelector('#ecranspop').hidden = !this._ecransOpen; });
      if (!this._ecransClose) {
        this._ecransClose = (e) => { if (!this._ecransOpen) return; const bx = this.shadowRoot.getElementById('ecrans'); if (bx && !e.composedPath().includes(bx)) { this._ecransOpen = false; const pp = bx.querySelector('#ecranspop'); if (pp) pp.hidden = true; } };
        this.shadowRoot.addEventListener('click', this._ecransClose);
      }
      box.querySelectorAll('button[data-gen]').forEach((b) => b.addEventListener('click', async () => {
        b.disabled = true;
        try { await this._hass.callWS({ type: 'dimotic_plans/generate', device: b.dataset.gen }); this._toast('Génération demandée : ' + b.dataset.gen); }
        catch (err) { this._toast((err && err.message) || 'Échec de la demande'); }
        b.disabled = false;
      }));
    }

    _error(err) {
      this.shadowRoot.getElementById('main').innerHTML = `<div class="card"><b>Erreur</b><p class="muted">${esc((err && err.message) || err)}</p></div>`;
    }

    _toast(message) {
      this.dispatchEvent(new CustomEvent('hass-notification', { detail: { message }, bubbles: true, composed: true }));
    }

    async _loadList(wanted) {
      try {
        const res = await this._hass.callWS({ type: 'dimotic_plans/floorplans/list' });
        this._plans = res.floorplans;
        if (!this._plans.length) {
          this._current = null; this._detail = null; this._draft = null; this._objs = []; this._texts = [];
          this._renderTabs(); this._renderTools();
          this.shadowRoot.getElementById('main').innerHTML = `<div class="card"><b>Aucun plan pour le moment.</b>
            <p class="muted">${this._admin ? 'Passe en mode Modifier puis « Nouveau plan ».' : 'Un administrateur doit d\'abord créer un plan.'}</p></div>`;
          return;
        }
        let saved = wanted || null;
        if (!saved) { try { saved = localStorage.getItem('dimotic_plans.current'); } catch (_e) { /* stockage indisponible */ } }
        await this._show(this._plans.some((p) => p.id === saved) ? saved : this._plans[0].id);
      } catch (err) { this._error(err); }
    }

    /* ---------- Barre du haut, onglets, outils ---------- */

    _renderActions() {
      const box = this.shadowRoot.getElementById('actions');
      if (!box) return;
      const m = this._themeMode;
      const themeBtn = `<button class="theme" id="themebtn" title="Thème du plan : ${m} (cliquer pour changer)"><ha-icon icon="${m === 'sombre' ? 'mdi:weather-night' : m === 'clair' ? 'mdi:white-balance-sunny' : 'mdi:theme-light-dark'}" style="--mdc-icon-size:18px"></ha-icon></button> `;
      const refreshBtn = '<button class="refresh" id="refreshbtn" title="Rafraîchir : recharge le plan et repositionne les valeurs"><ha-icon icon="mdi:refresh" style="--mdc-icon-size:18px"></ha-icon></button> ';
      const onTheme = () => {
        const b = box.querySelector('#themebtn'); if (b) b.addEventListener('click', () => this._cycleTheme());
        const r = box.querySelector('#refreshbtn'); if (r) r.addEventListener('click', () => this._rafraichir());
      };
      if (!this._admin) { box.innerHTML = refreshBtn + themeBtn; onTheme(); return; }
      box.innerHTML = refreshBtn + themeBtn + (!this._edit
        ? '<button id="editbtn"><ha-icon icon="mdi:pencil" style="--mdc-icon-size:18px"></ha-icon>Modifier</button>'
        : this._dirty
          ? '<button id="cancel">Annuler</button> <button class="main" id="save">Enregistrer</button>'
          : '<button class="main" id="done">Terminer</button>');
      onTheme();
      const on = (id, fn) => { const b = box.querySelector('#' + id); if (b) b.addEventListener('click', fn); };
      on('editbtn', () => this._enterEdit());
      on('cancel', () => this._cancelEdit());
      on('save', () => this._save());
      on('done', () => this._leaveEdit());
    }

    /* Téléphone : un balayage horizontal du doigt change de plan (le dernier ramène au premier et inversement). Inactif en édition. */
    _bindSwipe(main) {
      let x0 = null, y0 = 0, t0 = 0;
      main.addEventListener('touchstart', (e) => {
        if (e.touches.length !== 1 || this._edit) { x0 = null; return; }
        x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; t0 = Date.now();
      }, { passive: true });
      main.addEventListener('touchend', (e) => {
        if (x0 === null) return;
        const t = e.changedTouches[0]; const dx = t.clientX - x0, dy = t.clientY - y0; x0 = null;
        if (Math.abs(dx) < 60 || Math.abs(dx) < 1.5 * Math.abs(dy) || Date.now() - t0 > 800) return;
        this._swipedAt = Date.now(); this._nextPlan(dx < 0 ? 1 : -1);
      }, { passive: true });
      // Un balayage qui finit sur une icône ne doit pas la commander.
      main.addEventListener('click', (e) => { if (this._swipedAt && Date.now() - this._swipedAt < 400) { e.stopPropagation(); e.preventDefault(); } }, true);
    }

    _nextPlan(step) {
      const n = this._plans.length;
      if (n < 2 || (this._edit && this._dirty)) return;
      const i = Math.max(0, this._plans.findIndex((p) => p.id === this._current));
      this._show(this._plans[(i + step + n) % n].id);
    }

    _renderTabs() {
      const tabs = this.shadowRoot.getElementById('tabs');
      tabs.style.visibility = this._plans.length > 1 || this._edit ? '' : 'hidden';
      const lock = this._edit && this._dirty;
      tabs.innerHTML = `<select class="plansel" id="plansel" title="Plan affiché" ${lock ? 'disabled' : ''}>${this._plans.map((p) => `<option value="${esc(p.id)}"${p.id === this._current ? ' selected' : ''}>${esc(p.id)}</option>`).join('')}</select>`;
      const sel = tabs.querySelector('#plansel');
      sel.addEventListener('change', () => { if (!sel.disabled && sel.value !== this._current) this._show(sel.value); });
    }

    _renderTools() {
      const tools = this.shadowRoot.getElementById('tools');
      tools.hidden = !this._edit;
      if (!this._edit) { tools.innerHTML = ''; return; }
      const has = !!this._draft, d = this._dirty, sel = this._sel;
      const b = (id, icon, label, opts = {}) => `<button id="${id}" class="${opts.danger ? 'danger' : ''}" ${opts.off ? 'disabled' : ''} title="${esc(opts.title || '')}"><ha-icon icon="${icon}"></ha-icon>${label}</button>`;
      const planTitle = d ? 'Enregistre ou annule d\'abord les changements du plan' : '';
      tools.innerHTML = [
        b('addobj', 'mdi:plus-circle-outline', 'Objet', { off: !has }),
        b('addtxt', 'mdi:format-text', 'Texte', { off: !has }),
        sel ? '<span class="sep"></span>' : '',
        sel && sel.kind === 'txt' ? b('edittxt', 'mdi:pencil-outline', 'Modifier le texte') : '',
        sel && sel.kind === 'obj' ? b('info', 'mdi:information-outline', 'Fiche') : '',
        sel ? b('delsel', 'mdi:close-circle-outline', 'Retirer', { danger: true }) : '',
        '<span class="sep"></span>',
        b('newplan', 'mdi:file-plus-outline', 'Nouveau plan', { off: d, title: planTitle }),
        b('renplan', 'mdi:rename-outline', 'Renommer', { off: d || !has, title: planTitle }),
        b('imgplan', 'mdi:image-edit-outline', 'Image', { off: d || !has, title: planTitle }),
        b('delplan', 'mdi:delete-outline', 'Supprimer le plan', { off: d || !has, danger: true, title: planTitle }),
        '<span class="sep"></span>',
        `<label>Grille <select id="grid">${Object.entries(GRID_STEPS).map(([k, v]) => `<option value="${k}" ${Number(k) === this._grid ? 'selected' : ''}>${v}</option>`).join('')}</select></label>`,
        `<label><input type="checkbox" id="showgrid" ${this._showGrid ? 'checked' : ''} ${this._grid ? '' : 'disabled'}>Afficher</label>`,
        `<span class="hint">${sel ? (this._grid ? 'Flèches : un pas de grille' : 'Flèches : 1 px (Maj : 10 px)') + ' · Suppr : retirer · Échap : désélectionner' : 'Glisse un élément pour le déplacer (il se cale sur les autres, puis sur la grille), clique pour le sélectionner.'}</span>`,
      ].join('');
      const on = (id, fn) => { const el = tools.querySelector('#' + id); if (el) el.addEventListener('click', () => { if (!el.disabled) fn(); }); };
      on('addobj', () => this._addObject());
      on('addtxt', () => this._editText(null));
      on('edittxt', () => this._editText(sel.index));
      on('info', () => this._moreInfo(this._draft.positions[sel.index].entity_id, true));
      on('delsel', () => this._removeSelected());
      on('newplan', () => this._newPlan());
      on('renplan', () => this._renamePlan());
      on('imgplan', () => this._changeImage());
      on('delplan', () => this._deletePlan());
      tools.querySelector('#grid').addEventListener('change', (e) => { this._grid = Number(e.target.value); setPref('grid', this._grid); this._renderTools(); this._drawGrid(); });
      tools.querySelector('#showgrid').addEventListener('change', (e) => { this._showGrid = e.target.checked; setPref('showGrid', this._showGrid); this._drawGrid(); });
    }

    /* Lignes de la grille (pas en % de l'image), seulement en mode Modifier et si « Afficher » est coché. */
    _drawGrid() {
      const plan = this.shadowRoot.getElementById('plan');
      if (!plan) return;
      let g = plan.querySelector('.gridlines');
      if (!this._edit || !this._grid || !this._showGrid) { if (g) g.remove(); return; }
      if (!g) { g = document.createElement("div"); g.className = "gridlines"; plan.insertBefore(g, plan.querySelector(".guide")); }
      const s = this._grid;
      g.style.backgroundImage = 'linear-gradient(to right, rgba(3,169,244,.25) 1px, transparent 1px), linear-gradient(to bottom, rgba(3,169,244,.25) 1px, transparent 1px)';
      g.style.backgroundSize = `${s}% ${s}%`;
    }

    _snapGrid(v) { return this._grid ? Math.round(v * 100 / this._grid) * this._grid / 100 : v; }

    _setDirty() {
      if (!this._dirty) { this._dirty = true; this._renderActions(); this._renderTabs(); }
      this._renderTools();
    }

    /* ---------- Affichage d'un plan ---------- */

    async _show(id) {
      this._current = id; this._sel = null; this._renderTabs();
      try { localStorage.setItem('dimotic_plans.current', id); } catch (_e) { /* stockage indisponible */ }
      try {
        const detail = await this._hass.callWS({ type: 'dimotic_plans/floorplans/get', plan_id: id });
        let src = '';
        try { src = (await this._hass.callWS({ type: 'auth/sign_path', path: '/api/dimotic_plans/image/' + encodeURIComponent(detail.filename) })).path; } catch (_e) { /* image absente */ }
        if (this._current !== id) return;
        this._detail = detail; this._src = src;
        this._draft = this._edit ? this._copy(detail) : null;
        this._dirty = false; this._renderActions(); this._renderTabs(); this._renderTools();
        this._renderPlan();
      } catch (err) { this._error(err); }
    }

    _copy(detail) {
      return { positions: detail.positions.map((p) => ({ ...p })), texts: (detail.texts || []).map((t) => ({ ...t })) };
    }

    _data() { return this._edit ? this._draft : this._detail; }

    _renderPlan() {
      const main = this.shadowRoot.getElementById('main');
      const data = this._data();
      if (!data) return;
      const orphans = data.positions.filter((p) => p.orphan).length;
      main.innerHTML = `<div class="plan${this._edit ? ' edit' : ''}" id="plan">${this._src ? `<img id="img" src="${this._src}" alt="${esc(this._current)}">` : ''}
          <div class="guide v" id="gv"></div><div class="guide h" id="gh"></div></div>
        <div class="foot muted">${data.positions.length} objet(s)${orphans ? ` · <span class="warn">${orphans} orphelin(s)</span>` : ''}${data.texts.length ? ` · ${data.texts.length} texte(s)` : ''}</div>`;
      const plan = main.querySelector('#plan');
      plan.classList.toggle('dark', this._dark);
      const img = main.querySelector('#img');
      if (img) { if (img.complete) this._fit(); img.addEventListener('load', () => this._fit()); } else { plan.style.width = '600px'; plan.style.height = '400px'; }
      if (this._edit) plan.addEventListener('pointerdown', (e) => { if (e.target === plan || e.target === img) this._select(null); });
      this._texts = data.texts.map((t, index) => {
        const el = document.createElement('div');
        el.className = 'txt';
        plan.appendChild(el);
        const o = { kind: 'txt', index, el };
        this._styleText(o);
        if (this._edit) this._bindDrag(o);
        return o;
      });
      this._objs = data.positions.map((p, index) => {
        const el = document.createElement('div');
        el.className = 'obj'; el.style.left = `${p.x * 100}%`; el.style.top = `${p.y * 100}%`;
        el.innerHTML = '<div class="ico"></div><div class="val" hidden></div>';
        const o = { kind: 'obj', index, p, el, ico: el.firstChild, val: el.lastChild, last: undefined, busy: null };
        if (this._edit) this._bindDrag(o); else this._bindPress(o);
        plan.appendChild(el);
        return o;
      });
      this._markSelection();
      this._drawGrid();
      this._refresh();
    }

    /* Couleur d'un texte libre selon le thème : en clair le blanc devient sombre (lisible sur l'image) ; en sombre, une couleur
       foncée devient claire ; les couleurs vives restent. */
    _textColor(color) {
      const c = String(color || '').trim();
      const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(c);
      if (!m) return this._dark ? '#e8e8e8' : (c || '#212121');
      let h = m[1]; if (h.length === 3) h = h.split('').map((x) => x + x).join('');
      const lum = (0.299 * parseInt(h.slice(0, 2), 16) + 0.587 * parseInt(h.slice(2, 4), 16) + 0.114 * parseInt(h.slice(4, 6), 16)) / 255;
      if (this._dark) return lum < 0.45 ? '#e8e8e8' : '#' + h;
      return lum > 0.93 ? '#212121' : '#' + h;
    }

    _styleText(o) {
      const t = this._data().texts[o.index];
      o.el.textContent = t.text;
      o.el.style.cssText = `left:${t.x * 100}%;top:${t.y * 100}%;font-size:${TEXT_PX[t.size] || 20}px;color:${this._textColor(t.color)}`;
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
        if (o.busy && st !== o.busy) { clearTimeout(o.guard); o.busy = null; }
        if (st === o.last && o.ico.firstChild) continue;
        o.last = st;
        const domain = o.p.entity_id.split('.')[0];
        const name = st ? (st.attributes.friendly_name || o.p.entity_id) : o.p.entity_id;
        o.el.classList.toggle('busy', !!o.busy);
        o.el.classList.toggle('orphan', !st);
        o.el.classList.toggle('unav', !!st && (st.state === 'unavailable' || st.state === 'unknown'));
        o.el.classList.toggle('on', !!st && ON_STATES.has(st.state) && !VALUE_DOMAINS.has(domain));
        if (st) o.el.style.setProperty('--obj-color', colorFor(st, domain)); else o.el.style.removeProperty('--obj-color');
        let icon = o.ico.firstChild;
        if (st) {
          if (!icon || icon.localName !== 'ha-state-icon') { o.ico.innerHTML = ''; icon = document.createElement('ha-state-icon'); o.ico.appendChild(icon); }
          icon.hass = this._hass; const kind = switchKind(st, domain);
          icon.stateObj = kind && !st.attributes.icon ? { ...st, attributes: { ...st.attributes, icon: kind.icon } } : st;
        } else if (!icon || icon.localName !== 'ha-icon') {
          o.ico.innerHTML = '<ha-icon icon="mdi:help-circle-outline"></ha-icon>';
        }
        let val = '';
        if (st && VALUE_DOMAINS.has(domain) && st.state !== 'unavailable' && st.state !== 'unknown') {
          const n = Number(st.state);
          const unit = st.attributes.unit_of_measurement || '';
          val = Number.isFinite(n) ? `${Math.round(n * 10) / 10}${unit ? ' ' + unit : ''}` : st.state;
        } else if (st && domain === 'climate') {
          /* comme HAPLAN : consigne puis « act: » (température actuelle) sur une seconde ligne */
          const cons = st.attributes.temperature, act = st.attributes.current_temperature;
          /* thermostat éteint (mode « off ») : « Éteint » à la place de la consigne, qui ne veut rien dire tant qu'il ne régule pas */
          const consTxt = st.state === 'off' ? 'Éteint' : (cons != null ? cons + '°C' : '—');
          val = `${consTxt}\nact: ${act != null ? act + '°C' : 'N/A'}`;
        } else if (st && domain === 'cover' && st.attributes.current_position != null) {
          val = `${st.attributes.current_position} %`;
        }
        o.val.hidden = !val; o.val.textContent = val;
        o.el.title = st ? `${name} : ${this._hass.formatEntityState ? this._hass.formatEntityState(st) : st.state}` : `${o.p.entity_id} (introuvable)`;
      }
    }

    /* ---------- Commande (mode affichage) ---------- */

    _moreInfo(entityId, force) {
      /* Sur Android, l'appui long déclenche aussi « contextmenu » : une seule ouverture. */
      const now = Date.now();
      if (!force && this._lastMoreInfo && this._lastMoreInfo.id === entityId && now - this._lastMoreInfo.t < 1000) return;
      this._lastMoreInfo = { id: entityId, t: now };
      this.dispatchEvent(new CustomEvent('hass-more-info', { detail: { entityId }, bubbles: true, composed: true }));
    }

    /* Clic court = action principale, appui long ou clic droit = fiche de l'entité. */
    _bindPress(o) {
      let timer = null, long = false;
      const cancel = () => { clearTimeout(timer); timer = null; };
      o.el.addEventListener('pointerdown', (e) => {
        if (e.button !== 0) return;
        long = false; cancel();
        timer = setTimeout(() => { long = true; timer = null; this._moreInfo(o.p.entity_id); }, LONG_PRESS_MS);
      });
      o.el.addEventListener('pointerup', cancel);
      o.el.addEventListener('pointerleave', cancel);
      o.el.addEventListener('pointercancel', cancel);
      o.el.addEventListener('contextmenu', (e) => { e.preventDefault(); cancel(); long = true; this._moreInfo(o.p.entity_id); });
      o.el.addEventListener('click', (e) => { e.preventDefault(); if (long) { long = false; return; } this._action(o); });
    }

    async _action(o) {
      const id = o.p.entity_id;
      const st = this._hass.states[id];
      const domain = id.split('.')[0];
      if (!st || !TOGGLE_DOMAINS.has(domain) || st.state === 'unavailable') { this._moreInfo(id); return; }
      if (o.busy) return;
      o.busy = st; o.el.classList.add('busy');
      const done = () => { o.busy = null; o.el.classList.remove('busy'); };
      o.guard = setTimeout(done, 5000);
      try {
        await this._hass.callService(domain, st.state === 'on' ? 'turn_off' : 'turn_on', { entity_id: id });
      } catch (err) {
        clearTimeout(o.guard); done();
        this._toast(`${st.attributes.friendly_name || id} : ${(err && err.message) || err}`);
      }
    }

    /* ---------- Éditeur ---------- */

    _enterEdit() {
      if (!this._admin) return;
      this._edit = true; this._sel = null; this._dirty = false;
      this._draft = this._detail ? this._copy(this._detail) : null;
      this._renderActions(); this._renderTabs(); this._renderTools();
      if (this._draft) this._renderPlan();
    }

    _leaveEdit() {
      this._edit = false; this._sel = null; this._dirty = false; this._draft = null;
      this._renderActions(); this._renderTabs(); this._renderTools();
      if (this._detail) this._renderPlan();
    }

    _cancelEdit() {
      this._sel = null; this._dirty = false;
      this._draft = this._detail ? this._copy(this._detail) : null;
      this._renderActions(); this._renderTabs(); this._renderTools();
      if (this._draft) this._renderPlan();
    }

    async _save() {
      if (!this._dirty || !this._draft) return;
      try {
        await this._hass.callWS({
          type: 'dimotic_plans/floorplans/save', plan_id: this._current,
          positions: this._draft.positions.map((p) => ({ entity_id: p.entity_id, x: p.x, y: p.y })),
          texts: this._draft.texts.map((t) => ({ id: t.id, text: t.text, x: t.x, y: t.y, size: t.size, color: t.color })),
        });
        this._toast('Plan enregistré');
        await this._show(this._current);
      } catch (err) { this._toast(`Enregistrement refusé : ${(err && err.message) || err}`); }
    }

    _select(sel) { this._sel = sel; this._markSelection(); this._renderTools(); }

    _markSelection() {
      const s = this._sel;
      this._objs.forEach((o) => o.el.classList.toggle('sel', !!s && s.kind === 'obj' && s.index === o.index));
      this._texts.forEach((o) => o.el.classList.toggle('sel', !!s && s.kind === 'txt' && s.index === o.index));
    }

    _item(o) { return o.kind === 'obj' ? this._draft.positions[o.index] : this._draft.texts[o.index]; }

    _move(o, x, y) {
      const it = this._item(o); it.x = clamp(x); it.y = clamp(y);
      o.el.style.left = `${it.x * 100}%`; o.el.style.top = `${it.y * 100}%`;
    }

    /* Glisser-déposer (souris et tactile) avec magnétisme : le coin inférieur gauche se cale sur celui des autres éléments. */
    _bindDrag(o) {
      o.el.addEventListener('contextmenu', (e) => e.preventDefault());
      o.el.addEventListener('pointerdown', (e) => {
        if (e.button !== 0) return;
        e.preventDefault(); e.stopPropagation();
        const plan = this.shadowRoot.getElementById('plan');
        const rect = plan.getBoundingClientRect();
        const it = this._item(o);
        const start = { cx: e.clientX, cy: e.clientY, x: it.x * rect.width, y: it.y * rect.height };
        const others = [...this._objs, ...this._texts].filter((x) => x !== o).map((x) => this._item(x));
        const gv = this.shadowRoot.getElementById('gv'), gh = this.shadowRoot.getElementById('gh');
        let moved = false;
        o.el.setPointerCapture(e.pointerId);
        const move = (ev) => {
          const dx = ev.clientX - start.cx, dy = ev.clientY - start.cy;
          if (!moved && Math.hypot(dx, dy) < 4) return;
          moved = true;
          let px = start.x + dx, py = start.y + dy;
          let snapX = null, snapY = null;
          for (const other of others) {
            const ox = other.x * rect.width, oy = other.y * rect.height;
            if (Math.abs(ox - px) <= SNAP_PX && (snapX === null || Math.abs(ox - px) < Math.abs(snapX - px))) snapX = ox;
            if (Math.abs(oy - py) <= SNAP_PX && (snapY === null || Math.abs(oy - py) < Math.abs(snapY - py))) snapY = oy;
          }
          px = snapX !== null ? snapX : this._snapGrid(px / rect.width) * rect.width;
          py = snapY !== null ? snapY : this._snapGrid(py / rect.height) * rect.height;
          gv.style.display = snapX !== null ? 'block' : 'none'; gv.style.left = `${px}px`;
          gh.style.display = snapY !== null ? 'block' : 'none'; gh.style.top = `${py}px`;
          this._move(o, px / rect.width, py / rect.height);
        };
        const up = () => {
          o.el.removeEventListener('pointermove', move); o.el.removeEventListener('pointerup', up); o.el.removeEventListener('pointercancel', up);
          gv.style.display = 'none'; gh.style.display = 'none';
          this._select({ kind: o.kind, index: o.index });
          if (moved) this._setDirty();
        };
        o.el.addEventListener('pointermove', move); o.el.addEventListener('pointerup', up); o.el.addEventListener('pointercancel', up);
      });
      if (o.kind === 'txt') o.el.addEventListener('dblclick', () => this._editText(o.index));
    }

    _key(e) {
      if (!this._edit || !this._sel || this.shadowRoot.querySelector('.overlay')) return;
      if (e.composedPath().some((n) => n && ['input', 'textarea', 'select'].includes(n.localName))) return;
      const plan = this.shadowRoot.getElementById('plan');
      if (!plan) return;
      const d = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key];
      if (d) {
        e.preventDefault();
        const o = (this._sel.kind === 'obj' ? this._objs : this._texts)[this._sel.index];
        const it = this._item(o);
        if (this._grid) {
          /* Un pas de grille, en partant de la ligne de grille la plus proche (un objet hors grille s'y cale d'abord). */
          const g = this._grid / 100;
          const nx = d[0] ? (d[0] > 0 ? Math.floor(it.x / g + 1e-6) + 1 : Math.ceil(it.x / g - 1e-6) - 1) * g : it.x;
          const ny = d[1] ? (d[1] > 0 ? Math.floor(it.y / g + 1e-6) + 1 : Math.ceil(it.y / g - 1e-6) - 1) * g : it.y;
          this._move(o, nx, ny);
        } else {
          const step = e.shiftKey ? 10 : 1;
          this._move(o, it.x + d[0] * step / plan.clientWidth, it.y + d[1] * step / plan.clientHeight);
        }
        this._setDirty();
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault(); this._removeSelected();
      } else if (e.key === 'Escape') {
        this._select(null);
      }
    }

    _removeSelected() {
      const s = this._sel; if (!s) return;
      (s.kind === 'obj' ? this._draft.positions : this._draft.texts).splice(s.index, 1);
      this._sel = null; this._renderPlan(); this._setDirty();
    }

    /* ---------- Boîtes de dialogue ---------- */

    /* `body` : HTML du formulaire ; `check(form)` renvoie un message d'erreur ou rien ; résout avec le formulaire ou null. */
    _dialog({ title, body, ok = 'OK', danger = false, check }) {
      return new Promise((resolve) => {
        const ov = document.createElement('div');
        ov.className = 'overlay';
        ov.innerHTML = `<form class="dialog"><h2>${esc(title)}</h2>${body}<div class="err"></div>
          <div class="btns"><button type="button" class="cancel">Annuler</button><button type="submit" class="ok${danger ? ' danger' : ''}">${esc(ok)}</button></div></form>`;
        const form = ov.querySelector('form');
        const close = (v) => { ov.remove(); resolve(v); };
        ov.addEventListener('pointerdown', (e) => { if (e.target === ov) close(null); });
        ov.querySelector('.cancel').addEventListener('click', () => close(null));
        form.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(null); });
        form.addEventListener('submit', (e) => {
          e.preventDefault();
          const msg = check && check(form);
          if (msg) { form.querySelector('.err').textContent = msg; return; }
          close(form);
        });
        this.shadowRoot.appendChild(ov);
        const first = form.querySelector('input, select');
        if (first) first.focus();
      });
    }

    /* Description d'une entité pour le choix d'objet : taxonomie QUOI/OÙ posée par nommage (attribut `attributs_taxonomie`),
     * et entités secondaires (diagnostic, configuration, masquées : boutons RFXCOM…) repérées par les registres de HA. */
    _describe(s) {
      const ent = (this._hass.entities || {})[s.entity_id] || {};
      const tax = s.attributes.attributs_taxonomie || null;
      const t = (k) => (tax && typeof tax[k] === 'string' ? tax[k] : '');
      return {
        id: s.entity_id,
        name: s.attributes.friendly_name || s.entity_id,
        tax: !!tax,
        quoi: t('quoi'), quoiAppareil: t('quoi_appareil'),
        lieu: t('lieu_principal'), precis: t('lieu_precis'), pere: t('lieu_pere'),
        secondary: !!ent.hidden || ent.entity_category === 'diagnostic' || ent.entity_category === 'config',
      };
    }

    _addObject() {
      const used = new Set(this._draft.positions.map((p) => p.entity_id));
      const all = Object.values(this._hass.states).filter((s) => !used.has(s.entity_id)).map((s) => this._describe(s));
      const count = (key) => {
        const c = new Map();
        for (const e of all) if (e.tax && !e.secondary && e[key]) c.set(e[key], (c.get(e[key]) || 0) + 1);
        return [...c.keys()].sort((a, b) => a.localeCompare(b, 'fr'));
      };
      const opts = (values, label) => `<option value="">${label}</option>` + values.map((v) => `<option value="${esc(v)}">${esc(v)}</option>`).join('');
      const ov = document.createElement('div');
      ov.className = 'overlay';
      ov.innerHTML = `<div class="dialog"><h2>Ajouter un objet</h2>
        <div class="row"><label>QUOI<select id="fquoi">${opts(count('quoi'), 'Tous')}</select></label>
          <label>Lieu<select id="flieu">${opts(count('lieu'), 'Tous')}</select></label></div>
        <input type="search" id="q" placeholder="Rechercher (QUOI, lieu, nom)…" autocomplete="off">
        <label class="check"><input type="checkbox" id="sec">Toutes les entités (sans taxonomie, boutons, diagnostic, configuration, masquées)</label>
        <div class="pick" id="list"></div>
        <div class="btns"><button type="button" class="cancel">Annuler</button></div></div>`;
      const close = () => ov.remove();
      ov.addEventListener('pointerdown', (e) => { if (e.target === ov) close(); });
      ov.querySelector('.cancel').addEventListener('click', close);
      const $ = (id) => ov.querySelector('#' + id);
      const list = $('list'), q = $('q'), sec = $('sec'), fquoi = $('fquoi'), flieu = $('flieu');
      const key = (e) => `${e.lieu || '\uffff'}|${e.quoi || '\uffff'}|${e.precis}|${e.name}`;
      const render = () => {
        const words = q.value.toLowerCase().split(/\s+/).filter(Boolean);
        const found = all.filter((e) => (sec.checked || (e.tax && !e.secondary))
          && (!fquoi.value || e.quoi === fquoi.value) && (!flieu.value || e.lieu === flieu.value)
          && words.every((w) => [e.quoi, e.quoiAppareil, e.lieu, e.precis, e.pere, e.name, e.id].some((v) => v.toLowerCase().includes(w))))
          .sort((a, b) => key(a).localeCompare(key(b), 'fr')).slice(0, 150);
        list.innerHTML = found.length ? '' : '<div class="muted">Aucune entité</div>';
        for (const e of found) {
          const row = document.createElement('div');
          const icon = document.createElement('ha-state-icon');
          icon.hass = this._hass; icon.stateObj = this._hass.states[e.id];
          const label = document.createElement('span');
          const title = e.tax ? [e.quoi, e.precis].filter(Boolean).join(' · ') : e.name;
          const where = e.tax ? [e.lieu, e.pere].filter(Boolean).join(', ') : '';
          const appareil = e.quoiAppareil && e.quoiAppareil !== e.quoi ? ` (${e.quoiAppareil})` : '';
          label.innerHTML = `${esc(title)}${esc(appareil)}<small>${esc(where ? where + ' — ' : '')}${esc(e.tax ? e.name + ' — ' : '')}${esc(e.id)}</small>`;
          row.append(icon, label);
          row.addEventListener('click', () => {
            close();
            this._draft.positions.push({ entity_id: e.id, stored_entity_id: e.id, orphan: false, x: 0.5, y: 0.5 });
            this._sel = { kind: 'obj', index: this._draft.positions.length - 1 };
            this._renderPlan(); this._setDirty();
            this._toast('Objet ajouté au milieu du plan : fais-le glisser à sa place');
          });
          list.appendChild(row);
        }
      };
      for (const el of [q, sec, fquoi, flieu]) el.addEventListener(el === q ? 'input' : 'change', render);
      q.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
      this.shadowRoot.appendChild(ov);
      render(); fquoi.focus();
    }

    async _editText(index) {
      const t = index == null ? { text: '', size: 'medium', color: '#212121' } : this._draft.texts[index];
      const sizes = { small: 'Petit', medium: 'Moyen', large: 'Grand' };
      const form = await this._dialog({
        title: index == null ? 'Ajouter un texte' : 'Modifier le texte',
        ok: index == null ? 'Ajouter' : 'Appliquer',
        body: `<label>Texte<input type="text" name="text" maxlength="200" value="${esc(t.text)}"></label>
          <div class="row"><label>Taille<select name="size">${Object.entries(sizes).map(([k, v]) => `<option value="${k}" ${k === t.size ? 'selected' : ''}>${v}</option>`).join('')}</select></label>
          <label>Couleur<input type="color" name="color" value="${/^#[0-9a-f]{6}$/i.test(t.color) ? t.color : '#212121'}"></label></div>`,
        check: (f) => (f.elements.text.value.trim() ? '' : 'Le texte est vide.'),
      });
      if (!form) return;
      const values = { text: form.elements.text.value.trim(), size: form.elements.size.value, color: form.elements.color.value };
      if (index == null) {
        this._draft.texts.push({ id: `t${Date.now().toString(36)}`, x: 0.5, y: 0.5, ...values });
        this._sel = { kind: 'txt', index: this._draft.texts.length - 1 };
      } else {
        Object.assign(this._draft.texts[index], values);
      }
      this._renderPlan(); this._setDirty();
    }

    async _readImage(form) {
      const file = form.elements.image && form.elements.image.files[0];
      if (!file) return null;
      return { name: file.name, data: await fileToBase64(file) };
    }

    _checkImage(form, required) {
      const file = form.elements.image && form.elements.image.files[0];
      if (!file) return required ? 'Choisis une image.' : '';
      if (!/\.(png|jpe?g|webp|svg)$/i.test(file.name)) return 'Formats acceptés : png, jpg, webp, svg.';
      if (file.size > MAX_UPLOAD) return 'Image trop volumineuse (3 Mo au plus).';
      return '';
    }

    async _planCall(msg, okText, nextId) {
      try {
        const res = await this._hass.callWS(msg);
        this._toast(okText);
        await this._loadList(nextId === undefined ? (res && res.plan_id) || this._current : nextId);
      } catch (err) { this._toast(`Refusé : ${(err && err.message) || err}`); }
    }

    async _newPlan() {
      const form = await this._dialog({
        title: 'Nouveau plan', ok: 'Créer',
        body: `<label>Nom<input type="text" name="name" maxlength="64"></label>
          <label>Image (png, jpg, webp, svg — vide : page blanche)<input type="file" name="image" accept=".png,.jpg,.jpeg,.webp,.svg"></label>`,
        check: (f) => (!f.elements.name.value.trim() ? 'Donne un nom au plan.'
          : this._plans.some((p) => p.id === f.elements.name.value.trim()) ? 'Un plan porte déjà ce nom.' : this._checkImage(f, false)),
      });
      if (!form) return;
      const msg = { type: 'dimotic_plans/floorplans/create', plan_id: form.elements.name.value.trim() };
      const image = await this._readImage(form);
      if (image) msg.image = image;
      await this._planCall(msg, 'Plan créé');
    }

    async _renamePlan() {
      const form = await this._dialog({
        title: 'Renommer le plan', ok: 'Renommer',
        body: `<label>Nouveau nom<input type="text" name="name" maxlength="64" value="${esc(this._current)}"></label>`,
        check: (f) => { const v = f.elements.name.value.trim(); return !v ? 'Le nom est vide.' : v !== this._current && this._plans.some((p) => p.id === v) ? 'Un plan porte déjà ce nom.' : ''; },
      });
      if (!form || form.elements.name.value.trim() === this._current) return;
      await this._planCall({ type: 'dimotic_plans/floorplans/rename', plan_id: this._current, new_id: form.elements.name.value.trim() }, 'Plan renommé');
    }

    async _changeImage() {
      const form = await this._dialog({
        title: 'Changer l\'image du plan', ok: 'Remplacer',
        body: `<p class="muted" style="margin:0">Les objets et les textes gardent leur position relative (en % de l'image).</p>
          <label>Image (png, jpg, webp, svg)<input type="file" name="image" accept=".png,.jpg,.jpeg,.webp,.svg"></label>`,
        check: (f) => this._checkImage(f, true),
      });
      if (!form) return;
      await this._planCall({ type: 'dimotic_plans/floorplans/set_image', plan_id: this._current, image: await this._readImage(form) }, 'Image remplacée', this._current);
    }

    async _deletePlan() {
      const n = this._draft ? this._draft.positions.length : 0;
      const form = await this._dialog({
        title: 'Supprimer le plan', ok: 'Supprimer', danger: true,
        body: `<p style="margin:0">Supprimer « <b>${esc(this._current)}</b> », son image et ses ${n} objet(s) ? Les entités de HA ne sont pas touchées.</p>`,
      });
      if (!form) return;
      await this._planCall({ type: 'dimotic_plans/floorplans/delete', plan_id: this._current }, 'Plan supprimé', null);
    }
  }
  if (!customElements.get('dimotic-plans-panel')) customElements.define('dimotic-plans-panel', PlansPanel);
})();
