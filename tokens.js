/* ==========================================================================
   Draft Table — Tokens  (tokens.js)
   --------------------------------------------------------------------------
   Adds a "Tokens" tab to the bottom nav. It opens a full-screen token board
   for playing a game with the deck you built:
     - finds every token your deck and sideboard can make (via Scryfall)
     - search any token on Scryfall, or make a token copy of a deck card
     - tap / untap, stacks, a spread-out tray, attack, +1/+1 and -1/-1
       counters, summoning sickness, undo, untap all
     - reads each token's abilities: Treasure, Clue, Food, Blood, Gold,
       Powerstone, Eldrazi Spawn and the like (tap once, tap again to
       sacrifice), a mana color wheel and a floating mana pool
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
.tt-root button:focus-visible,.tt-root input:focus-visible,.tt-face:focus-visible .tt-card{outline:3px solid var(--gold-trim2,#e8cc60);outline-offset:2px}

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
.tt-tile{position:relative;flex:0 0 auto;-webkit-touch-callout:none}
.tt-face{position:absolute;inset:0;pointer-events:none;outline:none}
.tt-face .tt-card{pointer-events:auto;cursor:pointer;-webkit-touch-callout:none}
.tt-face.tt-tapped{z-index:2}
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
.tt-face.tt-tapped .tt-card{transform:translateY(var(--dy,0px)) rotate(90deg) scale(var(--ts));filter:brightness(.8) saturate(.85)}
.tt-a-tap .tt-card{animation:tt-tap .22s ease-out}
.tt-a-untap .tt-card{animation:tt-untap .22s ease-out}
@keyframes tt-tap{from{transform:none}to{transform:translateY(var(--dy,0px)) rotate(90deg) scale(var(--ts))}}
@keyframes tt-untap{from{transform:translateY(var(--dy,0px)) rotate(90deg) scale(var(--ts))}to{transform:none}}
.tt-face .tt-card:active,.tt-face.tt-held .tt-card{filter:brightness(1.1)}
.tt-face.tt-tapped .tt-card:active,.tt-face.tt-tapped.tt-held .tt-card{filter:brightness(.92) saturate(.85)}
.tt-count{position:absolute;left:-8px;z-index:4;min-width:2.2em;height:2.2em;padding:0 .45em;border-radius:999px;display:grid;place-items:center;
  background:radial-gradient(circle at 40% 35%,#f4dc80,#c8a030 55%,#906010);color:#1a0c00;border:2px solid #1a1208;
  font-family:'Cinzel',serif;font-weight:700;box-shadow:0 3px 8px rgba(0,0,0,.6);cursor:pointer}
.tt-count::after{content:'';position:absolute;inset:-10px}
.tt-count:active{transform:scale(.92)}
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

.tt-toast{position:absolute;left:50%;transform:translateX(-50%);bottom:calc(var(--tt-foot,72px) + 10px);z-index:8;display:flex;align-items:center;gap:12px;
  width:max-content;max-width:calc(100% - 24px);background:#e8dac0;border:2px solid var(--gold-trim3,#906010);border-radius:8px;padding:9px 10px 9px 14px;color:#1a1208;
  font-size:15px;font-weight:600;box-shadow:0 16px 48px rgba(0,0,0,.9)}
.tt-toast[hidden]{display:none}
.tt-layer .tt-toast{bottom:auto;top:calc(env(safe-area-inset-top,0px) + 60px)}
.tt-toast button{flex:0 0 auto;background:linear-gradient(180deg,#e8cc70,#c09020);border:1px solid #7a5010;border-radius:5px;color:#1a0c00;padding:7px 10px;
  font-family:'Barlow Condensed',sans-serif!important;font-size:14px;font-weight:800;letter-spacing:.05em;white-space:nowrap}
.tt-toast button[hidden]{display:none}

.tt-ctr{position:absolute;left:5%;top:11.5%;font-family:'Cinzel',serif;font-weight:700;font-size:.85em;line-height:1.2;padding:.08em .45em;border-radius:.35em;border:2px solid #1a1208;box-shadow:0 2px 6px rgba(0,0,0,.6)}
.tt-plus{background:linear-gradient(180deg,#86cc72,#2f7a2a)!important;color:#fff!important;text-shadow:0 1px 1px rgba(0,0,0,.5)}
.tt-minus{background:linear-gradient(180deg,#e8806a,#8a1808)!important;color:#fff!important;text-shadow:0 1px 1px rgba(0,0,0,.5)}
.tt-hint{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);z-index:4;max-width:96%;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
  background:rgba(26,20,8,.93);color:#e8cc60;border:2px solid #c8a030;border-radius:999px;padding:.35em .85em;
  font-family:'Barlow Condensed',sans-serif;font-weight:800;letter-spacing:.05em;text-transform:uppercase;box-shadow:0 4px 14px rgba(0,0,0,.75);pointer-events:none}

.tt-pool{flex:0 0 auto;display:flex;align-items:center;gap:8px;padding:6px 10px;background:linear-gradient(180deg,#1a1408,#120e06);border-bottom:2px solid rgba(200,160,48,.4);position:relative;z-index:2}
.tt-pool[hidden]{display:none}
.tt-plabel{font-family:'Barlow Condensed',sans-serif;font-size:11px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:#c8a030;white-space:nowrap}
.tt-pips{display:flex;gap:6px;flex:1;flex-wrap:wrap;min-width:0}
.tt-pip{display:flex;align-items:center;gap:5px;height:36px;padding:0 11px 0 5px;border-radius:999px;border:1px solid rgba(200,160,48,.5);background:rgba(0,0,0,.45);color:#e8cc60;
  font-family:'Cinzel',serif!important;font-weight:700;font-size:16px}
.tt-pip:active{transform:scale(.94)}
.tt-pempty{height:32px;padding:0 10px;border-radius:6px;border:1px solid rgba(200,160,48,.35);background:rgba(0,0,0,.3);color:#c8a030;
  font-family:'Barlow Condensed',sans-serif!important;font-size:12px;font-weight:800;letter-spacing:.06em;text-transform:uppercase}
.tt-mana{position:relative;display:inline-grid;place-items:center;flex:0 0 auto;border-radius:50%;box-shadow:0 1px 3px rgba(0,0,0,.5)}
.tt-mana i{font-style:normal;font-family:'Barlow Condensed',sans-serif;font-weight:800;font-size:.55em}
.tt-mana img{position:absolute;inset:0;width:100%;height:100%}
.tt-m-W{background:radial-gradient(circle at 40% 35%,#f8f0d0,#c8a830);color:#3a2800}
.tt-m-U{background:radial-gradient(circle at 40% 35%,#80b8e8,#2060b0);color:#fff}
.tt-m-B{background:radial-gradient(circle at 40% 35%,#806880,#280828);color:#e0c8e0}
.tt-m-R{background:radial-gradient(circle at 40% 35%,#f09060,#b02808);color:#fff}
.tt-m-G{background:radial-gradient(circle at 40% 35%,#50a860,#0e5818);color:#fff}
.tt-m-C{background:radial-gradient(circle at 40% 35%,#d8d0c8,#7a7068);color:#1a1208}

.tt-qlabel{margin-top:12px;font-family:'Barlow Condensed',sans-serif;font-size:12px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:#8a7a60}
.tt-qrow{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:6px;margin-top:6px}
.tt-qbtn{height:44px;border-radius:6px;border:1px solid #c8b080;background:#d8c8a0;color:#1a1208;font-family:'Cinzel',serif!important;font-size:17px;font-weight:700;box-shadow:0 1px 3px rgba(0,0,0,.2)}
.tt-qbtn.tt-on{background:linear-gradient(180deg,#e8d898,#c8a830);border-color:#906010;box-shadow:inset 0 0 0 1px #906010}
.tt-qall{grid-column:span 2;font-size:15px}
.tt-act small{display:block;font-family:'Crimson Pro',serif;font-size:13px;font-weight:600;letter-spacing:0;text-transform:none;opacity:.8;margin-top:2px}

.tt-traywrap{position:absolute;inset:0;z-index:4;display:flex;align-items:flex-end;justify-content:center}
.tt-traywrap[hidden]{display:none}
.tt-tray{position:relative;width:100%;height:80%;display:flex;flex-direction:column;
  background:radial-gradient(ellipse 80% 60% at 50% 40%,#2a1e0c 0%,#0e0a04 75%);border-top:3px solid var(--gold-trim3,#906010);border-radius:16px 16px 0 0;
  box-shadow:0 -12px 40px rgba(0,0,0,.85);padding-bottom:env(safe-area-inset-bottom,0px);animation:tt-up .2s ease-out}
.tt-trayhead{flex:0 0 auto;display:flex;align-items:center;gap:10px;padding:10px 12px;border-bottom:1px solid rgba(200,160,48,.3)}
.tt-traytitle{flex:1;min-width:0}
.tt-trayname{font-family:'Cinzel',serif;font-size:17px;font-weight:700;color:var(--gold-trim2,#e8cc60);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.tt-traysub{font-family:'Barlow Condensed',sans-serif;font-size:12px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#c8a030}
.tt-traygrid{flex:1;min-height:0;overflow-y:auto;overflow-x:hidden;display:flex;flex-wrap:wrap;justify-content:center;align-content:center;-webkit-overflow-scrolling:touch}

.tt-wheelwrap{position:absolute;inset:0;z-index:6;display:flex;align-items:center;justify-content:center;padding:16px}
.tt-wheelwrap[hidden]{display:none}
.tt-wheel{position:relative;width:min(340px,100%);color:#1a1208;text-align:center;border:3px solid #1a1208;border-radius:16px;padding:14px 14px 12px;
  background:linear-gradient(180deg,#e8dac0,#e0d0b0);box-shadow:0 16px 60px rgba(0,0,0,.9);animation:tt-up .18s ease-out}
.tt-wtitle{font-family:'Cinzel',serif;font-size:17px;font-weight:700;line-height:1.2}
.tt-wsub{font-family:'Barlow Condensed',sans-serif;font-size:13px;font-weight:700;color:#8a7a60;letter-spacing:.06em;text-transform:uppercase;margin-top:2px}
.tt-ring{position:relative;width:250px;height:250px;margin:4px auto 2px}
.tt-wbtn{position:absolute;width:70px;height:70px;margin:-35px 0 0 -35px;border-radius:50%;border:3px solid #1a1208;padding:0;background:#1a1208;display:grid;place-items:center;box-shadow:0 4px 10px rgba(0,0,0,.45)}
.tt-wbtn:active{transform:scale(.9)}
.tt-center{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);pointer-events:none}
.tt-left{font-family:'Cinzel',serif;font-size:42px;font-weight:900;line-height:1}
.tt-leftl{font-family:'Barlow Condensed',sans-serif;font-size:12px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:#8a7a60}
.tt-picked{min-height:30px;display:flex;justify-content:center;align-items:center;gap:4px;flex-wrap:wrap}
.tt-wbtns{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px}
.tt-hbtn.tt-hadd{background:linear-gradient(180deg,#e8cc70 0%,#c09020 40%,#a07010 60%,#c8a030 100%);border-color:#7a5010;color:#1a0c00}
.tt-hbtn.tt-icon{width:38px;padding:0;font-size:18px;letter-spacing:0}
.tt-board{touch-action:pan-y}
.tt-bottom{min-height:calc(66px + env(safe-area-inset-bottom,0px))}
.tt-bar{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px;line-height:1.05;min-width:0;padding:0 6px}
.tt-bar b{font-weight:700;white-space:nowrap}
.tt-bar small{font-family:'Barlow Condensed',sans-serif;font-size:12px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;opacity:.85;white-space:nowrap}
.tt-bar.tt-atk{background:linear-gradient(180deg,#b03018,#7a1808);border-color:#e06040;color:#fff3e0}
.tt-bar[hidden]{display:none}
.tt-bhint{flex:1;align-self:center;text-align:center;font-family:'Barlow Condensed',sans-serif;font-size:14px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#a08850}
.tt-bhint[hidden]{display:none}
.tt-lane{flex:0 0 100%;height:0}
.tt-addhead{display:flex;align-items:flex-start;gap:12px;margin:0 0 10px}
.tt-addhead .tt-stitle{margin:0;flex:0 0 auto}
.tt-tip{flex:1;text-align:right;font-size:13px;line-height:1.25;color:#6a5a40;font-style:italic;padding-top:3px}
.tt-tip b{font-style:normal;color:#906010}
.tt-drawwrap{position:absolute;inset:0;z-index:4}
.tt-drawwrap[hidden]{display:none}
.tt-drawer{position:absolute;left:0;top:0;bottom:0;width:min(330px,86%);display:flex;flex-direction:column;color:#1a1208;
  padding:env(safe-area-inset-top,0px) 0 env(safe-area-inset-bottom,0px) env(safe-area-inset-left,0px);
  background:linear-gradient(180deg,#e8dac0,#e0d0b0);border-right:3px solid #1a1208;box-shadow:12px 0 40px rgba(0,0,0,.85);animation:tt-in .2s ease-out;touch-action:pan-y}
@keyframes tt-in{from{transform:translateX(-100%)}to{transform:none}}
.tt-drawhead{flex:0 0 auto;display:flex;align-items:center;gap:8px;padding:10px 10px 8px 14px;border-bottom:1px solid #c8b080}
.tt-drawtitle{flex:1;min-width:0;font-family:'Cinzel',serif;font-size:17px;font-weight:700}
.tt-drawsub{font-family:'Barlow Condensed',sans-serif;font-size:12px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#8a7a60}
.tt-drawx{width:38px;height:38px;border-radius:6px;border:1px solid #c8b080;background:#d8c8a0;color:#1a1208;font-size:18px}
.tt-drawlist{flex:1;min-height:0;overflow-y:auto;-webkit-overflow-scrolling:touch;padding:4px 10px 10px;display:flex;flex-direction:column;gap:5px}
.tt-drawlist .tt-row{position:relative}
.tt-drawlist .tt-row:active,.tt-drawlist .tt-row.tt-held{background:#ecdcb4}
.tt-dplus{flex:0 0 auto;width:34px;height:34px;border-radius:50%;display:grid;place-items:center;font-family:'Cinzel',serif;font-size:20px;font-weight:900;
  background:radial-gradient(circle at 40% 35%,#f4dc80,#c8a030 55%,#906010);border:2px solid #1a1208;color:#1a0c00}
.tt-have{font-family:'Barlow Condensed',sans-serif;font-size:12px;font-weight:800;color:#906010}
.tt-drawfoot{flex:0 0 auto;display:flex;gap:6px;padding:8px 10px;border-top:1px solid #c8b080}
.tt-drawfoot .tt-act{flex:1;margin:0}
.tt-menu{position:absolute;right:8px;top:calc(env(safe-area-inset-top,0px) + 52px);z-index:7;min-width:200px;padding:5px;border-radius:10px;
  background:linear-gradient(180deg,#e8dac0,#e0d0b0);border:2px solid #1a1208;box-shadow:0 12px 40px rgba(0,0,0,.85);display:flex;flex-direction:column;gap:4px}
.tt-menu[hidden]{display:none}
.tt-mi{height:44px;text-align:left;padding:0 12px;border-radius:6px;border:1px solid #c8b080;background:#e0d0b0;color:#1a1208;font-size:16px;font-weight:700}
.tt-mi.tt-armed{background:#8a1808;border-color:#c03020;color:#fff}
@media (prefers-reduced-motion: reduce){.tt-drawer,.tt-face .tt-card,.tt-sheet,.tt-tray,.tt-wheel{animation:none!important;transition:none!important}}
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
  const MANA_ORDER = ['W', 'U', 'B', 'R', 'G', 'C'];
  const COLOR_NAMES = { W: 'white', U: 'blue', B: 'black', R: 'red', G: 'green', C: 'colorless' };
  const manaIcon = (c, size) => `<span class="tt-mana tt-m-${c}" style="width:${size}px;height:${size}px;font-size:${size}px"><i>${c}</i><img src="https://svgs.scryfall.io/card-symbols/${c}.svg" alt="" onerror="this.remove()"></span>`;
  const manaText = add => MANA_ORDER.filter(c => add[c]).map(c => `${add[c]} ${COLOR_NAMES[c]}`).join(', ');
  const lowerFirst = t => t ? t.charAt(0).toLowerCase() + t.slice(1) : t;
  const shortEff = (ab, max) => { const t = lowerFirst(ab.effect); max = max || 24; return t.length > max ? t.slice(0, max - 1).trimEnd() + '…' : t; };

  /* ------------------------------------------------- reading token abilities
     Scryfall writes activated abilities as "COST: EFFECT." with the same
     wording everywhere ("{T}, Sacrifice this artifact: Add one mana of any
     color."), so the board can read any token's abilities, not just a list
     of known ones. Mana effects are done for you; anything else (draw a card,
     gain life, scry...) is shown as a reminder. */
  const NUMS = { a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5 };
  function parseMana(s) {
    s = s.trim();
    if (!/^add /i.test(s)) return null;
    let m = s.match(/^add (one|two|three|four|five) mana of any (one )?colou?r/i);
    if (m) return { count: NUMS[m[1].toLowerCase()], choices: ['W', 'U', 'B', 'R', 'G'], same: !!m[2] };
    m = s.match(/^add (one|two|three) mana of any type/i);
    if (m) return { count: NUMS[m[1].toLowerCase()], choices: ['W', 'U', 'B', 'R', 'G', 'C'] };
    const head = s.split('.')[0];
    const syms = [...head.matchAll(/\{([WUBRGC])\}/g)].map(x => x[1]);
    if (!syms.length) return null;
    if (/\bor\b/i.test(head)) return { count: 1, choices: [...new Set(syms)] };
    const fixed = {};
    syms.forEach(c => { fixed[c] = (fixed[c] || 0) + 1; });
    return { fixed };
  }
  function parseAbilities(text, name) {
    const out = [];
    const selfName = String(name || '').toLowerCase();
    String(text || '').split('\n').forEach(line => {
      const clean = line.replace(/\([^)]*\)/g, '').trim();
      const i = clean.indexOf(': ');
      if (i < 0) return;
      const cost = clean.slice(0, i).trim(), eff = clean.slice(i + 2).trim();
      if (/^(when|whenever|at|as long|if|as)\b/i.test(cost) || cost.includes('.')) return;
      const ab = { tap: false, sac: false, manaCost: '', other: [], effect: '', note: '', mana: null };
      let ok = true;
      cost.split(/,\s*/).forEach(p => {
        if (/^\{T\}$/i.test(p)) ab.tap = true;
        else if (/^(\{[0-9WUBRGCSX\/]+\})+$/i.test(p)) ab.manaCost += p;
        else if (/^sacrifice (this\b|it$|~)/i.test(p) || (selfName && p.toLowerCase() === 'sacrifice ' + selfName)) ab.sac = true;
        else if (/^\{Q\}$/i.test(p)) ok = false;
        else if (p) ab.other.push(p);
      });
      if (!ok) return;
      const sents = eff.replace(/\.\s+/g, '.\n').split('\n').map(x => x.trim()).filter(Boolean);
      ab.effect = (sents[0] || '').replace(/\.$/, '');
      ab.note = sents.slice(1).join(' ');
      if (!ab.effect || /^transform\b/i.test(ab.effect)) return;
      ab.mana = parseMana(sents[0] || '');
      out.push(ab);
    });
    return out;
  }
  const abCache = new Map();
  function abilitiesOf(d) {
    const k = d.key + '|' + d.text;
    if (!abCache.has(k)) abCache.set(k, parseAbilities(d.text, d.name));
    return abCache.get(k);
  }
  // The ability a Treasure-style token uses on its second tap (noncreature tokens only)
  function sacAbility(d) {
    if (isCreature(d)) return null;
    const sacs = abilitiesOf(d).filter(a => a.sac);
    return sacs.find(a => a.mana) || sacs[0] || null;
  }
  function costNote(ab) {
    const bits = [];
    if (ab.manaCost) bits.push('pay ' + ab.manaCost.replace(/[{}]/g, ''));
    ab.other.forEach(o => bits.push(lowerFirst(o)));
    if (/activate only as a sorcery/i.test(ab.note)) bits.push('sorcery speed');
    return bits.length ? 'Also ' + bits.join(', ') : '';
  }
  // "Whenever this creature attacks, create a Treasure token." -> {n:1, name:'Treasure'}
  function attackTrigger(d) {
    const m = String(d.text || '').match(/Whenever [^.]*? attacks, create (a|an|one|two|three|\d+) (tapped )?([A-Z][A-Za-z'\- ]*?) tokens?\b/);
    if (!m) return null;
    const name = m[3].trim();
    if (/\bcreature\b/i.test(name) || !name) return null;
    return { n: NUMS[m[1].toLowerCase()] || parseInt(m[1], 10) || 1, name };
  }

  /* ----------------------------------------------------------------- state */
  let board = loadJSON(K_BOARD);
  if (!board || !Array.isArray(board.groups) || typeof board.next !== 'number' || typeof board.defs !== 'object') {
    board = { groups: [], next: 1, defs: {} };
  }
  board.groups = board.groups.filter(g => board.defs[g.key] && Array.isArray(g.b));
  board.pool = Object.assign({ W: 0, U: 0, B: 0, R: 0, G: 0, C: 0 }, board.pool || {});
  let artPick = loadJSON(K_ART) || {};
  let deckCache = null, scanning = null;
  let hist = [];
  const anim = new Map();
  let sheet = null;
  let root = null, grid = null, boardEl = null, wrapEl = null, sheetEl = null;
  let tray = null, wheel = null;
  let moveSeq = 0, lastMove = null;

  function withArt(def) {
    const s = artPick[def.key];
    return (s && s.img) ? Object.assign({}, def, { img: s.img, imgSmall: s.imgSmall || s.img }) : def;
  }

  /* ---------------------------------------------------------- board model */
  function grp(id) { return board.groups.find(g => g.id === id); }
  // A pile is all tokens of one kind with the same counters and sickness. Tapped and untapped
  // tokens of a pile share one spot on the table, and piles keep their place (g.order).
  const pk = b => b.s + '|' + b.c;
  function ensureOrder(g) {
    const present = [];
    g.b.forEach(b => { const k = pk(b); if (!present.includes(k)) present.push(k); });
    g.order = (g.order || []).filter((k, i, a) => present.includes(k) && a.indexOf(k) === i);
    present.forEach(k => { if (!g.order.includes(k)) g.order.push(k); });
  }
  function norm(g) {
    const m = new Map();
    for (const b of g.b) {
      if (!b.n || b.n <= 0) continue;
      const k = bk(b);
      if (m.has(k)) m.get(k).n += b.n; else m.set(k, { t: b.t, s: b.s, c: b.c, n: b.n });
    }
    g.b = [...m.values()].sort((a, b) => a.t - b.t || a.s - b.s || a.c - b.c);
    ensureOrder(g);
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
    const from = pk(b), to = pk(nb);
    if (!g.order) ensureOrder(g);
    if (nb.n > 0 && to !== from && !g.order.includes(to)) {   // a new pile (e.g. counters) goes right next to where it came from
      const i = g.order.indexOf(from);
      g.order.splice(i < 0 ? g.order.length : i + 1, 0, to);
    }
    g.b.push(nb);
    norm(g); prune();
    lastMove = { seq: ++moveSeq, gid, from: key, to: nb.n > 0 ? bk(nb) : null };
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
  function fit(n) { return fitIn(boardEl.clientWidth, boardEl.clientHeight, n, 96); }
  function fitIn(W0, H0, n, minW) {
    const gap = Math.round(Math.max(12, Math.min(W0, H0) * 0.03));
    const pad = gap;
    const W = W0 - pad * 2, H = H0 - pad * 2;
    let best = 0, bestCols = 1;
    for (let cols = 1; cols <= n; cols++) {
      const rows = Math.ceil(n / cols);
      const w = Math.min((W - gap * (cols - 1)) / cols, ((H - gap * (rows - 1)) / rows) / R);
      if (w > best) { best = w; bestCols = cols; }
    }
    const cap = Math.sqrt(0.5 * W * H / R);   // a single card never takes more than half the table
    const cw = Math.floor(Math.max(Math.min(best, cap), Math.min(minW, W))) - 1;
    const fitCols = Math.max(1, Math.floor((W + gap) / (cw + gap)));
    return { cw, ch: Math.floor(cw * R), gap, pad, cols: Math.min(bestCols, fitCols) };
  }
  function fitLanes(a, b) {
    const W0 = boardEl.clientWidth, H0 = boardEl.clientHeight;
    const gap = Math.round(Math.max(12, Math.min(W0, H0) * 0.03));
    const pad = gap, W = W0 - pad * 2, H = H0 - pad * 2;
    let best = 0;
    for (let cols = 1; cols <= Math.max(a, b); cols++) {
      const rows = Math.ceil(a / cols) + Math.ceil(b / cols);
      const w = Math.min((W - gap * (cols - 1)) / cols, ((H - gap * (rows - 1)) / rows) / R);
      if (w > best) best = w;
    }
    const cap = Math.sqrt(0.5 * W * H / R);
    const cw = Math.floor(Math.max(Math.min(best, cap), Math.min(96, W))) - 1;
    return { cw, ch: Math.floor(cw * R), gap, pad, cols: 0 };
  }

  /* ---------------------------------------------------------------- render */
  function faceHTML(d, g, b, cw, ts, o) {
    const key = g.id + ':' + bk(b);
    const cls = ['tt-face'];
    if (b.t) cls.push('tt-tapped');
    const a = o.noAnim ? null : anim.get(key); if (a) cls.push('tt-a-' + a);
    if (o.n === 2) cls.push('tt-s2'); else if (o.n > 2) cls.push('tt-s3');
    const fs = Math.max(10, cw * 0.075);
    const cc = b.c > 0 ? 'tt-plus' : 'tt-minus';
    const pt = (b.c && d.p != null) ? `<span class="tt-pt ${cc}">${esc(ptOf(d, b.c))}</span>` : '';
    const ctr = b.c ? `<span class="tt-ctr ${cc}">${b.c > 0 ? '+1/+1' : '−1/−1'}${Math.abs(b.c) > 1 ? ' ×' + Math.abs(b.c) : ''}</span>` : '';
    const sick = b.s ? '<span class="tt-sick" aria-hidden="true">💤</span>' : '';
    const ctrText = b.c ? `, ${Math.abs(b.c)} ${b.c > 0 ? '+1/+1' : '−1/−1'} counter${Math.abs(b.c) > 1 ? 's' : ''}, ${ptOf(d, b.c)}` : '';
    const lbl = `${d.name}, ${o.n}, ${b.t ? 'tapped' : 'untapped'}${b.s ? ', summoning sick' : ''}${ctrText}`;
    return `<div class="${cls.join(' ')}" data-key="${key}"${o.slot != null ? ` data-slot="${o.slot}"` : ''} role="button" tabindex="0" aria-label="${esc(lbl)}" style="--ts:${ts};--dy:${o.dy.toFixed(1)}px">` +
      `<div class="tt-card${d.img ? '' : ' tt-noimg'}" style="font-size:${fs}px">` +
      `<div class="tt-fb"><div class="tt-fbn">${esc(d.name)}</div><div class="tt-fbt">${esc(d.type)}</div>${d.text ? `<div class="tt-fbx">${esc(d.text)}</div>` : ''}${d.p != null ? `<div class="tt-fbpt">${esc(ptOf(d, 0))}</div>` : ''}</div>` +
      (d.img ? `<img src="${esc(d.img)}" alt="" draggable="false" decoding="async">` : '') +
      sick + ctr + pt + `</div></div>`;
  }
  function hintHTML(d, cw, top) {
    const sacAb = sacAbility(d); if (!sacAb) return '';
    const small = cw < 170;
    const text = sacAb.mana ? (small ? 'Sac for mana' : 'Tap to sac for mana') : (small ? 'Sac: ' + shortEff(sacAb, 12) : 'Tap to sac: ' + shortEff(sacAb, 18));
    return `<div class="tt-hint" style="top:${Math.round(top)}px;font-size:${Math.round(Math.max(11, Math.min(15, cw * 0.06)))}px">${esc(text)}</div>`;
  }
  // One spot on the table: the untapped cards stand upright, the tapped ones lie sideways across them.
  function pileHTML(p, cw, ch, ts) {
    const { g, up, tp } = p;
    const d = board.defs[g.key];
    const visT = cw * ts;                       // height of a sideways card
    const bottom = (ch - visT) / 2;             // offset that puts a sideways card at the bottom of the spot
    const mixed = !!(up && tp);
    const bs = Math.round(Math.max(13, Math.min(20, cw * 0.07)));
    const badge = (n, top) => n > 1 ? `<div class="tt-count" data-tray="${g.id}" data-pk="${p.pk}" role="button" aria-label="Spread out the ${esc(d.name)} pile" style="top:${Math.round(top)}px;font-size:${bs}px">×${n}</div>` : '';
    let html = `<div class="tt-tile" style="width:${cw}px;height:${ch}px">`;
    if (up) html += faceHTML(d, g, up, cw, ts, { n: up.n, dy: (tp || up.n > 1) ? bottom : 0 });
    if (tp) html += faceHTML(d, g, tp, cw, ts, { n: tp.n, dy: mixed ? bottom : 0 });
    if (up) html += badge(up.n, -8);
    if (tp) html += badge(tp.n, (mixed ? ch - visT : bottom) - 8);
    if (tp) html += hintHTML(d, cw, mixed ? ch - visT / 2 : ch / 2);
    return html + '</div>';
  }
  function pilesOf(g) {
    ensureOrder(g);
    const out = [];
    g.order.forEach(k => {
      const up = g.b.find(b => !b.t && pk(b) === k) || null;
      const tp = g.b.find(b => b.t && pk(b) === k) || null;
      if (up || tp) out.push({ g, pk: k, up, tp });
    });
    return out;
  }
  function renderPool() {
    const el = $('tt-pool'); if (!el) return;
    const p = board.pool;
    const total = MANA_ORDER.reduce((t, c) => t + (p[c] || 0), 0);
    el.hidden = !total;
    $('tt-pips').innerHTML = MANA_ORDER.filter(c => p[c] > 0)
      .map(c => `<button class="tt-pip" data-pip="${c}" aria-label="Spend one ${COLOR_NAMES[c]}, ${p[c]} floating">${manaIcon(c, 24)}<b>${p[c]}</b></button>`).join('');
  }
  function render() {
    if (!root || root.hidden) return;
    renderPool();
    renderTray();
    const list = [];
    const crs = [], oth = [];
    board.groups.forEach(g => { const d = board.defs[g.key]; (d && isCreature(d) ? crs : oth).push(...pilesOf(g)); });
    list.push(...crs, ...oth);
    let total = 0, tapped = 0;
    board.groups.forEach(g => g.b.forEach(b => { total += b.n; if (b.t) tapped += b.n; }));
    $('tt-sum').textContent = total ? `${total} token${total === 1 ? '' : 's'}, ${tapped} tapped` : 'Empty table';
    $('tt-undo').disabled = !hist.length;
    renderBar();
    if (drawer) renderDrawer();
    if (!list.length) {
      grid.style.gap = ''; grid.style.padding = '16px';
      grid.innerHTML = `<div class="tt-empty"><div class="tt-empty-in"><div class="tt-empty-t">No tokens on the table</div>` +
        `<div class="tt-empty-s">Add the tokens your deck makes, search any token, or copy a card.</div>` +
        `<button class="tt-act tt-primary" id="tt-empty-add" style="width:100%">+ Add token</button></div></div>`;
      anim.clear();
      return;
    }
    // One row while everything fits on one. Once it needs a second row, creatures get the
    // top lane and everything else (Treasure, Clue, Food...) the lane below.
    let lay = fit(list.length), split = false;
    if (lay.cols < list.length && crs.length && oth.length) { lay = fitLanes(crs.length, oth.length); split = true; }
    const { cw, ch, gap, pad } = lay;
    grid.style.gap = gap + 'px';
    grid.style.padding = pad + 'px';
    const ts = cw / ch;
    const tiles = list.map(p => pileHTML(p, cw, ch, ts));
    if (split) tiles.splice(crs.length, 0, `<div class="tt-lane" style="margin-top:-${gap}px"></div>`);
    grid.innerHTML = tiles.join('');
    anim.clear();
  }

  /* ----------------------------------------------------------- tile input */
  let lp = null, longFired = false, sx = 0, sy = 0;
  function wireTiles(el) {
    el.addEventListener('pointerdown', e => {
      if (e.target.closest('.tt-count')) return;
      const tile = e.target.closest('[data-key]'); if (!tile) return;
      longFired = false; sx = e.clientX; sy = e.clientY;
      clearTimeout(lp);
      lp = setTimeout(() => {
        longFired = true;
        tile.classList.add('tt-held');
        if (navigator.vibrate) try { navigator.vibrate(10); } catch (err) { /* ignore */ }
        openTokenSheet(tile.dataset.key);
      }, 450);
    });
    el.addEventListener('pointermove', e => { if (Math.hypot(e.clientX - sx, e.clientY - sy) > 10) clearTimeout(lp); });
    ['pointerup', 'pointercancel', 'pointerleave'].forEach(ev => el.addEventListener(ev, () => clearTimeout(lp)));
    el.addEventListener('contextmenu', e => { if (e.target.closest('.tt-tile')) e.preventDefault(); });
    el.addEventListener('click', e => {
      if (e.target.closest('#tt-empty-add')) { openAdd('deck'); return; }
      const cnt = e.target.closest('.tt-count');
      if (cnt) { openTray(+cnt.dataset.tray, cnt.dataset.pk); return; }
      const tile = e.target.closest('[data-key]'); if (!tile) return;
      if (longFired) { longFired = false; return; }
      if (tray && tile.dataset.slot != null) tray.pending = { i: +tile.dataset.slot, seq: moveSeq };
      tapOne(tile.dataset.key);
    });
    el.addEventListener('keydown', e => {
      const tile = e.target.closest('[data-key]'); if (!tile) return;
      if (e.key === 'Enter' && e.shiftKey) { e.preventDefault(); openTokenSheet(tile.dataset.key); }
      else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (tray && tile.dataset.slot != null) tray.pending = { i: +tile.dataset.slot, seq: moveSeq };
        tapOne(tile.dataset.key);
      }
    });
    el.addEventListener('error', e => {
      if (e.target && e.target.tagName === 'IMG') { const c = e.target.closest('.tt-card'); if (c) c.classList.add('tt-noimg'); }
    }, true);
  }
  // A tap acts on ONE token: a card on its own, the top card of a pile, or a card in the tray.
  function tapOne(key) {
    const r = resolve(key); if (!r) return;
    const { g, b, d, k } = r;
    const sacAb = sacAbility(d);
    if (sacAb) {                       // Treasure, Clue, Food...: first tap taps it, second tap uses it
      if (!b.t) { commit(() => { const nk = move(g.id, k, 1, x => { x.t = 1; }); if (nk) anim.set(nk, 'tap'); }); return; }
      useAbility(r, sacAb, 1);
      return;
    }
    if (!b.t && !isCreature(d)) {      // Powerstone-style: tapping it makes the mana
      const tapMana = abilitiesOf(d).find(a => a.tap && !a.sac && a.mana);
      if (tapMana) { useAbility(r, tapMana, 1); return; }
    }
    const was = b.t;
    commit(() => {
      const nk = move(g.id, k, 1, x => { x.t = x.t ? 0 : 1; });
      if (nk) anim.set(nk, was ? 'untap' : 'tap');
    });
  }
  // Pay an ability's tap/sacrifice for q tokens; mana goes to the pool, anything else becomes a reminder.
  function useAbility(r, ab, q) {
    const { g, b, d, k } = r;
    q = Math.max(1, Math.min(q, b.n));
    const verb = ab.sac ? 'Sacrificed' : ab.tap ? 'Tapped' : 'Used';
    const apply = add => commit(() => {
      const nk = move(g.id, k, q, x => { if (ab.sac) x.n = 0; else if (ab.tap) x.t = 1; });
      if (nk && ab.tap && !ab.sac) anim.set(nk, 'tap');
      if (add) MANA_ORDER.forEach(c => { if (add[c]) board.pool[c] = (board.pool[c] || 0) + add[c]; });
    });
    const note = ab.note && !/activate only/i.test(ab.note) ? ' ' + ab.note : '';
    if (ab.mana && ab.mana.fixed) {
      const add = {};
      MANA_ORDER.forEach(c => { if (ab.mana.fixed[c]) add[c] = ab.mana.fixed[c] * q; });
      apply(add);
      toast(`${verb} ${tokLabel(q, d)}: added ${manaText(add)}.${note}`, 'Undo', undo);
      return;
    }
    if (ab.mana) {
      closeSheet();
      const total = ab.mana.count * q;
      openWheel({
        total, choices: ab.mana.choices, same: !!ab.mana.same && q === 1,
        title: `${ab.sac ? 'Sacrifice' : 'Tap'} ${tokLabel(q, d)} for ${total} mana`,
        onDone: picked => {
          const add = {};
          picked.forEach(c => { add[c] = (add[c] || 0) + 1; });
          apply(add);
          toast(`${verb} ${tokLabel(q, d)}: added ${manaText(add)}.${note}`, 'Undo', undo);
        }
      });
      return;
    }
    apply(null);
    closeSheet();
    toast(`${verb} ${tokLabel(q, d)}. Now: ${lowerFirst(ab.effect)}${q > 1 ? ` (×${q})` : ''}.`, 'Undo', undo);
  }

  /* ---------------------------------------------------------------- sheets */
  function showSheet() { wrapEl.hidden = false; sheetEl.parentElement.scrollTop = 0; syncLayer(); }
  function closeSheet() {
    if (!wrapEl) return;
    wrapEl.hidden = true; sheet = null; syncLayer();
    root.querySelectorAll('.tt-held').forEach(t => t.classList.remove('tt-held'));
  }
  const thumb = d => `<span class="tt-thumb">${d.imgSmall ? `<img src="${esc(d.imgSmall)}" alt="" loading="lazy">` : ''}</span>`;
  const textHTML = s => esc(s).replace(/\n/g, '<br>');

  // --- one token / stack (long-press menu)
  function openTokenSheet(key) {
    const r = resolve(key); if (!r) return;
    sheet = { mode: 'token', key, qty: sacAbility(r.d) ? 1 : r.b.n };
    renderTokenSheet(); showSheet();
  }
  function qtyHTML(n, q) {
    if (n <= 1) return '';
    const nums = n <= 10 ? Array.from({ length: n }, (_, i) => i + 1) : [1, 2, 3, 4, 5, 10];
    let html = '<div class="tt-qlabel">How many?</div><div class="tt-qrow">' +
      nums.map(v => `<button class="tt-qbtn${q === v ? ' tt-on' : ''}" data-qset="${v}">${v}</button>`).join('');
    if (n > 10) html += `<button class="tt-qbtn tt-qall${q === n ? ' tt-on' : ''}" data-qset="${n}">All ${n}</button>`;
    html += '</div>';
    if (n > 10) html += `<div class="tt-stepper"><button data-q="-1" aria-label="One fewer">−</button><output>${q}</output><button data-q="1" aria-label="One more">+</button></div>`;
    return html;
  }
  function renderTokenSheet() {
    const r = resolve(sheet.key); if (!r) { closeSheet(); return; }
    const { b, d } = r;
    const n = b.n;
    sheet.qty = Math.min(Math.max(1, sheet.qty), n);
    const q = sheet.qty;
    const cr = isCreature(d);
    const abs = abilitiesOf(d);
    const sacAb = sacAbility(d);
    let status = b.t ? `${n} tapped` : (cr ? (b.s ? `${n} summoning sick` : `${n} ready`) : `${n} untapped`);
    if (b.c) status += `, each with ${Math.abs(b.c)} ${b.c > 0 ? '+1/+1' : '−1/−1'} counter${Math.abs(b.c) > 1 ? 's' : ''}`;
    const trig = cr ? attackTrigger(d) : null;
    let note = '';
    if (cr && b.s && !b.t) note = 'Summoning sick until your next untap. Give haste to attack now.';
    else if (cr && hasKw(d, 'Vigilance') && !b.t) note = 'Vigilance: attacking won’t tap these.';
    else if (trig) note = `Attacking offers to make ${trig.n === 1 ? 'a' : trig.n} ${trig.name} token${trig.n === 1 ? '' : 's'} each.`;
    else if (sacAb && !b.t) note = 'On the table: tap it once, then tap it again to use it.';
    const btn = (a, label, primary, extra) => `<button class="tt-act${primary ? ' tt-primary' : ''}" data-a="${a}">${esc(label)}${extra ? `<small>${esc(extra)}</small>` : ''}</button>`;
    const abBtn = (ab, primary) => {
      const i = abs.indexOf(ab);
      const blocked = ab.tap && !ab.sac && b.t;
      const v = ab.sac ? 'Sac' : ab.tap ? 'Tap' : 'Use';
      const label = ab.mana ? `${v} ${q} for mana` : `${v} ${q}: ${shortEff(ab, 30)}`;
      const extra = costNote(ab);
      return `<button class="tt-act${primary ? ' tt-primary' : ''}" data-ab="${i}"${blocked ? ' disabled' : ''}>${esc(label)}${extra ? `<small>${esc(extra)}</small>` : ''}</button>`;
    };
    const top = [], rest = [];
    if (cr && !b.t && !b.s) top.push(btn('attack', `Attack with ${q}`, true, trig ? `Then make ${trig.name} tokens` : ''));
    if (sacAb) top.push(abBtn(sacAb, true));
    if (b.t) (cr || !sacAb ? top : rest).push(btn('untap', `Untap ${q}`, cr || !sacAb));
    if (!b.t) rest.push(btn('tap', `Tap ${q}`));
    if (cr && b.s && !b.t) rest.push(btn('haste', `Give ${q} haste`));
    abs.forEach(ab => { if (ab !== sacAb) rest.push(abBtn(ab, false)); });
    if (cr) {
      rest.push(btn('plus', `+1/+1 counter on ${q}`));
      rest.push(btn('minus', `−1/−1 counter on ${q}`));
      if (b.c) rest.push(btn('uncounter', `Remove a counter from ${q}`));
    }
    if (d.oracle) rest.push(btn('art', 'Change art'));
    rest.push(`<button class="tt-act tt-danger${rest.length % 2 === 0 ? ' tt-wide' : ''}" data-a="remove">Remove ${q}</button>`);
    const pt = cr ? ptOf(d, b.c) : '';
    sheetEl.innerHTML =
      `<div class="tt-shead">${thumb(d)}<div style="min-width:0">` +
      `<div class="tt-sname">${esc(d.name)}${pt ? ` <span class="tt-spt">${esc(pt)}</span>` : ''}</div>` +
      `<div class="tt-stype">${esc(d.type)}${d.copy ? ' (token copy)' : ''}</div>` +
      (d.text ? `<div class="tt-stext">${textHTML(d.text)}</div>` : '') +
      `</div></div>` +
      `<div class="tt-status">${status}</div>${note ? `<div class="tt-note">${esc(note)}</div>` : ''}` +
      qtyHTML(n, q) +
      `<div class="tt-acts">${top.join('')}${rest.join('')}</div>` +
      `<div class="tt-more"><span>Make more</span><button data-more="1">+1</button><button data-more="2">+2</button><button data-more="5">+5</button></div>`;
  }
  function doAct(a) {
    const r = resolve(sheet.key); if (!r) { closeSheet(); return; }
    const { g, b, d, k } = r;
    const q = Math.min(sheet.qty, b.n);
    const run = (fn, an) => { let nk = null; commit(() => { nk = move(g.id, k, q, fn); if (nk && an) anim.set(nk, an); }); return nk; };
    if (a === 'attack') {
      const vig = hasKw(d, 'Vigilance');
      if (!vig) run(x => { x.t = 1; }, 'tap');
      closeSheet();
      const trig = attackTrigger(d);
      if (trig) {
        const total = q * trig.n;
        toast(`${q} attack trigger${q === 1 ? '' : 's'}${vig ? ' (vigilance, still untapped)' : ''}`, `Create ${total} ${trig.name}`, () => createNamed(trig.name, total));
      } else if (vig) toast(`${q} attacking with vigilance, still untapped`);
    } else if (a === 'tap') { run(x => { x.t = 1; }, 'tap'); closeSheet(); }
    else if (a === 'untap') { run(x => { x.t = 0; }, 'untap'); closeSheet(); }
    else if (a === 'haste') {
      const nk = run(x => { x.s = 0; });
      if (nk) { sheet.key = nk; sheet.qty = q; renderTokenSheet(); } else closeSheet();
    } else if (a === 'plus' || a === 'minus' || a === 'uncounter') {
      let died = 0;
      const nk = run(x => {
        if (a === 'plus') x.c += 1; else if (a === 'minus') x.c -= 1; else x.c += (x.c > 0 ? -1 : 1);
        if (isNum(d.t) && +d.t + x.c <= 0) { died = x.n; x.n = 0; }   // 0 toughness: it dies
      });
      if (died) { closeSheet(); toast(`${tokLabel(died, d)} died (0 toughness)`, 'Undo', undo); }
      else if (nk) { sheet.key = nk; sheet.qty = q; renderTokenSheet(); } else closeSheet();
    } else if (a === 'remove') {
      run(x => { x.n = 0; }); closeSheet();
      toast(`Removed ${tokLabel(q, d)}`, 'Undo', undo);
    } else if (a === 'art') {
      openArtSheet(g.key);
    }
  }

  // --- tokens that attack triggers make by name (Treasure, Clue, Food...)
  const namedCache = {};
  async function findNamedToken(name) {
    const lc = name.toLowerCase();
    if (namedCache[lc]) return namedCache[lc];
    const onBoard = Object.values(board.defs).find(x => !x.copy && x.name.toLowerCase() === lc);
    if (onBoard) return (namedCache[lc] = onBoard);
    const inDeck = deckCache && deckCache.tokens && deckCache.tokens.find(x => x.def.name.toLowerCase() === lc);
    if (inDeck) return (namedCache[lc] = inDeck.def);
    const cards = await search('t:token !"' + name + '"', '&unique=cards&include_extras=true');
    for (const c of cards) {
      const faces = (Array.isArray(c.card_faces) && c.card_faces.length > 1 && !c.image_uris) ? c.card_faces.map(f => f.name) : [null];
      for (const fn of faces) {
        const def = cardToDef(c, { face: fn });
        if (def.name.toLowerCase() === lc) return (namedCache[lc] = def);
      }
    }
    return null;
  }
  async function createNamed(name, n) {
    let def = null;
    try { def = await findNamedToken(name); } catch (e) { def = null; }
    if (!def) { toast(`Couldn’t find a ${name} token. Check your signal and try again.`); return; }
    commit(() => addTokens(withArt(def), n));
    toast(`Created ${tokLabel(n, def)}`);
  }

  // --- spread-out tray for one pile
  function syncLayer() { if (root) root.classList.toggle('tt-layer', !!(tray || wheel || sheet || drawer)); }
  function openTray(gid, key) { tray = { gid, pk: key, slots: [], pending: null }; $('tt-traywrap').hidden = false; syncLayer(); renderTray(); }
  function closeTray() { tray = null; const w = $('tt-traywrap'); if (w) w.hidden = true; syncLayer(); }
  function renderTray() {
    if (!tray) return;
    const g = grp(tray.gid);
    if (!g) { closeTray(); return; }
    if (!g.b.some(b => pk(b) === tray.pk)) {               // the pile lost its sickness on untap: follow it
      const c = tray.pk.split('|')[1];
      if (g.b.some(b => pk(b) === '0|' + c)) tray.pk = '0|' + c; else { closeTray(); return; }
    }
    const d = board.defs[g.key];
    // The card you tapped stays in its spot in the tray.
    if (tray.pending && lastMove && lastMove.seq > tray.pending.seq && lastMove.gid === g.id) {
      const i = tray.pending.i;
      if (tray.slots[i] === lastMove.from) { if (lastMove.to) tray.slots[i] = lastMove.to; else tray.slots.splice(i, 1); }
      tray.pending = null;
    }
    const buckets = g.b.filter(b => pk(b) === tray.pk);
    const want = {}; buckets.forEach(b => { want[bk(b)] = b.n; });
    const have = {}, slots = [];
    tray.slots.forEach(k => { if ((have[k] || 0) < (want[k] || 0)) { have[k] = (have[k] || 0) + 1; slots.push(k); } });
    buckets.forEach(b => { const k = bk(b); while ((have[k] || 0) < b.n) { slots.push(k); have[k] = (have[k] || 0) + 1; } });
    tray.slots = slots;
    const tapped = buckets.reduce((t, b) => t + (b.t ? b.n : 0), 0);
    const c = +tray.pk.split('|')[1];
    $('tt-trayname').textContent = `${d.name} ×${slots.length}${c ? ` (${c > 0 ? '+1/+1' : '−1/−1'}${Math.abs(c) > 1 ? ' ×' + Math.abs(c) : ''})` : ''}`;
    $('tt-traysub').textContent = `${slots.length - tapped} untapped, ${tapped} tapped`;
    const tg = $('tt-traygrid');
    const { cw, ch, gap, pad } = fitIn(tg.clientWidth, tg.clientHeight, slots.length, 72);
    const ts = cw / ch;
    tg.style.gap = gap + 'px'; tg.style.padding = pad + 'px';
    tg.innerHTML = slots.map((k, i) => {
      const b = buckets.find(x => bk(x) === k);
      return `<div class="tt-tile" style="width:${cw}px;height:${ch}px">${faceHTML(d, g, b, cw, ts, { n: 1, dy: 0, slot: i, noAnim: true })}${b.t ? hintHTML(d, cw, ch / 2) : ''}</div>`;
    }).join('');
  }

  // --- mana color wheel
  function openWheel(opts) { wheel = Object.assign({ picked: [] }, opts); $('tt-wheelwrap').hidden = false; $('tt-toast').hidden = true; syncLayer(); renderWheel(); }
  function closeWheel() { wheel = null; $('tt-wheelwrap').hidden = true; syncLayer(); }
  function renderWheel() {
    const w = wheel; if (!w) return;
    const left = w.total - w.picked.length;
    const k = w.choices.length, RAD = k > 1 ? 90 : 0, C = 125;
    const btns = w.choices.map((c, i) => {
      const ang = (-90 + i * 360 / k) * Math.PI / 180;
      return `<button class="tt-wbtn" data-mana="${c}" style="left:${(C + RAD * Math.cos(ang)).toFixed(1)}px;top:${(C + RAD * Math.sin(ang)).toFixed(1)}px" aria-label="${COLOR_NAMES[c]}">${manaIcon(c, 62)}</button>`;
    }).join('');
    $('tt-wheel').innerHTML =
      `<div class="tt-wtitle">${esc(w.title)}</div>` +
      `<div class="tt-wsub">${w.same ? 'Pick one color for all of it' : w.total > 1 ? 'Tap a color for each mana' : 'Tap a color'}</div>` +
      `<div class="tt-ring">${btns}${k > 1 && w.total > 1 ? `<div class="tt-center"><div class="tt-left">${left}</div><div class="tt-leftl">to pick</div></div>` : ''}</div>` +
      `<div class="tt-picked">${w.picked.map(c => manaIcon(c, 26)).join('') || '&nbsp;'}</div>` +
      `<div class="tt-wbtns"><button class="tt-act" data-w="back"${w.picked.length ? '' : ' disabled'}>Back one</button><button class="tt-act" data-w="cancel">Cancel</button></div>`;
  }
  function wheelClick(e) {
    const w = wheel; if (!w) return;
    const t = e.target.closest('button'); if (!t) return;
    if (t.dataset.w === 'cancel') { closeWheel(); return; }
    if (t.dataset.w === 'back') { w.picked.pop(); renderWheel(); return; }
    const c = t.dataset.mana; if (!c || w.picked.length >= w.total) return;
    if (w.same) w.picked = Array(w.total).fill(c); else w.picked.push(c);
    renderWheel();
    if (w.picked.length >= w.total) setTimeout(() => { if (wheel !== w) return; closeWheel(); w.onDone(w.picked); }, 160);
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
  function openAdd(tab, pre) {
    sheet = { mode: 'add', tab: tab || 'deck', sel: null, qty: 1, q: '', cq: '', list: [], seq: 0, err: false, pre: pre || null };
    renderAddShell(); showSheet(); loadTab();
  }
  function renderAddShell() {
    const tabs = [['deck', 'Your deck'], ['search', 'Search'], ['copy', 'Copy a card']];
    sheetEl.innerHTML =
      `<div class="tt-addhead"><div class="tt-stitle">Add a token</div><div class="tt-tip"><b>Tip:</b> swipe right on the table for quick-add from your deck</div></div>` +
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
      if (tab === 'deck') {
        renderDeckTab(c);
        if (sheet.pre) {
          const i = sheet.list.findIndex(d => d.key === sheet.pre); sheet.pre = null;
          if (i >= 0) {
            sheet.sel = sheet.list[i]; sheet.qty = 2;
            const row = $('tt-list').querySelector(`[data-pick="${i}"]`);
            if (row) { row.classList.add('tt-on'); row.scrollIntoView({ block: 'nearest' }); }
            updateFoot();
          }
        }
      } else renderCopyTab(c);
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
        if (t.dataset.qset) { sheet.qty = +t.dataset.qset; renderTokenSheet(); }
        else if (t.dataset.q) { sheet.qty = sheet.qty + (+t.dataset.q); renderTokenSheet(); }
        else if (t.dataset.ab != null) { const ab = abilitiesOf(r.d)[+t.dataset.ab]; if (ab) { const q = Math.min(sheet.qty, r.b.n); closeSheet(); useAbility(r, ab, q); } }
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

  /* ------------------------------------------------- bottom bar (dynamic)
     Only shows what you can do right now, always in the same order:
     Attack · Untap all · Treasure. When nothing applies it shows a hint. */
  const vigil = d => hasKw(d, 'Vigilance');
  // Tokens you sacrifice for mana with no other cost (Treasure, Gold). Clue/Food/Blood cost mana, so they're left out.
  function manaSac(d) {
    const ab = sacAbility(d);
    return (ab && ab.mana && !ab.manaCost && !ab.other.length) ? ab : null;
  }
  function barState() {
    let atk = 0, tapped = 0, sick = 0, treas = 0, allTreasure = true;
    board.groups.forEach(g => {
      const d = board.defs[g.key]; if (!d) return;
      const cr = isCreature(d), ms = manaSac(d);
      g.b.forEach(b => {
        if (b.t) tapped += b.n;
        if (b.s) sick += b.n;
        if (cr && !b.t && !b.s) atk += b.n;
        if (ms) { treas += b.n; if (!/^treasure$/i.test(d.name)) allTreasure = false; }
      });
    });
    const floating = MANA_ORDER.some(c => board.pool[c] > 0);
    return { atk, tapped, sick, treas, allTreasure, floating };
  }
  function renderBar() {
    const st = barState();
    const set = (id, show, html) => { const b = $(id); b.hidden = !show; if (show) b.innerHTML = html; };
    set('tt-attack', st.atk > 0, `<b>Attack</b><small>${st.atk} ready</small>`);
    const turn = st.tapped > 0 || st.sick > 0 || st.floating;
    set('tt-turn', turn, st.tapped ? `<b>Untap all</b><small>${st.tapped} tapped</small>` : `<b>New turn</b>`);
    set('tt-treas', st.treas > 0, `<b>${st.allTreasure ? 'Treasure' : 'Sac for mana'}</b><small>${st.treas} → mana</small>`);
    const hint = $('tt-hint');
    const any = st.atk || turn || st.treas;
    hint.hidden = !!any;
    if (!any) hint.textContent = board.groups.length ? 'Tap a token to tap it · hold for more' : 'Tap + Add to make tokens';
    syncFoot();
  }
  function untapAll() {
    const floating = MANA_ORDER.some(c => board.pool[c] > 0);
    if (!board.groups.length && !floating) return;
    commit(() => {
      MANA_ORDER.forEach(c => { board.pool[c] = 0; });
      for (const g of board.groups) {
        g.order = (g.order || []).map(k => '0|' + k.split('|')[1]);
        const had = g.b.some(b => b.t);
        g.b.forEach(b => { b.t = 0; b.s = 0; });
        norm(g);
        if (had) g.b.forEach(b => anim.set(g.id + ':' + bk(b), 'untap'));
      }
    });
    toast(floating ? 'New turn: everything untapped, mana pool emptied' : 'New turn: everything untapped');
  }
  // Every untapped creature that isn't summoning sick attacks. Vigilance ones stay untapped.
  function attackAll() {
    let n = 0, vig = 0;
    const trig = {};
    commit(() => {
      for (const g of board.groups) {
        const d = board.defs[g.key]; if (!d || !isCreature(d)) continue;
        const tk = attackTrigger(d);
        const keys = [];
        g.b.forEach(b => {
          if (b.t || b.s || !b.n) return;
          n += b.n;
          if (tk) trig[tk.name] = (trig[tk.name] || 0) + b.n * tk.n;
          if (vigil(d)) { vig += b.n; return; }
          b.t = 1; keys.push(g.id + ':' + bk(b));
        });
        if (keys.length) { norm(g); keys.forEach(k => anim.set(k, 'tap')); }
      }
    });
    if (!n) return;
    const names = Object.keys(trig);
    const msg = `Attacking with ${n} creature${n === 1 ? '' : 's'}` + (vig ? ` (${vig} with vigilance, still untapped)` : '');
    if (names.length) {
      const label = 'Create ' + names.map(k => `${trig[k]} ${k}`).join(' + ');
      toast(msg, label, async () => { for (const k of names) await createNamed(k, trig[k]); });
    } else toast(msg, 'Undo', undo);
  }
  // Sacrifice every Treasure (and Gold-style token) for mana in one go.
  function treasurePiles() {
    const out = [];
    board.groups.forEach(g => {
      const d = board.defs[g.key]; const ab = d && manaSac(d); if (!ab) return;
      g.b.forEach(b => { if (b.n > 0) out.push({ g, b, d, ab }); });
    });
    return out;
  }
  function treasureAll() {
    const piles = treasurePiles(); if (!piles.length) return;
    const fixed = {}; let choose = 0; const choices = new Set();
    let count = 0;
    piles.forEach(({ b, ab }) => {
      count += b.n;
      if (ab.mana.fixed) MANA_ORDER.forEach(c => { if (ab.mana.fixed[c]) fixed[c] = (fixed[c] || 0) + ab.mana.fixed[c] * b.n; });
      else { choose += ab.mana.count * b.n; ab.mana.choices.forEach(c => choices.add(c)); }
    });
    const names = [...new Set(piles.map(p => p.d.name))];
    const what = names.length === 1 ? `${count} ${names[0]}${count === 1 ? '' : 's'}` : `${count} tokens`;
    const apply = picked => {
      const add = Object.assign({}, fixed);
      (picked || []).forEach(c => { add[c] = (add[c] || 0) + 1; });
      commit(() => {
        board.groups.forEach(g => { const d = board.defs[g.key]; if (d && manaSac(d)) g.b = []; });
        prune();
        MANA_ORDER.forEach(c => { if (add[c]) board.pool[c] = (board.pool[c] || 0) + add[c]; });
      });
      toast(`Sacrificed ${what}: added ${manaText(add)}`, 'Undo', undo);
    };
    if (!choose) { apply(null); return; }
    openWheel({ total: choose, choices: MANA_ORDER.filter(c => choices.has(c)), same: false, title: `Sacrifice ${what} for ${choose} mana`, onDone: apply });
  }

  /* ---------------------------------------------------------------- ⋯ menu */
  let closeMenu = () => {};
  function openMenu() { $('tt-menu').hidden = false; $('tt-more').setAttribute('aria-expanded', 'true'); }

  /* ------------------------------------------- left drawer: deck's tokens
     Swipe right on the left half of the table (or tap the edge tab).
     Tap a token to put one on the table; hold to pick how many. */
  let drawer = null;
  function openDrawer() {
    if (!root) return;
    closeMenu();
    drawer = { list: [] };
    $('tt-drawwrap').hidden = false; syncLayer();
    $('tt-drawlist').innerHTML = '<div class="tt-msg">Finding your deck’s tokens…</div>';
    getDeck(false).then(() => { if (drawer) renderDrawer(); })
      .catch(() => { if (drawer) $('tt-drawlist').innerHTML = '<div class="tt-msg">Couldn’t reach Scryfall. Check your signal, then try again.</div><button class="tt-act" data-dretry="1">Try again</button>'; });
  }
  function closeDrawer() { drawer = null; const w = $('tt-drawwrap'); if (w) w.hidden = true; syncLayer(); }
  function renderDrawer() {
    const el = $('tt-drawlist'); if (!el || !drawer) return;
    const c = deckCache;
    if (!c) return;
    drawer.list = [];
    if (c.empty) { el.innerHTML = '<div class="tt-msg">Your deck is empty. Draft or import a deck first, or use Search below.</div>'; return; }
    if (!c.tokens.length) { el.innerHTML = '<div class="tt-msg">Nothing in your deck makes a token. Use Search or Copy a card below.</div><button class="tt-link" data-drefresh="1">Deck changed? Check again</button>'; return; }
    const have = {};
    board.groups.forEach(g => g.b.forEach(b => { have[g.key] = (have[g.key] || 0) + b.n; }));
    let html = '';
    const row = (x, who) => {
      const d = withArt(x.def); drawer.list.push(d);
      const h = have[d.key] ? `<span class="tt-have"> · ${have[d.key]} on table</span>` : '';
      return `<button class="tt-row" data-dpick="${drawer.list.length - 1}">${thumb(d)}<span class="tt-rt"><span class="tt-rn">${esc(d.name)}${d.p != null ? ' ' + esc(ptOf(d, 0)) : ''}</span>` +
        `<span class="tt-rs">${esc(madeBy(who))}${h}</span></span><span class="tt-dplus" aria-hidden="true">+</span></button>`;
    };
    const main = c.tokens.filter(x => x.main.length), side = c.tokens.filter(x => !x.main.length);
    main.forEach(x => { html += row(x, x.main); });
    if (side.length) { html += '<div class="tt-sec">From your sideboard</div>'; side.forEach(x => { html += row(x, x.side); }); }
    html += '<button class="tt-link" data-drefresh="1">Deck changed? Check again</button>';
    el.innerHTML = html;
  }
  function wireDrawer() {
    const el = $('tt-drawlist');
    let t = null, held = false, x0 = 0, y0 = 0;
    el.addEventListener('pointerdown', e => {
      const r = e.target.closest('[data-dpick]'); if (!r) return;
      held = false; x0 = e.clientX; y0 = e.clientY; clearTimeout(t);
      t = setTimeout(() => {
        held = true; r.classList.add('tt-held');
        if (navigator.vibrate) try { navigator.vibrate(10); } catch (err) { /* ignore */ }
        const d = drawer && drawer.list[+r.dataset.dpick];
        closeDrawer();
        if (d) openAdd('deck', d.key);
      }, 450);
    });
    el.addEventListener('pointermove', e => { if (Math.hypot(e.clientX - x0, e.clientY - y0) > 10) clearTimeout(t); });
    ['pointerup', 'pointercancel', 'pointerleave'].forEach(ev => el.addEventListener(ev, () => clearTimeout(t)));
    el.addEventListener('contextmenu', e => { if (e.target.closest('[data-dpick]')) e.preventDefault(); });
    el.addEventListener('click', e => {
      if (e.target.closest('[data-drefresh],[data-dretry]')) {
        el.innerHTML = '<div class="tt-msg">Checking your deck…</div>';
        getDeck(true).then(() => { if (drawer) renderDrawer(); }).catch(() => { if (drawer) el.innerHTML = '<div class="tt-msg">Couldn’t reach Scryfall.</div>'; });
        return;
      }
      const r = e.target.closest('[data-dpick]'); if (!r || held) { held = false; return; }
      const d = drawer && drawer.list[+r.dataset.dpick]; if (!d) return;
      commit(() => addTokens(d, 1));
      toast(`Created 1 ${d.name} token`, 'Undo', undo);
    });
    $('tt-drawer').addEventListener('click', e => {
      const b = e.target.closest('[data-dtab]'); if (!b) return;
      closeDrawer(); openAdd(b.dataset.dtab);
    });
    // swipe left on the drawer closes it
    let sx0 = null, sy0 = 0;
    const dr = $('tt-drawer');
    dr.addEventListener('pointerdown', e => { sx0 = e.clientX; sy0 = e.clientY; });
    dr.addEventListener('pointermove', e => {
      if (sx0 == null) return;
      const dx = e.clientX - sx0, dy = e.clientY - sy0;
      if (dx < -50 && Math.abs(dy) < -dx * 0.7) { sx0 = null; clearTimeout(t); held = true; closeDrawer(); }
    });
    ['pointerup', 'pointercancel'].forEach(ev => dr.addEventListener(ev, () => { sx0 = null; }));
  }
  // Swipe right that starts on the left half of the table opens the drawer.
  function wireSwipe() {
    let st = null;
    boardEl.addEventListener('pointerdown', e => {
      st = null;
      if (sheet || tray || wheel || drawer || e.button > 0) return;
      const box = root.getBoundingClientRect();
      if (e.clientX - box.left > box.width / 2) return;
      st = { x: e.clientX, y: e.clientY };
    });
    boardEl.addEventListener('pointermove', e => {
      if (!st) return;
      const dx = e.clientX - st.x, dy = e.clientY - st.y;
      if (Math.abs(dy) > 30 && Math.abs(dy) > dx) { st = null; return; }   // a scroll, not a swipe
      if (dx > 45 && Math.abs(dy) < dx * 0.7) {
        st = null;
        clearTimeout(lp); longFired = true;   // don't let the swipe also tap the token under it
        document.querySelectorAll('.tt-held').forEach(x => x.classList.remove('tt-held'));
        openDrawer();
      }
    });
    ['pointerup', 'pointercancel'].forEach(ev => boardEl.addEventListener(ev, () => { st = null; }));
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
      `<button class="tt-hbtn tt-hadd" id="tt-add" aria-label="Add a token">+ Add</button>` +
      `<button class="tt-hbtn tt-icon" id="tt-undo" aria-label="Undo" disabled>↶</button>` +
      `<button class="tt-hbtn tt-icon" id="tt-more" aria-label="More" aria-haspopup="menu" aria-expanded="false">⋯</button>` +
      `</header>` +
      `<div class="tt-pool" id="tt-pool" hidden><span class="tt-plabel">Floating</span><div class="tt-pips" id="tt-pips"></div><button class="tt-pempty" id="tt-pempty">Empty</button></div>` +
      `<main class="tt-board" id="tt-board"><div class="tt-grid" id="tt-grid"></div></main>` +
      `<footer class="tt-bottom" id="tt-bottom">` +
      `<button class="tt-bar tt-atk" id="tt-attack" hidden></button>` +
      `<button class="tt-bar" id="tt-turn" hidden></button>` +
      `<button class="tt-bar tt-gold" id="tt-treas" hidden></button>` +
      `<div class="tt-bhint" id="tt-hint"></div>` +
      `</footer>` +
      `<div class="tt-menu" id="tt-menu" role="menu" hidden>` +
      `<button class="tt-mi" role="menuitem" data-mi="search">Search any token</button>` +
      `<button class="tt-mi" role="menuitem" data-mi="copy">Copy a card</button>` +
      `<button class="tt-mi" role="menuitem" data-mi="clear" id="tt-clear">Clear the table</button></div>` +
      `<div class="tt-drawwrap" id="tt-drawwrap" hidden><div class="tt-scrim" id="tt-drawscrim"></div>` +
      `<div class="tt-drawer" id="tt-drawer" role="dialog" aria-label="Your deck’s tokens"><div class="tt-drawhead"><div class="tt-drawtitle">Your deck’s tokens` +
      `<div class="tt-drawsub">Tap adds one · hold for more</div></div><button class="tt-drawx" id="tt-drawx" aria-label="Close">‹</button></div>` +
      `<div class="tt-drawlist" id="tt-drawlist"></div>` +
      `<div class="tt-drawfoot"><button class="tt-act" data-dtab="search">Search</button><button class="tt-act" data-dtab="copy">Copy a card</button></div></div></div>` +
      `<div class="tt-traywrap" id="tt-traywrap" hidden><div class="tt-scrim" id="tt-trayscrim"></div>` +
      `<div class="tt-tray" role="dialog" aria-label="Spread out pile"><div class="tt-trayhead"><div class="tt-traytitle"><div class="tt-trayname" id="tt-trayname"></div><div class="tt-traysub" id="tt-traysub"></div></div>` +
      `<button class="tt-hbtn" id="tt-traydone">Done</button></div><div class="tt-traygrid" id="tt-traygrid"></div></div></div>` +
      `<div class="tt-sheetwrap" id="tt-wrap" hidden><div class="tt-scrim" id="tt-scrim"></div>` +
      `<div class="tt-sheet" role="dialog" aria-modal="true"><div class="tt-grab"></div><div id="tt-sheet"></div></div></div>` +
      `<div class="tt-wheelwrap" id="tt-wheelwrap" hidden><div class="tt-scrim" id="tt-wheelscrim"></div><div class="tt-wheel" id="tt-wheel" role="dialog" aria-label="Choose mana"></div></div>` +
      `<div class="tt-toast" id="tt-toast" role="status" hidden><span id="tt-toastmsg"></span><button id="tt-toastact" hidden></button></div>`;
    document.body.appendChild(root);
    grid = $('tt-grid'); boardEl = $('tt-board'); wrapEl = $('tt-wrap'); sheetEl = $('tt-sheet');
    wireTiles(grid); wireTiles($('tt-traygrid')); wireSheet();
    $('tt-traydone').addEventListener('click', closeTray);
    $('tt-trayscrim').addEventListener('click', closeTray);
    $('tt-wheel').addEventListener('click', wheelClick);
    $('tt-wheelscrim').addEventListener('click', closeWheel);
    $('tt-pips').addEventListener('click', e => {
      const p = e.target.closest('[data-pip]'); if (!p) return;
      const c = p.dataset.pip;
      if (board.pool[c] > 0) commit(() => { board.pool[c] -= 1; });
    });
    $('tt-pempty').addEventListener('click', () => commit(() => { MANA_ORDER.forEach(c => { board.pool[c] = 0; }); }));

    $('tt-back').addEventListener('click', close);
    $('tt-undo').addEventListener('click', undo);
    $('tt-add').addEventListener('click', () => { closeMenu(); openAdd('deck'); });
    $('tt-turn').addEventListener('click', untapAll);
    $('tt-attack').addEventListener('click', attackAll);
    $('tt-treas').addEventListener('click', treasureAll);
    $('tt-drawx').addEventListener('click', closeDrawer);
    $('tt-drawscrim').addEventListener('click', closeDrawer);
    wireDrawer();
    $('tt-more').addEventListener('click', e => { e.stopPropagation(); if ($('tt-menu').hidden) openMenu(); else closeMenu(); });
    root.addEventListener('pointerdown', e => { if (!$('tt-menu').hidden && !e.target.closest('#tt-menu,#tt-more')) closeMenu(); }, true);
    let armed = 0, armT = null;
    const clr = $('tt-clear');
    const disarm = () => { armed = 0; clearTimeout(armT); clr.textContent = 'Clear the table'; clr.classList.remove('tt-armed'); };
    $('tt-menu').addEventListener('click', e => {
      const t = e.target.closest('[data-mi]'); if (!t) return;
      const mi = t.dataset.mi;
      if (mi === 'search' || mi === 'copy') { closeMenu(); openAdd(mi); return; }
      if (!board.groups.length) { closeMenu(); return; }
      if (armed && Date.now() - armed < 3000) {
        disarm(); closeMenu();
        commit(() => { board.groups = []; });
        toast('Cleared the table', 'Undo', undo);
      } else {
        armed = Date.now(); clr.textContent = 'Tap again to clear'; clr.classList.add('tt-armed');
        clearTimeout(armT); armT = setTimeout(disarm, 3000);
      }
    });
    closeMenu = () => { $('tt-menu').hidden = true; $('tt-more').setAttribute('aria-expanded', 'false'); disarm(); };
    wireSwipe();
    root.addEventListener('pointerdown', keepAwake, { passive: true });
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') keepAwake(); });
    document.addEventListener('keydown', e => {
      if (e.key !== 'Escape' || !root || root.hidden) return;
      if (!$('tt-menu').hidden) closeMenu(); else if (wheel) closeWheel(); else if (sheet) closeSheet(); else if (tray) closeTray(); else if (drawer) closeDrawer();
    });
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
  }
  function close() {
    closeSheet(); closeTray(); closeDrawer(); if (wheel) closeWheel(); if (root) closeMenu();
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
