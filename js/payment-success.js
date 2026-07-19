const client = window.sb;

let timer = 8;

async function goToDashboard() {

    const {
        data: { session }
    } = await client.auth.getSession();

    if (session) {
        window.location.href = "dashboard.html";
    } else {
        window.location.href = "login.html";
    }

}

window.addEventListener("DOMContentLoaded", () => {

    const button = document.getElementById("dashboardButton");

    if (button) {
        button.addEventListener("click", goToDashboard);
    }

    const seconds = document.getElementById("seconds");

    if (seconds) {

        const interval = setInterval(() => {

            timer--;

            seconds.textContent = timer;

            if (timer <= 0) {

                clearInterval(interval);

                goToDashboard();

            }

        }, 1000);

    }

});