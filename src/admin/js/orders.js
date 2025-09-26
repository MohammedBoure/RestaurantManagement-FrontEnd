const API_BASE_URL = `http://${BASE_URL}/orders`;
const ORDER_ITEMS_API_URL = `http://${BASE_URL}/order_items`;
const TABLES_API_URL = `http://${BASE_URL}/tables`;
const WAITERS_API_URL = `http://${BASE_URL}/waiters`;
const MENU_ITEMS_API_URL = `http://${BASE_URL}/menu_items`;

let tables = [];
let waiters = [];
let menuItems = [];
let currentOrderId = null;
let currentOrderItemsModal = null;
let currentStatus = null;
let currentFilter = 'all'; // 'all' or 'unpaid'
let currentPage = 1;
let totalPages = 1;

async function loadSection(section) {
    console.log('loadSection called with section:', section);
    showLoadingSpinner();
    try {
        if (section === 'orders') {
            [tables, waiters, menuItems] = await Promise.all([
                fetchTables(),
                fetchWaiters(),
                fetchMenuItems()
            ]);
            await loadOrders();
        }
    } catch (error) {
        console.error('Error in loadSection:', error);
        showAlert('danger', 'خطأ في تحميل البيانات: ' + error.message);
    } finally {
        hideLoadingSpinner();
    }
}

async function fetchTables() {
    console.log('fetchTables called');
    const response = await axios.get(TABLES_API_URL);
    return response.data.tables;
}

async function fetchWaiters() {
    console.log('fetchWaiters called');
    const response = await axios.get(WAITERS_API_URL);
    return response.data.waiters;
}

async function fetchMenuItems() {
    console.log('fetchMenuItems called');
    const response = await axios.get(MENU_ITEMS_API_URL);
    return response.data.menu_items;
}

async function loadOrders(status = null, page = 1) {
    console.log('loadOrders called, status:', status, 'page:', page);
    currentStatus = status;
    currentFilter = 'all';
    currentPage = page;
    try {
        const params = new URLSearchParams();
        params.append('page', page);
        params.append('per_page', 10);
        if (status) {
            params.append('status', status);
            currentFilter = 'status'; // Set filter to status-specific
        }
        const url = `${API_BASE_URL}?${params.toString()}`;
        const response = await axios.get(url);
        console.log('Orders fetched:', response.data);
        const { orders, total_items, total_pages } = response.data;
        totalPages = total_pages;
        // Fetch order items to calculate total cost
        const ordersWithItems = await Promise.all(orders.map(async (order) => {
            const itemsResponse = await axios.get(`${ORDER_ITEMS_API_URL}/order/${order.id}`);
            order.items = itemsResponse.data.order_items;
            order.total_cost = order.items.reduce((sum, item) => sum + (item.menu_item_price * item.quantity), 0).toFixed(2);
            return order;
        }));
        renderOrdersTable(ordersWithItems, total_items);
    } catch (error) {
        console.error('Error in loadOrders:', error.response || error);
        showAlert('danger', 'خطأ في جلب الطلبات: ' + (error.response?.data?.error || error.message));
    }
}

async function loadUnpaidOrders(page = 1) {
    console.log('loadUnpaidOrders called, page:', page);
    currentFilter = 'unpaid';
    currentPage = page;
    try {
        const params = new URLSearchParams();
        params.append('page', page);
        params.append('per_page', 10);
        const url = `${API_BASE_URL}/unpaid?${params.toString()}`;
        const response = await axios.get(url);
        console.log('Unpaid orders fetched:', response.data);
        const { orders, total_items, total_pages } = response.data;
        totalPages = total_pages;
        // Fetch order items to calculate total cost
        const ordersWithItems = await Promise.all(orders.map(async (order) => {
            const itemsResponse = await axios.get(`${ORDER_ITEMS_API_URL}/order/${order.id}`);
            order.items = itemsResponse.data.order_items;
            order.total_cost = order.items.reduce((sum, item) => sum + (item.menu_item_price * item.quantity), 0).toFixed(2);
            return order;
        }));
        renderOrdersTable(ordersWithItems, total_items);
    } catch (error) {
        console.error('Error in loadUnpaidOrders:', error.response || error);
        showAlert('danger', 'خطأ في جلب الطلبات غير المدفوعة: ' + (error.response?.data?.error || error.message));
    }
}

