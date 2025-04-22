// --- Constants and Settings ---
const VISITORS_STORAGE_KEY = 'mgl-visitors-data-v5'; // Updated key for new structure
const EARNINGS_STORAGE_KEY_PREFIX = 'mgl-earnings-data-';
const REWARD_THRESHOLD = 5; // Visits needed to qualify for reward (5 means 6th is free)
const HIDDEN_CLASS = 'hidden';
const SPLASH_TIMEOUT = 1200; // Slightly longer splash

const EARNINGS_MAP = { 1: 8000, 2: 10000, 3: 15000, 4: 18000 };

// --- State Variables ---
let visitors = []; // {id, name, age, phone, visits}
let todaysEarnings = []; // {visitorName, players, amount, timestamp}
let activeVisitorForEarning = null; // Visitor selected for adding earnings or reward
let selectedVisitorForEdit = null; // Visitor being viewed/edited in search
let scanning = false;
let stream = null;

// --- DOM Element References ---
const splashScreen = document.getElementById('splash-screen');
const mainPage = document.getElementById('main-page');
const dataEntryForm = document.getElementById('data-entry-form');
const searchPage = document.getElementById('search-page');
const earningsPage = document.getElementById('earnings-page');
const playerChoiceModal = document.getElementById('player-choice-modal');
const rewardModal = document.getElementById('reward-modal'); // Reward modal

const scanBtn = document.getElementById('scan-btn');
const earningsBtn = document.getElementById('earnings-btn');
const searchBtn = document.getElementById('search-btn');
const manualEntryBtn = document.getElementById('manual-entry-btn');
const cancelFormBtn = document.getElementById('cancel-form');
const backFromSearchBtn = document.getElementById('back-from-search');
const backFromEarningsBtn = document.getElementById('back-from-earnings');
const clearEarningsBtn = document.getElementById('clear-earnings-btn');
const visitorForm = document.getElementById('visitor-form');
const barcodeInput = document.getElementById('barcode');
const barcodeHelp = document.getElementById('barcode-help');
const nameInput = document.getElementById('name');
const ageInput = document.getElementById('age');
const phoneInput = document.getElementById('phone');
const formInstructions = document.getElementById('form-instructions');
const searchInput = document.getElementById('search-input');
const searchSubmit = document.getElementById('search-submit');
const searchFeedback = document.getElementById('search-feedback');
const searchResultsContainer = document.getElementById('search-results');
const resultsList = document.getElementById('results-list');
const selectedVisitorDetails = document.getElementById('selected-visitor-details');
const visitorInfo = document.getElementById('visitor-info');
const deleteVisitorBtn = document.getElementById('delete-visitor-btn');
const visitorVisitsDisplay = document.getElementById('visitor-visits-display'); // Span for visit count
const increaseVisitsBtn = document.getElementById('increase-visits-btn'); // + button
const decreaseVisitsBtn = document.getElementById('decrease-visits-btn'); // - button
const scanResult = document.getElementById('scan-result');
const videoElement = document.getElementById('scanner-video');
const canvasElement = document.getElementById('scanner-canvas');
const scannerLaser = document.getElementById('scanner-laser');

// Earnings Page Elements
const earningsListDiv = document.getElementById('earnings-list');
const totalEarningsSpan = document.getElementById('total-earnings');
const currentDateSpan = document.getElementById('current-date');

// Player Choice Modal Elements
const playerChoiceVisitorName = document.getElementById('player-choice-visitor-name');
const playerOptionsDiv = document.querySelector('.player-options');
const cancelPlayerChoiceBtn = document.getElementById('cancel-player-choice');

// Reward Modal Elements
const rewardVisitorName = document.getElementById('reward-visitor-name');
const closeRewardModalBtn = document.getElementById('close-reward-modal');

// --- Utility Functions ---
function getCurrentDateString() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function formatCurrency(amount) {
    return amount.toLocaleString('ar-SY'); // Use Syrian Arabic locale for formatting
}

