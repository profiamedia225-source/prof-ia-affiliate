console.log("admin-withdrawals.js chargé");
let allWithdrawals = [];
document.addEventListener("DOMContentLoaded", loadWithdrawals);

async function loadWithdrawals() {

    console.log("loadWithdrawals démarrée");

    const {
        data: { session }
    } = await sb.auth.getSession();

    console.log("Session :", session);

    if (!session) {

        console.log("Aucune session");

        return;

    }

    console.log("Utilisateur connecté :", session.user.id);

    const { data, error } = await sb.functions.invoke(
        "admin-withdrawals",
        {
            headers: {
                Authorization: `Bearer ${session.access_token}`
            }
        }
    );

console.log("Erreur :", error);
console.log("Données :", data);
    
    if (error) {
        console.error(error);
        alert("Impossible de charger les retraits.");
        return;
    }

    console.log("Retraits :", data);

allWithdrawals = data ?? [];

displayWithdrawals(allWithdrawals);
return;

document.getElementById("totalWithdrawals").textContent =
`Total : ${data.length} demande(s)`;

data.forEach((withdrawal) => {

    const tr = document.createElement("tr");

    tr.innerHTML = `
        <td>${withdrawal.profiles?.fullname ?? "-"}</td>
        <td>${withdrawal.profiles?.country ?? "-"}</td>
        <td>${Number(withdrawal.amount).toLocaleString("fr-FR")} FCFA</td>
        <td>${withdrawal.payment_method}</td>
        <td>${new Date(withdrawal.created_at).toLocaleDateString("fr-FR")}</td>
        <td>
${
    withdrawal.status === "En attente"
        ? "🟡 En attente"
        : withdrawal.status === "paid"
        ? "🟢 Payé"
        : withdrawal.status === "Refusé"
        ? "🔴 Refusé"
        : withdrawal.status
}
</td>
        <td>
    <button class="btn-approve"
        onclick="updateWithdrawal('${withdrawal.id}','paid')">
        Valider
    </button>

    <button class="btn-reject"
        onclick="updateWithdrawal('${withdrawal.id}','Refusé')">
        Refuser
    </button>
</td>
    `;

    tbody.appendChild(tr);

});

}

function displayWithdrawals(withdrawals) {

    const tbody = document.getElementById("withdrawalsTable");

    tbody.innerHTML = "";

    document.getElementById("totalWithdrawals").textContent =
        `Total : ${withdrawals.length} demande(s)`;

    withdrawals.forEach((withdrawal) => {

        const tr = document.createElement("tr");

        tr.innerHTML = `
            <td>${withdrawal.profiles?.fullname ?? "-"}</td>
            <td>${withdrawal.profiles?.country ?? "-"}</td>
            <td>${Number(withdrawal.amount).toLocaleString("fr-FR")} FCFA</td>
            <td>${withdrawal.payment_method}</td>
            <td>${new Date(withdrawal.created_at).toLocaleDateString("fr-FR")}</td>
            <td>
            ${
                withdrawal.status === "En attente"
                    ? "🟡 En attente"
                    : withdrawal.status === "paid"
                    ? "🟢 Payé"
                    : withdrawal.status === "Refusé"
                    ? "🔴 Refusé"
                    : withdrawal.status
            }
            </td>
            <td>
                <button class="btn-approve"
                    onclick="updateWithdrawal('${withdrawal.id}','paid')">
                    Valider
                </button>

                <button class="btn-reject"
                    onclick="updateWithdrawal('${withdrawal.id}','Refusé')">
                    Refuser
                </button>
            </td>
        `;

        tbody.appendChild(tr);

    });

}

async function updateWithdrawal(withdrawalId, status) {

    const {
        data: { session }
    } = await sb.auth.getSession();

    const { data, error } = await sb.functions.invoke(
        "admin-update-withdrawal",
        {
            body: {
                withdrawalId,
                status
            },
            headers: {
                Authorization: `Bearer ${session.access_token}`
            }
        }
    );

    if (error) {
        alert("Erreur lors de la mise à jour.");
        console.error(error);
        return;
    }

    loadWithdrawals();
}
// ================================
// Filtre par statut
// ================================

document.addEventListener("DOMContentLoaded", () => {

    const statusFilter = document.getElementById("statusFilter");

    if (!statusFilter) return;

    statusFilter.addEventListener("change", () => {

        const selectedStatus = statusFilter.value;

        if (selectedStatus === "Tous") {

            displayWithdrawals(allWithdrawals);
            return;

        }

        const filtered = allWithdrawals.filter((withdrawal) =>
            withdrawal.status === selectedStatus
        );

        displayWithdrawals(filtered);

    });

});