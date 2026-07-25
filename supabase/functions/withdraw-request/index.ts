import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {

  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
    });
  }

  try {

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const authHeader = req.headers.get("Authorization");

    if (!authHeader) {

      return new Response(
        JSON.stringify({
          error: "Utilisateur non authentifié",
        }),
        {
          status: 401,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        },
      );

    }

    const jwt = authHeader.replace("Bearer ", "");

    const {
      data: authUser,
      error: authError,
    } = await supabase.auth.getUser(jwt);

    if (authError || !authUser.user) {

      return new Response(
        JSON.stringify({
          error: "Session invalide",
        }),
        {
          status: 401,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        },
      );

    }

    const userId = authUser.user.id;

    console.log("Utilisateur :", userId);

const {
  amount,
  paymentMethod,
  paymentDetails,
} = await req.json();

console.log("Montant :", amount);
console.log("Méthode :", paymentMethod);
console.log("Détails :", paymentDetails);

const { error: insertError } = await supabase
  .from("withdrawals")
  .insert({
    affiliate_id: userId,
    amount: Number(amount),
    payment_method: paymentMethod,
    payment_details: paymentDetails,
    status: "En attente",
  });

if (insertError) {

  return new Response(
    JSON.stringify({
      error: insertError.message,
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
    return new Response(
  JSON.stringify({
    success: true,
    message: "Demande enregistrée avec succès",
  }),
  {
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  },
);

  } catch (error) {

    return new Response(
      JSON.stringify({
        error: error instanceof Error
          ? error.message
          : "Erreur interne",
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