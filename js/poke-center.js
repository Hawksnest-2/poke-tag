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
• Gym Challenge Quiz Engine (Gauntlet Architecture)

******************************************************************************/
/******************************************************************************
IMPORTS
******************************************************************************/
import { collections } from "./manifest.js";
import { rarityLegend } from "./rarity.js";
import { quizQuestions } from "./quizQuestions.js";


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
let isExpertQuizMode = false;

/******************************************************************************
DOM REFERENCES
******************************************************************************/
/* Settings Page Panel Components */
const settingsPage = document.getElementById("settings-page");
const settingsOpenBtn = document.getElementById("settings-open-btn");
const settingsReturnButton = document.getElementById("settings-return-button");
const settingsSoundToggle = document.getElementById("settings-sound-toggle");
const settingsQuizExpertToggle = document.getElementById("settings-quiz-expert-toggle");
const settingsBackupBox = document.getElementById("settings-backup-box");
const settingsCopyBtn = document.getElementById("settings-copy-btn");
const settingsImportBtn = document.getElementById("settings-import-btn");
const resetAllButton = document.getElementById("reset-all-button");
const settingsDefaultFilter = document.getElementById("settings-default-filter");
/* Legend Modal References */
const rarityLegendPage = document.getElementById("rarity-legend-page");
const legendOpenBtn = document.getElementById("legend-open-btn");
const legendCloseBtn = document.getElementById("legend-close-btn");
const legendMatrixGrid = document.getElementById("legend-matrix-grid");
/* Home View Screen Hooks */
const mainHeader = document.getElementById("main-header");
const collectionSelector = document.getElementById("collection-selector");
const myPokedexButtonHome = document.getElementById("home-pokedex-button");
/* Collection Overview Components */
const collectionOverview = document.getElementById("collection-overview");
const overviewTotal = document.getElementById("overview-total");
const overviewReturnButton = document.getElementById("overview-return-button");
const overviewPokedexButton = document.getElementById("overview-pokedex-button");
const catchOpenImageOverview = document.getElementById("catch-open-image");
/* Rarity Trackers */
const rarityCommonIcon = document.getElementById("rarity-common-icon");
const rarityUncommonIcon = document.getElementById("rarity-uncommon-icon");
const rarityRareIcon = document.getElementById("rarity-rare-icon");
const rarityCommonFill = document.getElementById("rarity-common-fill");
const rarityUncommonFill = document.getElementById("rarity-uncommon-fill");
const rarityRareFill = document.getElementById("rarity-rare-fill");
const rarityCommonText = document.getElementById("rarity-common-text");
const rarityUncommonText = document.getElementById("rarity-uncommon-text");
const rarityRareText = document.getElementById("rarity-rare-text");
/* Card Grid Viewer Layer */
const cardViewer = document.getElementById("card-viewer");
const viewerReturnButton = document.getElementById("viewer-return-button");
const viewerHomeReturnButton = document.getElementById("viewer-home-return-button");
const viewerPokedexButton = document.getElementById("viewer-pokedex-button");
const cardGrid = document.getElementById("card-grid");
const viewerFilterSelect = document.getElementById("viewer-filter-select");
/* Global Binder Profile */
const pokedexPage = document.getElementById("pokedex");
const pokedexReturnButton = document.getElementById("pokedex-return-button");
const pokedexGrid = document.getElementById("pokedex-grid");
/* Detailed Inspection Modal Overlay */
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
    // 1. Audio Driver Configuration Loader
    const soundPref = localStorage.getItem("audioMutePreference");
	if (soundPref !== null) {
    // A preference exists: use it
		isSoundEnabled = soundPref === "true";
	} else {
    // No preference exists yet: default to true
		isSoundEnabled = true;
	}
	// Sync the visual toggle with the actual state regardless of where it came from
	if (settingsSoundToggle) {
		settingsSoundToggle.checked = isSoundEnabled;
	}

    // 2. Collection Progress Profile Parser
    const raw = localStorage.getItem("ownedCards");
    if (raw) {
        try {
            const obj = JSON.parse(raw);
            ownedCards.clear();
            for (const [key, value] of Object.entries(obj)) { 
                ownedCards.set(key, value); 
            }
        } catch (e) {
            console.error("Failed to parse ownedCards tracker loop data profile:", e);
        }
    }

    // 3. Grid Filters Settings Recall Layout
    const savedFilterPref = localStorage.getItem("defaultViewerFilterPreference");
    if (savedFilterPref !== null) {
        defaultViewerFilter = savedFilterPref;
        if (settingsDefaultFilter) {
            settingsDefaultFilter.value = defaultViewerFilter;
        }
    }

    // 4. Quiz Expert Mode State Config Sync
    const savedExpertMode = localStorage.getItem("expertQuizModePreference");
    if (savedExpertMode !== null) {
        isExpertQuizMode = savedExpertMode === "true";
        if (settingsQuizExpertToggle) settingsQuizExpertToggle.checked = isExpertQuizMode;
    }

    // 5. Standalone Display Mode Checker
    if (window.matchMedia('(display-mode: standalone)').matches) {
        const installRow = document.getElementById("install-instruction-row");
        if (installRow) {
            installRow.style.display = "none";
        }
    }
}


