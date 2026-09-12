/* =========================================================
   AMT FLIX
   Alberto Marketplace Token Entertainment
   Pi Testnet / Pi SDK 2.0
   ========================================================= */

"use strict";

/* =========================================================
   CONFIGURATION
   ========================================================= */

const CONFIG = {
    APP_NAME: "AMT FLIX",

    // true habang nasa Pi Sandbox / development.
    // Kapag ang AMT FLIX app ay officially configured na
    // para sa Pi Testnet outside Sandbox, saka natin papalitan.
    PI_SANDBOX: true,

    PI_SDK_VERSION: "2.0",

    // Backend URL:
    // Kapag may AMT FLIX backend na tayo, ilalagay natin dito.
    // Huwag gamitin ang AMT Mining server.
    BACKEND_URL: "",

    // Watch reward rate.
    // Display/estimate lamang sa frontend.
    // Actual AMT reward dapat manggaling sa backend.
    WATCH_REWARD_RATE: 0.01,

    MIN_WATCH_PERCENT: 80,

    STORAGE_KEYS: {
        USER: "amtflix_user",
        MY_LIST: "amtflix_my_list",
        CONTINUE: "amtflix_continue",
        HISTORY: "amtflix_history"
    }
};


/* =========================================================
   APP STATE
   ========================================================= */

const state = {
    user: null,

    currentPage: "home",

    selectedDrama: null,

    videoStarted: false,
    watchSeconds: 0,
    lastVideoTime: 0,

    watchTimer: null,
    progressTimer: null,

    myList: [],
    continueWatching: [],
    watchHistory: [],

    authenticated: false
};


/* =========================================================
   DRAMA CATALOG
   =========================================================
   These are legal/public-domain sample entries.
   Video files can later be placed inside:
   assets/videos/
   ========================================================= */

const DRAMAS = [

    {
        id: "children-of-troubled-times",
        title: "Children of Troubled Times",
        originalTitle: "风云儿女",
        category: "Chinese Classics",
        language: "Chinese",
        year: 1935,
        duration: "1h 29m",

        poster: "assets/posters/children-of-troubled-times.jpg",

        video: "assets/videos/children-of-troubled-times.mp4",

        description:
            "A classic Chinese film from 1935. " +
            "This title is included as an archival/public-domain example " +
            "for AMT FLIX.",

        featured: true
    },

    {
        id: "new-women",
        title: "New Women",
        originalTitle: "新女性",
        category: "Chinese Classics",
        language: "Chinese",
        year: 1935,
        duration: "1h 43m",

        poster: "assets/posters/new-women.jpg",

        video: "assets/videos/new-women.mp4",

        description:
            "A historic Chinese film from 1935 presented as an archival classic.",

        featured: true
    },

    {
        id: "lost-lamb",
        title: "The Lost Lamb",
        originalTitle: "迷途的羔羊",
        category: "Chinese Classics",
        language: "Chinese",
        year: 1935,
        duration: "1h 03m",

        poster: "assets/posters/lost-lamb.jpg",

        video: "assets/videos/lost-lamb.mp4",

        description:
            "A classic Chinese film from the 1930s, presented as archival content.",

        featured: false
    },

    {
        id: "free-land",
        title: "Free Land",
        originalTitle: "自由天地",
        category: "Chinese Classics",
        language: "Chinese",
        year: 1937,
        duration: "Classic",

        poster: "assets/posters/free-land.jpg",

        video: "assets/videos/free-land.mp4",

        description:
            "An archival Chinese classic from 1937.",

        featured: false
    },

    {
        id: "empress-wu",
        title: "Empress Wu Zetian",
        originalTitle: "武则天",
        category: "Chinese Classics",
        language: "Chinese",
        year: 1939,
        duration: "Classic",

        poster: "assets/posters/empress-wu.jpg",

        video: "assets/videos/empress-wu.mp4",

        description:
            "A historical Chinese classic centered on Wu Zetian.",

        featured: true
    },

    {
        id: "national-customs",
        title: "National Customs",
        originalTitle: "国风",
        category: "Chinese Classics",
        language: "Chinese",
        year: 1935,
        duration: "Classic",

        poster: "assets/posters/national-customs.jpg",

        video: "assets/videos/national-customs.mp4",

        description:
            "An archival Chinese classic selected for the AMT FLIX library.",

        featured: false
    }

];


