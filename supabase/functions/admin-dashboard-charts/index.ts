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
    .from("orders")
    .select("amount, created_at")
    .eq("status", "paid")
    .order("created_at", { ascending: true });

  if (error) {

    return new Response(
      JSON.stringify(error),
      {
        status:500,
        headers: {
    ...corsHeaders,
    "Content-Type": "application/json"
}
      }
    );

  }

  const { data: commissions, error: commissionsError } = await supabase
  .from("commissions")
  .select("amount, created_at")
  .order("created_at", { ascending: true });

if (commissionsError) {
  return new Response(
    JSON.stringify(commissionsError),
    {
      status: 500,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    }
  );
}

  const months = [
    "Jan","Fév","Mar","Avr","Mai","Juin",
    "Juil","Août","Sept","Oct","Nov","Déc"
  ];

  const commissionsByMonth: Record<string, number> = {};

months.forEach(month => {
  commissionsByMonth[month] = 0;
});

commissions.forEach(item => {
  const date = new Date(item.created_at);
  const month = months[date.getMonth()];
  commissionsByMonth[month] += Number(item.amount);
});

const commissionResult = months.map(month => ({
  month,
  total: commissionsByMonth[month],
}));

  const salesByMonth: Record<string, number> = {};

  months.forEach(m => {

    salesByMonth[m] = 0;

  });

  data.forEach(order => {

    const date = new Date(order.created_at);

    const month = months[date.getMonth()];

    salesByMonth[month] += Number(order.amount);

  });

  const result = months.map(month => ({

      month,

      total:salesByMonth[month]

  }));

 return new Response(
  JSON.stringify({
    salesByMonth: result,
    commissionsByMonth: commissionResult,
  }),
  {
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  }
);
});