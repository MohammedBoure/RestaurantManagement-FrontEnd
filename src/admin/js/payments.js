const API_BASE_URL = `http://${BASE_URL}/payments`;
const ORDERS_API_URL = `http://${BASE_URL}/orders`;
const ORDER_ITEMS_API_URL = `http://${BASE_URL}/order_items`;

let unpaidOrders = [];
let currentPaymentDetailsModal = null;
let totalCost = 0;
let amountByDateChart = null;
let transactionsByDateChart = null;

async function loadSection(section) {
    console.log('loadSection called with section:', section);
    showLoadingSpinner();
    try {
        if (section === 'payments') {
            unpaidOrders = await fetchUnpaidOrders();
            renderPaymentsForm();
            await generatePaymentReport();
            await generatePaymentStatistics();
        }
    } catch (error) {
        console.error('Error in loadSection:', error);
        showAlert('danger', 'خطأ في تحميل البيانات: ' + error.message);
    } finally {
        hideLoadingSpinner();
    }
}

async function fetchUnpaidOrders() {
    console.log('fetchUnpaidOrders called');
    const response = await axios.get(`${ORDERS_API_URL}/unpaid`);
    return response.data.orders;
}

function getDefaultDateRange() {
    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 30);
    return {
        startDate: thirtyDaysAgo.toISOString().split('T')[0],
        endDate: today.toISOString().split('T')[0]
    };
}

