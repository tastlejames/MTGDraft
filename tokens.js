/* ==========================================================================
   Draft Table — Tokens  (tokens.js)
   --------------------------------------------------------------------------
   Adds a "Tokens" tab to the bottom nav. It opens a full-screen token board
   for playing a game with the deck you built:
     - finds every token your deck and sideboard can make (via Scryfall)
     - search any token on Scryfall, or make a token copy of a deck card
     - tap / untap, stacks with "tap X", attack, +1/+1 counters,
       summoning sickness, undo, untap all
     - choose between a token's arts (your pick is remembered)

   It READS the deck (pool / sideboard) but never changes it.
   It saves its own data in localStorage under the dt_tokens_* keys.
   Loaded from index.html with:  <script src="tokens.js"></script>
   To turn Tokens off, delete that one line.
   ========================================================================== */
(function () {
  'use strict';
  if (window.DTTokens) return;

  const API = 'https://api.scryfall.com';
  const R = 680 / 488;                 // card height / width
  const K_BOARD = 'dt_tokens_board_v1';
  const K_ART = 'dt_tokens_art_v1';
  const K_DECK = 'dt_tokens_deck_v2';
  const BASICS = new Set(['Plains', 'Island', 'Swamp', 'Mountain', 'Forest', 'Wastes',
    'Snow-Covered Plains', 'Snow-Covered Island', 'Snow-Covered Swamp', 'Snow-Covered Mountain', 'Snow-Covered Forest']);

  /* ---------------------------------------------------------------- styles */
  const CSS = `
.tt-open body{overflow:hidden!important}
.tt-nav{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;padding:8px 4px 6px;background:none;border:none;color:var(--gold-trim,#c8a030);cursor:pointer;-webkit-user-select:none;user-select:none;position:relative;-webkit-tap-highlight-color:transparent}
.tt-nav:active{background:rgba(200,160,48,0.1)}
.tt-nav-icon{font-size:20px;line-height:1}
.tt-nav-label{font-family:'Barlow Condensed',sans-serif;font-size:10px;font-weight:800;letter-spacing:0.1em;text-transform:uppercase}

.tt-root{position:fixed;inset:0;z-index:700;display:flex;flex-direction:column;box-sizing:border-box;
  padding-left:env(safe-area-inset-left,0px);padding-right:env(safe-area-inset-right,0px);
  background:radial-gradient(ellipse 80% 60% at 50% 50%,#1a1208 0%,#0a0806 70%);color:#e8dac0;
  font-family:'Crimson Pro',Georgia,serif;-webkit-user-select:none;user-select:none;-webkit-tap-highlight-color:transparent;
  touch-action:manipulation;overscroll-behavior:none}
.tt-root[hidden]{display:none}
.tt-root *{box-sizing:border-box}
.tt-root button{font-family:inherit;cursor:pointer;-webkit-tap-highlight-color:transparent}
.tt-root button:focus-visible,.tt-root input:focus-visible,.tt-tile:focus-visible .tt-card{outline:3px solid var(--gold-trim2,#e8cc60);outline-offset:2px}

.tt-top{flex:0 0 auto;display:flex;align-items:center;gap:6px;padding:calc(6px + env(safe-area-inset-top,0px)) 10px 6px;
  background:linear-gradient(180deg,#2a2010,#1a1408);border-bottom:3px solid var(--gold-trim3,#906010);box-shadow:0 4px 16px rgba(0,0,0,.6);position:relative;z-index:2}
.tt-title{flex:1;min-width:0;text-align:center}
.tt-h1{font-family:'Cinzel',serif;font-size:17px;font-weight:900;color:var(--gold-trim2,#e8cc60);letter-spacing:.06em;line-height:1.15;text-shadow:0 0 14px rgba(200,160,48,.35)}
.tt-sum{font-family:'Barlow Condensed',sans-serif;font-size:11px;font-weight:700;color:var(--gold-trim,#c8a030);letter-spacing:.08em;text-transform:uppercase;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.tt-hbtn{height:36px;padding:0 10px;border-radius:6px;border:1px solid rgba(200,160,48,.35);background:rgba(0,0,0,.3);color:var(--gold-trim2,#e8cc60);
  font-family:'Barlow Condensed',sans-serif!important;font-size:13px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;white-space:nowrap}
.tt-hbtn:active{transform:scale(.96)}
.tt-hbtn:disabled{opacity:.35;cursor:default}
.tt-hbtn.tt-armed{background:#8a1808;border-color:#c03020;color:#fff}

.tt-board{flex:1 1 auto;min-height:0;overflow-y:auto;overflow-x:hidden;-webkit-overflow-scrolling:touch}
.tt-grid{display:flex;flex-wrap:wrap;justify-content:center;align-content:center;min-height:100%}
.tt-tile{position:relative;flex:0 0 auto;cursor:pointer;-webkit-touch-callout:none;outline:none}
.tt-card{position:absolute;inset:0;border-radius:4.75%/3.4%;overflow:hidden;background:linear-gradient(160deg,#e8dac0,#c8b080);
  box-shadow:0 .35em 1em rgba(0,0,0,.7);transition:filter .15s}
.tt-s2 .tt-card{box-shadow:.2em .2em 0 0 #1a1208,.2em .2em 0 .06em rgba(200,160,48,.5),0 .35em 1em rgba(0,0,0,.7)}
.tt-s3 .tt-card{box-shadow:.2em .2em 0 0 #1a1208,.2em .2em 0 .06em rgba(200,160,48,.5),.4em .4em 0 0 #1a1208,.4em .4em 0 .06em rgba(200,160,48,.35),0 .35em 1em rgba(0,0,0,.7)}
.tt-card img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block;pointer-events:none;-webkit-user-drag:none}
.tt-card.tt-noimg img{display:none}
.tt-fb{position:absolute;inset:0;padding:.55em;display:flex;flex-direction:column;gap:.35em;color:#1a1208;border:.25em solid #1a1208;border-radius:inherit}
.tt-fbn{font-family:'Cinzel',serif;font-weight:700;font-size:1em;line-height:1.15}
.tt-fbt{font-family:'Barlow Condensed',sans-serif;font-weight:700;font-size:.7em;color:#4a3c28}
.tt-fbx{font-size:.72em;line-height:1.25;overflow:hidden;flex:1}
.tt-fbpt{align-self:flex-end;font-family:'Cinzel',serif;font-weight:700;font-size:1em}
.tt-tapped .tt-card{transform:rotate(90deg) scale(var(--ts));filter:brightness(.78) saturate(.8)}
.tt-a-tap .tt-card{animation:tt-tap .22s ease-out}
.tt-a-untap .tt-card{animation:tt-untap .22s ease-out}
@keyframes tt-tap{from{transform:none}to{transform:rotate(90deg) scale(var(--ts))}}
@keyframes tt-untap{from{transform:rotate(90deg) scale(var(--ts))}to{transform:none}}
.tt-tile:active .tt-card,.tt-tile.tt-held .tt-card{filter:brightness(1.1)}
.tt-tapped:active .tt-card,.tt-tapped.tt-held .tt-card{filter:brightness(.9) saturate(.8)}
.tt-count{position:absolute;left:-8px;z-index:3;min-width:2.2em;height:2.2em;padding:0 .45em;border-radius:999px;display:grid;place-items:center;
  background:radial-gradient(circle at 40% 35%,#f4dc80,#c8a030 55%,#906010);color:#1a0c00;border:2px solid #1a1208;
  font-family:'Cinzel',serif;font-weight:700;box-shadow:0 3px 8px rgba(0,0,0,.6);pointer-events:none}
.tt-sick{position:absolute;top:9%;right:6%;font-size:1.05em;line-height:1.2;background:rgba(10,8,6,.82);border:1px solid rgba(200,160,48,.55);border-radius:999px;padding:.1em .35em}
.tt-pt{position:absolute;right:5%;bottom:4.5%;background:linear-gradient(180deg,#f0d878,#c09020);color:#1a0c00;border:2px solid #1a1208;border-radius:.35em;padding:.02em .45em;
  font-family:'Cinzel',serif;font-weight:700;font-size:1.05em;box-shadow:0 2px 6px rgba(0,0,0,.6)}

.tt-empty{margin:auto;max-width:340px;width:calc(100% - 32px);background:linear-gradient(160deg,#d0c8a8,#a89870,#706040);border:3px solid #1a1208;border-radius:12px;padding:4px;box-shadow:0 8px 32px rgba(0,0,0,.8)}
.tt-empty-in{background:linear-gradient(180deg,#e8dac0,#e0d0b0);border-radius:9px;padding:18px 16px;text-align:center;color:#1a1208}
.tt-empty-t{font-family:'Cinzel',serif;font-size:17px;font-weight:700;margin-bottom:6px}
.tt-empty-s{font-size:15px;color:#4a3c28;line-height:1.4;margin-bottom:14px}

.tt-bottom{flex:0 0 auto;display:flex;gap:8px;padding:8px 10px calc(8px + env(safe-area-inset-bottom,0px));
  background:linear-gradient(180deg,#2a2010,#1a1408,#0e0a04);border-top:3px solid var(--gold-trim3,#906010);box-shadow:0 -4px 20px rgba(0,0,0,.8);position:relative;z-index:2}
.tt-bar{flex:1;height:50px;border-radius:8px;border:2px solid rgba(200,160,48,.45);background:rgba(0,0,0,.35);color:var(--gold-trim2,#e8cc60);
  font-family:'Cinzel',serif!important;font-size:14px;font-weight:700;letter-spacing:.08em}
.tt-bar:active{transform:scale(.98)}
.tt-gold,.tt-act.tt-primary{background:linear-gradient(180deg,#e8cc70 0%,#c09020 40%,#a07010 60%,#c8a030 100%);border:2px solid #7a5010;color:#1a0c00;
  box-shadow:0 2px 8px rgba(0,0,0,.4),inset 0 1px rgba(255,255,255,.3);text-shadow:0 1px rgba(255,255,255,.2)}

.tt-sheetwrap{position:absolute;inset:0;z-index:5;display:flex;align-items:flex-end;justify-content:center}
.tt-sheetwrap[hidden]{display:none}
.tt-scrim{position:absolute;inset:0;background:rgba(0,0,0,.6)}
.tt-sheet{position:relative;width:100%;max-width:560px;max-height:88%;overflow-y:auto;-webkit-overflow-scrolling:touch;color:#1a1208;
  background:repeating-linear-gradient(180deg,transparent,transparent 24px,rgba(139,110,60,.06) 24px,rgba(139,110,60,.06) 25px),linear-gradient(180deg,#e8dac0,#e0d0b0);
  border:3px solid #1a1208;border-bottom:none;border-radius:14px 14px 0 0;padding:10px 16px calc(16px + env(safe-area-inset-bottom,0px));
  box-shadow:0 -10px 40px rgba(0,0,0,.8);animation:tt-up .2s ease-out}
@keyframes tt-up{from{transform:translateY(24px);opacity:.5}to{transform:none;opacity:1}}
.tt-grab{width:40px;height:5px;border-radius:3px;background:#c8b080;margin:0 auto 10px}
.tt-stitle{font-family:'Cinzel',serif;font-size:18px;font-weight:700;margin:0 0 10px;color:#1a1208}
.tt-shead{display:flex;gap:12px;align-items:flex-start}
.tt-thumb{flex:0 0 auto;width:56px;aspect-ratio:488/680;border-radius:4px;overflow:hidden;background:linear-gradient(160deg,#d0c8a8,#a89870);box-shadow:0 2px 6px rgba(0,0,0,.35)}
.tt-thumb img{width:100%;height:100%;object-fit:cover;display:block}
.tt-shead .tt-thumb{width:76px}
.tt-sname{font-family:'Cinzel',serif;font-size:19px;font-weight:700;line-height:1.15}
.tt-spt{color:#8a6a20}
.tt-stype{font-family:'Barlow Condensed',sans-serif;font-size:13px;font-weight:700;color:#4a3c28;letter-spacing:.03em;margin-top:2px}
.tt-stext{font-size:15px;line-height:1.35;margin-top:5px;color:#1a1208}
.tt-status{margin-top:12px;font-family:'Barlow Condensed',sans-serif;font-size:17px;font-weight:800;letter-spacing:.03em}
.tt-note{font-size:14px;color:#4a3c28;font-style:italic;margin-top:3px;line-height:1.3}
.tt-stepper{display:flex;align-items:center;gap:8px;margin-top:10px}
.tt-stepper button{width:46px;height:46px;border-radius:6px;border:1px solid #c8b080;background:#d8c8a0;color:#1a1208;font-size:24px;font-weight:700;line-height:1;box-shadow:0 1px 3px rgba(0,0,0,.2)}
.tt-stepper output{min-width:54px;text-align:center;font-family:'Cinzel',serif;font-size:26px;font-weight:700}
.tt-stepper .tt-all{width:auto;padding:0 14px;margin-left:auto;font-family:'Barlow Condensed',sans-serif!important;font-size:15px;font-weight:800;letter-spacing:.05em;text-transform:uppercase}
.tt-acts{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:12px}
.tt-act{min-height:48px;border-radius:6px;border:1px solid #c8b080;background:#d8c8a0;color:#1a1208;font-family:'Barlow Condensed',sans-serif!important;
  font-size:16px;font-weight:800;letter-spacing:.04em;line-height:1.1;padding:8px 10px;box-shadow:0 1px 3px rgba(0,0,0,.2)}
.tt-act:active{transform:scale(.98)}
.tt-act.tt-primary{grid-column:1/-1;min-height:54px;font-family:'Cinzel',serif!important;font-size:16px;font-weight:700;letter-spacing:.08em}
.tt-act.tt-danger{color:#8a0808;border-color:rgba(138,8,8,.35)}
.tt-act.tt-wide{grid-column:1/-1}
.tt-act:disabled{opacity:.45;cursor:default}
.tt-more{display:flex;align-items:center;gap:8px;margin-top:12px;padding-top:10px;border-top:1px solid #c8b080}
.tt-more span{margin-right:auto;font-family:'Barlow Condensed',sans-serif;font-size:13px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:#8a7a60}
.tt-more button{height:40px;min-width:52px;border-radius:6px;border:1px solid #c8b080;background:#d8c8a0;color:#1a1208;font-family:'Barlow Condensed',sans-serif!important;font-size:16px;font-weight:800}

.tt-tabs{display:flex;gap:2px;margin-bottom:10px;background:rgba(0,0,0,.1);padding:3px;border-radius:6px}
.tt-tab{flex:1;padding:8px 4px;text-align:center;background:#d8c8a0;border:1px solid #c8b080;border-radius:4px;font-family:'Cinzel',serif!important;font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#4a3c28}
.tt-tab.tt-on{background:linear-gradient(180deg,#e8d898,#c8a830);color:#1a1208;border-color:#906010;box-shadow:0 2px 4px rgba(0,0,0,.3)}
.tt-input{width:100%;height:44px;background:#e0d0b0;border:2px solid #c8b080;border-radius:5px;color:#1a1208;font-family:'Crimson Pro',serif;font-size:16px;padding:0 12px;outline:none;
  box-shadow:inset 0 2px 4px rgba(0,0,0,.25);-webkit-user-select:text;user-select:text;margin-bottom:8px}
.tt-input:focus{border-color:#906010}
.tt-list{display:flex;flex-direction:column;gap:5px;max-height:44vh;overflow-y:auto;-webkit-overflow-scrolling:touch;padding:2px}
.tt-sec{font-family:'Barlow Condensed',sans-serif;font-size:11px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:#8a7a60;padding:8px 2px 3px;border-bottom:1px solid #c8b080;margin-bottom:2px}
.tt-row{display:flex;align-items:center;gap:10px;width:100%;text-align:left;padding:5px 10px 5px 5px;border-radius:6px;border:1px solid #c8b080;background:#e0d0b0;color:#1a1208}
.tt-row.tt-on{border-color:#906010;box-shadow:inset 0 0 0 2px #c8a030;background:#ecdcb4}
.tt-row .tt-thumb{width:40px}
.tt-rt{flex:1;min-width:0;display:flex;flex-direction:column}
.tt-rn{font-size:16px;font-weight:700;line-height:1.15}
.tt-rs{font-family:'Barlow Condensed',sans-serif;font-size:12px;font-weight:700;color:#8a7a60;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.tt-rp{font-family:'Cinzel',serif;font-size:16px;font-weight:700}
.tt-msg{padding:16px 8px;text-align:center;color:#4a3c28;font-style:italic;font-size:15px;line-height:1.4}
.tt-link{background:none;border:none;color:#906010;text-decoration:underline;font-size:14px;padding:8px 4px;font-family:'Crimson Pro',serif!important}
.tt-chips{display:flex;gap:4px;margin-top:10px}
.tt-chip{flex:1 1 0;min-width:0;height:42px;padding:0;border-radius:6px;border:1px solid #c8b080;background:#d8c8a0;color:#1a1208;font-family:'Cinzel',serif!important;font-size:15px;font-weight:700}
.tt-chip.tt-on{background:linear-gradient(180deg,#e8d898,#c8a830);border-color:#906010}
.tt-create{width:100%;margin-top:10px}
.tt-arts{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}
.tt-art{min-width:0;padding:0;border:3px solid transparent;border-radius:8px;background:none;display:flex;flex-direction:column;gap:2px;align-items:stretch}
.tt-art img{width:100%;aspect-ratio:488/680;object-fit:cover;border-radius:5px;display:block;box-shadow:0 2px 6px rgba(0,0,0,.35)}
.tt-art span{font-family:'Barlow Condensed',sans-serif;font-size:11px;font-weight:700;letter-spacing:.02em;color:#4a3c28;text-align:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.tt-art.tt-on{border-color:#c8a030}

.tt-toast{position:absolute;left:50%;transform:translateX(-50%);bottom:calc(var(--tt-foot,72px) + 10px);z-index:6;display:flex;align-items:center;gap:12px;
  max-width:calc(100% - 24px);background:#e8dac0;border:2px solid var(--gold-trim3,#906010);border-radius:8px;padding:9px 10px 9px 14px;color:#1a1208;
  font-size:15px;font-weight:600;box-shadow:0 16px 48px rgba(0,0,0,.9)}
.tt-toast[hidden]{display:none}
.tt-toast button{flex:0 0 auto;background:linear-gradient(180deg,#e8cc70,#c09020);border:1px solid #7a5010;border-radius:5px;color:#1a0c00;padding:7px 10px;
  font-family:'Barlow Condensed',sans-serif!important;font-size:14px;font-weight:800;letter-spacing:.05em;white-space:nowrap}
.tt-toast button[hidden]{display:none}
@media (prefers-reduced-motion: reduce){.tt-tile .tt-card,.tt-sheet{animation:none!important;transition:none!important}}
`;

  /* --------------------------------------------------------------- helpers */
  const $ = id => document.getElementById(id);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const loadJSON = k => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } };
  const saveJSON = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } };
  const bk = b => b.t + '|' + b.s + '|' + b.c;
  const isCreature = d => /\bCreature\b/.test(d.type || '');
  const hasKw = (d, k) => (d.kw || []).some(x => String(x).toLowerCase() === k.toLowerCase());
  const isNum = v => v != null && /^-?\d+$/.test(String(v));
  const ptOf = (d, c) => {
    if (d.p == null || d.t == null) return '';
    return (isNum(d.p) ? (+d.p + c) : d.p) + '/' + (isNum(d.t) ? (+d.t + c) : d.t);
  };
  const tokLabel = (n, d) => `${n} ${d.name} token${n === 1 ? '' : 's'}`;
  const sacText = d => /sacrifice this/i.test(d.text || '');

  /* ----------------------------------------------------------------- state */
  let board = loadJSON(K_BOARD);
  if (!board || !Array.isArray(board.groups) || typeof board.next !== 'number' || typeof board.defs !== 'object') {
    board = { groups: [], next: 1, defs: {} };
  }
  board.groups = board.groups.filter(g => board.defs[g.key] && Array.isArray(g.b));
  let artPick = loadJSON(K_ART) || {};
  let deckCache = null, scanning = null;
  let hist = [];
  const anim = new Map();
  let sheet = null;
  let root = null, grid = null, boardEl = null, wrapEl = null, sheetEl = null;

  function withArt(def) {
    const s = artPick[def.key];
    return (s && s.img) ? Object.assign({}, def, { img: s.img, imgSmall: s.imgSmall || s.img }) : def;
  }

  /* ---------------------------------------------------------- board model */
  function grp(id) { return board.groups.find(g => g.id === id); }
  function norm(g) {
    const m = new Map();
    for (const b of g.b) {
      if (!b.n || b.n <= 0) continue;
      if (b.c < 0) b.c = 0;
      const k = bk(b);
      if (m.has(k)) m.get(k).n += b.n; else m.set(k, { t: b.t, s: b.s, c: b.c, n: b.n });
    }
    g.b = [...m.values()].sort((a, b) => a.t - b.t || a.s - b.s || a.c - b.c);
  }
  function prune() { board.groups = board.groups.filter(g => g.b.some(b => b.n > 0)); }
  function addTokens(def, n) {
    const d = Object.assign({}, def); delete d.where;
    board.defs[d.key] = d;
    let g = board.groups.find(x => x.key === d.key);
    if (!g) { g = { id: board.next++, key: d.key, b: [] }; board.groups.push(g); }
    g.b.push({ t: 0, s: (isCreature(d) && !hasKw(d, 'Haste')) ? 1 : 0, c: 0, n });
    norm(g);
  }
  function move(gid, key, n, change) {
    const g = grp(gid); if (!g) return null;
    const b = g.b.find(x => bk(x) === key); if (!b) return null;
    n = Math.max(0, Math.min(n, b.n)); if (!n) return null;
    b.n -= n;
    const nb = { t: b.t, s: b.s, c: b.c, n };
    change(nb);
    g.b.push(nb);
    norm(g); prune();
    return nb.n > 0 ? gid + ':' + bk(nb) : null;
  }
  function resolve(key) {
    if (!key) return null;
    const i = key.indexOf(':');
    const g = grp(+key.slice(0, i)); if (!g) return null;
    const k = key.slice(i + 1);
    const b = g.b.find(x => bk(x) === k); if (!b) return null;
    return { g, b, d: board.defs[g.key], k };
  }
  function saveBoard() {
    const used = new Set(board.groups.map(g => g.key));
    Object.keys(board.defs).forEach(k => { if (!used.has(k)) delete board.defs[k]; });
    saveJSON(K_BOARD, board);
  }
  function commit(fn) {
    hist.push(JSON.stringify(board));
    if (hist.length > 60) hist.shift();
    fn(); saveBoard(); render();
  }
  function undo() {
    if (!hist.length) return;
    board = JSON.parse(hist.pop());
    anim.clear(); saveBoard(); closeSheet(); render();
    toast('Undone');
  }

  /* -------------------------------------------------------------- Scryfall */
  async function collection(ids) {
    const data = [];
    for (let i = 0; i < ids.length; i += 75) {
      const r = await fetch(API + '/cards/collection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ identifiers: ids.slice(i, i + 75) })
      });
      if (!r.ok) throw new Error('Scryfall ' + r.status);
      const d = await r.json();
      data.push(...(d.data || []));
      if (i + 75 < ids.length) await sleep(120);
    }
    return data;
  }
  async function search(q, params) {
    const r = await fetch(API + '/cards/search?q=' + encodeURIComponent(q) + params, { headers: { Accept: 'application/json' } });
    if (r.status === 404) return [];
    if (!r.ok) throw new Error('Scryfall ' + r.status);
    const d = await r.json();
    return d.data || [];
  }
  function faceFor(c, name) {
    const faces = Array.isArray(c.card_faces) ? c.card_faces : null;
    if (!faces || !faces.length) return null;
    if (name) {
      const n = name.toLowerCase();
      const f = faces.find(x => String(x.name || '').toLowerCase() === n);
      if (f) return f;
    }
    return faces[0];
  }
  function cardToDef(c, opts) {
    opts = opts || {};
    const f = faceFor(c, opts.face);
    const pick = k => (f && f[k] != null) ? f[k] : c[k];
    const iu = (f && f.image_uris) || c.image_uris || {};
    const oracle = (f && f.oracle_id) || c.oracle_id || '';
    const copy = !!opts.copy;
    const def = {
      key: (copy ? 'copy:' : 'tok:') + (oracle || c.id),
      oracle, copy,
      name: (f && f.name) || c.name || 'Token',
      type: String(pick('type_line') || '').split(' // ')[0],
      p: pick('power') != null ? String(pick('power')) : null,
      t: pick('toughness') != null ? String(pick('toughness')) : null,
      text: pick('oracle_text') || '',
      kw: Array.isArray(c.keywords) ? c.keywords : [],
      img: iu.normal || iu.large || iu.small || '',
      imgSmall: iu.small || iu.normal || ''
    };
    return withArt(def);
  }

  /* --------------------------------------------------------- deck reading */
  function readDeck() {
    let main = [], side = [];
    try { if (typeof pool !== 'undefined' && Array.isArray(pool)) main = pool; } catch (e) { /* not ready */ }
    try { if (typeof sideboard !== 'undefined' && Array.isArray(sideboard)) side = sideboard; } catch (e) { /* not ready */ }
    if (!main.length && !side.length) { main = loadJSON('dt_pool') || []; side = loadJSON('dt_sideboard') || []; }
    const names = a => [...new Set((a || []).filter(c => c && c.name && !BASICS.has(c.name)).map(c => c.name))];
    const m = names(main);
    const ml = new Set(m.map(n => n.toLowerCase()));
    const s = names(side).filter(n => !ml.has(n.toLowerCase()));
    return { main: m, side: s };
  }
  async function scanDeck(force) {
    const { main, side } = readDeck();
    const sig = JSON.stringify([main.slice().sort(), side.slice().sort()]);
    if (!force) {
      if (deckCache && deckCache.sig === sig) return deckCache;
      const c = loadJSON(K_DECK);
      if (c && c.sig === sig && Array.isArray(c.tokens)) { deckCache = c; return c; }
    }
    if (!main.length && !side.length) { deckCache = { sig, empty: true, tokens: [], cards: [] }; return deckCache; }

    const mainSet = new Set(main.map(n => n.toLowerCase()));
    const cards = await collection([...main, ...side].map(n => ({ name: n })));
    const parts = new Map();
    const deckCards = [];
    for (const c of cards) {
      const names = [c.name, (c.card_faces && c.card_faces[0] && c.card_faces[0].name) || ''].map(x => String(x).toLowerCase());
      const where = names.some(x => mainSet.has(x)) ? 'main' : 'side';
      const d = cardToDef(c, { copy: true });
      d.where = where;
      deckCards.push(d);
      for (const p of (c.all_parts || [])) {
        if (p.component !== 'token' || p.id === c.id) continue;
        let e = parts.get(p.id);
        if (!e) { e = { name: p.name || '', main: new Set(), side: new Set() }; parts.set(p.id, e); }
        e[where].add(d.name);
      }
    }
    const toks = parts.size ? await collection([...parts.keys()].map(id => ({ id }))) : [];
    const byKey = new Map();
    for (const t of toks) {
      const e = parts.get(t.id); if (!e) continue;
      const def = cardToDef(t, { face: e.name && !e.name.includes(' // ') ? e.name : null });
      let x = byKey.get(def.key);
      if (!x) { x = { def, main: new Set(), side: new Set() }; byKey.set(def.key, x); }
      e.main.forEach(n => x.main.add(n));
      e.side.forEach(n => x.side.add(n));
    }
    const tokens = [...byKey.values()]
      .map(x => ({ def: x.def, main: [...x.main].sort(), side: [...x.side].sort() }))
      .sort((a, b) => (b.main.length ? 1 : 0) - (a.main.length ? 1 : 0) || a.def.name.localeCompare(b.def.name));
    deckCards.sort((a, b) => (a.where === b.where ? 0 : a.where === 'main' ? -1 : 1) || a.name.localeCompare(b.name));
    deckCache = { sig, tokens, cards: deckCards, at: Date.now() };
    saveJSON(K_DECK, deckCache);
    return deckCache;
  }
  function getDeck(force) {
    if (scanning && !force) return scanning;
    const p = scanDeck(force);
    scanning = p;
    p.then(() => { if (scanning === p) scanning = null; }, () => { if (scanning === p) scanning = null; });
    return p;
  }
  async function searchTokens(q) {
    const cards = await search('t:token -is:digital ' + q, '&unique=cards&include_extras=true&order=name');
    const plain = !/[:<>=]/.test(q);
    const words = q.toLowerCase().split(/\s+/).filter(Boolean);
    const out = [], seen = new Set();
    for (const c of cards) {
      const multi = Array.isArray(c.card_faces) && c.card_faces.length > 1 && !c.image_uris;
      const faces = multi ? c.card_faces.map(f => f.name) : [null];
      for (const fn of faces) {
        const def = cardToDef(c, { face: fn });
        if (multi && plain) {
          const hay = (def.name + ' ' + def.type + ' ' + def.text).toLowerCase();
          if (!words.every(w => hay.includes(w))) continue;
        }
        if (seen.has(def.key)) continue;
        seen.add(def.key); out.push(def);
      }
    }
    return out.slice(0, 80);
  }
  async function artOptions(def) {
    if (!def.oracle) return [];
    const cards = await search('oracleid:' + def.oracle, '&unique=art&include_extras=true&order=released&dir=desc');
    const out = [], seen = new Set();
    for (const c of cards) {
      const f = faceFor(c, def.name);
      const iu = (f && f.image_uris) || c.image_uris || {};
      if (!iu.normal || seen.has(iu.normal)) continue;
      seen.add(iu.normal);
      out.push({ img: iu.normal, imgSmall: iu.small || iu.normal, set: String(c.set_name || c.set || '').replace(/ Tokens$/, '') });
    }
    return out;
  }

  /* ---------------------------------------------------------------- layout */
  function fit(n) {
    const W0 = boardEl.clientWidth, H0 = boardEl.clientHeight;
    const gap = Math.round(Math.max(12, Math.min(W0, H0) * 0.03));
    const pad = gap;
    const W = W0 - pad * 2, H = H0 - pad * 2;
    let best = 0;
    for (let cols = 1; cols <= n; cols++) {
      const rows = Math.ceil(n / cols);
      const w = Math.min((W - gap * (cols - 1)) / cols, ((H - gap * (rows - 1)) / rows) / R);
      if (w > best) best = w;
    }
    const cap = Math.sqrt(0.5 * W * H / R);   // a single card never takes more than half the table
    const cw = Math.floor(Math.max(Math.min(best, cap), Math.min(96, W))) - 1;
    return { cw, ch: Math.floor(cw * R), gap, pad };
  }

  /* ---------------------------------------------------------------- render */
  function tileHTML(x, cw, ch, ts) {
    const d = board.defs[x.g.key], b = x.b;
    const cls = ['tt-tile'];
    if (b.t) cls.push('tt-tapped');
    const a = anim.get(x.key); if (a) cls.push('tt-a-' + a);
    if (b.n === 2) cls.push('tt-s2'); else if (b.n > 2) cls.push('tt-s3');
    const fs = Math.max(10, cw * 0.075);
    const visH = b.t ? cw * ts : ch;
    const top = Math.round((ch - visH) / 2 - 8);
    const pt = (b.c && d.p != null) ? `<span class="tt-pt">${esc(ptOf(d, b.c))}</span>` : '';
    const sick = b.s ? '<span class="tt-sick" aria-hidden="true">💤</span>' : '';
    const count = b.n > 1 ? `<div class="tt-count" style="top:${top}px;font-size:${Math.round(Math.max(13, Math.min(20, cw * 0.07)))}px">×${b.n}</div>` : '';
    const lbl = `${d.name}, ${b.n}, ${b.t ? 'tapped' : 'untapped'}${b.s ? ', summoning sick' : ''}${b.c ? ', ' + ptOf(d, b.c) : ''}`;
    return `<div class="${cls.join(' ')}" data-key="${x.key}" role="button" tabindex="0" aria-label="${esc(lbl)}" style="width:${cw}px;height:${ch}px;--ts:${ts}">` +
      `<div class="tt-card${d.img ? '' : ' tt-noimg'}" style="font-size:${fs}px">` +
      `<div class="tt-fb"><div class="tt-fbn">${esc(d.name)}</div><div class="tt-fbt">${esc(d.type)}</div>${d.text ? `<div class="tt-fbx">${esc(d.text)}</div>` : ''}${d.p != null ? `<div class="tt-fbpt">${esc(ptOf(d, 0))}</div>` : ''}</div>` +
      (d.img ? `<img src="${esc(d.img)}" alt="" draggable="false" decoding="async">` : '') +
      sick + pt + `</div>${count}</div>`;
  }
  function render() {
    if (!root || root.hidden) return;
    const list = [];
    for (const g of board.groups) for (const b of g.b) list.push({ g, b, key: g.id + ':' + bk(b) });
    const total = list.reduce((s, x) => s + x.b.n, 0);
    const tapped = list.reduce((s, x) => s + (x.b.t ? x.b.n : 0), 0);
    $('tt-sum').textContent = total ? `${total} token${total === 1 ? '' : 's'}, ${tapped} tapped` : 'Empty table';
    $('tt-undo').disabled = !hist.length;
    if (!list.length) {
      grid.style.gap = ''; grid.style.padding = '16px';
      grid.innerHTML = `<div class="tt-empty"><div class="tt-empty-in"><div class="tt-empty-t">No tokens on the table</div>` +
        `<div class="tt-empty-s">Add the tokens your deck makes, search any token, or make a token copy of a card.</div>` +
        `<button class="tt-act tt-primary" id="tt-empty-add" style="width:100%">+ Add token</button></div></div>`;
      anim.clear();
      return;
    }
    const { cw, ch, gap, pad } = fit(list.length);
    grid.style.gap = gap + 'px';
    grid.style.padding = pad + 'px';
    const ts = cw / ch;
    grid.innerHTML = list.map(x => tileHTML(x, cw, ch, ts)).join('');
    anim.clear();
  }

  /* ----------------------------------------------------------- tile input */
  let lp = null, longFired = false, sx = 0, sy = 0;
  function wireGrid() {
    grid.addEventListener('pointerdown', e => {
      const tile = e.target.closest('.tt-tile'); if (!tile) return;
      longFired = false; sx = e.clientX; sy = e.clientY;
      clearTimeout(lp);
      lp = setTimeout(() => {
        longFired = true;
        tile.classList.add('tt-held');
        if (navigator.vibrate) try { navigator.vibrate(10); } catch (err) { /* ignore */ }
        openTokenSheet(tile.dataset.key);
      }, 450);
    });
    grid.addEventListener('pointermove', e => { if (Math.hypot(e.clientX - sx, e.clientY - sy) > 10) clearTimeout(lp); });
    ['pointerup', 'pointercancel', 'pointerleave'].forEach(ev => grid.addEventListener(ev, () => clearTimeout(lp)));
    grid.addEventListener('contextmenu', e => { if (e.target.closest('.tt-tile')) e.preventDefault(); });
    grid.addEventListener('click', e => {
      if (e.target.closest('#tt-empty-add')) { openAdd('deck'); return; }
      const tile = e.target.closest('.tt-tile'); if (!tile) return;
      if (longFired) { longFired = false; return; }
      handleTap(tile.dataset.key);
    });
    grid.addEventListener('keydown', e => {
      const tile = e.target.closest('.tt-tile'); if (!tile) return;
      if (e.key === 'Enter' && e.shiftKey) { e.preventDefault(); openTokenSheet(tile.dataset.key); }
      else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleTap(tile.dataset.key); }
    });
    grid.addEventListener('error', e => {
      if (e.target && e.target.tagName === 'IMG') { const c = e.target.closest('.tt-card'); if (c) c.classList.add('tt-noimg'); }
    }, true);
  }
  function handleTap(key) {
    const r = resolve(key); if (!r) return;
    if (r.b.n === 1) {
      const was = r.b.t;
      commit(() => {
        const nk = move(r.g.id, r.k, 1, x => { x.t = x.t ? 0 : 1; });
        if (nk) anim.set(nk, was ? 'untap' : 'tap');
      });
    } else {
      openTokenSheet(key);
    }
  }

  /* ---------------------------------------------------------------- sheets */
  function showSheet() { wrapEl.hidden = false; sheetEl.parentElement.scrollTop = 0; }
  function closeSheet() {
    if (!wrapEl) return;
    wrapEl.hidden = true; sheet = null;
    grid.querySelectorAll('.tt-held').forEach(t => t.classList.remove('tt-held'));
  }
  const thumb = d => `<span class="tt-thumb">${d.imgSmall ? `<img src="${esc(d.imgSmall)}" alt="" loading="lazy">` : ''}</span>`;
  const textHTML = s => esc(s).replace(/\n/g, '<br>');

  // --- one token / stack
  function openTokenSheet(key) {
    const r = resolve(key); if (!r) return;
    sheet = { mode: 'token', key, qty: r.b.n };
    renderTokenSheet(); showSheet();
  }
  function renderTokenSheet() {
    const r = resolve(sheet.key); if (!r) { closeSheet(); return; }
    const { b, d } = r;
    const n = b.n;
    sheet.qty = Math.min(Math.max(1, sheet.qty), n);
    const q = sheet.qty;
    const cr = isCreature(d);
    let status = b.t ? `${n} tapped` : (cr ? (b.s ? `${n} summoning sick` : `${n} ready`) : `${n} untapped`);
    if (b.c) status += `, each with ${b.c} +1/+1 counter${b.c > 1 ? 's' : ''}`;
    const note = (cr && b.s && !b.t) ? '<div class="tt-note">Summoning sick until your next untap. Give haste to attack now.</div>' :
      (cr && hasKw(d, 'Vigilance') && !b.t) ? '<div class="tt-note">Vigilance: attacking won’t tap these.</div>' : '';
    const acts = [];
    if (!b.t && cr && !b.s) acts.push(`<button class="tt-act tt-primary" data-a="attack">Attack with ${q}</button>`);
    if (b.t) acts.push(`<button class="tt-act tt-primary" data-a="untap">Untap ${q}</button>`);
    if (!b.t) acts.push(`<button class="tt-act" data-a="tap">Tap ${q}</button>`);
    if (cr && b.s && !b.t) acts.push(`<button class="tt-act" data-a="haste">Give ${q} haste</button>`);
    if (cr) acts.push(`<button class="tt-act" data-a="counter">+1/+1 counter on ${q}</button>`);
    if (cr && b.c) acts.push(`<button class="tt-act" data-a="uncounter">Remove a counter from ${q}</button>`);
    if (d.oracle) acts.push(`<button class="tt-act" data-a="art">Change art</button>`);
    const half = acts.filter(a => !a.includes('tt-primary')).length;
    acts.push(`<button class="tt-act tt-danger${half % 2 === 0 ? ' tt-wide' : ''}" data-a="remove">${sacText(d) ? 'Sacrifice' : 'Remove'} ${q}</button>`);
    const pt = cr ? ptOf(d, b.c) : '';
    sheetEl.innerHTML =
      `<div class="tt-shead">${thumb(d)}<div style="min-width:0">` +
      `<div class="tt-sname">${esc(d.name)}${pt ? ` <span class="tt-spt">${esc(pt)}</span>` : ''}</div>` +
      `<div class="tt-stype">${esc(d.type)}${d.copy ? ' (token copy)' : ''}</div>` +
      (d.text ? `<div class="tt-stext">${textHTML(d.text)}</div>` : '') +
      `</div></div>` +
      `<div class="tt-status">${status}</div>${note}` +
      (n > 1 ? `<div class="tt-stepper"><button data-q="-1" aria-label="One fewer">−</button><output>${q}</output><button data-q="1" aria-label="One more">+</button><button class="tt-all" data-q="all">All ${n}</button></div>` : '') +
      `<div class="tt-acts">${acts.join('')}</div>` +
      `<div class="tt-more"><span>Make more</span><button data-more="1">+1</button><button data-more="2">+2</button><button data-more="5">+5</button></div>`;
  }
  function doAct(a) {
    const r = resolve(sheet.key); if (!r) { closeSheet(); return; }
    const { g, b, d, k } = r;
    const q = Math.min(sheet.qty, b.n);
    const run = (fn, an) => { let nk = null; commit(() => { nk = move(g.id, k, q, fn); if (nk && an) anim.set(nk, an); }); return nk; };
    if (a === 'attack') {
      if (hasKw(d, 'Vigilance')) { closeSheet(); toast(`${q} attacking with vigilance, still untapped`); return; }
      run(x => { x.t = 1; }, 'tap'); closeSheet();
    } else if (a === 'tap') { run(x => { x.t = 1; }, 'tap'); closeSheet(); }
    else if (a === 'untap') { run(x => { x.t = 0; }, 'untap'); closeSheet(); }
    else if (a === 'haste' || a === 'counter' || a === 'uncounter') {
      const nk = run(x => { if (a === 'haste') x.s = 0; else if (a === 'counter') x.c += 1; else x.c -= 1; });
      if (nk) { sheet.key = nk; sheet.qty = q; renderTokenSheet(); } else closeSheet();
    } else if (a === 'remove') {
      run(x => { x.n = 0; }); closeSheet();
      toast(`${sacText(d) ? 'Sacrificed' : 'Removed'} ${tokLabel(q, d)}`, 'Undo', undo);
    } else if (a === 'art') {
      openArtSheet(g.key);
    }
  }

  // --- choose art
  async function openArtSheet(defKey) {
    const d = board.defs[defKey]; if (!d) return;
    sheet = { mode: 'art', defKey, opts: null, err: false };
    renderArtSheet(); showSheet();
    try { const opts = await artOptions(d); if (sheet && sheet.mode === 'art' && sheet.defKey === defKey) { sheet.opts = opts; renderArtSheet(); } }
    catch (e) { if (sheet && sheet.mode === 'art' && sheet.defKey === defKey) { sheet.err = true; renderArtSheet(); } }
  }
  function renderArtSheet() {
    const d = board.defs[sheet.defKey]; if (!d) { closeSheet(); return; }
    let body;
    if (sheet.err) body = `<div class="tt-msg">Couldn’t reach Scryfall. Check your signal, then try again.</div><button class="tt-act tt-wide" data-a="retry-art" style="width:100%">Try again</button>`;
    else if (!sheet.opts) body = '<div class="tt-msg">Loading arts…</div>';
    else if (sheet.opts.length < 2) body = '<div class="tt-msg">This token only has one art.</div>';
    else body = `<div class="tt-arts">${sheet.opts.map((o, i) =>
      `<button class="tt-art${o.img === d.img ? ' tt-on' : ''}" data-art="${i}" aria-label="Art from ${esc(o.set)}"><img src="${esc(o.imgSmall)}" alt="" loading="lazy"><span>${esc(o.set)}</span></button>`).join('')}</div>`;
    sheetEl.innerHTML = `<div class="tt-stitle">Choose art for ${esc(d.name)}</div>${body}<button class="tt-act tt-wide" data-a="close" style="width:100%;margin-top:12px">Close</button>`;
  }
  function setArt(defKey, o) {
    artPick[defKey] = { img: o.img, imgSmall: o.imgSmall };
    saveJSON(K_ART, artPick);
    if (board.defs[defKey]) { board.defs[defKey].img = o.img; board.defs[defKey].imgSmall = o.imgSmall; }
    saveBoard(); closeSheet(); render();
    toast('Art updated');
  }

  // --- add tokens
  function openAdd(tab) {
    sheet = { mode: 'add', tab: tab || 'deck', sel: null, qty: 1, q: '', cq: '', list: [], seq: 0, err: false };
    renderAddShell(); showSheet(); loadTab();
  }
  function renderAddShell() {
    const tabs = [['deck', 'Your deck'], ['search', 'Search'], ['copy', 'Copy a card']];
    sheetEl.innerHTML =
      `<div class="tt-stitle">Add a token</div>` +
      `<div class="tt-tabs">${tabs.map(([k, l]) => `<button class="tt-tab${sheet.tab === k ? ' tt-on' : ''}" data-tab="${k}">${l}</button>`).join('')}</div>` +
      (sheet.tab === 'search' ? `<input class="tt-input" id="tt-q" type="search" placeholder="Search any token, like Elf Warrior or Treasure" autocomplete="off" autocorrect="off" spellcheck="false" value="${esc(sheet.q)}">` : '') +
      (sheet.tab === 'copy' ? `<input class="tt-input" id="tt-cq" type="search" placeholder="Filter your deck’s cards" autocomplete="off" autocorrect="off" spellcheck="false" value="${esc(sheet.cq)}">` : '') +
      `<div class="tt-list" id="tt-list"></div>` +
      `<div id="tt-foot"></div>`;
    updateFoot();
  }
  function setList(html) { const el = $('tt-list'); if (el) el.innerHTML = html; }
  function rowHTML(d, sub, i) {
    const on = sheet.sel && sheet.sel.key === d.key;
    return `<button class="tt-row${on ? ' tt-on' : ''}" data-pick="${i}">${thumb(d)}<span class="tt-rt"><span class="tt-rn">${esc(d.name)}</span><span class="tt-rs">${esc(sub)}</span></span>${d.p != null ? `<span class="tt-rp">${esc(ptOf(d, 0))}</span>` : ''}</button>`;
  }
  const madeBy = a => 'Made by ' + (a.length > 3 ? a.slice(0, 3).join(', ') + ` +${a.length - 3} more` : a.join(', '));
  function loadTab(force) {
    if (!sheet || sheet.mode !== 'add') return;
    const tab = sheet.tab;
    if (tab === 'search') { runSearch(); return; }
    setList('<div class="tt-msg">' + (tab === 'deck' ? 'Finding your deck’s tokens…' : 'Loading your deck…') + '</div>');
    getDeck(!!force).then(c => {
      if (!sheet || sheet.mode !== 'add' || sheet.tab !== tab) return;
      if (tab === 'deck') renderDeckTab(c); else renderCopyTab(c);
    }).catch(() => {
      if (!sheet || sheet.mode !== 'add' || sheet.tab !== tab) return;
      setList('<div class="tt-msg">Couldn’t reach Scryfall. Check your signal, then try again.</div><button class="tt-act" data-retry="1" style="width:100%">Try again</button>');
    });
  }
  function renderDeckTab(c) {
    sheet.list = [];
    if (c.empty) { setList('<div class="tt-msg">Your deck is empty. Draft or import a deck first, or use Search to find any token.</div>'); return; }
    if (!c.tokens.length) {
      setList('<div class="tt-msg">Nothing in your deck makes a token. Use Search to find any token, or Copy a card.</div><button class="tt-link" data-refresh="1">Deck changed? Check again</button>');
      return;
    }
    let html = '';
    const main = c.tokens.filter(x => x.main.length), side = c.tokens.filter(x => !x.main.length);
    if (main.length) {
      html += '<div class="tt-sec">From your deck</div>';
      main.forEach(x => { const d = withArt(x.def); sheet.list.push(d); html += rowHTML(d, madeBy(x.main), sheet.list.length - 1); });
    }
    if (side.length) {
      html += '<div class="tt-sec">From your sideboard</div>';
      side.forEach(x => { const d = withArt(x.def); sheet.list.push(d); html += rowHTML(d, madeBy(x.side), sheet.list.length - 1); });
    }
    html += '<button class="tt-link" data-refresh="1">Deck changed? Check again</button>';
    setList(html);
  }
  function renderCopyTab(c) {
    sheet.list = [];
    if (c.empty || !c.cards.length) { setList('<div class="tt-msg">Your deck is empty. Draft or import a deck first.</div>'); return; }
    const f = sheet.cq.trim().toLowerCase();
    const cards = c.cards.filter(d => !f || d.name.toLowerCase().includes(f));
    if (!cards.length) { setList('<div class="tt-msg">No card in your deck matches that.</div>'); return; }
    let html = '', last = null;
    cards.forEach(x => {
      if (x.where !== last) { html += `<div class="tt-sec">${x.where === 'main' ? 'Your deck' : 'Your sideboard'}</div>`; last = x.where; }
      const d = withArt(x); sheet.list.push(d);
      html += rowHTML(d, d.type, sheet.list.length - 1);
    });
    setList(html);
  }
  let searchT = null;
  function runSearch() {
    const q = sheet.q.trim();
    clearTimeout(searchT);
    if (q.length < 2) { sheet.list = []; setList('<div class="tt-msg">Type at least two letters of a token’s name.</div>'); return; }
    setList('<div class="tt-msg">Searching Scryfall…</div>');
    const seq = ++sheet.seq;
    searchT = setTimeout(() => {
      searchTokens(q).then(defs => {
        if (!sheet || sheet.mode !== 'add' || sheet.tab !== 'search' || sheet.seq !== seq) return;
        sheet.list = defs;
        if (!defs.length) { setList(`<div class="tt-msg">No token matches “${esc(q)}”.</div>`); return; }
        setList(defs.map((d, i) => rowHTML(d, d.text ? d.text.replace(/\n/g, ' ') : d.type, i)).join(''));
      }).catch(() => {
        if (!sheet || sheet.seq !== seq) return;
        setList('<div class="tt-msg">Couldn’t reach Scryfall. Check your signal, then try again.</div>');
      });
    }, 350);
  }
  function updateFoot() {
    const el = $('tt-foot'); if (!el) return;
    const qs = [1, 2, 3, 5, 10, 20];
    const sel = sheet.sel;
    el.innerHTML =
      `<div class="tt-chips"><button class="tt-chip" data-step="-1" aria-label="One fewer">−</button>` +
      qs.map(n => `<button class="tt-chip${sheet.qty === n ? ' tt-on' : ''}" data-chip="${n}">${n}</button>`).join('') +
      `<button class="tt-chip" data-step="1" aria-label="One more">+</button></div>` +
      `<button class="tt-act tt-primary tt-create" data-create="1"${sel ? '' : ' disabled'}>` +
      (sel ? `Create ${esc(tokLabel(sheet.qty, sel))}` : (sheet.qty > 1 ? `Pick a token (${sheet.qty})` : 'Pick a token')) + `</button>`;
  }

  function wireSheet() {
    $('tt-scrim').addEventListener('click', closeSheet);
    sheetEl.addEventListener('click', e => {
      if (!sheet) return;
      const t = e.target.closest('button'); if (!t) return;
      if (sheet.mode === 'token') {
        const r = resolve(sheet.key); if (!r) { closeSheet(); return; }
        if (t.dataset.q) { sheet.qty = t.dataset.q === 'all' ? r.b.n : sheet.qty + (+t.dataset.q); renderTokenSheet(); }
        else if (t.dataset.a) doAct(t.dataset.a);
        else if (t.dataset.more) {
          const m = +t.dataset.more, d = r.d;
          commit(() => addTokens(d, m));
          closeSheet(); toast(`Created ${tokLabel(m, d)}`);
        }
      } else if (sheet.mode === 'art') {
        if (t.dataset.a === 'retry-art') { openArtSheet(sheet.defKey); return; }
        if (t.dataset.a === 'close') { closeSheet(); return; }
        if (t.dataset.art != null && sheet.opts) setArt(sheet.defKey, sheet.opts[+t.dataset.art]);
      } else if (sheet.mode === 'add') {
        if (t.dataset.tab) {
          if (t.dataset.tab === sheet.tab) return;
          sheet.tab = t.dataset.tab; sheet.sel = null; sheet.list = [];
          renderAddShell(); loadTab();
        } else if (t.dataset.pick != null) {
          sheet.sel = sheet.list[+t.dataset.pick] || null;
          $('tt-list').querySelectorAll('.tt-row').forEach(rw => rw.classList.toggle('tt-on', rw === t));
          updateFoot();
        } else if (t.dataset.chip) { sheet.qty = +t.dataset.chip; updateFoot(); }
        else if (t.dataset.step) { sheet.qty = Math.max(1, Math.min(99, sheet.qty + (+t.dataset.step))); updateFoot(); }
        else if (t.dataset.refresh || t.dataset.retry) { loadTab(true); }
        else if (t.dataset.create && sheet.sel) {
          const d = sheet.sel, n = sheet.qty;
          commit(() => addTokens(d, n));
          closeSheet(); toast(`Created ${tokLabel(n, d)}`);
        }
      }
    });
    sheetEl.addEventListener('input', e => {
      if (!sheet || sheet.mode !== 'add') return;
      if (e.target.id === 'tt-q') { sheet.q = e.target.value; sheet.sel = null; updateFoot(); runSearch(); }
      if (e.target.id === 'tt-cq') { sheet.cq = e.target.value; sheet.sel = null; updateFoot(); if (deckCache) renderCopyTab(deckCache); }
    });
  }

  /* ----------------------------------------------------------------- toast */
  let toastT = null;
  function toast(msg, label, fn) {
    const el = $('tt-toast'); if (!el) return;
    $('tt-toastmsg').textContent = msg;
    const b = $('tt-toastact');
    if (label) { b.hidden = false; b.textContent = label; b.onclick = () => { el.hidden = true; fn(); }; }
    else { b.hidden = true; b.onclick = null; }
    el.hidden = false;
    clearTimeout(toastT);
    toastT = setTimeout(() => { el.hidden = true; }, label ? 6000 : 2600);
  }

  /* ------------------------------------------------------ keep screen on */
  let wl = null;
  async function keepAwake() {
    try {
      if ('wakeLock' in navigator && !wl && root && !root.hidden) {
        wl = await navigator.wakeLock.request('screen');
        wl.addEventListener('release', () => { wl = null; });
      }
    } catch (e) { wl = null; }
  }
  function releaseAwake() { try { if (wl) wl.release(); } catch (e) { /* ignore */ } wl = null; }

  /* ------------------------------------------------------------ open/close */
  function build() {
    root = document.createElement('div');
    root.id = 'tt-root'; root.className = 'tt-root'; root.hidden = true;
    root.setAttribute('role', 'dialog'); root.setAttribute('aria-label', 'Tokens');
    root.innerHTML =
      `<header class="tt-top">` +
      `<button class="tt-hbtn" id="tt-back" aria-label="Back to your deck">‹ Deck</button>` +
      `<div class="tt-title"><div class="tt-h1">⬡ Tokens</div><div class="tt-sum" id="tt-sum"></div></div>` +
      `<button class="tt-hbtn" id="tt-undo" disabled>↶ Undo</button>` +
      `<button class="tt-hbtn" id="tt-clear">Clear</button>` +
      `</header>` +
      `<main class="tt-board" id="tt-board"><div class="tt-grid" id="tt-grid"></div></main>` +
      `<footer class="tt-bottom" id="tt-bottom">` +
      `<button class="tt-bar" id="tt-turn">Untap all</button>` +
      `<button class="tt-bar tt-gold" id="tt-add">+ Add token</button>` +
      `</footer>` +
      `<div class="tt-sheetwrap" id="tt-wrap" hidden><div class="tt-scrim" id="tt-scrim"></div>` +
      `<div class="tt-sheet" role="dialog" aria-modal="true"><div class="tt-grab"></div><div id="tt-sheet"></div></div></div>` +
      `<div class="tt-toast" id="tt-toast" role="status" hidden><span id="tt-toastmsg"></span><button id="tt-toastact" hidden></button></div>`;
    document.body.appendChild(root);
    grid = $('tt-grid'); boardEl = $('tt-board'); wrapEl = $('tt-wrap'); sheetEl = $('tt-sheet');
    wireGrid(); wireSheet();

    $('tt-back').addEventListener('click', close);
    $('tt-undo').addEventListener('click', undo);
    $('tt-add').addEventListener('click', () => openAdd('deck'));
    $('tt-turn').addEventListener('click', () => {
      if (!board.groups.length) return;
      commit(() => {
        for (const g of board.groups) {
          const had = g.b.some(b => b.t);
          g.b.forEach(b => { b.t = 0; b.s = 0; });
          norm(g);
          if (had) g.b.forEach(b => anim.set(g.id + ':' + bk(b), 'untap'));
        }
      });
      toast('New turn: everything untapped');
    });
    let armed = 0, armT = null;
    const clr = $('tt-clear');
    clr.addEventListener('click', () => {
      if (!board.groups.length) return;
      if (armed && Date.now() - armed < 3000) {
        armed = 0; clearTimeout(armT); clr.textContent = 'Clear'; clr.classList.remove('tt-armed');
        commit(() => { board.groups = []; });
        toast('Cleared the table', 'Undo', undo);
      } else {
        armed = Date.now(); clr.textContent = 'Sure?'; clr.classList.add('tt-armed');
        clearTimeout(armT);
        armT = setTimeout(() => { armed = 0; clr.textContent = 'Clear'; clr.classList.remove('tt-armed'); }, 3000);
      }
    });
    root.addEventListener('pointerdown', keepAwake, { passive: true });
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') keepAwake(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && root && !root.hidden && sheet) closeSheet(); });
    let raf = 0;
    new ResizeObserver(() => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => { syncFoot(); render(); });
    }).observe(boardEl);
  }
  function syncFoot() {
    const f = $('tt-bottom'); if (f) root.style.setProperty('--tt-foot', f.offsetHeight + 'px');
  }
  function open() {
    if (!root) build();
    root.hidden = false;
    document.documentElement.classList.add('tt-open');
    syncFoot(); render(); keepAwake();
    getDeck(false).catch(() => { /* shown when the Add sheet opens */ });
    if (!board.groups.length) openAdd('deck');
  }
  function close() {
    closeSheet();
    if (root) root.hidden = true;
    document.documentElement.classList.remove('tt-open');
    releaseAwake();
  }

  /* -------------------------------------------------------------- start up */
  function init() {
    if (!document.getElementById('tt-style')) {
      const st = document.createElement('style');
      st.id = 'tt-style'; st.textContent = CSS;
      document.head.appendChild(st);
    }
    const nav = document.querySelector('.global-nav');
    if (nav && !document.getElementById('tt-nav')) {
      const b = document.createElement('button');
      b.id = 'tt-nav'; b.className = 'tt-nav'; b.type = 'button';
      b.innerHTML = '<span class="tt-nav-icon">⬡</span><span class="tt-nav-label">Tokens</span>';
      b.addEventListener('click', open);
      nav.appendChild(b);
    }
  }
  window.DTTokens = { open, close };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
