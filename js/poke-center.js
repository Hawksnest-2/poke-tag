/******************************************************************************
poke-center.js

Poké‑Center Collection Manager
Features
---------
• Collection Selection
• Collection Statistics
• Random Card Catching
• Card Viewer
• Card Modal
• My Pokedex
• Local Storage Progress Tracking

******************************************************************************/
/******************************************************************************
IMPORTS
******************************************************************************/
import { collections } from "./manifest.js";
import { rarityLegend } from "./rarity.js";

/******************************************************************************
RARITY CONFIGURATION
******************************************************************************/
const rarityConfig = {
    common: { icon: rarityLegend["Common"], keys: ["Common"] },
    uncommon: { icon: rarityLegend["Uncommon"], keys: ["Uncommon"] },
    rare: {
        icon: rarityLegend["Rare"],
        keys: [
            "Rare", "Double Rare", "Ultra Rare", "Classic Collection",
            "Illustration Rare", "Special Illustration Rare", "Shiny Rare",
            "Shiny Ultra Rare", "Mega Attack Rare", "Hyper Rare",
            "Mega Hyper Rare", "Pikachu Rare", "Futuristic Rare",
            "Black White Rare", "ACE SPEC Rare"
        ]
    }
};

/******************************************************************************
CACHE & STATE
******************************************************************************/
const collectionCache = new Map();
const ownedCards = new Map();

let currentCollectionId = null;
let currentCollectionData = null;
let pendingCatchRefresh = false;
let currentModalCard = null;
let scale = 1;
let startDistance = 0;
let currentX = 0;
let currentY = 0;
let startX = 0;
let startY = 0;
let isDragging = false;
let isSoundEnabled = true;
let defaultViewerFilter = "all";

/******************************************************************************
DOM REFERENCES
******************************************************************************/
/* New Settings DOM Reference Hooks */
const settingsPage = document.getElementById("settings-page");
const settingsOpenBtn = document.getElementById("settings-open-btn");
const settingsReturnButton = document.getElementById("settings-return-button");
const settingsSoundToggle = document.getElementById("settings-sound-toggle");
const settingsBackupBox = document.getElementById("settings-backup-box");
const settingsCopyBtn = document.getElementById("settings-copy-btn");
const settingsImportBtn = document.getElementById("settings-import-btn");
const resetAllButton = document.getElementById("reset-all-button");
const settingsDefaultFilter = document.getElementById("settings-default-filter");
/* Home */
const mainHeader = document.getElementById("main-header");
const collectionSelector = document.getElementById("collection-selector");
const myPokedexButtonHome = document.getElementById("home-pokedex-button");
/* Collection Overview */
const collectionOverview = document.getElementById("collection-overview");
const overviewTotal = document.getElementById("overview-total");
const overviewStatsTitle = document.getElementById("overview-stats-title");
const overviewCatchTitle = document.getElementById("overview-catch-title");
const overviewReturnButton = document.getElementById("overview-return-button");
const overviewPokedexButton = document.getElementById("overview-pokedex-button");
const catchOpenImageOverview = document.getElementById("catch-open-image");
/* Rarity */
const rarityCommonIcon = document.getElementById("rarity-common-icon");
const rarityUncommonIcon = document.getElementById("rarity-uncommon-icon");
const rarityRareIcon = document.getElementById("rarity-rare-icon");
const rarityCommonFill = document.getElementById("rarity-common-fill");
const rarityUncommonFill = document.getElementById("rarity-uncommon-fill");
const rarityRareFill = document.getElementById("rarity-rare-fill");
const rarityCommonText = document.getElementById("rarity-common-text");
const rarityUncommonText = document.getElementById("rarity-uncommon-text");
const rarityRareText = document.getElementById("rarity-rare-text");
/* Card Viewer */
const cardViewer = document.getElementById("card-viewer");
const viewerReturnButton = document.getElementById("viewer-return-button");
const viewerHomeReturnButton = document.getElementById("viewer-home-return-button");
const viewerPokedexButton = document.getElementById("viewer-pokedex-button");
const cardGrid = document.getElementById("card-grid");
const viewerFilterSelect = document.getElementById("viewer-filter-select");
/* My Pokedex */
const pokedexPage = document.getElementById("pokedex");
const pokedexReturnButton = document.getElementById("pokedex-return-button");
const pokedexGrid = document.getElementById("pokedex-grid");
/* Card Modal */
const cardModal = document.getElementById("card-modal");
const modalImage = document.getElementById("modal-image");
const modalNumber = document.getElementById("modal-number");
const modalName = document.getElementById("modal-name");
const modalClose = document.getElementById("modal-close");

