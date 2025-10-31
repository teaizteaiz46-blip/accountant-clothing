// ----------------------------------
// 1. الاتصال بـ Supabase
// ----------------------------------
const SUPABASE_URL = 'https://xtsrtyqdwurfqqwsbqbf.supabase.co'; // ألصق الـ URL هنا
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh0c3J0eXFkd3VyZnFxd3NicWJmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE5MjM4NTMsImV4cCI6MjA3NzQ5OTg1M30.xjWM96SiY1g2AUF819aInHOry18Inf1r5iH9N4VyCbg'; // ألصق الـ Key هنا

// تم تصحيح اسم المتغير هنا
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// سنخزن السلة هنا
let cart = []; 
// 1. تحديد عدد المنتجات الظاهرة
const INITIAL_DISPLAY_LIMIT = 10;
// ----------------------------------
// 2. عند تحميل الصفحة: جلب المخزون
// ----------------------------------
// استبدل الدالة القديمة بالكامل


document.addEventListener('DOMContentLoaded', () => {
    // 1. تحميل المخزون
    loadInventory();

    // 2. إضافة "مراقب نقرات" واحد للتعامل مع كل الأزرار
    const inventoryList = document.getElementById('inventory-list');
    
    inventoryList.addEventListener('click', (e) => {
        
        // الحالة الأولى: المستخدم ضغط على زر "قياس"
        if (e.target.classList.contains('size-btn')) {
            const button = e.target;
            // إيجاد "بطاقة المنتج" الأب
            const productCard = button.closest('.product-card');
            
            // إزالة التحديد من كل الأزرار داخل هذه البطاقة
            productCard.querySelectorAll('.size-btn').forEach(btn => {
                btn.classList.remove('selected');
            });
            
            // إضافة التحديد للزر الذي تم ضغطه
            button.classList.add('selected');
        }

        // الحالة الثانية: المستخدم ضغط على زر "إضافة للسلة"
        if (e.target.classList.contains('add-main-btn')) {
            const addButton = e.target;
            const productCard = addButton.closest('.product-card');
            
            // إيجاد القياس المختار
            const selectedSizeBtn = productCard.querySelector('.size-btn.selected');
            
            if (!selectedSizeBtn) {
                alert('الرجاء اختيار القياس أولاً');
                return;
            }
            
            // جلب البيانات من الأزرار
            const variant_id = selectedSizeBtn.dataset.variantId;
            const availableQuantity = parseInt(selectedSizeBtn.dataset.quantity);
            const size = selectedSizeBtn.dataset.size;
            const color = selectedSizeBtn.dataset.color;
            const productName = `${addButton.dataset.productId} - ${addButton.dataset.productName}`;

            // استدعاء الدالة القديمة نفسها لإضافة السلة
            addToCart(variant_id, productName, color, size, availableQuantity);
        }
    });
//////////////////////
// 2. دالة لإظهار أول 10 منتجات وإخفاء البقية
function applyDisplayLimit() {
    const productCards = document.querySelectorAll('.product-card');
    productCards.forEach((card, index) => {
        if (index < INITIAL_DISPLAY_LIMIT) {
            card.style.display = 'block';
        } else {
            card.style.display = 'none';
        }
    });
}



////////////////////////


// 3. إضافة خاصية البحث
const searchBar = document.getElementById('search-bar');

searchBar.addEventListener('input', () => {
    const searchTerm = searchBar.value.toLowerCase().trim();
    const productCards = document.querySelectorAll('.product-card');

    productCards.forEach(card => {
        // نبحث في الهيدر الذي يحتوي على الرقم والاسم
        const headerText = card.querySelector('.product-card-header').textContent.toLowerCase();
        
        if (headerText.includes(searchTerm)) {
            card.style.display = 'block'; // إظهار البطاقة
        } else {
            card.style.display = 'none'; // إخفاء البطاقة
        }
    });
});

//////////////////////


});



