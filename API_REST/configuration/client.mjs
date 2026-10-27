import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import { createClient } from '@supabase/supabase-js'

// Calcula la ruta absoluta al .env que está en la misma carpeta que client.mjs
const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '.env') })
/*
IMPLEMENTAMOS EL CLIENTE PARA SUPABASE
HEMOS USADO npm install @supabase/supabase-js
en el .env se ha incluido el protocolo HTTPS ya que se comunica a través de este con supabase
 */
const supabase = createClient(
  process.env.DB_HOST,
  process.env.DB_SERVICE_RK,
  {
    db:{
      schema: 'private'
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  }
)

export default supabase;