/**
 * ===================================================================
 * === LÓGICA DE LA APLICACIÓN - "EL RESOLVITO" (app.js) ===
 * ===================================================================
 * 
 * NOTA: Este archivo asume que 'products.js' se ha cargado previamente
 * y que la variable 'products' está disponible globalmente.
 */

// ===================================================================
// === CONSTANTES DE NEGOCIO Y ENVÍO ===
// ===================================================================
const MIN_ORDER_THRESHOLD = 500;
const TRAMO_1_MAX = 3000; 
const SHIPPING_COST_TRAMO_1 = 150; 
const SHIPPING_COST_TRAMO_2_BASE = 100; 
const WEIGHT_SURCHARGE_PER_10KG = 100; 
const WEIGHT_THRESHOLD_KG = 10;
const SERVICE_FEE = 50;

// CONSTANTES PARA EL AJUSTE POR VALOR EN EL TRAMO 2 (Alto valor, bajo peso)
const TRAMO_2_MAX_VALUE_1 = 5000;
const SHIPPING_MIN_VALUE_1 = 250; // Mínimo para $3,001 - $5,000 CUP
const SHIPPING_MIN_VALUE_2 = 350; // Mínimo para > $5,000 CUP


// ===================================================================
// === INICIALIZACIÓN Y VARIABLES GLOBALES ===
// ===================================================================
// Ordenamiento del catálogo (Asumiendo que 'products' existe al cargarse este script)
if (typeof products !== 'undefined') {
    products.sort((a, b) => {
        if (a.department < b.department) return -1;
        if (a.department > b.department) return 1;
        if (a.category < b.category) return -1;
        if (a.category > b.category) return 1;
        if (a.name < b.name) return -1;
        if (a.name > b.name) return 1;
        return 0;
    });
}

var cart = JSON.parse(localStorage.getItem('cart')) || [];
var whatsappGroupLink = 'https://chat.whatsapp.com/H19dIofkINdHrVApA4jbvW?mode=ac_t'; // Pega aquí tu enlace de grupo
var currentProductForModal = null;
var currentUnitType = 'individual';
var selectedCashAmount = '';
var toastTimeout; 
var currentDepartment = 'mercado'; // Estado inicial del departamento

// Referencias a modales y botones (Necesario para que la lógica funcione)
const cartModal = document.getElementById('cartModal');
const productDetailsModal = document.getElementById('productDetailsModal');
const checkoutModal = document.getElementById('checkoutModal');
const confirmationModal = document.getElementById('confirmationModal'); 
const floatingCartBtn = document.getElementById('floatingCartBtn');
const closeCartModalBtn = document.getElementById('closeCartModal');
const closeProductDetailsModalBtn = document.getElementById('closeProductDetailsModalBtn');
const closeCheckoutModalBtn = document.getElementById('closeCheckoutModal');
const closeConfirmationModalBtn = document.getElementById('closeConfirmationModal');
const floatingCallout = document.getElementById('floatingCallout'); 
const closeFloatingCalloutBtn = document.getElementById('closeFloatingCallout'); 

// ===================================================================
// === EVENTO DE CARGA DE DOCUMENTO ===
// ===================================================================
document.addEventListener('DOMContentLoaded', function() {
    setupStoreSection('mercado', products);
    updateCartUI(); 
    updateDeliveryPromoBanner();
    setupGeneralEventListeners();
    setupScrollAnimations();
    setupScrollHeader();
    showFloatingCalloutAfterDelay();
});

// ===================================================================
// === LÓGICA DE DEPARTAMENTOS Y RENDERIZADO ===
// ===================================================================

function switchDepartment(dept) {
    currentDepartment = dept;
    document.querySelectorAll('.department-tab').forEach(btn => {
        btn.classList.remove('bg-[var(--primary-color)]', 'text-white');
        btn.classList.add('bg-white', 'text-gray-600', 'border-gray-200');
    });
    const activeBtn = document.getElementById('tab-' + dept);
    activeBtn.classList.remove('bg-white', 'text-gray-600', 'border-gray-200');
    activeBtn.classList.add('bg-[var(--primary-color)]', 'text-white');

    const titles = { 'mercado': 'Mercado y Víveres', 'ropa': 'Moda y Estilo', 'electro': 'Hogar y Electro' };
    document.getElementById('sectionTitle').textContent = titles[dept];
    setupStoreSection('mercado', products); 

    const tabsContainer = document.getElementById('tabsContainer');
    const headerOffset = 80; 
    const elementPosition = tabsContainer.getBoundingClientRect().top;
    const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

    if (window.scrollY > offsetPosition) {
        window.scrollTo({
            top: offsetPosition,
            behavior: "smooth"
        });
    }
}

function setupStoreSection(sectionPrefix, allProducts) {
    var filtersId = sectionPrefix + 'CategoryFilters';
    var searchId = sectionPrefix + 'SearchInput';
    var gridId = sectionPrefix + 'ProductGrid';
    var noResultsId = sectionPrefix + 'NoResultsMessage';
    setupCategoryFiltersAndSearch(allProducts, filtersId, searchId, gridId, noResultsId);
}

