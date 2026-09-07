import { Reserva } from "../models/reservas.model.js";
import { HistorialReserva } from "../models/historial_reservas.model.js";
import mongoose from "mongoose";

// 🔹 Crear reserva
export const crearReserva = async (req, res) => {
  try {
    const {
      cliente_nombre,
      cliente_email,
      cliente_telefono,
      fecha_reserva,
      hora_reserva,
      numero_personas,
      tipo_reserva,
      platos_reservados,
      notas_especiales
    } = req.body;

    // Convertir fecha a zona horaria de Perú
    // La fecha viene como string "YYYY-MM-DD" desde el cliente
    // Necesitamos crear una fecha en la zona horaria de Perú
    let fechaPeru;
    if (fecha_reserva) {
      // Crear fecha en zona horaria de Perú (America/Lima)
      // Parsear la fecha como si fuera medianoche en Perú
      const [year, month, day] = fecha_reserva.split('-');
      // Crear fecha en UTC que represente medianoche en Perú
      // Perú está en UTC-5, así que medianoche en Perú = 05:00 UTC del mismo día
      // Pero MongoDB guardará esto como UTC, así que necesitamos ajustar
      fechaPeru = new Date(`${year}-${month}-${day}T00:00:00-05:00`);
      
      // Asegurarnos de que la fecha se guarde correctamente
      // MongoDB guardará esto como UTC, pero queremos que represente el día correcto en Perú
      console.log("📅 Fecha recibida del cliente:", fecha_reserva);
      console.log("📅 Fecha convertida a Perú (antes de guardar):", fechaPeru.toISOString());
      console.log("📅 Fecha en zona horaria de Perú:", fechaPeru.toLocaleString('en-US', { timeZone: 'America/Lima' }));
    } else {
      fechaPeru = new Date();
    }

    // Verificar disponibilidad usando la fecha correcta
    const inicioDia = new Date(fechaPeru);
    inicioDia.setHours(0, 0, 0, 0);
    const finDia = new Date(fechaPeru);
    finDia.setHours(23, 59, 59, 999);

    const reservasExistentes = await Reserva.countDocuments({
      fecha_reserva: {
        $gte: inicioDia,
        $lte: finDia
      },
      hora_reserva,
      estado: { $in: ["pendiente", "confirmada"] }
    });

    // Máximo 5 reservas por horario (ajustable)
    if (reservasExistentes >= 5) {
      return res.status(400).json({ 
        error: "Lo sentimos, no hay disponibilidad para este horario" 
      });
    }

    const nuevaReserva = new Reserva({
      cliente_nombre,
      cliente_email,
      cliente_telefono,
      fecha_reserva: fechaPeru,
      hora_reserva,
      numero_personas,
      tipo_reserva,
      platos_reservados: platos_reservados || [],
      notas_especiales
    });

    await nuevaReserva.save();

    // Enviar notificación (integrar con servicio de notificaciones)
    try {
      await fetch("http://localhost:4003/api/notificaciones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pedido_id: `RES-${nuevaReserva._id}`,
          cliente_email,
          cliente_nombre,
          tipo: "confirmacion",
          mensaje: `
            <h2>¡Reserva Confirmada!</h2>
            <p>Hola <strong>${cliente_nombre}</strong>,</p>
            <p>Tu reserva para <strong>${numero_personas} personas</strong> ha sido confirmada.</p>
            <p><strong>Fecha:</strong> ${new Date(fecha_reserva).toLocaleDateString()}</p>
            <p><strong>Hora:</strong> ${hora_reserva}</p>
            <p><strong>Tipo:</strong> ${tipo_reserva}</p>
            <p>Te esperamos en La Mamasa. ¡Gracias por tu reserva!</p>
          `
        })
      });
    } catch (notifError) {
      console.log("Notificación no enviada:", notifError.message);
    }

    res.status(201).json(nuevaReserva);
  } catch (err) {
    console.error("Error crearReserva:", err);
    res.status(500).json({ error: "Error interno del servidor" });
  }
};

