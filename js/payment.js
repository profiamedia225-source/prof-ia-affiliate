
/*
==========================================================
PROF IA MEDIA PARTNERS
payment.js V5
Transmission du moyen de paiement Jèko
==========================================================
*/

const client = window.sb;
const API_URL = window.SUPABASE_URL;

let currentUser = null;
let currentProfile = null;
let currentProduct = null;


/**
 * Affiche un message puis stoppe l'exécution.
 */
function stop(message) {
    alert(message);
    throw new Error(message);
}


/**
 * Charge l'utilisateur connecté.
 */
async function loadUser() {

    const {
        data: { user },
        error
    } = await client.auth.getUser();

    if (error || !user) {
        stop("Votre session a expiré. Veuillez vous reconnecter.");
    }

    currentUser = user;

    return user;
}


/**
 * Charge le profil.
 */
async function loadProfile(userId) {

    const { data, error } = await client
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

    if (error || !data) {
        stop("Impossible de charger votre profil.");
    }

    currentProfile = data;

    return data;
}


/**
 * Charge le produit actif.
 */
async function loadProduct() {

    const params = new URLSearchParams(
        window.location.search
    );

    const productCode = params.get("product");

    if (!productCode) {

        console.error(
            "Code produit manquant dans l'URL."
        );

        throw new Error("Produit non spécifié.");
    }

    console.log(
        "Produit demandé :",
        productCode
    );

    const {
        data,
        error
    } = await client
        .from("products")
        .select("*")
        .eq("product_code", productCode)
        .eq("status", true)
        .maybeSingle();

    if (error) {

        console.error(
            "Erreur chargement produit :",
            error
        );

        throw error;
    }

    if (!data) {

        console.error(
            "Produit introuvable ou inactif :",
            productCode
        );

        throw new Error(
            "Produit introuvable ou inactif."
        );
    }

    currentProduct = data;

    console.log(
        "Produit chargé :",
        currentProduct
    );

    document.getElementById(
        "productName"
    ).textContent = currentProduct.product_name;

    document.getElementById(
        "productPrice"
    ).textContent =
        Number(
            currentProduct.price
        ).toLocaleString("fr-FR")
        + " "
        + currentProduct.currency;
}


/**
 * Génère une référence de commande.
 */
function generateReference() {

    const now = new Date();

    const yyyy = now.getFullYear();

    const mm = String(
        now.getMonth() + 1
    ).padStart(2, "0");

    const dd = String(
        now.getDate()
    ).padStart(2, "0");

    const random = Math.floor(
        100000 + Math.random() * 900000
    );

    return `PIM-ORD-${yyyy}${mm}${dd}-${random}`;
}


/*
==========================================================
PARTIE 2/3
Création de la commande
==========================================================
*/


/**
 * Crée une nouvelle commande dans Supabase.
 */
async function createOrder() {

    // VÉRIFICATIONS
    if (!currentUser) {
        stop("Utilisateur introuvable.");
    }

    if (!currentProfile) {
        stop("Profil introuvable.");
    }

    if (!currentProduct) {
        stop("Produit introuvable.");
    }

    // RÉFÉRENCE DE COMMANDE
    const orderReference = generateReference();

    // PARRAIN
    const affiliateId =
        currentProfile.referred_by &&
        currentProfile.referred_by !== currentUser.id
            ? currentProfile.referred_by
            : null;

    console.log(
        "👤 Utilisateur :",
        currentUser.id
    );

    console.log(
        "👤 Email :",
        currentUser.email
    );

    console.log(
        "🤝 Parrain :",
        affiliateId
    );

    console.log(
        "🎓 Produit :",
        currentProduct.product_code
    );

    // OBJET COMMANDE
    const order = {

        user_id: currentUser.id,

        order_reference: orderReference,

        product_id: currentProduct.product_code,

        product_name: currentProduct.product_name,

        amount: currentProduct.price,

        currency: currentProduct.currency,

        payment_provider: "jeko",

        status: "pending",

        customer_email: currentUser.email,

        affiliate_id: affiliateId

    };

    console.log(
        "📦 Commande à créer :",
        order
    );

    // INSERTION
    const {
        data,
        error
    } = await client
        .from("orders")
        .insert(order)
        .select()
        .single();

    // ERREUR
    if (error || !data) {

        console.error(
            "❌ Erreur création commande :",
            error
        );

        stop("Impossible de créer la commande.");
    }

    // SUCCÈS
    console.log(
        "✅ Commande créée :",
        data
    );

    return data;
}