/******************************************************************************
SETTINGS OPERATIONS (SOUND, MIGRATION BACKUPS, SYSTEM RESET)
******************************************************************************/
function generateBackupStringKey() {
    if (settingsBackupBox) {
        const dataObj = Object.fromEntries(ownedCards);
        settingsBackupBox.value = btoa(JSON.stringify(dataObj));
    }
}

function handleDataImport() {
    const rawInput = prompt("📋 Paste your exported backup data tracker token key code below:");
    if (!rawInput) return;
    try {
        const decodedString = atob(rawInput.trim());
        const parsedData = JSON.parse(decodedString);
        if (typeof parsedData !== "object" || parsedData === null) throw new Error();
        if (!confirm("Warning:\n\nImporting this dataset overwrites your active collection records. Proceed?")) return;
        ownedCards.clear();
        for (const [k, v] of Object.entries(parsedData)) { ownedCards.set(k, v); }
        saveOwnedCards();
        generateBackupStringKey();
        alert("Collection records database synced successfully!");
    } catch (err) {
        alert("❌ Error: Invalid backup tracking key string data profiles layout parsed.");
    }
}

function resetAllCollectionsGlobally() {
    if (!confirm("CRITICAL WARNING:\n\nYou are about to erase your ENTIRE progress across ALL card collections. Proceed?")) return;
    if (!confirm("FINAL CONFIRMATION:\n\nPress OK to perform a full app factory reset.")) return;
    ownedCards.clear();
    localStorage.removeItem("ownedCards");
    alert("Application data tracking reset successfully!");
    showScreen("home");
}

/******************************************************************************
LOCAL STORAGE
******************************************************************************/
function saveOwnedCards() {
    const obj = Object.fromEntries(ownedCards);
    localStorage.setItem("ownedCards", JSON.stringify(obj));
}

function loadOwnedCards() {
    const soundPref = localStorage.getItem("audioMutePreference");
    if (soundPref !== null) {
        isSoundEnabled = soundPref === "true";
        if (settingsSoundToggle) settingsSoundToggle.checked = isSoundEnabled;
    }
    const raw = localStorage.getItem("ownedCards");
    if (!raw) return;
    try {
        const obj = JSON.parse(raw);
        ownedCards.clear();
        for (const [key, value] of Object.entries(obj)) { ownedCards.set(key, value); }
    } catch (e) {
        console.error("Failed to load ownedCards:", e);
    }
	// Append this inside loadOwnedCards() right alongside the sound preference loader block
    const savedFilterPref = localStorage.getItem("defaultViewerFilterPreference");
    if (savedFilterPref !== null) {
        defaultViewerFilter = savedFilterPref;
    if (settingsDefaultFilter) settingsDefaultFilter.value = defaultViewerFilter;
    }
}