/* =========================================================
   DOM HELPERS
   ========================================================= */

function $(id) {
    return document.getElementById(id);
}

function $all(selector) {
    return document.querySelectorAll(selector);
}


/* =========================================================
   SAFE STORAGE
   ========================================================= */

function loadStorage(key, fallback) {

    try {

        const value = localStorage.getItem(key);

        if (!value) {
            return fallback;
        }

        return JSON.parse(value);

    } catch (error) {

        console.warn("Storage read error:", error);

        return fallback;
    }
}


function saveStorage(key, value) {

    try {

        localStorage.setItem(
            key,
            JSON.stringify(value)
        );

    } catch (error) {

        console.warn("Storage write error:", error);
    }
}


/* =========================================================
   INITIALIZATION
   ========================================================= */

document.addEventListener("DOMContentLoaded", init);


async function init() {

    state.myList =
        loadStorage(
            CONFIG.STORAGE_KEYS.MY_LIST,
            []
        );

    state.continueWatching =
        loadStorage(
            CONFIG.STORAGE_KEYS.CONTINUE,
            []
        );

    state.watchHistory =
        loadStorage(
            CONFIG.STORAGE_KEYS.HISTORY,
            []
        );

    initializePi();

    setupNavigation();

    setupLogin();

    setupButtons();

    setupVideoEvents();

    renderCatalog();

    renderContinueWatching();

    renderMyList();

    hideElement("mainApp");

    showElement("loginScreen");

    hideLoader();

    restoreSavedUser();
}


/* =========================================================
   PI SDK
   ========================================================= */

function initializePi() {

    if (
        typeof window.Pi === "undefined"
    ) {

        console.warn(
            "Pi SDK is not available. " +
            "Open AMT FLIX inside a supported Pi environment."
        );

        return;
    }

    try {

        Pi.init({
            version: CONFIG.PI_SDK_VERSION,
            sandbox: CONFIG.PI_SANDBOX
        });

        console.log(
            "Pi SDK initialized.",
            "Sandbox:",
            CONFIG.PI_SANDBOX
        );

    } catch (error) {

        console.error(
            "Pi SDK initialization failed:",
            error
        );
    }
}


/* =========================================================
   PI LOGIN
   ========================================================= */

function setupLogin() {

    const button = $("piLoginBtn");

    if (!button) {
        return;
    }

    button.addEventListener(
        "click",
        authenticateWithPi
    );
}


async function authenticateWithPi() {

    const button = $("piLoginBtn");

    setLoginStatus(
        "Connecting to Pi..."
    );

    if (
        typeof window.Pi === "undefined"
    ) {

        setLoginStatus(
            "Pi SDK is not available. Please open AMT FLIX inside the Pi environment."
        );

        return;
    }

    if (button) {
        button.disabled = true;
    }

    try {

        const scopes = [
            "username",
            "wallet_address"
        ];

        const authResult =
            await Pi.authenticate(
                scopes,
                handleIncompletePayment
            );

        console.log(
            "Pi authentication result:",
            authResult
        );

        if (
            !authResult ||
            !authResult.user
        ) {

            throw new Error(
                "Pi authentication returned no user."
            );
        }

        state.user = {
            uid:
                authResult.user.uid || "",

            username:
                authResult.user.username || "Pioneer",

            walletAddress:
                authResult.user.wallet_address || "",

            accessToken:
                authResult.accessToken || ""
        };

        state.authenticated = true;

        saveStorage(
            CONFIG.STORAGE_KEYS.USER,
            state.user
        );

        /*
         * IMPORTANT:
         *
         * The access token is NOT enough to trust a user
         * for AMT rewards.
         *
         * Our future backend must verify this token
         * against Pi's /v2/me endpoint before issuing
         * any reward.
         */

        await verifyUserWithBackend();

        showAuthenticatedApp();

    } catch (error) {

        console.error(
            "Pi authentication error:",
            error
        );

        setLoginStatus(
            getReadablePiError(error)
        );

    } finally {

        if (button) {
            button.disabled = false;
        }
    }
}


/* =========================================================
   INCOMPLETE PAYMENT HANDLER
   ========================================================= */

function handleIncompletePayment(payment) {

    console.warn(
        "Incomplete Pi payment detected:",
        payment
    );

    /*
     * AMT FLIX does not create Pi payments yet.
     *
     * We keep this callback ready for future
     * Pi payment functionality.
     */
}


