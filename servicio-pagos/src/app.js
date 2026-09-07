import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import pagosRoutes from "./routes/pagos.routes.js";
import "./db.js";

dotenv.config();
const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(cors());
app.use(express.json());

// Servir archivos estáticos (HTML, CSS, JS)
app.use(express.static(path.join(__dirname, "public")));

// Rutas API
app.use("/pagos", pagosRoutes);

// Frontend trabajador
app.get("/trabajador/pagos.html", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "trabajador", "pagos.html"));
});

const PORT = process.env.PORT || 4002;
app.listen(PORT, () => console.log(`✅ Servicio de pagos escuchando en el puerto ${PORT}`));