// 🔹 Obtener todas las reservas
export const obtenerReservas = async (req, res) => {
  try {
    const { fecha, estado } = req.query;
    const filtro = {};
    
    if (fecha) {
      // Convertir fecha a rango del día en zona horaria de Perú
      const [year, month, day] = fecha.split('-');
      const inicioDia = new Date(`${year}-${month}-${day}T00:00:00-05:00`);
      const finDia = new Date(`${year}-${month}-${day}T23:59:59-05:00`);
      filtro.fecha_reserva = {
        $gte: inicioDia,
        $lte: finDia
      };
    }
    if (estado) filtro.estado = estado;

    const reservas = await Reserva.find(filtro).sort({ fecha_reserva: 1, hora_reserva: 1 });
    
    // Obtener información del último cambio para cada reserva
    const reservasConHistorial = await Promise.all(
      reservas.map(async (reserva) => {
        try {
          // Asegurar que el ID sea un ObjectId válido
          let reservaId;
          if (typeof reserva._id === 'string') {
            reservaId = new mongoose.Types.ObjectId(reserva._id);
          } else if (reserva._id instanceof mongoose.Types.ObjectId) {
            reservaId = reserva._id;
          } else {
            reservaId = reserva._id;
          }
          
          const ultimoCambio = await HistorialReserva.findOne({ reserva_id: reservaId })
            .sort({ fecha_cambio: -1 })
            .limit(1);
          
          const reservaObj = reserva.toObject();
          if (ultimoCambio) {
            reservaObj.ultimo_cambio_por = ultimoCambio.trabajador_nombre || null;
            // Asegurar que la fecha se devuelva correctamente para el frontend
            if (ultimoCambio.fecha_cambio) {
              // MongoDB devuelve fechas como Date, convertir a ISO string
              const fechaCambio = ultimoCambio.fecha_cambio instanceof Date 
                ? ultimoCambio.fecha_cambio 
                : new Date(ultimoCambio.fecha_cambio);
              
              // Verificar que la fecha sea válida
              if (!isNaN(fechaCambio.getTime())) {
                reservaObj.fecha_ultimo_cambio = fechaCambio.toISOString();
              } else {
                console.error("❌ Fecha inválida en historial:", ultimoCambio.fecha_cambio);
                reservaObj.fecha_ultimo_cambio = null;
              }
            } else {
              reservaObj.fecha_ultimo_cambio = null;
            }
          } else {
            // No hay historial, lo cual es normal para reservas que no han cambiado de estado
            reservaObj.ultimo_cambio_por = null;
            reservaObj.fecha_ultimo_cambio = null;
          }
          return reservaObj;
        } catch (err) {
          console.error("❌ Error al obtener historial para reserva:", reserva._id, err);
          const reservaObj = reserva.toObject();
          reservaObj.ultimo_cambio_por = null;
          reservaObj.fecha_ultimo_cambio = null;
          return reservaObj;
        }
      })
    );
    
    res.json(reservasConHistorial);
  } catch (err) {
    console.error("Error obtenerReservas:", err);
    res.status(500).json({ error: "Error interno del servidor" });
  }
};

// 🔹 Obtener reserva por ID
export const obtenerReservaPorId = async (req, res) => {
  try {
    const reserva = await Reserva.findById(req.params.id);
    if (!reserva) {
      return res.status(404).json({ error: "Reserva no encontrada" });
    }
    res.json(reserva);
  } catch (err) {
    console.error("Error obtenerReservaPorId:", err);
    res.status(500).json({ error: "Error interno del servidor" });
  }
};

