document.addEventListener("DOMContentLoaded", async () => {
  const loginLink = document.getElementById("loginLink");
  const userDropdown = document.getElementById("userDropdown");
  const nombreUsuario = document.getElementById("nombreUsuario");
  const correoUsuario = document.getElementById("correoUsuario");
  const logoutBtn = document.getElementById("logoutBtn");

  const token = localStorage.getItem("token");
  if (!token) {
    // no hay token → mostrar login
    if (loginLink) { loginLink.innerHTML = `<i class="fa-solid fa-user"></i> Login`; loginLink.href = "http://localhost:3000/cliente/user.html"; }
    if (userDropdown) userDropdown.style.display = "none";
    return;
  }

  try {
    const res = await fetch("http://localhost:3000/api/verify-token", {
      headers: { "Authorization": "Bearer " + token }
    });
    const data = await res.json();
    if (data.logueado) {
      if (loginLink) { loginLink.style.display = "none"; }
      if (userDropdown) userDropdown.style.display = "block";
      if (nombreUsuario) nombreUsuario.textContent = data.usuario.nombre;
      if (correoUsuario) correoUsuario.textContent = data.usuario.correo;
    } else {
      // token inválido
      localStorage.removeItem("token");
      localStorage.removeItem("usuario");
      if (loginLink) { loginLink.innerHTML = `<i class="fa-solid fa-user"></i> Login`; loginLink.href = "http://localhost:3000/cliente/user.html"; }
      if (userDropdown) userDropdown.style.display = "none";
    }
  } catch (err) {
    console.error("Error verifying token:", err);
  }

  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      localStorage.removeItem("token");
      localStorage.removeItem("usuario");
      window.location.href = "http://localhost:3000/cliente/user.html";
    });
  }
});
