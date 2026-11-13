console.log("admin-withdrawals.js chargé");

let allWithdrawals = [];
let currentStatusFilter = "Tous";
let currentSearch = "";
let currentPage = 1;
let rowsPerPage = 10;
let filteredWithdrawals = [];

document.addEventListener("DOMContentLoaded", loadWithdrawals);


// ==========================================
// CHARGEMENT DES RETRAITS
// ==========================================

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

    console.log(
        "Utilisateur connecté :",
        session.user.id
    );

    const { data, error } =
        await sb.functions.invoke(
            "admin-withdrawals",
            {
                headers: {
                    Authorization:
                        `Bearer ${session.access_token}`
                }
            }
        );

    console.log("Erreur :", error);
    console.log("Données :", data);

    if (error) {
        console.error(error);

        alert(
            "Impossible de charger les retraits."
        );

        return;
    }

    console.log("Retraits :", data);

    allWithdrawals = data ?? [];
    filteredWithdrawals = [...allWithdrawals];

    displayWithdrawals(allWithdrawals);
    updateStats(allWithdrawals);
    updatePagination(allWithdrawals.length);
}


// ==========================================
// AFFICHAGE DES RETRAITS
// ==========================================

function displayWithdrawals(withdrawals) {

    const tbody =
        document.getElementById("withdrawalsTable");

    if (!tbody) return;

    tbody.innerHTML = "";

    const totalElement =
        document.getElementById("totalWithdrawals");

    if (totalElement) {
        totalElement.textContent =
            `Total : ${withdrawals.length} demande(s)`;
    }

    const start =
        (currentPage - 1) * rowsPerPage;

    const end =
        start + rowsPerPage;

    const paginatedWithdrawals =
        withdrawals.slice(start, end);

    if (paginatedWithdrawals.length === 0) {

        tbody.innerHTML = `
            <tr>
                <td
                    colspan="8"
                    style="
                        text-align:center;
                        padding:40px;
                    "
                >
                    Aucun retrait trouvé.
                </td>
            </tr>
        `;

        return;
    }

    paginatedWithdrawals.forEach((withdrawal) => {

        const tr = document.createElement("tr");

        // ==================================
        // STATUT
        // ==================================

        let statusClass = "status-inactive";
        let statusLabel = withdrawal.status;

        if (withdrawal.status === "En attente") {
            statusClass = "status-pending";
            statusLabel = "🟡 En attente";
        }
        else if (withdrawal.status === "En traitement") {
            statusClass = "status-processing";
            statusLabel = "🔵 En traitement";
        }
        else if (withdrawal.status === "paid") {
            statusClass = "status-active";
            statusLabel = "🟢 Payé";
        }
        else if (withdrawal.status === "Refusé") {
            statusClass = "status-inactive";
            statusLabel = "🔴 Refusé";
        }

        // ==================================
        // ACTIONS
        // ==================================

        let actionButtons = `

            <button
                onclick="openAffiliateCRM(
                    '${withdrawal.affiliate_id}'
                )"
            >
                👁 Voir le CRM
            </button>

            <button
                onclick="copyPaymentNumber(
                    '${withdrawal.payment_details}'
                )"
            >
                📋 Copier le numéro
            </button>

        `;

        // ==================================
        // RETRAIT EN ATTENTE
        // ==================================

        if (withdrawal.status === "En attente") {

            actionButtons += `

                <button
                    onclick="updateWithdrawal(
                        '${withdrawal.id}',
                        'En traitement'
                    )"
                >
                    🔵 Mettre en traitement
                </button>

                <button
                    onclick="updateWithdrawal(
                        '${withdrawal.id}',
                        'paid'
                    )"
                >
                    💳 Valider
                </button>

                <button
                    onclick="updateWithdrawal(
                        '${withdrawal.id}',
                        'Refusé'
                    )"
                >
                    ❌ Refuser
                </button>

            `;
        }

        // ==================================
        // RETRAIT EN TRAITEMENT
        // ==================================

        else if (withdrawal.status === "En traitement") {

            actionButtons += `

                <button
                    onclick="payWithdrawalWithJeko(
                        '${withdrawal.id}'
                    )"
                >
                    💸 Payer avec Jèko
                </button>

                <button
                    onclick="updateWithdrawal(
                        '${withdrawal.id}',
                        'Refusé'
                    )"
                >
                    ❌ Refuser
                </button>

            `;
        }

        // ==================================
        // CONSTRUCTION DE LA LIGNE
        // ==================================

        tr.innerHTML = `

            <td>

                <strong>
                    ${
                        withdrawal.profiles?.fullname ??
                        "-"
                    }
                </strong>

                <br>

                <small style="color:#64748B;">
                    💰 Solde :
                    ${
                        Number(
                            withdrawal.stats?.availableBalance ?? 0
                        ).toLocaleString("fr-FR")
                    }
                    FCFA
                </small>

                <br>

                <small style="color:#64748B;">
                    📈 Commissions :
                    ${
                        Number(
                            withdrawal.stats?.totalCommissions ?? 0
                        ).toLocaleString("fr-FR")
                    }
                    FCFA
                </small>

            </td>

            <td>
                ${
                    withdrawal.profiles?.country ?? "-"
                }
            </td>

            <td>

                <strong>
                    ${
                        Number(withdrawal.amount)
                            .toLocaleString("fr-FR")
                    }
                    FCFA
                </strong>

                <br>

                <small style="color:#64748B;">
                    📊 Ventes :
                    ${
                        withdrawal.stats?.sales ?? 0
                    }
                </small>

            </td>

            <td>
                ${
                    withdrawal.payment_method ?? "-"
                }
            </td>

            <td>

                <div class="payment-number">

                    <span>
                        ${
                            withdrawal.payment_details ?? "-"
                        }
                    </span>

                    <button
                        class="copy-btn"
                        onclick="copyPaymentNumber(
                            '${withdrawal.payment_details}'
                        )"
                    >
                        📋
                    </button>

                </div>

            </td>

            <td>
                ${
                    new Date(
                        withdrawal.created_at
                    ).toLocaleDateString("fr-FR")
                }
            </td>

            <td>

                <span class="${statusClass}">
                    ${statusLabel}
                </span>

            </td>

            <td>

                <div class="action-menu">

                    <button
                        class="action-toggle"
                        onclick="toggleActionMenu(
                            '${withdrawal.id}'
                        )"
                    >
                        ⋮
                    </button>

                    <div
                        id="menu-${withdrawal.id}"
                        class="action-dropdown"
                    >
                        ${actionButtons}
                    </div>

                </div>

            </td>

        `;

        tbody.appendChild(tr);

    });

}


