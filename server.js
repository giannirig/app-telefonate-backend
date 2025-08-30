// server.js - Versione ottimizzata per Hostinger
const bcrypt = require('bcrypt');
const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const path = require('path');

const app = express();

// Configurazione CORS
const allowedOrigins = [
  'https://lingotribe.eazycom.it',
  'http://lingotribe.eazycom.it',
  'http://localhost:3000',
  'http://localhost:5173'
];

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.log('Blocked by CORS:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  credentials: true,
  optionsSuccessStatus: 204
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(express.json());

// Servire file statici per il frontend (se necessario)
app.use(express.static(path.join(__dirname, 'public')));

// Configurazione del database per Hostinger
const dbConfig = {
  host: process.env.DB_HOST || 'srv1799.hstgr.io',
  user: process.env.DB_USER || 'u937909507_lingotribeus',
  password: process.env.DB_PASSWORD || 'Eccheccazzo1!',
  database: process.env.DB_DATABASE || 'u937909507_lingotribedb',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  charset: 'utf8mb4',
  ssl: {
    rejectUnauthorized: false
  }
};

console.log('Database config:', {
  host: dbConfig.host,
  user: dbConfig.user,
  database: dbConfig.database
});

const pool = mysql.createPool(dbConfig);
const dbConnection = pool.promise();

// Verifica connessione al database
dbConnection.getConnection()
  .then(connection => {
    console.log('✅ Connesso al database MySQL su Hostinger');
    connection.release();
  })
  .catch(err => {
    console.error('❌ Errore di connessione al database:', err);
  });

// API Routes
app.get('/', (req, res) => {
  res.json({ 
    message: 'Server Lingo Tribe attivo!',
    timestamp: new Date().toISOString(),
    database: dbConfig.database
  });
});

app.post('/register', async (req, res) => {
  try {
    console.log('Register request body:', req.body);
    const { username, name, phone, password } = req.body;
    
    if (!username || !name || !phone || !password) {
      return res.status(400).json({ message: 'Tutti i campi sono obbligatori.' });
    }
    
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    const sqlQuery = 'INSERT INTO users (username, name, phone, password) VALUES (?, ?, ?, ?)';
    
    const [result] = await dbConnection.execute(sqlQuery, [username, name, phone, hashedPassword]);
    console.log('User registered successfully:', result.insertId);
    
    res.status(201).json({ 
      message: 'Utente registrato con successo!',
      userId: result.insertId
    });
  } catch (error) {
    console.error('Errore /register:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'Username già esistente.' });
    }
    res.status(500).json({ message: 'Errore interno del server.' });
  }
});

// Altre API (login, availability, ecc.)
// [Incolla qui le altre API dal tuo file originale]

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server in ascolto sulla porta ${PORT}`);
  console.log(`📊 Database: ${dbConfig.database}@${dbConfig.host}`);
});








