const modal = document.getElementById("affiliateModal");
const details = document.getElementById("affiliateDetails");

async function openAffiliateModal(affiliateId) {

    modal.style.display = "flex";

    details.innerHTML = "<p>Chargement...</p>";

    const { data, error } = await sb.functions.invoke(
        "admin-affiliate-details",
        {
            body: {
                affiliate_id: affiliateId
            }
        }
    );

    if (error) {

        details.innerHTML =
            "<p>Erreur lors du chargement.</p>";

        console.error(error);

        return;

    }

    renderAffiliateDetails(data);

}

function closeAffiliateModal() {

    modal.style.display = "none";

}

document
.getElementById("closeModal")
.addEventListener(
    "click",
    closeAffiliateModal
);

window.openAffiliateModal = openAffiliateModal;