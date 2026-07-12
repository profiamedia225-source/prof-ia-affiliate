/*
==========================================
PROF IA MEDIA PARTNERS
Version : 1.0
Fichier : profile.js
Rôle : Gestion du profil
==========================================
*/

async function getCurrentUser() {

    const {
        data: { session }
    } = await sb.auth.getSession();

    if (!session) {

        window.location.href = "login.html";
        return null;

    }

    return session.user;

}

async function loadProfile() {

    const user = await getCurrentUser();

    if (!user) return null;

    const { data, error } = await sb
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

    if (error) {

        console.error(error);
        return null;

    }

    return data;

}

async function updateProfile(fullname, phone, country) {

    const user = await getCurrentUser();

    if (!user) return false;

    const { error } = await sb
        .from("profiles")
        .update({

            fullname,
            phone,
            country,
            updated_at: new Date().toISOString()

        })
        .eq("id", user.id);

    if (error) {

        console.error(error);
        alert(error.message);

        return false;

    }

    alert("Profil mis à jour avec succès.");

    return true;

}