// 1. إدارة البيانات (Local Storage)
const TopSpeedDB = {
    save: (key, data) => localStorage.setItem('ts_' + key, JSON.stringify(data)),
    load: (key) => JSON.parse(localStorage.getItem('ts_' + key)) || [],
    clear: () => {
        if(confirm("هل تريد تصفير جميع بيانات النظام؟ (سيتم حذف كل شيء)")) {
            localStorage.clear();
            location.reload();
        }
    }
};

let drivers = TopSpeedDB.load('drivers');
let orders = TopSpeedDB.load('orders');

// 2. شاشة التحميل
const counterElement = document.getElementById('counter');
const mainSystem = document.getElementById('mainSystem');
const loaderWrapper = document.getElementById('loaderWrapper');
let count = 0;

function updateLoader() {
    if (count < 100) {
        let increment = (Math.random() > 0.8) ? 2 : 1;
        count = Math.min(count + increment, 100);
        counterElement.innerText = count + '%';
        let speed = Math.floor(Math.random() * (100 - 30 + 1) + 30);
        if (count > 95) speed = 200;
        setTimeout(updateLoader, speed);
    } else {
        finishLoading();
    }
}

function finishLoading() {
    loaderWrapper.style.display = 'none';
    mainSystem.style.display = 'flex';
    document.body.classList.remove('overflow-hidden');
    renderAll();
}
setTimeout(updateLoader, 500);

// 3. إضافة مندوب جديد (مع إضافة حقل الخصومات)
function addNewDriver() {
    const name = document.getElementById('newDriverName').value.trim();
    const phone = document.getElementById('newDriverPhone').value.trim();
    const code = document.getElementById('newDriverCode').value.trim();

    if(!name || !phone || !code) return alert("برجاء إدخال بيانات المندوب كاملة");

    drivers.push({ 
        name, 
        phone, 
        code, 
        status: 'متاح',
        totalDiscounts: 0 // حقل الخصومات الجديد
    });
    
    TopSpeedDB.save('drivers', drivers);
    document.getElementById('newDriverName').value = '';
    document.getElementById('newDriverPhone').value = '';
    document.getElementById('newDriverCode').value = '';
    renderAll();
}

// 4. إضافة أوردر وإرساله واتساب
function addNewOrder() {
    const rest = document.getElementById('restName').value.trim();
    const type = document.getElementById('orderType').value.trim() || 'أوردر عام';
    const customer = document.getElementById('customerName').value.trim();
    const cPhone = document.getElementById('customerPhone').value.trim();
    const addr = document.getElementById('orderAddress').value.trim();
    const price = document.getElementById('orderPrice').value.trim();
    const dSelect = document.getElementById('driverSelect');

    if(!rest || !addr || !price || !dSelect.value) return alert("أكمل البيانات الأساسية واختار المندوب");

    const dIndex = drivers.findIndex(d => d.name === dSelect.value);
    const selectedDriver = drivers[dIndex];

    const newOrder = {
        id: Date.now(),
        rest, type, customer, cPhone, addr,
        price: parseFloat(price),
        driverName: selectedDriver.name,
        driverPhone: selectedDriver.phone,
        status: 'معلق'
    };

    orders.push(newOrder);
    drivers[dIndex].status = 'مشغول';
    
    TopSpeedDB.save('orders', orders);
    TopSpeedDB.save('drivers', drivers);
    
    ['restName', 'orderType', 'customerName', 'customerPhone', 'orderAddress', 'orderPrice'].forEach(id => {
        document.getElementById(id).value = '';
    });

    renderAll();

    const msg = `*طلب جديد من TOP SPEED* 🚀%0A%0A` +
                `*🏪 المطعم:* ${newOrder.rest}%0A` +
                `*📦 النوع:* ${newOrder.type}%0A` +
                `*👤 العميل:* ${newOrder.customer}%0A` +
                `*📞 تليفون:* ${newOrder.cPhone}%0A` +
                `*📍 العنوان:* ${newOrder.addr}%0A` +
                `*💰 المطلوب:* ${newOrder.price} EGP`;
    
    window.location.href = `https://api.whatsapp.com/send?phone=2${newOrder.driverPhone}&text=${msg}`;
}

// 5. وظيفة إضافة خصم لمندوب
function applyDiscount(driverName) {
    const amount = prompt(`أدخل قيمة الخصم/الجزاء للمندوب (${driverName}):`);
    if (amount !== null && !isNaN(amount) && amount !== "") {
        const dIdx = drivers.findIndex(d => d.name === driverName);
        if (dIdx !== -1) {
            drivers[dIdx].totalDiscounts = (drivers[dIdx].totalDiscounts || 0) + parseFloat(amount);
            TopSpeedDB.save('drivers', drivers);
            renderAll();
            alert(`تم تسجيل خصم بقيمة ${amount} جنيه للمندوب ${driverName}`);
        }
    }
}

