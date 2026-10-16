// Gửi email qua SMTP nếu có cấu hình SMTP_HOST; nếu không thì in nội dung ra console (dev)
export const outbox = []; // chỉ dùng cho test

export async function sendMail({ to, subject, text }) {
  if (process.env.NODE_ENV === "test") {
    outbox.push({ to, subject, text });
    return;
  }
  if (!process.env.SMTP_HOST) {
    console.log(`\n[mail:dev] Chưa cấu hình SMTP, nội dung email:\nTo: ${to}\nSubject: ${subject}\n\n${text}\n`);
    return;
  }
  const { default: nodemailer } = await import("nodemailer");
  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === "true",
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
  });
  await transport.sendMail({ from: process.env.MAIL_FROM || process.env.SMTP_USER, to, subject, text });
}