// 🔹 Actualizar reserva
export const actualizarReserva = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const { trabajador_id, trabajador_nombre } = req.body;

    // Obtener el estado anterior antes de actualizar
    const reservaAnterior = await Reserva.findById(id);
    const estadoAnterior = reservaAnterior?.estado || "pendiente";

    if (updates.fecha_reserva) {
      // Convertir fecha a zona horaria de Perú
      const [year, month, day] = updates.fecha_reserva.split('-');
      updates.fecha_reserva = new Date(`${year}-${month}-${day}T00:00:00-05:00`);
    }

    const reservaActualizada = await Reserva.findByIdAndUpdate(
      id, 
      updates, 
      { new: true, runValidators: true }
    );

    if (!reservaActualizada) {
      return res.status(404).json({ error: "Reserva no encontrada" });
    }

    // Si se cambió el estado, registrar en historial
    if (updates.estado && updates.estado !== estadoAnterior) {
      try {
        console.log("📝 Guardando historial:", {
          reserva_id: id,
          estado_anterior: estadoAnterior,
          estado_nuevo: updates.estado,
          trabajador_id,
          trabajador_nombre
        });
        // Asegurar que el id sea un ObjectId válido
        let reservaObjectId;
        if (typeof id === 'string') {
          reservaObjectId = new mongoose.Types.ObjectId(id);
        } else {
          reservaObjectId = id;
        }
        
        const historialCreado = await HistorialReserva.create({
          reserva_id: reservaObjectId,
          estado_anterior: estadoAnterior,
          estado_nuevo: updates.estado,
          trabajador_id: trabajador_id || null,
          trabajador_nombre: trabajador_nombre || null,
          fecha_cambio: new Date()
        });
        console.log("✅ Historial de cambio de estado guardado:", {
          id: historialCreado._id,
          reserva_id: historialCreado.reserva_id,
          reserva_id_tipo: typeof historialCreado.reserva_id,
          fecha_cambio: historialCreado.fecha_cambio,
          fecha_cambio_tipo: typeof historialCreado.fecha_cambio,
          trabajador_nombre: historialCreado.trabajador_nombre
        });
      } catch (histErr) {
        console.error("❌ Error al guardar historial:", histErr);
        // No fallar la actualización si falla el historial
      }
    }

    res.json(reservaActualizada);
  } catch (err) {
    console.error("Error actualizarReserva:", err);
    res.status(500).json({ error: "Error interno del servidor" });
  }
};

// 🔹 Cancelar reserva
export const cancelarReserva = async (req, res) => {
  try {
    const { id } = req.params;
    const reserva = await Reserva.findByIdAndUpdate(
      id,
      { estado: "cancelada" },
      { new: true }
    );

    if (!reserva) {
      return res.status(404).json({ error: "Reserva no encontrada" });
    }

    res.json({ mensaje: "Reserva cancelada correctamente", reserva });
  } catch (err) {
    console.error("Error cancelarReserva:", err);
    res.status(500).json({ error: "Error interno del servidor" });
  }
};

// 🔹 Obtener horarios disponibles
export const obtenerHorariosDisponibles = async (req, res) => {
  try {
    const { fecha } = req.query;
    
    if (!fecha) {
      return res.status(400).json({ error: "Fecha requerida" });
    }

    console.log("📅 Fecha recibida para horarios:", fecha);

    // Convertir fecha a rango del día en zona horaria de Perú
    const [year, month, day] = fecha.split('-');
    const inicioDia = new Date(`${year}-${month}-${day}T00:00:00-05:00`);
    const finDia = new Date(`${year}-${month}-${day}T23:59:59-05:00`);
    
    console.log("📅 Rango de búsqueda:", inicioDia.toISOString(), "a", finDia.toISOString());
    
    const reservasDelDia = await Reserva.find({
      fecha_reserva: {
        $gte: inicioDia,
        $lte: finDia
      },
      estado: { $in: ["pendiente", "confirmada"] }
    });

    console.log("📅 Reservas encontradas:", reservasDelDia.length);

    // Horarios disponibles
    const horarios = [
      "08:00", "09:00", "10:00", "11:00", "12:00", 
      "13:00", "14:00", "15:00", "16:00", "17:00", 
      "18:00", "19:00", "20:00", "21:00"
    ];

    const horariosOcupados = reservasDelDia.map(r => r.hora_reserva);
    const horariosDisponibles = horarios.filter(h => !horariosOcupados.includes(h));

    console.log("📅 Horarios disponibles:", horariosDisponibles);

    res.json({
      fecha: fecha,
      horarios_disponibles: horariosDisponibles,
      total_disponibles: horariosDisponibles.length
    });
  } catch (err) {
    console.error("Error obtenerHorariosDisponibles:", err);
    res.status(500).json({ error: "Error interno del servidor: " + err.message });
  }
};