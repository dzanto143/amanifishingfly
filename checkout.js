/* =========================================================
   AMIANI'S FLY WHOLESALERS
   CHECKOUT

   FEATURES:
   - USD pricing
   - Prices are per dozen
   - 1 dozen = 12 flies
   - Supports product size variants
   - Supports product color variants
   - Saves size + color into order items
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
       MONEY FORMAT
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
       GET SUPABASE CLIENT
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


        /* -------------------------------------------------
           EMPTY CART
        ------------------------------------------------- */

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


        /* -------------------------------------------------
           TOTAL
        ------------------------------------------------- */

        let total = 0;


        /* -------------------------------------------------
           ITEMS
        ------------------------------------------------- */

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
                       VARIANTS
                    ------------------------------------- */

                    const variantParts = [];


                    if (item.size) {

                        variantParts.push(`

                            <span>

                                <strong>
                                    Size:
                                </strong>

                                ${esc(
                                    item.size
                                )}

                            </span>

                        `);

                    }


                    if (item.color) {

                        variantParts.push(`

                            <span>

                                <strong>
                                    Color:
                                </strong>

                                ${esc(
                                    item.color
                                )}

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
                                        gap:6px 14px;
                                        margin-top:7px;
                                        font-size:13px;
                                        color:
                                            var(
                                                --muted,
                                                #6d7c77
                                            );
                                    "
                                >

                                    ${variantParts.join("")}

                                </div>

                              `
                            : "";


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

                                    <div>

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
                                                margin-top:7px;
                                                font-size:14px;
                                                color:
                                                    var(
                                                        --muted,
                                                        #6d7c77
                                                    );
                                            "
                                        >

                                            ${money(
                                                price
                                            )}
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


        /* -------------------------------------------------
           TOTAL DISPLAY
        ------------------------------------------------- */

        checkoutTotal.textContent =
            money(total);


        /* -------------------------------------------------
           ENABLE BUTTON
        ------------------------------------------------- */

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
       VALIDATE CART ITEMS
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
       SUBMIT ORDER
    ===================================================== */

    async function submitOrder(event) {

        event.preventDefault();


        if (!checkoutForm) {

            return;

        }


        /* -------------------------------------------------
           GET CART
        ------------------------------------------------- */

        const cart =
            getCart();


        if (!cart.length) {

            showMessage(
                "Your cart is empty. Please add products before checking out.",
                "notice"
            );

            return;

        }


        /* -------------------------------------------------
           VALIDATE CART
        ------------------------------------------------- */

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


        /* -------------------------------------------------
           SUPABASE
        ------------------------------------------------- */

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


        /* -------------------------------------------------
           FORM DATA
        ------------------------------------------------- */

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


        /* -------------------------------------------------
           VALIDATION
        ------------------------------------------------- */

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


        /* -------------------------------------------------
           TOTAL
        ------------------------------------------------- */

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


        /* -------------------------------------------------
           ORDER ITEMS
        -------------------------------------------------

           IMPORTANT:

           Size and color are preserved here.

        ------------------------------------------------- */

        const orderItems =
            cart.map(
                (item) => ({

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
                        item.image_url ||
                        "",

                    category_id:
                        item.category_id ||
                        item.categoryId ||
                        null,

                    size:
                        item.size
                            ? String(
                                item.size
                            )
                            : "",

                    color:
                        item.color
                            ? String(
                                item.color
                            )
                            : ""

                })
            );


        /* -------------------------------------------------
           SUBMIT BUTTON
        ------------------------------------------------- */

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


        /* -------------------------------------------------
           INSERT INTO SUPABASE
        ------------------------------------------------- */

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


            /* ---------------------------------------------
               DATABASE ERROR
            --------------------------------------------- */

            if (error) {

                console.error(
                    "Order insert error:",
                    error
                );

                throw error;

            }


            console.log(
                "Order created successfully:",
                data
            );


            /* ---------------------------------------------
               CLEAR CART
            --------------------------------------------- */

            clearCart();


            /* ---------------------------------------------
               SUCCESS DISPLAY
            --------------------------------------------- */

            checkoutItems.innerHTML = `

                <div
                    class="notice"
                    style="
                        text-align:center;
                        padding:30px 20px;
                    "
                >

                    <div
                        style="
                            font-size:48px;
                            margin-bottom:10px;
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

                                    Order reference:

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


            checkoutTotal.textContent =
                money(total);


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


        /* -------------------------------------------------
           ERROR
        ------------------------------------------------- */

        catch (error) {

            console.error(
                "Checkout error:",
                error
            );


            showMessage(
                error.message ||
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
       LISTEN FOR CART CHANGES
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
                "Checkout items container was not found."
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