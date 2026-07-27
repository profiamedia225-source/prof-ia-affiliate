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
// ==========================================
// Initialisation de la page Profil
// ==========================================

document.addEventListener("DOMContentLoaded", async () => {

    const user = await getCurrentUser();

    if (!user) return;

    const profile = await loadProfile();

    if (!profile) return;

    document.getElementById("fullname").value =
        profile.fullname ?? "";

    document.getElementById("email").value =
        user.email ?? "";

    document.getElementById("phone").value =
        profile.phone ?? "";

    document.getElementById("country").value =
        profile.country ?? "";

});
// ==========================================
// Sauvegarde du profil
// ==========================================

const profileForm = document.getElementById("profileForm");

if (profileForm) {

    profileForm.addEventListener("submit", async (e) => {

        e.preventDefault();

        const fullname =
            document.getElementById("fullname").value.trim();

        const phone =
            document.getElementById("phone").value.trim();

        const country =
            document.getElementById("country").value.trim();

        await updateProfile(
            fullname,
            phone,
            country
        );

    });

}

    const passwordForm = document.getElementById("passwordForm");

if(passwordForm){

    passwordForm.addEventListener("submit", updatePassword);

}

async function updatePassword(e){

    e.preventDefault();

    const password =
        document.getElementById("newPassword").value;

    const confirm =
        document.getElementById("confirmPassword").value;

    if(password !== confirm){

        alert("Les mots de passe ne correspondent pas.");

        return;

    }

    if(password.length < 6){

        alert("Le mot de passe doit contenir au moins 6 caractères.");

        return;

    }

    const { data, error } = await sb.auth.updateUser({
    password
});

console.log(data);
console.log(error);

    if(error){

        alert(error.message);

        return;

    }

    alert("Mot de passe modifié avec succès.");

    passwordForm.reset();

}