function setupCategoryFiltersAndSearch(allProducts, filtersId, searchId, gridId, noResultsId) {
    var productsForSection = allProducts.filter(p => p.department === currentDepartment);
    var uniqueCategories = [];
    for (var i = 0; i < productsForSection.length; i++) {
        if (uniqueCategories.indexOf(productsForSection[i].category) === -1) {
            uniqueCategories.push(productsForSection[i].category);
        }
    }

    var categories = ['all'].concat(uniqueCategories);
    var filtersContainer = document.getElementById(filtersId);
    
    if (filtersContainer) {
        var buttonsHtml = categories.map(function(category) {
            return '<button class="category-btn ' + (category === 'all' ? 'active' : '') + '" data-category="' + category + '">' + (category === 'all' ? 'Todos' : category) + '</button>';
        }).join('');
        filtersContainer.innerHTML = buttonsHtml;
    }

    var currentCategory = 'all';
    var searchInput = document.getElementById(searchId);
    // IMPORTANTE: Clonar y reemplazar para evitar duplicar listeners
    const oldSearchInput = searchInput;
    const newSearchInput = oldSearchInput.cloneNode(true);
    oldSearchInput.parentNode.replaceChild(newSearchInput, oldSearchInput);
    searchInput = newSearchInput;
    searchInput.value = ''; 


    function filterAndRender() {
        var searchTerm = searchInput.value.toLowerCase();
        var filteredProducts = [];
        for (var i = 0; i < productsForSection.length; i++) {
            var product = productsForSection[i];
            var categoryMatch = (currentCategory === 'all' || product.category === currentCategory);
            var searchMatch = (!searchTerm || product.name.toLowerCase().indexOf(searchTerm) > -1 || product.description.toLowerCase().indexOf(searchTerm) > -1);
            if (categoryMatch && searchMatch) {
                filteredProducts.push(product);
            }
        }
        renderProducts(filteredProducts, gridId, noResultsId);
    }

    if (filtersContainer) {
        var categoryButtons = filtersContainer.querySelectorAll('.category-btn');
        for (var j = 0; j < categoryButtons.length; j++) {
            categoryButtons[j].addEventListener('click', function() {
                for (var k = 0; k < categoryButtons.length; k++) { categoryButtons[k].classList.remove('active'); }
                this.classList.add('active');
                currentCategory = this.getAttribute('data-category');
                filterAndRender();
            });
        }
    }
    
    searchInput.addEventListener('input', filterAndRender);
    
    filterAndRender();
}

function renderProducts(productsToRender, gridId, noResultsId) {
    var productGrid = document.getElementById(gridId);
    var noResultsMessage = document.getElementById(noResultsId);
    if (!productGrid || !noResultsMessage) return;
    if (productsToRender.length === 0) {
        productGrid.innerHTML = '';
        noResultsMessage.classList.remove('hidden');
        return;
    }
    noResultsMessage.classList.add('hidden');
    
    var groupedProducts = productsToRender.reduce(function(acc, product) {
        (acc[product.category] = acc[product.category] || []).push(product);
        return acc;
    }, {});

    var html = '';
    var sortedCategories = Object.keys(groupedProducts).sort();

    for (var i = 0; i < sortedCategories.length; i++) {
        var category = sortedCategories[i];
        if (groupedProducts.hasOwnProperty(category)) {
            html += '<div class="col-span-full fade-in-up"><h3 class="text-2xl font-bold text-center text-[var(--primary-color)] my-8 border-b-2 border-gray-200 pb-2">— ' + category + ' —</h3></div>';
            html += groupedProducts[category].map(function(product, index) {
                const isUnavailable = product.status === 'unavailable';
                const onClickHandler = isUnavailable ? '' : `onclick="showProductDetailsModal(${product.id})"`;
                const cursorStyle = isUnavailable ? 'cursor-not-allowed' : 'cursor-pointer';

                const imageWrapperClasses = (product.id === 14) 
                    ? 'w-full h-80 md:h-96 overflow-hidden bg-transparent flex items-center justify-center p-2' 
                    : 'w-full h-80 md:h-96 overflow-hidden bg-transparent flex items-center justify-center p-3'; 

                return '<div class="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 ' + cursorStyle + ' flex flex-col ' + (isUnavailable ? 'unavailable-product-card' : '') + ' fade-in-up" style="transition-delay: ' + (index * 50) + 'ms" ' + onClickHandler + '>' +
                           '<div class="' + imageWrapperClasses + '">' + 
                             '<img src="' + product.image + '" alt="' + product.name + ' - El Resolvito" class="w-full h-full object-contain transition-all duration-300">' +
                           '</div>' +
                           '<div class="p-4 flex-grow flex flex-col">' +
                           '<h3 class="text-fixed-lg font-bold text-[var(--text-dark)] mb-1 product-name">' + product.name + '</h3>' +
                           '<span class="text-fixed-sm font-semibold ' + (isUnavailable ? 'text-red-600' : 'text-green-600') + ' mb-2">' + (isUnavailable ? 'No Disponible' : 'Disponible') + '</span>' +
                           (product.specificDetails ? '<p class="text-fixed-sm text-gray-500 mb-1 product-details-text">' + product.specificDetails + '</p>' : '') +
                           '<p class="text-fixed-sm text-[var(--text-medium)] mb-2 flex-grow product-description">' + product.description + '</p>' +
                           '<p class="text-fixed-xl font-bold text-[var(--primary-color)] mb-4 product-price">$' + product.price.toLocaleString() + '</p>' +
                           (isUnavailable ? 
                               '<div class="add-to-cart-btn mt-auto py-2 px-4 rounded-lg flex items-center justify-center bg-gray-400 text-white font-bold text-fixed-base cursor-not-allowed">' +
                                   '<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm-7-8a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clip-rule="evenodd" /></svg>' +
                                   'No Disponible' +
                               '</div>' : 
                               '<button class="add-to-cart-btn mt-auto w-full bg-[var(--primary-color)] text-white font-bold py-2 px-4 rounded-lg text-fixed-base hover:bg-opacity-90 transition-colors duration-300">Ver Detalles</button>') +
                           '</div></div>';
            }).join('');
        }
    }
    productGrid.innerHTML = '<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">' + html + '</div>';
    setupScrollAnimations();
}