/*************************************************
DIAGNOSTIC SCREEN MANAGEMENT
*************************************************/
function showScreen(screen) {
    // 1. Target by known screen layout class names to ensure we hit everything uniformly
    const classesToHide = [
        "main-header", 
        "collection-selector", 
        "collection-overview", 
        "card-viewer", 
        "pokedex", 
        "settings-view"
    ];

    classesToHide.forEach(className => {
        const elements = document.getElementsByClassName(className);
        for (let i = 0; i < elements.length; i++) {
            elements[i].classList.add("hidden");
        }
    });

    // Also hide explicitly targeted unique IDs safely
    const idsToHide = ["main-header", "collection-selector", "collection-overview", "card-viewer", "pokedex", "settings-page"];
    idsToHide.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add("hidden");
    });

    // 2. Clear scrolling view layers
    setTimeout(() => {
        window.scrollTo(0, 0);
        if (document.body) document.body.scrollTop = 0;
        if (document.documentElement) document.documentElement.scrollTop = 0;
        
        ["home-scroll-layer", "viewer-scroll-layer", "pokedex-scroll-layer"].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.scrollTop = 0;
        });
    }, 10);

    // 3. Reveal screens by testing BOTH their direct literal IDs and structural layout tags
    switch (screen) {
        case "home":
            // Home needs both the header block and selector block visible
            const header = document.getElementById("main-header") || document.querySelector(".main-header");
            const selector = document.getElementById("collection-selector") || document.querySelector(".collection-selector");
            if (header) header.classList.remove("hidden");
            if (selector) selector.classList.remove("hidden");
            break;
            
        case "overview":
            const overview = document.getElementById("collection-overview") || document.querySelector(".collection-overview");
            if (overview) overview.classList.remove("hidden");
            break;
            
        case "viewer":
            const viewer = document.getElementById("card-viewer") || document.querySelector(".card-viewer");
            if (viewer) viewer.classList.remove("hidden");
            break;
            
        case "pokedex":
            const dex = document.getElementById("pokedex") || document.querySelector(".pokedex");
            if (dex) dex.classList.remove("hidden");
            break;
            
        case "settings":
            generateBackupStringKey();
            const settings = document.getElementById("settings-page") || document.querySelector(".settings-view");
            if (settings) settings.classList.remove("hidden");
            break;
    }
}


/******************************************************************************
MODAL HELPER
******************************************************************************/
function setModalRarityBorder(rarity) {
    const content = cardModal.querySelector(".card-modal-content");
    content.classList.remove("rarity-common", "rarity-uncommon", "rarity-rare");
    if (rarityConfig.common.keys.includes(rarity)) {
        content.classList.add("rarity-common");
    } else if (rarityConfig.uncommon.keys.includes(rarity)) {
        content.classList.add("rarity-uncommon");
    } else {
        content.classList.add("rarity-rare");
    }
}

/******************************************************************************
COLLECTION DATA LOADING
******************************************************************************/
async function loadCollectionData(collectionId) {
    if (collectionCache.has(collectionId)) return collectionCache.get(collectionId);
    const module = await import(`../collections/${collectionId}/cardData.js`);
    let data = module.default || module.cards || module.cardData;
    if (!data && module) {
        for (const value of Object.values(module)) {
            if (Array.isArray(value)) { data = value; break; }
        }
    }
    if (!data) data = [];
    collectionCache.set(collectionId, data);
    return data;
}

/******************************************************************************
HOME PAGE
******************************************************************************/
function renderCollectionSelector() {
    if (!collectionSelector) return;
    collectionSelector.innerHTML = "";
    collections.forEach(col => {
        const tile = document.createElement("div");
        tile.className = "collection-tile";
        const img = document.createElement("img");
        img.className = "collection-logo";
        img.src = `./assets/logos/${col.logo}`;
        const name = document.createElement("span"); // Fixed typo here
        name.className = "collection-name";
        name.textContent = col.name;
        tile.appendChild(img);
        tile.appendChild(name);
        tile.addEventListener("click", () => { enterCollectionOverview(col.id); });
        collectionSelector.appendChild(tile);
    });
}

