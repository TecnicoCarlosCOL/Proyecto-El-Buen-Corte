const mongoose = require('mongoose');

const servicioSchema = new mongoose.Schema({
  nombre: { type: String, required: true },
  duracion_min: { type: Number, required: true },
  precio: { type: Number, required: true }
});

module.exports = mongoose.model('Servicio', servicioSchema);