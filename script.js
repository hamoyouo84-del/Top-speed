// 1. إدارة قاعدة البيانات المحلية
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

// 2. نظام شاشة التحميل (Hacker Loader)
const counterElement = document.getElementById('counter');
const mainSystem = document.getElementById('mainSystem');
const loaderWrapper = document.getElementById('loaderWrapper');
let count = 0;

function updateLoader() {
    if (count < 100) {
        let increment = (Math.random() > 0.8) ? 2 : 1;
        count = Math.min(count + increment, 100);
        counterElement.innerText = count + '%';
        let speed = Math.floor(Math.random() * (120 - 30) + 30);
        if (count > 95) speed = 250;
        setTimeout(updateLoader, speed);
    } else {
        finishLoading();
    }
}

function finishLoading() {
    if(loaderWrapper) loaderWrapper.style.display = 'none';
    if(mainSystem) mainSystem.style.display = 'flex';
    document.body.classList.remove('overflow-hidden');
    renderAll();
}
// بدء التحميل
setTimeout(updateLoader, 500);

// 3. إدارة المناديب
function addNewDriver() {
    const name = document.getElementById('newDriverName').value.trim();
    const phone = document.getElementById('newDriverPhone').value.trim();
    const code = document.getElementById('newDriverCode').value.trim();

    if(!name || !phone) return alert("برجاء إدخال اسم ورقم المندوب");

    drivers.push({ 
        name, phone, code, 
        status: 'متاح',
        wallet: 0,      // رصيد الـ 30ج عن كل أوردر
        bonus: 0,       // مكافآت إضافية
        deductions: 0   // خصومات وجزاءات
    });
    
    TopSpeedDB.save('drivers', drivers);
    // تصفير الحقول
    document.getElementById('newDriverName').value = '';
    document.getElementById('newDriverPhone').value = '';
    document.getElementById('newDriverCode').value = '';
    renderAll();
}

// 4. إدارة الطلبات
function addNewOrder() {
    const rest = document.getElementById('restName').value.trim();
    const customer = document.getElementById('customerName').value.trim();
    const cPhone = document.getElementById('customerPhone').value.trim();
    const addr = document.getElementById('orderAddress').value.trim();
    const price = document.getElementById('orderPrice').value.trim();
    const dSelect = document.getElementById('driverSelect');

    if(!rest || !price || !dSelect.value) return alert("أكمل البيانات الأساسية");

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
    const msg = `*طلب جديد TOP SPEED* 🚀%0A*المطعم:* ${newOrder.rest}%0A*العميل:* ${newOrder.customer}%0A*المبلغ:* ${newOrder.price}ج%0A*العنوان:* ${newOrder.addr}`;
    window.location.href = `https://api.whatsapp.com/send?phone=2${newOrder.driverPhone}&text=${msg}`;
}

// 5. تأكيد التسليم (توزيع الأرباح)
function completeOrder(orderId) {
    const oIdx = orders.findIndex(o => o.id === orderId);
    if(oIdx === -1) return;

    const driverName = orders[oIdx].driverName;
    orders[oIdx].status = 'تم التسليم';

    const dIdx = drivers.findIndex(d => d.name === driverName);
    if(dIdx !== -1) {
        drivers[dIdx].status = 'متاح';
        drivers[dIdx].wallet = (drivers[dIdx].wallet || 0) + 30; // حق المندوب
    }

    TopSpeedDB.save('orders', orders);
    TopSpeedDB.save('drivers', drivers);
    renderAll();
}

// 6. المكافآت والخصومات مع رسالة واتساب للمكافأة
function manualAdjustment(driverName, type) {
    const amount = prompt(`أدخل المبلغ للمندوب ${driverName}:`);
    if (amount && !isNaN(amount)) {
        const dIdx = drivers.findIndex(d => d.name === driverName);
        if (type === 'bonus') {
            drivers[dIdx].bonus += parseFloat(amount);
            // إرسال واتساب بتبشير المندوب بالمكافأة
            const msg = `*مكافأة من توب سبيد* 🎁%0Aتم إضافة مبلغ *${amount} جنيه* لرصيدك كمكافأة تميز.%0Aعاش يا بطل!`;
            window.open(`https://api.whatsapp.com/send?phone=2${drivers[dIdx].phone}&text=${msg}`, '_blank');
        } else {
            drivers[dIdx].deductions += parseFloat(amount);
        }
        
        TopSpeedDB.save('drivers', drivers);
        renderAll();
    }
}

