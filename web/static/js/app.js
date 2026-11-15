/**
 * SupeRR Selector — Client Application Core
 * Interactive logic, deterministic evidence generator, search/sort, collectible 2-sided trading card popup, comparison tray
 */

const AppState = {
  data: null,
  currentTab: 'overview',
  currentHomeFilter: 'all',
  batters: [],
  bowlers: [],
  auctionTargets: [],
  selectedBatter: null,
  selectedBowler: null,
  comparisonList: [], // max 3 player objects
  currentMatch: null,

  // Batter filters
  batterSearch: '',
  batterRoleFilter: 'all',
  batterTop10Only: false,
  batterSortCol: 'clutch_score',
  batterSortAsc: false,

  // Bowler filters
  bowlerSearch: '',
  bowlerTop10Only: false,
  bowlerSortCol: 'clutch_score',
  bowlerSortAsc: false
};

// Permanent Light Theme Enforcement (Rajasthan Royals Editorial Mode)
window.setTheme = function() {
  document.documentElement.setAttribute('data-theme', 'light');
  document.body.setAttribute('data-theme', 'light');
  try {
    localStorage.setItem('superr_theme', 'light');
  } catch (e) {}
};

window.toggleTheme = function() {
  window.setTheme();
};

function initTheme() {
  window.setTheme();
}

// Universal Multi-Format Player Headshot Resolver (.jpg -> .png -> .webp -> .svg -> default.svg)
window.handlePlayerImgError = function(img, id) {
  if (!img.dataset.failStep) {
    img.dataset.failStep = 'png';
    img.src = `/static/images/players/${id}.png`;
  } else if (img.dataset.failStep === 'png') {
    img.dataset.failStep = 'webp';
    img.src = `/static/images/players/${id}.webp`;
  } else if (img.dataset.failStep === 'webp') {
    img.dataset.failStep = 'svg';
    img.src = `/static/images/players/${id}.svg`;
  } else {
    img.onerror = null;
    img.src = '/static/images/players/default.svg';
  }
};

// KaTeX Mathematical Formula Renderer
window.renderKaTeX = function() {
  if (window.renderMathInElement) {
    const target = document.getElementById('methodology-view') || document.body;
    try {
      window.renderMathInElement(target, {
        delimiters: [
          { left: '$$', right: '$$', display: true },
          { left: '$', right: '$', display: false },
          { left: '\\(', right: '\\)', display: false },
          { left: '\\[', right: '\\]', display: true }
        ],
        throwOnError: false
      });
    } catch (e) {
      console.warn('KaTeX rendering error:', e);
    }
  }
};

// 1. Initialization
document.addEventListener('DOMContentLoaded', async () => {
  initTheme();
  setupNavigation();
  setupEventListeners();
  switchTab('overview');
  await loadPlatformData();
  setTimeout(() => window.renderKaTeX(), 250);
});

async function loadPlatformData() {
  try {
    const resp = await fetch('/static/data/platform_data.json');
    if (!resp.ok) throw new Error('Data file not reachable');
    AppState.data = await resp.json();
    AppState.batters = [...AppState.data.batters];
    AppState.bowlers = [...AppState.data.bowlers];
    AppState.auctionTargets = AppState.data.auction_targets || [];

    renderHomeShortlist('all');
    renderOverview();
    renderBatters();
    renderBowlers();
    renderPressureAnalysis();
    renderMatchExplorer();
    renderAuctionTargets();
  } catch (err) {
    console.error('Failed to load platform data:', err);
    const homeGrid = document.getElementById('home-shortlist-grid');
    if (homeGrid) {
      homeGrid.innerHTML = `
        <div class="data-card" style="text-align: center; padding: 48px; grid-column: 1 / -1;">
          <h3 style="color: #E65391; margin-bottom: 8px;">Data Engine Initializing</h3>
          <p style="color: #64748B;">Loading data from SupeRR-ClutchML engine...</p>
        </div>
      `;
    }
  }
}

// 2. Navigation Handler
function setupNavigation() {
  const navLinks = document.querySelectorAll('.nav-link');
  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const tab = link.getAttribute('data-tab');
      switchTab(tab);

      // Close mobile sidebar if open
      document.querySelector('.app-sidebar').classList.remove('open');
    });
  });

  const mobileToggle = document.getElementById('mobile-menu-btn');
  if (mobileToggle) {
    mobileToggle.addEventListener('click', () => {
      document.querySelector('.app-sidebar').classList.toggle('open');
    });
  }
}

function switchTab(tab) {
  if (tab === 'home' || tab === 'overview') {
    tab = 'overview';
  }
  AppState.currentTab = tab;

  // Update breadcrumb title
  const breadcrumb = document.getElementById('current-view-title');
  if (breadcrumb) {
    const titles = {
      'overview': 'Overview',
      'batters': 'Batters Leaderboard',
      'bowlers': 'Bowlers Leaderboard',
      'auction': 'Auction Radar Targets',
      'pressure': 'Pressure Analysis',
      'matches': 'Match Explorer',
      'methodology': 'Scientific Methodology'
    };
    breadcrumb.textContent = titles[tab] || (tab.charAt(0).toUpperCase() + tab.slice(1));
  }

  // Update nav classes
  document.querySelectorAll('.nav-link').forEach(l => {
    l.classList.toggle('active', l.getAttribute('data-tab') === tab);
  });

  // Toggle page visibility
  document.querySelectorAll('.tab-view').forEach(view => {
    view.style.display = (view.id === `${tab}-view`) ? 'block' : 'none';
  });

  window.scrollTo({ top: 0, behavior: 'smooth' });

  // Render on-demand charts if needed
  if (tab === 'overview') {
    renderHomeShortlist(AppState.currentHomeFilter || 'all');
    setTimeout(() => {
      if (AppState.data?.overview?.pressure_distribution && window.SupeRRCharts) {
        SupeRRCharts.renderDistribution('dist-canvas', AppState.data.overview.pressure_distribution);
      }
    }, 50);
  } else if (tab === 'pressure') {
    setTimeout(() => {
      if (AppState.data?.overview?.over_progression && window.SupeRRCharts) {
        SupeRRCharts.renderOverProgression('over-canvas', AppState.data.overview.over_progression);
      }
    }, 50);
  } else if (tab === 'methodology') {
    setTimeout(() => window.renderKaTeX(), 50);
  }
}

// 3. Render Homescreen Shortlisted Champions Selector Grid
window.filterHomeShortlist = function(filterType) {
  AppState.currentHomeFilter = filterType;
  document.querySelectorAll('.selector-tab').forEach(tab => {
    tab.classList.toggle('active', tab.getAttribute('data-filter') === filterType);
  });
  renderHomeShortlist(filterType);
};

