const EMOJIS = ['🍅','🥬','🥕','🥦','🌽','🧅','🧄','🥔','🍆','🫛','🥒','🌶️','🍎','🍊','🥭','🍇','🥥','🍓','🍋','🍑','🌾','🫘','🥜','🍄','🧅','🥛','🫚','🌿','🫙','🍫'];

let currentPage = 'home';
let selectedEmoji = '🥬';
let currentOrderProduct = null;

// Auto-refresh interval for live tracking panel
let _liveTrackingTimer = null;
const LIVE_REFRESH_MS = 8000;

window.addEventListener('DOMContentLoaded', async () => {
  const ok = await initDatabase();
  if (!ok) { showToast('⚠️ Database failed to initialize', 'error'); return; }

  setTimeout(() => {
    document.getElementById('loader').classList.add('hidden');
    initApp();
  }, 2200);
});

function initApp() {
  setupNavigation();
  setupHeader();
  setupMobileNav();
  renderHomePage();
  setupEmojiPicker();
  updateDbBanner();
  _injectTrackingStyles();

  // When another tab writes to the DB, refresh the current page automatically
  onRemoteChange(() => {
    updateDbBanner();
    switch (currentPage) {
      case 'home':        renderHomePage();    break;
      case 'marketplace': filterProducts();    break;
      case 'farmers':     renderFarmers();     break;
      case 'restaurants': renderRestaurants(); break;
      case 'orders':      renderOrders();      break;
    }
  });
}

// ─────────────────────────────────────────────────────────────
//  Navigation
// ─────────────────────────────────────────────────────────────
function setupNavigation() {
  document.querySelectorAll('.nav-btn[data-page]').forEach(btn => {
    btn.addEventListener('click', () => navigate(btn.dataset.page));
  });
}

function navigate(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));

  const pageEl = document.getElementById(`page-${page}`);
  if (pageEl) pageEl.classList.add('active');
  document.querySelectorAll(`[data-page="${page}"]`).forEach(b => b.classList.add('active'));

  currentPage = page;
  window.scrollTo({ top: 0, behavior: 'smooth' });
  document.getElementById('mobileNav').classList.remove('open');

  _stopLiveTracking();

  switch (page) {
    case 'home':        renderHomePage();    break;
    case 'marketplace': renderMarketplace(); break;
    case 'farmers':     renderFarmers();     break;
    case 'restaurants': renderRestaurants(); break;
    case 'orders':      renderOrders();      break;
  }
}

function setupHeader() {
  window.addEventListener('scroll', () => {
    document.getElementById('header').classList.toggle('scrolled', window.scrollY > 10);
  });
}

function setupMobileNav() {
  document.getElementById('hamburger').addEventListener('click', () => {
    document.getElementById('mobileNav').classList.toggle('open');
  });
}

// ─────────────────────────────────────────────────────────────
//  Home
// ─────────────────────────────────────────────────────────────
function renderHomePage() {
  const stats = dbGetStats();
  animateCounter('stat-farmers', stats.farmers);
  animateCounter('stat-products', stats.products);
  animateCounter('stat-restaurants', stats.restaurants);
  animateCounter('stat-orders', stats.orders);
  renderProduceGrid();
  renderFeaturedProducts();
}

function animateCounter(id, target) {
  const el = document.getElementById(id);
  if (!el) return;
  let current = 0;
  const step = Math.ceil(target / 30);
  const timer = setInterval(() => {
    current = Math.min(current + step, target);
    el.textContent = current;
    if (current >= target) clearInterval(timer);
  }, 50);
}

function renderProduceGrid() {
  const products = dbGetProducts({ sort: 'newest' }).slice(0, 12);
  const grid = document.getElementById('produceGrid');
  if (!products.length) { grid.innerHTML = ''; return; }
  grid.innerHTML = products.map((p, i) => `
    <div class="produce-item ${i === 2 || i === 7 ? 'highlight' : ''}" 
         onclick="navigate('marketplace')" 
         style="animation: slideUp 0.4s ease ${i * 0.05}s both">
      <span class="emoji">${p.emoji}</span>
      <div class="name">${p.name}</div>
      <div class="price">₹${p.price_per_kg}/kg</div>
    </div>
  `).join('');
}

function renderFeaturedProducts() {
  const products = dbGetProducts().slice(0, 6);
  const grid = document.getElementById('featuredProducts');
  if (!products.length) { grid.innerHTML = '<p>No products yet.</p>'; return; }
  grid.innerHTML = products.map(p => renderProductCard(p)).join('');
}

// ─────────────────────────────────────────────────────────────
//  Marketplace
// ─────────────────────────────────────────────────────────────
function renderMarketplace() {
  filterProducts();
  populateFarmerDropdown();
}

