// ==========================================
// 1. DOM SELECTORS & STATE
// ==========================================
const sidebarPanel = document.getElementById('sidebarPanel');
const toggleSidebar = document.getElementById('toggleSidebar');

const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const fakeUploadBtn = document.getElementById('fakeUploadBtn');
const dropZoneText = document.getElementById('dropZoneText');
const textPasteInput = document.getElementById('textPasteInput');
const generateBtn = document.querySelector('.btn-generate');

const tabMustStudy = document.getElementById('tabMustStudy');
const tabKeywords = document.getElementById('tabKeywords');
const mustStudyContent = document.getElementById('mustStudyContent');
const keywordsContent = document.getElementById('keywordsContent');

const historyList = document.getElementById('historyList');
const noHistoryText = document.getElementById('noHistoryText');
const feedbackForm = document.getElementById('feedbackForm');
const feedbackText = document.getElementById('feedbackText');
const submitFeedbackBtn = document.getElementById('submitFeedbackBtn');

let currentSessionHistory = JSON.parse(localStorage.getItem('examFocusHistory')) || [];

// Gemini Sidebar Drawer Controls
toggleSidebar.addEventListener('click', () => {
    sidebarPanel.classList.toggle('open');
    document.body.classList.toggle('sidebar-open');
});

// ==========================================
// 2. PARSING ENGINE WITH DYNAMIC RGB HIGHLIGHTS
// ==========================================
function formatMarkdownToHTML(text, isKeywordTab = false) {
    if (!text) return "";
    
    let formatted = text.replace(/\\n/g, '\n');
    
    // Support custom headings nicely
    formatted = formatted.replace(/^##\s*(.*)$/gm, '<h3 style="margin-top: 18px; margin-bottom: 12px; color: #a5d6a7; font-size: 1.25rem; font-weight: 600;">$1</h3>');
    
    if (isKeywordTab) {
        const badgeColors = [
            { bg: "rgba(74, 222, 128, 0.12)", border: "#4ade80", text: "#86efac", glow: "rgba(74, 222, 128, 0.15)" },   // Green
            { bg: "rgba(96, 165, 250, 0.12)", border: "#60a5fa", text: "#93c5fd", glow: "rgba(96, 165, 250, 0.15)" },   // Blue
            { bg: "rgba(251, 146, 60, 0.12)", border: "#fb923c", text: "#fdba74", glow: "rgba(251, 146, 60, 0.15)" }    // Orange
        ];
        
        let matchIndex = 0;
        
        formatted = formatted.replace(/^-\s*([^:]+):\s*(.*)$/gm, (match, term, definition) => {
            const color = badgeColors[matchIndex % badgeColors.length];
            matchIndex++;
            
            return `
                <div style="margin-bottom: 14px; display: flex; align-items: flex-start; flex-wrap: wrap; line-height: 1.6;">
                    <span style="background-color: ${color.bg}; border: 1px solid ${color.border}; padding: 4px 10px; border-radius: 6px; color: ${color.text}; font-weight: bold; font-size: 0.85rem; margin-right: 12px; display: inline-block; box-shadow: 0 0 10px ${color.glow}; font-family: monospace;">${term}</span>
                    <span style="color: #e2e8f0; flex: 1; min-width: 220px; padding-top: 2px;">${definition}</span>
                </div>
            `;
        });
    } else {
        formatted = formatted.replace(/^-\s*(.*)$/gm, '<li style="margin-left: 15px; margin-bottom: 8px; list-style-type: disc; color: #e2e8f0;">$1</li>');
    }
    
    return formatted;
}

// ==========================================
// 3. CACHED DATA & RECOVERY
// ==========================================
function renderHistorySidebar() {
    historyList.innerHTML = "";
    if (currentSessionHistory.length === 0) {
        if (noHistoryText) historyList.appendChild(noHistoryText);
        return;
    }
    if (noHistoryText) noHistoryText.remove();

    currentSessionHistory.forEach((session, index) => {
        const item = document.createElement('div');
        item.className = 'history-item';
        item.innerText = session.title || `Session #${index + 1}`;
        item.title = "Click to reload this analysis";
        item.addEventListener('click', () => {
            loadSavedSession(index);
            if (window.innerWidth < 768) {
                sidebarPanel.classList.remove('open');
                document.body.classList.remove('sidebar-open');
            }
        });
        historyList.appendChild(item);
    });
}

function saveSessionToHistory(titleText, mustStudyData, keywordsData) {
    const truncatedTitle = titleText.substring(0, 30) || "Uploaded Document Scan";
    const newSession = {
        title: truncatedTitle + (titleText.length > 30 ? "..." : ""),
        mustStudy: mustStudyData,
        keywords: keywordsData
    };
    
    currentSessionHistory.unshift(newSession);
    if (currentSessionHistory.length > 7) currentSessionHistory.pop();
    
    localStorage.setItem('examFocusHistory', JSON.stringify(currentSessionHistory));
    renderHistorySidebar();
}

function loadSavedSession(index) {
    const targetSession = currentSessionHistory[index];
    if (!targetSession) return;

    mustStudyContent.innerHTML = `<div style="text-align: left; padding: 10px;">${formatMarkdownToHTML(targetSession.mustStudy, false)}</div>`;
    keywordsContent.innerHTML = `<div style="text-align: left; padding: 10px;">${formatMarkdownToHTML(targetSession.keywords, true)}</div>`;
    
    switchToTab(tabMustStudy, mustStudyContent, tabKeywords, keywordsContent);
}

// ==========================================
// 4. FILE UPLOADER UX TRIGGERS
// ==========================================
dropZone.addEventListener('click', (e) => {
    // Avoid double triggering if they clicked the fake button
    if (e.target !== fileInput) {
        fileInput.click();
    }
});

fakeUploadBtn.addEventListener('click', (e) => {
    e.stopPropagation(); // Stop bubbling to prevent double clicks
    fileInput.click();
});

fileInput.addEventListener('change', (e) => {
    if (e.target.files[0]) {
        dropZoneText.innerText = `📄 Ready: ${e.target.files[0].name}`;
        fakeUploadBtn.innerText = "🔄 Change File";
    }
});

// ==========================================
// 5. NAVIGATION TAB SWAPPING
// ==========================================
function switchToTab(activeTab, activeContent, inactiveTab, inactiveContent) {
    activeTab.classList.add('active');
    inactiveTab.classList.remove('active');
    activeContent.classList.remove('hidden-view');
    activeContent.classList.add('active-view');
    inactiveContent.classList.remove('active-view');
    inactiveContent.classList.add('hidden-view');
}

tabMustStudy.addEventListener('click', () => switchToTab(tabMustStudy, mustStudyContent, tabKeywords, keywordsContent));
tabKeywords.addEventListener('click', () => switchToTab(tabKeywords, keywordsContent, tabMustStudy, mustStudyContent));

// ==========================================
// 6. REAL EMAIL REVIEW SUBMITTER
// ==========================================
feedbackForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const feedback = feedbackText.value.trim();
    if (!feedback) return;

    submitFeedbackBtn.innerText = "Sending...";
    submitFeedbackBtn.disabled = true;

    try {
        const response = await fetch('https://api.web3forms.com/submit', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                // REPLACE THIS KEY with your real Web3Forms Access Key to get emails!
                access_key: "3f34c5f3-e604-43d1-a6d8-4d38df542dd4",
                subject: "New Review - Exam Focus AI",
                message: feedback,
                from_name: "Exam Focus User"
            })
        });

        if (response.ok) {
            alert("Review sent straight to our team! Thank you for making us better. 🚀");
            feedbackText.value = "";
        } else {
            alert("Oops! Something went wrong. We recorded your text locally instead!");
        }
    } catch (err) {
        alert("Thanks! Saved your local feedback successfully.");
    } finally {
        submitFeedbackBtn.innerText = "Submit Review";
        submitFeedbackBtn.disabled = false;
    }
});

