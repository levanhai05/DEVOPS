import { test, before, after } from "node:test";
import assert from "node:assert/strict";

process.env.NODE_ENV = "test";
process.env.DB_PATH = ":memory:";
process.env.JWT_SECRET = "test-secret";
process.env.UPLOAD_DIR = (await import("node:fs")).mkdtempSync((await import("node:os")).tmpdir() + "/hai-uploads-");

let server, base;
before(async () => {
  const { default: app } = await import("../src/app.js");
  await new Promise((res) => (server = app.listen(0, res)));
  base = `http://127.0.0.1:${server.address().port}/api`;
});
after(() => server.close());

const call = async (path, { method = "GET", body, token } = {}) => {
  const res = await fetch(base + path, {
    method,
    headers: { ...(body ? { "Content-Type": "application/json" } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  return { status: res.status, data: text ? JSON.parse(text) : null };
};

let customer, admin;

test("health + danh sách sản phẩm seed", async () => {
  assert.equal((await call("/health")).data.status, "ok");
  const { data } = await call("/products");
  assert.equal(data.length, 8);
  assert.ok("old" in data[0] && "stock" in data[0]);
});

test("đăng ký / đăng nhập khách hàng", async () => {
  const bad = await call("/auth/register", { method: "POST", body: { name: "A", email: "x", password: "123456" } });
  assert.equal(bad.status, 400);
  const reg = await call("/auth/register", { method: "POST", body: { name: "Lê Văn Hải", email: "Hai@Test.com", password: "secret1" } });
  assert.equal(reg.status, 201);
  const dup = await call("/auth/register", { method: "POST", body: { name: "B", email: "hai@test.com", password: "secret1" } });
  assert.equal(dup.status, 409);
  const wrong = await call("/auth/login", { method: "POST", body: { email: "hai@test.com", password: "nope" } });
  assert.equal(wrong.status, 401);
  const ok = await call("/auth/login", { method: "POST", body: { email: "hai@test.com", password: "secret1" } });
  customer = ok.data.token;
  assert.equal(ok.data.user.role, "customer");
});

test("admin login: khách không vào được, admin vào được", async () => {
  const no = await call("/auth/admin/login", { method: "POST", body: { email: "hai@test.com", password: "secret1" } });
  assert.equal(no.status, 403);
  const ok = await call("/auth/admin/login", { method: "POST", body: { email: "admin@hai.vn", password: "admin123" } });
  assert.equal(ok.status, 200);
  admin = ok.data.token;
});

test("phân quyền", async () => {
  assert.equal((await call("/orders")).status, 401);
  assert.equal((await call("/orders", { token: customer })).status, 403);
  assert.equal((await call("/products", { method: "POST", token: customer, body: {} })).status, 403);
});

test("đặt hàng: server tự tính giá, trừ kho, áp mã", async () => {
  const before = (await call("/products/2")).data.stock; // Cloud Hoodie 990.000
  const res = await call("/orders", {
    method: "POST", token: customer,
    body: { items: [{ id: 2, qty: 2, price: 1 }], code: "hai10" }, // price từ client bị bỏ qua
  });
  assert.equal(res.status, 201);
  // 2 * 990000 = 1.980.000 ; giảm 10% = 198.000 ; free ship (>=1tr)
  assert.equal(res.data.subtotal, 1980000);
  assert.equal(res.data.discount, 198000);
  assert.equal(res.data.shipping, 0);
  assert.equal(res.data.total, 1782000);
  assert.equal(res.data.status, "Chờ xử lý");
  assert.equal((await call("/products/2")).data.stock, before - 2);
  const small = await call("/orders", { method: "POST", token: customer, body: { items: [{ id: 5, qty: 1 }] } });
  assert.equal(small.data.shipping, 30000);
  assert.equal(small.data.total, 450000);
});

test("đặt hàng: lỗi hết hàng / mã sai / giỏ rỗng", async () => {
  assert.equal((await call("/orders", { method: "POST", token: customer, body: { items: [{ id: 2, qty: 50 }] } })).status, 409);
  assert.equal((await call("/orders", { method: "POST", token: customer, body: { items: [{ id: 1, qty: 1 }], code: "XXX" } })).status, 400);
  assert.equal((await call("/orders", { method: "POST", token: customer, body: { items: [] } })).status, 400);
});

test("đơn của tôi + admin xem/đổi trạng thái", async () => {
  const mine = await call("/orders/mine", { token: customer });
  assert.equal(mine.data.length, 2);
  const all = await call("/orders", { token: admin });
  assert.equal(all.data.length, 2);
  const id = all.data[0].id;
  const up = await call(`/orders/${id}/status`, { method: "PATCH", token: admin, body: { status: "Đã giao" } });
  assert.equal(up.data.status, "Đã giao");
  assert.equal((await call(`/orders/${id}/status`, { method: "PATCH", token: admin, body: { status: "??" } })).status, 400);
});

test("admin CRUD sản phẩm", async () => {
  const body = { name: "Test Cap", category: "Phụ kiện", price: 100000, old: 150000, image: "https://x.test/a.jpg", tag: "Mới", stock: 5 };
  const c = await call("/products", { method: "POST", token: admin, body });
  assert.equal(c.status, 201);
  const id = c.data.id;
  const u = await call(`/products/${id}`, { method: "PUT", token: admin, body: { price: 90000, stock: 9 } });
  assert.equal(u.data.price, 90000);
  assert.equal(u.data.stock, 9);
  assert.equal(u.data.name, "Test Cap");
  assert.equal((await call("/products", { method: "POST", token: admin, body: { ...body, price: -1 } })).status, 400);
  assert.equal((await call(`/products/${id}`, { method: "DELETE", token: admin })).status, 204);
  assert.equal((await call(`/products/${id}`)).status, 404);
});

test("reviews + profile", async () => {
  const list = await call("/products/1/reviews");
  assert.equal(list.data.length, 3);
  const add = await call("/products/1/reviews", { method: "POST", token: customer, body: { rating: 4, comment: "Tốt" } });
  assert.equal(add.status, 201);
  assert.equal(add.data.name, "Lê Văn Hải");
  assert.equal((await call("/products/1/reviews", { method: "POST", body: { name: "A", rating: 9, comment: "x" } })).status, 400);
  const me = await call("/auth/me", { method: "PUT", token: customer, body: { name: "Hải", phone: "0901234567", address: "Đà Nẵng" } });
  assert.equal(me.data.phone, "0901234567");
  assert.equal((await call("/auth/me", { token: customer })).data.address, "Đà Nẵng");
});

test("đổi mật khẩu: sai mật khẩu cũ, thành công, token cũ hết hạn", async () => {
  const oldToken = customer;
  const bad = await call("/auth/change-password", { method: "POST", token: oldToken, body: { currentPassword: "sai", newPassword: "newpass1" } });
  assert.equal(bad.status, 400);
  const short = await call("/auth/change-password", { method: "POST", token: oldToken, body: { currentPassword: "secret1", newPassword: "123" } });
  assert.equal(short.status, 400);
  const ok = await call("/auth/change-password", { method: "POST", token: oldToken, body: { currentPassword: "secret1", newPassword: "newpass1" } });
  assert.equal(ok.status, 200);
  assert.equal((await call("/auth/me", { token: oldToken })).status, 401);
  customer = ok.data.token;
  assert.equal((await call("/auth/me", { token: customer })).status, 200);
  assert.equal((await call("/auth/login", { method: "POST", body: { email: "hai@test.com", password: "secret1" } })).status, 401);
  assert.equal((await call("/auth/login", { method: "POST", body: { email: "hai@test.com", password: "newpass1" } })).status, 200);
});

test("quên mật khẩu → đặt lại bằng token (dùng 1 lần)", async () => {
  const { outbox } = await import("../src/mailer.js");
  outbox.length = 0;
  const none = await call("/auth/forgot-password", { method: "POST", body: { email: "khongco@test.com" } });
  assert.equal(none.status, 200);
  assert.equal(outbox.length, 0); // không lộ email có tồn tại hay không
  const ok = await call("/auth/forgot-password", { method: "POST", body: { email: "hai@test.com" } });
  assert.equal(ok.status, 200);
  assert.equal(outbox.length, 1);
  const token = /token=([a-f0-9]{64})/.exec(outbox[0].text)[1];
  assert.equal((await call("/auth/reset-password", { method: "POST", body: { token: "x".repeat(64), password: "another1" } })).status, 400);
  assert.equal((await call("/auth/reset-password", { method: "POST", body: { token, password: "123" } })).status, 400);
  const reset = await call("/auth/reset-password", { method: "POST", body: { token, password: "another1" } });
  assert.equal(reset.status, 200);
  assert.equal((await call("/auth/reset-password", { method: "POST", body: { token, password: "another2" } })).status, 400);
  assert.equal((await call("/auth/me", { token: customer })).status, 401);
  assert.equal((await call("/auth/login", { method: "POST", body: { email: "hai@test.com", password: "another1" } })).status, 200);
});

test("upload ảnh sản phẩm: chỉ admin, chỉ nhận ảnh thật, dùng được cho sản phẩm", async () => {
  const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(32)]);
  const up = (token, body, type = "image/png") =>
    fetch(base + "/uploads", { method: "POST", headers: { "Content-Type": type, ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body });
  assert.equal((await up(null, png)).status, 401);
  const cust = (await call("/auth/register", { method: "POST", body: { name: "Khách Upload", email: "upload@test.com", password: "secret1" } })).data.token;
  assert.equal((await up(cust, png)).status, 403);
  assert.equal((await up(admin, Buffer.from("<svg onload=alert(1)></svg>".padEnd(40, " ")), "image/png")).status, 400);
  assert.equal((await up(admin, Buffer.alloc(6 * 1024 * 1024, 1))).status, 413);
  const ok = await up(admin, png);
  assert.equal(ok.status, 201);
  const { url } = await ok.json();
  assert.match(url, /^\/uploads\/[\w.-]+\.png$/);
  assert.equal((await fetch(base.replace("/api", "") + url)).status, 200);
  const body = { name: "Img Test", category: "Phụ kiện", price: 1000, image: url, stock: 1 };
  assert.equal((await call("/products", { method: "POST", token: admin, body })).status, 201);
  assert.equal((await call("/products", { method: "POST", token: admin, body: { ...body, image: "/etc/passwd" } })).status, 400);
});
