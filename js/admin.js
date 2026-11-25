// ============================================================
// AMANI FISHING WHOLESALE
// ADMIN FRONTEND
// NO SUPABASE AUTH
// ============================================================

const state = {
  categories: [],
  products: [],
  orders: []
};


// ============================================================
// API
// ============================================================

async function api(action, options = {}) {

  const response = await fetch(
    `/api/admin?action=${encodeURIComponent(action)}`,
    {
      credentials: "include",
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {})
      }
    }
  );

  let data;

  try {
    data = await response.json();
  } catch {
    throw new Error("Invalid server response.");
  }

  if (!response.ok) {
    throw new Error(
      data.message || "Something went wrong."
    );
  }

  return data;
}


// ============================================================
// ELEMENTS
// ============================================================

const loginSection =
  document.getElementById("loginSection");

const dashboard =
  document.getElementById("dashboard");

const loginForm =
  document.getElementById("loginForm");

const loginMessage =
  document.getElementById("loginMessage");

const logoutButton =
  document.getElementById("logoutButton");


// ============================================================
// MESSAGE
// ============================================================

function message(element, text, type = "success") {

  element.innerHTML = `
    <div class="notice ${type}">
      ${escapeHtml(text)}
    </div>
  `;
}


// ============================================================
// ESCAPE HTML
// ============================================================

function escapeHtml(value) {

  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}


// ============================================================
// LOGIN
// ============================================================

loginForm.addEventListener(
  "submit",
  async event => {

    event.preventDefault();

    const email =
      document.getElementById("loginEmail").value.trim();

    const password =
      document.getElementById("loginPassword").value;

    loginMessage.innerHTML =
      '<div class="notice">Signing in...</div>';

    try {

      await api("login", {
        method: "POST",
        body: JSON.stringify({
          email,
          password
        })
      });

      showDashboard();

    } catch (error) {

      message(
        loginMessage,
        error.message,
        "error"
      );

    }

  }
);


// ============================================================
// LOGOUT
// ============================================================

logoutButton.addEventListener(
  "click",
  async () => {

    await api("logout", {
      method: "POST"
    });

    window.location.reload();

  }
);


// ============================================================
// SESSION
// ============================================================

async function checkSession() {

  try {

    const result =
      await api("session");

    if (result.loggedIn) {

      showDashboard();

    } else {

      showLogin();

    }

  } catch {

    showLogin();

  }

}


// ============================================================
// SHOW LOGIN
// ============================================================

function showLogin() {

  loginSection.style.display = "block";

  dashboard.style.display = "none";

  logoutButton.classList.add("hidden");
}


// ============================================================
// SHOW DASHBOARD
// ============================================================

async function showDashboard() {

  loginSection.style.display = "none";

  dashboard.style.display = "block";

  logoutButton.classList.remove("hidden");

  await loadData();

}


// ============================================================
// LOAD DATA
// ============================================================

async function loadData() {

  try {

    const data =
      await api("data");

    state.categories =
      data.categories || [];

    state.products =
      data.products || [];

    state.orders =
      data.orders || [];

    renderEverything();

  } catch (error) {

    message(
      document.getElementById("dashboardMessage"),
      error.message,
      "error"
    );

    if (
      error.message
        .toLowerCase()
        .includes("login")
    ) {

      showLogin();

    }

  }

}


// ============================================================
// RENDER EVERYTHING
// ============================================================

function renderEverything() {

  renderStats();

  renderCategoryOptions();

  renderCategories();

  renderProducts();

  renderOrders();

}


// ============================================================
// STATS
// ============================================================

function renderStats() {

  document.getElementById(
    "categoryCount"
  ).textContent =
    state.categories.length;

  document.getElementById(
    "productCount"
  ).textContent =
    state.products.length;

  document.getElementById(
    "orderCount"
  ).textContent =
    state.orders.length;

  document.getElementById(
    "pendingCount"
  ).textContent =
    state.orders.filter(
      order => order.status === "pending"
    ).length;

}


// ============================================================
// CATEGORY OPTIONS
// ============================================================

function renderCategoryOptions() {

  const select =
    document.getElementById("productCategory");

  select.innerHTML =
    `<option value="">Select Category</option>`;

  state.categories.forEach(category => {

    select.innerHTML += `
      <option value="${category.id}">
        ${escapeHtml(category.name)}
      </option>
    `;

  });

}


// ============================================================
// CATEGORIES
// ============================================================

function renderCategories() {

  const container =
    document.getElementById("categoriesList");

  if (!state.categories.length) {

    container.innerHTML =
      "<p>No categories yet.</p>";

    return;

  }

  container.innerHTML =
    state.categories.map(category => `

      <div class="admin-card">

        ${
          category.image_url
            ? `
              <img
                src="${escapeHtml(category.image_url)}"
                alt="${escapeHtml(category.name)}"
              >
            `
            : ""
        }

        <h3>
          ${escapeHtml(category.name)}
        </h3>

        <p>
          ${escapeHtml(category.description)}
        </p>

        <small>
          /${escapeHtml(category.slug)}
        </small>

        <div class="actions">

          <button
            class="btn-secondary"
            onclick="editCategory('${category.id}')"
          >
            Edit
          </button>

          <button
            class="btn-danger"
            onclick="deleteCategory('${category.id}')"
          >
            Delete
          </button>

        </div>

      </div>

    `).join("");

}


