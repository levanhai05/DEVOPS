import "dotenv/config";

const { default: app } = await import("./app.js");
const port = Number(process.env.PORT) || 4000;
const server = app.listen(port, () => console.log(`HAI Shop API đang chạy tại http://localhost:${port}`));

const stop = () => server.close(() => process.exit(0));
process.on("SIGTERM", stop);
process.on("SIGINT", stop);
