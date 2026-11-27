// ============================================================
// AMIANI'S FLY WHOLESALERS
// STOREFRONT APP
//
// PRICING:
//   USD PER DOZEN
//
// STOCK:
//   NUMBER OF DOZENS
//
// VARIANTS:
//   SIZE + COLOR
//
// CART:
//   Same product with different size/color = separate line
// ============================================================

const AMIANI = {

  // ==========================================================
  // SUPABASE
  // ==========================================================

  sb: window.AMANI_SUPABASE,

  brandName: "Amiani's Fly Wholesalers",


  // ==========================================================
  // MONEY
  // ==========================================================

  money(value) {

    const amount = Number(value || 0);

    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);

  },


  moneyPerDozen(value) {

    return `${this.money(value)} / dozen`;

  },


  // ==========================================================
  // ESCAPE HTML
  // ==========================================================

  esc(value = "") {

    return String(value).replace(
      /[&<>"']/g,
      character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
      }[character])
    );

  },


  // ==========================================================
  // ESCAPE ATTRIBUTE
  // ==========================================================

  escAttr(value = "") {

    return this.esc(value);

  },


  // ==========================================================
  // SLUG
  // ==========================================================

  slug(value = "") {

    return String(value)
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

  },


  // ==========================================================
  // PLACEHOLDER
  // ==========================================================

  placeholder(
    text = "Amiani's Fly Wholesalers"
  ) {

    return (
      "https://placehold.co/900x700/eef3f0/0c4a3c?text=" +
      encodeURIComponent(text)
    );

  },


  // ==========================================================
  // DATABASE - CATEGORIES
  // ==========================================================

  async categories() {

    if (!this.sb) {
      throw new Error(
        "Supabase is not configured."
      );
    }

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


  // ==========================================================
  // DATABASE - PRODUCTS
  // ==========================================================

  async products() {

    if (!this.sb) {
      throw new Error(
        "Supabase is not configured."
      );
    }

    const {
      data,
      error
    } = await this.sb
      .from("products")
      .select("*,categories(id,name,slug)")
      .order("created_at", {
        ascending: false
      });

    if (error) {
      throw error;
    }

    return data || [];

  },


  // ==========================================================
  // DATABASE - SINGLE PRODUCT
  // ==========================================================

  async product(id) {

    if (!this.sb) {
      throw new Error(
        "Supabase is not configured."
      );
    }

    if (!id) {
      throw new Error(
        "Product ID is missing."
      );
    }

    const {
      data,
      error
    } = await this.sb
      .from("products")
      .select("*,categories(id,name,slug)")
      .eq("id", id)
      .single();

    if (error) {
      throw error;
    }

    return data;

  },


  // ==========================================================
  // DATABASE - SINGLE CATEGORY
  // ==========================================================

  async category(slug) {

    if (!this.sb) {
      throw new Error(
        "Supabase is not configured."
      );
    }

    if (!slug) {
      throw new Error(
        "Category slug is missing."
      );
    }

    const {
      data,
      error
    } = await this.sb
      .from("categories")
      .select("*")
      .eq("slug", slug)
      .single();

    if (error) {
      throw error;
    }

    return data;

  },


  // ==========================================================
  // PARSE SIZES / COLORS
  //
  // Supports:
  // #10, #12, #14
  //
  // Also supports newline-separated values.
  // ==========================================================

  parseOptions(value) {

    return String(value || "")
      .replace(/\r/g, "")
      .split(/[,\n]+/)
      .map(item => item.trim())
      .filter(Boolean);

  },


  // ==========================================================
  // CART
  // ==========================================================

  cart() {

    try {

      const stored =
        localStorage.getItem(
          "amani_cart"
        );

      if (!stored) {
        return [];
      }

      const parsed =
        JSON.parse(stored);

      if (!Array.isArray(parsed)) {
        return [];
      }

      return parsed.map(item => ({
        ...item,

        qty: Math.max(
          1,
          Math.floor(
            Number(item.qty || 1)
          )
        ),

        price: Number(
          item.price || 0
        ),

        size:
          String(
            item.size || ""
          ).trim(),

        color:
          String(
            item.color || ""
          ).trim()

      }));

    } catch (error) {

      console.error(
        "Could not read cart:",
        error
      );

      return [];

    }

  },


  // ==========================================================
  // SAVE CART
  // ==========================================================

  saveCart(cart) {

    localStorage.setItem(
      "amani_cart",
      JSON.stringify(cart)
    );

    this.updateCartCount();

  },


  // ==========================================================
  // CART COUNT
  //
  // Quantity = number of dozens
  // ==========================================================

  updateCartCount() {

    const quantity =
      this.cart().reduce(
        (total, item) =>
          total +
          Number(item.qty || 0),
        0
      );


    document
      .querySelectorAll(
        "[data-cart-count]"
      )
      .forEach(element => {

        element.textContent =
          quantity;

        element.setAttribute(
          "aria-label",
          `${quantity} dozen in cart`
        );

      });

  },


  // ==========================================================
  // CREATE UNIQUE CART LINE
  //
  // Same product:
  //
  // Adams / #12 / Olive
  //
  // is different from:
  //
  // Adams / #14 / Brown
  // ==========================================================

  cartLineKey(
    productId,
    size = "",
    color = ""
  ) {

    return [
      String(productId || ""),
      String(size || "")
        .trim()
        .toLowerCase(),
      String(color || "")
        .trim()
        .toLowerCase()
    ].join("|");

  },


  // ==========================================================
  // ADD TO CART
  // ==========================================================

  addCart(
    product,
    quantity = 1,
    selectedSize = "",
    selectedColor = ""
  ) {

    if (!product || !product.id) {

      alert(
        "This product could not be added to the cart."
      );

      return false;

    }


    quantity = Math.max(
      1,
      Math.floor(
        Number(quantity) || 1
      )
    );


    const size =
      String(
        selectedSize || ""
      ).trim();


    const color =
      String(
        selectedColor || ""
      ).trim();


    // ========================================================
    // AVAILABLE OPTIONS
    // ========================================================

    const availableSizes =
      this.parseOptions(
        product.sizes
      );


    const availableColors =
      this.parseOptions(
        product.colors
      );


    // ========================================================
    // REQUIRED SIZE
    // ========================================================

    if (
      availableSizes.length &&
      !size
    ) {

      alert(
        "Please select a size before adding this fly to your cart."
      );

      return false;

    }


    // ========================================================
    // REQUIRED COLOR
    // ========================================================

    if (
      availableColors.length &&
      !color
    ) {

      alert(
        "Please select a color before adding this fly to your cart."
      );

      return false;

    }


    // ========================================================
    // VALIDATE SIZE
    // ========================================================

    if (
      size &&
      availableSizes.length &&
      !availableSizes.some(
        value =>
          value.toLowerCase() ===
          size.toLowerCase()
      )
    ) {

      alert(
        "The selected size is not available for this product."
      );

      return false;

    }


    // ========================================================
    // VALIDATE COLOR
    // ========================================================

    if (
      color &&
      availableColors.length &&
      !availableColors.some(
        value =>
          value.toLowerCase() ===
          color.toLowerCase()
      )
    ) {

      alert(
        "The selected color is not available for this product."
      );

      return false;

    }


    // ========================================================
    // STOCK
    // ========================================================

    const stock =
      Number(
        product.stock || 0
      );


    if (stock <= 0) {

      alert(
        "This product is currently out of stock."
      );

      return false;

    }


    const cart =
      this.cart();


    // ========================================================
    // TOTAL PRODUCT QUANTITY ALREADY IN CART
    //
    // Stock belongs to the product, not the individual
    // variant, so different variants share the same stock.
    // ========================================================

    const existingProductQuantity =
      cart
        .filter(
          item =>
            String(item.id) ===
            String(product.id)
        )
        .reduce(
          (
            total,
            item
          ) =>
            total +
            Number(item.qty || 0),
          0
        );


    if (
      existingProductQuantity +
      quantity >
      stock
    ) {

      const remaining =
        Math.max(
          0,
          stock -
          existingProductQuantity
        );


      alert(
        remaining > 0
          ? `Only ${remaining} dozen(s) of ${product.name} remain available for your cart.`
          : `You already have all available stock of ${product.name} in your cart.`
      );

      return false;

    }


    // ========================================================
    // FIND EXACT VARIANT
    // ========================================================

    const lineKey =
      this.cartLineKey(
        product.id,
        size,
        color
      );


    const existing =
      cart.find(
        item =>
          this.cartLineKey(
            item.id,
            item.size,
            item.color
          ) ===
          lineKey
      );


    // ========================================================
    // EXISTING VARIANT
    // ========================================================

    if (existing) {

      existing.qty =
        Number(existing.qty || 0) +
        quantity;

    }


    // ========================================================
    // NEW VARIANT
    // ========================================================

    else {

      cart.push({

        id:
          product.id,

        name:
          product.name,

        price:
          Number(
            product.price || 0
          ),

        image_url:
          product.image_url || "",

        category_id:
          product.category_id || null,

        qty:
          quantity,

        size:
          size,

        color:
          color

      });

    }


    this.saveCart(
      cart
    );


    // ========================================================
    // SUCCESS MESSAGE
    // ========================================================

    let message =
      `${product.name} added to your cart.\n\n` +
      `Quantity: ${quantity} dozen\n` +
      `Price: ${this.moneyPerDozen(
        product.price
      )}`;


    if (size) {

      message +=
        `\nSize: ${size}`;

    }


    if (color) {

      message +=
        `\nColor: ${color}`;

    }


    alert(
      message
    );


    return true;

  },


  // ==========================================================
  // REMOVE CART ITEM BY PRODUCT ID
  //
  // Kept for compatibility.
  // ==========================================================

  removeCart(id) {

    const cart =
      this.cart().filter(
        item =>
          String(item.id) !==
          String(id)
      );

    this.saveCart(
      cart
    );

  },


  // ==========================================================
  // REMOVE EXACT CART LINE BY INDEX
  // ==========================================================

  removeCartItem(index) {

    const cart =
      this.cart();


    if (
      index < 0 ||
      index >= cart.length
    ) {

      return;

    }


    cart.splice(
      index,
      1
    );


    this.saveCart(
      cart
    );

  },


  // ==========================================================
  // CART TOTAL
  // ==========================================================

  total() {

    return this.cart().reduce(
      (
        total,
        item
      ) =>
        total +
        Number(
          item.price || 0
        ) *
        Number(
          item.qty || 0
        ),
      0
    );

  },


  // ==========================================================
  // HEADER
  // ==========================================================

  async renderHeader() {

    const element =
      document.querySelector(
        "#site-header"
      );


    if (!element) {
      return;
    }


    element.innerHTML = `

      <header class="site-header">

        <div class="container nav">

          <a
            class="logo"
            href="index.html"
            aria-label="Amiani's Fly Wholesalers Home"
          >

            AMIANI'S

            <span>
              FLY WHOLESALERS
            </span>

          </a>


          <nav
            class="nav-links"
            id="mainNav"
            aria-label="Main navigation"
          >

            <a href="index.html">
              Home
            </a>

            <a href="shop.html">
              Shop
            </a>

            <a href="about.html">
              About
            </a>

            <a href="contact.html">
              Contact
            </a>

          </nav>


          <div class="nav-actions">

            <button
              class="btn btn-light"
              id="openCart"
              type="button"
            >

              Cart
              (
              <span data-cart-count>
                0
              </span>
              dozen
              )

            </button>


            <button
              class="menu-btn"
              id="menuBtn"
              type="button"
              aria-label="Open navigation menu"
              aria-expanded="false"
            >

              ☰

            </button>

          </div>

        </div>

      </header>

    `;


    // ========================================================
    // MOBILE MENU
    // ========================================================

    const menuButton =
      document.querySelector(
        "#menuBtn"
      );


    const navigation =
      document.querySelector(
        "#mainNav"
      );


    if (
      menuButton &&
      navigation
    ) {

      menuButton.onclick = () => {

        const isOpen =
          navigation.classList.toggle(
            "open"
          );


        menuButton.setAttribute(
          "aria-expanded",
          isOpen
            ? "true"
            : "false"
        );

      };

    }


    // ========================================================
    // CART BUTTON
    // ========================================================

    const cartButton =
      document.querySelector(
        "#openCart"
      );


    if (cartButton) {

      cartButton.onclick =
        () => this.openCart();

    }


    this.updateCartCount();

  },


  // ==========================================================
  // FOOTER
  // ==========================================================

  async renderFooter() {

    const element =
      document.querySelector(
        "#site-footer"
      );


    if (!element) {
      return;
    }


    element.innerHTML = `

      <footer class="footer">

        <div class="container footer-grid">

          <div>

            <div
              class="logo"
              style="color:#fff"
            >

              AMIANI'S

              <span
                style="color:#d7a83e"
              >
                FLY WHOLESALERS
              </span>

            </div>


            <p>
              Quality fishing flies
              for anglers, guides
              and wholesale buyers.
            </p>


            <p>

              <strong>
                All prices are USD per dozen.
              </strong>

            </p>

          </div>


          <div>

            <h3>
              Shop
            </h3>


            <p>
              <a href="shop.html">
                All Flies
              </a>
            </p>


            <p>
              <a href="shop.html">
                Categories
              </a>
            </p>


            <p>
              <a href="checkout.html">
                Checkout
              </a>
            </p>

          </div>


          <div>

            <h3>
              Contact Amiani's Fly Wholesalers
            </h3>


            <p>

              <strong>
                Phone:
              </strong>

              <a href="tel:+254799028055">
                +254 799 028 055
              </a>

            </p>


            <p>

              <strong>
                WhatsApp:
              </strong>

              <a
                href="https://wa.me/254720070960"
                target="_blank"
                rel="noopener noreferrer"
              >
                Chat with us on WhatsApp
              </a>

            </p>


            <p>

              <strong>
                Email:
              </strong>

              <a href="mailto:amianieric@gmail.com">
                amianieric@gmail.com
              </a>

            </p>


            <p>

              <a href="admin.html">
                Admin Login
              </a>

            </p>

          </div>

        </div>


        <div class="container footer-bottom">

          © ${new Date().getFullYear()}
          Amiani's Fly Wholesalers.
          All rights reserved.

        </div>

      </footer>

    `;

  },


  // ==========================================================
  // CART MARKUP
  // ==========================================================

  cartMarkup() {

    const cart =
      this.cart();


    return `

      <div
        class="cart-drawer"
        id="cartDrawer"
      >

        <div
          class="cart-overlay"
          id="cartOverlay"
        ></div>


        <aside
          class="cart-panel"
          aria-label="Shopping cart"
        >

          <div
            style="
              display:flex;
              justify-content:space-between;
              align-items:center;
              gap:15px;
            "
          >

            <div>

              <h2>
                Your Cart
              </h2>

              <small class="muted">
                All prices are per dozen.
              </small>

            </div>


            <button
              class="close"
              id="closeCart"
              type="button"
              aria-label="Close cart"
            >
              ×
            </button>

          </div>


          <div class="cart-items">

            ${
              cart.length

                ? cart
                    .map(
                      (
                        item,
                        index
                      ) => `

                        <div class="cart-item">

                          <img
                            src="${
                              item.image_url ||
                              this.placeholder(
                                item.name
                              )
                            }"
                            alt="${this.esc(
                              item.name
                            )}"
                          >


                          <div>

                            <strong>

                              ${this.esc(
                                item.name
                              )}

                            </strong>


                            ${
                              item.size
                                ? `

                                  <div
                                    class="muted"
                                    style="
                                      margin-top:4px;
                                    "
                                  >

                                    <strong>
                                      Size:
                                    </strong>

                                    ${this.esc(
                                      item.size
                                    )}

                                  </div>

                                `
                                : ""
                            }


                            ${
                              item.color
                                ? `

                                  <div
                                    class="muted"
                                    style="
                                      margin-top:3px;
                                    "
                                  >

                                    <strong>
                                      Color:
                                    </strong>

                                    ${this.esc(
                                      item.color
                                    )}

                                  </div>

                                `
                                : ""
                            }


                            <div
                              class="muted"
                              style="
                                margin-top:5px;
                              "
                            >

                              ${this.moneyPerDozen(
                                item.price
                              )}

                              ×

                              ${Number(
                                item.qty || 0
                              )}

                              dozen

                            </div>


                            <button
                              class="
                                btn
                                btn-danger
                                btn-sm
                                remove-cart
                              "
                              data-index="${index}"
                              type="button"
                            >

                              Remove

                            </button>

                          </div>


                          <strong>

                            ${this.money(
                              Number(
                                item.price || 0
                              ) *
                              Number(
                                item.qty || 0
                              )
                            )}

                          </strong>

                        </div>

                      `
                    )
                    .join("")

                : `

                  <div class="empty">

                    Your cart is empty.

                  </div>

                `
            }

          </div>


          <div
            style="
              border-top:1px solid var(--line);
              padding-top:18px;
            "
          >

            <div
              style="
                display:flex;
                justify-content:space-between;
                font-size:20px;
                font-weight:900;
              "
            >

              <span>
                Total
              </span>


              <span>
                ${this.money(
                  this.total()
                )}
              </span>

            </div>


            <small
              class="muted"
              style="
                display:block;
                margin-top:5px;
              "
            >

              Quantities are measured in dozens.

            </small>


            <a
              class="btn btn-primary"
              style="
                width:100%;
                margin-top:14px;
              "
              href="checkout.html"
            >

              Checkout

            </a>

          </div>

        </aside>

      </div>

    `;

  },


  // ==========================================================
  // OPEN CART
  // ==========================================================

  openCart() {

    let drawer =
      document.querySelector(
        "#cartDrawer"
      );


    if (!drawer) {

      document.body.insertAdjacentHTML(
        "beforeend",
        this.cartMarkup()
      );


      drawer =
        document.querySelector(
          "#cartDrawer"
        );

    }


    if (!drawer) {
      return;
    }


    drawer.classList.add(
      "open"
    );


    // ========================================================
    // CLOSE
    // ========================================================

    const closeButton =
      drawer.querySelector(
        "#closeCart"
      );


    if (closeButton) {

      closeButton.onclick =
        () => {

          drawer.classList.remove(
            "open"
          );

        };

    }


    // ========================================================
    // OVERLAY
    // ========================================================

    const overlay =
      drawer.querySelector(
        "#cartOverlay"
      );


    if (overlay) {

      overlay.onclick =
        () => {

          drawer.classList.remove(
            "open"
          );

        };

    }


    // ========================================================
    // REMOVE
    // ========================================================

    drawer
      .querySelectorAll(
        ".remove-cart"
      )
      .forEach(
        button => {

          button.onclick =
            () => {

              const index =
                Number(
                  button.dataset.index
                );


              this.removeCartItem(
                index
              );


              drawer.remove();


              this.openCart();

            };

        }
      );

  }

};