function renderHomeShortlist(filterType = 'all') {
  const container = document.getElementById('home-shortlist-grid');
  if (!container || !AppState.data) return;

  let list = [];

  if (filterType === 'all') {
    const topBatters = (AppState.data.overview?.top_10_batters || AppState.batters.slice(0, 10)).map(p => ({ ...p, isBatter: true }));
    const topBowlers = (AppState.data.overview?.top_10_bowlers || AppState.bowlers.slice(0, 10)).map(p => ({ ...p, isBatter: false }));
    list = [...topBatters, ...topBowlers];
  } else if (filterType === 'batters') {
    list = (AppState.data.overview?.top_10_batters || AppState.batters.slice(0, 10)).map(p => ({ ...p, isBatter: true }));
  } else if (filterType === 'bowlers') {
    list = (AppState.data.overview?.top_10_bowlers || AppState.bowlers.slice(0, 10)).map(p => ({ ...p, isBatter: false }));
  } else if (filterType === 'auction') {
    list = (AppState.auctionTargets || []).map(t => ({
      player_id: t.id,
      player_name: t.name,
      team: t.primary_team,
      role: t.role,
      rank: t.rank,
      clutch_score: t.clutch_score,
      isBatter: t.p_sr !== undefined,
      p_sr: t.p_sr,
      delta_sr: t.delta_sr,
      p_econ: t.p_econ,
      delta_econ: t.delta_econ,
      p_balls: t.p_balls,
      p_wkts: t.p_wkts,
      tactical_archetype: t.tactical_archetype,
      isAuction: true
    }));
  }

  container.innerHTML = list.map(p => {
    const isBat = p.isBatter;
    const rankClass = p.rank === 1 ? 'rank-1' : '';
    const id = p.player_id;

    let archetype = p.tactical_archetype;
    if (!archetype) {
      if (isBat) {
        if (p.role?.toLowerCase().includes('finisher') || (p.avg_pos >= 5.5)) archetype = 'High-Leverage Finisher';
        else if (p.delta_sr > 40) archetype = 'Crucible Accelerator';
        else archetype = 'Pressure Anchor';
      } else {
        if (p.p_dot_pct > 38) archetype = 'Dot-Ball Choker';
        else if (p.p_sr < 15) archetype = 'Breakthrough Striker';
        else archetype = 'Death Phase Specialist';
      }
    }

    return `
      <div class="shortlist-player-card ${rankClass}" onclick="openShortlistCard('${id}')">
        <div class="shortlist-card-top">
          <img src="/static/images/players/${id}.jpg"
               onerror="handlePlayerImgError(this, '${id}')"
               alt="${p.player_name}"
               class="shortlist-card-img">
          <div>
            <div style="display:flex; align-items:center; gap:6px; margin-bottom:2px;">
              <span class="spotlight-badge ${p.rank === 1 ? 'gold' : 'navy'}" style="font-size:10px; padding:2px 6px;">
                ${p.isAuction ? 'Target' : 'Rank #' + p.rank} ${isBat ? 'Batter' : 'Bowler'}
              </span>
            </div>
            <div class="shortlist-card-name">${p.player_name}</div>
            <div class="shortlist-card-team">${p.team}</div>
            <div class="archetype-tag" style="margin-top:4px;">${archetype}</div>
          </div>
        </div>

        <div class="shortlist-stats-strip">
          <div>
            <div style="font-size:9.5px; text-transform:uppercase; color:var(--text-muted); font-weight:700;">Score</div>
            <div class="font-mono" style="font-size:15px; font-weight:800; color:var(--pink);">${p.clutch_score.toFixed(2)}</div>
          </div>
          <div>
            <div style="font-size:9.5px; text-transform:uppercase; color:var(--text-muted); font-weight:700;">${isBat ? 'Press SR' : 'Press Econ'}</div>
            <div class="font-mono" style="font-size:15px; font-weight:800; color:var(--navy);">${isBat ? p.p_sr?.toFixed(1) : p.p_econ?.toFixed(2)}</div>
          </div>
          <div>
            <div style="font-size:9.5px; text-transform:uppercase; color:var(--text-muted); font-weight:700;">${isBat ? 'Lift (Δ)' : 'Wickets'}</div>
            <div class="font-mono" style="font-size:15px; font-weight:800; color:#059669;">${isBat ? '+' + p.delta_sr?.toFixed(1) : (p.p_wkts || 0)}</div>
          </div>
        </div>

        <div style="display:flex; justify-content:space-between; align-items:center; margin-top:4px;">
          <span style="font-size:11.5px; color:#64748B;">${p.p_balls} pressure balls</span>
          <button class="btn btn-why btn-sm" onclick="event.stopPropagation(); openShortlistCard('${id}');">
            ⚡ Scout Card
          </button>
        </div>
      </div>
    `;
  }).join('');
}

