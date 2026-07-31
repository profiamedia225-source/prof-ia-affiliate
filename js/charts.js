document.addEventListener("DOMContentLoaded", async () => {
    await loadCharts();
});

async function loadCharts() {

    const { data, error } = await sb.functions.invoke(
        "admin-dashboard-charts"
    );

    if (error) {
        console.error(error);
        return;
    }

    createLineChart(
        "salesChart",
        "Ventes",
        data.salesByMonth
    );

    createLineChart(
        "commissionChart",
        "Commissions",
        data.commissionsByMonth
    );

}

function createLineChart(canvasId, label, dataset) {

    const canvas = document.getElementById(canvasId);

    if (!canvas) return;

    const ctx = canvas.getContext("2d");

    const gradient = ctx.createLinearGradient(
        0,
        0,
        0,
        280
    );

    gradient.addColorStop(0, "rgba(59,130,246,.45)");
    gradient.addColorStop(1, "rgba(59,130,246,.05)");

    new Chart(ctx, {

        type: "line",

        data: {

            labels: dataset.map(item => item.month),

            datasets: [{

                label,

                data: dataset.map(item => item.total),

                fill: true,

                backgroundColor: gradient,

                borderColor: "#3b82f6",

                borderWidth: 3,

                tension: .4,

                pointRadius: 4,

                pointHoverRadius: 6

            }]

        },

        options: {

            responsive: true,

            maintainAspectRatio: false,

            plugins: {

                legend: {

                    display: true

                }

            },

            scales: {

                y: {

                    beginAtZero: true

                }

            }

        }

    });

}