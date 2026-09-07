const API_BASE = 'http://localhost:4003/api/notificaciones';

async function cargarNotificaciones() {
  try {
    const pedidoId = document.getElementById('buscarPedido').value;
    const estado = document.getElementById('filtroEstado').value;
    const tipo = document.getElementById('filtroTipo').value;
    let url = API_BASE;
    if (pedidoId) url = `${API_BASE}/pedido/${pedidoId}`;
    const response = await fetch(url);
    let notificaciones = await response.json();
    if (estado && !pedidoId) notificaciones = notificaciones.filter(n => n.estado === estado);
    if (tipo && !pedidoId) notificaciones = notificaciones.filter(n => n.tipo === tipo);
    mostrarNotificaciones(notificaciones);
    actualizarEstadisticas(notificaciones);
  } catch (error) {
    console.error('Error cargando notificaciones:', error);
    alert('Error al cargar las notificaciones');
  }
}

function mostrarNotificaciones(notificaciones) {
  const tbody = document.querySelector('#tablaNotificaciones tbody');
  tbody.innerHTML = '';
  notificaciones.forEach(notif => {
    const fila = document.createElement('tr');
    fila.innerHTML = `
      <td>${notif._id}</td>
      <td>${notif.pedido_id}</td>
      <td>${notif.cliente_nombre}<br><small>${notif.cliente_email}</small></td>
      <td>${obtenerEtiquetaTipo(notif.tipo)}</td>
      <td><span class="estado ${notif.estado}">${notif.estado}</span></td>
      <td>${notif.intentos}</td>
      <td>${new Date(notif.creado_en).toLocaleString()}</td>
      <td>
        ${notif.estado !== 'enviada' ? `<button class="btn-accion btn-reenviar" onclick="reenviarNotificacion('${notif._id}')">↻ Reenviar</button>` : ''}
        <button class="btn-accion btn-detalles" onclick="verDetalles('${notif._id}')">👁️ Detalles</button>
      </td>
    `;
    tbody.appendChild(fila);
  });
}

function obtenerEtiquetaTipo(tipo) {
  const tipos = { confirmacion: '✅ Confirmación', preparacion: '👨‍🍳 Preparación', listo: '🎉 Listo', entregado: '🚚 Entregado', recordatorio: '⏰ Recordatorio' };
  return tipos[tipo] || tipo;
}

async function reenviarNotificacion(id) {
  if (!confirm('¿Reenviar esta notificación?')) return;
  try {
    const response = await fetch(`${API_BASE}/reenviar/${id}`, { method: 'POST' });
    if (response.ok) { alert('Notificación reenviada correctamente'); cargarNotificaciones(); }
    else throw new Error('Error al reenviar');
  } catch (error) { alert('Error al reenviar la notificación'); }
}

function verDetalles(id) { alert(`Detalles de notificación ${id}\n\n(Mostraría mensaje completo en un modal).`); }

function actualizarEstadisticas(notificaciones) {
  document.getElementById('total').textContent = notificaciones.length;
  document.getElementById('enviadas').textContent = notificaciones.filter(n => n.estado === 'enviada').length;
  document.getElementById('pendientes').textContent = notificaciones.filter(n => n.estado === 'pendiente').length;
  document.getElementById('fallos').textContent = notificaciones.filter(n => n.estado === 'fallo').length;
}

function limpiarFiltros() {
  document.getElementById('buscarPedido').value = '';
  document.getElementById('filtroEstado').value = '';
  document.getElementById('filtroTipo').value = '';
  cargarNotificaciones();
}

document.addEventListener('DOMContentLoaded', cargarNotificaciones);

