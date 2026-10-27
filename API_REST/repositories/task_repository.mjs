import bcrypt from 'bcrypt';
import supabase from "../configuration/client.mjs"
import {User, Favourites, Games} from "../models/task_models.mjs"
import { invalidateCache } from '../app.mjs';
import { Resend } from 'resend';

// ── JUEGOS ────────────────────────────────────────────────────────────────────

async function addGame(name_game, price, image) {
  try {
    const { data: existing, error } = await supabase
      .schema('private')
      .from('games')
      .select('id_game')
      .eq('name_game', name_game)
      .maybeSingle();

    if (error) throw error;

    if (!existing) {
      await supabase
        .schema('private')
        .from('games')
        .insert({ name_game, price, image })
        .throwOnError();
      console.log(`Juego insertado: ${name_game}`);
    } else {
      console.log(`Juego ya existe: ${name_game}`);
    }
  } catch (insertError) {
    console.error("Error al insertar juego:", insertError.message);
  }
}

async function showCatalog() {
  try {
    const { data, error } = await supabase
      .schema('private')
      .from('games')
      .select('*')
    if (error) throw error;
    return data.map(row => new Games(row));
  } catch (err) {
    console.error("ERROR AL VER LOS JUEGOS", err.message);
    return [];
  }
}

async function getGamesByNames(gameNames) {
  if (!gameNames || gameNames.length === 0) return [];
  try {
    const { data, error } = await supabase
      .schema('private')
      .from('games')
      .select('id_game, name_game, price, image')
      .in('name_game', gameNames)
    if (error) throw error;
    return data;
  } catch (err) {
    console.error("Error al obtener juegos por nombres:", err.message);
    throw err;
  }
}

async function searchGames(searchTerm, minPrice, maxPrice, sortBy = 'name') {
  try {
    let query = supabase
      .schema('private')
      .from('games')
      .select('*', { count: 'exact' })

    if (searchTerm) query = query.ilike('name_game', `%${searchTerm}%`);
    if (minPrice !== undefined && minPrice !== null) query = query.gte('price', minPrice);
    if (maxPrice !== undefined && maxPrice !== null) query = query.lte('price', maxPrice);

    const { data, error } = await query;
    if (error) throw error;
    return data.sort((a, b) => {
      switch (sortBy) {
        case 'price_asc': return a.price - b.price;
        case 'price_desc': return b.price - a.price;
        default: return a.name_game.localeCompare(b.name_game);
      }
    }).slice(0, 50);
  } catch (err) {
    console.error("Error en búsqueda avanzada:", err.message);
    throw err;
  }
}

async function getMostSoldGames(limit = 10) {
  try {
    const { data, error } = await supabase
      .schema('private')
      .from('games')
      .select('id, name_game, price, image, sold_out ( id, price )')
    if (error) throw error;

    return data
      .map(game => {
        const ventas = game.sold_out || [];
        return {
          ...game,
          total_ventas: ventas.length,
          ingresos_totales: ventas.reduce((sum, v) => sum + v.price, 0)
        };
      })
      .filter(g => g.total_ventas > 0)
      .sort((a, b) => b.total_ventas - a.total_ventas)
      .slice(0, limit);
  } catch (err) {
    console.error("Error al obtener juegos más vendidos:", err.message);
    throw err;
  }
}
//CONSULTA A REVISAR 
async function getMostFavoritedGames(limit = 10) {
  try {
    const { data, error } = await supabase
      .schema('private')
      .from('favourites')
      .select('id_game')

    if (error) throw error;
    if (!data || data.length === 0) return [];

    // Agrupa y cuenta
    const counts = {};
    for (const row of data) {
      counts[row.id_game] = (counts[row.id_game] || 0) + 1;
    }

    // Obtiene los ids más favoriteados
    const topIds = Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([id]) => parseInt(id));

    // Busca los datos de los juegos
    const { data: games, error: gamesError } = await supabase
      .schema('private')
      .from('games')
      .select('id_game, name_game, price, image')
      .in('id_game', topIds)

    if (gamesError) throw gamesError;

    return games.map(g => ({
      ...g,
      num_favoritos: counts[g.id_game] || 0
    })).sort((a, b) => b.num_favoritos - a.num_favoritos);

  } catch (err) {
    console.error("Error al obtener juegos favoritos:", err.message);
    throw err;
  }
}

// ── AUTH (Supabase Auth) ──────────────────────────────────────────────────────

