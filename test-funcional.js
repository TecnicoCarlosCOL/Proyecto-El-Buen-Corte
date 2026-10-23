require('dotenv').config();
const mongoose = require('mongoose');
const Cita = require('./models/Cita');

const URL = 'http://localhost:3000/api';
const FECHA = '2030-02-20';
let pasaron = 0;
let fallaron = 0;

function check(nombre, condicion) {
  if (condicion) {
    pasaron++;
    console.log(`  OK     ${nombre}`);
  } else {
    fallaron++;
    console.log(`  FALLO  ${nombre}`);
  }
}

async function api(ruta, opciones = {}, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${URL}${ruta}`, { ...opciones, headers });
  let data = null;
  try { data = await res.json(); } catch (e) {}
  return { status: res.status, data };
}

function reservar(nombre, servicio, fecha, hora) {
  return api('/citas', {
    method: 'POST',
    body: JSON.stringify({ cliente_nombre: nombre, servicio, fecha, hora })
  });
}

async function main() {
  await mongoose.connect(process.env.MONGO_URI);
  await Cita.deleteMany({ cliente_nombre: /^TEST-/ });

  console.log('\nPRUEBAS FUNCIONALES - El Buen Corte\n');

  // ---------- 1. Servicios ----------
  console.log('1. Servicios');
  const s = await api('/servicios');
  check('Lista los servicios (200)', s.status === 200 && s.data.length > 0);
  const servicio = s.data[0]._id;

  // ---------- 2. Autenticación ----------
  console.log('\n2. Autenticacion');
  let r = await api('/auth/login', { method: 'POST', body: JSON.stringify({ usuario: 'carlos', password: 'incorrecta' }) });
  check('Rechaza contrasena incorrecta (400)', r.status === 400);

  r = await api('/auth/login', { method: 'POST', body: JSON.stringify({}) });
  check('Rechaza login sin datos (400)', r.status === 400);

  r = await api('/auth/login', { method: 'POST', body: JSON.stringify({ usuario: { $ne: null }, password: { $ne: null } }) });
  check('Rechaza inyeccion de operadores (400)', r.status === 400);

  r = await api('/auth/login', { method: 'POST', body: JSON.stringify({ usuario: 'carlos', password: '123456' }) });
  check('Login correcto entrega token (200)', r.status === 200 && !!r.data.token);
  const token = r.data.token;

  // ---------- 3. Reservas ----------
  console.log('\n3. Reservas');
  r = await reservar('TEST-1', servicio, FECHA, '09:00');
  check('Reserva valida (201)', r.status === 201);
  check('La cita nace como pendiente', r.data && r.data.estado === 'pendiente');
  const id = r.data && r.data._id;

  r = await reservar('TEST-2', servicio, FECHA, '09:00');
  check('Rechaza horario ocupado (409)', r.status === 409);

  r = await reservar('TEST-3', servicio, '2020-01-01', '10:00');
  check('Rechaza fecha pasada (400)', r.status === 400);

  r = await reservar('TEST-4', servicio, '2030-03-01', '13:00');
  check('Rechaza hora fuera del horario de atencion (400)', r.status === 400);

  r = await reservar('TEST-5', '123', FECHA, '10:00');
  check('Rechaza servicio invalido (400)', r.status === 400);

  r = await reservar('', servicio, FECHA, '10:00');
  check('Rechaza nombre vacio (400)', r.status === 400);

  r = await api(`/citas/disponibilidad/${FECHA}`);
  check('La disponibilidad muestra 09:00 como ocupado', r.data.some(c => c.hora === '09:00'));

  // ---------- 4. Agenda y estados ----------
  console.log('\n4. Agenda y estados');
  r = await api('/citas');
  check('Agenda sin token rechazada (401)', r.status === 401);

  r = await api(`/citas?fecha=${FECHA}`, {}, token);
  check('Agenda con token y filtro por fecha (200)', r.status === 200 && r.data.length === 1);

  r = await api(`/citas/${id}/atender`, { method: 'PUT' });
  check('Cambiar estado sin token rechazado (401)', r.status === 401);

  r = await api(`/citas/${id}/atender`, { method: 'PUT' }, token);
  check('Marca como atendida (200)', r.status === 200 && r.data.estado === 'atendida');

  r = await api(`/citas/${id}/cancelar`, { method: 'PUT' }, token);
  check('No permite cancelar una cita atendida (400)', r.status === 400);

  r = await reservar('TEST-6', servicio, FECHA, '10:00');
  const id2 = r.data && r.data._id;

  r = await api(`/citas/${id2}/cancelar`, { method: 'PUT' }, token);
  check('Cancela una cita pendiente (200)', r.status === 200 && r.data.estado === 'cancelada');

  r = await api(`/citas/${id2}/atender`, { method: 'PUT' }, token);
  check('No permite atender una cita cancelada (400)', r.status === 400);

  r = await reservar('TEST-7', servicio, FECHA, '10:00');
  check('El horario cancelado queda libre para reservar (201)', r.status === 201);

  r = await api('/citas/000000000000000000000000/cancelar', { method: 'PUT' }, token);
  check('Cita inexistente responde 404', r.status === 404);

  r = await api('/citas/abc/cancelar', { method: 'PUT' }, token);
  check('ID con formato invalido responde 400', r.status === 400);

  // ---------- Resumen ----------
  console.log(`\nRESUMEN: ${pasaron} pruebas OK, ${fallaron} con FALLO`);

  await Cita.deleteMany({ cliente_nombre: /^TEST-/ });
  await mongoose.disconnect();
  console.log('Citas de prueba eliminadas.\n');
}

main();