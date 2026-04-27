const genres = [
  { id: "classical", label: "Classical", enabled: true },
  { id: "rock", label: "Rock", enabled: false },
  { id: "pop", label: "Pop", enabled: false },
  { id: "hiphop", label: "Hip-hop", enabled: false },
  { id: "electronic", label: "Electronic", enabled: false },
  { id: "jazz", label: "Jazz", enabled: false },
  { id: "country", label: "Country", enabled: false },
  { id: "film", label: "Film and TV", enabled: false }
];

const fallbackTracks = [
  track("classical_beethoven_symphony_5_mvt_1", "Beethoven - Symphony No. 5, I. Allegro con brio", "opening motif"),
  track("classical_beethoven_fur_elise", "Beethoven - Fur Elise", "opening theme"),
  track("classical_vivaldi_four_seasons_spring_mvt_1", "Vivaldi - The Four Seasons: Spring, I. Allegro", "opening ritornello"),
  track("classical_mozart_eine_kleine_nachtmusik_mvt_1", "Mozart - Eine kleine Nachtmusik, I. Allegro", "opening theme"),
  track("classical_bach_toccata_and_fugue_d_minor", "Bach - Toccata and Fugue in D minor", "opening organ flourish"),
  track("classical_tchaikovsky_1812_overture", "Tchaikovsky - 1812 Overture", "recognizable finale material"),
  track("classical_handel_messiah_hallelujah", "Handel - Messiah: Hallelujah Chorus", "choral hallelujah entrance"),
  track("classical_rossini_william_tell_overture_finale", "Rossini - William Tell Overture: Finale", "galloping finale theme"),
  track("classical_strauss_blue_danube", "Strauss II - The Blue Danube", "main waltz theme"),
  track("classical_bizet_carmen_habanera", "Bizet - Carmen: Habanera", "main habanera melody"),
  track("classical_grieg_in_the_hall_of_the_mountain_king", "Grieg - In the Hall of the Mountain King", "main repeated theme"),
  track("classical_pachelbel_canon_d", "Pachelbel - Canon in D", "main canon progression")
];

const state = {
  selectedGenre: "classical",
  difficulty: "easy",
  tracks: [],
  currentTrack: null,
  choices: [],
  chunkIndex: 0,
  wrongChoiceIds: new Set(),
  score: 0,
  streak: 0,
  rounds: 0,
  replayCount: 0,
  answered: false,
  history: []
};

const els = {
  genreGrid: document.querySelector("#genre-grid"),
  startRound: document.querySelector("#start-round"),
  score: document.querySelector("#score"),
  streak: document.querySelector("#streak"),
  roundCount: document.querySelector("#round-count"),
  roundTitle: document.querySelector("#round-title"),
  difficultyLabel: document.querySelector("#difficulty-label"),
  choiceCount: document.querySelector("#choice-count"),
  wrongCount: document.querySelector("#wrong-count"),
  chunkLabel: document.querySelector("#chunk-label"),
  chunkStatus: document.querySelector("#chunk-status"),
  replayChunk: document.querySelector("#replay-chunk"),
  revealTrack: document.querySelector("#reveal-track"),
  answerGrid: document.querySelector("#answer-grid"),
  skipRound: document.querySelector("#skip-round"),
  nextRound: document.querySelector("#next-round"),
  sessionSummary: document.querySelector("#session-summary"),
  historyList: document.querySelector("#history-list")
};

function track(id, title, firstHint) {
  return {
    id,
    display_title: title,
    genre: "classical",
    difficulty: "easy",
    audio_source_status: "needs_approved_preview",
    chunk_plan: [
      { order: 1, duration_seconds: 10, hint: firstHint },
      { order: 2, duration_seconds: 10, hint: "second 10-second section" },
      { order: 3, duration_seconds: 10, hint: "third 10-second section" }
    ]
  };
}