// --- Data Handling Functions ---
function loadVisitorData() {
    const storedData = localStorage.getItem(VISITORS_STORAGE_KEY);
    visitors = [];
    if (storedData) {
        try {
            const parsedData = JSON.parse(storedData);
            if (Array.isArray(parsedData)) {
                // Ensure 'visits' property exists on all loaded visitors
                visitors = parsedData.map(visitor => ({
                    ...visitor,
                    visits: visitor.visits || 0 // Default to 0 if missing
                }));
            } else { console.warn("Stored visitor data is not an array, resetting."); }
        } catch (error) { console.error("Failed to parse visitor data:", error); }
    }
    console.log(`Loaded ${visitors.length} visitors.`);
}

function saveVisitorData() {
    try {
        localStorage.setItem(VISITORS_STORAGE_KEY, JSON.stringify(visitors));
        console.log("Visitor data saved.");
    } catch (error) { console.error("Failed to save visitor data:", error); alert("حدث خطأ أثناء حفظ بيانات الزوار."); }
}

function loadEarningsData(dateString) {
    const key = EARNINGS_STORAGE_KEY_PREFIX + dateString;
    const storedData = localStorage.getItem(key);
    todaysEarnings = [];
    if (storedData) {
        try {
            const parsedData = JSON.parse(storedData);
            if (Array.isArray(parsedData)) { todaysEarnings = parsedData; }
            else { console.warn(`Stored earnings data for ${dateString} is not an array.`); }
        } catch (error) { console.error(`Failed to parse earnings data for ${dateString}:`, error); }
    }
    console.log(`Loaded ${todaysEarnings.length} earnings entries for ${dateString}.`);
}

function saveEarningsData(dateString) {
    const key = EARNINGS_STORAGE_KEY_PREFIX + dateString;
    try {
        localStorage.setItem(key, JSON.stringify(todaysEarnings));
        console.log(`Earnings data saved for ${dateString}.`);
    } catch (error) { console.error(`Failed to save earnings data for ${dateString}:`, error); alert("حدث خطأ أثناء حفظ بيانات الأرباح."); }
}

function addEarningEntry(visitorName, players, amount) {
    const timestamp = new Date().toISOString();
    const newEntry = { visitorName, players, amount, timestamp };
    todaysEarnings.push(newEntry);
    saveEarningsData(getCurrentDateString());
    displayEarnings(); // Update display
}

function clearTodaysEarnings() {
     if (confirm(`هل أنت متأكد من مسح جميع سجلات الأرباح لهذا اليوم (${getCurrentDateString()})؟`)) {
        todaysEarnings = [];
        const key = EARNINGS_STORAGE_KEY_PREFIX + getCurrentDateString();
        localStorage.removeItem(key);
        console.log(`Cleared earnings for ${getCurrentDateString()}.`);
        displayEarnings();
        alert("تم مسح أرباح اليوم.");
     }
}

// --- Application Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    loadVisitorData();
    loadEarningsData(getCurrentDateString()); // Load today's earnings

    // Initial UI Setup
    document.querySelectorAll('.page').forEach(page => page.classList.add(HIDDEN_CLASS));
    playerChoiceModal?.classList.add(HIDDEN_CLASS);
    rewardModal?.classList.add(HIDDEN_CLASS); // Hide reward modal initially
    splashScreen?.classList.remove(HIDDEN_CLASS);
    document.body.style.overflow = 'hidden';

    setTimeout(() => {
        splashScreen?.classList.add(HIDDEN_CLASS);
        mainPage?.classList.remove(HIDDEN_CLASS);
        document.body.style.overflow = 'auto';
        resetUI();
    }, SPLASH_TIMEOUT);

    // Check jsQR
    if (typeof jsQR === 'undefined') {
        console.error("مكتبة jsQR غير محملة!");
        alert("خطأ: لم يتم تحميل مكتبة مسح الباركود (jsQR).");
        scanBtn && (scanBtn.disabled = true, scanBtn.textContent = "المسح معطل");
        scanResult && (scanResult.textContent = "خطأ تحميل المكتبة.");
    } else {
        console.log("jsQR library loaded.");
        scanBtn && (scanBtn.disabled = false); // Enable scan button if library is loaded
    }

    // Attach Event Listeners
    scanBtn?.addEventListener('click', toggleScanner);
    earningsBtn?.addEventListener('click', showEarningsPage);
    searchBtn?.addEventListener('click', showSearchPage);
    manualEntryBtn?.addEventListener('click', showManualEntryForm);
    cancelFormBtn?.addEventListener('click', hideDataEntryForm);
    visitorForm?.addEventListener('submit', handleFormSubmit);
    backFromSearchBtn?.addEventListener('click', hideSearchPage);
    searchSubmit?.addEventListener('click', handleSearch);
    searchInput?.addEventListener('keypress', (e) => e.key === 'Enter' && handleSearch());
    deleteVisitorBtn?.addEventListener('click', handleDeleteVisitor);
    resultsList?.addEventListener('click', handleResultSelection);
    increaseVisitsBtn?.addEventListener('click', increaseVisits); // Listener for + button
    decreaseVisitsBtn?.addEventListener('click', decreaseVisits); // Listener for - button

    // Earnings Page Listeners
    backFromEarningsBtn?.addEventListener('click', hideEarningsPage);
    clearEarningsBtn?.addEventListener('click', clearTodaysEarnings);

    // Player Choice Modal Listeners
    playerOptionsDiv?.addEventListener('click', (e) => {
        if (e.target && e.target.classList.contains('player-btn') && e.target.dataset.players) {
            const players = parseInt(e.target.dataset.players, 10);
            if (!isNaN(players) && players >= 1 && players <= 4) {
                handlePlayerChoice(players);
            }
        }
    });
    cancelPlayerChoiceBtn?.addEventListener('click', hidePlayerChoiceModal);

    // Reward Modal Listener
    closeRewardModalBtn?.addEventListener('click', handleRewardConfirmation);
});

