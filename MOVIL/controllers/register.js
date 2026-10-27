const API_URL = "https://unenacted-genoveva-unhidden.ngrok-free.dev";

document.getElementById('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const user_name = document.getElementById('user_name').value;
    const email     = document.getElementById('email').value;
    const password  = document.getElementById('password').value;
    const message   = document.getElementById('message');

    try {
        const res = await fetch(`${API_URL}/crear-usuario`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
            body: JSON.stringify({ user_name, email, password })
        });
        const data = await res.json();
        if (!res.ok) {
            await showModal(data.message, 'error', 'Error al registrarse');
            return;
        }
        message.textContent = 'Registro correcto, ya puedes iniciar sesión';
        message.style.color = 'green';
        setTimeout(() => { window.location.href = './login.html'; }, 1000);
    } catch (err) {
        console.error(err);
        await showModal('Error conectando con el servidor', 'error');
    }
});

document.addEventListener("DOMContentLoaded", async () => {
    const btnVolver = document.getElementById('btn-volver');
    btnVolver.innerHTML = `<a href="./login.html">← Volver</a>`;
});
