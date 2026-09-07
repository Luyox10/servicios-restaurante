const API_MENU = "http://localhost:4000/api/menu";
const API_CARRITO = "http://localhost:4000/api/menu/carrito";
const API_PEDIDOS = "http://localhost:4001/api/pedidos";
const API_PAGOS = "http://localhost:4002/pagos"; // ✅ AGREGADA

const carritoDiv = document.getElementById("carrito");
const totalP = document.getElementById("total");

// Sections (incluyen las nuevas: pantalla-espera y pantalla-seguimiento)
const secciones = {
  carrito: document.getElementById("carrito-servicio-section"),
  cliente: document.getElementById("cliente-section"),
  direccion: document.getElementById("direccion-section"),
  resumen: document.getElementById("resumen-section"),
  pago: document.getElementById("pago-section"),
  espera: document.getElementById("pantalla-espera"),
  seguimientoPago: document.getElementById("pantalla-seguimiento-pago"),
  seguimientoPedido: document.getElementById("pantalla-seguimiento-pedido")
};

let carrito = [];
let pedido = {
  tipo_servicio: "",
  cliente: {},
  direccion: {},
  metodo_pago: "",
  productos: [],
  detalles: [],
  total: 0
};

// Intervalos globales para seguimiento automático
window.intervalPago = null;
window.intervalSeguimiento = null;

// ---------- Helpers UI ----------
function mostrarSeccion(nombre) {
  Object.values(secciones).forEach(sec => { if (sec) sec.classList.add("oculto"); });
  const s = secciones[nombre];
  if (s) s.classList.remove("oculto");
}

function element(id) { return document.getElementById(id); }

function norm(s) {
  if (!s && s !== "") return "";
  return s.toString().toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ").trim();
}

function renderTimeline(estadoActual, tipoServicio) {
  const steps = (norm(tipoServicio) === "domicilio")
    ? ["pendiente", "en preparacion", "en camino", "entregado"]
    : ["pendiente", "en preparacion", "entregado"];

  const mapId = {
    "pendiente": "step-pendiente",
    "en preparacion": "step-preparacion",
    "en camino": "step-camino",
    "entregado": "step-entregado"
  };

  Object.values(mapId).forEach(id => {
    const el = element(id);
    if (el) { el.classList.remove("activo"); el.classList.remove("completado"); el.style.display = "flex"; }
  });

  if (steps.indexOf("en camino") === -1) {
    const elCam = element(mapId["en camino"]);
    if (elCam) elCam.style.display = "none";
  }

  const idxActual = steps.indexOf(norm(estadoActual));
  steps.forEach((st, idx) => {
    const el = element(mapId[st]);
    if (!el) return;
    if (idx < idxActual) el.classList.add("completado");
    else if (idx === idxActual) el.classList.add("activo");
  });
}

// ---------- NUEVA FUNCIÓN: abrir seguimiento ----------
function abrirSeguimiento() {
  // Ocultar todas las secciones
  Object.values(secciones).forEach(sec => { if(sec) sec.classList.add("oculto"); });

  // Restaurar seguimiento activo si existía
  const idPago = obtenerPagoActivo();
  const idPedido = obtenerPedidoActivo();

  if (idPago) mostrarSeguimientoPago({ pago_id: idPago });
  else if (idPedido) iniciarSeguimientoAutomático(idPedido);
  else {
    alert("No hay pedidos activos para seguimiento.");
    mostrarSeccion("carrito"); // fallback al carrito
  }
}

// ---------- Carrito ----------
// 🔹 Cargar carrito
async function cargarCarrito() {
  try {
    const res = await fetch(`${API_MENU}/carrito`);
    if (res.ok) {
      carrito = await res.json();
    } else {
      carrito = [];
    }
    mostrarCarrito();
  } catch (err) {
    console.error("Error al cargar carrito:", err);
    carrito = [];
    mostrarCarrito();
  }
}

// 🔹 Vaciar carrito
async function vaciarCarrito() {
  try {
    // Vaciar todo el carrito
    const res = await fetch(`${API_MENU}/carrito/vaciar`, {
      method: "POST",
      headers: { "Content-Type": "application/json" }
    });
    
    if (res.ok) {
      // Actualizar carrito local
      carrito = [];
      mostrarCarrito();
      console.log("✅ Carrito vaciado correctamente");
    } else {
      console.error("Error al vaciar carrito:", await res.text());
    }
  } catch (err) {
    console.error("Error al vaciar carrito:", err);
    // Aún así, limpiar el carrito local
    carrito = [];
    mostrarCarrito();
  }
}

