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

  const authHeader = req.headers.get("Authorization");

  if (!authHeader) {
    return new Response(
      JSON.stringify({ error: "Non autorisé" }),
      {
        status: 401,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }

  const token = authHeader.replace("Bearer ", "");

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser(token);

  if (authError || !user) {
    return new Response(
      JSON.stringify({ error: "Utilisateur invalide" }),
      {
        status: 401,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }

  const { withdrawalId, status } = await req.json();

const { data: withdrawal, error: withdrawalError } = await supabase
  .from("withdrawals")
  .select("affiliate_id")
  .eq("id", withdrawalId)
  .single();

if (withdrawalError || !withdrawal) {
  return new Response(
    JSON.stringify({ error: "Retrait introuvable" }),
    {
      status: 404,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    }
  );
}

  const { error } = await supabase
    .from("withdrawals")
    .update({
      status,
      processed_at: new Date().toISOString(),
    })
    .eq("id", withdrawalId);

  if (error) {
    return new Response(
      JSON.stringify(error),
      {
        status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }

if (status === "paid") {

  await supabase
    .from("commissions")
    .update({
      status: "Payée",
      paid_at: new Date().toISOString()
    })
    .eq("affiliate_id", withdrawal!.affiliate_id)
    .eq("status", "Disponible");

}

  return new Response(
    JSON.stringify({ success: true }),
    {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    }
  );
});