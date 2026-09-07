const API_PEDIDOS = "http://localhost:4001/api/pedidos";

// Variable global para almacenar todos los pedidos
let todosPedidos = [];

// Variable para controlar el ordenamiento por ID
let ordenAscendente = true;

// Función para actualizar las tarjetas de resumen
function actualizarTarjetas(pedidos) {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  const totalPedidos = pedidos.length;
  const pedidosHoy = pedidos.filter(p => {
    const fechaPedido = new Date(p.fecha_pedido || p.fecha || p.created_at);
    fechaPedido.setHours(0, 0, 0, 0);
    return fechaPedido.getTime() === hoy.getTime();
  }).length;
  const entregados = pedidos.filter(p => p.estado === "entregado").length;
  const pendientes = pedidos.filter(p => p.estado === "pendiente").length;

  document.getElementById("total-pedidos").textContent = totalPedidos;
  document.getElementById("pedidos-hoy").textContent = pedidosHoy;
  document.getElementById("pedidos-entregados").textContent = entregados;
  document.getElementById("pedidos-pendientes").textContent = pendientes;
}

// Función para formatear la fecha
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

// Función para aplicar filtros
function aplicarFiltros() {
  const fechaDesde = document.getElementById("filtro-fecha-desde").value;
  const fechaHasta = document.getElementById("filtro-fecha-hasta").value;
  const estado = document.getElementById("filtro-estado").value;
  const tipoServicio = document.getElementById("filtro-tipo").value;

  let pedidosFiltrados = [...todosPedidos];

  // Filtro por fecha desde
  if (fechaDesde) {
    const desde = new Date(fechaDesde);
    desde.setHours(0, 0, 0, 0);
    pedidosFiltrados = pedidosFiltrados.filter(p => {
      const fechaPedido = new Date(p.fecha_pedido || p.fecha || p.created_at);
      fechaPedido.setHours(0, 0, 0, 0);
      return fechaPedido >= desde;
    });
  }

  // Filtro por fecha hasta
  if (fechaHasta) {
    const hasta = new Date(fechaHasta);
    hasta.setHours(23, 59, 59, 999);
    pedidosFiltrados = pedidosFiltrados.filter(p => {
      const fechaPedido = new Date(p.fecha_pedido || p.fecha || p.created_at);
      return fechaPedido <= hasta;
    });
  }

  // Filtro por estado
  if (estado) {
    pedidosFiltrados = pedidosFiltrados.filter(p => p.estado === estado);
  }

  // Filtro por tipo de servicio
  if (tipoServicio) {
    pedidosFiltrados = pedidosFiltrados.filter(p => p.tipo_servicio === tipoServicio);
  }

  // Renderizar tabla filtrada
  renderizarTabla(pedidosFiltrados);
  
  // Actualizar tarjetas con datos filtrados
  actualizarTarjetas(pedidosFiltrados);
}

// Función para limpiar filtros
function limpiarFiltros() {
  document.getElementById("filtro-fecha-desde").value = "";
  document.getElementById("filtro-fecha-hasta").value = "";
  document.getElementById("filtro-estado").value = "";
  document.getElementById("filtro-tipo").value = "";

  // Renderizar tabla con todos los pedidos (se ordenará por ID automáticamente)
  renderizarTabla(todosPedidos);
  actualizarTarjetas(todosPedidos);
}

// Función para ordenar pedidos por ID
function ordenarPorId(pedidos) {
  const pedidosOrdenados = [...pedidos];
  pedidosOrdenados.sort((a, b) => {
    const idA = parseInt(a.id_pedido) || 0;
    const idB = parseInt(b.id_pedido) || 0;
    return ordenAscendente ? idA - idB : idB - idA;
  });
  return pedidosOrdenados;
}

