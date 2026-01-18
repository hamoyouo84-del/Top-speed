// 1. إدارة قاعدة البيانات المحلية (Local Storage)
const TopSpeedDB = {
    // نستخدم نسخة v2 لضمان عدم تداخل البيانات القديمة مع النظام الجديد
    save: (key, data) => localStorage.setItem('ts_v2_' + key, JSON.stringify(data)),
    load: (key) => JSON.parse(localStorage.getItem('ts_v2_' + key)) || [],
    clear: () => {
        if(confirm("⚠️ تحذير: هل تريد مسح كافة بيانات النظام (الطلبات، المناديب، الحسابات)؟")) {
            localStorage.clear();
            location.reload();
        }
    }
};

let drivers = TopSpeedDB.load('drivers');
let orders = TopSpeedDB.load('orders');

// 2. نظام شاشة التحميل (Hacker Loader)
const counterElement = document.getElementById('counter');
const statusElement = document.getElementById('status');
const loaderWrapper = document.getElementById('loaderWrapper');
const mainSystem = document.getElementById('mainSystem');

let count = 0;

function updateLoader() {
    if (count < 100) {
        // زيادة عشوائية للعداد لمحاكاة التحميل الحقيقي
        let increment = (Math.random() > 0.8) ? 2 : 1;
        count = Math.min(count + increment, 100);
        
        if(counterElement) counterElement.innerText = count + '%';

        // تغيير نصوص الحالة بناءً على التقدم
        if(statusElement) {
            if (count < 30) statusElement.innerText = "System Booting...";
            else if (count < 70) statusElement.innerText = "Verifying Protocols...";
            else if (count < 95) statusElement.innerText = "Optimizing Database...";
            else statusElement.innerText = "Finalizing...";
        }

        // سرعة متغيرة للعداد
        let speed = Math.floor(Math.random() * 50) + 20;
        if (count > 95) speed = 200; // يبطئ في النهاية للتشويق

        setTimeout(updateLoader, speed);
    } else {
        finishLoading();
    }
}

function finishLoading() {
    if(statusElement) statusElement.innerText = "ACCESS GRANTED";
    
    setTimeout(() => {
        if(loaderWrapper) loaderWrapper.style.display = 'none';
        if(mainSystem) mainSystem.style.display = 'flex';
        document.body.style.overflow = 'auto'; // السماح بالتمرير بعد التحميل
        renderAll(); // تشغيل النظام وعرض البيانات
    }, 800);
}

// تشغيل العداد فور فتح الصفحة
window.onload = updateLoader;

// 3. إدارة المناديب
function addNewDriver() {
    const name = document.getElementById('newDriverName').value.trim();
    const phone = document.getElementById('newDriverPhone').value.trim();
    
    if(!name || !phone) return alert("الرجاء إدخال اسم المندوب ورقم الواتساب");

    drivers.push({ 
        name, 
        phone, 
        status: 'متاح',
        wallet: 0,      // رصيد الـ 30ج
        bonus: 0,       // مكافآت
        deductions: 0   // خصومات
    });
    
    TopSpeedDB.save('drivers', drivers);
    alert("تمت إضافة المندوب بنجاح ✅");
    
    // تصفير الحقول
    document.getElementById('newDriverName').value = '';
    document.getElementById('newDriverPhone').value = '';
    renderAll();
}

// 4. إدارة الطلبات والواتساب
function addNewOrder() {
    const rest = document.getElementById('restName').value.trim();
    const customer = document.getElementById('customerName').value.trim();
    const cPhone = document.getElementById('customerPhone').value.trim();
    const price = document.getElementById('orderPrice').value.trim();
    const addr = document.getElementById('orderAddress').value.trim();
    const dSelect = document.getElementById('driverSelect');

    if(!rest || !price || !dSelect.value) return alert("أكمل البيانات واختار المندوب أولاً");

    const dIndex = drivers.findIndex(d => d.name === dSelect.value);
    
    const newOrder = {
        id: Date.now(),
        rest, customer, cPhone, price: parseFloat(price), addr,
        driverName: drivers[dIndex].name,
        driverPhone: drivers[dIndex].phone,
        status: 'معلق'
    };

    orders.push(newOrder);
    drivers[dIndex].status = 'مشغول';
    
    TopSpeedDB.save('orders', orders);
    TopSpeedDB.save('drivers', drivers);
    renderAll();

    // رسالة الواتساب الاحترافية
    const msg = `*طلب جديد TOP SPEED* 🚀%0A%0A` +
                `*المطعم:* ${newOrder.rest}%0A` +
                `*العميل:* ${newOrder.customer}%0A` +
                `*المبلغ:* ${newOrder.price} ج%0A` +
                `*العنوان:* ${newOrder.addr}`;

    // فتح الواتساب في نافذة جديدة (الحل الأمثل للتابلت)
    window.open(`https://api.whatsapp.com/send?phone=2${newOrder.driverPhone}&text=${msg}`, '_blank');
}