// 4. Render Overview Page
function renderOverview() {
  if (!AppState.data) return;
  const { meta, overview } = AppState.data;

  // Hero numbers for Overview & Home
  const setEl = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  };

  setEl('meta-matches', meta.matches_count.toLocaleString());
  setEl('meta-matches-home', meta.matches_count.toLocaleString());
  setEl('meta-players', meta.verified_ipl_players.toLocaleString());
  setEl('meta-players-home', meta.verified_ipl_players.toLocaleString());
  setEl('meta-deliveries', meta.hp_deliveries.toLocaleString());
  setEl('meta-deliveries-home', meta.hp_deliveries.toLocaleString());
  setEl('meta-pct', `${meta.hp_pct}%`);
  setEl('meta-version', `v${meta.version}`);

  // Top Batter Spotlight
  const tb = overview.top_batter;
  if (tb) {
    document.getElementById('top-batter-spotlight').innerHTML = `
      <div class="spotlight-card gold-border">
        <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:14px;">
          <div style="display:flex; align-items:center; gap:16px;">
            <img src="/static/images/players/${tb.player_id}.jpg"
                 onerror="handlePlayerImgError(this, '${tb.player_id}')"
                 alt="${tb.player_name}"
                 class="player-avatar-img lg">
            <div>
              <span class="spotlight-badge gold" style="display:inline-block; margin-bottom:4px;">Rank 1 Batter Under Pressure</span>
              <h3 class="spotlight-player-name" style="margin:0 0 2px;">${tb.player_name}</h3>
              <p class="spotlight-player-meta" style="margin:0;">${tb.role} • ${tb.team}</p>
            </div>
          </div>
          <span class="score-badge">Clutch Score: ${tb.clutch_score.toFixed(2)}</span>
        </div>

        <div class="spotlight-metric-row">
          <div class="metric-cell">
            <span class="metric-cell-val font-mono">${tb.p_sr.toFixed(1)}</span>
            <span class="metric-cell-label">Pressure SR</span>
          </div>
          <div class="metric-cell">
            <span class="metric-cell-val font-mono positive">+${tb.delta_sr.toFixed(1)}</span>
            <span class="metric-cell-label">Delta Lift</span>
          </div>
          <div class="metric-cell">
            <span class="metric-cell-val font-mono">${tb.p_avg.toFixed(1)}</span>
            <span class="metric-cell-label">Pressure Avg</span>
          </div>
          <div class="metric-cell">
            <span class="metric-cell-val font-mono">${tb.p_balls}</span>
            <span class="metric-cell-label">Pressure Balls</span>
          </div>
        </div>

        <div style="display:flex; gap:10px; margin-top:14px;">
          <button class="btn btn-why" onclick="openShortlistCard('${tb.player_id}')">Why This Player?</button>
          <button class="btn btn-outline btn-sm" onclick="openPlayerModal('${tb.player_id}')">Detailed Profile</button>
        </div>
      </div>
    `;
  }

  // Top Bowler Spotlight
  const tbw = overview.top_bowler;
  if (tbw) {
    document.getElementById('top-bowler-spotlight').innerHTML = `
      <div class="spotlight-card pink-border">
        <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:14px;">
          <div style="display:flex; align-items:center; gap:16px;">
            <img src="/static/images/players/${tbw.player_id}.jpg"
                 onerror="handlePlayerImgError(this, '${tbw.player_id}')"
                 alt="${tbw.player_name}"
                 class="player-avatar-img lg">
            <div>
              <span class="spotlight-badge pink" style="display:inline-block; margin-bottom:4px;">Rank 1 Bowler Under Pressure</span>
              <h3 class="spotlight-player-name" style="margin:0 0 2px;">${tbw.player_name}</h3>
              <p class="spotlight-player-meta" style="margin:0;">Mystery Spinner / All-Rounder • ${tbw.team}</p>
            </div>
          </div>
          <span class="score-badge">Clutch Score: ${tbw.clutch_score.toFixed(2)}</span>
        </div>

        <div class="spotlight-metric-row">
          <div class="metric-cell">
            <span class="metric-cell-val font-mono">${tbw.p_econ.toFixed(2)}</span>
            <span class="metric-cell-label">Pressure Econ</span>
          </div>
          <div class="metric-cell">
            <span class="metric-cell-val font-mono positive">+${tbw.delta_econ.toFixed(2)}</span>
            <span class="metric-cell-label">Econ Lift</span>
          </div>
          <div class="metric-cell">
            <span class="metric-cell-val font-mono">${tbw.p_wkts}</span>
            <span class="metric-cell-label">Clutch Wkts</span>
          </div>
          <div class="metric-cell">
            <span class="metric-cell-val font-mono">${tbw.p_balls}</span>
            <span class="metric-cell-label">Pressure Balls</span>
          </div>
        </div>

        <div style="display:flex; gap:10px; margin-top:14px;">
          <button class="btn btn-why" onclick="openShortlistCard('${tbw.player_id}')">Why This Player?</button>
          <button class="btn btn-outline btn-sm" onclick="openPlayerModal('${tbw.player_id}')">Detailed Profile</button>
        </div>
      </div>
    `;
  }

  // Top 5 Batters Table Preview (Top 5 show headshots)
  const bList = overview.top_5_batters || [];
  document.getElementById('top5-batters-tbody').innerHTML = bList.map(b => `
    <tr>
      <td><span class="rank-pill rank-${b.rank}">${b.rank}</span></td>
      <td>
        <div style="display:flex; align-items:center; gap:10px;">
          <img src="/static/images/players/${b.player_id}.jpg"
               onerror="handlePlayerImgError(this, '${b.player_id}')"
               alt="${b.player_name}"
               class="player-avatar-img"
               style="width:32px; height:32px;">
          <div>
            <a href="javascript:void(0)" onclick="openPlayerModal('${b.player_id}')" class="table-player-name-link">
              ${b.player_name}
            </a>
            <div style="font-size:11px; color:var(--text-muted);">${b.team}</div>
          </div>
        </div>
      </td>
      <td><span style="font-size:12px; color:var(--text-muted);">${b.role.split(' ')[0]}</span></td>
      <td class="font-mono"><strong>${b.p_sr.toFixed(1)}</strong></td>
      <td class="font-mono"><span class="delta-pill positive">+${b.delta_sr.toFixed(1)}</span></td>
      <td><span class="score-badge">${b.clutch_score.toFixed(2)}</span></td>
      <td><button class="btn btn-why" onclick="openShortlistCard('${b.player_id}')">Scout</button></td>
    </tr>
  `).join('');

  // Top 5 Bowlers Table Preview (Top 5 show headshots)
  const bwList = overview.top_5_bowlers || [];
  document.getElementById('top5-bowlers-tbody').innerHTML = bwList.map(bw => `
    <tr>
      <td><span class="rank-pill rank-${bw.rank}">${bw.rank}</span></td>
      <td>
        <div style="display:flex; align-items:center; gap:10px;">
          <img src="/static/images/players/${bw.player_id}.jpg"
               onerror="handlePlayerImgError(this, '${bw.player_id}')"
               alt="${bw.player_name}"
               class="player-avatar-img"
               style="width:32px; height:32px;">
          <div>
            <a href="javascript:void(0)" onclick="openPlayerModal('${bw.player_id}')" class="table-player-name-link">
              ${bw.player_name}
            </a>
            <div style="font-size:11px; color:var(--text-muted);">${bw.team}</div>
          </div>
        </div>
      </td>
      <td class="font-mono"><strong>${bw.p_econ.toFixed(2)}</strong></td>
      <td class="font-mono"><span class="delta-pill ${bw.delta_econ >= 0 ? 'positive' : ''}">${bw.delta_econ > 0 ? '+' : ''}${bw.delta_econ.toFixed(2)}</span></td>
      <td class="font-mono">${bw.p_wkts}</td>
      <td><span class="score-badge">${bw.clutch_score.toFixed(2)}</span></td>
      <td><button class="btn btn-why" onclick="openShortlistCard('${bw.player_id}')">Scout</button></td>
    </tr>
  `).join('');

  // Render Pressure Distribution Histogram
  setTimeout(() => {
    SupeRRCharts.renderDistribution('dist-canvas', overview.pressure_distribution);
  }, 100);
}

