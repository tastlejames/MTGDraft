# ⬡ Draft Table — MTG Draft Assistant

A mobile-first web tool for Magic: The Gathering drafting. Built as a single HTML file with no dependencies beyond Google Fonts and the Scryfall API.

Draft Table helps you track picks during a live draft, build your deck afterward, and make smarter decisions about your mana base — all from your phone.

---

## Quick Start

1. Open `draft-table.html` in any browser (desktop or mobile)
2. On the **Draft** tab, search for your set and load it
3. Use the color and mana value filters to find cards as you draft
4. Tap cards to add them to your pool
5. Switch to **Builder** for detailed analysis or **Curve** for a visual deck layout

No install, no server, no account. Everything runs client-side.

---

## Features

### ⚡ Quick Draft Mode
The default view, optimized for speed on mobile during a live draft.

- **Set Loading** — Search any draftable set; card data is cached in memory for instant filtering
- **Filter-Based Card Selection** — Tap color buttons (W/U/B/R/G/C) and a mana value to narrow results, then tap card art to add
- **Exact Color Identity** — Selecting WU shows only gold WU cards, not mono-W or mono-U
- **Dedicated Lands Button** — Full-width button shows all non-basic lands; color buttons narrow by produced color (OR logic)
- **Lock Filters Toggle** — Keep your color/MV filters between picks when you're deep in a color pair
- **Last 3 Picks** — Quick-access button showing your most recent picks as card images with instant sideboard buttons
- **Auto Filter Reset** — Filters clear after each pick by default for a fresh view of the next pack (disable with Lock toggle)
- **Manual Search Fallback** — Scryfall autocomplete for Special Guests, bonus sheets, or any card not in the loaded set
- **Chaos Draft** — Load multiple sets at once for multi-set draft formats
- **Cube Import** — Paste a card list to use as your draft pool

### ⬡ Builder Mode
The full deckbuilding toolkit, carried over from the original version with enhancements.

- **Scryfall Autocomplete** — Type-ahead card search with automatic type, CMC, and color detection
- **Arena Import** — Paste an Arena deck export to bulk-add cards
- **Mana Curve Chart** — Stacked bar chart showing creatures vs. spells by CMC
- **Deck Analysis** — Automated suggestions for creature count, interaction, curve shape, and splash viability
- **Extended Stats** — Breakdown by card type (instants, sorceries, enchantments, artifacts, planeswalkers)
- **Gemini AI Analysis** — Optional deep analysis powered by Google's Gemini API (bring your own key)

### 📊 Visual Curve
An Arena-style deck layout showing actual card art organized by mana value.

- **Card Art Columns** — Cards stacked by CMC with a separate lands column, using real Scryfall images
- **Quick Side Mode** — On by default; one-tap sideboard moves with no confirmation step (toggle off for select-then-move flow)
- **Clean Up Deck** — Automatically detects your main colors and flags off-color cards; preview and confirm which to sideboard in one pass
- **Sideboard Display** — Horizontal row of stacked card art below the main deck; duplicates overlap within their stack
- **Tap-to-Select** — When Quick Side is off, tap a card to select it, then use the floating action bar to sideboard it
- **Empty State** — If all cards are sideboarded, the sideboard row stays visible so you can move cards back

### 🏔 Land Calculator
Smart mana base recommendations with correct dual land math.

- **16-Land Standard** — Defaults to 16 lands when defensible; only recommends 17 for heavy curves (avg CMC > 3.2 or < 2 early drops)
- **Correct Dual Land Logic** — Each dual/tri/fetch counts as 1 land slot but a full source for every color it produces
- **Hybrid Mana Awareness** — Hybrid pips create zero additional land demand (they're always castable with your existing colors); display logic assigns them to your primary color
- **Tappable Basics** — Recommended basic counts are buttons; tap to add, or use "Add All"
- **Set-Accurate Art** — Basics added via the calculator use card art from the loaded set
- **Color Availability Chart** — Hypergeometric probability of having each color by turn, with smart turn windows:
  - Main colors: T2–T5 (your curve window)
  - Splash colors: T4–T7 (when you'd actually cast them)
  - Automatic splash detection with actionable advice

### 📋 Sideboard Management
- Move cards between main deck and sideboard from multiple views
- **Last 3 Picks modal** — Quick triage of recent picks without scrolling through entire pool
- **Clean Up Deck** — One-tap bulk sideboarding of off-color cards from Visual Curve
- **Quick Side** — One-tap sideboarding directly from the Visual Curve card columns
- Full-screen review overlay accessible from the draft view
- Auto-closes when switching navigation tabs

---

## Technical Notes

- **Single HTML file** — No build step, no framework, no bundler. Just open it.
- **Scryfall API** — All card data comes from [Scryfall](https://scryfall.com/docs/api). Rate-limited politely (50–100ms between requests).
- **No server** — Everything runs in the browser. No data is stored or transmitted except optional Gemini API calls.
- **DFC Support** — Double-faced cards use front-face colors and mana cost, so transform cards like Ajani, Nacatl Pariah correctly show as their casting color.
- **Mobile-First** — Designed for phone use during a live draft. Works on desktop too.

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

---

## License

This project uses the Scryfall API but is not affiliated with or endorsed by Scryfall, Wizards of the Coast, or Hasbro. Card images and data are provided by Scryfall under their terms of use.