// --- Page Navigation Functions ---
function showPage(pageToShow) {
    stopScanner();
    hidePlayerChoiceModal();
    hideRewardModal(); // Hide reward modal on page change

    document.querySelectorAll('.page').forEach(page => page.classList.add(HIDDEN_CLASS));

    if (pageToShow) {
        pageToShow.classList.remove(HIDDEN_CLASS);
    } else {
        mainPage?.classList.remove(HIDDEN_CLASS);
    }
}

function showSearchPage() { showPage(searchPage); resetSearchUI(); searchInput?.focus(); }
function hideSearchPage() { showPage(null); resetUI(); }
function showManualEntryForm() {
    visitorForm?.reset();
    formInstructions && (formInstructions.textContent = 'أدخل بيانات الزائر الجديد والباركود.');
    if (barcodeInput) { barcodeInput.disabled = false; barcodeInput.required = true; barcodeInput.focus(); }
    barcodeHelp && (barcodeHelp.textContent = 'أدخل رقم باركود فريد.');
    showPage(dataEntryForm);
}
function showDataEntryFormForScan(scannedBarcode) {
    visitorForm?.reset();
    formInstructions && (formInstructions.textContent = 'باركود جديد. أكمل بيانات الزائر.');
    if (barcodeInput) { barcodeInput.value = scannedBarcode; barcodeInput.disabled = true; barcodeInput.required = false; }
    barcodeHelp && (barcodeHelp.textContent = 'الباركود ممسوح ضوئياً.');
    showPage(dataEntryForm);
    nameInput?.focus();
}
function hideDataEntryForm() { showPage(null); resetUI(); }
function showEarningsPage() {
    const today = getCurrentDateString();
    loadEarningsData(today);
    displayEarnings();
    if (currentDateSpan) currentDateSpan.textContent = today;
    showPage(earningsPage);
}
function hideEarningsPage() { showPage(null); resetUI(); }

// --- Modal Handling ---
function showPlayerChoiceModal(visitor) {
    if (!visitor) return;
    activeVisitorForEarning = visitor;
    playerChoiceVisitorName && (playerChoiceVisitorName.textContent = `اختر عدد اللاعبين لـ: ${visitor.name}`);
    playerChoiceModal?.classList.remove(HIDDEN_CLASS);
}
function hidePlayerChoiceModal() {
    activeVisitorForEarning = null;
    playerChoiceModal?.classList.add(HIDDEN_CLASS);
}

function showRewardModal(visitor) {
    if (!visitor) return;
    activeVisitorForEarning = visitor; // Store visitor for reward confirmation
    rewardVisitorName && (rewardVisitorName.textContent = visitor.name);
    rewardModal?.classList.remove(HIDDEN_CLASS);
}
function hideRewardModal() {
    activeVisitorForEarning = null; // Clear stored visitor
    rewardModal?.classList.add(HIDDEN_CLASS);
}

