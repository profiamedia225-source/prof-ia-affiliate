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

    const { data, error } = await supabase
      .from("settings")
      .select("setting_key, setting_value");

    if (error) throw error;

    const settings: Record<string, string> = {};

    for (const row of data ?? []) {

      settings[row.setting_key] = row.setting_value;

    }

    return new Response(
      JSON.stringify(settings),
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
        error:
          error instanceof Error
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