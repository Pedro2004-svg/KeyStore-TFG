import { verificarSesion, actualizarNavbar, actualizarContadorCarrito, authHeaders, cerrarSesion, showModal, showConfirm } from '../utils/common.js';
import { loadHeader } from '../views/partials/partials.js';


const API_URL = 'https://unenacted-genoveva-unhidden.ngrok-free.dev';
let currentUser = null;
let cartCount = 0;
let allCategories = {};
let currentCategory = 'Todos';
let carruselIndex = 0;
let carruselItems = 0;
const ITEMS_VISIBLES = window.innerWidth < 768 ? 1 : 3;

window.cerrarSesion = cerrarSesion;

if (window.Capacitor?.Plugins?.App) {
    window.Capacitor.Plugins.App.addListener('appUrlOpen', async (event) => {
        const url = new URL(event.url);
        if (url.hostname === 'compra-exitosa') {
            const sessionId = url.searchParams.get('session_id');
            try {
                const res = await fetch(`${API_URL}/compra-exitosa?session_id=${sessionId}`, {
                    headers: authHeaders() // 👈 Manda el token para guardar en BD
                });
                const data = await res.json();
                if (data.success) {
                    window.location.href = `./views/completes/successPurchase.html?session_id=${sessionId}`;
                }
            } catch (err) {
                console.error('Error al procesar compra:', err);
            }
        }
    });
}