function filterProducts() {
  const search   = document.getElementById('searchInput')?.value || '';
  const category = document.getElementById('categoryFilter')?.value || '';
  const season   = document.getElementById('seasonFilter')?.value || '';
  const sort     = document.getElementById('sortFilter')?.value || 'newest';

  const products = dbGetProducts({ search, category, season, sort });
  const grid = document.getElementById('productsGrid');
  const info = document.getElementById('resultsInfo');

  if (info) info.textContent = `Showing ${products.length} product${products.length !== 1 ? 's' : ''}`;

  if (!products.length) {
    grid.innerHTML = `<div class="empty-state">
      <span class="empty-icon">🌱</span>
      <h3>No produce found</h3>
      <p>Try adjusting your filters or <a href="#" onclick="openModal('addProductModal')" style="color:var(--green)">list new produce</a></p>
    </div>`;
    return;
  }
  grid.innerHTML = products.map(p => renderProductCard(p)).join('');
}

function renderProductCard(p) {
  return `
    <div class="product-card">
      <div class="product-card-header">
        <span class="product-emoji">${p.emoji}</span>
        <span class="product-season-badge">${seasonIcon(p.season)} ${p.season}</span>
      </div>
      <div class="product-card-body">
        <div class="product-name">${p.name}</div>
        <div class="product-farmer">by <span>${p.farm_name || 'Unknown Farm'}</span> · 📍 ${p.farm_location || ''}</div>
        <div class="product-meta">
          <div class="product-price">₹${p.price_per_kg}<small>/kg</small></div>
          <div class="product-qty">🔢 ${p.quantity_kg} kg</div>
        </div>
        <div class="product-desc">${p.description || 'Fresh seasonal produce from local farm.'}</div>
        <div class="product-actions">
          <button class="btn-order" onclick="openOrderModal(${p.id})">Order Now</button>
          <button class="btn-wishlist" onclick="showToast('❤️ Added to wishlist!')">♡</button>
        </div>
      </div>
    </div>
  `;
}

function seasonIcon(season) {
  const icons = { Summer: '☀️', Monsoon: '🌧️', Winter: '❄️', 'Year-round': '🔄' };
  return icons[season] || '🌿';
}

// ─────────────────────────────────────────────────────────────
//  Farmers
// ─────────────────────────────────────────────────────────────
function renderFarmers(search = '') {
  let farmers = dbGetFarmers();
  if (search) {
    const s = search.toLowerCase();
    farmers = farmers.filter(f =>
      f.farm_name.toLowerCase().includes(s) ||
      f.location.toLowerCase().includes(s) ||
      f.farmer_name.toLowerCase().includes(s)
    );
  }
  const grid = document.getElementById('farmersGrid');
  if (!farmers.length) {
    grid.innerHTML = `<div class="empty-state">
      <span class="empty-icon">🧑‍🌾</span><h3>No farmers yet</h3>
      <p>Be the first to <a href="#" onclick="openModal('registerModal')" style="color:var(--green)">register your farm</a></p>
    </div>`;
    return;
  }
  grid.innerHTML = farmers.map(f => renderFarmerCard(f)).join('');
}

function filterFarmers() {
  const search = document.getElementById('farmerSearch')?.value || '';
  renderFarmers(search);
}

function renderFarmerCard(f) {
  const crops = (f.speciality_crops || '').split(',').map(c => `<span class="crop-tag">${c.trim()}</span>`).join('');
  const badgeClass = `badge-${(f.farm_type || 'conventional').toLowerCase()}`;
  const avatarEmoji = f.farm_type === 'Organic' ? '🧑‍🌾' : f.farm_type === 'Biodynamic' ? '🌍' : '👨‍🌾';
  return `
    <div class="farmer-card" onclick="openFarmerDetail(${f.id})">
      <div class="farmer-card-top">
        <div class="farmer-avatar">${avatarEmoji}</div>
        <div class="farmer-info">
          <h3>${f.farm_name}</h3>
          <p>${f.farmer_name}</p>
          <span class="farmer-type-badge ${badgeClass}">${f.farm_type}</span>
        </div>
      </div>
      <div class="farmer-stats">
        <div class="fstat"><span>${f.product_count || 0}</span><small>Products</small></div>
        <div class="fstat"><span>${f.order_count || 0}</span><small>Orders</small></div>
        <div class="fstat"><span>★ 4.${Math.floor(Math.random()*3)+6}</span><small>Rating</small></div>
      </div>
      <div class="farmer-crops">${crops}</div>
      <div class="farmer-location">${f.location}</div>
      <button class="btn-contact" onclick="event.stopPropagation(); showToast('📞 Contacting ${f.farmer_name}...')">Contact Farmer</button>
    </div>
  `;
}

