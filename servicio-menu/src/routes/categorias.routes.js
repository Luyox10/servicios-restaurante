// src/routes/categorias.routes.js
import { Router } from "express";
import {
  crearCategoria,
  obtenerCategorias,
  eliminarCategoria,
} from "../controllers/categoria.controller.js";

const router = Router();

router.post("/", crearCategoria);
router.get("/", obtenerCategorias);
router.delete("/:id", eliminarCategoria);

export default router;
