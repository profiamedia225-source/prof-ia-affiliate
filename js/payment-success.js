async function waitForSession() {

    const status = document.getElementById("status");

    for (let i = 0; i < 20; i++) {

        const {
            data: { session }
        } = await sb.auth.getSession();

        if (session) {

            status.textContent =
                "Connexion réussie. Ouverture de votre espace...";

            setTimeout(() => {

                window.location.replace("dashboard.html");

            }, 1000);

            return;

        }

        status.textContent =
            "Connexion à votre espace...";

        await new Promise(resolve => setTimeout(resolve, 500));

    }

    status.textContent =
        "Session introuvable. Redirection vers la connexion...";

    setTimeout(() => {

        window.location.replace("login.html");

    }, 1500);

}

waitForSession();