// 🔹 Obtener ID de usuario
function obtenerUsuarioId() {
  try {
    const usuarioStr = localStorage.getItem("usuario");
    if (usuarioStr) {
      const usuario = JSON.parse(usuarioStr);
      return usuario.id || usuario._id || null;
    }
  } catch (err) {
    console.error("Error al obtener usuario:", err);
  }
  return null;
}

// 🔹 Mostrar carrito
function mostrarCarrito() {
  if (!carrito.length) {
    carritoDiv.innerHTML = "<p>No hay productos en el carrito.</p>";
    totalP.textContent = "";
    return;
  }

 carritoDiv.innerHTML = carrito.map(p => `
    <div class="producto">
      <p>${p.nombre} <br><small>S/. ${p.precio}</small></p>
      <div class="controles">
        <button onclick="actualizarCantidad('${p._id}', -1)">➖</button>
        <span>${p.cantidad}</span>
        <button onclick="actualizarCantidad('${p._id}', 1)">➕</button>
        <button onclick="eliminarProducto('${p._id}')">🗑️</button>
      </div>
    </div>
  `).join("");

  const total = carrito.reduce((a, p) => a + p.precio * p.cantidad, 0);
  totalP.textContent = `Total: S/. ${total.toFixed(2)}`;

  pedido.productos = carrito;
  pedido.total = total;
}

// 🔹 Actualizar cantidad
async function actualizarCantidad(id, cambio) {
  const item = carrito.find(p => p._id === id);
  if (!item) return;

  const nuevaCantidad = item.cantidad + cambio;
  if (nuevaCantidad <= 0) {
    await eliminarProducto(id);
    return;
  }

  try {
    await fetch(`${API_MENU}/carrito/agregar`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        producto_id: item.producto_id || item._id,
        cantidad: cambio
      })
    });
  } catch (err) {
    console.error("Error al actualizar cantidad:", err);
  }

  await cargarCarrito();
}

async function eliminarProducto(id) {
  try {
    await fetch(`${API_MENU}/carrito/${id}`, { method: "DELETE" });
  } catch (err) {
    console.error("Error al eliminar producto:", err);
  }
  await cargarCarrito();
}

// ---------- Flujo de secciones ----------
document.querySelectorAll(".servicio-btn").forEach(btn => {
  btn.addEventListener("click", e => {
    pedido.tipo_servicio = e.target.dataset.tipo;
    if (pedido.tipo_servicio === "domicilio") mostrarSeccion("cliente");
    else { mostrarResumenPedido(); mostrarSeccion("resumen"); }
  });
});

const btnConfirmarDatos = document.getElementById("btn-confirmar-datos");
const nombreInput = document.getElementById("nombre");
const telefonoInput = document.getElementById("telefono");
if (btnConfirmarDatos) btnConfirmarDatos.disabled = true;

function validarDatosCliente() {
  if (!btnConfirmarDatos) return;
  btnConfirmarDatos.disabled = !(nombreInput.value.trim() && telefonoInput.value.trim());
}
if (nombreInput) nombreInput.addEventListener("input", validarDatosCliente);
if (telefonoInput) telefonoInput.addEventListener("input", validarDatosCliente);

if (btnConfirmarDatos) {
  btnConfirmarDatos.addEventListener("click", () => {
    pedido.cliente = { nombre: nombreInput.value.trim(), telefono: telefonoInput.value.trim() };
    mostrarSeccion("direccion");
  });
}

const btnRegresarCliente = document.getElementById("btn-regresar-cliente");
if (btnRegresarCliente) btnRegresarCliente.addEventListener("click", () => mostrarSeccion("carrito"));

const btnConfirmarDireccion = document.getElementById("btn-confirmar-direccion");
const calleInput = document.getElementById("calle");
const referenciaInput = document.getElementById("referencia");
if (btnConfirmarDireccion) btnConfirmarDireccion.disabled = true;

function validarDireccion() {
  if (!btnConfirmarDireccion) return;
  btnConfirmarDireccion.disabled = !(calleInput.value.trim() && referenciaInput.value.trim());
}
if (calleInput) calleInput.addEventListener("input", validarDireccion);
if (referenciaInput) referenciaInput.addEventListener("input", validarDireccion);

