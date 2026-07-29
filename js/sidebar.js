document.addEventListener("DOMContentLoaded", async () => {

    const container = document.getElementById("sidebar-container");

    if (!container) return;

    const response = await fetch("sidebar.html");

    container.innerHTML = await response.text();

    // ===========================
    // Menu actif
    // ===========================

    const currentPage = window.location.pathname
        .split("/")
        .pop()
        .replace(".html", "");

    document.querySelectorAll(".sidebar a[data-page]").forEach(link => {

        if (link.dataset.page === currentPage) {

            link.classList.add("active");

        }

    });

    // ===========================
    // Déconnexion
    // ===========================

    const logoutBtn = document.getElementById("logoutBtn");

    logoutBtn.addEventListener("click", async (e) => {

        e.preventDefault();

        if (!confirm("Voulez-vous vraiment vous déconnecter ?")) return;

        const { error } = await window.sb.auth.signOut();

        if (error) {

            console.error(error);
            alert("Erreur lors de la déconnexion.");
            return;

        }

        window.location.replace("login.html");

    });

await initSidebarFeatures();

async function loadNotificationBadge() {

    const badge =
        document.getElementById("notificationBadge");

    if (!badge) return;

    const {
        data: { user }
    } = await window.sb.auth.getUser();

    if (!user) return;

    const { count, error } = await window.sb
        .from("notifications")
        .select("*", {
            count: "exact",
            head: true
        })
        .eq("user_id", user.id)
        .eq("is_read", false);

    if (error) {

        console.error(error);
        return;

    }

    if (!count || count === 0) {

        badge.style.display = "none";
        return;

    }

    badge.textContent = count;

    badge.style.display = "flex";

}

async function initSidebarFeatures() {

    await loadNotificationBadge();

}

});