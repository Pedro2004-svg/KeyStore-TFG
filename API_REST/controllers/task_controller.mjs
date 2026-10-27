import task_repository from "../repositories/task_repository.mjs";
import { invalidateCache } from '../app.mjs';

// Carrito temporal en memoria: Map<userId, Array<{gameName, price}>>
// Se pierde al reiniciar el servidor; si necesitas persistencia usa Redis o la BD.
const cartStore = new Map();

function getCart(userId) {
    if (!cartStore.has(userId)) cartStore.set(userId, []);
    return cartStore.get(userId);
}

export default class task_controllers {
    static async paginaPrincipal(req, res) {
        try {
            return res.status(200).json({ message: "Pagina Principal" });
        } catch (error) {
            console.error(error);
            return res.status(500).json({ error: "Error en la API" });
        }
    }

    // ── AUTH ──────────────────────────────────────────────────────────────────

    // Registro: crea usuario en Supabase Auth + tabla propia
    static async createUser(req, res) {
        const { user_name, email, password } = req.body;
        if (!user_name || !email || !password) {
            return res.status(400).json({ message: "Datos incompletos" });
        }
        try {
            const userId = await task_repository.createUser(user_name, email, password);
            return res.status(201).json({ success: true, userId });
        } catch (error) {
            console.error("ERROR createUser controller:", error);
            if (error?.code === "23505" || error?.message?.includes("already")) {
                return res.status(400).json({ message: "Usuario ya existe" });
            }
            return res.status(500).json({ message: "Error al crear el usuario" });
        }
    }

    // Login: devuelve access_token de Supabase Auth al cliente
    static async startSession(req, res) {
    const { user_name, password } = req.body;
    if (!user_name || !password) {
        return res.status(400).json({ message: "Datos incompletos" });
    }
    try {
        const result = await task_repository.startSession(user_name, password);
        if (!result) {
            return res.status(400).json({ message: "Usuario o contraseña incorrecta" });
        }

        // ── Fusiona carrito guest con carrito del usuario al hacer login ──
        const guestId = req.cartUserId;
        const userId  = result.userId;

        if (guestId?.startsWith('guest_') && cartStore.has(guestId)) {
            const guestCart = cartStore.get(guestId) || [];
            const userCart  = getCart(userId);
            cartStore.set(userId, [...userCart, ...guestCart]);
            cartStore.delete(guestId);
            console.log(`[CARRITO] Fusionados ${guestCart.length} items del guest al usuario ${userId}`);
        }
        // ─────────────────────────────────────────────────────────────────

        return res.status(200).json({ success: true, ...result });
    } catch (error) {
        console.error("Error login:", error.message);
        return res.status(500).json({ error: "Error interno al iniciar sesión" });
    }
}

    // Logout: revoca el token en Supabase Auth (opcional) y confirma al cliente
    static async closeSession(req, res) {
        try {
            await task_repository.closeSession(req.user?.sub);
            return res.status(200).json({ success: true, message: "Sesión cerrada correctamente" });
        } catch (error) {
            console.error("Error al cerrar sesión:", error);
            return res.status(500).json({ success: false, message: "Error al cerrar sesión" });
        }
    }

    // Devuelve datos del usuario autenticado (req.user viene del middleware checkSession)
    static getSession(req, res) {
        const userId = req.user?.sub;
        const cart = userId ? getCart(userId) : [];
        return res.status(200).json({
            authenticated: true,
            user: { user_name: req.user.user_name, email: req.user.email },
            cartCount: cart.length
        });
    }

    // ── CATÁLOGO ──────────────────────────────────────────────────────────────

    static async showCatalog(req, res) {
        try {
            const juegos = await task_repository.showCatalog();
            return res.status(200).json({ juegos });
        } catch (error) {
            console.error("Error al obtener catálogo:", error.message);
            return res.status(500).json({ message: "Error interno del servidor" });
        }
    }

    static async searchGames(req, res) {
        try {
            const { q, minPrice, maxPrice, sortBy } = req.query;
            const games = await task_repository.searchGames(
                q,
                minPrice ? parseFloat(minPrice) : null,
                maxPrice ? parseFloat(maxPrice) : null,
                sortBy
            );
            return res.status(200).json({
                success: true,
                results: games,
                count: games.length,
                filters: { searchTerm: q || null, minPrice: minPrice || null, maxPrice: maxPrice || null, sortBy: sortBy || 'name' }
            });
        } catch (error) {
            console.error("Error en búsqueda avanzada:", error);
            return res.status(500).json({ success: false, message: "Error en la búsqueda" });
        }
    }

