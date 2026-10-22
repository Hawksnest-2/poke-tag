
/poke-center
│
├── index.html
│
├── /assets
│   ├── /logos
│   │    ├── cardback.jpg
│   │    ├── 01_Scarlet_Violet_logo.png
│   │    └── ... all 23 logos
│   │
│   └── /audio
│        └── catch.mp3
│
├── /css
│   ├── collection-selector.css
│   ├── card-viewer.css
│   └── my-collections.css
│
├── /js
│   ├── manifest.js
│   └── collection-selector.js
│   └── rarity.js
│
│
└── /collections
    ├── 01_Scarlet_Violet/
    │   └── cardData.js
    ├── 02_SV_Paldea_Evolved/
    │   └── cardData.js
    └── ... all 23 collections



===========
Collection Order:

01_Scarlet_Violet_logo.png
02_SV_Paldea_Evolved_logo.png
03_SV_Obsidian_Flames_logo.png
04_SV_151_logo.png
05_SV_Paradox_Rift_logo.png
06_SV_Paldean_Fates_logo.png
07_SV_Temporal_Forces_logo.png
08_SV_Twilight_Masquerade_logo.png
09_SV_Shrouded_Fable_logo.png
10_SV_Stellar_Crown_logo.png
11_SV_Surging_Sparks_logo.png
12_SV_Prismatic_Evolutions_logo.png
13_SV_Journey_Together_logo.png
14_SV_Destined_Rivals_logo.png
15_SV_Black_Bolt_logo.png
16_SV_White_Flare_logo.png
17_Mega_Evolution_logo.png
18_ME_Phantasmal_Flames_logo.png
19_ME_Ascended_Heroes_logo.png
20_ME_Perfect_Order_logo.png
21_ME_Chaos_Rising_logo.png
22_ME_Pitch_Black_logo.png
23_ME_30th_Celebration_logo.png


=================
┌──────────────────────────────────────────────┐
│                index.html                    │
│  (All screens exist in one HTML file)        │
└──────────────────────────────────────────────┘
                ▲               ▲
                │               │
                │               │
        CSS (3 files)      JS Controller
                │          collection-selector.js
                │               │
                ▼               ▼
┌──────────────────────────────────────────────┐
│                SCREENS                       │
│  (Shown/hidden via JS, not separate pages)   │
│                                              │
│  • Home (Poké‑Center)                        │
│  • Collection Selector                       │
│  • Collection Overview                       │
│  • Card Viewer                               │
│  • Pokedex (formerly My Collections)         │
│  • Card Modal                                │
└──────────────────────────────────────────────┘
                ▲
                │
                │
                ▼
┌──────────────────────────────────────────────┐
│                DATA MODULES                  │
│                                              │
│  manifest.js → list of collections           │
│  rarity.js   → rarity icons                  │
│  /collections/<id>/cardData.js → card data   │
└──────────────────────────────────────────────┘


=================
                         ┌──────────────────────┐
                         │      Poké‑Center     │
                         │   (main-header)      │
                         └──────────┬───────────┘
                                    │
                                    ▼
                         ┌──────────────────────┐
                         │  Collection Selector │
                         │ (collection-selector)│
                         └──────────┬───────────┘
                                    │ click tile
                                    ▼
                         ┌──────────────────────┐
                         │  Collection Overview │
                         │ (collection-overview)│
                         └───────┬───────┬─────┘
                                 │       │
                                 │       │ click "My Pokedex"
                                 │       ▼
                                 │   ┌──────────────────────┐
                                 │   │       Pokedex        │
                                 │   │      (pokedex)       │
                                 │   └──────────┬───────────┘
                                 │              │ click tile
                                 │              ▼
                                 │   ┌──────────────────────┐
                                 │   │     Card Viewer      │
                                 │   │    (card-viewer)     │
                                 │   └──────────┬───────────┘
                                 │              │ click card
                                 │              ▼
                                 │   ┌──────────────────────┐
                                 │   │      Card Modal      │
                                 │   │     (card-modal)     │
                                 │   └──────────┬───────────┘
                                 │              │ close modal
                                 └──────────────┘


=================
collection-selector.js
│
├── State Management
│     • currentCollectionId
│     • currentCollectionData
│     • ownedCards (Map)
│     • pendingCatchRefresh
│     • currentModalCard
│
├── Screen Controller
│     • showScreen("home")
│     • showScreen("overview")
│     • showScreen("viewer")
│     • showScreen("pokedex")
│
├── Data Loading
│     • loadCollectionData(collectionId)
│     • loadOwnedCards()
│     • saveOwnedCards()
│
├── Render Functions
│     • renderCollectionSelector()
│     • enterCollectionOverview()
│     • renderCardViewer()
│     • renderPokedexPage()
│
├── Modal Logic
│     • openCardModal()
│     • closeCardModal()
│
├── Catch Logic
│     • catchRandomPokemon()
│
├── Reset Logic
│     • resetCurrentCollection()
│
└── Event Listeners
      • Home → Pokedex
      • Overview → Viewer
      • Viewer → Overview
      • Back buttons
      • Catch button
      • Reset button
      • Modal close

