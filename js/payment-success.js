const client = window.sb;

async function goToDashboard() {

    const {
        data: { session },
        error
    } = await client.auth.getSession();

    if (error) {
        alert("Erreur : " + error.message);
        return;
    }

    if (session) {
        alert("Session trouvée pour : " + session.user.email);
        window.location.href = "dashboard.html";
    } else {
        alert("Aucune session trouvée.");
    }

}

window.addEventListener("DOMContentLoaded", () => {

    document
        .getElementById("dashboardButton")
        .addEventListener("click", goToDashboard);

});