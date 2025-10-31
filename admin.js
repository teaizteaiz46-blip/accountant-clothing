// ----------------------------------
// 1. الاتصال بـ Supabase
// ----------------------------------
const SUPABASE_URL = 'https://xtsrtyqdwurfqqwsbqbf.supabase.co'; // ألصق الـ URL هنا
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh0c3J0eXFkd3VyZnFxd3NicWJmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE5MjM4NTMsImV4cCI6MjA3NzQ5OTg1M30.xjWM96SiY1g2AUF819aInHOry18Inf1r5iH9N4VyCbg'; // ألصق الـ Key هنا

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ----------------------------------
// 2. الكود الخاص بالتابات (للتنقل)
// ----------------------------------
function showTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
    
    document.getElementById(tabName).classList.add('active');
    document.querySelector(`.tab-button[onclick="showTab('${tabName}')"]`).classList.add('active');
}

// ----------------------------------
// 3. عند تحميل الصفحة
// ----------------------------------
document.addEventListener('DOMContentLoaded', () => {
    loadOrders();
    loadDashboard();
    document.getElementById('print-selected-btn').addEventListener('click', printSelectedOrders);
});

// ----------------------------------
// 4. جلب وعرض الطلبات
// ----------------------------------
async function loadOrders() {
    const newOrdersList = document.getElementById('new-orders-list');
    const processedOrdersList = document.getElementById('processed-orders-list');

    newOrdersList.innerHTML = 'جاري التحميل...';
    processedOrdersList.innerHTML = 'جاري التحميل...';

    // جلب كل الطلبات (مع تفاصيل المندوب المرتبط بها)
    const { data: orders, error } = await supabaseClient
        .from('orders')
        .select(`
            *,
            salesreps ( full_name )
        `)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('خطأ في جلب الطلبات:', error);
        newOrdersList.innerHTML = 'فشل تحميل الطلبات';
        processedOrdersList.innerHTML = '';
        return;
    }

    newOrdersList.innerHTML = '';
    processedOrdersList.innerHTML = '';

    // فلترة الطلبات
    const newOrders = orders.filter(o => o.order_status === 'جديد');
    const processedOrders = orders.filter(o => o.order_status === 'مجهز' || o.order_status === 'تم التوصيل');

    // عرض الطلبات الجديدة
   // عرض الطلبات الجديدة
    newOrders.forEach(order => {
        const orderEl = document.createElement('div');
        orderEl.className = 'order';
        
        orderEl.innerHTML = `
            <div class="order-header">
                
                <input type="checkbox" class="order-checkbox" data-order-id="${order.order_id}" style="margin-left: 10px; transform: scale(1.5);">
                <span>طلب #${order.order_id} - ${order.customer_name}</span>
                <span>(${new Date(order.created_at).toLocaleString()})</span>
            </div>
            <div class="order-details">
                <p>الهاتف: ${order.customer_phone}</p>
                <p>العنوان: ${order.customer_address}</p>
                <p>المندوب: ${order.salesreps ? order.salesreps.full_name : 'غير معروف'}</p>
                
                <button onclick="markAsProcessed(${order.order_id})">تحويل إلى (مجهز)</button>
                <button onclick="markAsDelivered(${order.order_id})">تحويل إلى (تم التوصيل)</button>
                
                <button onclick="printOrder(${order.order_id})">🖨️ طباعة (فردي)</button>
            </div>
        `;
        newOrdersList.appendChild(orderEl);
    });

    // عرض الطلبات المجهزة
    processedOrders.forEach(order => {
        const orderEl = document.createElement('div');
        orderEl.className = 'order';
        orderEl.innerHTML = `
            <div class="order-header">
                <span>طلب #${order.order_id} - ${order.customer_name}</span>
                <span>(${order.order_status})</span>
            </div>
        `;
        processedOrdersList.appendChild(orderEl);
    });
}

// ----------------------------------
// 5. تحديث حالة الطلبات
// ----------------------------------
async function markAsProcessed(orderId) {
    const { error } = await supabaseClient
        .from('orders')
        .update({ order_status: 'مجهز' })
        .eq('order_id', orderId);

    if (error) {
        alert('خطأ في تحديث الطلب');
    } else {
        alert('تم تجهيز الطلب');
        loadOrders(); // إعادة تحميل القوائم
    }
}

