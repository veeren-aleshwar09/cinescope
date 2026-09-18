// ----- CONFIG -----
// import.meta.env exposes PUBLIC_-prefixed variables from your .env file to browser code.
const API_KEY = import.meta.env.PUBLIC_TMDB_API_KEY;
const BASE_URL = 'https://api.themoviedb.org/3';
const IMG_BASE = 'https://image.tmdb.org/t/p/w500';
const IMG_BASE_LARGE = 'https://image.tmdb.org/t/p/w342';

const WATCHLIST_KEY = 'watchlist';
const tabTelugu = document.getElementById('tabTelugu');

// ----- DOM REFERENCES -----
const searchForm = document.getElementById('searchForm');
const searchInput = document.getElementById('searchInput');
const movieGrid = document.getElementById('movieGrid');
const sectionTitle = document.getElementById('sectionTitle');
const tabTrending = document.getElementById('tabTrending');
const tabWatchlist = document.getElementById('tabWatchlist');
const modalOverlay = document.getElementById('modalOverlay');
const modalBox = document.getElementById('modalBox');

let currentView = 'trending'; // 'trending' | 'search' | 'watchlist'

// ----- WATCHLIST (localStorage) -----
function loadWatchlist() {
  const raw = localStorage.getItem(WATCHLIST_KEY);
  return raw ? JSON.parse(raw) : [];
}

function saveWatchlist(list) {
  localStorage.setItem(WATCHLIST_KEY, JSON.stringify(list));
}

function isInWatchlist(id) {
  return loadWatchlist().some((m) => m.id === id);
}

function toggleWatchlist(movie) {
  const list = loadWatchlist();
  const exists = list.some((m) => m.id === movie.id);
  const updated = exists ? list.filter((m) => m.id !== movie.id) : [...list, movie];
  saveWatchlist(updated);
  return !exists; // returns true if it was just added
}

// ----- API CALLS -----

async function fetchTeluguMovies() {
  const res = await fetch(
    `${BASE_URL}/discover/movie?api_key=${API_KEY}&with_original_language=te&sort_by=popularity.desc`
  );
  if (!res.ok) throw new Error('Failed to fetch Telugu movies');
  const data = await res.json();
  return data.results;
}

async function fetchTrending() {
  const res = await fetch(`${BASE_URL}/trending/movie/week?api_key=${API_KEY}`);
  if (!res.ok) throw new Error('Failed to fetch trending movies');
  const data = await res.json();
  return data.results;
}

async function searchMovies(query) {
  const res = await fetch(
    `${BASE_URL}/search/movie?api_key=${API_KEY}&query=${encodeURIComponent(query)}`
  );
  if (!res.ok) throw new Error('Search failed');
  const data = await res.json();
  return data.results;
}

async function fetchMovieDetails(id) {
  const res = await fetch(`${BASE_URL}/movie/${id}?api_key=${API_KEY}`);
  if (!res.ok) throw new Error('Failed to fetch movie details');
  return res.json();
}

// ----- RENDERING -----
function renderGrid(movies) {
  if (!movies || movies.length === 0) {
    movieGrid.innerHTML = '<div class="state-msg">No movies found.</div>';
    return;
  }

  movieGrid.innerHTML = movies
    .map((movie) => {
      const poster = movie.poster_path
        ? `${IMG_BASE}${movie.poster_path}`
        : 'https://placehold.co/300x450/171d2b/94a3b8?text=No+Image';
      const rating = movie.vote_average ? movie.vote_average.toFixed(1) : '—';

      return `
        <div class="movie-card" data-id="${movie.id}">
          <img src="${poster}" alt="${movie.title}" loading="lazy" />
          <div class="info">
            <div class="title">${movie.title}</div>
            <div class="rating">⭐ ${rating}</div>
          </div>
        </div>
      `;
    })
    .join('');
}

function renderLoading() {
  movieGrid.innerHTML = '<div class="state-msg">Loading movies...</div>';
}

function renderError(message) {
  movieGrid.innerHTML = `<div class="state-msg">${message}</div>`;
}