// ============================================================
// BACKWARD COMPATIBILITY
// ============================================================

window.AMIANI =
  AMIANI;

window.AMANI =
  AMIANI;


// ============================================================
// DOM READY
// ============================================================

document.addEventListener(
  "DOMContentLoaded",
  async () => {

    try {

      if (!AMIANI.sb) {

        console.error(
          "Supabase is not configured."
        );


        const message =
          document.querySelector(
            "#supabaseError"
          );


        if (message) {

          message.textContent =
            "Supabase is not configured.";

        }


        return;

      }


      await AMIANI.renderHeader();

      await AMIANI.renderFooter();


      // ======================================================
      // HOME CATEGORIES
      // ======================================================

      if (
        document.querySelector(
          "[data-home-categories]"
        )
      ) {

        await loadHome();

      }


      // ======================================================
      // HOME PRODUCTS
      // ======================================================

      if (
        document.querySelector(
          "[data-home-products]"
        )
      ) {

        await loadHomeProducts();

      }


      // ======================================================
      // SHOP
      // ======================================================

      if (
        document.querySelector(
          "#shopGrid"
        )
      ) {

        await loadShop();

      }


      // ======================================================
      // PRODUCT
      // ======================================================

      if (
        document.querySelector(
          "#productDetail"
        )
      ) {

        await loadProductPage();

      }


      // ======================================================
      // CATEGORY
      // ======================================================

      if (
        document.querySelector(
          "#categoryPage"
        )
      ) {

        await loadCategoryPage();

      }


      AMIANI.updateCartCount();

    } catch (error) {

      console.error(
        "Storefront initialization error:",
        error
      );

    }

  }
);


