
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ success: false, message: "POST obligatoire." }, 405);
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const apiKey = Deno.env.get("JEKO_API_KEY");
    const apiKeyId = Deno.env.get("JEKO_API_KEY_ID");
    const storeId = Deno.env.get("JEKO_STORE_ID");

    if (!supabaseUrl || !serviceRoleKey || !apiKey || !apiKeyId || !storeId) {
      return json({
        success: false,
        message: "Configuration Supabase ou Jèko incomplète.",
      }, 500);
    }

    const authorization = req.headers.get("Authorization");

    if (!authorization?.startsWith("Bearer ")) {
      return json({ success: false, message: "Authentification requise." }, 401);
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { data: authData, error: authError } =
      await supabase.auth.getUser(authorization.substring(7));

    if (authError || !authData.user) {
      return json({ success: false, message: "Session invalide." }, 401);
    }

    const body = await req.json();
const orderId = body.orderId;
const paymentMethod = body.paymentMethod;

const allowedMethods = [
  "wave",
  "orange",
  "mtn",
  "moov",
  "djamo",
  "jeko",
];

if (!allowedMethods.includes(paymentMethod)) {
  return json({
    success: false,
    message: "Moyen de paiement invalide.",
  }, 400);
}

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("id, user_id, order_reference, amount, currency, status")
      .eq("id", orderId)
      .eq("user_id", authData.user.id)
      .single();

    if (orderError || !order) {
      return json({ success: false, message: "Commande introuvable." }, 404);
    }

    if (order.status !== "pending") {
      return json({ success: false, message: "Commande déjà traitée." }, 409);
    }

    const amount = Number(order.amount);

    if (!Number.isFinite(amount) || amount <= 0) {
      return json({ success: false, message: "Montant invalide." }, 400);
    }

    // Jèko attend le montant en centimes.
    const amountCents = Math.round(amount * 100);

    const reference = `PIM-${order.id.replaceAll("-", "")}`;

    const baseUrl = "https://prof-ia-affiliate.vercel.app";

    const successUrl =
      `${baseUrl}/payment.html?payment=success&reference=${encodeURIComponent(reference)}`;

    const errorUrl =
      `${baseUrl}/payment.html?payment=error&reference=${encodeURIComponent(reference)}`;

    const jekoResponse = await fetch(
      "https://api.jeko.africa/partner_api/payment_requests",
      {
        method: "POST",
        headers: {
          "X-API-KEY": apiKey,
          "X-API-KEY-ID": apiKeyId,
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        body: JSON.stringify({
          storeId,
          amountCents,
          currency: order.currency || "XOF",
          reference,
          paymentDetails: {
  type: "redirect",
  data: {
  paymentMethod,
  successUrl,
  errorUrl,
},
},
        }),
        signal: AbortSignal.timeout(30000),
      },
    );

    const responseText = await jekoResponse.text();

    let jekoData: Record<string, any>;

    try {
      jekoData = JSON.parse(responseText);
    } catch {
      jekoData = {};
    }

    if (!jekoResponse.ok || !jekoData.redirectUrl) {
      console.error("Erreur Jèko :", jekoResponse.status, jekoData);

      return json({
        success: false,
        message: "Jèko n'a pas pu créer le paiement.",
        details: jekoData,
      }, 502);
    }

    // Enregistrer le fournisseur et la référence du paiement.
    const { error: updateError } = await supabase
      .from("orders")
      .update({
        payment_provider: "jeko",
        payment_reference: reference,
        updated_at: new Date().toISOString(),
      })
      .eq("id", order.id)
      .eq("status", "pending");

    if (updateError) {
      console.error("Erreur mise à jour commande :", updateError.message);

      return json({
        success: false,
        message: "Paiement créé chez Jèko, mais commande à réconcilier.",
        reference,
      }, 500);
    }

    return json({
      success: true,
      redirectUrl: jekoData.redirectUrl,
      reference,
      paymentRequestId: jekoData.id,
    });

  } catch (error) {
    console.error("create-jeko-payment :", error);

    return json({
      success: false,
      message: "Erreur lors de l'initialisation du paiement.",
    }, 500);
  }
});
