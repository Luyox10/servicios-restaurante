const API_URL = "http://localhost:4002/pagos";
let todosPagos = [];
let pagosFiltrados = [];

// Variable para controlar el ordenamiento por ID
let ordenAscendente = true;

// Cargar total general
async function cargarTotalGeneral() {
  try {
    const res = await fetch(`${API_URL}/total-general`);
    if (!res.ok) throw new Error("Error al cargar total general");
    const data = await res.json();
    document.getElementById("totalGeneral").textContent = `S/. ${data.total.toFixed(2)}`;
  } catch (err) {
    console.error("Error al cargar total general:", err);
    document.getElementById("totalGeneral").textContent = "S/. 0.00";
  }
}

// Cargar todos los pagos desde la API
async function cargarTodosPagos() {
  try {
    const res = await fetch(`${API_URL}/todos`);
    if (!res.ok) throw new Error("Error al cargar pagos");
    todosPagos = await res.json();
    
    // Debug: verificar que se reciben las fechas
    if (todosPagos.length > 0) {
      console.log("💳 Primer pago recibido:", {
        id: todosPagos[0].id,
        fecha_ultimo_cambio: todosPagos[0].fecha_ultimo_cambio,
        tipo: typeof todosPagos[0].fecha_ultimo_cambio
      });
    }
    
    // Aplicar filtros iniciales (sin filtrar, mostrar todos)
    pagosFiltrados = [...todosPagos];
    
    // Actualizar tarjetas y tabla
    actualizarTarjetas(pagosFiltrados);
    mostrarPagos(pagosFiltrados);
    
    return todosPagos;
  } catch (err) {
    console.error("Error al cargar pagos:", err);
    todosPagos = [];
    pagosFiltrados = [];
    actualizarTarjetas([]);
    mostrarPagos([]);
  }
}

// Actualizar las tarjetas con los datos filtrados
function actualizarTarjetas(pagos) {
  // Calcular total en período (solo pagos completados)
  const totalPeriodo = pagos
    .filter(p => p.estado === "completado")
    .reduce((sum, p) => sum + parseFloat(p.monto_total || 0), 0);
  
  // Contar pendientes y completados
  const pendientes = pagos.filter(p => p.estado === "pendiente").length;
  const completados = pagos.filter(p => p.estado === "completado").length;
  
  // Actualizar elementos del DOM
  document.getElementById("totalPeriodo").textContent = `S/. ${totalPeriodo.toFixed(2)}`;
  document.getElementById("totalPendientesCard").textContent = pendientes;
  document.getElementById("totalCompletadosCard").textContent = completados;
  
  // Actualizar etiqueta del período
  const fechaDesde = document.getElementById("fecha-desde").value;
  const fechaHasta = document.getElementById("fecha-hasta").value;
  const labelPeriodo = document.getElementById("labelPeriodo");
  
  if (fechaDesde && fechaHasta) {
    labelPeriodo.textContent = `Del ${formatearFechaCorta(fechaDesde)} al ${formatearFechaCorta(fechaHasta)}`;
  } else if (fechaDesde) {
    labelPeriodo.textContent = `Desde ${formatearFechaCorta(fechaDesde)}`;
  } else if (fechaHasta) {
    labelPeriodo.textContent = `Hasta ${formatearFechaCorta(fechaHasta)}`;
  } else {
    labelPeriodo.textContent = "Todos los pagos";
  }
}

// Formatear fecha corta para la etiqueta
function formatearFechaCorta(fechaStr) {
  if (!fechaStr) return "";
  const [year, month, day] = fechaStr.split("-");
  return `${day}/${month}/${year}`;
}

