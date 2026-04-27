const correctTrackId = "vivaldi_summer";
const maxPoints = 100;

const choices = [
  { letter: "A", id: "beethoven_5", label: "Beethoven - Symphony No. 5 - I. Allegro con brio" },
  { letter: "B", id: "vivaldi_summer", label: "Vivaldi - The Four Seasons - Summer" },
  { letter: "C", id: "mozart_nachtmusik", label: "Mozart - Eine kleine Nachtmusik - I. Allegro" },
  { letter: "D", id: "bach_toccata", label: "Bach - Toccata and Fugue in D minor" },
  { letter: "E", id: "brubeck_take_five", label: "Dave Brubeck Quartet - Time Out - Take Five" },
  { letter: "F", id: "miles_so_what", label: "Miles Davis - Kind of Blue - So What" },
  { letter: "G", id: "ellington_a_train", label: "Duke Ellington - Take the A Train" },
  { letter: "H", id: "coltrane_giant_steps", label: "John Coltrane - Giant Steps - Giant Steps" }
];

const chunk = {
  sourceName: "SoundCloud",
  sourceUrl: "https://soundcloud.com/portlandchambermusicfest/vivaldi-four-seasons-summer",
  startSeconds: 64,
  durationSeconds: 10
};

const state = {
  started: false,
  answered: false,
  wrongGuesses: 0,
  points: 0
};

const els = {
  startGame: document.querySelector("#start-game"),
  trackStatus: document.querySelector("#track-status"),
  chunkStatus: document.querySelector("#chunk-status"),
  answerGrid: document.querySelector("#answer-grid"),
  pointsEarned: document.querySelector("#points-earned"),
  resultMessage: document.querySelector("#result-message")
};

function startGame() {
  state.started = true;
  state.answered = false;
  state.wrongGuesses = 0;
  state.points = 0;

  els.trackStatus.textContent = "Vivaldi - The Four Seasons - Summer";
  els.chunkStatus.textContent = `Loaded and played ${formatWindow(chunk.startSeconds, chunk.startSeconds + chunk.durationSeconds)} from ${chunk.sourceName}.`;
  els.pointsEarned.textContent = "0";
  els.resultMessage.textContent = "No answer yet.";
  renderChoices();
}

function answer(choice) {
  if (!state.started || state.answered) return;

  if (choice.id === correctTrackId) {
    state.answered = true;
    state.points = Math.max(0, maxPoints - state.wrongGuesses * 15);
    els.pointsEarned.textContent = String(state.points);
    els.resultMessage.textContent = `Correct: ${choice.label}.`;
    renderChoices();
    return;
  }

  state.wrongGuesses += 1;
  els.resultMessage.textContent = `${choice.letter} is not correct. Try again.`;
  renderChoices(choice.id);
}

function renderChoices(lastWrongId) {
  els.answerGrid.innerHTML = "";
  choices.forEach((choice) => {
    const button = document.createElement("button");
    button.className = "answer";
    button.type = "button";
    button.disabled = !state.started || state.answered;
    if (choice.id === lastWrongId) button.classList.add("incorrect");
    if (state.answered && choice.id === correctTrackId) button.classList.add("correct");
    button.innerHTML = `<strong>${choice.letter}</strong><span>${choice.label}</span>`;
    button.addEventListener("click", () => answer(choice));
    els.answerGrid.appendChild(button);
  });
}

function formatWindow(startSeconds, endSeconds) {
  return `${formatTime(startSeconds)}-${formatTime(endSeconds)}`;
}

function formatTime(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
}

els.startGame.addEventListener("click", startGame);
renderChoices();
