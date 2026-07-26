/*
==========================================
PROF IA MEDIA PARTNERS
withdrawals.js
Source unique du solde :
dashboard-stats
==========================================
*/

document.addEventListener(
    "DOMContentLoaded",
    initWithdrawals
);

async function initWithdrawals() {

    const {
        data: { session }
    } = await sb.auth.getSession();

    if (!session) {

        window.location.href = "login.html";
        return;

    }

    await loadAvailableBalance(session);

}

async function loadAvailableBalance(session) {

    const { data, error } =
        await sb.functions.invoke(
            "dashboard-stats",
            {
                headers: {
                    Authorization:
                        `Bearer ${session.access_token}`
                }
            }
        );

    if (error) {

        console.error(
            "Erreur dashboard-stats :",
            error
        );

        alert(
            "Impossible de charger votre solde disponible."
        );

        return;

    }

    const availableBalance =
        Number(
            data.availableBalance ?? 0
        );

    document.getElementById(
        "availableBalance"
    ).textContent =
        `${availableBalance.toLocaleString("fr-FR")} FCFA`;

}

const form = document.getElementById("withdrawForm");

const method = document.getElementById("method");
const paymentLabel = document.getElementById("paymentLabel");
const paymentDetails = document.getElementById("paymentDetails");

form.addEventListener("submit", async (e) => {

    e.preventDefault();

    const amount = Number(
        document.getElementById("amount").value
    );

    const availableBalance = Number(
        document
            .getElementById("availableBalance")
            .textContent
            .replace("FCFA", "")
            .replace(/\s/g, "")
            .replace(/,/g, ".")
    );

    if (amount <= 0) {

        alert("Veuillez saisir un montant valide.");
        return;

    }

    if (amount > availableBalance) {

        alert("Le montant demandé dépasse votre solde disponible.");
        return;

    }

    const {
        data: { session }
    } = await sb.auth.getSession();

    if (!session) {

        alert("Votre session a expiré.");
        window.location.href = "login.html";
        return;

    }

    const { error } = await sb.functions.invoke(
        "withdraw-request",
        {
            body: {
                amount,
                paymentMethod: method.value,
                paymentDetails: paymentDetails.value
            },
            headers: {
                Authorization: `Bearer ${session.access_token}`
            }
        }
    );

    if (error) {

        console.error(error);

        alert(
            "Impossible d'envoyer la demande de retrait."
        );

        return;

    }

    alert(
        "Votre demande de retrait a été enregistrée avec succès."
    );

    form.reset();

    // Recharge immédiatement le vrai solde
    await loadAvailableBalance(session);

});

method.addEventListener("change", () => {

    switch (method.value) {

        case "Wave":

            paymentLabel.textContent = "Numéro Wave";
            paymentDetails.placeholder = "Ex : 0701234567";
            break;

        case "Orange Money":

            paymentLabel.textContent = "Numéro Orange Money";
            paymentDetails.placeholder = "Ex : 0701234567";
            break;

        case "MTN Money":

            paymentLabel.textContent = "Numéro MTN Money";
            paymentDetails.placeholder = "Ex : 0501234567";
            break;

        case "Moov Money":

            paymentLabel.textContent = "Numéro Moov Money";
            paymentDetails.placeholder = "Ex : 0101234567";
            break;

        case "Virement bancaire":

            paymentLabel.textContent = "IBAN ou numéro de compte";
            paymentDetails.placeholder = "Ex : CI12 1234 5678...";
            break;

        default:

            paymentLabel.textContent =
                "Numéro ou informations de paiement";

            paymentDetails.placeholder =
                "Ex : 0701234567 ou IBAN";

    }

});