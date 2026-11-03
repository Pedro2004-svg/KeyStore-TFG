//ESTE ARCHIVO YA NO SERIA NECESARIO, TODO SE GESTIONA EN CLIENT.MJS USANDO LA URL Y LA CLAVE
//DEBEMOS ELIMINAR DEL .env: DB_USER, DB_PASSWORD, DB_NAME, DB_PORT
//AHORA SE ENCARGA EL SDK CON LA URL Y EL SERVICE_ROLE DE LA CONEXION
import dotenv from 'dotenv';
import path from 'path';
import pkg from 'pg';
const { Pool } = pkg;
/*
Esquema para supabase con RLS:
create schema if not exists private;
alter table public.favourites set schema private;
alter table public.games set schema private;
alter table public.purchased set schema private;
alter table public.sold_out set schema private;
alter table public.users set schema private;
*/


dotenv.config({ path: path.resolve('./configuration/.env') });

//console.log("DATABASE_URL:", process.env.DB_USER, process.env.DB_PASSWORD, process.env.DB_NAME, process.env.DB_PORT, process.env.DB_HOST); => COMPROBAR DATOS SIN undefined

const pool = new Pool({
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: Number(process.env.DB_PORT),
    host: process.env.DB_HOST,
    max: 20 

})

export async function createTables() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS usuarios (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_name VARCHAR(255) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        await pool.query(`
            CREATE TABLE IF NOT EXISTS juegos (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                name_game VARCHAR(255) UNIQUE NOT NULL,
                price NUMERIC(10, 2) NOT NULL,
                image TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        await pool.query(`
            CREATE TABLE IF NOT EXISTS favoritos (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id UUID NOT NULL,
                game_id UUID NOT NULL,
                price NUMERIC(10, 2) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES usuarios(id) ON DELETE CASCADE,
                FOREIGN KEY (game_id) REFERENCES juegos(id) ON DELETE CASCADE,
                UNIQUE(user_id, game_id)
            );
        `);
        await pool.query(`
            CREATE TABLE IF NOT EXISTS ventas (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id UUID NOT NULL,
                game_id UUID NOT NULL,
                price NUMERIC(10, 2) NOT NULL,
                offer BOOLEAN DEFAULT FALSE,
                FOREIGN KEY (user_id) REFERENCES usuarios(id) ON DELETE CASCADE,
                FOREIGN KEY (game_id) REFERENCES juegos(id) ON DELETE CASCADE
            );
        `);     
    } catch (err) {
        console.error("Error al crear tablas:", err.message);
        throw err;
    }
}

export default pool
