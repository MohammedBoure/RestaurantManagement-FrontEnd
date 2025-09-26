const API_BASE_URL = `http://${BASE_URL}/menu_items`;
const CATEGORIES_API_URL = `http://${BASE_URL}/categories`;

async function loadSection(section) {
    console.log('loadSection called with section:', section);
    showLoadingSpinner();
    try {
        if (section === 'menu_items') {
            await loadMenuItems();
        }
    } catch (error) {
        console.error('ErrorទError in loadSection:', error);
        showAlert('danger', 'خطأ في تحميل البيانات: ' + error.message);
    } finally {
        hideLoadingSpinner();
    }
}

async function loadMenuItems(categoryId = null) {
    console.log('loadMenuItems called, categoryId:', categoryId);
    try {
        const url = categoryId ? `${API_BASE_URL}?category_id=${categoryId}` : API_BASE_URL;
        const response = await axios.get(url);
        console.log('Menu items fetched:', response.data);
        const { menu_items, total } = response.data;

        const categoriesResponse = await axios.get(CATEGORIES_API_URL);
        const categories = categoriesResponse.data.categories;

        const content = document.getElementById('section-content');
        content.innerHTML = `
            <div class="d-flex justify-content-between mb-3">
                <button class="btn btn-primary" onclick="showAddMenuItemModal()">إضافة عنصر</button>
            </div>
            <div class="mb-3">
                <label for="categoryFilter" class="form-label">تصفية حسب الفئة</label>
                <select class="form-select" id="categoryFilter" onchange="filterByCategory()">
                    <option value="">جميع الفئات</option>
                    ${categories.map(category => `
                        <option value="${category.id}">${category.name}</option>
                    `).join('')}
                </select>
            </div>
            <table class="table table-striped">
                <thead>
                    <tr>
                        <th>المعرف</th>
                        <th>الاسم</th>
                        <th>الفئة</th>
                        <th>السعر</th>
                        <th>الوصف</th>
                        <th>متوفر</th>
                        <th>الصورة</th>
                        <th>الإجراءات</th>
                    </tr>
                </thead>
                <tbody>
                    ${menu_items.map(item => `
                        <tr>
                            <td>${item.id}</td>
                            <td>${item.name}</td>
                            <td>${categories.find(cat => cat.id === item.category_id)?.name || 'غير معروف'}</td>
                            <td>${item.price}</td>
                            <td>${item.description || '-'}</td>
                            <td>
                                <input type="checkbox" ${item.available ? 'checked' : ''} 
                                       onchange="setAvailability(${item.id}, this.checked)" />
                            </td>
                            <td>
                                ${item.image_url 
                                    ? `<img src="${item.image_url.startsWith('http') ? item.image_url : `http://${BASE_URL}${item.image_url}`}" width="50" />`
                                    : '-'}
                            </td>
                            <td>
                                <button class="btn btn-sm btn-warning" 
                                    onclick="showEditMenuItemModal(${item.id}, '${item.name}', ${item.category_id}, ${item.price}, '${item.description || ''}', ${item.available}, '${item.image_url || ''}')">
                                    تعديل
                                </button>
                                <button class="btn btn-sm btn-danger" onclick="deleteMenuItem(${item.id})">
                                    حذف
                                </button>
                            </td>

                        </tr>
                    `).join('')}
                </tbody>
            </table>
            <p>إجمالي العناصر: ${total}</p>
        `;
    } catch (error) {
        console.error('Error in loadMenuItems:', error.response || error);
        showAlert('danger', 'خطأ في جلب العناصر: ' + (error.response?.data?.error || error.message));
    }
}

