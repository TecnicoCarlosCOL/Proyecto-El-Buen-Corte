const API = '/api';
let HORAS = [];
let horaSeleccionada = null;

const hoy = new Date().toLocaleDateString('en-CA');
const inputFecha = document.getElementById('fecha');
inputFecha.min = hoy;                       // no deja elegir fechas pasadas

function ver(hora) {                        // "13:30" -> "1:30 pm"
  const [h, m] = hora.split(':').map(Number);
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${h >= 12 ? 'pm' : 'am'}`;
}

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
  const fecha = inputFecha.value;
  const cont = document.getElementById('horarios');
  cont.innerHTML = '';
  horaSeleccionada = null;
  if (!fecha) return;

  const res = await fetch(`${API}/citas/disponibilidad/${fecha}`);
  const noDisponibles = (await res.json()).map(c => c.hora);
  const horaActual = new Date().toTimeString().slice(0, 5);
  let libres = 0;

  HORAS.forEach(hora => {
    const pasada = fecha === hoy && hora <= horaActual;
    const ocupada = noDisponibles.includes(hora) || pasada;

    const div = document.createElement('div');
    div.textContent = ver(hora);
    div.className = 'horario' + (ocupada ? ' ocupado' : '');

    if (!ocupada) {
      libres++;
      div.onclick = () => {
        document.querySelectorAll('.horario').forEach(h => h.classList.remove('seleccionado'));
        div.classList.add('seleccionado');
        horaSeleccionada = hora;
      };
    }
    cont.appendChild(div);
  });

  if (libres === 0) {
    const aviso = document.createElement('p');
    aviso.className = 'aviso';
    aviso.textContent = 'No hay horarios disponibles para esta fecha';
    cont.appendChild(aviso);
  }
}

inputFecha.addEventListener('change', cargarHorarios);

document.getElementById('btnReservar').addEventListener('click', async () => {
  const mensaje = document.getElementById('mensaje');
  const servicio = document.getElementById('servicio').value;
  const fecha = inputFecha.value;
  const nombre = document.getElementById('nombre').value.trim();

  if (!fecha || !horaSeleccionada || !nombre) {
    mensaje.textContent = 'Completa todos los campos';
    mensaje.style.color = 'red';
    return;
  }

  if (fecha < hoy) {
    mensaje.textContent = 'No puedes reservar en una fecha pasada';
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
  } else {
    mensaje.style.color = 'red';
    mensaje.textContent = data.mensaje || 'Error al reservar';
  }
});

async function iniciar() {
  const res = await fetch(`${API}/citas/horarios`);
  const info = await res.json();
  HORAS = info.horas;
  await cargarServicios();
}

iniciar();