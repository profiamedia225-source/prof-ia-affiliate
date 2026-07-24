async function loadSidebar() {

    console.log("Chargement de la Sidebar...");

    const container = document.getElementById("sidebar");

    if (!container) {

        console.log("Aucun conteneur sidebar trouvé.");

        return;

    }

    const response = await fetch("components/sidebar.html");

    const html = await response.text();

    container.innerHTML = html;

    console.log("Sidebar chargée avec succès.");

}

window.loadSidebar = loadSidebar;