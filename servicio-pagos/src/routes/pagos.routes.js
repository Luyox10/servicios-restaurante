import { Router } from "express";
import {
  crearPagoController,
  listarPendientesController,
  listarCompletadosController,
  listarTodosController,
  confirmarPagoController,
  obtenerTotalDelDiaController,
  obtenerTotalGeneralController,
  obtenerPagoPorIdController,
  obtenerPagoPorPedidoController
} from "../controllers/pagos.controller.js";

const router = Router();

router.post("/crear", crearPagoController);
router.get("/pendientes", listarPendientesController);
router.get("/completados", listarCompletadosController);
router.get("/todos", listarTodosController);
router.put("/confirmar/:id", confirmarPagoController);
router.get("/total-del-dia", obtenerTotalDelDiaController);
router.get("/total-general", obtenerTotalGeneralController);
router.get("/por-pedido/:id", obtenerPagoPorPedidoController);
router.get("/:id", obtenerPagoPorIdController);

export default router;