// ===================================================================
// === LÓGICA DE CARRITO Y MODALES (Funciones Core) ===
// ===================================================================

function showProductDetailsModal(productId){var product=null;for(var i=0;i<products.length;i++){if(products[i].id===productId){product=products[i];break;}}
if(!product||product.status==='unavailable')return;currentProductForModal=JSON.parse(JSON.stringify(product));currentProductForModal.quantity=1;currentUnitType='individual';document.getElementById('productDetailsTitle').textContent=product.name;document.getElementById('productDetailsImage').src=product.image;document.getElementById('productDetailsDescription').textContent=product.description;document.getElementById('productQuantityDisplay').textContent='1';var unitTypeSection=document.getElementById('unitTypeSection');if(product.hasBoxOption){unitTypeSection.classList.remove('hidden');updateUnitTypeButtons();}else{unitTypeSection.classList.add('hidden');}
updateModalPricing();showModal(productDetailsModal);} 
function updateUnitTypeButtons(){var individualBtn=document.getElementById('unitTypeIndividual');var boxBtn=document.getElementById('unitTypeBox');if(currentUnitType==='individual'){individualBtn.classList.add('active');boxBtn.classList.remove('active');}else{boxBtn.classList.add('active');individualBtn.classList.remove('active');}}
function updateModalPricing(){if(!currentProductForModal)return;var unitPrice,unitDescription;if(currentProductForModal.hasBoxOption&&currentUnitType==='box'){unitPrice=currentProductForModal.boxPrice;unitDescription='Caja ('+currentProductForModal.boxQuantity+' unidades)';}else{unitPrice=currentProductForModal.price;unitDescription='Unidad';}
var totalPrice=unitPrice*currentProductForModal.quantity;document.getElementById('productDetailsPrice').textContent='$'+unitPrice.toLocaleString()+' / '+unitDescription;document.getElementById('modalTotalPrice').textContent='$'+totalPrice.toLocaleString();}
function addToCartFromModal(){if(!currentProductForModal)return;var cartItem={id:currentProductForModal.id+(currentUnitType==='box'?'_box':''),name:currentProductForModal.name,image:currentProductForModal.image,quantity:currentProductForModal.quantity,unitType:currentUnitType};

const productData = products.find(p => p.id === currentProductForModal.id);
if (productData && productData.weight !== undefined) {
    cartItem.weight = productData.weight;
    if (currentProductForModal.hasBoxOption && currentUnitType === 'box') {
        cartItem.price = currentProductForModal.boxPrice;
        cartItem.name += ' (Caja x' + currentProductForModal.boxQuantity + ')';
    } else { cartItem.price = currentProductForModal.price; }
} else { cartItem.price = currentProductForModal.price; cartItem.weight = 0; }
var existingItemIndex=-1;for(var i=0;i<cart.length;i++){if(cart[i].id===cartItem.id){existingItemIndex=i;break;}}
if(existingItemIndex!==-1){cart[existingItemIndex].quantity+=cartItem.quantity;}else{cart.push(cartItem);}
updateCartUI();localStorage.setItem('cart',JSON.stringify(cart));hideModal(productDetailsModal);currentProductForModal=null;showCartAnimation(); showCartToast('Producto añadido al carrito');} 

function updateCartUI(){
    var totalItems=cart.reduce(function(sum,item){return sum+item.quantity;},0);
    var totalPrice=cart.reduce(function(sum,item){return sum+(item.price*item.quantity);},0);
    document.getElementById('cartCount').textContent=totalItems;
    document.getElementById('cartTotal').textContent='$'+totalPrice.toLocaleString();
    document.getElementById('floatingCartTotal').textContent = '$' + totalPrice.toLocaleString();
    var cartItems=document.getElementById('cartItems');
    var sendWhatsAppOrder=document.getElementById('sendWhatsAppOrder');
    if(cart.length===0){
        cartItems.innerHTML='<p class="text-center text-[var(--text-medium)] text-fixed-base">Tu carrito está vacío</p>';
        sendWhatsAppOrder.disabled=true;
    }else{
        cartItems.innerHTML=cart.map(function(item,index){return('<div class="flex items-center justify-between py-3 border-b border-gray-100 last:border-b-0">'+
        '<div class="flex-1"><h4 class="text-fixed-base font-semibold text-[var(--text-dark)]">'+item.name+'</h4><p class="text-fixed-sm text-[var(--text-medium)]">$'+item.price.toLocaleString()+' c/u</p></div>'+
        '<div class="flex items-center gap-2">'+
        '<button onclick="updateCartQuantity('+index+', '+(item.quantity-1)+')" class="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-fixed-sm font-bold hover:bg-gray-300 transition-colors">-</button>'+
        '<span class="text-fixed-base font-semibold w-8 text-center">'+item.quantity+'</span>'+
        '<button onclick="updateCartQuantity('+index+', '+(item.quantity+1)+')" class="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-fixed-sm font-bold hover:bg-gray-300 transition-colors">+</button>'+
        '<button onclick="removeFromCart('+index+')" class="ml-2 text-red-500 hover:text-red-700 transition-colors"><svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>'+
        '</div></div>');
    }).join('');
    sendWhatsAppOrder.disabled=false;
    }
    updateDeliveryPromoBanner(); 
}