// Aplicar filtros (solo cuando se presiona el botón Filtrar)
function aplicarFiltros() {
  const fechaDesde = document.getElementById("fecha-desde").value;
  const fechaHasta = document.getElementById("fecha-hasta").value;
  const estadoFiltro = document.getElementById("filtro-estado").value;
  
  // Empezar con todos los pagos
  pagosFiltrados = [...todosPagos];
  
  // Filtrar por fecha desde
  if (fechaDesde) {
    const desde = new Date(fechaDesde);
    desde.setHours(0, 0, 0, 0);
    pagosFiltrados = pagosFiltrados.filter(p => {
      const fechaPago = new Date(p.fecha_pago || p.fecha_creacion);
      // Convertir a fecha local para comparar
      const fechaPagoLocal = new Date(fechaPago.toLocaleString('en-US', { timeZone: 'America/Lima' }));
      fechaPagoLocal.setHours(0, 0, 0, 0);
      return fechaPagoLocal >= desde;
    });
  }
  
  // Filtrar por fecha hasta
  if (fechaHasta) {
    const hasta = new Date(fechaHasta);
    hasta.setHours(23, 59, 59, 999);
    pagosFiltrados = pagosFiltrados.filter(p => {
      const fechaPago = new Date(p.fecha_pago || p.fecha_creacion);
      // Convertir a fecha local para comparar
      const fechaPagoLocal = new Date(fechaPago.toLocaleString('en-US', { timeZone: 'America/Lima' }));
      return fechaPagoLocal <= hasta;
    });
  }
  
  // Filtrar por estado
  if (estadoFiltro === "pendientes") {
    pagosFiltrados = pagosFiltrados.filter(p => p.estado === "pendiente");
  } else if (estadoFiltro === "completados") {
    pagosFiltrados = pagosFiltrados.filter(p => p.estado === "completado");
  }
  
  // Actualizar tarjetas y tabla
  actualizarTarjetas(pagosFiltrados);
  mostrarPagos(pagosFiltrados);
}

// Función para alternar ordenamiento por ID
function alternarOrdenamiento() {
  ordenAscendente = !ordenAscendente;
  const btnOrdenar = document.getElementById("btn-ordenar-id");
  
  // Actualizar texto del botón
  if (ordenAscendente) {
    btnOrdenar.textContent = "🔢 Ordenar por ID (Asc)";
  } else {
    btnOrdenar.textContent = "🔢 Ordenar por ID (Desc)";
  }
  
  // Re-aplicar filtros para re-renderizar con nuevo orden
  aplicarFiltros();
}

// Limpiar filtros
function limpiarFiltros() {
  document.getElementById("fecha-desde").value = "";
  document.getElementById("fecha-hasta").value = "";
  document.getElementById("filtro-estado").value = "todos";
  
  // Restaurar todos los pagos
  pagosFiltrados = [...todosPagos];
  
  // Actualizar tarjetas y tabla (se ordenará por ID automáticamente)
  actualizarTarjetas(pagosFiltrados);
  mostrarPagos(pagosFiltrados);
}