async function init() {
    console.log("Se ejecuta init() en catalog.js");

    // 👇 Para cuando la app se abre desde cero con el deep link
    if (window.Capacitor?.Plugins?.App) {
        const launchData = await window.Capacitor.Plugins.App.getLaunchUrl();
        if (launchData?.url) {
            const url = new URL(launchData.url);
            if (url.hostname === 'compra-exitosa') {
                const sessionId = url.searchParams.get('session_id');
                try {
                    const res = await fetch(`${API_URL}/compra-exitosa?session_id=${sessionId}`, {
                        headers: authHeaders()
                    });
                    const data = await res.json();
                    if (data.success) {
                        window.location.href = `./views/completes/successPurchase.html?session_id=${sessionId}`;
                    }
                } catch (err) {
                    console.error('Error al procesar compra:', err);
                }
                return;
            }
        }
    }

    const session = await verificarSesion();
    if (session.authenticated) {
        currentUser = session.user;
        cartCount = session.cartCount || 0;
        await loadHeader();
        actualizarNavbar(session.user);
        actualizarContadorCarrito(cartCount);
    } else {
        await loadHeader();
        actualizarNavbar(null);
        // ✅ Obtén el cartCount del servidor aunque no haya sesión
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
function mostrarJuegos(juegos, containerId = 'catalogContainer') {
    const container = document.getElementById(containerId);
    if (!juegos || juegos.length === 0) {
        container.innerHTML = '<p class="loading">No hay juegos disponibles</p>';
        return;
    }
    container.innerHTML = juegos.map(game => `
        <div class="bg-white rounded-xl overflow-hidden shadow-md hover:-translate-y-1 hover:shadow-xl transition-all duration-300">
            <img src="${game.image}" alt="${game.name_game}" class="w-full h-32 md:h-48 object-cover">
            <div class="p-2 md:p-4">
                <h3 class="mb-1 md:mb-2 text-xs md:text-lg font-semibold text-gray-800 truncate">${game.name_game}</h3>
                <p class="text-green-500 text-sm md:text-2xl font-bold mb-1">€${parseFloat(game.price || 0).toFixed(2)}</p>
                ${game.num_ventas !== undefined
                    ? `<p class="text-[10px] md:text-xs text-gray-500 mb-2 md:mb-3">💰 ${game.num_ventas} ventas | ❤️ ${game.num_favoritos} favoritos</p>`
                    : '<div class="mb-2 md:mb-3"></div>'}
                <button onclick="addToFavourites('${game.name_game.replace(/'/g, "\\'")}', ${game.price})"
                    class="w-full bg-green-500 hover:bg-green-600 text-white py-1.5 md:py-2.5 px-2 md:px-5 rounded-lg text-xs md:text-base font-medium cursor-pointer border-none transition-colors mb-1.5 md:mb-2">
                    ❤️ <span class="hidden sm:inline">Añadir a </span>Favoritos
                </button>
                <button onclick="addToCart('${game.name_game.replace(/'/g, "\\'")}', ${game.price})"
                    class="w-full bg-blue-500 hover:bg-blue-600 text-white py-1.5 md:py-2.5 px-2 md:px-5 rounded-lg text-xs md:text-base font-medium cursor-pointer border-none transition-colors">
                    🛒 <span class="hidden sm:inline">Añadir al </span>Carrito
                </button>
            </div>
        </div>
    `).join('');
}

// ── CATEGORÍAS ────────────────────────────────────────────────────────────────

async function loadCategories() {
    try {
        const res = await fetch(`${API_URL}/categorias`, {
            headers: authHeaders()
        });
        allCategories = await res.json();
        const firstBtn = document.querySelector('.cat-btn');
        if (firstBtn) firstBtn.classList.add('active');
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

// ── BÚSQUEDA AVANZADA (filtra dentro de la categoría activa) ──────────────────
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
        const res = await fetch(`${API_URL}/search?${params}`,{
            headers: authHeaders()
        });
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
        const res = await fetch(`${API_URL}/stats/most-favorited?limit=10`,{
            headers: authHeaders()
        });
        const data = await res.json();
        const container = document.getElementById('mostFavoritedContainer');
        if (data.success && data.data.length > 0) {
            carruselItems = data.data.length;
            container.innerHTML = data.data.map(game => `
                <div class="min-w-[calc(33.33%-11px)] md:min-w-[calc(33.33%-11px)] min-w-[calc(100%-16px)] flex-shrink-0">
                    <div class="bg-white rounded-xl overflow-hidden shadow-md hover:-translate-y-1 hover:shadow-xl transition-all duration-300 border border-gray-100">
                        <img src="${game.image}" alt="${game.name_game}" class="w-full h-36 md:h-44 object-cover">
                        <div class="p-3">
                            <h3 class="mb-1 text-sm md:text-base font-semibold text-gray-800 truncate">${game.name_game}</h3>
                            <p class="text-green-500 text-lg md:text-xl font-bold mb-2">€${parseFloat(game.price || 0).toFixed(2)}</p>
                            <button onclick="addToCart('${game.name_game.replace(/'/g, "\\'")}', ${game.price})"
                                class="w-full bg-blue-500 hover:bg-blue-600 text-white py-1.5 px-3 rounded-lg text-xs font-medium cursor-pointer border-none transition-colors">
                                🛒 Añadir al Carrito
                            </button>
                        </div>
                    </div>
                </div>
            `).join('');
            
            //Mover el Carrusel cada 10 segundos automaticamente
            setInterval(() =>{
                const itemsVisibles = ITEMS_VISIBLES;
                const maxIndex = carruselItems - itemsVisibles;

                if (carruselIndex >= maxIndex) {
                    carruselIndex = 0;
                } else {
                    carruselIndex++;
                }

                const itemWidth = container.children[0]?.offsetWidth + 16;
                container.style.transform = `translateX(-${carruselIndex * itemWidth}px)`;
            }, 10000);
        } else {
            document.getElementById('mostFavoritedContainer').innerHTML =
                '<p class="col-span-full text-center text-gray-500">No hay juegos favoritos aún</p>';
        }
    } catch (err) {
        document.getElementById('mostFavoritedContainer').innerHTML =
            '<p class="col-span-full text-center text-red-400">Error al cargar favoritos</p>';
    }
}


window.moverCarrusel = function(direccion){
    const container = document.getElementById('mostFavoritedContainer');
    const itemsVisibles = ITEMS_VISIBLES;
    const maxIndex = carruselItems - itemsVisibles;
    console.log("Los items del carrusel son:", carruselItems);

    carruselIndex += direccion;
    const itemWidth = container.children[0]?.offsetWidth + 16;
    if(carruselIndex > carruselItems -1){
        carruselIndex = 0;
    }
    if(carruselIndex < 0){
        carruselIndex = carruselItems -1;
    }
    container.style.transform = `translateX(-${carruselIndex * itemWidth}px)`;
}

// ── FAVORITOS / CARRITO ───────────────────────────────────────────────────────

function irAFavoritos() {
    if (!currentUser) {
            showModal('Debes iniciar sesión para ver tus favoritos', 'warning').then(() => {
                window.location.href = 'views/completes/login.html';
            });
        } else {
            window.location.href = 'views/completes/favourites.html';
        }
}

async function addToFavourites(gameName, price) {
    if (!currentUser) {
        await showModal('Debes iniciar sesión para añadir favoritos', 'warning');
        window.location.href = 'views/completes/login.html';
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
            window.location.href = 'views/completes/login.html';
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
                console.log("Cart count actualizado a: ", cartCount);
                actualizarContadorCarrito(cartCount);
                const ir = await showConfirm(
                    `<strong>${gameName}</strong> añadido al carrito.<br>¿Deseas ir al carrito ahora?`,
                    'info',
                    'Añadido al carrito'
                );
                if (ir) window.location.href = 'views/completes/cart.html';
            } else {
                await showModal(data.message || 'Error al añadir al carrito', 'error');
            }
        } catch (err) {
            console.error('Error:', err);
            await showModal('Error al añadir al carrito', 'error');
        }
    }

window.irAFavoritos = irAFavoritos;
window.addToFavourites = addToFavourites;
window.addToCart = addToCart;
window.clearSearch = clearSearch;
window.loadCategory = loadCategory;

init();
loadCategories();
loadMostFavorited();

