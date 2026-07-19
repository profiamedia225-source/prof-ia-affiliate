const client = window.sb;

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

    document
        .getElementById("dashboardButton")
        .addEventListener("click", goToDashboard);

});