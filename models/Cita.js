const mongoose = require('mongoose');

const citaSchema = new mongoose.Schema({
  cliente_nombre: { type: String, required: true, trim: true, maxlength: 100 },
  servicio: { type: mongoose.Schema.Types.ObjectId, ref: 'Servicio', required: true },
  fecha: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },   // "2026-08-20"
  hora: { type: String, required: true, match: /^\d{2}:\d{2}$/ },          // "09:00"
  estado: {
    type: String,
    enum: ['pendiente', 'atendida', 'cancelada'],
    default: 'pendiente'
  },
  creado_en: { type: Date, default: Date.now }
});

// Garantiza a nivel de base de datos que no existan dos citas activas
// en la misma fecha y hora. Las canceladas no cuentan, asi su horario queda libre.
citaSchema.index(
  { fecha: 1, hora: 1 },
  {
    unique: true,
    partialFilterExpression: { estado: { $in: ['pendiente', 'atendida'] } }
  }
);

module.exports = mongoose.model('Cita', citaSchema);