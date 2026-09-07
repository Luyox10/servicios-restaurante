import mongoose from "mongoose";

const notificacionSchema = new mongoose.Schema({
  pedido_id: { 
    type: String, 
    required: true 
  },
  cliente_email: { 
    type: String, 
    required: true 
  },
  cliente_nombre: { 
    type: String, 
    required: true 
  },
  tipo: { 
    type: String, 
    enum: ["confirmacion", "preparacion", "listo", "entregado", "recordatorio"],
    required: true 
  },
  mensaje: { 
    type: String, 
    required: true 
  },
  estado: { 
    type: String, 
    enum: ["pendiente", "enviada", "fallo"], 
    default: "pendiente" 
  },
  intentos: { 
    type: Number, 
    default: 0 
  },
  enviado_en: { 
    type: Date 
  },
  creado_en: { 
    type: Date, 
    default: Date.now 
  }
});

export const Notificacion = mongoose.model("Notificacion", notificacionSchema);