alert("payment-success.js chargé");

window.addEventListener("DOMContentLoaded", () => {
    alert("DOM chargé");

    const button = document.getElementById("dashboardButton");

    if (!button) {
        alert("Bouton introuvable");
        return;
    }

    button.addEventListener("click", () => {
        alert("Le bouton fonctionne !");
    });
});