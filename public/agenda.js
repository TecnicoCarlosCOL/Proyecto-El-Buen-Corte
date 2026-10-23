const token = localStorage.getItem('token');

// Convierte texto en HTML seguro (evita que un nombre con <script> se ejecute)
function esc(texto) {
  const div = document.createElement('div');
  div.textContent = texto;
  return div.innerHTML;
}

if (!token) {
  window.location.href = 'login.html';
}

const HORAS = ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00'];
const DIAS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

let vista = 'semana';
let fechaRef = formato(new Date());

// ---------- Utilidades de fechas ----------
function formato(fecha) {
  return fecha.toLocaleDateString('en-CA');            // AAAA-MM-DD
}
function aFecha(texto) {
  const [a, m, d] = texto.split('-').map(Number);
  return new Date(a, m - 1, d);
}
function sumarDias(texto, n) {
  const f = aFecha(texto);
  f.setDate(f.getDate() + n);
  return formato(f);
}
function lunesDe(texto) {
  const f = aFecha(texto);
  f.setDate(f.getDate() - ((f.getDay() + 6) % 7));
  return formato(f);
}
function fechaLarga(texto) {
  return aFecha(texto).toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' });
}
function fechaCorta(texto) {
  return aFecha(texto).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });
}

// ---------- Datos ----------
async function pedirCitas(query) {
  const res = await fetch('/api/citas' + query, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (res.status === 401 || res.status === 403) {
    localStorage.removeItem('token');
    window.location.href = 'login.html';
    return null;
  }
  return res.json();
}

function botones(c) {
  if (c.estado !== 'pendiente') return '';
  return `<span class="acciones">
    <button onclick="marcarAtendida('${c._id}')">Atendida</button>
    <button onclick="cancelarCita('${c._id}')">Cancelar</button>
  </span>`;
}

// ---------- Vista DÍA ----------
async function renderDia() {
  const citas = await pedirCitas(`?fecha=${fechaRef}`);
  if (!citas) return;
  document.getElementById('etiqueta').textContent = fechaLarga(fechaRef);

  let html = '';
  HORAS.forEach(hora => {
    const delTurno = citas
      .filter(c => c.hora === hora)
      .sort((a, b) => (a.estado === 'cancelada') - (b.estado === 'cancelada'));

    html += `<div class="turno"><div class="hora">${hora}</div><div class="citas">`;
    delTurno.forEach(c => {
      html += `<div class="cita-card ${c.estado}">
        <div>
          <strong>${esc(c.cliente_nombre)}</strong>
          <small>${c.servicio ? esc(c.servicio.nombre) : '-'}</small>
        </div>
        <div><span class="badge ${c.estado}">${c.estado}</span> ${botones(c)}</div>
      </div>`;
    });
    if (delTurno.every(c => c.estado === 'cancelada')) {
      html += '<div class="libre">Libre</div>';
    }
    html += '</div></div>';
  });

  document.getElementById('contenido').innerHTML = html;
}

// ---------- Vista SEMANA ----------
async function renderSemana() {
  const lunes = lunesDe(fechaRef);
  const domingo = sumarDias(lunes, 6);
  const citas = await pedirCitas(`?desde=${lunes}&hasta=${domingo}`);
  if (!citas) return;
  document.getElementById('etiqueta').textContent = `${fechaCorta(lunes)} - ${fechaCorta(domingo)}`;

  const hoy = formato(new Date());
  let html = '<div class="tabla-scroll"><table class="semana"><thead><tr><th>Hora</th>';
  for (let i = 0; i < 7; i++) {
    const f = sumarDias(lunes, i);
    html += `<th class="${f === hoy ? 'hoy' : ''}" onclick="irADia('${f}')">${DIAS[i]} ${aFecha(f).getDate()}</th>`;
  }
  html += '</tr></thead><tbody>';

  HORAS.forEach(hora => {
    html += `<tr><th>${hora}</th>`;
    for (let i = 0; i < 7; i++) {
      const f = sumarDias(lunes, i);
      const activas = citas.filter(c => c.fecha === f && c.hora === hora && c.estado !== 'cancelada');
      html += '<td>' + activas.map(c => `
        <div class="chip ${c.estado}" onclick="irADia('${f}')">
          ${esc(c.cliente_nombre)}
          <small>${c.servicio ? esc(c.servicio.nombre) : ''}</small>
        </div>`).join('') + '</td>';
    }
    html += '</tr>';
  });

  html += '</tbody></table></div>';
  document.getElementById('contenido').innerHTML = html;
}

// ---------- Vista LISTA ----------
async function renderLista() {
  const citas = await pedirCitas('');
  if (!citas) return;

  let filas = '';
  if (citas.length === 0) {
    filas = '<tr><td colspan="6" style="text-align:center; color:#888;">No hay citas registradas</td></tr>';
  }
  citas.forEach(c => {
    filas += `<tr>
      <td>${c.fecha}</td>
      <td>${c.hora}</td>
      <td>${esc(c.cliente_nombre)}</td>
      <td>${c.servicio ? esc(c.servicio.nombre) : '-'}</td>
      <td><span class="badge ${c.estado}">${c.estado}</span></td>
      <td>${botones(c) || '-'}</td>
    </tr>`;
  });

  document.getElementById('contenido').innerHTML = `
    <div class="tabla-scroll"><table>
      <thead><tr><th>Fecha</th><th>Hora</th><th>Cliente</th><th>Servicio</th><th>Estado</th><th>Acciones</th></tr></thead>
      <tbody>${filas}</tbody>
    </table></div>`;
}

// ---------- Control de vistas ----------
function cargar() {
  if (vista === 'dia') return renderDia();
  if (vista === 'semana') return renderSemana();
  return renderLista();
}

function cambiarVista(nueva) {
  vista = nueva;
  ['dia', 'semana', 'lista'].forEach(v =>
    document.getElementById('tab-' + v).classList.toggle('activo', v === nueva));
  document.getElementById('nav').style.display = nueva === 'lista' ? 'none' : 'flex';
  cargar();
}

function irADia(fecha) {
  fechaRef = fecha;
  cambiarVista('dia');
}

// ---------- Acciones sobre las citas ----------
async function accionCita(id, accion) {
  const mensaje = document.getElementById('mensaje');
  const res = await fetch(`/api/citas/${id}/${accion}`, {
    method: 'PUT',
    headers: { 'Authorization': `Bearer ${token}` }
  });

  if (res.ok) {
    mensaje.textContent = '';
    cargar();
  } else {
    const data = await res.json();
    mensaje.style.color = 'red';
    mensaje.textContent = data.mensaje || 'Error al actualizar la cita';
  }
}

function marcarAtendida(id) {
  accionCita(id, 'atender');
}

function cancelarCita(id) {
  if (confirm('¿Seguro que quieres cancelar esta cita?')) {
    accionCita(id, 'cancelar');
  }
}

// ---------- Eventos ----------
document.getElementById('tab-dia').addEventListener('click', () => cambiarVista('dia'));
document.getElementById('tab-semana').addEventListener('click', () => cambiarVista('semana'));
document.getElementById('tab-lista').addEventListener('click', () => cambiarVista('lista'));

document.getElementById('btnAnterior').addEventListener('click', () => {
  fechaRef = sumarDias(fechaRef, vista === 'semana' ? -7 : -1);
  cargar();
});
document.getElementById('btnSiguiente').addEventListener('click', () => {
  fechaRef = sumarDias(fechaRef, vista === 'semana' ? 7 : 1);
  cargar();
});
document.getElementById('btnHoy').addEventListener('click', () => {
  fechaRef = formato(new Date());
  cargar();
});
document.getElementById('saltoFecha').addEventListener('change', (e) => {
  if (e.target.value) {
    fechaRef = e.target.value;
    cargar();
  }
});

document.getElementById('logout').addEventListener('click', () => {
  localStorage.removeItem('token');
  window.location.href = 'login.html';
});

cambiarVista('semana');