// ============================================================
// HOME CATEGORIES
// ============================================================

async function loadHome() {

  const element =
    document.querySelector(
      "[data-home-categories]"
    );


  if (!element) {
    return;
  }


  try {

    const categories =
      await AMIANI.categories();


    element.innerHTML =
      categories
        .slice(
          0,
          8
        )
        .map(
          category => `

            <a
              class="card category-card"
              href="category.html?slug=${encodeURIComponent(
                category.slug
              )}"
            >

              <img
                src="${
                  category.image_url ||
                  AMIANI.placeholder(
                    category.name
                  )
                }"
                alt="${AMIANI.esc(
                  category.name
                )}"
                loading="lazy"
              >


              <div class="card-body">

                <h3>

                  ${AMIANI.esc(
                    category.name
                  )}

                </h3>


                <p class="muted">

                  ${AMIANI.esc(
                    category.description ||
                    "Explore this fishing fly collection."
                  )}

                </p>

              </div>

            </a>

          `
        )
        .join("")


      ||

      `

        <div class="empty">

          No categories yet.
          Add categories from Admin.

        </div>

      `;


  } catch (error) {

    console.error(
      "Could not load categories:",
      error
    );


    element.innerHTML = `

      <div class="notice error">

        ${AMIANI.esc(
          error.message
        )}

      </div>

    `;

  }

}


