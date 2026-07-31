document.addEventListener("DOMContentLoaded", async () => {

    const {
        data: { user }
    } = await window.sb.auth.getUser();

    if (!user) {
        window.location.replace("login.html");
        return;
    }

    const { data: profile, error } = await window.sb
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

    if (error || !profile) {
        console.error(error);
        window.location.replace("dashboard.html");
        return;
    }

    if (
    profile.role !== "admin" &&
    profile.role !== "super_admin"
) {
    window.location.replace("dashboard.html");
    return;
}

});