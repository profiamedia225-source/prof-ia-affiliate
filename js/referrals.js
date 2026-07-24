document.addEventListener("DOMContentLoaded", initReferrals);

async function initReferrals() {

    // Vérifier la session
    const {
        data: { session }
    } = await sb.auth.getSession();

    if (!session) {

        window.location.href = "login.html";
        return;

    }

    // Appeler l'Edge Function
    const { data, error } = await sb.functions.invoke(
        "referrals",
        {
            headers: {
                Authorization: `Bearer ${session.access_token}`
            }
        }
    );

    if (error) {

        console.error(error);

        alert("Impossible de charger les filleuls.");

        return;

    }

    displayReferrals(data);

}
function displayReferrals(referrals) {

    const tbody = document.getElementById("referralsBody");

    tbody.innerHTML = "";

    document.getElementById("totalReferrals").textContent =
        `Total : ${referrals.length} filleul(s)`;

    referrals.forEach(referral => {

        const row = document.createElement("tr");

        row.innerHTML = `
            <td>${referral.fullname}</td>
            <td>${referral.email}</td>
            <td>${referral.country}</td>
            <td>${new Date(referral.created_at).toLocaleDateString("fr-FR")}</td>
            <td>${referral.status}</td>
        `;

        tbody.appendChild(row);

    });

}