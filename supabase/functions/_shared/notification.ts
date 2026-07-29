export async function sendNotification(
  supabase: any,
  {
    userId,
    type,
    title,
    message,
    channel = "app",
  }: {
    userId: string;
    type: string;
    title: string;
    message: string;
    channel?: string;
  }
) {
  const { error } = await supabase
    .from("notifications")
    .insert({
      user_id: userId,
      type,
      title,
      message,
      channel,
    });

  if (error) {
    console.error(
      "Erreur création notification :",
      error
    );
  }

  return error;
}