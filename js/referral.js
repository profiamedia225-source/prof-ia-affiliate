/*
==========================================
PROF IA MEDIA PARTNERS
referral.js
Version 2
==========================================
*/

// Détection du code affilié
(function () {

    const params = new URLSearchParams(window.location.search);

    const ref = params.get("ref");

    if (ref) {

        localStorage.setItem("affiliate_ref", ref);

        console.log("✅ Code affilié enregistré :", ref);

    }

})();

// Retourne le code affilié
function getReferralCode() {

    return localStorage.getItem("affiliate_ref");

}

// Vérifie si un code existe
function hasReferralCode() {

    return localStorage.getItem("affiliate_ref") !== null;

}

// Supprime le code
function clearReferralCode() {

    localStorage.removeItem("affiliate_ref");

    console.log("Code affilié supprimé.");

}

// Affiche le code actuellement enregistré
function showReferralCode() {

    console.log(
        "Code enregistré :",
        localStorage.getItem("affiliate_ref")
    );

}

window.getReferralCode = getReferralCode;
window.hasReferralCode = hasReferralCode;
window.clearReferralCode = clearReferralCode;
window.showReferralCode = showReferralCode;