function openFarmerDetail(farmerId) {
  const farmer   = dbGetOne(`SELECT * FROM farmers WHERE id = ?`, [farmerId]);
  const products = dbGetProducts({ sort: 'newest' }).filter(p => p.farmer_id === farmerId);
  const content  = document.getElementById('farmerDetailContent');
  const badgeClass  = `badge-${(farmer.farm_type || 'conventional').toLowerCase()}`;
  const avatarEmoji = farmer.farm_type === 'Organic' ? '🧑‍🌾' : farmer.farm_type === 'Biodynamic' ? '🌍' : '👨‍🌾';

  content.innerHTML = `
    <div class="farmer-detail-header">
      <div class="farmer-detail-avatar">${avatarEmoji}</div>
      <div>
        <h2 style="font-family:var(--font-display);color:var(--green)">${farmer.farm_name}</h2>
        <p style="color:var(--muted);margin:0.3rem 0">${farmer.farmer_name} · ${farmer.location}</p>
        <span class="farmer-type-badge ${badgeClass}">${farmer.farm_type}</span>
      </div>
    </div>
    <div style="margin-bottom:1.5rem">
      <p style="color:var(--text-mid);line-height:1.7">${farmer.bio || 'A dedicated local farmer committed to quality produce.'}</p>
    </div>
    <div style="display:flex;gap:1rem;margin-bottom:1.5rem">
      <div style="flex:1;background:var(--cream);border-radius:8px;padding:0.75rem;text-align:center">
        <strong style="display:block;color:var(--green);font-family:var(--font-display);font-size:1.3rem">${products.length}</strong>
        <small style="color:var(--muted)">Active Listings</small>
      </div>
      <div style="flex:1;background:var(--cream);border-radius:8px;padding:0.75rem;text-align:center">
        <strong style="display:block;color:var(--green);font-family:var(--font-display);font-size:1.3rem">📞</strong>
        <small style="color:var(--muted)">${farmer.phone}</small>
      </div>
      <div style="flex:1;background:var(--cream);border-radius:8px;padding:0.75rem;text-align:center">
        <strong style="display:block;color:var(--amber);font-family:var(--font-display);font-size:1.3rem">★ 4.${Math.floor(Math.random()*3)+6}</strong>
        <small style="color:var(--muted)">Rating</small>
      </div>
    </div>
    <div class="farmer-detail-products">
      <h3>Available Produce (${products.length})</h3>
      <div class="mini-product-list">
        ${products.length ? products.map(p => `
          <div class="mini-product-item">
            <div>${p.emoji} <strong>${p.name}</strong> <span style="color:var(--muted);font-size:0.8rem">${p.season}</span></div>
            <div style="display:flex;align-items:center;gap:0.75rem">
              <strong style="color:var(--green)">₹${p.price_per_kg}/kg</strong>
              <button class="btn-order" style="padding:0.35rem 0.85rem;font-size:0.78rem" onclick="closeModal('farmerDetailModal');openOrderModal(${p.id})">Order</button>
            </div>
          </div>
        `).join('') : '<p style="color:var(--muted)">No active listings</p>'}
      </div>
    </div>
  `;
  openModal('farmerDetailModal');
}

// ─────────────────────────────────────────────────────────────
//  Restaurants
// ─────────────────────────────────────────────────────────────
function renderRestaurants(search = '') {
  let restaurants = dbGetRestaurants();
  if (search) {
    const s = search.toLowerCase();
    restaurants = restaurants.filter(r =>
      r.name.toLowerCase().includes(s) ||
      r.location.toLowerCase().includes(s) ||
      r.cuisine_type?.toLowerCase().includes(s)
    );
  }
  const grid = document.getElementById('restaurantsGrid');
  if (!restaurants.length) {
    grid.innerHTML = `<div class="empty-state">
      <span class="empty-icon">🍽️</span><h3>No restaurants yet</h3>
      <p>Be the first to <a href="#" onclick="openModal('registerModal')" style="color:var(--green)">register your restaurant</a></p>
    </div>`;
    return;
  }
  grid.innerHTML = restaurants.map(r => renderRestaurantCard(r)).join('');
}

function filterRestaurants() {
  const search = document.getElementById('restaurantSearch')?.value || '';
  renderRestaurants(search);
}

function renderRestaurantCard(r) {
  const restEmojis = ['🍽️', '🍜', '🥘', '🫕', '🍛', '🥗'];
  const emoji = restEmojis[r.id % restEmojis.length];
  return `
    <div class="restaurant-card">
      <div class="restaurant-header">
        <div class="restaurant-icon">${emoji}</div>
        <div class="restaurant-info">
          <h3>${r.name}</h3>
          <p>${r.contact_person} · ${r.location}</p>
        </div>
      </div>
      <div class="restaurant-meta">
        ${r.cuisine_type ? `<span class="meta-tag">🍴 ${r.cuisine_type}</span>` : ''}
        ${r.seating_capacity ? `<span class="meta-tag">💺 ${r.seating_capacity} seats</span>` : ''}
        <span class="meta-tag">📦 ${r.order_count || 0} orders</span>
      </div>
      <div class="restaurant-bio">${r.bio || 'A local restaurant committed to fresh, quality ingredients.'}</div>
      <div style="display:flex;gap:0.5rem">
        <button class="btn-view-menu" onclick="showToast('📋 Viewing ${r.name} profile')">View Profile</button>
        <button class="btn-contact" onclick="showToast('📞 Contacting ${r.name}...')" style="flex:1">Contact</button>
      </div>
    </div>
  `;
}

