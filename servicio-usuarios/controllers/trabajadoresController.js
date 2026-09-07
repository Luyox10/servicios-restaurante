import bcrypt from "bcryptjs";
import { pool } from "../db/index.js";

// === CREAR TRABAJADOR ===
export const crearTrabajador = async (req, res) => {
  try {
    const { nombre, correo, contrasena, telefono, direccion } = req.body;

    // Validar campos obligatorios
    if (!nombre || !correo || !contrasena) {
      return res.status(400).json({ 
        error: "⚠️ Nombre, correo y contraseña son obligatorios." 
      });
    }

    console.log("📩 Creando trabajador:", { nombre, correo, telefono });

    // Verificar si el correo ya existe
    const checkUser = await pool.query(
      "SELECT id FROM usuarios WHERE correo = $1",
      [correo]
    );

    if (checkUser.rows.length > 0) {
      console.log("❌ Correo duplicado:", correo);
      return res.status(400).json({ error: "⚠️ El correo ya está registrado." });
    }

    // Encriptar contraseña
    const hashedPassword = await bcrypt.hash(contrasena, 10);

    // Insertar nuevo trabajador
    const insertQuery = `
      INSERT INTO usuarios (nombre, correo, contrasena, telefono, direccion, rol)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, nombre, correo, telefono, direccion, rol
    `;
    
    const result = await pool.query(insertQuery, [
      nombre,
      correo,
      hashedPassword,
      telefono || null,
      direccion || null,
      "trabajador",
    ]);

    const trabajador = result.rows[0];
    console.log("✅ Trabajador creado con ID:", trabajador.id);

    res.status(201).json({
      message: "✅ Trabajador creado exitosamente.",
      trabajador: trabajador
    });
  } catch (err) {
    console.error("💥 Error al crear trabajador:", err.message);
    res.status(500).json({ error: "❌ Error interno del servidor." });
  }
};


// === LISTAR TRABAJADORES ===
export const listarTrabajadores = async (req, res) => {
  try {
    // Verificar si existe la columna turno, si no, crearla
    try {
      const columnCheck = await pool.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'usuarios' AND column_name = 'turno'
      `);
      
      if (columnCheck.rows.length === 0) {
        await pool.query(`ALTER TABLE usuarios ADD COLUMN turno VARCHAR(20)`);
        console.log("✅ Columna 'turno' agregada a la tabla usuarios");
      }
    } catch (alterErr) {
      console.log("ℹ️ Columna turno ya existe o error al verificar:", alterErr.message);
    }

    const result = await pool.query(
      `SELECT id, nombre, correo, telefono, direccion, rol, turno 
       FROM usuarios 
       WHERE rol = 'trabajador' 
       ORDER BY nombre`
    );

    res.json({
      trabajadores: result.rows
    });
  } catch (err) {
    console.error("💥 Error al listar trabajadores:", err.message);
    res.status(500).json({ error: "❌ Error interno del servidor." });
  }
};

// === ASIGNAR TURNO A TRABAJADOR ===
export const asignarTurno = async (req, res) => {
  try {
    const { id } = req.params;
    const { turno } = req.body;

    console.log("🕐 Asignando turno, ID:", id, "Turno:", turno);

    // Validar que el ID sea un número
    const trabajadorId = parseInt(id);
    if (isNaN(trabajadorId)) {
      console.log("❌ ID inválido:", id);
      return res.status(400).setHeader('Content-Type', 'application/json').json({ 
        error: "⚠️ ID de trabajador inválido." 
      });
    }

    // Validar turno
    const turnosValidos = ['Mañana', 'Tarde', 'Noche'];
    if (turno && !turnosValidos.includes(turno)) {
      return res.status(400).setHeader('Content-Type', 'application/json').json({ 
        error: "⚠️ Turno inválido. Debe ser: Mañana, Tarde o Noche." 
      });
    }

    // Verificar si existe la columna turno, si no, crearla
    try {
      const columnCheck = await pool.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'usuarios' AND column_name = 'turno'
      `);
      
      if (columnCheck.rows.length === 0) {
        console.log("📝 Creando columna 'turno' en la tabla usuarios");
        await pool.query(`ALTER TABLE usuarios ADD COLUMN turno VARCHAR(20)`);
        console.log("✅ Columna 'turno' agregada a la tabla usuarios");
      } else {
        console.log("✅ Columna 'turno' ya existe");
      }
    } catch (alterErr) {
      console.error("❌ Error al verificar/crear columna turno:", alterErr.message);
      // Continuar de todas formas, puede que la columna ya exista
    }

    // Verificar que el trabajador existe
    const trabajadorCheck = await pool.query(
      "SELECT id, nombre FROM usuarios WHERE id = $1 AND rol = 'trabajador'",
      [trabajadorId]
    );

    if (trabajadorCheck.rows.length === 0) {
      console.log("❌ Trabajador no encontrado:", trabajadorId);
      return res.status(404).setHeader('Content-Type', 'application/json').json({ 
        error: "⚠️ Trabajador no encontrado." 
      });
    }

    console.log("✅ Trabajador encontrado:", trabajadorCheck.rows[0].nombre);

    // Actualizar turno del trabajador
    const updateResult = await pool.query(
      "UPDATE usuarios SET turno = $1 WHERE id = $2",
      [turno || null, trabajadorId]
    );

    console.log("📊 Resultado de actualización:", {
      rowCount: updateResult.rowCount,
      turno: turno,
      trabajadorId: trabajadorId
    });

    if (updateResult.rowCount === 0) {
      console.log("⚠️ No se actualizó ninguna fila");
      return res.status(404).setHeader('Content-Type', 'application/json').json({ 
        error: "⚠️ No se pudo actualizar el turno del trabajador." 
      });
    }

    console.log("✅ Turno asignado al trabajador:", trabajadorId, "Turno:", turno, "Filas afectadas:", updateResult.rowCount);

    res.status(200).setHeader('Content-Type', 'application/json').json({
      message: "✅ Turno asignado exitosamente.",
      turno: turno
    });
  } catch (err) {
    console.error("💥 Error al asignar turno:", err);
    console.error("💥 Stack:", err.stack);
    res.status(500).setHeader('Content-Type', 'application/json').json({ 
      error: "❌ Error interno del servidor: " + (err.message || "Error desconocido")
    });
  }
};

