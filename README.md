# Draft Table — MTG Draft Assistant

A mobile-first web tool for Magic: The Gathering drafting. Built as one HTML file plus one small script (`tokens.js`), with no dependencies beyond Google Fonts and the Scryfall API.

Draft Table helps you track picks during a live draft, build your deck afterward, and make smarter decisions about your mana base — all from your phone. When the deck is done, the **Tokens** tab turns it into a token board for the game itself. On foldables, tablets and desktop it opens up into a side-by-side Draft + Curve layout.

**Live:** [tastlejames.github.io/MTGDraft](https://tastlejames.github.io/MTGDraft/)

---

## Quick Start

1. Open the live link (or `index.html`) in any browser — phone, foldable, tablet or desktop
2. On the **Draft** tab, search for your set and load it (or tap **Load Demo Deck** to try it out)
3. Use the color and mana value filters to find cards as you draft
4. Tap cards to add them to your pool
5. Switch to **Builder** for detailed analysis or **Curve** for a visual deck layout
6. When you sit down to play, tap **Tokens** for a board with every token your deck makes

No install, no server, no account. Everything runs client-side. Add it to your home screen to use it like an app.

---

## Features

### Quick Draft Mode
The default view, optimized for speed on mobile during a live draft.

- **Set Loading** — Search any draftable set; card data is cached in memory for instant filtering
- **Filter-Based Card Selection** — Tap color buttons (W/U/B/R/G/C) and a mana value to narrow results, then tap card art to add
- **Exact Color Identity** — Selecting WU shows only gold WU cards, not mono-W or mono-U
- **Dedicated Lands Button** — Full-width button shows all non-basic lands; color buttons narrow by produced color (OR logic)
- **Lock Filters Toggle** — Keep your color/MV filters between picks when you're deep in a color pair
- **Auto Filter Reset** — Filters clear after each pick by default for a fresh view of the next pack (disable with Lock toggle)
- **Undo Last Pick** — Every pick shows a toast with an Undo button
- **Recent Picks** — Quick-access button showing your last 3 picks as card images with instant sideboard buttons
- **Manual Search Fallback** — Scryfall autocomplete for Special Guests, bonus sheets, or any card not in the loaded set
- **Chaos Draft** — Load multiple sets at once for multi-set draft formats
- **Cube Import** — Paste a card list to use as your draft pool

### Builder Mode
The full deckbuilding toolkit.

- **Arena Import** — Paste an Arena deck export to bulk-add cards
- **Mana Curve Chart** — Stacked bar chart showing creatures vs. spells by CMC
- **Deck Analysis** — Automated suggestions for creature count, interaction, curve shape, and splash viability
- **Type Breakdown & Extended Stats** — Instants, sorceries, enchantments, artifacts, planeswalkers
- **Land Calculator & Mana Base Breakdown** — See below
- **Two-Column Layout on Wide Screens** — Analysis on the left, land calculator and mana base on the right

### Visual Curve
An Arena-style deck layout showing actual card art organized by mana value.

- **Card Art Columns** — Cards stacked by CMC with a separate lands column, using real Scryfall images
- **Castability Badges** — Once you have 8+ spells, cards you'll struggle to cast on curve get an amber (<85%) or red (<65%) badge
- **Tap Land Warning** — Flags decks running 3+ tapped lands
- **Quick Side Mode** — On by default; one-tap sideboard moves with no confirmation step (toggle off for tap-to-select with a magnified card view)
- **Delete Mode** — One-tap permanent removal, with Undo
- **Drag & Drop** — See below
- **Clean Up Deck** — Automatically detects your main colors and flags off-color cards; preview and confirm which to sideboard in one pass
- **Sideboard Display** — Horizontal row of stacked card art below the main deck; tap a card to move it back
- **Export** — Copies the deck (and sideboard) to your clipboard in Arena format
- **Share Image** — Generates a single image of your deck layout to save or send

### Drag & Drop (Visual Curve)
Arrange the curve however you want to see it.

- **Long-press to lift** — Hold a card for about a third of a second, then drag. Swiping without holding still scrolls normally, and a plain tap still does what the Side/Delete toggles say
- **Move between columns** — Drop a card on any column, including empty ones (they appear as narrow drop slots while you drag). Useful for alternate-cost spells (Force of Will, Fury) you want in the 0 slot, or cards you plan to cast later than their mana value
- **Display only** — Moved cards show a small ⇄ marker. Mana value, curve stats, castability, the land calculator and export are not affected
- **Per copy** — Each copy of a card can sit in its own column
- **Drag to sideboard** — A "Drop to Sideboard" bar appears at the bottom while you drag
- **Drag from sideboard** — Drag a sideboard card straight into any column of the main deck
- **↺ Columns** — Appears whenever something has been moved; snaps everything back to mana value (with Undo)
- **Saved** — Your custom layout is saved with the deck and shows up in the share image
- Works with touch and mouse

### Foldables, Tablets & Desktop
Built for phones first, and adapts when there's more room.

- **Split View (820px+ wide)** — Draft on the left, Curve on the right, each scrolling on its own. The Curve side updates live as you pick. On the iPhone Duo this kicks in when unfolded, with the split landing on the fold
- **Adapts on the fly** — Folding, unfolding, rotating, or resizing an iOS Split View window switches layouts automatically
- **Wider card grid** — The draft card grid goes to 4 columns when there's space
- **Short-screen tweaks** — A tighter draft header on short displays like the Duo's outer screen
- Builder still opens full screen; tapping Draft or Curve returns to the split

### Land Calculator
Smart mana base recommendations with correct dual land math.

- **16-Land Standard** — Defaults to 16 lands when defensible; only recommends 17 for heavy curves (avg CMC > 3.2 or < 4 early plays)
- **Dampened Ratio Distribution** — Uses square root compression on pip demand so secondary colors don't get starved (a raw 2:1 pip ratio produces ~1.4:1 land split, not 2:1)
- **Minimum Source Floor** — Non-splash colors always get at least 5 sources; splash colors get at least 2. Prevents uncastable secondary colors
- **Correct Dual Land Logic** — Each dual/tri/fetch counts as 1 land slot but a full source for every color it produces
- **Hybrid Mana Awareness** — Hybrid pips create zero additional land demand (they're always castable with your existing colors); display logic assigns them to your primary color
- **Tappable Basics** — Recommended basic counts are buttons; tap to add, or use "Add All"
- **Set-Accurate Art** — Basics added via the calculator use card art from the loaded set
- **Color Availability Chart** — Hypergeometric probability of having each color by turn, with smart turn windows:
  - Main colors: T2–T5 (your curve window)
  - Splash colors: T4–T7 (when you'd actually cast them)
  - Automatic splash detection with actionable advice

### Sideboard Management
- Move cards between main deck and sideboard from multiple views
- **Drag & Drop** — Drag cards to and from the sideboard on the Visual Curve
- **Recent Picks modal** — Quick triage of recent picks without scrolling through the entire pool
- **Clean Up Deck** — One-tap bulk sideboarding of off-color cards from Visual Curve
- **Quick Side** — One-tap sideboarding directly from the Visual Curve card columns
- Full-screen review overlay accessible from the draft view
- Auto-closes when switching navigation tabs

### Tokens (Game Mode)
A full-screen token board for playing the deck you built. Tap **Tokens** in the bottom nav; **‹ Deck** takes you back.

**Getting tokens**
- **Your deck’s tokens, automatically** — Looks up every card in your deck and sideboard on Scryfall and lists every token they can make, with the cards that make each one. Sideboard tokens are listed separately
- **Official token images** — Real Scryfall token cards, not placeholders
- **Choose your art** — Long-press a token and pick **Change art** to see every art that token has been printed with. Your pick is remembered for future games
- **Search any token** — The Search tab finds any token on Scryfall, for when something outside your deck makes one
- **Token copies** — The Copy a Card tab makes a token copy of any card in your deck or sideboard

**Playing with them**
- **Tap acts on one token** — Tap a token, or the top of a pile, to tap or untap one of them. Tapped tokens turn sideways like on the table
- **Spread a pile** — Tap the ×number on a pile to spread it out in a tray, then tap the cards one at a time. **Done** stacks them back up
- **Long-press for the menu** — Pick **How many?** with one tap (1–10, or All for big piles), then attack, tap, untap, use an ability, add counters or remove
- **Smart tokens** — The board reads each token’s abilities from its rules text, so it works for obscure tokens too, not just a fixed list:
  - **Treasure, Clue, Food, Blood, Gold, Map, Junk, Shard, Lander and the like:** tap once to tap it, tap again to use it. The token is sacrificed and its effect happens
  - **Mana:** a color wheel appears for “any color” mana (Treasure, Gold). Fixed mana (Eldrazi Spawn, Powerstone) is added straight away. Tapping a Powerstone adds its mana
  - **Everything else** (draw a card, gain 3 life, scry, explore…) shows as a reminder, since it happens off the board. Extra costs like “pay 2” or “discard a card” are listed on the button
  - **Attack triggers** that make a named token (Goblin Shaman’s Treasure) offer a one-tap button to create them after you attack
- **Floating mana** — A strip under the header shows mana your tokens made, by color. Tap a color to spend one, or **Empty** to clear it. It also empties on **Untap all**. Costs aren’t taken out automatically, since you might pay with lands
- **+1/+1 and −1/−1 counters** — A green or red badge on the card shows the counters, and the power/toughness chip turns green or red. The two kinds cancel out like the real rules, and a token that drops to 0 toughness is removed (with Undo)
- **Summoning sickness** — New creature tokens show a sleep badge until your next untap. Haste tokens skip it, **Give haste** clears it, and vigilance tokens don’t tap when they attack
- **Untap all** — Your untap step: untaps everything, clears summoning sickness and empties floating mana
- **Undo** — Every change can be undone; **Clear** (tap twice) empties the board
- **Auto-sizing** — One token type gets up to half the screen; cards shrink to fit as you add more, and the layout reflows when you fold, unfold or rotate
- **Saved** — The board and floating mana survive closing the app, so a game in progress is still there when you come back
- **Screen stays on** — While the Tokens page is open, the phone won’t go to sleep (where the browser allows it)
- **Never touches your deck** — Tokens only reads your deck; nothing you do on the board changes your pool or sideboard
- **Not yet supported** — Tokens that transform (Incubator) and abilities that need a target are shown as text only

---

## Technical Notes

- **Two files, no build step** — `index.html` is the app; `tokens.js` adds the Tokens tab and is loaded by one line near the bottom of `index.html` (`<script src="tokens.js"></script>`). Delete that line to turn Tokens off without touching anything else. No framework, no bundler.
- **Scryfall API** — All card data comes from [Scryfall](https://scryfall.com/docs/api). Rate-limited politely (50–100ms between requests).
- **No server** — Everything runs in the browser. Your pool, sideboard and custom column layout are saved in your browser's local storage on that device only; nothing is sent anywhere except card lookups to Scryfall.
- **Tokens data** — The token list comes from each card's related-parts data on Scryfall (`all_parts`), looked up in batches of 75. Token abilities are read from the rules text, which Scryfall writes in a consistent "cost: effect" format. The token board, your art choices and the last token lookup are saved under the `dt_tokens_*` keys in local storage, separate from the deck. Tokens are matched by Scryfall's oracle ID, so different printings of the same token count as one.
- **Offline** — There's no offline mode yet. Card and token images need a connection the first time they load; after that the browser usually has them cached.
- **DFC Support** — Double-faced cards use front-face colors and mana cost, so transform cards like Ajani, Nacatl Pariah correctly show as their casting color.
- **Mobile-First, Responsive** — Designed for phone use during a live draft. Layout is driven by available width (not device detection), so it also works in iOS Split View, on tablets and on desktop.
- **Custom touch handling** — Drag & drop uses its own long-press logic instead of the browser's built-in drag API, which doesn't work reliably with touch on iOS. The hold time is set by `DRAG_HOLD_MS` in the script.

---

## Files

| File | What it is |
|------|------------|
| `index.html` | The whole Draft Table app: Draft, Builder and Curve |
| `tokens.js` | The Tokens tab and token board. Loaded by `index.html` |
| `manifest.json` | Lets the app be added to your home screen |
| `icon-192.png`, `icon-512.png` | Home screen icons |
| `README.md` | This file |

**Updating:** on GitHub, use **Add file → Upload files** and drop in the changed file. A file with the same name is replaced. GitHub Pages republishes in a minute or two; if the home screen app still shows the old version, close it fully and reopen it after a few minutes.

---

## Card Sources

| Mode | Description | Load Time |
|------|-------------|-----------|
| **Single Set** | Any draftable set from Scryfall | ~5–10 sec |
| **Chaos Draft** | Multiple sets loaded together (up to 12+) | ~30–40 sec |
| **Cube Import** | Paste a card list, batch-fetched from Scryfall | ~60–90 sec for 540 cards |

---

## Probability Math

The color availability chart uses the [hypergeometric distribution](https://en.wikipedia.org/wiki/Hypergeometric_distribution) to calculate the probability of drawing at least one source of a given color by a specific turn. Parameters:

- **Population (N):** 40 (deck size)
- **Successes (K):** Total sources of that color (basics + every drafted land producing it, counted as full 1 each)
- **Draws (n):** Cards seen by that turn (7 for opening hand + 1 per draw step)

Dual lands count as 1 slot toward total land count but as a full source for each color they produce. This correctly reflects that a Breeding Pool is just as likely to provide green mana as a Forest when you draw it.

### Land Split Algorithm

Basic land distribution uses a dampened ratio model informed by Frank Karsten's colored source research:

1. **Pip counting** — Only strict mono-color pips (`{W}`, `{U}`, etc.) create land demand. Hybrid pips are excluded (zero demand) since they're payable with either color.
2. **Drafted land offset** — Each drafted land reduces demand for its colors, weighted at 1.5x to reflect that non-basic lands are slightly more valuable than a single basic.
3. **Curve weighting** — Colors with early-curve cards (CMC ≤ 2) get a 1.2x demand boost; late-curve colors (CMC ≥ 5) get 0.85x.
4. **Square root dampening** — The weighted demands are square-rooted before computing ratios. This compresses extreme splits: a raw 2:1 demand ratio becomes ~1.4:1 in land count, matching how experienced players and Arena distribute lands.
5. **Minimum source floor** — Non-splash colors (≥18% pip share) are guaranteed at least 5 total sources (basics + drafted lands). Splash colors get a floor of 2. Based on Karsten's finding that dropping below ~5 sources makes a color nearly uncastable.

---

## Changelog

### November 2026
- **Smarter tokens:** tap-then-tap-again to use Treasure, Clue, Food and other tokens; mana color wheel and floating mana pool; tap a pile’s number to spread it in a tray; one-tap How Many buttons in the menu; +1/+1 and −1/−1 counter badges; attack-trigger tokens
- **Tokens tab:** a full-screen token board with every token your deck and sideboard can make, official Scryfall token images, art choice, search for any token, token copies of deck cards, stacks with tap/attack X, +1/+1 counters, summoning sickness, Untap all and Undo
- Split View (Draft + Curve side by side) on screens 820px+ wide, built around the iPhone Duo's unfolded display
- Long-press drag & drop on the Visual Curve: move cards between columns (display only), to/from the sideboard
- ↺ Columns reset with Undo; custom layout saved with the deck and used in the share image
- Builder two-column layout on wide screens (fixes the cramped 320px column on desktop)
- 4-column draft card grid when space allows; tighter header on short screens

---

## License

This project uses the Scryfall API but is not affiliated with or endorsed by Scryfall, Wizards of the Coast, or Hasbro. Card images and data are provided by Scryfall under their terms of use.