// 5. تأكيد التسليم وتوزيع الأرباح
function completeOrder(orderId) {
    const oIdx = orders.findIndex(o => o.id === orderId);
    if(oIdx === -1) return;

    if(confirm(`تأكيد استلام ${orders[oIdx].price}ج وإتمام الطلب؟`)) {
        const driverName = orders[oIdx].driverName;
        orders[oIdx].status = 'تم التسليم';

        const dIdx = drivers.findIndex(d => d.name === driverName);
        if(dIdx !== -1) {
            drivers[dIdx].status = 'متاح';
            drivers[dIdx].wallet += 30; // إضافة حق المندوب
        }

        TopSpeedDB.save('orders', orders);
        TopSpeedDB.save('drivers', drivers);
        renderAll();
    }
}

// 6. المكافآت والخصومات
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

// 7. تحديث الواجهة (Render)
function renderAll() {
    let totalCollected = 0;
    let totalAdminProfit = 0;
    let finishedCount = 0;

    // تحديث جدول الطلبات
    const tableBody = document.getElementById('ordersTableBody');
    if(tableBody) {
        tableBody.innerHTML = orders.map(o => {
            if (o.status === 'تم التسليم') {
                totalCollected += o.price;
                totalAdminProfit += 8;
                finishedCount++;
            }
            return `
            <tr class="border-b bg-white text-sm">
                <td class="p-4 font-bold text-slate-700">${o.rest}</td>
                <td class="p-4">${o.customer}<br><small class="text-slate-400">${o.addr}</small></td>
                <td class="p-4 text-center font-black text-blue-600">${o.price}ج</td>
                <td class="p-4 text-center font-bold text-slate-500">${o.driverName}</td>
                <td class="p-4 text-center">
                    ${o.status === 'تم التسليم' 
                        ? '<span class="text-green-600 font-black">مكتمل ✅</span>' 
                        : `<button onclick="completeOrder(${o.id})" class="bg-blue-600 text-white px-3 py-1 rounded-lg shadow-sm">تأكيد</button>`}
                </td>
            </tr>`;
        }).reverse().join('');
    }

    // تحديث الخزنة
    const financeTable = document.getElementById('financeTableBody');
    if(financeTable) {
        financeTable.innerHTML = drivers.map(d => {
            const net = d.wallet + d.bonus - d.deductions;
            return `
            <tr class="border-b text-center text-sm">
                <td class="p-4 text-right font-bold">${d.name}</td>
                <td class="p-4 text-blue-600 font-bold">${d.wallet}ج</td>
                <td class="p-4 text-orange-600">${d.bonus - d.deductions}ج</td>
                <td class="p-4 font-black bg-slate-50">${net}ج</td>
            </tr>`;
        }).join('');
    }

    // تحديث الأرقام والعدادات
    if(document.getElementById('dailyIncome')) document.getElementById('dailyIncome').innerText = totalCollected.toLocaleString();
    if(document.getElementById('adminProfit')) document.getElementById('adminProfit').innerText = totalAdminProfit.toLocaleString();
    if(document.getElementById('financeAdminProfit')) document.getElementById('financeAdminProfit').innerText = totalAdminProfit.toLocaleString();
    if(document.getElementById('totalDeliveries')) document.getElementById('totalDeliveries').innerText = finishedCount;

    // تحديث قائمة المناديب في الإضافة
    const dSelect = document.getElementById('driverSelect');
    if(dSelect) {
        dSelect.innerHTML = '<option value="" disabled selected>اختيار المندوب</option>' + 
            drivers.map(d => `<option value="${d.name}">${d.name} (${d.status})</option>`).join('');
    }

    // تحديث كروت المناديب
    const grid = document.getElementById('driversGrid');
    if(grid) {
        grid.innerHTML = drivers.map(d => `
            <div class="bg-white p-4 rounded-2xl shadow-sm border-r-4 ${d.status === 'متاح' ? 'border-green-500' : 'border-orange-500'}">
                <div class="flex justify-between items-center mb-3">
                    <div class="font-bold">${d.name}</div>
                    <div class="text-[10px] bg-slate-100 px-2 py-1 rounded">${d.status}</div>
                </div>
                <div class="flex gap-2">
                    <button onclick="manualAdjustment('${d.name}', 'bonus')" class="flex-1 bg-green-50 text-green-600 text-xs py-2 rounded-lg font-bold">+ مكافأة</button>
                    <button onclick="manualAdjustment('${d.name}', 'discount')" class="flex-1 bg-red-50 text-red-600 text-xs py-2 rounded-lg font-bold">- خصم</button>
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
