// src/models/pedidos.model.js
import pool from "../config/db.js";

// Crear pedido
const crearPedido = async (pedidoData) => {
  const {
    id_cliente,
    id_direccion,
    tipo_servicio,
    metodo_pago,
    monto_total,
    estado,
    fecha_pedido,
  } = pedidoData;

  const query = `
    INSERT INTO pedidos 
      (id_cliente, id_direccion, tipo_servicio, metodo_pago, monto_total, estado, fecha_pedido)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *;
  `;

  const values = [
    id_cliente,
    id_direccion,
    tipo_servicio,
    metodo_pago,
    monto_total,
    estado || 'pendiente',
    fecha_pedido || new Date(),
  ];

  const { rows } = await pool.query(query, values);
  return rows[0];
};

// Listar todos los pedidos con detalles
const listarPedidos = async () => {
  const query = `
    SELECT 
      p.id_pedido,
      p.tipo_servicio,
      p.metodo_pago,
      p.monto_total,
      p.estado,
      p.fecha_pedido,
      c.nombre AS cliente,
      d.calle_avenida AS direccion,
      json_agg(
        json_build_object(
          'id_detalle', dp.id_detalle,
          'nombre_producto', dp.nombre_producto,
          'cantidad', dp.cantidad,
          'precio_unitario', dp.precio_unitario,
          'subtotal', dp.subtotal
        )
      ) AS detalles
    FROM pedidos p
    LEFT JOIN clientes c ON p.id_cliente = c.id_cliente
    LEFT JOIN direcciones d ON p.id_direccion = d.id_direccion
    LEFT JOIN detalles_pedido dp ON p.id_pedido = dp.id_pedido
    GROUP BY p.id_pedido, c.nombre, d.calle_avenida
    ORDER BY p.fecha_pedido DESC;
  `;

  const { rows } = await pool.query(query);
  return rows;
};

// Obtener un pedido por ID
const obtenerPedidoPorId = async (id_pedido) => {
  const query = `
    SELECT 
      p.*, 
      c.nombre AS cliente,
      d.calle_avenida AS direccion,
      json_agg(
        json_build_object(
          'id_detalle', dp.id_detalle,
          'nombre_producto', dp.nombre_producto,
          'cantidad', dp.cantidad,
          'precio_unitario', dp.precio_unitario,
          'subtotal', dp.subtotal
        )
      ) AS detalles
    FROM pedidos p
    LEFT JOIN clientes c ON p.id_cliente = c.id_cliente
    LEFT JOIN direcciones d ON p.id_direccion = d.id_direccion
    LEFT JOIN detalles_pedido dp ON p.id_pedido = dp.id_pedido
    WHERE p.id_pedido = $1
    GROUP BY p.id_pedido, c.nombre, d.calle_avenida;
  `;

  const { rows } = await pool.query(query, [id_pedido]);
  return rows[0];
};

// ✅ Exportar agrupado
export const PedidoModel = {
  crearPedido,
  listarPedidos,
  obtenerPedidoPorId
};
