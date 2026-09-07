import { Notificacion } from "../models/notificaciones.model.js";
import { enviarEmail } from "../utils/emailService.js";

// 🔹 Crear notificación
export const crearNotificacion = async (req, res) => {
  try {
    const { pedido_id, cliente_email, cliente_nombre, tipo, mensaje } = req.body;
    
    const nuevaNotificacion = new Notificacion({
      pedido_id,
      cliente_email,
      cliente_nombre,
      tipo,
      mensaje
    });

    await nuevaNotificacion.save();

    // Intentar enviar inmediatamente
    try {
      await enviarEmail(cliente_email, `Actualización de tu pedido #${pedido_id}`, mensaje);
      nuevaNotificacion.estado = "enviada";
      nuevaNotificacion.enviado_en = new Date();
      await nuevaNotificacion.save();
    } catch (emailError) {
      console.error("Error enviando email:", emailError);
    }

    res.status(201).json(nuevaNotificacion);
  } catch (err) {
    console.error("Error crearNotificacion:", err);
    res.status(500).json({ error: "Error interno del servidor" });
  }
};

// 🔹 Obtener notificaciones por pedido
export const obtenerNotificacionesPorPedido = async (req, res) => {
  try {
    const { pedido_id } = req.params;
    const notificaciones = await Notificacion.find({ pedido_id }).sort({ creado_en: -1 });
    res.json(notificaciones);
  } catch (err) {
    console.error("Error obtenerNotificacionesPorPedido:", err);
    res.status(500).json({ error: "Error interno del servidor" });
  }
};

// 🔹 Reenviar notificación
export const reenviarNotificacion = async (req, res) => {
  try {
    const { id } = req.params;
    const notificacion = await Notificacion.findById(id);
    
    if (!notificacion) {
      return res.status(404).json({ error: "Notificación no encontrada" });
    }

    try {
      await enviarEmail(
        notificacion.cliente_email, 
        `Actualización de tu pedido #${notificacion.pedido_id}`, 
        notificacion.mensaje
      );
      
      notificacion.estado = "enviada";
      notificacion.enviado_en = new Date();
      notificacion.intentos += 1;
      await notificacion.save();
      
      res.json({ mensaje: "Notificación reenviada correctamente" });
    } catch (emailError) {
      notificacion.estado = "fallo";
      notificacion.intentos += 1;
      await notificacion.save();
      res.status(500).json({ error: "Error enviando email" });
    }
  } catch (err) {
    console.error("Error reenviarNotificacion:", err);
    res.status(500).json({ error: "Error interno del servidor" });
  }
};