import { showModal } from './auth.js';

const API_URL = 'http://localhost:60000';

document.getElementById('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const user_name = document.getElementById('user_name').value;
    const email     = document.getElementById('email').value;
    const password  = document.getElementById('password').value;
    const message   = document.getElementById('message');

    try {
        const res = await fetch(`${API_URL}/crear-usuario`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_name, email, password })
        });
        const data = await res.json();
        if (!res.ok) {
            await showModal(data.message, 'error', 'Error al registrarse');
            return;
        }
        message.textContent = 'Registro correcto, ya puedes iniciar sesión';
        message.className = 'mt-4 text-center text-sm text-green-400';
        setTimeout(() => { window.location.href = '/login'; }, 1000);
    } catch (err) {
        console.error(err);
        await showModal('Error conectando con el servidor', 'error');
    }
});
