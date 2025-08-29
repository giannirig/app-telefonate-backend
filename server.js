// server.js (Versione Finale e Corretta - 29 Agosto 2025)

// 1. IMPORTAZIONI
const bcrypt = require('bcrypt');
const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');

// 2. CONFIGURAZIONE DELL'APPLICAZIONE
const app = express(); // Dichiarato UNA SOLA VOLTA

// Configurazione CORS completa per accettare richieste dai frontend specificati
const allowedOrigins = [
  'https://lingotribe.eazycom.it',
  // Sostituisci la riga qui sotto con il tuo URL reale che ti ha dato Netlify
  'https://lingo4tribe.netlify.app' 
];

const corsOptions = {
  origin: function (origin, callback) {
    // Permette le richieste senza 'origin' (es. da app desktop come Thunder Client) o se l'origine è nella lista
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  credentials: true,
  optionsSuccessStatus: 204
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // Gestisce le richieste di controllo "preflight"

app.use(express.json()); // Middleware per leggere il body delle richieste JSON

// 3. CONFIGURAZIONE DEL DATABASE
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  charset: 'utf8mb4',
  ssl: {
    rejectUnauthorized: false,
    ciphers: 'AES128-SHA'
  }
});

const dbConnection = pool.promise();

// 4. API ROUTES (le "strade" del nostro server)

// API di test per verificare che il server sia online
app.get('/', (req, res) => {
  res.send('Server dell\'app di prenotazione attivo!');
});

// API per la registrazione
app.post('/register', async (req, res) => {
  try {
    const { username, name, phone, password } = req.body;
    if (!username || !name || !phone || !password) {
      return res.status(400).json({ message: 'Tutti i campi sono obbligatori.' });
    }
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    const sqlQuery = 'INSERT INTO users (username, name, phone, password) VALUES (?, ?, ?, ?)';
    await dbConnection.execute(sqlQuery, [username, name, phone, hashedPassword]);
    res.status(201).json({ message: 'Utente registrato con successo!' });
  } catch (error) {
    console.error('Errore /register:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'Username già esistente.' });
    }
    res.status(500).json({ message: 'Errore interno del server.' });
  }
});

// API per il login
app.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ message: 'Username e password sono obbligatori.' });
    }
    const sqlQuery = 'SELECT * FROM users WHERE username = ?';
    const [users] = await dbConnection.execute(sqlQuery, [username]);
    if (users.length === 0) {
      return res.status(401).json({ message: 'Credenziali non valide.' });
    }
    const user = users[0];
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (passwordMatch) {
      res.status(200).json({ message: 'Login effettuato con successo!', user: { id: user.id, name: user.name } });
    } else {
      res.status(401).json({ message: 'Credenziali non valide.' });
    }
  } catch (error) {
    console.error('Errore /login:', error);
    res.status(500).json({ message: 'Errore interno del server.' });
  }
});

// API per aggiungere disponibilità
app.post('/availability', async (req, res) => {
  try {
    const { userId, date, time, duration } = req.body;
    if (!userId || !date || !time || !duration) {
      return res.status(400).json({ message: 'ID utente, data, ora e durata sono obbligatori.' });
    }
    const sqlQuery = 'INSERT INTO availabilities (user_id, slot_date, slot_time, duration) VALUES (?, ?, ?, ?)';
    await dbConnection.execute(sqlQuery, [userId, date, time, duration]);
    res.status(201).json({ message: 'Disponibilità aggiunta con successo!' });
  } catch (error) {
    console.error('Errore POST /availability:', error);
    res.status(500).json({ message: 'Errore interno del server.' });
  }
});

// API per ottenere disponibilità
app.get('/availability', async (req, res) => {
  try {
    const { date } = req.query;
    if (!date) {
      return res.status(400).json({ message: 'La data è un parametro obbligatorio.' });
    }
    const sqlQuery = `
      SELECT 
        availabilities.id, 
        availabilities.slot_date, 
        availabilities.slot_time, 
        availabilities.duration,
        users.id AS userId,
        users.name AS userName
      FROM availabilities
      JOIN users ON availabilities.user_id = users.id
      WHERE availabilities.slot_date = ?
      ORDER BY availabilities.slot_time ASC
    `;
    const [availabilities] = await dbConnection.execute(sqlQuery, [date]);
    res.status(200).json(availabilities);
  } catch (error) {
    console.error('Errore GET /availability:', error);
    res.status(500).json({ message: 'Errore interno del server.' });
  }
});

// API per cancellare disponibilità
app.delete('/availability/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const sqlQuery = 'DELETE FROM availabilities WHERE id = ?';
    const [result] = await dbConnection.execute(sqlQuery, [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Disponibilità non trovata.' });
    }
    res.status(200).json({ message: 'Disponibilità cancellata con successo!' });
  } catch (error) {
    console.error('Errore DELETE /availability:', error);
    res.status(500).json({ message: 'Errore interno del server.' });
  }
});

// 5. AVVIO DEL SERVER
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server in ascolto sulla porta ${PORT}`);
});








