document.addEventListener("DOMContentLoaded", async () => {
    await loadTopAffiliates();
});

async function loadTopAffiliates() {

    const { data, error } = await sb.functions.invoke(
        "admin-top-affiliates"
    );

    if (error) {
        console.error(error);
        return;
    }

    const tbody = document.querySelector(
        "#topAffiliatesTable tbody"
    );

    tbody.innerHTML = "";

    const medals = ["🥇", "🥈", "🥉", "4", "5"];

    data.forEach((affiliate, index) => {

        tbody.innerHTML += `
            <tr>
                <td>${medals[index] ?? index + 1}</td>
                <td>${affiliate.name}</td>
                <td>${affiliate.sales}</td>
                <td>${Number(affiliate.commissions).toLocaleString("fr-FR")} FCFA</td>
            </tr>
        `;

    });

}