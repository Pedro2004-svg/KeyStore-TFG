import { showModal } from './auth.js';

const API_URL = 'http://localhost:60000';

document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const user_name = document.getElementById('user_name').value;
    const password  = document.getElementById('password').value;

    try {
        const res = await fetch(`${API_URL}/inicio-sesion`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_name, password })
        });
        const data = await res.json();
        if (data.success) {
            localStorage.setItem('access_token', data.access_token);
            localStorage.setItem('refresh_token', data.refresh_token);
            localStorage.setItem('user', JSON.stringify(data.user));
            showFormMessage('✅ Sesión iniciada correctamente', 'success');
            setTimeout(() => { window.location.href = '/'; }, 1000);
        } else {
            await showModal(data.message || 'Credenciales incorrectas', 'error', 'Acceso denegado');
        }
    } catch (err) {
        console.error('Error:', err);
        await showModal('Error al conectar con el servidor', 'error');
    }
});

function showFormMessage(text, type) {
    const messageDiv = document.getElementById('message');
    messageDiv.textContent = text;
    messageDiv.className = type === 'success'
        ? 'mt-4 text-center text-sm text-green-400'
        : 'mt-4 text-center text-sm text-red-400';
}