    static async getMostSoldGames(req, res) {
        try {
            const { limit } = req.query;
            const games = await task_repository.getMostSoldGames(limit || 10);
            return res.status(200).json({ success: true, data: games, count: games.length });
        } catch (error) {
            console.error("Error al obtener juegos más vendidos:", error);
            return res.status(500).json({ success: false, message: "Error al obtener estadísticas" });
        }
    }

    static async getMostFavoritedGames(req, res) {
        try {
            const { limit } = req.query;
            const games = await task_repository.getMostFavoritedGames(limit || 10);
            return res.status(200).json({ success: true, data: games, count: games.length });
        } catch (error) {
            console.error("Error al obtener juegos favoritos:", error);
            return res.status(500).json({ success: false, message: "Error al obtener estadísticas" });
        }
    }

    // ── FAVORITOS ─────────────────────────────────────────────────────────────

    static async addFavourites(req, res) {
        const userEmail = req.user?.email;
        const { gameName, price } = req.body;
        if (!userEmail || !gameName || price === undefined) {
            return res.status(400).json({ message: "No se ha seleccionado ningún juego o falta sesión" });
        }
        try {
            const favourite = await task_repository.addFavourites(userEmail, gameName, price);
            if (favourite?.duplicate) {
                return res.status(400).json({ success: false, message: favourite.message });
            }
            invalidateCache('/favoritos');
            invalidateCache('most-favorited');
            return res.status(200).json({ success: true, favourite });
        } catch (error) {
            console.error("Error insertando favorito:", error);
            return res.status(500).json({ success: false });
        }
    }

    static async showFavourites(req, res) {
        const userEmail = req.user?.email;
        const userId = req.user?.sub;
        if (!userEmail && !userId) {
            return res.status(401).json({ message: "No hay sesión activa" });
        }
        try {
            const favourites = await task_repository.showFavourites(userEmail, userId);
            invalidateCache('most-favorited');
            return res.status(200).json(favourites);
        } catch (err) {
            console.error("ERROR showFavourites controller:", err);
            return res.status(500).json({ error: "Error cargando favoritos" });
        }
    }

    // ── CARRITO TEMPORAL (en memoria, keyed por userId del JWT) ───────────────

    static async addToCartTemp(req, res) {
        const userId = req.cartUserId; // set by middleware (auth optional)
        const { gameName, price } = req.body;
        if (!gameName || price === undefined) {
            return res.status(400).json({ message: "Datos incompletos" });
        }
        try {
            const cart = getCart(userId);
            cart.push({ gameName, price });
            return res.status(200).json({
                success: true,
                message: "Juego añadido al carrito",
                cartCount: cart.length
            });
        } catch (error) {
            console.error("Error al añadir al carrito temporal:", error);
            return res.status(500).json({ success: false, message: "Error al añadir al carrito" });
        }
    }

    static async showCartTemp(req, res) {
        const userId = req.cartUserId;
        try {
            const cartTemp = getCart(userId);
            const uniqueNames = [...new Set(cartTemp.map(item => item.gameName))];
            const gamesDetails = await task_repository.getGamesByNames(uniqueNames);
            const carrito = cartTemp.map(cartItem => {
                const game = gamesDetails.find(g => g.name_game === cartItem.gameName);
                return { ...game, price: cartItem.price };
            });
            return res.status(200).json({ carrito });
        } catch (err) {
            console.error("ERROR showCartTemp controller:", err);
            return res.status(500).json({ error: "Error cargando carrito" });
        }
    }

    static async removeFromCartTemp(req, res) {
        const userId = req.cartUserId;
        const { gameName } = req.body;
        try {
            const cart = getCart(userId);
            const updated = cart.filter(item => item.gameName !== gameName);
            cartStore.set(userId, updated);
            return res.status(200).json({ success: true, message: "Juego eliminado del carrito", cartCount: updated.length });
        } catch (error) {
            console.error("Error al eliminar del carrito:", error);
            return res.status(500).json({ success: false, message: "Error al eliminar del carrito" });
        }
    }