if (btnConfirmarDireccion) {
  btnConfirmarDireccion.addEventListener("click", () => {
    pedido.direccion = {
      calle_avenida: calleInput.value.trim(),
      calle: calleInput.value.trim(),
      referencia: referenciaInput.value.trim()
    };
    mostrarResumenDatos();
    mostrarSeccion("resumen");
  });
}

const btnRegresarDireccion = document.getElementById("btn-regresar-direccion");
if (btnRegresarDireccion) btnRegresarDireccion.addEventListener("click", () => mostrarSeccion("cliente"));

function mostrarResumenDatos() {
  const resumenDiv = document.getElementById("resumen");
  if (!resumenDiv) return;

  element("titulo-resumen-cliente").classList.remove("oculto");
  element("titulo-resumen-pedido").classList.add("oculto");

  resumenDiv.innerHTML = `
    <h3>Datos del Cliente</h3>
    <p><strong>Nombre:</strong> ${pedido.cliente.nombre || "-"}</p>
    <p><strong>Teléfono:</strong> ${pedido.cliente.telefono || "-"}</p>
    <h3>Dirección</h3>
    <p><strong>Calle:</strong> ${pedido.direccion.calle_avenida || "-"}</p>
    <p><strong>Referencia:</strong> ${pedido.direccion.referencia || "-"}</p>
    <div class="botones">
      <button id="editar-cliente">✏️ Editar Datos del Cliente</button>
      <button id="editar-direccion">✏️ Editar Dirección</button>
    </div>
    <br><button id="btn-ir-resumen" style="width:100%;">Continuar al Resumen del Pedido</button>
  `;

  const editarClienteBtn = document.getElementById("editar-cliente");
  const editarDireccionBtn = document.getElementById("editar-direccion");
  const btnIrResumen = document.getElementById("btn-ir-resumen");

  if (editarClienteBtn) editarClienteBtn.addEventListener("click", () => mostrarSeccion("cliente"));
  if (editarDireccionBtn) editarDireccionBtn.addEventListener("click", () => mostrarSeccion("direccion"));
  if (btnIrResumen) btnIrResumen.addEventListener("click", mostrarResumenPedido);
}

function mostrarResumenPedido() {
  const resumenDiv = document.getElementById("resumen");
  if (!resumenDiv) return;

  
element("titulo-resumen-cliente").classList.add("oculto");
element("titulo-resumen-pedido").classList.remove("oculto");


  resumenDiv.innerHTML = `
    <h3>Productos:</h3>
    ${pedido.productos.map(p => `<p>${p.nombre} - ${p.cantidad} x S/. ${p.precio}</p>`).join("")}
    <p><strong>Total: S/. ${pedido.total.toFixed(2)}</strong></p>
    <div class="botones">
      <button id="btn-regresar-resumen">⬅ Regresar</button>
      <button id="btn-confirmar-pago">Ir a Pago</button>
    </div>
  `;

  const btnRegresarResumen = document.getElementById("btn-regresar-resumen");
  const btnConfirmarPago = document.getElementById("btn-confirmar-pago");

  if (btnRegresarResumen) {
    btnRegresarResumen.addEventListener("click", () => {
      if (pedido.tipo_servicio === "domicilio") mostrarResumenDatos();
      else mostrarSeccion("carrito");
    });
  }
  if (btnConfirmarPago) btnConfirmarPago.addEventListener("click", () => mostrarSeccion("pago"));
}
// ---------- Selección de pago ----------
document.querySelectorAll(".pago-btn").forEach(btn => {
  btn.addEventListener("click", e => {
    pedido.metodo_pago = e.target.dataset.metodo;
    const pagoExtra = document.getElementById("pago-extra");
    if (!pagoExtra) return;

    if (pedido.metodo_pago === "yape") {
      pagoExtra.innerHTML = `
        <p>Escanee el siguiente QR para realizar su pago por Yape:</p>
        <img src="qr_yape.jpeg" alt="QR Yape" style="width:200px; height:auto; margin:10px 0;">
        <p><strong>Número Yape:</strong> 931748247</p>
      `;
    } else {
// AUTOLLENADO DEL MONTO TOTAL
  pagoExtra.innerHTML = `
    <label>Monto con el que pagará:</label>
    <input id="monto" type="number" value="${pedido.total.toFixed(2)}">
  `;
    }
  });
});

const btnRegresarPago = document.getElementById("btn-regresar-pago");
if (btnRegresarPago) btnRegresarPago.addEventListener("click", () => mostrarSeccion("resumen"));

// ---------- Seguimiento helpers ----------

