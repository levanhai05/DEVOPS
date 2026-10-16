import { Router } from "express";
import express from "express";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { auth, requireAdmin } from "../auth.js";
import { HttpError } from "../utils.js";

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const uploadDir = path.resolve(process.env.UPLOAD_DIR || path.join("data", "uploads"));
fs.mkdirSync(uploadDir, { recursive: true });

// Nhận diện định dạng bằng magic bytes (không tin Content-Type / tên file từ client)
function detectExt(b) {
  if (b.length < 12) return null;
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "jpg";
  if (b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "png";
  if (b.subarray(0, 4).toString("latin1") === "GIF8") return "gif";
  if (b.subarray(0, 4).toString("latin1") === "RIFF" && b.subarray(8, 12).toString("latin1") === "WEBP") return "webp";
  return null;
}

const r = Router();

// Body là file ảnh thô (raw binary), không phải multipart -> không cần thêm thư viện
r.post(
  "/",
  auth(),
  requireAdmin,
  express.raw({ type: () => true, limit: MAX_IMAGE_BYTES }),
  async (req, res) => {
    if (!Buffer.isBuffer(req.body) || !req.body.length) throw new HttpError(400, "Chưa chọn ảnh");
    const ext = detectExt(req.body);
    if (!ext) throw new HttpError(400, "Chỉ nhận ảnh JPG, PNG, WEBP hoặc GIF");
    const name = `${Date.now()}-${crypto.randomBytes(8).toString("hex")}.${ext}`;
    await fs.promises.writeFile(path.join(uploadDir, name), req.body);
    res.status(201).json({ url: `/uploads/${name}` });
  }
);

export default r;
