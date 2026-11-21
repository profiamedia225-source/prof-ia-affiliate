
/* ==========================================
   PROF IA MEDIA PARTNERS
   ADMIN SIDEBAR RESPONSIVE
========================================== */

(async function initAdminSidebar() {

    const container = document.getElementById("sidebar-container");

    if (!container) return;

    try {

        const response = await fetch("admin-sidebar.html");

        if (!response.ok) {
            throw new Error("Erreur HTTP : " + response.status);
        }

        const sidebarHTML = await response.text();

        container.innerHTML = sidebarHTML;

        const sidebar = document.getElementById("adminSidebar");
        const toggle = document.getElementById("adminSidebarToggle");
        const overlay = document.getElementById("adminSidebarOverlay");

        if (!sidebar || !toggle || !overlay) {
            throw new Error("Éléments du menu administrateur introuvables.");
        }

        /* ======================================
           OUVERTURE ET FERMETURE DU MENU
        ====================================== */

        function openSidebar() {
            sidebar.classList.add("is-open");
            toggle.classList.add("is-open");
            overlay.classList.add("is-visible");
            document.body.classList.add("sidebar-open");

            toggle.setAttribute("aria-expanded", "true");
            toggle.setAttribute("aria-label", "Fermer le menu");
        }

        function closeSidebar() {
            sidebar.classList.remove("is-open");
            toggle.classList.remove("is-open");
            overlay.classList.remove("is-visible");
            document.body.classList.remove("sidebar-open");

            toggle.setAttribute("aria-expanded", "false");
            toggle.setAttribute("aria-label", "Ouvrir le menu");
        }

        toggle.addEventListener("click", () => {
            if (sidebar.classList.contains("is-open")) {
                closeSidebar();
            } else {
                openSidebar();
            }
        });

        overlay.addEventListener("click", closeSidebar);

        document.addEventListener("keydown", (event) => {
            if (event.key === "Escape") {
                closeSidebar();
            }
        });

        /* Fermer le menu après sélection d'une page */
        sidebar.querySelectorAll("a").forEach(link => {
            link.addEventListener("click", () => {
                if (window.innerWidth <= 768) {
                    closeSidebar();
                }
            });
        });

        /* Réinitialiser l'état si l'écran redevient large */
        window.addEventListener("resize", () => {
            if (window.innerWidth > 768) {
                closeSidebar();
            }
        });

        /* ======================================
           PAGE ACTIVE
        ====================================== */

        const currentPage = window.location.pathname
            .split("/")
            .pop()
            .replace(".html", "");

        sidebar.querySelectorAll("a[data-page]").forEach(link => {
            if (link.dataset.page === currentPage) {
                link.classList.add("active");
            }
        });

        /* ======================================
           DÉCONNEXION
        ====================================== */

        const logoutBtn = document.getElementById("logoutBtn");

        if (logoutBtn) {

            logoutBtn.addEventListener("click", async (event) => {

                event.preventDefault();

                if (!confirm("Voulez-vous vraiment vous déconnecter ?")) {
                    return;
                }

                try {

                    if (!window.sb || !window.sb.auth) {
                        throw new Error("Service Supabase indisponible.");
                    }

                    const { error } = await window.sb.auth.signOut();

                    if (error) throw error;

                    window.location.replace("login.html");

                } catch (error) {

                    console.error("Erreur de déconnexion :", error);

                    alert("Impossible de vous déconnecter. Veuillez réessayer.");

                }

            });

        }

        /* ======================================
           BADGE NOTIFICATIONS
        ====================================== */

        loadNotificationBadge().catch(error => {
            console.error("Erreur badge notifications :", error);
        });

    } catch (error) {

        console.error("Erreur de chargement du sidebar :", error);

    }

})();


/* ==========================================
   BADGE DES NOTIFICATIONS
========================================== */

async function loadNotificationBadge() {

    const badge = document.getElementById("notificationBadge");

    if (!badge) return;

    if (!window.sb || !window.sb.auth) return;

    try {

        const {
            data: { user },
            error: userError
        } = await window.sb.auth.getUser();

        if (userError) throw userError;

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

        if (error) throw error;

        if (!count) {
            badge.style.display = "none";
            return;
        }

        badge.textContent = count;
        badge.style.display = "flex";

    } catch (error) {

        console.error("Impossible de charger les notifications :", error);

    }

}
