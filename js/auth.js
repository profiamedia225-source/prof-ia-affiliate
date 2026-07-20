/*
==========================================
PROF IA MEDIA PARTNERS
Version : 1.0
Fichier : auth.js
Rôle : Authentification
==========================================
*/
// ==========================================
// CODE D'AFFILIATION
// ==========================================

const referralCode =
    localStorage.getItem("affiliate_ref");
    console.log("Referral Code :", referralCode);

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
    APP_URL +
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

    role: "affiliate",

    pending_referral_code: referralCode || null

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

   window.location.href = "payment.html";

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

    // Connexion
    const { data, error } = await sb.auth.signInWithPassword({
        email,
        password
    });

    if (error) {
        alert(error.message);
        return;
    }

    const user = data.user;

    // Vérifie s'il existe une commande payée
    const { data: order, error: orderError } = await sb
        .from("orders")
        .select("status")
        .eq("user_id", user.id)
        .eq("status", "paid")
        .maybeSingle();

    if (orderError) {
        console.error(orderError);
    }

    if (order) {

        // Paiement effectué
        window.location.href = "dashboard.html";

    } else {

        // Paiement non effectué
        window.location.href = "payment.html";

    }

}

// ==========================================
// DECONNEXION
// ==========================================

async function logout() {

    await sb.auth.signOut();

    window.location.href = "login.html";

}

window.logout = logout;