// 5. Render Batters Page
// ONLY ranks 1-10 show headshots per user instruction:
// "only add images to the top 10 batters,bowlers and auction scouts to look out for,rest are not necessary"
function renderBatters() {
  const container = document.getElementById('batters-table-body');
  if (!container) return;

  // Filter
  let list = AppState.batters.filter(b => {
    if (AppState.batterTop10Only && !b.is_top10) return false;
    if (AppState.batterRoleFilter !== 'all' && !b.role.toLowerCase().includes(AppState.batterRoleFilter.toLowerCase())) return false;
    if (AppState.batterSearch) {
      const q = AppState.batterSearch.toLowerCase();
      if (!b.player_name.toLowerCase().includes(q) && !b.team.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  // Sort
  list.sort((a, b) => {
    let vA = a[AppState.batterSortCol];
    let vB = b[AppState.batterSortCol];
    if (typeof vA === 'string') {
      return AppState.batterSortAsc ? vA.localeCompare(vB) : vB.localeCompare(vA);
    }
    return AppState.batterSortAsc ? (vA - vB) : (vB - vA);
  });

  document.getElementById('batter-count-label').textContent = `Showing ${list.length} eligible batters (Headshots for Top 10 Champions)`;

  if (list.length === 0) {
    container.innerHTML = `<tr><td colspan="12" style="text-align:center; padding:32px; color:#64748B;">No batters match current filters.</td></tr>`;
    return;
  }

  container.innerHTML = list.map(b => {
    const isChecked = AppState.comparisonList.some(p => p.player_id === b.player_id);
    const confClass = b.confidence === 'High Confidence' ? 'high' : (b.confidence === 'Medium Confidence' ? 'medium' : 'dev');
    const isTop10 = b.rank <= 10;

    return `
      <tr>
        <td>
          <input type="checkbox" ${isChecked ? 'checked' : ''} onchange="toggleComparePlayer('${b.player_id}', 'batter')" title="Compare player">
        </td>
        <td><span class="rank-pill rank-${b.rank <= 3 ? b.rank : 'other'}">${b.rank}</span></td>
        <td>
          <div style="display:flex; align-items:center; gap:10px;">
            ${isTop10 ? `
              <img src="/static/images/players/${b.player_id}.jpg"
                   onerror="handlePlayerImgError(this, '${b.player_id}')"
                   alt="${b.player_name}"
                   class="player-avatar-img"
                   style="width:34px; height:34px;">
            ` : `
              <span class="rank-pill" style="width:32px; height:32px; font-size:11px; background:#F1F5F9; color:#475569; font-weight:700;">#${b.rank}</span>
            `}
            <div>
              <a href="javascript:void(0)" onclick="openPlayerModal('${b.player_id}')" class="table-player-name-link">
                ${b.player_name}
              </a>
              <div style="font-size:11px; color:var(--text-muted);">${b.team}</div>
            </div>
          </div>
        </td>
        <td><span style="font-size:12px; color:#475569;">${b.role}</span></td>
        <td><span class="score-badge">${b.clutch_score.toFixed(2)}</span></td>
        <td class="font-mono"><strong>${b.p_sr.toFixed(1)}</strong></td>
        <td class="font-mono" style="color:#64748B;">${b.b_sr.toFixed(1)}</td>
        <td class="font-mono"><span class="delta-pill ${b.delta_sr >= 0 ? 'positive' : 'negative'}">${b.delta_sr > 0 ? '+' : ''}${b.delta_sr.toFixed(1)}</span></td>
        <td class="font-mono">${b.p_avg.toFixed(1)}</td>
        <td class="font-mono">${b.p_balls}</td>
        <td><span class="confidence-indicator ${confClass}">${b.confidence}</span></td>
        <td style="white-space:nowrap;">
          <button class="btn btn-why" onclick="openShortlistCard('${b.player_id}')">Scout Card</button>
          <button class="btn btn-outline btn-sm" onclick="openPlayerModal('${b.player_id}')">Profile</button>
        </td>
      </tr>
    `;
  }).join('');
}

// 6. Render Bowlers Page
// ONLY ranks 1-10 show headshots per user instruction
function renderBowlers() {
  const container = document.getElementById('bowlers-table-body');
  if (!container) return;

  let list = AppState.bowlers.filter(bw => {
    if (AppState.bowlerTop10Only && !bw.is_top10) return false;
    if (AppState.bowlerSearch) {
      const q = AppState.bowlerSearch.toLowerCase();
      if (!bw.player_name.toLowerCase().includes(q) && !bw.team.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  list.sort((a, b) => {
    let vA = a[AppState.bowlerSortCol];
    let vB = b[AppState.bowlerSortCol];
    if (typeof vA === 'string') {
      return AppState.bowlerSortAsc ? vA.localeCompare(vB) : vB.localeCompare(vA);
    }
    return AppState.bowlerSortAsc ? (vA - vB) : (vB - vA);
  });

  document.getElementById('bowler-count-label').textContent = `Showing ${list.length} eligible bowlers (Headshots for Top 10 Champions)`;

  if (list.length === 0) {
    container.innerHTML = `<tr><td colspan="12" style="text-align:center; padding:32px; color:#64748B;">No bowlers match current filters.</td></tr>`;
    return;
  }

  container.innerHTML = list.map(bw => {
    const isChecked = AppState.comparisonList.some(p => p.player_id === bw.player_id);
    const confClass = bw.confidence === 'High Confidence' ? 'high' : (bw.confidence === 'Medium Confidence' ? 'medium' : 'dev');
    const isTop10 = bw.rank <= 10;

    return `
      <tr>
        <td>
          <input type="checkbox" ${isChecked ? 'checked' : ''} onchange="toggleComparePlayer('${bw.player_id}', 'bowler')" title="Compare player">
        </td>
        <td><span class="rank-pill rank-${bw.rank <= 3 ? bw.rank : 'other'}">${bw.rank}</span></td>
        <td>
          <div style="display:flex; align-items:center; gap:10px;">
            ${isTop10 ? `
              <img src="/static/images/players/${bw.player_id}.jpg"
                   onerror="handlePlayerImgError(this, '${bw.player_id}')"
                   alt="${bw.player_name}"
                   class="player-avatar-img"
                   style="width:34px; height:34px;">
            ` : `
              <span class="rank-pill" style="width:32px; height:32px; font-size:11px; background:#F1F5F9; color:#475569; font-weight:700;">#${bw.rank}</span>
            `}
            <div>
              <a href="javascript:void(0)" onclick="openPlayerModal('${bw.player_id}')" class="table-player-name-link">
                ${bw.player_name}
              </a>
              <div style="font-size:11px; color:var(--text-muted);">${bw.team}</div>
            </div>
          </div>
        </td>
        <td><span class="score-badge">${bw.clutch_score.toFixed(2)}</span></td>
        <td class="font-mono"><strong>${bw.p_econ.toFixed(2)}</strong></td>
        <td class="font-mono" style="color:#64748B;">${bw.b_econ.toFixed(2)}</td>
        <td class="font-mono"><span class="delta-pill ${bw.delta_econ >= 0 ? 'positive' : 'negative'}">${bw.delta_econ > 0 ? '+' : ''}${bw.delta_econ.toFixed(2)}</span></td>
        <td class="font-mono"><strong>${bw.p_wkts}</strong> <span style="font-size:11px; color:#64748B;">(SR ${bw.p_sr.toFixed(1)})</span></td>
        <td class="font-mono">${bw.p_dot_pct.toFixed(1)}%</td>
        <td class="font-mono">${bw.p_balls}</td>
        <td><span class="confidence-indicator ${confClass}">${bw.confidence}</span></td>
        <td style="white-space:nowrap;">
          <button class="btn btn-why" onclick="openShortlistCard('${bw.player_id}')">Scout Card</button>
          <button class="btn btn-outline btn-sm" onclick="openPlayerModal('${bw.player_id}')">Profile</button>
        </td>
      </tr>
    `;
  }).join('');
}

// 7. Render Auction Targets Alternate List (All 8 targets show proper headshots)
function renderAuctionTargets() {
  const container = document.getElementById('auction-targets-grid');
  if (!container || !AppState.auctionTargets.length) return;

  container.innerHTML = AppState.auctionTargets.map(t => `
    <div class="data-card" style="border-top: 3.5px solid var(--navy); display:flex; flex-direction:column; justify-content:space-between;">
      <div>
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
          <span class="spotlight-badge gold">${t.category}</span>
          <span class="score-badge">Clutch Score: ${t.clutch_score.toFixed(2)}</span>
        </div>

        <div style="display:flex; align-items:center; gap:14px; margin-bottom:14px;">
          <img src="/static/images/players/${t.id}.jpg"
               onerror="handlePlayerImgError(this, '${t.id}')"
               alt="${t.name}"
               class="player-avatar-img"
               style="width:48px; height:48px;">
          <div>
            <h3 style="font-family:var(--font-serif); font-size:20px; color:var(--navy); margin-bottom:2px;">${t.name}</h3>
            <p style="font-size:12px; color:#64748B; font-weight:600;">${t.role} • ${t.primary_team}</p>
          </div>
        </div>

        <div style="background:#F8FAFC; padding:10px 12px; border-radius:6px; font-size:12px; margin-bottom:12px; border:1px solid #E2E8F0;">
          <strong>Archetype:</strong> ${t.tactical_archetype}
        </div>

        <div style="margin-bottom:12px;">
          <div style="font-size:11px; font-weight:800; text-transform:uppercase; color:var(--pink); margin-bottom:4px;">Target Rationale:</div>
          <p style="font-size:12.5px; color:#334155; line-height:1.45;">${t.target_rationale}</p>
        </div>

        <div style="margin-bottom:16px;">
          <div style="font-size:11px; font-weight:800; text-transform:uppercase; color:var(--navy); margin-bottom:4px;">Franchise Tactical Fit:</div>
          <p style="font-size:12.5px; color:#475569; line-height:1.45;">${t.rr_fit}</p>
        </div>
      </div>

      <div style="display:flex; gap:8px; border-top:1px solid #E2E8F0; padding-top:12px;">
        <button class="btn btn-why btn-sm" onclick="openShortlistCard('${t.id}')">Scout Card</button>
        <button class="btn btn-outline btn-sm" onclick="openPlayerModal('${t.id}')">Full Stats</button>
      </div>
    </div>
  `).join('');
}

// 8. Render Match Explorer
function renderMatchExplorer() {
  const selector = document.getElementById('match-select');
  if (!selector || !AppState.data?.landmark_matches?.length) return;

  selector.innerHTML = AppState.data.landmark_matches.map((m) => `
    <option value="${m.match_id}">${m.title} (${m.date})</option>
  `).join('');

  selector.addEventListener('change', () => {
    loadSelectedMatch(selector.value);
  });

  loadSelectedMatch(AppState.data.landmark_matches[0].match_id);
}

function loadSelectedMatch(matchId) {
  const match = AppState.data.landmark_matches.find(m => m.match_id === matchId);
  if (!match) return;
  AppState.currentMatch = match;

  document.getElementById('match-header-title').textContent = match.title;
  document.getElementById('match-header-result').textContent = match.result;
  document.getElementById('match-header-meta').textContent = `${match.competition} • ${match.date} • ${match.home_team} vs ${match.away_team}`;

  const tbody = document.getElementById('match-timeline-tbody');
  tbody.innerHTML = match.timeline.map(t => `
    <tr style="${t.is_high_pressure ? 'background-color: rgba(230, 83, 145, 0.05);' : ''}">
      <td class="font-mono">Inn ${t.innings}</td>
      <td class="font-mono">Ov ${t.over}.${t.ball}</td>
      <td class="font-mono"><strong>${t.score}</strong></td>
      <td>${t.batter}</td>
      <td>${t.bowler}</td>
      <td class="font-mono">
        ${t.is_wicket ? `<span style="color:#DC2626; font-weight:800;">WKT (${t.dismissal})</span>` : `+${t.runs_bat + t.extras}`}
      </td>
      <td class="font-mono">
        <span class="score-badge" style="${t.is_high_pressure ? 'background:rgba(230,83,145,0.18);' : 'background:#F1F5F9; color:#475569; border:none;'}">
          ${t.pressure_index}
        </span>
      </td>
      <td class="font-mono">${t.leverage}×</td>
    </tr>
  `).join('');
}

// 9. Render Pressure Analysis Engine Page
function renderPressureAnalysis() {
  setTimeout(() => {
    if (AppState.data?.overview?.over_progression) {
      SupeRRCharts.renderOverProgression('over-canvas', AppState.data.overview.over_progression);
    }
  }, 100);
}

// 10. AUTHENTIC 2-SIDED COLLECTIBLE SPORTS TRADING CARD POPUP
window.openShortlistCard = function(playerId) {
  let player = AppState.batters.find(p => p.player_id === playerId) || AppState.bowlers.find(p => p.player_id === playerId);
  let isAuction = false;
  let auctionData = null;

  if (!player) {
    auctionData = AppState.auctionTargets.find(t => t.id === playerId);
    if (auctionData) {
      isAuction = true;
      player = AppState.batters.find(p => p.player_id === auctionData.id) || AppState.bowlers.find(p => p.player_id === auctionData.id);
    }
  }

  if (!player && !auctionData) return;

  const isBatter = player ? !!player.p_sr : (auctionData?.p_sr !== undefined);
  const why = player?.why_this_player || {};
  const modal = document.getElementById('why-modal');
  const activeId = player ? player.player_id : auctionData.id;

  const playerName = player?.player_name || auctionData?.name;
  const team = player?.team || auctionData?.primary_team;
  const role = player?.role || auctionData?.role || (isBatter ? 'Batting Specialist' : 'Bowling Specialist');
  const rank = player?.rank || auctionData?.rank || 'Target';

  // Tactical Archetype
  let archetype = auctionData?.tactical_archetype;
  if (!archetype) {
    if (isBatter) {
      if (role.toLowerCase().includes('finisher') || (player?.avg_pos >= 5.5)) archetype = 'Death-Overs Accelerator';
      else if (player?.delta_sr > 40) archetype = 'Crucible Dominator';
      else archetype = 'Middle-Order Anchor';
    } else {
      if (player?.p_dot_pct > 38) archetype = 'Dot-Ball Choke Weapon';
      else if (player?.p_sr < 15) archetype = 'Breakthrough Strike Bowler';
      else archetype = 'Death Phase Boundary Denier';
    }
  }

  // FRONT OF TRADING CARD
  document.getElementById('tc-front-team').textContent = team.split('/')[0].trim();
  document.getElementById('tc-front-num').textContent = `#${rank}`;
  document.getElementById('tc-front-name').textContent = playerName;
  document.getElementById('tc-front-role').textContent = `${role} • Rank #${rank}`;

  const frontPhoto = document.getElementById('tc-front-photo');
  if (frontPhoto) {
    frontPhoto.dataset.failStep = '';
    frontPhoto.src = `/static/images/players/${activeId}.jpg`;
    frontPhoto.onerror = function() {
      handlePlayerImgError(this, activeId);
    };
  }

  // BACK OF TRADING CARD
  document.getElementById('tc-back-role-banner').textContent = archetype;
  document.getElementById('tc-back-name').textContent = playerName;
  document.getElementById('tc-back-team').textContent = team.split('/')[0].trim();
  document.getElementById('tc-back-rank').textContent = isAuction ? `Auction Target #${rank}` : `#${rank} ${isBatter ? 'Batter' : 'Bowler'}`;

  const scoreVal = player?.clutch_score || auctionData?.clutch_score || 0;
  document.getElementById('tc-back-score').textContent = scoreVal.toFixed(2);

  const backThumb = document.getElementById('tc-back-thumb');
  if (backThumb) {
    backThumb.dataset.failStep = '';
    backThumb.src = `/static/images/players/${activeId}.jpg`;
    backThumb.onerror = function() {
      handlePlayerImgError(this, activeId);
    };
  }

  if (isBatter) {
    const pSr = player?.p_sr || auctionData?.p_sr || 0;
    const deltaSr = player?.delta_sr || auctionData?.delta_sr || 0;
    document.getElementById('tc-back-metric-lbl').textContent = 'Pressure SR';
    document.getElementById('tc-back-metric-val').textContent = pSr.toFixed(1);
    document.getElementById('tc-back-lift-lbl').textContent = 'SR Lift (Δ)';
    document.getElementById('tc-back-lift-val').textContent = `+${deltaSr.toFixed(1)}`;
    document.getElementById('tc-back-lift-val').style.color = '#059669';
  } else {
    const pEcon = player?.p_econ || 0;
    const deltaEcon = player?.delta_econ || 0;
    document.getElementById('tc-back-metric-lbl').textContent = 'Pressure Econ';
    document.getElementById('tc-back-metric-val').textContent = `${pEcon.toFixed(2)} RPO`;
    document.getElementById('tc-back-lift-lbl').textContent = 'Econ Lift (Δ)';
    document.getElementById('tc-back-lift-val').textContent = `${deltaEcon >= 0 ? '+' : ''}${deltaEcon.toFixed(2)}`;
    document.getElementById('tc-back-lift-val').style.color = deltaEcon >= 0 ? '#059669' : '#DC2626';
  }

  // POPULATE HIGHLIGHTS LIST ON BACK OF CARD
  const highlightsContainer = document.getElementById('tc-highlights-list');
  if (highlightsContainer) {
    const bullets = [];

    if (isAuction && auctionData) {
      bullets.push(`<strong>Scout Target:</strong> ${auctionData.target_rationale}`);
      bullets.push(`<strong>Tactical Fit:</strong> ${auctionData.rr_fit}`);
    } else if (why.effectiveness) {
      bullets.push(`<strong>Clutch Mastery:</strong> ${why.effectiveness}`);
    }

    if (why.baseline_comparison) {
      bullets.push(`<strong>Elevation:</strong> ${why.baseline_comparison}`);
    } else if (isBatter) {
      bullets.push(`<strong>Crucible Lift:</strong> Elevates strike rate by +${player.delta_sr.toFixed(1)} under maximum leverage.`);
    } else {
      bullets.push(`<strong>Economy Suppression:</strong> Suppresses economy by ${player.delta_econ >= 0 ? '+' : ''}${player.delta_econ.toFixed(2)} RPO under maximum leverage.`);
    }

    if (why.sample_evaluation) {
      bullets.push(`<strong>Sample:</strong> ${why.sample_evaluation}`);
    } else {
      bullets.push(`<strong>Sample Size:</strong> ${player?.p_balls || auctionData?.p_balls || 0} legal pressure deliveries evaluated across tournament competition.`);
    }

    if (why.consistency_analysis) {
      bullets.push(`<strong>Consistency:</strong> ${why.consistency_analysis}`);
    }

    highlightsContainer.innerHTML = bullets.map(b => `<div class="card-highlight-bullet">${b}</div>`).join('');
  }

  // Wire Action Buttons below the cards
  const profileBtn = document.getElementById('card-action-profile');
  if (profileBtn) {
    profileBtn.onclick = () => {
      modal.classList.remove('active');
      openPlayerModal(activeId);
    };
  }

  const compareBtn = document.getElementById('card-action-compare');
  if (compareBtn) {
    compareBtn.onclick = () => {
      toggleComparePlayer(activeId, isBatter ? 'batter' : 'bowler');
      modal.classList.remove('active');
    };
  }

  modal.classList.add('active');
};

// Alias so any existing call to openWhyModal opens the collectible card popup
window.openWhyModal = window.openShortlistCard;

// 11. Detailed Player Profile Modal
window.openPlayerModal = function(playerId) {
  const player = AppState.batters.find(p => p.player_id === playerId) || AppState.bowlers.find(p => p.player_id === playerId);
  if (!player) return;

  const isBatter = !!player.p_sr;
  const modal = document.getElementById('player-modal');

  // Set Profile Avatar
  const pmImg = document.getElementById('pm-player-img');
  if (pmImg) {
    pmImg.dataset.failStep = '';
    pmImg.src = `/static/images/players/${player.player_id}.jpg`;
    pmImg.onerror = function() {
      handlePlayerImgError(this, player.player_id);
    };
  }

  document.getElementById('pm-player-name').textContent = player.player_name;
  document.getElementById('pm-player-meta').textContent = `${isBatter ? player.role : 'Bowler'} • ${player.team} • Overall Rank ${player.rank}`;
  document.getElementById('pm-clutch-score').textContent = `Clutch Score: ${player.clutch_score.toFixed(2)}`;

  // Metric Comparison Table
  const tbody = document.getElementById('pm-metrics-tbody');
  if (isBatter) {
    tbody.innerHTML = `
      <tr><td>Strike Rate</td><td class="font-mono"><strong>${player.p_sr.toFixed(1)}</strong></td><td class="font-mono">${player.b_sr.toFixed(1)}</td><td class="font-mono positive">+${player.delta_sr.toFixed(1)}</td></tr>
      <tr><td>Batting Average</td><td class="font-mono"><strong>${player.p_avg.toFixed(1)}</strong></td><td class="font-mono">${player.b_avg.toFixed(1)}</td><td class="font-mono">${(player.p_avg - player.b_avg).toFixed(1)}</td></tr>
      <tr><td>Boundary %</td><td class="font-mono"><strong>${player.p_bound_pct.toFixed(1)}%</strong></td><td class="font-mono">${player.b_bound_pct?.toFixed(1) || '17.2'}%</td><td class="font-mono positive">+${(player.p_bound_pct - (player.b_bound_pct || 17.2)).toFixed(1)}%</td></tr>
      <tr><td>Dot Ball %</td><td class="font-mono"><strong>${player.p_dot_pct.toFixed(1)}%</strong></td><td class="font-mono">${player.b_dot_pct?.toFixed(1) || '38.4'}%</td><td class="font-mono">${(player.p_dot_pct - (player.b_dot_pct || 38.4)).toFixed(1)}%</td></tr>
      <tr><td>Sample Size (Legal Balls)</td><td class="font-mono"><strong>${player.p_balls}</strong></td><td class="font-mono">${player.b_balls}</td><td>—</td></tr>
      <tr><td>Consistency Index</td><td class="font-mono"><strong>${(player.consistency * 100).toFixed(1)}%</strong></td><td>—</td><td>—</td></tr>
    `;
  } else {
    tbody.innerHTML = `
      <tr><td>Economy Rate (RPO)</td><td class="font-mono"><strong>${player.p_econ.toFixed(2)}</strong></td><td class="font-mono">${player.b_econ.toFixed(2)}</td><td class="font-mono ${player.delta_econ >= 0 ? 'positive' : ''}">${player.delta_econ > 0 ? '+' : ''}${player.delta_econ.toFixed(2)}</td></tr>
      <tr><td>Wickets per Ball (SR)</td><td class="font-mono"><strong>${player.p_sr.toFixed(1)}</strong></td><td class="font-mono">${player.b_sr?.toFixed(1) || '22.0'}</td><td class="font-mono positive">1 in ${player.p_sr.toFixed(1)} balls</td></tr>
      <tr><td>Dot Ball %</td><td class="font-mono"><strong>${player.p_dot_pct.toFixed(1)}%</strong></td><td class="font-mono">${player.b_dot_pct?.toFixed(1) || '34.0'}%</td><td class="font-mono positive">+${(player.p_dot_pct - (player.b_dot_pct || 34.0)).toFixed(1)}%</td></tr>
      <tr><td>Boundaries Conceded %</td><td class="font-mono"><strong>${player.p_bound_pct?.toFixed(1) || '14.5'}%</strong></td><td class="font-mono">${player.b_bound_pct?.toFixed(1) || '18.0'}%</td><td class="font-mono positive">${((player.p_bound_pct || 14.5) - (player.b_bound_pct || 18.0)).toFixed(1)}%</td></tr>
      <tr><td>Sample Size (Legal Balls)</td><td class="font-mono"><strong>${player.p_balls}</strong></td><td class="font-mono">${player.b_balls}</td><td>—</td></tr>
      <tr><td>Consistency Index</td><td class="font-mono"><strong>${(player.consistency * 100).toFixed(1)}%</strong></td><td>—</td><td>—</td></tr>
    `;
  }

  // Tournament Split
  const ipl = player.ipl_stats || {};
  const t20i = player.t20i_stats || {};
  document.getElementById('pm-comp-split').innerHTML = `
    <div style="background:var(--card-bg); padding:12px; border-radius:6px; border:1px solid var(--border-subtle);">
      <div style="font-size:11px; font-weight:700; color:var(--text-muted); text-transform:uppercase;">IPL Pressure Deliveries</div>
      <div class="font-mono" style="font-size:16px; font-weight:700; color:var(--text-main); margin-top:2px;">${ipl.p_balls || 0} balls</div>
      <div style="font-size:12px; color:var(--text-muted);">${isBatter ? `SR ${ipl.p_sr || 0}` : `Econ ${ipl.p_econ || 0}`}</div>
    </div>
    <div style="background:var(--card-bg); padding:12px; border-radius:6px; border:1px solid var(--border-subtle);">
      <div style="font-size:11px; font-weight:700; color:var(--text-muted); text-transform:uppercase;">T20I Pressure Deliveries</div>
      <div class="font-mono" style="font-size:16px; font-weight:700; color:var(--text-main); margin-top:2px;">${t20i.p_balls || 0} balls</div>
      <div style="font-size:12px; color:var(--text-muted);">${isBatter ? `SR ${t20i.p_sr || 0}` : `Econ ${t20i.p_econ || 0}`}</div>
    </div>
  `;

  // Render Radar Chart
  setTimeout(() => {
    let radarStats = {};
    if (isBatter) {
      radarStats = {
        'SR Lift': Math.min(100, Math.max(10, (player.delta_sr / 80.0) * 100)),
        'Survival': Math.min(100, (player.p_avg / 50.0) * 100),
        'Bound %': Math.min(100, (player.p_bound_pct / 32.0) * 100),
        'Consistency': player.consistency * 100,
        'Experience': Math.min(100, (player.p_balls / 600.0) * 100)
      };
    } else {
      radarStats = {
        'Econ Choke': Math.min(100, Math.max(10, ((11.5 - player.p_econ) / 5.0) * 100)),
        'Wkt Striking': Math.min(100, ((20.0 - player.p_sr) / 12.0) * 100),
        'Dot %': Math.min(100, (player.p_dot_pct / 45.0) * 100),
        'Consistency': player.consistency * 100,
        'Experience': Math.min(100, (player.p_balls / 900.0) * 100)
      };
    }
    SupeRRCharts.renderRadar('pm-radar-canvas', radarStats, player.player_name);
  }, 100);

  modal.classList.add('active');
};

// 12. Comparison Logic
window.toggleComparePlayer = function(playerId, type) {
  const list = type === 'batter' ? AppState.batters : AppState.bowlers;
  let player = list.find(p => p.player_id === playerId);
  if (!player) {
    player = AppState.batters.find(p => p.player_id === playerId) || AppState.bowlers.find(p => p.player_id === playerId);
  }
  if (!player) return;

  const idx = AppState.comparisonList.findIndex(p => p.player_id === playerId);
  if (idx >= 0) {
    AppState.comparisonList.splice(idx, 1);
  } else {
    if (AppState.comparisonList.length >= 3) {
      alert('You can compare a maximum of 3 players simultaneously.');
      return;
    }
    AppState.comparisonList.push(player);
  }

  updateCompareTray();
  renderBatters();
  renderBowlers();
};

function updateCompareTray() {
  const tray = document.getElementById('compare-tray');
  const countSpan = document.getElementById('compare-count');
  const pillsContainer = document.getElementById('compare-pills');

  if (AppState.comparisonList.length >= 2) {
    tray.classList.add('active');
    countSpan.textContent = `(${AppState.comparisonList.length}/3)`;
    pillsContainer.innerHTML = AppState.comparisonList.map(p => `
      <span class="compare-pill">
        ${p.player_name}
        <span class="compare-pill-remove" onclick="removeComparePlayer('${p.player_id}')">✕</span>
      </span>
    `).join('');
  } else if (AppState.comparisonList.length === 1) {
    tray.classList.add('active');
    countSpan.textContent = `(1/3 — select at least 1 more)`;
    pillsContainer.innerHTML = AppState.comparisonList.map(p => `
      <span class="compare-pill">
        ${p.player_name}
        <span class="compare-pill-remove" onclick="removeComparePlayer('${p.player_id}')">✕</span>
      </span>
    `).join('');
  } else {
    tray.classList.remove('active');
  }
}

window.removeComparePlayer = function(playerId) {
  AppState.comparisonList = AppState.comparisonList.filter(p => p.player_id !== playerId);
  updateCompareTray();
  renderBatters();
  renderBowlers();
};

window.openCompareModal = function() {
  if (AppState.comparisonList.length < 2) {
    // If fewer than 2 players in tray, auto-populate with Rank 1 and Rank 2 champions
    if (AppState.batters.length >= 2) {
      AppState.comparisonList = [
        { ...AppState.batters[0], type: 'batter' },
        { ...AppState.batters[1], type: 'batter' }
      ];
      updateCompareTray();
    }
  }

  const modal = document.getElementById('compare-modal');
  const header = document.getElementById('compare-header-row');
  const tbody = document.getElementById('compare-tbody');

  const pList = AppState.comparisonList;
  const isBatterComparison = !!pList[0].p_sr;

  header.innerHTML = `
    <th>Metric / Indicator</th>
    ${pList.map(p => `
      <th style="text-align:center;">
        <img src="/static/images/players/${p.player_id}.jpg"
             onerror="handlePlayerImgError(this, '${p.player_id}')"
             class="player-avatar-img"
             style="width:38px; height:38px; margin:0 auto 6px; display:block;">
        ${p.player_name}
        <div style="font-size:11px; font-weight:normal; color:#64748B;">${p.team}</div>
      </th>
    `).join('')}
  `;

  if (isBatterComparison) {
    tbody.innerHTML = `
      <tr><td>Overall Rank</td>${pList.map(p => `<td style="text-align:center;" class="font-mono"><strong>#${p.rank}</strong></td>`).join('')}</tr>
      <tr><td>Clutch Score</td>${pList.map(p => `<td style="text-align:center;"><span class="score-badge">${p.clutch_score.toFixed(2)}</span></td>`).join('')}</tr>
      <tr><td>Pressure Strike Rate</td>${pList.map(p => `<td style="text-align:center;" class="font-mono"><strong>${p.p_sr.toFixed(1)}</strong></td>`).join('')}</tr>
      <tr><td>Baseline Strike Rate</td>${pList.map(p => `<td style="text-align:center;" class="font-mono" style="color:#64748B;">${p.b_sr.toFixed(1)}</td>`).join('')}</tr>
      <tr><td>Strike Rate Lift (Δ)</td>${pList.map(p => `<td style="text-align:center;" class="font-mono positive">+${p.delta_sr.toFixed(1)}</td>`).join('')}</tr>
      <tr><td>Pressure Average</td>${pList.map(p => `<td style="text-align:center;" class="font-mono">${p.p_avg.toFixed(1)}</td>`).join('')}</tr>
      <tr><td>Boundary % Under Pressure</td>${pList.map(p => `<td style="text-align:center;" class="font-mono">${p.p_bound_pct.toFixed(1)}%</td>`).join('')}</tr>
      <tr><td>Dot Ball % Under Pressure</td>${pList.map(p => `<td style="text-align:center;" class="font-mono">${p.p_dot_pct.toFixed(1)}%</td>`).join('')}</tr>
      <tr><td>Pressure Sample Size</td>${pList.map(p => `<td style="text-align:center;" class="font-mono">${p.p_balls} balls</td>`).join('')}</tr>
      <tr><td>Consistency Index</td>${pList.map(p => `<td style="text-align:center;" class="font-mono">${(p.consistency * 100).toFixed(1)}%</td>`).join('')}</tr>
    `;
  } else {
    tbody.innerHTML = `
      <tr><td>Overall Rank</td>${pList.map(p => `<td style="text-align:center;" class="font-mono"><strong>#${p.rank}</strong></td>`).join('')}</tr>
      <tr><td>Clutch Score</td>${pList.map(p => `<td style="text-align:center;"><span class="score-badge">${p.clutch_score.toFixed(2)}</span></td>`).join('')}</tr>
      <tr><td>Pressure Economy</td>${pList.map(p => `<td style="text-align:center;" class="font-mono"><strong>${p.p_econ.toFixed(2)}</strong></td>`).join('')}</tr>
      <tr><td>Baseline Economy</td>${pList.map(p => `<td style="text-align:center;" class="font-mono" style="color:#64748B;">${p.b_econ.toFixed(2)}</td>`).join('')}</tr>
      <tr><td>Economy Lift (Δ)</td>${pList.map(p => `<td style="text-align:center;" class="font-mono ${p.delta_econ >= 0 ? 'positive' : ''}">${p.delta_econ > 0 ? '+' : ''}${p.delta_econ.toFixed(2)}</td>`).join('')}</tr>
      <tr><td>Pressure Wickets</td>${pList.map(p => `<td style="text-align:center;" class="font-mono"><strong>${p.p_wkts}</strong></td>`).join('')}</tr>
      <tr><td>Balls Per Wicket (SR)</td>${pList.map(p => `<td style="text-align:center;" class="font-mono">${p.p_sr.toFixed(1)}</td>`).join('')}</tr>
      <tr><td>Dot Ball % Under Pressure</td>${pList.map(p => `<td style="text-align:center;" class="font-mono">${p.p_dot_pct.toFixed(1)}%</td>`).join('')}</tr>
      <tr><td>Pressure Sample Size</td>${pList.map(p => `<td style="text-align:center;" class="font-mono">${p.p_balls} balls</td>`).join('')}</tr>
      <tr><td>Consistency Index</td>${pList.map(p => `<td style="text-align:center;" class="font-mono">${(p.consistency * 100).toFixed(1)}%</td>`).join('')}</tr>
    `;
  }

  modal.classList.add('active');
};

// 13. CSV Export Functions
window.exportBattersCSV = function() {
  const headers = ['Rank', 'Player Name', 'Franchise', 'Role', 'Clutch Score', 'Pressure SR', 'Baseline SR', 'Delta SR', 'Pressure Avg', 'Pressure Balls', 'Confidence'];
  const rows = AppState.batters.map(b => [
    b.rank, `"${b.player_name}"`, `"${b.team}"`, `"${b.role}"`, b.clutch_score.toFixed(2),
    b.p_sr.toFixed(1), b.b_sr.toFixed(1), b.delta_sr.toFixed(1), b.p_avg.toFixed(1), b.p_balls, `"${b.confidence}"`
  ]);
  downloadCSV('superr_selector_batters_rankings.csv', headers, rows);
};

window.exportBowlersCSV = function() {
  const headers = ['Rank', 'Player Name', 'Franchise', 'Clutch Score', 'Pressure Econ', 'Baseline Econ', 'Delta Econ', 'Pressure Wickets', 'Wicket SR', 'Dot Ball %', 'Pressure Balls', 'Confidence'];
  const rows = AppState.bowlers.map(bw => [
    bw.rank, `"${bw.player_name}"`, `"${bw.team}"`, bw.clutch_score.toFixed(2),
    bw.p_econ.toFixed(2), bw.b_econ.toFixed(2), bw.delta_econ.toFixed(2), bw.p_wkts, bw.p_sr.toFixed(1), bw.p_dot_pct.toFixed(1), bw.p_balls, `"${bw.confidence}"`
  ]);
  downloadCSV('superr_selector_bowlers_rankings.csv', headers, rows);
};

function downloadCSV(filename, headers, rows) {
  const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// 14. UI Event Listeners
function setupEventListeners() {
  // Modal closes
  document.querySelectorAll('.modal-close').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('active'));
    });
  });

  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.classList.remove('active');
    });
  });

  // Batter filters
  const bSearch = document.getElementById('batter-search');
  if (bSearch) {
    bSearch.addEventListener('input', (e) => {
      AppState.batterSearch = e.target.value;
      renderBatters();
    });
  }

  const bRole = document.getElementById('batter-role-filter');
  if (bRole) {
    bRole.addEventListener('change', (e) => {
      AppState.batterRoleFilter = e.target.value;
      renderBatters();
    });
  }

  const bTop10 = document.getElementById('batter-top10-toggle');
  if (bTop10) {
    bTop10.addEventListener('change', (e) => {
      AppState.batterTop10Only = e.target.checked;
      renderBatters();
    });
  }

  // Bowler filters
  const bwSearch = document.getElementById('bowler-search');
  if (bwSearch) {
    bwSearch.addEventListener('input', (e) => {
      AppState.bowlerSearch = e.target.value;
      renderBowlers();
    });
  }

  const bwTop10 = document.getElementById('bowler-top10-toggle');
  if (bwTop10) {
    bwTop10.addEventListener('change', (e) => {
      AppState.bowlerTop10Only = e.target.checked;
      renderBowlers();
    });
  }
}
