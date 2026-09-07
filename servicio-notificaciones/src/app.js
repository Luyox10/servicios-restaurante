import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { connectDB } from "./config/db.js";
import notificacionesRoutes from "./routes/notificaciones.routes.js";

dotenv.config();
await connectDB();

const app = express();
app.use(cors());
app.use(express.json());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Servir archivos estáticos
app.use(express.static(path.join(__dirname, "../public")));

// Rutas API
app.use("/api/notificaciones", notificacionesRoutes);

// Frontend admin
app.get("/admin", (req, res) => {
  res.sendFile(path.resolve(__dirname, "../public/admin/admin.html"));
});

app.get("/admin/admin.html", (req, res) => {
  res.sendFile(path.resolve(__dirname, "../public/admin/admin.html"));
});

// Frontend trabajador
app.get("/trabajador", (req, res) => {
  res.sendFile(path.resolve(__dirname, "../public/trabajador/trabajador.html"));
});

app.get("/trabajador/trabajador.html", (req, res) => {
  res.sendFile(path.resolve(__dirname, "../public/trabajador/trabajador.html"));
});

// Frontend cliente
app.get("/", (req, res) => {
  res.sendFile(path.resolve(__dirname, "../public/cliente/cliente.html"));
});

app.get("/cliente/cliente.html", (req, res) => {
  res.sendFile(path.resolve(__dirname, "../public/cliente/cliente.html"));
});

const PORT = process.env.PORT || 4003;
app.listen(PORT, () => console.log(`📧 Servicio notificaciones en puerto ${PORT}`));