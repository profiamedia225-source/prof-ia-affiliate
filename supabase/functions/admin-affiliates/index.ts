import { createClient } from "npm:@supabase/supabase-js@2";
import { getAffiliateStats } from "../_shared/affiliate-stats.ts";

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

const affiliates = [];

for (const profile of data ?? []) {

    const stats = await getAffiliateStats(
        supabase,
        profile.id
    );

    affiliates.push({

        ...profile,

        availableBalance: stats.availableBalance,

        totalCommissions: stats.totalCommissions,

        sales: stats.sales,

        referrals: stats.referrals

    });

}

  return new Response(
    JSON.stringify(affiliates),
    {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    }
  );

});