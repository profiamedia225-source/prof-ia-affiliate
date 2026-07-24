document.addEventListener("DOMContentLoaded", initWithdrawals);

async function initWithdrawals() {

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

    const commissions = data.commissions ?? data;

    const available = commissions.filter(
        c => c.status === "available"
    );

    const total = available.reduce(
        (sum, c) => sum + Number(c.amount),
        0
    );

    document.getElementById("availableBalance").textContent =
        `${total.toLocaleString("fr-FR")} FCFA`;

}