// ============================================================
// HOME PRODUCTS
// ============================================================

async function loadHomeProducts() {

  const element =
    document.querySelector(
      "[data-home-products]"
    );


  if (!element) {
    return;
  }


  try {

    const products =
      await AMIANI.products();


    const list =
      products.slice(
        0,
        8
      );


    element.innerHTML =
      list
        .map(
          productCard
        )
        .join("")


      ||

      `

        <div class="empty">

          No products yet.

        </div>

      `;


    attachAddButtons(
      element,
      products
    );


  } catch (error) {

    console.error(
      "Could not load home products:",
      error
    );


    element.innerHTML = `

      <div class="notice error">

        ${AMIANI.esc(
          error.message
        )}

      </div>

    `;

  }

}


// ============================================================
// PRODUCT CARD
// ============================================================
//
// Product cards show available sizes/colors.
//
// Customer is taken to product.html where the exact
// variant can be selected before adding to cart.
// ============================================================

function productCard(
  product
) {

  const stock =
    Number(
      product.stock || 0
    );


  const isOutOfStock =
    stock <= 0;


  const sizes =
    AMIANI.parseOptions(
      product.sizes
    );


  const colors =
    AMIANI.parseOptions(
      product.colors
    );


  return `

    <article
      class="card product-card"
    >

      <a
        href="product.html?id=${encodeURIComponent(
          product.id
        )}"
      >

        <img
          src="${
            product.image_url ||
            AMIANI.placeholder(
              product.name
            )
          }"
          alt="${AMIANI.esc(
            product.name
          )}"
          loading="lazy"
        >

      </a>


      <div class="card-body">

        <span class="badge">

          ${AMIANI.esc(
            product.categories?.name ||
            "Fishing Fly"
          )}

        </span>


        <h3>

          ${AMIANI.esc(
            product.name
          )}

        </h3>


        <div
          class="product-meta"
        >

          <div>

            <span class="price">

              ${AMIANI.moneyPerDozen(
                product.price
              )}

            </span>

          </div>


          <button
            class="
              btn
              btn-primary
              btn-sm
              add-product
            "
            data-id="${AMIANI.escAttr(
              product.id
            )}"
            type="button"
            ${isOutOfStock ? "disabled" : ""}
          >

            ${
              isOutOfStock
                ? "Out of Stock"
                : "Select Options"
            }

          </button>

        </div>


        <small
          class="muted"
          style="
            display:block;
            margin-top:6px;
          "
        >

          Price per dozen

        </small>


        <small
          class="muted"
          style="
            display:block;
            margin-top:4px;
          "
        >

          Stock:
          ${stock}
          dozen${stock === 1 ? "" : "s"}

        </small>


        ${
          sizes.length
            ? `

              <small
                class="muted"
                style="
                  display:block;
                  margin-top:5px;
                "
              >

                <strong>
                  Sizes:
                </strong>

                ${AMIANI.esc(
                  sizes.join(", ")
                )}

              </small>

            `
            : ""
        }


        ${
          colors.length
            ? `

              <small
                class="muted"
                style="
                  display:block;
                  margin-top:5px;
                "
              >

                <strong>
                  Colors:
                </strong>

                ${AMIANI.esc(
                  colors.join(", ")
                )}

              </small>

            `
            : ""
        }

      </div>

    </article>

  `;

}