function updateCartQuantity(index,newQuantity){
    if(newQuantity<=0){ removeFromCart(index); showCartToast('Producto eliminado del carrito'); return; } 
    cart[index].quantity=newQuantity; updateCartUI(); localStorage.setItem('cart',JSON.stringify(cart)); showCartToast('Carrito actualizado');
}

function removeFromCart(index){ cart.splice(index,1); updateCartUI(); localStorage.setItem('cart',JSON.stringify(cart)); showCartToast('Producto eliminado del carrito'); }
function showCartAnimation(){var floatingCartBtn=document.getElementById('floatingCartBtn');floatingCartBtn.classList.add('shake');setTimeout(function(){floatingCartBtn.classList.remove('shake');},600);}
function showCartToast(message) {
    const toast = document.getElementById('cartToast'); const toastMessage = document.getElementById('cartToastMessage');
    clearTimeout(toastTimeout); toastMessage.textContent = message; toast.classList.add('show');
    toastTimeout = setTimeout(() => { toast.classList.remove('show'); }, 3000);
}
function showModal(modalElement) { if (!modalElement) return; modalElement.classList.add('show'); document.body.style.overflow = 'hidden'; }
function hideModal(modalElement) { if (!modalElement) return; modalElement.classList.remove('show'); document.body.style.overflow = ''; }

// ===================================================================
// === LÓGICA DE CHECKOUT Y ENVÍOS ===
// ===================================================================

function setupGeneralEventListeners(){
    floatingCartBtn.addEventListener('click', () => showModal(cartModal));
    closeCartModalBtn.addEventListener('click', () => hideModal(cartModal));
    cartModal.addEventListener('click', (e) => { if(e.target === cartModal) hideModal(cartModal); });
    
    closeProductDetailsModalBtn.addEventListener('click', () => { hideModal(productDetailsModal); currentProductForModal=null; });
    productDetailsModal.addEventListener('click', (e) => { if(e.target === productDetailsModal) { hideModal(productDetailsModal); currentProductForModal=null; }});
    
    document.getElementById('unitTypeIndividual').addEventListener('click', () => { currentUnitType='individual'; updateUnitTypeButtons(); updateModalPricing(); });
    document.getElementById('unitTypeBox').addEventListener('click', () => { currentUnitType='box'; updateUnitTypeButtons(); updateModalPricing(); });
    
    document.getElementById('decreaseQuantityBtn').addEventListener('click', () => { if(currentProductForModal && currentProductForModal.quantity > 1) { currentProductForModal.quantity--; document.getElementById('productQuantityDisplay').textContent = currentProductForModal.quantity; updateModalPricing(); }});
    document.getElementById('increaseQuantityBtn').addEventListener('click', () => { if(currentProductForModal) { currentProductForModal.quantity++; document.getElementById('productQuantityDisplay').textContent = currentProductForModal.quantity; updateModalPricing(); }});
    
    document.getElementById('addProductToCartModalBtn').addEventListener('click', addToCartFromModal);
    document.getElementById('sendWhatsAppOrder').addEventListener('click', () => { hideModal(cartModal); showCheckoutModal(); });
    document.getElementById('contactWhatsappBtn').addEventListener('click', (e) => { e.preventDefault(); window.open(whatsappGroupLink,'_blank'); });
    
    document.getElementById('mobile-menu-button').addEventListener('click', () => { document.getElementById('mobile-menu').classList.add('open'); document.getElementById('mobile-backdrop').classList.add('open'); });
    document.getElementById('close-mobile-menu').addEventListener('click', closeMobileMenu);
    document.getElementById('mobile-backdrop').addEventListener('click', closeMobileMenu);
    
    closeConfirmationModalBtn.addEventListener('click', () => hideModal(confirmationModal));
    confirmationModal.addEventListener('click', (e) => { if (e.target === confirmationModal) hideModal(confirmationModal); });

    if (closeFloatingCalloutBtn) {
        closeFloatingCalloutBtn.addEventListener('click', () => {
            hideFloatingCallout();
            sessionStorage.setItem('floatingCalloutClosed', 'true');
        });
    }

    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            let target = document.querySelector(this.getAttribute('href'));
            if (target) {
                if (this.classList.contains('mobile-nav-link')) closeMobileMenu();
                setTimeout(() => {
                    window.scrollTo({
                        top: target.offsetTop - 80,
                        behavior: 'smooth'
                    });
                }, 100);
            }
        });
    });
    setupCheckoutEventListeners();
}

