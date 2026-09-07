import { pool } from "../db/index.js";

// === CREAR HORARIO ===
export const crearHorario = async (req, res) => {
  // Asegurar que siempre devolvamos JSON
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  
  try {
    console.log("📝 Creando horario, body:", req.body);
    console.log("📝 URL:", req.url);
    console.log("📝 Método:", req.method);
    
    const { trabajador_id, turno, hora_inicio, hora_fin, activo } = req.body;

    // Validar campos obligatorios
    if (!trabajador_id || !turno || !hora_inicio || !hora_fin) {
      console.log("❌ Campos faltantes:", { trabajador_id, turno, hora_inicio, hora_fin });
      return res.status(400).json({ 
        error: "⚠️ Todos los campos son obligatorios: trabajador_id, turno, hora_inicio, hora_fin." 
      });
    }

    // Validar turno
    const turnosValidos = ['Mañana', 'Tarde', 'Noche'];
    if (!turnosValidos.includes(turno)) {
      return res.status(400).json({ 
        error: "⚠️ Turno inválido. Debe ser: Mañana, Tarde o Noche." 
      });
    }

    // Verificar que el trabajador existe y tiene rol "trabajador"
    const trabajadorCheck = await pool.query(
      "SELECT id, nombre, rol FROM usuarios WHERE id = $1",
      [trabajador_id]
    );

    if (trabajadorCheck.rows.length === 0) {
      return res.status(404).setHeader('Content-Type', 'application/json').json({ 
        error: "⚠️ Usuario no encontrado." 
      });
    }

    if (trabajadorCheck.rows[0].rol !== 'trabajador') {
      return res.status(400).setHeader('Content-Type', 'application/json').json({ 
        error: "⚠️ Solo los usuarios con rol 'trabajador' pueden tener horarios asociados." 
      });
    }

    // Verificar si la tabla existe, si no, crearla
    try {
      const tableCheck = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'horarios'
        )
      `);
      
      if (!tableCheck.rows[0].exists) {
        console.log("📝 Creando tabla horarios...");
        await pool.query(`
          CREATE TABLE horarios (
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
        console.log("✅ Tabla horarios creada");
      }
    } catch (tableErr) {
      console.error("⚠️ Error al verificar/crear tabla horarios:", tableErr.message);
      // Continuar de todas formas
    }

    // Verificar que no exista un horario activo para el mismo trabajador y turno
    try {
      const horarioExistente = await pool.query(
        "SELECT id FROM horarios WHERE trabajador_id = $1 AND turno = $2 AND activo = true",
        [trabajador_id, turno]
      );

      if (horarioExistente.rows.length > 0) {
        return res.status(400).setHeader('Content-Type', 'application/json').json({ 
          error: "⚠️ Ya existe un horario activo para este trabajador en el turno " + turno + "." 
        });
      }
    } catch (checkErr) {
      console.error("⚠️ Error al verificar horario existente:", checkErr.message);
      // Continuar de todas formas
    }

    // Insertar nuevo horario (activo por defecto)
    const activoValue = activo !== undefined ? (activo === true || activo === 'true' || activo === 1) : true;
    const result = await pool.query(
      `INSERT INTO horarios (trabajador_id, turno, hora_inicio, hora_fin, activo)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [trabajador_id, turno, hora_inicio, hora_fin, activoValue]
    );

    console.log("✅ Horario creado:", result.rows[0].id);

    res.status(201).json({
      message: "✅ Horario creado exitosamente.",
      horario: result.rows[0]
    });
  } catch (err) {
    console.error("💥 Error al crear horario:", err.message);
    console.error("💥 Stack:", err.stack);
    res.status(500).json({ 
      error: "❌ Error interno del servidor: " + (err.message || "Error desconocido")
    });
  }
};

// === LISTAR HORARIOS ===
export const listarHorarios = async (req, res) => {
  // Asegurar que siempre devolvamos JSON
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  
  try {
    console.log("📋 Listando horarios, query:", req.query);
    
    // Verificar si la tabla existe
    try {
      const tableCheck = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'horarios'
        )
      `);
      
      if (!tableCheck.rows[0].exists) {
        console.log("ℹ️ Tabla horarios no existe, retornando lista vacía");
        return res.status(200).json({
          horarios: []
        });
      }
    } catch (tableErr) {
      console.error("⚠️ Error al verificar tabla:", tableErr.message);
      return res.status(200).json({
        horarios: []
      });
    }

    const { trabajador_id } = req.query;

    let query = `
      SELECT h.*, u.nombre as trabajador_nombre, u.rol
      FROM horarios h
      INNER JOIN usuarios u ON h.trabajador_id = u.id
      WHERE u.rol = 'trabajador'
    `;
    const params = [];

    if (trabajador_id) {
      query += " AND h.trabajador_id = $1";
      params.push(trabajador_id);
    }

    // Filtrar solo horarios activos si no se especifica trabajador_id
    // Si se especifica trabajador_id, mostrar todos (activos e inactivos) para gestión completa
    if (!trabajador_id) {
      query += " AND h.activo = true";
    }

    query += " ORDER BY h.trabajador_id, h.turno, h.hora_inicio";

    const result = await pool.query(query, params);

    console.log("✅ Horarios encontrados:", result.rows.length);

    res.status(200).json({
      horarios: result.rows
    });
  } catch (err) {
    console.error("💥 Error al listar horarios:", err);
    console.error("💥 Stack:", err.stack);
    res.status(500).json({ 
      error: "❌ Error interno del servidor: " + (err.message || "Error desconocido")
    });
  }
};