// ============================================================
// ATTACH PRODUCT BUTTONS
// ============================================================

function attachAddButtons(
  container,
  products
) {

  if (!container) {
    return;
  }


  container
    .querySelectorAll(
      ".add-product"
    )
    .forEach(
      button => {

        button.onclick =
          () => {

            const product =
              products.find(
                item =>
                  String(
                    item.id
                  ) ===
                  String(
                    button.dataset.id
                  )
              );


            if (!product) {
              return;
            }


            if (
              Number(
                product.stock || 0
              ) <= 0
            ) {

              alert(
                "This product is currently out of stock."
              );

              return;

            }


            window.location.href =
              `product.html?id=${encodeURIComponent(
                product.id
              )}`;

          };

      }
    );

}


// ============================================================
// SHOP
// ============================================================

async function loadShop() {

  const grid =
    document.querySelector(
      "#shopGrid"
    );


  if (!grid) {
    return;
  }


  const search =
    document.querySelector(
      "#shopSearch"
    );


  const filter =
    document.querySelector(
      "#shopCategory"
    );


  try {

    const [
      products,
      categories
    ] =
      await Promise.all([
        AMIANI.products(),
        AMIANI.categories()
      ]);


    if (filter) {

      filter.innerHTML =
        '<option value="">All categories</option>' +

        categories
          .map(
            category => `

              <option
                value="${AMIANI.escAttr(
                  category.id
                )}"
              >

                ${AMIANI.esc(
                  category.name
                )}

              </option>

            `
          )
          .join("");

    }


    function draw() {

      const query =
        search
          ? search.value
              .toLowerCase()
              .trim()
          : "";


      const categoryId =
        filter
          ? filter.value
          : "";


      const list =
        products.filter(
          product => {

            const name =
              String(
                product.name || ""
              )
              .toLowerCase();


            const description =
              String(
                product.description || ""
              )
              .toLowerCase();


            const matchesSearch =
              !query ||
              name.includes(query) ||
              description.includes(query);


            const matchesCategory =
              !categoryId ||
              String(
                product.category_id
              ) ===
              String(
                categoryId
              );


            return (
              matchesSearch &&
              matchesCategory
            );

          }
        );


      grid.innerHTML =
        list
          .map(
            productCard
          )
          .join("")


        ||

        `

          <div class="empty">

            No matching flies found.

          </div>

        `;


      attachAddButtons(
        grid,
        products
      );

    }


    if (search) {

      search.oninput =
        draw;

    }


    if (filter) {

      filter.onchange =
        draw;

    }


    draw();


  } catch (error) {

    console.error(
      "Could not load shop:",
      error
    );


    grid.innerHTML = `

      <div class="notice error">

        ${AMIANI.esc(
          error.message
        )}

      </div>

    `;

  }

}


