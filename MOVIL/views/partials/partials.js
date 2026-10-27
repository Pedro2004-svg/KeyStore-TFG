export async function loadHeader() {
    try {
        const res = await fetch("/views/partials/header.html");
        const html = await res.text();

        document.getElementById("header").innerHTML = html;
    } catch (error) {
        console.error("Error cargando header:", error);
    }
}

export async function loadFooter() {
    try {
        const res = await fetch("/views/partials/footer.html");
        const html = await res.text();

        document.getElementById("footer").innerHTML = html;
    } catch (error) {
        console.error("Error cargando footer:", error);
    }
}

document.addEventListener("DOMContentLoaded", async () => {
    console.log("Insertando los partials");

    await loadHeader();   // carga el header
    await loadFooter();   // carga el footer
});