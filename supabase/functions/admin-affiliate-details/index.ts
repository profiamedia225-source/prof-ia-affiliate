import { createClient } from "npm:@supabase/supabase-js@2";
import { getAffiliateStats } from "../_shared/affiliate-stats.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const { affiliate_id } = await req.json();

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // Profil
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", affiliate_id)
    .single();

  if (profileError) {

    return new Response(
      JSON.stringify(profileError),
      {
        status:500,
        headers:{
          ...corsHeaders,
          "Content-Type":"application/json"
        }
      }
    );

  }

  // Commissions
  const { data: commissions } = await supabase
    .from("commissions")
    .select("*")
    .eq("affiliate_id", affiliate_id);

  // Retraits
  const { data: withdrawals } = await supabase
    .from("withdrawals")
    .select("*")
    .eq("affiliate_id", affiliate_id);

  // Commandes
  const { data: orders } = await supabase
    .from("orders")
    .select("*")
    .eq("affiliate_id", affiliate_id);

const stats = await getAffiliateStats(
  supabase,
  affiliate_id
);

return new Response(
  JSON.stringify({
    profile,
    commissions,
    withdrawals,
    orders,
    stats
  }),
  {
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json"
    }
  }
);
});