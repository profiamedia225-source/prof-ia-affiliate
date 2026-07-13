/*
==========================================
PROF IA MEDIA PARTNERS
clicks.js
Version 1
==========================================
*/

// Enregistre un clic d'affiliation
async function registerClick() {

    try {

        // Recherche l'affilié actuel
        const partner = await getCurrentReferrer();

        if (!partner) {

            console.log("Aucun affilié trouvé.");

            return;

        }

        // Pays (sera amélioré plus tard)
        const country = navigator.language || "Inconnu";

        // Navigateur
        const userAgent = navigator.userAgent;

        // Adresse IP (sera remplacée plus tard par une vraie IP)
        const ip = "LOCAL";

        const { error } = await sb
            .from("clicks")
            .insert({

                affiliate_id: partner.id,

                ip: ip,

                country: country,

                user_agent: userAgent

            });

        if (error) {

            console.error(error);

            return;

        }

        console.log("✅ Clic enregistré.");

    }

    catch (err) {

        console.error(err);

    }

}

window.registerClick = registerClick;