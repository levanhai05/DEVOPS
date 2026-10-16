import { Router } from "express";
import { db, transaction } from "../db.js";
import { auth, requireAdmin } from "../auth.js";
import { HttpError } from "../utils.js";

const r = Router();
const STATUSES = ["Chờ xử lý", "Đang giao", "Đã giao"];
const PROMOS = { HAI10: { percent: 10 }, FREESHIP: { freeship: true } };

const itemsOf = db.prepare("SELECT product_id AS id, name, price, qty FROM order_items WHERE order_id=? ORDER BY id");
const toOrder = (o) => ({
  id: o.id,
  date: o.created_at,
  total: o.total,
  subtotal: o.subtotal,
  discount: o.discount,
  shipping: o.shipping,
  count: o.count,
  promoCode: o.promo_code,
  status: o.status,
  customerName: o.customer_name,
  customerEmail: o.customer_email,
  items: itemsOf.all(o.id),
});

function newOrderId() {
  const exists = db.prepare("SELECT 1 FROM orders WHERE id=?");
  for (let i = 0; i < 10; i++) {
    const id = "HAI" + String(Math.floor(Math.random() * 1e6)).padStart(6, "0");
    if (!exists.get(id)) return id;
  }
  throw new HttpError(500, "Không tạo được mã đơn hàng");
}

// Server tự tính giá / giảm giá / phí ship / tồn kho, không tin dữ liệu giá từ client
const createOrder = transaction((user, items, code) => {
  const merged = new Map();
  for (const it of items) {
    const id = Number(it?.id);
    const qty = Number(it?.qty);
    if (!Number.isInteger(id) || !Number.isInteger(qty) || qty < 1 || qty > 99) {
      throw new HttpError(400, "Sản phẩm trong giỏ không hợp lệ");
    }
    merged.set(id, (merged.get(id) || 0) + qty);
  }
  if (!merged.size) throw new HttpError(400, "Giỏ hàng trống");

  const getP = db.prepare("SELECT * FROM products WHERE id=?");
  const lines = [];
  let subtotal = 0;
  for (const [id, qty] of merged) {
    const p = getP.get(id);
    if (!p) throw new HttpError(400, "Có sản phẩm không còn tồn tại, vui lòng tải lại giỏ hàng");
    if (p.stock < qty) throw new HttpError(409, `${p.name} không đủ hàng (còn ${p.stock})`);
    lines.push({ p, qty });
    subtotal += p.price * qty;
  }

  let promo = null;
  if (code) {
    promo = PROMOS[String(code).trim().toUpperCase()];
    if (!promo) throw new HttpError(400, "Mã giảm giá không hợp lệ");
  }
  const discount = promo?.percent ? Math.round((subtotal * promo.percent) / 100) : 0;
  const shipping = subtotal > 0 && subtotal < 1000000 && !promo?.freeship ? 30000 : 0;
  const total = Math.max(subtotal - discount, 0) + shipping;
  const count = lines.reduce((s, l) => s + l.qty, 0);
  const id = newOrderId();

  db.prepare(
    `INSERT INTO orders (id,user_id,customer_name,customer_email,subtotal,discount,shipping,total,count,promo_code)
     VALUES (?,?,?,?,?,?,?,?,?,?)`
  ).run(id, user.id, user.name, user.email, subtotal, discount, shipping, total, count,
        promo ? String(code).trim().toUpperCase() : null);
  const insItem = db.prepare("INSERT INTO order_items (order_id,product_id,name,price,qty) VALUES (?,?,?,?,?)");
  const dec = db.prepare("UPDATE products SET stock=stock-? WHERE id=? AND stock>=?");
  for (const { p, qty } of lines) {
    if (!dec.run(qty, p.id, qty).changes) throw new HttpError(409, `${p.name} không đủ hàng`);
    insItem.run(id, p.id, p.name, p.price, qty);
  }
  return id;
});

r.post("/", auth(), (req, res) => {
  const items = Array.isArray(req.body?.items) ? req.body.items : [];
  const id = createOrder(req.user, items, req.body?.code);
  res.status(201).json(toOrder(db.prepare("SELECT * FROM orders WHERE id=?").get(id)));
});

r.get("/mine", auth(), (req, res) => {
  const rows = db.prepare("SELECT * FROM orders WHERE user_id=? ORDER BY created_at DESC").all(req.user.id);
  res.json(rows.map(toOrder));
});

r.get("/", auth(), requireAdmin, (_req, res) => {
  res.json(db.prepare("SELECT * FROM orders ORDER BY created_at DESC").all().map(toOrder));
});

r.patch("/:id/status", auth(), requireAdmin, (req, res) => {
  const status = String(req.body?.status ?? "");
  if (!STATUSES.includes(status)) throw new HttpError(400, "Trạng thái không hợp lệ");
  const info = db.prepare("UPDATE orders SET status=? WHERE id=?").run(status, req.params.id);
  if (!info.changes) throw new HttpError(404, "Không tìm thấy đơn hàng");
  res.json(toOrder(db.prepare("SELECT * FROM orders WHERE id=?").get(req.params.id)));
});

export default r;
