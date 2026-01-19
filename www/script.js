// --- APP STATE & NAVIGATION ---
const App = {
    currentView: 'budget', // 'budget' or 'pantry'

    init() {
        this.setupNavigation();
        this.restorePreference();
        Budget.init();
        Pantry.init();
    },

    setupNavigation() {
        document.getElementById('navBudget').addEventListener('click', () => this.switchView('budget'));
        document.getElementById('navPantry').addEventListener('click', () => this.switchView('pantry'));
        document.getElementById('viewBtn').addEventListener('click', () => this.toggleWideMode());
        document.getElementById('backupBtn').addEventListener('click', () => this.exportCurrentData());
    },

    switchView(viewName) {
        this.currentView = viewName;

        // Update Tabs
        document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
        document.getElementById(viewName === 'budget' ? 'navBudget' : 'navPantry').classList.add('active');

        // Update View Visibility
        document.getElementById('budgetView').classList.toggle('hidden', viewName !== 'budget');
        document.getElementById('pantryView').classList.toggle('hidden', viewName !== 'pantry');

        // Update View Classes on Container
        const container = document.querySelector('.app-container');
        container.classList.remove('view-budget', 'view-pantry');
        container.classList.add(`view-${viewName}`);

        // Save Preference
        localStorage.setItem('samsApp_lastView', viewName);
    },

    toggleWideMode() {
        const container = document.querySelector('.app-container');
        container.classList.toggle('wide-mode');
        const isWide = container.classList.contains('wide-mode');
        localStorage.setItem('samsApp_wideMode', isWide);
    },

    restorePreference() {
        // Restore Wide Mode
        const isWide = localStorage.getItem('samsApp_wideMode') === 'true';
        if (isWide) document.querySelector('.app-container').classList.add('wide-mode');

        // Restore Last View
        const lastView = localStorage.getItem('samsApp_lastView') || 'budget';
        this.switchView(lastView);
    },

    exportCurrentData() {
        if (this.currentView === 'budget') {
            Budget.exportData();
        } else {
            Pantry.exportData();
        }
    }
};