function renderPaymentsForm() {
    const { startDate, endDate } = getDefaultDateRange();
    const content = document.getElementById('section-content');
    content.innerHTML = `
        <div class="card mb-4">
            <div class="card-body">
                <div class="d-flex justify-content-between mb-3">
                    <h4>إدارة المدفوعات</h4>
                    <button class="btn btn-primary" onclick="showAddPaymentModal()">إضافة دفعة</button>
                </div>
                <form id="paymentForm" class="row g-3 mb-3">
                    <div class="col-md-5">
                        <label for="startDate" class="form-label">تاريخ البدء</label>
                        <input type="date" class="form-control" id="startDate" value="${startDate}" required>
                    </div>
                    <div class="col-md-5">
                        <label for="endDate" class="form-label">تاريخ الانتهاء</label>
                        <input type="date" class="form-control" id="endDate" value="${endDate}" required>
                    </div>
                    <div class="col-md-2 d-flex align-items-end">
                        <button type="submit" class="btn btn-primary w-100">عرض البيانات</button>
                    </div>
                </form>
                <div class="card mb-3">
                    <div class="card-body">
                        <h5 class="card-title">ملخص المدفوعات</h5>
                        <div id="summaryStats"></div>
                    </div>
                </div>
                <div class="row mb-3">
                    <div class="col-md-6">
                        <div class="card">
                            <div class="card-body">
                                <h5 class="card-title">إجمالي المبلغ حسب التاريخ</h5>
                                <canvas id="amountByDateChart"></canvas>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-6">
                        <div class="card">
                            <div class="card-body">
                                <h5 class="card-title">عدد المعاملات حسب التاريخ</h5>
                                <canvas id="transactionsByDateChart"></canvas>
                            </div>
                        </div>
                    </div>
                </div>
                <ul class="nav nav-tabs mb-3">
                    <li class="nav-item">
                        <a class="nav-link active" data-bs-toggle="tab" href="#detailedReport">التقرير التفصيلي</a>
                    </li>
                    <li class="nav-item">
                        <a class="nav-link" data-bs-toggle="tab" href="#statistics">الإحصائيات</a>
                    </li>
                </ul>
                <div class="tab-content">
                    <div class="tab-pane fade show active" id="detailedReport">
                        <div class="table-responsive">
                            <div id="reportResults"></div>
                        </div>
                    </div>
                    <div class="tab-pane fade" id="statistics">
                        <div class="table-responsive">
                            <div id="statisticsResults"></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    document.getElementById('paymentForm').onsubmit = async (e) => {
        e.preventDefault();
        await generatePaymentReport();
        await generatePaymentStatistics();
    };
}

async function generatePaymentReport() {
    console.log('generatePaymentReport called');
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;

    if (!startDate || !endDate) {
        showAlert('warning', 'الرجاء إدخال تاريخ البدء وتاريخ الانتهاء');
        return;
    }

    showLoadingSpinner();
    try {
        const response = await axios.get(`${API_BASE_URL}/report`, {
            params: { start_date: startDate, end_date: endDate }
        });
        console.log('Payment report fetched:', response.data);
        const { payments, total } = response.data;
        renderPaymentReport(payments, total);
    } catch (error) {
        console.error('Error in generatePaymentReport:', error.response || error);
        showAlert('danger', error.response?.data?.error || 'خطأ في جلب تقرير المدفوعات');
    } finally {
        hideLoadingSpinner();
    }
}

function renderPaymentReport(payments, total) {
    // Sort payments by paid_at in descending order (newest to oldest)
    const sortedPayments = payments.sort((a, b) => new Date(b.paid_at) - new Date(a.paid_at));
    const totalAmount = sortedPayments.reduce((sum, payment) => sum + payment.amount, 0).toFixed(2);
    const totalDiscount = sortedPayments.reduce((sum, payment) => sum + (payment.discount || 0), 0).toFixed(2);
    const reportResults = document.getElementById('reportResults');
    reportResults.innerHTML = `
        <table class="table table-striped table-hover">
            <thead class="table-dark">
                <tr>
                    <th>معرف الطلب</th>
                    <th>المبلغ</th>
                    <th>الخصم</th>
                    <th>تاريخ الدفع</th>
                </tr>
            </thead>
            <tbody>
                ${sortedPayments.map(payment => `
                    <tr>
                        <td>
                            <a href="#" onclick="showPaymentDetailsModal(${payment.order_id})">${payment.order_id}</a>
                        </td>
                        <td>${payment.amount.toFixed(2)}</td>
                        <td>${(payment.discount || 0).toFixed(2)}</td>
                        <td>${payment.paid_at}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
    renderSummaryStats(totalAmount, totalDiscount, total);
}

async function generatePaymentStatistics() {
    console.log('generatePaymentStatistics called');
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;

    if (!startDate || !endDate) {
        showAlert('warning', 'الرجاء إدخال تاريخ البدء وتاريخ الانتهاء للإحصائيات');
        return;
    }

    showLoadingSpinner();
    try {
        const response = await axios.get(`${API_BASE_URL}/statistics`, {
            params: { start_date: startDate, end_date: endDate }
        });
        console.log('Payment statistics fetched:', response.data);
        const { statistics, total } = response.data;
        const aggregatedStats = aggregateStatistics(statistics);
        renderPaymentStatistics(aggregatedStats, total);
        renderCharts(aggregatedStats);
    } catch (error) {
        console.error('Error in generatePaymentStatistics:', error.response || error);
        showAlert('danger', error.response?.data?.error || 'خطأ في جلب إحصائيات المدفوعات');
    } finally {
        hideLoadingSpinner();
    }
}

function aggregateStatistics(statistics) {
    const aggregated = {};
    statistics.forEach(stat => {
        const date = stat.payment_date;
        if (!aggregated[date]) {
            aggregated[date] = {
                payment_date: date,
                payment_count: 0,
                total_amount: 0,
                total_discount: 0
            };
        }
        aggregated[date].payment_count += stat.payment_count;
        aggregated[date].total_amount += stat.total_amount;
        aggregated[date].total_discount += stat.total_discount;
    });
    // Sort aggregated statistics by payment_date in descending order
    return Object.values(aggregated).sort((a, b) => new Date(b.payment_date) - new Date(a.payment_date));
}

function renderSummaryStats(totalAmount, totalDiscount, totalTransactions) {
    const summaryStats = document.getElementById('summaryStats');
    summaryStats.innerHTML = `
        <p class="mb-1"><strong>إجمالي المبلغ:</strong> ${totalAmount} دينار</p>
        <p class="mb-1"><strong>إجمالي الخصم:</strong> ${totalDiscount} دينار</p>
        <p class="mb-0"><strong>عدد المعاملات:</strong> ${totalTransactions}</p>
    `;
}

function renderPaymentStatistics(statistics, total) {
    const statsResults = document.getElementById('statisticsResults');
    statsResults.innerHTML = `
        <table class="table table-bordered table-hover">
            <thead class="table-dark">
                <tr>
                    <th>تاريخ الدفع</th>
                    <th>عدد المعاملات</th>
                    <th>إجمالي المبلغ</th>
                    <th>إجمالي الخصم</th>
                </tr>
            </thead>
            <tbody>
                ${statistics.map(stat => `
                    <tr>
                        <td>${stat.payment_date}</td>
                        <td>${stat.payment_count}</td>
                        <td>${stat.total_amount.toFixed(2)}</td>
                        <td>${stat.total_discount.toFixed(2)}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

function renderCharts(statistics) {
    // Destroy existing charts to prevent "Canvas is already in use" error
    if (amountByDateChart) amountByDateChart.destroy();
    if (transactionsByDateChart) transactionsByDateChart.destroy();

    const amountByDateData = {};
    const transactionsByDateData = {};

    statistics.forEach(stat => {
        amountByDateData[stat.payment_date] = stat.total_amount;
        transactionsByDateData[stat.payment_date] = stat.payment_count;
    });

    // Sort chart labels (dates) in descending order
    const sortedDates = Object.keys(amountByDateData).sort((a, b) => new Date(b) - new Date(a));

    amountByDateChart = new Chart(document.getElementById('amountByDateChart'), {
        type: 'line',
        data: {
            labels: sortedDates,
            datasets: [{
                label: 'إجمالي المبلغ',
                data: sortedDates.map(date => amountByDateData[date]),
                borderColor: '#2c3e50',
                backgroundColor: 'rgba(44, 62, 80, 0.2)',
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: { beginAtZero: true }
            }
        }
    });

    transactionsByDateChart = new Chart(document.getElementById('transactionsByDateChart'), {
        type: 'bar',
        data: {
            labels: sortedDates,
            datasets: [{
                label: 'عدد المعاملات',
                data: sortedDates.map(date => transactionsByDateData[date]),
                backgroundColor: '#34495e'
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: { beginAtZero: true }
            }
        }
    });
}

function showAddPaymentModal() {
    console.log('showAddPaymentModal called');
    const form = document.getElementById('resourceForm');
    form.innerHTML = `
        <div class="mb-3">
            <label for="orderSearch" class="form-label">البحث عن الطلب</label>
            <input type="text" class="form-control" id="orderSearch" oninput="filterOrders()">
        </div>
        <div class="mb-3">
            <label for="orderId" class="form-label">الطلب</label>
            <select class="form-select" id="orderId" onchange="calculateOrderTotal(this.value)" required>
                <option value="">اختر طلب</option>
                ${unpaidOrders.map(order => `<option value="${order.id}">طلب #${order.id} - طاولة ${getTableNumber(order.table_id)}</option>`).join('')}
            </select>
        </div>
        <div class="mb-3" id="totalCostDisplay"></div>
        <div class="mb-3">
            <label for="discount" class="form-label">الخصم</label>
            <input type="number" class="form-control" id="discount" min="0" step="0.01" value="0" oninput="updateAmount()">
        </div>
        <div class="mb-3">
            <label for="amount" class="form-label">المبلغ</label>
            <input type="number" class="form-control" id="amount" min="0.01" step="0.01" required readonly>
        </div>
    `;
    document.getElementById('resourceModalLabel').textContent = 'إضافة دفعة';
    form.onsubmit = async (e) => {
        e.preventDefault();
        await addPayment();
    };
    const resourceModal = new bootstrap.Modal(document.getElementById('resourceModal'));
    resourceModal.show();
    document.querySelectorAll('.modal-backdrop').forEach(backdrop => backdrop.remove());
    document.body.classList.add('modal-open');
    document.body.style.paddingRight = '';
}

async function calculateOrderTotal(orderId) {
    console.log('calculateOrderTotal called with orderId:', orderId);
    if (!orderId) {
        document.getElementById('totalCostDisplay').innerHTML = '';
        document.getElementById('amount').value = '';
        totalCost = 0;
        return;
    }
    showLoadingSpinner();
    try {
        const response = await axios.get(`${ORDER_ITEMS_API_URL}/order/${orderId}`);
        const items = response.data.order_items;
        totalCost = items.reduce((sum, item) => sum + (item.menu_item_price * item.quantity), 0);
        document.getElementById('totalCostDisplay').innerHTML = `<p class="fw-bold">إجمالي التكلفة: ${totalCost.toFixed(2)} دينار</p>`;
        updateAmount();
    } catch (error) {
        console.error('Error in calculateOrderTotal:', error.response || error);
        showAlert('danger', 'خطأ في حساب تكلفة الطلب: ' + (error.response?.data?.error || error.message));
    } finally {
        hideLoadingSpinner();
    }
}

function updateAmount() {
    const discount = parseFloat(document.getElementById('discount').value) || 0;
    if (discount > totalCost) {
        showAlert('warning', 'الخصم لا يمكن أن يكون أكبر من التكلفة الإجمالية');
        document.getElementById('discount').value = totalCost;
        document.getElementById('amount').value = 0;
        return;
    }
    const amount = totalCost - discount;
    document.getElementById('amount').value = amount.toFixed(2);
}

async function addPayment() {
    console.log('addPayment called');
    const orderId = parseInt(document.getElementById('orderId').value);
    const amount = parseFloat(document.getElementById('amount').value);
    const discount = parseFloat(document.getElementById('discount').value) || 0;

    if (!orderId || isNaN(amount) || amount <= 0 || isNaN(discount) || discount < 0) {
        showAlert('warning', 'الرجاء إدخال بيانات صحيحة للطلب والمبلغ والخصم');
        return;
    }

    const data = { order_id: orderId, amount, discount };

    showLoadingSpinner();
    try {
        const response = await axios.post(API_BASE_URL, data);
        console.log('Payment added:', response.data);
        showAlert('success', response.data.message);
        bootstrap.Modal.getInstance(document.getElementById('resourceModal')).hide();
        unpaidOrders = await fetchUnpaidOrders();
        renderPaymentsForm();
        await generatePaymentReport();
        await generatePaymentStatistics();
    } catch (error) {
        console.error('Error in addPayment:', error.response || error);
        showAlert('danger', error.response?.data?.error || 'خطأ في إضافة الدفعة');
    } finally {
        hideLoadingSpinner();
    }
}

async function showPaymentDetailsModal(orderId) {
    console.log('showPaymentDetailsModal called with orderId:', orderId);
    showLoadingSpinner();
    try {
        const response = await axios.get(`${API_BASE_URL}/order/${orderId}`);
        console.log('Payments fetched:', response.data);
        const { payments, total } = response.data;
        // Sort payments by paid_at in descending order
        const sortedPayments = payments.sort((a, b) => new Date(b.paid_at) - new Date(a.paid_at));
        const content = document.getElementById('paymentDetailsContent');
        content.innerHTML = `
            <div class="table-responsive">
                <table class="table table-striped table-hover">
                    <thead class="table-dark">
                        <tr>
                            <th>معرف الطلب</th>
                            <th>المبلغ</th>
                            <th>الخصم</th>
                            <th>تاريخ الدفع</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${sortedPayments.map(payment => `
                            <tr>
                                <td>${payment.order_id}</td>
                                <td>${payment.amount.toFixed(2)}</td>
                                <td>${(payment.discount || 0).toFixed(2)}</td>
                                <td>${payment.paid_at}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                <p class="fw-bold">إجمالي المدفوعات: ${total.toFixed(2)}</p>
            </div>
        `;
        currentPaymentDetailsModal = new bootstrap.Modal(document.getElementById('paymentDetailsModal'));
        currentPaymentDetailsModal.show();
        document.querySelectorAll('.modal-backdrop').forEach(backdrop => backdrop.remove());
        document.body.classList.add('modal-open');
        document.body.style.paddingRight = '';
    } catch (error) {
        console.error('Error in showPaymentDetailsModal:', error.response || error);
        showAlert('danger', 'خطأ في جلب تفاصيل الدفع: ' + (error.response?.data?.error || error.message));
    } finally {
        hideLoadingSpinner();
    }
}

function filterOrders() {
    const searchInput = document.getElementById('orderSearch').value.toLowerCase();
    const select = document.getElementById('orderId');
    const options = select.options;
    for (let i = 1; i < options.length; i++) {
        const text = options[i].text.toLowerCase();
        options[i].style.display = text.includes(searchInput) ? '' : 'none';
    }
}

function getTableNumber(tableId) {
    const order = unpaidOrders.find(o => o.table_id === tableId);
    return order ? order.table_id : 'غير معروف';
}

function showLoadingSpinner() {
    console.log('showLoadingSpinner called');
    const spinner = document.getElementById('loading-spinner');
    if (spinner) spinner.style.display = 'block';
}

function hideLoadingSpinner() {
    console.log('hideLoadingSpinner called');
    const spinner = document.getElementById('loading-spinner');
    if (spinner) spinner.style.display = 'none';
}

function showAlert(type, message) {
    console.log('showAlert called with type:', type, 'message:', message);
    const alertContainer = document.getElementById('alert-container');
    const alertMessage = document.getElementById('alert-message');
    if (alertContainer && alertMessage) {
        alertContainer.className = `alert alert-${type} alert-dismissible fade show`;
        alertMessage.textContent = message;
        alertContainer.classList.remove('d-none');
        setTimeout(() => {
            alertContainer.classList.add('d-none');
        }, 5000);
    }
}

document.getElementById('paymentDetailsModal').addEventListener('hidden.bs.modal', () => {
    console.log('paymentDetailsModal hidden, cleaning up');
    currentPaymentDetailsModal = null;
    document.querySelectorAll('.modal-backdrop').forEach(backdrop => backdrop.remove());
    document.body.classList.remove('modal-open');
    document.body.style.paddingRight = '';
});

document.getElementById('resourceModal').addEventListener('hidden.bs.modal', () => {
    console.log('resourceModal hidden, cleaning up');
    if (currentPaymentDetailsModal) {
        currentPaymentDetailsModal.show();
    }
    document.querySelectorAll('.modal-backdrop').forEach(backdrop => backdrop.remove());
    document.body.classList.add('modal-open');
    document.body.style.paddingRight = '';
});