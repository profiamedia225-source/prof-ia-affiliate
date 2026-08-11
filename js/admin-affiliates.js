document.addEventListener("DOMContentLoaded", async () => {

    await loadAffiliates();

    document
        .getElementById("searchAffiliate")
        .addEventListener(
            "input",
            applyFilters
        );

    document
        .getElementById("statusFilter")
        .addEventListener(
            "change",
            applyFilters
        );

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

renderAffiliateStats();

document.getElementById(
    "affiliateResultsCount"
).textContent =
    `${affiliates.length} ${
        affiliates.length > 1
            ? "affiliés"
            : "affilié"
    }`;

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

                    ${
    affiliate.status === "active"
        ? "🟢 Actif"
        : affiliate.status === "pending"
        ? "🟡 En attente"
        : "🔴 Inactif"
}

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

/*
====================================================
STATISTIQUES AFFILIÉS
====================================================
*/

function renderAffiliateStats() {

    const total =
        affiliates.length;

    const active =
        affiliates.filter(
            affiliate =>
                affiliate.status === "active"
        ).length;

    const pending =
        affiliates.filter(
            affiliate =>
                affiliate.status === "pending"
        ).length;

    const inactive =
        affiliates.filter(
            affiliate =>
                affiliate.status === "inactive"
        ).length;

    document.getElementById(
        "totalAffiliates"
    ).textContent = total;

    document.getElementById(
        "activeAffiliates"
    ).textContent = active;

    document.getElementById(
        "pendingAffiliates"
    ).textContent = pending;

    document.getElementById(
        "inactiveAffiliates"
    ).textContent = inactive;

}

/*
====================================================
RECHERCHE + FILTRE AFFILIÉS
====================================================
*/

function applyFilters() {

    const keyword =
        document
            .getElementById("searchAffiliate")
            .value
            .trim()
            .toLowerCase();

    const status =
        document
            .getElementById("statusFilter")
            .value;

    const filtered =
        affiliates.filter(affiliate => {

            const fullname =
                (affiliate.fullname || "")
                    .toLowerCase();

            const email =
                (affiliate.email || "")
                    .toLowerCase();

            const code =
                (affiliate.affiliate_code || "")
                    .toLowerCase();

            const country =
                (affiliate.country || "")
                    .toLowerCase();

            const matchSearch =

                fullname.includes(keyword) ||
                email.includes(keyword) ||
                code.includes(keyword) ||
                country.includes(keyword);

            const matchStatus =

                status === "all" ||
                affiliate.status === status;

            return (
                matchSearch &&
                matchStatus
            );

        });

const resultsCount =
    document.getElementById(
        "affiliateResultsCount"
    );

resultsCount.textContent =
    `${filtered.length} ${
        filtered.length > 1
            ? "affiliés"
            : "affilié"
    }`;

    renderAffiliates(filtered);

}
const modal = document.getElementById("affiliateModal");
const details = document.getElementById("affiliateDetails");

const editAffiliateModal =
    document.getElementById("editAffiliateModal");

const editAffiliateForm =
    document.getElementById("editAffiliateForm");

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

<div class="affiliate-actions">

   <button
    type="button"
    id="editAffiliateBtn"
    class="btn-primary"
    data-id="${p.id}">

    ✏️ Modifier

</button>

</div>

    `;

}
/*
====================================================
OUVERTURE MODALE MODIFICATION AFFILIÉ
====================================================
*/

document.addEventListener("click", (e) => {

    const btn =
        e.target.closest("#editAffiliateBtn");

    if (!btn) return;

    const affiliateId =
        btn.dataset.id;

    const affiliate =
        affiliates.find(
            a => a.id == affiliateId
        );

    if (!affiliate) {

        showToast(
            "Impossible de retrouver cet affilié.",
            "error"
        );

        return;

    }

    document.getElementById(
        "editAffiliateId"
    ).value = affiliate.id;

    document.getElementById(
        "editFullname"
    ).value = affiliate.fullname || "";

    document.getElementById(
        "editPhone"
    ).value = affiliate.phone || "";

    document.getElementById(
        "editCountry"
    ).value = affiliate.country || "";

    document.getElementById(
        "editStatus"
    ).value = affiliate.status || "pending";

    editAffiliateModal.style.display = "flex";

});
/*
====================================================
FERMETURE MODALE MODIFICATION
====================================================
*/

document
    .getElementById("closeEditAffiliateModal")
    .addEventListener("click", () => {

        editAffiliateModal.style.display = "none";

    });

document
    .getElementById("cancelEditAffiliate")
    .addEventListener("click", () => {

        editAffiliateModal.style.display = "none";

    });

editAffiliateModal.addEventListener("click", (e) => {

    if (e.target === editAffiliateModal) {

        editAffiliateModal.style.display = "none";

    }

});
/*
====================================================
ENREGISTREMENT MODIFICATION AFFILIÉ
====================================================
*/

editAffiliateForm.addEventListener("submit", async (e) => {

    e.preventDefault();

    const saveButton =
        document.getElementById("saveAffiliate");

    saveButton.disabled = true;

    saveButton.textContent =
        "⏳ Enregistrement...";

    try {

        const body = {

            id:
                document.getElementById(
                    "editAffiliateId"
                ).value,

            fullname:
                document.getElementById(
                    "editFullname"
                ).value.trim(),

            phone:
                document.getElementById(
                    "editPhone"
                ).value.trim(),

            country:
                document.getElementById(
                    "editCountry"
                ).value.trim(),

            status:
                document.getElementById(
                    "editStatus"
                ).value

        };

        const { data, error } =
            await sb.functions.invoke(
                "admin-update-affiliate",
                {
                    body
                }
            );

        if (error) throw error;

        /*
        ==============================================
        FERMETURE MODALE
        ==============================================
        */

        editAffiliateModal.style.display =
            "none";

        /*
        ==============================================
        MISE À JOUR LOCALE
        ==============================================
        */

        const index =
            affiliates.findIndex(
                a => a.id == body.id
            );

        if (index !== -1) {

            affiliates[index] = {

                ...affiliates[index],

                ...data.affiliate

            };

        }

        renderAffiliates(affiliates);

        renderAffiliateStats();
        /*
        ==============================================
        RÉINITIALISATION BOUTON
        ==============================================
        */

        saveButton.disabled = false;

        saveButton.textContent =
            "💾 Enregistrer";

        showToast(
            "Affilié modifié avec succès.",
            "success"
        );

    }

    catch (err) {

        console.error(
            "Erreur modification affilié :",
            err
        );

        saveButton.disabled = false;

        saveButton.textContent =
            "💾 Enregistrer";

        showToast(
            err.message ||
            "Erreur lors de la modification.",
            "error"
        );

    }

});