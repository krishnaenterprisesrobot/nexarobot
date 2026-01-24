const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxc3BTnWr7fISVRTOq5mseFAs3NjZ--0aznz43ChGibJ0HxK2DP2AjFRPWpZatgp8MQuw/exec"; 
const UPI_PA = "84770542000031@cnrb"; 
const UPI_PN = "KRISHNA ENTERPRISES";
const ITEMS_PER_PAGE = 24;

let allProducts = [];
let displayedProducts = [];
let cart = {}; 
let page = 1;
let isSearchActive = false;

function loadProducts() {
    fetch(SCRIPT_URL + "?type=products")
    .then(r => r.json())
    .then(data => {
        allProducts = data.sort((a, b) => (Number(b.stock) || 0) - (Number(a.stock) || 0));
        displayedProducts = allProducts;
        document.getElementById("loading").style.display = "none";
        renderChunk();
        setupInfiniteScroll();
    })
    .catch(e => {
        document.getElementById("loading").innerHTML = "<p style='color:red'>Failed to connect. Please refresh.</p>";
    });
}

function renderChunk() {
    const start = (page - 1) * ITEMS_PER_PAGE;
    const end = page * ITEMS_PER_PAGE;
    const chunk = displayedProducts.slice(start, end);
    if(chunk.length === 0) return;

    const box = document.getElementById("products");
    const html = chunk.map(p => {
        const safePartNo = String(p.partNo).trim(); 
        const qtyInCart = cart[safePartNo] ? cart[safePartNo].qty : 0;
        const btnDisplay = qtyInCart > 0 ? 'none' : 'block';
        
        const discount = p.mrp > p.price ? Math.round(((p.mrp - p.price) / p.mrp) * 100) : 0;
        const discountHtml = discount > 0 ? `<div class="discount-badge">${discount}% OFF</div>` : '';

        return `
        <div class="product" id="card-${safePartNo}">
            ${discountHtml}
            <div class="img-wrapper">
                <img loading="lazy" src="${p.image || 'https://via.placeholder.com/150?text=No+Img'}" 
                     onerror="this.src='https://via.placeholder.com/150?text=No+Image'" alt="Product">
            </div>
            <div class="desc" title="${p.description}">${p.description}</div>
            <div><span class="part-badge">Part No: ${safePartNo}</span></div>
            <div class="price-row">
                <span class="price">₹${p.price}</span>
                <span class="mrp">₹${p.mrp}</span>
            </div>
            <div class="action-area">
                <button id="btn-${safePartNo}" class="add-btn" style="display: ${btnDisplay}" onclick="startAdd('${safePartNo}')">ADD TO CART</button>
                <div id="ctrl-${safePartNo}" class="qty-controls ${qtyInCart > 0 ? 'active' : ''}">
                    <button class="qty-btn" onclick="updateQty('${safePartNo}', -1)">-</button>
                    <span class="qty-display" id="disp-${safePartNo}">${qtyInCart}</span>
                    <button class="qty-btn" onclick="updateQty('${safePartNo}', 1)">+</button>
                </div>
            </div>
        </div>
        `;
    }).join("");
    box.insertAdjacentHTML('beforeend', html);
}

function setupInfiniteScroll() {
    const trigger = document.getElementById('loadMoreTrigger');
    const observer = new IntersectionObserver(entries => {
        if(entries[0].isIntersecting && !isSearchActive) {
            if (page * ITEMS_PER_PAGE < displayedProducts.length) {
                page++;
                renderChunk();
            }
        }
    }, { threshold: 0.1 });
    observer.observe(trigger);
}

function handleSearch() {
    clearTimeout(window.searchTimeout);
    window.searchTimeout = setTimeout(() => {
        const q = document.getElementById("searchInput").value.toLowerCase();
        const box = document.getElementById("products");
        box.innerHTML = "";
        page = 1;
        if(!q) {
            isSearchActive = false;
            displayedProducts = allProducts;
        } else {
            isSearchActive = true;
            displayedProducts = allProducts.filter(p => 
                String(p.partNo).toLowerCase().includes(q) || 
                String(p.description).toLowerCase().includes(q)
            );
        }
        renderChunk();
    }, 300);
}

function startAdd(partNo) { updateQty(partNo, 1); showToast("Item Added"); }

function updateQty(partNo, delta) {
    const pStr = String(partNo);
    if (!cart[pStr]) {
        const productData = allProducts.find(x => String(x.partNo) === pStr);
        if(!productData) return;
        cart[pStr] = { ...productData, qty: 0 };
    }
    cart[pStr].qty += delta;
    if (cart[pStr].qty <= 0) {
        delete cart[pStr];
        updateCardUI(pStr, 0);
    } else {
        updateCardUI(pStr, cart[pStr].qty);
    }
    updateFloatingCart();
    if(document.getElementById("cartModal").style.display === "flex") renderCartList();
}

function updateCardUI(partNo, qty) {
    const btn = document.getElementById(`btn-${partNo}`);
    const ctrl = document.getElementById(`ctrl-${partNo}`);
    const disp = document.getElementById(`disp-${partNo}`);
    if (!btn) return;
    if (qty > 0) {
        btn.style.display = 'none';
        ctrl.classList.add('active');
        disp.innerText = qty;
    } else {
        btn.style.display = 'block';
        ctrl.classList.remove('active');
    }
}

