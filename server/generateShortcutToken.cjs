const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");

// Carica le variabili d'ambiente (per prendere JWT_SECRET)
dotenv.config();

// --- CONFIGURA QUESTI DUE VALORI ---

// 1. Inserisci qui l'ID utente (dal tuo database) 
//    per cui vuoi generare il token.
const TUO_USER_ID = 1; 

// 2. Assicurati che il nome della variabile del segreto 
//    corrisponda a quello nel tuo file .env
const secretKey = process.env.JWT_SECRET; 

// ------------------------------------

if (!TUO_USER_ID) {
  console.error("Errore: Devi specificare il tuo USER ID nel file.");
  process.exit(1);
}

if (!secretKey) {
  console.error("Errore: JWT_SECRET non trovato nel file .env.");
  process.exit(1);
}

// Creiamo il payload
// Deve corrispondere a quello che 'requireAuth' si aspetta.
// Di solito è un oggetto con 'userId' o 'sub' (subject).
const payload = {
  sub: TUO_USER_ID,
  // Se il tuo 'requireAuth' cerca 'sub' (subject), usa questo:
  // sub: TUO_USER_ID 
};

// Generiamo il token SENZA SCADENZA.
// Per questo specifico uso (è una API key personale) è accettabile.
// Se preferisci una scadenza lunghissima, aggiungi: { expiresIn: '10y' }
const token = jwt.sign(payload, secretKey);

console.log("--- IL TUO TOKEN PER I COMANDI RAPIDI ---");
console.log("\nCopia e incolla questo token nel tuo Comando Rapido su iPhone:");
console.log(`\nBearer ${token}\n`);