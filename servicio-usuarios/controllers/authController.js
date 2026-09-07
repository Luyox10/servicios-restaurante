import bcrypt from "bcryptjs";
import { pool } from "../db/index.js";

// === REGISTRO ===
export const register = async (req, res) => {
  try {
    const { nombre, correo, contrasena, telefono, direccion } = req.body;

    // 1️⃣ Verificar que todos los campos necesarios existan
    if (!nombre || !correo || !contrasena) {
      return res
        .status(400)
        .json({ error: "⚠️ Nombre, correo y contraseña son obligatorios." });
    }

    console.log("📩 Datos recibidos del registro:", req.body);

    // 2️⃣ Verificar si el correo ya existe
    const checkUser = await pool.query(
      "SELECT id FROM usuarios WHERE correo = $1",
      [correo]
    );

    if (checkUser.rows.length > 0) {
      console.log("❌ Correo duplicado:", correo);
      return res.status(400).json({ error: "⚠️ El correo ya está registrado." });
    }

    // 3️⃣ Hashear contraseña
    const hashedPassword = await bcrypt.hash(contrasena, 10);

    // 4️⃣ Insertar nuevo usuario
    const insertQuery = `
      INSERT INTO usuarios (nombre, correo, contrasena, telefono, direccion, rol)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, nombre, correo, rol
    `;
    const result = await pool.query(insertQuery, [
      nombre,
      correo,
      hashedPassword,
      telefono || null,
      direccion || null,
      "usuario",
    ]);

    console.log("✅ Usuario registrado:", result.rows[0]);

    res.status(201).json({
      message: "✅ Registro exitoso.",
      usuario: result.rows[0],
    });
  } catch (err) {
    console.error("💥 Error en registro:", err.message);
    res.status(500).json({ error: "❌ Error interno del servidor." });
  }
};

// === LOGIN ===
export const login = async (req, res) => {
  try {
    const { correo, contrasena } = req.body;

    if (!correo || !contrasena) {
      return res.status(400).json({ error: "⚠️ Faltan credenciales." });
    }

    // Verificar si es login de admin o trabajador por la ruta
    const isAdminLogin = req.path.includes('/admin') || req.originalUrl.includes('/admin');
    const isTrabajadorLogin = req.path.includes('/trabajador') || req.originalUrl.includes('/trabajador');

    console.log("🔐 Intentando login:", correo, isAdminLogin ? "(Admin)" : isTrabajadorLogin ? "(Trabajador)" : "(Usuario)");

    const result = await pool.query(
      "SELECT * FROM usuarios WHERE correo = $1",
      [correo]
    );

    if (result.rows.length === 0) {
      console.log("❌ Usuario no encontrado:", correo);
      return res.status(404).json({ 
        logueado: false,
        error: "⚠️ Usuario no encontrado." 
      });
    }

    const user = result.rows[0];
    
    // Verificar contraseña
    const valid = await bcrypt.compare(contrasena, user.contrasena);

    if (!valid) {
      console.log("❌ Contraseña incorrecta para:", correo);
      return res.status(401).json({ 
        logueado: false,
        error: "❌ Contraseña incorrecta." 
      });
    }

    // Si es login de admin, verificar rol administrador
    if (isAdminLogin) {
      if (user.rol !== "administrador") {
        console.log("❌ No tiene permisos de administrador:", correo);
        return res.status(403).json({ 
          logueado: false,
          error: "❌ No tienes permisos de administrador." 
        });
      }
      
      console.log("✅ Login admin exitoso:", user.correo);
      
      const adminData = { 
        id: user.id, 
        nombre: user.nombre, 
        correo: user.correo, 
        rol: user.rol 
      };

      // Establecer cookie de admin
      res.cookie("admin", JSON.stringify(adminData), {
        httpOnly: false,
        sameSite: "None",
        secure: false,
        path: "/",
      });

      return res.json({ 
        logueado: true,
        admin: adminData 
      });
    }

    // Si es login de trabajador, verificar rol trabajador
    if (isTrabajadorLogin) {
      if (user.rol !== "trabajador") {
        console.log("❌ No tiene permisos de trabajador:", correo);
        return res.status(403).json({ 
          logueado: false,
          error: "❌ No tienes permisos de trabajador." 
        });
      }
      
      console.log("✅ Login trabajador exitoso:", user.correo);
      
      const trabajadorData = { 
        id: user.id, 
        nombre: user.nombre, 
        correo: user.correo, 
        rol: user.rol 
      };

      // Establecer cookie de trabajador
      res.cookie("trabajador", JSON.stringify(trabajadorData), {
        httpOnly: false,
        sameSite: "None",
        secure: false,
        path: "/",
      });

      return res.json({ 
        logueado: true,
        trabajador: trabajadorData 
      });
    }

    console.log("✅ Login exitoso:", user.correo);

    const usuario = {
      id: user.id,
      nombre: user.nombre,
      correo: user.correo,
      rol: user.rol,
    };

    // Verificar que el usuario tenga id antes de enviarlo
    if (!usuario.id) {
      console.error("❌ ERROR: El usuario no tiene id. user:", user);
      return res.status(500).json({ 
        logueado: false,
        error: "❌ Error interno: datos de usuario inválidos." 
      });
    }

    console.log("📦 Usuario a enviar:", JSON.stringify(usuario, null, 2));

    // Establecer cookie de usuario
    res.cookie("usuario", JSON.stringify(usuario), {
      httpOnly: false,
      sameSite: "None",
      secure: false,
      path: "/",
    });

    res.json({
      logueado: true,
      usuario: usuario,
    });
  } catch (err) {
    console.error("💥 Error en login:", err.message);
    res.status(500).json({ 
      logueado: false,
      error: "❌ Error interno del servidor." 
    });
  }
};