function guardarPedidoActivo(idPedido) {
  try { localStorage.setItem("pedido_activo", String(idPedido)); } catch(e) {}
}
function obtenerPedidoActivo() {
  try { return localStorage.getItem("pedido_activo"); } catch(e) { return null; }
}
function limpiarPedidoActivo() {
  try { localStorage.removeItem("pedido_activo"); } catch(e) {}
}

function guardarPagoActivo(idPago) {
  try { localStorage.setItem("pago_activo", String(idPago)); } catch(e) {}
}
function obtenerPagoActivo() {
  try { return localStorage.getItem("pago_activo"); } catch(e) { return null; }
}
function limpiarPagoActivo() {
  try { localStorage.removeItem("pago_activo"); } catch(e) {}
}
function guardarSeguimientoActivo(tipo) {
  try { localStorage.setItem("seguimiento_activo", tipo); } catch(e) {}
}
function obtenerSeguimientoActivo() {
  try { return localStorage.getItem("seguimiento_activo"); } catch(e) { return null; }
}
function limpiarSeguimientoActivo() {
  try { localStorage.removeItem("seguimiento_activo"); } catch(e) {}
}


// ---------- Polling seguimiento de Pedido ----------
async function fetchSeguimiento(idPedido) {
  try {
    const res = await fetch(`${API_PEDIDOS}/seguimiento/${encodeURIComponent(idPedido)}`);
    if (!res.ok) return null;
    const json = await res.json();
    if (json.pedido) return json.pedido;
    return json;
  } catch (err) {
    console.error("Error fetchSeguimiento:", err);
    return null;
  }
}

// ---------- Seguimiento de Pago ----------
async function fetchPago(idPago) {
  try {
    // Intentar primero obtener por ID de pago
    let res = await fetch(`${API_PAGOS}/${idPago}`);
    if (res.ok) {
      const pago = await res.json();
      if (pago && pago.id) return pago;
    }
    
    // Si no funciona, intentar obtener por ID de pedido
    res = await fetch(`${API_PAGOS}/por-pedido/${idPago}`);
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.error("Error fetchPago:", err);
    return null;
  }
}

async function verificarEstadoPago() {
  const idPago = obtenerPagoActivo();
  if (!idPago) { clearInterval(window.intervalPago); return; }

  const data = await fetchPago(idPago);
  const stepPendienteEl = document.getElementById("step-pendiente-pago");
  const stepCompletadoEl = document.getElementById("step-completado-pago");
  const estadoTexto = document.getElementById("estado-texto-pago");
  const loader = document.getElementById("loader-pago");

  if (!data || !data.estado) return;
  const estado = norm(data.estado);

  if (estado === "pendiente") {
    if (estadoTexto) estadoTexto.textContent = "⏳ Tu pago está pendiente de confirmación.";
    stepPendienteEl?.classList.add("activo");
    stepPendienteEl?.querySelector(".circle")?.classList.add("activo");
    stepCompletadoEl?.classList.remove("activo");
    stepCompletadoEl?.querySelector(".circle")?.classList.remove("activo");
  }

  if (estado === "completado" || estado === "pagado") {
    if (estadoTexto) estadoTexto.textContent = "✅ Pago confirmado por el administrador.";
    if (loader) loader.style.display = "none";

    stepPendienteEl?.classList.remove("activo");
    stepPendienteEl?.classList.add("completado");
    stepCompletadoEl?.classList.add("activo");
    stepCompletadoEl?.querySelector(".circle")?.classList.add("activo");

   clearInterval(window.intervalPago);
    limpiarPagoActivo();

    // ✅ habilitar botón continuar
    const btnContinuar = document.getElementById("btn-continuar-pago");
    if (btnContinuar) btnContinuar.disabled = false;

  }
}

