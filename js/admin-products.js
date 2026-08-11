/*
====================================================
PROF IA MEDIA PARTNERS
Gestion des Produits
====================================================
*/

let products = [];

document.addEventListener("DOMContentLoaded", async () => {

    try {

        await initPage();

    }catch (error) {

    console.error(error);

    showToast(
        "Impossible de charger les produits.",
        "error"
    );

}
});

async function initPage() {

    await loadProducts();

}
async function loadProducts() {

    const {
        data: { session }
    } = await sb.auth.getSession();

    if (!session) {

        window.location.href = "login.html";

        return;

    }

    const { data, error } =
        await sb.functions.invoke(
            "admin-products",
            {
                body: {}
            }
        );

    if (error) throw error;

    products = data.products || [];

    renderStats(data.stats);

    renderProducts(products);

}
function renderStats(stats) {

    document.getElementById("totalProducts").textContent =
        stats.total;

    document.getElementById("activeProducts").textContent =
        stats.active;

    document.getElementById("inactiveProducts").textContent =
        stats.inactive;

    document.getElementById("totalValue").textContent =
        Number(stats.totalValue)
            .toLocaleString("fr-FR") + " FCFA";

}
function renderProducts(list) {

    const tbody =
        document.getElementById(
            "productsTableBody"
        );

    tbody.innerHTML = "";

    if (!list.length) {

        tbody.innerHTML = `

        <tr>

            <td colspan="7"
                style="
                text-align:center;
                padding:40px;">

                Aucun produit disponible.

            </td>

        </tr>

        `;

        return;

    }

    list.forEach(product => {

        tbody.innerHTML += `

        <tr>

            <td>

                ${product.product_name}

            </td>

            <td>

                ${Number(product.price)
                    .toLocaleString("fr-FR")}

            </td>

            <td>

                ${product.commission_rate ?? "-"}

                %

            </td>

            <td>

                ${product.currency}

            </td>

            <td>

                ${product.status

                    ? "🟢 Actif"

                    : "🔴 Inactif"

                }

            </td>

            <td>

                ${new Date(
                    product.created_at
                ).toLocaleDateString("fr-FR")}

            </td>

          <td>

    <div class="action-buttons">

        <button
            class="btn-primary btn-edit-product"
            data-id="${product.id}">

            Modifier

        </button>

        <button
            class="btn-danger btn-delete-product"
            data-id="${product.id}"
            data-name="${product.product_name}">

            Supprimer

        </button>

    </div>

</td>

        </tr>

        `;

    });

}
/*
====================================================
GESTION DE LA MODALE
====================================================
*/

const modal = document.getElementById("productModal");

const btnNewProduct = document.getElementById("btnNewProduct");

const closeBtn = document.getElementById("closeProductModal");

const cancelBtn = document.getElementById("cancelProduct");


btnNewProduct.addEventListener("click", () => {

    document.getElementById("modalTitle").textContent =
    "Nouveau produit";

    document.getElementById("productForm").reset();

    document.getElementById("productId").value = "";

    modal.style.display = "flex";

});


if (closeBtn) {

    closeBtn.addEventListener("click", () => {

        modal.style.display = "none";

    });

}

if (cancelBtn) {

    cancelBtn.addEventListener("click", () => {

        modal.style.display = "none";

    });

}


modal.addEventListener("click", (e) => {

    if (e.target === modal) {

        modal.style.display = "none";

    }

});
/*
====================================================
SAUVEGARDE PRODUIT
====================================================
*/
const productForm = document.getElementById("productForm");

productForm.addEventListener("submit", async (e) => {

    e.preventDefault();

const saveButton =
    document.getElementById("saveProduct");

saveButton.disabled = true;

saveButton.textContent =
    "⏳ Enregistrement...";

    try {

        const body = {

            id: document.getElementById("productId").value || null,

            product_name:
                document.getElementById("productName").value.trim(),

            product_code:
                document.getElementById("productCode").value.trim(),

            description:
                document.getElementById("description").value.trim(),

            price: Number(
                document.getElementById("productPrice").value
            ),

            currency:
                document.getElementById("currency").value,

            commission_rate: Number(
                document.getElementById("commissionRate").value
            ),

            systeme_course_url:
    document.getElementById("courseUrl").value.trim(),

            status:
                document.getElementById("productStatus").checked

        };

        const { data, error } =
            await sb.functions.invoke(
                "admin-save-product",
                {
                    body
                }
            );

        if (error) throw error;

        modal.style.display = "none";

        productForm.reset();

        document.getElementById("productStatus").checked = true;

        await loadProducts();

saveButton.disabled = false;

saveButton.textContent =
    "💾 Enregistrer";

        showToast(
    "Produit enregistré avec succès.",
    "success"
);

    }

   catch (err) {

    console.error("ERREUR COMPLETE :", err);

saveButton.disabled = false;

saveButton.textContent =
    "💾 Enregistrer";

    showToast(
    err.message || "Erreur lors de l'enregistrement.",
    "error"
);

}

});
/*
====================================================
OUVRIR UN PRODUIT EN MODIFICATION
====================================================
*/

