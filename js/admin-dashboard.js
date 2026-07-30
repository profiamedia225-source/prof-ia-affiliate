/*
==========================================
PROF IA MEDIA PARTNERS
ADMIN DASHBOARD
==========================================
*/

document.addEventListener("DOMContentLoaded", async () => {

    try {

        await loadDashboardStats();

    } catch (err) {

        console.error(err);

        alert("Impossible de charger le Dashboard.");

    }

});

/* ===================================== */

async function loadDashboardStats() {

    const {

        data,

        error

    } = await sb.functions.invoke(

        "admin-dashboard-stats"

    );

    if (error) {

        console.error(error);

        return;

    }

    updateDashboard(data);

}

/* ===================================== */

function updateDashboard(stats) {

    document.getElementById("totalProfiles").textContent =
        stats.totalProfiles ?? 0;

    document.getElementById("totalOrders").textContent =
        stats.totalOrders ?? 0;

    document.getElementById("totalRevenue").textContent =
        formatMoney(stats.totalRevenue);

    document.getElementById("totalCommissions").textContent =
        formatMoney(stats.totalCommissions);

    document.getElementById("pendingWithdrawals").textContent =
        stats.pendingWithdrawals ?? 0;

    document.getElementById("paidWithdrawals").textContent =
        stats.paidWithdrawals ?? 0;

    document.getElementById("rejectedWithdrawals").textContent =
        stats.rejectedWithdrawals ?? 0;

    document.getElementById("totalClicks").textContent =
        stats.totalClicks ?? 0;

    document.getElementById("totalProducts").textContent =
        stats.totalProducts ?? 0;

    document.getElementById("unreadNotifications").textContent =
        stats.unreadNotifications ?? 0;

}

/* ===================================== */

function formatMoney(value) {

    return Number(value || 0)

        .toLocaleString("fr-FR") +

        " FCFA";

}