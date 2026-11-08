
/*
==========================================
PROF IA MEDIA PARTNERS
Fichier : formation.js
Rôle : Gestion de l'espace apprenant
==========================================
*/

document.addEventListener("DOMContentLoaded", initFormation);

// État de la progression de l'apprenant
let currentUserId = null;
let currentProductCode = null;
let completedModules = new Set();
let courseModules = [];

// ==========================================
// PROGRAMMES DES FORMATIONS
// ==========================================

const COURSE_PROGRAMS = {

    formation_complete: {

        title: "Créateur de contenu IA de A à Z",

        description:
            "Bienvenue dans votre formation complète. Développez vos compétences en création de contenu avec l'intelligence artificielle.",

        modules: [

            {
                id: "welcome",
                title: "Bienvenue dans la formation",
                videoId: "bHDkshtqk3g",
                resources: []
            },

            {
                id: "module-1",
                title: "Comprendre l'écosystème du contenu",
                videoId: "F5gW6yBvcdw",
                resources: []
            },

            {
                id: "module-2",
                title: "Trouver des idées de contenu",
                videoId: "hC1EOZk4PZA",
                resources: []
            },

            {
                id: "module-3",
                title: "Écriture et storytelling pour les vidéos courtes IA",
                videoId: "K8JMaHL8Xtg",
                resources: []
            },

            {
                id: "module-4",
                title: "Création visuelle avec l'intelligence artificielle",
                videoId: "Qm9cBqZu4fI",
                resources: []
            }

        ]

    }

};


// ==========================================
// INITIALISATION
// ==========================================

async function initFormation() {

    const loading = document.getElementById("courseLoading");
    const application = document.getElementById("courseApplication");

    try {

        // 1. Vérifier la connexion

        const {
            data: { session },
            error: sessionError
        } = await sb.auth.getSession();

        if (sessionError || !session) {
            window.location.href = "login.html";
            return;
        }

        const user = session.user;
        currentUserId = user.id;

        // 2. Récupérer le code produit

        const params = new URLSearchParams(window.location.search);
        const productCode = params.get("product");

        if (!productCode) {
            throw new Error("Aucune formation n'a été spécifiée.");
        }

        // 3. Vérifier les droits d'accès dans Supabase

        const {
            data: access,
            error: accessError
        } = await sb
            .from("product_access")
            .select("id, product_id, status")
            .eq("user_id", user.id)
            .eq("product_id", productCode)
            .eq("status", "active")
            .maybeSingle();

        if (accessError) {
            throw accessError;
        }

        if (!access) {
            alert("Vous ne possédez pas cette formation.");
            window.location.href = "dashboard.html";
            return;
        }

        // 4. Récupérer les informations du produit

        const {
            data: product,
            error: productError
        } = await sb
            .from("products")
            .select("product_name, product_code, description, status")
            .eq("product_code", productCode)
            .eq("status", true)
            .maybeSingle();

        if (productError) {
            throw productError;
        }

        if (!product) {
            throw new Error("Cette formation n'est pas disponible.");
        }

        // 5. Charger le programme correspondant

        const course = COURSE_PROGRAMS[productCode];

        if (!course) {
            throw new Error(
                "Le programme de cette formation n'est pas encore configuré."
            );
        }

        // 6. Charger la progression déjà enregistrée

        currentProductCode = productCode;

        courseModules = course.modules.filter(
            module => module.id !== "welcome"
        );

        const {
            data: progressRows,
            error: progressError
        } = await sb
            .from("course_progress")
            .select("module_id, completed")
            .eq("user_id", currentUserId)
            .eq("product_id", currentProductCode)
            .eq("completed", true);

        if (progressError) {
            throw progressError;
        }

        completedModules = new Set(
            (progressRows || []).map(row => row.module_id)
        );

        // 7. Afficher la formation

        document.getElementById("courseTitle").textContent =
            product.product_name || course.title;

        document.getElementById("courseDescription").textContent =
            product.description || course.description;

        updateProgressDisplay();

        renderModules(course.modules);

        loading.hidden = true;
        application.hidden = false;

    } catch (error) {

        console.error("Erreur espace formation :", error);

        loading.innerHTML = `
            <h2>Impossible de charger la formation</h2>
            <p>${escapeCourseText(error.message || "Une erreur est survenue.")}</p>
            <a href="dashboard.html">Retour au Dashboard</a>
        `;

    }

}


// ==========================================
// AFFICHAGE DES MODULES
// ==========================================

