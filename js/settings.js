/*
==========================================
PROF IA MEDIA PARTNERS
settings.js
==========================================
*/

document.addEventListener("DOMContentLoaded", async () => {

    try {

        // Vérifier l'utilisateur connecté
        const {
            data: { user },
            error: authError
        } = await sb.auth.getUser();

        if (authError || !user) {
            window.location.href = "login.html";
            return;
        }

        // Charger les paramètres du profil
        const { data, error } = await sb
            .from("profiles")
            .select(`
                theme,
                email_notifications,
                commission_notifications,
                referral_notifications
            `)
            .eq("id", user.id)
            .single();

        if (error) {
            console.error("Erreur chargement paramètres :", error);
            alert("Impossible de charger vos paramètres.");
            return;
        }

        // Remplissage des champs
    
        document.getElementById("theme").value =
            data.theme || "light";

        document.getElementById("email_notifications").checked =
            data.email_notifications ?? true;

        document.getElementById("commission_notifications").checked =
            data.commission_notifications ?? true;

        document.getElementById("referral_notifications").checked =
            data.referral_notifications ?? true;

        // Bouton Enregistrer
        document
            .getElementById("saveSettingsBtn")
            .addEventListener("click", async () => {

                const settings = {


                    theme:
                        document.getElementById("theme").value,

                    email_notifications:
                        document.getElementById("email_notifications").checked,

                    commission_notifications:
                        document.getElementById("commission_notifications").checked,

                    referral_notifications:
                        document.getElementById("referral_notifications").checked

                };
                                // Sauvegarder dans Supabase
                const { error: updateError } = await sb
                    .from("profiles")
                    .update(settings)
                    .eq("id", user.id);

                if (updateError) {

                    console.error(
                        "Erreur sauvegarde :",
                        updateError
                    );

                    alert(
                        "Impossible d'enregistrer les paramètres."
                    );

                    return;
                }

               // Appliquer immédiatement le thème
applyTheme(settings.theme);

                alert(
                    "✅ Paramètres enregistrés avec succès."
                );

            });

    } catch (err) {

        console.error(err);

        alert(
            "Une erreur inattendue est survenue."
        );

    }

});