// --- UI Display Functions ---
function displayEarnings() {
    if (!earningsListDiv || !totalEarningsSpan) return;
    let total = 0;
    earningsListDiv.innerHTML = '';
    if (todaysEarnings.length === 0) {
        earningsListDiv.innerHTML = '<p>لا توجد إدخالات لهذا اليوم.</p>';
    } else {
        todaysEarnings.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)); // Newest first
        todaysEarnings.forEach(entry => {
            total += entry.amount;
            const entryDiv = document.createElement('div');
            entryDiv.classList.add('earning-entry');
            entryDiv.innerHTML = `
                <div class="visitor-details">
                    <span class="visitor-name">${entry.visitorName}</span>
                    <span class="player-count">${entry.players} ${entry.players > 1 ? 'لاعبين' : 'لاعب'}</span>
                </div>
                <span class="earning-amount">${formatCurrency(entry.amount)}</span>
            `;
            earningsListDiv.appendChild(entryDiv);
        });
    }
    totalEarningsSpan.textContent = formatCurrency(total);
}

// --- UI Reset Functions ---
function resetUI() {
    activeVisitorForEarning = null;
    selectedVisitorForEdit = null;
    scanResult && (scanResult.textContent = 'الماسح جاهز.');
    stopScanner();
}
function resetSearchUI() {
    searchInput && (searchInput.value = '');
    searchFeedback && (searchFeedback.textContent = '');
    searchResultsContainer?.classList.add(HIDDEN_CLASS);
    resultsList && (resultsList.innerHTML = '');
    selectedVisitorDetails?.classList.add(HIDDEN_CLASS);
    visitorInfo && (visitorInfo.innerHTML = '');
    selectedVisitorForEdit = null; // Clear visitor being edited
}

