import { Router } from "express";
import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import rateLimit from "express-rate-limit";
import { db, transaction } from "../db.js";
import { sendMail } from "../mailer.js";
import { auth, signToken, publicUser } from "../auth.js";
import { HttpError } from "../utils.js";

const r = Router();
const limiter =
  process.env.NODE_ENV === "test"
    ? (_req, _res, next) => next()
    : rateLimit({
        windowMs: 15 * 60 * 1000,
        limit: 30,
        standardHeaders: true,
        legacyHeaders: false,
        message: { error: "Thử lại sau ít phút" },
      });

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const norm = (v) => String(v ?? "").trim().toLowerCase();

r.post("/register", limiter, async (req, res) => {
  const name = String(req.body?.name ?? "").trim();
  const email = norm(req.body?.email);
  const password = String(req.body?.password ?? "");
  if (!name || name.length > 80) throw new HttpError(400, "Họ tên không hợp lệ");
  if (!EMAIL_RE.test(email)) throw new HttpError(400, "Email không hợp lệ");
  if (password.length < 6) throw new HttpError(400, "Mật khẩu tối thiểu 6 ký tự");
  if (db.prepare("SELECT 1 FROM users WHERE email=?").get(email)) throw new HttpError(409, "Email đã được đăng ký");
  const hash = await bcrypt.hash(password, 10);
  const info = db.prepare("INSERT INTO users (name,email,password_hash) VALUES (?,?,?)").run(name, email, hash);
  const user = db.prepare("SELECT * FROM users WHERE id=?").get(info.lastInsertRowid);
  res.status(201).json({ token: signToken(user), user: publicUser(user) });
});

async function login(req, res, adminOnly) {
  const email = norm(req.body?.email);
  const password = String(req.body?.password ?? "");
  const user = db.prepare("SELECT * FROM users WHERE email=?").get(email);
  const ok = user && (await bcrypt.compare(password, user.password_hash));
  if (!ok) throw new HttpError(401, "Email hoặc mật khẩu không đúng");
  if (adminOnly && user.role !== "admin") throw new HttpError(403, "Tài khoản không có quyền quản trị");
  res.json({ token: signToken(user), user: publicUser(user) });
}
r.post("/login", limiter, (req, res) => login(req, res, false));
r.post("/admin/login", limiter, (req, res) => login(req, res, true));

r.get("/me", auth(), (req, res) => res.json(publicUser(req.user)));

r.put("/me", auth(), (req, res) => {
  const name = String(req.body?.name ?? req.user.name).trim();
  const phone = String(req.body?.phone ?? req.user.phone ?? "").trim();
  const address = String(req.body?.address ?? req.user.address ?? "").trim();
  if (!name || name.length > 80) throw new HttpError(400, "Họ tên không hợp lệ");
  if (phone.length > 20 || address.length > 200) throw new HttpError(400, "Thông tin quá dài");
  db.prepare("UPDATE users SET name=?, phone=?, address=? WHERE id=?").run(name, phone, address, req.user.id);
  res.json(publicUser({ ...req.user, name, phone, address }));
});

// ----- Đổi mật khẩu / Quên mật khẩu -----
const sha = (v) => crypto.createHash("sha256").update(v).digest("hex");
const checkNewPassword = (pw) => {
  if (pw.length < 6) throw new HttpError(400, "Mật khẩu tối thiểu 6 ký tự");
  if (pw.length > 72) throw new HttpError(400, "Mật khẩu tối đa 72 ký tự");
};

r.post("/change-password", auth(), limiter, async (req, res) => {
  const current = String(req.body?.currentPassword ?? "");
  const next = String(req.body?.newPassword ?? "");
  checkNewPassword(next);
  const row = db.prepare("SELECT * FROM users WHERE id=?").get(req.user.id);
  // dùng 400 (không phải 401) để FE không tự đăng xuất khi nhập sai mật khẩu hiện tại
  if (!(await bcrypt.compare(current, row.password_hash))) throw new HttpError(400, "Mật khẩu hiện tại không đúng");
  if (current === next) throw new HttpError(400, "Mật khẩu mới phải khác mật khẩu hiện tại");
  const hash = await bcrypt.hash(next, 10);
  // tăng token_version để mọi token cũ (thiết bị khác) hết hiệu lực
  db.prepare("UPDATE users SET password_hash=?, token_version=token_version+1 WHERE id=?").run(hash, req.user.id);
  res.json({ token: signToken(db.prepare("SELECT * FROM users WHERE id=?").get(req.user.id)) });
});

r.post("/forgot-password", limiter, (req, res) => {
  const email = norm(req.body?.email);
  const user = EMAIL_RE.test(email) ? db.prepare("SELECT id,name,email FROM users WHERE email=?").get(email) : null;
  if (user) {
    const token = crypto.randomBytes(32).toString("hex");
    db.prepare("DELETE FROM password_resets WHERE user_id=? OR expires_at < ?").run(user.id, new Date().toISOString());
    db.prepare("INSERT INTO password_resets (user_id,token_hash,expires_at) VALUES (?,?,?)").run(
      user.id, sha(token), new Date(Date.now() + 30 * 60 * 1000).toISOString()
    );
    const base = (process.env.APP_URL || "http://localhost:5173").replace(/\/$/, "");
    sendMail({
      to: user.email,
      subject: "Đặt lại mật khẩu HAI Shop",
      text: `Xin chào ${user.name},\n\nBấm vào liên kết sau để đặt lại mật khẩu (hết hạn sau 30 phút):\n${base}/reset-password?token=${token}\n\nNếu bạn không yêu cầu, hãy bỏ qua email này.`,
    }).catch((e) => console.error("[mail] gửi thất bại:", e.message));
  }
  // luôn trả cùng một phản hồi để không lộ email nào đã đăng ký
  res.json({ message: "Nếu email tồn tại, liên kết đặt lại mật khẩu đã được gửi." });
});

r.post("/reset-password", limiter, async (req, res) => {
  const token = String(req.body?.token ?? "");
  const password = String(req.body?.password ?? "");
  checkNewPassword(password);
  const row = db.prepare("SELECT * FROM password_resets WHERE token_hash=?").get(sha(token));
  if (!row || row.expires_at < new Date().toISOString()) {
    throw new HttpError(400, "Liên kết không hợp lệ hoặc đã hết hạn");
  }
  const hash = await bcrypt.hash(password, 10);
  transaction(() => {
    // xoá token trước: dùng 1 lần duy nhất, chặn dùng song song
    if (!db.prepare("DELETE FROM password_resets WHERE token_hash=?").run(sha(token)).changes) {
      throw new HttpError(400, "Liên kết không hợp lệ hoặc đã hết hạn");
    }
    db.prepare("UPDATE users SET password_hash=?, token_version=token_version+1 WHERE id=?").run(hash, row.user_id);
    db.prepare("DELETE FROM password_resets WHERE user_id=?").run(row.user_id);
  })();
  res.json({ message: "Đã đặt lại mật khẩu" });
});

export default r;