function renderModules(modules) {

    const container = document.getElementById("modulesContainer");

    // Forcer l'affichage vertical

    container.style.setProperty("display", "flex", "important");
    container.style.setProperty("flex-direction", "column", "important");
    container.style.setProperty("align-items", "stretch", "important");

    container.innerHTML = "";

    // Trier les modules dans le bon ordre

    const orderedModules = [...modules].sort((a, b) => {

        if (a.id === "welcome") return -1;
        if (b.id === "welcome") return 1;

        const numberA = Number(a.id.match(/\d+/)?.[0] || 0);
        const numberB = Number(b.id.match(/\d+/)?.[0] || 0);

        return numberA - numberB;

    });

    orderedModules.forEach((module, index) => {

        const button = document.createElement("button");

        button.type = "button";
        button.className = "module-item";
        button.dataset.moduleId = module.id;

        if (completedModules.has(module.id)) {
            button.classList.add("completed");
        }

        button.style.setProperty("order", String(index), "important");
        button.style.setProperty("display", "block", "important");
        button.style.setProperty("width", "100%", "important");

        const isWelcome = module.id === "welcome";

        button.innerHTML = `
            <strong>
                ${isWelcome
                    ? "🎬 VIDÉO DE BIENVENUE"
                    : `MODULE ${module.id.match(/\d+/)?.[0]}`}
            </strong>
            <br>
            <span>${escapeCourseText(module.title)}</span>
            ${completedModules.has(module.id)
                ? '<br><small style="color:#168b58;font-weight:600;">✓ Terminé</small>'
                : ""}
        `;

        button.addEventListener("click", () => {

            container
                .querySelectorAll(".module-item")
                .forEach(item => item.classList.remove("active"));

            button.classList.add("active");

            renderLesson(module);

        });

        container.appendChild(button);

    });

    // Ouvrir automatiquement la vidéo de bienvenue

    if (orderedModules.length > 0) {
        container.querySelector(".module-item").click();
    }

}


// ==========================================
// AFFICHAGE DU CONTENU DU MODULE
// ==========================================


function renderLesson(module) {

    const container = document.getElementById("lessonContainer");

    let videoContent = `
        <div style="
            background:#f2f3f5;
            padding:35px;
            border-radius:12px;
            text-align:center;
            margin:20px 0;
        ">
            <i class="fas fa-video fa-2x"></i>
            <p>La vidéo de ce module sera bientôt disponible.</p>
        </div>
    `;

    if (module.videoId) {
        videoContent = `
            <div class="lesson-video">
                <iframe
                    src="https://www.youtube-nocookie.com/embed/${encodeURIComponent(module.videoId)}"
                    title="${escapeCourseText(module.title)}"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    referrerpolicy="strict-origin-when-cross-origin"
                    allowfullscreen>
                </iframe>
            </div>
        `;
    }

    let resourcesContent = "";

    if (module.resources && module.resources.length > 0) {

        resourcesContent = `
            <div class="lesson-resources">
                <h3>📥 Documents du module</h3>

                ${module.resources.map(resource => `
                    <a
                        class="resource-link"
                        href="${escapeCourseText(resource.url)}"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        <i class="fas fa-file-download"></i>
                        ${escapeCourseText(resource.title)}
                    </a>
                `).join("")}
            </div>
        `;

    } else {

        resourcesContent = `
            <div class="lesson-resources">
                <p>Les supports de ce module seront bientôt disponibles.</p>
            </div>
        `;

    }

    container.innerHTML = `

        ${module.id === "welcome" ? `
            <span style="color:#3157b7;font-weight:600;">
                VIDÉO DE BIENVENUE
            </span>
        ` : `
            <span style="color:#3157b7;font-weight:600;">
                MODULE ${module.id.match(/\d+/)?.[0]}
            </span>
        `}

        <h2>${escapeCourseText(module.title)}</h2>

        ${videoContent}

        ${resourcesContent}

        ${module.id !== "welcome" ? `
            <button
                type="button"
                id="completeModuleButton"
                class="complete-button"
                ${completedModules.has(module.id) ? "disabled" : ""}
            >
                ${completedModules.has(module.id)
                    ? "✓ Module terminé"
                    : "Marquer ce module comme terminé"}
            </button>
        ` : ""}

    `;

    if (module.id !== "welcome") {

        const completeButton =
            document.getElementById("completeModuleButton");

        if (completedModules.has(module.id)) {

            completeButton.style.background = "#168b58";
            completeButton.style.color = "#ffffff";

        } else {

            completeButton.addEventListener("click", () => {
                markModuleCompleted(module, completeButton);
            });

        }

    }

    // Afficher la navigation si le module est terminé
    // ou s'il s'agit de la vidéo de bienvenue

    if (
        module.id === "welcome" ||
        completedModules.has(module.id)
    ) {
        addModuleNavigation(module);
    }

}


