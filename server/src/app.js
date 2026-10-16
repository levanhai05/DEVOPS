import express from "express";
import cors from "cors";
import helmet from "helmet";
import { db } from "./db.js";
import authRoutes from "./routes/auth.js";
import productRoutes from "./routes/products.js";
import orderRoutes from "./routes/orders.js";
import uploadRoutes, { uploadDir } from "./routes/uploads.js";

const app = express();
app.disable("x-powered-by");
app.set("trust proxy", 1);
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));

const origins = (process.env.CORS_ORIGIN || "").split(",").map((s) => s.trim()).filter(Boolean);
app.use(cors({ origin: origins.length ? origins : true }));
app.use(express.json({ limit: "100kb" }));

app.get("/api/health", (_req, res) => {
  db.prepare("SELECT 1").get();
  res.json({ status: "ok" });
});
app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/uploads", uploadRoutes);
app.use("/uploads", express.static(uploadDir, { index: false, maxAge: "7d", immutable: true }));
app.use("/api", (_req, res) => res.status(404).json({ error: "Không tìm thấy API" }));

// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  if (err.type === "entity.too.large") return res.status(413).json({ error: "Ảnh quá lớn (tối đa 5MB)" });
  if (err.type === "entity.parse.failed") return res.status(400).json({ error: "JSON không hợp lệ" });
  if (err.status && err.status < 500) return res.status(err.status).json({ error: err.message });
  console.error(err);
  res.status(500).json({ error: "Lỗi máy chủ" });
});

export default app;
