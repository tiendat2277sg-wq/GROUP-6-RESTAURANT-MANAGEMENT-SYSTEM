import 'dotenv/config';
const { default: sql } = await import(process.env.DB_TRUSTED_CONNECTION === 'true' ? 'mssql/msnodesqlv8.js' : 'mssql');
export default sql;
