document.getElementById('btnLogin').addEventListener('click', async () => {
  const usuario = document.getElementById('usuario').value.trim();
  const password = document.getElementById('password').value;
  const mensaje = document.getElementById('mensaje');

  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ usuario, password })
  });
  const data = await res.json();

  if (res.ok) {
    localStorage.setItem('token', data.token);
    window.location.href = 'agenda.html';
  } else {
    mensaje.style.color = 'red';
    mensaje.textContent = data.mensaje || 'Error al iniciar sesión';
  }
});