/* =========================================================
   BACKEND USER VERIFICATION
   ========================================================= */

async function verifyUserWithBackend() {

    if (!CONFIG.BACKEND_URL) {

        /*
         * Backend is not connected yet.
         *
         * We still allow the authenticated UI to open,
         * but no real AMT reward is credited here.
         */

        console.log(
            "AMT FLIX backend not connected yet."
        );

        return {
            verified: false,
            reason: "backend_not_configured"
        };
    }

    try {

        const response =
            await fetch(
                `${CONFIG.BACKEND_URL}/api/auth/pi`,
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({
                        accessToken:
                            state.user.accessToken
                    })
                }
            );

        if (!response.ok) {

            throw new Error(
                "Backend authentication failed."
            );
        }

        const data =
            await response.json();

        if (data.user) {

            state.user = {
                ...state.user,
                ...data.user
            };

            saveStorage(
                CONFIG.STORAGE_KEYS.USER,
                state.user
            );
        }

        return data;

    } catch (error) {

        console.error(
            "Backend verification error:",
            error
        );

        return {
            verified: false,
            reason: "backend_error"
        };
    }
}


/* =========================================================
   RESTORE SAVED USER
   ========================================================= */

function restoreSavedUser() {

    const saved =
        loadStorage(
            CONFIG.STORAGE_KEYS.USER,
            null
        );

    if (!saved) {
        return;
    }

    /*
     * Do NOT treat localStorage as proof of authentication.
     *
     * We only use this to pre-fill the interface.
     * Real authentication must still come from Pi.
     */

    console.log(
        "Saved AMT FLIX user found."
    );
}


/* =========================================================
   SHOW APP
   ========================================================= */

function showAuthenticatedApp() {

    hideElement("loginScreen");

    showElement("mainApp");

    updateUserInterface();

    showPage("home");

    renderCatalog();

    renderContinueWatching();

    renderMyList();
}


/* =========================================================
   USER INTERFACE
   ========================================================= */

function updateUserInterface() {

    if (!state.user) {
        return;
    }

    const username =
        state.user.username ||
        "Pioneer";

    const wallet =
        state.user.walletAddress ||
        "Wallet address unavailable";

    setText(
        "piUsername",
        "@" + username
    );

    setText(
        "fullWalletAddress",
        wallet
    );

    setText(
        "profileUsername",
        "@" + username
    );

    setText(
        "profileUid",
        state.user.uid || "—"
    );

    setText(
        "profilePiUsername",
        username
    );

    setText(
        "profileWalletShort",
        shortenWallet(wallet)
    );

    setText(
        "profileInitial",
        username
            .charAt(0)
            .toUpperCase()
    );

    setText(
        "profileAvatar",
        username
            .charAt(0)
            .toUpperCase()
    );

    /*
     * We intentionally do NOT show a fake AMT
     * balance here.
     *
     * Backend will supply the real ledger balance
     * once connected.
     */

    setText(
        "amtBalance",
        "0.00000000"
    );

    setText(
        "walletPageBalance",
        "0.00000000"
    );

    setText(
        "watchRewards",
        "0.00000000"
    );
}


/* =========================================================
   NAVIGATION
   ========================================================= */

function setupNavigation() {

    const navButtons =
        $all("[data-page]");

    navButtons.forEach(
        button => {

            button.addEventListener(
                "click",
                () => {

                    const page =
                        button.dataset.page;

                    if (page) {
                        showPage(page);
                    }
                }
            );
        }
    );

    const browseButton =
        $("browseBtn");

    if (browseButton) {

        browseButton.addEventListener(
            "click",
            () => {
                showPage("browse");
            }
        );
    }
}


function showPage(pageName) {

    state.currentPage =
        pageName;

    const pages = [
        "homePage",
        "walletPage",
        "profilePage"
    ];

    pages.forEach(
        id => {

            const page =
                $(id);

            if (!page) {
                return;
            }

            page.classList.remove(
                "active"
            );

            page.style.display = "none";
        }
    );

    let targetId;

    switch (pageName) {

        case "wallet":
            targetId = "walletPage";
            break;

        case "profile":
            targetId = "profilePage";
            break;

        case "browse":
        case "home":
        default:
            targetId = "homePage";
            break;
    }

    const target =
        $(targetId);

    if (target) {

        target.style.display =
            "";

        target.classList.add(
            "active"
        );
    }

    updateNavigationState(
        pageName
    );

    if (pageName === "home") {

        renderContinueWatching();
        renderCatalog();
    }

    if (pageName === "browse") {

        renderCatalog();
    }

    if (pageName === "wallet") {

        updateWalletPage();
    }

    if (pageName === "profile") {

        updateUserInterface();
    }
}


