const API_BASE_URL = `http://${BASE_URL}/tables`;
const SEATS_API_BASE_URL = `http://${BASE_URL}/seats`;

async function loadSection(section) {
    console.log('loadSection called with section:', section);
    showLoadingSpinner();
    try {
        if (section === 'tables') {
            await loadTables();
        }
    } catch (error) {
        console.error('Error in loadSection:', error);
        showAlert('danger', 'خطأ في تحميل البيانات: ' + error.message);
    } finally {
        hideLoadingSpinner();
    }
}

async function loadTables() {
    console.log('loadTables called, fetching from:', API_BASE_URL);
    try {
        const response = await axios.get(API_BASE_URL);
        console.log('Tables fetched:', response.data);
        const { tables, total } = response.data;
        const content = document.getElementById('section-content');
        content.innerHTML = `
            <div class="d-flex justify-content-between mb-3">
                <button class="btn btn-primary" onclick="showAddTableModal()">إضافة طاولة</button>
            </div>
            <table class="table table-striped">
                <thead>
                    <tr>
                        <th>المعرف</th>
                        <th>رقم الطاولة</th>
                        <th>السعة</th>
                        <th>الحالة</th>
                        <th>الإجراءات</th>
                    </tr>
                </thead>
                <tbody>
                    ${tables.map(table => `
                        <tr>
                            <td>${table.id}</td>
                            <td>${table.table_number}</td>
                            <td>${table.capacity}</td>
                            <td>
                                <select class="form-select form-select-sm" onchange="updateTableStatus(${table.id}, this.value)">
                                    <option value="available" ${table.status === 'available' ? 'selected' : ''}>متوفر</option>
                                    <option value="occupied" ${table.status === 'occupied' ? 'selected' : ''}>محجوز</option>
                                    <option value="reserved" ${table.status === 'reserved' ? 'selected' : ''}>محجوز مسبقاً</option>
                                </select>
                            </td>
                            <td>
                                <button class="btn btn-sm btn-warning" onclick="showEditTableModal(${table.id}, ${table.table_number}, '${table.status}', ${table.capacity})">تعديل</button>
                                <button class="btn btn-sm btn-danger" onclick="deleteTable(${table.id})">حذف</button>
                                <button class="btn btn-sm btn-info" onclick="loadSeats(${table.id})">عرض المقاعد</button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
            <p>إجمالي الطاولات: ${total}</p>
        `;
    } catch (error) {
        console.error('Error in loadTables:', error.response || error);
        showAlert('danger', 'خطأ في جلب الطاولات: ' + (error.response?.data?.error || error.message));
    }
}

async function loadSeats(tableId) {
    console.log('loadSeats called with tableId:', tableId);
    try {
        const response = await axios.get(`${API_BASE_URL}/${tableId}/seats`);
        console.log('Seats fetched:', response.data);
        const { seats, total } = response.data;
        const seatsContent = document.getElementById('seats-content');
        seatsContent.innerHTML = `
            <h4>مقاعد الطاولة ${tableId}</h4>
            <div class="d-flex justify-content-between mb-3">
                <button class="btn btn-primary" onclick="showAddSeatModal(${tableId})">إضافة مقعد</button>
                <button class="btn btn-warning" onclick="freeSeats(${tableId})">تحرير جميع المقاعد</button>
                <button class="btn btn-success" onclick="showAssignSeatsModal(${tableId})">تخصيص مقاعد</button>
            </div>
            <table class="table table-bordered">
                <thead>
                    <tr>
                        <th>معرف المقعد</th>
                        <th>رقم المقعد</th>
                        <th>الحالة</th>
                        <th>الإجراءات</th>
                    </tr>
                </thead>
                <tbody>
                    ${seats.map(seat => `
                        <tr>
                            <td>${seat.id}</td>
                            <td>${seat.seat_number}</td>
                            <td>
                                <select class="form-select form-select-sm" onchange="updateSeatStatus(${seat.id}, this.value, ${tableId})">
                                    <option value="available" ${seat.status === 'available' ? 'selected' : ''}>متوفر</option>
                                    <option value="occupied" ${seat.status === 'occupied' ? 'selected' : ''}>محجوز</option>
                                </select>
                            </td>
                            <td>
                                <button class="btn btn-sm btn-danger" onclick="deleteSeat(${seat.id}, ${tableId})">حذف</button>
                                <button class="btn btn-sm btn-primary" onclick="showAssignOrderToSeatModal(${seat.id}, ${tableId})">تخصيص طلب</button>
                                <button class="btn btn-sm btn-warning" onclick="freeSeat(${seat.id}, ${tableId})">تحرير</button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
            <p>إجمالي المقاعد: ${total}</p>
        `;
    } catch (error) {
        console.error('Error in loadSeats:', error.response || error);
        showAlert('danger', 'خطأ في جلب المقاعد: ' + (error.response?.data?.error || error.message));
    }
}

function showAddTableModal() {
    console.log('showAddTableModal called');
    const form = document.getElementById('resourceForm');
    form.innerHTML = `
        <div class="mb-3">
            <label for="tableNumber" class="form-label">رقم الطاولة</label>
            <input type="number" class="form-control" id="tableNumber" min="1" required>
        </div>
        <div class="mb-3">
            <label for="tableCapacity" class="form-label">السعة (عدد المقاعد)</label>
            <input type="number" class="form-control" id="tableCapacity" min="1" required>
        </div>
        <div class="mb-3">
            <label for="tableStatus" class="form-label">الحالة</label>
            <select class="form-select" id="tableStatus" required>
                <option value="available">متوفر</option>
                <option value="occupied">محجوز</option>
                <option value="reserved">محجوز مسبقاً</option>
            </select>
        </div>
    `;
    document.getElementById('resourceModalLabel').textContent = 'إضافة طاولة';
    form.onsubmit = async (e) => {
        e.preventDefault();
        await addTable();
    };
    new bootstrap.Modal(document.getElementById('resourceModal')).show();
}

function showEditTableModal(id, tableNumber, status, capacity) {
    console.log('showEditTableModal called with id:', id, 'tableNumber:', tableNumber, 'status:', status, 'capacity:', capacity);
    const form = document.getElementById('resourceForm');
    form.innerHTML = `
        <input type="hidden" id="tableId" value="${id}">
        <div class="mb-3">
            <label for="tableNumber" class="form-label">رقم الطاولة</label>
            <input type="number" class="form-control" id="tableNumber" value="${tableNumber}" min="1" required>
        </div>
        <div class="mb-3">
            <label for="tableCapacity" class="form-label">السعة (عدد المقاعد)</label>
            <input type="number" class="form-control" id="tableCapacity" value="${capacity}" min="1" required>
        </div>
        <div class="mb-3">
            <label for="tableStatus" class="form-label">الحالة</label>
            <select class="form-select" id="tableStatus" required>
                <option value="available" ${status === 'available' ? 'selected' : ''}>متوفر</option>
                <option value="occupied" ${status === 'occupied' ? 'selected' : ''}>محجوز</option>
                <option value="reserved" ${status === 'reserved' ? 'selected' : ''}>محجوز مسبقاً</option>
            </select>
        </div>
    `;
    document.getElementById('resourceModalLabel').textContent = 'تعديل طاولة';
    form.onsubmit = async (e) => {
        e.preventDefault();
        await updateTable(id);
    };
    new bootstrap.Modal(document.getElementById('resourceModal')).show();
}

function showAddSeatModal(tableId) {
    console.log('showAddSeatModal called with tableId:', tableId);
    const form = document.getElementById('resourceForm');
    form.innerHTML = `
        <input type="hidden" id="tableId" value="${tableId}">
        <div class="mb-3">
            <label for="seatNumber" class="form-label">رقم المقعد</label>
            <input type="number" class="form-control" id="seatNumber" min="1" required>
        </div>
        <div class="mb-3">
            <label for="seatStatus" class="form-label">الحالة</label>
            <select class="form-select" id="seatStatus" required>
                <option value="available">متوفر</option>
                <option value="occupied">محجوز</option>
            </select>
        </div>
    `;
    document.getElementById('resourceModalLabel').textContent = 'إضافة مقعد';
    form.onsubmit = async (e) => {
        e.preventDefault();
        await addSeat(tableId);
    };
    new bootstrap.Modal(document.getElementById('resourceModal')).show();
}

function showAssignSeatsModal(tableId) {
    console.log('showAssignSeatsModal called with tableId:', tableId);
    const form = document.getElementById('resourceForm');
    form.innerHTML = `
        <input type="hidden" id="tableId" value="${tableId}">
        <div class="mb-3">
            <label for="partySize" class="form-label">عدد الأشخاص</label>
            <input type="number" class="form-control" id="partySize" min="1" required>
        </div>
    `;
    document.getElementById('resourceModalLabel').textContent = 'تخصيص مقاعد';
    form.onsubmit = async (e) => {
        e.preventDefault();
        await assignSeats(tableId);
    };
    new bootstrap.Modal(document.getElementById('resourceModal')).show();
}

function showAssignOrderToSeatModal(seatId, tableId) {
    console.log('showAssignOrderToSeatModal called with seatId:', seatId, 'tableId:', tableId);
    const form = document.getElementById('resourceForm');
    form.innerHTML = `
        <input type="hidden" id="seatId" value="${seatId}">
        <input type="hidden" id="tableId" value="${tableId}">
        <div class="mb-3">
            <label for="orderId" class="form-label">معرف الطلب</label>
            <input type="number" class="form-control" id="orderId" min="1" required>
        </div>
    `;
    document.getElementById('resourceModalLabel').textContent = 'تخصيص طلب لمقعد';
    form.onsubmit = async (e) => {
        e.preventDefault();
        await assignOrderToSeat(seatId, tableId);
    };
    new bootstrap.Modal(document.getElementById('resourceModal')).show();
}

async function addTable() {
    console.log('addTable called');
    const tableNumber = parseInt(document.getElementById('tableNumber').value);
    const capacity = parseInt(document.getElementById('tableCapacity').value);
    const status = document.getElementById('tableStatus').value;

    if (isNaN(tableNumber) || tableNumber <= 0) {
        showAlert('warning', 'الرجاء إدخال رقم طاولة صحيح');
        return;
    }
    if (isNaN(capacity) || capacity <= 0) {
        showAlert('warning', 'الرجاء إدخال سعة صحيحة');
        return;
    }
    if (!['available', 'occupied', 'reserved'].includes(status)) {
        showAlert('warning', 'الرجاء اختيار حالة صحيحة');
        return;
    }

    showLoadingSpinner();
    try {
        const response = await axios.post(API_BASE_URL, { table_number: tableNumber, capacity, status });
        console.log('Table added:', response.data);
        showAlert('success', response.data.message);
        bootstrap.Modal.getInstance(document.getElementById('resourceModal')).hide();
        await loadTables();
    } catch (error) {
        console.error('Error in addTable:', error.response || error);
        showAlert('danger', error.response?.data?.error || 'خطأ في إضافة الطاولة');
    } finally {
        hideLoadingSpinner();
    }
}

async function updateTable(id) {
    console.log('updateTable called with id:', id);
    const tableNumber = parseInt(document.getElementById('tableNumber').value);
    const capacity = parseInt(document.getElementById('tableCapacity').value);
    const status = document.getElementById('tableStatus').value;

    if (isNaN(tableNumber) || tableNumber <= 0) {
        showAlert('warning', 'الرجاء إدخال رقم طاولة صحيح');
        return;
    }
    if (isNaN(capacity) || capacity <= 0) {
        showAlert('warning', 'الرجاء إدخال سعة صحيحة');
        return;
    }
    if (!['available', 'occupied', 'reserved'].includes(status)) {
        showAlert('warning', 'الرجاء اختيار حالة صحيحة');
        return;
    }

    showLoadingSpinner();
    try {
        const requestBody = { status, capacity };
        if (tableNumber) {
            requestBody.table_number = tableNumber;
        }
        const response = await axios.put(`${API_BASE_URL}/${id}`, requestBody);
        console.log('Table updated:', response.data);
        showAlert('success', response.data.message);
        bootstrap.Modal.getInstance(document.getElementById('resourceModal')).hide();
        await loadTables();
    } catch (error) {
        console.error('Error in updateTable:', error.response || error);
        let errorMessage = error.response?.data?.error || 'خطأ في تعديل الطاولة';
        if (error.response?.status === 400) {
            if (errorMessage.includes('table_number')) {
                errorMessage = 'رقم الطاولة غير صالح أو مكرر';
            } else if (errorMessage.includes('status')) {
                errorMessage = 'الحالة غير صالحة. يجب أن تكون: متوفر، محجوز، أو محجوز مسبقاً';
            } else if (errorMessage.includes('capacity')) {
                errorMessage = 'السعة غير صالحة أو أقل من عدد المقاعد الحالية';
            }
        } else if (error.response?.status === 404) {
            errorMessage = 'الطاولة غير موجودة أو فشل التحديث';
        }
        showAlert('danger', errorMessage);
    } finally {
        hideLoadingSpinner();
    }
}

async function updateTableStatus(id, status) {
    console.log('updateTableStatus called with id:', id, 'status:', status);
    if (!['available', 'occupied', 'reserved'].includes(status)) {
        showAlert('warning', 'الرجاء اختيار حالة صحيحة');
        return;
    }

    showLoadingSpinner();
    try {
        const response = await axios.put(`${API_BASE_URL}/${id}`, { status });
        console.log('Table status updated:', response.data);
        showAlert('success', response.data.message);
        await loadTables();
    } catch (error) {
        console.error('Error in updateTableStatus:', error.response || error);
        let errorMessage = error.response?.data?.error || 'خطأ في تحديث حالة الطاولة';
        if (error.response?.status === 400) {
            errorMessage = 'الحالة غير صالحة. يجب أن تكون: متوفر، محجوز، أو محجوز مسبقاً';
        } else if (error.response?.status === 404) {
            errorMessage = 'الطاولة غير موجودة أو فشل التحديث';
        }
        showAlert('danger', errorMessage);
    } finally {
        hideLoadingSpinner();
    }
}

async function deleteTable(id) {
    console.log('deleteTable called with id:', id);
    if (!confirm('هل أنت متأكد من حذف هذه الطاولة؟')) return;
    showLoadingSpinner();
    try {
        const response = await axios.delete(`${API_BASE_URL}/${id}`);
        console.log('Table deleted:', response.data);
        showAlert('success', response.data.message);
        await loadTables();
    } catch (error) {
        console.error('Error in deleteTable:', error.response || error);
        let errorMessage = error.response?.data?.error || 'خطأ في حذف الطاولة';
        if (error.response?.status === 400) {
            errorMessage = 'لا يمكن حذف الطاولة لوجود طلبات أو حجوزات نشطة مرتبطة بها';
        }
        showAlert('danger', errorMessage);
    } finally {
        hideLoadingSpinner();
    }
}

async function addSeat(tableId) {
    console.log('addSeat called with tableId:', tableId);
    const seatNumber = parseInt(document.getElementById('seatNumber').value);
    const status = document.getElementById('seatStatus').value;

    if (isNaN(seatNumber) || seatNumber <= 0) {
        showAlert('warning', 'الرجاء إدخال رقم مقعد صحيح');
        return;
    }
    if (!['available', 'occupied'].includes(status)) {
        showAlert('warning', 'الرجاء اختيار حالة صحيحة');
        return;
    }

    showLoadingSpinner();
    try {
        const response = await axios.post(SEATS_API_BASE_URL, { table_id: tableId, seat_number: seatNumber, status });
        console.log('Seat added:', response.data);
        showAlert('success', response.data.message);
        bootstrap.Modal.getInstance(document.getElementById('resourceModal')).hide();
        await loadSeats(tableId);
    } catch (error) {
        console.error('Error in addSeat:', error.response || error);
        showAlert('danger', error.response?.data?.error || 'خطأ في إضافة المقعد');
    } finally {
        hideLoadingSpinner();
    }
}

async function updateSeatStatus(seatId, status, tableId) {
    console.log('updateSeatStatus called with seatId:', seatId, 'status:', status, 'tableId:', tableId);
    if (!['available', 'occupied'].includes(status)) {
        showAlert('warning', 'الرجاء اختيار حالة صحيحة');
        return;
    }

    showLoadingSpinner();
    try {
        const response = await axios.put(`${SEATS_API_BASE_URL}/${seatId}`, { status });
        console.log('Seat status updated:', response.data);
        showAlert('success', response.data.message);
        await loadSeats(tableId);
    } catch (error) {
        console.error('Error in updateSeatStatus:', error.response || error);
        let errorMessage = error.response?.data?.error || 'خطأ في تحديث حالة المقعد';
        if (error.response?.status === 400) {
            errorMessage = 'الحالة غير صالحة. يجب أن تكون: متوفر أو محجوز';
        } else if (error.response?.status === 404) {
            errorMessage = 'المقعد غير موجود';
        }
        showAlert('danger', errorMessage);
    } finally {
        hideLoadingSpinner();
    }
}

async function deleteSeat(seatId, tableId) {
    console.log('deleteSeat called with seatId:', seatId, 'tableId:', tableId);
    if (!confirm('هل أنت متأكد من حذف هذا المقعد؟')) return;
    showLoadingSpinner();
    try {
        const response = await axios.delete(`${SEATS_API_BASE_URL}/${seatId}`);
        console.log('Seat deleted:', response.data);
        showAlert('success', response.data.message);
        await loadSeats(tableId);
    } catch (error) {
        console.error('Error in deleteSeat:', error.response || error);
        let errorMessage = error.response?.data?.error || 'خطأ في حذف المقعد';
        if (error.response?.status === 404) {
            errorMessage = 'المقعد غير موجود';
        }
        showAlert('danger', errorMessage);
    } finally {
        hideLoadingSpinner();
    }
}

async function assignSeats(tableId) {
    console.log('assignSeats called with tableId:', tableId);
    const partySize = parseInt(document.getElementById('partySize').value);

    if (isNaN(partySize) || partySize <= 0) {
        showAlert('warning', 'الرجاء إدخال عدد أشخاص صحيح');
        return;
    }

    showLoadingSpinner();
    try {
        const response = await axios.post(`${API_BASE_URL}/${tableId}/assign_seats`, { required_seats: partySize });
        console.log('Seats assigned:', response.data);
        showAlert('success', response.data.message);
        bootstrap.Modal.getInstance(document.getElementById('resourceModal')).hide();
        await loadSeats(tableId);
    } catch (error) {
        console.error('Error in assignSeats:', error.response || error);
        let errorMessage = error.response?.data?.error || 'خطأ في تخصيص المقاعد';
        if (error.response?.status === 400) {
            errorMessage = 'عدد المقاعد غير كافٍ أو الطاولة غير موجودة';
        }
        showAlert('danger', errorMessage);
    } finally {
        hideLoadingSpinner();
    }
}

async function freeSeats(tableId) {
    console.log('freeSeats called with tableId:', tableId);
    showLoadingSpinner();
    try {
        const response = await axios.post(`${API_BASE_URL}/${tableId}/free_seats`);
        console.log('Seats freed:', response.data);
        showAlert('success', response.data.message);
        await loadSeats(tableId);
    } catch (error) {
        console.error('Error in freeSeats:', error.response || error);
        showAlert('danger', error.response?.data?.error || 'خطأ في تحرير المقاعد');
    } finally {
        hideLoadingSpinner();
    }
}

async function freeSeat(seatId, tableId) {
    console.log('freeSeat called with seatId:', seatId, 'tableId:', tableId);
    showLoadingSpinner();
    try {
        const response = await axios.post(`${SEATS_API_BASE_URL}/${seatId}/free`);
        console.log('Seat freed:', response.data);
        showAlert('success', response.data.message);
        await loadSeats(tableId);
    } catch (error) {
        console.error('Error in freeSeat:', error.response || error);
        showAlert('danger', error.response?.data?.error || 'خطأ في تحرير المقعد');
    } finally {
        hideLoadingSpinner();
    }
}

async function assignOrderToSeat(seatId, tableId) {
    console.log('assignOrderToSeat called with seatId:', seatId, 'tableId:', tableId);
    const orderId = parseInt(document.getElementById('orderId').value);

    if (isNaN(orderId) || orderId <= 0) {
        showAlert('warning', 'الرجاء إدخال معرف طلب صحيح');
        return;
    }

    showLoadingSpinner();
    try {
        const response = await axios.post(`${SEATS_API_BASE_URL}/${seatId}/assign_order`, { order_id: orderId });
        console.log('Order assigned to seat:', response.data);
        showAlert('success', response.data.message);
        bootstrap.Modal.getInstance(document.getElementById('resourceModal')).hide();
        await loadSeats(tableId);
    } catch (error) {
        console.error('Error in assignOrderToSeat:', error.response || error);
        let errorMessage = error.response?.data?.error || 'خطأ في تخصيص الطلب للمقعد';
        if (error.response?.status === 400) {
            errorMessage = 'المقعد غير متوفر أو الطلب غير موجود';
        }
        showAlert('danger', errorMessage);
    } finally {
        hideLoadingSpinner();
    }
}

function switchToWaiterMode() {
    console.log('switchToWaiterMode called');
    window.location.href = '/waiters/index.html';
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