// ─────────────────────────────────────────────────────────────
//  Orders
// ─────────────────────────────────────────────────────────────
function renderOrders() {
  renderOrdersSummary();
  _renderLiveTrackingPanel();
  filterOrders();
  _startLiveTracking();
}

function renderOrdersSummary() {
  const stats = dbGetOrderStats();
  const wrap  = document.getElementById('ordersSummary');
  wrap.innerHTML = `
    <div class="order-stat-card"><span>${stats.total}</span><label>Total Orders</label></div>
    <div class="order-stat-card"><span>${stats.Pending}</span><label>Pending</label></div>
    <div class="order-stat-card"><span>${stats.Confirmed}</span><label>Confirmed</label></div>
    <div class="order-stat-card"><span>${stats['In Transit']}</span><label>In Transit</label></div>
    <div class="order-stat-card"><span>${stats.Delivered}</span><label>Delivered</label></div>
  `;
}

function filterOrders() {
  const status = document.getElementById('orderStatusFilter')?.value || '';
  const orders = dbGetOrders(status);
  const tbody  = document.getElementById('ordersBody');

  if (!orders.length) {
    tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;padding:3rem;color:var(--muted)">No orders found 📭</td></tr>`;
    return;
  }

  // The 4 delivery steps used in the mini inline tracker
  const STEPS = [
    { key: 'Pending',    icon: '📋' },
    { key: 'Confirmed',  icon: '✅' },
    { key: 'In Transit', icon: '🚚' },
    { key: 'Delivered',  icon: '🏁' },
  ];

  tbody.innerHTML = orders.map(o => {
    const statusClass = o.status.replace(' ', '');
    const dateStr = o.order_date
      ? new Date(o.order_date).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' })
      : 'N/A';

    // Build the mini step-tracker that replaces the old Actions dropdown
    const isCancelled = o.status === 'Cancelled';
    const currentIdx  = STEPS.findIndex(s => s.key === o.status);

    const miniTracker = isCancelled
      ? `<span class="status-badge status-Cancelled" style="font-size:0.7rem">❌ Cancelled</span>`
      : STEPS.map((s, i) => {
          const done   = i < currentIdx;
          const active = i === currentIdx;
          const cls    = done ? 'mts-done' : active ? 'mts-active' : 'mts-pending';
          return (
            `<span class="mts-step ${cls}" title="${s.key}">${s.icon}</span>` +
            (i < STEPS.length - 1 ? `<span class="mts-line ${done ? 'mts-line-done' : ''}"></span>` : '')
          );
        }).join('');

    return `
      <tr>
        <td><span class="order-id">#FB${String(o.id).padStart(4,'0')}</span></td>
        <td>${o.emoji || '🌿'} ${o.product_name || 'Unknown'}</td>
        <td>${o.restaurant_name || 'Unknown'}</td>
        <td>${o.farm_name || 'Unknown'}</td>
        <td>${o.quantity_kg} kg</td>
        <td><strong>₹${Number(o.total_price).toLocaleString('en-IN')}</strong></td>
        <td><span class="status-badge status-${statusClass}">${o.status}</span></td>
        <td>${dateStr}</td>
        <td><div class="mini-tracker-strip">${miniTracker}</div></td>
      </tr>
    `;
  }).join('');
}

// ─────────────────────────────────────────────────────────────
//  Live Tracking Panel (injected above the orders table)
// ─────────────────────────────────────────────────────────────
function _ensureTrackingContainer() {
  if (document.getElementById('liveTrackingPanel')) return;
  const ordersPage = document.getElementById('page-orders');
  if (!ordersPage) return;
  const tableWrap = ordersPage.querySelector('.orders-table-wrap') ||
                    ordersPage.querySelector('table')?.closest('div') ||
                    ordersPage.querySelector('table');
  const panel = document.createElement('div');
  panel.id = 'liveTrackingPanel';
  panel.className = 'live-tracking-panel';
  if (tableWrap && tableWrap.parentNode) {
    tableWrap.parentNode.insertBefore(panel, tableWrap);
  } else {
    ordersPage.appendChild(panel);
  }
}

function _renderLiveTrackingPanel() {
  _ensureTrackingContainer();
  const panel = document.getElementById('liveTrackingPanel');
  if (!panel) return;

  const liveOrders = dbGetLiveOrders();

  if (!liveOrders.length) {
    panel.innerHTML = `
      <div class="lt-header">
        <span class="lt-pulse-dot" style="background:#94a3b8;animation:none"></span>
        <h3 class="lt-title">Live Delivery Tracker</h3>
        <span class="lt-subtitle">No active shipments right now</span>
      </div>`;
    return;
  }

  panel.innerHTML = `
    <div class="lt-header">
      <span class="lt-pulse-dot"></span>
      <h3 class="lt-title">Live Delivery Tracker</h3>
      <span class="lt-subtitle">${liveOrders.length} active shipment${liveOrders.length > 1 ? 's' : ''}</span>
      <span class="lt-refresh-label" id="ltRefreshLabel">Auto-refreshing</span>
    </div>
    <div class="lt-cards">
      ${liveOrders.map(o => _renderTrackingCard(o)).join('')}
    </div>
  `;
}

