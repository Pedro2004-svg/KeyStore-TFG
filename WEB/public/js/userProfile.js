import { verificarSesion, actualizarNavbar, actualizarContadorCarrito, authHeaders, cerrarSesion, cerrarSesionLocal, showModal, showConfirm } from './auth.js';

const API_URL = 'http://localhost:60000';
let currentUser = null;

window.cerrarSesion = cerrarSesion;

async function init() {
    const session = await verificarSesion();
    if (session.authenticated) {
        currentUser = session.user;
        actualizarNavbar(session.user);
        actualizarContadorCarrito(session.cartCount || 0);
    } else {
        actualizarNavbar(null);
    }
}

// ── Cambiar contraseña ────────────────────────────────────────────────────────

document.getElementById('changePasswordForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const oldPassword        = document.getElementById('oldPassword').value;
    const newPassword        = document.getElementById('newPassword').value;
    const confirmNewPassword = document.getElementById('confirmNewPassword').value;
    const messageDiv         = document.getElementById('changePasswordMessage');

    if (newPassword !== confirmNewPassword) {
        showFormMessage(messageDiv, 'Las contraseñas no coinciden', 'error');
        return;
    }
    try {
        const res = await fetch(`${API_URL}/change-password`, {
            method: 'PUT',
            headers: authHeaders(),
            body: JSON.stringify({ oldPassword, newPassword })
        });
        const data = await res.json();
        if (res.ok && data.success) {
            if (data.access_token) {
                localStorage.setItem('access_token', data.access_token);
                localStorage.setItem('refresh_token', data.refresh_token);
                const session = await verificarSesion();
                if (session.authenticated) {
                    actualizarNavbar(session.user);
                    actualizarContadorCarrito(session.cartCount || 0);
                }
            }
            showFormMessage(messageDiv, data.message, 'success');
            document.getElementById('changePasswordForm').reset();
        }
    } catch (err) {
        console.error('Error:', err);
        showFormMessage(messageDiv, 'Error al cambiar contraseña', 'error');
    }
});

// ── Cambiar email ─────────────────────────────────────────────────────────────

document.getElementById('changeEmailForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const newEmail   = document.getElementById('newEmail').value;
    const messageDiv = document.getElementById('changeEmailMessage');

    const confirmed = await showConfirm(
        `Se enviará un email de confirmación a <strong>${newEmail}</strong>.<br>Deberás confirmarlo para que el cambio sea efectivo.`,
        'info',
        'Cambiar email'
    );
    if (!confirmed) return;

    try {
        const res = await fetch(`${API_URL}/change-email`, {
            method: 'PUT',
            headers: authHeaders(),
            body: JSON.stringify({ newEmail })
        });
        const data = await res.json();
        if (res.ok && data.success) {
            showFormMessage(messageDiv, data.message, 'success');
            document.getElementById('changeEmailForm').reset();
            cerrarSesionLocal();
            await showModal('Por favor, inicia sesión con tu nuevo email para continuar.', 'info');
            window.location.href = '/login';
        } else {
            showFormMessage(messageDiv, data.message, 'error');
        }
    } catch (err) {
        console.error('Error:', err);
        showFormMessage(messageDiv, 'Error al cambiar email', 'error');
    }
});

// ── Borrar cuenta ─────────────────────────────────────────────────────────────

document.getElementById('deleteUserForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const confirmed = await showConfirm(
        'Esta acción <strong>no se puede deshacer</strong>.<br>Se borrarán todos tus favoritos y datos.',
        'error',
        '¿Borrar tu cuenta?'
    );
    if (!confirmed) return;

    const password   = document.getElementById('deletePassword').value;
    const messageDiv = document.getElementById('deleteUserMessage');

    try {
        const res = await fetch(`${API_URL}/delete-user`, {
            method: 'DELETE',
            headers: authHeaders(),
            body: JSON.stringify({ password })
        });
        const data = await res.json();
        if (res.ok && data.success) {
            await showModal(data.message + '<br>Serás redirigido al inicio.', 'success');
            cerrarSesionLocal();
            window.location.href = '/';
        } else {
            showFormMessage(messageDiv, data.message, 'error');
        }
    } catch (err) {
        console.error('Error:', err);
        showFormMessage(messageDiv, 'Error al borrar cuenta', 'error');
    }
});

// ── Helper mensaje en formulario ──────────────────────────────────────────────

function showFormMessage(element, text, type) {
    element.textContent = text;
    element.className = type === 'success'
        ? 'block mt-4 px-3 py-3 rounded-lg text-center text-sm bg-green-100 text-green-800 border border-green-300'
        : 'block mt-4 px-3 py-3 rounded-lg text-center text-sm bg-red-100 text-red-800 border border-red-300';
    if (type === 'success') {
        setTimeout(() => { element.className = 'hidden'; }, 5000);
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

init();