// === ACTUALIZAR HORARIO ===
export const actualizarHorario = async (req, res) => {
  // Asegurar que siempre devolvamos JSON
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  
  try {
    console.log("📝 Actualizando horario, params:", req.params, "body:", req.body);
    
    const { id } = req.params;
    const { turno, hora_inicio, hora_fin, activo } = req.body;

    const horarioId = parseInt(id);
    if (isNaN(horarioId)) {
      return res.status(400).setHeader('Content-Type', 'application/json').json({ 
        error: "⚠️ ID de horario inválido." 
      });
    }

    // Validar campos obligatorios
    if (turno === undefined || hora_inicio === undefined || hora_fin === undefined || activo === undefined) {
      return res.status(400).json({ 
        error: "⚠️ Todos los campos son obligatorios: turno, hora_inicio, hora_fin, activo." 
      });
    }

    // Validar turno
    const turnosValidos = ['Mañana', 'Tarde', 'Noche'];
    if (!turnosValidos.includes(turno)) {
      return res.status(400).json({ 
        error: "⚠️ Turno inválido. Debe ser: Mañana, Tarde o Noche." 
      });
    }

    // Verificar que el horario existe
    const horarioCheck = await pool.query(
      "SELECT trabajador_id FROM horarios WHERE id = $1",
      [horarioId]
    );

    if (horarioCheck.rows.length === 0) {
      return res.status(404).setHeader('Content-Type', 'application/json').json({ 
        error: "⚠️ Horario no encontrado." 
      });
    }

    const trabajadorId = horarioCheck.rows[0].trabajador_id;

    // Verificar que el trabajador existe y es trabajador
    const trabajadorCheck = await pool.query(
      "SELECT id, nombre FROM usuarios WHERE id = $1 AND rol = 'trabajador'",
      [trabajadorId]
    );

    if (trabajadorCheck.rows.length === 0) {
      return res.status(404).json({ 
        error: "⚠️ Trabajador asociado no encontrado o no es un trabajador." 
      });
    }

    // Si el horario se está activando, verificar que no exista otro horario activo para el mismo trabajador y turno
    if (activo === true || activo === 'true') {
      const horarioExistente = await pool.query(
        "SELECT id FROM horarios WHERE trabajador_id = $1 AND turno = $2 AND activo = true AND id != $3",
        [trabajadorId, turno, horarioId]
      );

      if (horarioExistente.rows.length > 0) {
        return res.status(400).setHeader('Content-Type', 'application/json').json({ 
          error: "⚠️ Ya existe un horario activo para este trabajador en el turno " + turno + "." 
        });
      }
    }

    // Actualizar horario
    const activoValue = activo === true || activo === 'true' || activo === 1;
    const result = await pool.query(
      `UPDATE horarios 
       SET turno = $1, hora_inicio = $2, hora_fin = $3, activo = $4 
       WHERE id = $5 
       RETURNING *`,
      [turno, hora_inicio, hora_fin, activoValue, horarioId]
    );

    console.log("✅ Horario actualizado:", result.rows[0].id);

    res.status(200).json({
      message: "✅ Horario actualizado exitosamente.",
      horario: result.rows[0]
    });
  } catch (err) {
    console.error("💥 Error al actualizar horario:", err.message);
    console.error("💥 Stack:", err.stack);
    res.status(500).json({ 
      error: "❌ Error interno del servidor: " + (err.message || "Error desconocido")
    });
  }
};

// === ELIMINAR HORARIO ===
export const eliminarHorario = async (req, res) => {
  // Asegurar que siempre devolvamos JSON
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  
  try {
    const { id } = req.params;

    const horarioId = parseInt(id);
    if (isNaN(horarioId)) {
      return res.status(400).json({ 
        error: "⚠️ ID de horario inválido." 
      });
    }

    // Verificar que el horario existe
    const horarioCheck = await pool.query(
      "SELECT id FROM horarios WHERE id = $1",
      [horarioId]
    );

    if (horarioCheck.rows.length === 0) {
      return res.status(404).json({ 
        error: "⚠️ Horario no encontrado." 
      });
    }

    // Marcar como inactivo en lugar de eliminar físicamente
    const result = await pool.query(
      "UPDATE horarios SET activo = false WHERE id = $1 RETURNING *",
      [horarioId]
    );

    console.log("✅ Horario eliminado (marcado como inactivo):", horarioId);

    res.status(200).json({
      message: "✅ Horario eliminado exitosamente."
    });
  } catch (err) {
    console.error("💥 Error al eliminar horario:", err.message);
    console.error("💥 Stack:", err.stack);
    res.status(500).json({ 
      error: "❌ Error interno del servidor: " + (err.message || "Error desconocido")
    });
  }
};

