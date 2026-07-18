import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

const PAYSTACK_INITIALIZE_URL =
  "https://api.paystack.co/transaction/initialize";

const REQUEST_TIMEOUT = 30000;

const ALLOWED_CURRENCY = "XOF";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const paystackSecret = Deno.env.get("PAYSTACK_SECRET_KEY");
    const callbackUrl = Deno.env.get("PAYSTACK_CALLBACK_URL");

    if (
      !supabaseUrl ||
      !serviceRoleKey ||
      !anonKey ||
      !paystackSecret ||
      !callbackUrl
    ) {
      return new Response(
        JSON.stringify({
          error: "Configuration serveur incomplète",
        }),
        {
          status: 500,
          headers: corsHeaders,
        },
      );
    }

    const serviceClient = createClient(
      supabaseUrl,
      serviceRoleKey,
    );

    const authorization =
      req.headers.get("Authorization") ?? "";

    if (!authorization.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({
          error: "Utilisateur non authentifié",
        }),
        {
          status: 401,
          headers: corsHeaders,
        },
      );
    }

    const userClient = createClient(
      supabaseUrl,
      anonKey,
      {
        global: {
          headers: {
            Authorization: authorization,
          },
        },
      },
    );

    const {
      data: { user },
      error: authError,
    } = await userClient.auth.getUser();

    if (authError || !user) {
      return new Response(
        JSON.stringify({
          error: "Session invalide",
        }),
        {
          status: 401,
          headers: corsHeaders,
        },
      );
    }

    const body = await req.json();

    const { orderId } = body;

    if (!orderId) {
      return new Response(
        JSON.stringify({
          error: "orderId manquant",
        }),
        {
          status: 400,
          headers: corsHeaders,
        },
      );
    }
    // Recherche de la commande
    const {
      data: order,
      error: orderError,
    } = await serviceClient
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .eq("user_id", user.id)
      .single();

    if (orderError || !order) {
      return new Response(
        JSON.stringify({
          error: "Commande introuvable",
        }),
        {
          status: 404,
          headers: corsHeaders,
        },
      );
    }

    if (
      !order.customer_email ||
      order.customer_email.trim() === ""
    ) {
      return new Response(
        JSON.stringify({
          error: "Adresse email client manquante",
        }),
        {
          status: 400,
          headers: corsHeaders,
        },
      );
    }

    // Recherche du produit
    const {
      data: product,
      error: productError,
    } = await serviceClient
      .from("products")
      .select("*")
      .eq("product_code", order.product_id)
      .single();

    if (productError || !product) {
      return new Response(
        JSON.stringify({
          error: "Produit introuvable",
        }),
        {
          status: 404,
          headers: corsHeaders,
        },
      );
    }

    if (product.status !== true) {
      return new Response(
        JSON.stringify({
          error: "Produit inactif",
        }),
        {
          status: 400,
          headers: corsHeaders,
        },
      );
    }

    const amount = Number(product.price);

    if (!Number.isFinite(amount) || amount <= 0) {
      return new Response(
        JSON.stringify({
          error: "Montant invalide",
        }),
        {
          status: 400,
          headers: corsHeaders,
        },
      );
    }

    const currency = String(product.currency).toUpperCase();

    if (currency !== ALLOWED_CURRENCY) {
      return new Response(
        JSON.stringify({
          error: `Devise non autorisée : ${currency}`,
        }),
        {
          status: 400,
          headers: corsHeaders,
        },
      );
    }

    const controller = new AbortController();

    const timeout = setTimeout(() => {
      controller.abort();
    }, REQUEST_TIMEOUT);
    
     let response: Response;

    try {
      response = await fetch(PAYSTACK_INITIALIZE_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${paystackSecret}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: order.customer_email.trim(),
          amount: Math.round(amount * 100),
          currency,
          reference: order.order_reference,
         callback_url: callbackUrl,
          metadata: {
            order_id: order.id,
            affiliate_id: order.affiliate_id,
            product_code: order.product_id,
            user_id: user.id,
          },
        }),
        signal: controller.signal,
      });
    } catch (error) {
      clearTimeout(timeout);

      if (error instanceof DOMException && error.name === "AbortError") {
        await serviceClient
          .from("orders")
          .update({
            status: "failed",
            updated_at: new Date().toISOString(),
          })
          .eq("id", order.id);

        return new Response(
          JSON.stringify({
            error: "Timeout lors de l'initialisation Paystack",
          }),
          {
            status: 504,
            headers: corsHeaders,
          },
        );
      }

      throw error;
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      const errorText = await response.text();

      await serviceClient
        .from("orders")
        .update({
          status: "failed",
          updated_at: new Date().toISOString(),
        })
        .eq("id", order.id);

      return new Response(
        JSON.stringify({
          error: "Erreur Paystack",
          details: errorText,
        }),
        {
          status: response.status,
          headers: corsHeaders,
        },
      );
    }

    let result: any;

    try {
      result = await response.json();
    } catch {
      await serviceClient
        .from("orders")
        .update({
          status: "failed",
          updated_at: new Date().toISOString(),
        })
        .eq("id", order.id);

      return new Response(
        JSON.stringify({
          error: "Réponse JSON invalide reçue de Paystack",
        }),
        {
          status: 502,
          headers: corsHeaders,
        },
      );
    }

    if (
      !result.status ||
      !result.data ||
      !result.data.authorization_url ||
      !result.data.access_code ||
      !result.data.reference
    ) {
      await serviceClient
        .from("orders")
        .update({
          status: "failed",
          updated_at: new Date().toISOString(),
        })
        .eq("id", order.id);

      return new Response(
        JSON.stringify({
          error: "Réponse Paystack invalide",
          details: result,
        }),
        {
          status: 502,
          headers: corsHeaders,
        },
      );
    }

    const { error: updateError } = await serviceClient
      .from("orders")
      .update({
        paystack_reference: result.data.reference,
        paystack_access_code: result.data.access_code,
        status: "initialized",
        updated_at: new Date().toISOString(),
      })
      .eq("id", order.id);

    if (updateError) {
      return new Response(
        JSON.stringify({
          error: "Impossible de mettre à jour la commande",
          details: updateError.message,
        }),
        {
          status: 500,
          headers: corsHeaders,
        },
      );
    }
        return new Response(
      JSON.stringify({
        authorization_url: result.data.authorization_url,
        access_code: result.data.access_code,
        reference: result.data.reference,
      }),
      {
        status: 200,
        headers: corsHeaders,
      },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({
        error: err instanceof Error
          ? err.message
          : "Erreur interne du serveur",
      }),
      {
        status: 500,
        headers: corsHeaders,
      },
    );
  }
});