import { showModal } from '../utils/common.js';

const API_URL = 'https://unenacted-genoveva-unhidden.ngrok-free.dev';

document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const user_name = document.getElementById('user_name').value;
    const password  = document.getElementById('password').value;

    try {
        const res = await fetch(`${API_URL}/inicio-sesion`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
            body: JSON.stringify({ user_name, password })
        });
        const data = await res.json();
        console.log('[LOGIN] status HTTP:', res.status);
        console.log('[LOGIN] respuesta servidor:', data);
        if (data.success) {
            console.log("El token es:", data.access_token);
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
    messageDiv.className = `message ${type}`;
    messageDiv.style.display = 'block';
}

document.addEventListener("DOMContentLoaded", async () => {
    const btnVolver = document.getElementById('btn-volver');
    btnVolver.innerHTML = `<a href="${sessionStorage.getItem('ult_pag') || '/'}">← Volver</a>`;
});