// ============================================================
// PRODUCT DETAIL
// ============================================================

async function loadProductPage() {

  const box =
    document.querySelector(
      "#productDetail"
    );


  if (!box) {
    return;
  }


  const id =
    new URLSearchParams(
      window.location.search
    ).get("id");


  if (!id) {

    box.innerHTML = `

      <div class="notice error">

        Product not found.

      </div>

    `;

    return;

  }


  try {

    const product =
      await AMIANI.product(
        id
      );


    const stock =
      Number(
        product.stock || 0
      );


    const outOfStock =
      stock <= 0;


    // ========================================================
    // OPTIONS
    // ========================================================

    const sizes =
      AMIANI.parseOptions(
        product.sizes
      );


    const colors =
      AMIANI.parseOptions(
        product.colors
      );


    box.innerHTML = `

      <div
        class="product-detail-image"
      >

        <img
          src="${
            product.image_url ||
            AMIANI.placeholder(
              product.name
            )
          }"
          alt="${AMIANI.esc(
            product.name
          )}"
        >

      </div>


      <div>

        <span class="badge">

          ${AMIANI.esc(
            product.categories?.name ||
            "Fishing Fly"
          )}

        </span>


        <h1>

          ${AMIANI.esc(
            product.name
          )}

        </h1>


        <div
          class="price"
          style="
            font-size:28px;
          "
        >

          ${AMIANI.moneyPerDozen(
            product.price
          )}

        </div>


        <p
          class="muted"
          style="
            font-weight:600;
          "
        >

          Price is for one dozen
          (12 flies).

        </p>


        <p>

          ${AMIANI.esc(
            product.description ||
            "Quality fishing fly from Amiani's Fly Wholesalers."
          )}

        </p>


        <!-- ==================================================
             SIZE
        =================================================== -->

        ${
          sizes.length
            ? `

              <div
                class="form-group"
                style="
                  margin-top:20px;
                "
              >

                <label
                  for="productSize"
                >

                  Select Size

                  <span
                    style="
                      color:#b42318;
                    "
                  >
                    *
                  </span>

                </label>


                <select
                  id="productSize"
                  class="field"
                  ${outOfStock ? "disabled" : ""}
                >

                  <option value="">
                    Choose a size
                  </option>

                  ${
                    sizes
                      .map(
                        size => `

                          <option
                            value="${AMIANI.escAttr(
                              size
                            )}"
                          >

                            ${AMIANI.esc(
                              size
                            )}

                          </option>

                        `
                      )
                      .join("")
                  }

                </select>

              </div>

            `
            : ""
        }


        <!-- ==================================================
             COLOR
        =================================================== -->

        ${
          colors.length
            ? `

              <div
                class="form-group"
                style="
                  margin-top:15px;
                "
              >

                <label
                  for="productColor"
                >

                  Select Color

                  <span
                    style="
                      color:#b42318;
                    "
                  >
                    *
                  </span>

                </label>


                <select
                  id="productColor"
                  class="field"
                  ${outOfStock ? "disabled" : ""}
                >

                  <option value="">
                    Choose a color
                  </option>

                  ${
                    colors
                      .map(
                        color => `

                          <option
                            value="${AMIANI.escAttr(
                              color
                            )}"
                          >

                            ${AMIANI.esc(
                              color
                            )}

                          </option>

                        `
                      )
                      .join("")
                  }

                </select>

              </div>

            `
            : ""
        }


        <!-- ==================================================
             STOCK
        =================================================== -->

        <p
          style="
            margin-top:15px;
            font-weight:700;
          "
        >

          <strong>
            Stock:
          </strong>

          ${stock}
          dozen${stock === 1 ? "" : "s"}

        </p>


        ${
          outOfStock
            ? `

              <div
                class="notice error"
                style="
                  margin-top:12px;
                "
              >

                This product is currently
                out of stock.

              </div>

            `
            : ""
        }


        <!-- ==================================================
             QUANTITY
        =================================================== -->

        <div
          class="qty"
          style="
            margin-top:18px;
          "
        >

          <label
            for="qty"
            class="muted"
            style="
              width:100%;
              display:block;
              margin-bottom:6px;
            "
          >

            Quantity (dozens)

          </label>


          <button
            id="minus"
            type="button"
            ${outOfStock ? "disabled" : ""}
          >
            −
          </button>


          <input
            class="field"
            id="qty"
            type="number"
            min="1"
            max="${stock > 0 ? stock : 1}"
            value="1"
            ${outOfStock ? "disabled" : ""}
          >


          <button
            id="plus"
            type="button"
            ${outOfStock ? "disabled" : ""}
          >
            +
          </button>

        </div>


        <!-- ==================================================
             MESSAGE
        =================================================== -->

        <div
          id="productOptionMessage"
          style="
            margin-top:12px;
            margin-bottom:12px;
          "
        ></div>


        <!-- ==================================================
             ADD TO CART
        =================================================== -->

        <button
          class="
            btn
            btn-primary
          "
          id="addDetail"
          type="button"
          ${outOfStock ? "disabled" : ""}
          style="
            width:100%;
            margin-top:10px;
          "
        >

          ${
            outOfStock
              ? "Out of Stock"
              : "Add 1 Dozen to Cart"
          }

        </button>

      </div>

    `;


    // ========================================================
    // ELEMENTS
    // ========================================================

    const quantityInput =
      document.querySelector(
        "#qty"
      );


    const addButton =
      document.querySelector(
        "#addDetail"
      );


    const minusButton =
      document.querySelector(
        "#minus"
      );


    const plusButton =
      document.querySelector(
        "#plus"
      );


    const sizeSelect =
      document.querySelector(
        "#productSize"
      );


    const colorSelect =
      document.querySelector(
        "#productColor"
      );


    const optionMessage =
      document.querySelector(
        "#productOptionMessage"
      );


    if (
      !quantityInput ||
      !addButton
    ) {

      return;

    }


    // ========================================================
    // UPDATE ADD BUTTON
    // ========================================================

    function updateAddButton() {

      let quantity =
        Number(
          quantityInput.value || 1
        );


      if (
        !Number.isFinite(
          quantity
        )
      ) {

        quantity = 1;

      }


      quantity =
        Math.max(
          1,
          Math.floor(
            quantity
          )
        );


      if (stock > 0) {

        quantity =
          Math.min(
            quantity,
            stock
          );

      }


      quantityInput.value =
        quantity;


      addButton.textContent =
        quantity === 1
          ? "Add 1 Dozen to Cart"
          : `Add ${quantity} Dozen to Cart`;

    }


    // ========================================================
    // MINUS
    // ========================================================

    if (minusButton) {

      minusButton.onclick =
        () => {

          const current =
            Number(
              quantityInput.value || 1
            );


          quantityInput.value =
            Math.max(
              1,
              current - 1
            );


          updateAddButton();

        };

    }


    // ========================================================
    // PLUS
    // ========================================================

    if (plusButton) {

      plusButton.onclick =
        () => {

          let quantity =
            Number(
              quantityInput.value || 1
            ) + 1;


          if (stock > 0) {

            quantity =
              Math.min(
                quantity,
                stock
              );

          }


          quantityInput.value =
            quantity;


          updateAddButton();

        };

    }


    // ========================================================
    // MANUAL QUANTITY
    // ========================================================

    quantityInput.oninput =
      () => {

        let quantity =
          Number(
            quantityInput.value
          );


        if (
          !Number.isFinite(
            quantity
          ) ||
          quantity < 1
        ) {

          quantity = 1;

        }


        if (stock > 0) {

          quantity =
            Math.min(
              quantity,
              stock
            );

        }


        quantityInput.value =
          Math.floor(
            quantity
          );


        updateAddButton();

      };


    // ========================================================
    // CLEAR OPTION MESSAGE
    // ========================================================

    function clearOptionMessage() {

      if (optionMessage) {

        optionMessage.innerHTML =
          "";

      }

    }


    if (sizeSelect) {

      sizeSelect.onchange =
        clearOptionMessage;

    }


    if (colorSelect) {

      colorSelect.onchange =
        clearOptionMessage;

    }


    // ========================================================
    // ADD TO CART
    // ========================================================

    addButton.onclick =
      () => {

        let quantity =
          Number(
            quantityInput.value || 1
          );


        if (
          !Number.isFinite(
            quantity
          )
        ) {

          quantity = 1;

        }


        quantity =
          Math.max(
            1,
            Math.floor(
              quantity
            )
          );


        if (stock > 0) {

          quantity =
            Math.min(
              quantity,
              stock
            );

        }


        const selectedSize =
          sizeSelect
            ? sizeSelect.value.trim()
            : "";


        const selectedColor =
          colorSelect
            ? colorSelect.value.trim()
            : "";


        // ====================================================
        // SIZE VALIDATION
        // ====================================================

        if (
          sizes.length &&
          !selectedSize
        ) {

          if (optionMessage) {

            optionMessage.innerHTML = `

              <div
                class="notice error"
              >

                Please select a size
                before adding this fly
                to your cart.

              </div>

            `;

          }


          if (sizeSelect) {

            sizeSelect.focus();

          }


          return;

        }


        // ====================================================
        // COLOR VALIDATION
        // ====================================================

        if (
          colors.length &&
          !selectedColor
        ) {

          if (optionMessage) {

            optionMessage.innerHTML = `

              <div
                class="notice error"
              >

                Please select a color
                before adding this fly
                to your cart.

              </div>

            `;

          }


          if (colorSelect) {

            colorSelect.focus();

          }


          return;

        }


        // ====================================================
        // ADD
        // ====================================================

        const added =
          AMIANI.addCart(
            product,
            quantity,
            selectedSize,
            selectedColor
          );


        if (
          added &&
          optionMessage
        ) {

          optionMessage.innerHTML = `

            <div
              class="notice"
            >

              <strong>
                Added to cart.
              </strong>

              <div
                style="
                  margin-top:5px;
                "
              >

                ${quantity}
                dozen
                ${quantity === 1 ? "" : "s"}

                ${
                  selectedSize
                    ? ` • Size: ${AMIANI.esc(
                        selectedSize
                      )}`
                    : ""
                }

                ${
                  selectedColor
                    ? ` • Color: ${AMIANI.esc(
                        selectedColor
                      )}`
                    : ""
                }

              </div>

            </div>

          `;

        }

      };


    updateAddButton();

  } catch (error) {

    console.error(
      "Could not load product:",
      error
    );


    box.innerHTML = `

      <div class="notice error">

        ${AMIANI.esc(
          error.message
        )}

      </div>

    `;

  }

}


