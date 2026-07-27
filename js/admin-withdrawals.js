console.log("admin-withdrawals.js chargé");
let allWithdrawals = [];
let currentStatusFilter = "Tous";
let currentSearch = "";
let currentPage = 1;
let rowsPerPage = 10;
let filteredWithdrawals = [];
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
updateStats(allWithdrawals);
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

        const start = (currentPage - 1) * rowsPerPage;
const end = start + rowsPerPage;

const paginatedWithdrawals = withdrawals.slice(start, end);
    paginatedWithdrawals.forEach((withdrawal) => {

        const tr = document.createElement("tr");

        tr.innerHTML = `
            <td>${withdrawal.profiles?.fullname ?? "-"}</td>
            <td>${withdrawal.profiles?.country ?? "-"}</td>
            <td>${Number(withdrawal.amount).toLocaleString("fr-FR")} FCFA</td>
            <td>${withdrawal.payment_method}</td>
            <td>

    <div class="payment-number">

        <span>${withdrawal.payment_details}</span>

        <button
            class="copy-btn"
            onclick="copyPaymentNumber('${withdrawal.payment_details}')">

            📋

        </button>

    </div>

</td>
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

function updateStats(withdrawals) {

    let pendingCount = 0;
    let paidCount = 0;
    let rejectedCount = 0;
    let pendingAmount = 0;

    withdrawals.forEach((withdrawal) => {

        const amount = Number(withdrawal.amount) || 0;

        switch (withdrawal.status) {

            case "En attente":
                pendingCount++;
                pendingAmount += amount;
                break;

            case "paid":
                paidCount++;
                break;

            case "Refusé":
                rejectedCount++;
                break;

        }

    });

    document.getElementById("pendingCount").textContent = pendingCount;
    document.getElementById("paidCount").textContent = paidCount;
    document.getElementById("rejectedCount").textContent = rejectedCount;

    document.getElementById("pendingAmount").textContent =
        pendingAmount.toLocaleString("fr-FR") + " FCFA";

}

function updatePagination(totalItems) {

    const totalPages = Math.max(1, Math.ceil(totalItems / rowsPerPage));

    if (currentPage > totalPages) {
        currentPage = totalPages;
    }

    document.getElementById("pageInfo").textContent =
        `Page ${currentPage} sur ${totalPages}`;

    document.getElementById("prevPage").disabled =
        currentPage === 1;

    document.getElementById("nextPage").disabled =
        currentPage === totalPages;

}

function applyFilters() {

    let filtered = [...allWithdrawals];

    // Filtre par statut
    if (currentStatusFilter !== "Tous") {

        filtered = filtered.filter(
            withdrawal => withdrawal.status === currentStatusFilter
        );

    }

    // Recherche
    if (currentSearch.trim() !== "") {

        const search = currentSearch.toLowerCase();

        filtered = filtered.filter((withdrawal) => {

            const fullname =
                (withdrawal.profiles?.fullname ?? "").toLowerCase();

            const country =
                (withdrawal.profiles?.country ?? "").toLowerCase();

            const payment =
                (withdrawal.payment_method ?? "").toLowerCase();

            return (
                fullname.includes(search) ||
                country.includes(search) ||
                payment.includes(search)
            );

        });

    }
currentPage = 1;
   filteredWithdrawals = filtered;

displayWithdrawals(filteredWithdrawals);
updateStats(filteredWithdrawals);
updatePagination(filteredWithdrawals.length);

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
// Gestion des filtres et de la recherche
// ================================

document.addEventListener("DOMContentLoaded", () => {

    const statusFilter = document.getElementById("statusFilter");
    const searchInput = document.getElementById("searchWithdrawal");

    if (statusFilter) {

        statusFilter.addEventListener("change", () => {

            currentStatusFilter = statusFilter.value;
            applyFilters();

        });

    }

    if (searchInput) {

        searchInput.addEventListener("input", () => {

            currentSearch = searchInput.value;
            applyFilters();

        });

    }

});
const prevPage = document.getElementById("prevPage");
const nextPage = document.getElementById("nextPage");
const rowsSelect = document.getElementById("rowsPerPage");

if (prevPage) {

    prevPage.addEventListener("click", () => {

        if (currentPage > 1) {

            currentPage--;
            displayWithdrawals(filteredWithdrawals);
            updatePagination(filteredWithdrawals.length);

        }

    });

}

if (nextPage) {

    nextPage.addEventListener("click", () => {

        const totalPages = Math.ceil(filteredWithdrawals.length / rowsPerPage);

        if (currentPage < totalPages) {

            currentPage++;
            displayWithdrawals(filteredWithdrawals);
            updatePagination(filteredWithdrawals.length);

        }

    });

}

if (rowsSelect) {

    rowsSelect.addEventListener("change", () => {

        rowsPerPage = Number(rowsSelect.value);

        currentPage = 1;

        displayWithdrawals(filteredWithdrawals);
        updatePagination(filteredWithdrawals.length);

    });

}
function copyPaymentNumber(number) {

    navigator.clipboard.writeText(number);

    alert("Numéro copié : " + number);

}