import { loadHeader,loadFooter } from "./views/partials/partials.js";
import { verificarSesion } from "./utils/common.js";

function setupEvents() {
    const form = document.getElementById("searchForm");

    if (form) {
        form.addEventListener("submit", (e) => {
            e.preventDefault();
            console.log("Buscar juegos...");
        });
    }

    const clearBtn = document.getElementById("clearBtn");

    if (clearBtn) {
        clearBtn.addEventListener("click", () => {
            document.getElementById("searchForm").reset();
        });
    }
}

document.addEventListener("DOMContentLoaded", async () => {
    console.log("App iniciada");
    await loadHeader();
    await loadFooter();
    await verificarSesion();
});