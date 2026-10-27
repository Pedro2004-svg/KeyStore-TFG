const API_URL = 'https://unenacted-genoveva-unhidden.ngrok-free.dev';
import { verificarSesion, actualizarNavbar, actualizarContadorCarrito, authHeaders, cerrarSesion, showModal, showConfirm} from '../utils/common.js';
import { loadHeader, loadFooter } from '../views/partials/partials.js';
let currentUser = null;
let cartCount = 0;
const { App } = window.Capacitor.Plugins;

window.cerrarSesion = cerrarSesion;

async function init() {
    console.log("Inicializando carrito...");
    const session = await verificarSesion();
    if (session.authenticated) {
        currentUser = session.user;
        cartCount = session.cartCount || 0;
        actualizarNavbar(currentUser);
    } else {
        console.log("No hay sesión activa");
        actualizarNavbar(null);
    }
}

async function cargarCarrito() {
    await init();

    const container = document.getElementById('carritoContainer');
    try{
        const res = await fetch(`${API_URL}/carrito-temp`, {
            method: 'GET',
            headers: authHeaders()
        });
        const data =await res.json();
        const carrito = data.carrito || [];

            if (carrito.length === 0) {
                container.innerHTML = `
                    <p class="text-center text-base md:text-2xl py-6 md:py-10 text-gray-500 border border-gray-200 m-3 md:m-4">
                        Tu carrito está vacío. <a href="/" class="text-blue-600 hover:underline">Ver catálogo</a>
                    </p>`;
                actualizarResumen(0, 0);
                return;
            }

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

        console.log('Estado actual del agrupado:', carritoAgrupado);
        console.log('Estado actual del no agrupado:', carrito);

        container.innerHTML = `
            <button onclick="removeCart()"
                class="self-start w-auto mx-3 md:mx-4 mb-5 px-4 md:px-5 py-2 rounded-full border border-gray-300 bg-gray-50 text-black text-sm font-semibold hover:bg-gray-100 hover:border-gray-400 transition-colors">
                Eliminar Carrito
            </button>`;

        container.innerHTML += carritoAgrupado.map(item => `
    <div class="relative flex flex-col md:grid md:grid-cols-[150px_minmax(0,1fr)] gap-3 md:gap-6 items-start w-full
                p-4 md:pl-5 md:pr-56 md:py-7 bg-white border-t border-gray-200 hover:bg-gray-50 transition-colors"
        data-id="${item.id}">

        <img src="${item.image || 'https://via.placeholder.com/100x100?text=No+Image'}"
            alt="${item.name_game}"
            onerror="this.src='https://via.placeholder.com/100x100?text=No+Image'"
            class="w-32 h-40 md:w-32 md:h-44 object-contain bg-white mx-auto md:mx-0">

        <div class="flex flex-col gap-2 min-w-0 w-full">

            <!-- Nombre + precio -->
            <div class="flex items-start justify-between gap-2">
                <h3 class="m-0 text-black text-xl md:text-3xl font-medium leading-tight">
                    ${item.name_game}
                    <span class="block mt-1 text-green-700 text-base md:text-2xl font-normal">En stock</span>
                </h3>

                <!-- Precio: inline siempre en móvil, absoluto en md+ -->
                <div class="text-right md:absolute md:top-7 md:-right-48">
                    <span class="block mb-1 text-gray-500 text-xs md:text-sm font-medium tracking-wide">Precio</span>
                    <span class="text-black text-2xl md:text-4xl font-bold leading-none">$${parseFloat(item.price).toFixed(2)}</span>
                </div>
            </div>

            <!-- Control cantidad -->
            <div class="inline-flex items-center gap-3 mt-3 md:mt-5 px-3 md:px-4 py-1 w-fit border-2 border-yellow-300 rounded-full bg-white shadow-sm">
                <button class="menos-btn w-6 h-6 md:w-7 md:h-7 flex items-center justify-center rounded-full bg-transparent text-black text-xl md:text-2xl font-medium hover:bg-gray-100 transition-colors border-none cursor-pointer"
                    data-name="${item.name_game}">−</button>
                <span class="min-w-[18px] text-black text-xl md:text-2xl font-bold text-center">${item.cantidad}</span>
                <button class="mas-btn w-6 h-6 md:w-7 md:h-7 flex items-center justify-center rounded-full bg-transparent text-black text-xl md:text-2xl font-medium hover:bg-gray-100 transition-colors border-none cursor-pointer"
                    data-name="${item.name_game}"
                    data-price="${item.price}"
                    data-image="${item.image}">+</button>
            </div>

            <!-- Botón eliminar -->
            <button class="remove-btn self-start mt-3 md:mt-4 pl-3 md:pl-4 border-l border-gray-300 bg-transparent text-blue-600 hover:text-blue-800 hover:underline text-sm font-medium border-t-0 border-r-0 border-b-0 cursor-pointer"
                data-name="${item.name_game}">Eliminar</button>

            ${item.offer ? `<span class="inline-flex items-center w-fit mt-2 md:mt-3 px-3 py-1 rounded-full bg-red-600 text-white text-sm font-bold tracking-wide">OFERTA</span>` : ''}
        </div>
    </div>
`).join('');

            document.querySelectorAll('.mas-btn').forEach(btn => {
                btn.addEventListener('click', () => addToCart(btn.dataset.name, parseFloat(btn.dataset.price)));
            });
            document.querySelectorAll('.menos-btn').forEach(btn => {
                btn.addEventListener('click', () => removeOneFromCart(btn.dataset.name));
            });

            document.querySelectorAll('.remove-btn').forEach(btn => {
                btn.addEventListener('click', () => removeFromCart(btn.dataset.name));
            });

            const countGames = carritoAgrupado.reduce((sum, i) => sum + i.cantidad, 0);
            const total = carritoAgrupado.reduce((sum, i) => sum + i.price * i.cantidad, 0);
            actualizarResumen(countGames, total);

            console.log(`${carrito.length} items en el carrito`);
    }catch(err){
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
    if (btnComprar) {
        btnComprar.disabled = count === 0;
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
            //cartCount = data.cartCount || 0;
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
    console.log('[COMPRA] token:', localStorage.getItem('access_token'));
    if (!currentUser) {
        await showModal('Debes iniciar sesión para comprar', 'warning');
        window.location.href = './login.html';
        return;
    }
    try {
        const res = await fetch(`${API_URL}/create-checkout-session`, {
            method: 'POST',
            headers: authHeaders(),
            body: JSON.stringify({
                baseUrl: 'https://unenacted-genoveva-unhidden.ngrok-free.dev',
                platform: 'mobile'
            })
        });
        const data = await res.json();
        if (data.url) {
            window.location.href = data.url; // redirige a Stripe
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
            window.location.href = './login.html';
        });
    } else {
        window.location.href = './favourites.html';
    }
}

window.removeCart = removeCart;
window.realizarCompra = realizarCompra;

document.addEventListener("DOMContentLoaded", async () => {
    console.log("App iniciada");
    console.log("Capacitor disponible:", !!window.Capacitor);
    console.log("App plugin disponible:", !!window.Capacitor?.Plugins?.App);
    await loadHeader();
    await loadFooter();
    cargarCarrito();
    if (window.Capacitor) {
        console.log("Agregando listener para deep links...");
        App.addListener('appUrlOpen', (data) => {
            const url = data.url.replace('miapp://', 'https://miapp');
            const parsedUrl = new URL(url);
            const host = parsedUrl.host;
            console.log("Deep link recibido:", host, "URL completa:", url);
            const sessionId = parsedUrl.searchParams.get('session_id');

            if(host === 'miappcompra-exitosa' && sessionId !== null) {
                console.log("Deep link recibido:", host, "Session ID:", sessionId);
                sessionStorage.setItem('pending_session_id', sessionId);
                window.location.href = './successPurchase.html';
            }else if(host === 'miappcarrito') {
                console.log("Deep link recibido 2:", host, "Session ID:", sessionId);
                showModal('Pago cancelado. Tu carrito no ha sido modificado.', 'warning').then(() => {
                    window.location.href = './cart.html';
                })
            }
        });
    }
}); 

