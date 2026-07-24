import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
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

    console.log("Affilié :", userId);
    // ==========================================
    // Récupération des filleuls
    // ==========================================

    const { data: referrals, error: referralsError } = await supabase
      .from("profiles")
      .select(`
        id,
        fullname,
        email,
        country,
        created_at
      `)
      .eq("referred_by", userId)
      .order("created_at", { ascending: false });

    if (referralsError) {
      throw referralsError;
    }

    const result = [];

    for (const referral of referrals ?? []) {

      const { data: paidOrder } = await supabase
        .from("orders")
        .select("id")
        .eq("user_id", referral.id)
        .eq("status", "paid")
        .maybeSingle();

      result.push({

        id: referral.id,

        fullname: referral.fullname,

        email: referral.email,

        country: referral.country,

        created_at: referral.created_at,

        status: paidOrder
          ? "Actif"
          : "En attente"

      });

    }

    console.log(
      "Nombre de filleuls :",
      result.length
    );
    return new Response(
      JSON.stringify(result),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      },
    );

  } catch (error) {

    console.error(error);

    return new Response(
      JSON.stringify({
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