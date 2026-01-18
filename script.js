// 1. إدارة قاعدة البيانات (Local Storage)
const TopSpeedDB = {
    save: (key, data) => localStorage.setItem('ts_v2_' + key, JSON.stringify(data)),
    load: (key) => JSON.parse(localStorage.getItem('ts_v2_' + key)) || [],
    clear: () => {
        if(confirm("هل تريد تصفير جميع بيانات النظام؟ (سيتم حذف كل شيء)")) {
            localStorage.clear();
            location.reload();
        }
    }
};

let drivers = TopSpeedDB.load('drivers');
let orders = TopSpeedDB.load('orders');

// 2. شاشة التحميل (Hacker Loader)
const counterElement = document.getElementById('counter');
const mainSystem = document.getElementById('mainSystem');
const loaderWrapper = document.getElementById('loaderWrapper');
let count = 0;

function updateLoader() {
    if (count < 100) {
        let increment = (Math.random() > 0.8) ? 2 : 1;
        count = Math.min(count + increment, 100);
        if(counterElement) counterElement.innerText = count + '%';
        setTimeout(updateLoader, Math.random() * 40 + 10);
    } else {
        if(loaderWrapper) loaderWrapper.style.display = 'none';
        if(mainSystem) mainSystem.style.display = 'flex';
        document.body.classList.remove('overflow-hidden');
        renderAll();
    }
}
setTimeout(updateLoader, 500);

// 3. إضافة مندوب جديد
function addNewDriver() {
    const name = document.getElementById('newDriverName').value.trim();
    const phone = document.getElementById('newDriverPhone').value.trim();
    const code = document.getElementById('newDriverCode').value.trim();

    if(!name || !phone) return alert("أدخل اسم ورقم المندوب");

    drivers.push({ 
        name, phone, code, status: 'متاح',
        wallet: 0, bonus: 0, deductions: 0 
    });
    
    TopSpeedDB.save('drivers', drivers);
    renderAll();
    alert("تم تفعيل المندوب بنجاح");
}

// 4. إضافة أوردر وإرساله واتساب
function addNewOrder() {
    const rest = document.getElementById('restName').value.trim();
    const customer = document.getElementById('customerName').value.trim();
    const cPhone = document.getElementById('customerPhone').value.trim();
    const addr = document.getElementById('orderAddress').value.trim();
    const price = document.getElementById('orderPrice').value.trim();
    const dSelect = document.getElementById('driverSelect');

    if(!rest || !price || !dSelect.value) return alert("أكمل البيانات واختار المندوب");

    const dIndex = drivers.findIndex(d => d.name === dSelect.value);
    const selectedDriver = drivers[dIndex];

    const newOrder = {
        id: Date.now(),
        rest, customer, cPhone, addr,
        price: parseFloat(price),
        driverName: selectedDriver.name,
        driverPhone: selectedDriver.phone,
        status: 'معلق'
    };

    orders.push(newOrder);
    drivers[dIndex].status = 'مشغول';
    
    TopSpeedDB.save('orders', orders);
    TopSpeedDB.save('drivers', drivers);
    renderAll();

    const msg = `*طلب جديد TOP SPEED* 🚀%0A%0A` +
                `*المطعم:* ${newOrder.rest}%0A` +
                `*العميل:* ${newOrder.customer}%0A` +
                `*العنوان:* ${newOrder.addr}%0A` +
                `*المبلغ:* ${newOrder.price} ج`;

    window.open(`https://api.whatsapp.com/send?phone=2${newOrder.driverPhone}&text=${msg}`, '_blank');
}

// 5. تأكيد التسليم مع رسالة تأكيد (Pop-up)
function completeOrder(orderId) {
    const oIdx = orders.findIndex(o => o.id === orderId);
    if(oIdx === -1) return;

    if(confirm(`هل تؤكد استلام مبلغ ${orders[oIdx].price}ج وإتمام الأوردر؟\n(سيتم إضافة 8ج للأدمن و30ج للمندوب)`)) {
        const driverName = orders[oIdx].driverName;
        orders[oIdx].status = 'تم التسليم';

        const dIdx = drivers.findIndex(d => d.name === driverName);
        if(dIdx !== -1) {
            drivers[dIdx].status = 'متاح';
            drivers[dIdx].wallet = (drivers[dIdx].wallet || 0) + 30;
        }

        TopSpeedDB.save('orders', orders);
        TopSpeedDB.save('drivers', drivers);
        renderAll();
        alert("تم تحديث الحسابات بنجاح ✅");
    }
}

// 6. مكافأة / خصم
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

// 7. عرض البيانات (الرندرة)
function renderAll() {
    let totalCollected = 0;
    let totalAdminProfit = 0;

    // جدول الطلبات
    const tableBody = document.getElementById('ordersTableBody');
    tableBody.innerHTML = orders.map(o => {
        if (o.status === 'تم التسليم') {
            totalCollected += o.price;
            totalAdminProfit += 8;
        }
        return `
        <tr class="border-b bg-white">
            <td class="p-4 text-xs font-bold">${o.rest}</td>
            <td class="p-4 text-xs">${o.customer}<br><small class="text-slate-400">${o.addr}</small></td>
            <td class="p-4 font-black">${o.price}ج</td>
            <td class="p-4 text-xs font-bold text-slate-500">${o.driverName}</td>
            <td class="p-4 text-center">
                ${o.status === 'تم التسليم' 
                    ? '<span class="bg-green-100 text-green-700 px-2 py-1 rounded-md text-[10px] font-black">مكتمل ✅</span>' 
                    : `<button onclick="completeOrder(${o.id})" class="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-[10px] font-bold shadow-md">تأكيد</button>`}
            </td>
        </tr>`;
    }).reverse().join('');

    // الخزنة