async function showAddMenuItemModal() {
    console.log('showAddMenuItemModal called');
    try {
        const response = await axios.get(CATEGORIES_API_URL);
        const categories = response.data.categories;
        const form = document.getElementById('resourceForm');
        form.innerHTML = `
            <div class="mb-3">
                <label for="itemName" class="form-label">اسم العنصر</label>
                <input type="text" class="form-control" id="itemName" required>
            </div>
            <div class="mb-3">
                <label for="categoryId" class="form-label">الفئة</label>
                <select class="form-select" id="categoryId" required>
                    <option value="">اختر فئة</option>
                    ${categories.map(category => `
                        <option value="${category.id}">${category.name}</option>
                    `).join('')}
                </select>
            </div>
            <div class="mb-3">
                <label for="itemPrice" class="form-label">السعر</label>
                <input type="number" class="form-control" id="itemPrice" step="0.01" min="0" required>
            </div>
            <div class="mb-3">
                <label for="itemDescription" class="form-label">الوصف</label>
                <textarea class="form-control" id="itemDescription"></textarea>
            </div>
            <div class="mb-3">
                <label for="itemAvailable" class="form-label">متوفر</label>
                <input type="checkbox" id="itemAvailable" checked>
            </div>
            <div class="mb-3">
                <label for="itemImage" class="form-label">الصورة</label>
                <input type="file" class="form-control" id="itemImage" accept=".png,.jpg,.jpeg,.gif">
            </div>
        `;
        document.getElementById('resourceModalLabel').textContent = 'إضافة عنصر';
        form.onsubmit = async (e) => {
            e.preventDefault();
            await addMenuItem();
        };
        new bootstrap.Modal(document.getElementById('resourceModal')).show();
    } catch (error) {
        console.error('Error fetching categories for modal:', error);
        showAlert('danger', 'خطأ في جلب الفئات: ' + (error.response?.data?.error || error.message));
    }
}

async function showEditMenuItemModal(id, name, category_id, price, description, available, image_url) {
    console.log('showEditMenuItemModal called with id:', id);
    try {
        const response = await axios.get(CATEGORIES_API_URL);
        const categories = response.data.categories;
        const form = document.getElementById('resourceForm');
        form.innerHTML = `
            <input type="hidden" id="itemId" value="${id}">
            <div class="mb-3">
                <label for="itemName" class="form-label">اسم العنصر</label>
                <input type="text" class="form-control" id="itemName" value="${name}" required>
            </div>
            <div class="mb-3">
                <label for="categoryId" class="form-label">الفئة</label>
                <select class="form-select" id="categoryId" required>
                    <option value="">اختر فئة</option>
                    ${categories.map(category => `
                        <option value="${category.id}" ${category.id === category_id ? 'selected' : ''}>${category.name}</option>
                    `).join('')}
                </select>
            </div>
            <div class="mb-3">
                <label for="itemPrice" class="form-label">السعر</label>
                <input type="number" class="form-control" id="itemPrice" value="${price}" step="0.01" min="0" required>
            </div>
            <div class="mb-3">
                <label for="itemDescription" class="form-label">الوصف</label>
                <textarea class="form-control" id="itemDescription">${description}</textarea>
            </div>
            <div class="mb-3">
                <label for="itemAvailable" class="form-label">متوفر</label>
                <input type="checkbox" id="itemAvailable" ${available ? 'checked' : ''}>
            </div>
            <div class="mb-3">
                <label for="itemImage" class="form-label">الصورة</label>
                <input type="file" class="form-control" id="itemImage" accept=".png,.jpg,.jpeg,.gif">
                ${image_url 
                    ? `<div class="mt-2">
                        <img src="${image_url.startsWith('http') ? image_url : `http://${BASE_URL}${image_url}`}" width="100">
                    </div>` 
                    : ''}
            </div>

        `;
        document.getElementById('resourceModalLabel').textContent = 'تعديل عنصر';
        form.onsubmit = async (e) => {
            e.preventDefault();
            await updateMenuItem(id);
        };
        new bootstrap.Modal(document.getElementById('resourceModal')).show();
    } catch (error) {
        console.error('Error fetching categories for modal:', error);
        showAlert('danger', 'خطأ في جلب الفئات: ' + (error.response?.data?.error || error.message));
    }
}