// --- BUDGET MODULE ---
const Budget = {
    state: { budget: 0, entries: [] },

    init() {
        this.loadData();
        this.setupListeners();
        this.render();
    },

    setupListeners() {
        const els = {
            editBudget: document.getElementById('editBudgetBtn'),
            saveBudget: document.getElementById('saveBudgetBtn'),
            budgetInput: document.getElementById('budgetInput'),
            resetBtn: document.getElementById('resetBudgetBtn'),
            addBtn: document.getElementById('addEntryBtn'),
            amountInput: document.getElementById('amountInput'),
            descInput: document.getElementById('descInput'),
            list: document.getElementById('entriesList')
        };

        els.editBudget.addEventListener('click', () => {
            document.getElementById('budgetEdit').classList.remove('hidden');
            els.editBudget.classList.add('hidden');
            els.budgetInput.value = this.state.budget || '';
            els.budgetInput.focus();
        });

        els.saveBudget.addEventListener('click', () => this.saveBudget());
        els.resetBtn.addEventListener('click', () => this.resetData());
        els.addBtn.addEventListener('click', () => this.addEntry());

        // Delegation for delete
        els.list.addEventListener('click', (e) => {
            const btn = e.target.closest('.delete-btn');
            if (btn) this.deleteEntry(parseInt(btn.dataset.id));
        });

        // Enter Key Support
        ['amountInput', 'descInput'].forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') this.addEntry();
                });
            }
        });
    },

    loadData() {
        const saved = localStorage.getItem('samsBudget_v1');
        if (saved) this.state = JSON.parse(saved);
    },

    saveData() {
        localStorage.setItem('samsBudget_v1', JSON.stringify(this.state));
        this.updateHeaderUI(); // Minimal update
    },

    saveBudget() {
        const val = parseFloat(document.getElementById('budgetInput').value);
        if (!isNaN(val) && val >= 0) {
            this.state.budget = val;
            this.saveData();
        }
        document.getElementById('budgetEdit').classList.add('hidden');
        document.getElementById('editBudgetBtn').classList.remove('hidden');
        this.render();
    },

    // OPTIMISTIC UPDATE
    addEntry() {
        const descInput = document.getElementById('descInput');
        const amountInput = document.getElementById('amountInput');
        const desc = descInput.value.trim() || 'Expense';
        const amount = parseFloat(amountInput.value);

        if (isNaN(amount) || amount <= 0) return alert('Enter valid amount');

        const entry = { id: Date.now(), desc, amount, date: new Date().toLocaleDateString() };
        this.state.entries.unshift(entry);

        localStorage.setItem('samsBudget_v1', JSON.stringify(this.state)); // Save state

        // UI Update
        const li = this.createEntryElement(entry);
        document.getElementById('entriesList').prepend(li);
        this.updateHeaderUI();

        descInput.value = ''; amountInput.value = ''; descInput.focus();
    },

    deleteEntry(id) {
        if (!confirm('Delete entry?')) return;
        this.state.entries = this.state.entries.filter(e => e.id !== id);
        localStorage.setItem('samsBudget_v1', JSON.stringify(this.state));

        const btn = document.querySelector(`#entriesList .delete-btn[data-id="${id}"]`);
        if (btn) btn.closest('li').remove();
        this.updateHeaderUI();
    },

    resetData() {
        if (confirm('Reset Budget Data?')) {
            this.state = { budget: 0, entries: [] };
            this.saveData();
            this.render();
        }
    },

    render() {
        this.updateHeaderUI();
        const list = document.getElementById('entriesList');
        list.innerHTML = '';
        this.state.entries.forEach(e => list.appendChild(this.createEntryElement(e)));
    },

    updateHeaderUI() {
        const total = this.state.entries.reduce((s, e) => s + e.amount, 0);
        const remaining = this.state.budget - total;

        document.getElementById('budgetDisplay').textContent = `$${this.state.budget.toFixed(2)}`;
        const remEl = document.getElementById('remainingAmount');
        remEl.textContent = remaining.toFixed(2);
        remEl.style.color = remaining < 0 ? '#d32f2f' : '#1a1a1a';
    },

    createEntryElement(entry) {
        const li = document.createElement('li');
        li.className = 'entry-item';
        li.innerHTML = `
            <div class="entry-info"><h3>${entry.desc}</h3><p>${entry.date}</p></div>
            <div class="entry-actions">
                <span class="amount">-$${entry.amount.toFixed(2)}</span>
                <button class="delete-btn" data-id="${entry.id}"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg></button>
            </div>`;
        return li;
    },

    exportData() {
        const blob = new Blob([JSON.stringify(this.state, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `budget-backup.json`;
        a.click(); URL.revokeObjectURL(url);
    }
};

// --- PANTRY MODULE ---
const Pantry = {
    state: { items: [] },

    init() {
        this.loadData();
        this.setupListeners();
        this.render();
    },

    setupListeners() {
        document.getElementById('addItemBtn').addEventListener('click', () => this.addItem());
        document.getElementById('searchInput').addEventListener('input', (e) => this.render(e.target.value));
        document.getElementById('resetPantryBtn').addEventListener('click', () => this.resetData());

        // Event Delegation for List Actions
        ['freezerList', 'pantryList'].forEach(id => {
            document.getElementById(id).addEventListener('click', (e) => {
                const actionBtn = e.target.closest('.action-btn');
                if (!actionBtn) return;

                const id = parseInt(actionBtn.dataset.id);
                if (actionBtn.classList.contains('btn-plus')) this.updateQty(id, 1);
                if (actionBtn.classList.contains('btn-minus')) this.updateQty(id, -1);
                if (actionBtn.classList.contains('btn-delete')) this.deleteItem(id);
            });
        });

        // Enter Key Support
        ['itemInput', 'qtyInput'].forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') this.addItem();
                });
            }
        });
    },

    loadData() {
        const saved = localStorage.getItem('samsPantry_v1');
        if (saved) this.state = JSON.parse(saved);
    },

    saveData(render = true) {
        localStorage.setItem('samsPantry_v1', JSON.stringify(this.state));
        if (render) this.render(document.getElementById('searchInput').value);
    },

    addItem() {
        const nameEl = document.getElementById('itemInput');
        const qtyEl = document.getElementById('qtyInput');
        const locEl = document.getElementById('locationInput');
        const catEl = document.getElementById('categoryInput');

        const name = nameEl.value.trim();
        const qty = qtyEl.value.trim(); // Keep as string

        if (!name) return alert('Enter item name');
        if (!qty) return alert('Enter quantity');

        const item = {
            id: Date.now(),
            name: name,
            qty: qty,
            location: locEl.value,
            category: catEl.value,
            added: new Date().toLocaleDateString()
        };

        this.state.items.unshift(item);
        this.saveData(false); // Skip full render

        // Optimistic UI Update (No Flash)
        const listId = item.location === 'freezer' ? 'freezerList' : 'pantryList';
        const list = document.getElementById(listId);
        if (list.querySelector('.empty-msg')) list.innerHTML = '';
        list.prepend(this.createItemElement(item));

        nameEl.value = ''; qtyEl.value = ''; nameEl.focus();
    },

    updateQty(id, change) {
        const item = this.state.items.find(i => i.id === id);
        if (item) {
            // Regex to parse number from string (e.g. "5 lbs" -> 5)
            const match = item.qty.toString().match(/^(\d+(?:\.\d+)?)(.*)$/);
            if (match) {
                let val = parseFloat(match[1]);
                const suffix = match[2];
                val += change;
                if (val <= 0) val = 0;
                item.qty = val + suffix;

                this.saveData(false);

                // Targeted Update
                const qtySpan = document.getElementById(`qty-${id}`);
                if (qtySpan) qtySpan.textContent = `Qty: ${item.qty}`;
            }
        }
    },

    deleteItem(id, confirmDelete = true) {
        if (confirmDelete && !confirm('Delete this item?')) return;
        this.state.items = this.state.items.filter(i => i.id !== id);
        this.saveData(false);

        // Targeted Removal
        const btn = document.querySelector(`.action-btn[data-id="${id}"]`);
        if (btn) btn.closest('li').remove();
    },

    resetData() {
        if (confirm('Reset Pantry Data?')) {
            this.state.items = [];
            this.saveData(); // trigger full render
            this.render();
        }
    },

    render(filter = '') {
        const freezerList = document.getElementById('freezerList');
        const pantryList = document.getElementById('pantryList');
        freezerList.innerHTML = ''; pantryList.innerHTML = '';

        const term = filter.toLowerCase();

        this.state.items.forEach(item => {
            if (term && !item.name.toLowerCase().includes(term) && !item.category.toLowerCase().includes(term)) return;
            const li = this.createItemElement(item);

            if (item.location === 'freezer') freezerList.appendChild(li);
            else pantryList.appendChild(li);
        });

        if (freezerList.children.length === 0) freezerList.innerHTML = '<li class="empty-msg">No items in freezer</li>';
        if (pantryList.children.length === 0) pantryList.innerHTML = '<li class="empty-msg">No items in pantry</li>';
    },

    createItemElement(item) {
        const li = document.createElement('li');
        li.className = 'entry-item';
        // Add category class if you want specific styling per cat
        li.classList.add(`cat-${item.category.replace(/\s+/g, '-').toLowerCase()}`);

        li.innerHTML = `
            <div class="entry-info">
                <h3><span class="badge">${item.category}</span> ${item.name}</h3>
                <p><span id="qty-${item.id}">Qty: ${item.qty}</span> · Added: ${item.added}</p>
            </div>
            <div class="entry-actions">
                <button class="action-btn btn-minus" data-id="${item.id}" title="Decrease"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"></line></svg></button>
                <button class="action-btn btn-plus" data-id="${item.id}" title="Increase"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg></button>
                <button class="action-btn btn-delete danger-btn-text" data-id="${item.id}" title="Delete"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg></button>
            </div>`;
        return li;
    },

    exportData() {
        const blob = new Blob([JSON.stringify(this.state, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `pantry-backup.json`;
        a.click(); URL.revokeObjectURL(url);
    }
};

// Start App
document.addEventListener('DOMContentLoaded', () => App.init());
