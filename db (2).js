let DB = null;

const DB_SCHEMA = `
  CREATE TABLE IF NOT EXISTS farmers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    farm_name TEXT NOT NULL,
    farmer_name TEXT NOT NULL,
    location TEXT NOT NULL,
    phone TEXT,
    speciality_crops TEXT,
    bio TEXT,
    farm_type TEXT DEFAULT 'Organic',
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS restaurants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    contact_person TEXT NOT NULL,
    location TEXT NOT NULL,
    phone TEXT,
    cuisine_type TEXT,
    seating_capacity INTEGER,
    bio TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    price_per_kg REAL NOT NULL,
    quantity_kg REAL NOT NULL,
    season TEXT DEFAULT 'Year-round',
    farmer_id INTEGER,
    description TEXT,
    emoji TEXT DEFAULT '🥬',
    available_from TEXT,
    available_until TEXT,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (farmer_id) REFERENCES farmers(id)
  );

  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER,
    restaurant_id INTEGER,
    farmer_id INTEGER,
    quantity_kg REAL NOT NULL,
    total_price REAL NOT NULL,
    status TEXT DEFAULT 'Pending',
    delivery_notes TEXT,
    order_date TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (product_id) REFERENCES products(id),
    FOREIGN KEY (restaurant_id) REFERENCES restaurants(id),
    FOREIGN KEY (farmer_id) REFERENCES farmers(id)
  );
`;

const SEED_DATA = `
  INSERT INTO farmers (farm_name, farmer_name, location, phone, speciality_crops, bio, farm_type) VALUES
    ('Green Valley Organics', 'Ravi Patel', 'Nashik, Maharashtra', '+91 98765 43210', 'Tomatoes, Onions, Grapes', 'Three-generation farm practicing organic farming since 1985. Certified by APEDA.', 'Organic'),
    ('Sunrise Agro Farm', 'Suresh Naidu', 'Pune, Maharashtra', '+91 87654 32109', 'Leafy Greens, Herbs, Sprouts', 'Specializing in microgreens and hydroponic herbs for premium restaurants.', 'Biodynamic'),
    ('Hill Top Harvest', 'Meena Krishnamurthy', 'Ooty, Tamil Nadu', '+91 76543 21098', 'Carrots, Potatoes, Mushrooms', 'High-altitude farming with no pesticides. Known for our heritage potato varieties.', 'Organic'),
    ('Coastal Farms', 'Ahmed Khan', 'Alibag, Maharashtra', '+91 65432 10987', 'Coconuts, Mangoes, Jackfruit', 'Coastal farming with tropical varieties. Supplying fresh coconuts and seasonal fruits.', 'Conventional'),
    ('Vidarbha Grain Co.', 'Prakash Deshmukh', 'Nagpur, Maharashtra', '+91 54321 09876', 'Wheat, Millets, Pulses', 'Bulk grain supplier with cold storage. Heirloom millet varieties available.', 'Organic'),
    ('Sacred Earth Farm', 'Ananya Iyer', 'Coorg, Karnataka', '+91 43210 98765', 'Coffee, Cardamom, Pepper', 'Forest-edge farm with shade-grown spices and specialty coffee.', 'Biodynamic');

  INSERT INTO restaurants (name, contact_person, location, phone, cuisine_type, seating_capacity, bio) VALUES
    ('The Bombay Table', 'Priya Sharma', 'Bandra, Mumbai', '+91 22 1234 5678', 'Modern Indian', 120, 'Farm-to-table restaurant celebrating regional Indian flavors with a contemporary twist.'),
    ('Spice Route', 'Arjun Mehta', 'Colaba, Mumbai', '+91 22 2345 6789', 'Pan Asian Fusion', 80, 'Award-winning restaurant sourcing 80% ingredients from local farms.'),
    ('The Green Kitchen', 'Divya Nair', 'Koramangala, Bangalore', '+91 80 3456 7890', 'Vegan & Organic', 60, 'Entirely plant-based kitchen using only certified organic produce.'),
    ('Terroir Bistro', 'Rohit Malhotra', 'Hauz Khas, Delhi', '+91 11 4567 8901', 'European Farm', 90, 'Bringing European farm-to-fork tradition to India with local seasonal ingredients.'),
    ('Harvest Moon', 'Kavya Reddy', 'Jubilee Hills, Hyderabad', '+91 40 5678 9012', 'Contemporary Desi', 150, 'Traditional recipes elevated with the finest local produce and forgotten grain varieties.');

  INSERT INTO products (name, category, price_per_kg, quantity_kg, season, farmer_id, description, emoji, available_from, available_until) VALUES
    ('Heirloom Cherry Tomatoes', 'Vegetables', 180, 500, 'Winter', 1, 'Sweet and tangy cherry tomatoes, hand-picked at peak ripeness. No synthetic pesticides.', '🍅', '2024-11-01', '2025-02-28'),
    ('Baby Spinach', 'Herbs', 120, 200, 'Winter', 2, 'Tender baby spinach leaves, harvested fresh. Perfect for salads and garnishes.', '🥬', '2024-10-01', '2025-03-31'),
    ('Purple Yam', 'Vegetables', 95, 300, 'Monsoon', 3, 'Rare purple yam from hill farms. Exceptional texture and natural sweetness.', '🟣', '2024-07-01', '2024-10-31'),
    ('Alphonso Mangoes', 'Fruits', 350, 150, 'Summer', 4, 'Premium Ratnagiri Alphonso mangoes. The king of fruits, GI tagged variety.', '🥭', '2025-04-01', '2025-06-30'),
    ('Jowar (Sorghum)', 'Grains', 60, 1000, 'Year-round', 5, 'Ancient grain, gluten-free. Perfect for artisanal bread and traditional recipes.', '🌾', '2025-01-01', '2025-12-31'),
    ('French Beans', 'Vegetables', 85, 250, 'Winter', 2, 'Crisp french beans, ideal for fine dining preparations.', '🫛', '2024-11-01', '2025-02-28'),
    ('Shiitake Mushrooms', 'Mushrooms', 450, 80, 'Year-round', 3, 'Fresh shiitake grown on oak logs. Rich umami flavor, restaurant favourite.', '🍄', '2025-01-01', '2025-12-31'),
    ('Fresh Turmeric', 'Herbs', 140, 120, 'Winter', 1, 'Raw turmeric root with intense color and curcumin content. Freshly harvested.', '🫚', '2024-12-01', '2025-02-28'),
    ('Tender Coconuts', 'Fruits', 45, 2000, 'Year-round', 4, 'Fresh tender coconuts with sweet water. Delivered within 24hrs of harvest.', '🥥', '2025-01-01', '2025-12-31'),
    ('Cardamom Pods', 'Herbs', 1200, 30, 'Year-round', 6, 'Green cardamom from Coorg highlands. Intense aroma, handpicked and sun-dried.', '🌿', '2025-01-01', '2025-12-31');

  INSERT INTO orders (product_id, restaurant_id, farmer_id, quantity_kg, total_price, status, delivery_notes) VALUES
    (1, 1, 1, 50, 9000, 'Delivered', 'Weekly standing order'),
    (2, 3, 2, 30, 3600, 'Confirmed', 'Deliver to back entrance'),
    (4, 2, 4, 25, 8750, 'In Transit', 'Handle with care - fragile'),
    (7, 4, 3, 10, 4500, 'Pending', 'First order - sample batch'),
    (5, 5, 5, 100, 6000, 'Confirmed', 'Monthly bulk order'),
    (10, 1, 6, 5, 6000, 'Delivered', 'For signature cocktails'),
    (3, 2, 3, 20, 1900, 'Cancelled', 'Out of season now'),
    (6, 3, 2, 15, 1275, 'In Transit', 'Urgent - event tonight'),
    (9, 5, 4, 200, 9000, 'Delivered', 'Regular weekly order'),
    (8, 4, 1, 8, 1120, 'Pending', 'For golden milk menu');
`;

