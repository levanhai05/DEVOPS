import { Router } from "express";
import { db } from "../db.js";
import { auth, requireAdmin } from "../auth.js";
import { HttpError } from "../utils.js";

const r = Router();

const toProduct = (p) => ({
  id: p.id,
  name: p.name,
  category: p.category,
  price: p.price,
  old: p.old_price,
  rating: p.rating,
  image: p.image,
  tag: p.tag,
  stock: p.stock,
});
const toReview = (v) => ({ id: v.id, name: v.name, rating: v.rating, comment: v.comment, date: v.created_at });

function parseProduct(b = {}) {
  const name = String(b.name ?? "").trim();
  const image = String(b.image ?? "").trim();
  const category = String(b.category ?? "").trim();
  const tag = String(b.tag ?? "").trim();
  const price = Number(b.price);
  const old = b.old === undefined || b.old === "" || b.old === null ? price : Number(b.old);
  const stock = b.stock === undefined ? 0 : Number(b.stock);
  const rating = b.rating === undefined ? 5 : Number(b.rating);
  if (!name || name.length > 120) throw new HttpError(400, "Tên sản phẩm không hợp lệ");
  if (!/^https?:\/\//i.test(image) && !/^\/uploads\/[\w.-]+$/.test(image)) throw new HttpError(400, "Ảnh sản phẩm phải là URL http(s) hoặc ảnh đã tải lên");
  if (!category) throw new HttpError(400, "Thiếu danh mục");
  if (!Number.isInteger(price) || price < 0) throw new HttpError(400, "Giá bán không hợp lệ");
  if (!Number.isInteger(old) || old < 0) throw new HttpError(400, "Giá gốc không hợp lệ");
  if (!Number.isInteger(stock) || stock < 0) throw new HttpError(400, "Tồn kho không hợp lệ");
  if (!(rating >= 0 && rating <= 5)) throw new HttpError(400, "Đánh giá không hợp lệ");
  return { name, image, category, tag, price, old, stock, rating };
}

r.get("/", (req, res) => {
  const { category } = req.query;
  const rows = category
    ? db.prepare("SELECT * FROM products WHERE category=? ORDER BY id DESC").all(String(category))
    : db.prepare("SELECT * FROM products ORDER BY id DESC").all();
  res.json(rows.map(toProduct));
});

r.get("/:id", (req, res) => {
  const p = db.prepare("SELECT * FROM products WHERE id=?").get(Number(req.params.id));
  if (!p) throw new HttpError(404, "Không tìm thấy sản phẩm");
  res.json(toProduct(p));
});

r.post("/", auth(), requireAdmin, (req, res) => {
  const p = parseProduct(req.body);
  const info = db
    .prepare("INSERT INTO products (name,category,price,old_price,rating,image,tag,stock) VALUES (?,?,?,?,?,?,?,?)")
    .run(p.name, p.category, p.price, p.old, p.rating, p.image, p.tag, p.stock);
  res.status(201).json(toProduct(db.prepare("SELECT * FROM products WHERE id=?").get(info.lastInsertRowid)));
});

r.put("/:id", auth(), requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  const cur = db.prepare("SELECT * FROM products WHERE id=?").get(id);
  if (!cur) throw new HttpError(404, "Không tìm thấy sản phẩm");
  const p = parseProduct({
    name: cur.name, image: cur.image, category: cur.category, tag: cur.tag,
    price: cur.price, old: cur.old_price, stock: cur.stock, rating: cur.rating,
    ...req.body,
  });
  db.prepare("UPDATE products SET name=?,category=?,price=?,old_price=?,rating=?,image=?,tag=?,stock=? WHERE id=?")
    .run(p.name, p.category, p.price, p.old, p.rating, p.image, p.tag, p.stock, id);
  res.json(toProduct(db.prepare("SELECT * FROM products WHERE id=?").get(id)));
});

r.delete("/:id", auth(), requireAdmin, (req, res) => {
  const info = db.prepare("DELETE FROM products WHERE id=?").run(Number(req.params.id));
  if (!info.changes) throw new HttpError(404, "Không tìm thấy sản phẩm");
  res.status(204).end();
});

// ----- Reviews -----
r.get("/:id/reviews", (req, res) => {
  const rows = db
    .prepare("SELECT * FROM reviews WHERE product_id=? ORDER BY created_at DESC, id DESC")
    .all(Number(req.params.id));
  res.json(rows.map(toReview));
});

r.post("/:id/reviews", auth(false), (req, res) => {
  const id = Number(req.params.id);
  if (!db.prepare("SELECT 1 FROM products WHERE id=?").get(id)) throw new HttpError(404, "Không tìm thấy sản phẩm");
  const name = String(req.body?.name ?? req.user?.name ?? "").trim();
  const comment = String(req.body?.comment ?? "").trim();
  const rating = Number(req.body?.rating);
  if (!name || name.length > 80) throw new HttpError(400, "Tên không hợp lệ");
  if (!comment || comment.length > 1000) throw new HttpError(400, "Nội dung đánh giá không hợp lệ");
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) throw new HttpError(400, "Số sao phải từ 1 đến 5");
  const info = db
    .prepare("INSERT INTO reviews (product_id,user_id,name,rating,comment) VALUES (?,?,?,?,?)")
    .run(id, req.user?.id ?? null, name, rating, comment);
  res.status(201).json(toReview(db.prepare("SELECT * FROM reviews WHERE id=?").get(info.lastInsertRowid)));
});

export default r;