function updateNavigationState(pageName) {

    const buttons =
        $all("[data-page]");

    buttons.forEach(
        button => {

            button.classList.remove(
                "active"
            );

            if (
                button.dataset.page ===
                pageName
            ) {

                button.classList.add(
                    "active"
                );
            }
        }
    );
}


/* =========================================================
   CATALOG
   ========================================================= */

function renderCatalog(
    filter = "all"
) {

    const grid =
        $("dramaGrid");

    if (!grid) {
        return;
    }

    let items =
        [...DRAMAS];

    if (
        filter &&
        filter !== "all"
    ) {

        items =
            items.filter(
                drama =>
                    normalize(
                        drama.category
                    ) ===
                    normalize(filter)
            );
    }

    grid.innerHTML = "";

    if (!items.length) {

        grid.innerHTML =
            `
            <div class="empty-state">
                <h3>No titles found</h3>
                <p>More AMT FLIX content is coming soon.</p>
            </div>
            `;

        return;
    }

    items.forEach(
        drama => {

            const card =
                createDramaCard(
                    drama
                );

            grid.appendChild(
                card
            );
        }
    );
}


function createDramaCard(drama) {

    const card =
        document.createElement("article");

    card.className =
        "drama-card";

    const inList =
        state.myList.includes(
            drama.id
        );

    card.innerHTML =
        `
        <div class="drama-poster">

            <img
                src="${escapeAttribute(drama.poster)}"
                alt="${escapeAttribute(drama.title)}"
                loading="lazy"
                onerror="this.style.display='none'"
            >

            <div class="poster-fallback">
                ${escapeHtml(
                    drama.title
                )}
            </div>

            ${
                drama.featured
                ? `<span class="drama-badge">FEATURED</span>`
                : ""
            }

        </div>

        <div class="drama-card-body">

            <h3>
                ${escapeHtml(drama.title)}
            </h3>

            <p>
                ${escapeHtml(drama.originalTitle)}
            </p>

            <div class="drama-meta">
                <span>${escapeHtml(drama.year)}</span>
                <span>${escapeHtml(drama.category)}</span>
            </div>

            <div class="drama-actions">

                <button
                    class="watch-card-btn"
                    type="button"
                >
                    ▶ Watch
                </button>

                <button
                    class="list-card-btn ${inList ? "saved" : ""}"
                    type="button"
                    aria-label="My List"
                >
                    ${inList ? "✓" : "+"}
                </button>

            </div>

        </div>
        `;

    const watchButton =
        card.querySelector(
            ".watch-card-btn"
        );

    if (watchButton) {

        watchButton.addEventListener(
            "click",
            () => openDrama(drama)
        );
    }

    const listButton =
        card.querySelector(
            ".list-card-btn"
        );

    if (listButton) {

        listButton.addEventListener(
            "click",
            event => {

                event.stopPropagation();

                toggleMyList(
                    drama.id
                );
            }
        );
    }

    return card;
}


/* =========================================================
   DRAMA MODAL
   ========================================================= */

function setupButtons() {

    const closeModal =
        $("closeDramaModal");

    if (closeModal) {

        closeModal.addEventListener(
            "click",
            closeDramaModal
        );
    }

    const watchButton =
        $("watchDramaBtn");

    if (watchButton) {

        watchButton.addEventListener(
            "click",
            () => {

                if (
                    state.selectedDrama
                ) {

                    closeDramaModal();

                    openVideoPlayer(
                        state.selectedDrama
                    );
                }
            }
        );
    }

    const closeVideo =
        $("closeVideoBtn");

    if (closeVideo) {

        closeVideo.addEventListener(
            "click",
            closeVideoPlayer
        );
    }

    /*
     * Category buttons.
     */

    $all("[data-category]")
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    () => {

                        const category =
                            button.dataset.category;

                        renderCatalog(
                            category
                        );

                        showPage("browse");
                    }
                );
            }
        );
}


