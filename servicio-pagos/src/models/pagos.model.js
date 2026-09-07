import { pool } from "../db.js";

// Crear pago con estado definido
export const crearPago = async ({ pedido_id, metodo_pago, monto_total, estado, fecha_cliente }) => {
  let query;
  let params;
  
  // Si viene fecha_cliente, usarla (ya viene en formato ISO desde el cliente)
  // Si no, usar la fecha actual en zona horaria de Perú
  if (fecha_cliente) {
    try {
      // Convertir la fecha ISO del cliente a timestamp con zona horaria de Perú
      // PostgreSQL puede parsear directamente strings ISO, luego convertimos a zona horaria de Perú
      query = `
        INSERT INTO pagos (pedido_id, metodo_pago, monto_total, estado, fecha_pago)
        VALUES ($1, $2, $3, $4, 
          (($5::timestamp with time zone AT TIME ZONE 'UTC') AT TIME ZONE 'America/Lima')
        ) 
        RETURNING *
      `;
      params = [pedido_id, metodo_pago, monto_total, estado, fecha_cliente];
    } catch (err) {
      console.error("Error al parsear fecha_cliente, usando fecha actual:", err);
      query = `
        INSERT INTO pagos (pedido_id, metodo_pago, monto_total, estado, fecha_pago)
        VALUES ($1, $2, $3, $4, (NOW() AT TIME ZONE 'America/Lima')) 
        RETURNING *
      `;
      params = [pedido_id, metodo_pago, monto_total, estado];
    }
  } else {
    query = `
      INSERT INTO pagos (pedido_id, metodo_pago, monto_total, estado, fecha_pago)
      VALUES ($1, $2, $3, $4, (NOW() AT TIME ZONE 'America/Lima')) 
      RETURNING *
    `;
    params = [pedido_id, metodo_pago, monto_total, estado];
  }
  
  console.log("💳 Creando pago con fecha_cliente:", fecha_cliente);
  console.log("💳 Datos:", { pedido_id, metodo_pago, monto_total, estado });
  
  const result = await pool.query(query, params);
  console.log("✅ Pago creado:", result.rows[0]);
  console.log("📅 Fecha del pago guardada:", result.rows[0].fecha_pago);
  return result.rows[0];
};

// Listar pagos pendientes (orden ascendente por id)
export const listarPagosPendientes = async () => {
  const result = await pool.query(
    `SELECT * FROM pagos WHERE estado='pendiente' ORDER BY id ASC`
  );
  return result.rows;
};

// Listar pagos completados (orden ascendente por id)
export const listarPagosCompletados = async () => {
  const result = await pool.query(
    `SELECT * FROM pagos WHERE estado='completado' ORDER BY id ASC`
  );
  return result.rows;
};

// Listar todos los pagos (orden ascendente por id)
export const listarTodosPagos = async () => {
  // Verificar si existe la tabla de historial
  let tablaHistorialExiste = false;
  try {
    const checkTable = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'historial_estados_pagos'
      )
    `);
    tablaHistorialExiste = checkTable.rows[0]?.exists || false;
  } catch (checkErr) {
    console.log("No se pudo verificar tabla historial:", checkErr.message);
    tablaHistorialExiste = false;
  }
  
  let query = `SELECT p.*`;
  
  // Agregar subconsultas de historial solo si la tabla existe
  if (tablaHistorialExiste) {
    query += `,
             COALESCE(
               (SELECT trabajador_nombre FROM historial_estados_pagos 
                WHERE id_pago = p.id 
                ORDER BY fecha_cambio DESC LIMIT 1),
               NULL
             ) AS ultimo_cambio_por,
             (SELECT fecha_cambio FROM historial_estados_pagos 
              WHERE id_pago = p.id 
              ORDER BY fecha_cambio DESC LIMIT 1) AS fecha_ultimo_cambio`;
  } else {
    query += `, NULL AS ultimo_cambio_por, NULL AS fecha_ultimo_cambio`;
  }
  
  query += ` FROM pagos p ORDER BY p.id ASC`;
  
  const result = await pool.query(query);
  return result.rows;
};

// Confirmar pago (solo para Yape)
export const confirmarPago = async (id, trabajador_id = null, trabajador_nombre = null) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    
    // Obtener el estado anterior
    const estadoAnterior = await client.query("SELECT estado FROM pagos WHERE id=$1", [id]);
    const estadoPrev = estadoAnterior.rows[0]?.estado || "pendiente";
    
    // Si el pago no tiene fecha_pago o es muy antigua, actualizarla a la fecha actual de Perú
    const result = await client.query(
      `UPDATE pagos 
       SET estado='completado',
           fecha_pago = COALESCE(fecha_pago, NOW() AT TIME ZONE 'America/Lima')
       WHERE id=$1 
       RETURNING *`,
      [id]
    );
    
    // Crear tabla de historial si no existe
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS historial_estados_pagos (
          id_historial SERIAL PRIMARY KEY,
          id_pago INTEGER NOT NULL,
          estado_anterior VARCHAR(50),
          estado_nuevo VARCHAR(50) NOT NULL,
          trabajador_id INTEGER,
          trabajador_nombre VARCHAR(255),
          fecha_cambio TIMESTAMP DEFAULT (NOW() AT TIME ZONE 'America/Lima')
        )
      `);
    } catch (createErr) {
      console.log("Tabla de historial ya existe o error al crearla:", createErr.message);
    }
    
    // Registrar en historial
    const resultadoHistorial = await client.query(`
      INSERT INTO historial_estados_pagos (id_pago, estado_anterior, estado_nuevo, trabajador_id, trabajador_nombre, fecha_cambio)
      VALUES ($1, $2, $3, $4, $5, NOW() AT TIME ZONE 'America/Lima')
      RETURNING id_historial, fecha_cambio
    `, [id, estadoPrev, "completado", trabajador_id || null, trabajador_nombre || null]);
    
    console.log("✅ Historial guardado:", {
      id_historial: resultadoHistorial.rows[0]?.id_historial,
      fecha_cambio: resultadoHistorial.rows[0]?.fecha_cambio,
      trabajador_nombre: trabajador_nombre
    });
    
    await client.query("COMMIT");
    console.log("✅ Pago confirmado:", result.rows[0]);
    return result.rows[0];
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ Error al confirmar pago:", err);
    throw err;
  } finally {
    client.release();
  }
};

