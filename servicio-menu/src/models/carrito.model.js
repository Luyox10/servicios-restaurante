// src/models/carrito.model.js
import mongoose from "mongoose";

const CarritoSchema = new mongoose.Schema({
  producto_id: { type: mongoose.Schema.Types.ObjectId, ref: "Plato", required: true },
  nombre: { type: String, required: true },
  precio: { type: Number, required: true },
  cantidad: { type: Number, default: 1 },
  imagen: { type: String, default: "" },
  creado_en: { type: Date, default: Date.now },
});

export const Carrito = mongoose.model("Carrito", CarritoSchema);
