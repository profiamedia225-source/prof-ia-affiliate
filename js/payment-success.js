const client = window.sb;

async function goToDashboard() {

    const {
        data: { session }
    } = await client.auth.getSession();

    console.log("Utilisateur connecté :", session?.user?.email);

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