// ============================================================
// SAVE CATEGORY
// ============================================================

document
  .getElementById("categoryForm")
  .addEventListener(
    "submit",
    async event => {

      event.preventDefault();

      const id =
        document.getElementById("categoryId").value;

      const payload = {

        name:
          document.getElementById(
            "categoryName"
          ).value.trim(),

        slug:
          document.getElementById(
            "categorySlug"
          ).value.trim(),

        description:
          document.getElementById(
            "categoryDescription"
          ).value.trim(),

        image_url:
          document.getElementById(
            "categoryImage"
          ).value.trim()

      };

      try {

        await api(
          id
            ? "update-category"
            : "add-category",
          {
            method: "POST",
            body: JSON.stringify(
              id
                ? {
                    ...payload,
                    id
                  }
                : payload
            )
          }
        );

        clearCategoryForm();

        await loadData();

      } catch (error) {

        message(
          document.getElementById(
            "dashboardMessage"
          ),
          error.message,
          "error"
        );

      }

    }
  );


// ============================================================
// EDIT CATEGORY
// ============================================================

window.editCategory = function(id) {

  const category =
    state.categories.find(
      item => item.id === id
    );

  if (!category) return;

  document.getElementById(
    "categoryId"
  ).value = category.id;

  document.getElementById(
    "categoryName"
  ).value = category.name;

  document.getElementById(
    "categorySlug"
  ).value = category.slug;

  document.getElementById(
    "categoryDescription"
  ).value =
    category.description || "";

  document.getElementById(
    "categoryImage"
  ).value =
    category.image_url || "";

  document
    .querySelector(
      '[data-panel="categoriesPanel"]'
    )
    .click();

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });

};


// ============================================================
// DELETE CATEGORY
// ============================================================

window.deleteCategory = async function(id) {

  if (
    !confirm(
      "Delete this category?"
    )
  ) {
    return;
  }

  try {

    await api(
      "delete-category",
      {
        method: "POST",
        body: JSON.stringify({ id })
      }
    );

    await loadData();

  } catch (error) {

    alert(error.message);

  }

};


// ============================================================
// CLEAR CATEGORY
// ============================================================

function clearCategoryForm() {

  document
    .getElementById("categoryForm")
    .reset();

  document.getElementById(
    "categoryId"
  ).value = "";

}

document
  .getElementById("cancelCategory")
  .addEventListener(
    "click",
    clearCategoryForm
  );


// ============================================================
// PRODUCTS
// ============================================================

function renderProducts() {

  const container =
    document.getElementById("productsList");

  if (!state.products.length) {

    container.innerHTML =
      "<p>No products yet.</p>";

    return;

  }

  container.innerHTML =
    state.products.map(product => {

      const category =
        state.categories.find(
          category =>
            category.id ===
            product.category_id
        );

      return `

        <div class="admin-card">

          ${
            product.image_url
              ? `
                <img
                  src="${escapeHtml(product.image_url)}"
                  alt="${escapeHtml(product.name)}"
                >
              `
              : ""
          }

          <h3>
            ${escapeHtml(product.name)}
          </h3>

          <p>
            ${
              category
                ? escapeHtml(category.name)
                : "No category"
            }
          </p>

          <div class="price">
            $${Number(product.price || 0).toFixed(2)}
          </div>

          <p>
            Stock:
            ${Number(product.stock || 0)}
          </p>

          <p>
            ${escapeHtml(
              product.description || ""
            )}
          </p>

          <div class="actions">

            <button
              class="btn-secondary"
              onclick="editProduct('${product.id}')"
            >
              Edit
            </button>

            <button
              class="btn-danger"
              onclick="deleteProduct('${product.id}')"
            >
              Delete
            </button>

          </div>

        </div>

      `;

    }).join("");

}


// ============================================================
// SAVE PRODUCT
// ============================================================

document
  .getElementById("productForm")
  .addEventListener(
    "submit",
    async event => {

      event.preventDefault();

      const id =
        document.getElementById(
          "productId"
        ).value;

      const payload = {

        name:
          document.getElementById(
            "productName"
          ).value.trim(),

        category_id:
          document.getElementById(
            "productCategory"
          ).value || null,

        price:
          Number(
            document.getElementById(
              "productPrice"
            ).value || 0
          ),

        image_url:
          document.getElementById(
            "productImage"
          ).value.trim(),

        sizes:
          document.getElementById(
            "productSizes"
          ).value.trim(),

        description:
          document.getElementById(
            "productDescription"
          ).value.trim(),

        stock:
          Number(
            document.getElementById(
              "productStock"
            ).value || 0
          ),

        featured:
          document.getElementById(
            "productFeatured"
          ).checked

      };

      try {

        await api(
          id
            ? "update-product"
            : "add-product",
          {
            method: "POST",
            body: JSON.stringify(
              id
                ? {
                    ...payload,
                    id
                  }
                : payload
            )
          }
        );

        clearProductForm();

        await loadData();

      } catch (error) {

        message(
          document.getElementById(
            "dashboardMessage"
          ),
          error.message,
          "error"
        );

      }

    }
  );


