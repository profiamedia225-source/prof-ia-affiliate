document.addEventListener("DOMContentLoaded", async () => {

    await loadAffiliates();

    initSearch();

});

let affiliates = [];

async function loadAffiliates() {

    const { data, error } = await sb.functions.invoke(
        "admin-affiliates"
    );

    if (error) {

        console.error(error);

        return;

    }

    affiliates = data;

console.log("Affiliés chargés :", affiliates);

    renderAffiliates(data);

}

function renderAffiliates(list) {

    const tbody = document.querySelector(
        "#affiliatesTable tbody"
    );

    tbody.innerHTML = "";

    list.forEach(affiliate => {

        tbody.innerHTML += `

        <tr>

            <td>${affiliate.fullname}</td>

            <td>${affiliate.email}</td>

            <td>${affiliate.country ?? "-"}</td>

            <td>${Number(affiliate.availableBalance)
                .toLocaleString("fr-FR")} FCFA</td>

            <td>${Number(affiliate.totalCommissions)
                .toLocaleString("fr-FR")} FCFA</td>

            <td>

                <span class="status-badge ${
    affiliate.status === "active"
        ? "status-active"
        : affiliate.status === "pending"
        ? "status-pending"
        : "status-inactive"
}">

                    ${affiliate.status}

                </span>

            </td>

            <td>

                <button
                    class="view-btn"
                    data-id="${affiliate.id}">

                    👁️ Voir

                </button>

            </td>

        </tr>

        `;

    });

}

function initSearch() {

    const input = document.getElementById("searchAffiliate");

    input.addEventListener("input", function () {

        const keyword = this.value.trim().toLowerCase();

        const filtered = affiliates.filter(a => {

            const fullname = (a.fullname || "").toLowerCase();
            const email = (a.email || "").toLowerCase();
            const code = (a.affiliate_code || "").toLowerCase();
            const country = (a.country || "").toLowerCase();

            return (
                fullname.includes(keyword) ||
                email.includes(keyword) ||
                code.includes(keyword) ||
                country.includes(keyword)
            );

        });

        renderAffiliates(filtered);

    });

}
const modal = document.getElementById("affiliateModal");
const details = document.getElementById("affiliateDetails");

async function openAffiliateModal(affiliateId) {

    modal.style.display = "flex";

    details.innerHTML = "<p>Chargement...</p>";

    const { data, error } = await sb.functions.invoke(
        "admin-affiliate-details",
        {
            body: {
                affiliate_id: affiliateId
            }
        }
    );

    if (error) {

        details.innerHTML =
            "<p>Erreur lors du chargement.</p>";

        console.error(error);

        return;

    }

    renderAffiliateDetails(data);

}

function closeAffiliateModal() {

    modal.style.display = "none";

}
// ==========================================
// MODALE AFFILIÉ
// ==========================================

document.addEventListener("click", async (e) => {

    const btn = e.target.closest(".view-btn");

    if (!btn) return;

    modal.style.display = "flex";

    details.innerHTML = "<p>Chargement...</p>";

    const { data, error } = await sb.functions.invoke(
        "admin-affiliate-details",
        {
            body: {
                affiliate_id: btn.dataset.id
            }
        }
    );

    if (error) {

        console.error(error);

        details.innerHTML =
            "<p>Erreur lors du chargement.</p>";

        return;

    }

    renderAffiliateDetails(data);

});

document
.getElementById("closeModal")
.addEventListener("click", () => {

    modal.style.display = "none";

});

window.addEventListener("click", (e) => {

    if (e.target === modal) {

        modal.style.display = "none";

    }

});

function renderAffiliateDetails(data) {

    const p = data.profile;

    details.innerHTML = `

        <div class="profile-grid">

            <div class="profile-card">

                <h3>👤 Informations</h3>

                <p><strong>Nom :</strong> ${p.fullname}</p>

                <p><strong>Email :</strong> ${p.email}</p>

                <p><strong>Téléphone :</strong> ${p.phone ?? "-"}</p>

                <p><strong>Pays :</strong> ${p.country ?? "-"}</p>

                <p><strong>Code :</strong> ${p.affiliate_code}</p>

            </div>

            <div class="profile-card">

                <h3>💰 Finances</h3>

                <p><strong>Solde :</strong>
                ${Number(data.stats.availableBalance).toLocaleString("fr-FR")} FCFA</p>

                <p><strong>Commissions :</strong>
                ${Number(data.stats.totalCommissions).toLocaleString("fr-FR")} FCFA</p>

                <p><strong>Retraits :</strong>
                ${Number(data.stats.totalWithdrawals).toLocaleString("fr-FR")} FCFA</p>

                <p><strong>Ventes :</strong>
                ${data.stats.sales}</p>

            </div>

        </div>

    `;

}