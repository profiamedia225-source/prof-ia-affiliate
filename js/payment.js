/*
====================================================
PROF IA MEDIA PARTNERS
PAYMENT.JS V3
Paiement sécurisé via Edge Function Supabase
====================================================
*/

import { sb } from "./config.js";

/*
----------------------------------------------------
Création d'une référence unique
----------------------------------------------------
*/
function generateOrderReference() {

    const date = new Date();

    return (
        "PIM-ORD-" +
        date.getFullYear() +
        (date.getMonth() + 1)
            .toString()
            .padStart(2, "0") +
        date
            .getDate()
            .toString()
            .padStart(2, "0") +
        "-" +
        Math.random()
            .toString(36)
            .substring(2, 8)
            .toUpperCase()
    );

}

/*
----------------------------------------------------
Chargement du produit
----------------------------------------------------
*/

async function loadProduct() {

    const { data, error } = await sb
        .from("products")
        .select("*")
        .eq("is_active", true)
        .single();

    if (error) {

        console.error(error);

        return null;

    }

    return data;

}
/*
----------------------------------------------------
Création de la commande
----------------------------------------------------
*/

async function createOrder() {

    // Utilisateur connecté
    const {
        data: { user }
    } = await sb.auth.getUser();

    if (!user) {
        alert("Utilisateur non connecté.");
        return null;
    }

    // Profil utilisateur
    const {
        data: profile
    } = await sb
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

    if (!profile) {
        alert("Profil introuvable.");
        return null;
    }

    // Produit
    const product = await loadProduct();

    if (!product) {
        alert("Produit introuvable.");
        return null;
    }

    // Référence
    const orderReference = generateOrderReference();

    // Création de la commande
    const { data, error } = await sb
        .from("orders")
        .insert({
            order_reference: orderReference,
            user_id: user.id,
            affiliate_id: profile.referred_by ?? null,
            product_id: product.product_code,
            product_name: product.product_name,
            amount: product.price,
            currency: product.currency,
            payment_provider: "paystack",
            status: "pending"
        })
        .select()
        .single();

    if (error) {
        console.error(error);
        alert(error.message);
        return null;
    }

    console.log("✅ Commande créée");
    console.log(data);

    return data;
}
/*
----------------------------------------------------
Initialisation du paiement
(Appel Edge Function Supabase)
----------------------------------------------------
*/

async function initializePayment(order) {

    try {

        const {
            data: { session }
        } = await sb.auth.getSession();

        if (!session) {
            alert("Session expirée.");
            return;
        }

        const response = await fetch(
            "https://cfikzkivgimvsvwyqpfq.supabase.co/functions/v1/initialize-payment",
            {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${session.access_token}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    order_id: order.id
                })
            }
        );

        const result = await response.json();

        console.log("Réponse Edge Function :", result);

        if (!response.ok) {

            alert(result.error || "Erreur lors de l'initialisation du paiement.");

            return;

        }

        if (!result.authorization_url) {

            alert("URL de paiement introuvable.");

            return;

        }

        window.location.href = result.authorization_url;

    }
    catch (err) {

        console.error(err);

        alert("Impossible de contacter le serveur.");

    }

}
/*
----------------------------------------------------
Préparer le paiement
----------------------------------------------------
*/

async function preparePayment() {

    const order = await createOrder();

    if (!order) {
        return;
    }

    console.log("==================================");
    console.log("ORDER READY");
    console.log(order);
    console.log("==================================");

    await initializePayment(order);

}

/*
----------------------------------------------------
Export
----------------------------------------------------
*/

window.preparePayment = preparePayment;
window.createOrder = createOrder;
window.loadProduct = loadProduct;