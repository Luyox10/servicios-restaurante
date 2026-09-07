// src/controllers/carrito.controller.js
import { Carrito } from "../models/carrito.model.js";
import { Plato } from "../models/plato.model.js";

/* 🔹 Agregar producto al carrito */
export async function agregarAlCarrito(req, res) {
  try {
    const { producto_id, cantidad } = req.body;

    // Validar ID y cantidad
    if (!producto_id) {
      return res.status(400).json({ error: "Falta el ID del producto" });
    }

    const plato = await Plato.findById(producto_id);
    if (!plato) {
      return res.status(404).json({ error: "Plato no encontrado" });
    }

    // Verificar si ya existe en carrito
    const existente = await Carrito.findOne({ producto_id });

    if (existente) {
      existente.cantidad += cantidad || 1;
      await existente.save();
      return res.status(200).json({
        mensaje: "Cantidad actualizada en el carrito",
        producto: existente,
      });
    }

    // Crear nuevo registro
    const nuevo = new Carrito({
      producto_id,
      nombre: plato.nombre,
      precio: plato.precio,
      cantidad: cantidad || 1,
      imagen: plato.imagen,
    });

    await nuevo.save();

    res.status(201).json({
      mensaje: "Producto agregado al carrito",
      producto: nuevo,
    });
  } catch (err) {
    console.error("❌ Error agregarAlCarrito:", err);
    res.status(500).json({ error: "Error interno del servidor" });
  }
}

/* 🔹 Obtener todo el carrito */
export async function obtenerCarrito(req, res) {
  try {
    const carrito = await Carrito.find().lean();

    // Si está vacío
    if (!carrito.length) {
      return res.json([]);
    }

    res.json(carrito);
  } catch (err) {
    console.error("❌ Error obtenerCarrito:", err);
    res.status(500).json({ error: "Error interno del servidor" });
  }
}

/* 🔹 Eliminar un producto del carrito */
export async function eliminarDelCarrito(req, res) {
  try {
    const { id } = req.params;

    const eliminado = await Carrito.findByIdAndDelete(id);

    if (!eliminado) {
      return res.status(404).json({ error: "Producto no encontrado en el carrito" });
    }

    res.json({ mensaje: "Producto eliminado correctamente" });
  } catch (err) {
    console.error("❌ Error eliminarDelCarrito:", err);
    res.status(500).json({ error: "Error interno del servidor" });
  }
}

/* 🔹 Vaciar todo el carrito (opcional, útil al confirmar pedido) */
export async function vaciarCarrito(req, res) {
  try {
    await Carrito.deleteMany({});
    res.json({ mensaje: "Carrito vaciado correctamente" });
  } catch (err) {
    console.error("❌ Error vaciarCarrito:", err);
    res.status(500).json({ error: "Error al vaciar carrito" });
  }
}
