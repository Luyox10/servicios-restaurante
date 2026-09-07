import mongoose from "mongoose";

const historialReservaSchema = new mongoose.Schema({
  reserva_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Reserva",
    required: true
  },
  estado_anterior: {
    type: String,
    enum: ["pendiente", "confirmada", "cancelada", "completada"]
  },
  estado_nuevo: {
    type: String,
    enum: ["pendiente", "confirmada", "cancelada", "completada"],
    required: true
  },
  trabajador_id: {
    type: Number
  },
  trabajador_nombre: {
    type: String
  },
  fecha_cambio: {
    type: Date,
    default: Date.now
  }
});

// Índice para búsquedas eficientes
historialReservaSchema.index({ reserva_id: 1, fecha_cambio: -1 });

export const HistorialReserva = mongoose.model("HistorialReserva", historialReservaSchema);