// --- Scanner Functions (jsQR) ---
function toggleScanner() { /* ... (Keep the jsQR toggleScanner function from previous answer) ... */
    if (typeof jsQR === 'undefined') {
         alert("خطأ: مكتبة المسح (jsQR) غير محملة.");
         return;
     }
    if (scanning) {
        stopScanner();
    } else {
        startScanner();
    }
}
function startScanner() { /* ... (Keep the jsQR startScanner function from previous answer) ... */
    if (scanning) return;

    if (!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)) {
        alert("المتصفح لا يدعم الوصول للكاميرا.");
        scanResult && (scanResult.textContent = "❌ المتصفح لا يدعم الكاميرا.");
        return;
    }

    scanBtn && (scanBtn.textContent = 'جاري البدء...', scanBtn.disabled = true);
    scanResult && (scanResult.textContent = '⏳ طلب إذن الكاميرا...');

    navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } })
        .then((cameraStream) => {
            stream = cameraStream;
            if (!videoElement) {
                console.error("Video element not found!");
                stopScanner(); return;
            }
            videoElement.srcObject = stream;
            videoElement.setAttribute("playsinline", true);
            videoElement.play().then(() => {
                scanning = true;
                scanBtn && (scanBtn.textContent = 'إيقاف المسح', scanBtn.classList.add('cancel'), scanBtn.disabled = false);
                scannerLaser?.classList.remove(HIDDEN_CLASS);
                scanResult && (scanResult.textContent = '✅ جاهز للمسح...');
                requestAnimationFrame(tick);
            }).catch(playError => {
                 console.error("Video play error:", playError);
                 scanResult && (scanResult.textContent = '❌ خطأ تشغيل الفيديو!');
                 stopScanner();
             });
        })
        .catch((err) => {
            console.error("Camera access error:", err);
            let message = `❌ فشل الوصول للكاميرا (${err.name})!`;
            if (err.name === "NotAllowedError") { message = "🚫 تم رفض إذن الكاميرا."; }
            else if (err.name === "NotFoundError") { message = "⚠️ لم يتم العثور على كاميرا."; }
            else if (err.name === "NotReadableError") { message = "❌ لا يمكن قراءة بث الكاميرا (مستخدمة؟)."; }
            scanResult && (scanResult.textContent = message);
            alert(message + " تأكد من منح الإذن.");
            stopScanner();
        });
}
function stopScanner() { /* ... (Keep the jsQR stopScanner function from previous answer) ... */
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
        stream = null;
    }
    if (videoElement) {
         try { videoElement.pause(); videoElement.srcObject = null; }
         catch (e) { console.warn("Minor error stopping video:", e); }
     }
    if (scanning) {
        scanning = false;
        scannerLaser?.classList.add(HIDDEN_CLASS);
        if (scanBtn) {
            scanBtn.textContent = 'مسح الباركود';
            scanBtn.classList.remove('cancel');
            scanBtn.disabled = (typeof jsQR === 'undefined');
        }
        console.log("Scanner stopped.");
    } else {
         if (scanBtn && !scanBtn.disabled) {
             scanBtn.textContent = 'مسح الباركود';
             scanBtn.classList.remove('cancel');
             scanBtn.disabled = (typeof jsQR === 'undefined');
         }
         scannerLaser?.classList.add(HIDDEN_CLASS);
    }
}
function tick() { /* ... (Keep the jsQR tick function from previous answer, it calls handleScanResult on success) ... */
    if (!scanning || !videoElement || !canvasElement || !stream || videoElement.paused || videoElement.ended || typeof jsQR === 'undefined') {
        return;
    }
    if (videoElement.readyState === videoElement.HAVE_ENOUGH_DATA && videoElement.videoWidth > 0) {
        const videoWidth = videoElement.videoWidth;
        const videoHeight = videoElement.videoHeight;
        canvasElement.width = videoWidth;
        canvasElement.height = videoHeight;
        try {
            const canvasContext = canvasElement.getContext('2d', { willReadFrequently: true });
            if (!canvasContext) { console.error("No 2D context"); stopScanner(); return; }
            canvasContext.drawImage(videoElement, 0, 0, videoWidth, videoHeight);
            const imageData = canvasContext.getImageData(0, 0, videoWidth, videoHeight);
            const code = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: "dontInvert" });
            if (code && code.data.trim() !== '') {
                const barcodeData = code.data.trim();
                console.log(">>> jsQR Found Barcode:", barcodeData);
                stopScanner(); // Stop first
                handleScanResult(barcodeData); // Then handle
                return; // Exit tick loop
            }
        } catch (error) {
            console.error("Error during scanning tick:", error);
            scanResult && (scanResult.textContent = "⚠️ خطأ معالجة الصورة.");
            stopScanner();
            return;
        }
    }
    requestAnimationFrame(tick); // Continue loop if no code found
}

// --- Visitor & Earning Logic ---
function handleScanResult(barcodeData) {
    scanResult && (scanResult.textContent = `🔍 تم العثور على: ${barcodeData}. جار التحقق...`);
    const existingVisitor = findVisitorById(barcodeData);

    if (existingVisitor) {
        scanResult && (scanResult.textContent = `✅ معروف: ${existingVisitor.name}.`);
        // Check visits BEFORE showing player choice
        if (existingVisitor.visits >= REWARD_THRESHOLD) {
            // Show reward modal
            setTimeout(() => showRewardModal(existingVisitor), 100);
        } else {
            // Show player choice modal
            setTimeout(() => showPlayerChoiceModal(existingVisitor), 100);
        }
    } else {
        scanResult && (scanResult.textContent = `🆕 باركود جديد (${barcodeData}).`);
        setTimeout(() => showDataEntryFormForScan(barcodeData), 100); // Go to add form
    }
}

function handlePlayerChoice(numberOfPlayers) {
     if (!activeVisitorForEarning || !EARNINGS_MAP[numberOfPlayers]) {
         console.error("Invalid state/player count for choice."); hidePlayerChoiceModal(); return;
     }

     const amount = EARNINGS_MAP[numberOfPlayers];
     addEarningEntry(activeVisitorForEarning.name, numberOfPlayers, amount); // Record the earning

     // --- Increment visit count AFTER recording earning ---
     activeVisitorForEarning.visits = (activeVisitorForEarning.visits || 0) + 1;
     addOrUpdateVisitor(activeVisitorForEarning); // Save updated visitor data (with new visit count)
     // ----------------------------------------------------

     console.log(`Added earning: ${activeVisitorForEarning.name}, Players: ${numberOfPlayers}, Amount: ${amount}. Visits now: ${activeVisitorForEarning.visits}`);
     scanResult && (scanResult.textContent = `💰 تم تسجيل ${formatCurrency(amount)} لـ ${activeVisitorForEarning.name}.`);
     hidePlayerChoiceModal();

     setTimeout(() => { // Clear message
         if (scanResult && scanResult.textContent.startsWith('💰')) { scanResult.textContent = 'الماسح جاهز.'; }
     }, 2500);
}

