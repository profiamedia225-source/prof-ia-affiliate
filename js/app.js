console.log("app.js chargé avec succès");

// Charger le fichier sidebar.js
const script = document.createElement("script");
script.src = "js/components/sidebar.js";

script.onload = () => {

    console.log("sidebar.js chargé");

    loadSidebar();

};

document.body.appendChild(script);