// ============================================================
// EDIT PRODUCT
// ============================================================

window.editProduct = function(id) {

  const product =
    state.products.find(
      item => item.id === id
    );

  if (!product) return;

  document.getElementById(
    "productId"
  ).value = product.id;

  document.getElementById(
    "productName"
  ).value = product.name;

  document.getElementById(
    "productCategory"
  ).value =
    product.category_id || "";

  document.getElementById(
    "productPrice"
  ).value =
    product.price || 0;

  document.getElementById(
    "productImage"
  ).value =
    product.image_url || "";

  document.getElementById(
    "productSizes"
  ).value =
    product.sizes || "";

  document.getElementById(
    "productDescription"
  ).value =
    product.description || "";

  document.getElementById(
    "productStock"
  ).value =
    product.stock || 0;

  document.getElementById(
    "productFeatured"
  ).checked =
    Boolean(product.featured);

  document
    .querySelector(
      '[data-panel="productsPanel"]'
    )
    .click();

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });

};


// ============================================================
// DELETE PRODUCT
// ============================================================

window.deleteProduct = async function(id) {

  if (
    !confirm(
      "Delete this product?"
    )
  ) {
    return;
  }

  try {

    await api(
      "delete-product",
      {
        method: "POST",
        body: JSON.stringify({ id })
      }
    );

    await loadData();

  } catch (error) {

    alert(error.message);

  }

};


// ============================================================
// CLEAR PRODUCT
// ============================================================

function clearProductForm() {

  document
    .getElementById("productForm")
    .reset();

  document.getElementById(
    "productId"
  ).value = "";

}

document
  .getElementById("cancelProduct")
  .addEventListener(
    "click",
    clearProductForm
  );


// ============================================================
// ORDERS
// ============================================================

function renderOrders() {

  const container =
    document.getElementById("ordersList");

  if (!state.orders.length) {

    container.innerHTML =
      "<p>No orders yet.</p>";

    return;

  }

  container.innerHTML =
    state.orders.map(order => `

      <div class="admin-card">

        <h3>
          ${escapeHtml(
            order.customer_name
          )}
        </h3>

        <p>
          <strong>Phone:</strong>
          ${escapeHtml(order.phone)}
        </p>

        <p>
          <strong>Email:</strong>
          ${escapeHtml(order.email || "")}
        </p>

        <p>
          <strong>Address:</strong>
          ${escapeHtml(order.address)}
        </p>

        <p>
          <strong>Total:</strong>
          $${Number(order.total || 0).toFixed(2)}
        </p>

        <p>
          <strong>Notes:</strong>
          ${escapeHtml(order.notes || "")}
        </p>

        <label>Status</label>

        <select
          onchange="updateOrderStatus(
            '${order.id}',
            this.value
          )"
        >

          <option
            value="pending"
            ${order.status === "pending" ? "selected" : ""}
          >
            Pending
          </option>

          <option
            value="confirmed"
            ${order.status === "confirmed" ? "selected" : ""}
          >
            Confirmed
          </option>

          <option
            value="processing"
            ${order.status === "processing" ? "selected" : ""}
          >
            Processing
          </option>

          <option
            value="shipped"
            ${order.status === "shipped" ? "selected" : ""}
          >
            Shipped
          </option>

          <option
            value="completed"
            ${order.status === "completed" ? "selected" : ""}
          >
            Completed
          </option>

          <option
            value="cancelled"
            ${order.status === "cancelled" ? "selected" : ""}
          >
            Cancelled
          </option>

        </select>

        <p>
          <strong>Order date:</strong>
          ${new Date(
            order.created_at
          ).toLocaleString()}
        </p>

      </div>

    `).join("");

}


// ============================================================
// UPDATE ORDER STATUS
// ============================================================

window.updateOrderStatus =
  async function(id, status) {

    try {

      await api(
        "update-order",
        {
          method: "POST",
          body: JSON.stringify({
            id,
            status
          })
        }
      );

      await loadData();

    } catch (error) {

      alert(error.message);

    }

  };


// ============================================================
// TABS
// ============================================================

document
  .querySelectorAll(".tab")
  .forEach(button => {

    button.addEventListener(
      "click",
      () => {

        document
          .querySelectorAll(".tab")
          .forEach(item =>
            item.classList.remove(
              "active"
            )
          );

        document
          .querySelectorAll(".panel")
          .forEach(item =>
            item.classList.remove(
              "active"
            )
          );

        button.classList.add(
          "active"
        );

        document
          .getElementById(
            button.dataset.panel
          )
          .classList.add(
            "active"
          );

      }
    );

  });


// ============================================================
// START
// ============================================================

checkSession();