const API = '/api';
const HORAS = ['09:00','10:00','11:00','14:00','15:00','16:00'];
let horaSeleccionada = null;
const hoy = new Date().toLocaleDateString('en-CA');
document.getElementById('fecha').min = hoy;

async function cargarServicios() {
  const res = await fetch(`${API}/servicios`);
  const servicios = await res.json();
  const select = document.getElementById('servicio');
  servicios.forEach(s => {
    const opt = document.createElement('option');
    opt.value = s._id;
    opt.textContent = `${s.nombre} - $${s.precio}`;
    select.appendChild(opt);
  });
}

async function cargarHorarios() {
  const fecha = document.getElementById('fecha').value;
  const cont = document.getElementById('horarios');
  cont.innerHTML = '';
  horaSeleccionada = null;
  if (!fecha) return;

  const res = await fetch(`${API}/citas/disponibilidad/${fecha}`);
  const ocupadas = (await res.json()).map(c => c.hora);

  HORAS.forEach(hora => {
    const div = document.createElement('div');
    div.textContent = hora;
    div.className = 'horario' + (ocupadas.includes(hora) ? ' ocupado' : '');
    if (!ocupadas.includes(hora)) {
      div.onclick = () => {
        document.querySelectorAll('.horario').forEach(h => h.classList.remove('seleccionado'));
        div.classList.add('seleccionado');
        horaSeleccionada = hora;
      };
    }
    cont.appendChild(div);
  });
}

document.getElementById('fecha').addEventListener('change', cargarHorarios);

document.getElementById('btnReservar').addEventListener('click', async () => {
  const mensaje = document.getElementById('mensaje');
  const servicio = document.getElementById('servicio').value;
  const fecha = document.getElementById('fecha').value;
  const nombre = document.getElementById('nombre').value.trim();

  if (!fecha || !horaSeleccionada || !nombre) {
      if (fecha < hoy) {
    mensaje.textContent = 'No puedes reservar en una fecha pasada';
    mensaje.style.color = 'red';
    return;
  }
    mensaje.textContent = 'Completa todos los campos';
    mensaje.style.color = 'red';
    return;
  }

  const res = await fetch(`${API}/citas`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cliente_nombre: nombre, servicio, fecha, hora: horaSeleccionada })
  });
  const data = await res.json();

    if (res.ok) {
    mensaje.style.color = 'green';
    mensaje.textContent = '¡Cita reservada con éxito!';
    document.getElementById('nombre').value = '';
    cargarHorarios();
  }else {
    mensaje.style.color = 'red';
    mensaje.textContent = data.mensaje || 'Error al reservar';
  }
});

cargarServicios();