async function loadTracks() {
  try {
    const response = await fetch("seeds/classical_easy_tracks.json", { cache: "no-store" });
    if (!response.ok) throw new Error(`Seed request failed: ${response.status}`);
    const data = await response.json();
    state.tracks = data.tracks;
  } catch (error) {
    state.tracks = fallbackTracks;
  }
}

function renderGenres() {
  els.genreGrid.innerHTML = "";
  genres.forEach((genre) => {
    const button = document.createElement("button");
    button.className = `chip${genre.id === state.selectedGenre ? " active" : ""}`;
    button.type = "button";
    button.textContent = genre.label;
    button.disabled = !genre.enabled;
    button.addEventListener("click", () => {
      state.selectedGenre = genre.id;
      renderGenres();
    });
    els.genreGrid.appendChild(button);
  });
}

function startRound() {
  const pool = state.tracks.filter((item) => {
    return item.genre === state.selectedGenre && item.difficulty === state.difficulty;
  });
  if (pool.length < 8) {
    setRoundMessage("Need at least eight seeded tracks for this mode.", "Add more seed tracks before playing.");
    return;
  }

  state.currentTrack = sample(pool);
  state.choices = buildChoices(pool, state.currentTrack);
  state.chunkIndex = 0;
  state.wrongChoiceIds = new Set();
  state.replayCount = 0;
  state.answered = false;
  els.skipRound.disabled = false;
  els.nextRound.disabled = true;
  els.replayChunk.disabled = false;
  renderRound();
}

function buildChoices(pool, correctTrack) {
  const distractors = shuffle(pool.filter((item) => item.id !== correctTrack.id)).slice(0, 7);
  return shuffle([correctTrack, ...distractors]);
}

function renderRound() {
  const chunk = getCurrentChunk();
  els.roundTitle.textContent = state.currentTrack ? "Name this track" : "Ready";
  els.difficultyLabel.textContent = capitalize(state.difficulty);
  els.choiceCount.textContent = `${state.choices.length || 8} choices`;
  els.wrongCount.textContent = `${state.wrongChoiceIds.size} wrong`;
  els.chunkLabel.textContent = `Chunk ${state.chunkIndex + 1} of ${getChunkCount()}: ${chunk?.duration_seconds || 10} seconds`;
  els.chunkStatus.textContent = getChunkStatusText(chunk);
  renderRevealTrack();
  renderAnswers();
  renderScore();
}

function renderRevealTrack() {
  els.revealTrack.innerHTML = "";
  const count = getChunkCount();
  for (let index = 0; index < count; index += 1) {
    const step = document.createElement("span");
    step.className = "reveal-step";
    if (index < state.chunkIndex) step.classList.add("used");
    if (index === state.chunkIndex) step.classList.add("active");
    step.textContent = `Chunk ${index + 1}`;
    els.revealTrack.appendChild(step);
  }
}

function renderAnswers() {
  els.answerGrid.innerHTML = "";
  state.choices.forEach((choice) => {
    const button = document.createElement("button");
    button.className = "answer";
    button.type = "button";
    button.textContent = choice.display_title;
    button.disabled = state.answered || state.wrongChoiceIds.has(choice.id);
    if (state.wrongChoiceIds.has(choice.id)) {
      button.classList.add("incorrect");
    }
    button.addEventListener("click", () => answer(choice, button));
    els.answerGrid.appendChild(button);
  });
}

function answer(choice, button) {
  if (!state.currentTrack || state.answered) return;
  const correct = choice.id === state.currentTrack.id;
  button.classList.add(correct ? "correct" : "incorrect");

  if (correct) {
    state.answered = true;
    state.rounds += 1;
    state.streak += 1;
    state.score += scoreForCurrentState();
    els.nextRound.disabled = false;
    els.skipRound.disabled = true;
    els.replayChunk.disabled = true;
    disableAnswers();
    markCorrectAnswer();
    pushHistory("correct", choice.display_title);
    renderScore();
    return;
  }

  state.streak = 0;
  state.wrongChoiceIds.add(choice.id);

  if (state.wrongChoiceIds.size >= 7) {
    state.answered = true;
    state.rounds += 1;
    els.nextRound.disabled = false;
    els.skipRound.disabled = true;
    els.replayChunk.disabled = true;
    disableAnswers();
    markCorrectAnswer();
    pushHistory("revealed", "Last remaining answer");
    renderScore();
    return;
  }

  if (state.chunkIndex < getChunkCount() - 1) {
    state.chunkIndex += 1;
  }
  window.setTimeout(renderRound, 400);
}

