/**
 * PoolClient is used to create a single database connection acquired from Pool
 * 
 * Mostly used for transactional operations(having full control over a db transaction) 
 * where multiple queries must be excuted on the same connection 
 * to ensure atomicity and consistency
 */
import { Pool, PoolClient } from 'pg';
import dotenv from 'dotenv';
import { logger } from './logger.util';

dotenv.config();

const pool = new Pool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    user: process.env.DB_USER
});

/**
 * This function return the server's timezone offset
 * It returns the UTC offset
 * 
 * This function calculates the timezone and formats it as a string
 * in ISO 8601 format (+-HH:MM)
 * 
 * The value is derived from the runtime environment (server timezone) and
 * accounts for both hour and minute offsets (e.g. +02:00, -05:30).
 */
export const getAppTimezone = () =>{
    const getMinutes = new Date().getTimezoneOffset();
    const getHours = Math.floor(Math.abs(getMinutes) / 60);
    const getRemainingMinutes = Math.abs(getHours % 60);
    const sign = getMinutes <= 0? "+" : "-";
    return `${sign}${String(getHours).padStart(2, '0')}:${String(getRemainingMinutes).padStart(2, '0')}`;
};

/**
 * Excutes a PostgreSQL query using either a transaction client or the default connection pool
 * @param text - SQL query to execute
 * @param params - Optional array of parameters for parameterized queries
 * @param client - Optional transaction client - if provided query will use it, if not it will use the default pool
 * @returns - Array of result rows instead of the entire pg
 */
export const query = async (text: string, params?: any[], client?: PoolClient) =>{
    try{
        const dbClient = client || pool;
        const results = await dbClient.query(text, params);
        return results.rows;
    }catch(error: any){
        console.error("Database query error:", error);
        throw error;
    }   
};

/**
 * This function starts a transaction by acquiring a client from pool
 * @returns {Promise<PoolClient>} - Returns a client resolved to PoolClient
 */
export const startTransaction = async (): Promise<PoolClient> =>{
    const client = await pool.connect();// Create a single connection
    try{
        await client.query('BEGIN');// Start transaction
        return client;
    }catch(error){
        client.release();// End transaction error
        throw error;
    }
};

/**
 * Function to permanently save all the changes made in the db
 * @param client - The transaction client
 */
export const commitTransaction = async (client: PoolClient): Promise<void> =>{
    try{
        await client.query('COMMIT');
    }finally{
        client.release();
    }
};

/**
 * Undo all the changes made so far in the database and return it to the state before the changes
 */
export const rollbackTransaction = async (client: PoolClient): Promise<void> =>{
    try{
        await client.query('ROLLBACK');
    }finally{
        client.release();
    }
};

export const openPool = async () =>{
    try{
        await pool.query("Select 1");
        logger.success("PostgreSQL connection running successfully");
    }catch(error){
        logger.error("PostgreSQL connection failed:", error);
        process.exit(1);
    }
}

export const closePool = async () =>{
    await pool.end();
    console.log("Database connection closed.");
}

export const queryTransaction = async (client: PoolClient, text: string, params?: any[]) => {
    return client.query(text, params);
};

export default pool;