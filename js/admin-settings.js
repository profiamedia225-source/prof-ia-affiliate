console.log("admin-settings.js chargé");

document.addEventListener("DOMContentLoaded", () => {

    loadSettings();

    document
        .getElementById("saveSettings")
        .addEventListener("click", saveSettings);

});

async function loadSettings() {

    try {

        const {
            data: { session }
        } = await sb.auth.getSession();

        if (!session) {

            alert("Session expirée.");

            return;

        }

        const { data, error } =
            await sb.functions.invoke(
                "admin-settings",
                {
                    headers: {
                        Authorization:
                            `Bearer ${session.access_token}`
                    }
                }
            );

        if (error) {

            console.error(error);

            alert("Impossible de charger les paramètres.");

            return;

        }

        fillSettings(data);

    }

    catch (err) {

        console.error(err);

    }

}

function fillSettings(settings) {

    settings.forEach(setting => {

        const field =
            document.getElementById(
                setting.setting_key
            );

        if (!field) return;

        field.value = setting.setting_value;

    });

}

async function saveSettings() {

    const button =
        document.getElementById("saveSettings");

    button.disabled = true;

    button.innerHTML = "⏳ Enregistrement...";

    const settings = [];

    document
        .querySelectorAll(".settings-input")
        .forEach(field => {

            settings.push({

                setting_key: field.id,

                setting_value: field.value

            });

        });

    try {

        const {
            data: { session }
        } = await sb.auth.getSession();

        const { data, error } =
            await sb.functions.invoke(
                "admin-update-settings",
                {
                    body: settings,
                    headers: {
                        Authorization:
                            `Bearer ${session.access_token}`
                    }
                }
            );

        if (error) {

            console.error(error);

            alert("Erreur lors de l'enregistrement.");

            return;

        }

        button.innerHTML =
            "✅ Paramètres enregistrés";

        setTimeout(() => {

            button.innerHTML =
                "💾 Enregistrer les modifications";

            button.disabled = false;

        }, 2000);

    }

    catch (err) {

        console.error(err);

        alert("Erreur interne.");

        button.disabled = false;

        button.innerHTML =
            "💾 Enregistrer les modifications";

    }

}