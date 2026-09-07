import { pool } from "../config/db.js";
import fetch from "node-fetch";

// Crear pedido
const crearPedido = async (req, res) => {
  const { cliente = {}, direccion = {}, tipo_servicio, metodo_pago, monto_total, total, detalles = [] } = req.body;
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    let id_cliente = null;
    let id_direccion = null;

    // Registrar cliente + dirección
    if (tipo_servicio === "domicilio") {
      const q1 = `INSERT INTO clientes (nombre, telefono) VALUES ($1,$2) RETURNING id_cliente;`;
      const rCliente = await client.query(q1, [cliente.nombre || "Cliente Delivery", cliente.telefono || "Sin teléfono"]);
      id_cliente = rCliente.rows[0].id_cliente;

      const q2 = `INSERT INTO direcciones (id_cliente, calle_avenida, referencia) VALUES ($1,$2,$3) RETURNING id_direccion;`;
      const rDireccion = await client.query(q2, [id_cliente, direccion.calle_avenida || "Sin dirección", direccion.referencia || ""]);
      id_direccion = rDireccion.rows[0].id_direccion;
    }

    // Calcular monto final
    let montoFinal = (metodo_pago?.toLowerCase() === "efectivo") ? parseFloat(monto_total || total) : detalles.reduce((a, i) => a + (parseFloat(i.subtotal)||0), 0);
    if (isNaN(montoFinal)) montoFinal = 0;

    // Registrar pedido con fecha en zona horaria de Perú (America/Lima)
    // Usar NOW() y convertirlo directamente a la zona horaria de Perú
    // Esto obtiene la hora actual del servidor y la convierte a hora de Perú
    const q3 = `INSERT INTO pedidos (id_cliente, id_direccion, tipo_servicio, metodo_pago, monto_total, estado, fecha_pedido) 
                VALUES ($1,$2,$3,$4,$5,'pendiente',
                  (NOW() AT TIME ZONE 'America/Lima')
                ) RETURNING id_pedido;`;
    const rPedido = await client.query(q3, [id_cliente, id_direccion, tipo_servicio, metodo_pago, montoFinal]);
    const id_pedido = rPedido.rows[0].id_pedido;

    // Detalles
    if (detalles.length > 0) {
      const q4 = `INSERT INTO detalles_pedido (id_pedido, id_producto_mongo, nombre_producto, cantidad, precio_unitario, subtotal) VALUES ($1,$2,$3,$4,$5,$6);`;
      for (const item of detalles) {
        await client.query(q4, [id_pedido, item.id_producto_mongo, item.nombre_producto, item.cantidad, item.precio_unitario, item.subtotal]);
      }
    }

    await client.query("COMMIT");

    // Microservicio pagos
    try {
      const estadoPago = (metodo_pago?.toLowerCase() === "efectivo") ? "completado" : "pendiente";
      await fetch("http://localhost:4002/pagos/crear", {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ pedido_id:id_pedido, metodo_pago, monto_total:montoFinal, estado:estadoPago })
      });
    } catch (err) { console.error("⚠️ Error microservicio pagos:", err.message); }

    return res.status(201).json({ ok:true, id_pedido, monto_total:montoFinal });

  } catch (error) {
    await client.query("ROLLBACK");
    console.error("❌ Error crear pedido:", error.message);
    return res.status(500).json({ ok:false, error:error.message });
  } finally { client.release(); }
};