function closeMobileMenu(){document.getElementById('mobile-menu').classList.remove('open');document.getElementById('mobile-backdrop').classList.remove('open');}
function setupScrollAnimations(){if('IntersectionObserver' in window){var observer=new IntersectionObserver((entries)=>{entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('is-visible');}});},{threshold:0.1});document.querySelectorAll('.fade-in-up, .fade-in-left, .fade-in-right').forEach(el=>{observer.observe(el);});}else{document.querySelectorAll('.fade-in-up, .fade-in-left, .fade-in-right').forEach(el=>{el.classList.add('is-visible');});}}
function setupScrollHeader(){var header=document.getElementById('mainHeader');window.addEventListener('scroll',function(){if(window.scrollY>100){header.classList.add('scrolled');}else{header.classList.remove('scrolled');}});}
function showCheckoutModal(){if(cart.length===0){alert('Tu carrito está vacío');return;}
var savedData=JSON.parse(localStorage.getItem('customerData'));if(savedData){document.getElementById('customerName').value=savedData.name||'';document.getElementById('customerAddress').value=savedData.address||'';document.getElementById('customerReferences').value=savedData.references||'';document.getElementById('customerPhone').value=savedData.phone||'';document.getElementById('deliveryLocation').value=savedData.location||'';} 
updateCheckoutSummary();showModal(checkoutModal);} 

function updateCheckoutSummary(){
    var checkoutOrderSummary=document.getElementById('checkoutOrderSummary');
    var subtotal=cart.reduce(function(sum,item){return sum+(item.price*item.quantity);},0);
    checkoutOrderSummary.innerHTML=cart.map(function(item){return('<div class="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0">'+
    '<div class="flex-1"><h5 class="text-fixed-base font-semibold text-[var(--text-dark)]">'+item.name+'</h5><p class="text-fixed-sm text-[var(--text-medium)]">$'+item.price.toLocaleString()+' c/u × '+item.quantity+'</p></div>'+
    '<div class="text-fixed-base font-semibold">$'+(item.price*item.quantity).toLocaleString()+'</div></div>');
    }).join('');
    document.getElementById('checkoutSubtotal').textContent='$'+subtotal.toLocaleString();
    updateShippingAndTotal();
}

function calculateTotalWeight() {
    let totalWeight = 0;
    for (let i = 0; i < cart.length; i++) {
        const item = cart[i];
        // Find the corresponding product object
        const product = products.find(p => p.id === (item.unitType === 'box' ? item.id.split('_')[0] * 1 : item.id * 1));

        if (product && product.weight !== undefined) {
            let itemWeight = product.weight;
            if (item.unitType === 'box' && product.hasBoxOption && product.boxQuantity) {
                itemWeight = product.weight * product.boxQuantity;
            }
            totalWeight += itemWeight * item.quantity; 
        }
    }
    return totalWeight; // in kg
}