function skipRound() {
  if (!state.currentTrack) return;
  state.answered = true;
  state.rounds += 1;
  state.streak = 0;
  els.nextRound.disabled = false;
  els.skipRound.disabled = true;
  els.replayChunk.disabled = true;
  disableAnswers();
  markCorrectAnswer();
  pushHistory("skipped", "Skipped");
  renderScore();
}

function replayChunk() {
  if (!state.currentTrack) return;
  state.replayCount += 1;
  const chunk = getCurrentChunk();
  els.chunkStatus.textContent = `Replay ${state.replayCount}. Preview audio is pending; test cue: ${chunk?.hint || "chunk metadata"}.`;
}

function disableAnswers() {
  document.querySelectorAll(".answer").forEach((button) => {
    button.disabled = true;
  });
}

function markCorrectAnswer() {
  document.querySelectorAll(".answer").forEach((button) => {
    if (button.textContent === state.currentTrack.display_title) {
      button.classList.add("correct");
    }
  });
}

function pushHistory(result, selectedTitle) {
  const points = result === "correct" ? scoreForCurrentState() : 0;
  state.history.unshift({
    result,
    selectedTitle,
    correctTitle: state.currentTrack.display_title,
    chunk: state.chunkIndex + 1,
    wrongGuesses: state.wrongChoiceIds.size,
    points
  });
  renderHistory();
}

function renderHistory() {
  const correctCount = state.history.filter((item) => item.result === "correct").length;
  els.sessionSummary.textContent = `${correctCount} correct across ${state.history.length} completed rounds.`;
  els.historyList.innerHTML = "";
  state.history.slice(0, 8).forEach((item) => {
    const li = document.createElement("li");
    li.textContent = `${capitalize(item.result)} on chunk ${item.chunk} after ${item.wrongGuesses} wrong: ${item.correctTitle} (${item.points} pts)`;
    els.historyList.appendChild(li);
  });
}

function renderScore() {
  els.score.textContent = state.score;
  els.streak.textContent = state.streak;
  els.roundCount.textContent = state.rounds;
}

function setRoundMessage(title, status) {
  els.roundTitle.textContent = title;
  els.chunkLabel.textContent = "No round available";
  els.chunkStatus.textContent = status;
}

function getCurrentChunk() {
  return state.currentTrack?.chunk_plan?.[state.chunkIndex];
}

function getChunkCount() {
  return state.currentTrack?.chunk_plan?.length || 3;
}

function getChunkStatusText(chunk) {
  if (!state.currentTrack) return "Choose Classical and start a round.";
  const sourcePending = state.currentTrack.audio_source_status === "needs_approved_preview";
  if (sourcePending) {
    return `Preview audio pending. Test cue for now: ${chunk?.hint || "chunk metadata"}.`;
  }
  return "Playing approved preview audio.";
}

function scoreForCurrentState() {
  const chunkPenalty = state.chunkIndex * 15;
  const wrongPenalty = state.wrongChoiceIds.size * 10;
  return Math.max(0, 100 - chunkPenalty - wrongPenalty);
}

function sample(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function shuffle(items) {
  return [...items].sort(() => Math.random() - 0.5);
}

function capitalize(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function bindEvents() {
  els.startRound.addEventListener("click", startRound);
  els.nextRound.addEventListener("click", startRound);
  els.skipRound.addEventListener("click", skipRound);
  els.replayChunk.addEventListener("click", replayChunk);
}

async function init() {
  renderGenres();
  bindEvents();
  await loadTracks();
  renderScore();
}

init();