function openDrama(drama) {

    state.selectedDrama =
        drama;

    setText(
        "modalTitle",
        drama.title
    );

    setText(
        "modalCategory",
        `${drama.category} • ${drama.year}`
    );

    setText(
        "modalDescription",
        drama.description
    );

    const poster =
        $("modalPoster");

    if (poster) {

        poster.src =
            drama.poster;

        poster.alt =
            drama.title;

        poster.onerror =
            () => {
                poster.style.display =
                    "none";
            };
    }

    const modal =
        $("dramaModal");

    if (modal) {

        modal.classList.add(
            "open"
        );

        modal.style.display =
            "flex";
    }
}


function closeDramaModal() {

    const modal =
        $("dramaModal");

    if (!modal) {
        return;
    }

    modal.classList.remove(
        "open"
    );

    modal.style.display =
        "none";
}


/* =========================================================
   VIDEO PLAYER
   ========================================================= */

function setupVideoEvents() {

    const video =
        $("dramaVideo");

    if (!video) {
        return;
    }

    video.addEventListener(
        "loadedmetadata",
        updateVideoProgress
    );

    video.addEventListener(
        "timeupdate",
        handleVideoTimeUpdate
    );

    video.addEventListener(
        "play",
        startWatchTracking
    );

    video.addEventListener(
        "pause",
        stopWatchTracking
    );

    video.addEventListener(
        "ended",
        handleVideoEnded
    );

    video.addEventListener(
        "error",
        handleVideoError
    );
}


function openVideoPlayer(drama) {

    state.selectedDrama =
        drama;

    state.videoStarted =
        false;

    state.watchSeconds =
        0;

    state.lastVideoTime =
        0;

    const video =
        $("dramaVideo");

    const screen =
        $("videoScreen");

    if (!video || !screen) {
        return;
    }

    setText(
        "videoTitle",
        drama.title
    );

    setText(
        "watchPercent",
        "0%"
    );

    setText(
        "sessionReward",
        "Pending verification"
    );

    const progress =
        $("watchProgressBar");

    if (progress) {

        progress.style.width =
            "0%";
    }

    video.pause();

    video.currentTime =
        getSavedVideoTime(
            drama.id
        );

    /*
     * The video file is expected in:
     *
     * assets/videos/<filename>.mp4
     *
     * We don't generate fake video URLs.
     */

    video.src =
        drama.video;

    video.load();

    screen.classList.add(
        "open"
    );

    screen.style.display =
        "flex";

    document.body.classList.add(
        "video-open"
    );

    state.videoStarted =
        true;

    saveContinueWatching(
        drama.id,
        video.currentTime
    );
}


function closeVideoPlayer() {

    const video =
        $("dramaVideo");

    const screen =
        $("videoScreen");

    stopWatchTracking();

    if (video) {
        video.pause();
    }

    if (screen) {

        screen.classList.remove(
            "open"
        );

        screen.style.display =
            "none";
    }

    document.body.classList.remove(
        "video-open"
    );

    if (state.selectedDrama) {

        saveContinueWatching(
            state.selectedDrama.id,
            video
                ? video.currentTime
                : state.lastVideoTime
        );
    }
}


/* =========================================================
   WATCH TRACKING
   ========================================================= */

function startWatchTracking() {

    if (state.watchTimer) {
        return;
    }

    state.watchTimer =
        setInterval(
            () => {

                const video =
                    $("dramaVideo");

                if (
                    !video ||
                    video.paused ||
                    video.ended
                ) {
                    return;
                }

                state.watchSeconds += 1;

                state.lastVideoTime =
                    video.currentTime;

                updateVideoProgress();

                saveContinueWatching(
                    state.selectedDrama.id,
                    video.currentTime
                );

            },
            1000
        );

    /*
     * Send periodic watch verification
     * to backend once backend exists.
     */

    state.progressTimer =
        setInterval(
            sendWatchProgress,
            15000
        );
}


function stopWatchTracking() {

    if (state.watchTimer) {

        clearInterval(
            state.watchTimer
        );

        state.watchTimer =
            null;
    }

    if (state.progressTimer) {

        clearInterval(
            state.progressTimer
        );

        state.progressTimer =
            null;
    }

    sendWatchProgress();
}


function handleVideoTimeUpdate() {

    state.lastVideoTime =
        this.currentTime;

    updateVideoProgress();
}


