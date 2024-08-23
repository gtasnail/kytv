require('dotenv').config(); // yucky mess i know bad code bad practices all around! (made in 22hours!)

const express = require('express');
const http = require('http');
const path = require('path');
const socketIo = require('socket.io');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const winston = require('winston');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(helmet());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});
app.use(limiter);

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  defaultMeta: { service: 'user-service' },
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}

app.use(express.static(path.join(__dirname, 'build')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

const waitingUsers = {};
const activeConnections = new Map();
const countryStats = {};
const userCountries = new Map();

function updateCountryStats() {
  for (const country in countryStats) {
    countryStats[country] = 0;
  }

  for (const country in waitingUsers) {
    countryStats[country] = waitingUsers[country].length;
  }
  activeConnections.forEach((partnerId, userId) => {
    const userCountry = userCountries.get(userId);
    if (userCountry) {
      countryStats[userCountry] = (countryStats[userCountry] || 0) + 1;
    }
  });

  io.emit('country-stats-update', countryStats);
  logger.info('Active users by country:', countryStats);
}

function findPartner(socket, country) {
  if (!waitingUsers[country]) {
    waitingUsers[country] = [];
  }

  if (waitingUsers[country].length > 0) {
    const partner = waitingUsers[country].shift();
    socket.partner = partner;
    partner.partner = socket;
    activeConnections.set(socket.id, partner.id);
    activeConnections.set(partner.id, socket.id);
    socket.emit('partner-found');
    partner.emit('partner-found');
    socket.emit('start_call');
  } else {
    waitingUsers[country].push(socket);
    socket.emit('no-users-available');
  }
  updateCountryStats();
}

function disconnectPartner(socket) {
  if (socket.partner) {
    socket.partner.emit('partner-disconnected');
    if (activeConnections.has(socket.partner.id)) {
      activeConnections.delete(socket.partner.id);
    }
    socket.partner.partner = null;
    socket.partner = null;
  }
  if (activeConnections.has(socket.id)) {
    activeConnections.delete(socket.id);
  }
  const userCountry = userCountries.get(socket.id);
  if (userCountry && waitingUsers[userCountry]) {
    const index = waitingUsers[userCountry].indexOf(socket);
    if (index > -1) {
      waitingUsers[userCountry].splice(index, 1);
    }
  }
  updateCountryStats();
}

io.on('connection', (socket) => {
  logger.info('A user connected');

  socket.on('join', ({ country }) => {
    userCountries.set(socket.id, country);
    findPartner(socket, country);
  });

  socket.on('find-partner', ({ country }) => {
    const oldCountry = userCountries.get(socket.id);
    if (oldCountry !== country) {
      if (waitingUsers[oldCountry]) {
        const index = waitingUsers[oldCountry].indexOf(socket);
        if (index > -1) {
          waitingUsers[oldCountry].splice(index, 1);
        }
      }
      userCountries.set(socket.id, country);
    }
    disconnectPartner(socket);
    findPartner(socket, country);
  });

  socket.on('offer', (offer) => {
    if (socket.partner) {
      socket.partner.emit('offer', offer);
    }
  });

  socket.on('answer', (answer) => {
    if (socket.partner) {
      socket.partner.emit('answer', answer);
    }
  });

  socket.on('ice-candidate', (candidate) => {
    if (socket.partner) {
      socket.partner.emit('ice-candidate', candidate);
    }
  });

  socket.on('stop-searching', () => {
    disconnectPartner(socket);
  });

  socket.on('disconnect', () => {
    logger.info('A user disconnected');
    disconnectPartner(socket);
    userCountries.delete(socket.id);
    updateCountryStats();
  });
});

app.get('/api/country-stats', (req, res) => {
  res.json(countryStats);
});

app.use((err, req, res, next) => {
  logger.error(err.stack);
  res.status(500).send('Something broke!');
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  logger.info(`Server is running on port ${PORT}`);
});