function updateShippingAndTotal() {
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const serviceFee = SERVICE_FEE;
    document.getElementById('checkoutServiceFee').textContent = '$' + serviceFee;
    const deliveryLocation = document.getElementById('deliveryLocation').value;
    const confirmOrderBtn = document.getElementById('confirmOrderBtn');
    let shippingCost = 0;
    let shippingText = '$0';
    let showNote = false;
    let noteText = '';
    let upsellMessage = '';
    const upsellElement = document.getElementById('upsellMessage');

    confirmOrderBtn.disabled = false;
    confirmOrderBtn.textContent = 'Confirmar y Enviar Pedido';

    if (deliveryLocation === 'habana-vieja') {
        if (subtotal < MIN_ORDER_THRESHOLD) {
            // Bloquea el pedido si no cumple el mínimo
            shippingCost = SHIPPING_COST_TRAMO_1; 
            shippingText = `$${SHIPPING_COST_TRAMO_1} CUP (Provisional)`;
            const neededForMinimum = MIN_ORDER_THRESHOLD - subtotal;
            upsellMessage = `Te faltan $${neededForMinimum.toLocaleString()} para alcanzar el pedido mínimo de $${MIN_ORDER_THRESHOLD}.`;
            upsellElement.className = 'my-4 p-3 rounded-lg text-center font-semibold text-sm bg-red-100 text-red-800';
            confirmOrderBtn.disabled = true;
            confirmOrderBtn.textContent = `Faltan $${neededForMinimum.toLocaleString()} para el mínimo`;
        } else if (subtotal > TRAMO_1_MAX) {
            // TRAMO 2: > $3000 (Máximo entre Costo por Peso y Mínimo por Valor)
            
            // 1. Cálculo por Peso (Costo_Peso)
            const totalWeight = calculateTotalWeight();
            const weightCeiling = Math.ceil(totalWeight / WEIGHT_THRESHOLD_KG);
            const weightSurcharge = weightCeiling * WEIGHT_SURCHARGE_PER_10KG;
            const costoPeso = SHIPPING_COST_TRAMO_2_BASE + weightSurcharge; // Minimo de 200 CUP aquí
            
            // 2. Cálculo por Valor Mínimo (Mínimo_de_Envío_por_Valor)
            let minimoPorValor = 0;
            let valueThresholdText = '';
            if (subtotal <= TRAMO_2_MAX_VALUE_1) { // $3,001 - $5,000
                minimoPorValor = SHIPPING_MIN_VALUE_1; // $250
                valueThresholdText = `$${TRAMO_1_MAX.toLocaleString()} a $${TRAMO_2_MAX_VALUE_1.toLocaleString()}`;
            } else { // Subtotal > $5,000
                minimoPorValor = SHIPPING_MIN_VALUE_2; // $350
                valueThresholdText = `más de $${TRAMO_2_MAX_VALUE_1.toLocaleString()}`;
            }
            
            // 3. Acción Final (MAX)
            shippingCost = Math.max(costoPeso, minimoPorValor);

            // Mensaje actualizado
            const costoAplicado = (shippingCost === costoPeso) ? 'por peso' : 'por valor';
            upsellMessage = `¡Tramo 2! El envío es el MÁXIMO entre el costo por peso ($${costoPeso.toLocaleString()} CUP) y el mínimo por valor ($${minimoPorValor.toLocaleString()} CUP). Se aplica el costo ${costoAplicado} ($${shippingCost.toLocaleString()} CUP).`;
            upsellElement.className = 'my-4 p-3 rounded-lg text-center font-semibold text-sm bg-green-100 text-green-800';
            shippingText = `$${shippingCost.toLocaleString()} CUP`;
        } else {
            // TRAMO 1: $500 - $3000 (Tarifa Fija)
            shippingCost = SHIPPING_COST_TRAMO_1;
            shippingText = `$${SHIPPING_COST_TRAMO_1} CUP`;
            
            const neededForTramo2 = TRAMO_1_MAX - subtotal + 1;
            upsellMessage = `¡Añade $${neededForTramo2.toLocaleString()} más para pasar al Tramo 2 y obtener beneficios en la tarifa de envío para pedidos grandes!`;
            upsellElement.className = 'my-4 p-3 rounded-lg text-center font-semibold text-sm bg-yellow-100 text-yellow-800';
        }
    } else if (deliveryLocation === 'otros') {
        shippingCost = 0;
        shippingText = 'A confirmar';
        showNote = true;
        noteText = 'El costo de envío se ajustará al precio de la agencia de mensajería externa, se lo confirmaremos por WhatsApp.';
        upsellMessage = '';
    } else {
        shippingCost = 0;
        shippingText = '$0';
        upsellMessage = 'Selecciona tu ubicación para calcular el envío.';
        upsellElement.className = 'my-4 p-3 rounded-lg text-center font-semibold text-sm bg-gray-100 text-gray-800';
        confirmOrderBtn.disabled = true;
        confirmOrderBtn.textContent = 'Selecciona una ubicación';
    }

    if (upsellElement) {
        upsellElement.textContent = upsellMessage;
        upsellElement.classList.toggle('hidden', upsellMessage === '');
    }
    
    document.getElementById('checkoutShipping').textContent = shippingText;
    document.getElementById('shippingNote').classList.toggle('hidden', !showNote);
    if(showNote) document.getElementById('shippingNote').textContent = noteText;
    
    document.getElementById('checkoutTotal').textContent = '$' + (subtotal + SERVICE_FEE + shippingCost).toLocaleString();
}

function updateDeliveryPromoBanner() {
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const progressBar = document.getElementById('promoProgressBar');
    const progressTextSpan = document.getElementById('progressText');
    const [levelTramo1, levelTramo2] = [document.getElementById('promoLevelTramo1'), document.getElementById('promoLevelTramo2')];
    
    if (!levelTramo1 || !levelTramo2) return;

    [levelTramo1, levelTramo2].forEach(level => {
        level.classList.remove('opacity-100', 'ring-[var(--accent-color)]');
        level.classList.add('opacity-75');
    });

    let progressWidth = 0;
    let message = `Pedido mínimo de $${MIN_ORDER_THRESHOLD}.`;
    let totalWeight = 0;

    if (subtotal > TRAMO_1_MAX) { // TRAMO 2
        progressWidth = 100;
        totalWeight = calculateTotalWeight();
        const weightCeiling = Math.ceil(totalWeight / WEIGHT_THRESHOLD_KG);
        const weightSurcharge = weightCeiling * WEIGHT_SURCHARGE_PER_10KG;
        const costoPeso = SHIPPING_COST_TRAMO_2_BASE + weightSurcharge;

        let minimoPorValor = (subtotal > TRAMO_2_MAX_VALUE_1) ? SHIPPING_MIN_VALUE_2 : SHIPPING_MIN_VALUE_1;
        const totalShipping = Math.max(costoPeso, minimoPorValor);

        message = `¡Tramo 2 alcanzado! Envío final máximo: $${totalShipping.toLocaleString()} CUP.`;
        
        levelTramo2.classList.add('opacity-100', 'ring-[var(--accent-color)]');
        levelTramo1.classList.add('opacity-100');
        levelTramo2.classList.remove('opacity-75');
        levelTramo1.classList.remove('opacity-75');
    } else if (subtotal >= MIN_ORDER_THRESHOLD) { // TRAMO 1
        progressWidth = (subtotal / TRAMO_1_MAX) * 100;
        const neededForTramo2 = TRAMO_1_MAX - subtotal + 1;
        message = `Añade $${neededForTramo2.toLocaleString()} más para pasar al Tramo 2 y optar por la mejor tarifa.`;
        
        levelTramo1.classList.add('opacity-100', 'ring-[var(--accent-color)]');
        levelTramo1.classList.remove('opacity-75');
    } else if (subtotal > 0) {
        progressWidth = (subtotal / MIN_ORDER_THRESHOLD) * 15;
        const neededForMinimum = MIN_ORDER_THRESHOLD - subtotal;
        message = `Te faltan $${neededForMinimum.toLocaleString()} para el pedido mínimo de $${MIN_ORDER_THRESHOLD}.`;
    }

    progressBar.style.width = Math.min(progressWidth, 100) + '%';
    progressTextSpan.innerHTML = message;
    
    progressTextSpan.style.color = (progressWidth > 50) ? 'white' : 'var(--primary-color)';
    progressTextSpan.style.textShadow = (progressWidth > 50) ? '0 0 3px rgba(0,0,0,0.5)' : 'none';
}