function updateVideoProgress() {

    const video =
        $("dramaVideo");

    if (!video) {
        return;
    }

    const duration =
        video.duration;

    if (
        !Number.isFinite(duration) ||
        duration <= 0
    ) {
        return;
    }

    const percent =
        Math.min(
            100,
            Math.max(
                0,
                (video.currentTime / duration) * 100
            )
        );

    setText(
        "watchPercent",
        `${Math.round(percent)}%`
    );

    const progress =
        $("watchProgressBar");

    if (progress) {

        progress.style.width =
            `${percent}%`;
    }

    /*
     * Frontend only displays an estimate.
     *
     * Actual AMT must never be credited from this value.
     */

    const rewardEstimate =
        (
            (video.currentTime / 3600) *
            CONFIG.WATCH_REWARD_RATE
        );

    setText(
        "sessionReward",
        `${rewardEstimate.toFixed(8)} AMT pending`
    );
}


/* =========================================================
   WATCH COMPLETION
   ========================================================= */

async function handleVideoEnded() {

    stopWatchTracking();

    if (!state.selectedDrama) {
        return;
    }

    saveContinueWatching(
        state.selectedDrama.id,
        0
    );

    addWatchHistory(
        state.selectedDrama.id
    );

    const video =
        $("dramaVideo");

    let percentage = 100;

    if (
        video &&
        Number.isFinite(video.duration) &&
        video.duration > 0
    ) {

        percentage =
            (video.currentTime /
                video.duration) *
            100;
    }

    if (
        percentage >=
        CONFIG.MIN_WATCH_PERCENT
    ) {

        await requestRewardVerification();
    }
}


/* =========================================================
   BACKEND WATCH PROGRESS
   ========================================================= */

async function sendWatchProgress() {

    if (
        !CONFIG.BACKEND_URL ||
        !state.user ||
        !state.selectedDrama
    ) {
        return;
    }

    const video =
        $("dramaVideo");

    if (!video) {
        return;
    }

    try {

        await fetch(
            `${CONFIG.BACKEND_URL}/api/watch/progress`,
            {
                method: "POST",

                headers: {
                    "Content-Type":
                        "application/json"
                },

                body: JSON.stringify({

                    accessToken:
                        state.user.accessToken,

                    dramaId:
                        state.selectedDrama.id,

                    position:
                        video.currentTime,

                    duration:
                        Number.isFinite(
                            video.duration
                        )
                        ? video.duration
                        : 0
                })
            }
        );

    } catch (error) {

        console.warn(
            "Watch progress sync failed:",
            error
        );
    }
}


/* =========================================================
   REWARD VERIFICATION
   ========================================================= */

async function requestRewardVerification() {

    if (!state.selectedDrama) {
        return;
    }

    /*
     * No backend = NO REAL REWARD.
     *
     * This protects the AMT economy from fake
     * frontend-generated balances.
     */

    if (!CONFIG.BACKEND_URL) {

        setText(
            "sessionReward",
            "Watch completed • reward pending"
        );

        console.log(
            "Watch completed. Backend reward verification is not connected."
        );

        return;
    }

    if (!state.user) {
        return;
    }

    const video =
        $("dramaVideo");

    if (!video) {
        return;
    }

    try {

        const response =
            await fetch(
                `${CONFIG.BACKEND_URL}/api/watch/claim`,
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({

                        accessToken:
                            state.user.accessToken,

                        dramaId:
                            state.selectedDrama.id,

                        watchedSeconds:
                            Math.floor(
                                state.watchSeconds
                            ),

                        position:
                            video.currentTime,

                        duration:
                            Number.isFinite(
                                video.duration
                            )
                            ? video.duration
                            : 0
                    })
                }
            );

        const data =
            await response.json();

        if (!response.ok) {

            throw new Error(
                data.message ||
                "Reward verification failed."
            );
        }

        if (
            data.balance !== undefined
        ) {

            updateAMTBalance(
                data.balance
            );
        }

        if (
            data.reward !== undefined
        ) {

            setText(
                "sessionReward",
                `+${Number(data.reward).toFixed(8)} AMT`
            );
        } else {

            setText(
                "sessionReward",
                "Reward verified"
            );
        }

    } catch (error) {

        console.error(
            "Reward verification error:",
            error
        );

        setText(
            "sessionReward",
            "Reward verification pending"
        );
    }
}


