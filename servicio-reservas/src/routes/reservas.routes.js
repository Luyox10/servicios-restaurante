import { Router } from "express";
import {
  crearReserva,
  obtenerReservas,
  obtenerReservaPorId,
  actualizarReserva,
  cancelarReserva,
  obtenerHorariosDisponibles
} from "../controllers/reservas.controller.js";

const router = Router();

router.post("/", crearReserva);
router.get("/", obtenerReservas);
router.get("/disponibles", obtenerHorariosDisponibles);
router.get("/:id", obtenerReservaPorId);
router.put("/:id", actualizarReserva);
router.patch("/:id/cancelar", cancelarReserva);

export default router;