const API_BASE = `http://${BASE_URL}`;
document.addEventListener('alpine:init', () => {
    Alpine.data('app', () => ({
        tab: 'tables',
        tables: [],
        filteredTables: [],
        tableFilter: 'all',
        selectedTable: null,
        orders: [],
        filteredOrders: [],
        loading: false,
        cart: [],
        categories: [],
        menuItems: [],
        selectedCategory: '',
        currentTableNumber: '',
        waiterId: localStorage.getItem('waiter_id'),
        readyOrders: [],
        notification: '',
        lastReadyCount: 0,
        refreshInterval: null,

        get cartTotal() {
            return this.cart.reduce((total, item) => total + (item.price * item.quantity), 0).toFixed(2);
        },

        async init() {
            if (!this.waiterId) {
                this.waiterId = 1;
                localStorage.setItem('waiter_id', this.waiterId);
            }
            document.getElementById('waiter-id').textContent = `النادل: ${this.waiterId}`;
            await this.fetchTables();
            await this.fetchCategories();
            await this.fetchReadyOrders();
            this.pollReadyOrders();
            // Start periodic refresh every 5 seconds
            this.refreshInterval = setInterval(() => {
                this.fetchTables();
                this.fetchReadyOrders();
            }, 5000);
        },

        getStatusClass(status) {
            switch(status) {
                case 'available': return 'status-available';
                case 'occupied': return 'status-occupied';
                case 'reserved': return 'status-reserved';
                default: return 'status-occupied';
            }
        },

        getOrderStatusClass(status) {
            switch(status) {
                case 'pending': return 'pending-badge';
                case 'preparing': return 'preparing-badge';
                case 'ready': return 'ready-badge';
                case 'served': return 'bg-gray-100 text-gray-800';
                default: return 'bg-gray-100 text-gray-800';
            }
        },

        translateStatus(status) {
            const map = {
                available: 'متاحة',
                occupied: 'محجوزة',
                reserved: 'محجوزة مسبقًا',
                pending: 'في الانتظار',
                preparing: 'قيد التحضير',
                ready: 'جاهز',
                served: 'تم التقديم',
                cancelled: 'ملغى'
            };
            return map[status] || status;
        },

        increaseQuantity(itemId) {
            const input = document.getElementById(`qty-${itemId}`);
            const currentValue = parseInt(input.value) || 1;
            if (currentValue < 99) {
                input.value = currentValue + 1;
            }
        },

        decreaseQuantity(itemId) {
            const input = document.getElementById(`qty-${itemId}`);
            const currentValue = parseInt(input.value) || 1;
            if (currentValue > 1) {
                input.value = currentValue - 1;
            }
        },

        async fetchTables() {
            this.loading = true;
            try {
                const res = await fetch(`${API_BASE}/tables`, {
                    headers: { 'Accept': 'application/json' }
                });
                if (!res.ok) {
                    const errorData = await res.json().catch(() => ({}));
                    throw new Error(`HTTP ${res.status}: ${errorData.error || res.statusText}`);
                }
                const data = await res.json();
                this.tables = data.tables || [];
                this.filterTables();
            } catch (e) {
                this.showNotification('خطأ في جلب الطاولات');
                console.error('Error fetching tables:', e);
            } finally {
                this.loading = false;
            }
        },

        filterTables() {
            if (this.tableFilter === 'all') {
                this.filteredTables = this.tables;
            } else if (this.tableFilter === 'occupied') {
                this.filteredTables = this.tables.filter(table => table.status === 'occupied' || table.status === 'reserved');
            } else {
                this.filteredTables = this.tables.filter(table => table.status === this.tableFilter);
            }
        },

        async fetchOrders(tableId) {
            this.loading = true;
            try {
                const res = await fetch(`${API_BASE}/orders/table/${tableId}`, {
                    headers: { 'Accept': 'application/json' }
                });
                if (!res.ok) {
                    const errorData = await res.json().catch(() => ({}));
                    throw new Error(`HTTP ${res.status}: ${errorData.error || res.statusText}`);
                }
                const data = await res.json();
                this.orders = await Promise.all((Array.isArray(data) ? data : data.orders || []).map(async (order) => {
                    order.items = await this.fetchOrderItems(order.id);
                    return order;
                }));
                this.filteredOrders = this.orders.filter(o => ['pending', 'preparing', 'ready'].includes(o.status));
            } catch (e) {
                this.showNotification('خطأ في جلب الطلبات');
                this.orders = [];
                this.filteredOrders = [];
                console.error('Error fetching orders:', e);
            } finally {
                this.loading = false;
            }
        },

        async fetchOrderItems(orderId) {
            try {
                const res = await fetch(`${API_BASE}/order_items/order/${orderId}`, {
                    headers: { 'Accept': 'application/json' }
                });
                if (!res.ok) {
                    const errorData = await res.json().catch(() => ({}));
                    throw new Error(`HTTP ${res.status}: ${errorData.error || res.statusText}`);
                }
                const data = await res.json();
                return data.order_items || [];
            } catch (e) {
                this.showNotification('خطأ في جلب عناصر الطلب');
                console.error('Error fetching order items:', e);
                return [];
            }
        },

        async startOrder(tableId) {
            this.selectedTable = this.tables.find(t => t.id === tableId);
            this.currentTableNumber = this.selectedTable.table_number;
            this.tab = 'order';
            this.cart = [];
            this.selectedCategory = '';
            this.menuItems = [];
            await this.fetchMenuItems();
        },

        async fetchCategories() {
            try {
                const res = await fetch(`${API_BASE}/categories`, {
                    headers: { 'Accept': 'application/json' }
                });
                if (!res.ok) {
                    const errorData = await res.json().catch(() => ({}));
                    throw new Error(`HTTP ${res.status}: ${errorData.error || res.statusText}`);
                }
                const data = await res.json();
                this.categories = data.categories || [];
            } catch (e) {
                this.showNotification('خطأ في جلب الفئات');
                console.error('Error fetching categories:', e);
            }
        },

        async fetchMenuItems() {
            try {
                const url = this.selectedCategory 
                    ? `${API_BASE}/menu_items?category_id=${this.selectedCategory}`
                    : `${API_BASE}/menu_items`;
                const res = await fetch(url, {
                    headers: { 'Accept': 'application/json' }
                });
                if (!res.ok) {
                    const errorData = await res.json().catch(() => ({}));
                    throw new Error(`HTTP ${res.status}: ${errorData.error || res.statusText}`);
                }
                const data = await res.json();
                this.menuItems = (data.menu_items || []).filter(item => item.available);
            } catch (e) {
                this.showNotification('خطأ في جلب الوجبات');
                console.error('Error fetching menu items:', e);
            }
        },

        addToCart(item) {
            const qty = parseInt(document.getElementById(`qty-${item.id}`).value) || 1;
            const note = document.getElementById(`note-${item.id}`).value.trim();
            
            if (qty > 0) {
                this.cart.push({ 
                    ...item, 
                    quantity: qty, 
                    note: note || null 
                });
                
                document.getElementById(`qty-${item.id}`).value = 1;
                document.getElementById(`note-${item.id}`).value = '';
                
                this.showNotification(`تمت إضافة ${item.name} إلى السلة`);
            }
        },

        removeFromCart(index) {
            this.cart.splice(index, 1);
            this.showNotification('تم حذف العنصر من السلة');
        },

        async submitOrder() {
            if (!this.cart.length) {
                this.showNotification('السلة فارغة');
                return;
            }
            
            const orderData = {
                table_id: this.selectedTable.id,
                waiter_id: parseInt(this.waiterId),
                order_items: this.cart.map(c => ({ 
                    menu_item_id: c.id, 
                    quantity: c.quantity, 
                    note: c.note 
                }))
            };
            
            try {
                const res = await fetch(`${API_BASE}/orders`, {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify(orderData)
                });
                
                if (!res.ok) {
                    const errorData = await res.json().catch(() => ({}));
                    throw new Error(`HTTP ${res.status}: ${errorData.error || res.statusText}`);
                }
                
                await res.json();
                this.showNotification('تم إنشاء الطلب بنجاح');
                this.tab = 'tables';
                this.cart = [];
                this.selectedTable = null; // Reset selectedTable to prevent modal from showing
                await this.fetchTables();
            } catch (e) {
                this.showNotification('خطأ في إنشاء الطلب');
                console.error('Error submitting order:', e);
            }
        },

        async pollReadyOrders() {
            if (this.refreshInterval) {
                clearInterval(this.refreshInterval);
            }
            this.refreshInterval = setInterval(async () => {
                try {
                    const res = await fetch(`${API_BASE}/orders/waiter/${this.waiterId}?status=ready`, {
                        headers: { 'Accept': 'application/json' }
                    });
                    if (!res.ok) {
                        const errorData = await res.json().catch(() => ({}));
                        throw new Error(`HTTP ${res.status}: ${errorData.error || res.statusText}`);
                    }
                    const data = await res.json();
                    const orders = Array.isArray(data) ? data : data.orders || [];
                    const readyOrders = orders.filter(o => o.status === 'ready');
                    
                    if (readyOrders.length > this.lastReadyCount) {
                        const newOrders = readyOrders.length - this.lastReadyCount;
                        this.showNotification(`هناك ${newOrders} طلب${newOrders > 1 ? 'ات' : ''} جاهزة للتقديم`);
                    }
                    
                    this.readyOrders = readyOrders;
                    this.lastReadyCount = readyOrders.length;
                } catch (e) {
                    console.error('خطأ في جلب الطلبات الجاهزة:', e);
                }
            }, 3000);
        },

        async fetchReadyOrders() {
            try {
                const res = await fetch(`${API_BASE}/orders/waiter/${this.waiterId}?status=ready`, {
                    headers: { 'Accept': 'application/json' }
                });
                if (!res.ok) {
                    const errorData = await res.json().catch(() => ({}));
                    throw new Error(`HTTP ${res.status}: ${errorData.error || res.statusText}`);
                }
                const data = await res.json();
                const orders = Array.isArray(data) ? data : data.orders || [];
                this.readyOrders = orders.filter(o => o.status === 'ready');
                this.lastReadyCount = this.readyOrders.length;
            } catch (e) {
                this.showNotification('خطأ في جلب الطلبات الجاهزة');
                console.error('Error fetching ready orders:', e);
            }
        },

        async deliverOrder(orderId, index) {
            try {
                const res = await fetch(`${API_BASE}/orders/${orderId}`, {
                    method: 'PUT',
                    headers: { 
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify({ status: 'served' })
                });
                
                if (!res.ok) {
                    const errorData = await res.json().catch(() => ({}));
                    throw new Error(`HTTP ${res.status}: ${errorData.error || res.statusText}`);
                }
                
                await res.json();
                this.readyOrders.splice(index, 1);
                this.filteredOrders = this.filteredOrders.filter(o => o.id !== orderId);
                this.lastReadyCount = Math.max(0, this.lastReadyCount - 1);
                this.showNotification('تم تسليم الطلب بنجاح');
                await this.fetchTables();
            } catch (e) {
                this.showNotification('خطأ في تحديث حالة الطلب');
                console.error('Error delivering order:', e);
            }
        },

        showNotification(message) {
            this.notification = message;
            setTimeout(() => this.notification = '', 5000);
        },

        goToSettings() {
            window.location.href = 'settings.html';
        },

        goToHome() {
            window.location.href = '/';
        }
    }));
});
