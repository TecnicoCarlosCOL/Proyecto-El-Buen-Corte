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

let HORAS = [];
let CIERRE = '20:00';
let bloqueos = [];
const DIAS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

let vista = 'semana';
let fechaRef = formato(new Date());

// ---------- Utilidades ----------
function ver(hora) {                       // "13:30" -> "1:30 pm"
  const [h, m] = hora.split(':').map(Number);
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${h >= 12 ? 'pm' : 'am'}`;
}
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
function mostrarMensaje(texto, ok = false) {
  const m = document.getElementById('mensaje');
  m.style.color = ok ? 'green' : 'red';
  m.textContent = texto;
}
function salir() {
  localStorage.removeItem('token');
  window.location.href = 'login.html';
}

// ---------- Comunicación con el servidor ----------
async function llamar(ruta, opciones = {}) {
  const res = await fetch('/api' + ruta, {
    ...opciones,
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
  });
  if (res.status === 401 || res.status === 403) {
    salir();
    return null;
  }
  return res;
}
async function pedirCitas(query) {
  const res = await llamar('/citas' + query);
  return res ? res.json() : null;
}
async function cargarBloqueos() {
  const res = await llamar('/bloqueos');
  if (res) bloqueos = await res.json();
}
function bloqueoDe(fecha, hora) {
  return bloqueos.find(b => b.fecha === fecha && b.desde <= hora && hora < b.hasta);
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
  const [citas] = await Promise.all([pedirCitas(`?fecha=${fechaRef}`), cargarBloqueos()]);
  if (!citas) return;
  document.getElementById('etiqueta').textContent = fechaLarga(fechaRef);

  let html = '';
  HORAS.forEach(hora => {
    const delTurno = citas
      .filter(c => c.hora === hora)
      .sort((a, b) => (a.estado === 'cancelada') - (b.estado === 'cancelada'));
    const bloq = bloqueoDe(fechaRef, hora);

    html += `<div class="turno"><div class="hora">${ver(hora)}</div><div class="citas">`;
    delTurno.forEach(c => {
      html += `<div class="cita-card ${c.estado}">
        <div>
          <strong>${esc(c.cliente_nombre)}</strong>
          <small>${c.servicio ? esc(c.servicio.nombre) : '-'}</small>
        </div>
        <div><span class="badge ${c.estado}">${c.estado}</span> ${botones(c)}</div>
      </div>`;
    });
    if (bloq) {
      html += `<div class="bloqueado">No atiende${bloq.motivo ? ' · ' + esc(bloq.motivo) : ''}</div>`;
    } else if (delTurno.every(c => c.estado === 'cancelada')) {
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
  const [citas] = await Promise.all([pedirCitas(`?desde=${lunes}&hasta=${domingo}`), cargarBloqueos()]);
  if (!citas) return;
  document.getElementById('etiqueta').textContent = `${fechaCorta(lunes)} - ${fechaCorta(domingo)}`;

  const hoy = formato(new Date());
  let html = '<div class="semana-wrap"><table class="semana"><thead><tr><th>Hora</th>';
  for (let i = 0; i < 7; i++) {
    const f = sumarDias(lunes, i);
    html += `<th class="${f === hoy ? 'hoy' : ''}" onclick="irADia('${f}')">${DIAS[i]} ${aFecha(f).getDate()}</th>`;
  }
  html += '</tr></thead><tbody>';

  HORAS.forEach(hora => {
    html += `<tr><th>${ver(hora)}</th>`;
    for (let i = 0; i < 7; i++) {
      const f = sumarDias(lunes, i);
      const activas = citas.filter(c => c.fecha === f && c.hora === hora && c.estado !== 'cancelada');
      html += `<td class="${bloqueoDe(f, hora) ? 'bloq' : ''}">` + activas.map(c => `
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
      <td data-label="Fecha">${c.fecha}</td>
      <td data-label="Hora">${ver(c.hora)}</td>
      <td data-label="Cliente">${esc(c.cliente_nombre)}</td>
      <td data-label="Servicio">${c.servicio ? esc(c.servicio.nombre) : '-'}</td>
      <td data-label="Estado"><span class="badge ${c.estado}">${c.estado}</span></td>
      <td data-label="Acciones">${botones(c) || '-'}</td>
    </tr>`;
  });

  document.getElementById('contenido').innerHTML = `
    <div class="tabla-scroll"><table class="lista">
      <thead><tr><th>Fecha</th><th>Hora</th><th>Cliente</th><th>Servicio</th><th>Estado</th><th>Acciones</th></tr></thead>
      <tbody>${filas}</tbody>
    </table></div>`;
}

// ---------- Vista BLOQUEOS ----------
async function renderBloqueos() {
  await cargarBloqueos();
  const hoy = formato(new Date());

  const opcDesde = HORAS.map(h => `<option value="${h}">${ver(h)}</option>`).join('');
  const opcHasta = HORAS.slice(1).concat(CIERRE).map(h => `<option value="${h}">${ver(h)}</option>`).join('');

  const lista = bloqueos.length === 0
    ? '<p class="libre">No hay bloqueos programados.</p>'
    : bloqueos.map(b => {
        const todo = b.desde === HORAS[0] && b.hasta === CIERRE;
        return `<div class="item-bloqueo">
          <div>
            <strong style="text-transform: capitalize;">${fechaLarga(b.fecha)}</strong>
            <small>${todo ? 'Todo el día' : ver(b.desde) + ' a ' + ver(b.hasta)}${b.motivo ? ' · ' + esc(b.motivo) : ''}</small>
          </div>
          <button onclick="quitarBloqueo('${b._id}')">Quitar</button>
        </div>`;
      }).join('');

  document.getElementById('contenido').innerHTML = `
    <div class="form-bloqueo">
      <h3>Bloquear un día u horas</h3>
      <label>Fecha</label>
      <input type="date" id="bFecha" min="${hoy}">

      <label class="check"><input type="checkbox" id="bTodoDia" checked> Todo el día</label>

      <div id="bRango" style="display: none;">
        <div class="fila">
          <div><label>Desde</label><select id="bDesde">${opcDesde}</select></div>
          <div><label>Hasta</label><select id="bHasta">${opcHasta}</select></div>
        </div>
      </div>

      <label>Motivo (opcional)</label>
      <input type="text" id="bMotivo" maxlength="100" placeholder="Ej: cita médica">

      <button id="btnBloquear">Bloquear</button>
    </div>

    <h3>Bloqueos programados</h3>
    ${lista}`;

  document.getElementById('bTodoDia').addEventListener('change', (e) => {
    document.getElementById('bRango').style.display = e.target.checked ? 'none' : 'block';
  });
  document.getElementById('btnBloquear').addEventListener('click', crearBloqueo);
}

async function crearBloqueo() {
  const fecha = document.getElementById('bFecha').value;
  const todoDia = document.getElementById('bTodoDia').checked;
  const motivo = document.getElementById('bMotivo').value.trim();

  if (!fecha) {
    mostrarMensaje('Elige una fecha');
    return;
  }

  const body = { fecha, motivo };
  if (!todoDia) {
    body.desde = document.getElementById('bDesde').value;
    body.hasta = document.getElementById('bHasta').value;
  }

  const res = await llamar('/bloqueos', { method: 'POST', body: JSON.stringify(body) });
  if (!res) return;
  const data = await res.json();

  if (res.ok) {
    mostrarMensaje('Bloqueo guardado', true);
    renderBloqueos();
  } else {
    mostrarMensaje(data.mensaje || 'No se pudo guardar el bloqueo');
  }
}

async function quitarBloqueo(id) {
  if (!confirm('¿Quitar este bloqueo?')) return;
  const res = await llamar(`/bloqueos/${id}`, { method: 'DELETE' });
  if (res && res.ok) {
    mostrarMensaje('Bloqueo eliminado', true);
    renderBloqueos();
  } else {
    mostrarMensaje('No se pudo quitar el bloqueo');
  }
}

// ---------- Control de vistas ----------
function cargar() {
  if (vista === 'dia') return renderDia();
  if (vista === 'semana') return renderSemana();
  if (vista === 'lista') return renderLista();
  return renderBloqueos();
}

function cambiarVista(nueva) {
  vista = nueva;
  ['dia', 'semana', 'lista', 'bloqueos'].forEach(v =>
    document.getElementById('tab-' + v).classList.toggle('activo', v === nueva));
  document.getElementById('nav').style.display = (nueva === 'dia' || nueva === 'semana') ? 'flex' : 'none';
  mostrarMensaje('');
  cargar();
}

function irADia(fecha) {
  fechaRef = fecha;
  cambiarVista('dia');
}

// ---------- Acciones sobre las citas ----------
async function accionCita(id, accion) {
  const res = await llamar(`/citas/${id}/${accion}`, { method: 'PUT' });
  if (!res) return;

  if (res.ok) {
    mostrarMensaje('');
    cargar();
  } else {
    const data = await res.json();
    mostrarMensaje(data.mensaje || 'Error al actualizar la cita');
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
document.getElementById('tab-bloqueos').addEventListener('click', () => cambiarVista('bloqueos'));

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
document.getElementById('logout').addEventListener('click', salir);

// ---------- Inicio ----------
async function iniciar() {
  const res = await fetch('/api/citas/horarios');
  const info = await res.json();
  HORAS = info.horas;
  CIERRE = info.cierre;
  cambiarVista(window.innerWidth < 700 ? 'dia' : 'semana');
}

iniciar();