/*
==========================================================
PARTIE 3/3
Initialisation du paiement Jèko
==========================================================
*/


async function preparePayment() {

    const button = document.getElementById("payButton");

    const methodSelect = document.getElementById("paymentMethod");

    // VÉRIFIER LE MOYEN DE PAIEMENT
    const paymentMethod = methodSelect?.value
        ?.trim()
        .toLowerCase();

    const supportedMethods = [
        "wave",
        "orange",
        "mtn",
        "moov",
        "djamo"
    ];

    if (
        !paymentMethod ||
        !supportedMethods.includes(paymentMethod)
    ) {

        alert(
            "Veuillez sélectionner un moyen de paiement valide."
        );

        methodSelect?.focus();

        return;
    }

    try {

        button.disabled = true;

        button.textContent =
            "Initialisation du paiement...";

        // 1. CHARGER LES INFORMATIONS NÉCESSAIRES
        await loadUser();

        await loadProfile(currentUser.id);

        await loadProduct();

        // 2. CRÉER LA COMMANDE DANS SUPABASE
        const order = await createOrder();

        // 3. RÉCUPÉRER LA SESSION UTILISATEUR
        const {
            data: { session },
            error: sessionError
        } = await client.auth.getSession();

        if (sessionError || !session) {

            stop(
                "Session utilisateur introuvable. Veuillez vous reconnecter."
            );
        }

        // 4. ENVOYER LA COMMANDE ET LE MOYEN DE PAIEMENT À JÈKO
        const response = await fetch(
            `${API_URL}/functions/v1/create-jeko-payment`,
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json",

                    "Authorization":
                        `Bearer ${session.access_token}`,

                    "apikey":
                        window.SUPABASE_ANON_KEY
                },

                body: JSON.stringify({

                    orderId: order.id,

                    paymentMethod: paymentMethod

                })
            }
        );

        // 5. LIRE LA RÉPONSE DU SERVEUR
        const responseText = await response.text();

        let result = {};

        try {

            result = responseText
                ? JSON.parse(responseText)
                : {};

        } catch {

            console.error(
                "Réponse non JSON de create-jeko-payment :",
                responseText
            );

            stop(
                "Réponse invalide du serveur de paiement. Consultez les logs Supabase."
            );
        }

        // 6. VÉRIFIER LE RÉSULTAT
        if (!response.ok || !result.success) {

            console.error(
                "Erreur paiement Jèko :",
                {
                    httpStatus: response.status,
                    response: result
                }
            );

            stop(
                result.message ||
                result.error ||
                `Jèko n'a pas pu créer le paiement (HTTP ${response.status}).`
            );
        }

        // 7. RÉCUPÉRER LE LIEN DE PAIEMENT
        const redirectUrl =
            result.redirectUrl ||
            result.redirect_url ||
            result.data?.redirectUrl ||
            result.data?.redirect_url;

        if (
            typeof redirectUrl !== "string" ||
            !redirectUrl.startsWith("https://")
        ) {

            console.error(
                "URL de redirection Jèko absente ou invalide :",
                result
            );

            stop(
                "Lien de paiement Jèko introuvable ou invalide."
            );
        }

        // 8. REDIRIGER LE CLIENT VERS JÈKO
        window.location.assign(redirectUrl);

    } catch (err) {

        console.error(
            "Erreur paiement :",
            err
        );

        button.disabled = false;

        button.textContent = "PAYER MAINTENANT";
    }
}


/*
==========================================================
INITIALISATION
==========================================================
*/

window.addEventListener(
    "DOMContentLoaded",
    () => {

        const button = document.getElementById("payButton");

        if (!button) {

            console.error(
                "Bouton payButton introuvable."
            );

            return;
        }

        console.log(
            "✅ payment.js V5 chargé."
        );

    }
);
