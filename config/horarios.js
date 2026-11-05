// Horario de atención de la barbería. Es el único lugar donde se define.
const APERTURA = '08:00';
const CIERRE = '20:00';
const PASO_MIN = 30;

function aMinutos(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

function aTexto(min) {
  const h = String(Math.floor(min / 60)).padStart(2, '0');
  const m = String(min % 60).padStart(2, '0');
  return `${h}:${m}`;
}

const HORAS = [];
for (let m = aMinutos(APERTURA); m < aMinutos(CIERRE); m += PASO_MIN) {
  HORAS.push(aTexto(m));
}

module.exports = { HORAS, APERTURA, CIERRE };