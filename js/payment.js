
/*
==========================================================
PROF IA MEDIA PARTNERS
payment.js - Paiement Jèko
==========================================================
*/

const client = window.sb;
const API_URL = window.SUPABASE_URL;

let currentUser = null;
let currentProfile = null;
let currentProduct = null;

function fail(message) {
    throw new Error(message);
}

async function loadUser() {
    const {
        data: { user },
        error
    } = await client.auth.getUser();

    if (error || !user) {
        fail("Votre session a expiré. Veuillez vous reconnecter.");
    }

    currentUser = user;
    return user;
}

async function loadProfile(userId) {
    const { data, error } = await client
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

    if (error || !data) {
        console.error("Erreur profil :", error);
        fail("Impossible de charger votre profil.");
    }

    currentProfile = data;
    return data;
}

async function loadProduct() {
    const params = new URLSearchParams(window.location.search);
    const productCode = params.get("product");

    if (!productCode) {
        fail("Produit non spécifié.");
    }

    const { data, error } = await client
        .from("products")
        .select("*")
        .eq("product_code", productCode)
        .eq("status", true)
        .maybeSingle();

    if (error || !data) {
        console.error("Erreur produit :", error);
        fail("Produit introuvable ou inactif.");
    }

    currentProduct = data;

    document.getElementById("productName").textContent =
        data.product_name;

    document.getElementById("productPrice").textContent =
        Number(data.price).toLocaleString("fr-FR") +
        " " + (data.currency || "XOF");

    return data;
}

function generateReference() {
    const date = new Date();
    const stamp =
        date.getFullYear().toString() +
        String(date.getMonth() + 1).padStart(2, "0") +
        String(date.getDate()).padStart(2, "0");

    const random = crypto.randomUUID()
        .replaceAll("-", "")
        .substring(0, 12)
        .toUpperCase();

    return `PIM-ORD-${stamp}-${random}`;
}

async function createOrder() {
    const affiliateId =
        currentProfile.referred_by &&
        currentProfile.referred_by !== currentUser.id
            ? currentProfile.referred_by
            : null;

    const order = {
        user_id: currentUser.id,
        order_reference: generateReference(),
        product_id: currentProduct.product_code,
        product_name: currentProduct.product_name,
        amount: currentProduct.price,
        currency: currentProduct.currency || "XOF",
        payment_provider: "jeko",
        status: "pending",
        customer_email: currentUser.email,
        affiliate_id: affiliateId
    };

    const { data, error } = await client
        .from("orders")
        .insert(order)
        .select()
        .single();

    if (error || !data) {
        console.error("Erreur création commande :", error);
        fail("Impossible de créer la commande.");
    }

    return data;
}

async function preparePayment() {
    const button = document.getElementById("payButton");
    const methodSelect = document.getElementById("paymentMethod");

    if (!button || !methodSelect) {
        alert("Éléments de paiement introuvables sur cette page.");
        return;
    }

    const paymentMethod = methodSelect.value.trim().toLowerCase();

    const allowedMethods = [
        "wave",
        "orange",
        "mtn",
        "moov",
        "djamo"
    ];

    if (!allowedMethods.includes(paymentMethod)) {
        alert("Veuillez sélectionner un moyen de paiement valide.");
        methodSelect.focus();
        return;
    }

    try {
        button.disabled = true;
        button.textContent = "Initialisation du paiement...";

        if (!client || !API_URL || !window.SUPABASE_ANON_KEY) {
            fail("Configuration Supabase introuvable.");
        }

        await loadUser();
        await loadProfile(currentUser.id);
        await loadProduct();

        const order = await createOrder();

        const {
            data: { session },
            error: sessionError
        } = await client.auth.getSession();

        if (sessionError || !session) {
            fail("Session utilisateur introuvable. Veuillez vous reconnecter.");
        }

        const response = await fetch(
            `${API_URL}/functions/v1/create-jeko-payment`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${session.access_token}`,
                    "apikey": window.SUPABASE_ANON_KEY
                },
                body: JSON.stringify({
                    orderId: order.id,
                    paymentMethod
                })
            }
        );

        const responseText = await response.text();
        let result = {};

        try {
            result = responseText ? JSON.parse(responseText) : {};
        } catch {
            console.error("Réponse serveur non JSON :", responseText);
            fail("Réponse invalide du serveur de paiement.");
        }

        if (!response.ok || !result.success) {
            console.error("Erreur Jèko :", response.status, result);
            fail(
                result.message ||
                `Jèko n'a pas pu créer le paiement (HTTP ${response.status}).`
            );
        }

        const redirectUrl =
            result.redirectUrl ||
            result.redirect_url ||
            result.data?.redirectUrl ||
            result.data?.redirect_url;

        if (
            typeof redirectUrl !== "string" ||
            !redirectUrl.startsWith("https://")
        ) {
            console.error("Lien Jèko invalide :", result);
            fail("Lien de paiement Jèko introuvable.");
        }

        // Redirection unique vers la page hébergée Jèko.
        window.location.assign(redirectUrl);

    } catch (error) {
        console.error("Erreur paiement :", error);

        alert(
            error instanceof Error
                ? error.message
                : "Une erreur est survenue pendant le paiement."
        );

        button.disabled = false;
        button.textContent = "PAYER MAINTENANT";
    }
}

window.addEventListener("DOMContentLoaded", () => {
    const button = document.getElementById("payButton");

    if (!button) {
        console.error("Bouton payButton introuvable.");
        return;
    }

    console.log("payment.js Jèko chargé.");
});