async function initDatabase() {
  try {
    const SQL = await initSqlJs({
      locateFile: file => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.2/${file}`
    });

    // Check for saved DB in localStorage
    const savedDb = localStorage.getItem('farmbridge_db');
    if (savedDb) {
      const binary = Uint8Array.from(atob(savedDb), c => c.charCodeAt(0));
      DB = new SQL.Database(binary);
      console.log('✅ FarmBridge DB loaded from localStorage');
    } else {
      DB = new SQL.Database();
      DB.run(DB_SCHEMA);
      DB.run(SEED_DATA);
      saveDatabase();
      console.log('✅ FarmBridge DB initialized with seed data');
    }

    return true;
  } catch (err) {
    console.error('DB init error:', err);
    return false;
  }
}

function saveDatabase() {
  try {
    const data = DB.export();
    const base64 = btoa(String.fromCharCode(...data));
    localStorage.setItem('farmbridge_db', base64);
  } catch (e) {
    console.warn('Could not save DB:', e);
  }
}

function dbRun(sql, params = []) {
  DB.run(sql, params);
  saveDatabase();
}

function dbQuery(sql, params = []) {
  const result = DB.exec(sql, params);
  if (!result.length) return [];
  const { columns, values } = result[0];
  return values.map(row => {
    const obj = {};
    columns.forEach((col, i) => obj[col] = row[i]);
    return obj;
  });
}

function dbGetOne(sql, params = []) {
  const rows = dbQuery(sql, params);
  return rows.length ? rows[0] : null;
}


function dbGetFarmers() {
  return dbQuery(`SELECT f.*, 
    (SELECT COUNT(*) FROM products WHERE farmer_id = f.id AND is_active = 1) as product_count,
    (SELECT COUNT(*) FROM orders WHERE farmer_id = f.id) as order_count
    FROM farmers f ORDER BY f.id DESC`);
}

function dbAddFarmer(data) {
  dbRun(`INSERT INTO farmers (farm_name, farmer_name, location, phone, speciality_crops, bio, farm_type) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [data.farm_name, data.farmer_name, data.location, data.phone, data.speciality_crops, data.bio, data.farm_type]);
  return DB.exec("SELECT last_insert_rowid() as id")[0].values[0][0];
}

function dbGetRestaurants() {
  return dbQuery(`SELECT r.*,
    (SELECT COUNT(*) FROM orders WHERE restaurant_id = r.id) as order_count
    FROM restaurants r ORDER BY r.id DESC`);
}

function dbAddRestaurant(data) {
  dbRun(`INSERT INTO restaurants (name, contact_person, location, phone, cuisine_type, seating_capacity, bio) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [data.name, data.contact_person, data.location, data.phone, data.cuisine_type, data.seating_capacity, data.bio]);
}

function dbGetProducts(filters = {}) {
  let sql = `SELECT p.*, f.farm_name, f.farmer_name, f.location as farm_location, f.farm_type
             FROM products p LEFT JOIN farmers f ON p.farmer_id = f.id WHERE p.is_active = 1`;
  const params = [];
  if (filters.category) { sql += ` AND p.category = ?`; params.push(filters.category); }
  if (filters.season) { sql += ` AND p.season = ?`; params.push(filters.season); }
  if (filters.search) { sql += ` AND (p.name LIKE ? OR f.farm_name LIKE ? OR f.location LIKE ?)`; const s = `%${filters.search}%`; params.push(s,s,s); }
  if (filters.sort === 'price_asc') sql += ` ORDER BY p.price_per_kg ASC`;
  else if (filters.sort === 'price_desc') sql += ` ORDER BY p.price_per_kg DESC`;
  else sql += ` ORDER BY p.id DESC`;
  return dbQuery(sql, params);
}

function dbAddProduct(data) {
  dbRun(`INSERT INTO products (name, category, price_per_kg, quantity_kg, season, farmer_id, description, emoji, available_from, available_until) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [data.name, data.category, data.price, data.quantity, data.season, data.farmer_id, data.description, data.emoji, data.available_from, data.available_until]);
}

function dbGetOrders(status = '') {
  let sql = `SELECT o.*, p.name as product_name, p.emoji, r.name as restaurant_name, f.farm_name, f.farmer_name
             FROM orders o
             LEFT JOIN products p ON o.product_id = p.id
             LEFT JOIN restaurants r ON o.restaurant_id = r.id
             LEFT JOIN farmers f ON o.farmer_id = f.id`;
  const params = [];
  if (status) { sql += ` WHERE o.status = ?`; params.push(status); }
  sql += ` ORDER BY o.id DESC`;
  return dbQuery(sql, params);
}

function dbAddOrder(data) {
  dbRun(`INSERT INTO orders (product_id, restaurant_id, farmer_id, quantity_kg, total_price, status, delivery_notes)
         VALUES (?, ?, ?, ?, ?, 'Pending', ?)`,
    [data.product_id, data.restaurant_id, data.farmer_id, data.quantity_kg, data.total_price, data.delivery_notes]);
}

function dbUpdateOrderStatus(orderId, newStatus) {
  dbRun(`UPDATE orders SET status = ? WHERE id = ?`, [newStatus, orderId]);
}

function dbGetStats() {
  const farmers = dbGetOne(`SELECT COUNT(*) as cnt FROM farmers`).cnt;
  const products = dbGetOne(`SELECT COUNT(*) as cnt FROM products WHERE is_active = 1`).cnt;
  const restaurants = dbGetOne(`SELECT COUNT(*) as cnt FROM restaurants`).cnt;
  const orders = dbGetOne(`SELECT COUNT(*) as cnt FROM orders`).cnt;
  return { farmers, products, restaurants, orders };
}

function dbGetOrderStats() {
  const statuses = ['Pending', 'Confirmed', 'In Transit', 'Delivered', 'Cancelled'];
  const stats = {};
  statuses.forEach(s => {
    stats[s] = dbGetOne(`SELECT COUNT(*) as cnt FROM orders WHERE status = ?`, [s]).cnt || 0;
  });
  stats.total = dbGetOne(`SELECT COUNT(*) as cnt FROM orders`).cnt;
  return stats;
}

function exportDB() {
  const rows = [];
  rows.push('-- FarmBridge Database Export');
  rows.push('-- Generated: ' + new Date().toISOString());
  rows.push('');

  ['farmers','restaurants','products','orders'].forEach(table => {
    rows.push(`-- Table: ${table}`);
    const data = dbQuery(`SELECT * FROM ${table}`);
    data.forEach(row => {
      const vals = Object.values(row).map(v => typeof v === 'string' ? `'${v.replace(/'/g,"''")}'` : v);
      rows.push(`INSERT INTO ${table} VALUES (${vals.join(', ')});`);
    });
    rows.push('');
  });

  const blob = new Blob([rows.join('\n')], { type: 'text/sql' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'farmbridge_export.sql';
  a.click();
  showToast('✅ SQL exported!', 'success');
}

function resetDatabase() {
  localStorage.removeItem('farmbridge_db');
  location.reload();
}