// 6. تأكيد التسليم
function completeOrder(orderId) {
    const oIdx = orders.findIndex(o => o.id === orderId);
    if(oIdx === -1) return;

    const driverName = orders[oIdx].driverName;
    orders[oIdx].status = 'تم التسليم';

    const dIdx = drivers.findIndex(d => d.name === driverName);
    if(dIdx !== -1) drivers[dIdx].status = 'متاح';

    TopSpeedDB.save('orders', orders);
    TopSpeedDB.save('drivers', drivers);
    renderAll();
}

// 7. عرض البيانات وتحديث الحسابات
function renderAll() {
    const tableBody = document.getElementById('ordersTableBody');
    const filterValue = document.getElementById('filterDriver')?.value || 'all';
    
    let totalAdminProfit = 0; // إجمالي الـ 8 جنيهات
    let totalCollected = 0;   // إجمالي مبالغ الأوردرات

    let filteredOrders = orders;
    if (filterValue !== 'all') filteredOrders = orders.filter(o => o.driverName === filterValue);

    tableBody.innerHTML = filteredOrders.map(o => {
        if (o.status === 'تم التسليم') {
            totalAdminProfit += 8;
            totalCollected += o.price;
        }

        return `
        <tr class="border-b bg-white hover:bg-slate-50">
            <td class="p-4"><b>${o.rest}</b><br><small class="text-blue-500">${o.type}</small></td>
            <td class="p-4 text-xs font-bold">
                ${o.customer}<br><span class="text-green-600">${o.cPhone}</span><br>
                <small class="text-slate-400">${o.addr}</small>
            </td>
            <td class="p-4 font-black">${o.price} EGP</td>
            <td class="p-4 text-xs font-bold">${o.driverName}</td>
            <td class="p-4 text-center">
                ${o.status === 'تم التسليم' 
                    ? `<span class="text-green-600 font-black text-[10px]">تم التسليم ✅</span>`
                    : `<button onclick="completeOrder(${o.id})" class="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-[10px]">تأكيد</button>`
                }
            </td>
        </tr>`;
    }).reverse().join('');

    // تحديث شبكة المناديب مع حساب "صافي المندوب"
    const grid = document.getElementById('driversGrid');
    grid.innerHTML = drivers.map(d => {
        // حساب ما يستحقه المندوب من أوردراته (المبلغ - 8 جنيه لكل أوردر)
        const driverFinishedOrders = orders.filter(o => o.driverName === d.name && o.status === 'تم التسليم');
        const driverRawEarn = driverFinishedOrders.reduce((sum, o) => sum + (o.price - 8), 0);
        const netBalance = driverRawEarn - (d.totalDiscounts || 0);

        return `
        <div class="bg-white p-4 rounded-xl shadow-sm border-r-4 ${d.status === 'متاح' ? 'border-green-500' : 'border-orange-500'}">
            <div class="flex justify-between items-center mb-2">
                <div><div class="font-bold">${d.name}</div><small class="text-slate-400">${d.phone}</small></div>
                <div class="text-[10px] font-black ${d.status === 'متاح' ? 'text-green-500' : 'text-orange-500'}">${d.status}</div>
            </div>
            <div class="border-t pt-2 mt-2 space-y-1">
                <div class="flex justify-between text-[11px]"><span>صافي رصيد المندوب:</span> <span class="font-bold text-blue-600">${netBalance} ج</span></div>
                <div class="flex justify-between text-[11px] text-red-500 font-bold"><span>إجمالي الخصومات:</span> <span>-${d.totalDiscounts || 0} ج</span></div>
                <button onclick="applyDiscount('${d.name}')" class="w-full mt-2 py-1 bg-red-50 text-red-600 text-[10px] font-bold rounded-lg border border-red-100 hover:bg-red-100 transition">إضافة خصم / جزاء</button>
            </div>
        </div>`;
    }).join('');

    // تحديث القوائم
    const options = drivers.map(d => `<option value="${d.name}">${d.name} (${d.status})</option>`).join('');
    document.getElementById('driverSelect').innerHTML = '<option value="" disabled selected>اختيار المندوب</option>' + options;
    document.getElementById('filterDriver').innerHTML = '<option value="all">الكل</option>' + options;
    document.getElementById('filterDriver').value = filterValue;

    // تحديث الهيدر
    document.getElementById('dailyIncome').innerText = totalCollected.toLocaleString();
    if(document.getElementById('adminProfit')) {
        document.getElementById('adminProfit').innerText = totalAdminProfit.toLocaleString();
    }
}

function showSection(id) {
    document.getElementById('ordersSection').classList.toggle('hidden', id !== 'orders');
    document.getElementById('driversSection').classList.toggle('hidden', id !== 'drivers');
}

