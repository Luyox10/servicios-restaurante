import pkg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pkg;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized:false }
});

(async()=>{
  try{
    const client = await pool.connect();
    console.log("✅ Conexión a PostgreSQL Neon exitosa");
    client.release();
  }catch(err){ console.error("❌ Error al conectar DB:", err.message); }
})();
