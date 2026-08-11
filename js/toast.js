/* ==========================================
   TOAST NOTIFICATIONS
========================================== */

function showToast(message, type = "success", duration = 3000) {

    let container =
        document.querySelector(".toast-container");

    if (!container) {

        container = document.createElement("div");

        container.className = "toast-container";

        document.body.appendChild(container);

    }

    const toast =
        document.createElement("div");

    toast.className = `toast ${type}`;

    const icons = {

        success: "✅",

        error: "❌",

        warning: "⚠️",

        info: "ℹ️"

    };

    toast.innerHTML = `

        <span>

            ${icons[type] || "ℹ️"}

        </span>

        <span>

            ${message}

        </span>

    `;

    container.appendChild(toast);

    setTimeout(() => {

        toast.style.opacity = "0";

        toast.style.transform =
            "translateX(80px)";

        setTimeout(() => {

            toast.remove();

        }, 300);

    }, duration);

}