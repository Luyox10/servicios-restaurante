const API_PEDIDOS = "http://localhost:4001/api/pedidos";
let todosPedidos = [];
let filtrosActivos = false; // Variable para rastrear si hay filtros aplicados
let ordenActual = null; // null = sin orden, 'asc' = ascendente, 'desc' = descendente

function actualizarTarjetas(pedidos) {
  // Obtener fecha de hoy en zona horaria de Perú
  const hoy = new Date();
  const hoyPeruStr = hoy.toLocaleString('en-US', { 
    timeZone: 'America/Lima',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  const [hoyMonth, hoyDay, hoyYear] = hoyPeruStr.split('/');
  const hoyPeru = new Date(parseInt(hoyYear), parseInt(hoyMonth) - 1, parseInt(hoyDay));
  
  const totalPedidos = pedidos.length;
  const pedidosHoy = pedidos.filter(p => {
    const fechaPedido = obtenerSoloFecha(p.fecha_pedido || p.fecha || p.created_at);
    if (!fechaPedido) return false;
    // Comparar solo las fechas (sin hora)
    return fechaPedido.getTime() === hoyPeru.getTime();
  }).length;
  const entregados = pedidos.filter(p => p.estado === "entregado").length;
  const pendientes = pedidos.filter(p => p.estado === "pendiente").length;
  document.getElementById("total-pedidos").textContent = totalPedidos;
  document.getElementById("pedidos-hoy").textContent = pedidosHoy;
  document.getElementById("pedidos-entregados").textContent = entregados;
  document.getElementById("pedidos-pendientes").textContent = pendientes;
}

function formatearFecha(fecha) {
  if (!fecha) return "Sin fecha";
  
  let date;
  if (typeof fecha === 'string') {
    // Si ya tiene formato ISO con zona horaria (YYYY-MM-DDTHH:MM:SS-05:00), usarlo directamente
    if (fecha.includes('T') && (fecha.includes('-05:00') || fecha.includes('+05:00'))) {
      date = new Date(fecha);
    }
    // Si tiene formato ISO sin zona horaria pero con T (YYYY-MM-DDTHH:MM:SS), agregar zona horaria de Perú
    else if (fecha.includes('T') && !fecha.includes('Z') && !fecha.includes('+') && !fecha.includes('-05:00')) {
      date = new Date(fecha + '-05:00');
    }
    // Si es formato PostgreSQL sin T (YYYY-MM-DD HH:MM:SS), convertir a ISO con zona horaria
    else if (!fecha.includes('T') && !fecha.includes('Z') && !fecha.includes('+')) {
      date = new Date(fecha.replace(' ', 'T') + '-05:00');
    }
    else {
      date = new Date(fecha);
    }
  } else {
    date = new Date(fecha);
  }
  
  if (isNaN(date.getTime())) return "Sin fecha";
  
  // Formatear fecha en zona horaria de Perú para asegurar consistencia
  return date.toLocaleString('es-PE', { 
    timeZone: 'America/Lima',
    day: '2-digit', 
    month: '2-digit', 
    year: 'numeric', 
    hour: '2-digit', 
    minute: '2-digit',
    second: '2-digit'
  });
}

// Función auxiliar para obtener solo la fecha (año, mes, día) sin hora en zona horaria de Perú
function obtenerSoloFecha(date) {
  if (!date) return null;
  const d = new Date(date);
  if (isNaN(d.getTime())) return null;
  // Obtener componentes de fecha en zona horaria de Perú
  const fechaPeruStr = d.toLocaleString('en-US', { 
    timeZone: 'America/Lima',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  // Parsear la fecha (formato MM/DD/YYYY)
  const [month, day, year] = fechaPeruStr.split('/');
  // Crear una nueva fecha solo con año, mes y día (sin hora, minutos, segundos)
  return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
}

// Función para convertir fecha del input (YYYY-MM-DD) a Date
function parsearFechaInput(fechaInput) {
  if (!fechaInput) return null;
  // El input type="date" devuelve formato YYYY-MM-DD
  // Crear fecha directamente sin problemas de zona horaria
  const partes = fechaInput.split('-');
  if (partes.length !== 3) return null;
  return new Date(parseInt(partes[0]), parseInt(partes[1]) - 1, parseInt(partes[2]));
}

function aplicarFiltros() {
  const fechaDesde = document.getElementById("filtro-fecha-desde").value;
  const fechaHasta = document.getElementById("filtro-fecha-hasta").value;
  const estado = document.getElementById("filtro-estado").value;
  const tipoServicio = document.getElementById("filtro-tipo").value;
  
  // Verificar si hay algún filtro activo
  filtrosActivos = !!(fechaDesde || fechaHasta || estado || tipoServicio);
  
  // Si no hay pedidos cargados, mostrar mensaje
  if (todosPedidos.length === 0) {
    renderizarTabla([]);
    actualizarTarjetas([]);
    return;
  }
  
  let pedidosFiltrados = [...todosPedidos];
  
  // Filtro por fecha desde
  if (fechaDesde) {
    const desde = parsearFechaInput(fechaDesde);
    if (desde) {
      pedidosFiltrados = pedidosFiltrados.filter(p => {
        const fechaPedido = obtenerSoloFecha(p.fecha_pedido || p.fecha || p.created_at);
        if (!fechaPedido) return false;
        // Incluir pedidos del mismo día o posteriores (>= incluye el extremo "desde")
        return fechaPedido.getTime() >= desde.getTime();
      });
    }
  }
  
  // Filtro por fecha hasta
  if (fechaHasta) {
    const hasta = parsearFechaInput(fechaHasta);
    if (hasta) {
      pedidosFiltrados = pedidosFiltrados.filter(p => {
        const fechaPedido = obtenerSoloFecha(p.fecha_pedido || p.fecha || p.created_at);
        if (!fechaPedido) return false;
        // Incluir pedidos del mismo día o anteriores (<= incluye el extremo "hasta")
        return fechaPedido.getTime() <= hasta.getTime();
      });
    }
  }
  
  // Filtro por estado
  if (estado) {
    pedidosFiltrados = pedidosFiltrados.filter(p => p.estado === estado);
  }
  
  // Filtro por tipo de servicio
  if (tipoServicio) {
    pedidosFiltrados = pedidosFiltrados.filter(p => p.tipo_servicio === tipoServicio);
  }
  
  renderizarTabla(pedidosFiltrados);
  actualizarTarjetas(pedidosFiltrados);
}

function limpiarFiltros() {
  document.getElementById("filtro-fecha-desde").value = "";
  document.getElementById("filtro-fecha-hasta").value = "";
  document.getElementById("filtro-estado").value = "";
  document.getElementById("filtro-tipo").value = "";
  filtrosActivos = false; // Marcar que no hay filtros activos
  // Aplicar ordenamiento si está activo
  const pedidosOrdenados = ordenarPedidosPorId(todosPedidos);
  renderizarTabla(pedidosOrdenados);
  actualizarTarjetas(pedidosOrdenados);
}

// Función para ordenar pedidos por ID
function ordenarPedidosPorId(pedidos) {
  if (!ordenActual) return pedidos; // Si no hay orden, retornar sin cambios
  
  const pedidosOrdenados = [...pedidos];
  pedidosOrdenados.sort((a, b) => {
    const idA = parseInt(a.id_pedido) || 0;
    const idB = parseInt(b.id_pedido) || 0;
    return ordenActual === 'asc' ? idA - idB : idB - idA;
  });
  return pedidosOrdenados;
}

// Función para actualizar el icono de ordenamiento
function actualizarIconoOrdenamiento() {
  const sortIcon = document.getElementById('sort-icon');
  if (!sortIcon) return;
  
  // Remover clases anteriores
  sortIcon.classList.remove('asc', 'desc');
  
  // Agregar clase según el orden actual
  if (ordenActual === 'asc') {
    sortIcon.classList.add('asc');
  } else if (ordenActual === 'desc') {
    sortIcon.classList.add('desc');
  }
}

// Función para cambiar el orden
function cambiarOrden() {
  if (ordenActual === null || ordenActual === 'desc') {
    ordenActual = 'asc';
  } else {
    ordenActual = 'desc';
  }
  actualizarIconoOrdenamiento();
  
  // Reaplicar filtros si están activos, o mostrar todos los pedidos
  if (filtrosActivos) {
    aplicarFiltros();
  } else {
    const pedidosOrdenados = ordenarPedidosPorId(todosPedidos);
    renderizarTabla(pedidosOrdenados);
    actualizarTarjetas(pedidosOrdenados);
  }
}

function renderizarTabla(pedidos) {
  const tbody = document.querySelector("#tabla-pedidos tbody");
  if (!pedidos.length) {
    const mensaje = filtrosActivos 
      ? "No hay pedidos que coincidan con los filtros aplicados" 
      : "No hay pedidos";
    tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; padding: 2rem; color: #666;">${mensaje}</td></tr>`;
    return;
  }
  
  // Ordenar los pedidos antes de renderizar
  const pedidosOrdenados = ordenarPedidosPorId(pedidos);
  
  tbody.innerHTML = pedidosOrdenados.map(p => {
    const estados = p.tipo_servicio === "domicilio" ? ["pendiente", "en preparación", "en camino", "entregado"] : ["pendiente", "en preparación", "entregado"];
    const opcionesEstado = estados.map(e => `<option value="${e}" ${p.estado === e ? "selected" : ""}>${e.charAt(0).toUpperCase() + e.slice(1)}</option>`).join("");
    const nombreCliente = p.cliente_nombre || (p.cliente && (p.cliente.nombre || p.cliente)) || p.nombre_cliente || "Cliente sin nombre";
    const fechaPedido = formatearFecha(p.fecha_pedido || p.fecha || p.created_at);
    const claseFila = p.estado === "entregado" ? "entregado" : "";
    const tipoServicioBadge = getTipoServicioBadge(p.tipo_servicio);
    return `<tr class="${claseFila}"><td>${p.id_pedido}</td><td>${nombreCliente}</td><td><span class="fecha-pedido">${fechaPedido}</span></td><td>${tipoServicioBadge}</td><td>${p.metodo_pago}</td><td>S/. ${parseFloat(p.monto_total || p.total || 0).toFixed(2)}</td><td><select class="estado" data-id="${p.id_pedido}">${opcionesEstado}</select></td><td><button class="guardar" data-id="${p.id_pedido}">💾 Guardar</button></td></tr>`;
  }).join("");
  agregarEventListeners();
}

function getTipoServicioBadge(tipo) {
  const badges = { 'domicilio': '<span class="badge badge-domicilio">🚴 Domicilio</span>', 'local': '<span class="badge badge-local">🍽️ Local</span>', 'recojo': '<span class="badge badge-recojo">🛍️ Recojo</span>' };
  return badges[tipo] || `<span class="badge">${tipo}</span>`;
}

// Función para obtener información del trabajador logueado
async function obtenerTrabajadorLogueado() {
  try {
    // Intentar obtener desde localStorage
    const trabajadorLocal = localStorage.getItem("trabajador");
    if (trabajadorLocal) {
      try {
        const trabajador = JSON.parse(trabajadorLocal);
        console.log("📦 Trabajador desde localStorage:", trabajador);
        const trabajadorInfo = { 
          id: trabajador.id || trabajador.id_usuario || trabajador.idUsuario, 
          nombre: trabajador.nombre 
        };
        console.log("✅ Trabajador info extraída:", trabajadorInfo);
        return trabajadorInfo;
      } catch (e) {
        console.error("❌ Error parseando localStorage:", e);
        localStorage.removeItem("trabajador");
      }
    }
    
    // Si no está en localStorage, consultar al servidor
    console.log("🌐 Consultando servidor para obtener trabajador...");
    const res = await fetch("http://localhost:3000/api/sesion/trabajador", {
      credentials: "include"
    });
    const data = await res.json();
    console.log("📡 Respuesta del servidor:", data);
    
    if (data.logueado && data.trabajador) {
      localStorage.setItem("trabajador", JSON.stringify(data.trabajador));
      const trabajadorInfo = { 
        id: data.trabajador.id || data.trabajador.id_usuario || data.trabajador.idUsuario, 
        nombre: data.trabajador.nombre 
      };
      console.log("✅ Trabajador info desde servidor:", trabajadorInfo);
      return trabajadorInfo;
    }
    
    console.warn("⚠️ No se encontró trabajador logueado");
    return null;
  } catch (err) {
    console.error("❌ Error al obtener trabajador:", err);
    return null;
  }
}

function agregarEventListeners() {
  document.querySelectorAll(".guardar").forEach(btn => {
    btn.addEventListener("click", async (e) => {
      const id = e.target.dataset.id;
      const estado = document.querySelector(`select[data-id='${id}']`).value;
      
      // Obtener información del trabajador logueado
      const trabajador = await obtenerTrabajadorLogueado();
      console.log("🔍 Trabajador obtenido:", trabajador);
      
      try {
        const body = { estado };
        if (trabajador) {
          body.trabajador_id = trabajador.id;
          body.trabajador_nombre = trabajador.nombre;
          console.log("📤 Enviando datos del trabajador:", { trabajador_id: trabajador.id, trabajador_nombre: trabajador.nombre });
        } else {
          console.warn("⚠️ No se pudo obtener información del trabajador");
        }
        
        console.log("📤 Body completo:", body);
        const resp = await fetch(`${API_PEDIDOS}/${id}/estado`, { 
          method: "PATCH", 
          headers: { "Content-Type": "application/json" }, 
          body: JSON.stringify(body) 
        });
        if (!resp.ok) throw new Error("Error al actualizar estado");
        const result = await resp.json();
        console.log("✅ Respuesta del servidor:", result);
        alert("✅ Estado actualizado correctamente");
        cargarPedidos();
      } catch (err) { console.error("❌ Error:", err); alert("❌ Error al actualizar estado"); }
    });
  });
}

async function cargarPedidos() {
  try {
    const res = await fetch(`${API_PEDIDOS}/listar`);
    if (!res.ok) throw new Error("Error al obtener pedidos");
    const pedidos = await res.json();
    todosPedidos = pedidos;
    
    // Actualizar icono de ordenamiento
    actualizarIconoOrdenamiento();
    
    // Si hay filtros activos, reaplicarlos automáticamente
    if (filtrosActivos) {
      aplicarFiltros();
    } else {
      // Si no hay filtros, mostrar todos los pedidos (con ordenamiento si está activo)
      const pedidosOrdenados = ordenarPedidosPorId(pedidos);
      actualizarTarjetas(pedidosOrdenados);
      renderizarTabla(pedidosOrdenados);
    }
  } catch (err) {
    console.error("Error al cargar pedidos:", err);
    const tbody = document.querySelector("#tabla-pedidos tbody");
    tbody.innerHTML = `<tr><td colspan="8">❌ Error al cargar pedidos</td></tr>`;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  cargarPedidos();
  document.getElementById("btn-filtrar").addEventListener("click", aplicarFiltros);
  document.getElementById("btn-limpiar").addEventListener("click", limpiarFiltros);
  
  // Event listener para el icono de ordenamiento
  const sortIcon = document.getElementById("sort-icon");
  if (sortIcon) {
    sortIcon.addEventListener("click", cambiarOrden);
  }
  
  setInterval(() => { cargarPedidos(); }, 15000);
});

