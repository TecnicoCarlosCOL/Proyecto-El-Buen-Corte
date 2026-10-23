const express = require('express');
const router = express.Router();
const Servicio = require('../models/Servicio');

router.get('/', async (req, res) => {
  const servicios = await Servicio.find();
  res.json(servicios);
});

module.exports = router;