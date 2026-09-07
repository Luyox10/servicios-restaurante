// src/routes/menu.routes.js
import { Router } from "express";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import {
  listarPlatos,
  obtenerPlato,
  crearPlato,
  actualizarPlato,
  eliminarPlato
} from "../controllers/menu.controller.js";
import {
  agregarAlCarrito,
  obtenerCarrito,
  eliminarDelCarrito,
  vaciarCarrito
} from "../controllers/carrito.controller.js";

const router = Router();

// 📁 Configuración de Multer
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const storage = multer.diskStorage({
  destination: path.join(__dirname, "../uploads"),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });

// 🛒 RUTAS DE CARRITO → deben ir antes de las rutas con "/:id"
router.post("/carrito/agregar", agregarAlCarrito);
router.get("/carrito", obtenerCarrito);
router.delete("/carrito/:id", eliminarDelCarrito);
router.post("/carrito/vaciar", vaciarCarrito);

// 🥗 RUTAS DE MENÚ
router.get("/", listarPlatos);
router.get("/:id", obtenerPlato);

// 👩‍💼 RUTAS ADMIN
router.post("/", upload.single("imagen"), crearPlato);
router.put("/:id", actualizarPlato);
router.delete("/:id", eliminarPlato);

export default router;
