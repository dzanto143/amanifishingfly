/* =========================================================
   AMIANI'S FLY WHOLESALERS
   CHECKOUT

   FEATURES:
   - USD pricing
   - Prices are per dozen
   - 1 dozen = 12 flies
   - Product size variants
   - Product color variants
   - Saves size + color inside every order item
   - Saves orders to Supabase
   - Clears cart after successful order
========================================================= */

(function () {

    "use strict";


    /* =====================================================
       HELPERS
    ===================================================== */

    const $ = (selector, root = document) => {
        return root.querySelector(selector);
    };


    /* =====================================================
       ELEMENTS
    ===================================================== */

    const checkoutItems =
        $("#checkoutItems");

    const checkoutTotal =
        $("#checkoutTotal");

    const checkoutForm =
        $("#checkoutForm");

    const orderMsg =
        $("#orderMsg");


    /* =====================================================
       MONEY
    ===================================================== */

    function money(value) {

        return new Intl.NumberFormat(
            "en-US",
            {
                style: "currency",
                currency: "USD"
            }
        ).format(
            Number(value || 0)
        );

    }


    /* =====================================================
       HTML ESCAPE
    ===================================================== */

    function esc(value) {

        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");

    }


    /* =====================================================
       MESSAGE
    ===================================================== */

    function showMessage(
        message,
        type = "notice"
    ) {

        if (!orderMsg) {
            return;
        }

        orderMsg.innerHTML = `
            <div class="${esc(type)}">
                ${esc(message)}
            </div>
        `;

    }


    /* =====================================================
       GET CART
    ===================================================== */

    function getCart() {

        try {

            const saved =
                localStorage.getItem(
                    "amani_cart"
                );

            if (!saved) {
                return [];
            }

            const parsed =
                JSON.parse(saved);

            if (!Array.isArray(parsed)) {
                return [];
            }

            return parsed;

        } catch (error) {

            console.error(
                "Could not read cart:",
                error
            );

            return [];

        }

    }


    /* =====================================================
       CLEAR CART
    ===================================================== */

    function clearCart() {

        localStorage.removeItem(
            "amani_cart"
        );

        if (
            window.AMIANI &&
            typeof window.AMIANI.updateCartCount ===
                "function"
        ) {

            window.AMIANI.updateCartCount();

        }

    }


    /* =====================================================
       SUPABASE CLIENT
    ===================================================== */

    function getSupabaseClient() {

        if (
            window.AMANI_SUPABASE
        ) {

            return window.AMANI_SUPABASE;

        }

        if (
            window.AMIANI &&
            window.AMIANI.sb
        ) {

            return window.AMIANI.sb;

        }

        return null;

    }


    /* =====================================================
       NORMALIZE VARIANT
    ===================================================== */

    function getSize(item) {

        return String(
            item?.size ??
            item?.selectedSize ??
            ""
        ).trim();

    }


    function getColor(item) {

        return String(
            item?.color ??
            item?.selectedColor ??
            ""
        ).trim();

    }


    /* =====================================================
       RENDER CHECKOUT
    ===================================================== */

    function renderCheckout() {

        const cart = getCart();

        if (
            !checkoutItems ||
            !checkoutTotal
        ) {

            return;

        }


        /* =================================================
           EMPTY CART
        ================================================= */

        if (!cart.length) {

            checkoutItems.innerHTML = `

                <div class="notice">
                    Your cart is empty.
                </div>

                <div
                    style="
                        margin-top:15px;
                    "
                >

                    <a
                        href="shop.html"
                        class="btn btn-primary"
                    >
                        Continue Shopping
                    </a>

                </div>

            `;

            checkoutTotal.textContent =
                "$0.00";


            if (checkoutForm) {

                const submitButton =
                    checkoutForm.querySelector(
                        'button[type="submit"]'
                    );

                if (submitButton) {

                    submitButton.disabled =
                        true;

                    submitButton.textContent =
                        "Cart is Empty";

                }

            }

            return;

        }


        /* =================================================
           TOTAL
        ================================================= */

        let total = 0;


        /* =================================================
           RENDER ITEMS
        ================================================= */

        checkoutItems.innerHTML =
            cart.map(
                (item) => {

                    const price =
                        Number(
                            item.price || 0
                        );

                    const qty =
                        Math.max(
                            1,
                            Number(
                                item.qty || 1
                            )
                        );

                    const lineTotal =
                        price * qty;

                    total += lineTotal;


                    const size =
                        getSize(item);

                    const color =
                        getColor(item);


                    /* -------------------------------------
                       IMAGE
                    ------------------------------------- */

                    const image =
                        item.image_url
                            ? `

                                <img
                                    src="${esc(
                                        item.image_url
                                    )}"
                                    alt="${esc(
                                        item.name
                                    )}"
                                    style="
                                        width:70px;
                                        height:70px;
                                        object-fit:cover;
                                        border-radius:12px;
                                        display:block;
                                        flex-shrink:0;
                                    "
                                >

                              `
                            : `

                                <div
                                    style="
                                        width:70px;
                                        height:70px;
                                        border-radius:12px;
                                        background:
                                            var(
                                                --cream,
                                                #f7f4ec
                                            );
                                        display:flex;
                                        align-items:center;
                                        justify-content:center;
                                        font-size:12px;
                                        color:
                                            var(
                                                --muted,
                                                #6d7c77
                                            );
                                        text-align:center;
                                        flex-shrink:0;
                                    "
                                >
                                    No Image
                                </div>

                              `;


                    /* -------------------------------------
                       VARIANT INFORMATION
                    ------------------------------------- */

                    const variantParts = [];


                    if (size) {

                        variantParts.push(`

                            <span
                                style="
                                    display:inline-flex;
                                    align-items:center;
                                    gap:4px;
                                    padding:5px 9px;
                                    border-radius:999px;
                                    background:#eef6f2;
                                    color:#0c4a3c;
                                    font-size:12px;
                                    font-weight:600;
                                "
                            >

                                <strong>
                                    Size:
                                </strong>

                                ${esc(size)}

                            </span>

                        `);

                    }


                    if (color) {

                        variantParts.push(`

                            <span
                                style="
                                    display:inline-flex;
                                    align-items:center;
                                    gap:4px;
                                    padding:5px 9px;
                                    border-radius:999px;
                                    background:#f7f1df;
                                    color:#76591b;
                                    font-size:12px;
                                    font-weight:600;
                                "
                            >

                                <strong>
                                    Color:
                                </strong>

                                ${esc(color)}

                            </span>

                        `);

                    }


                    const variants =
                        variantParts.length
                            ? `

                                <div
                                    style="
                                        display:flex;
                                        flex-wrap:wrap;
                                        gap:7px;
                                        margin-top:8px;
                                    "
                                >

                                    ${variantParts.join("")}

                                </div>

                              `
                            : "";


                    /* -------------------------------------
                       ITEM
                    ------------------------------------- */

                    return `

                        <div
                            class="checkout-item"
                            style="
                                display:flex;
                                gap:14px;
                                align-items:flex-start;
                                padding:15px 0;
                                border-bottom:
                                    1px solid
                                    var(
                                        --border,
                                        #e5e7eb
                                    );
                            "
                        >

                            ${image}


                            <div
                                style="
                                    flex:1;
                                    min-width:0;
                                "
                            >

                                <div
                                    style="
                                        display:flex;
                                        justify-content:
                                            space-between;
                                        gap:15px;
                                        align-items:
                                            flex-start;
                                    "
                                >

                                    <div
                                        style="
                                            min-width:0;
                                        "
                                    >

                                        <h3
                                            style="
                                                margin:0;
                                                font-size:17px;
                                            "
                                        >
                                            ${esc(
                                                item.name
                                            )}
                                        </h3>


                                        ${variants}


                                        <div
                                            style="
                                                margin-top:8px;
                                                font-size:14px;
                                                color:
                                                    var(
                                                        --muted,
                                                        #6d7c77
                                                    );
                                            "
                                        >

                                            ${money(price)}
                                            / dozen

                                            ×

                                            ${qty}
                                            dozen

                                        </div>

                                    </div>


                                    <strong
                                        style="
                                            white-space:nowrap;
                                            font-size:16px;
                                        "
                                    >
                                        ${money(
                                            lineTotal
                                        )}
                                    </strong>

                                </div>

                            </div>

                        </div>

                    `;

                }
            ).join("");


        /* =================================================
           TOTAL DISPLAY
        ================================================= */

        checkoutTotal.textContent =
            money(total);


        /* =================================================
           ENABLE SUBMIT
        ================================================= */

        if (checkoutForm) {

            const submitButton =
                checkoutForm.querySelector(
                    'button[type="submit"]'
                );

            if (submitButton) {

                submitButton.disabled =
                    false;

                submitButton.textContent =
                    "Place Order";

            }

        }

    }


    /* =====================================================
       CALCULATE TOTAL
    ===================================================== */

    function calculateTotal(cart) {

        return cart.reduce(
            (
                total,
                item
            ) => {

                const price =
                    Number(
                        item.price || 0
                    );

                const qty =
                    Math.max(
                        1,
                        Number(
                            item.qty || 1
                        )
                    );

                return total +
                    (
                        price *
                        qty
                    );

            },
            0
        );

    }


    /* =====================================================
       VALIDATE CART
    ===================================================== */

    function validateCart(cart) {

        if (!Array.isArray(cart)) {

            return {
                valid: false,
                message: "Invalid cart."
            };

        }


        for (
            const item of cart
        ) {

            if (!item.name) {

                return {
                    valid: false,
                    message:
                        "One of the products in your cart is invalid."
                };

            }


            const price =
                Number(
                    item.price || 0
                );


            if (
                !Number.isFinite(price) ||
                price < 0
            ) {

                return {
                    valid: false,
                    message:
                        "One of the product prices is invalid."
                };

            }


            const qty =
                Number(
                    item.qty || 0
                );


            if (
                !Number.isFinite(qty) ||
                qty <= 0
            ) {

                return {
                    valid: false,
                    message:
                        "One of the product quantities is invalid."
                };

            }

        }


        return {
            valid: true
        };

    }


    /* =====================================================
       BUILD ORDER ITEMS
       
       THIS IS THE IMPORTANT PART.

       Every product in the order gets:
       - product ID
       - name
       - price
       - quantity
       - image
       - category
       - size
       - color
    ===================================================== */

    function buildOrderItems(cart) {

        return cart.map(
            (item) => {

                const size =
                    getSize(item);

                const color =
                    getColor(item);


                return {

                    id:
                        item.id ||
                        null,

                    name:
                        String(
                            item.name ||
                            ""
                        ),

                    price:
                        Number(
                            item.price ||
                            0
                        ),

                    qty:
                        Math.max(
                            1,
                            Number(
                                item.qty ||
                                1
                            )
                        ),

                    image_url:
                        String(
                            item.image_url ||
                            ""
                        ),

                    category_id:
                        item.category_id ||
                        item.categoryId ||
                        null,

                    /* =============================
                       VARIANTS
                    ============================== */

                    size:
                        size,

                    color:
                        color

                };

            }
        );

    }


    /* =====================================================
       SUBMIT ORDER
    ===================================================== */

    async function submitOrder(event) {

        event.preventDefault();


        if (!checkoutForm) {
            return;
        }


        /* =================================================
           CART
        ================================================= */

        const cart =
            getCart();


        if (!cart.length) {

            showMessage(
                "Your cart is empty. Please add products before checking out.",
                "notice"
            );

            return;

        }


        /* =================================================
           VALIDATE
        ================================================= */

        const cartValidation =
            validateCart(cart);


        if (
            !cartValidation.valid
        ) {

            showMessage(
                cartValidation.message,
                "notice"
            );

            return;

        }


        /* =================================================
           SUPABASE
        ================================================= */

        const supabaseClient =
            getSupabaseClient();


        if (!supabaseClient) {

            showMessage(
                "The store connection is not available. Please refresh the page and try again.",
                "notice"
            );

            console.error(
                "Supabase client is not available."
            );

            return;

        }


        /* =================================================
           CUSTOMER FORM
        ================================================= */

        const formData =
            new FormData(
                checkoutForm
            );


        const customerName =
            String(
                formData.get(
                    "customer_name"
                ) || ""
            ).trim();


        const phone =
            String(
                formData.get(
                    "phone"
                ) || ""
            ).trim();


        const email =
            String(
                formData.get(
                    "email"
                ) || ""
            ).trim();


        const address =
            String(
                formData.get(
                    "address"
                ) || ""
            ).trim();


        const notes =
            String(
                formData.get(
                    "notes"
                ) || ""
            ).trim();


        /* =================================================
           CUSTOMER VALIDATION
        ================================================= */

        if (!customerName) {

            showMessage(
                "Please enter your full name.",
                "notice"
            );

            return;

        }


        if (!phone) {

            showMessage(
                "Please enter your phone number.",
                "notice"
            );

            return;

        }


        if (!address) {

            showMessage(
                "Please enter your delivery address.",
                "notice"
            );

            return;

        }


        /* =================================================
           TOTAL
        ================================================= */

        const total =
            calculateTotal(
                cart
            );


        if (
            !Number.isFinite(total) ||
            total <= 0
        ) {

            showMessage(
                "Your order total is invalid. Please check your cart.",
                "notice"
            );

            return;

        }


        /* =================================================
           BUILD ORDER ITEMS
        ================================================= */

        const orderItems =
            buildOrderItems(
                cart
            );


        console.log(
            "Order items being submitted:",
            orderItems
        );


        /* =================================================
           SUBMIT BUTTON
        ================================================= */

        const submitButton =
            checkoutForm.querySelector(
                'button[type="submit"]'
            );


        if (submitButton) {

            submitButton.disabled =
                true;

            submitButton.textContent =
                "Placing Order...";

        }


        showMessage(
            "Submitting your order...",
            "notice"
        );


        /* =================================================
           INSERT ORDER
        ================================================= */

        try {

            const {
                data,
                error
            } =
                await supabaseClient
                    .from("orders")
                    .insert([
                        {

                            customer_name:
                                customerName,

                            phone:
                                phone,

                            email:
                                email ||
                                null,

                            address:
                                address,

                            notes:
                                notes ||
                                null,

                            /* =========================
                               PRODUCTS + VARIANTS
                            ========================== */

                            items:
                                orderItems,

                            total:
                                total,

                            status:
                                "pending"

                        }
                    ])
                    .select()
                    .single();


            /* =================================================
               ERROR
            ================================================= */

            if (error) {

                console.error(
                    "Supabase order error:",
                    error
                );

                throw error;

            }


            /* =================================================
               SUCCESS
            ================================================= */

            console.log(
                "Order successfully created:",
                data
            );


            console.log(
                "Saved order items:",
                data?.items
            );


            /* =================================================
               CLEAR CART
            ================================================= */

            clearCart();


            /* =================================================
               SUCCESS SCREEN
            ================================================= */

            if (checkoutItems) {

                checkoutItems.innerHTML = `

                    <div
                        class="notice"
                        style="
                            text-align:center;
                            padding:35px 20px;
                        "
                    >

                        <div
                            style="
                                width:64px;
                                height:64px;
                                margin:0 auto 15px;
                                border-radius:50%;
                                display:flex;
                                align-items:center;
                                justify-content:center;
                                background:#e8f5ef;
                                color:#0c4a3c;
                                font-size:34px;
                                font-weight:700;
                            "
                        >
                            ✓
                        </div>


                        <h3
                            style="
                                margin:0 0 8px;
                            "
                        >
                            Order Received
                        </h3>


                        <p
                            class="muted"
                            style="
                                margin:0;
                            "
                        >
                            Thank you for ordering from
                            Amiani's Fly Wholesalers.
                        </p>


                        ${
                            data &&
                            data.id
                                ? `

                                    <p
                                        style="
                                            margin-top:12px;
                                            font-size:13px;
                                        "
                                    >

                                        Order Reference:

                                        <strong>
                                            ${esc(
                                                data.id
                                            )}
                                        </strong>

                                    </p>

                                  `
                                : ""
                        }

                    </div>

                `;

            }


            if (checkoutTotal) {

                checkoutTotal.textContent =
                    money(total);

            }


            showMessage(
                "Your order has been placed successfully. We will contact you to confirm the order and delivery details.",
                "notice"
            );


            checkoutForm.reset();


            if (submitButton) {

                submitButton.disabled =
                    true;

                submitButton.textContent =
                    "Order Placed";

            }

        }


        /* =================================================
           ERROR HANDLING
        ================================================= */

        catch (error) {

            console.error(
                "Checkout error:",
                error
            );


            showMessage(
                error?.message ||
                "We could not place your order. Please try again.",
                "notice"
            );


            if (submitButton) {

                submitButton.disabled =
                    false;

                submitButton.textContent =
                    "Place Order";

            }

        }

    }


    /* =====================================================
       CART STORAGE CHANGES
    ===================================================== */

    window.addEventListener(
        "storage",
        function (event) {

            if (
                event.key ===
                "amani_cart"
            ) {

                renderCheckout();

            }

        }
    );


    /* =====================================================
       INITIALIZE
    ===================================================== */

    function initCheckout() {

        if (!checkoutItems) {

            console.warn(
                "Checkout: #checkoutItems was not found."
            );

            return;

        }


        renderCheckout();


        if (checkoutForm) {

            checkoutForm.addEventListener(
                "submit",
                submitOrder
            );

        }

    }


    /* =====================================================
       START
    ===================================================== */

    if (
        document.readyState ===
        "loading"
    ) {

        document.addEventListener(
            "DOMContentLoaded",
            initCheckout
        );

    } else {

        initCheckout();

    }

})();