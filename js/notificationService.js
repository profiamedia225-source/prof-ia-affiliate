/*
==========================================
PROF IA MEDIA PARTNERS
notificationService.js
==========================================
*/

async function createNotification(
    userId,
    type,
    title,
    message,
    channel = "app"
) {

    const { error } = await sb
        .from("notifications")
        .insert({

            user_id: userId,

            type,

            title,

            message,

            channel

        });

    if (error) {

        console.error(
            "Erreur notification :",
            error
        );

        return false;

    }

    return true;

}
/*
==========================================
PROF IA MEDIA PARTNERS
notifications.js
==========================================
*/

document.addEventListener("DOMContentLoaded", async () => {

    try {

        const {
            data: { user },
            error: authError
        } = await sb.auth.getUser();

        if (authError || !user) {

            window.location.href = "login.html";
            return;

        }

        loadNotifications(user.id);

    } catch (err) {

        console.error(err);

    }

});

/* ===================================== */

async function loadNotifications(userId) {

    const container =
        document.getElementById("notificationsContainer");

    container.innerHTML = "";

    const { data, error } = await sb

        .from("notifications")

        .select("*")

        .eq("user_id", userId)

        .order("created_at", { ascending: false });

    if (error) {

        container.innerHTML = `

            <div class="empty">

                Impossible de charger les notifications.

            </div>

        `;

        console.error(error);

        return;

    }

    if (!data || data.length === 0) {

        container.innerHTML = `

            <div class="empty">

                🔔 Vous n'avez aucune notification.

            </div>

        `;

        return;

    }

    data.forEach(notification => {

        const card = document.createElement("div");

        card.className =
            "notification-card";

        if (!notification.is_read) {

            card.classList.add(
                "notification-unread"
            );

        }

        card.innerHTML = `
        
            <div class="notification-title">

                ${notification.title}

            </div>

            <div class="notification-message">

                ${notification.message}

            </div>

            <div class="notification-date">

                ${new Date(notification.created_at)
                    .toLocaleString("fr-FR")}

            </div>
        `;
                if (!notification.is_read) {

            const button =
                document.createElement("button");

            button.className =
                "mark-read-btn";

            button.textContent =
                "✓ Marquer comme lu";

            button.addEventListener(
                "click",
                async () => {

                    await markAsRead(
                        notification.id,
                        userId
                    );

                }
            );

            card.appendChild(button);

        }

        container.appendChild(card);

    });

}

/* ===================================== */

async function markAsRead(
    notificationId,
    userId
) {

    const { error } = await sb

        .from("notifications")

        .update({

            is_read: true

        })

        .eq("id", notificationId);

    if (error) {

        console.error(error);

        alert(
            "Impossible de mettre à jour la notification."
        );

        return;

    }

    // Recharge automatiquement la liste
    loadNotifications(userId);

}