function getStatusText(status) {
    const statusMap = {
        'pending': 'معلق',
        'preparing': 'تحضير',
        'ready': 'جاهز',
        'served': 'مقدم',
        'cancelled': 'ملغى'
    };
    return statusMap[status] || 'غير معروف';
}

function getStatusBadgeClass(status) {
    const badgeClasses = {
        'pending': 'bg-warning',
        'preparing': 'bg-info',
        'ready': 'bg-success',
        'served': 'bg-primary',
        'cancelled': 'bg-danger'
    };
    return badgeClasses[status] || 'bg-secondary';
}

function renderOrdersTable(orders, total_items) {
    const content = document.getElementById('section-content');
    content.innerHTML = `
        <div class="d-flex justify-content-between mb-3">
            <button class="btn btn-primary" onclick="showAddOrderModal()">إضافة طلب</button>
            <div>
                <button class="btn btn-warning" onclick="loadUnpaidOrders(1)">عرض الطلبات غير المدفوعة</button>
                <button class="btn btn-secondary" onclick="resetFilter()" ${currentFilter === 'all' ? 'disabled' : ''}>إعادة تعيين التصفية</button>
            </div>
        </div>
        <div class="mb-3">
            <label for="statusFilter" class="form-label">تصفية حسب الحالة</label>
            <select class="form-select" id="statusFilter" onchange="loadOrders(this.value, 1)" ${currentFilter === 'status' ? 'data-filtered="true"' : ''}>
                <option value="" ${currentFilter === 'status' ? 'disabled' : ''} ${!currentStatus ? 'selected' : ''}>جميع الحالات</option>
                <option value="pending" ${currentStatus === 'pending' ? 'selected' : ''}>معلق</option>
                <option value="preparing" ${currentStatus === 'preparing' ? 'selected' : ''}>تحضير</option>
                <option value="ready" ${currentStatus === 'ready' ? 'selected' : ''}>جاهز</option>
                <option value="served" ${currentStatus === 'served' ? 'selected' : ''}>مقدم</option>
                <option value="cancelled" ${currentStatus === 'cancelled' ? 'selected' : ''}>ملغى</option>
            </select>
        </div>
        <table class="table table-striped">
            <thead>
                <tr>
                    <th>المعرف</th>
                    <th>الطاولة</th>
                    <th>النادل</th>
                    <th>الحالة</th>
                    <th>نوع الطلب</th>
                    <th>تكلفة الطلبية</th>
                    <th>حالة الدفع</th>
                    <th>الإجراءات</th>
                </tr>
            </thead>
            <tbody>
                ${orders.map(order => `
                    <tr>
                        <td>${order.id}</td>
                        <td>${getTableName(order.table_id)}</td>
                        <td>${getWaiterName(order.waiter_id)}</td>
                        <td>
                            <select class="form-select form-select-sm" onchange="updateOrderStatus(${order.id}, this.value)">
                                <option value="pending" ${order.status === 'pending' ? 'selected' : ''}>معلق</option>
                                <option value="preparing" ${order.status === 'preparing' ? 'selected' : ''}>تحضير</option>
                                <option value="ready" ${order.status === 'ready' ? 'selected' : ''}>جاهز</option>
                                <option value="served" ${order.status === 'served' ? 'selected' : ''}>مقدم</option>
                                <option value="cancelled" ${order.status === 'cancelled' ? 'selected' : ''}>ملغى</option>
                            </select>
                        </td>
                        <td>${order.order_type === 'dine-in' ? 'تناول داخلي' : 'خارجي'}</td>
                        <td>${order.total_cost} دينار</td>
                        <td>${order.payment_status === 'paid' ? 'مدفوع' : 'غير مدفوع'}</td>
                        <td>
                            <button class="btn btn-sm btn-info" onclick="showOrderItemsModal(${order.id}, '${order.status}')">عرض العناصر</button>
                            <button class="btn btn-sm btn-danger" onclick="deleteOrder(${order.id})">حذف</button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
        <p>إجمالي الطلبات: ${total_items}</p>
        <div class="d-flex justify-content-center">
            <button class="btn btn-secondary me-2" onclick="previousPage()" ${currentPage === 1 ? 'disabled' : ''}>السابق</button>
            <span>الصفحة ${currentPage} من ${totalPages}</span>
            <button class="btn btn-secondary ms-2" onclick="nextPage()" ${currentPage === totalPages ? 'disabled' : ''}>التالي</button>
        </div>
    `;
}

function previousPage() {
    if (currentPage > 1) {
        if (currentFilter === 'all' || currentFilter === 'status') {
            loadOrders(currentStatus, currentPage - 1);
        } else if (currentFilter === 'unpaid') {
            loadUnpaidOrders(currentPage - 1);
        }
    }
}

function nextPage() {
    if (currentPage < totalPages) {
        if (currentFilter === 'all' || currentFilter === 'status') {
            loadOrders(currentStatus, currentPage + 1);
        } else if (currentFilter === 'unpaid') {
            loadUnpaidOrders(currentPage + 1);
        }
    }
}

function resetFilter() {
    console.log('resetFilter called');
    currentStatus = null;
    currentFilter = 'all';
    loadOrders(null, 1);
}

function getTableName(tableId) {
    const table = tables.find(t => t.id === tableId);
    return table ? table.table_number : 'غير معروف';
}

function getWaiterName(waiterId) {
    const waiter = waiters.find(w => w.id === waiterId);
    return waiter ? waiter.name : 'غير معروف';
}

function getMenuItemName(menuItemId) {
    const item = menuItems.find(m => m.id === menuItemId);
    return item ? item.name : 'غير معروف';
}

function showAddOrderModal() {
    console.log('showAddOrderModal called');
    const form = document.getElementById('resourceForm');
    form.innerHTML = `
        <div class="mb-3">
            <label for="tableId" class="form-label">الطاولة</label>
            <select class="form-select" id="tableId" required>
                <option value="">اختر طاولة</option>
                ${tables.map(table => `<option value="${table.id}">${table.table_number}</option>`).join('')}
            </select>
        </div>
        <div class="mb-3">
            <label for="waiterId" class="form-label">النادل</label>
            <select class="form-select" id="waiterId" required>
                <option value="">اختر نادل</option>
                ${waiters.map(waiter => `<option value="${waiter.id}">${waiter.name}</option>`).join('')}
            </select>
        </div>
        <div class="mb-3">
            <label for="status" class="form-label">الحالة</label>
            <select class="form-select" id="status">
                <option value="pending">معلق</option>
                <option value="preparing">تحضير</option>
                <option value="ready">جاهز</option>
                <option value="served">مقدم</option>
                <option value="cancelled">ملغى</option>
            </select>
        </div>
        <div class="mb-3">
            <label for="orderType" class="form-label">نوع الطلب</label>
            <select class="form-select" id="orderType">
                <option value="dine-in">تناول داخلي</option>
                <option value="takeaway">خارجي</option>
            </select>
        </div>
    `;
    document.getElementById('resourceModalLabel').textContent = 'إضافة طلب';
    form.onsubmit = async (e) => {
        e.preventDefault();
        await addOrder();
    };
    new bootstrap.Modal(document.getElementById('resourceModal')).show();
}

async function addOrder() {
    console.log('addOrder called');
    const tableId = parseInt(document.getElementById('tableId').value);
    const waiterId = parseInt(document.getElementById('waiterId').value);
    const status = document.getElementById('status').value;
    const orderType = document.getElementById('orderType').value;

    if (!tableId || !waiterId) {
        showAlert('warning', 'الرجاء اختيار طاولة ونادل');
        return;
    }

    const data = { table_id: tableId, waiter_id: waiterId, status, order_type: orderType };

    showLoadingSpinner();
    try {
        const response = await axios.post(API_BASE_URL, data);
        console.log('Order added:', response.data);
        showAlert('success', response.data.message);
        bootstrap.Modal.getInstance(document.getElementById('resourceModal')).hide();
        await loadOrders(currentStatus, currentPage);
    } catch (error) {
        console.error('Error in addOrder:', error.response || error);
        showAlert('danger', error.response?.data?.error || 'خطأ في إضافة الطلب');
    } finally {
        hideLoadingSpinner();
    }
}

async function updateOrderStatus(id, status) {
    console.log('updateOrderStatus called with id:', id, 'status:', status);
    if (!['pending', 'preparing', 'ready', 'served', 'cancelled'].includes(status)) {
        showAlert('warning', 'الرجاء اختيار حالة صحيحة');
        return;
    }

    showLoadingSpinner();
    try {
        const response = await axios.put(`${API_BASE_URL}/${id}`, { status });
        console.log('Order status updated:', response.data);
        showAlert('success', response.data.message);
        if (currentFilter === 'all' || currentFilter === 'status') {
            await loadOrders(currentStatus, currentPage);
        } else if (currentFilter === 'unpaid') {
            await loadUnpaidOrders(currentPage);
        }
    } catch (error) {
        console.error('Error in updateOrderStatus:', error.response || error);
        showAlert('danger', error.response?.data?.error || 'خطأ في تحديث حالة الطلب');
    } finally {
        hideLoadingSpinner();
    }
}

async function deleteOrder(id) {
    console.log('deleteOrder called with id:', id);
    if (!confirm('هل أنت متأكد من حذف هذا الطلب؟')) return;
    showLoadingSpinner();
    try {
        const response = await axios.delete(`${API_BASE_URL}/${id}`);
        console.log('Order deleted:', response.data);
        showAlert('success', response.data.message);
        if (currentFilter === 'all' || currentFilter === 'status') {
            await loadOrders(currentStatus, currentPage);
        } else if (currentFilter === 'unpaid') {
            await loadUnpaidOrders(currentPage);
        }
    } catch (error) {
        console.error('Error in deleteOrder:', error.response || error);
        showAlert('danger', error.response?.data?.error || 'خطأ في حذف الطلب');
    } finally {
        hideLoadingSpinner();
    }
}

async function showOrderItemsModal(orderId, orderStatus) {
    console.log('showOrderItemsModal called for orderId:', orderId, 'status:', orderStatus);
    showLoadingSpinner();
    try {
        const response = await axios.get(`${ORDER_ITEMS_API_URL}/order/${orderId}`);
        const { order_items } = response.data;
        const totalCost = order_items.reduce((sum, item) => sum + (item.menu_item_price * item.quantity), 0).toFixed(2);
        const content = document.getElementById('orderItemsContent');
        content.innerHTML = `
            <div class="mb-3">
                <span class="badge ${getStatusBadgeClass(orderStatus)} order-status-badge">حالة الطلب: ${getStatusText(orderStatus)}</span>
            </div>
            <button class="btn btn-primary mb-3" onclick="showAddOrderItemModal(${orderId})">إضافة عنصر</button>
            <table class="table table-striped">
                <thead>
                    <tr>
                        <th>المعرف</th>
                        <th>العنصر</th>
                        <th>الكمية</th>
                        <th>السعر</th>
                        <th>الملاحظة</th>
                        <th>الإجراءات</th>
                    </tr>
                </thead>
                <tbody>
                    ${order_items.map(item => `
                        <tr>
                            <td>${item.id}</td>
                            <td>${item.menu_item_name || getMenuItemName(item.menu_item_id)}</td>
                            <td>${item.quantity}</td>
                            <td>${item.menu_item_price.toFixed(2)} دينار</td>
                            <td>${item.note || ''}</td>
                            <td>
                                <button class="btn btn-sm btn-warning" onclick="showEditOrderItemModal(${item.id}, ${item.menu_item_id}, ${item.quantity}, '${item.note || ''}')">تعديل</button>
                                <button class="btn btn-sm btn-danger" onclick="deleteOrderItem(${item.id}, ${orderId})">حذف</button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
            <div class="mt-3">
                <strong>إجمالي التكلفة: ${totalCost} دينار</strong>
            </div>
        `;
        currentOrderId = orderId;
        currentOrderItemsModal = new bootstrap.Modal(document.getElementById('orderItemsModal'));
        currentOrderItemsModal.show();
        // Ensure backdrop is properly managed
        document.querySelectorAll('.modal-backdrop').forEach(backdrop => backdrop.remove());
        document.body.classList.add('modal-open');
        document.body.style.paddingRight = '';
    } catch (error) {
        console.error('Error in showOrderItemsModal:', error.response || error);
        showAlert('danger', 'خطأ في جلب عناصر الطلب: ' + (error.response?.data?.error || error.message));
    } finally {
        hideLoadingSpinner();
    }
}

function showAddOrderItemModal(orderId) {
    console.log('showAddOrderItemModal called for orderId:', orderId);
    currentOrderId = orderId;
    if (currentOrderItemsModal) {
        currentOrderItemsModal.hide();
    }
    const form = document.getElementById('resourceForm');
    form.innerHTML = `
        <div class="mb-3">
            <label for="menuItemSearch" class="form-label">البحث عن العنصر</label>
            <input type="text" class="form-control" id="menuItemSearch" oninput="filterMenuItems()">
        </div>
        <div class="mb-3">
            <label for="menuItemId" class="form-label">العنصر</label>
            <select class="form-select" id="menuItemId" required>
                <option value="">اختر عنصر</option>
                ${menuItems.filter(item => item.available === 1).map(item => `<option value="${item.id}">${item.name}</option>`).join('')}
            </select>
        </div>
        <div class="mb-3">
            <label for="quantity" class="form-label">الكمية</label>
            <input type="number" class="form-control" id="quantity" min="1" required>
        </div>
        <div class="mb-3">
            <label for="note" class="form-label">الملاحظة</label>
            <textarea class="form-control" id="note"></textarea>
        </div>
    `;
    document.getElementById('resourceModalLabel').textContent = 'إضافة عنصر طلب';
    form.onsubmit = async (e) => {
        e.preventDefault();
        await addOrderItem(orderId);
    };
    const resourceModal = new bootstrap.Modal(document.getElementById('resourceModal'));
    resourceModal.show();
    // Ensure backdrop is properly managed
    document.querySelectorAll('.modal-backdrop').forEach(backdrop => backdrop.remove());
    document.body.classList.add('modal-open');
    document.body.style.paddingRight = '';
}

async function addOrderItem(orderId) {
    console.log('addOrderItem called for orderId:', orderId);
    const menuItemId = parseInt(document.getElementById('menuItemId').value);
    const quantity = parseInt(document.getElementById('quantity').value);
    const note = document.getElementById('note').value.trim();

    if (!menuItemId || isNaN(quantity) || quantity <= 0) {
        showAlert('warning', 'الرجاء إدخال عنصر وكمية صحيحة');
        return;
    }

    const data = { order_id: orderId, menu_item_id: menuItemId, quantity, note };

    showLoadingSpinner();
    try {
        const response = await axios.post(ORDER_ITEMS_API_URL, data);
        console.log('Order item added:', response.data);
        showAlert('success', response.data.message);
        bootstrap.Modal.getInstance(document.getElementById('resourceModal')).hide();
        await showOrderItemsModal(orderId, currentStatus);
    } catch (error) {
        console.error('Error in addOrderItem:', error.response || error);
        showAlert('danger', error.response?.data?.error || 'خطأ في إضافة عنصر الطلب');
    } finally {
        hideLoadingSpinner();
    }
}

function showEditOrderItemModal(itemId, menuItemId, quantity, note) {
    console.log('showEditOrderItemModal called with itemId:', itemId);
    if (currentOrderItemsModal) {
        currentOrderItemsModal.hide();
    }
    const form = document.getElementById('resourceForm');
    form.innerHTML = `
        <input type="hidden" id="itemId" value="${itemId}">
        <div class="mb-3">
            <label for="menuItemSearch" class="form-label">البحث عن العنصر</label>
            <input type="text" class="form-control" id="menuItemSearch" oninput="filterMenuItems()">
        </div>
        <div class="mb-3">
            <label for="menuItemId" class="form-label">العنصر</label>
            <select class="form-select" id="menuItemId" required>
                <option value="">اختر عنصر</option>
                ${menuItems.filter(item => item.available === 1).map(item => `<option value="${item.id}" ${item.id === menuItemId ? 'selected' : ''}>${item.name}</option>`).join('')}
            </select>
        </div>
        <div class="mb-3">
            <label for="quantity" class="form-label">الكمية</label>
            <input type="number" class="form-control" id="quantity" value="${quantity}" min="1" required>
        </div>
        <div class="mb-3">
            <label for="note" class="form-label">الملاحظة</label>
            <textarea class="form-control" id="note">${note}</textarea>
        </div>
    `;
    document.getElementById('resourceModalLabel').textContent = 'تعديل عنصر طلب';
    form.onsubmit = async (e) => {
        e.preventDefault();
        await updateOrderItem(itemId);
    };
    const resourceModal = new bootstrap.Modal(document.getElementById('resourceModal'));
    resourceModal.show();
    // Ensure backdrop is properly managed
    document.querySelectorAll('.modal-backdrop').forEach(backdrop => backdrop.remove());
    document.body.classList.add('modal-open');
    document.body.style.paddingRight = '';
}

async function updateOrderItem(itemId) {
    console.log('updateOrderItem called with itemId:', itemId);
    const menuItemId = parseInt(document.getElementById('menuItemId').value);
    const quantity = parseInt(document.getElementById('quantity').value);
    const note = document.getElementById('note').value.trim();

    if (!menuItemId || isNaN(quantity) || quantity <= 0) {
        showAlert('warning', 'الرجاء إدخال عنصر وكمية صحيحة');
        return;
    }

    const data = { menu_item_id: menuItemId, quantity, note };

    showLoadingSpinner();
    try {
        const response = await axios.put(`${ORDER_ITEMS_API_URL}/${itemId}`, data);
        console.log('Order item updated:', response.data);
        showAlert('success', response.data.message);
        bootstrap.Modal.getInstance(document.getElementById('resourceModal')).hide();
        await showOrderItemsModal(response.data.order_item.order_id, currentStatus);
    } catch (error) {
        console.error('Error in updateOrderItem:', error.response || error);
        showAlert('danger', error.response?.data?.error || 'خطأ في تعديل عنصر الطلب');
    } finally {
        hideLoadingSpinner();
    }
}

async function deleteOrderItem(itemId, orderId) {
    console.log('deleteOrderItem called with itemId:', itemId, 'orderId:', orderId);
    if (!confirm('هل أنت متأكد من حذف هذا العنصر؟')) return;
    showLoadingSpinner();
    try {
        const response = await axios.delete(`${ORDER_ITEMS_API_URL}/${itemId}`);
        console.log('Order item deleted:', response.data);
        showAlert('success', response.data.message);
        await showOrderItemsModal(orderId, currentStatus);
    } catch (error) {
        console.error('Error in deleteOrderItem:', error.response || error);
        showAlert('danger', error.response?.data?.error || 'خطأ في حذف عنصر الطلب');
    } finally {
        hideLoadingSpinner();
    }
}

function filterMenuItems() {
    const searchInput = document.getElementById('menuItemSearch').value.toLowerCase();
    const select = document.getElementById('menuItemId');
    const options = select.options;
    for (let i = 1; i < options.length; i++) { // Skip the first "اختر عنصر" option
        const text = options[i].text.toLowerCase();
        options[i].style.display = text.includes(searchInput) ? '' : 'none';
    }
}

function switchToWaiterMode() {
    console.log('switchToWaiterMode called');
    window.location.href = '../index.html';
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

// Clean up modals when hidden to prevent backdrop issues
document.getElementById('orderItemsModal').addEventListener('hidden.bs.modal', () => {
    console.log('orderItemsModal hidden, cleaning up');
    currentOrderItemsModal = null;
    currentOrderId = null;
    document.querySelectorAll('.modal-backdrop').forEach(backdrop => backdrop.remove());
    document.body.classList.remove('modal-open');
    document.body.style.paddingRight = '';
});

document.getElementById('resourceModal').addEventListener('hidden.bs.modal', () => {
    console.log('resourceModal hidden, cleaning up');
    if (currentOrderItemsModal) {
        currentOrderItemsModal.show();
    }
    document.querySelectorAll('.modal-backdrop').forEach(backdrop => backdrop.remove());
    document.body.classList.add('modal-open');
    document.body.style.paddingRight = '';
});