/* =========================================================
   AMT BALANCE
   ========================================================= */

function updateAMTBalance(balance) {

    const amount =
        Number(balance);

    if (!Number.isFinite(amount)) {
        return;
    }

    const formatted =
        amount.toFixed(8);

    setText(
        "amtBalance",
        formatted
    );

    setText(
        "walletPageBalance",
        formatted
    );
}


/* =========================================================
   CONTINUE WATCHING
   ========================================================= */

function saveContinueWatching(
    dramaId,
    position
) {

    if (!dramaId) {
        return;
    }

    const drama =
        findDrama(dramaId);

    if (!drama) {
        return;
    }

    const existingIndex =
        state.continueWatching.findIndex(
            item =>
                item.id === dramaId
        );

    const item = {
        id: dramaId,
        position:
            Number(position) || 0,
        updatedAt:
            Date.now()
    };

    if (existingIndex >= 0) {

        state.continueWatching[
            existingIndex
        ] = item;

    } else {

        state.continueWatching.unshift(
            item
        );
    }

    state.continueWatching =
        state.continueWatching
            .slice(0, 10);

    saveStorage(
        CONFIG.STORAGE_KEYS.CONTINUE,
        state.continueWatching
    );
}


function getSavedVideoTime(dramaId) {

    const item =
        state.continueWatching.find(
            entry =>
                entry.id === dramaId
        );

    if (!item) {
        return 0;
    }

    return Number(item.position) || 0;
}


function renderContinueWatching() {

    const container =
        $("continueList");

    if (!container) {
        return;
    }

    container.innerHTML = "";

    if (
        !state.continueWatching.length
    ) {

        container.innerHTML =
            `
            <div class="empty-state">
                <p>
                    Start watching a title and it will appear here.
                </p>
            </div>
            `;

        return;
    }

    state.continueWatching.forEach(
        item => {

            const drama =
                findDrama(item.id);

            if (!drama) {
                return;
            }

            const element =
                document.createElement("div");

            element.className =
                "continue-card";

            element.innerHTML =
                `
                <div class="continue-thumb">

                    <img
                        src="${escapeAttribute(drama.poster)}"
                        alt="${escapeAttribute(drama.title)}"
                        loading="lazy"
                        onerror="this.style.display='none'"
                    >

                </div>

                <div class="continue-info">

                    <strong>
                        ${escapeHtml(drama.title)}
                    </strong>

                    <span>
                        Continue watching
                    </span>

                </div>
                `;

            element.addEventListener(
                "click",
                () => openVideoPlayer(drama)
            );

            container.appendChild(
                element
            );
        }
    );
}


/* =========================================================
   MY LIST
   ========================================================= */

function toggleMyList(dramaId) {

    const index =
        state.myList.indexOf(
            dramaId
        );

    if (index >= 0) {

        state.myList.splice(
            index,
            1
        );

    } else {

        state.myList.push(
            dramaId
        );
    }

    saveStorage(
        CONFIG.STORAGE_KEYS.MY_LIST,
        state.myList
    );

    renderCatalog();

    renderMyList();
}


function renderMyList() {

    /*
     * If the current HTML has a My List
     * container, populate it.
     */

    const container =
        $("myList");

    if (!container) {
        return;
    }

    container.innerHTML = "";

    if (!state.myList.length) {

        container.innerHTML =
            `
            <div class="empty-state">
                <p>Your list is empty.</p>
            </div>
            `;

        return;
    }

    state.myList.forEach(
        id => {

            const drama =
                findDrama(id);

            if (!drama) {
                return;
            }

            const card =
                createDramaCard(
                    drama
                );

            container.appendChild(
                card
            );
        }
    );
}


/* =========================================================
   WATCH HISTORY
   ========================================================= */

function addWatchHistory(dramaId) {

    const drama =
        findDrama(dramaId);

    if (!drama) {
        return;
    }

    state.watchHistory =
        state.watchHistory.filter(
            item =>
                item.id !== dramaId
        );

    state.watchHistory.unshift(
        {
            id: dramaId,
            watchedAt: Date.now()
        }
    );

    state.watchHistory =
        state.watchHistory.slice(
            0,
            50
        );

    saveStorage(
        CONFIG.STORAGE_KEYS.HISTORY,
        state.watchHistory
    );
}


