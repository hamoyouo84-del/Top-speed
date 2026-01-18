// ==========================================
// 1. قاعدة البيانات (LocalStorage)
// ==========================================
const TopSpeedDB = {
    save: (key, data) => localStorage.setItem('ts_pro_' + key, JSON.stringify(data)),
    load: (key) => JSON.parse(localStorage.getItem('ts_pro_' + key)) || [],
    clear: () => {
        if(confirm("هل تريد مسح كافة البيانات وتصفير السيستم؟")) {
            localStorage.clear();
            location.reload();
        }
    }
};

let drivers = TopSpeedDB.load('drivers');
let orders = TopSpeedDB.load('orders');

// ==========================================
// 2. نظام التحميل (Loader)
// ==========================================
function initLoader() {
    const counterElement = document.getElementById('counter');
    const statusElement = document.getElementById('status');
    const loaderWrapper = document.getElementById('loaderWrapper');
    const mainSystem = document.getElementById('mainSystem');

    let count = 0;
    const interval = setInterval(() => {
        count += Math.floor(Math.random() * 4) + 1;
        if (count >= 100) {
            count = 100;
            clearInterval(interval);
            setTimeout(() => {
                loaderWrapper.style.display = 'none';
                mainSystem.style.display = 'flex';
                renderAll();
            }, 500);
        }
        if(counterElement) counterElement.innerText = count + '%';
    }, 30);
}
window.addEventListener('load', initLoader);

// ==========================================
// 3. إدارة المناديب
// ==========================================
function addNewDriver() {
    const name = document.getElementById('newDriverName').value.trim();
    const phone = document.getElementById('newDriverPhone').value.trim();

    if(!name || !phone) return alert("ادخل بيانات المندوب كاملة");

    drivers.push({
        name, phone, status: 'متاح',
        wallet: 0, bonus: 0, deductions: 0
    });

    TopSpeedDB.save('drivers', drivers);
    document.getElementById('newDriverName').value = '';
    document.getElementById('newDriverPhone').value = '';
    renderAll();
    alert("تم تفعيل المندوب ✅");
}

// ==========================================
// 4. إدارة الأوردرات والحسابات (المنطق المطلوب)
// ==========================================
function addNewOrder() {
    const rest = document.getElementById('restName').value.trim();
    const customer = document.getElementById('customerName').value.trim();
    const price = parseFloat(document.getElementById('orderPrice').value);
    const addr = document.getElementById('orderAddress').value.trim();
    const dName = document.getElementById('driverSelect').value;

    if(!rest || !price || !dName) return alert("أكمل بيانات الأوردر واختار المندوب");

    const newOrder = {
        id: Date.now(),
        rest, customer, price, addr,
        driverName: dName,
        status: 'قيد التنفيذ'
    };

    orders.push(newOrder);
    TopSpeedDB.save('orders', orders);
    renderAll();

    // رسالة واتساب المندوب
    const driver = drivers.find(d => d.name === dName);
    const msg = `*طلب جديد TOP SPEED* 🚀%0A*المطعم:* ${rest}%0A*المبلغ:* ${price}ج%0A*العنوان:* ${addr}`;
    window.open(`https://api.whatsapp.com/send?phone=2${driver.phone}&text=${msg}`, '_blank');
}

// دالة تأكيد التسليم وتوزيع المبالغ
function completeOrder(orderId) {
    const oIdx = orders.findIndex(o => o.id === orderId);
    if(oIdx === -1) return;

    if(confirm(`تأكيد استلام ${orders[oIdx].price}ج وتوزيع الحسابات؟`)) {
        const order = orders[oIdx];
        order.status = 'تم التسليم';

        // حساباتك المطلوبة:
        const driverIdx = drivers.findIndex(d => d.name === order.driverName);
        if(driverIdx !== -1) {
            drivers[driverIdx].wallet += 30; // 30ج للمندوب ثابته
        }

        TopSpeedDB.save('orders', orders);
        TopSpeedDB.save('drivers', drivers);
        renderAll();
        
        // حساب المطعم (للعلم فقط في التنبيه)
        const restBalance = order.price - 38; 
        alert(`تم التسليم! ✅\nالمندوب: +30ج\nأرباحك: +8ج\nالمطعم: +${restBalance}ج`);
    }
}

