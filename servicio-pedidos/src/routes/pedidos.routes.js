import express from "express";
import { PedidoController } from "../controllers/pedidos.controller.js";

const router = express.Router();

// Crear pedido
router.post("/crear", PedidoController.crearPedido);

// Listar pedidos (admin)
router.get("/listar", PedidoController.listarPedidos);

// Seguimiento por id_pedido
router.get("/seguimiento/:id", PedidoController.seguimientoPedido);

// Pedido activo por cliente
router.get("/cliente/seguimiento/:idCliente", PedidoController.seguimientoPorCliente);

// Obtener pedido por ID (ruta genérica al final)
router.get("/:id", PedidoController.obtenerPedidoPorId);

// Actualizar estado (admin)
router.patch("/:id/estado", PedidoController.actualizarEstadoPedido);

export default router;

