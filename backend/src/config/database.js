import pkg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pkg;

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 5432),
  database: process.env.DB_NAME || 'ticketsrepas',
  user: process.env.DB_USER || 'ticketsrepas',
  password: process.env.DB_PASSWORD || 'ticketsrepas',
});

pool.on('error', (err) => {
  console.error('Erreur PostgreSQL:', err);
});

export default pool;
