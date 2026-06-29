const Game = {
  // State
  state: 'idle', // idle, playing, paused, round_summary, finished
  settings: {
    teams: ['Команда 1', 'Команда 2'],
    rounds: 3,
    duration: 60,
    pointsCorrect: 1,
    pointsSkip: 0,
    difficulty: 'all',
    categories: []
  },
  
  // Current game state
  currentRound: 1,
  currentTeamIndex: 0,
  currentWordIndex: 0,
  wordQueue: [],
  roundWords: [], // {word, result: 'correct'|'skipped'|'unplayed'}
  teamScores: [], // array of scores per team
  teamRoundScores: [], // array of per-round scores per team
  
  timer: null,
  timeRemaining: 0,
  
  // Stats
  stats: {
    gamesPlayed: 0,
    totalCorrect: 0,
    totalSkipped: 0,
    bestStreak: 0,
    currentStreak: 0
  },

  init() {
    // Load stats from localStorage
    const saved = localStorage.getItem('aliasStats');
    if (saved) {
      try {
        Object.assign(this.stats, JSON.parse(saved));
      } catch(e) {}
    }
  },

  saveStats() {
    localStorage.setItem('aliasStats', JSON.stringify(this.stats));
  },

  setup(settings) {
    Object.assign(this.settings, settings);
    this.teamScores = this.settings.teams.map(() => 0);
    this.teamRoundScores = this.settings.teams.map(() => 0);
    this.currentRound = 1;
    this.currentTeamIndex = 0;
    this.state = 'idle';
  },

  async prepareRound() {
    this.wordQueue = Database.getShuffledQueue(
      Number.MAX_SAFE_INTEGER,
      this.settings.categories,
      this.settings.difficulty
    );
    
    if (this.wordQueue.length === 0) {
      App.showToast(I18n.t('no_words_available') || 'Немає слів для обраних категорій');
      return false;
    }
    
    this.currentWordIndex = 0;
    this.roundWords = this.wordQueue.map(w => ({
      word: w,
      result: 'unplayed'
    }));
    this.teamRoundScores = this.settings.teams.map(() => 0);
    return true;
  },

  _startTimer() {
    this._updateTimerDisplay();
    this.timer = setInterval(() => {
      this.timeRemaining--;
      this._updateTimerDisplay();
      if (this.timeRemaining <= 0) {
        this._timeUp();
      }
    }, 1000);
  },

  _updateTimerDisplay() {
    const el = document.getElementById('timer-text');
    const progress = document.getElementById('timer-progress');
    if (el) el.textContent = this.timeRemaining;
    if (progress) {
      const total = this.settings.duration;
      const pct = (this.timeRemaining / total) * 314;
      progress.style.strokeDashoffset = 314 - pct;
    }
    // Update timer color
    if (this.timeRemaining <= 10) {
      if (el) el.style.color = 'var(--danger)';
    } else {
      if (el) el.style.color = '';
    }
  },

  _timeUp() {
    this._stopTimer();
    this.state = 'round_summary';
    UI.playSound('timeout');
    App.showScreen('round-summary');
    this._showRoundSummary();
  },

  _stopTimer() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  },

  _showWord() {
    if (this.currentWordIndex >= this.wordQueue.length) {
      this._timeUp();
      return;
    }
    const wordData = this.wordQueue[this.currentWordIndex];
    const el = document.getElementById('card-word');
    const card = document.getElementById('word-card');
    if (el) el.textContent = wordData.word;
    if (card) {
      card.className = 'word-card';
      // Trigger reflow for animation
      void card.offsetWidth;
      card.classList.add('show');
    }
    this._updateScoreDisplay();
  },

  correct() {
    if (this.state !== 'playing') return;
    if (this.currentWordIndex >= this.wordQueue.length) return;
    
    this.roundWords[this.currentWordIndex].result = 'correct';
    this.teamScores[this.currentTeamIndex] += this.settings.pointsCorrect;
    this.teamRoundScores[this.currentTeamIndex] += this.settings.pointsCorrect;
    this.stats.totalCorrect++;
    this.stats.currentStreak++;
    if (this.stats.currentStreak > this.stats.bestStreak) {
      this.stats.bestStreak = this.stats.currentStreak;
    }
    this.saveStats();
    
    // Visual feedback
    const card = document.getElementById('word-card');
    if (card) {
      card.classList.add('correct-flash');
      setTimeout(() => card.classList.remove('correct-flash'), 300);
    }
    
    // Sound & haptic feedback
    UI.playSound('correct');
    if (App.settings.vibration) {
      navigator.vibrate && navigator.vibrate(15);
    }
    
    this.currentWordIndex++;
    this._showWord();
  },

  skip() {
    if (this.state !== 'playing') return;
    if (this.currentWordIndex >= this.wordQueue.length) return;
    
    this.roundWords[this.currentWordIndex].result = 'skipped';
    this.teamScores[this.currentTeamIndex] += this.settings.pointsSkip;
    this.teamRoundScores[this.currentTeamIndex] += this.settings.pointsSkip;
    this.stats.totalSkipped++;
    this.stats.currentStreak = 0;
    this.saveStats();
    
    // Visual feedback
    const card = document.getElementById('word-card');
    if (card) {
      card.classList.add('skip-flash');
      setTimeout(() => card.classList.remove('skip-flash'), 300);
    }
    
    UI.playSound('skip');
    if (App.settings.vibration) {
      navigator.vibrate && navigator.vibrate(10);
    }
    
    this.currentWordIndex++;
    this._showWord();
  },

  _updateScoreDisplay() {
    const correctEl = document.getElementById('game-correct-count');
    const skippedEl = document.getElementById('game-skipped-count');
    const roundEl = document.getElementById('game-round');
    const roundsTotalEl = document.getElementById('game-rounds-total');
    const teamEl = document.getElementById('game-team-name');
    
    if (correctEl) correctEl.textContent = this.teamScores[this.currentTeamIndex];
    const played = this.roundWords.filter(w => w.result !== 'unplayed');
    if (skippedEl) skippedEl.textContent = played.length > 0
      ? played.filter(w => w.result === 'skipped').length
      : 0;
    if (roundEl) roundEl.textContent = this.currentRound;
    if (roundsTotalEl) roundsTotalEl.textContent = this.settings.rounds;
    if (teamEl) teamEl.textContent = this.settings.teams[this.currentTeamIndex];
  },

  _showRoundSummary() {
    const correctCount = this.teamRoundScores[this.currentTeamIndex];
    const skippedCount = this.roundWords.filter(w => w.result === 'skipped').length;
    const totalPlayed = this.roundWords.filter(w => w.result !== 'unplayed').length;
    
    document.getElementById('summary-correct').textContent = correctCount;
    document.getElementById('summary-skipped').textContent = skippedCount;
    document.getElementById('summary-total').textContent = totalPlayed;
    
    const list = document.getElementById('summary-word-list');
    list.innerHTML = '';
    
    // Show words that were played
    for (const rw of this.roundWords) {
      if (rw.result === 'unplayed') continue;
      const div = document.createElement('div');
      div.className = `summary-word-item ${rw.result}`;
      
      const statusIcon = rw.result === 'correct' 
        ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="#22c55e" stroke="#22c55e" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M9 12l2 2 4-4" stroke="#fff" fill="none"/></svg>'
        : '<svg width="18" height="18" viewBox="0 0 24 24" fill="#ef4444" stroke="#ef4444" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6" stroke="#fff" fill="none"/></svg>';
      
      div.innerHTML = `
        <div class="summary-word-status">${statusIcon}</div>
        <div class="summary-word-info">
          <span class="summary-word">${rw.word.word}</span>
          <span class="summary-word-desc">${rw.word.description || ''}</span>
        </div>
      `;
      list.appendChild(div);
    }
    
    // Show next round / finish buttons
    const nextTeamIdx = (this.currentTeamIndex + 1) % this.settings.teams.length;
    const isLastTeamOfLastRound = this.currentRound >= this.settings.rounds && nextTeamIdx === 0;
    document.getElementById('btn-next-round').style.display = isLastTeamOfLastRound ? 'none' : 'flex';
    document.getElementById('btn-finish-game').style.display = 'flex';
  },

  nextRound() {
    const nextTeamIndex = (this.currentTeamIndex + 1) % this.settings.teams.length;
    
    if (nextTeamIndex === 0) {
      // All teams have played, advance to next round
      this.currentRound++;
      if (this.currentRound > this.settings.rounds) {
        this.finishGame();
        return;
      }
    }
    
    this.currentTeamIndex = nextTeamIndex;
    
    // Show pass screen
    const passTeam = document.getElementById('pass-team-name');
    if (passTeam) passTeam.textContent = this.settings.teams[this.currentTeamIndex];
    App.showScreen('pass');
    
    // Prepare next round words
    this.prepareRound();
  },

  startRound() {
    this.state = 'playing';
    this.timeRemaining = this.settings.duration;
    this.currentWordIndex = 0;
    this._startTimer();
    this._showWord();
    App.showScreen('game');
  },

  finishGame() {
    this._stopTimer();
    this.state = 'finished';
    
    this.stats.gamesPlayed++;
    this.saveStats();
    
    const maxScore = Math.max(...this.teamScores);
    const allZero = maxScore === 0;
    
    // Show winner screen
    const winnerName = document.getElementById('winner-name');
    const winnerScore = document.getElementById('winner-score');
    const winnerTitle = document.querySelector('.winner-title');
    
    if (allZero) {
      if (winnerTitle) winnerTitle.textContent = I18n.t('no_winner') || 'Немає переможця';
      if (winnerName) winnerName.textContent = '';
      if (winnerScore) winnerScore.textContent = '0';
    } else {
      UI.playSound('winner');
      
      const winners = this.teamScores.reduce((acc, score, i) => {
        if (score === maxScore) acc.push(i);
        return acc;
      }, []);
      
      if (winners.length > 1) {
        if (winnerTitle) winnerTitle.textContent = I18n.t('draw_title') || 'Нічия!';
        if (winnerName) winnerName.textContent = winners.map(i => this.settings.teams[i]).join(' & ');
      } else {
        if (winnerTitle) winnerTitle.textContent = I18n.t('winner');
        if (winnerName) winnerName.textContent = this.settings.teams[winners[0]];
      }
      if (winnerScore) winnerScore.textContent = maxScore;
    }
    
    App.showScreen('winner');
  },

  confirmFinish() {
    if (confirm(I18n.t('confirm_end_text') || 'Завершити гру достроково?')) {
      this.finishGame();
    }
  },

  showScoreboard() {
    const list = document.getElementById('scoreboard-list');
    list.innerHTML = '';
    
    const sorted = this.settings.teams.map((name, i) => ({
      name,
      score: this.teamScores[i],
      index: i
    })).sort((a, b) => b.score - a.score);
    
    let rank = 1;
    for (const team of sorted) {
      const div = document.createElement('div');
      div.className = 'scoreboard-item';
      if (rank === 1) div.classList.add('gold');
      else if (rank === 2) div.classList.add('silver');
      else if (rank === 3) div.classList.add('bronze');
      
      div.innerHTML = `
        <div class="scoreboard-rank">#${rank}</div>
        <div class="scoreboard-name">${team.name}</div>
        <div class="scoreboard-score">${team.score}</div>
      `;
      list.appendChild(div);
      rank++;
    }
    
    App.showScreen('scoreboard');
  },

  getCurrentTeamScore() {
    return this.teamScores[this.currentTeamIndex] || 0;
  },

  getTeamScore(teamIndex) {
    return this.teamScores[teamIndex] || 0;
  },

  getScores() {
    return this.settings.teams.map((name, i) => ({
      name,
      score: this.teamScores[i]
    }));
  },

  pause() {
    if (this.state === 'playing') {
      this.state = 'paused';
      this._stopTimer();
    }
  },

  resume() {
    if (this.state === 'paused') {
      this.state = 'playing';
      this._startTimer();
    }
  }
};
