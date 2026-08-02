/*
==========================================
PROF IA MEDIA PARTNERS
Settings Loader
==========================================
*/

let appSettings = null;

async function loadSettings() {

    if (appSettings) {

        return appSettings;

    }

    const { data, error } =
        await sb.functions.invoke("get-settings");

    if (error) {

        console.error(error);

        throw new Error(
            "Impossible de charger les paramètres."
        );

    }

    appSettings = data;

    return appSettings;

}

window.loadSettings = loadSettings;