// src/routes/carrito.routes.js
import { Router } from "express";
import {
  agregarAlCarrito,
  obtenerCarrito,
  eliminarDelCarrito
} from "../controllers/carrito.controller.js";

const router = Router();

// 🛒 Carrito
router.post("/agregar", agregarAlCarrito);
router.get("/", obtenerCarrito);
router.delete("/:id", eliminarDelCarrito);

export default router;