// Función para renderizar la tabla
function renderizarTabla(pedidos) {
  const tbody = document.querySelector("#tabla-pedidos tbody");
  
  if (!pedidos.length) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; padding: 2rem; color: #666;">No hay pedidos que coincidan con los filtros</td></tr>`;
    return;
  }
  
  // Remover el select y botón de guardar, ya no se necesitan

  // Ordenar por ID antes de renderizar
  const pedidosOrdenados = ordenarPorId(pedidos);

  tbody.innerHTML = pedidosOrdenados.map(p => {
    // Nombre del cliente
    const nombreCliente =
      p.cliente_nombre ||
      (p.cliente && (p.cliente.nombre || p.cliente)) ||
      p.nombre_cliente ||
      "Cliente sin nombre";

    // Fecha del pedido
    const fechaPedido = formatearFecha(p.fecha_pedido || p.fecha || p.created_at);

    // Fila resaltada si está entregado
    const claseFila = p.estado === "entregado" ? "entregado" : "";

    // Badge para tipo de servicio
    const tipoServicioBadge = getTipoServicioBadge(p.tipo_servicio);

    // Badge para el estado (solo lectura)
    const estadoBadge = `<span class="badge-estado estado-${p.estado?.toLowerCase().replace(' ', '-') || 'pendiente'}">${(p.estado || 'pendiente').charAt(0).toUpperCase() + (p.estado || 'pendiente').slice(1)}</span>`;
    
    // Información de quién hizo el último cambio
    const ultimoCambioPor = p.ultimo_cambio_por && p.ultimo_cambio_por !== "N/A" ? p.ultimo_cambio_por : null;
    const fechaUltimoCambio = p.fecha_ultimo_cambio ? formatearFecha(p.fecha_ultimo_cambio) : "";
    
    // Construir el contenido de la columna "Cambiado por"
    let contenidoCambio = "";
    if (ultimoCambioPor && fechaUltimoCambio) {
      // Si hay trabajador y fecha, mostrar ambos
      contenidoCambio = `
        <div style="font-size: 0.85rem;">
          <strong>${ultimoCambioPor}</strong><br>
          <small style="color: #666;">${fechaUltimoCambio}</small>
        </div>
      `;
    } else if (fechaUltimoCambio) {
      // Si solo hay fecha, mostrar solo la fecha
      contenidoCambio = `
        <div style="font-size: 0.85rem;">
          <small style="color: #666;">${fechaUltimoCambio}</small>
        </div>
      `;
    } else {
      // Si no hay nada, mostrar "Sin cambios"
      contenidoCambio = `
        <div style="font-size: 0.85rem; color: #999;">
          Sin cambios
        </div>
      `;
    }
    
    return `
      <tr class="${claseFila}">
        <td>${p.id_pedido}</td>
        <td>${nombreCliente}</td>
        <td><span class="fecha-pedido">${fechaPedido}</span></td>
        <td>${tipoServicioBadge}</td>
        <td>${p.metodo_pago}</td>
        <td>S/. ${parseFloat(p.monto_total || p.total || 0).toFixed(2)}</td>
        <td>${estadoBadge}</td>
        <td>${contenidoCambio}</td>
      </tr>
    `;
  }).join("");

  // Ya no se necesitan event listeners para guardar, solo visualización
}

// Función para obtener badge de tipo de servicio
function getTipoServicioBadge(tipo) {
  const badges = {
    'domicilio': '<span class="badge badge-domicilio">🚴 Domicilio</span>',
    'local': '<span class="badge badge-local">🍽️ Local</span>',
    'recojo': '<span class="badge badge-recojo">🛍️ Recojo</span>'
  };
  return badges[tipo] || `<span class="badge">${tipo}</span>`;
}

// Ya no se necesita esta función, el admin solo visualiza

async function cargarPedidos() {
  try {
    const res = await fetch(`${API_PEDIDOS}/listar`);
    if (!res.ok) throw new Error("Error al obtener pedidos");
    const pedidos = await res.json();

    // Guardar todos los pedidos
    todosPedidos = pedidos;

    // Actualizar tarjetas con todos los pedidos
    actualizarTarjetas(pedidos);

    // Renderizar tabla (se ordenará por ID automáticamente)
    renderizarTabla(pedidos);
    
    // Actualizar texto del botón de ordenamiento
    const btnOrdenar = document.getElementById("btn-ordenar-id");
    if (btnOrdenar) {
      btnOrdenar.textContent = ordenAscendente 
        ? "🔢 Ordenar por ID (Asc)" 
        : "🔢 Ordenar por ID (Desc)";
    }

  } catch (err) {
    console.error("Error al cargar pedidos:", err);
    const tbody = document.querySelector("#tabla-pedidos tbody");
    tbody.innerHTML = `<tr><td colspan="8">❌ Error al cargar pedidos</td></tr>`;
    
    // Resetear tarjetas a 0
    document.getElementById("total-pedidos").textContent = "0";
    document.getElementById("pedidos-hoy").textContent = "0";
    document.getElementById("pedidos-entregados").textContent = "0";
    document.getElementById("pedidos-pendientes").textContent = "0";
  }
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

document.addEventListener("DOMContentLoaded", () => {
  cargarPedidos();

  // Event listeners para los botones de filtro
  document.getElementById("btn-filtrar").addEventListener("click", aplicarFiltros);
  document.getElementById("btn-limpiar").addEventListener("click", limpiarFiltros);
  document.getElementById("btn-ordenar-id").addEventListener("click", alternarOrdenamiento);

  // También permitir filtrar al presionar Enter en los inputs
  document.querySelectorAll(".controles input, .controles select").forEach(el => {
    el.addEventListener("keypress", (e) => {
      if (e.key === "Enter") aplicarFiltros();
    });
    // Auto-filtrar al cambiar select
    if (el.tagName === "SELECT") {
      el.addEventListener("change", aplicarFiltros);
    }
  });

  // Auto-refresh cada 5 segundos para ver cambios en tiempo real
  setInterval(() => {
    cargarPedidos();
  }, 5000);
});
