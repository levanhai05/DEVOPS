import { useCallback, useEffect, useState } from "react";

const BASE = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");
const KEYS = {
  customer: { token: "hai_token", flag: "hai_customer_auth" },
  admin: { token: "hai_admin_token", flag: "hai_admin_auth" },
};

export function setSession(role, { token, user }) {
  const k = KEYS[role];
  localStorage.setItem(k.token, token);
  localStorage.setItem(k.flag, "1");
  if (role === "customer") {
    localStorage.setItem("hai_customer_email", user.email);
    localStorage.setItem("hai_customer_name", user.name);
  }
}

export function setToken(role, token) {
  localStorage.setItem(KEYS[role].token, token);
}

export function clearSession(role) {
  const k = KEYS[role];
  localStorage.removeItem(k.token);
  localStorage.removeItem(k.flag);
  if (role === "customer") {
    localStorage.removeItem("hai_customer_email");
    localStorage.removeItem("hai_customer_name");
  }
}

export async function api(path, { method = "GET", body, admin = false } = {}) {
  const role = admin ? "admin" : "customer";
  const token = localStorage.getItem(KEYS[role].token);
  let res;
  try {
    res = await fetch(`${BASE}/api${path}`, {
      method,
      headers: {
        ...(body ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error("Không kết nối được máy chủ");
  }
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { /* ignore */ }
  if (!res.ok) {
    if (res.status === 401 && token) {
      clearSession(role);
      if (admin) window.location.replace("/admin/login");
    }
    const err = new Error(data?.error || "Có lỗi xảy ra");
    err.status = res.status;
    throw err;
  }
  return data;
}

// Upload ảnh sản phẩm (admin). Trả về URL để lưu vào product.image
export async function uploadImage(file) {
  const token = localStorage.getItem(KEYS.admin.token);
  let res;
  try {
    res = await fetch(`${BASE}/api/uploads`, {
      method: "POST",
      headers: { "Content-Type": file.type || "application/octet-stream", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: file,
    });
  } catch {
    throw new Error("Không kết nối được máy chủ");
  }
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { /* ignore */ }
  if (!res.ok) throw new Error(data?.error || "Tải ảnh thất bại");
  // Khi API ở domain khác (VITE_API_URL) thì ghép domain để ảnh hiển thị được ở FE
  return `${BASE}${data.url}`;
}

export function useFetch(path, initial, admin = false) {
  const [data, setData] = useState(initial);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const load = useCallback(
    () =>
      api(path, { admin })
        .then((d) => { setData(d); setError(""); })
        .catch((e) => setError(e.message))
        .finally(() => setLoading(false)),
    [path, admin]
  );
  useEffect(() => { load(); }, [load]);
  return { data, setData, reload: load, loading, error };
}
