import express from "express";
import { register, login } from "../controllers/authController.js";
import { 
  crearTrabajador, 
  listarTrabajadores,
  eliminarTrabajador,
  asignarTurno
} from "../controllers/trabajadoresController.js";
import {
  crearHorario,
  listarHorarios,
  actualizarHorario,
  eliminarHorario
} from "../controllers/horariosController.js";

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.post("/login/admin", login);
router.post("/login/trabajador", login);

// Rutas de trabajadores
router.post("/trabajadores", crearTrabajador);
router.get("/trabajadores", listarTrabajadores);
router.delete("/trabajadores/:id", eliminarTrabajador);
router.put("/trabajadores/:id/turno", asignarTurno);

// Rutas de horarios
router.post("/horarios", crearHorario);
router.get("/horarios", listarHorarios);
router.put("/horarios/:id", actualizarHorario);
router.delete("/horarios/:id", eliminarHorario);


export default router;