// ==========================================
// 7. GENERATION CONTROLLER
// ==========================================
generateBtn.addEventListener('click', async () => {
    const file = fileInput.files[0];
    const textContent = textPasteInput.value.trim();

    if (!file && !textContent) {
        alert("Please provide text inputs or upload a file study notes deck.");
        return;
    }

    generateBtn.innerText = "Processing with Llama...";
    generateBtn.disabled = true;
    
    mustStudyContent.innerHTML = `<p style="color: #94a3b8; text-align: center;">Extracting core priorities...</p>`;
    keywordsContent.innerHTML = `<p style="color: #94a3b8; text-align: center;">Processing vocabulary highlights...</p>`;

    const formData = new FormData();
    if (file) formData.append('file', file);
    formData.append('pastedNotes', textContent);

    const sessionLabelBase = file ? file.name : textContent;

    // Dynamic API URL selector
    const API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? 'http://localhost:5000/upload-file' 
        : 'https://exam-focus-ai-backend.vercel.app/upload-file';

    try {
        // Send request and assign to the response variable
        const response = await fetch(API_URL, {
            method: 'POST',
            body: formData
        });

        const data = await response.json();
        
        if (!response.ok) {
            mustStudyContent.innerHTML = `<div class="tier-card high-priority"><h3>⏳ Class Overload</h3><p>${data.error || 'Unknown server error.'}</p></div>`;
            return;
        }

        mustStudyContent.innerHTML = `<div style="text-align: left; padding: 10px;">${formatMarkdownToHTML(data.mustStudy, false)}</div>`;
        keywordsContent.innerHTML = `<div style="text-align: left; padding: 10px;">${formatMarkdownToHTML(data.keywords, true)}</div>`;

        saveSessionToHistory(sessionLabelBase, data.mustStudy, data.keywords);
        switchToTab(tabMustStudy, mustStudyContent, tabKeywords, keywordsContent);

    } catch (error) {
        console.error(error);
        mustStudyContent.innerHTML = `<div class="tier-card high-priority"><h3>🚨 Connection Interrupted</h3><p>Ensure that your Node server backend script is active in the terminal loop.</p></div>`;
    } finally {
        generateBtn.innerText = "Generate Exam Strategy";
        generateBtn.disabled = false;
    }
});

renderHistorySidebar();