function mostrarSeguimientoPago(infoInicial = {}) {
  mostrarSeccion("seguimientoPago");

  const idPago = infoInicial.id || infoInicial.id_pago || infoInicial.pago_id;
  if (!idPago) { console.error("No se recibió idPago para seguimiento."); return; }

  guardarPagoActivo(idPago);
  guardarSeguimientoActivo("pago");


  const stepPendienteEl = document.getElementById("step-pendiente-pago");
  const stepCompletadoEl = document.getElementById("step-completado-pago");
  const estadoTexto = document.getElementById("estado-texto-pago");
  const loader = document.getElementById("loader-pago");
  const btnContinuar = document.getElementById("btn-continuar-pago");

  // Inicializar visuales
  stepPendienteEl?.classList.add("activo");
  stepPendienteEl?.querySelector(".circle")?.classList.add("activo");
  stepCompletadoEl?.classList.remove("activo");
  stepCompletadoEl?.querySelector(".circle")?.classList.remove("activo");
  if (estadoTexto) estadoTexto.textContent = "⏳ Tu pago está pendiente de confirmación.";
  if (loader) loader.style.display = "block";

  // Botón visible pero deshabilitado al inicio
  if (btnContinuar) {
    btnContinuar.disabled = true;
    btnContinuar.onclick = async () => {
      const infoPedido = await fetchSeguimiento(obtenerPedidoActivo());
      iniciarSeguimientoAutomático(obtenerPedidoActivo(), infoPedido);
    };
  }

  // Intervalo de verificación automática
  window.intervalPago = setInterval(async () => {
    const data = await fetchPago(idPago);
    if (!data || !data.estado) return;
    const estado = norm(data.estado);

    if (estado === "pendiente") {
      if (estadoTexto) estadoTexto.textContent = "⏳ Tu pago está pendiente de confirmación.";
    }

    if (estado === "completado" || estado === "pagado") {
      if (estadoTexto) estadoTexto.textContent = "✅ Pago confirmado por el administrador.";
      if (loader) loader.style.display = "none";

      stepPendienteEl?.classList.remove("activo");
      stepPendienteEl?.classList.add("completado");
      stepCompletadoEl?.classList.add("activo");
      stepCompletadoEl?.querySelector(".circle")?.classList.add("activo");

      clearInterval(window.intervalPago);
      limpiarPagoActivo();
      

      // Habilitar botón para continuar al seguimiento del pedido
      if (btnContinuar) btnContinuar.disabled = false;
    }
  }, 3000);
}

function mostrarEsperaYape(idPedido, idPago) { 
  if (idPedido) guardarPedidoActivo(idPedido);
  mostrarSeguimientoPago({ pago_id: idPago }); 
}



// ---------- Seguimiento automático de Pedido ----------
async function iniciarSeguimientoAutomático(idPedido, pedidoInfoCached = null) {
  if (window.intervalPago) clearInterval(window.intervalPago);
  if (window.intervalSeguimiento) clearInterval(window.intervalSeguimiento);

  mostrarSeccion("seguimientoPedido");
  guardarPedidoActivo(idPedido);
  guardarSeguimientoActivo("pedido");


  if (pedidoInfoCached) {
    const estadoPedido = pedidoInfoCached.estadoPedido || pedidoInfoCached.estado_pedido || "";
    const tipoServicio = pedidoInfoCached.tipoServicio || pedidoInfoCached.tipo_servicio || pedido.tipo_servicio;
    renderTimeline(estadoPedido, tipoServicio || "");
  }

  window.intervalSeguimiento = setInterval(async () => {
    const info = await fetchSeguimiento(idPedido);
    if (!info) return;
    const estadoPedido = info.estadoPedido || info.estado_pedido || "";
    const tipoServicio = info.tipoServicio || info.tipo_servicio || pedido.tipo_servicio || "";
    renderTimeline(estadoPedido, tipoServicio);

    if (norm(estadoPedido) === "entregado") {
      clearInterval(window.intervalSeguimiento);
      limpiarPedidoActivo();
      limpiarSeguimientoActivo();
      
      // Vaciar el carrito cuando el pedido esté entregado
      await vaciarCarrito();
      
      // Mostrar mensaje de que el pedido fue entregado
      const btnVolver = document.getElementById("btn-volver-inicio-pedido");
      if (btnVolver) {
        btnVolver.textContent = "✅ Pedido Entregado - Volver al Menú";
        btnVolver.style.background = "linear-gradient(135deg, #28a745 0%, #20c997 100%)";
      }
    }
  }, 4000);
}



