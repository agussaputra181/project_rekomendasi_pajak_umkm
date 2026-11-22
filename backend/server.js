// Titik masuk aplikasi: baca .env, sambungkan database, lalu jalankan server.
require("dotenv").config();

const app = require("./src/app");
const connectDB = require("./src/config/db");

const PORT = process.env.PORT || 5000;

async function startServer() {
  await connectDB(); // tunggu database tersambung dulu
  app.listen(PORT, () => {
    console.log(`Server berjalan di http://localhost:${PORT}`);
  });
}

startServer();
