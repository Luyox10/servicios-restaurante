import express from "express";
import cors from "cors";
import path from "path";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import pedidosRoutes from './routes/pedidos.routes.js';

dotenv.config();
const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(cors());
app.use(express.json());

// Middleware de logging para debug
app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) {
    console.log(`🔍 [${req.method}] ${req.path} - ${req.originalUrl}`);
  }
  next();
});

// Rutas API (ANTES de las rutas estáticas para tener prioridad)
app.use("/api/pedidos", (req, res, next) => {
  console.log(`🚀 Router de pedidos recibió: ${req.method} ${req.path}`);
  next();
}, pedidosRoutes);

// Manejador 404 para rutas API no encontradas (debe devolver JSON)
// IMPORTANTE: Debe estar DESPUÉS de todas las rutas API pero ANTES de las estáticas
app.use("/api/*", (req, res) => {
  console.error(`❌ Ruta API no encontrada: ${req.method} ${req.originalUrl}`);
  res.status(404).json({
    ok: false,
    error: `Ruta no encontrada: ${req.method} ${req.originalUrl}`
  });
});

// Rutas específicas de frontend (ANTES de las rutas estáticas)
app.get("/", (req, res) => {
  res.sendFile(path.resolve(__dirname, "../public/cliente/pedido.html"));
});
app.get("/admin", (req, res) => {
  res.sendFile(path.resolve(__dirname, "../public/admin/admin.html"));
});
app.get("/trabajador", (req, res) => {
  res.sendFile(path.resolve(__dirname, "../public/trabajador/trabajador.html"));
});
app.get("/seguimiento", (req, res) => {
  res.sendFile(path.resolve(__dirname, "../public/cliente/seguimiento.html"));
});

// Servir archivos estáticos (AL FINAL, después de todas las rutas específicas)
app.use(express.static(path.join(__dirname, "../public/cliente")));
app.use("/admin", express.static(path.join(__dirname, "../public/admin")));
app.use("/trabajador", express.static(path.join(__dirname, "../public/trabajador")));

app.listen(process.env.PORT || 4001, () =>
  console.log(`✅ Servidor Pedidos corriendo en puerto ${process.env.PORT || 4001}`)
);
