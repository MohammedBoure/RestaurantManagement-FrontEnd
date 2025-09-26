const API_BASE = `http://${BASE_URL}`;

function showLoading(show) {
    document.getElementById('loading-spinner').style.display = show ? 'block' : 'none';
    document.getElementById('section-content').style.display = show ? 'none' : 'block';
}

function showAlert(message, type = 'danger') {
    const alertContainer = document.getElementById('alert-container');
    const alertMessage = document.getElementById('alert-message');
    alertMessage.textContent = message;
    alertContainer.classList.remove('d-none', 'alert-success', 'alert-danger');
    alertContainer.classList.add(`alert-${type}`);
    setTimeout(() => {
        alertContainer.classList.add('d-none');
    }, 5000);
}

function preparePasswordForm(role) {
    document.getElementById('role').value = role;
    document.getElementById('resourceModalLabel').textContent = `تغيير كلمة المرور - ${role === 'admin' ? 'الأدمن' : role === 'chef' ? 'الطباخ' : role === 'cashier' ? 'مستقبل الدفعات' : 'النادل'}`;
    document.getElementById('new-password').value = '';
    document.getElementById('confirm-password').value = '';
}

async function loadSettings() {
    showLoading(true);
    try {
        const passwordResponse = await axios.get(`${API_BASE}/settings/passwords`, {
            headers: { 'Accept': 'application/json' }
        });
        const passwords = passwordResponse.data;
        document.getElementById('admin-password').textContent = passwords.admin || '';
        document.getElementById('chef-password').textContent = passwords.chef || '';
        document.getElementById('cashier-password').textContent = passwords.cashier || '';
        document.getElementById('waiter-password').textContent = passwords.waiter || '';
    } catch (error) {
        const message = error.response?.data?.error || 'خطأ في جلب كلمات المرور';
        showAlert(message);
        console.error('Error loading passwords:', error);
    } finally {
        showLoading(false);
    }
}

async function updatePassword() {
    const role = document.getElementById('role').value;
    const password = document.getElementById('new-password').value;
    const confirmPassword = document.getElementById('confirm-password').value;

    if (!password || password !== confirmPassword) {
        showAlert('كلمات المرور غير متطابقة أو فارغة', 'danger');
        return;
    }

    showLoading(true);
    try {
        await axios.put(`${API_BASE}/settings/passwords`, {
            role: role,
            password: password
        }, {
            headers: { 
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        });
        showAlert('تم تحديث كلمة المرور بنجاح', 'success');
        const modal = bootstrap.Modal.getInstance(document.getElementById('resourceModal'));
        modal.hide();
        document.getElementById(`${role}-password`).textContent = '********';
    } catch (error) {
        const message = error.response?.data?.error || 'خطأ في تحديث كلمة المرور';
        showAlert(message);
        console.error('Error updating password:', error);
    } finally {
        showLoading(false);
    }
}

async function deletePassword(role) {
    if (!confirm(`هل أنت متأكد من حذف كلمة المرور لـ ${role === 'admin' ? 'الأدمن' : role === 'chef' ? 'الطباخ' : role === 'cashier' ? 'مستقبل الدفعات' : 'النادل'}؟`)) {
        return;
    }

    showLoading(true);
    try {
        await axios.delete(`${API_BASE}/settings/passwords`, {
            data: { role: role },
            headers: { 
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        });
        showAlert('تم حذف كلمة المرور بنجاح', 'success');
        document.getElementById(`${role}-password`).textContent = '';
    } catch (error) {
        const message = error.response?.data?.error || 'خطأ في حذف كلمة المرور';
        showAlert(message);
        console.error('Error deleting password:', error);
    } finally {
        showLoading(false);
    }
}