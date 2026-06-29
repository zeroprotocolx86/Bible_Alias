const Database = {
  words: [],
  categories: {},
  loaded: false,
  
  difficultyMap: {
    'Легко': 'easy',
    'Про': 'medium',
    'Потрібно напрягтися': 'hard'
  },

  knownFiles: [
    'books.json', 'people.json', 'cities.json', 'places.json',
    'objects.json', 'feasts.json', 'parables.json', 'events.json'
  ],

  async init() {
    const DATA_URL = 'data/';
    const results = [];
    
    for (const file of this.knownFiles) {
      try {
        const resp = await fetch(DATA_URL + file);
        if (!resp.ok) continue;
        const data = await resp.json();
        if (!Array.isArray(data)) continue;
        
        for (const item of data) {
          if (!item.enabled) continue;
          if (!item.word || !item.category) continue;
          
          const normalized = {
            word: item.word,
            aliases: item.aliases || [],
            category: item.category,
            difficulty: this.difficultyMap[item.difficulty] || 'medium',
            difficultyLabel: item.difficulty || 'Про',
            book: item.book || '',
            chapter: item.chapter || null,
            verse: item.verse || null,
            description: item.description || '',
            tags: item.tags || [],
            id: item.id || ''
          };
          results.push(normalized);
        }
      } catch (e) {
        console.warn('Could not load', file, e.message);
      }
    }
    
    if (results.length === 0) {
      throw new Error('No word databases loaded');
    }
    
    this.words = results;
    this._buildIndex();
    this.loaded = true;
    
    return {
      total: this.words.length,
      categories: Object.keys(this.categories).length
    };
  },

  _buildIndex() {
    this.categories = {};
    for (const word of this.words) {
      const cat = word.category;
      if (!this.categories[cat]) {
        this.categories[cat] = [];
      }
      this.categories[cat].push(word);
    }
  },

  getWordsByCategory(category) {
    return this.categories[category] || [];
  },

  getWordsByDifficulty(difficulty) {
    if (difficulty === 'all') return this.words;
    return this.words.filter(w => w.difficulty === difficulty);
  },

  getWordsByCategoryAndDifficulty(category, difficulty) {
    const catWords = this.categories[category] || [];
    if (difficulty === 'all') return catWords;
    return catWords.filter(w => w.difficulty === difficulty);
  },

  getRandomWord() {
    if (this.words.length === 0) return null;
    return this.words[Math.floor(Math.random() * this.words.length)];
  },

  getShuffledQueue(count, categories, difficulty) {
    let pool;
    if (categories && categories.length > 0) {
      pool = [];
      for (const cat of categories) {
        const words = this.categories[cat] || [];
        pool.push(...words);
      }
    } else {
      pool = [...this.words];
    }
    
    if (difficulty && difficulty !== 'all') {
      pool = pool.filter(w => w.difficulty === difficulty);
    }
    
    // Fisher-Yates shuffle
    const shuffled = [...pool];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    
    return shuffled.slice(0, count);
  },

  getCategoryNames() {
    return Object.keys(this.categories).sort(
      (a, b) => this.categories[b].length - this.categories[a].length
    );
  },

  getCategoryCounts() {
    return Object.entries(this.categories)
      .map(([name, words]) => ({ name, count: words.length }))
      .sort((a, b) => b.count - a.count);
  },

  search(query) {
    const q = query.toLowerCase();
    return this.words.filter(w => 
      w.word.toLowerCase().includes(q) ||
      w.description.toLowerCase().includes(q) ||
      w.aliases.some(a => a.toLowerCase().includes(q))
    );
  }
};
