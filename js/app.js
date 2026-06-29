const App = {
  settings: {
    theme: 'dark',
    sound: true,
    vibration: true
  },
  
  setupDefaults: {
    teamCount: 2,
    rounds: 3,
    duration: 60,
    pointsCorrect: 1,
    pointsSkip: 0,
    difficulty: 'all',
    categories: []
  },

  async init() {
    // Telegram WebApp integration
    if (window.Telegram && window.Telegram.WebApp) {
      const tg = window.Telegram.WebApp;
      tg.expand();
      tg.enableClosingConfirmation();
      
      // Use Telegram theme if available
      if (tg.colorScheme === 'light') {
        this.settings.theme = 'light';
      }
      document.documentElement.style.setProperty('--tg-bg', tg.backgroundColor || 'var(--bg-primary)');
      document.documentElement.style.setProperty('--tg-text', tg.textColor || 'var(--text-primary)');
      document.documentElement.style.setProperty('--tg-btn', tg.buttonColor || 'var(--accent)');
    }
    
    // Load app settings from localStorage
    this._loadSettings();
    
    // Apply saved theme
    document.documentElement.setAttribute('data-theme', this.settings.theme);
    
    // Initialize i18n
    I18n.applyLanguage();
    
    // Initialize game stats
    Game.init();
    
    // Load database
    try {
      const loadingText = document.getElementById('loading-text');
      if (loadingText) loadingText.textContent = I18n.t('loading_words');
      
      const result = await Database.init();
      
      if (loadingText) loadingText.textContent = `${I18n.t('loading_complete')} (${result.total} ${I18n.t('words')})`;
      
      // Show the about screen DB info
      const dbInfo = document.getElementById('about-db-info');
      if (dbInfo) {
        dbInfo.textContent = `${I18n.t('about_db')}: ${result.total} ${I18n.t('words')}, ${result.categories} ${I18n.t('categories')}`;
      }
      
    } catch (e) {
      console.error('Database init failed:', e);
      const loadingText = document.getElementById('loading-text');
      if (loadingText) loadingText.textContent = I18n.t('loading_error');
      
      // Show retry button
      const loadingContent = document.querySelector('.loading-content');
      const retryBtn = document.createElement('button');
      retryBtn.className = 'btn btn-primary';
      retryBtn.textContent = I18n.t('retry');
      retryBtn.onclick = () => {
        loadingContent.removeChild(retryBtn);
        this.init();
      };
      loadingContent.appendChild(retryBtn);
      return;
    }
    
    // Populate category selector in setup
    this._populateCategories();
    
    // Switch to menu after a brief delay
    setTimeout(() => {
      this.showScreen('menu');
    }, 500);
    
    // Bind touch events for swipe
    this._bindSwipe();
    
    // Bind keyboard events
    this._bindKeyboard();
  },

  showScreen(screenId) {
    const current = document.querySelector('.screen.active');
    const target = document.getElementById(`screen-${screenId}`);
    if (!target) return;
    
    if (current && current !== target) {
      current.classList.remove('active');
      current.classList.add('exit');
      setTimeout(() => current.classList.remove('exit'), 300);
    }
    
    // Small delay for exit animation, then show target
    const showTarget = () => {
      target.classList.add('active');
      
      // Update i18n on the new screen
      I18n.applyLanguage();
      
      // Scroll to top
      window.scrollTo(0, 0);
    };
    
    if (current && current !== target) {
      setTimeout(showTarget, 50);
    } else {
      showTarget();
    }
    
    // Special handling for certain screens
    if (screenId === 'statistics') {
      this._showStatistics();
    }
    if (screenId === 'categories') {
      this._showCategories();
    }
    if (screenId === 'setup') {
      this._restoreSetupUI();
    }
    
    // Update game info if applicable
    if (screenId === 'game') {
      Game._updateScoreDisplay();
    }
    
    // Update settings UI
    if (screenId === 'settings') {
      document.getElementById('setting-theme').value = this.settings.theme;
      document.getElementById('setting-sound').checked = this.settings.sound;
      document.getElementById('setting-vibration').checked = this.settings.vibration;
    }
  },

  _loadSettings() {
    try {
      const saved = localStorage.getItem('aliasAppSettings');
      if (saved) {
        Object.assign(this.settings, JSON.parse(saved));
      }
    } catch (e) {}
    
    try {
      const savedSetup = localStorage.getItem('aliasSetupDefaults');
      if (savedSetup) {
        Object.assign(this.setupDefaults, JSON.parse(savedSetup));
      }
    } catch (e) {}
  },

  _saveSettings() {
    localStorage.setItem('aliasAppSettings', JSON.stringify(this.settings));
    localStorage.setItem('aliasSetupDefaults', JSON.stringify(this.setupDefaults));
  },

  setTheme(theme) {
    this.settings.theme = theme;
    document.documentElement.setAttribute('data-theme', theme);
    this._saveSettings();
  },

  setSound(enabled) {
    this.settings.sound = enabled;
    this._saveSettings();
  },

  setVibration(enabled) {
    this.settings.vibration = enabled;
    this._saveSettings();
  },

  _populateCategories(savedCategories) {
    const container = document.getElementById('category-selector');
    if (!container) return;
    
    const categories = Database.getCategoryCounts();
    const saved = savedCategories || this.setupDefaults.categories;
    const savedSet = saved && saved.length > 0 ? new Set(saved) : new Set(categories.map(c => c.name));
    
    this.setupDefaults.categories = Array.from(savedSet);
    
    container.innerHTML = '';
    
    for (const cat of categories) {
      const isSelected = savedSet.has(cat.name);
      const label = document.createElement('label');
      label.className = `category-chip ${isSelected ? 'selected' : ''}`;
      
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = isSelected;
      checkbox.value = cat.name;
      checkbox.addEventListener('change', () => {
        label.classList.toggle('selected', checkbox.checked);
        this._updateSelectedCategories();
      });
      
      const nameSpan = document.createElement('span');
      nameSpan.className = 'category-chip-name';
      nameSpan.textContent = cat.name;
      
      const countSpan = document.createElement('span');
      countSpan.className = 'category-chip-count';
      countSpan.textContent = cat.count;
      
      label.appendChild(checkbox);
      label.appendChild(nameSpan);
      label.appendChild(countSpan);
      container.appendChild(label);
    }
    
    this._updateSelectedCategories();
  },

  _updateSelectedCategories() {
    const checkboxes = document.querySelectorAll('#category-selector input[type="checkbox"]');
    this.setupDefaults.categories = [];
    checkboxes.forEach(cb => {
      if (cb.checked) {
        this.setupDefaults.categories.push(cb.value);
      }
    });
    
    // Update start button state
    const startBtn = document.getElementById('btn-start');
    if (startBtn) {
      startBtn.disabled = this.setupDefaults.categories.length === 0;
      startBtn.title = this.setupDefaults.categories.length === 0 ? I18n.t('no_categories_selected') : '';
    }
  },

  _restoreSetupUI() {
    // Restore rounds, duration, points
    document.getElementById('rounds-value').textContent = this.setupDefaults.rounds;
    document.getElementById('duration-value').textContent = this.setupDefaults.duration;
    document.getElementById('pointsCorrect-value').textContent = this.setupDefaults.pointsCorrect;
    document.getElementById('pointsSkip-value').textContent = this.setupDefaults.pointsSkip;
    
    // Restore difficulty
    document.querySelectorAll('.difficulty-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.value === this.setupDefaults.difficulty);
    });
    
    // Restore teams
    const teamList = document.getElementById('team-list');
    teamList.innerHTML = '';
    const savedTeams = this.setupDefaults.teamCount || 2;
    for (let i = 0; i < savedTeams; i++) {
      const row = document.createElement('div');
      row.className = 'team-input-row';
      const input = document.createElement('input');
      input.type = 'text';
      input.className = 'team-input';
      input.id = `team-name-${i}`;
      input.placeholder = `${I18n.t('team')} ${i + 1}`;
      input.value = `${I18n.t('team')} ${i + 1}`;
      input.maxLength = 20;
      row.appendChild(input);
      if (savedTeams > 2) {
        const removeBtn = document.createElement('button');
        removeBtn.className = 'btn-remove-team';
        removeBtn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>';
        removeBtn.onclick = () => this.removeTeam(i);
        removeBtn.style.display = 'flex';
        row.appendChild(removeBtn);
      }
      teamList.appendChild(row);
    }
    
    // Restore categories selection
    this._populateCategories(this.setupDefaults.categories);
    
    // Restore team input values from saved game settings
    // (we keep default team names for simplicity)
  },

  addTeam() {
    const list = document.getElementById('team-list');
    const currentCount = list ? list.children.length : 2;
    if (currentCount >= 8) return;
    
    const row = document.createElement('div');
    row.className = 'team-input-row';
    
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'team-input';
    input.id = `team-name-${currentCount}`;
    input.placeholder = `${I18n.t('team')} ${currentCount + 1}`;
    input.value = `${I18n.t('team')} ${currentCount + 1}`;
    input.maxLength = 20;
    
    const removeBtn = document.createElement('button');
    removeBtn.className = 'btn-remove-team';
    removeBtn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>';
    removeBtn.onclick = () => this.removeTeam(currentCount);
    
    row.appendChild(input);
    row.appendChild(removeBtn);
    list.appendChild(row);
    
    this.setupDefaults.teamCount = currentCount + 1;
    this._saveSettings();
    
    // Show remove buttons if more than 2 teams
    if (currentCount + 1 > 2) {
      document.querySelectorAll('.btn-remove-team').forEach(b => b.style.display = 'flex');
    }
  },

  removeTeam(index) {
    const list = document.getElementById('team-list');
    if (!list || list.children.length <= 2) return;
    
    // Remove the last team
    const lastRow = list.lastElementChild;
    if (lastRow) {
      list.removeChild(lastRow);
    }
    
    this.setupDefaults.teamCount = list.children.length;
    this._saveSettings();
    
    // Hide remove buttons if only 2 teams
    if (list.children.length <= 2) {
      document.querySelectorAll('.btn-remove-team').forEach(b => b.style.display = 'none');
    }
  },

  adjustSetting(setting, delta) {
    const el = document.getElementById(`${setting}-value`);
    if (!el) return;
    
    let current = parseInt(el.textContent) || 0;
    let newVal = current + delta;
    
    // Clamp values
    if (setting === 'rounds') {
      newVal = Math.max(1, Math.min(10, newVal));
    } else if (setting === 'duration') {
      newVal = Math.max(15, Math.min(300, newVal));
    } else if (setting === 'pointsCorrect') {
      newVal = Math.max(1, Math.min(10, newVal));
    } else if (setting === 'pointsSkip') {
      newVal = Math.max(-5, Math.min(5, newVal));
    }
    
    el.textContent = newVal;
    this.setupDefaults[setting] = newVal;
    this._saveSettings();
  },

  selectDifficulty(diff) {
    this.setupDefaults.difficulty = diff;
    
    document.querySelectorAll('.difficulty-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.value === diff);
    });
    
    this._saveSettings();
  },

  startGame() {
    // Collect team names
    const teams = [];
    const teamInputs = document.querySelectorAll('.team-input');
    teamInputs.forEach(input => {
      const name = input.value.trim() || `${I18n.t('team')} ${teams.length + 1}`;
      teams.push(name);
    });
    
    if (teams.length < 2) {
      this.showToast(I18n.t('need_two_teams') || 'Потрібно щонайменше 2 команди');
      return;
    }
    
    if (this.setupDefaults.categories.length === 0) {
      this.showToast(I18n.t('no_categories_selected'));
      return;
    }
    
    const settings = {
      teams,
      rounds: this.setupDefaults.rounds,
      duration: this.setupDefaults.duration,
      pointsCorrect: this.setupDefaults.pointsCorrect,
      pointsSkip: this.setupDefaults.pointsSkip,
      difficulty: this.setupDefaults.difficulty,
      categories: this.setupDefaults.categories
    };
    
    Game.setup(settings);
    Game.prepareRound().then(ok => {
      if (!ok) return;
      // Show pass screen for first team
      const passTeam = document.getElementById('pass-team-name');
      if (passTeam) passTeam.textContent = teams[0];
      this.showScreen('pass');
    });
  },

  _bindSwipe() {
    const cardArea = document.getElementById('card-area');
    if (!cardArea) return;
    
    let startY = 0;
    let startX = 0;
    let isSwiping = false;
    
    cardArea.addEventListener('touchstart', (e) => {
      if (Game.state !== 'playing') return;
      const touch = e.touches[0];
      startY = touch.clientY;
      startX = touch.clientX;
      isSwiping = true;
    }, { passive: true });
    
    cardArea.addEventListener('touchmove', (e) => {
      if (!isSwiping || Game.state !== 'playing') return;
      const touch = e.touches[0];
      const diffY = touch.clientY - startY;
      
      const card = document.getElementById('word-card');
      if (card) {
        const rotate = Math.min(Math.abs(diffY) / 10, 15);
        const translateY = diffY;
        
        if (diffY < -20) {
          // Swiping up - correct
          card.style.transform = `translateY(${translateY}px) rotate(${-rotate}deg)`;
          card.style.opacity = Math.max(0, 1 - Math.abs(diffY) / 300);
          card.style.borderColor = 'var(--success)';
          card.style.boxShadow = '0 0 30px rgba(34,197,94,0.3)';
        } else if (diffY > 20) {
          // Swiping down - skip
          card.style.transform = `translateY(${translateY}px) rotate(${rotate}deg)`;
          card.style.opacity = Math.max(0, 1 - Math.abs(diffY) / 300);
          card.style.borderColor = 'var(--danger)';
          card.style.boxShadow = '0 0 30px rgba(239,68,68,0.3)';
        } else {
          card.style.transform = '';
          card.style.opacity = 1;
          card.style.borderColor = '';
          card.style.boxShadow = '';
        }
      }
    }, { passive: true });
    
    cardArea.addEventListener('touchend', (e) => {
      if (!isSwiping) return;
      isSwiping = false;
      
      const card = document.getElementById('word-card');
      if (!card) return;
      
      // Reset card styles
      card.style.transform = '';
      card.style.opacity = 1;
      card.style.borderColor = '';
      card.style.boxShadow = '';
      
      if (Game.state !== 'playing') return;
      
      const touch = e.changedTouches[0];
      const diffY = touch.clientY - startY;
      
      if (diffY < -80) {
        Game.correct();
      } else if (diffY > 80) {
        Game.skip();
      }
    }, { passive: true });
  },

  _bindKeyboard() {
    document.addEventListener('keydown', (e) => {
      if (Game.state !== 'playing') return;
      
      if (e.key === 'ArrowUp' || e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        Game.correct();
      } else if (e.key === 'ArrowDown' || e.key === 'Escape') {
        e.preventDefault();
        Game.skip();
      }
    });
  },

  showToast(message, duration = 2500) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    
    toast.textContent = message;
    toast.classList.add('show');
    
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => {
      toast.classList.remove('show');
    }, duration);
  },

  _showCategories() {
    const container = document.getElementById('categories-list');
    if (!container) return;
    
    const categories = Database.getCategoryCounts();
    container.innerHTML = '';
    
    for (const cat of categories) {
      const div = document.createElement('div');
      div.className = 'category-item';
      
      const words = Database.getWordsByCategory(cat.name);
      
      div.innerHTML = `
        <div class="category-item-header" onclick="this.parentElement.classList.toggle('expanded')">
          <span class="category-item-name">${cat.name}</span>
          <span class="category-item-count">${cat.count} ${I18n.t('words')}</span>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="category-chevron">
            <path d="M6 9l6 6 6-6"/>
          </svg>
        </div>
        <div class="category-item-words">
          ${words.slice(0, 50).map(w => `
            <div class="category-word">
              <span class="category-word-text">${w.word}</span>
              <span class="category-word-diff ${w.difficulty}">${w.difficultyLabel}</span>
            </div>
          `).join('')}
          ${words.length > 50 ? `<div class="category-word-more">... ${words.length - 50} ${I18n.t('words')}</div>` : ''}
        </div>
      `;
      
      container.appendChild(div);
    }
  },

  _showStatistics() {
    const stats = Game.stats;
    const emptyEl = document.getElementById('stats-empty');
    const contentEl = document.getElementById('stats-content');
    
    if (stats.gamesPlayed === 0) {
      emptyEl.style.display = 'flex';
      contentEl.style.display = 'none';
      return;
    }
    
    emptyEl.style.display = 'none';
    contentEl.style.display = 'block';
    
    document.getElementById('stat-games').textContent = stats.gamesPlayed;
    document.getElementById('stat-words-total').textContent = stats.totalCorrect;
    
    const totalAttempts = stats.totalCorrect + stats.totalSkipped;
    const accuracy = totalAttempts > 0 ? Math.round((stats.totalCorrect / totalAttempts) * 100) : 0;
    document.getElementById('stat-accuracy').textContent = `${accuracy}%`;
    document.getElementById('stat-best-streak').textContent = stats.bestStreak;
  },

  clearStats() {
    if (confirm(I18n.t('confirm_clear_stats') || 'Очистити всю статистику?')) {
      Game.stats = {
        gamesPlayed: 0,
        totalCorrect: 0,
        totalSkipped: 0,
        bestStreak: 0,
        currentStreak: 0
      };
      Game.saveStats();
      this._showStatistics();
      this.showToast(I18n.t('stats_cleared') || 'Статистику очищено');
    }
  }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
