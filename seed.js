require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Usuario = require('./models/Usuario');
const Servicio = require('./models/Servicio');

async function seed() {
  await mongoose.connect(process.env.MONGO_URI);

  const passwordCifrada = await bcrypt.hash('123456', 10);
  await Usuario.create({ usuario: 'carlos', password: passwordCifrada });

  await Servicio.create([
    { nombre: 'Corte de cabello', duracion_min: 30, precio: 15000 },
    { nombre: 'Corte + barba', duracion_min: 45, precio: 25000 },
    { nombre: 'Afeitado', duracion_min: 20, precio: 10000 }
  ]);

  console.log('Usuario admin y servicios creados');
  mongoose.disconnect();
}

seed();