function validateField(fieldId) {
    const element = document.getElementById(fieldId);
    if (element && element.required) {
        const isValid = element.value.trim() !== '';
        element.classList.toggle('border-red-500', !isValid);
        return isValid;
    }
    return true;
}

function setupCheckoutEventListeners(){
    closeCheckoutModalBtn.addEventListener('click', () => hideModal(checkoutModal));
    checkoutModal.addEventListener('click', (e) => { if(e.target === checkoutModal) hideModal(checkoutModal); });
    
    ['customerName', 'customerAddress', 'customerPhone'].forEach(id => {
        const inputElement = document.getElementById(id);
        if (inputElement) {
            inputElement.addEventListener('input', () => validateField(id));
        }
    });
    
    const deliveryLocationSelect = document.getElementById('deliveryLocation');
    if (deliveryLocationSelect) {
        deliveryLocationSelect.addEventListener('change', () => {
            validateField('deliveryLocation');
            updateShippingAndTotal();
        });
    }

    document.querySelectorAll('input[name="paymentMethod"]').forEach(radio => {
        radio.addEventListener('change', function() {
            const cashField = document.getElementById('cashPaymentField');
            cashField.classList.toggle('hidden', this.value !== 'efectivo');
            if (this.value !== 'efectivo') {
                selectedCashAmount = '';
                document.querySelectorAll('.cash-btn').forEach(btn => btn.classList.remove('active'));
                document.getElementById('otherCashAmount').classList.add('hidden');
                document.getElementById('otherCashAmount').value = '';
            }
        });
    });

    document.querySelectorAll('.cash-btn').forEach(button => {
        button.addEventListener('click', function() {
            document.querySelectorAll('.cash-btn').forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
            selectedCashAmount = this.getAttribute('data-amount');
            const otherInput = document.getElementById('otherCashAmount');
            otherInput.classList.toggle('hidden', selectedCashAmount !== 'otro');
            if (selectedCashAmount === 'otro') otherInput.focus();
            else otherInput.value = '';
        });
    });

    document.getElementById('confirmOrderBtn').addEventListener('click', confirmOrder);
}

function validateCheckoutForm(){
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const deliveryLocation = document.getElementById('deliveryLocation').value;
    if (deliveryLocation === 'habana-vieja' && subtotal < MIN_ORDER_THRESHOLD) {
        alert(`Tu pedido en Habana Vieja debe ser de al menos $${MIN_ORDER_THRESHOLD} CUP para continuar.`);
        return false;
    }

    const requiredFieldIds = ['customerName', 'customerAddress', 'customerPhone', 'deliveryLocation'];
    let errors = [];
    requiredFieldIds.forEach(id => {
        if (!validateField(id)) {
            const label = document.querySelector(`label[for="${id}"]`);
            errors.push(label ? label.textContent.replace(' *', '').trim() : id);
        }
    });
    
    const paymentMethod = document.querySelector('input[name="paymentMethod"]:checked');
    if (!paymentMethod) {
        errors.push('Método de pago');
    } else if (paymentMethod.value === 'efectivo') {
        const otherCash = document.getElementById('otherCashAmount');
        if (!selectedCashAmount || (selectedCashAmount === 'otro' && !otherCash.value.trim())) {
            errors.push('Monto de pago en efectivo');
            if (selectedCashAmount === 'otro') otherCash.classList.add('border-red-500');
        } else {
            if (selectedCashAmount === 'otro') otherCash.classList.remove('border-red-500');
        }
    }

    if (errors.length > 0) {
        alert('Por favor completa o corrige los siguientes campos:\n• ' + errors.join('\n• '));
        return false;
    }
    return true;
}

