// ============================================================
// AMIANI'S FLY WHOLESALERS
// MAIN WEBSITE APP
// ============================================================

(function () {

  "use strict";


  // ============================================================
  // CONFIGURATION
  // ============================================================

  const AMIANI = {

    sb: window.AMANI_SUPABASE || null,

    brandName: "Amiani's Fly Wholesalers",

    currency: "USD",

    currencySymbol: "$"

  };


  // ============================================================
  // BASIC HELPERS
  // ============================================================

  function money(value) {

    const number = Number(value || 0);

    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(number);

  }


  function moneyPerDozen(value) {

    return `${money(value)} / dozen`;

  }


  function esc(value) {

    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");

  }


  function escAttr(value) {

    return esc(value);

  }


  function slug(value) {

    return String(value || "")

      .toLowerCase()

      .trim()

      .replace(/[^a-z0-9]+/g, "-")

      .replace(/^-+|-+$/g, "");

  }


  function placeholder(text = "No image") {

    return (
      "data:image/svg+xml;charset=UTF-8," +
      encodeURIComponent(`
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="800"
          height="600"
          viewBox="0 0 800 600"
        >
          <rect
            width="800"
            height="600"
            fill="#f1f3ef"
          />

          <text
            x="400"
            y="300"
            text-anchor="middle"
            dominant-baseline="middle"
            font-family="Arial"
            font-size="32"
            fill="#6d7c77"
          >
            ${text}
          </text>
        </svg>
      `)
    );

  }


  // ============================================================
  // SUPABASE CHECK
  // ============================================================

  function checkSupabase() {

    if (!AMIANI.sb) {

      console.error(
        "Amiani Supabase client is not available."
      );

      return false;

    }

    return true;

  }


  // ============================================================
  // CATEGORIES
  // ============================================================

  async function categories() {

    if (!checkSupabase()) {

      throw new Error(
        "Supabase is not connected."
      );

    }


    const {
      data,
      error
    } = await AMIANI.sb

      .from("categories")

      .select("*")

      .order("name", {
        ascending: true
      });


    if (error) {

      console.error(
        "Categories error:",
        error
      );

      throw error;

    }


    return data || [];

  }


  // ============================================================
  // ALL PRODUCTS
  // ============================================================

  async function products() {

    if (!checkSupabase()) {

      throw new Error(
        "Supabase is not connected."
      );

    }


    const {
      data,
      error
    } = await AMIANI.sb

      .from("products")

      .select(`
        *,
        categories(
          id,
          name,
          slug
        )
      `)

      .order("created_at", {
        ascending: false
      });


    if (error) {

      console.error(
        "Products error:",
        error
      );

      throw error;

    }


    return data || [];

  }


  // ============================================================
  // SINGLE PRODUCT
  // ============================================================

  async function product(id) {

    if (!checkSupabase()) {

      throw new Error(
        "Supabase is not connected."
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
    } = await AMIANI.sb

      .from("products")

      .select(`
        *,
        categories(
          id,
          name,
          slug
        )
      `)

      .eq("id", id)

      .maybeSingle();


    if (error) {

      console.error(
        "Product error:",
        error
      );

      throw error;

    }


    if (!data) {

      throw new Error(
        "Product not found."
      );

    }


    return data;

  }


  // ============================================================
  // SINGLE CATEGORY
  // ============================================================

  async function category(categorySlug) {

    if (!checkSupabase()) {

      throw new Error(
        "Supabase is not connected."
      );

    }


    const {
      data,
      error
    } = await AMIANI.sb

      .from("categories")

      .select("*")

      .eq("slug", categorySlug)

      .maybeSingle();


    if (error) {

      console.error(
        "Category error:",
        error
      );

      throw error;

    }


    return data;

  }


  // ============================================================
  // PARSE OPTIONS
  //
  // Supports:
  // Adams
  // Parachute Adams
  // CDC Adams
  //
  // or:
  // 10, 12, 14, 16
  //
  // or one per line
  // ============================================================

  function parseOptions(value) {

    if (!value) {

      return [];

    }


    return String(value)

      .split(/[\n,]+/)

      .map(item => item.trim())

      .filter(Boolean);

  }


  // ============================================================
  // CART
  // ============================================================

  function cart() {

    try {

      const raw =
        localStorage.getItem("amani_cart");

      if (!raw) {

        return [];

      }


      const parsed =
        JSON.parse(raw);


      return Array.isArray(parsed)
        ? parsed
        : [];

    } catch (error) {

      console.error(
        "Cart read error:",
        error
      );

      return [];

    }

  }


  function saveCart(items) {

    localStorage.setItem(
      "amani_cart",
      JSON.stringify(items)
    );


    updateCartCount();

  }


  function updateCartCount() {

    const items = cart();

    const count = items.reduce(
      (total, item) => {

        return total + Number(
          item.qty || 0
        );

      },
      0
    );


    document
      .querySelectorAll(".cart-count")
      .forEach(element => {

        element.textContent = count;

      });

  }


  // ============================================================
  // CART LINE KEY
  //
  // Same product with different size/color
  // becomes a different cart line.
  // ============================================================

  function cartLineKey(
    productId,
    size,
    color
  ) {

    return [
      productId || "",
      size || "",
      color || ""
    ].join("::");

  }


  // ============================================================
  // ADD TO CART
  // ============================================================

  function addCart(productData, options = {}) {

    const size =
      options.size ||
      "";

    const color =
      options.color ||
      "";

    const qty =
      Math.max(
        1,
        Number(options.qty || 1)
      );


    const sizes =
      parseOptions(
        productData.sizes
      );

    const colors =
      parseOptions(
        productData.colors
      );


    // ----------------------------------------------------------
    // Validate size
    // ----------------------------------------------------------

    if (
      sizes.length &&
      !sizes.includes(size)
    ) {

      throw new Error(
        "Please select a size."
      );

    }


    // ----------------------------------------------------------
    // Validate color
    // ----------------------------------------------------------

    if (
      colors.length &&
      !colors.includes(color)
    ) {

      throw new Error(
        "Please select a color."
      );

    }


    const stock =
      Number(productData.stock || 0);


    if (stock <= 0) {

      throw new Error(
        "This product is currently out of stock."
      );

    }


    const items = cart();


    const key =
      cartLineKey(
        productData.id,
        size,
        color
      );


    // ----------------------------------------------------------
    // Total quantity already in cart for this product
    // ----------------------------------------------------------

    const existingProductQty =
      items

        .filter(item =>
          String(item.product_id) ===
          String(productData.id)
        )

        .reduce(
          (sum, item) =>
            sum + Number(item.qty || 0),
          0
        );


    if (
      existingProductQty + qty >
      stock
    ) {

      throw new Error(
        `Only ${stock} dozen${
          stock === 1 ? "" : "s"
        } available.`
      );

    }


    const existingIndex =
      items.findIndex(
        item =>
          item.key === key
      );


    if (existingIndex >= 0) {

      items[existingIndex].qty += qty;

    } else {

      items.push({

        key,

        product_id:
          productData.id,

        name:
          productData.name,

        price:
          Number(productData.price || 0),

        image_url:
          productData.image_url || "",

        category_id:
          productData.category_id || "",

        category_name:
          productData.categories?.name || "",

        size,

        color,

        qty

      });

    }


    saveCart(items);


    return true;

  }


  // ============================================================
  // REMOVE CART ITEM
  // ============================================================

  function removeCartItem(key) {

    const items =
      cart().filter(
        item =>
          item.key !== key
      );


    saveCart(items);

    return items;

  }


  // ============================================================
  // REMOVE PRODUCT COMPLETELY
  // ============================================================

  function removeCart(productId) {

    const items =
      cart().filter(
        item =>
          String(item.product_id) !==
          String(productId)
      );


    saveCart(items);

    return items;

  }


  // ============================================================
  // CART TOTAL
  // ============================================================

  function total() {

    return cart().reduce(
      (sum, item) => {

        return sum +
          (
            Number(item.price || 0) *
            Number(item.qty || 0)
          );

      },
      0
    );

  }


  // ============================================================
  // HEADER
  // ============================================================

  function renderHeader() {

    const header =
      document.querySelector(
        "#site-header"
      );


    if (!header) {

      return;

    }


    header.innerHTML = `

      <header class="site-header">

        <div class="container">

          <div class="header-inner">

            <a
              href="index.html"
              class="logo"
            >

              <span class="logo-main">
                AMIANI'S
              </span>

              <span class="logo-sub">
                FLY WHOLESALERS
              </span>

            </a>


            <nav class="main-nav">

              <a href="index.html">
                Home
              </a>

              <a href="shop.html">
                Shop
              </a>

              <button
                type="button"
                class="cart-button"
                id="openCartButton"
              >

                Cart

                <span class="cart-count">
                  0
                </span>

              </button>

            </nav>


            <button
              type="button"
              class="mobile-menu-button"
              id="mobileMenuButton"
              aria-label="Open menu"
            >
              ☰
            </button>

          </div>

        </div>

      </header>

    `;


    updateCartCount();


    const mobileButton =
      document.querySelector(
        "#mobileMenuButton"
      );


    if (mobileButton) {

      mobileButton.addEventListener(
        "click",
        () => {

          const nav =
            document.querySelector(
              ".main-nav"
            );


          if (nav) {

            nav.classList.toggle(
              "mobile-open"
            );

          }

        }
      );

    }


    const cartButton =
      document.querySelector(
        "#openCartButton"
      );


    if (cartButton) {

      cartButton.addEventListener(
        "click",
        openCart
      );

    }

  }


  // ============================================================
  // FOOTER
  // ============================================================

  function renderFooter() {

    const footer =
      document.querySelector(
        "#site-footer"
      );


    if (!footer) {

      return;

    }


    footer.innerHTML = `

      <footer class="site-footer">

        <div class="container">

          <div class="footer-grid">

            <div>

              <h3>
                Amiani's Fly Wholesalers
              </h3>

              <p>
                Quality fishing flies for anglers,
                fly shops and fishing businesses.
              </p>

            </div>


            <div>

              <h3>
                Quick Links
              </h3>

              <a href="index.html">
                Home
              </a>

              <a href="shop.html">
                Shop
              </a>

            </div>


            <div>

              <h3>
                Shopping
              </h3>

              <a href="shop.html">
                Fishing Flies
              </a>

              <button
                type="button"
                class="footer-cart-button"
                onclick="window.AMIANI.openCart()"
              >
                View Cart
              </button>

            </div>

          </div>


          <div class="footer-bottom">

            <p>
              © ${new Date().getFullYear()}
              Amiani's Fly Wholesalers.
              All rights reserved.
            </p>

          </div>

        </div>

      </footer>

    `;

  }


  // ============================================================
  // CART DRAWER
  // ============================================================

  function openCart() {

    let drawer =
      document.querySelector(
        "#cartDrawer"
      );


    if (!drawer) {

      drawer =
        document.createElement(
          "div"
        );


      drawer.id =
        "cartDrawer";


      drawer.innerHTML = `

        <div
          class="cart-overlay"
          id="cartOverlay"
        ></div>


        <aside
          class="cart-drawer"
          aria-label="Shopping cart"
        >

          <div class="cart-drawer-header">

            <h2>
              Your Cart
            </h2>

            <button
              type="button"
              id="closeCartButton"
              aria-label="Close cart"
            >
              ×
            </button>

          </div>


          <div
            id="cartItems"
            class="cart-items"
          ></div>


          <div class="cart-drawer-footer">

            <div class="cart-total-row">

              <span>
                Total
              </span>

              <strong
                id="cartTotal"
              >
                $0.00
              </strong>

            </div>


            <a
              href="checkout.html"
              class="btn btn-primary"
            >
              Checkout
            </a>

          </div>

        </aside>

      `;


      document.body.appendChild(
        drawer
      );


      document
        .querySelector(
          "#cartOverlay"
        )
        .addEventListener(
          "click",
          closeCart
        );


      document
        .querySelector(
          "#closeCartButton"
        )
        .addEventListener(
          "click",
          closeCart
        );

    }


    renderCartDrawer();


    drawer.classList.add(
      "open"
    );

  }


  function closeCart() {

    const drawer =
      document.querySelector(
        "#cartDrawer"
      );


    if (drawer) {

      drawer.classList.remove(
        "open"
      );

    }

  }


  function renderCartDrawer() {

    const items =
      cart();


    const list =
      document.querySelector(
        "#cartItems"
      );


    const totalElement =
      document.querySelector(
        "#cartTotal"
      );


    if (!list) {

      return;

    }


    if (!items.length) {

      list.innerHTML = `

        <div class="empty-state">

          <h3>
            Your cart is empty
          </h3>

          <p>
            Add fishing flies to your
            cart to continue.
          </p>

          <a
            href="shop.html"
            class="btn btn-primary"
          >
            Shop Flies
          </a>

        </div>

      `;

    } else {

      list.innerHTML =
        items.map(item => {

          const lineTotal =
            Number(item.price || 0) *
            Number(item.qty || 0);


          return `

            <div
              class="cart-item"
              data-cart-key="${escAttr(item.key)}"
            >

              <img
                src="${
                  escAttr(
                    item.image_url ||
                    placeholder("Fly")
                  )
                }"
                alt="${escAttr(item.name)}"
                loading="lazy"
              >


              <div class="cart-item-info">

                <h4>
                  ${esc(item.name)}
                </h4>


                ${
                  item.size
                    ? `<p>Size: ${esc(item.size)}</p>`
                    : ""
                }


                ${
                  item.color
                    ? `<p>Color: ${esc(item.color)}</p>`
                    : ""
                }


                <p>
                  ${money(item.price)}
                  / dozen
                </p>


                <p>
                  Qty:
                  ${Number(item.qty || 0)}
                </p>


                <strong>
                  ${money(lineTotal)}
                </strong>


                <button
                  type="button"
                  class="cart-remove"
                  data-remove-cart="${escAttr(item.key)}"
                >
                  Remove
                </button>

              </div>

            </div>

          `;

        }).join("");

    }


    if (totalElement) {

      totalElement.textContent =
        money(total());

    }


    list
      .querySelectorAll(
        "[data-remove-cart]"
      )
      .forEach(button => {

        button.addEventListener(
          "click",
          () => {

            removeCartItem(
              button.dataset.removeCart
            );

            renderCartDrawer();

          }
        );

      });

  }


  // ============================================================
  // PRODUCT CARD
  // ============================================================

  function productCard(productData) {

    const image =
      productData.image_url ||
      placeholder("Fly");


    const categoryName =
      productData.categories?.name ||
      "";


    const stock =
      Number(productData.stock || 0);


    const outOfStock =
      stock <= 0;


    const sizes =
      parseOptions(
        productData.sizes
      );


    const colors =
      parseOptions(
        productData.colors
      );


    return `

      <article
        class="product-card"
        data-product-id="${escAttr(productData.id)}"
      >

        <a
          href="product.html?id=${encodeURIComponent(productData.id)}"
          class="product-image-link"
        >

          <div class="product-image-wrap">

            <img
              src="${escAttr(image)}"
              alt="${escAttr(productData.name)}"
              class="product-image"
              loading="lazy"
            >

            ${
              outOfStock
                ? `
                  <span class="product-badge out-of-stock">
                    Out of Stock
                  </span>
                `
                : ""
            }

          </div>

        </a>


        <div class="product-card-body">


          ${
            categoryName
              ? `
                <div class="product-category">
                  ${esc(categoryName)}
                </div>
              `
              : ""
          }


          <h3 class="product-title">

            ${esc(productData.name)}

          </h3>


          <div class="product-price">

            ${moneyPerDozen(productData.price)}

          </div>


          ${
            sizes.length
              ? `
                <div class="product-options-preview">
                  Sizes:
                  ${esc(sizes.join(", "))}
                </div>
              `
              : ""
          }


          ${
            colors.length
              ? `
                <div class="product-options-preview">
                  Colors:
                  ${esc(colors.join(", "))}
                </div>
              `
              : ""
          }


          <div class="product-stock">

            ${
              outOfStock
                ? "Currently unavailable"
                : `${stock} dozen${stock === 1 ? "" : "s"} available`
            }

          </div>


          <a
            href="product.html?id=${encodeURIComponent(productData.id)}"
            class="btn btn-primary product-select-button"
          >

            ${
              outOfStock
                ? "View Details"
                : "Select Options"
            }

          </a>


        </div>

      </article>

    `;

  }


  // ============================================================
  // ATTACH PRODUCT CARD BUTTONS
  // ============================================================

  function attachAddButtons(
    container,
    productList
  ) {

    if (!container) {

      return;

    }


    /*
     * Product cards already navigate to product.html.
     *
     * This function is kept so that product grids created
     * dynamically continue to work correctly.
     */

    container
      .querySelectorAll(
        "[data-product-id]"
      )
      .forEach(card => {

        card.addEventListener(
          "mouseenter",
          () => {

            card.classList.add(
              "product-hover"
            );

          }
        );


        card.addEventListener(
          "mouseleave",
          () => {

            card.classList.remove(
              "product-hover"
            );

          }
        );

      });

  }


  // ============================================================
  // HOME PAGE
  // ============================================================

  async function loadHome() {

    await loadHomeProducts();

  }


  // ============================================================
  // HOME PRODUCTS
  // ============================================================

  async function loadHomeProducts() {

    const grid =
      document.querySelector(
        "#latestProducts"
      );


    if (!grid) {

      return;

    }


    try {

      const list =
        await products();


      const latest =
        list.slice(0, 8);


      if (!latest.length) {

        grid.innerHTML = `

          <div class="notice">
            No products available yet.
          </div>

        `;

        return;

      }


      grid.innerHTML =
        latest.map(
          productCard
        ).join("");


      attachAddButtons(
        grid,
        latest
      );


    } catch (error) {

      console.error(
        "Home products error:",
        error
      );


      grid.innerHTML = `

        <div class="notice">
          Unable to load products.
          Please try again later.
        </div>

      `;

    }

  }


  // ============================================================
  // SHOP PAGE
  // ============================================================

  async function loadShop() {

    const grid =
      document.querySelector(
        "#shopProducts"
      );


    if (!grid) {

      return;

    }


    try {

      const list =
        await products();


      if (!list.length) {

        grid.innerHTML = `

          <div class="notice">
            No products available.
          </div>

        `;

        return;

      }


      grid.innerHTML =
        list.map(
          productCard
        ).join("");


      attachAddButtons(
        grid,
        list
      );


    } catch (error) {

      console.error(
        "Shop error:",
        error
      );


      grid.innerHTML = `

        <div class="notice">
          Unable to load products.
        </div>

      `;

    }

  }


  // ============================================================
  // RELATED PRODUCTS
  //
  // THIS IS THE IMPORTANT NEW FEATURE.
  //
  // Example:
  //
  // User opens:
  // Adams
  //
  // Below Adams:
  //
  // Adams Dry
  // Parachute Adams
  // Adams Irresistible
  // CDC Adams
  // etc.
  //
  // Every product belonging to the same category is shown.
  //
  // The current product is excluded.
  // ============================================================

  async function loadRelatedProducts(
    currentProduct
  ) {

    const section =
      document.querySelector(
        "#relatedProducts"
      );


    const grid =
      document.querySelector(
        "#relatedProductsGrid"
      );


    const title =
      document.querySelector(
        "#relatedProductsTitle"
      );


    const description =
      document.querySelector(
        "#relatedProductsDescription"
      );


    if (
      !section ||
      !grid ||
      !currentProduct
    ) {

      return;

    }


    try {

      /*
       * Get category ID.
       *
       * Normally this is:
       *
       * currentProduct.category_id
       *
       * The fallback also supports:
       *
       * currentProduct.categories.id
       */

      const categoryId =
        currentProduct.category_id ||
        currentProduct.categories?.id ||
        "";


      /*
       * If the product does not have
       * a category, there is nothing
       * to recommend.
       */

      if (!categoryId) {

        section.style.display =
          "none";

        return;

      }


      /*
       * Load all products from Supabase.
       */

      const allProducts =
        await products();


      /*
       * Find every product that belongs
       * to the same category.
       *
       * IMPORTANT:
       *
       * We compare category_id.
       *
       * We DO NOT compare product names.
       *
       * This means it works for:
       *
       * Adams
       * Cahill
       * Bivisible
       * Hare's Ear
       * Woolly Bugger
       * etc.
       */

      const related =
        allProducts.filter(
          item => {

            const itemCategoryId =
              item.category_id ||
              item.categories?.id ||
              "";


            const sameCategory =
              String(itemCategoryId) ===
              String(categoryId);


            const isCurrentProduct =
              String(item.id) ===
              String(currentProduct.id);


            return (
              sameCategory &&
              !isCurrentProduct
            );

          }
        );


      /*
       * If there are no other products
       * in this category, hide the section.
       */

      if (!related.length) {

        section.style.display =
          "none";

        return;

      }


      /*
       * Category name.
       */

      const categoryName =
        currentProduct.categories?.name ||
        "Similar Flies";


      /*
       * Section heading.
       */

      title.textContent =
        `More ${categoryName} Flies`;


      /*
       * Description.
       */

      description.textContent =
        `Explore more flies from the ${categoryName} collection.`;


      /*
       * Show ALL products from the same
       * category.
       *
       * The current product has already
       * been removed above.
       */

      grid.innerHTML =
        related.map(
          productCard
        ).join("");


      /*
       * Display section.
       */

      section.style.display =
        "block";


      /*
       * Activate product cards.
       */

      attachAddButtons(
        grid,
        related
      );


    } catch (error) {

      console.error(
        "Could not load related products:",
        error
      );


      section.style.display =
        "none";

    }

  }


  // ============================================================
  // PRODUCT PAGE
  // ============================================================

  async function loadProductPage() {

    const box =
      document.querySelector(
        "#productDetail"
      );


    if (!box) {

      return;

    }


    const params =
      new URLSearchParams(
        window.location.search
      );


    const id =
      params.get("id");


    if (!id) {

      box.innerHTML = `

        <div class="notice">

          <h2>
            Product not found
          </h2>

          <p>
            No product ID was supplied.
          </p>

          <a
            href="shop.html"
            class="btn btn-primary"
          >
            Back to Shop
          </a>

        </div>

      `;

      return;

    }


    try {

      /*
       * Get selected product.
       */

      const productData =
        await product(id);


      const stock =
        Number(
          productData.stock || 0
        );


      const outOfStock =
        stock <= 0;


      const sizes =
        parseOptions(
          productData.sizes
        );


      const colors =
        parseOptions(
          productData.colors
        );


      const image =
        productData.image_url ||
        placeholder("Fly");


      const categoryName =
        productData.categories?.name ||
        "Fishing Fly";


      /*
       * Render product.
       */

      box.innerHTML = `

        <div class="product-detail-grid">


          <!-- PRODUCT IMAGE -->

          <div class="product-detail-image">

            <img
              src="${escAttr(image)}"
              alt="${escAttr(productData.name)}"
            >

          </div>


          <!-- PRODUCT INFORMATION -->

          <div class="product-detail-content">


            <div class="product-category">

              ${esc(categoryName)}

            </div>


            <h1>

              ${esc(productData.name)}

            </h1>


            <div class="product-detail-price">

              ${money(productData.price)}

              <span>
                / dozen
              </span>

            </div>


            <div class="product-description">

              ${
                productData.description
                  ? esc(productData.description)
                  : "Quality fishing fly suitable for anglers and fly fishing applications."
              }

            </div>


            ${
              sizes.length
                ? `

                  <div class="product-option">

                    <label
                      for="productSize"
                    >
                      Size
                    </label>


                    <select
                      id="productSize"
                    >

                      <option value="">
                        Select size
                      </option>

                      ${sizes.map(
                        size =>
                          `
                            <option value="${escAttr(size)}">
                              ${esc(size)}
                            </option>
                          `
                      ).join("")}

                    </select>

                  </div>

                `
                : ""
            }


            ${
              colors.length
                ? `

                  <div class="product-option">

                    <label
                      for="productColor"
                    >
                      Color
                    </label>


                    <select
                      id="productColor"
                    >

                      <option value="">
                        Select color
                      </option>

                      ${colors.map(
                        color =>
                          `
                            <option value="${escAttr(color)}">
                              ${esc(color)}
                            </option>
                          `
                      ).join("")}

                    </select>

                  </div>

                `
                : ""
            }


            <div class="product-stock-detail">

              ${
                outOfStock
                  ? `
                    <span class="stock-out">
                      Out of stock
                    </span>
                  `
                  : `
                    <span class="stock-in">
                      ${stock}
                      dozen${stock === 1 ? "" : "s"}
                      available
                    </span>
                  `
              }

            </div>


            <div class="product-quantity">

              <button
                type="button"
                id="qtyMinus"
                aria-label="Decrease quantity"
              >
                −
              </button>


              <input
                type="number"
                id="productQty"
                value="1"
                min="1"
                max="${Math.max(stock, 1)}"
              >


              <button
                type="button"
                id="qtyPlus"
                aria-label="Increase quantity"
              >
                +
              </button>

            </div>


            <button
              type="button"
              id="addProductButton"
              class="btn btn-primary product-add-button"
              ${outOfStock ? "disabled" : ""}
            >

              ${
                outOfStock
                  ? "Out of Stock"
                  : "Add to Cart"
              }

            </button>


            <div
              id="productMessage"
              class="product-message"
              aria-live="polite"
            ></div>


            <div class="product-wholesale-note">

              <strong>
                Wholesale Pricing
              </strong>

              <p>
                Prices are shown in USD per dozen.
                One dozen contains 12 flies.
              </p>

            </div>


          </div>

        </div>

      `;


      // ========================================================
      // PRODUCT PAGE CONTROLS
      // ========================================================

      const qtyInput =
        document.querySelector(
          "#productQty"
        );


      const minusButton =
        document.querySelector(
          "#qtyMinus"
        );


      const plusButton =
        document.querySelector(
          "#qtyPlus"
        );


      const addButton =
        document.querySelector(
          "#addProductButton"
        );


      const sizeSelect =
        document.querySelector(
          "#productSize"
        );


      const colorSelect =
        document.querySelector(
          "#productColor"
        );


      const message =
        document.querySelector(
          "#productMessage"
        );


      // ========================================================
      // UPDATE ADD BUTTON
      // ========================================================

      function updateAddButton() {

        if (!addButton) {

          return;

        }


        if (outOfStock) {

          addButton.disabled =
            true;

          addButton.textContent =
            "Out of Stock";

          return;

        }


        let valid = true;


        if (
          sizes.length &&
          sizeSelect &&
          !sizeSelect.value
        ) {

          valid = false;

        }


        if (
          colors.length &&
          colorSelect &&
          !colorSelect.value
        ) {

          valid = false;

        }


        addButton.disabled =
          !valid;


        addButton.textContent =
          valid
            ? "Add to Cart"
            : "Select Options";

      }


      // ========================================================
      // QUANTITY MINUS
      // ========================================================

      if (minusButton) {

        minusButton.addEventListener(
          "click",
          () => {

            const current =
              Number(
                qtyInput.value || 1
              );


            qtyInput.value =
              Math.max(
                1,
                current - 1
              );

          }
        );

      }


      // ========================================================
      // QUANTITY PLUS
      // ========================================================

      if (plusButton) {

        plusButton.addEventListener(
          "click",
          () => {

            const current =
              Number(
                qtyInput.value || 1
              );


            qtyInput.value =
              Math.min(
                stock,
                current + 1
              );

          }
        );

      }


      // ========================================================
      // VALIDATE QUANTITY
      // ========================================================

      if (qtyInput) {

        qtyInput.addEventListener(
          "change",
          () => {

            let value =
              Number(
                qtyInput.value || 1
              );


            if (value < 1) {

              value = 1;

            }


            if (value > stock) {

              value = stock;

            }


            qtyInput.value =
              value;

          }
        );

      }


      // ========================================================
      // SIZE CHANGE
      // ========================================================

      if (sizeSelect) {

        sizeSelect.addEventListener(
          "change",
          () => {

            if (message) {

              message.textContent =
                "";

            }


            updateAddButton();

          }
        );

      }


      // ========================================================
      // COLOR CHANGE
      // ========================================================

      if (colorSelect) {

        colorSelect.addEventListener(
          "change",
          () => {

            if (message) {

              message.textContent =
                "";

            }


            updateAddButton();

          }
        );

      }


      // ========================================================
      // ADD PRODUCT TO CART
      // ========================================================

      if (addButton) {

        addButton.addEventListener(
          "click",
          () => {

            if (outOfStock) {

              return;

            }


            try {

              const qty =
                Number(
                  qtyInput?.value || 1
                );


              const selectedSize =
                sizeSelect
                  ? sizeSelect.value
                  : "";


              const selectedColor =
                colorSelect
                  ? colorSelect.value
                  : "";


              addCart(
                productData,
                {
                  qty,
                  size: selectedSize,
                  color: selectedColor
                }
              );


              if (message) {

                message.innerHTML = `

                  <div class="success-message">

                    <strong>
                      Added to cart.
                    </strong>

                    <button
                      type="button"
                      id="viewCartAfterAdd"
                      class="btn btn-secondary"
                    >
                      View Cart
                    </button>

                  </div>

                `;


                const viewCartButton =
                  document.querySelector(
                    "#viewCartAfterAdd"
                  );


                if (viewCartButton) {

                  viewCartButton.addEventListener(
                    "click",
                    openCart
                  );

                }

              }


              updateCartCount();


            } catch (error) {

              console.error(
                "Add to cart error:",
                error
              );


              if (message) {

                message.innerHTML = `

                  <div class="error-message">

                    ${esc(
                      error.message ||
                      "Unable to add product to cart."
                    )}

                  </div>

                `;

              }

            }

          }
        );

      }


      // ========================================================
      // INITIAL BUTTON STATE
      // ========================================================

      updateAddButton();


      // ========================================================
      // LOAD RELATED PRODUCTS
      //
      // THIS IS WHAT MAKES:
      //
      // Adams product
      //       ↓
      // More Adams Flies
      //
      // appear underneath.
      // ========================================================

      await loadRelatedProducts(
        productData
      );


    } catch (error) {

      console.error(
        "Product page error:",
        error
      );


      box.innerHTML = `

        <div class="notice">

          <h2>
            Unable to load product
          </h2>

          <p>
            ${
              esc(
                error.message ||
                "Something went wrong while loading this product."
              )
            }
          </p>

          <a
            href="shop.html"
            class="btn btn-primary"
          >
            Back to Shop
          </a>

        </div>

      `;

    }

  }


  // ============================================================
  // CATEGORY PAGE
  // ============================================================

  async function loadCategoryPage() {

    const grid =
      document.querySelector(
        "#categoryProducts"
      );


    if (!grid) {

      return;

    }


    const params =
      new URLSearchParams(
        window.location.search
      );


    const categorySlug =
      params.get("slug");


    if (!categorySlug) {

      grid.innerHTML = `

        <div class="notice">
          Category not specified.
        </div>

      `;

      return;

    }


    try {

      const currentCategory =
        await category(
          categorySlug
        );


      if (!currentCategory) {

        grid.innerHTML = `

          <div class="notice">

            <h2>
              Category not found
            </h2>

            <a
              href="shop.html"
              class="btn btn-primary"
            >
              Back to Shop
            </a>

          </div>

        `;

        return;

      }


      /*
       * Update category title if
       * the page contains these elements.
       */

      const title =
        document.querySelector(
          "#categoryTitle"
        );


      if (title) {

        title.textContent =
          currentCategory.name;

      }


      const description =
        document.querySelector(
          "#categoryDescription"
        );


      if (description) {

        description.textContent =
          currentCategory.description ||
          "";

      }


      const allProducts =
        await products();


      const categoryProducts =
        allProducts.filter(
          item =>
            String(item.category_id) ===
            String(currentCategory.id)
        );


      if (!categoryProducts.length) {

        grid.innerHTML = `

          <div class="notice">

            No products are available
            in this category yet.

          </div>

        `;

        return;

      }


      grid.innerHTML =
        categoryProducts
          .map(productCard)
          .join("");


      attachAddButtons(
        grid,
        categoryProducts
      );


    } catch (error) {

      console.error(
        "Category page error:",
        error
      );


      grid.innerHTML = `

        <div class="notice">

          Unable to load this category.

        </div>

      `;

    }

  }


  // ============================================================
  // INITIALIZE
  // ============================================================

  async function init() {

    renderHeader();

    renderFooter();


    /*
     * Product page
     */

    if (
      document.querySelector(
        "#productDetail"
      )
    ) {

      await loadProductPage();

    }


    /*
     * Category page
     */

    if (
      document.querySelector(
        "#categoryProducts"
      )
    ) {

      await loadCategoryPage();

    }


    /*
     * Shop page
     */

    if (
      document.querySelector(
        "#shopProducts"
      )
    ) {

      await loadShop();

    }


    /*
     * Home page
     */

    if (
      document.querySelector(
        "#latestProducts"
      )
    ) {

      await loadHome();

    }


    /*
     * Keep cart count updated.
     */

    updateCartCount();

  }


  // ============================================================
  // PUBLIC API
  // ============================================================

  window.AMIANI = {

    ...AMIANI,

    categories,

    products,

    product,

    category,

    parseOptions,

    cart,

    saveCart,

    addCart,

    removeCart,

    removeCartItem,

    total,

    money,

    moneyPerDozen,

    openCart,

    closeCart,

    renderCartDrawer,

    loadRelatedProducts

  };


  // ============================================================
  // DOM READY
  // ============================================================

  document.addEventListener(
    "DOMContentLoaded",
    () => {

      init();

    }
  );


})();