document.addEventListener("DOMContentLoaded", async () => {
    await loadTopProducts();
});

async function loadTopProducts() {

    const { data, error } = await sb.functions.invoke(
        "admin-top-products"
    );

    if (error) {
        console.error(error);
        return;
    }

    const tbody = document.querySelector(
        "#topProductsTable tbody"
    );

    tbody.innerHTML = "";

    const medals = ["🥇", "🥈", "🥉", "4", "5"];

    data.forEach((product, index) => {

        tbody.innerHTML += `
            <tr>
                <td>${medals[index] ?? index + 1}</td>
                <td>${product.product_name}</td>
                <td>${product.sales}</td>
                <td>${Number(product.revenue).toLocaleString("fr-FR")} FCFA</td>
            </tr>
        `;

    });

}