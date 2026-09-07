import mongoose from "mongoose";

const reservaSchema = new mongoose.Schema({
  cliente_nombre: { 
    type: String, 
    required: true 
  },
  cliente_email: { 
    type: String, 
    required: true 
  },
  cliente_telefono: { 
    type: String, 
    required: true 
  },
  fecha_reserva: { 
    type: Date, 
    required: true 
  },
  hora_reserva: { 
    type: String, 
    required: true 
  },
  numero_personas: { 
    type: Number, 
    required: true,
    min: 1,
    max: 20 
  },
  tipo_reserva: { 
    type: String, 
    enum: ["desayuno", "almuerzo", "cena", "merienda"],
    required: true 
  },
  platos_reservados: [{
    plato_id: { type: String, required: true },
    plato_nombre: { type: String, required: true },
    cantidad: { type: Number, required: true, min: 1 },
    precio: { type: Number, required: true }
  }],
  estado: { 
    type: String, 
    enum: ["pendiente", "confirmada", "cancelada", "completada"], 
    default: "pendiente" 
  },
  notas_especiales: { 
    type: String, 
    default: "" 
  },
  creado_en: { 
    type: Date, 
    default: Date.now 
  }
});

// Índice para búsquedas eficientes
reservaSchema.index({ fecha_reserva: 1, hora_reserva: 1 });

export const Reserva = mongoose.model("Reserva", reservaSchema);