// === ELIMINAR TRABAJADOR ===
export const eliminarTrabajador = async (req, res) => {
  try {
    const { id } = req.params;
    console.log("🗑️ Intentando eliminar trabajador ID:", id);
    console.log("📋 Parámetros recibidos:", req.params);

    // Validar que el ID sea un número
    const trabajadorId = parseInt(id);
    if (isNaN(trabajadorId)) {
      console.log("❌ ID inválido:", id);
      return res.status(400).json({ error: "⚠️ ID de trabajador inválido." });
    }

    // Verificar que el trabajador existe y es un trabajador
    const trabajadorCheck = await pool.query(
      "SELECT id, nombre FROM usuarios WHERE id = $1 AND rol = 'trabajador'",
      [trabajadorId]
    );

    if (trabajadorCheck.rows.length === 0) {
      console.log("❌ Trabajador no encontrado o no es trabajador:", trabajadorId);
      return res.status(404).json({ error: "⚠️ Trabajador no encontrado." });
    }

    console.log("📋 Trabajador encontrado:", trabajadorCheck.rows[0].nombre);

    // Eliminar trabajador
    const deleteResult = await pool.query("DELETE FROM usuarios WHERE id = $1", [trabajadorId]);
    console.log("✅ Trabajador eliminado exitosamente:", trabajadorId, "Filas afectadas:", deleteResult.rowCount);

    if (deleteResult.rowCount === 0) {
      console.log("⚠️ No se eliminó ninguna fila");
      return res.status(404).json({ 
        error: "⚠️ No se pudo eliminar el trabajador. Puede que ya haya sido eliminado." 
      });
    }

    // Asegurar que la respuesta sea JSON válido
    res.status(200).setHeader('Content-Type', 'application/json').json({
      message: "✅ Trabajador eliminado exitosamente."
    });
  } catch (err) {
    console.error("💥 Error al eliminar trabajador:", err);
    console.error("💥 Stack:", err.stack);
    // Asegurar que la respuesta de error también sea JSON válido
    res.status(500).setHeader('Content-Type', 'application/json').json({ 
      error: "❌ Error interno del servidor: " + (err.message || "Error desconocido")
    });
  }
};