//////////////////////////
/////////////////////////

// استبدل الدالة القديمة بالكامل
async function loadInventory() {
    const { data: inventory, error } = await supabaseClient
        .from('inventory')
        .select(`
            variant_id,
            color,
            size,
            quantity,
            products ( product_id, product_name, image_url )
        `) // <-- 1. أضفنا image_url هنا
        .order('product_id');

    if (error) {
        console.error('خطأ في جلب المخزون:', error);
        return;
    }

    // تجميع المواد حسب رقم المادة
    const products = {};
    for (const item of inventory) {
        if (item.products) {
            const prod = item.products;
            if (!products[prod.product_id]) {
                products[prod.product_id] = {
                    name: prod.product_name,
                    image_url: prod.image_url, // <-- 2. خزنّا رابط الصورة هنا
                    variants: [] 
                };
            }
            products[prod.product_id].variants.push(item);
        }
    }

    const listElement = document.getElementById('inventory-list');
    listElement.innerHTML = ''; // تفريغ القائمة

    // بناء بطاقات المنتجات
    for (const productId in products) {
        const product = products[productId];
        
        const firstVariant = product.variants[0];
        
        // 3. نضع رابط الصورة في متغير (أو صورة افتراضية إذا كان فارغاً)
        const imageUrl = product.image_url 
            ? product.image_url 
            : 'https://via.placeholder.com/400x250.png?text=No+Image'; // صورة افتراضية

        let productHTML = `
            <div class="product-card" id="product-${productId}">
            
                <img src="${imageUrl}" alt="${product.name}" class="product-image">

                <div class="product-card-header">
                    ${productId} - ${product.name} (${firstVariant.color})
                </div>
                <div class="size-selector">
        `;

        // إضافة أزرار القياسات
        product.variants.forEach(variant => {
            const disabled = variant.quantity <= 0 ? 'disabled' : '';
            const quantityText = variant.quantity <= 0 ? ' (نفذ)' : '';

            productHTML += `
                <button 
                    class="size-btn" 
                    data-variant-id="${variant.variant_id}" 
                    data-quantity="${variant.quantity}"
                    data-color="${variant.color}"
                    data-size="${variant.size}"
                    ${disabled}>
                    ${variant.size}${quantityText}
                </button>
            `;
        });

        productHTML += `
                </div>
                <button class="add-main-btn" 
                    data-product-id="${productId}" 
                    data-product-name="${product.name}">
                    إضافة للسلة
                </button>
            </div>
        `;
        listElement.innerHTML += productHTML;
    }

    // 3. بعد تحميل كل المنتجات، قم بتطبيق الفلتر لإظهار أول 10 فقط
    applyDisplayLimit();
}

//////////////////////////
// ----------------------------------
// 3. إضافة مواد إلى السلة
// ----------------------------------
function addToCart(variant_id, name, color, size, availableQuantity) {
    // سؤال المندوب عن الكمية والسعر
    const quantity = parseInt(prompt("أدخل الكمية المطلوبة:", 1));
    if (!quantity || quantity <= 0) return; // إلغاء إذا لم يدخل كمية

    // التحقق من الكمية المتوفرة
    if (quantity > availableQuantity) {
        alert(`الكمية المطلوبة (${quantity}) أكبر من المتوفر (${availableQuantity})!`);
        return;
    }

    const price = parseFloat(prompt("أدخل سعر البيع للقطعة:", 0));
    if (!price || price < 0) return; // إلغاء إذا لم يدخل سعر

    cart.push({
        variant_id: variant_id,
        quantity_ordered: quantity,
        sale_price: price,
        // (للعرض فقط)
        display_name: `${name} (${color} - ${size})` 
    });
    
    updateCartDisplay();
}

