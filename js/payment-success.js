const client = window.sb;

async function goToDashboard() {

    const {
        data: { session }
    } = await client.auth.getSession();

    if (session) {
        window.location.href = "dashboard.html";
    } else {
        alert("Votre session a expiré. Veuillez vous reconnecter.");
        window.location.href = "login.html";
    }

}

window.addEventListener("DOMContentLoaded", () => {

    const button = document.getElementById("dashboardButton");

    if (button) {
        button.addEventListener("click", goToDashboard);
    }

});