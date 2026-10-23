const mongoose = require('mongoose');

const usuarioSchema = new mongoose.Schema({
  usuario: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  rol: { type: String, default: 'admin' }
});

module.exports = mongoose.model('Usuario', usuarioSchema);