import { Router } from "express";
import {
  crearNotificacion,
  obtenerNotificacionesPorPedido,
  reenviarNotificacion
} from "../controllers/notificaciones.controller.js";

const router = Router();

router.post("/", crearNotificacion);
router.get("/pedido/:pedido_id", obtenerNotificacionesPorPedido);
router.post("/reenviar/:id", reenviarNotificacion);

export default router;