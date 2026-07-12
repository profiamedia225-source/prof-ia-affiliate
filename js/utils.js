/*
==========================================
PROF IA MEDIA PARTNERS
Version : 1.0
Fichier : utils.js
Rôle : Fonctions communes
==========================================
*/

function formatMoney(amount) {

    return Number(amount || 0).toLocaleString(
        "fr-FR"
    ) + " FCFA";

}

function formatDate(date) {

    if (!date) return "";

    return new Date(date).toLocaleDateString("fr-FR");

}

async function copyAffiliateLink() {

    const input =
        document.getElementById("affiliateLink");

    if (!input) return;

    try {

        await navigator.clipboard.writeText(input.value);

        alert("Lien d'affiliation copié.");

    } catch (err) {

        console.error(err);

        alert("Impossible de copier le lien.");

    }

}

function generateAffiliateLink(code) {

    return `${window.location.origin}/?ref=${code}`;

}