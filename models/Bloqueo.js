const mongoose = require('mongoose');

const bloqueoSchema = new mongoose.Schema({
  fecha: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
  desde: { type: String, required: true, match: /^\d{2}:\d{2}$/ },
  hasta: { type: String, required: true, match: /^\d{2}:\d{2}$/ },   // el límite no se incluye
  motivo: { type: String, trim: true, maxlength: 100, default: '' }
});

bloqueoSchema.index({ fecha: 1 });

module.exports = mongoose.model('Bloqueo', bloqueoSchema);