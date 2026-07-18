/*
==========================================
PROF IA MEDIA PARTNERS
Version : 1.0
Fichier : dashboard.js
Rôle : Tableau de bord
==========================================
*/

document.addEventListener("DOMContentLoaded", initDashboard);

async function initDashboard() {

    // Vérifier la session
    const {
        data: { session }
    } = await sb.auth.getSession();

    if (!session) {

        window.location.href = "login.html";
        return;

    }

    const user = session.user;

    // Vérifier le paiement
    const { data: order, error: orderError } = await sb
        .from("orders")
        .select("status")
        .eq("user_id", user.id)
        .eq("status", "paid")
        .maybeSingle();

    if (orderError) {

        console.error(orderError);

        alert("Impossible de vérifier votre paiement.");

        return;

    }

    // Aucun paiement validé
    if (!order) {

        window.location.href = "payment.html";
        return;

    }

    // Charger le profil
    const { data: profile, error } = await sb
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

    if (error) {

        console.error(error);

        alert("Impossible de charger votre profil.");

        return;

    }

    displayProfile(profile);

}

function displayProfile(profile) {

    // Bienvenue
    document.getElementById("welcome").textContent =
        "Bienvenue " + profile.fullname;

    // Informations
    document.getElementById("fullname").textContent =
        profile.fullname;

    document.getElementById("email").textContent =
        profile.email;

    document.getElementById("phone").textContent =
        profile.phone;

    document.getElementById("country").textContent =
        profile.country;

    document.getElementById("affiliateCode").textContent =
        profile.affiliate_code;

    document.getElementById("affiliateLink").value =
    APP_URL + "/?ref=" + profile.affiliate_code;

    // Statistiques provisoires
    document.getElementById("commissionAmount").textContent =
        "0 FCFA";

    document.getElementById("referralCount").textContent =
        "0";

    document.getElementById("salesCount").textContent =
        "0";

    document.getElementById("withdrawAmount").textContent =
        "0 FCFA";

}