// Obtener total del día (pagos completados del día actual en zona horaria de Perú)
export const obtenerTotalDelDia = async () => {
  try {
    // Primero obtener la fecha actual en Perú
    const fechaActual = await pool.query(`SELECT (NOW() AT TIME ZONE 'America/Lima')::date as hoy`);
    const hoy = fechaActual.rows[0]?.hoy;
    
    console.log("📅 Fecha actual en Perú:", hoy);
    
    const result = await pool.query(
      `SELECT COALESCE(SUM(monto_total), 0) as total, COUNT(*) as cantidad
       FROM pagos 
       WHERE estado = 'completado' 
       AND DATE(fecha_pago AT TIME ZONE 'America/Lima') = $1`,
      [hoy]
    );
    
    const total = parseFloat(result.rows[0]?.total || 0);
    const cantidad = parseInt(result.rows[0]?.cantidad || 0);
    
    console.log("📊 Total del día calculado:", total, "de", cantidad, "pagos completados");
    
    // Debug: ver todos los pagos completados
    const debugQuery = await pool.query(
      `SELECT id, monto_total, estado, fecha_pago, 
              DATE(fecha_pago AT TIME ZONE 'America/Lima') as fecha_peru
       FROM pagos 
       WHERE estado = 'completado'
       ORDER BY fecha_pago DESC
       LIMIT 10`
    );
    console.log("🔍 Últimos 10 pagos completados:", debugQuery.rows);
    
    return total;
  } catch (err) {
    console.error("❌ Error al obtener total del día:", err);
    return 0;
  }
};

// Obtener total general (todos los pagos completados)
export const obtenerTotalGeneral = async () => {
  try {
    const result = await pool.query(
      `SELECT COALESCE(SUM(monto_total), 0) as total, COUNT(*) as cantidad
       FROM pagos 
       WHERE estado = 'completado'`
    );
    
    const total = parseFloat(result.rows[0]?.total || 0);
    const cantidad = parseInt(result.rows[0]?.cantidad || 0);
    
    console.log("📊 Total general calculado:", total, "de", cantidad, "pagos completados");
    
    // Debug: verificar si hay pagos
    const allPagos = await pool.query(
      `SELECT COUNT(*) as total_pagos, 
              COUNT(CASE WHEN estado = 'completado' THEN 1 END) as completados,
              COUNT(CASE WHEN estado = 'pendiente' THEN 1 END) as pendientes
       FROM pagos`
    );
    console.log("🔍 Resumen de pagos:", allPagos.rows[0]);
    
    return total;
  } catch (err) {
    console.error("❌ Error al obtener total general:", err);
    return 0;
  }
};

// Obtener pago por ID de pago
export const obtenerPagoPorId = async (id) => {
  try {
    const result = await pool.query(
      `SELECT * FROM pagos WHERE id = $1`,
      [id]
    );
    return result.rows[0] || null;
  } catch (err) {
    console.error("❌ Error al obtener pago por ID:", err);
    return null;
  }
};

// Obtener pago por ID de pedido
export const obtenerPagoPorPedido = async (pedido_id) => {
  try {
    const result = await pool.query(
      `SELECT * FROM pagos WHERE pedido_id = $1 ORDER BY id DESC LIMIT 1`,
      [pedido_id]
    );
    return result.rows[0] || null;
  } catch (err) {
    console.error("❌ Error al obtener pago por pedido:", err);
    return null;
  }
};