=================
┌──────────────────────────────────────────────┐
│                DATA SOURCES                  │
│                                              │
│  manifest.js  → list of collections          │
│  rarity.js    → rarity icons                 │
│  cardData.js  → per‑collection card lists    │
│  localStorage → owned card state             │
└──────────────────────────────────────────────┘
                     │
                     │  (import / dynamic import)
                     ▼
┌──────────────────────────────────────────────┐
│        JS CONTROLLER: collection-selector.js │
│                                              │
│  1. Load static data                         │
│     • collections[] from manifest.js         │
│     • rarityLegend from rarity.js            │
│                                              │
│  2. Load dynamic card data                   │
│     • loadCollectionData(id) → cardData.js   │
│                                              │
│  3. Load persistent user data                │
│     • loadOwnedCards() → localStorage        │
│     • ownedCards Map                         │
│                                              │
│  4. Compute derived data                     │
│     • ownedCount per collection              │
│     • rarity buckets                         │
│     • unowned cards for catch logic          │
│                                              │
│  5. Render UI                                │
│     • renderCollectionSelector()             │
│     • enterCollectionOverview()              │
│     • renderCardViewer()                     │
│     • renderPokedexPage()                    │
│                                              │
│  6. Update persistent state                  │
│     • saveOwnedCards() → localStorage        │
│                                              │
│  7. User interactions                        │
│     • click collection tile                  │
│     • click card tile                        │
│     • click catch button                     │
│     • click reset button                     │
│     • click My Pokedex buttons               │
│     • click back buttons                     │
└──────────────────────────────────────────────┘
                     │
                     │  (DOM manipulation)
                     ▼
┌──────────────────────────────────────────────┐
│                DOM / UI SCREENS              │
│                                              │
│  #main-header                                │
│  #collection-selector                         │
│  #collection-overview                         │
│  #card-viewer                                 │
│  #pokedex                                     │
│  #card-modal                                  │
└──────────────────────────────────────────────┘

=================
DATA FLOW (STEP‑BY‑STEP)
Here’s the same diagram in a more narrative flow:

1. Static data loads first
  - manifest.js → list of collections
  - rarity.js → rarity icons

2. JS loads user state
  - loadOwnedCards() reads from localStorage
  - Populates ownedCards Map

3. User selects a collection
  - JS dynamically imports /collections/<id>/cardData.js
  - Normalizes the export
  - Stores it in collectionCache

4. JS computes derived values
  - Total cards
  - Owned cards
  - Rarity buckets
  - Unowned cards (for catch logic)

5. JS renders the appropriate screen
  - Home → renderCollectionSelector()
  - Overview → enterCollectionOverview()
  - Viewer → renderCardViewer()
  - Pokedex → renderPokedexPage()

6. User interacts
  - Clicking tiles
  - Catching Pokémon
  - Resetting collection
  - Opening modal
  - Closing modal
  - Navigating screens

7. JS updates persistent state
  - saveOwnedCards() writes to localStorage

8. UI updates immediately
  - DOM is updated
  - CSS applies styling
  - Modal shows card details
  - Progress bars animate
=================
manifest.js + rarity.js
        ↓
collection-selector.js
        ↓
loadCollectionData() → cardData.js
        ↓
ownedCards Map ←→ localStorage
        ↓
render functions → DOM
        ↓
user actions → JS events
        ↓
saveOwnedCards() → localStorage


=================
STORAGE LIFECYCLE DIAGRAM
This shows how owned card data moves between JS memory and localStorage.
┌──────────────────────────────────────────────┐
│                APP STARTS                    │
└──────────────────────────────────────────────┘
                     │
                     ▼
        loadOwnedCards() runs automatically
                     │
                     ▼
┌──────────────────────────────────────────────┐
│   localStorage.getItem("ownedCards")         │
│   → JSON string or null                      │
└──────────────────────────────────────────────┘
                     │
                     ▼
If data exists:
    JSON.parse(raw)
    ownedCards.clear()
    ownedCards.set(key, value)
Else:
    ownedCards stays empty
                     │
                     ▼
┌──────────────────────────────────────────────┐
│        ownedCards Map (in-memory state)      │
└──────────────────────────────────────────────┘
                     │
                     ▼