function editProduct(productId) {

    const product = products.find(p => p.id == productId);

    if (!product) return;

    document.getElementById("modalTitle").textContent =
        "Modifier un produit";

    document.getElementById("productId").value =
        product.id;

    document.getElementById("productName").value =
        product.product_name || "";

    document.getElementById("productCode").value =
        product.product_code || "";

    document.getElementById("description").value =
        product.description || "";

    document.getElementById("productPrice").value =
        product.price || "";

    document.getElementById("currency").value =
        product.currency || "XOF";

    document.getElementById("commissionRate").value =
        product.commission_rate || "";

    document.getElementById("courseUrl").value =
        product.systeme_course_url || "";

    document.getElementById("productStatus").checked =
        !!product.status;

    modal.style.display = "flex";

}
/*
====================================================
CLIC SUR MODIFIER
====================================================
*/

document.addEventListener("click", (e) => {

    const btn = e.target.closest(".btn-edit-product");

    if (!btn) return;

    editProduct(btn.dataset.id);

});
/*
====================================================
SUPPRESSION D'UN PRODUIT
====================================================
*/

let productToDelete = null;

document.addEventListener("click", (e) => {

    const btn = e.target.closest(".btn-delete-product");

    if (!btn) return;

    productToDelete = btn.dataset.id;

    document.getElementById("deleteProductMessage").textContent =
        `Voulez-vous vraiment supprimer le produit "${btn.dataset.name}" ?`;

    document.getElementById("deleteProductModal").style.display = "flex";

});
/*
====================================================
FERMETURE MODALE SUPPRESSION
====================================================
*/

const deleteModal =
    document.getElementById("deleteProductModal");

document
.getElementById("closeDeleteModal")
.addEventListener("click", () => {

    deleteModal.style.display = "none";

});

document
.getElementById("cancelDelete")
.addEventListener("click", () => {

    deleteModal.style.display = "none";

});

deleteModal.addEventListener("click", (e) => {

    if (e.target === deleteModal) {

        deleteModal.style.display = "none";

    }

});
/*
====================================================
SUPPRESSION DEFINITIVE
====================================================
*/

document
.getElementById("confirmDelete")
.addEventListener("click", async () => {

    if (!productToDelete) return;

const confirmDeleteButton =
    document.getElementById("confirmDelete");

confirmDeleteButton.disabled = true;

confirmDeleteButton.textContent =
    "⏳ Suppression...";

    try {

        const { error } =
            await sb.functions.invoke(
                "admin-delete-product",
                {
                    body: {
                        id: productToDelete
                    }
                }
            );

        if (error) throw error;

        document
            .getElementById("deleteProductModal")
            .style.display = "none";

        productToDelete = null;

        await loadProducts();

confirmDeleteButton.disabled = false;

confirmDeleteButton.textContent =
    "🗑 Supprimer";

        showToast(
    "Produit supprimé avec succès.",
    "success"
);

    }

   catch (err) {

    console.error(err);

confirmDeleteButton.disabled = false;

confirmDeleteButton.textContent =
    "🗑 Supprimer";

    showToast(
        err.message || "Erreur lors de la suppression.",
        "error"
    );

}

});
/*
====================================================
RECHERCHE PRODUITS
====================================================
*/

const searchInput =
    document.getElementById("searchProduct");

searchInput.addEventListener("input", applyFilters);
document
.getElementById("statusFilter")
.addEventListener(
    "change",
    applyFilters
);
/*
====================================================
APPLICATION DES FILTRES
====================================================
*/

function applyFilters() {

    const keyword = document
        .getElementById("searchProduct")
        .value
        .trim()
        .toLowerCase();

    const status = document
        .getElementById("statusFilter")
        .value;

    const filtered = products.filter(product => {

        const matchSearch =

            product.product_name
                ?.toLowerCase()
                .includes(keyword)

            ||

            product.product_code
                ?.toLowerCase()
                .includes(keyword)

            ||

            product.description
                ?.toLowerCase()
                .includes(keyword);

        let matchStatus = true;

        if (status === "true") {

            matchStatus = product.status === true;

        }

        else if (status === "false") {

            matchStatus = product.status === false;

        }

        return matchSearch && matchStatus;

    });

    renderProducts(filtered);

}