import { crearPago, listarPagosPendientes, listarPagosCompletados, listarTodosPagos, confirmarPago, obtenerTotalDelDia, obtenerTotalGeneral, obtenerPagoPorId, obtenerPagoPorPedido } from "../models/pagos.model.js";

export const crearPagoController = async (req, res) => {
  try {
    console.log("💳 Req.body recibido en microservicio:", req.body);
    const { pedido_id, metodo_pago, monto_total, fecha_cliente } = req.body;
    // Estado automático según método de pago
    const estado = metodo_pago.toLowerCase() === "efectivo" ? "completado" : "pendiente";
    const nuevoPago = await crearPago({ pedido_id, metodo_pago, monto_total, estado, fecha_cliente });
    res.json(nuevoPago);
  } catch (err) {
    console.error("❌ Error al crear pago:", err);
    res.status(500).json({ error: err.message });
  }
};

export const listarPendientesController = async (req, res) => {
  try { res.json(await listarPagosPendientes()); } 
  catch (err) { res.status(500).json({ error: err.message }); }
};

export const listarCompletadosController = async (req, res) => {
  try { res.json(await listarPagosCompletados()); } 
  catch (err) { res.status(500).json({ error: err.message }); }
};

export const listarTodosController = async (req, res) => {
  try { res.json(await listarTodosPagos()); } 
  catch (err) { res.status(500).json({ error: err.message }); }
};

export const confirmarPagoController = async (req, res) => {
  try {
    const { trabajador_id, trabajador_nombre } = req.body;
    console.log("📥 Confirmar pago - recibido:", { id: req.params.id, trabajador_id, trabajador_nombre });
    const pago = await confirmarPago(req.params.id, trabajador_id, trabajador_nombre);
    if (!pago) return res.status(404).json({ error: "Pago no encontrado" });
    res.json(pago);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const obtenerTotalDelDiaController = async (req, res) => {
  try {
    const total = await obtenerTotalDelDia();
    res.json({ total });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const obtenerTotalGeneralController = async (req, res) => {
  try {
    const total = await obtenerTotalGeneral();
    res.json({ total });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const obtenerPagoPorIdController = async (req, res) => {
  try {
    const { id } = req.params;
    const pago = await obtenerPagoPorId(id);
    if (!pago) return res.status(404).json({ error: "Pago no encontrado" });
    res.json(pago);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const obtenerPagoPorPedidoController = async (req, res) => {
  try {
    const { id } = req.params;
    const pago = await obtenerPagoPorPedido(id);
    if (!pago) return res.status(404).json({ error: "Pago no encontrado" });
    res.json(pago);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

