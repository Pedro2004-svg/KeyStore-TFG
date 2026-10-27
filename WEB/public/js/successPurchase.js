import { verificarSesion, actualizarNavbar, actualizarContadorCarrito, authHeaders, cerrarSesion, showModal } from './auth.js';

const API_URL = 'http://localhost:60000';
let currentUser = null;
let cartCount = 0;

window.cerrarSesion = cerrarSesion;

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

async function cargarCompra() {
    await init();
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get('session_id');
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
            <div class="bg-white border border-gray-200 rounded-lg px-5 py-4 mb-3 flex justify-between items-center gap-4">
                <span class="font-bold text-gray-800 text-sm flex-1">🎮 ${p.gameName}</span>
                <span id="key-${p.gameName.replace(/\s/g, '-')}"
                    class="font-mono bg-gray-900 text-green-400 px-3.5 py-2 rounded-md text-sm tracking-wide text-center flex-[2]">
                    ${p.code}
                </span>
                <button onclick="copiarKey('${p.code}', this)"
                    class="bg-indigo-500 hover:bg-indigo-600 text-white border-none px-3.5 py-2 rounded-md text-sm font-semibold cursor-pointer transition-colors whitespace-nowrap w-auto m-0">
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
            window.location.href = '/login';
        });
    } else {
        window.location.href = '/favoritos';
    }
};

cargarCompra();