// Listar pedidos
const listarPedidos = async (req,res) => {
  try {
    // Primero verificar si existe la tabla de historial
    let tablaHistorialExiste = false;
    try {
      const checkTable = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'historial_estados_pedidos'
        )
      `);
      tablaHistorialExiste = checkTable.rows[0]?.exists || false;
    } catch (checkErr) {
      console.log("No se pudo verificar tabla historial:", checkErr.message);
      tablaHistorialExiste = false;
    }
    
    // Construir la consulta base
    let q = `SELECT p.*, c.nombre AS cliente_nombre, d.calle_avenida,
               CASE 
                 WHEN p.fecha_pedido IS NOT NULL THEN 
                   (p.fecha_pedido::text || '-05:00')
                 ELSE NULL
               END AS fecha_pedido_iso`;
    
    // Agregar subconsultas de historial solo si la tabla existe
    if (tablaHistorialExiste) {
      q += `,
               COALESCE(
                 (SELECT trabajador_nombre FROM historial_estados_pedidos 
                  WHERE id_pedido = p.id_pedido 
                  ORDER BY fecha_cambio DESC LIMIT 1),
                 'N/A'
               ) AS ultimo_cambio_por,
               (SELECT fecha_cambio FROM historial_estados_pedidos 
                WHERE id_pedido = p.id_pedido 
                ORDER BY fecha_cambio DESC LIMIT 1) AS fecha_ultimo_cambio`;
    } else {
      q += `, 'N/A' AS ultimo_cambio_por, NULL AS fecha_ultimo_cambio`;
    }
    
    q += ` FROM pedidos p 
               LEFT JOIN clientes c ON c.id_cliente=p.id_cliente 
               LEFT JOIN direcciones d ON d.id_direccion=p.id_direccion 
               ORDER BY p.id_pedido;`;
    
    const r = await pool.query(q);
    // Usar fecha_pedido_iso para que el frontend lo interprete como hora de Perú
    const pedidos = r.rows.map(row => {
      const pedido = { ...row };
      if (row.fecha_pedido_iso) {
        // Convertir formato 'YYYY-MM-DD HH:MI:SS-05:00' a 'YYYY-MM-DDTHH:MI:SS-05:00'
        pedido.fecha_pedido = row.fecha_pedido_iso.replace(' ', 'T');
      }
      delete pedido.fecha_pedido_iso;
      return pedido;
    });
    res.json(pedidos);
  } catch(err){ 
    console.error("Error al listar pedidos:", err);
    res.status(500).json({ ok:false, error:err.message }); 
  }
};

// Obtener pedido por ID
const obtenerPedidoPorId = async (req,res) => {
  try {
    const r = await pool.query(`SELECT * FROM pedidos WHERE id_pedido=$1`, [req.params.id]);
    if(!r.rows.length) return res.status(404).json({ ok:false, message:"Pedido no encontrado" });
    res.json({ ok:true, pedido:r.rows[0] });
  } catch(err){ res.status(500).json({ ok:false, error:err.message }); }
};

// Actualizar estado pedido
const actualizarEstadoPedido = async (req,res) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    
    const { estado, trabajador_id, trabajador_nombre } = req.body;
    const { id } = req.params;
    
    console.log("📥 Recibido actualizar estado:", { id, estado, trabajador_id, trabajador_nombre });
    
    if(!estado) return res.status(400).json({ ok:false, error:"Estado requerido" });
    const permitidos=["pendiente","en preparación","en preparacion","en camino","entregado"];
    if(!permitidos.includes(estado.toLowerCase())) return res.status(400).json({ ok:false, error:"Estado no permitido" });
    
    // Obtener el estado anterior
    const estadoAnterior = await client.query("SELECT estado FROM pedidos WHERE id_pedido=$1", [id]);
    const estadoPrev = estadoAnterior.rows[0]?.estado || "pendiente";
    
    // Actualizar estado del pedido
    await client.query("UPDATE pedidos SET estado=$1 WHERE id_pedido=$2",[estado,id]);
    
    // Crear tabla de historial si no existe (sin foreign key primero para evitar errores)
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS historial_estados_pedidos (
          id_historial SERIAL PRIMARY KEY,
          id_pedido INTEGER NOT NULL,
          estado_anterior VARCHAR(50),
          estado_nuevo VARCHAR(50) NOT NULL,
          trabajador_id INTEGER,
          trabajador_nombre VARCHAR(255),
          fecha_cambio TIMESTAMP DEFAULT (NOW() AT TIME ZONE 'America/Lima')
        )
      `);
    } catch (createErr) {
      // Si la tabla ya existe o hay otro error, continuar
      console.log("Tabla de historial ya existe o error al crearla:", createErr.message);
    }
    
    // Registrar en historial
    const valoresHistorial = [id, estadoPrev, estado, trabajador_id || null, trabajador_nombre || null];
    console.log("💾 Guardando en historial:", valoresHistorial);
    
    await client.query(`
      INSERT INTO historial_estados_pedidos (id_pedido, estado_anterior, estado_nuevo, trabajador_id, trabajador_nombre)
      VALUES ($1, $2, $3, $4, $5)
    `, valoresHistorial);
    
    await client.query("COMMIT");
    console.log("✅ Estado actualizado y guardado en historial");
    res.json({ ok:true, message:"Estado actualizado" });
  } catch(err){ 
    await client.query("ROLLBACK");
    res.status(500).json({ ok:false, error:err.message }); 
  } finally {
    client.release();
  }
};

