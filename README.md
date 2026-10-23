# El Buen Corte - Sistema de reservas con agenda

Sistema web de reservas para la barbería "El Buen Corte". El cliente consulta los horarios disponibles y reserva su cita sin crear una cuenta; el barbero inicia sesión, ve su agenda por día o semana y gestiona el estado de cada cita, sin choques de horario.

Proyecto de grado del Técnico Laboral en Programación de Software.
**Autor:** Carlos Buitrago

## Funcionalidades

**Cliente**
- Elige servicio y fecha (no permite fechas pasadas).
- Ve los turnos disponibles; los ocupados aparecen deshabilitados.
- Reserva escribiendo solo su nombre.

**Administrador (barbero)**
- Inicio de sesión con usuario y contraseña.
- Agenda ordenada por fecha y hora, con filtros: Hoy, Esta semana, Todas o una fecha.
- Marca citas como **atendidas** o las **cancela** (pide confirmación).

**Reglas del sistema**
- Una cita nace como `pendiente` y solo puede pasar a `atendida` o `cancelada`. Después ya no se modifica.
- No se pueden reservar dos citas activas en el mismo horario, ni siquiera con solicitudes simultáneas.
- Una cita cancelada libera su horario.
- Turnos fijos: 09:00, 10:00, 11:00, 14:00, 15:00 y 16:00 (zona horaria `America/Bogota`).

## Tecnologías

| Capa | Tecnología |
|---|---|
| Servidor | Node.js + Express |
| Base de datos | MongoDB Atlas + Mongoose |
| Autenticación | JWT (`jsonwebtoken`) y `bcryptjs` |
| Interfaz | HTML, CSS y JavaScript |
| Desarrollo | nodemon, Git, VS Code |

## Estructura del proyecto

```
el-buen-corte/
├── models/
│   ├── db.js              # Conexión a MongoDB
│   ├── Usuario.js
│   ├── Servicio.js
│   └── Cita.js            # Incluye el índice único parcial anti doble reserva
├── routes/
│   ├── authRoutes.js      # Login
│   ├── servicioRoutes.js
│   └── citaRoutes.js      # Reservas, agenda y estados
├── middleware/
│   └── verificarToken.js  # Protege las rutas del administrador
├── public/                # Frontend
│   ├── index.html         # Reserva del cliente
│   ├── login.html
│   ├── agenda.html        # Panel del administrador
│   ├── style.css
│   ├── cliente.js
│   ├── login.js
│   └── agenda.js
├── server.js
├── seed.js                # Crea el administrador y los servicios iniciales
├── test-funcional.js      # Pruebas funcionales automáticas
├── test-concurrencia.js   # Prueba de reservas simultáneas
├── .env                   # Variables secretas (no se sube a Git)
└── package.json
```

## Requisitos

