/*
==========================================
PROF IA MEDIA PARTNERS
Version : 1.0
Fichier : auth.js
Rôle : Authentification
==========================================
*/

document.addEventListener("DOMContentLoaded", () => {

    initRegister();
    initLogin();

});

// ==========================================
// INSCRIPTION
// ==========================================

function initRegister() {

    const form = document.getElementById("registerForm");

    if (!form) return;

    form.addEventListener("submit", registerUser);

}

async function registerUser(e) {

    e.preventDefault();

    const fullname = document.getElementById("fullname").value.trim();
    const email = document.getElementById("email").value.trim().toLowerCase();
    const phone = document.getElementById("phone").value.trim();
    const country = document.getElementById("country").value.trim();
    const password = document.getElementById("password").value;
    const confirmPassword = document.getElementById("confirmPassword").value;

    if (password !== confirmPassword) {

        alert("Les mots de passe ne correspondent pas.");
        return;

    }

    const affiliateCode =
        "PIM-" +
        crypto.randomUUID()
        .replaceAll("-", "")
        .substring(0, 8)
        .toUpperCase();

    const affiliateLink =
        window.location.origin +
        "/?ref=" +
        affiliateCode;

    // Création Auth
    const { data, error } = await sb.auth.signUp({

        email,
        password,

        options: {

            data: {

                fullname,
                phone,
                country

            }

        }

    });

    if (error) {

        alert(error.message);
        return;

    }

    const user = data.user;

    if (!user) {

        alert("Impossible de créer le compte.");
        return;

    }

    // Création du profil
    const { error: profileError } = await sb
        .from("profiles")
        .insert({

            id: user.id,

            fullname,

            email,

            phone,

            country,

            affiliate_code: affiliateCode,

            affiliate_link: affiliateLink,

            status: "active",

            role: "affiliate"

        });

   if (profileError) {

    console.error(profileError);

    alert(JSON.stringify(profileError, null, 2));

    return;

}

    // Connexion
    const { error: loginError } =
        await sb.auth.signInWithPassword({

            email,
            password

        });

    if (loginError) {

        alert(loginError.message);

        return;

    }

    window.location.href = "dashboard.html";

}

// ==========================================
// CONNEXION
// ==========================================

function initLogin() {

    const form = document.getElementById("loginForm");

    if (!form) return;

    form.addEventListener("submit", loginUser);

}

async function loginUser(e) {

    e.preventDefault();

    const email =
        document.getElementById("email").value.trim().toLowerCase();

    const password =
        document.getElementById("password").value;

    const { error } =
        await sb.auth.signInWithPassword({

            email,
            password

        });

    if (error) {

        alert(error.message);

        return;

    }

    window.location.href = "dashboard.html";

}

// ==========================================
// DECONNEXION
// ==========================================

async function logout() {

    await sb.auth.signOut();

    window.location.href = "login.html";

}

window.logout = logout;