/**
 * Registro: crea usuario en Supabase Auth y luego inserta en tabla privada 'users'.
 * Ya NO hasheamos la contraseña manualmente; Supabase Auth lo hace.
 */
async function createUser(user_name, email, password) {
  try {
    // 1. Crea la cuenta en Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,   // confirma el email automáticamente (sin flujo de correo)
      user_metadata: { user_name }
    });
    if (authError) throw authError;

    // 2. Inserta el perfil en la tabla privada (sin contraseña, ya la guarda Auth)
    const { data, error } = await supabase
      .schema('private')
      .from('users')
      .insert([{ name: user_name, email, id_user: authData.user.id }])
      .select('id_user')
      .single();
    if (error) throw error;

    console.log("Usuario creado con ID:", data.id_user);
    return data.id_user;
  } catch (err) {
    console.error("ERROR AL CREAR USUARIO (repository):", err);
    throw err;
  }
}

/**
 * Login: autentica con Supabase Auth y devuelve los tokens JWT.
 * El cliente guardará el access_token en localStorage.
 */
async function startSession(user_name, password) {
    try {
    const { createClient } = await import('@supabase/supabase-js')
    const freshClient = createClient(
      process.env.DB_HOST,
      process.env.DB_SERVICE_RK,
      { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } }
    )

    const { data: userData } = await freshClient
      .schema('private')
      .from('users')
      .select('email, name')
      .eq('name', user_name)
      .maybeSingle()

    console.log('[START_SESSION] userData:', userData)

    if (!userData) return undefined;

    const { data: authData, error: authError } = await freshClient.auth.signInWithPassword({
      email: userData.email,
      password
    });

    if (authError || !authData.session) return undefined;

    return {
      access_token: authData.session.access_token,
      refresh_token: authData.session.refresh_token,
      userId: authData.user.id,
      user: { user_name: userData.name, email: userData.email }
    };
  } catch (err) {
    console.error("ERROR AL INICIAR SESIÓN", err.message);
    return undefined;
  }
}

/**
 * Logout: invalida el token en Supabase Auth.
 */
async function closeSession(authUserId) {
  try {
    if (authUserId) {
      await supabase.auth.admin.signOut(authUserId, 'global');
    }
  } catch (err) {
    console.error("Error cerrando sesión en Auth:", err.message);
  }
}

// ── FAVORITOS ─────────────────────────────────────────────────────────────────

async function showFavourites(userEmail, userId) {
  try {
    let id_user = userId;
    if (!id_user) {
      const { data: userData, error: userError } = await supabase
        .schema('private')
        .from('users')
        .select('id_user')
        .eq('email', userEmail)
        .single();
      console.log('[SHOW_FAV] userData:', userData, 'error:', userError);
      if (userError) {
        if (userError.code === 'PGRST116') return [];
        throw userError;
      }
      id_user = userData.id_user;
    }
    const userData = { id_user };

    const { data: favData, error: favError } = await supabase
      .schema('private')
      .from('favourites')
      .select('id, price, id_game')
      .eq('id_user', id_user);

    if (favError) throw favError;
    if (!favData || favData.length === 0) return [];

    // Obtenemos los detalles de los juegos por separado
    const gameIds = favData.map(f => f.id_game);
    const { data: gamesData, error: gamesError } = await supabase
      .schema('private')
      .from('games')
      .select('id_game, name_game, image')
      .in('id_game', gameIds);

      console.log('[SHOW_FAV] favData:', favData, 'error:', favError);
    if (gamesError) throw gamesError;

    const gamesMap = Object.fromEntries(gamesData.map(g => [g.id_game, g]));

    return favData.map(row => new Favourites({
      name_game: gamesMap[row.id_game]?.name_game ?? 'Desconocido',
      price: row.price,
      image: gamesMap[row.id_game]?.image ?? ''
    }));
  } catch (err) {
    console.error("ERROR AL VER FAVORITOS", err.message);
    throw err;
  }
}

async function addFavourites(userEmail, gameName, price) {
  try {
    const { data: userData, error: userError } = await supabase
      .schema('private')
      .from('users')
      .select('id_user')
      .eq('email', userEmail)
      .single();
    if (userError) throw userError;

    const { data: gameData, error: gameError } = await supabase
      .schema('private')
      .from('games')
      .select('id_game')
      .eq('name_game', gameName)
      .single();
    if (gameError) throw gameError;

    // Comprueba duplicado
    const { data: existing } = await supabase
      .schema('private')
      .from('favourites')
      .select('id')
      .eq('id_user', userData.id_user)
      .eq('id_game', gameData.id_game)
      .maybeSingle();

    if (existing) {
      return { duplicate: true, message: 'Este juego ya está en tus favoritos' };
    }

    const { data, error } = await supabase
      .schema('private')
      .from('favourites')
      .insert([{ id_user: userData.id_user, id_game: gameData.id_game, price }])
      .select('id');
    if (error) throw error;

    return data;
  } catch (err) {
    console.error("ERROR AL INSERTAR EN FAVORITOS", err.message);
    throw err;
  }
}

