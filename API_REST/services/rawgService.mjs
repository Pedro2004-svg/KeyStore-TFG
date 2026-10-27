import 'dotenv/config';

/*QUITAR COMILLAS Y PONER EN EL .ENV COMO ESTA LLAMADO EN LA CONSTANTE DE ABAJO (RAWG_API_KEY)*/ 
/*let apiK = "22c79d5b81fe426cac37c693b0286fe3"*/
async function obtenerJuegosRAWG() {
    const apiKey = process.env.RAWG_API_KEY;
    const url = `https://api.rawg.io/api/games?key=${apiKey}&page_size=30`;

    try {
        const res = await fetch(url);
        if (!res.ok){
            throw new Error(`HTTP error! status: ${res.status}`);
        } 
        const data = await res.json();

        return data.results; 
    } catch (err) {
        console.error("Error al llamar a RAWG:", err.message);
        return [];
    }
}

export default { obtenerJuegosRAWG };