function _renderTrackingCard(o) {
  const STEPS   = ['Pending', 'Confirmed', 'In Transit', 'Delivered'];
  const stepIdx = STEPS.indexOf(o.status);
  const history = dbGetOrderTracking(o.id);
  const timeAgo = _timeAgo(o.status_updated_at);
  const icons   = ['📋', '✅', '🚚', '🏁'];

  const stepsHtml = STEPS.map((s, i) => {
    const done   = i < stepIdx;
    const active = i === stepIdx;
    const cls    = done ? 'lt-step done' : active ? 'lt-step active' : 'lt-step';
    return `
      <div class="${cls}">
        <div class="lt-step-icon">${icons[i]}</div>
        <div class="lt-step-label">${s}</div>
        ${active ? `<div class="lt-step-time">${timeAgo}</div>` : ''}
      </div>
      ${i < STEPS.length - 1 ? `<div class="lt-step-line ${done ? 'done' : ''}"></div>` : ''}
    `;
  }).join('');

  const historyHtml = history.slice().reverse().slice(0, 3).map(h => `
    <div class="lt-history-row">
      <span class="lt-history-status">${h.status}</span>
      <span class="lt-history-note">${h.note || ''}</span>
      <span class="lt-history-time">${_timeAgo(h.changed_at)}</span>
    </div>
  `).join('');

  return `
    <div class="lt-card">
      <div class="lt-card-top">
        <span class="lt-order-id">#FB${String(o.id).padStart(4,'0')}</span>
        <span class="lt-product">${o.emoji || '🌿'} ${o.product_name}</span>
        <span class="lt-qty">${o.quantity_kg} kg</span>
        <span class="lt-amount">₹${Number(o.total_price).toLocaleString('en-IN')}</span>
      </div>
      <div class="lt-route">${o.farm_name} → ${o.restaurant_name}</div>
      <div class="lt-steps">${stepsHtml}</div>
      ${o.latest_note ? `<div class="lt-latest-note">💬 ${o.latest_note}</div>` : ''}
      <details class="lt-history-toggle">
        <summary>View full history</summary>
        <div class="lt-history">${historyHtml || '<em>No history yet</em>'}</div>
      </details>
    </div>
  `;
}

function _startLiveTracking() {
  _stopLiveTracking();
  _liveTrackingTimer = setInterval(() => {
    if (currentPage !== 'orders') { _stopLiveTracking(); return; }
    _renderLiveTrackingPanel();
    filterOrders();
    const lbl = document.getElementById('ltRefreshLabel');
    if (lbl) {
      lbl.textContent = 'Updated just now';
      setTimeout(() => { if (lbl) lbl.textContent = 'Auto-refreshing'; }, 2000);
    }
  }, LIVE_REFRESH_MS);
}

function _stopLiveTracking() {
  if (_liveTrackingTimer) { clearInterval(_liveTrackingTimer); _liveTrackingTimer = null; }
}

