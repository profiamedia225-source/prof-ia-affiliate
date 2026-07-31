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
    .from("commissions")
    .select(`
      affiliate_id,
      amount,
      profiles!commissions_affiliate_id_fkey (
    fullname
)
    `);

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

  const ranking: Record<string, any> = {};

  data.forEach(item => {

    const id = item.affiliate_id;

    if (!ranking[id]) {

      ranking[id] = {

        affiliate_id: id,

        name: item.profiles?.fullname ?? "Inconnu",

        sales: 0,

        commissions: 0

      };

    }

    ranking[id].sales++;

    ranking[id].commissions += Number(item.amount);

  });

  const result = Object.values(ranking)
    .sort((a: any, b: any) => b.commissions - a.commissions)
    .slice(0, 5);

  return new Response(

    JSON.stringify(result),

    {

      headers: {

        ...corsHeaders,

        "Content-Type": "application/json"

      }

    }

  );

});