    static async removeOneFromCartTemp(req, res) {
        const userId = req.cartUserId;
        const { gameName } = req.body;
        try {
            const cart = getCart(userId);
            const index = cart.findIndex(item => item.gameName === gameName);
            if (index === -1) {
                return res.status(400).json({ success: false, message: "Este juego no existe en el carrito" });
            }
            cart.splice(index, 1);
            return res.status(200).json({ success: true, message: "Un juego eliminado del carrito", cartCount: cart.length });
        } catch (error) {
            console.error("Error al eliminar del carrito:", error);
            return res.status(500).json({ success: false, message: "Error al eliminar del carrito" });
        }
    }

    static async removeCartTemp(req, res) {
        const userId = req.cartUserId;
        try {
            cartStore.set(userId, []);
            return res.status(200).json({ success: true, message: "Carrito eliminado", cartCount: 0 });
        } catch (error) {
            console.error("Error al eliminar carrito:", error);
            return res.status(500).json({ success: false, message: "Error al eliminar el carrito" });
        }
    }

    // ── FINALIZAR COMPRA ──────────────────────────────────────────────────────

    static async finalizePurchase(req, res) {
        const userEmail = req.user?.email;
        const userId = req.user?.sub;
        if (!userEmail) {
            return res.status(401).json({ message: "No hay sesión activa" });
        }
        const cartTemp = getCart(userId);
        if (cartTemp.length === 0) {
            return res.status(400).json({ success: false, message: "El carrito está vacío" });
        }
        try {
            for (const item of cartTemp) {
                await task_repository.addPriceCart(userEmail, item.gameName, 0, false);
            }
            cartStore.set(userId, []);
            return res.status(200).json({ success: true, message: "Compra realizada con éxito" });
        } catch (error) {
            console.error("Error al finalizar compra:", error);
            return res.status(500).json({ success: false, message: "Error al procesar la compra" });
        }
    }

    // ── PERFIL ────────────────────────────────────────────────────────────────

    static async changeEmail(req, res) {
        const userEmail = req.user?.email;
        const { newEmail } = req.body;
        if (!userEmail || !newEmail) return res.status(400).json({ message: "Datos incompletos" });
        try {
            const result = await task_repository.changeEmail(userEmail, newEmail);
            return res.status(result.success ? 200 : 400).json(result);
        } catch (err) {
            return res.status(500).json({ message: err.message });
        }
    }
    static async changePassword(req, res) {
        console.log('[FAVORITOS] userId:', req.user?.sub);
        console.log('[FAVORITOS] token:', req.headers.authorization?.substring(0, 50));
        const userEmail = req.user?.email;
        const { oldPassword, newPassword } = req.body;
        if (!userEmail) {
            return res.status(401).json({ message: "No hay sesión activa" });
        }
        if (!oldPassword || !newPassword) {
            return res.status(400).json({ message: "Datos incompletos" });
        }
        try {
            const result = await task_repository.changePassword(userEmail, oldPassword, newPassword);
            if (result.success) {
                invalidateCache('/favoritos');
                invalidateCache('most-favorited');
            }
            return res.status(result.success ? 200 : 400).json(result);
        } catch (error) {
            console.error("Error al cambiar contraseña:", error);
            return res.status(500).json({ message: "Error al cambiar contraseña" });
        }
    }

    static async deleteUser(req, res) {
        const userEmail = req.user?.email;
        const userId = req.user?.sub;
        const { password } = req.body;
        if (!userEmail) {
            return res.status(401).json({ message: "No hay sesión activa" });
        }
        if (!password) {
            return res.status(400).json({ message: "Se requiere la contraseña" });
        }
        try {
            const result = await task_repository.deleteUser(userEmail, userId, password);
            if (result.success) {
                cartStore.delete(userId);
                return res.status(200).json(result);
            } else {
                return res.status(400).json(result);
            }
        } catch (error) {
            console.error("Error al borrar usuario:", error);
            return res.status(500).json({ message: "Error al borrar usuario" });
        }
    }

    // ── CARRITO BD (historial de compras) ─────────────────────────────────────

    static async showCart(req, res) {
        const userEmail = req.user?.email;
        if (!userEmail) {
            return res.status(401).json({ message: "No hay sesión activa" });
        }
        try {
            const carrito = await task_repository.showCart(userEmail);
            return res.status(200).json({ carrito });
        } catch (err) {
            console.error("ERROR showCart controller:", err);
            return res.status(500).json({ error: "Error cargando carrito" });
        }
    }

