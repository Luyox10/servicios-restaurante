import { pool } from "./db/index.js";
import dotenv from "dotenv";

dotenv.config();

async function eliminarTablaHorarios() {
  try {
    console.log("🗑️ Eliminando tabla horarios_trabajadores...");
    
    // Verificar si la tabla existe
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'horarios_trabajadores'
      )
    `);
    
    if (tableCheck.rows[0].exists) {
      // Eliminar la tabla
      await pool.query("DROP TABLE IF EXISTS horarios_trabajadores CASCADE");
      console.log("✅ Tabla horarios_trabajadores eliminada exitosamente");
    } else {
      console.log("ℹ️ La tabla horarios_trabajadores no existe");
    }
    
    process.exit(0);
  } catch (err) {
    console.error("❌ Error al eliminar tabla:", err.message);
    process.exit(1);
  }
}

eliminarTablaHorarios();

