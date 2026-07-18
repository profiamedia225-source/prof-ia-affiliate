import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

const PAYSTACK_VERIFY_URL =
  "https://api.paystack.co/transaction/verify/";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const paystackSecret = Deno.env.get("PAYSTACK_SECRET_KEY");

    if (!supabaseUrl || !serviceRoleKey || !paystackSecret) {
      return new Response(
        JSON.stringify({
          error: "Configuration serveur incomplète",
        }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        },
      );
    }

    const supabase = createClient(
      supabaseUrl,
      serviceRoleKey,
    );

    const url = new URL(req.url);

    const reference = url.searchParams.get("reference");
console.log("URL complète :", req.url);
console.log("Reference reçue :", reference);

    if (!reference) {
      return new Response(
        JSON.stringify({
          error: "Référence Paystack manquante",
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        },
      );
    }

    const response = await fetch(
      PAYSTACK_VERIFY_URL + reference,
      {
        headers: {
          Authorization: `Bearer ${paystackSecret}`,
        },
      },
    );

    const result = await response.json();
console.log("Réponse Paystack :", JSON.stringify(result, null, 2));

    if (!result.status || !result.data) {
      return new Response(
        JSON.stringify(result),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        },
      );
    }

    const payment = result.data;
    if (payment.status !== "success") {
      return new Response(
        JSON.stringify({
          error: "Paiement non validé",
          details: payment.status,
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        },
      );
    }

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("*")
      .eq("paystack_reference", payment.reference)
      .single();

    if (orderError || !order) {
      return new Response(
        JSON.stringify({
          error: "Commande introuvable",
        }),
        {
          status: 404,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        },
      );
    }

    if (order.status === "paid") {
      return Response.redirect(
  "https://prof-ia-affiliate.vercel.app/payment-success.html",
  302,
);
    }

    const { error: updateOrderError } = await supabase
      .from("orders")
      .update({
        status: "paid",
        payment_provider: "paystack",
        payment_reference: payment.reference,
        updated_at: new Date().toISOString(),
      })
      .eq("id", order.id);

    if (updateOrderError) {
      return new Response(
        JSON.stringify({
          error: updateOrderError.message,
        }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        },
      );
    }
    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        updated_at: new Date().toISOString(),
      })
      .eq("id", order.user_id);

    if (profileError) {
      return new Response(
        JSON.stringify({
          error: "Impossible de mettre à jour le profil",
          details: profileError.message,
        }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        },
      );
    }

    if (order.affiliate_id) {
      console.log(
        "Commission à calculer pour l'affilié :",
        order.affiliate_id,
      );

      // Nous ajouterons ici la logique de commission
      // après avoir validé le paiement.
    }
return Response.redirect(
  "https://prof-ia-affiliate.vercel.app/payment-success.html",
  302,
);

  } catch (error) {
    console.error(error);

    return new Response(
      JSON.stringify({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Erreur interne du serveur",
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      },
    );
  }
});