import supabase from "../../configuration/client.mjs"
import { createClient } from '@supabase/supabase-js'
import jwt from 'jsonwebtoken'

// Middleware único de autenticación
// - requireAuth = true  (default): corta con 401 si no hay token válido   → rutas protegidas
// - requireAuth = false           : deja pasar siempre, token opcional     → carrito (guests + usuarios)

export function checkSession(requireAuth = true) {
  return async (req, res, next) => {
    try {
      const authHeader = req.headers.authorization
      if (authHeader?.startsWith('Bearer ')) {
        const token = authHeader.substring(7)

        // Decodifica el JWT sin verificar firma (Supabase ya lo validó)
        const decoded = jwt.decode(token)

        if (decoded && decoded.exp > Math.floor(Date.now() / 1000)) {
          // Token no expirado, buscamos el usuario en la BD
          const { data: userData } = await supabase
            .schema('private')
            .from('users')
            .select('name')
            .eq('id_user', decoded.sub)
            .maybeSingle()

          req.user = {
            sub: decoded.sub,
            email: decoded.email,
            user_name: userData?.name || null
          }
          req.cartUserId = decoded.sub
          return next()
        }
      }

      if (requireAuth) return res.status(401).json({ authenticated: false, message: "No autorizado" })

      const ip = req.ip || req.socket?.remoteAddress || 'unknown'
      const ua = (req.headers['user-agent'] || 'unknown').slice(0, 60)
      req.cartUserId = `guest_${ip}_${ua}`.replace(/[\s/\\'\"]/g, '_').slice(0, 120)
      next()

    } catch (err) {
      console.error("Error en middleware de sesión:", err.message)
      if (requireAuth) return res.status(401).json({ authenticated: false, message: "Error de autenticación" })
      req.cartUserId = 'guest_fallback'
      next()
    }
  }
}


export default { checkSession }
