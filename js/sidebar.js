
document.addEventListener("DOMContentLoaded", async () => {

    const container = document.getElementById("sidebar-container");

    if (!container) return;

    try {

        // CHARGEMENT DU MENU EXISTANT
        const response = await fetch("sidebar.html");

        if (!response.ok) {
            throw new Error("Impossible de charger la sidebar.");
        }

        container.innerHTML = await response.text();

        const sidebar = container.querySelector(".sidebar");

        if (!sidebar) return;

        // ==================================
        // CREATION DU BOUTON HAMBURGER
        // ==================================

        const toggle = document.createElement("button");

        toggle.type = "button";
        toggle.className = "sidebar-toggle";
        toggle.setAttribute("aria-label", "Ouvrir le menu");
        toggle.setAttribute("aria-expanded", "false");
        toggle.setAttribute("aria-controls", "main-sidebar");

        toggle.innerHTML = `
            <span></span>
            <span></span>
            <span></span>
        `;

        sidebar.id = "main-sidebar";

        container.insertBefore(toggle, sidebar);

        // ==================================
        // CREATION DU FOND SOMBRE
        // ==================================

        const overlay = document.createElement("div");

        overlay.className = "sidebar-overlay";

        overlay.setAttribute("aria-hidden", "true");

        container.appendChild(overlay);

        // ==================================
        // OUVERTURE / FERMETURE DU MENU
        // ==================================

        function openSidebar() {

            sidebar.classList.add("is-open");

            overlay.classList.add("is-visible");

            toggle.classList.add("is-open");

            document.body.classList.add("sidebar-open");

            toggle.setAttribute("aria-expanded", "true");

            toggle.setAttribute("aria-label", "Fermer le menu");

        }

        function closeSidebar() {

            sidebar.classList.remove("is-open");

            overlay.classList.remove("is-visible");

            toggle.classList.remove("is-open");

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

        // FERMETURE EN CLIQUANT SUR LE FOND

        overlay.addEventListener("click", closeSidebar);

        // FERMETURE AVEC LA TOUCHE ECHAP

        document.addEventListener("keydown", (event) => {

            if (event.key === "Escape") {
                closeSidebar();
            }

        });

        // FERMETURE APRES SELECTION D'UNE RUBRIQUE

        sidebar.querySelectorAll("a[data-page]").forEach(link => {

            link.addEventListener("click", () => {

                closeSidebar();

            });

        });

        // FERMETURE SI ON PASSE EN MODE ORDINATEUR

        window.addEventListener("resize", () => {

            if (window.innerWidth > 768) {
                closeSidebar();
            }

        });

        // ==================================
        // IDENTIFICATION DE LA PAGE ACTIVE
        // ==================================

        const currentPage = window.location.pathname
            .split("/")
            .pop()
            .replace(".html", "");

        sidebar.querySelectorAll("a[data-page]").forEach(link => {

            if (link.dataset.page === currentPage) {

                link.classList.add("active");

            }

        });

        // ==================================
        // DECONNEXION
        // ==================================

        const logoutBtn = document.getElementById("logoutBtn");

        if (logoutBtn) {

            logoutBtn.addEventListener("click", async (e) => {

                e.preventDefault();

                if (!confirm("Voulez-vous vraiment vous déconnecter ?")) {
                    return;
                }

                const { error } = await window.sb.auth.signOut();

                if (error) {

                    console.error(error);

                    alert("Erreur lors de la déconnexion.");

                    return;

                }

                window.location.replace("login.html");

            });

        }

        // ==================================
        // NOTIFICATIONS SUPABASE
        // ==================================

        async function loadNotificationBadge() {

            const badge = document.getElementById("notificationBadge");

            if (!badge || !window.sb) return;

            const {
                data: { user },
                error: userError
            } = await window.sb.auth.getUser();

            if (userError || !user) return;

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

        await loadNotificationBadge();

    } catch (error) {

        console.error("Erreur sidebar :", error);

    }

});