function renderModal(movie) {
  const poster = movie.poster_path
    ? `${IMG_BASE_LARGE}${movie.poster_path}`
    : 'https://placehold.co/300x450/171d2b/94a3b8?text=No+Image';
  const year = movie.release_date ? movie.release_date.split('-')[0] : 'N/A';
  const genres = movie.genres?.map((g) => g.name).join(', ') || 'N/A';
  const inList = isInWatchlist(movie.id);

  modalBox.innerHTML = `
    <button class="modal-close" id="modalClose">✕</button>
    <div class="modal-header">
      <img src="${poster}" alt="${movie.title}" />
      <div>
        <h2>${movie.title}</h2>
        <div class="modal-meta">${year} · ⭐ ${movie.vote_average?.toFixed(1) ?? '—'} · ${genres}</div>
        <p class="modal-overview">${movie.overview || 'No description available.'}</p>
      </div>
    </div>
    <div class="modal-actions">
      <button class="btn" id="watchlistToggleBtn">
        ${inList ? '✓ In Watchlist' : '+ Add to Watchlist'}
      </button>
    </div>
  `;

  document.getElementById('modalClose').addEventListener('click', closeModal);

  document.getElementById('watchlistToggleBtn').addEventListener('click', (e) => {
    const added = toggleWatchlist({
      id: movie.id,
      title: movie.title,
      poster_path: movie.poster_path,
      vote_average: movie.vote_average,
    });
    e.target.textContent = added ? '✓ In Watchlist' : '+ Add to Watchlist';
    // If we're currently viewing the watchlist tab, refresh it live
    if (currentView === 'watchlist') loadView('watchlist');
  });

  modalOverlay.classList.add('open');
}

function closeModal() {
  modalOverlay.classList.remove('open');
}

// ----- VIEW LOADING -----
async function loadView(view, query = '') {
  currentView = view;

  tabTrending.classList.toggle('active', view === 'trending');
  tabWatchlist.classList.toggle('active', view === 'watchlist');
  tabTelugu.classList.toggle('active', view === 'telugu');

  if (view === 'trending') {
    sectionTitle.textContent = 'Trending This Week';
    renderLoading();
    try {
      const movies = await fetchTrending();
      renderGrid(movies);
    } catch (err) {
      renderError('Could not load trending movies. Check your API key in .env');
    }
  }

  if (view === 'telugu') {
    sectionTitle.textContent = 'Telugu Movies';
    renderLoading();
    try {
      const movies = await fetchTeluguMovies();
      renderGrid(movies);
    } catch (err) {
      renderError('Could not load Telugu movies. Check your API key in .env');
    }
  }

  if (view === 'search') {
    sectionTitle.textContent = `Results for "${query}"`;
    renderLoading();
    try {
      const movies = await searchMovies(query);
      renderGrid(movies);
    } catch (err) {
      renderError('Search failed. Please try again.');
    }
  }

  if (view === 'watchlist') {
    sectionTitle.textContent = 'My Watchlist';
    const list = loadWatchlist();
    renderGrid(list);
  }
}

// ----- EVENT LISTENERS -----
searchForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const query = searchInput.value.trim();
  if (!query) return;
  loadView('search', query);
});

tabTrending.addEventListener('click', () => loadView('trending'));
tabTelugu.addEventListener('click', () => loadView('telugu'));
tabWatchlist.addEventListener('click', () => loadView('watchlist'));

// Event delegation: one listener handles clicks on any movie card,
// including ones rendered after the initial page load.
movieGrid.addEventListener('click', async (e) => {
  const card = e.target.closest('.movie-card');
  if (!card) return;

  const id = card.dataset.id;
  modalBox.innerHTML = '<div class="state-msg">Loading details...</div>';
  modalOverlay.classList.add('open');

  try {
    const details = await fetchMovieDetails(id);
    renderModal(details);
  } catch (err) {
    modalBox.innerHTML = '<div class="state-msg">Could not load movie details.</div>';
  }
});

modalOverlay.addEventListener('click', (e) => {
  if (e.target === modalOverlay) closeModal();
});

// ----- INITIAL LOAD -----
if (!API_KEY) {
  renderError('Missing API key. Copy .env.example to .env and add your TMDB API key.');
} else {
  loadView('trending');
}
