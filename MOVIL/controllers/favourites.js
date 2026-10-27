import { verificarSesion, actualizarNavbar, actualizarContadorCarrito, authHeaders, cerrarSesion, showModal, showConfirm } from '../utils/common.js';
import { loadHeader,loadFooter } from "../views/partials/partials.js";
const API_URL = 'https://unenacted-genoveva-unhidden.ngrok-free.dev';
let currentUser = null;
let cartCount = 0;
let carruseIndex = 0;
let carruselItems = 0;
const ITEMS_VISIBLES = window.innerWidth < 768 ? 1 : 3;

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
    }
}

async function addToCartFromFavourites(gameName, price) {
    if (!currentUser) {
        alert('Debes iniciar sesión primero');
        window.location.href = './login.html';
        return;
    }
    
    try {
        const res = await fetch(`${API_URL}/add-carrito-temp`, {
            method: 'POST',
            headers: authHeaders(),
            credentials: 'include',
            body: JSON.stringify({ gameName, price })
        });
        
        if (res.status === 401) {
            await showModal('Tu sesión ha expirado. Por favor inicia sesión de nuevo.', 'warning');
            window.location.href = './login.html';
            return;
        }
        
        const data = await res.json();
        if (data.success) {
            cartCount = data.cartCount;
            actualizarContadorCarrito(cartCount);
            const ir = await showConfirm(
                `<strong>${gameName}</strong> añadido al carrito.<br>¿Deseas ir al carrito ahora?`,
                'info',
                'Añadido al carrito'
            )
            if(ir) window.location.href = './cart.html';
        }else {
            await showModal(data.message || 'Error al añadir al carrito', 'error');
        }
    } catch (err) {
        console.error('Error:', err);
        await showModal('Error al añadir al carrito', 'error');
    }
}

async function cargarFavoritos() {
    await init();
    const container = document.getElementById('favouritesContainer');
    try {
        const res = await fetch(`${API_URL}/favoritos`, {
            method: 'GET',
            headers: authHeaders()
        });
        
        if (res.status === 401) {
            container.innerHTML = `
                <p class="col-span-full text-center text-xl mt-12 text-gray-600">
                    Debes <a href="./login.html" class="text-green-600 underline">iniciar sesión</a> para ver tus favoritos
                </p>`;
            return;
        }
        
        const favourites = await res.json();
        
        if(!Array.isArray(favourites) || favourites.length === 0){
            container.innerHTML = `
                <p class="col-span-full text-center text-xl mt-12 text-gray-600">
                    No tienes favoritos aún. <a href="/" class="text-green-600 underline">Ver catálogo</a>
                </p>`;
            return;
        }

        container.innerHTML = favourites.map(fav => `
        <div class="bg-white rounded-xl overflow-hidden shadow-md hover:-translate-y-1 hover:shadow-xl transition-all duration-300">
            <img src="${fav.image}" alt="${fav.name_game}" class="w-full h-32 md:h-40 object-cover">
            <div class="p-2 md:p-3">
                <h3 class="mb-1 text-xs md:text-sm font-semibold text-gray-800 truncate">${fav.name_game}</h3>
                <p class="text-green-500 text-sm md:text-base font-bold mb-2">$${fav.price}</p>
                <button onclick="addToCartFromFavourites('${fav.name_game.replace(/'/g, "\\'")}', ${fav.price})"
                    class="w-full bg-blue-500 hover:bg-blue-600 text-white py-1 px-2 rounded-lg text-xs font-medium cursor-pointer border-none transition-colors">
                    🛒 Añadir al carrito
                </button>
            </div>
        </div>
        `).join('');
    } catch (err) {
        console.error('Error:', err);
        document.getElementById('favouritesContainer').innerHTML = `
            <p class="col-span-full text-center text-xl mt-12 text-gray-600">Error al cargar favoritos</p>`;
    }
}

window.addToCartFromFavourites = addToCartFromFavourites;
window.irAFavoritos = function() {
    if (!currentUser) {
        showModal('Debes iniciar sesión para ver tus favoritos', 'warning').then(() => {
            window.location.href = './login.html';
        });
    } else {
        window.location.href = './favourites.html';
    }
}

document.addEventListener("DOMContentLoaded", async () => {
    console.log("App iniciada");
    await loadHeader();
    await loadFooter();
    cargarFavoritos();
});