function handleRewardConfirmation() {
    if (!activeVisitorForEarning) {
        console.error("Cannot confirm reward, no active visitor stored.");
        hideRewardModal();
        return;
    }
    // Reset visits to 0 for the rewarded visitor
    activeVisitorForEarning.visits = 0;
    addOrUpdateVisitor(activeVisitorForEarning); // Save the reset visit count

    console.log(`Reward confirmed for ${activeVisitorForEarning.name}. Visits reset to 0.`);
    scanResult && (scanResult.textContent = `🎁 تمت مكافأة ${activeVisitorForEarning.name}!`);
    hideRewardModal(); // Close the modal

    setTimeout(() => { // Clear message
        if (scanResult && scanResult.textContent.startsWith('🎁')) { scanResult.textContent = 'الماسح جاهز.'; }
    }, 2500);
}


function handleFormSubmit(e) { /* ... (Keep function from previous answer, but initialize visits: 0) ... */
    e.preventDefault();
    const barcode = barcodeInput ? barcodeInput.value.trim() : '';
    const name = nameInput ? nameInput.value.trim() : '';
    const age = ageInput ? ageInput.value.trim() : '';
    const phone = phoneInput ? phoneInput.value.trim() : '';

    if (!name || !age || !phone) return alert('يرجى ملء الاسم والعمر والهاتف.');
    if (barcodeInput && !barcodeInput.disabled && !barcode) return alert('يرجى إدخال باركود.');
    if (!/^\d+$/.test(age) || parseInt(age) <= 0) return alert('عمر غير صالح.');
    if (!/^\d{10,}$/.test(phone)) return alert('رقم هاتف غير صالح.');

    const visitorId = barcodeInput && barcodeInput.disabled ? barcodeInput.value : barcode;

    if (barcodeInput && !barcodeInput.disabled && findVisitorById(visitorId)) {
        barcodeInput.focus();
        return alert(`خطأ: الباركود "${visitorId}" مسجل لزائر آخر.`);
    }

    const newVisitorData = { id: visitorId, name: name, age: age, phone: phone, visits: 0 }; // Initialize visits: 0
    addOrUpdateVisitor(newVisitorData);

    scanResult && (scanResult.textContent = `➕ تمت إضافة: ${name}.`);
    alert(`تم حفظ الزائر "${name}" بنجاح.`);
    hideDataEntryForm();
}


