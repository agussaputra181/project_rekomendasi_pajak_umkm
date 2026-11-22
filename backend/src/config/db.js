// Menyambungkan ke database MongoDB menggunakan Mongoose
const mongoose = require('mongoose');

async function connectDB() {
    try {
        const conn = await mongoose.connect(process.env.MONGO_URI);
        console.log(`MongoDB tersambung: ${conn.connection.host}`);
    } catch (error) {
        console.error("Gagal menyambungkan ke MongoDB:", error.message);
        process.exit(1); // tanpa database, API tidak bisa bekerja
    }
}

module.exports = connectDB;