// ==========================================
// 5. العرض والتحديث (Render)
// ==========================================
function renderAll() {
    let totalCollected = 0;
    let totalAdminProfit = 0;
    let deliveries = 0;

    // تحديث جدول الأوردرات
    const tableBody = document.getElementById('ordersTableBody');
    if(tableBody) {
        tableBody.innerHTML = orders.map(o => {
            const isDone = o.status === 'تم التسليم';
            if(isDone) {
                totalCollected += o.price;
                totalAdminProfit += 8; // 8ج لكل أوردر للأدمن
                deliveries++;
            }
            return `
            <tr class="border-b bg-white">
                <td class="p-4 font-bold text-slate-800">${o.rest}</td>
                <td class="p-4 text-xs">${o.customer || '---'}<br><small class="text-slate-400">${o.addr}</small></td>
                <td class="p-4 text-center font-black text-blue-600">${o.price}ج</td>
                <td class="p-4 text-center font-bold text-slate-500">${o.driverName}</td>
                <td class="p-4 text-center">
                    ${isDone ? 
                    '<span class="text-green-600 font-bold">تم التسليم ✅</span>' : 
                    `<button onclick="completeOrder(${o.id})" class="bg-blue-600 text-white px-4 py-1.5 rounded-xl text-xs font-bold shadow-md hover:bg-green-600">تأكيد الاستلام</button>`}
                </td>
            </tr>`;
        }).reverse().join('');
    }

    // تحديث الخزنة
    const financeTable = document.getElementById('financeTableBody');
    if(financeTable) {
        financeTable.innerHTML = drivers.map(d => `
            <tr class="border-b text-center">
                <td class="p-4 text-right font-bold">${d.name}</td>
                <td class="p-4 text-blue-600 font-bold">30ج × ${d.wallet/30} أوردر</td>
                <td class="p-4 text-orange-600 font-bold">${d.bonus - d.deductions}ج</td>
                <td class="p-4 bg-slate-50 font-black">${d.wallet + d.bonus - d.deductions}ج</td>
            </tr>
        `).join('');
    }

    // تحديث الأرقام العلوية
    if(document.getElementById('dailyIncome')) document.getElementById('dailyIncome').innerText = totalCollected;
    if(document.getElementById('adminProfit')) document.getElementById('adminProfit').innerText = totalAdminProfit;
    if(document.getElementById('financeAdminProfit')) document.getElementById('financeAdminProfit').innerText = totalAdminProfit;
    if(document.getElementById('totalDeliveries')) document.getElementById('totalDeliveries').innerText = deliveries;

    // تحديث قائمة الاختيار
    const dSelect = document.getElementById('driverSelect');
    if(dSelect) {
        dSelect.innerHTML = '<option value="" disabled selected>اختيار المندوب</option>' + 
            drivers.map(d => `<option value="${d.name}">${d.name}</option>`).join('');
    }

    // تحديث كروت المناديب
    const grid = document.getElementById('driversGrid');
    if(grid) {
        grid.innerHTML = drivers.map(d => `
            <div class="bg-white p-4 rounded-2xl shadow-sm border-r-4 border-blue-500">
                <div class="font-bold mb-2">${d.name}</div>
                <div class="flex gap-2">
                    <button onclick="manualAdjustment('${d.name}', 'bonus')" class="flex-1 bg-green-50 text-green-600 text-[10px] py-2 rounded-xl font-bold">+ مكافأة</button>
                    <button onclick="manualAdjustment('${d.name}', 'discount')" class="flex-1 bg-red-50 text-red-600 text-[10px] py-2 rounded-xl font-bold">- خصم</button>
                </div>
            </div>
        `).join('');
    }
}

function manualAdjustment(name, type) {
    const val = prompt("ادخل المبلغ:");
    if(val && !isNaN(val)) {
        const idx = drivers.findIndex(d => d.name === name);
        if(type === 'bonus') drivers[idx].bonus += parseFloat(val);
        else drivers[idx].deductions += parseFloat(val);
        TopSpeedDB.save('drivers', drivers);
        renderAll();
    }
}

function showSection(id) {
    ['ordersSection', 'driversSection', 'financeSection'].forEach(s => {
        document.getElementById(s).classList.toggle('hidden', s !== id + 'Section');
    });
}