// ============================================================
// CATEGORY PAGE
// ============================================================

async function loadCategoryPage() {

  const box =
    document.querySelector(
      "#categoryPage"
    );


  if (!box) {
    return;
  }


  const slug =
    new URLSearchParams(
      window.location.search
    ).get("slug");


  if (!slug) {

    box.innerHTML = `

      <div class="notice error">

        Category not found.

      </div>

    `;

    return;

  }


  try {

    const [
      category,
      products
    ] =
      await Promise.all([
        AMIANI.category(
          slug
        ),
        AMIANI.products()
      ]);


    const list =
      products.filter(
        product =>
          String(
            product.category_id
          ) ===
          String(
            category.id
          )
      );


    box.innerHTML = `

      <div
        class="section-head"
      >

        <div>

          <div class="eyebrow">
            Collection
          </div>


          <h1>

            ${AMIANI.esc(
              category.name
            )}

          </h1>


          <p class="muted">

            ${AMIANI.esc(
              category.description ||
              ""
            )}

          </p>

        </div>

      </div>


      <div
        class="grid grid-4"
      >

        ${
          list
            .map(
              productCard
            )
            .join("")


          ||

          `

            <div class="empty">

              No products in this
              category yet.

            </div>

          `
        }

      </div>

    `;


    attachAddButtons(
      box,
      products
    );


  } catch (error) {

    console.error(
      "Could not load category:",
      error
    );


    box.innerHTML = `

      <div class="notice error">

        ${AMIANI.esc(
          error.message
        )}

      </div>

    `;

  }

}