// Función para formatear la fecha (exactamente igual que en pedidos)
function formatearFecha(fecha) {
  if (!fecha) return "Sin fecha";
  const date = new Date(fecha);
  if (isNaN(date.getTime())) return "Sin fecha";
  return date.toLocaleDateString('es-PE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// Función para ordenar pagos por ID
function ordenarPorId(pagos) {
  const pagosOrdenados = [...pagos];
  pagosOrdenados.sort((a, b) => {
    const idA = parseInt(a.id) || 0;
    const idB = parseInt(b.id) || 0;
    return ordenAscendente ? idA - idB : idB - idA;
  });
  return pagosOrdenados;
}

// Mostrar pagos en la tabla
function mostrarPagos(lista) {
  const tbody = document.querySelector("#tablaPagos tbody");
  tbody.innerHTML = "";

  if (lista.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align: center; padding: 2rem; color: #999;">
          No hay pagos que coincidan con los filtros
        </td>
      </tr>
    `;
    return;
  }

  // Ordenar por ID antes de mostrar
  const pagosOrdenados = ordenarPorId(lista);

  pagosOrdenados.forEach(pago => {
    const fila = document.createElement("tr");
    const estadoClass = pago.estado === "completado" ? "estado-completado" : "estado-pendiente";
    const fechaFormateada = formatearFecha(pago.fecha_pago);
    
    // Badge para el estado (solo lectura)
    const estadoBadge = `<span class="estado-badge ${estadoClass}">${(pago.estado || "pendiente").charAt(0).toUpperCase() + (pago.estado || "pendiente").slice(1)}</span>`;
    
    fila.innerHTML = `
      <td>${pago.id}</td>
      <td>${pago.pedido_id || "-"}</td>
      <td><strong>${pago.metodo_pago || "-"}</strong></td>
      <td><strong style="color: #28a745;">S/. ${parseFloat(pago.monto_total || 0).toFixed(2)}</strong></td>
      <td>${fechaFormateada}</td>
      <td>${estadoBadge}</td>
    `;
    tbody.appendChild(fila);
  });
}

// Confirmar pago
async function confirmarPago(id, metodo_pago) {
  console.log("💳 Confirmar pago - ID:", id, "Método:", metodo_pago);
  
  if (!id) {
    alert("❌ ID de pago inválido");
    return;
  }

  if (metodo_pago && metodo_pago.toLowerCase() === "efectivo") {
    alert("ℹ️ Los pagos en efectivo se confirman automáticamente");
    return;
  }

  const confirmar = confirm("¿Deseas confirmar este pago?");
  if (!confirmar) return;

  try {
    console.log("💳 Enviando confirmación a:", `${API_URL}/confirmar/${id}`);
    const res = await fetch(`${API_URL}/confirmar/${id}`, { 
      method: "PUT",
      headers: { "Content-Type": "application/json" }
    });
    
    console.log("💳 Respuesta status:", res.status);
    
    if (!res.ok) {
      const errorText = await res.text();
      console.error("❌ Error al confirmar pago:", errorText);
      alert(`❌ Error al confirmar pago: ${res.status}`);
      return;
    }
    
    const data = await res.json();
    console.log("✅ Pago confirmado:", data);
    alert("✅ Pago confirmado correctamente");
    
    // Recargar todos los datos y mantener los filtros aplicados
    await cargarTodosPagos();
    await cargarTotalGeneral();
    
    // Volver a aplicar los filtros actuales
    aplicarFiltros();
  } catch (err) {
    console.error("❌ Error al confirmar pago:", err);
    alert("❌ Error al confirmar el pago: " + err.message);
  }
}

// Inicialización cuando el DOM está listo
document.addEventListener("DOMContentLoaded", () => {
  // Cargar datos iniciales
  cargarTodosPagos();
  cargarTotalGeneral();
  
  // Event listeners para los botones de filtro
  document.getElementById("btn-filtrar").addEventListener("click", aplicarFiltros);
  document.getElementById("btn-limpiar").addEventListener("click", limpiarFiltros);
  document.getElementById("btn-ordenar-id").addEventListener("click", alternarOrdenamiento);
  
  // Inicializar texto del botón de ordenamiento
  const btnOrdenar = document.getElementById("btn-ordenar-id");
  if (btnOrdenar) {
    btnOrdenar.textContent = ordenAscendente 
      ? "🔢 Ordenar por ID (Asc)" 
      : "🔢 Ordenar por ID (Desc)";
  }
  
  // Auto-refresh cada 5 segundos para ver cambios en tiempo real
  setInterval(async () => {
    await cargarTodosPagos();
    await cargarTotalGeneral();
    // Volver a aplicar los filtros actuales después de recargar
    const fechaDesde = document.getElementById("fecha-desde").value;
    const fechaHasta = document.getElementById("fecha-hasta").value;
    const estadoFiltro = document.getElementById("filtro-estado").value;
    
    // Solo aplicar filtros si hay alguno activo
    if (fechaDesde || fechaHasta || estadoFiltro !== "todos") {
      aplicarFiltros();
    }
  }, 5000);
});

// ⚡ Exponer funciones globalmente para los botones inline
window.confirmarPago = confirmarPago;
window.aplicarFiltros = aplicarFiltros;
window.limpiarFiltros = limpiarFiltros;