// --- Search Functionality ---
function handleSearch() { /* ... (Keep function from previous answer) ... */
    const searchTerm = searchInput ? searchInput.value.trim().toLowerCase() : '';
    resetSearchUI();
    searchResultsContainer?.classList.remove(HIDDEN_CLASS);
    searchFeedback && (searchFeedback.textContent = '⏳ بحث...');
    if (searchTerm === '') { searchFeedback && (searchFeedback.textContent = 'أدخل نص للبحث.'); return; }
    setTimeout(() => {
        const results = visitors.filter(v => v.name.toLowerCase().includes(searchTerm) || v.phone.includes(searchTerm) || (v.id && v.id.toLowerCase().includes(searchTerm)));
        searchFeedback && (searchFeedback.textContent = '');
        if (results.length > 0) { displaySearchResults(results); }
        else { resultsList && (resultsList.innerHTML = '<p style="text-align: center; color: #bdc3c7;">لا توجد نتائج.</p>'); }
    }, 100);
}
function displaySearchResults(results) { /* ... (Keep function from previous answer) ... */
   if (!resultsList || !selectedVisitorDetails) return;
    resultsList.innerHTML = '';
    selectedVisitorDetails.classList.add(HIDDEN_CLASS);
    if (results.length === 1) { displayVisitorDetails(results[0]); }
    else {
        resultsList.innerHTML = '<h4>نتائج متعددة (اختر):</h4>';
        results.forEach(visitor => {
            const div = document.createElement('div');
            // Show visits in list preview
            div.textContent = `الاسم: ${visitor.name} | هاتف: ${visitor.phone} | زيارات: ${visitor.visits || 0}`;
            div.dataset.visitorId = visitor.id;
            resultsList.appendChild(div);
        });
    }
}
function handleResultSelection(e) { /* ... (Keep function from previous answer) ... */
    if (e.target && e.target.tagName === 'DIV' && e.target.dataset.visitorId) {
        const visitorId = e.target.dataset.visitorId;
        const visitor = findVisitorById(visitorId);
        if (visitor) { displayVisitorDetails(visitor); }
    }
}
function displayVisitorDetails(visitor) { /* ... (Update to show visits and setup edit buttons) ... */
    if (!visitor || !visitorInfo || !selectedVisitorDetails || !resultsList || !visitorVisitsDisplay) return;

    selectedVisitorForEdit = visitor; // Store for editing/deleting

    visitorInfo.innerHTML = `
        <p><strong>الباركود:</strong> ${visitor.id || 'N/A'}</p>
        <p><strong>الاسم:</strong> ${visitor.name}</p>
        <p><strong>العمر:</strong> ${visitor.age}</p>
        <p><strong>الهاتف:</strong> ${visitor.phone}</p>
        <!-- Visits count is now displayed in the edit controls section -->
    `;
    visitorVisitsDisplay.textContent = visitor.visits || 0; // Display current visits

    selectedVisitorDetails.classList.remove(HIDDEN_CLASS);
    resultsList.innerHTML = '';
}

// --- Edit Visits Functions ---
function increaseVisits() {
    if (!selectedVisitorForEdit) return;
    selectedVisitorForEdit.visits = (selectedVisitorForEdit.visits || 0) + 1;
    updateVisitsUIAndSave();
}

function decreaseVisits() {
    if (!selectedVisitorForEdit) return;
    // Prevent going below zero
    selectedVisitorForEdit.visits = Math.max(0, (selectedVisitorForEdit.visits || 0) - 1);
    updateVisitsUIAndSave();
}

function updateVisitsUIAndSave() {
    if (!selectedVisitorForEdit || !visitorVisitsDisplay) return;
    // Update the UI immediately
    visitorVisitsDisplay.textContent = selectedVisitorForEdit.visits;
    // Save the change
    addOrUpdateVisitor(selectedVisitorForEdit);
    console.log(`Visits updated for ${selectedVisitorForEdit.name} to ${selectedVisitorForEdit.visits}`);
}


function handleDeleteVisitor() { /* ... (Keep function from previous answer) ... */
    if (!selectedVisitorForEdit) return alert('خطأ: لا يوجد زائر محدد للحذف.');
    const visitorName = selectedVisitorForEdit.name;
    const visitorId = selectedVisitorForEdit.id;
    if (confirm(`هل أنت متأكد من حذف الزائر "${visitorName}" (باركود: ${visitorId})؟`)) {
        const index = visitors.findIndex(v => v.id === visitorId);
        if (index !== -1) {
            visitors.splice(index, 1);
            saveVisitorData();
            alert(`تم حذف "${visitorName}".`);
            hideSearchPage();
        } else { console.error("Visitor to delete not found, ID:", visitorId); alert('خطأ: لم يتم العثور على الزائر.'); resetSearchUI(); }
    }
}

// --- Utility: Find Visitor ---
function findVisitorById(id) { /* ... (Keep function from previous answer) ... */
     if (!id) return null;
     return visitors.find(visitor => visitor.id === id);
}

// --- Utility: Add/Update Visitor ---
function addOrUpdateVisitor(visitorData) { /* ... (Update to handle 'visits' property) ... */
    const dataToSave = {
         ...visitorData,
         visits: visitorData.visits || 0 // Ensure visits is a number, default 0
     };
    const index = visitors.findIndex(v => v.id === dataToSave.id);
    if (index !== -1) {
        visitors[index] = dataToSave;
        console.log(`Visitor updated: ${dataToSave.id}`);
    } else {
        visitors.push(dataToSave);
        console.log(`Visitor added: ${dataToSave.id}`);
    }
    saveVisitorData(); // Save visitor list after change
}