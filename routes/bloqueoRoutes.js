const express = require('express');
const router = express.Router();
const Bloqueo = require('../models/Bloqueo');
const Cita = require('../models/Cita');
const verificarToken = require('../middleware/verificarToken');
const { HORAS, APERTURA, CIERRE } = require('../config/horarios');

const FORMATO_FECHA = /^\d{4}-\d{2}-\d{2}$/;
const ZONA = 'America/Bogota';

// Todas las rutas de este archivo son solo para el administrador
router.use(verificarToken);

// Bloqueos desde hoy en adelante
router.get('/', async (req, res) => {
  const hoy = new Date().toLocaleDateString('en-CA', { timeZone: ZONA });
  const bloqueos = await Bloqueo.find({ fecha: { $gte: hoy } }).sort({ fecha: 1, desde: 1 });
  res.json(bloqueos);
});

// Crear un bloqueo: sin desde/hasta bloquea todo el día
router.post('/', async (req, res) => {
  try {
    const { fecha, motivo } = req.body;
    let { desde, hasta } = req.body;

    if (typeof fecha !== 'string' || !FORMATO_FECHA.test(fecha)) {
      return res.status(400).json({ mensaje: 'Fecha inválida' });
    }

    const hoy = new Date().toLocaleDateString('en-CA', { timeZone: ZONA });
    if (fecha < hoy) {
      return res.status(400).json({ mensaje: 'No puedes bloquear una fecha pasada' });
    }

    if (desde === undefined && hasta === undefined) {
      desde = APERTURA;
      hasta = CIERRE;
    }

    if (!HORAS.includes(desde) || (!HORAS.includes(hasta) && hasta !== CIERRE) || desde >= hasta) {
      return res.status(400).json({ mensaje: 'Rango de horas inválido' });
    }

    // No se bloquea un horario donde ya hay citas pendientes
    const pendientes = await Cita.countDocuments({
      fecha, estado: 'pendiente', hora: { $gte: desde, $lt: hasta }
    });
    if (pendientes > 0) {
      return res.status(409).json({
        mensaje: `Hay ${pendientes} cita(s) pendiente(s) en ese horario. Cancélalas primero.`
      });
    }

    const bloqueo = await Bloqueo.create({ fecha, desde, hasta, motivo });
    res.status(201).json(bloqueo);
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({ mensaje: 'Datos inválidos' });
    }
    res.status(500).json({ mensaje: 'Error al guardar el bloqueo' });
  }
});

// Quitar un bloqueo
router.delete('/:id', async (req, res) => {
  try {
    const bloqueo = await Bloqueo.findByIdAndDelete(req.params.id);
    if (!bloqueo) {
      return res.status(404).json({ mensaje: 'Bloqueo no encontrado' });
    }
    res.json({ mensaje: 'Bloqueo eliminado' });
  } catch (error) {
    res.status(400).json({ mensaje: 'ID inválido' });
  }
});

module.exports = router;