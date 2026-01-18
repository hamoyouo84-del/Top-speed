// ==========================================
// 1. إدارة قاعدة البيانات (LocalStorage)
// ==========================================
const TopSpeedDB = {
    save: (key, data) => localStorage.setItem('ts_final_' + key, JSON.stringify(data)),
    load: (key) => JSON.parse(localStorage.getItem('ts_final_' + key)) || [],
    clear: () => {
        if(confirm("⚠️ هل أنت متأكد من حذف جميع البيانات (الطلبات والمناديب والحسابات)؟")) {
            localStorage.clear();
            location.reload();
        }
    }
};

let drivers = TopSpeedDB.load('drivers');
let orders = TopSpeedDB.load('orders');

// ==========================================
// 2. نظام شاشة التحميل (Loader) - حل مشكلة 0%
// ==========================================
function initLoader() {
    const counterElement = document.getElementById('counter');
    const statusElement = document.getElementById('status');
    const loaderWrapper = document.getElementById('loaderWrapper');
    const mainSystem = document.getElementById('mainSystem');

    let count = 0;
    
    // دالة التحديث المتكررة
    const loadingInterval = setInterval(() => {
        // زيادة عشوائية لإعطاء إحساس بالتحميل الحقيقي
        let increment = Math.floor(Math.random() * 3) + 1;
        count += increment;

        if (count >= 100) {
            count = 100;
            clearInterval(loadingInterval);
            finishLoading();
        }

        if(counterElement) counterElement.innerText = count + '%';
        
        // تغيير نصوص الحالة
        if(statusElement) {
            if (count < 30) statusElement.innerText = "Initializing Core...";
            else if (count < 60) statusElement.innerText = "Loading Database...";
            else if (count < 90) statusElement.innerText = "Securing Connection...";
            else statusElement.innerText = "Welcome to Top Speed!";
        }
    }, 40); // سرعة التحديث (40 ملي ثانية)

    function finishLoading() {
        setTimeout(() => {
            if(loaderWrapper) {
                loaderWrapper.style.opacity = '0';
                loaderWrapper.style.transition = '0.5s';
            }
            setTimeout(() => {
                if(loaderWrapper) loaderWrapper.style.display = 'none';
                if(mainSystem) mainSystem.style.display = 'flex';
                document.body.style.overflow = 'auto';
                renderAll(); // عرض البيانات فور الدخول
            }, 500);
        }, 500);
    }
}

// تشغيل العداد فور تحميل الصفحة تماماً
window.addEventListener('load', initLoader);

// ==========================================
// 3. إدارة العمليات (المناديب والطلبات)
// ==========================================

// إضافة مندوب
function addNewDriver() {
    const name = document.getElementById('newDriverName').value.trim();
    const phone = document.getElementById('newDriverPhone').value.trim();

    if(!name || !phone) return alert("برجاء إدخال البيانات");

    drivers.push({
        name, phone, status: 'متاح',
        wallet: 0, bonus: 0, deductions: 0
    });

    TopSpeedDB.save('drivers', drivers);
    renderAll();
    alert("تم تفعيل المندوب ✅");
}

// إضافة أوردر وإرساله واتساب
function addNewOrder() {
    const rest = document.getElementById('restName').value.trim();
    const customer = document.getElementById('customerName').value.trim();
    const cPhone = document.getElementById('customerPhone').value.trim();
    const price = document.getElementById('orderPrice').value.trim();
    const addr = document.getElementById('orderAddress').value.trim();
    const dSelect = document.getElementById('driverSelect');

    if(!rest || !price || !dSelect.value) return alert("أكمل بيانات الأوردر");

    const dIndex = drivers.findIndex(d => d.name === dSelect.value);

    const newOrder = {
        id: Date.now(),
        rest, customer, cPhone, addr,
        price: parseFloat(price),
        driverName: drivers[dIndex].name,
        driverPhone: drivers[dIndex].phone,
        status: 'معلق'
    };

    orders.push(newOrder);
    drivers[dIndex].status = 'مشغول';

    TopSpeedDB.save('orders', orders);
    TopSpeedDB.save('drivers', drivers);
    renderAll();

    // إرسال واتساب
    const msg = `*طلب جديد TOP SPEED* 🚀%0A*المطعم:* ${rest}%0A*العميل:* ${customer}%0A*العنوان:* ${addr}%0A*المطلوب:* ${price}ج`;
    window.open(`https://api.whatsapp.com/send?phone=2${newOrder.driverPhone}&text=${msg}`, '_blank');
}