// 7. عرض كل البيانات (التحديث الشامل)
function renderAll() {
    let totalAdminProfit = 0;
    let totalCollected = 0;
    let totalFinishedOrders = 0;

    // تحديث جدول الطلبات
    const tableBody = document.getElementById('ordersTableBody');
    if(tableBody) {
        tableBody.innerHTML = orders.map(o => {
            const isDone = o.status === 'تم التسليم';
            if(isDone) {
                totalAdminProfit += 8;
                totalCollected += o.price;
                totalFinishedOrders++;
            }
            return `
            <tr class="border-b bg-white hover:bg-slate-50 transition">
                <td class="p-4 font-bold text-slate-700">${o.rest}</td>
                <td class="p-4 text-[11px]">${o.customer}<br><span class="text-slate-400">${o.addr}</span></td>
                <td class="p-4 text-center font-black text-blue-600">${o.price}ج</td>
                <td class="p-4 text-center font-bold text-slate-500">${o.driverName}</td>
                <td class="p-4 text-center">
                    ${isDone 
                        ? `<span class="text-green-600 font-black text-[10px]">مكتمل ✅</span>`
                        : `<button onclick="completeOrder(${o.id})" class="bg-blue-600 text-white px-4 py-1.5 rounded-xl text-[10px] hover:bg-slate-900 transition shadow-md">إتمام</button>`
                    }
                </td>
            </tr>`;
        }).reverse().join('');
    }

    // تحديث قسم الخزنة (التبويب المالي)
    const financeTable = document.getElementById('financeTableBody');
    if(financeTable) {
        financeTable.innerHTML = drivers.map(d => {
            const finishedCount = orders.filter(o => o.driverName === d.name && o.status === 'تم التسليم').length;
            const net = (d.wallet || 0) + (d.bonus || 0) - (d.deductions || 0);
            return `
            <tr class="border-b">
                <td class="p-4 font-bold">${d.name}</td>
                <td class="p-4 text-center">${finishedCount}</td>
                <td class="p-4 text-center text-blue-600 font-bold">${d.wallet || 0}ج</td>
                <td class="p-4 text-center text-orange-600 font-bold">${(d.bonus||0)-(d.deductions||0)}ج</td>
                <td class="p-4 text-center"><span class="bg-slate-900 text-white px-3 py-1 rounded-lg font-black">${net}ج</span></td>
            </tr>`;
        }).join('');
    }

    // تحديث كروت المناديب
    const grid = document.getElementById('driversGrid');
    if(grid) {
        grid.innerHTML = drivers.map(d => {
            const net = (d.wallet || 0) + (d.bonus || 0) - (d.deductions || 0);
            return `
            <div class="bg-white p-5 rounded-[2rem] shadow-sm border border-slate-100 transition hover:shadow-md">
                <div class="flex justify-between items-start mb-3">
                    <div><h4 class="font-black text-slate-800">${d.name}</h4><small class="${d.status === 'متاح' ? 'text-green-500' : 'text-orange-500'} font-bold">${d.status}</small></div>
                    <div class="text-blue-600 font-black text-xl">${net}ج</div>
                </div>
                <div class="flex gap-2">
                    <button onclick="manualAdjustment('${d.name}', 'bonus')" class="flex-1 bg-green-50 text-green-600 py-2 rounded-xl text-[10px] font-black hover:bg-green-100 transition">+ مكافأة</button>
                    <button onclick="manualAdjustment('${d.name}', 'discount')" class="flex-1 bg-red-50 text-red-600 py-2 rounded-xl text-[10px] font-black hover:bg-red-100 transition">- خصم</button>
                </div>
            </div>`;
        }).join('');
    }

    // تحديث الأرقام الرئيسية
    if(document.getElementById('dailyIncome')) document.getElementById('dailyIncome').innerText = totalCollected.toLocaleString();
    if(document.getElementById('adminProfit')) document.getElementById('adminProfit').innerText = totalAdminProfit.toLocaleString();
    if(document.getElementById('financeAdminProfit')) document.getElementById('financeAdminProfit').innerText = totalAdminProfit.toLocaleString();
    if(document.getElementById('totalDeliveries')) document.getElementById('totalDeliveries').innerText = totalFinishedOrders;
    if(document.getElementById('totalMoney')) document.getElementById('totalMoney').innerText = totalCollected.toLocaleString();

    // تحديث قائمة المناديب في الفورم
    const dSelect = document.getElementById('driverSelect');
    if(dSelect) {
        const options = drivers.map(d => `<option value="${d.name}">${d.name} (${d.status})</option>`).join('');
        dSelect.innerHTML = '<option value="" disabled selected>اختيار المندوب</option>' + options;
    }
}

// 8. التبديل بين التبويبات
function showSection(id) {
    const sections = ['ordersSection', 'driversSection', 'financeSection'];
    sections.forEach(s => {
        document.getElementById(s).classList.add('hidden');
    });
    document.getElementById(id + 'Section').classList.remove('hidden');
}
