const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Usuario = require('../models/Usuario');

router.post('/login', async (req, res) => {
  try {
    const { usuario, password } = req.body;

        if (typeof usuario !== 'string' || typeof password !== 'string' || !usuario || !password) {
      return res.status(400).json({ mensaje: 'Ingresa usuario y contraseña' });
    }

    const usuarioEncontrado = await Usuario.findOne({ usuario });
    if (!usuarioEncontrado) {
      return res.status(400).json({ mensaje: 'Usuario o contraseña incorrectos' });
    }

    const passwordValida = await bcrypt.compare(password, usuarioEncontrado.password);
    if (!passwordValida) {
      return res.status(400).json({ mensaje: 'Usuario o contraseña incorrectos' });
    }

    const token = jwt.sign(
      { id: usuarioEncontrado._id, usuario: usuarioEncontrado.usuario },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.json({ token });
  } catch (error) {
    res.status(500).json({ mensaje: 'Error en el servidor', error: error.message });
  }
});

module.exports = router;