/******************************************************************************
COLLECTION OVERVIEW
******************************************************************************/
async function enterCollectionOverview(collectionId) {
    currentCollectionId = collectionId;
    currentCollectionData = await loadCollectionData(collectionId);
    showScreen("overview");
    const collectionMeta = collections.find(c => c.id === collectionId);
    document.getElementById("overview-logo").src = `./assets/logos/${collectionMeta.logo}`;
    const totalCards = currentCollectionData.length;
    let ownedCount = 0;
    const rarityCounts = {
        common: { owned: 0, total: 0 },
        uncommon: { owned: 0, total: 0 },
        rare: { owned: 0, total: 0 }
    };
    currentCollectionData.forEach(card => {
        const key = `${collectionId}:${card.cardNumber}`;
        const isOwned = ownedCards.get(key) === true;
        if (isOwned) ownedCount++;
        const rarityName = card.rarity;
        for (const bucket of ["common", "uncommon", "rare"]) {
            if (rarityConfig[bucket].keys.includes(rarityName)) {
                rarityCounts[bucket].total++;
                if (isOwned) rarityCounts[bucket].owned++;
                break;
            }
        }
    });
    overviewStatsTitle.textContent = "Your " + collectionMeta.name + " Collection Statistics";
    overviewCatchTitle.textContent = "Catch a " + collectionMeta.name + " Pokémon!!!";
    overviewTotal.textContent = "Owned: " + ownedCount + " / " + totalCards + " cards";
    rarityCommonIcon.textContent = rarityConfig.common.icon;
    rarityUncommonIcon.textContent = rarityConfig.uncommon.icon;
    rarityRareIcon.textContent = rarityConfig.rare.icon;
    
    function setRarityRow(counts, fillEl, textEl) {
        const { owned, total } = counts;
        const pct = total > 0 ? Math.round((owned / total) * 100) : 0;
        fillEl.style.width = pct + "%";
        textEl.textContent = owned + " / " + total;
    }
    setRarityRow(rarityCounts.common, rarityCommonFill, rarityCommonText);
    setRarityRow(rarityCounts.uncommon, rarityUncommonFill, rarityUncommonText);
    setRarityRow(rarityCounts.rare, rarityRareFill, rarityRareText);
}

/******************************************************************************
CARD VIEWER
******************************************************************************/
function renderCardViewer() {
    if (!currentCollectionData || !currentCollectionId) return;
    document.getElementById("viewer-scroll-layer").scrollTop = 0;
    showScreen("viewer");
    
    // SAFE CHECK: Only update the dropdown if it successfully exists in your HTML DOM
    if (viewerFilterSelect) {
        viewerFilterSelect.value = defaultViewerFilter;
    }
    
    const collectionMeta = collections.find(c => c.id === currentCollectionId);
    if (collectionMeta) {
        const viewerLogoEl = document.getElementById("viewer-logo");
        if (viewerLogoEl) {
            viewerLogoEl.src = `./assets/logos/${collectionMeta.logo}`;
        }
    }
    
    executeFilteredGridRender();
}

/* Updated helper engine function with strict safety boundaries */
function executeFilteredGridRender() {
    if (!cardGrid || !currentCollectionData) return;
    cardGrid.innerHTML = "";
    
    // SAFE CHECK: Fallback safely to "all" if the element layout isn't found
    const activeFilter = viewerFilterSelect ? viewerFilterSelect.value : "all";

    currentCollectionData.forEach(card => {
        const key = `${currentCollectionId}:${card.cardNumber}`;
        const isOwned = ownedCards.get(key) === true;
        
        // 3-WAY FILTER EVALUATION LAYER CHECKPOINTS
        if (activeFilter === "owned" && !isOwned) return;     // Skip rendering if we only want owned cards
        if (activeFilter === "missing" && isOwned) return;    // Skip rendering if we only want missing cards

        const tile = document.createElement("div");
        tile.className = "card-tile";
        
        const img = document.createElement("img");
        img.className = "card-image";
        img.src = isOwned ? `./collections/${currentCollectionId}/${card.file}` : `./assets/logos/cardback.jpg`;
        tile.appendChild(img);
        
        const info = document.createElement("div");
        info.className = "card-info";
        
        const metaLine = document.createElement("div");
        metaLine.className = "card-meta-line";
        
        const rarityIcon = document.createElement("span");
        rarityIcon.className = "card-rarity-icon";
        rarityIcon.textContent = rarityLegend[card.rarity] || "";
        
        const cardNumber = document.createElement("span");
        cardNumber.className = "card-number";
        cardNumber.textContent = " - #" + String(card.cardNumber).padStart(3, "0");
        
        metaLine.appendChild(rarityIcon);
        metaLine.appendChild(cardNumber);
        
        const name = document.createElement("div");
        name.className = "card-name";
        name.textContent = card.name;
        
        info.appendChild(metaLine);
        info.appendChild(name);
        tile.appendChild(info);
        
        tile.addEventListener("click", () => { 
            openCardModal(card, ownedCards.get(key) === true); 
        });
        
        cardGrid.appendChild(tile);
    });
}

