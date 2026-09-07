import pg from "pg";
import dotenv from "dotenv";
dotenv.config();

const { Pool } = pg;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false },
  connectionTimeoutMillis: 10000, // 10 segundos timeout
  idleTimeoutMillis: 30000,
  max: 20
});

// Manejo de errores de conexión
pool.on('error', (err) => {
  console.error('❌ Error inesperado en el pool de conexiones:', err);
});

// Intentar conectar con manejo de errores mejorado
(async () => {
  try {
    const client = await pool.connect();
    console.log("✅ Conectado a PostgreSQL (servicio pagos)");
    client.release();
  } catch (err) {
    console.error("❌ Error al conectar DB:", err.message);
    console.error("💡 Verifica que DATABASE_URL esté configurado correctamente en el archivo .env");
    // No detener la aplicación, permitir que intente reconectar más tarde
  }
})();