User actions modify ownedCards:
    • catchRandomPokemon()
    • resetCurrentCollection()
                     │
                     ▼
saveOwnedCards() is called
                     │
                     ▼
┌──────────────────────────────────────────────┐
│   JSON.stringify(Object.fromEntries(Map))    │
│   → localStorage.setItem("ownedCards", json) │
└──────────────────────────────────────────────┘
                     │
                     ▼
Data persists across page reloads


Summary:  
App uses a Map in memory for fast lookups and localStorage for persistence.
The lifecycle is: load → modify → save → reload.
=================
2. HOW CATCH LOGIC WORKS (DIAGRAM)
This shows the full flow when the user taps the “catch” icon.
User taps "catch" button
        │
        ▼
┌──────────────────────────────────────────────┐
│ 1. Filter unowned cards                      │
│    unowned = cards.filter(card not owned)    │
└──────────────────────────────────────────────┘
        │
        ▼
If unowned.length === 0:
    alert("You already own all cards!")
    STOP
        │
        ▼
┌──────────────────────────────────────────────┐
│ 2. Pick a random unowned card                │
│    randomCard = unowned[Math.random()]       │
└──────────────────────────────────────────────┘
        │
        ▼
┌──────────────────────────────────────────────┐
│ 3. Mark card as owned                        │
│    ownedCards.set(key, true)                 │
│    saveOwnedCards()                          │
└──────────────────────────────────────────────┘
        │
        ▼
┌──────────────────────────────────────────────┐
│ 4. Prepare modal                             │
│    modalImage.src = card front               │
│    modalName.textContent = card.name         │
│    modal rarity icon + text                  │
│    modal border color based on rarity        │
└──────────────────────────────────────────────┘
        │
        ▼
┌──────────────────────────────────────────────┐
│ 5. Show modal                                │
│    cardModal.classList.remove("hidden")      │
└──────────────────────────────────────────────┘
        │
        ▼
┌──────────────────────────────────────────────┐
│ 6. Set pendingCatchRefresh = true            │
│    (viewer will refresh after modal closes)  │
└──────────────────────────────────────────────┘

Summary:  
Catch logic is: find unowned → pick one → mark owned → show modal → refresh viewer.
=================
3. HOW RESET LOGIC WORKS (DIAGRAM)
This shows what happens when the user taps “Reset My Pokedex”.
User taps "Reset My Pokedex"
        │
        ▼
┌──────────────────────────────────────────────┐
│ 1. Confirm dialog                            │
│    if (!confirm(...)) STOP                   │
└──────────────────────────────────────────────┘
        │
        ▼
┌──────────────────────────────────────────────┐
│ 2. Loop through all cards in current set     │
│    for each card:                            │
│        key = `${collectionId}:${cardNumber}` │
│        ownedCards.delete(key)                │
└──────────────────────────────────────────────┘
        │
        ▼
┌──────────────────────────────────────────────┐
│ 3. saveOwnedCards()                          │
│    → writes updated Map to localStorage       │
└──────────────────────────────────────────────┘
        │
        ▼
┌──────────────────────────────────────────────┐
│ 4. Refresh viewer                            │
│    renderCardViewer()                        │
│    → all cards now appear unowned            │
└──────────────────────────────────────────────┘

Summary:  
Reset logic is: confirm → delete all owned keys → save → refresh viewer.
=================
4. HOW MODAL LOGIC WORKS (DIAGRAM)
This shows how the modal opens, displays rarity, and closes.
User clicks a card tile
        │
        ▼
┌──────────────────────────────────────────────┐
│ 1. openCardModal(card, isOwned)              │
└──────────────────────────────────────────────┘
        │
        ▼
┌──────────────────────────────────────────────┐
│ 2. Determine image                           │
│    if owned → show front                     │
│    else → show cardback                      │
└──────────────────────────────────────────────┘
        │
        ▼
┌──────────────────────────────────────────────┐
│ 3. Set modal text                            │
│    modalName = card.name                     │
│    modal-rarity-icon = rarityLegend[rarity]  │
│    modal-rarity-text = rarity                │
└──────────────────────────────────────────────┘
        │
        ▼
┌──────────────────────────────────────────────┐
│ 4. Apply rarity border                       │
│    content.classList.add("rarity-*")         │
└──────────────────────────────────────────────┘
        │
        ▼
┌──────────────────────────────────────────────┐
│ 5. Show modal                                │
│    cardModal.classList.remove("hidden")      │
└──────────────────────────────────────────────┘
        │
        ▼
User clicks ✖ close button
        │
        ▼
┌──────────────────────────────────────────────┐
│ 6. closeCardModal()                          │
│    hide modal                                │
│    reset pinch zoom state                    │
│    clear currentModalCard                    │
└──────────────────────────────────────────────┘
        │
        ▼
