/*
==========================================
PROF IA MEDIA PARTNERS
payment.js
Version 1
==========================================
*/

// Produit vendu
const PRODUCT_CODE = "formation_complete";

/*
==========================================
Charger le produit
==========================================
*/

async function loadProduct() {

    console.log("Recherche du produit :", PRODUCT_CODE);

    const { data, error } = await sb
        .from("products")
        .select("*")
        .eq("product_code", PRODUCT_CODE);

    console.log("Data :", data);
    console.log("Error :", error);

    if (error) {
        console.error(error);
        return null;
    }

    if (!data || data.length === 0) {
        return null;
    }

    return data[0];
}

/*
==========================================
Créer une référence de commande
==========================================
*/

function generateOrderReference() {

    const random = Math.random()
        .toString(36)
        .substring(2, 10)
        .toUpperCase();

    return `PIM-ORD-${random}`;

}

/*
==========================================
Créer une commande
==========================================
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

        .maybeSingle();

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

    // Création

const order = {
    order_reference: orderReference,
    user_id: user.id,
    affiliate_id: null,
    product_id: product.product_code,
    product_name: product.product_name,
    amount: product.price,
    currency: product.currency,
    payment_provider: "paystack",
    status: "pending"
};

console.log(order);

const { data, error } = await sb
    .from("orders")
    .insert(order)
    .select()
    .single();

    if (error) {

        console.error(error);

        alert(JSON.stringify(error, null, 2));

        return null;

    }

    console.log("✅ Commande créée");

    console.log(data);

    return data;

}

/*
==========================================
Préparer le paiement
==========================================
*/

async function preparePayment() {

    const order = await createOrder();

    if (!order) {

        return;

    }

    console.log("================================");

    console.log("PAYMENT OBJECT");

    console.log(order);

    console.log("================================");

}

window.preparePayment = preparePayment;
window.createOrder = createOrder;