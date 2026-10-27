const API_URL = 'http://localhost:60000';
let currentUser = null;
let cartCount = 0;
let allCategories = {};
let currentCategory = 'Todos';

import { verificarSesion, actualizarNavbar, actualizarContadorCarrito, authHeaders, cerrarSesion, showModal, showConfirm } from './auth.js';

window.cerrarSesion = cerrarSesion;

async function init() {
    const session = await verificarSesion();
    if (session.authenticated) {
        currentUser = session.user;
        cartCount = session.cartCount || 0;
        actualizarNavbar(session.user);
        actualizarContadorCarrito(cartCount);
    } else {
        actualizarNavbar(null);
        try {
            const res = await fetch(`${API_URL}/carrito-temp`, { headers: authHeaders() });
            const data = await res.json();
            cartCount = (data.carrito || []).length;
            actualizarContadorCarrito(cartCount);
        } catch (err) {
            cartCount = 0;
        }
    }
}

// ── Clases Tailwind para botones de categoría ─────────────────────────────────

const CAT_BTN_INACTIVE = ['bg-gray-100','text-gray-700','border-gray-300'];
const CAT_BTN_ACTIVE   = ['bg-indigo-500','text-white','border-indigo-500','shadow-md'];

function setCatBtnActive(btn) {
    document.querySelectorAll('.cat-btn').forEach(b => {
        b.classList.remove(...CAT_BTN_ACTIVE);
        b.classList.add(...CAT_BTN_INACTIVE);
    });
    if (btn) {
        btn.classList.remove(...CAT_BTN_INACTIVE);
        btn.classList.add(...CAT_BTN_ACTIVE);
    }
}

// ── MOSTRAR JUEGOS ────────────────────────────────────────────────────────────

function mostrarJuegos(juegos, containerId = 'categoryContainer') {
    const container = document.getElementById(containerId);
    if (!juegos || juegos.length === 0) {
        container.innerHTML = `
            <p class="col-span-full text-center text-xl mt-12 text-gray-600">No hay juegos disponibles</p>`;
        return;
    }
    container.innerHTML = juegos.map(game => `
        <div class="bg-white rounded-xl overflow-hidden shadow-md hover:-translate-y-1 hover:shadow-xl transition-all duration-300">
            <img src="${game.image}" alt="${game.name_game}" class="w-full h-48 object-cover">
            <div class="p-4">
                <h3 class="mb-2 text-lg font-semibold text-gray-800">${game.name_game}</h3>
                <p class="text-green-500 text-2xl font-bold mb-1">€${parseFloat(game.price || 0).toFixed(2)}</p>
                ${game.num_ventas !== undefined
                    ? `<p class="text-xs text-gray-500 mb-3">💰 ${game.num_ventas} ventas | ❤️ ${game.num_favoritos} favoritos</p>`
                    : '<div class="mb-3"></div>'}
                <button onclick="addToFavourites('${game.name_game.replace(/'/g, "\\'")}', ${game.price})"
                    class="w-full bg-green-500 hover:bg-green-600 text-white py-2.5 px-5 rounded-lg text-base font-medium cursor-pointer border-none transition-colors mb-2">
                    ❤️ Añadir a Favoritos
                </button>
                <button onclick="addToCart('${game.name_game.replace(/'/g, "\\'")}', ${game.price})"
                    class="w-full bg-blue-500 hover:bg-blue-600 text-white py-2.5 px-5 rounded-lg text-base font-medium cursor-pointer border-none transition-colors">
                    🛒 Añadir al Carrito
                </button>
            </div>
        </div>
    `).join('');
}

// ── CATEGORÍAS ────────────────────────────────────────────────────────────────

async function loadCategories() {
    try {
        const res = await fetch(`${API_URL}/categorias`);
        allCategories = await res.json();
        const firstBtn = document.querySelector('.cat-btn');
        if (firstBtn) setCatBtnActive(firstBtn);
        loadCategory('Todos', firstBtn);
    } catch (err) {
        console.error('Error cargando categorías:', err);
        document.getElementById('categoryContainer').innerHTML =
            '<p class="col-span-full text-center text-red-400">Error al cargar categorías</p>';
    }
}

function loadCategory(categoryName, btnElement) {
    currentCategory = categoryName;
    setCatBtnActive(btnElement);

    document.getElementById('searchForm').reset();
    const resultsInfo = document.getElementById('resultsInfo');
    resultsInfo.classList.add('hidden');

    mostrarJuegos(allCategories[categoryName] || [], 'categoryContainer');
}

// ── BÚSQUEDA AVANZADA ─────────────────────────────────────────────────────────

