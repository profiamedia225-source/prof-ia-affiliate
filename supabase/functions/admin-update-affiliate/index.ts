import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods":
    "POST, OPTIONS",
};

Deno.serve(async (req) => {

  if (req.method === "OPTIONS") {

    return new Response("ok", {
      headers: corsHeaders,
    });

  }

  try {

    const body = await req.json();

    const {
      id,
      fullname,
      phone,
      country,
      status,
    } = body;

    if (!id) {

      throw new Error(
        "ID de l'affilié manquant."
      );

    }

    if (!fullname || !fullname.trim()) {

      throw new Error(
        "Le nom complet est obligatoire."
      );

    }

    const allowedStatuses = [
      "active",
      "pending",
      "inactive",
    ];

    if (!allowedStatuses.includes(status)) {

      throw new Error(
        "Statut de l'affilié invalide."
      );

    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data, error } = await supabase
      .from("profiles")
      .update({
        fullname: fullname.trim(),
        phone: phone?.trim() || null,
        country: country?.trim() || null,
        status,
      })
      .eq("id", id)
      .eq("role", "affiliate")
      .select(`
        id,
        fullname,
        email,
        phone,
        country,
        affiliate_code,
        affiliate_link,
        status,
        role,
        created_at
      `)
      .single();

    if (error) {

      throw error;

    }

    return new Response(
      JSON.stringify({
        success: true,
        affiliate: data,
      }),
      {
        status: 200,

        headers: {
          ...corsHeaders,
          "Content-Type":
            "application/json",
        },
      }
    );

  } catch (error) {

    console.error(error);

    return new Response(
      JSON.stringify({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Erreur lors de la modification.",
      }),
      {
        status: 500,

        headers: {
          ...corsHeaders,
          "Content-Type":
            "application/json",
        },
      }
    );

  }

});