// ============================================================
// AMIANI'S FLY WHOLESALERS
// ADMIN PANEL
// DIRECT SUPABASE VERSION
// PRICE = USD PER DOZEN
//
// ORDER FEATURES:
// - View customer orders
// - Update order status
// - View size/color selections
// - Send customer message by email
// - Call customer
// - WhatsApp customer
// - Delete/remove orders
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


        this.sb =
          window.AMANI_SUPABASE;


        // ----------------------------------------------------
        // CHECK CURRENT SESSION
        // ----------------------------------------------------

        const {
          data,
          error
        } =
          await this.sb.auth.getSession();


        if (error) {
          throw error;
        }


        if (
          data &&
          data.session
        ) {

          await this.showAdmin(
            data.session.user
          );

        } else {

          this.showLogin();

        }


        // ----------------------------------------------------
        // AUTH STATE
        // ----------------------------------------------------

        this.sb.auth.onAuthStateChange(
          async (
            event,
            session
          ) => {

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
        document.getElementById(
          "loginView"
        );


      const adminView =
        document.getElementById(
          "adminView"
        );


      const logout =
        document.getElementById(
          "logout"
        );


      if (loginView) {

        loginView.style.display =
          "block";

      }


      if (adminView) {

        adminView.style.display =
          "none";

      }


      if (logout) {

        logout.style.display =
          "none";

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
          await this.checkAdmin(
            user.id
          );


        if (!isAdmin) {

          await this.sb.auth.signOut();


          this.message(
            "loginMessage",
            "This account is not an approved AMIANI administrator.",
            "error"
          );


          return;

        }


        this.user =
          user;


        const loginView =
          document.getElementById(
            "loginView"
          );


        const adminView =
          document.getElementById(
            "adminView"
          );


        const logout =
          document.getElementById(
            "logout"
          );


        if (loginView) {

          loginView.style.display =
            "none";

        }


        if (adminView) {

          adminView.style.display =
            "block";

        }


        if (logout) {

          logout.style.display =
            "inline-flex";

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
      } =
        await this.sb
          .from("admin_users")
          .select("user_id")
          .eq(
            "user_id",
            userId
          )
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
        ] =
          await Promise.all([

            this.getCategories(),

            this.getProducts(),

            this.getOrders()

          ]);


        this.categories =
          categories;


        this.products =
          products;


        this.orders =
          orders;


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
      } =
        await this.sb
          .from("categories")
          .select("*")
          .order(
            "name",
            {
              ascending: true
            }
          );


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
      } =
        await this.sb
          .from("products")
          .select(`
            *,
            categories (
              name
            )
          `)
          .order(
            "created_at",
            {
              ascending: false
            }
          );


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
      } =
        await this.sb
          .from("orders")
          .select("*")
          .order(
            "created_at",
            {
              ascending: false
            }
          );


      if (error) {

        throw error;

      }


      return data || [];

    },


    // ========================================================
    // IMAGE UPLOAD
    // ========================================================

    async upload(
      file,
      bucket
    ) {

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


      // ------------------------------------------------------
      // VALID BUCKETS
      // ------------------------------------------------------

      if (
        bucket !== "category-images" &&
        bucket !== "product-images"
      ) {

        throw new Error(
          "Invalid image storage bucket: " +
          bucket
        );

      }


      // ------------------------------------------------------
      // VALIDATE IMAGE
      // ------------------------------------------------------

      if (
        !file.type ||
        !file.type.startsWith("image/")
      ) {

        throw new Error(
          "Please select a valid image file."
        );

      }


      // ------------------------------------------------------
      // MAXIMUM 10MB
      // ------------------------------------------------------

      const maxSize =
        10 * 1024 * 1024;


      if (
        file.size >
        maxSize
      ) {

        throw new Error(
          "Image is too large. Maximum size is 10MB."
        );

      }


      // ------------------------------------------------------
      // CLEAN FILENAME
      // ------------------------------------------------------

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


      // ------------------------------------------------------
      // UNIQUE ID
      // ------------------------------------------------------

      const uniqueId =
        typeof crypto !== "undefined" &&
        typeof crypto.randomUUID === "function"

          ? crypto.randomUUID()

          : Date.now().toString();


      // ------------------------------------------------------
      // STORAGE PATH
      // ------------------------------------------------------

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
        "AMIANI IMAGE UPLOAD",
        {
          bucket,
          path,
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size
        }
      );


      // ------------------------------------------------------
      // UPLOAD
      // ------------------------------------------------------

      const {
        error: uploadError
      } =
        await this.sb
          .storage
          .from(bucket)
          .upload(
            path,
            file,
            {
              cacheControl: "3600",
              upsert: false,
              contentType:
                file.type ||
                "image/jpeg"
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


      // ------------------------------------------------------
      // PUBLIC URL
      // ------------------------------------------------------

      const {
        data: publicData
      } =
        this.sb
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
        "AMIANI IMAGE UPLOADED:",
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
          .map(
            category => {

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


                  <div
                    style="
                      flex:1;
                      min-width:0;
                    "
                  >

                    <strong>
                      ${this.escape(
                        category.name
                      )}
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
                      onclick="ADMIN.editCategory('${this.escapeAttr(category.id)}')"
                    >
                      Edit
                    </button>


                    <button
                      type="button"
                      class="btn btn-danger btn-sm"
                      onclick="ADMIN.deleteCategory('${this.escapeAttr(category.id)}')"
                    >
                      Delete
                    </button>

                  </div>

                </div>

              `;

            }
          )
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
          .map(
            product => {

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


              const colors =
                product.colors &&
                String(
                  product.colors
                ).trim()

                  ? String(
                      product.colors
                    ).trim()

                  : "Not specified";


              return `

                <div class="admin-row">

                  <img
                    src="${this.escapeAttr(image)}"
                    alt="${this.escapeAttr(product.name)}"
                    onerror="this.src=ADMIN.placeholder('${this.escapeAttr(product.name)}')"
                  >


                  <div
                    style="
                      flex:1;
                      min-width:0;
                    "
                  >

                    <strong>
                      ${this.escape(
                        product.name
                      )}
                    </strong>


                    <div
                      style="
                        margin-top:5px;
                      "
                    >

                      <strong>
                        ${this.money(
                          product.price
                        )}
                      </strong>

                      &nbsp; · &nbsp;

                      ${this.escape(
                        category
                      )}

                      &nbsp; · &nbsp;

                      Colors:
                      ${this.escape(
                        colors
                      )}

                      &nbsp; · &nbsp;

                      Stock:
                      ${Number(
                        product.stock || 0
                      )}

                    </div>


                    ${
                      product.sizes

                        ? `

                          <div
                            class="muted"
                            style="
                              margin-top:5px;
                            "
                          >

                            Sizes:
                            ${this.escape(
                              product.sizes
                            )}

                          </div>

                        `

                        : ""
                    }


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
                      onclick="ADMIN.editProduct('${this.escapeAttr(product.id)}')"
                    >
                      Edit
                    </button>


                    <button
                      type="button"
                      class="btn btn-danger btn-sm"
                      onclick="ADMIN.deleteProduct('${this.escapeAttr(product.id)}')"
                    >
                      Delete
                    </button>

                  </div>

                </div>

              `;

            }
          )
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

        list.innerHTML = `

          <div
            class="empty"
            style="
              padding:30px;
              text-align:center;
            "
          >

            <strong>
              No orders yet.
            </strong>

            <div
              class="muted"
              style="
                margin-top:5px;
              "
            >
              Customer orders will appear here.
            </div>

          </div>

        `;

        return;

      }


      list.innerHTML =
        this.orders
          .map(
            order => {


              // ------------------------------------------------
              // ORDER ITEMS
              // ------------------------------------------------

              let items = [];


              if (
                Array.isArray(
                  order.items
                )
              ) {

                items =
                  order.items;

              }


              const itemsHtml =
                items.length

                  ? items
                      .map(
                        item => {

                          const qty =
                            Number(
                              item.qty || 0
                            );


                          const price =
                            Number(
                              item.price || 0
                            );


                          const size =
                            item.size
                              ? `

                                <div
                                  style="
                                    margin-top:4px;
                                    color:#666;
                                    font-size:13px;
                                  "
                                >

                                  Size:
                                  ${this.escape(
                                    item.size
                                  )}

                                </div>

                              `
                              : "";


                          const color =
                            item.color
                              ? `

                                <div
                                  style="
                                    color:#666;
                                    font-size:13px;
                                  "
                                >

                                  Color:
                                  ${this.escape(
                                    item.color
                                  )}

                                </div>

                              `
                              : "";


                          return `

                            <div
                              style="
                                padding:12px 0;
                                border-bottom:1px solid #eee;
                              "
                            >

                              <strong>

                                ${this.escape(
                                  item.name ||
                                  "Item"
                                )}

                              </strong>


                              <div
                                style="
                                  margin-top:4px;
                                "
                              >

                                ${qty}
                                dozen
                                ×
                                ${this.money(
                                  price
                                )}

                              </div>


                              ${size}

                              ${color}


                              <div
                                style="
                                  margin-top:5px;
                                  font-weight:600;
                                "
                              >

                                Line total:
                                ${this.money(
                                  price * qty
                                )}

                              </div>

                            </div>

                          `;

                        }
                      )
                      .join("")

                  : `

                      <div
                        class="muted"
                        style="
                          padding:10px 0;
                        "
                      >
                        No item details available.
                      </div>

                    `;


              // ------------------------------------------------
              // CUSTOMER INFORMATION
              // ------------------------------------------------

              const customerName =
                String(
                  order.customer_name ||
                  "Customer"
                ).trim();


              const customerEmail =
                String(
                  order.email || ""
                ).trim();


              const customerPhone =
                String(
                  order.phone || ""
                ).trim();


              // ------------------------------------------------
              // ORDER DATE
              // ------------------------------------------------

              let orderDate = "";


              if (
                order.created_at
              ) {

                try {

                  orderDate =
                    new Date(
                      order.created_at
                    ).toLocaleString(
                      "en-KE",
                      {
                        dateStyle:
                          "medium",
                        timeStyle:
                          "short"
                      }
                    );

                } catch (error) {

                  orderDate =
                    String(
                      order.created_at
                    );

                }

              }


              // ------------------------------------------------
              // STATUS
              // ------------------------------------------------

              const statuses = [

                "pending",

                "confirmed",

                "paid",

                "shipped",

                "completed",

                "cancelled"

              ];


              const currentStatus =
                String(
                  order.status ||
                  "pending"
                ).toLowerCase();


              // ------------------------------------------------
              // EMAIL BUTTON
              // ------------------------------------------------

              const emailButton =
                customerEmail

                  ? `

                      <button
                        type="button"
                        class="btn btn-primary btn-sm"
                        onclick="ADMIN.messageCustomer('${this.escapeAttr(order.id)}')"
                      >
                        Send Message
                      </button>

                    `

                  : `

                      <button
                        type="button"
                        class="btn btn-light btn-sm"
                        disabled
                        title="No email address was provided."
                      >
                        No Email
                      </button>

                    `;


              // ------------------------------------------------
              // PHONE BUTTON
              // ------------------------------------------------

              const phoneButton =
                customerPhone

                  ? `

                      <a
                        href="tel:${this.escapeAttr(customerPhone)}"
                        class="btn btn-light btn-sm"
                      >
                        Call Customer
                      </a>

                    `

                  : "";


              // ------------------------------------------------
              // WHATSAPP NUMBER
              // ------------------------------------------------

              let whatsappNumber =
                customerPhone.replace(
                  /[^0-9]/g,
                  ""
                );


              /*
               * Kenya:
               *
               * 0722123456
               *
               * becomes:
               *
               * 254722123456
               */

              if (
                whatsappNumber.startsWith("0") &&
                whatsappNumber.length === 10
              ) {

                whatsappNumber =
                  "254" +
                  whatsappNumber.substring(
                    1
                  );

              }


              const whatsappButton =
                whatsappNumber

                  ? `

                      <a
                        href="https://wa.me/${this.escapeAttr(whatsappNumber)}"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="btn btn-light btn-sm"
                      >
                        WhatsApp
                      </a>

                    `

                  : "";


              // ------------------------------------------------
              // ORDER CARD
              // ------------------------------------------------

              return `

                <div
                  class="card"
                  style="
                    padding:20px;
                    margin-bottom:18px;
                  "
                >


                  <!-- ======================================
                       ORDER HEADER
                  ======================================= -->

                  <div
                    style="
                      display:flex;
                      justify-content:space-between;
                      align-items:flex-start;
                      gap:20px;
                      flex-wrap:wrap;
                    "
                  >


                    <!-- CUSTOMER -->

                    <div
                      style="
                        flex:1;
                        min-width:240px;
                      "
                    >

                      <div
                        style="
                          font-size:19px;
                          font-weight:700;
                        "
                      >

                        ${this.escape(
                          customerName
                        )}

                      </div>


                      ${
                        customerEmail

                          ? `

                            <div
                              style="
                                margin-top:6px;
                              "
                            >

                              Email:

                              <a
                                href="mailto:${this.escapeAttr(customerEmail)}"
                              >
                                ${this.escape(
                                  customerEmail
                                )}
                              </a>

                            </div>

                          `

                          : `

                            <div
                              class="muted"
                              style="
                                margin-top:6px;
                              "
                            >
                              No email provided
                            </div>

                          `
                      }


                      ${
                        customerPhone

                          ? `

                            <div
                              style="
                                margin-top:4px;
                              "
                            >

                              Phone:
                              ${this.escape(
                                customerPhone
                              )}

                            </div>

                          `

                          : ""
                      }


                      ${
                        order.address

                          ? `

                            <div
                              class="muted"
                              style="
                                margin-top:4px;
                              "
                            >

                              Address:
                              ${this.escape(
                                order.address
                              )}

                            </div>

                          `

                          : ""
                      }


                      ${
                        orderDate

                          ? `

                            <div
                              class="muted"
                              style="
                                margin-top:6px;
                                font-size:13px;
                              "
                            >

                              Ordered:
                              ${this.escape(
                                orderDate
                              )}

                            </div>

                          `

                          : ""
                      }


                      <div
                        class="muted"
                        style="
                          margin-top:5px;
                          font-size:12px;
                          word-break:break-all;
                        "
                      >

                        Order ID:
                        ${this.escape(
                          order.id
                        )}

                      </div>

                    </div>


                    <!-- STATUS -->

                    <select
                      class="field"
                      style="
                        max-width:190px;
                        min-width:160px;
                      "
                      onchange="ADMIN.status('${this.escapeAttr(order.id)}', this.value)"
                    >

                      ${
                        statuses
                          .map(
                            status => `

                              <option
                                value="${this.escapeAttr(status)}"
                                ${
                                  currentStatus ===
                                  status
                                    ? "selected"
                                    : ""
                                }
                              >

                                ${this.escape(
                                  status
                                )}

                              </option>

                            `
                          )
                          .join("")
                      }

                    </select>

                  </div>


                  <!-- ======================================
                       ORDER ITEMS
                  ======================================= -->

                  <div
                    style="
                      margin-top:20px;
                      padding-top:15px;
                      border-top:1px solid #eee;
                    "
                  >

                    <h3
                      style="
                        margin:0 0 8px;
                        font-size:16px;
                      "
                    >
                      Ordered Products
                    </h3>


                    ${itemsHtml}

                  </div>


                  <!-- ======================================
                       TOTAL
                  ======================================= -->

                  <div
                    style="
                      margin-top:16px;
                      padding-top:15px;
                      border-top:1px solid #eee;
                      font-size:20px;
                    "
                  >

                    <strong>

                      Total:
                      ${this.money(
                        order.total
                      )}

                    </strong>

                  </div>


                  <!-- ======================================
                       CUSTOMER NOTES
                  ======================================= -->

                  ${
                    order.notes

                      ? `

                        <div
                          style="
                            margin-top:15px;
                            padding:13px;
                            background:#f7f7f7;
                            border-radius:8px;
                          "
                        >

                          <strong>
                            Customer Notes
                          </strong>


                          <div
                            style="
                              margin-top:6px;
                            "
                          >

                            ${this.escape(
                              order.notes
                            )}

                          </div>

                        </div>

                      `

                      : ""
                  }


                  <!-- ======================================
                       ACTION BUTTONS
                  ======================================= -->

                  <div
                    style="
                      display:flex;
                      gap:8px;
                      flex-wrap:wrap;
                      margin-top:20px;
                      padding-top:15px;
                      border-top:1px solid #eee;
                    "
                  >

                    ${emailButton}

                    ${phoneButton}

                    ${whatsappButton}


                    <!-- DELETE -->

                    <button
                      type="button"
                      class="btn btn-danger btn-sm"
                      onclick="ADMIN.deleteOrder('${this.escapeAttr(order.id)}')"
                    >
                      Delete Order
                    </button>

                  </div>

                </div>

              `;

            }
          )
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

              <option
                value="${this.escapeAttr(
                  category.id
                )}"
              >

                ${this.escape(
                  category.name
                )}

              </option>

            `
          )
          .join("");


      if (
        current &&
        this.categories.some(
          category =>
            category.id ===
            current
        )
      ) {

        select.value =
          current;

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
            (
              sum,
              order
            ) => {

              return (
                sum +
                Number(
                  order.total || 0
                )
              );

            },
            0
          );


        sales.textContent =
          this.money(
            total
          );

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

        button.disabled =
          true;


        button.textContent =
          "Saving...";


        const data =
          new FormData(
            form
          );


        const id =
          String(
            data.get("id") ||
            ""
          ).trim();


        const name =
          String(
            data.get("name") ||
            ""
          ).trim();


        if (!name) {

          throw new Error(
            "Category name is required."
          );

        }


        let imageUrl =
          String(
            data.get(
              "image_url"
            ) ||
            ""
          ).trim();


        const image =
          data.get(
            "image"
          );


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
            this.slug(
              name
            ),

          description:
            String(
              data.get(
                "description"
              ) ||
              ""
            ).trim(),

          image_url:
            imageUrl

        };


        let result;


        if (id) {

          result =
            await this.sb
              .from(
                "categories"
              )
              .update(
                payload
              )
              .eq(
                "id",
                id
              );

        } else {

          result =
            await this.sb
              .from(
                "categories"
              )
              .insert(
                payload
              );

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

        button.disabled =
          false;


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

        button.disabled =
          true;


        button.textContent =
          "Saving...";


        const data =
          new FormData(
            form
          );


        const id =
          String(
            data.get("id") ||
            ""
          ).trim();


        const name =
          String(
            data.get("name") ||
            ""
          ).trim();


        if (!name) {

          throw new Error(
            "Product name is required."
          );

        }


        const categoryId =
          String(
            data.get(
              "category_id"
            ) ||
            ""
          ).trim();


        if (!categoryId) {

          throw new Error(
            "Please select a category."
          );

        }


        // ----------------------------------------------------
        // PRICE = USD PER DOZEN
        // ----------------------------------------------------

        const price =
          Number(
            data.get(
              "price"
            ) ||
            0
          );


        if (
          !Number.isFinite(
            price
          ) ||
          price < 0
        ) {

          throw new Error(
            "Please enter a valid price per dozen in USD."
          );

        }


        // ----------------------------------------------------
        // STOCK = DOZENS
        // ----------------------------------------------------

        const stock =
          Math.max(
            0,
            Number(
              data.get(
                "stock"
              ) ||
              0
            )
          );


        let imageUrl =
          String(
            data.get(
              "image_url"
            ) ||
            ""
          ).trim();


        const image =
          data.get(
            "image"
          );


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
              data.get(
                "sizes"
              ) ||
              ""
            ).trim(),

          colors:
            String(
              data.get(
                "colors"
              ) ||
              ""
            ).trim(),

          description:
            String(
              data.get(
                "description"
              ) ||
              ""
            ).trim(),

          stock,

          featured:
            data.get(
              "featured"
            ) === "on"

        };


        let result;


        if (id) {

          result =
            await this.sb
              .from(
                "products"
              )
              .update(
                payload
              )
              .eq(
                "id",
                id
              );

        } else {

          result =
            await this.sb
              .from(
                "products"
              )
              .insert(
                payload
              );

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

        button.disabled =
          false;


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
          item =>
            item.id === id
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
        category.name ||
        "";


      form.elements.description.value =
        category.description ||
        "";


      form.elements.image_url.value =
        category.image_url ||
        "";


      form.elements.image.value =
        "";


      this.showTab(
        "categories"
      );


      form.scrollIntoView({
        behavior:
          "smooth",
        block:
          "start"
      });

    },


    // ========================================================
    // EDIT PRODUCT
    // ========================================================

    editProduct(id) {

      const product =
        this.products.find(
          item =>
            item.id === id
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
        product.name ||
        "";


      form.elements.category_id.value =
        product.category_id ||
        "";


      form.elements.price.value =
        product.price ??
        "";


      form.elements.image_url.value =
        product.image_url ||
        "";


      form.elements.sizes.value =
        product.sizes ||
        "";


      if (
        form.elements.colors
      ) {

        form.elements.colors.value =
          product.colors ||
          "";

      }


      form.elements.description.value =
        product.description ||
        "";


      form.elements.stock.value =
        product.stock ??
        0;


      form.elements.featured.checked =
        !!product.featured;


      form.elements.image.value =
        "";


      this.showTab(
        "products"
      );


      form.scrollIntoView({
        behavior:
          "smooth",
        block:
          "start"
      });

    },


    // ========================================================
    // DELETE CATEGORY
    // ========================================================

    async deleteCategory(id) {

      const category =
        this.categories.find(
          item =>
            item.id === id
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
        } =
          await this.sb
            .from(
              "categories"
            )
            .delete()
            .eq(
              "id",
              id
            );


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
          item =>
            item.id === id
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
        } =
          await this.sb
            .from(
              "products"
            )
            .delete()
            .eq(
              "id",
              id
            );


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

    async status(
      id,
      status
    ) {

      try {

        const {
          error
        } =
          await this.sb
            .from(
              "orders"
            )
            .update({
              status:
                status
            })
            .eq(
              "id",
              id
            );


        if (error) {

          throw error;

        }


        // Update locally first

        const order =
          this.orders.find(
            item =>
              String(
                item.id
              ) ===
              String(
                id
              )
          );


        if (order) {

          order.status =
            status;

        }


        this.renderOrders();


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
    // SEND CUSTOMER MESSAGE
    // ========================================================
    //
    // This uses mailto so no email password/API key is stored
    // in the browser.
    //
    // ========================================================

    messageCustomer(id) {

      const order =
        this.orders.find(
          item =>
            String(
              item.id
            ) ===
            String(
              id
            )
        );


      if (!order) {

        alert(
          "Order could not be found."
        );

        return;

      }


      const email =
        String(
          order.email ||
          ""
        ).trim();


      if (!email) {

        alert(
          "This order does not contain a customer email address."
        );

        return;

      }


      const customerName =
        String(
          order.customer_name ||
          "Customer"
        ).trim();


      // ------------------------------------------------------
      // ORDER ITEMS
      // ------------------------------------------------------

      let items = [];


      if (
        Array.isArray(
          order.items
        )
      ) {

        items =
          order.items;

      }


      const itemLines =
        items.length

          ? items
              .map(
                item => {

                  const qty =
                    Number(
                      item.qty ||
                      0
                    );


                  const price =
                    Number(
                      item.price ||
                      0
                    );


                  let line =
                    `${item.name || "Product"} — ${qty} dozen — ${this.money(price * qty)}`;


                  if (
                    item.size
                  ) {

                    line +=
                      ` — Size: ${item.size}`;

                  }


                  if (
                    item.color
                  ) {

                    line +=
                      ` — Color: ${item.color}`;

                  }


                  return line;

                }
              )
              .join(
                "\n"
              )

          : "No item details available.";


      // ------------------------------------------------------
      // DEFAULT MESSAGE
      // ------------------------------------------------------

      const defaultMessage =

`Hello ${customerName},

Thank you for your order with Amiani's Fly Wholesalers.

Order ID: ${order.id}

Order details:

${itemLines}

Order total: ${this.money(order.total)}

Current order status: ${order.status || "pending"}

If you have any questions or need any changes to your order, please reply to this email.

Kind regards,
Amiani's Fly Wholesalers`;


      // ------------------------------------------------------
      // ADMIN CAN EDIT MESSAGE
      // ------------------------------------------------------

      const message =
        prompt(
          `Message to ${customerName}:`,
          defaultMessage
        );


      if (
        message === null
      ) {

        return;

      }


      // ------------------------------------------------------
      // SUBJECT
      // ------------------------------------------------------

      const subject =
        `Order ${order.id} - Amiani's Fly Wholesalers`;


      // ------------------------------------------------------
      // MAILTO
      // ------------------------------------------------------

      const mailto =
        "mailto:" +
        encodeURIComponent(
          email
        ) +
        "?subject=" +
        encodeURIComponent(
          subject
        ) +
        "&body=" +
        encodeURIComponent(
          message
        );


      window.location.href =
        mailto;

    },


    // ========================================================
    // DELETE ORDER
    // ========================================================

    async deleteOrder(id) {

      const order =
        this.orders.find(
          item =>
            String(
              item.id
            ) ===
            String(
              id
            )
        );


      if (!order) {

        alert(
          "Order could not be found."
        );

        return;

      }


      const customerName =
        order.customer_name ||
        "this customer";


      // ------------------------------------------------------
      // FIRST CONFIRMATION
      // ------------------------------------------------------

      const confirmed =
        confirm(

          `Delete the order from "${customerName}"?\n\n` +

          `Order ID: ${order.id}\n` +

          `Total: ${this.money(
            order.total
          )}\n\n` +

          `This action cannot be undone.`

        );


      if (!confirmed) {

        return;

      }


      // ------------------------------------------------------
      // SECOND CONFIRMATION
      // ------------------------------------------------------

      const finalConfirmed =
        confirm(

          "Are you absolutely sure you want to permanently remove this order?"

        );


      if (!finalConfirmed) {

        return;

      }


      const list =
        document.getElementById(
          "orderList"
        );


      try {

        // ----------------------------------------------------
        // DISABLE ORDER LIST
        // ----------------------------------------------------

        if (list) {

          list.style.pointerEvents =
            "none";

          list.style.opacity =
            "0.6";

        }


        // ----------------------------------------------------
        // DELETE FROM SUPABASE
        // ----------------------------------------------------

        const {
          error
        } =
          await this.sb
            .from(
              "orders"
            )
            .delete()
            .eq(
              "id",
              id
            );


        if (error) {

          throw error;

        }


        // ----------------------------------------------------
        // REMOVE LOCALLY
        // ----------------------------------------------------

        this.orders =
          this.orders.filter(
            item =>
              String(
                item.id
              ) !==
              String(
                id
              )
          );


        // ----------------------------------------------------
        // UPDATE SCREEN
        // ----------------------------------------------------

        this.renderOrders();

        this.renderStats();


        alert(
          "Order deleted successfully."
        );


      } catch (error) {

        console.error(
          "DELETE ORDER:",
          error
        );


        alert(
          "Could not delete order:\n\n" +
          error.message
        );


        // ----------------------------------------------------
        // RELOAD ORDERS
        // ----------------------------------------------------

        try {

          this.orders =
            await this.getOrders();


          this.renderOrders();

          this.renderStats();


        } catch (
          refreshError
        ) {

          console.error(
            "ORDER REFRESH ERROR:",
            refreshError
          );

        }

      } finally {

        if (list) {

          list.style.pointerEvents =
            "";

          list.style.opacity =
            "";

        }

      }

    },


    // ========================================================
    // REFRESH ORDERS ONLY
    // ========================================================

    async refreshOrders() {

      const button =
        document.getElementById(
          "refreshOrders"
        );


      try {

        if (button) {

          button.disabled =
            true;

          button.textContent =
            "Refreshing...";

        }


        this.orders =
          await this.getOrders();


        this.renderOrders();

        this.renderStats();


      } catch (error) {

        console.error(
          "REFRESH ORDERS:",
          error
        );


        alert(
          "Could not refresh orders:\n\n" +
          error.message
        );


      } finally {

        if (button) {

          button.disabled =
            false;

          button.textContent =
            "Refresh Orders";

        }

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


      if (
        form.elements.id
      ) {

        form.elements.id.value =
          "";

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


      if (
        form.elements.id
      ) {

        form.elements.id.value =
          "";

      }


      if (
        form.elements.stock
      ) {

        form.elements.stock.value =
          0;

      }


      if (
        form.elements.featured
      ) {

        form.elements.featured.checked =
          false;

      }


      if (
        form.elements.colors
      ) {

        form.elements.colors.value =
          "";

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
        .forEach(
          tab => {

            tab.style.display =
              "none";

          }
        );


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
        .forEach(
          button => {

            button.classList.remove(
              "active"
            );


            if (
              button.dataset.tab ===
              id
            ) {

              button.classList.add(
                "active"
              );

            }

          }
        );

    },


    // ========================================================
    // LOGOUT
    // ========================================================

    async logout() {

      try {

        if (this.sb) {

          await this.sb.auth.signOut();

        }

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

      return String(
        value ||
        ""
      )
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
    // MONEY - USD PER DOZEN
    // ========================================================

    money(value) {

      const number =
        Number(
          value ||
          0
        );


      return new Intl.NumberFormat(
        "en-US",
        {
          style:
            "currency",

          currency:
            "USD",

          minimumFractionDigits:
            2,

          maximumFractionDigits:
            2
        }
      ).format(
        number
      ) +
      " / dozen";

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
          name ||
          "AMIANI"
        )
          .slice(
            0,
            25
          );


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

            ${this.escape(
              text
            )}

          </text>

        </svg>

      `;


      return (
        "data:image/svg+xml;charset=UTF-8," +
        encodeURIComponent(
          svg
        )
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

        <div
          class="notice ${this.escape(type)}"
        >

          ${this.escape(
            text
          )}

        </div>

      `;

    }

  };


  // ==========================================================
  // MAKE GLOBAL
  // ==========================================================

  window.ADMIN =
    ADMIN;


  // ==========================================================
  // DOM READY
  // ==========================================================

  document.addEventListener(
    "DOMContentLoaded",
    () => {


      // ======================================================
      // START ADMIN
      // ======================================================

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

              button.disabled =
                true;


              button.textContent =
                "Logging in...";


              const data =
                new FormData(
                  loginForm
                );


              const email =
                String(
                  data.get(
                    "email"
                  ) ||
                  ""
                ).trim();


              const password =
                String(
                  data.get(
                    "password"
                  ) ||
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
          () =>
            ADMIN.logout()
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
      // CLEAR CATEGORY
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


      // ======================================================
      // CLEAR PRODUCT
      // ======================================================

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
      // REFRESH ORDERS
      // ======================================================

      const refreshOrders =
        document.getElementById(
          "refreshOrders"
        );


      if (refreshOrders) {

        refreshOrders.addEventListener(
          "click",
          () =>
            ADMIN.refreshOrders()
        );

      }


      // ======================================================
      // SIDEBAR
      // ======================================================

      document
        .querySelectorAll(
          ".admin-sidebar button[data-tab]"
        )
        .forEach(
          button => {

            button.addEventListener(
              "click",
              () => {

                ADMIN.showTab(
                  button.dataset.tab
                );

              }
            );

          }
        );

    }
  );

})();