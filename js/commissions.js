document.addEventListener("DOMContentLoaded", initCommissions);

async function initCommissions() {

    const {
        data: { session }
    } = await sb.auth.getSession();

    if (!session) {

        window.location.href = "login.html";
        return;

    }

    const { data, error } = await sb.functions.invoke(
        "commissions",
        {
            headers: {
                Authorization: `Bearer ${session.access_token}`
            }
        }
    );

    if (error) {

        console.error(error);

        alert("Impossible de charger les commissions.");

        return;

    }

    console.log("Commissions :", data);

}