// ---------- Enviar pedido ----------
document.getElementById("btn-enviar-pedido").addEventListener("click", async () => {
  try {
    const montoInput = document.getElementById("monto");
    if (montoInput) {
      const val = parseFloat(montoInput.value);
      if (!isNaN(val) && val > 0) pedido.total = val;
    }

    pedido.detalles = (pedido.productos || []).map(p => ({
      id_producto_mongo: p._id || p.producto_id,
      nombre_producto: p.nombre,
      cantidad: p.cantidad,
      precio_unitario: p.precio,
      subtotal: (parseFloat(p.precio || 0) * (p.cantidad || 0))
    }));
    pedido.monto_total = pedido.total;

    if (!pedido.productos || pedido.productos.length === 0) { alert("El carrito está vacío."); return; }
    if (!pedido.tipo_servicio) { alert("Seleccione el tipo de servicio."); return; }
    if (pedido.tipo_servicio === "domicilio") {
      if (!pedido.cliente || !pedido.cliente.nombre) { alert("Complete los datos del cliente."); mostrarSeccion("cliente"); return; }
      if (!pedido.direccion || !pedido.direccion.calle_avenida) { alert("Complete la dirección de entrega."); mostrarSeccion("direccion"); return; }
    }

    const res = await fetch(`${API_PEDIDOS}/crear`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(pedido)
    });

    const data = await res.json();
    if (!res.ok) { throw new Error(data.error || data.message || "Error al crear pedido"); }

    const idPedido = data.id_pedido || data.idPedido || data.id || (data.ok && data.id_pedido) || null;
    const idPago = data.id_pago || data.pago_id || idPedido; 

    if (!idPedido) guardarPedidoActivo(JSON.stringify(data));
    else guardarPedidoActivo(idPedido);

    const metodo = norm(pedido.metodo_pago || pedido.metodoPago || "");
    alert(`✅ Pedido enviado correctamente\nMonto total: S/. ${Number(data.monto_total || pedido.monto_total || 0).toFixed(2)}`);

    if (metodo === "yape") mostrarEsperaYape(idPedido, idPago);
    else {
      const info = await fetchSeguimiento(idPedido);
      iniciarSeguimientoAutomático(idPedido, info);
    }

  } catch (err) {
    console.error("Error al enviar pedido:", err);
    alert("❌ Error al enviar pedido: " + (err.message || err));
  }
});

// ---------- Restaurar seguimiento al recargar página ----------
window.addEventListener("load", async () => {
  await cargarCarrito();
  const activo = obtenerPedidoActivo();
  const pagoActivo = obtenerPagoActivo();

  if (!activo) return;

  if (pagoActivo) {
    const infoPago = await fetchPago(pagoActivo);
    const estadoPago = norm(infoPago?.estado || "");
    if (estadoPago === "pendiente") { mostrarSeguimientoPago({ pago_id: pagoActivo }); return; }
    limpiarPagoActivo(); 
  }

  const info = await fetchSeguimiento(activo);
  if (!info) { limpiarPedidoActivo(); return; }
  iniciarSeguimientoAutomático(activo, info);
});

// ---------- Botones Volver ----------
const btnVolver = document.getElementById("btn-volver-inicio");
if (btnVolver) btnVolver.addEventListener("click", () => {
  if (window.intervalPago) clearInterval(window.intervalPago);
  if (window.intervalSeguimiento) clearInterval(window.intervalSeguimiento);
  window.location.href = "http://localhost:4000/cliente/menu.html";
});



const btnVolverPedido = document.getElementById("btn-volver-inicio-pedido");
if (btnVolverPedido) btnVolverPedido.addEventListener("click", async () => {
  if (window.intervalSeguimiento) clearInterval(window.intervalSeguimiento);
  
  // Vaciar carrito antes de volver al menú
  await vaciarCarrito();
  
  window.location.href = "http://localhost:4000/cliente/menu.html";
});

//Botón regresar al menú desde carrito
const btnRegresarMenu = document.getElementById("btn-regresar-menu");

if (btnRegresarMenu) {
  btnRegresarMenu.addEventListener("click", () => {
    window.location.href = "http://localhost:4000/cliente/menu.html";
  });
}

// Asegurar que el carrito se muestre vacío cuando se vuelve a la sección de carrito
// después de que el pedido haya sido entregado
const seccionCarrito = document.getElementById("carrito-servicio-section");
if (seccionCarrito) {
  // Observar cuando se muestra la sección de carrito
  const observer = new MutationObserver(() => {
    const pedidoActivo = obtenerPedidoActivo();
    // Si no hay pedido activo y el carrito tiene items, verificar si debe estar vacío
    if (!pedidoActivo && carrito.length > 0) {
      // Verificar si el último pedido fue entregado
      const seguimientoActivo = obtenerSeguimientoActivo();
      if (!seguimientoActivo) {
        // Si no hay seguimiento activo, el carrito debería estar vacío
        // Esto se maneja automáticamente al cargar el carrito
        cargarCarrito();
      }
    }
  });
  
  observer.observe(seccionCarrito, { attributes: true, attributeFilter: ['class'] });
}
