import { DatabaseSync } from "node:sqlite";
import bcrypt from "bcryptjs";
import fs from "node:fs";
import path from "node:path";

const dbPath = process.env.DB_PATH || path.resolve("data", "hai.db");
if (dbPath !== ":memory:") fs.mkdirSync(path.dirname(dbPath), { recursive: true });

export const db = new DatabaseSync(dbPath);
db.exec("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;");

// node:sqlite chưa có db.transaction() nên tự viết helper
export const transaction = (fn) => (...args) => {
  db.exec("BEGIN");
  try {
    const result = fn(...args);
    db.exec("COMMIT");
    return result;
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }
};

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'customer',
  phone TEXT NOT NULL DEFAULT '',
  address TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  price INTEGER NOT NULL,
  old_price INTEGER NOT NULL,
  rating REAL NOT NULL DEFAULT 5,
  image TEXT NOT NULL,
  tag TEXT NOT NULL DEFAULT '',
  stock INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL DEFAULT '',
  customer_email TEXT NOT NULL DEFAULT '',
  subtotal INTEGER NOT NULL,
  discount INTEGER NOT NULL DEFAULT 0,
  shipping INTEGER NOT NULL DEFAULT 0,
  total INTEGER NOT NULL,
  count INTEGER NOT NULL,
  promo_code TEXT,
  status TEXT NOT NULL DEFAULT 'Chờ xử lý',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE TABLE IF NOT EXISTS order_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  price INTEGER NOT NULL,
  qty INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  rating INTEGER NOT NULL,
  comment TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_reviews_product ON reviews(product_id);
`);

// Migration cho DB đã tồn tại
if (!db.prepare("PRAGMA table_info(users)").all().some((c) => c.name === "token_version")) {
  db.exec("ALTER TABLE users ADD COLUMN token_version INTEGER NOT NULL DEFAULT 0");
}
db.exec(`
CREATE TABLE IF NOT EXISTS password_resets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL
);
`);

// ---------- Seed ----------
const img = (id) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=900&q=85`;
const SEED_PRODUCTS = [
  [1, "Aero Runner", "Giày", 1890000, 2290000, 4.9, "photo-1542291026-7eec264c27ff", "Bán chạy", 24],
  [2, "Cloud Hoodie", "Thời trang", 990000, 1290000, 4.8, "photo-1556821840-3a63f95609a7", "Mới", 8],
  [3, "Mono Backpack", "Phụ kiện", 790000, 950000, 4.7, "photo-1553062407-98eeb64c6a62", "Hot", 42],
  [4, "Nova Watch", "Phụ kiện", 2490000, 2990000, 4.9, "photo-1524805444758-089113d48a6d", "-17%", 15],
  [5, "Essential Tee", "Thời trang", 420000, 520000, 4.6, "photo-1521572163474-6864f9cf17ab", "Sale", 67],
  [6, "Daily Tote", "Phụ kiện", 620000, 760000, 4.8, "photo-1594223274512-ad4803739b7c", "Mới", 24],
  [7, "Street Jacket", "Thời trang", 1590000, 1890000, 4.7, "photo-1551488831-00ddcb6c6bd3", "Limited", 8],
  [8, "Trail Sneaker", "Giày", 2190000, 2590000, 4.9, "photo-1549298916-b41d501d3772", "Hot", 42],
];
const SEED_REVIEWS = [
  ["Nguyễn Minh Anh", 5, "2026-09-12T08:00:00.000Z", "Chất lượng vượt mong đợi, giao hàng nhanh. Mình sẽ ủng hộ shop dài dài!"],
  ["Trần Gia Huy", 4, "2026-09-08T08:00:00.000Z", "Sản phẩm đẹp, đúng như hình. Trừ 1 sao vì đóng gói hơi đơn giản."],
  ["Lê Khánh Linh", 5, "2026-09-01T08:00:00.000Z", "Form chuẩn, chất liệu mát và bền. Rất đáng tiền."],
];

if (db.prepare("SELECT COUNT(*) c FROM products").get().c === 0) {
  const insP = db.prepare(
    "INSERT INTO products (id,name,category,price,old_price,rating,image,tag,stock) VALUES (?,?,?,?,?,?,?,?,?)"
  );
  const insR = db.prepare("INSERT INTO reviews (product_id,name,rating,comment,created_at) VALUES (?,?,?,?,?)");
  transaction(() => {
    for (const [id, name, cat, price, old, rating, photo, tag, stock] of SEED_PRODUCTS) {
      insP.run(id, name, cat, price, old, rating, img(photo), tag, stock);
      for (const [rn, rr, rd, rc] of SEED_REVIEWS) insR.run(id, rn, rr, rc, rd);
    }
  })();
}

if (!db.prepare("SELECT 1 FROM users WHERE role='admin'").get()) {
  const email = (process.env.ADMIN_EMAIL || "admin@hai.vn").trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD || "admin123";
  db.prepare("INSERT OR IGNORE INTO users (name,email,password_hash,role) VALUES (?,?,?, 'admin')").run(
    "Quản trị viên",
    email,
    bcrypt.hashSync(password, 10)
  );
  if (process.env.NODE_ENV !== "test") console.log(`[seed] Tạo tài khoản admin: ${email}`);
}