- [Node.js](https://nodejs.org) (versión LTS)
- [Git](https://git-scm.com)
- Una cuenta gratuita en [MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register)

## Instalación

1. Clona el repositorio e instala las dependencias:
   ```bash
   git clone <URL-del-repositorio>
   cd el-buen-corte
   npm install
   ```

2. En MongoDB Atlas crea un cluster gratuito (M0), un usuario de base de datos y, en **Network Access**, permite el acceso desde `0.0.0.0/0`.

3. Crea un archivo `.env` en la raíz del proyecto (sin comillas ni espacios alrededor del `=`):
   ```
   MONGO_URI=mongodb+srv://USUARIO:CONTRASENA@cluster0.xxxxx.mongodb.net/elbuencorte?retryWrites=true&w=majority&appName=Cluster0
   JWT_SECRET=una_clave_larga_y_secreta
   PORT=3000
   ```

4. Carga los datos iniciales **una sola vez**:
   ```bash
   node seed.js
   ```
   Esto crea el administrador (`carlos` / `123456`) y tres servicios. Cambia esa contraseña antes de usar el sistema en producción.

## Uso

```bash
npm run dev
```

| Pantalla | Dirección |
|---|---|
| Reserva del cliente | http://localhost:3000 |
| Inicio de sesión del administrador | http://localhost:3000/login.html |
| Agenda | http://localhost:3000/agenda.html |

## API

| Método y ruta | Acceso | Descripción |
|---|---|---|
| `GET /api/servicios` | Público | Lista los servicios |
| `GET /api/citas/disponibilidad/:fecha` | Público | Horas ocupadas de una fecha (`AAAA-MM-DD`) |
| `POST /api/citas` | Público | Reserva una cita |
| `POST /api/auth/login` | Público | Devuelve un token válido por 8 horas |
| `GET /api/citas` | Administrador | Agenda. Filtros: `?fecha=` o `?desde=&hasta=` |
| `PUT /api/citas/:id/atender` | Administrador | Marca la cita como atendida |
| `PUT /api/citas/:id/cancelar` | Administrador | Cancela la cita |

Las rutas de administrador requieren el encabezado `Authorization: Bearer <token>`.

## Cómo se evita la doble reserva

Verificar si el horario está libre y luego guardar no basta: si dos personas reservan casi al mismo tiempo, ambas ven el horario libre. Por eso la regla la garantiza la propia base de datos con un **índice único parcial** sobre `fecha` y `hora`, que solo aplica a citas `pendiente` o `atendida`. Si el índice rechaza un duplicado, la API responde `409`.

## Pruebas

Con el servidor corriendo en una terminal, abre otra (dentro de la carpeta del proyecto) y ejecuta:

```bash
node test-funcional.js      # Pruebas funcionales (23 casos)
node test-concurrencia.js   # 10 reservas simultáneas al mismo horario
```

Resultado esperado: `0 con FALLO` en las funcionales, y exactamente `1` reserva aceptada en la de concurrencia. Ambos scripts borran sus propios datos de prueba (los que empiezan por `TEST-`).

## Seguridad

- Contraseñas cifradas con bcrypt, nunca en texto plano.
- Sesión con JWT de 8 horas; las rutas de administrador rechazan solicitudes sin token válido.
- El servidor valida formato, fecha, hora, servicio y tipo de datos de cada solicitud, sin confiar en el navegador.
- Los textos escritos por el cliente se escapan antes de mostrarse en la agenda (protección contra XSS).

## Despliegue en Render

1. Agrega este script a `package.json`:
   ```json
   "scripts": {
     "start": "node server.js",
     "dev": "nodemon server.js"
   }
   ```
2. Sube el proyecto a GitHub (el `.env` no se sube: está en `.gitignore`).
3. En [Render](https://render.com) crea un **Web Service** conectado al repositorio.
   - Build command: `npm install`
   - Start command: `npm start`
4. En **Environment** agrega `MONGO_URI` y `JWT_SECRET`.

## Problemas frecuentes

| Problema | Solución |
|---|---|
| `npm` bloqueado en PowerShell ("la ejecución de scripts está deshabilitada") | Abre PowerShell como administrador y ejecuta `Set-ExecutionPolicy RemoteSigned -Scope CurrentUser` |
| `injected env (0)` o `uri ... undefined` | El archivo debe llamarse exactamente `.env` y estar junto a `server.js`. nodemon no recarga el `.env`: detén el servidor con `Ctrl + C` y vuelve a iniciarlo |
| `bad auth : authentication failed` | Usuario o contraseña de la base de datos incorrectos. Revísalos en Atlas, en **Database Access** |
| No conecta a Atlas | Verifica que **Network Access** tenga `0.0.0.0/0` |
| `Cannot find module 'test-...js'` | Estás en la carpeta equivocada: entra a la carpeta del proyecto con `cd` |

## Mejoras futuras

- Recordatorios automáticos por correo o mensaje.
- Horarios de atención y días no laborables configurables; turnos de 30 minutos según la duración del servicio.
- Cuentas de cliente, con cancelación de sus propias citas.
- Varios barberos (el índice único debería incluir al barbero).
- Aviso de privacidad en el formulario, conforme a la Ley 1581 de 2012.

## Licencia

Proyecto académico. Todos los derechos reservados por el autor.
