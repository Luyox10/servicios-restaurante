import { pool } from "./db/index.js";
import dotenv from "dotenv";

dotenv.config();

async function agregarColumnaTurno() {
  try {
    console.log("🔧 Verificando si existe la columna 'turno' en la tabla usuarios...");
    
    // Verificar si la columna existe
    const columnCheck = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'usuarios' AND column_name = 'turno'
    `);
    
    if (columnCheck.rows.length > 0) {
      console.log("✅ La columna 'turno' ya existe en la tabla usuarios");
      process.exit(0);
    }
    
    console.log("📝 Agregando columna 'turno' a la tabla usuarios...");
    
    // Agregar la columna
    await pool.query(`
      ALTER TABLE usuarios 
      ADD COLUMN turno VARCHAR(20)
    `);
    
    console.log("✅ Columna 'turno' agregada exitosamente a la tabla usuarios");
    
    // Verificar que se agregó correctamente
    const verifyCheck = await pool.query(`
      SELECT column_name, data_type, character_maximum_length
      FROM information_schema.columns 
      WHERE table_name = 'usuarios' AND column_name = 'turno'
    `);
    
    if (verifyCheck.rows.length > 0) {
      console.log("✅ Verificación exitosa:");
      console.log("   - Nombre: ", verifyCheck.rows[0].column_name);
      console.log("   - Tipo: ", verifyCheck.rows[0].data_type);
      console.log("   - Longitud máxima: ", verifyCheck.rows[0].character_maximum_length);
    }
    
    process.exit(0);
  } catch (err) {
    console.error("❌ Error al agregar columna:", err.message);
    console.error("❌ Detalles:", err);
    process.exit(1);
  }
}

agregarColumnaTurno();