// دالة الطباعة (مكانها صحيح)
async function printOrder(orderId) {
    alert('جاري تجهيز البوليصة... يرجى الانتظار');

    // 1. جلب تفاصيل الطلب الأساسية (الزبون، العنوان)
    const { data: order, error: orderError } = await supabaseClient
        .from('orders')
        .select('order_id, customer_name, customer_phone, customer_address')
        .eq('order_id', orderId)
        .single();

    if (orderError) {
        alert('خطأ في جلب بيانات الطلب.');
        console.error(orderError);
        return;
    }

    // 2. جلب المواد داخل الطلب (الأهم)
    const { data: items, error: itemsError } = await supabaseClient
        .from('order_items')
        .select(`
            quantity_ordered,
            sale_price,
            inventory (
                color,
                size,
                products ( product_id, product_name )
            )
        `)
        .eq('order_id', orderId);

    if (itemsError) {
        alert('خطأ في جلب مواد الطلب.');
        console.error(itemsError);
        return;
    }

    // 3. تجهيز الـ HTML للبوليصة
    const printSlip = document.getElementById('print-slip');
    let totalSalePrice = 0;
    
    let slipHTML = `
        <div style="padding: 15px; border: 1px solid #000;">
            <h1>بوليصة تجهيز طلب</h1>
            <h2>رقم الطلب: #${order.order_id}</h2>
            <hr>
            <p><strong>اسم الزبون:</strong> ${order.customer_name}</p>
            <p><strong>رقم الهاتف:</strong> ${order.customer_phone}</p>
            <p><strong>العنوان:</strong> ${order.customer_address}</p>
            <hr>
            <h3>المواد المطلوبة:</h3>
    `;

    // إضافة المواد
    items.forEach(item => {
        const product = item.inventory.products;
        const variant = item.inventory;
        totalSalePrice += (item.sale_price * item.quantity_ordered);
        
        slipHTML += `
            <div style="border-bottom: 1px dashed #ccc; padding: 10px 0;">
                <strong style="font-size: 1.2em;">${product.product_id} - ${product.product_name}</strong><br>
                - القياس: ${variant.size} | اللون: ${variant.color}<br>
                - الكمية المطلوبة: <strong>${item.quantity_ordered}</strong>
            </div>
        `;
    });

    // إضافة الإجمالي والسعر
    slipHTML += `
            <hr>
            <h2 style="text-align: center;">المبلغ الإجمالي للطلب: ${totalSalePrice.toLocaleString()} دينار</h2>
            <p style="text-align: center; margin-top: 20px;">تاريخ الطباعة: ${new Date().toLocaleString()}</p>
        </div>
    `;

    // 4. وضع الـ HTML في الحاوية المخفية
    const slipContainer = document.getElementById('print-slip-container');
    slipContainer.innerHTML = slipHTML;
    
    // 5. إظهار الحاوية (مؤقتاً) واستدعاء الطباعة
    slipContainer.style.display = 'block';
    window.print();
    
    // 6. إخفاء الحاوية بعد انتهاء الطباعة
    slipContainer.style.display = 'none';
}

async function markAsDelivered(orderId) {
    const { error } = await supabaseClient
        .from('orders')
        .update({ order_status: 'تم التوصيل' })
        .eq('order_id', orderId);

    if (error) {
        alert('خطأ في تحديث الطلب');
    } else {
        alert('تم توصيل الطلب');
        loadOrders(); // إعادة تحميل القوائم
    }
}

