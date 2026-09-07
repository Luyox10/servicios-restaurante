import { pool } from "./db/index.js";
import dotenv from "dotenv";

dotenv.config();

async function crearTablaHorarios() {
  try {
    console.log("🔧 Creando tabla 'horarios' en la base de datos...");
    
    // Crear la tabla horarios (estructura exacta como se creó en Neon)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS horarios (
        id SERIAL PRIMARY KEY,
        trabajador_id INTEGER NOT NULL,
        turno VARCHAR(20) NOT NULL,
        hora_inicio TIME NOT NULL,
        hora_fin TIME NOT NULL,
        activo BOOLEAN DEFAULT true,
        CONSTRAINT fk_trabajador
          FOREIGN KEY (trabajador_id)
          REFERENCES usuarios(id)
          ON DELETE CASCADE
      )
    `);
    
    console.log("✅ Tabla 'horarios' creada exitosamente");
    
    // Crear índices para mejorar el rendimiento
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_horarios_trabajador_id ON horarios(trabajador_id);
      CREATE INDEX IF NOT EXISTS idx_horarios_turno ON horarios(turno);
      CREATE INDEX IF NOT EXISTS idx_horarios_activo ON horarios(activo);
    `);
    
    console.log("✅ Índices creados exitosamente");
    
    // Verificar que la tabla se creó correctamente
    const verifyCheck = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'horarios'
      ORDER BY ordinal_position
    `);
    
    console.log("✅ Verificación de la tabla 'horarios':");
    verifyCheck.rows.forEach(col => {
      console.log(`   - ${col.column_name}: ${col.data_type} (${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'})`);
    });
    
    process.exit(0);
  } catch (err) {
    console.error("❌ Error al crear tabla:", err.message);
    console.error("❌ Detalles:", err);
    process.exit(1);
  }
}

crearTablaHorarios();