function updateCartDisplay() {
    const cartElement = document.getElementById('cart');
    cartElement.innerHTML = '';
    
    cart.forEach((item, index) => {
        cartElement.innerHTML += `
            <div style="border-bottom: 1px solid #eee; padding: 5px; display: flex; justify-content: space-between;">
                <span>
                    ${item.display_name} - 
                    الكمية: ${item.quantity_ordered} - 
                    السعر: ${item.sale_price.toLocaleString()}
                </span>
                <button type="button" onclick="removeFromCart(${index})" style="background-color: #ff4d4d; color: white; border: none; cursor: pointer;">X</button>
            </div>
        `;
    });
}

function removeFromCart(index) {
    cart.splice(index, 1); // حذف العنصر من السلة
    updateCartDisplay();
}

// ----------------------------------
// 4. تثبيت الطلب عند الضغط على الزر
// ----------------------------------
document.getElementById('order-form').addEventListener('submit', async (e) => {
    e.preventDefault(); // منع إرسال الفورم بالطريقة التقليدية
    const submitButton = e.target.querySelector('button[type="submit"]');

    if (cart.length === 0) {
        alert("السلة فارغة!");
        return;
    }
    
    submitButton.disabled = true; // تعطيل الزر لمنع الضغط مرتين
    submitButton.innerText = 'جاري التثبيت...';

    // 1. أخذ بيانات الزبون
    const customerName = document.getElementById('customer-name').value;
    const customerPhone = document.getElementById('customer-phone').value;
    const customerAddress = document.getElementById('customer-address').value;

    // (نفترض أن المندوب 1 هو من سجل الدخول)
    const repId = 1; // **ملاحظة: يجب تغيير هذا لاحقاً ليعتمد على تسجيل الدخول الفعلي**

    // 2. إضافة الطلب الرئيسي (رأس الطلب)
    // تم تصحيح اسم المتغير هنا
    const { data: orderData, error: orderError } = await supabaseClient
        .from('orders') // <-- تم التصحيح هنا
        .insert({
            rep_id: repId,
            customer_name: customerName,
            customer_phone: customerPhone,
            customer_address: customerAddress
        })
        .select('order_id') // طلب إرجاع رقم الطلب الجديد
        .single(); // لأننا نتوقع نتيجة واحدة

    if (orderError) {
        console.error('خطأ في تثبيت الطلب:', orderError);
        alert('حدث خطأ أثناء تثبيت الطلب.');
        submitButton.disabled = false;
        submitButton.innerText = 'تثبيت الطلب';
        return;
    }

    const newOrderId = orderData.order_id;
    
    // 3. إضافة تفاصيل الطلب (المواد الموجودة في السلة)
    const orderItems = cart.map(item => ({
        order_id: newOrderId,
        variant_id: item.variant_id,
        quantity_ordered: item.quantity_ordered,
        sale_price: item.sale_price
    }));

    // تم تصحيح اسم المتغير هنا
    const { error: itemsError } = await supabaseClient
        .from('order_items') // <-- تم التصحيح هنا
        .insert(orderItems);

    if (itemsError) {
        console.error('خطأ في إضافة تفاصيل الطلب:', itemsError);
        alert('تم حفظ الطلب الرئيسي ولكن حدث خطأ في حفظ المواد.');
        submitButton.disabled = false;
        submitButton.innerText = 'تثبيت الطلب';
        return;
    }

    // 4. (الخطوة المحاسبية) تحديث المخزون
    // هذا الكود لا يقوم بتحديث المخزون بعد.
    // يجب أن نقوم بهذا في الخادم (Backend) لضمان الدقة.

    alert('تم تثبيت الطلب بنجاح!');
    
    // تفريغ الفورم والسلة
    cart = [];
    updateCartDisplay();
    document.getElementById('order-form').reset();
    
    // إعادة تحميل المخزون (لإظهار الكميات الجديدة بعد التحديث)
    loadInventory();
    
    submitButton.disabled = false;
    submitButton.innerText = 'تثبيت الطلب';
});