// ==========================================
// STATISTIQUES
// ==========================================

function updateStats(withdrawals) {

    let pendingCount = 0;
    let processingCount = 0;
    let paidCount = 0;
    let rejectedCount = 0;
    let pendingAmount = 0;

    withdrawals.forEach((withdrawal) => {

        const amount =
            Number(withdrawal.amount) || 0;

        switch (withdrawal.status) {

            case "En attente":
                pendingCount++;
                pendingAmount += amount;
                break;

            case "En traitement":
                processingCount++;
                break;

            case "paid":
                paidCount++;
                break;

            case "Refusé":
                rejectedCount++;
                break;
        }

    });

    const pendingElement =
        document.getElementById("pendingCount");

    const paidElement =
        document.getElementById("paidCount");

    const rejectedElement =
        document.getElementById("rejectedCount");

    const pendingAmountElement =
        document.getElementById("pendingAmount");

    if (pendingElement) {
        pendingElement.textContent = pendingCount;
    }

    if (paidElement) {
        paidElement.textContent = paidCount;
    }

    if (rejectedElement) {
        rejectedElement.textContent = rejectedCount;
    }

    if (pendingAmountElement) {
        pendingAmountElement.textContent =
            pendingAmount.toLocaleString("fr-FR") +
            " FCFA";
    }

    console.log(
        "Retraits en attente :",
        pendingCount
    );

    console.log(
        "Retraits en traitement :",
        processingCount
    );

}


// ==========================================
// PAGINATION
// ==========================================

function updatePagination(totalItems) {

    const totalPages =
        Math.max(
            1,
            Math.ceil(totalItems / rowsPerPage)
        );

    if (currentPage > totalPages) {
        currentPage = totalPages;
    }

    const pageInfo =
        document.getElementById("pageInfo");

    const prevPage =
        document.getElementById("prevPage");

    const nextPage =
        document.getElementById("nextPage");

    if (pageInfo) {
        pageInfo.textContent =
            `Page ${currentPage} sur ${totalPages}`;
    }

    if (prevPage) {
        prevPage.disabled =
            currentPage === 1;
    }

    if (nextPage) {
        nextPage.disabled =
            currentPage === totalPages;
    }

}


// ==========================================
// FILTRES + RECHERCHE
// ==========================================

function applyFilters() {

    let filtered = [...allWithdrawals];

    // ======================================
    // FILTRE PAR STATUT
    // ======================================

    if (currentStatusFilter !== "Tous") {

        filtered = filtered.filter(
            (withdrawal) =>
                withdrawal.status === currentStatusFilter
        );

    }

    // ======================================
    // RECHERCHE
    // ======================================

    if (currentSearch.trim() !== "") {

        const search =
            currentSearch.toLowerCase();

        filtered = filtered.filter((withdrawal) => {

            const fullname =
                (
                    withdrawal.profiles?.fullname ?? ""
                ).toLowerCase();

            const country =
                (
                    withdrawal.profiles?.country ?? ""
                ).toLowerCase();

            const payment =
                (
                    withdrawal.payment_method ?? ""
                ).toLowerCase();

            const paymentDetails =
                (
                    withdrawal.payment_details ?? ""
                ).toLowerCase();

            return (
                fullname.includes(search) ||
                country.includes(search) ||
                payment.includes(search) ||
                paymentDetails.includes(search)
            );

        });

    }

    currentPage = 1;
    filteredWithdrawals = filtered;

    displayWithdrawals(filteredWithdrawals);
    updateStats(filteredWithdrawals);
    updatePagination(filteredWithdrawals.length);

}


