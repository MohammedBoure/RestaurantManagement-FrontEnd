const API_BASE_URL = `http://${BASE_URL}/categories`;

async function loadSection(section) {
    console.log('loadSection called with section:', section);
    showLoadingSpinner();
    try {
        if (section === 'categories') {
            await loadCategories();
        }
    } catch (error) {
        console.error('Error in loadSection:', error);
        showAlert('danger', 'خطأ في تحميل البيانات: ' + error.message);
    } finally {
        hideLoadingSpinner();
    }
}

async function loadCategories() {
    console.log('loadCategories called, fetching from:', API_BASE_URL);
    try {
        const response = await axios.get(API_BASE_URL);
        console.log('Categories fetched:', response.data);
        const { categories, total } = response.data;
        const content = document.getElementById('section-content');
        content.innerHTML = `
            <div class="d-flex justify-content-between mb-3">
                <button class="btn btn-primary" onclick="showAddCategoryModal()">إضافة فئة</button>
            </div>
            <table class="table table-striped">
                <thead>
                    <tr>
                        <th>المعرف</th>
                        <th>الاسم</th>
                        <th>الإجراءات</th>
                    </tr>
                </thead>
                <tbody>
                    ${categories.map(category => `
                        <tr>
                            <td>${category.id}</td>
                            <td>${category.name}</td>
                            <td>
                                <button class="btn btn-sm btn-warning" onclick="showEditCategoryModal(${category.id}, '${category.name}')">تعديل</button>
                                <button class="btn btn-sm btn-danger" onclick="deleteCategory(${category.id})">حذف</button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
            <p>إجمالي الفئات: ${total}</p>
        `;
    } catch (error) {
        console.error('Error in loadCategories:', error.response || error);
        showAlert('danger', 'خطأ في جلب الفئات: ' + (error.response?.data?.error || error.message));
    }
}

function showAddCategoryModal() {
    console.log('showAddCategoryModal called');
    const form = document.getElementById('resourceForm');
    form.innerHTML = `
        <div class="mb-3">
            <label for="categoryName" class="form-label">اسم الفئة</label>
            <input type="text" class="form-control" id="categoryName" required>
        </div>
    `;
    document.getElementById('resourceModalLabel').textContent = 'إضافة فئة';
    form.onsubmit = async (e) => {
        e.preventDefault();
        await addCategory();
    };
    new bootstrap.Modal(document.getElementById('resourceModal')).show();
}

function showEditCategoryModal(id, name) {
    console.log('showEditCategoryModal called with id:', id, 'name:', name);
    const form = document.getElementById('resourceForm');
    form.innerHTML = `
        <input type="hidden" id="categoryId" value="${id}">
        <div class="mb-3">
            <label for="categoryName" class="form-label">اسم الفئة</label>
            <input type="text" class="form-control" id="categoryName" value="${name}" required>
        </div>
    `;
    document.getElementById('resourceModalLabel').textContent = 'تعديل فئة';
    form.onsubmit = async (e) => {
        e.preventDefault();
        await updateCategory(id);
    };
    new bootstrap.Modal(document.getElementById('resourceModal')).show();
}

async function addCategory() {
    const name = document.getElementById('categoryName').value.trim();
    console.log('addCategory called with name:', name);
    if (!name) {
        showAlert('warning', 'الرجاء إدخال اسم الفئة');
        return;
    }
    showLoadingSpinner();
    try {
        const response = await axios.post(API_BASE_URL, { name });
        console.log('Category added:', response.data);
        showAlert('success', response.data.message);
        bootstrap.Modal.getInstance(document.getElementById('resourceModal')).hide();
        await loadCategories();
    } catch (error) {
        console.error('Error in addCategory:', error.response || error);
        showAlert('danger', error.response?.data?.error || 'خطأ في إضافة الفئة');
    } finally {
        hideLoadingSpinner();
    }
}

async function updateCategory(id) {
    const name = document.getElementById('categoryName').value.trim();
    console.log('updateCategory called with id:', id, 'name:', name);
    if (!name) {
        showAlert('warning', 'الرجاء إدخال اسم الفئة');
        return;
    }
    showLoadingSpinner();
    try {
        const response = await axios.put(`${API_BASE_URL}/${id}`, { name });
        console.log('Category updated:', response.data);
        showAlert('success', response.data.message);
        bootstrap.Modal.getInstance(document.getElementById('resourceModal')).hide();
        await loadCategories();
    } catch (error) {
        console.error('Error in updateCategory:', error.response || error);
        showAlert('danger', error.response?.data?.error || 'خطأ في تعديل الفئة');
    } finally {
        hideLoadingSpinner();
    }
}

async function deleteCategory(id) {
    console.log('deleteCategory called with id:', id);
    if (!confirm('هل أنت متأكد من حذف هذه الفئة؟')) return;
    showLoadingSpinner();
    try {
        const response = await axios.delete(`${API_BASE_URL}/${id}`);
        console.log('Category deleted:', response.data);
        showAlert('success', response.data.message);
        await loadCategories();
    } catch (error) {
        console.error('Error in deleteCategory:', error.response || error);
        showAlert('danger', error.response?.data?.error || 'خطأ في حذف الفئة');
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