import axios from 'axios';
import supabase from '../configuration/client.mjs';

const APP_IDS = [
  330, 730, 570, 680, 440, 1091500, 271590, 1172470, 578080, 252490, 374320, 413150,
  1245620, 1086940, 814380, 359550, 1817070, 1938090, 2050650, 1517290, 1623730, 1966720,
  381210, 292030, 1174180, 1888160, 304930, 1240440, 1172620, 275850, 289070, 346110,
  1506830, 1063730, 1085660, 1938010, 2050400, 105600, 108600, 242760, 251570, 294100,
  322330, 327070, 367520, 386360, 400, 418460, 431960, 489830, 493520, 526870,
  548430, 553850, 582010, 588650, 601150, 620, 627690, 632360, 648800, 677950,
  728880, 736220, 739630, 753640, 758010, 770150, 782330, 787480, 812140, 828070,
  834530, 851850, 858810, 870780, 892970, 921290, 945360, 952060, 976730, 990080,
  1010970, 1019100, 1054490, 1057090, 1072420, 1077400, 1080110, 1091990, 1097840, 1099210,
  1151640, 1158310, 1196590, 1203220, 1222670, 1238810, 1259420, 1284210, 1326470, 1332010,
];

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function getGameDetails(appId) {
  try {
    const { data } = await axios.get(
      `https://store.steampowered.com/api/appdetails`,
      {
        params: { appids: appId, l: 'spanish' },
        timeout: 5000
      }
    );
    if (!data[appId]?.success) return null;
    return data[appId].data;
  } catch (err) {
    console.warn(`⚠️ Error obteniendo appId ${appId}:`, err.message);
    return null;
  }
}

export async function syncSteamGames() {
  console.log('🎮 Iniciando sincronización de juegos desde Steam...');

  let insertados = 0;
  let errores = 0;

  for (const appId of APP_IDS) {
    const game = await getGameDetails(appId);

    if (!game) {
      errores++;
      continue;
    }

  const gameData = {
    id_game: game.steam_appid,
    name_game: game.name,
    image: game.header_image ?? null,
    price: game.is_free ? 0 : parseFloat(((game.price_overview?.final ?? 0) / 100).toFixed(2)),
    start_up: null,
    genres: game.genres ? game.genres.map(g => g.description).join(', ') : null
  // Ejemplo resultado: "Acción, Aventura, RPG"
  };

    const { error } = await supabase
      .from('games')
      .upsert(gameData, { onConflict: 'id_game' });

    if (error) {
      console.error(`❌ Error insertando ${game.name}:`, error.message);
      errores++;
    } else {
      console.log(`✅ ${game.name}`);
      insertados++;
    }

    await sleep(300);
  }

  console.log(`\n🏁 Sincronización completa: ${insertados} insertados, ${errores} errores`);
}