// ── CARRITO / COMPRAS (BD) ────────────────────────────────────────────────────

async function showCart(userEmail) {
  try {
    const { data: userData, error: userError } = await supabase
      .schema('private')
      .from('users')
      .select('id_user')
      .eq('email', userEmail)
      .single();
    if (userError) throw userError;

    const { data, error } = await supabase
      .schema('private')
      .from('sold_out')
      .select(`id, price, offer, games ( name_game, image )`)
      .eq('user_id', userData.id_user)
      .order('id', { ascending: false });
    if (error) throw error;

    return data.map(row => ({
      id: row.id,
      price: row.price,
      offer: row.offer,
      name_game: row.games.name_game,
      image: row.games.image
    }));
  } catch (err) {
    console.error("ERROR AL VER CARRITO", err.message);
    throw err;
  }
}

async function addPriceCart(userEmail, gameName, price, activate = false) {
  try {
    const { data: userData, error: userError } = await supabase
      .schema('private')
      .from('users')
      .select('id_user')
      .eq('email', userEmail)
      .single();
    if (userError) throw userError;

    const { data: gameData, error: gameError } = await supabase
      .schema('private')
      .from('games')
      .select('id_game')
      .eq('name_game', gameName)
      .single();
    if (gameError) throw gameError;

    const { data, error } = await supabase
      .schema('private')
      .from('sold_out')
      .insert([{ user_id: userData.id_user, id_game: gameData.id_game, total: price }])
      .select('id');
    if (error) throw error;

    return data;
  } catch (err) {
    console.error("ERROR AL INSERTAR EN CARRITO", err.message);
    throw err;
  }
}

async function deleteFromCart(gameId, userEmail) {
  try {
    const { data: userData, error: userError } = await supabase
      .schema('private')
      .from('users')
      .select('id_user')
      .eq('email', userEmail)
      .single();
    if (userError || !userData) return { success: false, message: "Usuario no encontrado" };

    const { error: deleteError, count } = await supabase
      .schema('private')
      .from('sold_out')
      .delete({ count: 'exact' })
      .eq('user_id', userData.id_user)
      .eq('id', gameId);
    if (deleteError) throw deleteError;
    if (count === 0) return { success: false, message: "El juego no estaba en el carrito" };

    return { success: true, message: "Juego eliminado del carrito" };
  } catch (err) {
    console.error("ERROR AL BORRAR EL JUEGO DEL CARRITO:", err.message);
    return { success: false, message: "Error al eliminar el juego" };
  }
}

async function deleteCart(userEmail) {
  try {
    const { data: userData, error: userError } = await supabase
      .schema('private')
      .from('users')
      .select('id_user')
      .eq('email', userEmail)
      .single();
    if (userError || !userData) return { success: false, message: "Usuario no encontrado" };

    const { error, count } = await supabase
      .schema('private')
      .from('sold_out')
      .delete({ count: 'exact' })
      .eq('user_id', userData.id_user);
    if (error) throw error;

    return count > 0
      ? { success: true, message: "Todos los juegos eliminados del carrito" }
      : { success: false, message: "El carrito ya estaba vacío" };
  } catch (err) {
    console.error("ERROR AL BORRAR TODOS LOS JUEGOS DEL CARRITO:", err.message);
    return { success: false, message: "Error al eliminar todos los juegos" };
  }
}

async function deleteOneFromCart(gameId, userEmail) {
  try {
    const { data: userData, error: userError } = await supabase
      .schema('private')
      .from('users')
      .select('id_user')
      .eq('email', userEmail)
      .single();
    if (userError || !userData) return { success: false, message: "Usuario no encontrado" };

    const { error, count } = await supabase
      .schema('private')
      .from('sold_out')
      .delete({ count: 'exact' })
      .eq('user_id', userData.id_user)
      .eq('id', gameId);
    if (error) throw error;
    if (count === 0) return { success: false, message: "El juego no estaba en el carrito" };

    return { success: true, message: "Juego eliminado del carrito" };
  } catch (err) {
    console.error("ERROR AL BORRAR EL JUEGO DEL CARRITO:", err.message);
    return { success: false, message: "Error al eliminar el juego" };
  }
}

