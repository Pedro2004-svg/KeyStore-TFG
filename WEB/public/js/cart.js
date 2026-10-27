const API_URL = 'http://localhost:60000';
let currentUser = null;
let cartCount = 0;
import { verificarSesion, actualizarNavbar, actualizarContadorCarrito, authHeaders, cerrarSesion, showModal, showConfirm } from './auth.js';

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

async function cargarCarrito() {
    await init();
    const container = document.getElementById('carritoContainer');
    try {
        const res = await fetch(`${API_URL}/carrito-temp`, {
            method: 'GET',
            headers: authHeaders()
        });
        const data = await res.json();
        const carrito = data.carrito || [];

        actualizarContadorCarrito(carrito.length);

        const carritoAgrupado = Object.values(
            carrito.reduce((acc, item) => {
                if (acc[item.name_game]) {
                    acc[item.name_game].cantidad++;
                } else {
                    acc[item.name_game] = { ...item, cantidad: 1 };
                }
                return acc;
            }, {})
        );

        if (carritoAgrupado.length === 0) {
            container.innerHTML = `
                <p class="text-center text-2xl py-10 text-gray-500 border border-gray-200 m-4">
                    Tu carrito está vacío. <a href="/" class="text-blue-600 hover:underline">Ver catálogo</a>
                </p>`;
            actualizarResumen(0, 0);
            return;
        }

        container.innerHTML = `
            <button onclick="removeCart()"
                class="self-start w-auto mx-4 mb-5 px-5 py-2 rounded-full border border-gray-300 bg-gray-50 text-black text-sm font-semibold hover:bg-gray-100 hover:border-gray-400 transition-colors">
                Eliminar Carrito
            </button>`;

        container.innerHTML += carritoAgrupado.map(item => `
            <div class="relative grid grid-cols-[150px_minmax(0,1fr)] gap-6 items-start w-full min-h-[220px]
                        pl-5 pr-56 py-7 bg-white border-t border-gray-200 hover:bg-gray-50 transition-colors"
                 data-id="${item.id}">

                <img src="${item.image || 'https://via.placeholder.com/100x100?text=No+Image'}"
                     alt="${item.name_game}"
                     onerror="this.src='https://via.placeholder.com/100x100?text=No+Image'"
                     class="w-32 h-44 object-contain justify-self-center bg-white">

                <div class="relative flex flex-col gap-2 min-w-0">
                    <h3 class="m-0 pr-6 text-black text-3xl font-medium leading-tight">
                        ${item.name_game}
                        <span class="block mt-2 text-green-700 text-2xl font-normal">En stock</span>
                    </h3>

                    <!-- Precio: posicionado a la derecha -->
                    <div class="absolute top-0 -right-48 text-right">
                        <span class="block mb-2 text-gray-500 text-sm font-medium tracking-wide">Precio</span>
                        <span class="text-black text-4xl font-bold leading-none">$${parseFloat(item.price).toFixed(2)}</span>
                    </div>

                    <!-- Control cantidad -->
                    <div class="inline-flex items-center gap-3 mt-5 px-4 py-1 w-fit border-2 border-yellow-300 rounded-full bg-white shadow-sm">
                        <button class="menos-btn w-7 h-7 flex items-center justify-center rounded-full bg-transparent text-black text-2xl font-medium hover:bg-gray-100 transition-colors border-none cursor-pointer"
                            data-name="${item.name_game}">−</button>
                        <span class="min-w-[18px] text-black text-2xl font-bold text-center">${item.cantidad}</span>
                        <button class="mas-btn w-7 h-7 flex items-center justify-center rounded-full bg-transparent text-black text-2xl font-medium hover:bg-gray-100 transition-colors border-none cursor-pointer"
                            data-name="${item.name_game}"
                            data-price="${item.price}"
                            data-image="${item.image}">+</button>
                    </div>

                    <!-- Botón eliminar -->
                    <button class="remove-btn self-start mt-4 pl-4 border-l border-gray-300 bg-transparent text-blue-600 hover:text-blue-800 hover:underline text-sm font-medium border-t-0 border-r-0 border-b-0 cursor-pointer"
                        data-name="${item.name_game}">Eliminar</button>

                    ${item.offer ? `<span class="inline-flex items-center w-fit mt-3 px-3 py-1 rounded-full bg-red-600 text-white text-sm font-bold tracking-wide">OFERTA</span>` : ''}
                </div>
            </div>
        `).join('');

        document.querySelectorAll('.mas-btn').forEach(btn =>
            btn.addEventListener('click', () => addToCart(btn.dataset.name, parseFloat(btn.dataset.price)))
        );
        document.querySelectorAll('.menos-btn').forEach(btn =>
            btn.addEventListener('click', () => removeOneFromCart(btn.dataset.name))
        );
        document.querySelectorAll('.remove-btn').forEach(btn =>
            btn.addEventListener('click', () => removeFromCart(btn.dataset.name))
        );

        const countGames = carritoAgrupado.reduce((sum, i) => sum + i.cantidad, 0);
        const total = carritoAgrupado.reduce((sum, i) => sum + i.price * i.cantidad, 0);
        actualizarResumen(countGames, total);

    } catch (err) {
        console.error('Error al cargar carrito:', err);
        container.innerHTML = `
            <p class="text-center text-2xl py-10 text-gray-500 border border-gray-200 m-4">
                Error al cargar el carrito. <a href="/" class="text-blue-600 hover:underline">Volver al inicio</a>
            </p>`;
    }
}