    static async deleteFromCart(req, res) {
        const userEmail = req.user?.email;
        const { gameId } = req.body;
        if (!userEmail) return res.status(401).json({ message: "No hay sesión activa" });
        if (!gameId) return res.status(400).json({ message: "Se requiere el ID del juego" });
        try {
            const result = await task_repository.deleteFromCart(gameId, userEmail);
            return res.status(result.success ? 200 : 400).json(result);
        } catch (error) {
            console.error("Error al borrar juego del carrito:", error);
            return res.status(500).json({ message: "Error al borrar juego del carrito" });
        }
    }

    static async deleteCart(req, res) {
        const userEmail = req.user?.email;
        if (!userEmail) return res.status(401).json({ message: "No hay sesión activa" });
        try {
            const result = await task_repository.deleteCart(userEmail);
            return res.status(result.success ? 200 : 400).json(result);
        } catch (error) {
            console.error("Error al borrar los juegos del carrito:", error);
            return res.status(500).json({ message: "Error al borrar juegos del carrito" });
        }
    }

    static async deleteOneFromCart(req, res) {
        const userEmail = req.user?.email;
        const { gameId } = req.body;
        if (!userEmail) return res.status(401).json({ message: "No hay sesión activa" });
        if (!gameId) return res.status(400).json({ message: "Se requiere el ID del juego" });
        try {
            const result = await task_repository.deleteOneFromCart(gameId, userEmail);
            return res.status(result.success ? 200 : 400).json(result);
        } catch (error) {
            console.error("Error al borrar juego del carrito:", error);
            return res.status(500).json({ message: "Error al borrar juego del carrito" });
        }
    }

    static async getGamesByCategory(req, res) {
        try {
            const categories = await task_repository.getGamesByCategory();
            res.json(categories);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }

    // PASARELAS DE PAGO
    static async createCheckoutSession(req, res) {
    const userId = req.user?.sub;
    const userEmail = req.user?.email;
    if (!userId) return res.status(401).json({ message: "No hay sesión activa" });
    
    
    const cartTemp = getCart(userId);
    if (cartTemp.length === 0) return res.status(400).json({ message: "El carrito está vacío" });

    const baseUrl = req.body.baseUrl?.replace(/\/+$/, '');
    const platform = req.body.platform || 'web';

    try {
        const { default: Stripe } = await import('stripe');
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

        // Agrupa items del carrito
        const grouped = Object.values(
            cartTemp.reduce((acc, item) => {
                if (acc[item.gameName]) acc[item.gameName].quantity++;
                else acc[item.gameName] = { ...item, quantity: 1 };
                return acc;
            }, {})
        );

        const line_items = grouped.map(item => ({
            price_data: {
                currency: 'eur',
                product_data: { name: item.gameName },
                unit_amount: Math.round(item.price * 100), // en céntimos
            },
            quantity: item.quantity,
        }));

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items,
            mode: 'payment',
            customer_email: userEmail,
            success_url: platform === 'mobile' ? `${baseUrl}/pago-completado?session_id={CHECKOUT_SESSION_ID}&platform=mobile` : `http://localhost:60001/compra-exitosa?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: platform === 'mobile' ? `intent://carrito#Intent;scheme=miapp;package=com.example.store;end` : `http://localhost:60001/carrito`,
            metadata: { userId, cartJson: JSON.stringify(cartTemp) }
        });

        return res.json({ url: session.url });
    } catch (err) {
        console.error("Error creando sesión Stripe:", err.message);
        return res.status(500).json({ message: "Error al iniciar el pago" });
    }
}