function _timeAgo(dtStr) {
  if (!dtStr) return '';
  const diff = Math.floor((Date.now() - new Date(dtStr).getTime()) / 1000);
  if (diff < 60)    return 'just now';
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

// ─────────────────────────────────────────────────────────────
//  Injected styles — mini table tracker + live panel
//  (kept out of style.css so that file is untouched)
// ─────────────────────────────────────────────────────────────
function _injectTrackingStyles() {
  if (document.getElementById('lt-styles')) return;
  const style = document.createElement('style');
  style.id = 'lt-styles';
  style.textContent = `

    /* ── Mini inline tracker (Tracking column in the table) ── */
    .mini-tracker-strip {
      display: flex;
      align-items: center;
    }
    .mts-step {
      font-size: 1rem;
      opacity: 0.22;
      filter: grayscale(1);
      line-height: 1;
      transition: opacity 0.2s, filter 0.2s;
    }
    .mts-step.mts-done {
      opacity: 0.65;
      filter: grayscale(0);
    }
    .mts-step.mts-active {
      opacity: 1;
      filter: grayscale(0);
      display: inline-block;
      animation: mts-bounce 1.8s infinite;
    }
    @keyframes mts-bounce {
      0%,100% { transform: scale(1);    }
      50%      { transform: scale(1.3); }
    }
    .mts-line {
      width: 8px;
      height: 2px;
      background: #e2e8f0;
      flex-shrink: 0;
    }
    .mts-line.mts-line-done { background: #86efac; }

    /* ── Live Tracking Panel ── */
    .live-tracking-panel {
      background: var(--white, #fff);
      border: 1.5px solid var(--border, #e2e8f0);
      border-radius: 16px;
      padding: 1.5rem;
      margin-bottom: 2rem;
      box-shadow: 0 2px 16px rgba(0,0,0,0.06);
    }
    .lt-header {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      margin-bottom: 1.25rem;
      flex-wrap: wrap;
    }
    .lt-pulse-dot {
      width: 10px; height: 10px;
      border-radius: 50%;
      background: #22c55e;
      flex-shrink: 0;
      animation: lt-pulse 1.8s infinite;
    }
    @keyframes lt-pulse {
      0%   { box-shadow: 0 0 0 0   rgba(34,197,94,0.5); }
      70%  { box-shadow: 0 0 0 8px rgba(34,197,94,0);   }
      100% { box-shadow: 0 0 0 0   rgba(34,197,94,0);   }
    }
    .lt-title {
      font-family: var(--font-display, serif);
      font-size: 1.05rem;
      color: var(--green, #166534);
      margin: 0;
    }
    .lt-subtitle    { font-size: 0.8rem;  color: var(--muted, #64748b); margin-left: 0.25rem; }
    .lt-refresh-label { margin-left: auto; font-size: 0.72rem; color: var(--muted, #94a3b8); font-style: italic; }

    .lt-cards {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 1rem;
    }
    .lt-card {
      background: var(--cream, #f8fdf5);
      border: 1px solid var(--border, #e2e8f0);
      border-radius: 12px;
      padding: 1rem 1.1rem;
      transition: box-shadow 0.2s;
    }
    .lt-card:hover { box-shadow: 0 4px 18px rgba(0,0,0,0.09); }

    .lt-card-top {
      display: flex; align-items: center; gap: 0.5rem;
      margin-bottom: 0.3rem; font-size: 0.85rem; flex-wrap: wrap;
    }
    .lt-order-id { font-weight: 700; color: var(--green, #166534); font-size: 0.8rem; }
    .lt-product  { flex: 1; font-weight: 600; color: var(--text, #1e293b); }
    .lt-qty, .lt-amount { font-size: 0.78rem; color: var(--muted, #64748b); white-space: nowrap; }
    .lt-amount   { font-weight: 600; color: var(--amber, #b45309); }
    .lt-route    { font-size: 0.75rem; color: var(--muted, #64748b); margin-bottom: 1rem; }

    .lt-steps { display: flex; align-items: flex-start; margin-bottom: 0.75rem; }
    .lt-step  { display: flex; flex-direction: column; align-items: center; min-width: 52px; flex-shrink: 0; }
    .lt-step-icon {
      width: 32px; height: 32px; border-radius: 50%;
      background: var(--border, #e2e8f0);
      display: flex; align-items: center; justify-content: center;
      font-size: 0.9rem; transition: background 0.3s;
    }
    .lt-step.done   .lt-step-icon { background: #bbf7d0; }
    .lt-step.active .lt-step-icon {
      background: var(--green, #16a34a); color: #fff;
      animation: lt-glow 2s infinite;
    }
    @keyframes lt-glow {
      0%,100% { box-shadow: 0 0 0 3px rgba(22,163,74,0.25); }
      50%      { box-shadow: 0 0 0 6px rgba(22,163,74,0.12); }
    }
    .lt-step-label { font-size: 0.62rem; color: var(--muted, #64748b); text-align: center; margin-top: 0.3rem; line-height: 1.2; }
    .lt-step.done   .lt-step-label { color: #15803d; }
    .lt-step.active .lt-step-label { color: var(--green, #166534); font-weight: 700; }
    .lt-step-time   { font-size: 0.58rem; color: var(--muted, #94a3b8); text-align: center; margin-top: 0.1rem; }

    .lt-step-line       { flex: 1; height: 2px; background: var(--border, #e2e8f0); margin-top: 15px; border-radius: 2px; }
    .lt-step-line.done  { background: #86efac; }

    .lt-latest-note {
      font-size: 0.75rem; color: var(--text-mid, #475569);
      background: #f0fdf4; border-left: 3px solid #86efac;
      padding: 0.4rem 0.6rem; border-radius: 0 6px 6px 0; margin-bottom: 0.6rem;
    }
    .lt-history-toggle { font-size: 0.75rem; color: var(--muted, #64748b); }
    .lt-history-toggle summary {
      list-style: none; cursor: pointer; padding: 0.2rem 0;
      color: var(--green, #15803d); font-size: 0.75rem;
    }
    .lt-history-toggle summary::-webkit-details-marker { display: none; }
    .lt-history-toggle summary::before       { content: '▶ '; font-size: 0.6rem; }
    .lt-history-toggle[open] summary::before { content: '▼ '; }
    .lt-history { margin-top: 0.5rem; }
    .lt-history-row {
      display: flex; gap: 0.5rem; padding: 0.3rem 0;
      border-bottom: 1px solid var(--border, #f1f5f9);
      font-size: 0.72rem; flex-wrap: wrap;
    }
    .lt-history-status { font-weight: 700; color: var(--green, #166534); min-width: 70px; }
    .lt-history-note   { flex: 1; color: var(--text-mid, #475569); }
    .lt-history-time   { color: var(--muted, #94a3b8); white-space: nowrap; }
  `;
  document.head.appendChild(style);
}

// ─────────────────────────────────────────────────────────────
//  Modals
// ─────────────────────────────────────────────────────────────
function openModal(id) {
  const modal = document.getElementById(id);
  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeModal(id) {
  document.getElementById(id).classList.remove('active');
  document.body.style.overflow = '';
}

document.addEventListener('click', e => {
  if (e.target.classList.contains('modal-overlay')) {
    e.target.classList.remove('active');
    document.body.style.overflow = '';
  }
});

function switchTab(tab) {
  document.querySelectorAll('.modal-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
  document.querySelector(`.modal-tab[onclick="switchTab('${tab}')"]`).classList.add('active');
  document.getElementById(`${tab}Tab`).classList.add('active');
}

// ─────────────────────────────────────────────────────────────
//  Emoji picker
// ─────────────────────────────────────────────────────────────
function setupEmojiPicker() {
  const picker = document.getElementById('emojiPicker');
  picker.innerHTML = EMOJIS.map(e => `
    <button class="emoji-btn ${e === selectedEmoji ? 'selected' : ''}" onclick="selectEmoji('${e}')">${e}</button>
  `).join('');
}

function selectEmoji(emoji) {
  selectedEmoji = emoji;
  document.querySelectorAll('.emoji-btn').forEach(b => {
    b.classList.toggle('selected', b.textContent === emoji);
  });
}

// ─────────────────────────────────────────────────────────────
//  Dropdowns
// ─────────────────────────────────────────────────────────────
function populateFarmerDropdown() {
  const farmers = dbGetFarmers();
  const sel = document.getElementById('prodFarmer');
  if (!sel) return;
  sel.innerHTML = farmers.length
    ? farmers.map(f => `<option value="${f.id}">${f.farm_name} (${f.farmer_name})</option>`).join('')
    : '<option value="">No farmers registered yet</option>';
}

function populateRestaurantDropdown() {
  const restaurants = dbGetRestaurants();
  const sel = document.getElementById('orderRestaurant');
  if (!sel) return;
  sel.innerHTML = restaurants.length
    ? restaurants.map(r => `<option value="${r.id}">${r.name}</option>`).join('')
    : '<option value="">No restaurants registered yet</option>';
}

// ─────────────────────────────────────────────────────────────
//  Forms — Farmer
// ─────────────────────────────────────────────────────────────
function registerFarmer() {
  const farmName   = document.getElementById('farmName').value.trim();
  const farmerName = document.getElementById('farmerName').value.trim();
  const location   = document.getElementById('farmerLocation').value.trim();
  const phone      = document.getElementById('farmerPhone').value.trim();
  const crops      = document.getElementById('farmerCrops').value.trim();
  const bio        = document.getElementById('farmerBio').value.trim();
  const farmType   = document.querySelector('input[name="farmType"]:checked')?.value || 'Organic';

  if (!farmName || !farmerName || !location) {
    showToast('⚠️ Please fill in required fields', 'warning'); return;
  }

  dbAddFarmer({ farm_name: farmName, farmer_name: farmerName, location, phone, speciality_crops: crops, bio, farm_type: farmType });
  clearFarmerForm();
  closeModal('registerModal');
  showToast(`✅ ${farmName} registered successfully!`, 'success');
  updateDbBanner();
  if (currentPage === 'farmers') renderFarmers();
  if (currentPage === 'home')    renderHomePage();
}

function clearFarmerForm() {
  ['farmName','farmerName','farmerLocation','farmerPhone','farmerCrops','farmerBio'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
}

// ─────────────────────────────────────────────────────────────
//  Forms — Restaurant
// ─────────────────────────────────────────────────────────────
function registerRestaurant() {
  const name     = document.getElementById('restName').value.trim();
  const contact  = document.getElementById('restContact').value.trim();
  const location = document.getElementById('restLocation').value.trim();
  const phone    = document.getElementById('restPhone').value.trim();
  const cuisine  = document.getElementById('restCuisine').value.trim();
  const capacity = document.getElementById('restCapacity').value;
  const bio      = document.getElementById('restBio').value.trim();

  if (!name || !contact || !location) {
    showToast('⚠️ Please fill in required fields', 'warning'); return;
  }

  dbAddRestaurant({ name, contact_person: contact, location, phone, cuisine_type: cuisine, seating_capacity: parseInt(capacity) || null, bio });
  ['restName','restContact','restLocation','restPhone','restCuisine','restCapacity','restBio'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  closeModal('registerModal');
  showToast(`✅ ${name} registered successfully!`, 'success');
  updateDbBanner();
  if (currentPage === 'restaurants') renderRestaurants();
}

// ─────────────────────────────────────────────────────────────
//  Forms — Product
// ─────────────────────────────────────────────────────────────
function addProduct() {
  const name            = document.getElementById('prodName').value.trim();
  const category        = document.getElementById('prodCategory').value;
  const price           = parseFloat(document.getElementById('prodPrice').value);
  const quantity        = parseFloat(document.getElementById('prodQty').value);
  const season          = document.getElementById('prodSeason').value;
  const farmer_id       = document.getElementById('prodFarmer').value;
  const description     = document.getElementById('prodDesc').value.trim();
  const available_from  = document.getElementById('prodFrom').value;
  const available_until = document.getElementById('prodUntil').value;

  if (!name || !price || !quantity || !farmer_id) {
    showToast('⚠️ Please fill in required fields', 'warning'); return;
  }
  if (isNaN(price) || price <= 0 || isNaN(quantity) || quantity <= 0) {
    showToast('⚠️ Price and quantity must be positive numbers', 'warning'); return;
  }

  dbAddProduct({ name, category, price, quantity, season, farmer_id, description, emoji: selectedEmoji, available_from, available_until });
  ['prodName','prodPrice','prodQty','prodDesc','prodFrom','prodUntil'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  closeModal('addProductModal');
  showToast(`✅ ${name} listed successfully!`, 'success');
  updateDbBanner();
  if (currentPage === 'marketplace') filterProducts();
  if (currentPage === 'home')        renderHomePage();
}

// ─────────────────────────────────────────────────────────────
//  Order modal
// ─────────────────────────────────────────────────────────────
function openOrderModal(productId) {
  const product = dbGetOne(
    `SELECT p.*, f.farm_name, f.farmer_name FROM products p LEFT JOIN farmers f ON p.farmer_id = f.id WHERE p.id = ?`,
    [productId]
  );
  if (!product) return;

  currentOrderProduct = product;
  populateRestaurantDropdown();

  document.getElementById('orderProductInfo').innerHTML = `
    <div style="display:flex;align-items:center;gap:1rem">
      <span style="font-size:2.5rem">${product.emoji}</span>
      <div>
        <strong style="font-family:var(--font-display);font-size:1.2rem;color:var(--green)">${product.name}</strong>
        <p style="color:var(--muted);font-size:0.85rem;margin:0.2rem 0">${product.farm_name} · ${product.farm_location || ''}</p>
        <p style="color:var(--amber);font-weight:700;font-size:1.1rem">₹${product.price_per_kg}/kg · ${product.quantity_kg} kg available</p>
      </div>
    </div>
  `;
  document.getElementById('orderQty').value   = '';
  document.getElementById('orderNotes').value = '';
  document.getElementById('orderTotal').textContent = 'Enter quantity to see total';
  openModal('orderModal');
}

function updateOrderTotal() {
  const qty = parseFloat(document.getElementById('orderQty').value) || 0;
  if (!currentOrderProduct || qty <= 0) {
    document.getElementById('orderTotal').textContent = 'Enter quantity to see total';
    return;
  }
  const total = qty * currentOrderProduct.price_per_kg;
  document.getElementById('orderTotal').innerHTML = `
    Total: ₹${total.toLocaleString('en-IN')}
    <small style="font-family:var(--font-body);font-size:0.8rem;color:var(--muted)">(${qty} kg × ₹${currentOrderProduct.price_per_kg})</small>
  `;
}

function placeOrder() {
  const restaurantId = document.getElementById('orderRestaurant').value;
  const qty   = parseFloat(document.getElementById('orderQty').value);
  const notes = document.getElementById('orderNotes').value.trim();

  if (!restaurantId) { showToast('⚠️ Please select a restaurant', 'warning'); return; }
  if (!qty || qty <= 0) { showToast('⚠️ Please enter a valid quantity', 'warning'); return; }
  if (qty > currentOrderProduct.quantity_kg) {
    showToast(`⚠️ Only ${currentOrderProduct.quantity_kg} kg available`, 'warning'); return;
  }

  const total = qty * currentOrderProduct.price_per_kg;
  dbAddOrder({
    product_id:     currentOrderProduct.id,
    restaurant_id:  parseInt(restaurantId),
    farmer_id:      currentOrderProduct.farmer_id,
    quantity_kg:    qty,
    total_price:    total,
    delivery_notes: notes
  });

  closeModal('orderModal');
  showToast(`✅ Order placed! ₹${total.toLocaleString('en-IN')} for ${qty}kg ${currentOrderProduct.name}`, 'success');
  updateDbBanner();
  if (currentPage === 'orders') renderOrders();
  if (currentPage === 'home')   renderHomePage();
}

// ─────────────────────────────────────────────────────────────
//  Toast
// ─────────────────────────────────────────────────────────────
let toastTimer;
function showToast(message, type = 'success') {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = `toast ${type} visible`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('visible'), 3500);
}

// ─────────────────────────────────────────────────────────────
//  DB banner
// ─────────────────────────────────────────────────────────────
function updateDbBanner() {
  const stats = dbGetStats();
  document.getElementById('dbStats').textContent =
    `Farmers: ${stats.farmers} | Products: ${stats.products} | Restaurants: ${stats.restaurants} | Orders: ${stats.orders}`;
}

// ─────────────────────────────────────────────────────────────
//  Keyboard shortcut
// ─────────────────────────────────────────────────────────────
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal-overlay.active').forEach(m => {
      m.classList.remove('active');
      document.body.style.overflow = '';
    });
  }
});