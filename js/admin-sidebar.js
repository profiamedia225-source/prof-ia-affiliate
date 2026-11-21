
/* ==========================================
   PROF IA MEDIA PARTNERS
   ADMIN SIDEBAR
========================================== */

(async function initAdminSidebar() {

    const container = document.getElementById("sidebar-container");

    if (!container) return;

    try {

        /* CHARGEMENT DU SIDEBAR */
        const response = await fetch("admin-sidebar.html", {
            cache: "force-cache"
        });

        if (!response.ok) {
            throw new Error(
                "Impossible de charger le sidebar : " + response.status
            );
        }

        const sidebarHTML = await response.text();

        container.innerHTML = sidebarHTML;

        /* ======================================
           PAGE ACTIVE
        ====================================== */

        const currentPage = window.location.pathname
            .split("/")
            .pop()
            .replace(".html", "");

        container.querySelectorAll(".sidebar a[data-page]").forEach(link => {

            if (link.dataset.page === currentPage) {
                link.classList.add("active");
            }

        });

        /* ======================================
           DÉCONNEXION
        ====================================== */

        const logoutBtn = document.getElementById("logoutBtn");

        if (logoutBtn) {

            logoutBtn.addEventListener("click", async (e) => {

                e.preventDefault();

                if (!confirm("Voulez-vous vraiment vous déconnecter ?")) {
                    return;
                }

                try {

                    if (!window.sb || !window.sb.auth) {
                        throw new Error("Service d'authentification indisponible.");
                    }

                    const { error } = await window.sb.auth.signOut();

                    if (error) {
                        throw error;
                    }

                    window.location.replace("login.html");

                } catch (error) {

                    console.error("Erreur de déconnexion :", error);

                    alert("Erreur lors de la déconnexion. Veuillez réessayer.");

                }

            });

        }

        /* ======================================
           BADGE DES NOTIFICATIONS
           Chargement indépendant du sidebar
        ====================================== */

        loadNotificationBadge().catch(error => {
            console.error(
                "Erreur lors du chargement des notifications :",
                error
            );
        });

    } catch (error) {

        console.error("Erreur de chargement du sidebar :", error);

        /* Le reste du dashboard reste accessible. */

    }

})();


/* ==========================================
   CHARGEMENT DU BADGE NOTIFICATIONS
========================================== */

async function loadNotificationBadge() {

    const badge = document.getElementById("notificationBadge");

    if (!badge) return;

    if (!window.sb || !window.sb.auth) {
        console.warn("Supabase n'est pas encore disponible.");
        return;
    }

    try {

        const {
            data: { user },
            error: userError
        } = await window.sb.auth.getUser();

        if (userError) {
            throw userError;
        }

        if (!user) {
            badge.style.display = "none";
            return;
        }

        const { count, error } = await window.sb
            .from("notifications")
            .select("*", {
                count: "exact",
                head: true
            })
            .eq("user_id", user.id)
            .eq("is_read", false);

        if (error) {
            throw error;
        }

        if (!count || count === 0) {
            badge.style.display = "none";
            return;
        }

        badge.textContent = count;
        badge.style.display = "flex";

    } catch (error) {

        console.error(
            "Impossible de charger le badge des notifications :",
            error
        );

    }

}