// ----------------------------------
// 6. جلب بيانات الأرباح (باستخدام الدوال)
// ----------------------------------
async function loadDashboard() {
    // 1. جلب ملخص الأرباح للشهر الحالي
    const today = new Date();
    const startDate = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();
    const endDate = new Date().toISOString();

    const { data: summary, error: summaryError } = await supabaseClient
        .rpc('get_profit_summary', { 
            start_date: startDate, 
            end_date: endDate 
        })
        .single(); // لأننا نتوقع نتيجة واحدة

    if (summaryError) console.error('خطأ في جلب ملخص الأرباح:', summaryError);
    if (summary) {
        document.getElementById('total-sales').innerText = summary.total_sales.toLocaleString();
        document.getElementById('total-cost').innerText = summary.total_cost.toLocaleString();
        document.getElementById('total-profit').innerText = summary.total_profit.toLocaleString();
    }

    // 2. جلب تفاصيل ربح كل طلب (لأغراض العرض)
    const { data: deliveredOrders } = await supabaseClient
        .from('orders')
        .select('order_id, customer_name')
        .eq('order_status', 'تم التوصيل')
        .limit(10);
        
    const profitListEl = document.getElementById('order-profit-list');
    profitListEl.innerHTML = '';

    for (const order of deliveredOrders) {
        // استدعاء الدالة لكل طلب
        const { data: profit, error: profitError } = await supabaseClient
            .rpc('get_order_profit', { order_id_input: order.order_id })
            .single();
        
        if (profitError) console.error('خطأ في حساب ربح الطلب', profitError);

        const profitEl = document.createElement('div');
        profitEl.className = 'order';
        profitEl.innerHTML = `
            <span>طلب #${order.order_id} (${order.customer_name})</span>
            <strong> - صافي الربح: ${profit.toLocaleString()} دينار</strong>
        `;
        profitListEl.appendChild(profitEl);
    }
    
    // **********************************
    // تم حذف الكود الخاطئ من هنا
    // **********************************
}
////////////////
// دالة لطباعة الطلبات المحددة دفعة واحدة
async function printSelectedOrders() {
    // 1. إيجاد كل الـ checkboxes المحددة
    const selectedCheckboxes = document.querySelectorAll('.order-checkbox:checked');
    
    if (selectedCheckboxes.length === 0) {
        alert('الرجاء تحديد طلب واحد على الأقل للطباعة.');
        return;
    }

    alert(`جاري تجهيز ${selectedCheckboxes.length} بوليصة... يرجى الانتظار`);
    
    let combinedSlipHTML = ''; // سنجمع كل البوليصات هنا
    const slipContainer = document.getElementById('print-slip-container');
    slipContainer.innerHTML = ''; // تفريغ الحاوية

    // 2. المرور على كل طلب محدد وجلب بياناته
    for (const checkbox of selectedCheckboxes) {
        const orderId = checkbox.dataset.orderId;
        
        // --- (هذا الكود منسوخ من دالة printOrder) ---
        const { data: order, error: orderError } = await supabaseClient
            .from('orders')
            .select('order_id, customer_name, customer_phone, customer_address')
            .eq('order_id', orderId)
            .single();
        
        const { data: items, error: itemsError } = await supabaseClient
            .from('order_items')
            .select(`
                quantity_ordered,
                sale_price,
                inventory (
                    color,
                    size,
                    products ( product_id, product_name )
                )
            `)
            .eq('order_id', orderId);

        if (orderError || itemsError) {
            console.error(`Failed to fetch order ${orderId}`, orderError || itemsError);
            // إضافة صفحة خطأ في الطباعة
            combinedSlipHTML += `<div class="print-slip-page"><h2>فشل تحميل طلب #${orderId}</h2></div>`;
            continue; // الانتقال للطلب التالي
        }
        
        // --- (تجهيز الـ HTML بنفس الطريقة) ---
        let totalSalePrice = 0;
        
        // 4. التغيير الأهم: إضافة كلاس "print-slip-page"
        let slipHTML = `
            <div class="print-slip-page"> 
                <div style="padding: 15px; border: 1px solid #000;">
                    <h1>بوليصة تجهيز طلب</h1>
                    <h2>رقم الطلب: #${order.order_id}</h2>
                    <hr>
                    <p><strong>اسم الزبون:</strong> ${order.customer_name}</p>
                    <p><strong>رقم الهاتف:</strong> ${order.customer_phone}</p>
                    <p><strong>العنوان:</strong> ${order.customer_address}</p>
                    <hr>
                    <h3>المواد المطلوبة:</h3>
        `;

        items.forEach(item => {
            const product = item.inventory.products;
            const variant = item.inventory;
            totalSalePrice += (item.sale_price * item.quantity_ordered);
            
            slipHTML += `
                <div style="border-bottom: 1px dashed #ccc; padding: 10px 0;">
                    <strong style="font-size: 1.2em;">${product.product_id} - ${product.product_name}</strong><br>
                    - القياس: ${variant.size} | اللون: ${variant.color}<br>
                    - الكمية المطلوبة: <strong>${item.quantity_ordered}</strong>
                </div>
            `;
        });

        slipHTML += `
                    <hr>
                    <h2 style="text-align: center;">المبلغ الإجمالي للطلب: ${totalSalePrice.toLocaleString()} دينار</h2>
                    <p style="text-align: center; margin-top: 20px;">تاريخ الطباعة: ${new Date().toLocaleString()}</p>
                </div>
            </div> `;
        // --- (نهاية كود الـ HTML) ---
        
        combinedSlipHTML += slipHTML; // إضافة البوليصة إلى البوليصات المجمعة
    }
    
    // 5. الطباعة (مرة واحدة فقط)
    slipContainer.innerHTML = combinedSlipHTML;
    slipContainer.style.display = 'block';
    window.print();
    slipContainer.style.display = 'none';
}