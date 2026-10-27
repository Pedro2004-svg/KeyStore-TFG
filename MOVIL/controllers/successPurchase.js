import { verificarSesion, actualizarNavbar, actualizarContadorCarrito, authHeaders, cerrarSesion, showModal, showConfirm } from '../utils/common.js';
import { loadHeader,loadFooter } from "../views/partials/partials.js";
const API_URL = 'https://unenacted-genoveva-unhidden.ngrok-free.dev';
let currentUser = null;
let cartCount = 0;
const { App } = window.Capacitor.Plugins;

async function init() {
    const session = await verificarSesion();
    if (session.authenticated) {
        currentUser = session.user;
        cartCount = session.cartCount || 0;
        actualizarNavbar(currentUser);
    } else {
        actualizarNavbar(null);
    }
}

async function getSessionId() {
    // 1. URL normal (web)
    const params = new URLSearchParams(window.location.search);
    if (params.get('session_id')) return params.get('session_id');

    // 2. sessionStorage (guardado desde cart.js)
    const stored = sessionStorage.getItem('pending_session_id');
    if (stored) {
        sessionStorage.removeItem('pending_session_id');
        return stored;
    }

    // 3. URL de arranque (cuando la app se abre desde cero por el deep link)
    const launchUrl = await App.getLaunchUrl();
    if (launchUrl?.url) {
        const url = launchUrl.url.replace('miapp://', 'https://miapp');
        const sessionId = new URL(url).searchParams.get('session_id');
        if (sessionId) return sessionId;
    }

    // 4. Deep link con app ya abierta
    return new Promise((resolve) => {
        App.addListener('appUrlOpen', (data) => {
            const url = data.url.replace('miapp://', 'https://miapp');
            resolve(new URL(url).searchParams.get('session_id') || null);
        });
        setTimeout(() => resolve(null), 3000);
    });
}

async function cargarCompra() {
    await init();
    const sessionId = await getSessionId();
    const container = document.getElementById('keysContainer');

    if (!sessionId) {
        container.innerHTML = `
            <div class="text-center text-red-500 py-5">❌ No se encontró la sesión de pago.</div>`;
        return;
    }

    try {
        const res = await fetch(`${API_URL}/compra-exitosa?session_id=${sessionId}`, {
            headers: authHeaders()
        });
        const data = await res.json();

        if (!data.success || !data.purchases?.length) {
            container.innerHTML = `
                <div class="text-center text-red-500 py-5">❌ No se encontraron compras para esta sesión.</div>`;
            return;
        }

        container.innerHTML = data.purchases.map(p => `
            <div class="bg-white border border-gray-200 rounded-lg px-3 md:px-5 py-3 md:py-4 mb-3 flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
                <span class="font-bold text-gray-800 text-sm">🎮 ${p.gameName}</span>
                <span id="key-${p.gameName.replace(/\s/g, '-')}"
                    class="font-mono bg-gray-900 text-green-400 px-3 py-2 rounded-md text-xs md:text-sm tracking-wide text-center md:flex-[2] break-all">
                    ${p.code}
                </span>
                <button onclick="copiarKey('${p.code}', this)"
                    class="bg-indigo-500 hover:bg-indigo-600 text-white border-none px-3 py-2 rounded-md text-sm font-semibold cursor-pointer transition-colors w-full md:w-auto">
                    📋 Copiar
                </button>
            </div>
        `).join('');

    } catch (err) {
        console.error('Error al cargar compra:', err);
        container.innerHTML = `
            <div class="text-center text-red-500 py-5">❌ Error al cargar las claves. Contacta con soporte.</div>`;
    }
}

window.copiarKey = function(code, btn) {
    navigator.clipboard.writeText(code).then(() => {
        btn.textContent = '✅ Copiada';
        btn.classList.remove('bg-indigo-500', 'hover:bg-indigo-600');
        btn.classList.add('bg-green-500');
        setTimeout(() => {
            btn.textContent = '📋 Copiar';
            btn.classList.remove('bg-green-500');
            btn.classList.add('bg-indigo-500', 'hover:bg-indigo-600');
        }, 2000);
    });
};

window.irAFavoritos = function() {
    if (!currentUser) {
        showModal('Debes iniciar sesión para ver tus favoritos', 'warning').then(() => {
            window.location.href = './login.html';
        });
    } else {
        window.location.href = './favourites.html';
    }
};

document.addEventListener("DOMContentLoaded", async () => {
    console.log("App iniciada");
    await loadHeader();
    await loadFooter();
    cargarCompra();
});