// ==========================================
// MISE À JOUR D'UN RETRAIT
// ==========================================

async function updateWithdrawal(
    withdrawalId,
    status
) {

    console.log(
        "Mise à jour retrait :",
        withdrawalId,
        status
    );

    // ======================================
    // CONFIRMATION
    // ======================================

    let confirmationMessage = "";

    if (status === "En traitement") {

        confirmationMessage =
            "Voulez-vous mettre ce retrait en traitement ?\n\n" +
            "Cette étape prépare le retrait. Le transfert Jèko sera lancé séparément avec le bouton de paiement.";

    }
    else if (status === "paid") {

        confirmationMessage =
            "Voulez-vous marquer ce retrait comme payé ?";

    }
    else if (status === "Refusé") {

        confirmationMessage =
            "Voulez-vous vraiment refuser ce retrait ?";

    }

    if (
        confirmationMessage &&
        !confirm(confirmationMessage)
    ) {
        return;
    }

    const {
        data: { session }
    } = await sb.auth.getSession();

    if (!session) {

        alert(
            "Votre session a expiré. Veuillez vous reconnecter."
        );

        return;
    }

    const {
        data,
        error
    } = await sb.functions.invoke(
        "admin-update-withdrawal",
        {
            body: {
                withdrawalId,
                status
            },
            headers: {
                Authorization:
                    `Bearer ${session.access_token}`
            }
        }
    );

    if (error) {

        alert(
            "Erreur lors de la mise à jour."
        );

        console.error(
            "Erreur updateWithdrawal :",
            error
        );

        return;
    }

    console.log(
        "Réponse mise à jour :",
        data
    );

    if (data && data.success === false) {

        alert(
            data.error ||
            "La mise à jour a échoué."
        );

        return;
    }

    await loadWithdrawals();
    applyFilters();

}


// ==========================================
// PAIEMENT JÈKO
// ==========================================

