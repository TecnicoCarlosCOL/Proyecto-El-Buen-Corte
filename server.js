require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./models/db');

const app = express();

connectDB();

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/servicios', require('./routes/servicioRoutes'));
app.use('/api/citas', require('./routes/citaRoutes'));

app.get('/', (req, res) => {
  res.send('El Buen Corte - servidor funcionando');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});