async function addMenuItem() {
    console.log('addMenuItem called');
    const name = document.getElementById('itemName').value.trim();
    const categoryId = document.getElementById('categoryId').value;
    const price = parseFloat(document.getElementById('itemPrice').value);
    const description = document.getElementById('itemDescription').value.trim();
    const available = document.getElementById('itemAvailable').checked ? 1 : 0;
    const image = document.getElementById('itemImage').files[0];

    if (!name || !categoryId || isNaN(price) || price <= 0) {
        showAlert('warning', 'الرجاء إدخال جميع الحقول المطلوبة بشكل صحيح');
        return;
    }

    const formData = new FormData();
    formData.append('name', name);
    formData.append('category_id', categoryId);
    formData.append('price', price);
    formData.append('description', description || '');
    formData.append('available', available);
    if (image) formData.append('image', image);

    showLoadingSpinner();
    try {
        const response = await axios.post(API_BASE_URL, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        console.log('Menu item added:', response.data);
        showAlert('success', response.data.message);
        bootstrap.Modal.getInstance(document.getElementById('resourceModal')).hide();
        await loadMenuItems();
    } catch (error) {
        console.error('Error in addMenuItem:', error.response || error);
        showAlert('danger', error.response?.data?.error || 'خطأ في إضافة العنصر');
    } finally {
        hideLoadingSpinner();
    }
}

async function updateMenuItem(id) {
    console.log('updateMenuItem called with id:', id);
    const name = document.getElementById('itemName').value.trim();
    const categoryId = document.getElementById('categoryId').value;
    const price = parseFloat(document.getElementById('itemPrice').value);
    const description = document.getElementById('itemDescription').value.trim();
    const available = document.getElementById('itemAvailable').checked ? 1 : 0;
    const imageFile = document.getElementById('itemImage').files[0]; // ملف الصورة الجديد إن وجد

    if (!name || !categoryId || isNaN(price) || price <= 0) {
        showAlert('warning', 'الرجاء إدخال جميع الحقول المطلوبة بشكل صحيح');
        return;
    }

    const formData = new FormData();
    formData.append('name', name);
    formData.append('category_id', categoryId);
    formData.append('price', price);
    formData.append('description', description || '');
    formData.append('available', available);

    // إذا رفع صورة جديدة أرسلها
    if (imageFile) {
        formData.append('image', imageFile);
    } else {
        // إذا لم يرفع صورة، يمكن إرسال رابط الصورة القديم
        const currentImage = document.querySelector('#itemImage').dataset.currentUrl || '';
        formData.append('image_url', currentImage);
    }

    showLoadingSpinner();
    try {
        const response = await axios.put(`${API_BASE_URL}/${id}`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        console.log('Menu item updated:', response.data);
        showAlert('success', response.data.message);
        bootstrap.Modal.getInstance(document.getElementById('resourceModal')).hide();
        await loadMenuItems();
    } catch (error) {
        console.error('Error in updateMenuItem:', error.response || error);
        showAlert('danger', error.response?.data?.error || 'خطأ في تعديل العنصر');
    } finally {
        hideLoadingSpinner();
    }
}


async function setAvailability(id, available) {
    console.log('setAvailability called with id:', id, 'available:', available);
    showLoadingSpinner();
    try {
        const response = await axios.put(`${API_BASE_URL}/${id}/availability`, { available: available ? 1 : 0 });
        console.log('Availability updated:', response.data);
        showAlert('success', response.data.message);
        await loadMenuItems();
    } catch (error) {
        console.error('Error in setAvailability:', error.response || error);
        showAlert('danger', error.response?.data?.error || 'خطأ في تحديث التوفر');
    } finally {
        hideLoadingSpinner();
    }
}

async function deleteMenuItem(id) {
    console.log('deleteMenuItem called with id:', id);
    if (!confirm('هل أنت متأكد من حذف هذا العنصر؟')) return;
    showLoadingSpinner();
    try {
        const response = await axios.delete(`${API_BASE_URL}/${id}`);
        console.log('Menu item deleted:', response.data);
        showAlert('success', response.data.message);
        await loadMenuItems();
    } catch (error) {
        console.error('Error in deleteMenuItem:', error.response || error);
        showAlert('danger', error.response?.data?.error || 'خطأ في حذف العنصر');
    } finally {
        hideLoadingSpinner();
    }
}

async function filterByCategory() {
    const categoryId = document.getElementById('categoryFilter').value;
    console.log('filterByCategory called with categoryId:', categoryId);
    await loadMenuItems(categoryId || null);
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