async function payWithdrawalWithJeko(
    withdrawalId
) {

    console.log(
        "Demande de paiement Jèko :",
        withdrawalId
    );

    // Retrouver le retrait dans les données déjà chargées.
    const withdrawal =
        allWithdrawals.find(
            (item) =>
                String(item.id) ===
                String(withdrawalId)
        );

    if (!withdrawal) {

        alert(
            "Retrait introuvable. Rechargez la page puis réessayez."
        );

        return;
    }

    // Le payout Jèko ne doit être lancé qu'après validation administrative.
    if (withdrawal.status !== "En traitement") {

        alert(
            "Le retrait doit être au statut « En traitement » avant le paiement Jèko."
        );

        return;
    }

    // Protection supplémentaire contre un double envoi.
    if (
        withdrawal.provider_reference ||
        withdrawal.provider_transaction_id
    ) {

        alert(
            "Une référence de paiement existe déjà pour ce retrait.\n\n" +
            "Ne relancez pas le transfert. Vérifiez son état dans Jèko et consultez le webhook."
        );

        return;
    }

    const amount =
        Number(withdrawal.amount) || 0;

    const recipientName =
        withdrawal.recipient_name ??
        withdrawal.profiles?.fullname ??
        "Bénéficiaire";

    const operator =
        withdrawal.operator ??
        withdrawal.payment_method ??
        "-";

    const phone =
        withdrawal.phone ??
        withdrawal.payment_details ??
        "-";

    if (!Number.isFinite(amount) || amount <= 0) {

        alert(
            "Le montant de ce retrait est invalide."
        );

        return;
    }

    const confirmationMessage =
        "Confirmer l'envoi du paiement via Jèko ?\n\n" +
        `Bénéficiaire : ${recipientName}\n` +
        `Montant : ${amount.toLocaleString("fr-FR")} FCFA\n` +
        `Opérateur : ${operator}\n` +
        `Téléphone : ${phone}\n\n` +
        "Cette action transmettra une demande de transfert réelle à Jèko.\n" +
        "Ne cliquez qu'une seule fois. Le webhook confirmera le résultat final.";

    if (!confirm(confirmationMessage)) {
        return;
    }

    // Vérifier que la session administrateur est toujours active.
    const {
        data: { session },
        error: sessionError
    } = await sb.auth.getSession();

    if (sessionError || !session) {

        alert(
            "Votre session a expiré. Veuillez vous reconnecter."
        );

        return;
    }

    // Appel de la fonction Supabase jeko-payout.
    let data;
    let error;

    try {

        ({ data, error } = await sb.functions.invoke(
            "jeko-payout",
            {
                body: {
                    withdrawalId: withdrawalId
                },
                headers: {
                    Authorization:
                        `Bearer ${session.access_token}`
                }
            }
        ));

    } catch (invokeError) {

        console.error(
            "Erreur appel jeko-payout :",
            invokeError
        );

        alert(
            "La communication avec Jèko a échoué.\n\n" +
            "Vérifiez le statut du retrait et les journaux Supabase avant toute nouvelle tentative."
        );

        return;
    }

    if (error) {

        console.error(
            "Erreur jeko-payout :",
            error
        );

        alert(
            "La demande de paiement n'a pas pu être confirmée.\n\n" +
            "Consultez les journaux de la fonction jeko-payout. Ne relancez pas le paiement sans vérifier son état chez Jèko."
        );

        return;
    }

    console.log(
        "Réponse jeko-payout :",
        data
    );

    if (!data || data.success !== true) {

        const message =
            data?.error ??
            data?.message ??
            "Jèko n'a pas confirmé la demande de transfert.";

        alert(
            `Paiement non confirmé : ${message}` +
            (
                data?.provider_reference || data?.reference
                    ? `\nRéférence : ${
                        data.provider_reference ?? data.reference
                    }`
                    : ""
            ) +
            "\n\nVérifiez le statut chez Jèko avant toute nouvelle tentative."
        );

        await loadWithdrawals();
        applyFilters();

        return;
    }

    const reference =
        data.provider_reference ??
        data.reference ??
        "Non communiquée";

    const transactionId =
        data.provider_transaction_id ??
        data.transaction_id ??
        "En attente";

    const jekoStatus =
        data.jeko_status ?? "pending";

    alert(
        "✅ Demande de transfert transmise à Jèko.\n\n" +
        `Retrait : #${withdrawalId}\n` +
        `Montant : ${
            Number(
                data.amount_xof ??
                data.amount_fcfa ??
                amount
            ).toLocaleString("fr-FR")
        } FCFA\n` +
        `Opérateur : ${
            data.payment_method ??
            data.operator ??
            operator
        }\n` +
        `Référence : ${reference}\n` +
        `Transaction Jèko : ${transactionId}\n` +
        `Statut Jèko : ${jekoStatus}\n\n` +
        "Le retrait reste « En traitement » jusqu'à la confirmation finale du webhook Jèko."
    );

    // Recharger l'état réel enregistré dans Supabase.
    await loadWithdrawals();
    applyFilters();

}


// ==========================================
// GESTION DES FILTRES
// ==========================================

document.addEventListener(
    "DOMContentLoaded",
    () => {

        const statusFilter =
            document.getElementById("statusFilter");

        const searchInput =
            document.getElementById("searchWithdrawal");

        if (statusFilter) {

            statusFilter.addEventListener(
                "change",
                () => {

                    currentStatusFilter =
                        statusFilter.value;

                    applyFilters();

                }
            );

        }

        if (searchInput) {

            searchInput.addEventListener(
                "input",
                () => {

                    currentSearch =
                        searchInput.value;

                    applyFilters();

                }
            );

        }

    }
);


// ==========================================
// PAGINATION : PRÉCÉDENT
// ==========================================

const prevPage =
    document.getElementById("prevPage");

if (prevPage) {

    prevPage.addEventListener(
        "click",
        () => {

            if (currentPage > 1) {

                currentPage--;

                displayWithdrawals(
                    filteredWithdrawals
                );

                updatePagination(
                    filteredWithdrawals.length
                );

            }

        }
    );

}


// ==========================================
// PAGINATION : SUIVANT
// ==========================================

const nextPage =
    document.getElementById("nextPage");

if (nextPage) {

    nextPage.addEventListener(
        "click",
        () => {

            const totalPages =
                Math.ceil(
                    filteredWithdrawals.length /
                    rowsPerPage
                );

            if (currentPage < totalPages) {

                currentPage++;

                displayWithdrawals(
                    filteredWithdrawals
                );

                updatePagination(
                    filteredWithdrawals.length
                );

            }

        }
    );

}


// ==========================================
// NOMBRE DE LIGNES PAR PAGE
// ==========================================

const rowsSelect =
    document.getElementById("rowsPerPage");

if (rowsSelect) {

    rowsSelect.addEventListener(
        "change",
        () => {

            rowsPerPage =
                Number(rowsSelect.value);

            currentPage = 1;

            displayWithdrawals(
                filteredWithdrawals
            );

            updatePagination(
                filteredWithdrawals.length
            );

        }
    );

}