// src/models/plato.model.js
import mongoose from "mongoose";

const PlatoSchema = new mongoose.Schema({
  nombre: { type: String, required: true },
  descripcion: { type: String, default: "" },
  precio: { type: Number, required: true },
  categoria: { type: String, default: "Platos de fondo" },
  imagen: { type: String, default: "" },
  estado: { type: String, enum: ["activo", "inactivo"], default: "activo" },
  creado_en: { type: Date, default: Date.now }
});

export const Plato = mongoose.model("Plato", PlatoSchema);
