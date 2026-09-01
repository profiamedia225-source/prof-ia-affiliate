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

// ==========================================
// ACCÈS AUX FORMATIONS
// ==========================================

document
    .querySelectorAll(".training-access-btn")
    .forEach(button => {

        button.addEventListener(
            "click",
            async () => {

                if (button.disabled) return;

                const originalText =
                    button.textContent;

                button.disabled = true;

                button.textContent =
                    "Préparation de votre accès...";

                try {

                    // ======================================
                    // 1. VÉRIFIER LA SESSION
                    // ======================================

                    const {
                        data: {
                            session
                        },
                        error: sessionError
                    } = await sb.auth.getSession();

                    if (
                        sessionError ||
                        !session
                    ) {

                        console.error(
                            "Session introuvable :",
                            sessionError
                        );

                        alert(
                            "Votre session a expiré. Veuillez vous reconnecter."
                        );

                        window.location.href =
                            "login.html";

                        return;
                    }

                    // ======================================
                    // 2. RÉCUPÉRER LE PRODUIT
                    // ======================================

                    const productCode =
                        button.dataset.productCode;

                    const product =
                        accessibleProducts.find(
                            item =>
                                item.product_code ===
                                productCode
                        );

                    if (!product) {

                        alert(
                            "Accès au produit impossible."
                        );

                        return;
                    }

                    // ======================================
                    // 3. VÉRIFIER LE LIEN
                    // ======================================

                    if (
                        !product.systeme_course_url ||
                        product.systeme_course_url.includes(
                            "TON-LIEN-SYSTEME.IO"
                        )
                    ) {

                        alert(
                            "Le lien de cette formation n'est pas encore configuré."
                        );

                        return;
                    }

                    // ======================================
                    // 4. INFORMER L'UTILISATEUR
                    // ======================================

                    const continueAccess =
                        confirm(
                            "✅ Votre accès à la formation est actif.\n\n" +
                            "Lors de votre première connexion à Systeme.io, " +
                            "utilisez l'adresse e-mail associée à votre compte " +
                            "PROF IA PARTNERS.\n\n" +
                            "Si vous êtes déjà connecté à Systeme.io, " +
                            "vous serez directement dirigé vers votre formation.\n\n" +
                            "Cliquez sur OK pour continuer."
                        );

                    if (!continueAccess) {

                        return;

                    }

                    // ======================================
                    // 5. SYNCHRONISER L'ACCÈS SYSTEME.IO
                    // ======================================

                    button.textContent =
                        "Vérification de votre accès...";

                    console.log(
                        "Synchronisation Systeme.io pour :",
                        product.product_code
                    );

                    const {
                        data: syncResult,
                        error: syncError
                    } = await sb.functions.invoke(
                        "sync-systeme-access",
                        {
                            method: "POST",

                            headers: {
                                Authorization:
                                    `Bearer ${session.access_token}`
                            },

                            body: {}
                        }
                    );

                    if (syncError) {

                        console.error(
                            "Erreur synchronisation Systeme.io :",
                            syncError
                        );

                        alert(
                            "Impossible de préparer votre accès à la formation. Veuillez réessayer."
                        );

                        return;
                    }

                    console.log(
                        "Réponse Systeme.io :",
                        syncResult
                    );

                    // ======================================
                    // 6. VÉRIFIER LE RÉSULTAT
                    // ======================================

                    if (
                        !syncResult ||
                        syncResult.success !== true
                    ) {

                        console.error(
                            "Synchronisation refusée :",
                            syncResult
                        );

                        alert(
                            syncResult?.error ||
                            "Votre accès à la formation n'a pas pu être préparé."
                        );

                        return;
                    }

                    // ======================================
                    // 7. REDIRECTION
                    // ======================================

                    button.textContent =
                        "Ouverture de la formation...";

                    console.log(
                        "✅ Accès Systeme.io validé."
                    );

                    window.location.href =
                        product.systeme_course_url;

                } catch (error) {

                    console.error(
                        "Erreur accès formation :",
                        error
                    );

                    alert(
                        "Une erreur est survenue lors de la préparation de votre accès."
                    );

                } finally {

                    button.disabled = false;

                    button.textContent =
                        originalText;

                }

            }
        );

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
loadOtherProducts();
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

// ==========================================
// AUTRES FORMATIONS
// ==========================================

async function loadOtherProducts() {

    const container =
        document.getElementById("otherProductsContainer");

    if (!container) {
        console.error(
            "Conteneur Autres formations introuvable."
        );
        return;
    }

    container.innerHTML = `
        <p>Chargement des formations...</p>
    `;

    try {

        // ======================================
        // 1. SESSION UTILISATEUR
        // ======================================

        const {
            data: { session },
            error: sessionError
        } = await sb.auth.getSession();

        if (sessionError || !session) {

            console.error(
                "Session introuvable :",
                sessionError
            );

            return;
        }

        const user = session.user;

        // ======================================
        // 2. RÉCUPÉRER LES ACCÈS DU CLIENT
        // ======================================

        const {
            data: accesses,
            error: accessError
        } = await sb
            .from("product_access")
            .select("product_id, status")
            .eq("user_id", user.id)
            .eq("status", "active");

        if (accessError) {

            console.error(
                "Erreur récupération des accès :",
                accessError
            );

            container.innerHTML = `
                <p>
                    Impossible de charger les formations.
                </p>
            `;

            return;
        }

        // Codes des produits déjà achetés
        const ownedProducts =
            (accesses || []).map(
                access => access.product_id
            );

        console.log(
            "✅ Produits déjà possédés :",
            ownedProducts
        );

        // ======================================
        // 3. RÉCUPÉRER TOUS LES PRODUITS ACTIFS
        // ======================================

        const {
            data: products,
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
                status
            `)
            .eq("status", true)
            .order("id", {
                ascending: true
            });

        if (productsError) {

            console.error(
                "Erreur récupération des produits :",
                productsError
            );

            container.innerHTML = `
                <p>
                    Impossible de charger les formations.
                </p>
            `;

            return;
        }

        console.log(
            "✅ Produits actifs :",
            products
        );

        // ======================================
        // 4. RETIRER LES PRODUITS DÉJÀ ACHETÉS
        // ======================================

        const otherProducts =
            (products || []).filter(
                product =>
                    !ownedProducts.includes(
                        product.product_code
                    )
            );

        console.log(
            "🛒 Autres formations :",
            otherProducts
        );

        // ======================================
        // 5. AUCUNE AUTRE FORMATION
        // ======================================

        if (otherProducts.length === 0) {

            container.innerHTML = `
                <div style="
                    padding: 20px;
                    text-align: center;
                    border-radius: 12px;
                    background: #f5f5f5;
                ">
                    <p>
                        🎉 Vous avez accès à toutes nos formations disponibles.
                    </p>
                </div>
            `;

            return;
        }

        // ======================================
        // 6. AFFICHER LES AUTRES FORMATIONS
        // ======================================

        container.innerHTML = "";

        otherProducts.forEach(product => {

            const card =
                document.createElement("div");

            card.style.marginBottom = "15px";
            card.style.padding = "20px";
            card.style.borderRadius = "12px";
            card.style.background = "#f8f8f8";
            card.style.border = "1px solid #e5e5e5";

            const price =
                Number(product.price || 0)
                    .toLocaleString("fr-FR");

            const currency =
                product.currency || "XOF";

            card.innerHTML = `

                <div style="
                    display: flex;
                    align-items: center;
                    gap: 15px;
                    flex-wrap: wrap;
                    justify-content: space-between;
                ">

                    <div style="flex: 1;">

                        <div style="
                            font-size: 30px;
                            margin-bottom: 5px;
                        ">
                            🎓
                        </div>

                        <h3 style="
                            margin: 0 0 8px 0;
                        ">
                            ${product.product_name}
                        </h3>

                        <p style="
                            margin: 0 0 8px 0;
                        ">
                            ${
                                product.description ||
                                "Formation professionnelle disponible."
                            }
                        </p>

                        <strong>
                            ${price} ${currency}
                        </strong>

                    </div>

                    <button
                        class="btn-primary other-product-buy-btn"
                        data-product-code="${product.product_code}"
                    >
                        Acheter
                    </button>

                </div>
            `;

            container.appendChild(card);

        });

        // ======================================
        // 7. BOUTONS ACHETER
        // ======================================

        document
            .querySelectorAll(".other-product-buy-btn")
            .forEach(button => {

                button.addEventListener(
                    "click",
                    () => {

                        const productCode =
                            button.dataset.productCode;

                        if (!productCode) {

                            alert(
                                "Produit non spécifié."
                            );

                            return;
                        }

                        console.log(
                            "🛒 Achat du produit :",
                            productCode
                        );

                        window.location.href =
                            "payment.html?product=" +
                            encodeURIComponent(
                                productCode
                            );

                    }
                );

            });

    } catch (error) {

        console.error(
            "Erreur Autres formations :",
            error
        );

        container.innerHTML = `
            <p>
                Impossible de charger les formations.
            </p>
        `;

    }

}