If pendingCatchRefresh === true:
    renderCardViewer()
    pendingCatchRefresh = false

Summary:  
Modal logic is: open → populate → style → show → close → optional viewer refresh.
=================
the Event Flow Diagram, showing every click → JS → DOM update in your Poké‑Center / Pokedex app.
This is the most complete, developer‑friendly event map possible — it traces every user action, the exact JS function that runs, and the DOM changes that follow.

USER ACTION
    │
    ▼
EVENT LISTENER (JS)
    │
    ▼
JS HANDLER FUNCTION
    │
    ▼
STATE UPDATE (optional)
    │
    ▼
DOM UPDATE (screen switch, modal, grid, etc.)


=================
HOME SCREEN EVENTS
A. User clicks a collection tile
Click: .collection-tile
    │
    ▼
JS: enterCollectionOverview(collectionId)
    │
    ▼
State:
    currentCollectionId = id
    currentCollectionData = loadCollectionData(id)
    rarityCounts computed
    ownedCount computed
    │
    ▼
DOM:
    showScreen("overview")
    update overview title
    update logo
    update rarity bars
    update owned/total text

B. User clicks “My Pokedex” button
Click: #my-pokedex-button
    │
    ▼
JS:
    renderPokedexPage()
    showScreen("pokedex")
    │
    ▼
DOM:
    pokedex-grid populated with owned collections

=================
COLLECTION OVERVIEW EVENTS
A. User clicks “Return to Poké‑Center”
Click: #overview-back-button
    │
    ▼
JS: showScreen("home")
    │
    ▼
DOM: home screen visible

B. User clicks “My Pokedex”
Click: #overview-pokedex-button
    │
    ▼
JS: renderCardViewer()
    │
    ▼
DOM:
    showScreen("viewer")
    card-grid populated

C. User clicks “Catch” icon
Click: #catch-open-image
    │
    ▼
JS: catchRandomPokemon()
    │
    ▼
State:
    random unowned card selected
    ownedCards.set(key, true)
    saveOwnedCards()
    pendingCatchRefresh = true
    │
    ▼
DOM:
    modal populated with card info
    modal shown

=================
CARD VIEWER EVENTS
A. User clicks “Return to Collection”
Click: #viewer-back-button
    │
    ▼
JS: enterCollectionOverview(currentCollectionId)
    │
    ▼
DOM: overview screen shown

B. User clicks “My Pokedex”
Click: #viewer-pokedex-button
    │
    ▼
JS: renderCardViewer()
    │
    ▼
DOM: viewer screen refreshed

C. User clicks a card tile
Click: .card-tile
    │
    ▼
JS: openCardModal(card, isOwned)
    │
    ▼
DOM:
    modal image set
    modal rarity set
    modal border set
    modal shown

D. User clicks “Reset My Pokedex”
Click: #reset-pokedex-button
    │
    ▼
JS: resetCurrentCollection()
    │
    ▼
State:
    ownedCards.delete(key) for all cards
    saveOwnedCards()
    │
    ▼
DOM:
    renderCardViewer()
    all cards appear unowned

=================
POKEDEX PAGE EVENTS
A. User clicks a collection tile
Click: .mc-tile
    │
    ▼
JS:
    currentCollectionId = col.id
    currentCollectionData = data
    renderCardViewer()
    │
    ▼
DOM:
    showScreen("viewer")
    card-grid populated

B. User clicks “Return to Poké‑Center”
Click: #mc-back-button
    │
    ▼
JS: showScreen("home")
    │
    ▼
DOM: home screen visible


=================
MODAL EVENTS
A. User clicks “✖” close button

Click: #modal-close
    │
    ▼
JS: closeCardModal()
    │
    ▼
State:
    currentModalCard = null
    scale reset
    startDistance reset
    │
    ▼
DOM:
    modal hidden

B. If catch was used
pendingCatchRefresh === true
    │
    ▼
JS: renderCardViewer()
pendingCatchRefresh = false
    │
    ▼
DOM:
    viewer refreshed
    new card appears owned


=================
TOUCH EVENTS (Pinch Zoom)
A. User pinch‑zooms modal image
Touchmove: #modal-image (2 fingers)
    │
    ▼
JS:
    compute distance
    scale = distance / startDistance
    modalImage.style.transform = scale()
    │
    ▼
DOM:
    image zooms smoothly

B. User lifts fingers
Touchend: #modal-image
    │
    ▼
JS:
    startDistance = 0


=================

=================
Audio to add Later:
 - flip.mp3
 - open-pack.mp3
 - rare.mp3
 - legendary.mp3
All of these belong in /assets/audio/.




