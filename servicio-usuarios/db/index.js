import pkg from "pg";
import dotenv from "dotenv";

dotenv.config();
const { Pool } = pkg;

// 🔹 Conexión al pool de PostgreSQL
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});


// ✅ Verificación de conexión
pool.connect()
  .then(() => console.log("📦 Base de datos conectada correctamente"))
  .catch((err) => console.error("💥 Error al conectar la base de datos:", err));
