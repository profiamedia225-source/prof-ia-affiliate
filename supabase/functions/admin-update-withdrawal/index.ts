import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const ALLOWED_STATUS = ["En attente", "paid", "Refusé"];

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
      JSON.stringify({
        error: "Non autorisé",
      }),
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
      JSON.stringify({
        error: "Utilisateur invalide",
      }),
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

  if (!withdrawalId || !status) {
    return new Response(
      JSON.stringify({
        error: "Paramètres manquants",
      }),
      {
        status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }

  if (!ALLOWED_STATUS.includes(status)) {
    return new Response(
      JSON.stringify({
        error: "Statut invalide",
      }),
      {
        status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
    // Vérifie que le retrait existe
  const { data: withdrawal, error: withdrawalError } = await supabase
    .from("withdrawals")
    .select("id, affiliate_id, status")
    .eq("id", withdrawalId)
    .single();

  if (withdrawalError || !withdrawal) {
    return new Response(
      JSON.stringify({
        error: "Retrait introuvable",
      }),
      {
        status: 404,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }

  // Mise à jour du statut du retrait
  const { error: updateError } = await supabase
    .from("withdrawals")
    .update({
      status,
      processed_at: new Date().toISOString(),
    })
    .eq("id", withdrawalId);

  if (updateError) {
    return new Response(
      JSON.stringify({
        error: updateError.message,
      }),
      {
        status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }

    // La table "commissions" n'est plus modifiée ici.
  // Le solde disponible est calculé dynamiquement par
  // l'Edge Function dashboard-stats en fonction :
  //
  // - des commissions disponibles
  // - des retraits En attente
  // - des retraits paid
  //
  // Si un retrait est "Refusé", il est automatiquement
  // exclu du calcul du solde disponible.
    return new Response(
    JSON.stringify({
      success: true,
      message: "Statut du retrait mis à jour avec succès.",
    }),
    {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    }
  );
});