function updateFloatingCart() {
    const items = Object.values(cart);
    const count = items.reduce((a, b) => a + b.qty, 0);
    const floatBtn = document.getElementById("cartFloat");
    document.getElementById("cartCount").innerText = count;
    if (count > 0) floatBtn.classList.add('visible');
    else floatBtn.classList.remove('visible');
}

function showToast(msg) {
    const x = document.getElementById("toast");
    x.innerText = msg;
    x.className = "show";
    setTimeout(function(){ x.className = x.className.replace("show", ""); }, 3000);
}

function openCart() { renderCartList(); document.getElementById("cartModal").style.display = "flex"; }

function renderCartList() {
    const items = Object.values(cart);
    const container = document.getElementById("cartItems");
    if(items.length === 0) {
        container.innerHTML = "<div style='text-align:center; padding:30px; color:#999'>Cart is empty</div>";
        document.getElementById("cartFinalTotal").innerText = 0;
        document.getElementById("cartTotalItems").innerText = 0;
        return;
    }
    let grandTotal = 0;
    let totalQty = 0;
    container.innerHTML = items.map(i => {
        const lineTotal = i.price * i.qty;
        grandTotal += lineTotal;
        totalQty += i.qty;
        return `
        <div class="cart-list-item">
            <div class="cart-list-info" style="flex:1">
                <h4>${i.partNo}</h4>
                <p>${i.description.substring(0,35)}...</p>
                <div style="font-weight:600; margin-top:4px">₹${i.price} x ${i.qty} = ₹${lineTotal}</div>
            </div>
            <div class="mini-qty-ctrl">
                <button class="mini-qty-btn" onclick="updateQty('${i.partNo}', -1)">-</button>
                <span style="padding:0 8px; font-size:0.9rem">${i.qty}</span>
                <button class="mini-qty-btn" onclick="updateQty('${i.partNo}', 1)">+</button>
            </div>
        </div>
        `;
    }).join("");
    document.getElementById("cartFinalTotal").innerText = grandTotal;
    document.getElementById("cartTotalItems").innerText = totalQty;
}

function showPaymentOptions() {
    const name = document.getElementById("userName").value.trim();
    const phone = document.getElementById("userContact").value.trim();
    const total = parseFloat(document.getElementById("cartFinalTotal").innerText);
    
    if(!name || phone.length !== 10 || isNaN(phone)) return alert("Please enter valid Name and 10-digit Mobile Number");
    if(total <= 0) return alert("Cart is empty");
    
    closeModal("cartModal");
    document.getElementById("payAmount").innerText = total;
    document.getElementById("paymentModal").style.display = "flex";
    const upiLink = `upi://pay?pa=${UPI_PA}&pn=${encodeURIComponent(UPI_PN)}&am=${total}&cu=INR`;
    document.getElementById("upiQR").src = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(upiLink)}`;
    if (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) {
        document.getElementById("mobilePayBtns").style.display = "block";
        document.getElementById("payLink").href = upiLink;
    }
}

function finalizeOrder() {
    closeModal("paymentModal");
    document.getElementById("statusModal").style.display = "flex";
    const items = Object.values(cart).map(i => ({ partNo: i.partNo, desc: i.description, qty: i.qty, price: i.price }));
    const payload = { action: "placeOrder", name: document.getElementById("userName").value, phone: document.getElementById("userContact").value, items: items, totalAmount: document.getElementById("cartFinalTotal").innerText };
    fetch(SCRIPT_URL, { method: "POST", body: JSON.stringify(payload) })
    .then(r => r.json())
    .then(res => {
        if(res.result === "success") generatePDF(res.orderId, items);
        else { alert("Order Error: " + res.message); location.reload(); }
    })
    .catch(e => { alert("Connection Error"); location.reload(); });
}

function generatePDF(orderId, items) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const name = document.getElementById("userName").value;
    const total = document.getElementById("cartFinalTotal").innerText;
    doc.setFillColor(5, 150, 105); doc.rect(0, 0, 210, 40, 'F');
    doc.setTextColor(255, 255, 255); doc.setFontSize(20); doc.text("KRISHNA ENTERPRISES", 14, 25);
    doc.setTextColor(0,0,0); doc.setFontSize(10);
    doc.text(`Invoice #: ${orderId}`, 14, 50); doc.text(`Customer: ${name}`, 14, 55);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 14, 60);
    doc.autoTable({ startY: 70, head: [['Part No', 'Description', 'Qty', 'Price', 'Total']], body: items.map(i => [i.partNo, i.desc.substring(0,30), i.qty, i.price, (i.qty*i.price)]), theme: 'grid', headStyles: { fillColor: [5, 150, 105] } });
    doc.text(`Total Amount: Rs. ${total}`, 140, doc.lastAutoTable.finalY + 10);
    doc.save(`Invoice_${orderId}.pdf`);
    document.getElementById("statusText").innerHTML = "Order Placed! <br> Invoice Downloaded.";
    setTimeout(() => location.reload(), 3000);
}

function closeModal(id) { document.getElementById(id).style.display = "none"; }
loadProducts();