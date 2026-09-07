// src/controllers/categoria.controller.js
import Categoria from "../models/categoria.model.js";

// Crear nueva categoría
export const crearCategoria = async (req, res) => {
  try {
    const { nombre, descripcion } = req.body;
    const nueva = new Categoria({ nombre, descripcion });
    await nueva.save();
    res.status(201).json(nueva);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al crear la categoría" });
  }
};

// Listar categorías
export const obtenerCategorias = async (req, res) => {
  try {
    const categorias = await Categoria.find().sort({ createdAt: -1 });
    res.json(categorias);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al obtener categorías" });
  }
};

// Eliminar categoría
export const eliminarCategoria = async (req, res) => {
  try {
    const { id } = req.params;
    await Categoria.findByIdAndDelete(id);
    res.json({ message: "Categoría eliminada correctamente" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al eliminar la categoría" });
  }
};
