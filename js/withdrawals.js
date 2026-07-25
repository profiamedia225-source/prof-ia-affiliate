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
const form = document.getElementById("withdrawForm");

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
    );

    if (amount <= 0) {

        alert("Veuillez saisir un montant valide.");

        return;

    }

    if (amount > availableBalance) {

        alert("Le montant demandé dépasse votre solde disponible.");

        return;

    }

    alert("Montant valide. La demande peut être envoyée.");

});
const method = document.getElementById("method");
const paymentLabel = document.getElementById("paymentLabel");
const paymentDetails = document.getElementById("paymentDetails");

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