/******************************************************************************
SCREEN MANAGEMENT
******************************************************************************/
function showScreen(screen) {
    const homeHeader = document.getElementById("main-header");
    const collectionSelector = document.getElementById("collection-selector");
    const overviewPage = document.getElementById("collection-overview");
    const viewerPage = document.getElementById("card-viewer");
    const dexPage = document.getElementById("pokedex");
    const settingsPanel = document.getElementById("settings-page");
    const quizSetupPanel = document.getElementById("quiz-setup-page");
    const quizArenaPanel = document.getElementById("quiz-arena-page");

    // Clear active displays across all panels uniformly
    if (homeHeader) homeHeader.style.display = "none";
    if (collectionSelector) collectionSelector.style.display = "none";
    if (overviewPage) overviewPage.style.display = "none";
    if (viewerPage) viewerPage.style.display = "none";
    if (dexPage) dexPage.style.display = "none";
    if (settingsPanel) settingsPanel.style.display = "none";
    if (quizSetupPanel) quizSetupPanel.style.display = "none";
    if (quizArenaPanel) quizArenaPanel.style.display = "none";
    if (rarityLegendPage) rarityLegendPage.style.display = "none";

    // Clean up residual hidden framework flags
    const legacyScreens = ["main-header", "collection-selector", "collection-overview", "card-viewer", "pokedex", "settings-page", "quiz-setup-page", "quiz-arena-page", "rarity-legend-page"];
    legacyScreens.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.remove("hidden");
    });

    // Handle view scroll resets to clear view layout shifting properties
    setTimeout(() => {
        window.scrollTo(0, 0);
        if (document.body) document.body.scrollTop = 0;
        if (document.documentElement) document.documentElement.scrollTop = 0;
        
        ["home-scroll-layer", "viewer-scroll-layer", "pokedex-scroll-layer"].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.scrollTop = 0;
        });
    }, 10);

    // Direct interface inline routing engine assignments
    switch (screen) {
        case "home":
            if (homeHeader) homeHeader.style.display = "flex";
            if (collectionSelector) collectionSelector.style.display = "grid";
            break;
        case "overview":
            if (overviewPage) overviewPage.style.display = "flex";
            break;
        case "viewer":
            if (viewerPage) viewerPage.style.display = "flex";
            break;
        case "pokedex":
            if (dexPage) dexPage.style.display = "flex";
            break;
        case "settings":
            generateBackupStringKey();
            if (settingsPanel) settingsPanel.style.display = "flex";
            break;
        case "quiz-setup":
            if (quizSetupPanel) quizSetupPanel.style.display = "flex";
            break;
        case "quiz-arena":
            if (quizArenaPanel) quizArenaPanel.style.display = "flex";
            break;
        case "rarity-legend":
            renderRarityLegendGrid();
            if (rarityLegendPage) rarityLegendPage.style.display = "flex";
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
        const name = document.createElement("span");
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

function executeFilteredGridRender() {
    if (!cardGrid || !currentCollectionData) return;
    cardGrid.innerHTML = "";
    
    const activeFilter = viewerFilterSelect ? viewerFilterSelect.value : "all";

    currentCollectionData.forEach(card => {
        const key = `${currentCollectionId}:${card.cardNumber}`;
        const isOwned = ownedCards.get(key) === true;
        
        if (activeFilter === "owned" && !isOwned) return;
        if (activeFilter === "missing" && isOwned) return;

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
        
		if (isSoundEnabled) {
			const catchAudio = document.getElementById("catch-sound");
			if (catchAudio) {
				catchAudio.currentTime = 0;
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
GYM CHALLENGE SETUP
******************************************************************************/
function configureGymChallengeSetup() {

    const countContainer =
        document.getElementById("quiz-count-options");
    if (!countContainer) return;
	
	const setupTitle =
    document.getElementById("quiz-setup-title");

	const themeClasses = [
		"quiz-theme-pokeball",
		"quiz-theme-greatball",
		"quiz-theme-ultraball",
		"quiz-theme-masterball"
	];
		document.body.classList.remove(
			...themeClasses
		);
	const countCard =
		document.getElementById("quiz-count-card");
	const categoryCard =
		document.getElementById("quiz-category-card");
    countContainer.innerHTML = "";
	countCard?.classList.add("quiz-themed-card");
	categoryCard?.classList.add("quiz-themed-card");
    let counts = [];

    switch (selectedQuizTier) {
		case "easy":
			counts = [3, 5];
			if (setupTitle) {
				setupTitle.textContent =
					"Poké Ball Challenge";
				setupTitle.classList.add(
					"quiz-themed-title"
				);
			}
			document.body.classList.add(
				"quiz-theme-pokeball"
			);
			break;
    case "medium":
        counts = [5, 10];
			if (setupTitle) {
				setupTitle.textContent =
					"Great Ball Challenge";
				setupTitle.classList.add(
					"quiz-themed-title"
				);
			}
			document.body.classList.add(
				"quiz-theme-greatball"
			);
			break;
    case "hard":
        counts = [5, 10];
			if (setupTitle) {
				setupTitle.textContent =
					"Ultra Ball Challenge";
				setupTitle.classList.add(
					"quiz-themed-title"
				);
			}
			document.body.classList.add(
				"quiz-theme-ultraball"
			);
			break;
    case "expert":
        counts = [10, 15];
			if (setupTitle) {
				setupTitle.textContent =
					"Master Ball Challenge";
				setupTitle.classList.add(
					"quiz-themed-title"
				);
			}
			document.body.classList.add(
				"quiz-theme-masterball"
			);
			break;
}

    selectedQuestionCount = counts[0];

    counts.forEach((count, index) => {

        const btn = document.createElement("button");

        btn.className =
            index === 0
                ? "param-tile active"
                : "param-tile";

        btn.dataset.value = count;

        btn.textContent = count;

        btn.addEventListener("click", () => {

            countContainer
                .querySelectorAll(".param-tile")
                .forEach(tile =>
                    tile.classList.remove("active")
                );

            btn.classList.add("active");

            selectedQuestionCount = count;

        });

        countContainer.appendChild(btn);

    });

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
/* My Pokedex Layout Actions */
if (pokedexReturnButton) {
    pokedexReturnButton.addEventListener("click", () => {
        showScreen("home");
    });
}
const pokedexViewButton = document.getElementById("pokedex-view-button");
if (pokedexViewButton) {
    pokedexViewButton.addEventListener("click", () => {
        renderPokedexPage();
        showScreen("pokedex");
    });
}
/* Card Viewer Lightbox Close Hooks */
if (modalClose) {
    modalClose.addEventListener("click", () => {
        closeCardModal();
        if (pendingCatchRefresh) {
            pendingCatchRefresh = false;
            renderCardViewer();
            
            const viewerScroll = document.getElementById("viewer-scroll-layer");
            if (viewerScroll) {
                viewerScroll.scrollTop = 0;
            }
        }
    });
}

/* Direct Catch Pack Launcher Trigger */
if (catchOpenImageOverview) {
    catchOpenImageOverview.addEventListener("click", catchRandomPokemon);
}

/* Direct Portal Transition to Quiz Arena Layout Options */
const overviewStartQuizBtn = document.getElementById("overview-start-quiz-btn");
if (overviewStartQuizBtn) {
    overviewStartQuizBtn.addEventListener("click", () => {
        showScreen("quiz-setup");
    });
}

/* System Control Management Sub-panel Handlers */
if (settingsQuizExpertToggle) {
    settingsQuizExpertToggle.addEventListener("change", (e) => {
        isExpertQuizMode = e.target.checked;
        localStorage.setItem("expertQuizModePreference", isExpertQuizMode);
    });
}
const resetPokedexButton = document.getElementById("reset-pokedex-button");
if (resetPokedexButton) {
    resetPokedexButton.addEventListener("click", resetCurrentCollection);
}
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
if (viewerFilterSelect) {
    viewerFilterSelect.addEventListener("change", executeFilteredGridRender);
}
if (settingsDefaultFilter) {
    settingsDefaultFilter.addEventListener("change", (e) => {
        defaultViewerFilter = e.target.value;
        localStorage.setItem("defaultViewerFilterPreference", defaultViewerFilter);
    });
}
const quizSetupReturnBtn = document.getElementById("quiz-setup-return-btn");
if (quizSetupReturnBtn) {
    quizSetupReturnBtn.addEventListener("click", () => {
        showScreen("overview");
    });
}

/* Rarity Legend Open/Close Listeners */
if (legendOpenBtn) {
    legendOpenBtn.addEventListener("click", () => showScreen("rarity-legend"));
}
if (legendCloseBtn) {
    legendCloseBtn.addEventListener("click", () => showScreen("settings"));
}

/* Install Guide Alert Modal Trigger */
const installGuideBtn = document.getElementById("settings-install-guide-btn");
if (installGuideBtn) {
    installGuideBtn.addEventListener("click", () => {
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
        if (isIOS) {
            alert("📱 To run in Full Screen on iOS:\n\n1. Tap the Safari SHARE button (square with up arrow) at the bottom of your screen.\n2. Scroll down and tap 'Add to Home Screen'.\n3. Launch the new icon from your home screen layout!");
        } else {
            alert("🤖 To run in Full Screen on Android:\n\n1. Tap the Chrome menu button (three vertical dots) in the top-right corner.\n2. Select 'Install app' or 'Add to Home screen'.\n3. Open the application directly from your device launcher drawer!");
        }
    });
}


/* 2x2 Arena Gauntlet Mode Listeners */
const gauntletButtons = document.querySelectorAll(".quiz-gauntlet-grid .gym-portal-btn");

gauntletButtons.forEach(btn => {

    btn.addEventListener("click", (e) => {
		selectedQuizTier =
			e.currentTarget.getAttribute("data-tier");
		configureGymChallengeSetup();

		showScreen("quiz-setup");
	});
});

/* GYM CHALLENGE Setup listeners*/
const categoryTiles =
    document.querySelectorAll(
        "#quiz-category-options .param-tile"
    );

categoryTiles.forEach(tile => {

    tile.addEventListener("click", () => {

        categoryTiles.forEach(t =>
            t.classList.remove("active")
        );

        tile.classList.add("active");

        selectedQuizCategory =
            tile.getAttribute("data-value");

        console.log(
            "Category:",
            selectedQuizCategory
        );

    });

});
const startQuizBattleBtn =
    document.getElementById("start-quiz-battle-btn");

if (startQuizBattleBtn) {

    startQuizBattleBtn.addEventListener("click", () => {

        buildAdvancedMixPlaylist(
            selectedQuizTier,
            selectedQuestionCount
        );

    });

}


/******************************************************************************
PINCH ZOOM & MULTI-TOUCH PANNING ENGINE
******************************************************************************/
if (modalImage) {
    modalImage.addEventListener("touchstart", e => {
        if (e.touches.length === 1) {
            isDragging = true;
            startX = e.touches[0].pageX - currentX;
            startY = e.touches[0].pageY - currentY;
        } else if (e.touches.length === 2) {
            isDragging = false;
            const dx = e.touches[0].pageX - e.touches[1].pageX;
            const dy = e.touches[0].pageY - e.touches[1].pageY;
            startDistance = Math.sqrt(dx * dx + dy * dy);
        }
    });

    modalImage.addEventListener("touchmove", e => {
        e.preventDefault(); 

        if (e.touches.length === 1 && isDragging) {
            currentX = e.touches[0].pageX - startX;
            currentY = e.touches[0].pageY - startY;
            if (scale <= 1) {
                currentX = 0;
                currentY = 0;
            }
            modalImage.style.transform = `translate(${currentX}px, ${currentY}px) scale(${scale})`;
        } else if (e.touches.length === 2) {
            const dx = e.touches[0].pageX - e.touches[1].pageX;
            const dy = e.touches[0].pageY - e.touches[1].pageY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (!startDistance) startDistance = distance;
            scale = Math.min(4, Math.max(1, distance / startDistance));
            modalImage.style.transform = `translate(${currentX}px, ${currentY}px) scale(${scale})`;
        }
    }, { passive: false });

    modalImage.addEventListener("touchend", e => {
        startDistance = 0;
        if (e.touches.length === 1) {
            isDragging = true;
            startX = e.touches[0].pageX - currentX;
            startY = e.touches[0].pageY - currentY;
        } else if (e.touches.length === 0) {
            isDragging = false;
            if (scale <= 1) {
                scale = 1;
                currentX = 0;
                currentY = 0;
                modalImage.style.transform = `translate(0px, 0px) scale(1)`;
            }
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

/******************************************************************************
MODULE IMPLEMENTATION: GYM CHALLENGE QUIZ ENGINE
******************************************************************************/
let quizPlaylist = [];
let quizCurrentIndex = 0;
let quizScore = 0;
let rewardQueueCount = 0;
let selectedQuizCategory = "random";
let selectedQuizTier = null;
let selectedQuestionCount = 1;
let quizResults = [];

/* Rarity Legend Grid Injection Renderer */
function renderRarityLegendGrid() {
    // 🛡️ Fail-Safe: If the container isn't found in your HTML, abort before rendering breaks
    if (!legendMatrixGrid) {
        console.error("Error: #legend-matrix-grid element was not found in the HTML markup.");
        showScreen("settings"); // Force safely return to the settings panel
        return;
    }
    
    legendMatrixGrid.innerHTML = "";
    
    for (const [name, icon] of Object.entries(rarityLegend)) {
        const tile = document.createElement("div");
        tile.className = "legend-row-tile";
        
        const symbol = document.createElement("span");
        symbol.className = "legend-tile-icon";
        symbol.textContent = icon;
        
        const label = document.createElement("span");
        label.className = "legend-tile-text";
        label.textContent = name;
        
        tile.appendChild(symbol);
        tile.appendChild(label);
        legendMatrixGrid.appendChild(tile);
    }
}


/* High-Yield Algorithmic Gauntlet Generation Loop Engine */
function buildAdvancedMixPlaylist(tier, totalCount) {
    let categoryQuestionPool =
    selectedQuizCategory === "random"
        ? quizQuestions
        : quizQuestions.filter(
            q => q.category === selectedQuizCategory
        );
	let primaryPool = [];
    let secondaryPool = [];
    let primaryTargetCount = 0;
    let secondaryTargetCount = 0;

    if (tier === "easy") {
        primaryPool = categoryQuestionPool.filter(q => q.difficulty === "easy");
        primaryTargetCount = totalCount;
    } 
    else if (tier === "medium") {
        if (!isExpertQuizMode) {
            primaryPool = categoryQuestionPool.filter(q => q.difficulty === "medium");
            secondaryPool = categoryQuestionPool.filter(q => q.difficulty === "hard");
        } else {
            primaryPool = categoryQuestionPool.filter(q => q.difficulty === "hard");
            secondaryPool = categoryQuestionPool.filter(q => q.difficulty === "expert");
        }
        primaryTargetCount = (totalCount === 5) ? 4 : 8;
        secondaryTargetCount = (totalCount === 5) ? 1 : 2;
    }
    else if (tier === "hard") {
        if (!isExpertQuizMode) {
            primaryPool = categoryQuestionPool.filter(q => q.difficulty === "medium");
            secondaryPool = categoryQuestionPool.filter(q => q.difficulty === "hard");
            primaryTargetCount = (totalCount === 5) ? 2 : 4;
            secondaryTargetCount = (totalCount === 5) ? 3 : 6;
        } else {
            primaryPool = categoryQuestionPool.filter(q => q.difficulty === "hard");
            secondaryPool = categoryQuestionPool.filter(q => q.difficulty === "expert");
            primaryTargetCount = (totalCount === 5) ? 2 : 4;
            secondaryTargetCount = (totalCount === 5) ? 3 : 6;
        }
    }
    else if (tier === "expert") {
        if (!isExpertQuizMode) {
            primaryPool = categoryQuestionPool.filter(q => q.difficulty === "hard");
            secondaryPool = categoryQuestionPool.filter(q => q.difficulty === "expert");
            primaryTargetCount = (totalCount === 10) ? 5 : 9;
            secondaryTargetCount = (totalCount === 10) ? 5 : 6;
        } else {
            primaryPool = categoryQuestionPool.filter(q => q.difficulty === "expert");
            primaryTargetCount = totalCount;
        }
    }

    if (primaryPool.length < primaryTargetCount || (secondaryTargetCount > 0 && secondaryPool.length < secondaryTargetCount)) {
        alert("CRITICAL ERROR: Insufficient questions inside database matrices to compile this gauntlet split distribution!");
        return;
    }

    function shuffleAndSlicePool(sourceArray, quantity) {
        let cloned = [...sourceArray];
        for (let i = cloned.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [cloned[i], cloned[j]] = [cloned[j], cloned[i]];
        }
        return cloned.slice(0, quantity);
    }

    const primarySelection = shuffleAndSlicePool(primaryPool, primaryTargetCount);
    const secondarySelection = secondaryTargetCount > 0 ? shuffleAndSlicePool(secondaryPool, secondaryTargetCount) : [];
    
    let combinedPlaylist = [...primarySelection, ...secondarySelection];

    for (let i = combinedPlaylist.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [combinedPlaylist[i], combinedPlaylist[j]] = [combinedPlaylist[j], combinedPlaylist[i]];
    }

    quizPlaylist = combinedPlaylist;
    quizCurrentIndex = 0;
    quizScore = 0;
	quizResults = [];

    const badge = document.getElementById("quiz-difficulty-badge");
    if (badge) {
        badge.textContent = `🏆 ${tier.toUpperCase()} CHALLENGE ${isExpertQuizMode ? '(EXPERT)' : ''}`;
        
        // Map the selected tier directly to your existing CSS theme variable configurations
        const tierVariables = {
            "easy": "var(--pokeball-color)",
            "medium": "var(--greatball-color)",
            "hard": "var(--ultraball-color)",
            "expert": "var(--masterball-color)"
        };
        
        // Apply the theme variable dynamically or default to white if unmatched
        badge.style.color = tierVariables[tier.toLowerCase()] || "#ffffff";
    }

    showScreen("quiz-arena");
    renderActiveQuizQuestionCard();
}


/* Render Active Question Card and Button Options Matrix */
function renderActiveQuizQuestionCard() {
    if (quizCurrentIndex >= quizPlaylist.length) {
        evaluateQuizEndRewards();
        return;
    }

    const currentQuestion = quizPlaylist[quizCurrentIndex];
	// Build answer objects preserving original index
	const shuffledOptions = currentQuestion.options.map((text, index) => ({
		text,
		originalIndex: index
	}));

	// Fisher-Yates shuffle
	for (let i = shuffledOptions.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[shuffledOptions[i], shuffledOptions[j]] =
			[shuffledOptions[j], shuffledOptions[i]];
	}

	// Find where the correct answer moved
	currentQuestion.shuffledCorrectIndex =
		shuffledOptions.findIndex(
			option => option.originalIndex === currentQuestion.correctIndex
		);   
    const scoreEl = document.getElementById("quiz-live-score");
    const questionTextEl = document.getElementById("quiz-question-text");
    if (scoreEl) scoreEl.textContent = `Score: ${quizScore}`;
    if (questionTextEl) questionTextEl.textContent = currentQuestion.question;

    const trackEl = document.getElementById("quiz-progress-track");
    if (trackEl) {
        trackEl.innerHTML = "";
        for (let i = 0; i < quizPlaylist.length; i++) {
            const step = document.createElement("span");
            if (i < quizCurrentIndex) {
				step.textContent =
					quizResults[i]
						? "🟢"
						: "🔴";
			}
			else if (i === quizCurrentIndex) {
				step.textContent = "🟡";
			}
			else {
				step.textContent = "⚪";
			}
            trackEl.appendChild(step);
        }
    }

	const optionButtons = document.querySelectorAll("#quiz-options-matrix .option-btn");

	optionButtons.forEach((btn, index) => {
		btn.textContent = shuffledOptions[index]?.text || "";
		btn.style.borderColor = "#444";
		btn.style.background = "#1a1a1a";
		btn.disabled = false;
	});
}

/* Process Answer Choice Indices Click Events */
function handleOptionChoiceClick(selectedIndex) {
    const currentQuestion = quizPlaylist[quizCurrentIndex];
    const optionButtons = document.querySelectorAll("#quiz-options-matrix .option-btn");
    
    optionButtons.forEach(btn => btn.disabled = true);

	const isCorrect = selectedIndex === currentQuestion.shuffledCorrectIndex;
	quizResults.push(isCorrect);
    if (isCorrect) {
        quizScore++;
        optionButtons[selectedIndex].style.background = "#2e7d32";
        optionButtons[selectedIndex].style.borderColor = "#4caf50";
    } else {
        optionButtons[selectedIndex].style.background = "#c62828";
        optionButtons[selectedIndex].style.borderColor = "#ef5350";
        optionButtons[currentQuestion.shuffledCorrectIndex].style.background = "#2e7d32";
    }

    setTimeout(() => {
        quizCurrentIndex++;
        renderActiveQuizQuestionCard();
    }, 1200);
}

/* Evaluate score and queue sequential card draws */
function evaluateQuizEndRewards() {
    alert(`Challenge Complete!\n\nYou scored ${quizScore} out of ${quizPlaylist.length} correct!`);
    
    if (quizScore === 0) {
        alert("No rewards earned this run. Keep training and try again!");
        showScreen("overview");
        return;
    }

    rewardQueueCount = quizScore;
    executeSequentialRewardDraw();
}

/* Custom interactive reward opening waterfall flow loop matrix */
function executeSequentialRewardDraw() {
    if (rewardQueueCount <= 0) {
        showScreen("overview");
        enterCollectionOverview(currentCollectionId);
        return;
    }

    rewardQueueCount--;
    catchRandomPokemon();

    const originalModalClose = document.getElementById("modal-close");
    if (originalModalClose) {
        const newCloseBtn = originalModalClose.cloneNode(true);
        originalModalClose.parentNode.replaceChild(newCloseBtn, originalModalClose);
        
        newCloseBtn.addEventListener("click", () => {
            const cardModalEl = document.getElementById("card-modal");
            if (cardModalEl) cardModalEl.classList.add("hidden");
            executeSequentialRewardDraw();
        });
    }
}

// Attach event options index event parameters
const optionButtons = document.querySelectorAll("#quiz-options-matrix .option-btn");
optionButtons.forEach(btn => {
    btn.addEventListener("click", (e) => {
        const idx = parseInt(e.target.getAttribute("data-value") || e.target.getAttribute("data-index"));
        handleOptionChoiceClick(idx);
    });
});