/* =========================================================
   WALLET PAGE
   ========================================================= */

function updateWalletPage() {

    if (!state.user) {
        return;
    }

    setText(
        "walletPageBalance",
        getElementText("amtBalance") ||
        "0.00000000"
    );

    setText(
        "fullWalletAddress",
        state.user.walletAddress ||
        "Wallet address unavailable"
    );

    /*
     * This is the user's Pi wallet address
     * supplied by Pi SDK with wallet_address scope.
     *
     * It is NOT the AMT Mining app's wallet.
     */
}


/* =========================================================
   VIDEO ERROR
   ========================================================= */

function handleVideoError() {

    const video =
        $("dramaVideo");

    if (!video) {
        return;
    }

    console.warn(
        "Video could not be loaded:",
        video.src
    );

    setText(
        "sessionReward",
        "Video source unavailable"
    );
}


/* =========================================================
   CLOSE MODAL WHEN CLICKING OUTSIDE
   ========================================================= */

document.addEventListener(
    "click",
    event => {

        const modal =
            $("dramaModal");

        if (
            !modal ||
            !modal.classList.contains(
                "open"
            )
        ) {
            return;
        }

        if (
            event.target === modal
        ) {
            closeDramaModal();
        }
    }
);


/* =========================================================
   ESC KEY
   ========================================================= */

document.addEventListener(
    "keydown",
    event => {

        if (event.key !== "Escape") {
            return;
        }

        closeDramaModal();

        closeVideoPlayer();
    }
);


/* =========================================================
   UTILITY FUNCTIONS
   ========================================================= */

function findDrama(id) {

    return DRAMAS.find(
        drama =>
            drama.id === id
    );
}


function shortenWallet(wallet) {

    if (!wallet) {
        return "Not connected";
    }

    if (wallet.length <= 18) {
        return wallet;
    }

    return (
        wallet.slice(0, 8) +
        "..." +
        wallet.slice(-8)
    );
}


function normalize(value) {

    return String(value || "")
        .trim()
        .toLowerCase();
}


function setText(id, value) {

    const element =
        $(id);

    if (!element) {
        return;
    }

    element.textContent =
        value;
}


function getElementText(id) {

    const element =
        $(id);

    if (!element) {
        return "";
    }

    return element.textContent;
}


function showElement(id) {

    const element =
        $(id);

    if (!element) {
        return;
    }

    element.style.display =
        "";
}


function hideElement(id) {

    const element =
        $(id);

    if (!element) {
        return;
    }

    element.style.display =
        "none";
}


function hideLoader() {

    const loader =
        $("appLoader");

    if (!loader) {
        return;
    }

    setTimeout(
        () => {

            loader.classList.add(
                "hidden"
            );

            loader.style.display =
                "none";

        },
        500
    );
}


function setLoginStatus(message) {

    const status =
        $("loginStatus");

    if (!status) {
        return;
    }

    status.textContent =
        message;
}


function getReadablePiError(error) {

    if (!error) {
        return "Pi Login was not completed.";
    }

    if (
        error.message
    ) {

        return error.message;
    }

    return "Pi Login was not completed. Please try again.";
}


/* =========================================================
   HTML ESCAPING
   ========================================================= */

function escapeHtml(value) {

    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}


function escapeAttribute(value) {

    return escapeHtml(value);
}


/* =========================================================
   DEBUG HELPERS
   ========================================================= */

window.AMTFLIX = {

    getState() {
        return {
            ...state,
            user: state.user
                ? {
                    uid: state.user.uid,
                    username: state.user.username,
                    walletAddress:
                        state.user.walletAddress
                }
                : null
        };
    },

    getCatalog() {
        return DRAMAS;
    },

    logout() {

        /*
         * Local UI logout.
         *
         * We intentionally don't pretend this revokes
         * Pi authorization on the platform.
         */

        state.user = null;
        state.authenticated = false;

        localStorage.removeItem(
            CONFIG.STORAGE_KEYS.USER
        );

        location.reload();
    }

};


/* =========================================================
   STARTUP MESSAGE
   ========================================================= */

console.log(
    "%cAMT FLIX initialized",
    "font-size:18px;font-weight:bold;"
);

console.log(
    "Pi Sandbox:",
    CONFIG.PI_SANDBOX
);

console.log(
    "Backend:",
    CONFIG.BACKEND_URL ||
    "Not connected yet"
);