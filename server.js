// server.js
const bcrypt = require('bcrypt');
const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Usa un pool di connessioni invece di una singola connessione
const pool = mysql.createPool({
  host: 'srv1799.hstgr.io',
  user: 'u937909507_lingotribeus',
  password: 'Eccheccazzo1!',
  database: 'u937909507_lingotribedb',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  acquireTimeout: 30000,
  charset: 'utf8mb4'
});

const dbConnection = pool.promise();

// Test connessione
async function testConnection() {
  try {
    // Usiamo il pool per ottenere una connessione temporanea per il test
    await dbConnection.execute('SELECT 1');
    console.log('Connessione database: OK');
    return true;
  } catch (error) {
    console.error('Errore connessione database:', error.message);
    return false;
  }
}

// API di test
app.get('/', (req, res) => {
  res.send('Server attivo e funzionante!');
});

// Test database via API
app.get('/test-db', async (req, res) => {
  const isConnected = await testConnection();
  if (isConnected) {
    res.json({ message: 'Database connesso!' });
  } else {
    res.status(500).json({ message: 'Database non connesso' });
  }
});

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
    console.error('Errore durante la registrazione:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'Username già esistente.' });
    }
    res.status(500).json({ message: 'Errore interno del server.' });
  }
}); // <-- PARENTESI GRAFFA MANCANTE AGGIUNTA QUI PER CHIUDERE LA FUNZIONE /register
// ========= API PER LE DISPONIBILITÀ =========

// API per aggiungere una nuova disponibilità
app.post('/availability', async (req, res) => {
  try {
    // NOTA: In un'app reale, l'ID utente verrebbe da un token di autenticazione, non inviato dal client.
    // Per ora, ci fidiamo del front-end per semplicità.
    const { userId, date, time } = req.body;

    if (!userId || !date || !time) {
      return res.status(400).json({ message: 'ID utente, data e ora sono obbligatori.' });
    }

    const sqlQuery = 'INSERT INTO availabilities (user_id, slot_date, slot_time) VALUES (?, ?, ?)';
    await dbConnection.execute(sqlQuery, [userId, date, time]);

    res.status(201).json({ message: 'Disponibilità aggiunta con successo!' });

  } catch (error) {
    console.error('Errore durante l\'aggiunta della disponibilità:', error);
    res.status(500).json({ message: 'Errore interno del server.' });
  }
});

// API per ottenere tutte le disponibilità per una data specifica
app.get('/availability', async (req, res) => {
  try {
    const { date } = req.query; // Prendiamo la data dalla URL, es: /availability?date=2025-08-29

    if (!date) {
      return res.status(400).json({ message: 'La data è un parametro obbligatorio.' });
    }

    // Query SQL con un JOIN per ottenere anche il nome dell'utente
    const sqlQuery = `
      SELECT 
        availabilities.id, 
        availabilities.slot_date, 
        availabilities.slot_time, 
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
    console.error('Errore nel recupero delle disponibilità:', error);
    res.status(500).json({ message: 'Errore interno del server.' });
  }
});
// API per il login di un utente
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
    console.error('Errore durante il login:', error);
    res.status(500).json({ message: 'Errore interno del server.' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
  console.log(`🚀 Server in ascolto sulla porta ${PORT}`);
  
  // Test connessione all'avvio
  setTimeout(testConnection, 2000); // Aspetta 2 secondi prima del test
});