function confirmOrder() {
    if (!validateCheckoutForm()) return;
    
    const customerName = document.getElementById('customerName').value.trim();
    const customerAddress = document.getElementById('customerAddress').value.trim();
    const customerReferences = document.getElementById('customerReferences').value.trim();
    const customerPhone = document.getElementById('customerPhone').value.trim();
    const deliveryLocation = document.getElementById('deliveryLocation').value;
    const paymentMethod = document.querySelector('input[name="paymentMethod"]:checked').value;
    let cashAmount = '';
    if (paymentMethod === 'efectivo') {
        cashAmount = selectedCashAmount === 'otro' ? document.getElementById('otherCashAmount').value.trim() : selectedCashAmount;
        if (!cashAmount) cashAmount = 'Sin especificar';
    }

    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const serviceFee = SERVICE_FEE;
    let shippingCost = 0;
    let shippingText = '';
    let totalWeight = 0;

    if (deliveryLocation === 'habana-vieja') {
        if (subtotal > TRAMO_1_MAX) {
            
            totalWeight = calculateTotalWeight();
            const weightCeiling = Math.ceil(totalWeight / WEIGHT_THRESHOLD_KG);
            const weightSurcharge = weightCeiling * WEIGHT_SURCHARGE_PER_10KG;
            const costoPeso = SHIPPING_COST_TRAMO_2_BASE + weightSurcharge; 
            
            let minimoPorValor = 0;
            let tipoMinimo = '';
            if (subtotal > TRAMO_2_MAX_VALUE_1) { 
                minimoPorValor = SHIPPING_MIN_VALUE_2; 
                tipoMinimo = `Mínimo $${SHIPPING_MIN_VALUE_2} CUP`;
            } else {
                minimoPorValor = SHIPPING_MIN_VALUE_1; 
                tipoMinimo = `Mínimo $${SHIPPING_MIN_VALUE_1} CUP`;
            }
            
            shippingCost = Math.max(costoPeso, minimoPorValor);

            const costoAplicado = (shippingCost === costoPeso) ? 'por peso' : 'por valor';
            shippingText = `$${shippingCost.toLocaleString()} CUP (Cálculo ${costoAplicado}: Peso $${costoPeso.toLocaleString()} CUP vs. ${tipoMinimo})`;
        } else {
            shippingCost = SHIPPING_COST_TRAMO_1;
            shippingText = `$${SHIPPING_COST_TRAMO_1} CUP (Tarifa fija Tramo 1)`;
        }
    } else {
        shippingText = 'A confirmar por agencia';
    }

    const total = subtotal + serviceFee + shippingCost;
    const orderItems = cart.map(item => `• ${item.name} x${item.quantity} - $${(item.price * item.quantity).toLocaleString()}`).join('\n');
    
    const locationText = deliveryLocation === 'habana-vieja' ? 'Habana Vieja' : 'Otros municipios';
    const paymentText = paymentMethod === 'efectivo' ? `Efectivo (pagaré con ${cashAmount})` : 'Transferencia';
    
    const finalMessage = `*🛒 NUEVO PEDIDO - EL RESOLVITO*\n\n` +
        `*👤 DATOS DEL CLIENTE:*\n` + `• Nombre: ${customerName}\n` + `• Teléfono: ${customerPhone}\n` + `• Dirección: ${customerAddress}\n` + `• Referencias: ${customerReferences || 'N/A'}\n` + `• Ubicación: ${locationText}\n\n` +
        `*📦 PRODUCTOS:*\n${orderItems}\n\n` +
        `*💰 RESUMEN DE PAGO:*\n` + `• Subtotal: $${subtotal.toLocaleString()}\n` + `• Servicio/Empaque: $${SERVICE_FEE}\n` + `• Envío: ${shippingText}\n` + `• Peso Total: ${totalWeight.toFixed(2)} kg\n` + `• TOTAL: $${total.toLocaleString()}\n\n` +
        `*💳 MÉTODO DE PAGO:*\n${paymentText}\n\n` + `_¡Gracias por su pedido!_ 🙏`;

    const googleAppsScriptUrl = 'https://script.google.com/macros/s/AKfycby9Sk3Fz2_WqRQsEXrezpwqKbpYhqW_-ialMJcYKPdvZkrBfNReWWFfQ-VnXTrkJY8W/exec';
    const formData = new FormData();
    const orderData = { idPedido: new Date().getTime(), customerName, customerPhone, customerAddress: `${customerAddress} (Ref: ${customerReferences || 'N/A'})`, total, paymentMethod, shippingText, orderItems, cashAmount, location: locationText };
    for (const key in orderData) { formData.append(key, orderData[key]); }
    fetch(googleAppsScriptUrl, { method: 'POST', body: formData, mode: 'no-cors' }).catch(err => console.error('Error enviando a Google Sheets:', err));
    
    const whatsappPhoneNumber = '5356382909';
    const whatsappMessage = encodeURIComponent(finalMessage.replace(/\*/g, '').replace(/_/g, ''));
    window.open(`https://wa.me/${whatsappPhoneNumber}?text=${whatsappMessage}`, '_blank');

    hideModal(checkoutModal);
    cart = [];
    updateCartUI();
    localStorage.setItem('cart', JSON.stringify(cart));
    
    const customerData = { name: customerName, address: customerAddress, references: customerReferences, phone: customerPhone, location: deliveryLocation };
    localStorage.setItem('customerData', JSON.stringify(customerData));
    
    showModal(confirmationModal);
}

function showFloatingCallout() {
    if (sessionStorage.getItem('floatingCalloutClosed') !== 'true') {
        floatingCallout.classList.add('show');
    }
}

function hideFloatingCallout() {
    floatingCallout.classList.remove('show');
}

function showFloatingCalloutAfterDelay() {
    setTimeout(showFloatingCallout, 20000);
}

// Lógica para el botón del acordeón
function toggleAccordion(id) {
    const content = document.getElementById('content-' + id);
    const icon = document.getElementById('icon-' + id);
    if (content.classList.contains('hidden')) {
        content.classList.remove('hidden');
        icon.classList.add('rotate-180');
    } else {
        content.classList.add('hidden');
        icon.classList.remove('rotate-180');
    }
}

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').then(reg => console.log('SW registrado:', reg.scope)).catch(err => console.log('Fallo registro SW:', err));
    });
}