static async compraExitosa(req, res) {
    const { session_id } = req.query;
    const userId = req.user?.sub;

    if (!session_id || !userId) {
        return res.status(400).json({ message: "Datos incompletos" });
    }

    try {
        const { default: Stripe } = await import('stripe');
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
        const session = await stripe.checkout.sessions.retrieve(session_id);

        if (session.payment_status !== 'paid') {
            return res.status(400).json({ message: "El pago no se completó" });
        }

        const cartTemp = JSON.parse(session.metadata.cartJson || '[]');
        const purchases = [];

        for (const item of cartTemp) {
            // Busca el juego en la BD
            const games = await task_repository.getGamesByNames([item.gameName]);
            const game = games[0];
            if (!game) continue;
            // Obtiene una key disponible
            const keyData = await task_repository.getAvailableKey(game.id_game);
            const code = keyData?.game_key || 'NO-KEY-AVAILABLE';

            // Guarda la compra
            await task_repository.savePurchase(userId, game.id_game, item.price, code);

            // Elimina la key usada
            if (keyData?.game_key) await task_repository.deleteUsedKey(keyData.game_key);

            purchases.push({ gameName: item.gameName, code });
        }

        // Vacía el carrito
        cartStore.set(userId, []);

        return res.status(200).json({ success: true, purchases });
    } catch (err) {
        console.error("Error en compra exitosa:", err.message);
        return res.status(500).json({ message: "Error al procesar la compra" });
    }
}

    static async stripeWebhook(req, res) {
        try {
            const { default: Stripe } = await import('stripe');
            const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
            const sig = req.headers['stripe-signature'];
            const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

            let event;
            try {
                event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
            } catch (err) {
                console.error('Webhook signature error:', err.message);
                return res.status(400).json({ message: `Webhook Error: ${err.message}` });
            }

            if (event.type === 'checkout.session.completed') {
                const session = event.data.object;
                if (session.payment_status !== 'paid') return res.json({ received: true });

                const userId = session.metadata.userId;
                const cartTemp = JSON.parse(session.metadata.cartJson || '[]');

                for (const item of cartTemp) {
                    const games = await task_repository.getGamesByNames([item.gameName]);
                    const game = games?.[0];
                    if (!game) continue;

                    const keyData = await task_repository.getAvailableKey(game.id_game);
                    const code = keyData?.game_key || 'NO-KEY-AVAILABLE';
                    await task_repository.savePurchase(userId, game.id_game, item.price, code);
                    if (keyData?.game_key) await task_repository.deleteUsedKey(keyData.game_key);
                }

                cartStore.set(userId, []);
                console.log(`✅ Webhook: compra procesada para usuario ${userId}`);
            }

            return res.json({ received: true });
        } catch (err) {
            console.error('Error en webhook:', err.message);
            return res.status(500).json({ message: 'Error procesando webhook' });
        }
    }

    // ── Ruta de prueba para móvil (redirección post-pago) ───────────────────────────
    static async pagoCompletado(req, res) {
    const sessionId = req.query.session_id || '';
    const platform = req.query.platform || 'web';

    if (platform === 'mobile') {
        try {
            const { default: Stripe } = await import('stripe');
            const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
            const session = await stripe.checkout.sessions.retrieve(sessionId);

            if (session.payment_status === 'paid') {
                const userId = session.metadata.userId;
                const cartTemp = JSON.parse(session.metadata.cartJson || '[]');

                for (const item of cartTemp) {
                    const games = await task_repository.getGamesByNames([item.gameName]);
                    const game = games[0];
                    if (!game) continue;
                    console.log("El game encontrado desde movil es:", game.id_game)
                    const keyData = await task_repository.getAvailableKey(game.id_game);
                    const code = keyData?.game_key || 'NO-KEY-AVAILABLE';
                    await task_repository.savePurchase(userId, game.id_game, item.price, code);
                    console.log(`Eliminando key usada desde movil: ${keyData?.game_key || 'no key'}`);
                    if (keyData?.game_key) await task_repository.deleteUsedKey(keyData.game_key);
                }

                cartStore.set(userId, []); // 👈 Ahora sí tiene acceso a cartStore
                console.log(`✅ Compra procesada para usuario ${userId}`);
            }
        } catch (err) {
            console.error('Error procesando compra:', err);
        }

        const intentUrl = `intent://compra-exitosa?session_id=${sessionId}#Intent;scheme=miapp;package=com.example.store;end`;
        res.send(`
            <!DOCTYPE html>
            <html>
            <head><meta charset="UTF-8"></head>
            <body>
                <p>Volviendo a la aplicación...</p>
                <a href="${intentUrl}">Pulsa aquí si no se abre la app</a>
                <script>window.location.href = '${intentUrl}';</script>
            </body>
            </html>
        `);
    } else {
        res.redirect(`http://localhost:60001/compra-exitosa?session_id=${sessionId}`);
    }
}

}