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

    const { data: products, error } = await supabase
      .from("products")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;

    const total = products.length;

    const active =
      products.filter(
        p => p.status === true
      ).length;

    const inactive =
      total - active;

    const totalValue =
      products.reduce(
        (sum, product) =>
          sum + Number(product.price || 0),
        0
      );

    return new Response(
      JSON.stringify({

        stats: {

          total,

          active,

          inactive,

          totalValue

        },

        products

      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type":
            "application/json",
        },
      },
    );

  }

  catch (error) {

    return new Response(
      JSON.stringify({

        success: false,

        error:
          error instanceof Error
            ? error.message
            : "Erreur interne"

      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type":
            "application/json",
        },
      },
    );

  }

});