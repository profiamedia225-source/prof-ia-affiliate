/*
==========================================================
PROF IA MEDIA PARTNERS
payment.js V4
Partie 1/3
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

    const { data, error } = await sb
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

    const { data, error } = await sb
        .from("products")
        .select("*")
        .eq("status", true)
        .single();

    if (error || !data) {
        stop("Aucun produit actif disponible.");
    }

    currentProduct = data;
    return data;
}

/**
 * Génère une référence de commande.
 */
function generateReference() {

    const now = new Date();

    const yyyy = now.getFullYear();

    const mm = String(now.getMonth() + 1).padStart(2, "0");

    const dd = String(now.getDate()).padStart(2, "0");

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

    if (!currentUser) {
        stop("Utilisateur introuvable.");
    }

    if (!currentProfile) {
        stop("Profil introuvable.");
    }

    if (!currentProduct) {
        stop("Produit introuvable.");
    }

    const orderReference = generateReference();

    const order = {

        user_id: currentUser.id,

        order_reference: orderReference,

        product_id: currentProduct.product_code,

        product_name: currentProduct.product_name,

        amount: currentProduct.price,

        currency: currentProduct.currency,

        payment_provider: "paystack",

        status: "pending",

        customer_email: currentUser.email,

        affiliate_id: currentProfile.affiliate_id ?? null

    };

    const {

        data,

        error

    } = await sb

        .from("orders")

        .insert(order)

        .select()

        .single();

    if (error || !data) {

        console.error(error);

        stop("Impossible de créer la commande.");

    }

    return data;

}
/*
==========================================================
PARTIE 3/3
Initialisation Paystack
==========================================================
*/

async function preparePayment() {

    const button = document.getElementById("payButton");

    try {

        button.disabled = true;
        button.textContent = "Initialisation...";

        await loadUser();

        await loadProfile(currentUser.id);

        await loadProduct();

        const order = await createOrder();

        const {
            data: { session },
            error: sessionError
        } = await client.auth.getSession();

        if (sessionError || !session) {
            stop("Session utilisateur introuvable.");
        }

        console.log("API_URL =", API_URL);
        const response = await fetch(
            `${API_URL}/functions/v1/initialize-payment`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${session.access_token}`
                },
                body: JSON.stringify({
                    orderId: order.id
                })
            }
        );

        const result = await response.json();

        if (!response.ok) {

            console.error(result);

            stop(
                result.error ||
                "Erreur lors de l'initialisation du paiement."
            );
        }

        if (!result.authorization_url) {
            stop("Lien de paiement Paystack introuvable.");
        }

        window.location.href = result.authorization_url;

    } catch (err) {

        console.error(err);

        alert(
            err.message ||
            "Une erreur est survenue."
        );

        button.disabled = false;
        button.textContent = "PAYER MAINTENANT";
    }
}

/*
==========================================================
Initialisation
==========================================================
*/

window.addEventListener("DOMContentLoaded", () => {

    const button = document.getElementById("payButton");

    if (!button) {
        console.error("Bouton payButton introuvable.");
        return;
    }

    console.log("✅ payment.js V4 chargé.");

});