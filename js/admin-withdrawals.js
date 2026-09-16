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

    console.log(
        "Retraits :",
        data
    );

    allWithdrawals = data ?? [];

    filteredWithdrawals =
        [...allWithdrawals];

    displayWithdrawals(
        allWithdrawals
    );

    updateStats(
        allWithdrawals
    );

    updatePagination(
        allWithdrawals.length
    );

}


// ==========================================
// AFFICHAGE DES RETRAITS
// ==========================================

function displayWithdrawals(
    withdrawals
) {

    const tbody =
        document.getElementById(
            "withdrawalsTable"
        );

    if (!tbody) return;

    tbody.innerHTML = "";

    document.getElementById(
        "totalWithdrawals"
    ).textContent =
        `Total : ${withdrawals.length} demande(s)`;

    const start =
        (currentPage - 1) *
        rowsPerPage;

    const end =
        start + rowsPerPage;

    const paginatedWithdrawals =
        withdrawals.slice(
            start,
            end
        );

    if (
        paginatedWithdrawals.length === 0
    ) {

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


    paginatedWithdrawals.forEach(
        (withdrawal) => {

            const tr =
                document.createElement(
                    "tr"
                );

            // ==================================
            // STATUT
            // ==================================

            let statusClass =
                "status-inactive";

            let statusLabel =
                withdrawal.status;

            if (
                withdrawal.status ===
                "En attente"
            ) {

                statusClass =
                    "status-pending";

                statusLabel =
                    "🟡 En attente";

            }

            else if (
                withdrawal.status ===
                "En traitement"
            ) {

                statusClass =
                    "status-processing";

                statusLabel =
                    "🔵 En traitement";

            }

            else if (
                withdrawal.status ===
                "paid"
            ) {

                statusClass =
                    "status-active";

                statusLabel =
                    "🟢 Payé";

            }

            else if (
                withdrawal.status ===
                "Refusé"
            ) {

                statusClass =
                    "status-inactive";

                statusLabel =
                    "🔴 Refusé";

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

            if (
                withdrawal.status ===
                "En attente"
            ) {

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

else if (
    withdrawal.status ===
    "En traitement"
) {

    actionButtons += `

        <button
            onclick="payWithdrawalWithSebPay(
                '${withdrawal.id}'
            )"
        >

            💸 Payer avec SebPay

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


            tr.innerHTML = `

                <td>

                    <strong>

                        ${
                            withdrawal
                                .profiles
                                ?.fullname ??
                            "-"
                        }

                    </strong>

                    <br>

                    <small
                        style="
                            color:#64748B;
                        "
                    >

                        💰 Solde :
                        ${
                            Number(
                                withdrawal
                                    .stats
                                    ?.availableBalance ??
                                0
                            )
                            .toLocaleString(
                                "fr-FR"
                            )
                        }
                        FCFA

                    </small>

                    <br>

                    <small
                        style="
                            color:#64748B;
                        "
                    >

                        📈 Commissions :
                        ${
                            Number(
                                withdrawal
                                    .stats
                                    ?.totalCommissions ??
                                0
                            )
                            .toLocaleString(
                                "fr-FR"
                            )
                        }
                        FCFA

                    </small>

                </td>


                <td>

                    ${
                        withdrawal
                            .profiles
                            ?.country ??
                        "-"
                    }

                </td>


                <td>

                    <strong>

                        ${
                            Number(
                                withdrawal.amount
                            )
                            .toLocaleString(
                                "fr-FR"
                            )
                        }
                        FCFA

                    </strong>

                    <br>

                    <small
                        style="
                            color:#64748B;
                        "
                    >

                        📊 Ventes :
                        ${
                            withdrawal
                                .stats
                                ?.sales ??
                            0
                        }

                    </small>

                </td>


                <td>

                    ${
                        withdrawal
                            .payment_method ??
                        "-"
                    }

                </td>


                <td>

                    <div
                        class="payment-number"
                    >

                        <span>

                            ${
                                withdrawal
                                    .payment_details ??
                                "-"
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
                        )
                        .toLocaleDateString(
                            "fr-FR"
                        )
                    }

                </td>


                <td>

                    <span
                        class="${statusClass}"
                    >

                        ${statusLabel}

                    </span>

                </td>


                <td>

                    <div
                        class="action-menu"
                    >

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

        }
    );

}


// ==========================================
// STATISTIQUES
// ==========================================

function updateStats(
    withdrawals
) {

    let pendingCount = 0;

    let processingCount = 0;

    let paidCount = 0;

    let rejectedCount = 0;

    let pendingAmount = 0;


    withdrawals.forEach(
        (withdrawal) => {

            const amount =
                Number(
                    withdrawal.amount
                ) || 0;


            switch (
                withdrawal.status
            ) {

                case "En attente":

                    pendingCount++;

                    pendingAmount +=
                        amount;

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

        }
    );


    const pendingElement =
        document.getElementById(
            "pendingCount"
        );

    const paidElement =
        document.getElementById(
            "paidCount"
        );

    const rejectedElement =
        document.getElementById(
            "rejectedCount"
        );

    const pendingAmountElement =
        document.getElementById(
            "pendingAmount"
        );


    if (pendingElement) {

        pendingElement.textContent =
            pendingCount;

    }


    if (paidElement) {

        paidElement.textContent =
            paidCount;

    }


    if (rejectedElement) {

        rejectedElement.textContent =
            rejectedCount;

    }


    if (pendingAmountElement) {

        pendingAmountElement.textContent =
            pendingAmount
                .toLocaleString(
                    "fr-FR"
                ) +
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

function updatePagination(
    totalItems
) {

    const totalPages =
        Math.max(
            1,
            Math.ceil(
                totalItems /
                rowsPerPage
            )
        );


    if (
        currentPage >
        totalPages
    ) {

        currentPage =
            totalPages;

    }


    const pageInfo =
        document.getElementById(
            "pageInfo"
        );

    const prevPage =
        document.getElementById(
            "prevPage"
        );

    const nextPage =
        document.getElementById(
            "nextPage"
        );


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
            currentPage ===
            totalPages;

    }

}


// ==========================================
// FILTRES + RECHERCHE
// ==========================================

function applyFilters() {

    let filtered =
        [...allWithdrawals];


    // ======================================
    // FILTRE PAR STATUT
    // ======================================

    if (
        currentStatusFilter !==
        "Tous"
    ) {

        filtered =
            filtered.filter(
                (withdrawal) =>
                    withdrawal.status ===
                    currentStatusFilter
            );

    }


    // ======================================
    // RECHERCHE
    // ======================================

    if (
        currentSearch.trim() !==
        ""
    ) {

        const search =
            currentSearch
                .toLowerCase();


        filtered =
            filtered.filter(
                (withdrawal) => {

                    const fullname =
                        (
                            withdrawal
                                .profiles
                                ?.fullname ??
                            ""
                        )
                        .toLowerCase();


                    const country =
                        (
                            withdrawal
                                .profiles
                                ?.country ??
                            ""
                        )
                        .toLowerCase();


                    const payment =
                        (
                            withdrawal
                                .payment_method ??
                            ""
                        )
                        .toLowerCase();


                    const paymentDetails =
                        (
                            withdrawal
                                .payment_details ??
                            ""
                        )
                        .toLowerCase();


                    return (

                        fullname.includes(
                            search
                        )

                        ||

                        country.includes(
                            search
                        )

                        ||

                        payment.includes(
                            search
                        )

                        ||

                        paymentDetails.includes(
                            search
                        )

                    );

                }
            );

    }


    currentPage = 1;

    filteredWithdrawals =
        filtered;


    displayWithdrawals(
        filteredWithdrawals
    );

    updateStats(
        filteredWithdrawals
    );

    updatePagination(
        filteredWithdrawals.length
    );

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

    let confirmationMessage =
        "";


    if (
        status ===
        "En traitement"
    ) {

        confirmationMessage =
            "Voulez-vous mettre ce retrait en traitement ?\n\n" +
            "Aucun paiement SebPay ne sera effectué à cette étape.";

    }

    else if (
        status ===
        "paid"
    ) {

        confirmationMessage =
            "Voulez-vous marquer ce retrait comme payé ?";

    }

    else if (
        status ===
        "Refusé"
    ) {

        confirmationMessage =
            "Voulez-vous vraiment refuser ce retrait ?";

    }


    if (
        confirmationMessage &&
        !confirm(
            confirmationMessage
        )
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
    } =
        await sb.functions.invoke(
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


    if (
        data &&
        data.success === false
    ) {

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
// PAIEMENT SEBPAY
// ==========================================

async function payWithdrawalWithSebPay(
    withdrawalId
) {

    console.log(
        "Demande de paiement SebPay :",
        withdrawalId
    );


    // ======================================
    // RETROUVER LE RETRAIT
    // ======================================

    const withdrawal =
        allWithdrawals.find(
            (item) =>
                String(item.id) ===
                String(withdrawalId)
        );


    if (!withdrawal) {

        alert(
            "Retrait introuvable."
        );

        return;

    }


    // ======================================
    // VERIFICATION DU STATUT
    // ======================================

    if (
        withdrawal.status !==
        "En traitement"
    ) {

        alert(
            "Ce retrait doit être en traitement avant de lancer le paiement SebPay."
        );

        return;

    }


    // ======================================
    // CONFIRMATION
    // ======================================

    const amount =
        Number(
            withdrawal.amount
        ) || 0;


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


    const confirmationMessage =
        "Confirmer le lancement du paiement SebPay ?\n\n" +

        `Bénéficiaire : ${recipientName}\n` +

        `Montant : ${amount.toLocaleString("fr-FR")} FCFA\n` +

        `Opérateur : ${operator}\n` +

        `Téléphone : ${phone}\n\n` +

        "Le statut final sera confirmé par SebPay.\n\n" +

        "En mode actuel, aucun paiement réel ne sera effectué.";


    if (
        !confirm(
            confirmationMessage
        )
    ) {

        return;

    }


    // ======================================
    // SESSION ADMIN
    // ======================================

    const {
        data: {
            session
        }
    } =
        await sb.auth.getSession();


    if (!session) {

        alert(
            "Votre session a expiré. Veuillez vous reconnecter."
        );

        return;

    }


    // ======================================
    // APPEL EDGE FUNCTION
    // ======================================

    console.log(
        "Appel sebpay-payout..."
    );


    let data;
    let error;


    try {

        ({
            data,
            error
        } =
            await sb.functions.invoke(
                "sebpay-payout",
                {

                    body: {

                        withdrawalId:
                            withdrawalId

                    },

                    headers: {

                        Authorization:
                            `Bearer ${session.access_token}`

                    }

                }
            )
        );

    }

    catch (invokeError) {

        console.error(
            "Erreur appel sebpay-payout :",
            invokeError
        );

        alert(
            "Une erreur est survenue lors de la communication avec SebPay."
        );

        return;

    }


    // ======================================
    // ERREUR EDGE FUNCTION
    // ======================================

    if (error) {

        console.error(
            "Erreur sebpay-payout :",
            error
        );

        alert(
            "Le paiement SebPay n'a pas pu être lancé.\n\n" +
            "Consultez la console pour plus de détails."
        );

        return;

    }


    console.log(
        "Réponse sebpay-payout :",
        data
    );


    // ======================================
    // ERREUR METIER
    // ======================================

    if (
        data &&
        data.success === false
    ) {

        alert(
            data.error ??
            "Le paiement SebPay a échoué."
        );

        return;

    }


    // ======================================
    // SIMULATION REUSSIE
    // ======================================

    if (
        data?.simulation === true
    ) {

        const payout =
            data.payout ?? {};


        alert(
            "✅ Paiement SebPay simulé avec succès.\n\n" +

            `Retrait : #${withdrawalId}\n` +

            `Montant : ${Number(
                payout.amount ??
                amount
            ).toLocaleString("fr-FR")} FCFA\n` +

            `Opérateur : ${payout.operator ?? operator}\n` +

            `Statut : ${payout.status ?? "pending"}\n\n` +

            "Aucun paiement réel n'a été effectué."
        );


        // Recharger les retraits
        await loadWithdrawals();

        applyFilters();

        return;

    }


    // ======================================
    // PAYOUT REEL ACCEPTE
    // ======================================

    alert(
        "✅ Demande de paiement SebPay envoyée.\n\n" +

        "Le statut final sera confirmé par le webhook SebPay."
    );


    // Recharger les retraits
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
            document.getElementById(
                "statusFilter"
            );


        const searchInput =
            document.getElementById(
                "searchWithdrawal"
            );


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
    document.getElementById(
        "prevPage"
    );


if (prevPage) {

    prevPage.addEventListener(
        "click",
        () => {

            if (
                currentPage >
                1
            ) {

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
    document.getElementById(
        "nextPage"
    );


if (nextPage) {

    nextPage.addEventListener(
        "click",
        () => {

            const totalPages =
                Math.ceil(
                    filteredWithdrawals.length /
                    rowsPerPage
                );


            if (
                currentPage <
                totalPages
            ) {

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
    document.getElementById(
        "rowsPerPage"
    );


if (rowsSelect) {

    rowsSelect.addEventListener(
        "change",
        () => {

            rowsPerPage =
                Number(
                    rowsSelect.value
                );

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