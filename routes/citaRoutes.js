const express = require('express');
const router = express.Router();
const Cita = require('../models/Cita');
const Servicio = require('../models/Servicio');
const verificarToken = require('../middleware/verificarToken');

const HORAS_VALIDAS = ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00'];
const FORMATO_FECHA = /^\d{4}-\d{2}-\d{2}$/;
const ZONA = 'America/Bogota';

// Ver disponibilidad de una fecha (público)
router.get('/disponibilidad/:fecha', async (req, res) => {
  if (!FORMATO_FECHA.test(req.params.fecha)) {
    return res.status(400).json({ mensaje: 'Fecha inválida' });
  }
  const citas = await Cita.find({
    fecha: req.params.fecha,
    estado: { $ne: 'cancelada' }
  }).select('hora -_id');
  res.json(citas);
});

// Reservar una cita (público)
router.post('/', async (req, res) => {
  try {
    const { cliente_nombre, servicio, fecha, hora } = req.body;

    if (!HORAS_VALIDAS.includes(hora)) {
      return res.status(400).json({ mensaje: 'Hora fuera del horario de atención' });
    }

    if (typeof fecha !== 'string' || !FORMATO_FECHA.test(fecha)) {
      return res.status(400).json({ mensaje: 'Fecha inválida' });
    }

    // Se compara contra la hora de Colombia, sin importar dónde esté el servidor
    const ahora = new Date();
    const hoy = ahora.toLocaleDateString('en-CA', { timeZone: ZONA });
    const horaActual = ahora.toLocaleTimeString('en-GB', { timeZone: ZONA, hour: '2-digit', minute: '2-digit' });

    if (fecha < hoy || (fecha === hoy && hora <= horaActual)) {
      return res.status(400).json({ mensaje: 'No puedes reservar en una fecha u hora que ya pasó' });
    }

    if (typeof servicio !== 'string' || !(await Servicio.exists({ _id: servicio }))) {
      return res.status(400).json({ mensaje: 'Servicio no válido' });
    }

    const yaOcupado = await Cita.findOne({
      fecha, hora, estado: { $ne: 'cancelada' }
    });

    if (yaOcupado) {
      return res.status(409).json({ mensaje: 'Ese horario ya está reservado, elige otro' });
    }

    const nuevaCita = new Cita({ cliente_nombre, servicio, fecha, hora });
    await nuevaCita.save();
    res.status(201).json(nuevaCita);
  } catch (error) {
    // 11000 = el índice único rechazó un duplicado (alguien reservó justo antes)
    if (error.code === 11000) {
      return res.status(409).json({ mensaje: 'Ese horario ya está reservado, elige otro' });
    }
    if (error.name === 'ValidationError' || error.name === 'CastError') {
      return res.status(400).json({ mensaje: 'Datos inválidos: revisa servicio, fecha, hora y nombre' });
    }
    res.status(500).json({ mensaje: 'Error al reservar' });
  }
});

// Ver agenda (solo administrador) - con filtro por día o semana
router.get('/', verificarToken, async (req, res) => {
  try {
    const { fecha, desde, hasta } = req.query;
    const filtro = {};

    if (fecha) {
      if (typeof fecha !== 'string' || !FORMATO_FECHA.test(fecha)) {
        return res.status(400).json({ mensaje: 'Fecha inválida' });
      }
      filtro.fecha = fecha;
    } else if (desde && hasta) {
      if (
        typeof desde !== 'string' || typeof hasta !== 'string' ||
        !FORMATO_FECHA.test(desde) || !FORMATO_FECHA.test(hasta)
      ) {
        return res.status(400).json({ mensaje: 'Rango de fechas inválido' });
      }
      filtro.fecha = { $gte: desde, $lte: hasta };
    }

    const citas = await Cita.find(filtro)
      .populate('servicio', 'nombre')
      .sort({ fecha: 1, hora: 1 });

    res.json(citas);
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al cargar la agenda' });
  }
});

// Solo se puede cambiar el estado de una cita pendiente
async function cambiarEstado(req, res, nuevoEstado) {
  try {
    const cita = await Cita.findById(req.params.id);

    if (!cita) {
      return res.status(404).json({ mensaje: 'Cita no encontrada' });
    }

    if (cita.estado !== 'pendiente') {
      return res.status(400).json({
        mensaje: `La cita ya está ${cita.estado}, no se puede modificar`
      });
    }

    cita.estado = nuevoEstado;
    await cita.save();
    res.json(cita);
  } catch (error) {
    res.status(400).json({ mensaje: 'ID de cita inválido' });
  }
}

router.put('/:id/cancelar', verificarToken, (req, res) => cambiarEstado(req, res, 'cancelada'));
router.put('/:id/atender', verificarToken, (req, res) => cambiarEstado(req, res, 'atendida'));

module.exports = router;