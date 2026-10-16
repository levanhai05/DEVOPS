import jwt from "jsonwebtoken";
import { db } from "./db.js";

if (process.env.NODE_ENV === "production" && !process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET là bắt buộc khi chạy production");
}
const secret = process.env.JWT_SECRET || "dev-only-secret-change-me";

export const signToken = (u) => jwt.sign({ sub: u.id, role: u.role, tv: u.token_version ?? 0 }, secret, { expiresIn: "7d" });

export const publicUser = (u) => ({
  id: u.id,
  name: u.name,
  email: u.email,
  role: u.role,
  phone: u.phone || "",
  address: u.address || "",
});

const getUser = db.prepare("SELECT id,name,email,role,phone,address,token_version FROM users WHERE id=?");

// required=false: có token hợp lệ thì gắn req.user, không có thì bỏ qua
export const auth = (required = true) => (req, res, next) => {
  const h = req.headers.authorization || "";
  const token = h.startsWith("Bearer ") ? h.slice(7) : null;
  if (!token) return required ? res.status(401).json({ error: "Bạn chưa đăng nhập" }) : next();
  try {
    const payload = jwt.verify(token, secret);
    const user = getUser.get(payload.sub);
    if (!user || (payload.tv ?? 0) !== user.token_version) throw new Error("invalid session");
    req.user = user;
    next();
  } catch {
    if (!required) return next();
    res.status(401).json({ error: "Phiên đăng nhập không hợp lệ hoặc đã hết hạn" });
  }
};

export const requireAdmin = (req, res, next) =>
  req.user?.role === "admin" ? next() : res.status(403).json({ error: "Bạn không có quyền truy cập" });
