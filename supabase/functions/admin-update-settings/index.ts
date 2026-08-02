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

    const settings = await req.json();

    if (!Array.isArray(settings)) {

      throw new Error("Format invalide.");

    }

    for (const setting of settings) {

      const { error } = await supabase
        .from("settings")
        .update({
          setting_value: setting.setting_value,
          updated_at: new Date().toISOString(),
        })
        .eq("setting_key", setting.setting_key);

      if (error) throw error;

    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Paramètres enregistrés avec succès."
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
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
          "Content-Type": "application/json",
        },
      },
    );

  }

});