// تأكيد التسليم (الحسابات المالية)
function completeOrder(orderId) {
    const oIdx = orders.findIndex(o => o.id === orderId);
    if(oIdx === -1) return;

    if(confirm("تأكيد استلام المبلغ وإتمام الطلب؟")) {
        const dName = orders[oIdx].driverName;
        orders[oIdx].status = 'تم التسليم';

        const dIdx = drivers.findIndex(d => d.name === dName);
        if(dIdx !== -1) {
            drivers[dIdx].status = 'متاح';
            drivers[dIdx].wallet += 30; // حق المندوب
        }

        TopSpeedDB.save('orders', orders);
        TopSpeedDB.save('drivers', drivers);
        renderAll();
    }
}

// مكافأة أو خصم
function manualAdjustment(driverName, type) {
    const amount = prompt(`أدخل المبلغ للمندوب ${driverName}:`);
    if (amount && !isNaN(amount)) {
        const dIdx = drivers.findIndex(d => d.name === driverName);
        if (type === 'bonus') drivers[dIdx].bonus += parseFloat(amount);
        else drivers[dIdx].deductions += parseFloat(amount);
        
        TopSpeedDB.save('drivers', drivers);
        renderAll();
    }
}

// ==========================================
// 4. عرض البيانات (Render)
// ==========================================
function renderAll() {
    let totalIncome = 0;
    let myProfit = 0;
    let deliveriesCount = 0;

    // جدول الطلبات
    const tableBody = document.getElementById('ordersTableBody');
    if(tableBody) {
        tableBody.innerHTML = orders.map(o => {
            const isDone = o.status === 'تم التسليم';
            if(isDone) {
                totalIncome += o.price;
                myProfit += 8;
                deliveriesCount++;
            }
            return `
            <tr class="border-b bg-white text-sm">
                <td class="p-4 font-bold">${o.rest}</td>
                <td class="p-4">${o.customer}<br><small class="text-slate-400">${o.addr}</small></td>
                <td class="p-4 font-black text-blue-600 text-center">${o.price}ج</td>
                <td class="p-4 text-center font-bold text-slate-500">${o.driverName}</td>
                <td class="p-4 text-center">
                    ${isDone ? '<span class="text-green-600 font-bold">مكتمل ✅</span>' : 
                    `<button onclick="completeOrder(${o.id})" class="bg-blue-600 text-white px-3 py-1 rounded-lg text-xs font-bold shadow-md">تأكيد</button>`}
                </td>
            </tr>`;
        }).reverse().join('');
    }

    // جدول الخزنة
    const financeTable = document.getElementById('financeTableBody');
    if(financeTable) {
        financeTable.innerHTML = drivers.map(d => {
            const net = d.wallet + d.bonus - d.deductions;
            return `
            <tr class="border-b text-center text-sm">
                <td class="p-4 text-right font-bold">${d.name}</td>
                <td class="p-4 text-blue-600 font-bold">${d.wallet}ج</td>
                <td class="p-4 text-orange-600 font-bold">${d.bonus - d.deductions}ج</td>
                <td class="p-4 bg-slate-50 font-black">${net}ج</td>
            </tr>`;
        }).join('');
    }

    // تحديث الأرقام العلوية
    document.getElementById('dailyIncome').innerText = totalIncome.toLocaleString();
    document.getElementById('adminProfit').innerText = myProfit.toLocaleString();
    document.getElementById('financeAdminProfit').innerText = myProfit.toLocaleString();
    document.getElementById('totalDeliveries').innerText = deliveriesCount;

    // تحديث قائمة اختيار المندوب
    const dSelect = document.getElementById('driverSelect');
    if(dSelect) {
        dSelect.innerHTML = '<option value="" disabled selected>اختيار المندوب</option>' + 
            drivers.map(d => `<option value="${d.name}">${d.name} (${d.status})</option>`).join('');
    }

    // تحديث كروت المناديب (في الإدارة)
    const grid = document.getElementById('driversGrid');
    if(grid) {
        grid.innerHTML = drivers.map(d => `
            <div class="bg-white p-4 rounded-2xl shadow-sm border-r-4 ${d.status === 'متاح' ? 'border-green-500' : 'border-orange-500'}">
                <div class="flex justify-between items-center mb-3">
                    <div class="font-bold">${d.name}</div>
                    <div class="text-[9px] bg-slate-100 px-2 py-0.5 rounded">${d.status}</div>
                </div>
                <div class="flex gap-2">
                    <button onclick="manualAdjustment('${d.name}', 'bonus')" class="flex-1 bg-green-50 text-green-600 text-xs py-2 rounded-xl font-bold">+ مكافأة</button>
                    <button onclick="manualAdjustment('${d.name}', 'discount')" class="flex-1 bg-red-50 text-red-600 text-xs py-2 rounded-xl font-bold">- خصم</button>
                </div>
            </div>
        `).join('');
    }
}

// التبديل بين الأقسام
function showSection(id) {
    ['ordersSection', 'driversSection', 'financeSection'].forEach(s => {
        const el = document.getElementById(s);
        if(el) el.classList.toggle('hidden', s !== id + 'Section');
    });
}

