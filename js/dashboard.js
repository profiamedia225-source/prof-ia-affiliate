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

    // ==========================================
// VÉRIFICATION DES DROITS D'ACCÈS
// ==========================================

const {
    data: accesses,
    error: accessError
} = await sb
    .from("product_access")
    .select("id, product_id, status")
    .eq("user_id", user.id)
    .eq("status", "active");

if (accessError) {

    console.error(
        "Erreur vérification des accès :",
        accessError
    );

    alert(
        "Impossible de vérifier vos accès aux produits."
    );

    return;
}

// Aucun produit accessible
if (!accesses || accesses.length === 0) {

    window.location.href =
        "payment.html?product=formation_complete";

    return;
}

console.log(
    "✅ Accès produits :",
    accesses
);

// ==========================================
// CHARGEMENT DES PRODUITS ACCESSIBLES
// ==========================================

const productCodes = accesses.map(
    access => access.product_id
);

const {
    data: accessibleProducts,
    error: productsError
} = await sb
    .from("products")
    .select(`
        id,
        product_name,
        product_code,
        description,
        price,
        currency,
        commission_rate,
        systeme_course_url,
        status
    `)
    .in(
        "product_code",
        productCodes
    )
    .eq(
        "status",
        true
    );

if (productsError) {

    console.error(
        "Erreur chargement produits :",
        productsError
    );

    alert(
        "Impossible de charger vos produits."
    );

    return;
}

console.log(
    "✅ Produits accessibles :",
    accessibleProducts
);

// ==========================================
// AFFICHAGE DES PRODUITS ACCESSIBLES
// ==========================================

const trainingContainer =
    document.getElementById(
        "trainingAccessContainer"
    );

if (!trainingContainer) {

    console.error(
        "Conteneur des formations introuvable."
    );

    return;
}

trainingContainer.innerHTML = "";

accessibleProducts.forEach(product => {

    const card =
        document.createElement("div");

    card.className = "quick-card";

    card.innerHTML = `
        <div class="quick-icon">🎓</div>

        <h3>
            ${product.product_name}
        </h3>

        <p>
            🟢 Accès actif
        </p>

        <button
            class="btn-primary training-access-btn"
            data-product-code="${product.product_code}"
        >
            Accéder à la formation
        </button>
    `;

    trainingContainer.appendChild(card);

});

    // Charger le profil
    const { data: profile, error } = await sb
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

    if (error) {

    console.error(error);

    alert(JSON.stringify(error, null, 2));

    return;

}

    displayProfile(profile);

}

function displayProfile(profile) {

    // Nom en MAJUSCULES
    const fullName = (profile.fullname || "").toUpperCase();

    // En-tête
    document.getElementById("welcome").textContent = fullName;

    // Informations du profil
    document.getElementById("fullname").textContent = fullName;

    document.getElementById("email").textContent =
        profile.email || "-";

    document.getElementById("phone").textContent =
        profile.phone || "-";

    document.getElementById("country").textContent =
        profile.country || "-";

    document.getElementById("affiliateCode").textContent =
        profile.affiliate_code || "-";

    // Lien d'affiliation
    document.getElementById("affiliateLink").value =
        APP_URL + "/?ref=" + profile.affiliate_code;

        document.getElementById("greeting").textContent =
    "Bonjour 👋";

    document.getElementById("qrcode").innerHTML="";

new QRCode(document.getElementById("qrcode"),{

text:APP_URL+"/?ref="+profile.affiliate_code,

width:170,

height:170

});
const options={

weekday:"long",

day:"numeric",

month:"long",

year:"numeric"

};

document.getElementById("todayDate").textContent =
new Date().toLocaleDateString("fr-FR", options);

loadDashboardStats();
}
async function loadDashboardStats() {

    const {
        data: { session }
    } = await sb.auth.getSession();

    if (!session) return;

    const { data, error } = await sb.functions.invoke(
        "dashboard-stats",
        {
            headers: {
                Authorization: `Bearer ${session.access_token}`
            }
        }
    );

    if (error) {

        console.error(error);
        return;

    }

    document.getElementById("referralCount").textContent =
        data.referrals;

    document.getElementById("commissionAmount").textContent =
        Number(data.availableBalance).toLocaleString("fr-FR") + " FCFA";

document.getElementById("pendingWithdrawalAmount").textContent =
    Number(data.pendingWithdrawals).toLocaleString("fr-FR") + " FCFA";

    document.getElementById("salesCount").textContent =
        data.sales;

    // En attendant la gestion des retraits
    document.getElementById("withdrawAmount").textContent =
    Number(data.totalWithdrawals).toLocaleString("fr-FR") + " FCFA";

}