/******************************************************************************
CARD MODAL
******************************************************************************/
function openCardModal(card, isOwned) {
    currentModalCard = card;
    modalImage.src = isOwned ? `./collections/${currentCollectionId}/${card.file}` : `./assets/logos/cardback.jpg`;
    modalNumber.textContent = "#" + String(card.cardNumber).padStart(3, "0");
    modalName.textContent = card.name || "";
    document.getElementById("modal-rarity-icon").textContent = rarityLegend[card.rarity] || "";
    document.getElementById("modal-rarity-text").textContent = card.rarity;
    setModalRarityBorder(card.rarity);
    document.getElementById("modal-catch-status").textContent = "";
    document.getElementById("modal-collection-count").textContent = "";
    cardModal.classList.remove("hidden");
}

/******************************************************************************
RESET CURRENT COLLECTION
******************************************************************************/
function resetCurrentCollection() {
    if (!currentCollectionId) return;
    if (!confirm("Reset this collection? You will lose all owned cards for this set.")) return;
    currentCollectionData.forEach(card => { ownedCards.delete(`${currentCollectionId}:${card.cardNumber}`); });
    saveOwnedCards();
    renderCardViewer();
}


/******************************************************************************
CATCH LOGIC
******************************************************************************/
function catchRandomPokemon() {
    if (!currentCollectionData || !currentCollectionId) {
        return;
    }
    const randomCard = currentCollectionData[Math.floor(Math.random() * currentCollectionData.length)];
    const key = `${currentCollectionId}:${randomCard.cardNumber}`;
    const alreadyOwned = ownedCards.get(key) === true;
  
    if (!alreadyOwned) {
        ownedCards.set(key, true);
        saveOwnedCards();
        
        // FORTIFIED AUDIO DRIVER LAYERS
			// CHECK MUTE FLAG PRIOR TO LAUNCHING ENGINE FILES
		if (isSoundEnabled) {
			const catchAudio = document.getElementById("catch-sound");
			if (catchAudio) {
				catchAudio.currentTime = 0; // Rewinds to the beginning so it triggers instantly on fast clicks
				catchAudio.play().catch(e => console.log("Audio playback blocked:", e));
			}
		}

    }

    const imgSrc = `./collections/${currentCollectionId}/${randomCard.file}`;
    modalImage.src = imgSrc;
    modalNumber.textContent = `#${String(randomCard.cardNumber).padStart(3, "0")}`;
    modalName.textContent = randomCard.name || "";
    document.getElementById("modal-rarity-icon").textContent = rarityLegend[randomCard.rarity] || "";
    document.getElementById("modal-rarity-text").textContent = ` ${randomCard.rarity}`;
    setModalRarityBorder(randomCard.rarity);
    currentModalCard = randomCard;

    const totalCards = currentCollectionData.length;
    let ownedCount = 0;
    currentCollectionData.forEach(c => {
        const k = `${currentCollectionId}:${c.cardNumber}`;
        if (ownedCards.get(k) === true) {
            ownedCount++;
        }
    });

    const statusEl = document.getElementById("modal-catch-status");
    const countEl = document.getElementById("modal-collection-count");

    if (alreadyOwned) {
        statusEl.textContent = "✅ Already Collected";
    } else {
        statusEl.textContent = "🎉 NEW CARD COLLECTED";
    }
    countEl.textContent = `${ownedCount} / ${totalCards} Collected`;

    cardModal.classList.remove("hidden");
    pendingCatchRefresh = true;
}

