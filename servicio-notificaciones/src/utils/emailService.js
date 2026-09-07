import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

// CORRECCIÓN: es createTransport, no createTransporter
const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

export const enviarEmail = async (to, subject, html) => {
  try {
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to,
      subject,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #8b0000; color: white; padding: 20px; text-align: center;">
            <h1>🍽️ La Mamasa</h1>
          </div>
          <div style="padding: 20px; background: #f9f9f9;">
            ${html}
          </div>
          <div style="background: #333; color: white; padding: 10px; text-align: center;">
            <p>Gracias por elegir La Mamasa</p>
          </div>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ Email enviado a: ${to}`);
    return true;
  } catch (error) {
    console.error("❌ Error enviando email:", error);
    throw error;
  }
};

// Plantillas de email para diferentes estados del pedido
export const plantillasEmail = {
  confirmacion: (pedido_id, cliente_nombre) => `
    <h2>¡Pedido Confirmado!</h2>
    <p>Hola <strong>${cliente_nombre}</strong>,</p>
    <p>Tu pedido <strong>#${pedido_id}</strong> ha sido confirmado y está siendo preparado.</p>
    <p>Te mantendremos informado sobre el progreso.</p>
  `,
  
  preparacion: (pedido_id, cliente_nombre, tiempo_estimado) => `
    <h2>¡Tu pedido está en preparación!</h2>
    <p>Hola <strong>${cliente_nombre}</strong>,</p>
    <p>Tu pedido <strong>#${pedido_id}</strong> está siendo preparado en la cocina.</p>
    <p><strong>Tiempo estimado:</strong> ${tiempo_estimado} minutos</p>
  `,
  
  listo: (pedido_id, cliente_nombre, tipo_servicio) => `
    <h2>¡Tu pedido está listo!</h2>
    <p>Hola <strong>${cliente_nombre}</strong>,</p>
    <p>Tu pedido <strong>#${pedido_id}</strong> está listo para ${tipo_servicio === 'domicilio' ? 'ser entregado' : 'ser recogido'}.</p>
    <p>${tipo_servicio === 'local' ? 'Puedes pasar a recogerlo a nuestro local.' : 'Nuestro repartidor estará en camino pronto.'}</p>
  `,
  
  entregado: (pedido_id, cliente_nombre) => `
    <h2>¡Pedido Entregado!</h2>
    <p>Hola <strong>${cliente_nombre}</strong>,</p>
    <p>Tu pedido <strong>#${pedido_id}</strong> ha sido entregado satisfactoriamente.</p>
    <p>¡Esperamos que disfrutes tu comida!</p>
    <p>¿Te gustó nuestro servicio? ¡Déjanos tu opinión!</p>
  `
};