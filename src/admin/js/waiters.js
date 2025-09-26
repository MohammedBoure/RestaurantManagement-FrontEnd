const API_BASE_URL = `http://${BASE_URL}/waiters`;

async function loadSection(section) {
    console.log('loadSection called with section:', section);
    showLoadingSpinner();
    try {
        if (section === 'waiters') {
            await loadWaiters();
        }
    } catch (error) {
        console.error('Error in loadSection:', error);
        showAlert('danger', 'خطأ في تحميل البيانات: ' + error.message);
    } finally {
        hideLoadingSpinner();
    }
}

async function loadWaiters() {
    console.log('loadWaiters called, fetching from:', API_BASE_URL);
    try {
        const response = await axios.get(API_BASE_URL);
        console.log('Waiters fetched:', response.data);
        const { waiters, total } = response.data;
        const content = document.getElementById('section-content');
        content.innerHTML = `
            <div class="d-flex justify-content-between mb-3">
                <button class="btn btn-primary" onclick="showAddWaiterModal()">إضافة نادل</button>
            </div>
            <table class="table table-striped">
                <thead>
                    <tr>
                        <th>المعرف</th>
                        <th>الاسم</th>
                        <th>رمز الجهاز</th>
                        <th>الإجراءات</th>
                    </tr>
                </thead>
                <tbody>
                    ${waiters.map(waiter => `
                        <tr>
                            <td>${waiter.id}</td>
                            <td>${waiter.name}</td>
                            <td>${waiter.device_token || '-'}</td>
                            <td>
                                <button class="btn btn-sm btn-warning" onclick="showEditWaiterModal(${waiter.id}, '${waiter.name}', '${waiter.device_token || ''}')">تعديل</button>
                                <button class="btn btn-sm btn-danger" onclick="deleteWaiter(${waiter.id})">حذف</button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
            <p>إجمالي النادلين: ${total}</p>
        `;
    } catch (error) {
        console.error('Error in loadWaiters:', error.response || error);
        showAlert('danger', 'خطأ في جلب النادلين: ' + (error.response?.data?.error || error.message));
    }
}

function showAddWaiterModal() {
    console.log('showAddWaiterModal called');
    const form = document.getElementById('resourceForm');
    form.innerHTML = `
        <div class="mb-3">
            <label for="waiterName" class="form-label">اسم النادل</label>
            <input type="text" class="form-control" id="waiterName" required>
        </div>
        <div class="mb-3">
            <label for="deviceToken" class="form-label">رمز الجهاز (اختياري)</label>
            <input type="text" class="form-control" id="deviceToken">
        </div>
    `;
    document.getElementById('resourceModalLabel').textContent = 'إضافة نادل';
    form.onsubmit = async (e) => {
        e.preventDefault();
        await addWaiter();
    };
    new bootstrap.Modal(document.getElementById('resourceModal')).show();
}

function showEditWaiterModal(id, name, deviceToken) {
    console.log('showEditWaiterModal called with id:', id, 'name:', name, 'deviceToken:', deviceToken);
    const form = document.getElementById('resourceForm');
    form.innerHTML = `
        <input type="hidden" id="waiterId" value="${id}">
        <div class="mb-3">
            <label for="waiterName" class="form-label">اسم النادل</label>
            <input type="text" class="form-control" id="waiterName" value="${name}" required>
        </div>
        <div class="mb-3">
            <label for="deviceToken" class="form-label">رمز الجهاز (اختياري)</label>
            <input type="text" class="form-control" id="deviceToken" value="${deviceToken}">
        </div>
    `;
    document.getElementById('resourceModalLabel').textContent = 'تعديل نادل';
    form.onsubmit = async (e) => {
        e.preventDefault();
        await updateWaiter(id);
    };
    new bootstrap.Modal(document.getElementById('resourceModal')).show();
}

async function addWaiter() {
    console.log('addWaiter called');
    const name = document.getElementById('waiterName').value.trim();
    const deviceToken = document.getElementById('deviceToken').value.trim();

    if (!name) {
        showAlert('warning', 'الرجاء إدخال اسم النادل');
        return;
    }

    const data = { name };
    if (deviceToken) data.device_token = deviceToken;

    showLoadingSpinner();
    try {
        const response = await axios.post(API_BASE_URL, data);
        console.log('Waiter added:', response.data);
        showAlert('success', response.data.message);
        bootstrap.Modal.getInstance(document.getElementById('resourceModal')).hide();
        await loadWaiters();
    } catch (error) {
        console.error('Error in addWaiter:', error.response || error);
        showAlert('danger', error.response?.data?.error || 'خطأ في إضافة النادل');
    } finally {
        hideLoadingSpinner();
    }
}

async function updateWaiter(id) {
    console.log('updateWaiter called with id:', id);
    const name = document.getElementById('waiterName').value.trim();
    const deviceToken = document.getElementById('deviceToken').value.trim();

    if (!name && !deviceToken) {
        showAlert('warning', 'الرجاء إدخال اسم أو رمز جهاز على الأقل');
        return;
    }

    const data = {};
    if (name) data.name = name;
    if (deviceToken) data.device_token = deviceToken;

    showLoadingSpinner();
    try {
        const response = await axios.put(`${API_BASE_URL}/${id}`, data);
        console.log('Waiter updated:', response.data);
        showAlert('success', response.data.message);
        bootstrap.Modal.getInstance(document.getElementById('resourceModal')).hide();
        await loadWaiters();
    } catch (error) {
        console.error('Error in updateWaiter:', error.response || error);
        showAlert('danger', error.response?.data?.error || 'خطأ في تعديل النادل');
    } finally {
        hideLoadingSpinner();
    }
}

async function deleteWaiter(id) {
    console.log('deleteWaiter called with id:', id);
    if (!confirm('هل أنت متأكد من حذف هذا النادل؟')) return;
    showLoadingSpinner();
    try {
        const response = await axios.delete(`${API_BASE_URL}/${id}`);
        console.log('Waiter deleted:', response.data);
        showAlert('success', response.data.message);
        await loadWaiters();
    } catch (error) {
        console.error('Error in deleteWaiter:', error.response || error);
        showAlert('danger', error.response?.data?.error || 'خطأ في حذف النادل');
    } finally {
        hideLoadingSpinner();
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