/******************************************************************************
MY POKEDEX
******************************************************************************/
async function renderPokedexPage() {
    pokedexGrid.innerHTML = "";
    for (const col of collections) {
        const data = await loadCollectionData(col.id);
        let ownedCount = 0;
        for (const card of data) {
            const key = `${col.id}:${card.cardNumber}`;
            if (ownedCards.get(key) === true) {
                ownedCount++;
            }
        }
        if (ownedCount === 0) {
            continue;
        }
        const tile = document.createElement("div");
        tile.className = "mc-tile";
        const img = document.createElement("img");
        img.className = "mc-logo";
        img.src = `./assets/logos/${col.logo}`;
        const name = document.createElement("div");
        name.textContent = col.name;
        const progress = document.createElement("div");
        progress.className = "mc-progress";
        progress.textContent = `Owned: ${ownedCount} / ${data.length}`;
        tile.appendChild(img);
        tile.appendChild(name);
        tile.appendChild(progress);
        tile.addEventListener("click", () => {
            currentCollectionId = col.id;
            currentCollectionData = data;
            renderCardViewer();
        });
        pokedexGrid.appendChild(tile);
    }
}

/******************************************************************************
EVENT LISTENERS
******************************************************************************/
/* Home */
if (myPokedexButtonHome) {
    myPokedexButtonHome.addEventListener("click", () => {
        renderPokedexPage();
        showScreen("pokedex");
    });
}
/* Collection Overview */
if (overviewReturnButton) {
    overviewReturnButton.addEventListener("click", () => {
        showScreen("home");
    });
}
if (overviewPokedexButton) {
    overviewPokedexButton.addEventListener("click", () => {
        renderCardViewer();
    });
}
/* Card Viewer */
if (viewerReturnButton) {
    viewerReturnButton.addEventListener("click", () => {
        enterCollectionOverview(currentCollectionId);
    });
}
if (viewerHomeReturnButton) {
    viewerHomeReturnButton.addEventListener("click", () => {
        showScreen("home");
    });
}
if (viewerPokedexButton) {
    viewerPokedexButton.addEventListener("click", () => {
        renderPokedexPage();
        showScreen("pokedex");
    });
}
/* My Pokedex */
if (pokedexReturnButton) {
    pokedexReturnButton.addEventListener("click", () => {
        showScreen("home");
    });
}
/* My Pokedex Page View Button - Wrapped in safe check to prevent line 583 crash */
const pokedexViewButton = document.getElementById("pokedex-view-button");
if (pokedexViewButton) {
    pokedexViewButton.addEventListener("click", () => {
        renderPokedexPage();
        showScreen("pokedex");
    });
}
/* Modal */
if (modalClose) {
    modalClose.addEventListener("click", () => {
        closeCardModal();
        if (pendingCatchRefresh) {
            pendingCatchRefresh = false;
            renderCardViewer();
            
            // CRITICAL FIX: Forces the viewer panel to the top right after catching a card
            const viewerScroll = document.getElementById("viewer-scroll-layer");
            if (viewerScroll) {
                viewerScroll.scrollTop = 0;
            }
        }
    });
}

/* Catch Button */
if (catchOpenImageOverview) {
    catchOpenImageOverview.addEventListener("click", catchRandomPokemon);
}
/* Reset Button */
const resetPokedexButton = document.getElementById("reset-pokedex-button");
if (resetPokedexButton) {
    resetPokedexButton.addEventListener("click", resetCurrentCollection);
}

/* Settings Management Event Bindings */
if (settingsOpenBtn) {
    settingsOpenBtn.addEventListener("click", () => showScreen("settings"));
}
if (settingsReturnButton) {
    settingsReturnButton.addEventListener("click", () => showScreen("home"));
}
if (settingsSoundToggle) {
    settingsSoundToggle.addEventListener("change", (e) => {
        isSoundEnabled = e.target.checked;
        localStorage.setItem("audioMutePreference", isSoundEnabled);
    });
}
if (settingsCopyBtn) {
    settingsCopyBtn.addEventListener("click", () => {
        if (settingsBackupBox) {
            settingsBackupBox.select();
            settingsBackupBox.setSelectionRange(0, 99999);
            navigator.clipboard.writeText(settingsBackupBox.value);
            alert("📋 Backup token key string data text profile copied to device clipboard!");
        }
    });
}
if (settingsImportBtn) {
    settingsImportBtn.addEventListener("click", handleDataImport);
}
if (resetAllButton) {
    resetAllButton.addEventListener("click", resetAllCollectionsGlobally);
}
/* Dropdown Live Filter Changes inside Card Viewer */
if (viewerFilterSelect) {
    viewerFilterSelect.addEventListener("change", executeFilteredGridRender);
}
/* Default Configuration Changes inside Settings Tab Menu */
if (settingsDefaultFilter) {
    settingsDefaultFilter.addEventListener("change", (e) => {
        defaultViewerFilter = e.target.value;
        localStorage.setItem("defaultViewerFilterPreference", defaultViewerFilter);
    });
}