function addModuleNavigation(module) {

    const container = document.getElementById("lessonContainer");

    // Éviter les boutons en double
    const oldNavigation = container.querySelector(".module-navigation");

    if (oldNavigation) {
        oldNavigation.remove();
    }

    const navigation = document.createElement("div");

    navigation.className = "module-navigation";

    navigation.style.cssText = `
        margin-top:25px;
        padding:20px;
        border-radius:12px;
        background:#f0f5ff;
        text-align:center;
    `;

    let nextModule = null;

    if (module.id === "welcome") {

        nextModule = courseModules[0];

    } else {

        const currentIndex = courseModules.findIndex(
            item => item.id === module.id
        );

        nextModule = courseModules[currentIndex + 1] || null;

    }

    if (nextModule) {

        const nextNumber = nextModule.id.match(/\d+/)?.[0];

        const button = document.createElement("button");

        button.type = "button";
        button.className = "complete-button";

        button.style.cssText = `
            background:#3157b7;
            color:white;
            padding:14px 22px;
            border:0;
            border-radius:9px;
            cursor:pointer;
            font-weight:600;
        `;

        button.textContent = module.id === "welcome"
            ? "Commencer le module 1 →"
            : `Passer au module ${nextNumber} →`;

        button.addEventListener("click", () => {

            const targetButton = [
                ...document.querySelectorAll(
                    "#modulesContainer .module-item"
                )
            ].find(button =>
                button.dataset.moduleId === nextModule.id
            );

            if (targetButton) {
                targetButton.click();

                document.getElementById("lessonContainer")
                    .scrollIntoView({
                        behavior: "smooth",
                        block: "start"
                    });
            }

        });

        navigation.appendChild(button);

    } else {

        navigation.innerHTML = `
            <h3 style="color:#168b58;">
                🎉 Félicitations !
            </h3>
            <p>
                Vous avez terminé tous les modules de cette formation.
                Continuez à mettre vos connaissances en pratique !
            </p>
        `;

    }

    container.appendChild(navigation);

}


// ==========================================
// AFFICHAGE DE LA PROGRESSION
// ==========================================

function updateProgressDisplay() {

    const totalModules = courseModules.length;

    const completedCount = courseModules.filter(module =>
        completedModules.has(module.id)
    ).length;

    const percentage = totalModules > 0
        ? Math.round((completedCount / totalModules) * 100)
        : 0;

    const percentageElement =
        document.getElementById("progressPercentage");

    const progressBar =
        document.getElementById("progressBar");

    if (percentageElement) {
        percentageElement.textContent = String(percentage);
    }

    if (progressBar) {
        progressBar.style.width = `${percentage}%`;
    }

    let countElement = document.getElementById("progressCount");

    if (!countElement) {

        const progressContainer =
            document.querySelector(".course-progress");

        if (progressContainer) {

            countElement = document.createElement("p");
            countElement.id = "progressCount";
            countElement.style.marginTop = "8px";
            countElement.style.fontSize = "13px";

            progressContainer.appendChild(countElement);

        }

    }

    if (countElement) {

        countElement.textContent =
            `${completedCount} module(s) terminé(s) sur ${totalModules}`;

    }

    // Actualiser les indicateurs dans la liste des modules

    document
        .querySelectorAll("#modulesContainer .module-item")
        .forEach(button => {

            const title = button.querySelector("span");

            if (!title) return;

            const module = courseModules.find(item =>
                item.title === title.textContent
            );

            if (module && completedModules.has(module.id)) {

                button.classList.add("completed");

                if (!button.querySelector(".completion-status")) {

                    const status = document.createElement("small");

                    status.className = "completion-status";
                    status.textContent = "✓ Terminé";

                    status.style.cssText =
                        "display:block;color:#168b58;font-weight:600;margin-top:5px;";

                    button.appendChild(status);

                }

            }

        });

}


// ==========================================
// ENREGISTRER UN MODULE TERMINÉ
// ==========================================

async function markModuleCompleted(module, button) {

    if (!currentUserId || !currentProductCode || module.id === "welcome") {
        return;
    }

    if (completedModules.has(module.id)) {
        return;
    }

    button.disabled = true;
    button.textContent = "Enregistrement en cours...";

    const { error } = await sb
        .from("course_progress")
        .upsert({

            user_id: currentUserId,
            product_id: currentProductCode,
            module_id: module.id,
            completed: true,
            completed_at: new Date().toISOString(),
            updated_at: new Date().toISOString()

        }, {

            onConflict: "user_id,product_id,module_id"

        });

    if (error) {

        console.error("Erreur enregistrement progression :", error);

        alert("Impossible d'enregistrer votre progression. Veuillez réessayer.");

        button.disabled = false;
        button.textContent = "Marquer ce module comme terminé";

        return;

    }

    completedModules.add(module.id);

updateProgressDisplay();

button.disabled = true;
button.textContent = "✓ Module terminé";
button.style.background = "#168b58";
button.style.color = "#ffffff";

// Afficher le bouton pour passer au module suivant
addModuleNavigation(module);

}


// ==========================================
// PROTECTION DU TEXTE AFFICHÉ
// ==========================================

function escapeCourseText(value) {

    return String(value ?? "").replace(/[&<>"']/g, character => ({

        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"

    })[character]);

}
