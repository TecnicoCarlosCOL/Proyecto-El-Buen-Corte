require('dotenv').config();
const mongoose = require('mongoose');
const Cita = require('./models/Cita');

const URL = 'http://localhost:3000/api';
const FECHA = '2030-01-15';
const HORA = '09:00';
const INTENTOS = 10;

async function main() {
  const servicios = await (await fetch(`${URL}/servicios`)).json();
  const servicio = servicios[0]._id;

  console.log(`Lanzando ${INTENTOS} reservas simultaneas para ${FECHA} a las ${HORA}...\n`);

  const peticiones = Array.from({ length: INTENTOS }, (_, i) =>
    fetch(`${URL}/citas`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cliente_nombre: `TEST-${i + 1}`,
        servicio,
        fecha: FECHA,
        hora: HORA
      })
    }).then(r => r.status)
  );

  const resultados = await Promise.all(peticiones);
  const exitosas = resultados.filter(s => s === 201).length;
  const rechazadas = resultados.filter(s => s === 409).length;

  console.log(`Reservas aceptadas (201): ${exitosas}`);
  console.log(`Reservas rechazadas (409): ${rechazadas}`);
  console.log(exitosas === 1
    ? '\nRESULTADO: CORRECTO, solo una persona logro reservar el horario.'
    : '\nRESULTADO: FALLO, hay doble reserva.');

  // Limpieza: borra las citas de prueba
  await mongoose.connect(process.env.MONGO_URI);
  await Cita.deleteMany({ cliente_nombre: /^TEST-/ });
  await mongoose.disconnect();
  console.log('Citas de prueba eliminadas.');
}

main();