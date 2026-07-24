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

   displayCommissions(data);

}
function displayCommissions(commissions) {

    const tbody = document.getElementById("commissionsBody");

    tbody.innerHTML = "";

    document.getElementById("totalCommissions").textContent =
        `Total : ${commissions.length} commission(s)`;

    if (commissions.length === 0) {

        tbody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align:center;padding:40px;">
                    Aucune commission disponible.
                </td>
            </tr>
        `;

        return;

    }

    commissions.forEach((commission, index) => {

        const row = document.createElement("tr");

        row.innerHTML = `
            <td>${index + 1}</td>
            <td>${commission.buyer_id}</td>
            <td>${commission.amount}</td>
            <td>${new Date(commission.created_at).toLocaleDateString("fr-FR")}</td>
            <td>${commission.status}</td>
        `;

        tbody.appendChild(row);

    });

}