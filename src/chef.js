const API_BASE = `http://${BASE_URL}`; // محاكاة منطق waiter.js

document.addEventListener('alpine:init', () => {
    Alpine.data('app', () => ({
        tab: 'orders',
        orderFilter: 'all',
        orders: [],
        filteredOrders: [],
        selectedOrder: null,
        orderItems: [],
        loadingItems: false,
        notification: '',
        lastPendingCount: 0,
        error: '',

        init() {
            if (typeof BASE_URL === 'undefined') {
                this.error = 'خطأ: لم يتم تعريف BASE_URL في config.js';
                this.showNotification(this.error);
                return;
            }
            console.log('API_BASE:', API_BASE); // تسجيل للتحقق
            this.fetchOrders();
            this.startPolling();
        },

        async fetchOrders() {
            try {
                const url = this.orderFilter === 'all' 
                    ? `${API_BASE}/orders` 
                    : `${API_BASE}/orders?status=${this.orderFilter}`;
                const response = await fetch(url, {
                    headers: { 'Accept': 'application/json' }
                });
                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(`HTTP ${response.status}: ${errorData.error || response.statusText}`);
                }
                const data = await response.json();
                // استبعاد الطلبات التي تم تسليمها
                this.orders = (data.orders || []).filter(order => order.status !== 'served');
                this.filterOrders();
                this.error = '';
            } catch (error) {
                this.error = `خطأ في جلب الطلبات: ${error.message}. تأكد من تشغيل خادم الـ API على ${API_BASE}`;
                this.showNotification(this.error);
            }
        },

        async fetchOrderItems(orderId) {
            this.loadingItems = true;
            try {
                const response = await fetch(`${API_BASE}/order_items/order/${orderId}`, {
                    headers: { 'Accept': 'application/json' }
                });
                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(`HTTP ${response.status}: ${errorData.error || response.statusText}`);
                }
                const data = await response.json();
                this.orderItems = data.order_items || [];
                this.error = '';
            } catch (error) {
                this.error = `خطأ في جلب عناصر الطلب: ${error.message}`;
                this.showNotification(this.error);
            } finally {
                this.loadingItems = false;
            }
        },

        async markAsPreparing(orderId) {
            try {
                const response = await fetch(`${API_BASE}/orders/${orderId}`, {
                    method: 'PUT',
                    headers: { 
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify({ status: 'preparing' })
                });
                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(`HTTP ${response.status}: ${errorData.error || response.statusText}`);
                }
                const data = await response.json();
                this.showNotification(data.message || 'تم تعيين الطلب كقيد التحضير');
                this.orders = this.orders.map(order => 
                    order.id === orderId ? { ...order, status: 'preparing' } : order
                );
                this.filterOrders();
                this.error = '';
            } catch (error) {
                this.error = `خطأ في تحديث حالة الطلب: ${error.message}`;
                this.showNotification(this.error);
            }
        },

        async markAsReady(orderId) {
            try {
                const response = await fetch(`${API_BASE}/orders/${orderId}`, {
                    method: 'PUT',
                    headers: { 
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify({ status: 'ready' })
                });
                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(`HTTP ${response.status}: ${errorData.error || response.statusText}`);
                }
                const data = await response.json();
                this.showNotification(data.message || 'تم تعيين الطلب كجاهز');
                this.orders = this.orders.map(order => 
                    order.id === orderId ? { ...order, status: 'ready' } : order
                );
                this.filterOrders();
                this.error = '';
            } catch (error) {
                this.error = `خطأ في تحديث حالة الطلب: ${error.message}`;
                this.showNotification(this.error);
            }
        },

        async viewOrderItems(orderId) {
            this.selectedOrder = this.orders.find(order => order.id === orderId);
            await this.fetchOrderItems(orderId);
        },

        filterOrders() {
            if (this.orderFilter === 'all') {
                this.filteredOrders = this.orders.filter(order => order.status !== 'served');
            } else {
                this.filteredOrders = this.orders.filter(order => order.status === this.orderFilter && order.status !== 'served');
            }
        },

        async checkNewOrders() {
            try {
                const response = await fetch(`${API_BASE}/orders?status=pending`, {
                    headers: { 'Accept': 'application/json' }
                });
                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(`HTTP ${response.status}: ${errorData.error || response.statusText}`);
                }
                const data = await response.json();
                const pendingOrders = (data.orders || []).filter(order => order.status !== 'served');
                if (pendingOrders.length > this.lastPendingCount) {
                    this.showNotification(`طلب جديد معلق (#${pendingOrders[0].id})`);
                    this.fetchOrders();
                }
                this.lastPendingCount = pendingOrders.length;
                this.error = '';
            } catch (error) {
                this.error = `خطأ في فحص الطلبات الجديدة: ${error.message}`;
                console.error('Error polling orders:', error);
            }
        },

        startPolling() {
            setInterval(() => this.checkNewOrders(), 10000); // Poll every 10 seconds
        },

        showNotification(message) {
            this.notification = message;
            setTimeout(() => {
                this.notification = '';
            }, 5000);
        },

        getStatusClass(status) {
            return {
                'pending': 'pending-badge',
                'preparing': 'preparing-badge',
                'ready': 'ready-badge',
                'cancelled': 'cancelled-badge bg-red-100 text-red-800'
            }[status] || 'pending-badge';
        },

        getStatusBorder(status) {
            return {
                'pending': 'border-amber-500',
                'preparing': 'border-blue-500',
                'ready': 'border-green-500',
                'cancelled': 'border-red-500'
            }[status] || 'border-amber-500';
        },

        translateStatus(status) {
            return {
                'pending': 'معلق',
                'preparing': 'قيد التحضير',
                'ready': 'جاهز',
                'cancelled': 'ملغى'
            }[status] || 'معلق';
        },

        goToHome() {
            window.location.href = '/';
        }
    }));
});