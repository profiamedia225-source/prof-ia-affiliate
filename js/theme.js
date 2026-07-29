/*
==========================================
PROF IA MEDIA PARTNERS
theme.js
==========================================
*/

(async function () {

    try {

        // Vérifier si l'utilisateur est connecté
        const {
            data: { user }
        } = await sb.auth.getUser();

        if (!user) return;

        // Lire le thème enregistré
        const { data, error } = await sb
            .from("profiles")
            .select("theme")
            .eq("id", user.id)
            .single();

        if (error || !data) return;

        applyTheme(data.theme);

    } catch (err) {

        console.error("Erreur thème :", err);

    }

})();

/* ================================ */

function applyTheme(theme) {

    document.body.classList.remove("dark-theme");

    switch (theme) {

        case "dark":

            document.body.classList.add("dark-theme");
            break;

        case "system":

            const prefersDark = window.matchMedia(
                "(prefers-color-scheme: dark)"
            ).matches;

            if (prefersDark) {
                document.body.classList.add("dark-theme");
            }

            break;

        default:
            // thème clair
            break;
    }

}