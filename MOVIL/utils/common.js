const API_URL = 'https://unenacted-genoveva-unhidden.ngrok-free.dev';

// ── Token helpers ─────────────────────────────────────────────────────────────
(function captureSupabaseToken() {
    const hash = window.location.hash;
    if (hash.includes('access_token')) {
        const params = new URLSearchParams(hash.substring(1));
        const token = params.get('access_token');
        const refresh = params.get('refresh_token');
        if (token) {
            localStorage.setItem('access_token', token);
            localStorage.setItem('refresh_token', refresh);
            // Limpia el hash y redirige al perfil
            window.location.href = './perfil.html';
        }
    }
})();

function getToken() {
    return localStorage.getItem('access_token');
}

export function authHeaders() {
    const token = getToken();
    const headers = { 'Content-Type': 'application/json','ngrok-skip-browser-warning': 'true' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return headers;
}
// ── Modal system ──────────────────────────────────────────────────────────────

(function injectModalStyles() {
    if (document.getElementById('gs-modal-styles')) return;
    const style = document.createElement('style');
    style.id = 'gs-modal-styles';
    style.textContent = `
        .gs-modal-backdrop {
            position: fixed;
            inset: 0;
            z-index: 9000;
            background: rgba(10, 10, 20, 0.65);
            backdrop-filter: blur(4px);
            display: flex;
            align-items: center;
            justify-content: center;
            opacity: 0;
            transition: opacity 0.22s ease;
            padding: 20px;
        }
        .gs-modal-backdrop.gs-visible { opacity: 1; }
        .gs-modal {
            position: relative;
            overflow: hidden;
            background: linear-gradient(160deg, #1a1f2e 0%, #12151f 100%);
            border: 1px solid rgba(255,255,255,0.08);
            border-radius: 16px;
            box-shadow: 0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04) inset;
            padding: 36px 32px 28px;
            min-width: 320px;
            max-width: 420px;
            width: 100%;
            color: #f0f2ff;
            transform: translateY(18px) scale(0.97);
            transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
            text-align: center;
        }
        .gs-modal-backdrop.gs-visible .gs-modal { transform: translateY(0) scale(1); }
        .gs-modal-strip {
            height: 3px;
            border-radius: 16px 16px 0 0;
            position: absolute;
            top: 0; left: 0; right: 0;
        }
        .gs-modal-strip.success { background: #4CAF50; }
        .gs-modal-strip.error   { background: #e53e3e; }
        .gs-modal-strip.warning { background: #f6ad00; }
        .gs-modal-strip.info    { background: #2196F3; }
        .gs-modal-icon  { font-size: 42px; margin-bottom: 14px; display: block; line-height: 1; }
        .gs-modal-title { font-size: 19px; font-weight: 700; margin-bottom: 10px; color: #fff; letter-spacing: -0.01em; }
        .gs-modal-message { font-size: 14.5px; color: rgba(240,242,255,0.72); line-height: 1.55; margin-bottom: 26px; }
        .gs-modal-actions { display: flex; gap: 10px; justify-content: center; }
        .gs-modal-btn {
            flex: 1; max-width: 160px; padding: 11px 20px; border-radius: 10px;
            border: none; font-size: 14px; font-weight: 600; cursor: pointer;
            transition: filter 0.15s ease, transform 0.12s ease;
            width: auto; margin: 0;
        }
        .gs-modal-btn:hover { filter: brightness(1.12); transform: translateY(-1px); }
        .gs-modal-btn:active { transform: translateY(0); }
        .gs-modal-btn-primary.success { background: #4CAF50; color: #fff; }
        .gs-modal-btn-primary.error   { background: #e53e3e; color: #fff; }
        .gs-modal-btn-primary.warning { background: #f6ad00; color: #1a1200; }
        .gs-modal-btn-primary.info    { background: #2196F3; color: #fff; }
        .gs-modal-btn-secondary {
            background: rgba(255,255,255,0.07); color: rgba(240,242,255,0.85);
            border: 1px solid rgba(255,255,255,0.1);
        }
        .gs-modal-btn-secondary:hover { background: rgba(255,255,255,0.12); filter: none; }
    `;
    document.head.appendChild(style);
})();

const MODAL_CFG = {
    success: { icon: '✅', title: 'Hecho',       cls: 'success' },
    error:   { icon: '❌', title: 'Error',       cls: 'error'   },
    warning: { icon: '⚠️', title: 'Atención',   cls: 'warning' },
    info:    { icon: 'ℹ️', title: 'Información', cls: 'info'    },
};

export function showModal(message, type = 'info', title = null) {
    return new Promise(resolve => {
        const cfg = MODAL_CFG[type] || MODAL_CFG.info;
        const backdrop = document.createElement('div');
        backdrop.className = 'gs-modal-backdrop';
        backdrop.innerHTML = `
            <div class="gs-modal" role="dialog" aria-modal="true">
                <div class="gs-modal-strip ${cfg.cls}"></div>
                <span class="gs-modal-icon">${cfg.icon}</span>
                <div class="gs-modal-title">${title ?? cfg.title}</div>
                <div class="gs-modal-message">${message}</div>
                <div class="gs-modal-actions">
                    <button class="gs-modal-btn gs-modal-btn-primary ${cfg.cls}">Aceptar</button>
                </div>
            </div>`;
        document.body.appendChild(backdrop);
        requestAnimationFrame(() => backdrop.classList.add('gs-visible'));
        const close = () => {
            backdrop.classList.remove('gs-visible');
            setTimeout(() => { backdrop.remove(); resolve(); }, 220);
        };
        backdrop.querySelector('.gs-modal-btn-primary').addEventListener('click', close);
        backdrop.addEventListener('click', e => { if (e.target === backdrop) close(); });
        const esc = e => { if (e.key === 'Escape') { document.removeEventListener('keydown', esc); close(); } };
        document.addEventListener('keydown', esc);
    });
}

export function showConfirm(message, type = 'warning', title = null) {
    return new Promise(resolve => {
        const cfg = MODAL_CFG[type] || MODAL_CFG.warning;
        const backdrop = document.createElement('div');
        backdrop.className = 'gs-modal-backdrop';
        backdrop.innerHTML = `
            <div class="gs-modal" role="dialog" aria-modal="true">
                <div class="gs-modal-strip ${cfg.cls}"></div>
                <span class="gs-modal-icon">${cfg.icon}</span>
                <div class="gs-modal-title">${title ?? cfg.title}</div>
                <div class="gs-modal-message">${message}</div>
                <div class="gs-modal-actions">
                    <button class="gs-modal-btn gs-modal-btn-secondary" data-r="false">Cancelar</button>
                    <button class="gs-modal-btn gs-modal-btn-primary ${cfg.cls}" data-r="true">Confirmar</button>
                </div>
            </div>`;
        document.body.appendChild(backdrop);
        requestAnimationFrame(() => backdrop.classList.add('gs-visible'));
        const close = result => {
            backdrop.classList.remove('gs-visible');
            setTimeout(() => { backdrop.remove(); resolve(result); }, 220);
        };
        backdrop.querySelectorAll('.gs-modal-btn').forEach(btn =>
            btn.addEventListener('click', () => close(btn.dataset.r === 'true'))
        );
        backdrop.addEventListener('click', e => { if (e.target === backdrop) close(false); });
        const esc = e => { if (e.key === 'Escape') { document.removeEventListener('keydown', esc); close(false); } };
        document.addEventListener('keydown', esc);
    });
}

// ── Navbar ────────────────────────────────────────────────────────────────────
export function actualizarNavbar(user) {
    const userInfo = document.getElementById('userInfo');
    const barMenu = document.getElementById('barMenu');
    const btnVolver = document.getElementById('btn-volver');

    if(!user){
        if((window.location.pathname.startsWith("/views/completes/") && window.location.pathname.endsWith(".html"))){
            sessionStorage.setItem('ult_pag', window.location.pathname);

            barMenu.innerHTML = `
                <li>
                    <a href="/"
                        class="text-white no-underline px-2 md:px-5 flex items-center h-[55px] md:h-[70px] text-xs md:text-base border-b-[3px] border-transparent hover:bg-white/10 hover:border-brand transition-all duration-300">
                        Inicio
                    </a>
                </li>
                <li>
                    <a href="/#catalogo"
                        class="text-white no-underline px-2 md:px-5 flex items-center h-[55px] md:h-[70px] text-xs md:text-base border-b-[3px] border-transparent hover:bg-white/10 hover:border-brand transition-all duration-300">
                        Catálogo
                    </a>
                </li>
                <li>
                    <a href="#" onclick="irAFavoritos(); return false;"
                        class="text-white no-underline px-2 md:px-5 flex items-center h-[55px] md:h-[70px] text-xs md:text-base border-b-[3px] border-transparent hover:bg-white/10 hover:border-brand transition-all duration-300">
                        Favoritos
                    </a>
                </li>
                <li>
                    <a href="./cart.html"
                        class="relative text-white no-underline px-2 md:px-5 flex items-center h-[55px] md:h-[70px] text-xs md:text-base border-b-[3px] border-transparent hover:bg-white/10 hover:border-brand transition-all duration-300">
                        🛒 Carrito
                        <span id="cartBadge"
                            class="hidden absolute top-2 right-1 bg-red-500 text-white rounded-full px-1.5 py-0.5 text-[11px] font-bold z-10 pointer-events-none">0</span>
                    </a>
                </li>
            `;
 
            userInfo.innerHTML = `
                <a href="./login.html" 
                    class="btn-login flex items-center gap-2 text-white no-underline px-3 md:px-5 py-2 rounded bg-brand font-bold hover:bg-brand-dark transition-colors duration-300 text-sm md:text-base">
                    👤 Iniciar Sesion
                </a>
            `;
        }else{
            sessionStorage.setItem('ult_pag', window.location.pathname);

            barMenu.innerHTML = `
                <li>
                    <a href="/"
                        class="text-white no-underline px-2 md:px-5 flex items-center h-[55px] md:h-[70px] text-xs md:text-base border-b-[3px] border-transparent hover:bg-white/10 hover:border-brand transition-all duration-300">
                        Inicio
                    </a>
                </li>
                <li>
                    <a href="/#catalogo"
                        class="text-white no-underline px-2 md:px-5 flex items-center h-[55px] md:h-[70px] text-xs md:text-base border-b-[3px] border-transparent hover:bg-white/10 hover:border-brand transition-all duration-300">
                        Catálogo
                    </a>
                </li>
                <li>
                    <a href="#" onclick="irAFavoritos(); return false;"
                        class="text-white no-underline px-2 md:px-5 flex items-center h-[55px] md:h-[70px] text-xs md:text-base border-b-[3px] border-transparent hover:bg-white/10 hover:border-brand transition-all duration-300">
                        Favoritos
                    </a>
                </li>
                <li>
                    <a href="views/completes/cart.html"
                        class="relative text-white no-underline px-2 md:px-5 flex items-center h-[55px] md:h-[70px] text-xs md:text-base border-b-[3px] border-transparent hover:bg-white/10 hover:border-brand transition-all duration-300">
                        🛒 Carrito
                        <span id="cartBadge"
                            class="hidden absolute top-2 right-1 bg-red-500 text-white rounded-full px-1.5 py-0.5 text-[11px] font-bold z-10 pointer-events-none">0</span>
                    </a>
                </li>`;

            userInfo.innerHTML = `
                <a href="views/completes/login.html"
                    class="btn-login flex items-center gap-1 md:gap-2 text-white no-underline px-2 md:px-5 py-1.5 md:py-2 rounded bg-brand font-bold hover:bg-brand-dark transition-colors duration-300 text-xs md:text-base">
                    👤 Iniciar Sesion
                </a>
            `;
        }
    }else if(user){
        if((window.location.pathname.startsWith("/views/completes/") && window.location.pathname.endsWith(".html"))){
            barMenu.innerHTML = `
                <li>
                    <a href="/"
                        class="text-white no-underline px-2 md:px-5 flex items-center h-[55px] md:h-[70px] text-xs md:text-base border-b-[3px] border-transparent hover:bg-white/10 hover:border-brand transition-all duration-300">
                        Inicio
                    </a>
                </li>
                <li>
                    <a href="/#catalogo"
                        class="text-white no-underline px-2 md:px-5 flex items-center h-[55px] md:h-[70px] text-xs md:text-base border-b-[3px] border-transparent hover:bg-white/10 hover:border-brand transition-all duration-300">
                        Catálogo
                    </a>
                </li>
                <li>
                    <a href="#" onclick="irAFavoritos(); return false;"
                        class="text-white no-underline px-2 md:px-5 flex items-center h-[55px] md:h-[70px] text-xs md:text-base border-b-[3px] border-transparent hover:bg-white/10 hover:border-brand transition-all duration-300">
                        Favoritos
                    </a>
                </li>
                <li>
                    <a href="./cart.html"
                        class="relative text-white no-underline px-2 md:px-5 flex items-center h-[55px] md:h-[70px] text-xs md:text-base border-b-[3px] border-transparent hover:bg-white/10 hover:border-brand transition-all duration-300">
                        🛒 Carrito
                        <span id="cartBadge"
                            class="hidden absolute top-2 right-1 bg-red-500 text-white rounded-full px-1.5 py-0.5 text-[11px] font-bold z-10 pointer-events-none">0</span>
                    </a>
                </li>
            `;

            userInfo.innerHTML = `
                <a href="./userProfile.html" class="text-white no-underline px-2 md:px-5 flex items-center h-[55px] md:h-[70px] text-xs md:text-base border-b-[3px] border-transparent hover:bg-white/10 hover:border-[#4CAF50] transition-all duration-300">
                    Perfil
                </a>
                <span class="text-[#4CAF50] font-bold text-xs md:text-base sm:inline">${user.user_name}</span>
                <a href="#" onclick="cerrarSesion(); return false;" class="text-white no-underline px-2 md:px-5 flex items-center h-[55px] md:h-[70px] text-xs md:text-base border-b-[3px] border-transparent hover:bg-white/10 hover:border-[#4CAF50] transition-all duration-300">
                    Cerrar Sesión
                </a>
            `;
        }else{
            barMenu.innerHTML = `
                <li>
                    <a href="/"
                        class="text-white no-underline px-2 md:px-5 flex items-center h-[55px] md:h-[70px] text-xs md:text-base border-b-[3px] border-transparent hover:bg-white/10 hover:border-brand transition-all duration-300">
                        Inicio
                    </a>
                </li>
                <li>
                    <a href="/#catalogo"
                        class="text-white no-underline px-2 md:px-5 flex items-center h-[55px] md:h-[70px] text-xs md:text-base border-b-[3px] border-transparent hover:bg-white/10 hover:border-brand transition-all duration-300">
                        Catálogo
                    </a>
                </li>
                <li>
                    <a href="#" onclick="irAFavoritos(); return false;"
                        class="text-white no-underline px-2 md:px-5 flex items-center h-[55px] md:h-[70px] text-xs md:text-base border-b-[3px] border-transparent hover:bg-white/10 hover:border-brand transition-all duration-300">
                        Favoritos
                    </a>
                </li>
                <li>
                    <a href="views/completes/cart.html"
                        class="relative text-white no-underline px-2 md:px-5 flex items-center h-[55px] md:h-[70px] text-xs md:text-base border-b-[3px] border-transparent hover:bg-white/10 hover:border-brand transition-all duration-300">
                        🛒 Carrito
                        <span id="cartBadge"
                            class="hidden absolute top-2 right-1 bg-red-500 text-white rounded-full px-1.5 py-0.5 text-[11px] font-bold z-10 pointer-events-none">0</span>
                    </a>
                </li>`;

            userInfo.innerHTML = `
                <a href="views/completes/userProfile.html" class="text-white no-underline px-2 md:px-5 flex items-center h-[55px] md:h-[70px] text-xs md:text-base border-b-[3px] border-transparent hover:bg-white/10 hover:border-[#4CAF50] transition-all duration-300">
                    Perfil
                </a>
                <span class="text-[#4CAF50] font-bold text-xs md:text-base sm:inline">${user.user_name}</span>
                <a href="#" onclick="cerrarSesion(); return false;" class="text-white no-underline px-2 md:px-5 flex items-center h-[55px] md:h-[70px] text-xs md:text-base border-b-[3px] border-transparent hover:bg-white/10 hover:border-[#4CAF50] transition-all duration-300">
                    Cerrar Sesión
                </a>
            `;
        }
    }
}

export function actualizarContadorCarrito(count) {
    const cartBadge = document.getElementById('cartBadge');
    if (cartBadge) {
        cartBadge.textContent = count;
        cartBadge.style.display = count > 0 ? 'inline-block' : 'none';
    }
}
// ── Sesión ────────────────────────────────────────────────────────────────────

export async function verificarSesion() {
    const token = getToken();
    if (!token) {
        console.log('[AUTH] No hay token guardado');
        return { authenticated: false };
    }
    try {
        const res = await fetch(`${API_URL}/get-session`, { headers: authHeaders() });
        console.log('[AUTH] get-session status:', res.status);
        if (res.status === 401) { cerrarSesionLocal(); return { authenticated: false }; }
        return await res.json();
    } catch (err) {
        console.error('Error al verificar sesión:', err);
        return { authenticated: false };
    }
}

export function cerrarSesionLocal() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
}

export async function cerrarSesion() {  
    try {
        const token = getToken();
        console.log('[AUTH] Cerrando sesión, token:', token);
        if (token) await fetch(`${API_URL}/cerrar-sesion`, { method: 'POST', headers: authHeaders() });
    } catch (err) {
        console.error('Error al cerrar sesión en servidor:', err);
    } finally {
        cerrarSesionLocal();
        window.location.href = '/';
    }
}