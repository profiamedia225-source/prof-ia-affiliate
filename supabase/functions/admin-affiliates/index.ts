import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {

  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { data, error } = await supabase
    .from("profiles")
    .select(`
      id,
      fullname,
      email,
      phone,
      country,
      affiliate_code,
      affiliate_link,
      balance,
      total_commissions,
      status,
      role,
      created_at
    `)
    .eq("role", "affiliate")
    .order("created_at", { ascending: false });

  if (error) {

    return new Response(
      JSON.stringify(error),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );

  }

  return new Response(
    JSON.stringify(data),
    {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    }
  );

});