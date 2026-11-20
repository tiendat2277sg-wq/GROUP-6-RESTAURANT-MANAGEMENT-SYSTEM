import 'dotenv/config';
import sql from './sql-driver.js';

const config = {
  ...(process.env.DB_TRUSTED_CONNECTION === 'true'
    ? {
        connectionString:
          'Driver={ODBC Driver 18 for SQL Server};Server=' +
          (process.env.DB_SERVER || 'localhost') +
          ';Database=' +
          (process.env.DB_DATABASE || 'System_Restaurant') +
          ';Trusted_Connection=Yes;Encrypt=No;TrustServerCertificate=Yes;',
      }
    : {}),
  server: process.env.DB_SERVER || 'localhost',
  port: Number(process.env.DB_PORT) || 1433,
  database: process.env.DB_DATABASE || 'System_Restaurant',
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  options: {
    useUTC: false,
    encrypt: process.env.DB_ENCRYPT === 'true',
    trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE !== 'false',
  },
};

let poolPromise = null;

export async function getRawPool() {
  if (!poolPromise) {
    poolPromise = sql.connect(config).then((poolInstance) => {
      poolInstance.on('error', (err) => {
        console.error('[DB] Connection pool error:', err.message);
        poolPromise = null;
      });
      return poolInstance;
    });
  }
  return poolPromise;
}

const pool = {
  query: async (queryText) => {
    const rawPool = await getRawPool();
    const result = await rawPool.request().query(queryText);
    return [result.recordset, result];
  },
  request: async () => {
    const rawPool = await getRawPool();
    return rawPool.request();
  },
};

export default pool;