function actualizarResumen(count, total) {
    document.getElementById('cartCount').textContent = `${count} Juegos`;
    document.getElementById('cartTotal').textContent = `Total: $${total.toFixed(2)}`;
    const btnComprar = document.getElementById('buyBtn');
    if (btnComprar) btnComprar.disabled = count === 0;
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
            await cargarCarrito();
        } else {
            await showModal(data.message || 'Error al añadir al carrito', 'error');
        }
    } catch (err) {
        console.error('Error:', err);
        await showModal('Error al añadir al carrito', 'error');
    }
}

async function removeFromCart(gameName) {
    try {
        const res = await fetch(`${API_URL}/remove-carrito-temp`, {
            method: 'DELETE',
            headers: authHeaders(),
            body: JSON.stringify({ gameName })
        });
        if (!res.ok) throw new Error(`Error ${res.status}`);
        const data = await res.json();
        if (data.success) {
            cartCount = data.cartCount || 0;
            actualizarContadorCarrito(cartCount);
            cargarCarrito();
        } else {
            await showModal(data.message || 'Error al eliminar del carrito', 'error');
        }
    } catch (err) {
        console.error('Error:', err);
        await showModal('Error al eliminar del carrito', 'error');
    }
}

async function removeOneFromCart(gameName) {
    try {
        const res = await fetch(`${API_URL}/remove-one-carrito-temp`, {
            method: 'DELETE',
            headers: authHeaders(),
            body: JSON.stringify({ gameName })
        });
        if (!res.ok) throw new Error(`Error ${res.status}`);
        const data = await res.json();
        if (data.success) {
            cartCount = data.cartCount || 0;
            actualizarContadorCarrito(cartCount);
            cargarCarrito();
        } else {
            await showModal(data.message || 'Error al eliminar uno del carrito', 'error');
        }
    } catch (err) {
        console.error('Error:', err);
        await showModal('Error al eliminar uno del carrito', 'error');
    }
}

async function removeCart() {
    const confirmed = await showConfirm('¿Eliminar todos los juegos del carrito?', 'warning', 'Vaciar carrito');
    if (!confirmed) return;
    try {
        const res = await fetch(`${API_URL}/remove-all-carrito-temp`, {
            method: 'DELETE',
            headers: authHeaders()
        });
        const data = await res.json();
        if (data.success) {
            cartCount = 0;
            actualizarContadorCarrito(0);
            cargarCarrito();
        } else {
            await showModal(data.message || 'Error al eliminar el carrito', 'error');
        }
    } catch (err) {
        console.error('Error:', err);
        await showModal('Error al eliminar el carrito', 'error');
    }
}

async function realizarCompra() {
    if (!currentUser) {
        await showModal('Debes iniciar sesión para comprar', 'warning');
        window.location.href = '/login';
        return;
    }
    try {
        const res = await fetch(`${API_URL}/create-checkout-session`, {
            method: 'POST',
            headers: authHeaders()
        });
        const data = await res.json();
        if (data.url) {
            window.location.href = data.url;
        } else {
            await showModal(data.message || 'Error al iniciar el pago', 'error');
        }
    } catch (err) {
        console.error('Error:', err);
        await showModal('Error al conectar con el servidor de pagos', 'error');
    }
}

window.irAFavoritos = function() {
    if (!currentUser) {
        showModal('Debes iniciar sesión para ver tus favoritos', 'warning').then(() => {
            window.location.href = '/login';
        });
    } else {
        window.location.href = '/favoritos';
    }
}
window.removeCart = removeCart;
window.realizarCompra = realizarCompra;

cargarCarrito();
