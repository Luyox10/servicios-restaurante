// src/controllers/menu.controller.js
import { Plato } from "../models/plato.model.js";
import fs from "fs";
import path from "path";

/* 🔹 Listar todos los platos (con filtro opcional por categoría o estado) */
export async function listarPlatos(req, res) {
  try {
    const { categoria, estado } = req.query;
    const filtro = {};
    if (categoria) filtro.categoria = categoria;
    if (estado) filtro.estado = estado;

    const platos = await Plato.find(filtro).sort({ creado_en: -1 }).lean();
    res.json(platos);
  } catch (err) {
    console.error("Error listarPlatos:", err);
    res.status(500).json({ error: "Error interno del servidor" });
  }
}

/* 🔹 Obtener plato por ID */
export async function obtenerPlato(req, res) {
  try {
    const plato = await Plato.findById(req.params.id).lean();
    if (!plato) return res.status(404).json({ error: "Plato no encontrado" });
    res.json(plato);
  } catch (err) {
    console.error("Error obtenerPlato:", err);
    res.status(500).json({ error: "Error interno del servidor" });
  }
}

/* 🔹 Crear nuevo plato (admin) */
export async function crearPlato(req, res) {
  try {
    const { nombre, descripcion, precio, categoria, imagenUrl } = req.body;

    // Si el admin sube archivo local
    let imagen = "";
    if (req.file) {
      imagen = `/uploads/${req.file.filename}`;
    } else if (imagenUrl && imagenUrl.trim() !== "") {
      // Si se envía un enlace de imagen externa
      imagen = imagenUrl;
    }

    const nuevoPlato = new Plato({
      nombre,
      descripcion,
      precio,
      categoria,
      imagen,
    });

    await nuevoPlato.save();
    res.status(201).json(nuevoPlato);
  } catch (err) {
    console.error("Error crearPlato:", err);
    res.status(500).json({ error: "Error al crear el plato" });
  }
}

/* 🔹 Actualizar plato (admin) */
export async function actualizarPlato(req, res) {
  try {
    const { id } = req.params;
    const updates = req.body;

    if (req.file) {
      updates.imagen = `/uploads/${req.file.filename}`;
    }

    const actualizado = await Plato.findByIdAndUpdate(id, updates, { new: true }).lean();
    if (!actualizado) return res.status(404).json({ error: "Plato no encontrado" });
    res.json(actualizado);
  } catch (err) {
    console.error("Error actualizarPlato:", err);
    res.status(500).json({ error: "Error interno del servidor" });
  }
}

/* 🔹 Eliminar plato (admin) */
export async function eliminarPlato(req, res) {
  try {
    const eliminado = await Plato.findByIdAndDelete(req.params.id).lean();
    if (!eliminado) return res.status(404).json({ error: "Plato no encontrado" });

    // Si la imagen era local, se elimina del servidor
    if (eliminado.imagen && eliminado.imagen.startsWith("/uploads/")) {
      const filePath = path.join(process.cwd(), eliminado.imagen);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }

    res.json({ message: "✅ Plato eliminado correctamente", data: eliminado });
  } catch (err) {
    console.error("Error eliminarPlato:", err);
    res.status(500).json({ error: "Error interno del servidor" });
  }
}

/* 🔹 Obtener productos del carrito (ejemplo de integración con pedidos)
   Aquí puedes filtrar solo algunos platos o devolver todos para prueba */
export async function obtenerCarrito(req, res) {
  try {
    const platos = await Plato.find().limit(5).lean(); // muestra 5 productos de ejemplo
    res.json(platos);
  } catch (err) {
    console.error("Error obtenerCarrito:", err);
    res.status(500).json({ error: "Error interno del servidor" });
  }
}