document.getElementById('searchForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const searchTerm = document.getElementById('searchTerm').value;
    const minPrice   = document.getElementById('minPrice').value;
    const maxPrice   = document.getElementById('maxPrice').value;
    const sortBy     = document.getElementById('sortBy').value;

    const params = new URLSearchParams();
    if (searchTerm) params.append('q', searchTerm);
    if (minPrice)   params.append('minPrice', minPrice);
    if (maxPrice)   params.append('maxPrice', maxPrice);
    if (sortBy)     params.append('sortBy', sortBy);

    const resultsInfo = document.getElementById('resultsInfo');

    try {
        const res = await fetch(`${API_URL}/search?${params}`);
        const data = await res.json();
        resultsInfo.classList.remove('hidden');

        if (!data.results || data.results.length === 0) {
            resultsInfo.textContent = '❌ No se encontraron resultados con esos criterios';
            resultsInfo.className = 'block px-3 py-2 rounded text-center my-4 text-sm bg-red-100 text-red-700';
            document.getElementById('categoryContainer').innerHTML =
                '<p class="col-span-full text-center text-gray-500">No se encontraron juegos</p>';
            return;
        }

        let results = data.results;
        if (currentCategory !== 'Todos') {
            const idsEnCategoria = new Set(
                (allCategories[currentCategory] || []).map(g => g.id_game)
            );
            results = results.filter(g => idsEnCategoria.has(g.id_game));
        }

        resultsInfo.textContent = `✅ Se encontraron ${results.length} juegos${currentCategory !== 'Todos' ? ` en "${currentCategory}"` : ''}`;
        resultsInfo.className = 'block px-3 py-2 rounded text-center my-4 text-sm bg-green-100 text-green-700';
        mostrarJuegos(results, 'categoryContainer');
        document.getElementById('categoryContainer').scrollIntoView({ behavior: 'smooth' });

    } catch (err) {
        console.error('Error en búsqueda:', err);
        resultsInfo.textContent = '❌ Error al realizar la búsqueda';
        resultsInfo.className = 'block px-3 py-2 rounded text-center my-4 text-sm bg-red-100 text-red-700';
        resultsInfo.classList.remove('hidden');
    }
});

function clearSearch() {
    document.getElementById('searchForm').reset();
    document.getElementById('resultsInfo').classList.add('hidden');
    const activeBtn = document.querySelector('.cat-btn.active') || document.querySelector('.cat-btn');
    loadCategory(currentCategory, activeBtn);
}

// ── TOP FAVORITOS ─────────────────────────────────────────────────────────────

async function loadMostFavorited() {
    try {
        const res = await fetch(`${API_URL}/stats/most-favorited?limit=10`);
        const data = await res.json();
        if (data.success && data.data.length > 0) {
            mostrarJuegos(data.data, 'mostFavoritedContainer');
        } else {
            document.getElementById('mostFavoritedContainer').innerHTML =
                '<p class="col-span-full text-center text-gray-500">No hay juegos favoritos aún</p>';
        }
    } catch (err) {
        document.getElementById('mostFavoritedContainer').innerHTML =
            '<p class="col-span-full text-center text-red-400">Error al cargar favoritos</p>';
    }
}

// ── FAVORITOS / CARRITO ───────────────────────────────────────────────────────

function irAFavoritos() {
    if (!currentUser) {
        showModal('Debes iniciar sesión para ver tus favoritos', 'warning').then(() => {
            window.location.href = '/login';
        });
    } else {
        window.location.href = '/favoritos';
    }
}

async function addToFavourites(gameName, price) {
    if (!currentUser) {
        await showModal('Debes iniciar sesión para añadir favoritos', 'warning');
        window.location.href = '/login';
        return;
    }
    try {
        const res = await fetch(`${API_URL}/add-favoritos`, {
            method: 'POST',
            headers: authHeaders(),
            body: JSON.stringify({ gameName, price })
        });
        if (res.status === 401) {
            await showModal('Tu sesión ha expirado. Por favor inicia sesión de nuevo.', 'warning');
            window.location.href = '/login';
            return;
        }
        const data = await res.json();
        if (data.success) {
            await showModal(`<strong>${gameName}</strong> añadido a favoritos`, 'success');
        } else {
            await showModal(data.message || 'Error al añadir a favoritos', 'error');
        }
    } catch (err) {
        console.error('Error:', err);
        await showModal('Error al añadir a favoritos', 'error');
    }
}

async function addToCart(gameName, price) {
    try {
        const res = await fetch(`${API_URL}/add-carrito-temp`, {
            method: 'POST',
            headers: authHeaders(),
            body: JSON.stringify({ gameName, price })
        });
        if (!res.ok) throw new Error(`Error ${res.status}`);
        const data = await res.json();
        if (data.success) {
            cartCount = data.cartCount || 0;
            actualizarContadorCarrito(cartCount);
            const ir = await showConfirm(
                `<strong>${gameName}</strong> añadido al carrito.<br>¿Deseas ir al carrito ahora?`,
                'info',
                'Añadido al carrito'
            );
            if (ir) window.location.href = '/carrito';
        } else {
            await showModal(data.message || 'Error al añadir al carrito', 'error');
        }
    } catch (err) {
        console.error('Error:', err);
        await showModal('Error al añadir al carrito', 'error');
    }
}

// ── EXPORTS GLOBALES ──────────────────────────────────────────────────────────

window.irAFavoritos = irAFavoritos;
window.addToFavourites = addToFavourites;
window.addToCart = addToCart;
window.clearSearch = clearSearch;
window.loadCategory = loadCategory;

init();
loadCategories();
loadMostFavorited();