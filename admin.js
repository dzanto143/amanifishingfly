// ============================================================
// AMANI FISHING WHOLESALE
// ADMIN PANEL
// DIRECT SUPABASE VERSION
// ============================================================

(function () {

  "use strict";

  const ADMIN = {

    sb: null,
    user: null,

    categories: [],
    products: [],
    orders: [],


    // ========================================================
    // INITIALIZE
    // ========================================================

    async init() {

      try {

        if (!window.supabase) {
          throw new Error(
            "Supabase library has not loaded."
          );
        }

        if (!window.AMANI_SUPABASE) {

          if (
            !window.AMANI_SUPABASE_URL ||
            !window.AMANI_SUPABASE_ANON_KEY
          ) {
            throw new Error(
              "Supabase configuration is missing."
            );
          }

          window.AMANI_SUPABASE =
            window.supabase.createClient(
              window.AMANI_SUPABASE_URL,
              window.AMANI_SUPABASE_ANON_KEY
            );
        }

        this.sb = window.AMANI_SUPABASE;


        // Check current session
        const {
          data,
          error
        } = await this.sb.auth.getSession();

        if (error) {
          throw error;
        }


        if (data && data.session) {

          await this.showAdmin(
            data.session.user
          );

        } else {

          this.showLogin();

        }


        // Listen for login/logout
        this.sb.auth.onAuthStateChange(
          async (event, session) => {

            if (session) {

              await this.showAdmin(
                session.user
              );

            } else {

              this.user = null;

              this.showLogin();

            }

          }
        );


      } catch (error) {

        console.error(
          "ADMIN INIT ERROR:",
          error
        );

        this.showLogin();

        this.message(
          "loginMessage",
          error.message,
          "error"
        );

      }

    },


    // ========================================================
    // LOGIN VIEW
    // ========================================================

    showLogin() {

      const loginView =
        document.getElementById("loginView");

      const adminView =
        document.getElementById("adminView");

      const logout =
        document.getElementById("logout");


      if (loginView) {
        loginView.style.display = "block";
      }

      if (adminView) {
        adminView.style.display = "none";
      }

      if (logout) {
        logout.style.display = "none";
      }

    },


    // ========================================================
    // ADMIN VIEW
    // ========================================================

    async showAdmin(user) {

      if (!user) {
        this.showLogin();
        return;
      }

      try {

        const isAdmin =
          await this.checkAdmin(user.id);


        if (!isAdmin) {

          await this.sb.auth.signOut();

          this.message(
            "loginMessage",
            "This account is not an approved AMANI administrator.",
            "error"
          );

          return;
        }


        this.user = user;


        const loginView =
          document.getElementById("loginView");

        const adminView =
          document.getElementById("adminView");

        const logout =
          document.getElementById("logout");


        if (loginView) {
          loginView.style.display = "none";
        }

        if (adminView) {
          adminView.style.display = "block";
        }

        if (logout) {
          logout.style.display = "inline-flex";
        }


        await this.refresh();


      } catch (error) {

        console.error(
          "SHOW ADMIN ERROR:",
          error
        );

        this.message(
          "loginMessage",
          error.message,
          "error"
        );

      }

    },


    // ========================================================
    // CHECK ADMIN
    // ========================================================

    async checkAdmin(userId) {

      const {
        data,
        error
      } = await this.sb
        .from("admin_users")
        .select("user_id")
        .eq("user_id", userId)
        .maybeSingle();


      if (error) {
        throw error;
      }


      return !!data;

    },


    // ========================================================
    // REFRESH EVERYTHING
    // ========================================================

    async refresh() {

      try {

        const [
          categories,
          products,
          orders
        ] = await Promise.all([

          this.getCategories(),

          this.getProducts(),

          this.getOrders()

        ]);


        this.categories = categories;

        this.products = products;

        this.orders = orders;


        this.renderAll();


      } catch (error) {

        console.error(
          "REFRESH ERROR:",
          error
        );

        alert(
          "Unable to load admin data:\n\n" +
          error.message
        );

      }

    },


    // ========================================================
    // GET CATEGORIES
    // ========================================================

    async getCategories() {

      const {
        data,
        error
      } = await this.sb
        .from("categories")
        .select("*")
        .order("name", {
          ascending: true
        });


      if (error) {
        throw error;
      }


      return data || [];

    },


    // ========================================================
    // GET PRODUCTS
    // ========================================================

    async getProducts() {

      const {
        data,
        error
      } = await this.sb
        .from("products")
        .select(`
          *,
          categories (
            name
          )
        `)
        .order("created_at", {
          ascending: false
        });


      if (error) {
        throw error;
      }


      return data || [];

    },


    // ========================================================
    // GET ORDERS
    // ========================================================

    async getOrders() {

      const {
        data,
        error
      } = await this.sb
        .from("orders")
        .select("*")
        .order("created_at", {
          ascending: false
        });


      if (error) {
        throw error;
      }


      return data || [];

    },


    // ========================================================
    // IMAGE UPLOAD
    // ========================================================

    async upload(file, bucket) {

      if (!file) {
        return "";
      }


      if (!this.user) {
        throw new Error(
          "You must be logged in to upload an image."
        );
      }


      if (!this.sb) {
        throw new Error(
          "Supabase is not connected."
        );
      }


      // Only allow AMANI buckets
      if (
        bucket !== "category-images" &&
        bucket !== "product-images"
      ) {
        throw new Error(
          "Invalid image storage bucket: " +
          bucket
        );
      }


      // Validate file
      if (
        !file.type ||
        !file.type.startsWith("image/")
      ) {
        throw new Error(
          "Please select a valid image file."
        );
      }


      // Maximum 10MB
      const maxSize =
        10 * 1024 * 1024;


      if (file.size > maxSize) {
        throw new Error(
          "Image is too large. Maximum size is 10MB."
        );
      }


      // Clean filename
      const safeName =
        file.name
          .replace(
            /[^a-zA-Z0-9._-]/g,
            "-"
          )
          .replace(
            /\.{2,}/g,
            "."
          );


      // Unique ID
      const uniqueId =
        typeof crypto !== "undefined" &&
        typeof crypto.randomUUID === "function"

          ? crypto.randomUUID()

          : Date.now().toString();


      // Storage path
      const path =
        "admin/" +
        this.user.id +
        "/" +
        Date.now() +
        "-" +
        uniqueId +
        "-" +
        safeName;


      console.log(
        "AMANI IMAGE UPLOAD",
        {
          bucket: bucket,
          path: path,
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size
        }
      );


      // Upload directly
      const {
        error: uploadError
      } = await this.sb
        .storage
        .from(bucket)
        .upload(
          path,
          file,
          {
            cacheControl: "3600",
            upsert: false,
            contentType:
              file.type || "image/jpeg"
          }
        );


      if (uploadError) {

        console.error(
          "SUPABASE STORAGE UPLOAD ERROR:",
          uploadError
        );


        throw new Error(
          "Storage bucket '" +
          bucket +
          "': " +
          uploadError.message
        );

      }


      // Get public URL
      const {
        data: publicData
      } = this.sb
        .storage
        .from(bucket)
        .getPublicUrl(path);


      if (
        !publicData ||
        !publicData.publicUrl
      ) {

        throw new Error(
          "Image uploaded, but Supabase did not return a public URL."
        );

      }


      console.log(
        "AMANI IMAGE UPLOADED:",
        publicData.publicUrl
      );


      return publicData.publicUrl;

    },


    // ========================================================
    // RENDER EVERYTHING
    // ========================================================

    renderAll() {

      this.renderCategories();

      this.renderProducts();

      this.renderOrders();

      this.renderCategorySelect();

      this.renderStats();

    },


    // ========================================================
    // CATEGORY LIST
    // ========================================================

    renderCategories() {

      const list =
        document.getElementById(
          "catList"
        );


      if (!list) {
        return;
      }


      if (!this.categories.length) {

        list.innerHTML =
          '<div class="empty">No categories yet.</div>';

        return;

      }


      list.innerHTML =
        this.categories
          .map(category => {

            const image =
              category.image_url ||
              this.placeholder(
                category.name
              );


            return `
              <div class="admin-row">

                <img
                  src="${this.escapeAttr(image)}"
                  alt="${this.escapeAttr(category.name)}"
                  onerror="this.src=ADMIN.placeholder('${this.escapeAttr(category.name)}')"
                >

                <div style="flex:1;min-width:0;">

                  <strong>
                    ${this.escape(category.name)}
                  </strong>

                  <div class="muted">
                    ${this.escape(
                      category.description || ""
                    )}
                  </div>

                  <small class="muted">
                    ${this.escape(
                      category.slug || ""
                    )}
                  </small>

                </div>

                <div class="actions">

                  <button
                    type="button"
                    class="btn btn-light btn-sm"
                    onclick="ADMIN.editCategory('${category.id}')"
                  >
                    Edit
                  </button>

                  <button
                    type="button"
                    class="btn btn-danger btn-sm"
                    onclick="ADMIN.deleteCategory('${category.id}')"
                  >
                    Delete
                  </button>

                </div>

              </div>
            `;

          })
          .join("");

    },


    // ========================================================
    // PRODUCT LIST
    // ========================================================

    renderProducts() {

      const list =
        document.getElementById(
          "productList"
        );


      if (!list) {
        return;
      }


      if (!this.products.length) {

        list.innerHTML =
          '<div class="empty">No products yet.</div>';

        return;

      }


      list.innerHTML =
        this.products
          .map(product => {

            const image =
              product.image_url ||
              this.placeholder(
                product.name
              );


            const category =
              product.categories &&
              product.categories.name
                ? product.categories.name
                : "No category";


            return `
              <div class="admin-row">

                <img
                  src="${this.escapeAttr(image)}"
                  alt="${this.escapeAttr(product.name)}"
                  onerror="this.src=ADMIN.placeholder('${this.escapeAttr(product.name)}')"
                >

                <div style="flex:1;min-width:0;">

                  <strong>
                    ${this.escape(product.name)}
                  </strong>

                  <div>

                    <strong>
                      ${this.money(product.price)}
                    </strong>

                    &nbsp; · &nbsp;

                    ${this.escape(category)}

                    &nbsp; · &nbsp;

                    Stock:
                    ${Number(product.stock || 0)}

                  </div>

                  ${
                    product.featured
                      ? `
                        <span
                          style="
                            display:inline-block;
                            margin-top:5px;
                            padding:3px 8px;
                            border-radius:20px;
                            background:#d7a83e;
                            color:#111;
                            font-size:12px;
                          "
                        >
                          Featured
                        </span>
                      `
                      : ""
                  }

                </div>

                <div class="actions">

                  <button
                    type="button"
                    class="btn btn-light btn-sm"
                    onclick="ADMIN.editProduct('${product.id}')"
                  >
                    Edit
                  </button>

                  <button
                    type="button"
                    class="btn btn-danger btn-sm"
                    onclick="ADMIN.deleteProduct('${product.id}')"
                  >
                    Delete
                  </button>

                </div>

              </div>
            `;

          })
          .join("");

    },


    // ========================================================
    // ORDER LIST
    // ========================================================

    renderOrders() {

      const list =
        document.getElementById(
          "orderList"
        );


      if (!list) {
        return;
      }


      if (!this.orders.length) {

        list.innerHTML =
          '<div class="empty">No orders yet.</div>';

        return;

      }


      list.innerHTML =
        this.orders
          .map(order => {

            let items = [];


            if (Array.isArray(order.items)) {
              items = order.items;
            }


            const itemsHtml =
              items.length

                ? items
                    .map(item => {

                      const qty =
                        Number(
                          item.qty || 0
                        );

                      const price =
                        Number(
                          item.price || 0
                        );


                      return `
                        <div>
                          ${this.escape(
                            item.name || "Item"
                          )}
                          × ${qty}
                          —
                          ${this.money(
                            price * qty
                          )}
                        </div>
                      `;

                    })
                    .join("")

                : "<div>No item details.</div>";


            return `
              <div
                class="card"
                style="padding:18px;margin-bottom:15px;"
              >

                <div
                  style="
                    display:flex;
                    justify-content:space-between;
                    gap:15px;
                    flex-wrap:wrap;
                  "
                >

                  <div>

                    <strong>
                      ${this.escape(
                        order.customer_name
                      )}
                    </strong>

                    <div>
                      ${this.escape(
                        order.phone
                      )}
                      ${
                        order.email
                          ? " · " +
                            this.escape(
                              order.email
                            )
                          : ""
                      }
                    </div>

                    <div class="muted">
                      ${this.escape(
                        order.address
                      )}
                    </div>

                    ${
                      order.notes
                        ? `
                          <div
                            style="
                              margin-top:8px;
                            "
                          >
                            <strong>
                              Notes:
                            </strong>
                            ${this.escape(
                              order.notes
                            )}
                          </div>
                        `
                        : ""
                    }

                  </div>


                  <select
                    class="field"
                    style="max-width:180px;"
                    onchange="ADMIN.status('${order.id}', this.value)"
                  >

                    ${
                      [
                        "pending",
                        "confirmed",
                        "paid",
                        "shipped",
                        "completed",
                        "cancelled"
                      ]
                        .map(
                          status => `
                            <option
                              value="${status}"
                              ${
                                order.status ===
                                status
                                  ? "selected"
                                  : ""
                              }
                            >
                              ${status}
                            </option>
                          `
                        )
                        .join("")
                    }

                  </select>

                </div>


                <hr>


                <div>
                  ${itemsHtml}
                </div>


                <div
                  style="
                    margin-top:12px;
                    font-size:18px;
                  "
                >
                  <strong>
                    Total:
                    ${this.money(order.total)}
                  </strong>
                </div>

              </div>
            `;

          })
          .join("");

    },


    // ========================================================
    // CATEGORY SELECT
    // ========================================================

    renderCategorySelect() {

      const select =
        document.getElementById(
          "catSelect"
        );


      if (!select) {
        return;
      }


      const current =
        select.value;


      select.innerHTML =
        '<option value="">Select category</option>' +
        this.categories
          .map(
            category => `
              <option value="${this.escapeAttr(category.id)}">
                ${this.escape(category.name)}
              </option>
            `
          )
          .join("");


      if (
        current &&
        this.categories.some(
          category =>
            category.id === current
        )
      ) {
        select.value = current;
      }

    },


    // ========================================================
    // STATS
    // ========================================================

    renderStats() {

      const cats =
        document.getElementById(
          "statCats"
        );

      const products =
        document.getElementById(
          "statProducts"
        );

      const orders =
        document.getElementById(
          "statOrders"
        );

      const sales =
        document.getElementById(
          "statSales"
        );


      if (cats) {
        cats.textContent =
          this.categories.length;
      }


      if (products) {
        products.textContent =
          this.products.length;
      }


      if (orders) {
        orders.textContent =
          this.orders.length;
      }


      if (sales) {

        const total =
          this.orders.reduce(
            (sum, order) =>
              sum +
              Number(
                order.total || 0
              ),
            0
          );


        sales.textContent =
          this.money(total);

      }

    },


    // ========================================================
    // SAVE CATEGORY
    // ========================================================

    async saveCategory(event) {

      event.preventDefault();


      const form =
        event.target;


      const button =
        form.querySelector(
          'button[type="submit"]'
        );


      try {

        button.disabled = true;

        button.textContent =
          "Saving...";


        const data =
          new FormData(form);


        const id =
          String(
            data.get("id") || ""
          ).trim();


        const name =
          String(
            data.get("name") || ""
          ).trim();


        if (!name) {
          throw new Error(
            "Category name is required."
          );
        }


        let imageUrl =
          String(
            data.get("image_url") || ""
          ).trim();


        const image =
          data.get("image");


        // CATEGORY MUST USE category-images
        if (
          image &&
          image instanceof File &&
          image.size > 0
        ) {

          imageUrl =
            await this.upload(
              image,
              "category-images"
            );

        }


        const payload = {

          name,

          slug:
            this.slug(name),

          description:
            String(
              data.get("description") ||
              ""
            ).trim(),

          image_url:
            imageUrl

        };


        let result;


        if (id) {

          result =
            await this.sb
              .from("categories")
              .update(payload)
              .eq("id", id);

        } else {

          result =
            await this.sb
              .from("categories")
              .insert(payload);

        }


        if (result.error) {
          throw result.error;
        }


        this.clearCategoryForm();

        await this.refresh();


        alert(
          id
            ? "Category updated successfully."
            : "Category added successfully."
        );


      } catch (error) {

        console.error(
          "SAVE CATEGORY:",
          error
        );

        alert(
          "Could not save category:\n\n" +
          error.message
        );

      } finally {

        button.disabled = false;

        button.textContent =
          "Save Category";

      }

    },


    // ========================================================
    // SAVE PRODUCT
    // ========================================================

    async saveProduct(event) {

      event.preventDefault();


      const form =
        event.target;


      const button =
        form.querySelector(
          'button[type="submit"]'
        );


      try {

        button.disabled = true;

        button.textContent =
          "Saving...";


        const data =
          new FormData(form);


        const id =
          String(
            data.get("id") || ""
          ).trim();


        const name =
          String(
            data.get("name") || ""
          ).trim();


        if (!name) {
          throw new Error(
            "Product name is required."
          );
        }


        const categoryId =
          String(
            data.get("category_id") ||
            ""
          ).trim();


        if (!categoryId) {
          throw new Error(
            "Please select a category."
          );
        }


        const price =
          Number(
            data.get("price") || 0
          );


        if (
          !Number.isFinite(price) ||
          price < 0
        ) {
          throw new Error(
            "Please enter a valid price."
          );
        }


        const stock =
          Math.max(
            0,
            Number(
              data.get("stock") || 0
            )
          );


        let imageUrl =
          String(
            data.get("image_url") || ""
          ).trim();


        const image =
          data.get("image");


        // PRODUCT MUST USE product-images
        if (
          image &&
          image instanceof File &&
          image.size > 0
        ) {

          imageUrl =
            await this.upload(
              image,
              "product-images"
            );

        }


        const payload = {

          name,

          category_id:
            categoryId,

          price,

          image_url:
            imageUrl,

          sizes:
            String(
              data.get("sizes") ||
              ""
            ).trim(),

          description:
            String(
              data.get("description") ||
              ""
            ).trim(),

          stock,

          featured:
            data.get("featured") === "on"

        };


        let result;


        if (id) {

          result =
            await this.sb
              .from("products")
              .update(payload)
              .eq("id", id);

        } else {

          result =
            await this.sb
              .from("products")
              .insert(payload);

        }


        if (result.error) {
          throw result.error;
        }


        this.clearProductForm();

        await this.refresh();


        alert(
          id
            ? "Product updated successfully."
            : "Product added successfully."
        );


      } catch (error) {

        console.error(
          "SAVE PRODUCT:",
          error
        );

        alert(
          "Could not save product:\n\n" +
          error.message
        );

      } finally {

        button.disabled = false;

        button.textContent =
          "Save Product";

      }

    },


    // ========================================================
    // EDIT CATEGORY
    // ========================================================

    editCategory(id) {

      const category =
        this.categories.find(
          item => item.id === id
        );


      if (!category) {
        return;
      }


      const form =
        document.getElementById(
          "categoryForm"
        );


      if (!form) {
        return;
      }


      form.elements.id.value =
        category.id;

      form.elements.name.value =
        category.name || "";

      form.elements.description.value =
        category.description || "";

      form.elements.image_url.value =
        category.image_url || "";

      form.elements.image.value =
        "";


      this.showTab(
        "categories"
      );


      form.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });

    },


    // ========================================================
    // EDIT PRODUCT
    // ========================================================

    editProduct(id) {

      const product =
        this.products.find(
          item => item.id === id
        );


      if (!product) {
        return;
      }


      const form =
        document.getElementById(
          "productForm"
        );


      if (!form) {
        return;
      }


      form.elements.id.value =
        product.id;

      form.elements.name.value =
        product.name || "";

      form.elements.category_id.value =
        product.category_id || "";

      form.elements.price.value =
        product.price ?? "";

      form.elements.image_url.value =
        product.image_url || "";

      form.elements.sizes.value =
        product.sizes || "";

      form.elements.description.value =
        product.description || "";

      form.elements.stock.value =
        product.stock ?? 0;

      form.elements.featured.checked =
        !!product.featured;

      form.elements.image.value =
        "";


      this.showTab(
        "products"
      );


      form.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });

    },


    // ========================================================
    // DELETE CATEGORY
    // ========================================================

    async deleteCategory(id) {

      const category =
        this.categories.find(
          item => item.id === id
        );


      if (!category) {
        return;
      }


      const confirmed =
        confirm(
          `Delete category "${category.name}"?`
        );


      if (!confirmed) {
        return;
      }


      try {

        const {
          error
        } = await this.sb
          .from("categories")
          .delete()
          .eq("id", id);


        if (error) {
          throw error;
        }


        await this.refresh();


        alert(
          "Category deleted successfully."
        );


      } catch (error) {

        console.error(
          "DELETE CATEGORY:",
          error
        );

        alert(
          "Could not delete category:\n\n" +
          error.message
        );

      }

    },


    // ========================================================
    // DELETE PRODUCT
    // ========================================================

    async deleteProduct(id) {

      const product =
        this.products.find(
          item => item.id === id
        );


      if (!product) {
        return;
      }


      const confirmed =
        confirm(
          `Delete product "${product.name}"?`
        );


      if (!confirmed) {
        return;
      }


      try {

        const {
          error
        } = await this.sb
          .from("products")
          .delete()
          .eq("id", id);


        if (error) {
          throw error;
        }


        await this.refresh();


        alert(
          "Product deleted successfully."
        );


      } catch (error) {

        console.error(
          "DELETE PRODUCT:",
          error
        );

        alert(
          "Could not delete product:\n\n" +
          error.message
        );

      }

    },


    // ========================================================
    // UPDATE ORDER STATUS
    // ========================================================

    async status(id, status) {

      try {

        const {
          error
        } = await this.sb
          .from("orders")
          .update({
            status
          })
          .eq("id", id);


        if (error) {
          throw error;
        }


        await this.refresh();


      } catch (error) {

        console.error(
          "ORDER STATUS:",
          error
        );

        alert(
          "Could not update order:\n\n" +
          error.message
        );

        await this.refresh();

      }

    },


    // ========================================================
    // CLEAR CATEGORY FORM
    // ========================================================

    clearCategoryForm() {

      const form =
        document.getElementById(
          "categoryForm"
        );


      if (!form) {
        return;
      }


      form.reset();


      if (form.elements.id) {
        form.elements.id.value = "";
      }

    },


    // ========================================================
    // CLEAR PRODUCT FORM
    // ========================================================

    clearProductForm() {

      const form =
        document.getElementById(
          "productForm"
        );


      if (!form) {
        return;
      }


      form.reset();


      if (form.elements.id) {
        form.elements.id.value = "";
      }

      if (form.elements.stock) {
        form.elements.stock.value = 0;
      }

      if (form.elements.featured) {
        form.elements.featured.checked = false;
      }

    },


    // ========================================================
    // TAB
    // ========================================================

    showTab(id) {

      document
        .querySelectorAll(
          ".admin-tab"
        )
        .forEach(tab => {

          tab.style.display =
            "none";

        });


      const selected =
        document.getElementById(
          id
        );


      if (selected) {

        selected.style.display =
          "block";

      }


      document
        .querySelectorAll(
          ".admin-sidebar button"
        )
        .forEach(button => {

          button.classList.remove(
            "active"
          );


          if (
            button.dataset.tab === id
          ) {

            button.classList.add(
              "active"
            );

          }

        });

    },


    // ========================================================
    // LOGOUT
    // ========================================================

    async logout() {

      try {

        await this.sb.auth.signOut();

      } catch (error) {

        console.error(
          "LOGOUT:",
          error
        );

      }

    },


    // ========================================================
    // SLUG
    // ========================================================

    slug(value) {

      return String(value || "")
        .toLowerCase()
        .trim()
        .replace(
          /[^a-z0-9]+/g,
          "-"
        )
        .replace(
          /^-+|-+$/g,
          ""
        );

    },


    // ========================================================
    // MONEY - USD
    // ========================================================

    money(value) {

      const number =
        Number(value || 0);


      return new Intl.NumberFormat(
        "en-US",
        {
          style: "currency",
          currency: "USD"
        }
      ).format(number);

    },


    // ========================================================
    // ESCAPE HTML
    // ========================================================

    escape(value) {

      return String(
        value ?? ""
      )
        .replace(
          /&/g,
          "&amp;"
        )
        .replace(
          /</g,
          "&lt;"
        )
        .replace(
          />/g,
          "&gt;"
        )
        .replace(
          /"/g,
          "&quot;"
        )
        .replace(
          /'/g,
          "&#039;"
        );

    },


    // ========================================================
    // ESCAPE ATTRIBUTE
    // ========================================================

    escapeAttr(value) {

      return this.escape(
        value
      );

    },


    // ========================================================
    // PLACEHOLDER
    // ========================================================

    placeholder(name) {

      const text =
        String(
          name || "AMANI"
        )
          .slice(0, 25);


      const svg = `
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="800"
          height="600"
          viewBox="0 0 800 600"
        >

          <rect
            width="800"
            height="600"
            fill="#eeeeee"
          />

          <text
            x="400"
            y="300"
            text-anchor="middle"
            dominant-baseline="middle"
            font-family="Arial"
            font-size="40"
            fill="#777"
          >
            ${text}
          </text>

        </svg>
      `;


      return (
        "data:image/svg+xml;charset=UTF-8," +
        encodeURIComponent(svg)
      );

    },


    // ========================================================
    // MESSAGE
    // ========================================================

    message(
      elementId,
      text,
      type = "error"
    ) {

      const element =
        document.getElementById(
          elementId
        );


      if (!element) {
        return;
      }


      element.innerHTML = `
        <div class="notice ${type}">
          ${this.escape(text)}
        </div>
      `;

    }

  };


  // ==========================================================
  // MAKE GLOBAL
  // ==========================================================

  window.ADMIN = ADMIN;


  // ==========================================================
  // DOM READY
  // ==========================================================

  document.addEventListener(
    "DOMContentLoaded",
    () => {

      const start = () => {

        ADMIN.init();

      };


      if (
        window.AMANI_SUPABASE ||
        (
          window.supabase &&
          window.AMANI_SUPABASE_URL &&
          window.AMANI_SUPABASE_ANON_KEY
        )
      ) {

        start();

      } else {

        setTimeout(
          start,
          500
        );

      }


      // ======================================================
      // LOGIN
      // ======================================================

      const loginForm =
        document.getElementById(
          "loginForm"
        );


      if (loginForm) {

        loginForm.addEventListener(
          "submit",
          async event => {

            event.preventDefault();


            const button =
              document.getElementById(
                "loginButton"
              );


            try {

              button.disabled = true;

              button.textContent =
                "Logging in...";


              const data =
                new FormData(
                  loginForm
                );


              const email =
                String(
                  data.get("email") ||
                  ""
                ).trim();


              const password =
                String(
                  data.get("password") ||
                  ""
                );


              if (
                !email ||
                !password
              ) {

                throw new Error(
                  "Enter your email and password."
                );

              }


              if (!ADMIN.sb) {

                throw new Error(
                  "Supabase is not connected. Check config.js and your Supabase key."
                );

              }


              const {
                error
              } =
                await ADMIN.sb.auth
                  .signInWithPassword({
                    email,
                    password
                  });


              if (error) {
                throw error;
              }


              loginForm.reset();


            } catch (error) {

              console.error(
                "LOGIN:",
                error
              );


              ADMIN.message(
                "loginMessage",
                error.message,
                "error"
              );

            } finally {

              button.disabled =
                false;

              button.textContent =
                "Login";

            }

          }
        );

      }


      // ======================================================
      // LOGOUT
      // ======================================================

      const logout =
        document.getElementById(
          "logout"
        );


      if (logout) {

        logout.addEventListener(
          "click",
          () => ADMIN.logout()
        );

      }


      // ======================================================
      // CATEGORY FORM
      // ======================================================

      const categoryForm =
        document.getElementById(
          "categoryForm"
        );


      if (categoryForm) {

        categoryForm.addEventListener(
          "submit",
          event =>
            ADMIN.saveCategory(
              event
            )
        );

      }


      // ======================================================
      // PRODUCT FORM
      // ======================================================

      const productForm =
        document.getElementById(
          "productForm"
        );


      if (productForm) {

        productForm.addEventListener(
          "submit",
          event =>
            ADMIN.saveProduct(
              event
            )
        );

      }


      // ======================================================
      // CLEAR BUTTONS
      // ======================================================

      const clearCategory =
        document.getElementById(
          "clearCategory"
        );


      if (clearCategory) {

        clearCategory.addEventListener(
          "click",
          () =>
            ADMIN.clearCategoryForm()
        );

      }


      const clearProduct =
        document.getElementById(
          "clearProduct"
        );


      if (clearProduct) {

        clearProduct.addEventListener(
          "click",
          () =>
            ADMIN.clearProductForm()
        );

      }


      // ======================================================
      // SIDEBAR
      // ======================================================

      document
        .querySelectorAll(
          ".admin-sidebar button[data-tab]"
        )
        .forEach(button => {

          button.addEventListener(
            "click",
            () => {

              ADMIN.showTab(
                button.dataset.tab
              );

            }
          );

        });

    }
  );

})();