// Seguimiento por pedido_id
const seguimientoPedido = async (req,res) => {
  try {
    const q = `
      SELECT p.id_pedido,p.estado AS estadoPedido,p.tipo_servicio,p.metodo_pago,p.monto_total,p.fecha_pedido,c.nombre AS cliente_nombre,d.calle_avenida,d.referencia
      FROM pedidos p
      LEFT JOIN clientes c ON p.id_cliente=c.id_cliente
      LEFT JOIN direcciones d ON p.id_direccion=d.id_direccion
      WHERE p.id_pedido=$1 LIMIT 1;`;
    const r = await pool.query(q,[req.params.id]);
    if(!r.rows.length) return res.status(404).json({ ok:false, message:"Pedido no encontrado" });
    const pedido=r.rows[0];

    // Microservicio pagos
    let estadoPago="pendiente";
    try {
      const resp = await fetch(`http://localhost:4002/pagos/${pedido.id_pedido}`);
      if(resp.ok){ const data=await resp.json(); estadoPago=data.estado||estadoPago; }
    } catch(err){ console.error("⚠️ Error microservicio pagos:", err.message); }

    return res.json({ ok:true, pedido:{
      idPedido:pedido.id_pedido,
      estadoPedido:pedido.estadopedido,
      estadoPago,
      tipoServicio:pedido.tipo_servicio,
      metodoPago:pedido.metodo_pago,
      monto_total:pedido.monto_total,
      fecha_pedido:pedido.fecha_pedido,
      cliente_nombre:pedido.cliente_nombre,
      direccion:pedido.calle_avenida,
      referencia:pedido.referencia
    }});
  } catch(err){ console.error(err.message); return res.status(500).json({ ok:false, error:err.message }); }
};

// Seguimiento por cliente (pedido activo)
const seguimientoPorCliente = async (req,res)=>{
  try{
    const q=`SELECT p.id_pedido,p.estado AS estadoPedido,p.tipo_servicio,p.metodo_pago,p.monto_total,p.fecha_pedido FROM pedidos p WHERE p.id_cliente=$1 AND p.estado!='entregado' ORDER BY p.fecha_pedido DESC LIMIT 1;`;
    const r=await pool.query(q,[req.params.idCliente]);
    if(!r.rows.length) return res.json({ ok:false, pedido:null });
    const pedido=r.rows[0];

    let estadoPago="pendiente";
    try{
      const resp=await fetch(`http://localhost:4002/pagos/${pedido.id_pedido}`);
      if(resp.ok){ const data=await resp.json(); estadoPago=data.estado||estadoPago; }
    }catch(err){ console.error(err.message); }

    return res.json({ ok:true, pedido:{
      idPedido:pedido.id_pedido,
      estadoPedido:pedido.estadopedido,
      estadoPago,
      tipoServicio:pedido.tipo_servicio,
      metodoPago:pedido.metodo_pago,
      monto_total:pedido.monto_total,
      fecha_pedido:pedido.fecha_pedido
    }});
  }catch(err){ console.error(err.message); return res.status(500).json({ ok:false, error:err.message }); }
};

export const PedidoController={
  crearPedido,
  listarPedidos,
  obtenerPedidoPorId,
  actualizarEstadoPedido,
  seguimientoPedido,
  seguimientoPorCliente
};
