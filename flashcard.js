// flashcard.js

// storage key & load
const CHECKED_STORAGE_KEY = 'checkedFlashcards';
let checkedWords = JSON.parse(localStorage.getItem(CHECKED_STORAGE_KEY)) || [];

// Path to your CSV file (must be in the same folder)
const CSV_PATH = 'kurs-sentences.csv';

// State
let flashcards = [];
let currentIndex = 0;
let flipped = false;
const scheduled = [];

// DOM elements
const flashcard = document.getElementById('flashcard');
const front = document.getElementById('front');
const back = document.getElementById('back');
const flipBtn = document.getElementById('flip-btn');
const crossBtn = document.getElementById('cross-btn');
const checkBtn = document.getElementById('check-btn');
const notification = document.getElementById('notification');
const checkedCountEl = document.getElementById('checked-count');

// helper: update the on‑page counter
function updateCheckedCountDisplay() {
    checkedCountEl.textContent = checkedWords.length;
}

// parse CSV and schedule any due cards
document.addEventListener('DOMContentLoaded', () => {
    Papa.parse(CSV_PATH, {
        download: true,
        header: true,
        skipEmptyLines: true,
        complete: ({ data }) => {
            flashcards = data.map(row => ({
                word: row.word || '',
                article: row.article || '',
                plural: row.plural || '',
                translation: row.translation || '',
                example1: row['example sentence normal'] || '',
                example2: row['example sentence plural'] || ''
            }));

            // on load, re‑queue any cards whose 3h timer has expired
            const now = Date.now();
            checkedWords.forEach(entry => {
                if (now - entry.timestamp >= 3 * 60 * 60 * 1000) {
                    const idx = flashcards.findIndex(c => c.word === entry.word);
                    if (idx !== -1) scheduled.push(idx);
                }
            });

            // show first card & update counter
            updateFlashcard();
            updateCheckedCountDisplay();
        }
    });
});

// render current flashcard
function updateFlashcard() {
    const card = flashcards[currentIndex];
    front.innerHTML = `<strong>${card.translation}</strong>`;
    back.innerHTML = `
    <div style="text-align:center; max-height:260px; overflow-y:auto;">
      <strong>${card.article} ${card.word}</strong>
      <hr style="margin:8px 0;">
      ${card.example1 ? `<p>${card.example1}</p>` : ''}
      ${card.example2 ? `<p>${card.example2}</p>` : ''}
    </div>
  `;
}

// toast helper
function showNotification(msg) {
    notification.innerText = msg;
    notification.style.display = 'block';
    setTimeout(() => {
        notification.style.display = 'none';
    }, 2000);
}

// advance card
function advanceCard() {
    if (scheduled.length) {
        currentIndex = scheduled.shift();
    } else {
        currentIndex = Math.floor(Math.random() * flashcards.length);
    }
    flipped = false;
    flashcard.style.transform = 'rotateY(0deg)';
    updateFlashcard();
}

// schedule reappearance
function scheduleReappearance(delay, label) {
    showNotification(`Card will reappear in ${label}.`);
    const idx = currentIndex;
    setTimeout(() => scheduled.push(idx), delay);
    advanceCard();
}

// flip
flipBtn.addEventListener('click', () => {
    if (!flashcards.length) return;
    flashcard.style.transform = flipped
        ? 'rotateY(0deg)'
        : 'rotateY(180deg)';
    flipped = !flipped;
});

// ❌ cross: 60 s
crossBtn.addEventListener('click', () => {
    if (!flashcards.length) return;
    scheduleReappearance(60 * 1000, '60 seconds');
});

// ✔️ check: 3 h + persist + update counter
checkBtn.addEventListener('click', () => {
    if (!flashcards.length) return;
    const card = flashcards[currentIndex];
    const now = Date.now();

    // dedupe & add
    checkedWords = checkedWords.filter(e => e.word !== card.word);
    checkedWords.push({ ...card, timestamp: now });
    checkedWords.sort((a, b) => b.timestamp - a.timestamp);

    // persist & update UI
    localStorage.setItem(CHECKED_STORAGE_KEY, JSON.stringify(checkedWords));
    updateCheckedCountDisplay();

    // schedule re‑show in 3 h
    scheduleReappearance(3 * 60 * 60 * 1000, '3 hours');
});