// ── PERFIL ────────────────────────────────────────────────────────────────────

/**
 * Cambia contraseña: verifica la actual contra bcrypt (tabla privada),
 * luego actualiza en Supabase Auth.
 */
async function changeEmail(userEmail, newEmail) {
  try {
    const { data: userData, error: userError } = await supabase
      .schema('private')
      .from('users')
      .select('id_user')
      .eq('email', userEmail)
      .single();
    if (userError) throw userError;

    // Actualiza el email en Supabase Auth
    const { error } = await supabase.auth.admin.updateUserById(userData.id_user, {
      email: newEmail,
      email_confirm: true
    });
    if (error) throw error;
    const { error: updateError } = await supabase
      .schema('private')
      .from('users')
      .update({ email: newEmail })
      .eq('id_user', userData.id_user);
    if (updateError) throw updateError;

    // Envía email de notificación con Resend
    try{
    const { Resend } = await import('resend');
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: 'onboarding@resend.dev',
      to: userEmail,
      subject: 'Confirmación de cambio de email - TFG App',
      html: `<p>Has solicitado cambiar tu email a <strong>${newEmail}</strong>. Si no has sido tú, contacta con soporte.</p>`
    });
  }catch(emailErr){
    console.warn('Email no enviado:', emailErr.message);
  }

    return { success: true, message: 'Email actualizado. Se ha enviado una notificación a ' + userEmail };
  } catch (err) {
    console.error('ERROR AL CAMBIAR EMAIL:', err.message);
    return { success: false, message: err.message };
  }
}
async function changePassword(userEmail, oldPassword, newPassword) {
  try {
    // 1. Verifica contraseña actual
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: userEmail,
      password: oldPassword
    });
    if (signInError || !signInData?.session) {
      return { success: false, message: "Contraseña actual incorrecta" };
    }

    // 2. Crea cliente temporal con el token del usuario
    const { createClient } = await import('@supabase/supabase-js');
    const userClient = createClient(
      process.env.DB_HOST,
      process.env.DB_SERVICE_RK,
      { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } }
    );

    // 3. Establece la sesión del usuario
    await userClient.auth.setSession({
      access_token: signInData.session.access_token,
      refresh_token: signInData.session.refresh_token
    });

    // 4. Actualiza la contraseña
    const { error: updateError } = await userClient.auth.updateUser({
      password: newPassword
    });
    if (updateError) throw updateError;

    // 5. Envía email de notificación con Resend
    try{
    const { Resend } = await import('resend');
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: 'onboarding@resend.dev',
      to: userEmail,
      subject: 'Contraseña cambiada - TFG App',
      html: `<p>Tu contraseña ha sido cambiada correctamente. Si no has sido tú, contacta con soporte inmediatamente.</p>`
    });
  }catch(emailErr){
    console.warn('Email no enviado', emailErr.message);
  }
// Al final de changePassword, tras actualizar la contraseña
const { data: newSession } = await supabase.auth.signInWithPassword({
    email: userEmail,
    password: newPassword
});
    return { 
      success: true, 
      message: "Contraseña cambiada correctamente. Se ha enviado un email de confirmación.",
      access_token: signInData.session.access_token,
      refresh_token: signInData.session.refresh_token
    };
  } catch (err) {
    console.error("ERROR AL CAMBIAR CONTRASEÑA", err.message);
    return { success: false, message: "Error al cambiar contraseña" };
  }
}

/**
 * Borra usuario: verifica contraseña, elimina de Supabase Auth y tablas privadas.
 */
async function deleteUser(userEmail, userId, password) {
  try {
    // 1. Obtiene email actual desde Auth usando userId (no cambia aunque se cambie email)
    const { data: authUser, error: authUserError } = await supabase.auth.admin.getUserById(userId);
    if (authUserError || !authUser?.user) return { success: false, message: "Usuario no encontrado" };
    const currentEmail = authUser.user.email;

    // 2. Verifica contraseña con el email actual de Auth
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: currentEmail,
      password
    });
    if (signInError) {
      return { success: false, message: "Contraseña incorrecta" };
    }

    // 3. Obtiene id_user de la tabla users
    const { data: userData, error: userError } = await supabase
      .schema('private')
      .from('users')
      .select('id_user')
      .eq('id_user', userId)
      .single();
    if (userError || !userData) return { success: false, message: "Usuario no encontrado" };

    console.log('[DELETE_USER] currentEmail:', currentEmail, 'userId:', userId);
    // 3. Elimina datos relacionados
    const { error: favError } = await supabase.schema('private').from('favourites')
  .delete()
  .eq('id_user', userData.id_user);
