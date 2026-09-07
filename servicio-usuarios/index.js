import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import bcrypt from "bcrypt";
import { pool } from "./db/index.js"; // 🔹 usamos pool en lugar de sequelize
import userRoutes from "./routes/auth.js";
import { 
  crearTrabajador, 
  listarTrabajadores,
  eliminarTrabajador,
  asignarTurno
} from "./controllers/trabajadoresController.js";
import {
  crearHorario,
  listarHorarios,
  actualizarHorario,
  eliminarHorario
} from "./controllers/horariosController.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// 📁 Rutas absolutas
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 🧩 Middlewares
app.set("trust proxy", 1);
app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    origin: [
      "http://localhost:3000", // login
      "http://localhost:4000", // menú
      "http://localhost:4001",
      "http://localhost:4003",
      "http://localhost:4004",
    ],
    credentials: true,
  })
);

// 🔹 Rutas de trabajadores directamente (ANTES de userRoutes para evitar conflictos)
app.post("/api/trabajadores", crearTrabajador);
app.get("/api/trabajadores", listarTrabajadores);
app.delete("/api/trabajadores/:id", eliminarTrabajador);
app.put("/api/trabajadores/:id/turno", asignarTurno);

// 🔹 Rutas de horarios directamente
app.post("/api/horarios", crearHorario);
app.get("/api/horarios", listarHorarios);
app.put("/api/horarios/:id", actualizarHorario);
app.delete("/api/horarios/:id", eliminarHorario);

// 🔹 Rutas API (ANTES de archivos estáticos para evitar conflictos)
app.use("/api", userRoutes);

// 🔹 Archivos estáticos (DESPUÉS de rutas API)
app.use(express.static(path.join(__dirname, "public")));

// ------------------------------
// 🔹 Página principal (login usuario)
// ------------------------------
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "cliente", "user.html"));
});

app.get("/cliente/user.html", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "cliente", "user.html"));
});
// -------------------------------
// 🧾 REGISTRO DE USUARIO
// -------------------------------
app.post("/api/register", async (req, res) => {
  try {
    const { nombre, correo, contrasena, telefono, direccion } = req.body;

    if (!nombre || !correo || !contrasena) {
      return res.status(400).json({ error: "Faltan campos obligatorios" });
    }

    // Verificar si ya existe el correo
    const check = await pool.query("SELECT * FROM usuarios WHERE correo = $1", [correo]);
    if (check.rows.length > 0) {
      return res.status(400).json({ error: "El correo ya está registrado" });
    }

    // Encriptar contraseña
    const hashedPassword = await bcrypt.hash(contrasena, 10);

    // Insertar en la base de datos
    const result = await pool.query(
      `INSERT INTO usuarios (nombre, correo, contrasena, telefono, direccion, rol)
       VALUES ($1, $2, $3, $4, $5, 'usuario') RETURNING *`,
      [nombre, correo, hashedPassword, telefono, direccion]
    );

    return res.status(201).json({
      message: "Usuario registrado correctamente",
      usuario: result.rows[0]
    });

  } catch (error) {
    console.error("Error en /api/register:", error);
    res.status(500).json({ error: "Error al registrar usuario" });
  }
});
// ------------------------------
// 🔐 LOGIN USUARIO
// ------------------------------
app.post("/api/login", async (req, res) => {
  try {
    const { correo, contrasena } = req.body;

    const result = await pool.query("SELECT * FROM usuarios WHERE correo = $1", [correo]);
    const user = result.rows[0];

    if (!user) return res.status(404).json({ logueado: false, error: "Usuario no encontrado" });

    const isMatch = await bcrypt.compare(contrasena, user.contrasena);
    if (!isMatch) return res.status(401).json({ logueado: false, error: "Contraseña incorrecta" });

    const usuario = { id: user.id, nombre: user.nombre, correo: user.correo, rol: user.rol };

    res.cookie("usuario", JSON.stringify(usuario), {
      httpOnly: false,
      sameSite: "None",
      secure: false,
      path: "/",
    });

    return res.json({ logueado: true, usuario });
  } catch (error) {
    console.error("Error en /api/login:", error);
    res.status(500).json({ error: "Error al iniciar sesión" });
  }
});

// ------------------------------
// 🔐 LOGIN ADMINISTRADOR
// Nota: Esta ruta está manejada por el controlador en routes/auth.js
// Se mantiene aquí como respaldo, pero la ruta principal es /api/login/admin
// ------------------------------




// ------------------------------
// 👤 SESIÓN USUARIO
// ------------------------------
app.get("/api/sesion", (req, res) => {
  const cookie = req.cookies.usuario;
  if (!cookie) return res.json({ logueado: false });

  try {
    const usuario = JSON.parse(cookie);
    return res.json({ logueado: true, usuario });
  } catch {
    return res.json({ logueado: false });
  }
});

// ------------------------------
// 👤 SESIÓN ADMIN
// ------------------------------
app.get("/api/sesion/admin", (req, res) => {
  const cookie = req.cookies.admin;
  if (!cookie) return res.json({ logueado: false });

  try {
    const admin = JSON.parse(cookie);
    return res.json({ logueado: true, admin });
  } catch {
    return res.json({ logueado: false });
  }
});

// ------------------------------
// 👤 SESIÓN TRABAJADOR
// ------------------------------
app.get("/api/sesion/trabajador", (req, res) => {
  const cookie = req.cookies.trabajador;
  if (!cookie) return res.json({ logueado: false });

  try {
    const trabajador = JSON.parse(cookie);
    return res.json({ logueado: true, trabajador });
  } catch {
    return res.json({ logueado: false });
  }
});

// ------------------------------
// 🚪 LOGOUT
// ------------------------------
app.post("/api/logout", (req, res) => {
  res.clearCookie("usuario", { path: "/", sameSite: "None", secure: false });
  res.json({ success: true });
});

// ------------------------------
// 🚪 LOGOUT ADMIN
// ------------------------------
app.post("/api/logout/admin", (req, res) => {
  res.clearCookie("admin", { path: "/", sameSite: "None", secure: false });
  res.json({ success: true });
});

// ------------------------------
// 🚪 LOGOUT TRABAJADOR
// ------------------------------
app.post("/api/logout/trabajador", (req, res) => {
  res.clearCookie("trabajador", { path: "/", sameSite: "None", secure: false });
  res.json({ success: true });
});

// ------------------------------
// 🔹 Página login admin
// ------------------------------
app.get("/admin/admin.html", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "admin", "admin.html"));
});

// ------------------------------
// 🔹 Página login trabajador
// ------------------------------
app.get("/trabajador/trabajador.html", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "trabajador", "trabajador.html"));
});


// ------------------------------
// 🔹 Manejo de errores 404 para rutas API (al final, después de todo)
// ------------------------------
app.use((req, res, next) => {
  if (req.path.startsWith("/api/")) {
    console.error("❌ Ruta API no encontrada:", req.method, req.originalUrl);
    return res.status(404).setHeader('Content-Type', 'application/json').json({ 
      error: "Ruta no encontrada: " + req.method + " " + req.originalUrl 
    });
  }
  next();
});

// ------------------------------
// 🚀 Servidor
// ------------------------------
app.listen(PORT, () => {
  console.log(`✅ Servidor Usuarios corriendo en puerto ${PORT}`);
});
