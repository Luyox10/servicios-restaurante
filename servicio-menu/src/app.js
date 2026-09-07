import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { connectDB } from "./config/db.js";
import menuRoutes from "./routes/menu.routes.js";
import categoriaRoutes from "./routes/categorias.routes.js";
import carritoRoutes from "./routes/carrito.routes.js";

dotenv.config();
await connectDB();

const app = express();
app.use(cors());
app.use(express.json());

// servir frontend
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 📂 Servir archivos estáticos
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use(express.static(path.join(__dirname, "public")));

// Rutas API
app.use("/api/menu", menuRoutes);
app.use("/api/categorias", categoriaRoutes);
app.use("/api/menu/carrito", carritoRoutes);

// Frontend trabajador
app.get("/trabajador/menu_trabajador.html", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "trabajador", "menu_trabajador.html"));
});

// Frontend admin - platos más vendidos
app.get("/admin/platos_mas_vendidos.html", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "admin", "platos_mas_vendidos.html"));
});



const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`🍽️ Menu service running on port ${PORT}`));
