import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import rawgService from "./rawgService.mjs";
import RepoTask from "../repositories/task_repository.mjs";

// Carga el .env desde configuration/ igual que client.mjs
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../configuration/env') });

export async function importGames() {
    const juegosRAWG = await rawgService.obtenerJuegosRAWG();

    if (!juegosRAWG || juegosRAWG.length === 0) {
        console.log("No se obtuvieron juegos de RAWG");
        return;
    }

    const juegosProcesados = juegosRAWG.map(j => ({
        name_game: j.name,
        price: Math.floor(Math.random() * 51) + 10,
        image: j.background_image
    }));

    for (const juego of juegosProcesados) {
        await RepoTask.addGame(juego.name_game, juego.price, juego.image);
    }

    console.log(`Importación completada: ${juegosProcesados.length} juegos procesados`);
}

export default { importGames };