/******************************************************************************
PINCH ZOOM & MULTI-TOUCH PANNING ENGINE
******************************************************************************/
if (modalImage) {
    // Phase 1: Touch Init Point Capture
    modalImage.addEventListener("touchstart", e => {
        if (e.touches.length === 1) {
            // SINGLE TOUCH: Start panning drag vector tracking
            isDragging = true;
            startX = e.touches[0].pageX - currentX;
            startY = e.touches[0].pageY - currentY;
        } else if (e.touches.length === 2) {
            // MULTI-TOUCH: Start scale calculation mode
            isDragging = false;
            const dx = e.touches[0].pageX - e.touches[1].pageX;
            const dy = e.touches[0].pageY - e.touches[1].pageY;
            startDistance = Math.sqrt(dx * dx + dy * dy);
        }
    });

    // Phase 2: Live Motion Transform Engine
    modalImage.addEventListener("touchmove", e => {
        // Prevent default browser viewport rubber-banding while zooming/panning
        e.preventDefault(); 

        if (e.touches.length === 1 && isDragging) {
            // SINGLE TOUCH ACTION: Pan card image matching finger vector offsets
            currentX = e.touches[0].pageX - startX;
            currentY = e.touches[0].pageY - startY;
            
            // Constrain scrolling leak boundaries if user zooms back out to normal scale
            if (scale <= 1) {
                currentX = 0;
                currentY = 0;
            }
            
            modalImage.style.transform = `translate(${currentX}px, ${currentY}px) scale(${scale})`;
        } else if (e.touches.length === 2) {
            // MULTI-TOUCH ACTION: Calculate live pinch/spread zoom levels
            const [t1, t2] = e.touches;
            const dx = t1.pageX - t2.pageX;
            const dy = t1.pageY - t2.pageY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (!startDistance) startDistance = distance;
            
            // Constrain zoom levels safely between 1x flat and 4x close-up magnification
            scale = Math.min(4, Math.max(1, distance / startDistance));
            
            modalImage.style.transform = `translate(${currentX}px, ${currentY}px) scale(${scale})`;
        }
    }, { passive: false });

    // Phase 3: Gesture End State Preservation
    modalImage.addEventListener("touchend", e => {
        startDistance = 0;
        isDragging = false;
        
        // If user zooms all the way back out, snap card position cleanly back to center layout
        if (scale <= 1) {
            scale = 1;
            currentX = 0;
            currentY = 0;
            modalImage.style.transform = `translate(0px, 0px) scale(1)`;
        }
    });
}

/******************************************************************************
APPLICATION STARTUP
******************************************************************************/
loadOwnedCards();
renderCollectionSelector();
showScreen("home");

function closeCardModal() {
    if (cardModal) cardModal.classList.add("hidden");
    if (modalImage) modalImage.style.transform = "";
    
    // RESET ZOOM & DRAG VECTORS COMPLETELY ON CLOSE
    scale = 1;
    startDistance = 0;
    currentX = 0;
    currentY = 0;
    startX = 0;
    startY = 0;
    isDragging = false;
    currentModalCard = null;
    
    const catchStatus = document.getElementById("modal-catch-status");
    const collectCount = document.getElementById("modal-collection-count");
    if (catchStatus) catchStatus.textContent = "";
    if (collectCount) collectCount.textContent = "";
}