if (favError) console.error('ERROR BORRANDO FAVOURITES:', favError);
    await supabase.schema('private').from('purchased')
      .update({ id_user: null })
      .eq('id_user', userData.id_user);
    await supabase.schema('private').from('users').delete().eq('id_user', userData.id_user);

    // 4. Elimina de Supabase Auth
    await supabase.auth.admin.deleteUser(userData.id_user);

    return { success: true, message: "Usuario eliminado correctamente" };
  } catch (err) {
    console.error("ERROR AL BORRAR USUARIO", err.message);
    return { success: false, message: "Error al borrar usuario" };
  }
}
async function getGamesByCategory() {
  try {
    const { data, error } = await supabase
      .schema('private')
      .from('games')
      .select('*');
    if (error) throw error;

    const categories = {
      'Todos':       data,
      'Gratis':      data.filter(g => g.price === 0 || g.price === null),
      'Acción':      data.filter(g => g.genres?.includes('Acción')),
      'Aventura':    data.filter(g => g.genres?.includes('Aventura')),
      'RPG':         data.filter(g => g.genres?.includes('RPG')),
      'Estrategia':  data.filter(g => g.genres?.includes('Estrategia')),
      'Deportes':    data.filter(g => g.genres?.includes('Deportes')),
      'Simulación':  data.filter(g => g.genres?.includes('Simulación')),
      'Indie':       data.filter(g => g.genres?.includes('Indie')),
    };

    return categories;
  } catch (err) {
    console.error("Error al obtener categorías:", err.message);
    return {};
  }
}

// PASARELA DE PAGO
// Obtiene keys disponibles para un juego (máx 5 por juego)
async function getAvailableKey(gameId) {
    try {
        const { data, error } = await supabase
            .schema('private')
            .from('keys')
            .select('game_key')
            .eq('game_id', gameId)
            .limit(1)
            .single();
        console.log('[GET_AVAILABLE_KEY] data:', data, 'error:', error);
        if (error) throw error;
        return data;
    } catch (err) {
        console.error("ERROR AL OBTENER KEY:", err.message);
        return null;
    }
}

// Elimina la key usada tras la compra
async function deleteUsedKey(gameKey) {
    try {
        await supabase
            .schema('private')
            .from('keys')
            .delete()
            .eq('game_key', gameKey);
    } catch (err) {
        console.error("ERROR AL ELIMINAR KEY:", err.message);
    }
}

// Guarda la compra en purchased
async function savePurchase(userId, gameId, total, code) {
  try {
    const { data, error } = await supabase
      .schema('private')
      .from('purchased')
      .insert([{ id_user: userId, id_game: gameId, total, code }])
      .select('id')
      .single();
    if (error) throw error;
    return data;
  } catch (err) {
    console.error("ERROR AL GUARDAR COMPRA:", err.message);
    throw err;
  }
}

// Genera y guarda keys iniciales para un juego (máx 10)
async function seedKeysForGame(gameId, price) {
  try {
    const { count } = await supabase
      .schema('private')
      .from('keys')
      .select('*', { count: 'exact', head: true })
      .eq('game_id', gameId);

    if (count >= 10) return;

    const keysToInsert = Array.from({ length: 10 - count }, () => ({
      game_id: gameId,
      price,
      game_key: crypto.randomUUID()
    }));

    await supabase.schema('private').from('keys').insert(keysToInsert);
    console.log(`✅ Keys generadas para juego ${gameId}`);
  } catch (err) {
    console.error("ERROR AL GENERAR KEYS:", err.message);
  }
}


export default {
    startSession,
    closeSession,
    createUser,
    addFavourites,
    addPriceCart,
    showCart,
    showCatalog,
    showFavourites,
    addGame,
    changeEmail,
    changePassword,
    deleteUser,
    getMostSoldGames,
    searchGames,
    getMostFavoritedGames,
    getGamesByNames,
    deleteFromCart,
    deleteCart,
    deleteOneFromCart,
    getGamesByCategory,
    getAvailableKey,
    deleteUsedKey,
    savePurchase,
    seedKeysForGame,
}
