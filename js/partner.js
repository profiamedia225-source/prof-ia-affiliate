/*
==========================================
PROF IA MEDIA PARTNERS
partner.js
Version 1
==========================================
*/

// Recherche un affilié grâce à son code
async function findAffiliateByCode(referralCode) {

    if (!referralCode) {
        return null;
    }

    const { data, error } = await sb
        .from("profiles")
        .select("*")
        .eq("affiliate_code", referralCode)
        .maybeSingle();

    if (error) {
        console.error("Erreur recherche affilié :", error);
        return null;
    }

    return data;

}

// Retourne l'affilié enregistré dans le navigateur
async function getCurrentReferrer() {

    const referralCode = getReferralCode();

    if (!referralCode) {
        return null;
    }

    return await findAffiliateByCode(referralCode);

}

window.findAffiliateByCode = findAffiliateByCode;
window.getCurrentReferrer = getCurrentReferrer;