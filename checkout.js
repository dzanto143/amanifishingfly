// ============================================================
// AMIANI'S FLY WHOLESALERS
// CHECKOUT
// PRICING: USD PER DOZEN
// ============================================================

document.addEventListener("DOMContentLoaded", () => {
    const checkoutItems = document.querySelector("#checkoutItems");

    if (!checkoutItems) {
        return;
    }

    // Make sure the storefront app is available
    if (!window.AMIANI) {
        checkoutItems.innerHTML = `
            <div class="notice error">
                Storefront application could not be loaded.
                Please refresh the page and try again.
            </div>
        `;
        return;
    }

    renderCheckout();

    const checkoutForm = document.querySelector("#checkoutForm");

    if (checkoutForm) {
        checkoutForm.addEventListener("submit", submitOrder);
    }
});


// ============================================================
// RENDER CHECKOUT
// ============================================================

function renderCheckout() {
    const cart = AMIANI.cart();
    const box = document.querySelector("#checkoutItems");
    const totalBox = document.querySelector("#checkoutTotal");

    if (!box) {
        return;
    }

    if (!cart.length) {
        box.innerHTML = `
            <div class="empty">
                <p>Your cart is empty.</p>

                <a
                    href="shop.html"
                    class="btn btn-primary"
                >
                    Shop Fishing Flies
                </a>
            </div>
        `;

        if (totalBox) {
            totalBox.textContent = AMIANI.money(0);
        }

        return;
    }

    box.innerHTML = cart.map(item => {
        const name = AMIANI.esc(item.name || "Fishing Fly");
        const image = AMIANI.escAttr(
            item.image_url || AMIANI.placeholder(item.name)
        );

        const price = Number(item.price || 0);
        const qty = Number(item.qty || 0);
        const subtotal = price * qty;

        return `
            <div class="cart-item">

                <img
                    src="${image}"
                    alt="${AMIANI.escAttr(item.name || "Fishing fly")}"
                    loading="lazy"
                    onerror="this.src='${AMIANI.escAttr(AMIANI.placeholder(item.name))}'"
                >

                <div class="cart-item-info">

                    <strong>
                        ${name}
                    </strong>

                    <div class="muted">
                        ${AMIANI.moneyPerDozen(price)}
                        × ${qty} dozen
                    </div>

                </div>

                <strong>
                    ${AMIANI.money(subtotal)}
                </strong>

            </div>
        `;
    }).join("");

    if (totalBox) {
        totalBox.textContent = AMIANI.money(AMIANI.total());
    }
}


// ============================================================
// SUBMIT ORDER
// ============================================================

async function submitOrder(event) {
    event.preventDefault();

    const form = event.target;
    const orderMessage = document.querySelector("#orderMsg");

    const cart = AMIANI.cart();

    // --------------------------------------------------------
    // Check cart
    // --------------------------------------------------------

    if (!cart.length) {
        if (orderMessage) {
            orderMessage.innerHTML = `
                <div class="notice error">
                    Your cart is empty. Please add fishing flies
                    before placing an order.
                </div>
            `;
        }

        return;
    }


    // --------------------------------------------------------
    // Check Supabase
    // --------------------------------------------------------

    if (!AMIANI.sb) {
        if (orderMessage) {
            orderMessage.innerHTML = `
                <div class="notice error">
                    The ordering system is currently unavailable.
                    Please refresh the page and try again.
                </div>
            `;
        }

        return;
    }


    // --------------------------------------------------------
    // Form data
    // --------------------------------------------------------

    const formData = new FormData(form);

    const customerName =
        String(formData.get("customer_name") || "").trim();

    const phone =
        String(formData.get("phone") || "").trim();

    const email =
        String(formData.get("email") || "").trim();

    const address =
        String(formData.get("address") || "").trim();

    const notes =
        String(formData.get("notes") || "").trim();


    // --------------------------------------------------------
    // Basic validation
    // --------------------------------------------------------

    if (!customerName) {
        showCheckoutMessage(
            "Please enter your full name.",
            "error"
        );

        return;
    }

    if (!phone) {
        showCheckoutMessage(
            "Please enter your phone number.",
            "error"
        );

        return;
    }

    if (!address) {
        showCheckoutMessage(
            "Please enter your delivery address.",
            "error"
        );

        return;
    }


    // --------------------------------------------------------
    // Calculate total
    // --------------------------------------------------------

    const total = AMIANI.total();


    if (!Number.isFinite(total) || total <= 0) {
        showCheckoutMessage(
            "Your order total is invalid. Please review your cart.",
            "error"
        );

        return;
    }


    // --------------------------------------------------------
    // Prepare order
    // --------------------------------------------------------

    const orderItems = cart.map(item => ({
        id: item.id || null,
        name: String(item.name || ""),
        price: Number(item.price || 0),
        qty: Number(item.qty || 0),
        image_url: item.image_url || null,
        category_id: item.category_id || null
    }));


    const order = {
        customer_name: customerName,
        phone: phone,
        email: email || null,
        address: address,
        notes: notes || null,
        items: orderItems,
        total: Number(total.toFixed(2)),
        status: "pending"
    };


    // --------------------------------------------------------
    // Disable button while submitting
    // --------------------------------------------------------

    const submitButton =
        form.querySelector('button[type="submit"]');

    const originalButtonText =
        submitButton
            ? submitButton.textContent
            : "Place Order";

    if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = "Placing Order...";
    }


    showCheckoutMessage(
        "Submitting your order...",
        "info"
    );


    // --------------------------------------------------------
    // Insert order into Supabase
    // --------------------------------------------------------

    try {

        const { data, error } =
            await AMIANI.sb
                .from("orders")
                .insert(order)
                .select()
                .single();


        if (error) {
            console.error("Order submission error:", error);

            showCheckoutMessage(
                error.message ||
                "Unable to place your order. Please try again.",
                "error"
            );

            if (submitButton) {
                submitButton.disabled = false;
                submitButton.textContent = originalButtonText;
            }

            return;
        }


        // ----------------------------------------------------
        // Successful order
        // ----------------------------------------------------

        console.log("Order created:", data);


        // Keep the existing cart key for compatibility
        localStorage.removeItem("amani_cart");


        // Update cart counter
        if (typeof AMIANI.updateCartCount === "function") {
            AMIANI.updateCartCount();
        }


        // Reset checkout form
        form.reset();


        // Show success message
        showCheckoutMessage(
            "Order received successfully. We will contact you to confirm payment and delivery.",
            "success"
        );


        // Refresh checkout display
        renderCheckout();


        // Restore button
        if (submitButton) {
            submitButton.disabled = false;
            submitButton.textContent = "Order Placed";
        }


    } catch (error) {

        console.error("Unexpected checkout error:", error);

        showCheckoutMessage(
            "Something went wrong while placing your order. Please try again.",
            "error"
        );

        if (submitButton) {
            submitButton.disabled = false;
            submitButton.textContent = originalButtonText;
        }
    }
}


// ============================================================
// CHECKOUT MESSAGE
// ============================================================

function showCheckoutMessage(message, type = "info") {

    const box = document.querySelector("#orderMsg");

    if (!box) {
        return;
    }

    const allowedTypes = [
        "success",
        "error",
        "info"
    ];

    if (!allowedTypes.includes(type)) {
        type = "info";
    }

    box.innerHTML = `
        <div class="notice ${type}">
            ${AMIANI.esc(message)}
        </div>
    `;

    // Scroll message into view
    box.scrollIntoView({
        behavior: "smooth",
        block: "nearest"
    });
}