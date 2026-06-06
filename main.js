import { Game } from './game.js';
import { UI } from './ui.js';
import { API } from './api.js';
import { Charts } from './charts.js';

window.Game = Game;
window.UI = UI;
window.Charts = Charts;

let gameInitialized = false;
let isAdminCache = false;

// ========== КОРЗИНА (поддержка нескольких поставщиков) ==========
let currentCart = [];

if (window.location.search.includes('ref=')) {
    const urlParams = new URLSearchParams(window.location.search);
    const ref = urlParams.get('ref');
    if (ref) {
        sessionStorage.setItem('pendingRef', ref);
        console.log('✅ Ref сохранён в sessionStorage:', ref);
    }
}

async function checkIsAdmin() {
    try {
        const res = await fetch('get_user.php');
        const data = await res.json();
        isAdminCache = data.is_admin === true;
        return isAdminCache;
    } catch(e) {
        isAdminCache = false;
        return false;
    }
}

// ========== АДМИН-ПАНЕЛЬ ==========
async function checkIsAdminForSettings() {
    try {
        const res = await fetch('get_user.php');
        const data = await res.json();
        isAdminCache = data.is_admin === true;
        return isAdminCache;
    } catch(e) {
        isAdminCache = false;
        return false;
    }
}

// Редактор цен ингредиентов
function showIngredientsPriceEditor() {
    const container = document.getElementById('adminPriceEditorContainer');
    if (!container) return;
    
    const ingredients = Game.state?.ingredients || [];
    if (ingredients.length === 0) {
        container.innerHTML = '<div style="text-align:center; padding:20px;">Нет ингредиентов</div>';
        container.style.display = 'block';
        return;
    }
    
    let html = '<div style="font-weight:bold; margin-bottom:10px;">📦 Редактирование цен ингредиентов</div>';
    html += '<div style="max-height:400px; overflow-y:auto;">';
    for (let ing of ingredients) {
        html += `
            <div class="price-editor-item" style="display: flex; align-items: center; justify-content: space-between; padding: 8px; border-bottom: 1px solid var(--border); gap: 10px;">
                <span style="flex: 2; font-weight: bold;">${UI.escapeHtml(ing.name)}</span>
                <input type="number" id="price_ing_${ing.id}" class="price-editor-input" value="${ing.currentBuyPrice}" step="1" style="width: 120px; padding: 6px; border-radius: 40px;">
                <span style="width: 60px;">₽/${ing.unit}</span>
                <button class="btn-sm btn-green save-ing-price" data-id="${ing.id}" style="min-width: 70px;">💾 Сохранить</button>
            </div>
        `;
    }
    html += '</div>';
    container.innerHTML = html;
    container.style.display = 'block';
    
    document.querySelectorAll('.save-ing-price').forEach(btn => {
        btn.onclick = async () => {
            const id = btn.dataset.id;
            const input = document.getElementById(`price_ing_${id}`);
            const newPrice = parseFloat(input.value);
            if (!isNaN(newPrice) && newPrice > 0) {
                await Game.setIngredientPrice(id, newPrice);
                UI.showAutoMessage(`✅ Цена изменена`, 'success');
            }
        };
    });
}

// Редактор цен напитков
function showDrinksPriceEditor() {
    const container = document.getElementById('adminPriceEditorContainer');
    if (!container) return;
    
    const drinks = Game.state?.drinks || [];
    if (drinks.length === 0) {
        container.innerHTML = '<div style="text-align:center; padding:20px;">Нет напитков</div>';
        container.style.display = 'block';
        return;
    }
    
    let html = '<div style="font-weight:bold; margin-bottom:10px;">☕ Редактирование цен напитков</div>';
    html += '<div style="max-height:400px; overflow-y:auto;">';
    for (let drink of drinks) {
        const cost = Game.getDrinkCost(Game.state, drink);
        html += `
            <div class="price-editor-item" style="display: flex; align-items: center; justify-content: space-between; padding: 8px; border-bottom: 1px solid var(--border); gap: 10px;">
                <span style="flex: 2; font-weight: bold;">${UI.escapeHtml(drink.name)}</span>
                <input type="number" id="price_drink_${drink.id}" class="price-editor-input" value="${drink.price}" step="5" style="width: 120px; padding: 6px; border-radius: 40px;">
                <span style="width: 80px;">₽ (себест: ${Game.formatMoney(cost)} ₽)</span>
                <button class="btn-sm btn-green save-drink-price" data-id="${drink.id}" style="min-width: 70px;">💾 Сохранить</button>
            </div>
        `;
    }
    html += '</div>';
    container.innerHTML = html;
    container.style.display = 'block';
    
    document.querySelectorAll('.save-drink-price').forEach(btn => {
        btn.onclick = async () => {
            const id = btn.dataset.id;
            const input = document.getElementById(`price_drink_${id}`);
            const newPrice = parseFloat(input.value);
            if (!isNaN(newPrice) && newPrice > 0) {
                const drink = Game.state.drinks.find(d => d.id === id);
                const cost = Game.getDrinkCost(Game.state, drink);
                if (newPrice < cost) {
                    UI.showAutoMessage(`❌ Цена не может быть ниже себестоимости (${Game.formatMoney(cost)} ₽)`, 'error');
                    return;
                }
                await Game.updateDrinkPrice(id, newPrice);
                UI.showAutoMessage(`✅ Цена "${drink.name}" изменена на ${Game.formatMoney(newPrice)} ₽`, 'success');
            }
        };
    });
}

// ========== ДОБАВЛЕНИЕ ИНГРЕДИЕНТА (админ) ==========
window.openAddIngredientModal = async function() {
    const modal = document.getElementById('addIngredientModal');
    if (!modal) {
        UI.showAutoMessage('❌ Модальное окно не найдено', 'error');
        return;
    }
    
    document.getElementById('newIngName').value = '';
    document.getElementById('newIngType').value = 'ingredient';
    document.getElementById('newIngUnit').value = 'шт';
    document.getElementById('newIngPackSize').value = 1;
    document.getElementById('newIngPrice').value = 0;
    document.getElementById('newIngThreshold').value = 1;
    
    document.getElementById('newSupplierName').value = '';
    document.getElementById('newSupplierDeliveryCost').value = 500;
    document.getElementById('newSupplierFreeFrom').value = 50;
    document.getElementById('newSupplierTimeMin').value = 30;
    document.getElementById('newSupplierTimeMax').value = 180;
    document.getElementById('newSupplierFields').style.display = 'none';
    
    const supplierSelect = document.getElementById('newIngSupplier');
    if (supplierSelect && Game.state?.suppliers) {
        supplierSelect.innerHTML = '<option value="new">➕ Создать нового поставщика...</option>';
        for (let sup of Game.state.suppliers) {
            const option = document.createElement('option');
            option.value = sup.id;
            option.textContent = `📦 ${sup.name} (доставка ${Game.formatMoney(sup.delivery_cost)} ₽)`;
            supplierSelect.appendChild(option);
        }
    }
    
    supplierSelect.onchange = function() {
        const fields = document.getElementById('newSupplierFields');
        fields.style.display = this.value === 'new' ? 'block' : 'none';
    };
    
    modal.classList.add('active');
};

document.getElementById('confirmAddIngredientBtn')?.addEventListener('click', async () => {
    const name = document.getElementById('newIngName').value.trim();
    const type = document.getElementById('newIngType').value;
    const unit = document.getElementById('newIngUnit').value;
    const packSize = parseFloat(document.getElementById('newIngPackSize').value);
    const price = parseFloat(document.getElementById('newIngPrice').value);
    const threshold = parseFloat(document.getElementById('newIngThreshold').value);
    const supplierSelect = document.getElementById('newIngSupplier');
    const supplierValue = supplierSelect.value;
    
    if (!name || isNaN(price) || price <= 0) {
        UI.showAutoMessage('❌ Заполните название и цену', 'error');
        return;
    }
    
    let supplierId = null;
    if (supplierValue === 'new') {
        const newSupplierName = document.getElementById('newSupplierName').value.trim();
        if (!newSupplierName) {
            UI.showAutoMessage('❌ Введите название нового поставщика', 'error');
            return;
        }
        
        const deliveryCost = parseFloat(document.getElementById('newSupplierDeliveryCost').value);
        const freeFrom = parseFloat(document.getElementById('newSupplierFreeFrom').value);
        const timeMin = parseInt(document.getElementById('newSupplierTimeMin').value);
        const timeMax = parseInt(document.getElementById('newSupplierTimeMax').value);
        
        const res = await fetch('add_supplier.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: newSupplierName,
                delivery_cost: deliveryCost,
                free_delivery_from: freeFrom,
                delivery_time_min: timeMin,
                delivery_time_max: timeMax
            })
        });
        const data = await res.json();
        if (data.success) {
            supplierId = data.supplier_id;
            UI.showAutoMessage(`✅ Поставщик "${newSupplierName}" создан`, 'success');
        } else {
            UI.showAutoMessage('❌ Ошибка создания поставщика', 'error');
            return;
        }
    } else {
        supplierId = parseInt(supplierValue);
    }
    
    const res = await fetch('add_ingredient.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            name: name,
            cost_per_unit: price,
            unit: unit,
            type: type,
            pack_size: packSize,
            threshold: threshold
        })
    });
    const data = await res.json();
    
    if (data.success) {
        await fetch('add_supplier_item.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                supplier_id: supplierId,
                ingredient_id: data.ingredient_id,
                price: price,
                unit: unit,
                pack_size: packSize,
                min_quantity: 1
            })
        });
        
        UI.showAutoMessage(`✅ Ингредиент "${name}" добавлен`, 'success');
        document.getElementById('addIngredientModal').classList.remove('active');
        
        const gameData = await API.loadGame();
        Game.updateState(gameData);
    } else {
        UI.showAutoMessage('❌ Ошибка: ' + (data.error || 'Неизвестная ошибка'), 'error');
    }
});

function initAdminPanel() {
    const adminBtn = document.getElementById('adminSettingsBtn');
    if (!adminBtn) return;
    
    if (!isAdminCache) {
        adminBtn.style.display = 'none';
        return;
    }
    
    adminBtn.style.display = 'inline-flex';
    
    const buyAllBtn = document.getElementById('buyAllIngredientsBtn');
    const addIngredientBtn = document.getElementById('addIngredientBtn');
    const toggleBuyAll = document.getElementById('toggleBuyAllBtn');
    const toggleAdd = document.getElementById('toggleAddIngredientBtn');
    
    if (buyAllBtn && toggleBuyAll) {
        const saved = localStorage.getItem('showBuyAllBtn');
        const isVisible = saved === 'true';
        buyAllBtn.style.display = isVisible ? 'inline-flex' : 'none';
        toggleBuyAll.checked = isVisible;
        toggleBuyAll.addEventListener('change', (e) => {
            buyAllBtn.style.display = e.target.checked ? 'inline-flex' : 'none';
            localStorage.setItem('showBuyAllBtn', e.target.checked);
        });
    }
    
    if (addIngredientBtn && toggleAdd) {
        const saved = localStorage.getItem('showAddIngredientBtn');
        const isVisible = saved === 'true';
        addIngredientBtn.style.display = isVisible ? 'inline-flex' : 'none';
        toggleAdd.checked = isVisible;
        toggleAdd.addEventListener('change', (e) => {
            addIngredientBtn.style.display = e.target.checked ? 'inline-flex' : 'none';
            localStorage.setItem('showAddIngredientBtn', e.target.checked);
        });
    }
    
    adminBtn.onclick = () => {
        if (Game.state) {
            document.getElementById('adminTaxPercent').value = Game.state.taxPercent || 6;
            const rates = Game.state.electricityRates || {};
            document.getElementById('adminRate1Summer').value = rates.summer1 || 6.43;
            document.getElementById('adminRate1Winter').value = rates.winter1 || 7.15;
            document.getElementById('adminRate2Summer').value = rates.summer2 || 9.18;
            document.getElementById('adminRate2Winter').value = rates.winter2 || 10.23;
            document.getElementById('adminRate3Summer').value = rates.summer3 || 11.05;
            document.getElementById('adminRate3Winter').value = rates.winter3 || 13.47;
        }
        
        document.getElementById('adminPriceEditorContainer').style.display = 'none';
        document.getElementById('adminUsersListContainer').style.display = 'none';
        document.getElementById('adminAllLogsContainer').style.display = 'none';
        document.getElementById('adminGlobalMessageForm').style.display = 'none';
        
        document.getElementById('adminSettingsModal').classList.add('active');
    };
    
    const taxBtn = document.getElementById('adminUpdateTaxBtn');
    if (taxBtn) {
        taxBtn.onclick = async () => {
            const percent = parseFloat(document.getElementById('adminTaxPercent').value);
            if (!isNaN(percent) && percent >= 0 && percent <= 100) {
                await Game.updateTax(percent);
                UI.showAutoMessage(`✅ Налог изменён на ${percent}%`, 'success');
            }
        };
    }
    
    const elecBtn = document.getElementById('adminSaveElecRatesBtn');
    if (elecBtn) {
        elecBtn.onclick = async () => {
            const newRates = {
                summer1: parseFloat(document.getElementById('adminRate1Summer').value) || 6.43,
                winter1: parseFloat(document.getElementById('adminRate1Winter').value) || 7.15,
                summer2: parseFloat(document.getElementById('adminRate2Summer').value) || 9.18,
                winter2: parseFloat(document.getElementById('adminRate2Winter').value) || 10.23,
                summer3: parseFloat(document.getElementById('adminRate3Summer').value) || 11.05,
                winter3: parseFloat(document.getElementById('adminRate3Winter').value) || 13.47
            };
            
            if (Game.state) {
                Game.state.electricityRates = newRates;
                await Game.forceSave();
                UI.showAutoMessage('⚡ Тарифы на электричество сохранены', 'success');
                
                const summer1 = document.getElementById('elecRate1Summer');
                if (summer1) summer1.value = newRates.summer1;
                const winter1 = document.getElementById('elecRate1Winter');
                if (winter1) winter1.value = newRates.winter1;
                const summer2 = document.getElementById('elecRate2Summer');
                if (summer2) summer2.value = newRates.summer2;
                const winter2 = document.getElementById('elecRate2Winter');
                if (winter2) winter2.value = newRates.winter2;
                const summer3 = document.getElementById('elecRate3Summer');
                if (summer3) summer3.value = newRates.summer3;
                const winter3 = document.getElementById('elecRate3Winter');
                if (winter3) winter3.value = newRates.winter3;
            }
        };
    }
    
    document.getElementById('adminAddMoneyBtn')?.addEventListener('click', async () => {
        const username = document.getElementById('adminTargetUsername').value.trim();
        const amount = parseFloat(document.getElementById('adminAddMoneyAmount').value);
        
        if (!username || isNaN(amount) || amount <= 0) {
            UI.showAutoMessage('❌ Введите логин и сумму', 'error');
            return;
        }
        
        const res = await fetch('admin_add_money.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, amount })
        });
        const data = await res.json();
        
        if (data.success) {
            UI.showAutoMessage(data.message, 'success');
            document.getElementById('adminAddMoneyAmount').value = '';
        } else {
            UI.showAutoMessage('❌ ' + data.error, 'error');
        }
    });
    
    document.getElementById('adminResetGameBtn')?.addEventListener('click', async () => {
        const username = document.getElementById('adminResetUsername').value.trim();
        const balance = parseFloat(document.getElementById('adminResetBalance').value);
        
        if (!username || isNaN(balance) || balance < 0) {
            UI.showAutoMessage('❌ Введите логин и корректный баланс', 'error');
            return;
        }
        
        if (!confirm(`Сбросить игру для ${username} с балансом ${balance} ₽?`)) return;
        
        const res = await fetch('admin_reset_game.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, balance })
        });
        const data = await res.json();
        
        if (data.success) {
            UI.showAutoMessage(data.message, 'success');
        } else {
            UI.showAutoMessage('❌ ' + data.error, 'error');
        }
    });
    
    document.getElementById('adminListUsersBtn')?.addEventListener('click', async () => {
        const container = document.getElementById('adminUsersListContainer');
        const listDiv = document.getElementById('adminUsersList');
        
        if (container.style.display === 'block') {
            container.style.display = 'none';
            return;
        }
        
        container.style.display = 'block';
        listDiv.innerHTML = '<div style="text-align:center;">Загрузка...</div>';
        
        const res = await fetch('admin_list_users.php');
        const data = await res.json();
        
        if (data.success && data.users) {
            let html = '<table class="admin-users-table"><thead><tr><th>ID</th><th>Логин</th><th>Админ</th><th>Дата регистрации</th></tr></thead><tbody>';
            for (let u of data.users) {
                html += `<tr>
                    <td>${u.id}</td>
                    <td>${escapeHtml(u.username)}</td>
                    <td>${u.is_admin ? '👑 Да' : '—'}</td>
                    <td>${u.created_at}</td>
                </tr>`;
            }
            html += '</tbody></table>';
            listDiv.innerHTML = html;
        } else {
            listDiv.innerHTML = '<div style="color: red;">Ошибка загрузки</div>';
        }
    });
    
    document.getElementById('adminGlobalMessageBtn')?.addEventListener('click', () => {
        const form = document.getElementById('adminGlobalMessageForm');
        form.style.display = form.style.display === 'block' ? 'none' : 'block';
    });
    
    document.getElementById('adminCancelGlobalMessageBtn')?.addEventListener('click', () => {
        document.getElementById('adminGlobalMessageForm').style.display = 'none';
        document.getElementById('adminGlobalMessageText').value = '';
    });
    
    document.getElementById('adminSendGlobalMessageBtn')?.addEventListener('click', async () => {
        const message = document.getElementById('adminGlobalMessageText').value.trim();
        if (!message) {
            UI.showAutoMessage('❌ Введите сообщение', 'error');
            return;
        }
        
        const res = await fetch('admin_global_message.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message })
        });
        const data = await res.json();
        
        if (data.success) {
            UI.showAutoMessage('✅ Сообщение отправлено всем игрокам', 'success');
            document.getElementById('adminGlobalMessageForm').style.display = 'none';
            document.getElementById('adminGlobalMessageText').value = '';
        } else {
            UI.showAutoMessage('❌ ' + data.error, 'error');
        }
    });
    
    document.getElementById('adminViewAllLogsBtn')?.addEventListener('click', async () => {
        const container = document.getElementById('adminAllLogsContainer');
        const listDiv = document.getElementById('adminAllLogsList');
        
        if (container.style.display === 'block') {
            container.style.display = 'none';
            return;
        }
        
        container.style.display = 'block';
        listDiv.innerHTML = '<div style="text-align:center;">Загрузка...</div>';
        
        const res = await fetch('admin_all_logs.php');
        const data = await res.json();
        
        if (data.success && data.logs) {
            let html = '';
            for (let log of data.logs) {
                html += `<div style="border-bottom: 1px solid var(--border); padding: 10px;">
                    <div><strong>👤 ${escapeHtml(log.username)}</strong> | 💰 ${Game.formatMoney(log.balance)} ₽ | 🥤 ${log.total_cups} чашек | 📅 ${log.updated_at}</div>
                    <div style="font-size: 0.7rem; margin-top: 5px;">📋 Последние действия:</div>
                    <div style="font-size: 0.65rem; margin-left: 10px;">${(log.last_transactions || []).map(t => t.description).slice(0, 3).join('<br>') || '—'}</div>
                </div>`;
            }
            listDiv.innerHTML = html;
        } else {
            listDiv.innerHTML = '<div style="color: red;">Ошибка загрузки</div>';
        }
    });
    
    document.getElementById('adminSaveStartBalanceBtn')?.addEventListener('click', async () => {
        const balance = parseFloat(document.getElementById('adminStartBalance').value);
        if (isNaN(balance) || balance < 1000) {
            UI.showAutoMessage('❌ Минимальный баланс 1000 ₽', 'error');
            return;
        }
        
        const res = await fetch('admin_save_start_balance.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ balance })
        });
        const data = await res.json();
        
        if (data.success) {
            UI.showAutoMessage(data.message, 'success');
        } else {
            UI.showAutoMessage('❌ ' + data.error, 'error');
        }
    });
    
    document.getElementById('adminEditIngredientsPricesBtn')?.addEventListener('click', () => {
        showIngredientsPriceEditor();
    });
    
    document.getElementById('adminEditDrinksPricesBtn')?.addEventListener('click', () => {
        showDrinksPriceEditor();
    });
    
    const closeBtn = document.getElementById('closeAdminSettingsModal');
    if (closeBtn) {
        closeBtn.onclick = () => {
            document.getElementById('adminSettingsModal').classList.remove('active');
        };
    }
    
    const modal = document.getElementById('adminSettingsModal');
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.classList.remove('active');
        });
    }
}

// ========== ЗАГРУЗКА ПОСТАВЩИКОВ ДЛЯ ИНГРЕДИЕНТА ==========
async function loadSuppliersForIngredient(ingredientId, ingredientName, ingredientUnit) {
    const res = await fetch('get_suppliers.php');
    const suppliers = await res.json();
    const container = document.getElementById('suppliersList');
    if (!container) return;
    
    let html = '';
    let found = false;
    
    for (let sup of suppliers) {
        const hasIngredient = sup.items.some(item => {
            const ing = Game.state.ingredients.find(i => i.id === item.ingredient_id);
            return ing && (ing.id === ingredientId || ing.name === ingredientName);
        });
        
        if (!hasIngredient) continue;
        found = true;
        
        const supplierItem = sup.items.find(item => {
            const ing = Game.state.ingredients.find(i => i.id === item.ingredient_id);
            return ing && (ing.id === ingredientId || ing.name === ingredientName);
        });
        
        if (!supplierItem) continue;
        
        const ing = Game.state.ingredients.find(i => i.id === supplierItem.ingredient_id);
        const itemName = ing ? ing.name : ingredientName;
        const currentStock = ing ? ing.stock : 0;
        const stockDisplay = ing && ing.type === 'consumable' ? Math.floor(currentStock) : currentStock.toFixed(1);
        const packSize = supplierItem.pack_size || 1;
        const minPacks = supplierItem.min_quantity;
        const defaultPacks = minPacks;
        const defaultTotal = defaultPacks * packSize;
        
        let freeDeliveryText = '';
        if (sup.free_delivery_from > 0) {
            freeDeliveryText = `· 🎁 бесплатно от ${sup.free_delivery_from} ед.`;
        } else if (sup.delivery_cost === 0) {
            freeDeliveryText = `· 🚚 доставка всегда бесплатна`;
        }
        
        const cartSupplier = currentCart.find(c => c.supplier_id === sup.id);
        const cartItem = cartSupplier?.items.find(i => i.ingredient_id === supplierItem.ingredient_id);
        const cartPacks = cartItem ? cartItem.packs : 0;
        
        html += `
            <div class="supplier-card">
                <div class="supplier-header">
                    <span class="supplier-name">📦 ${sup.name}</span>
                    <span class="supplier-delivery">🚚 ${Math.floor(sup.delivery_time_min / 60)}-${Math.floor(sup.delivery_time_max / 60)}ч · ${Game.formatMoney(sup.delivery_cost)} ₽ ${freeDeliveryText}</span>
                </div>
                <div class="supplier-item">
                    <div class="supplier-item-info">
                        <span class="supplier-item-name">${itemName}</span>
                        <span class="supplier-item-price">💰 ${Game.formatMoney(supplierItem.price)} ₽/${supplierItem.unit}</span>
                        <span class="supplier-item-stock">📦 мин. ${minPacks} ${packSize > 1 ? 'упак.' : supplierItem.unit} · на складе: ${stockDisplay} ${supplierItem.unit}</span>
                    </div>
                    <div class="supplier-item-actions">
                        <div class="qty-wrapper">
                            <button class="qty-minus" data-supplier="${sup.id}" data-ingredient="${supplierItem.ingredient_id}" data-pack-size="${packSize}" data-unit="${supplierItem.unit}">−</button>
                            <input type="number" id="qty_${sup.id}_${supplierItem.ingredient_id}" value="${defaultPacks}" step="1" style="width: 45px;">
                            <button class="qty-plus" data-supplier="${sup.id}" data-ingredient="${supplierItem.ingredient_id}" data-pack-size="${packSize}" data-unit="${supplierItem.unit}">+</button>
                        </div>
                        <span class="pack-info">(${defaultTotal} ${supplierItem.unit})</span>
                        <button class="add-to-cart-btn" data-supplier="${sup.id}" data-ingredient="${supplierItem.ingredient_id}" data-price="${supplierItem.price}" data-name="${itemName}" data-unit="${supplierItem.unit}" data-pack-size="${packSize}" data-delivery="${sup.delivery_cost}" data-free-from="${sup.free_delivery_from}" data-supplier-name="${sup.name}">Добавить</button>
                        <span class="cart-count" id="cart_count_${sup.id}_${supplierItem.ingredient_id}">${cartPacks > 0 ? cartPacks : ''}</span>
                    </div>
                </div>
            </div>
        `;
    }
    
    if (!found) {
        html = '<div style="text-align:center; padding:20px;">⚠️ Ни один поставщик не продаёт этот ингредиент</div>';
    }
    container.innerHTML = html;
    
    attachCartEvents();
}

function attachCartEvents() {
    document.querySelectorAll('.qty-minus').forEach(btn => {
        btn.onclick = () => {
            const supplierId = parseInt(btn.dataset.supplier);
            const ingredientId = btn.dataset.ingredient;
            const packSize = parseFloat(btn.dataset.packSize) || 1;
            const unit = btn.dataset.unit || 'шт';
            const input = document.getElementById(`qty_${supplierId}_${ingredientId}`);
            if (input) {
                let val = parseFloat(input.value) || 1;
                if (val > 1) {
                    val = val - 1;
                    input.value = val;
                    const packInfo = btn.closest('.supplier-item')?.querySelector('.pack-info');
                    if (packInfo) packInfo.innerText = `(${val * packSize} ${unit})`;
                }
            }
        };
    });
    
    document.querySelectorAll('.qty-plus').forEach(btn => {
        btn.onclick = () => {
            const supplierId = parseInt(btn.dataset.supplier);
            const ingredientId = btn.dataset.ingredient;
            const packSize = parseFloat(btn.dataset.packSize) || 1;
            const unit = btn.dataset.unit || 'шт';
            const input = document.getElementById(`qty_${supplierId}_${ingredientId}`);
            if (input) {
                let val = parseFloat(input.value) || 1;
                val = val + 1;
                input.value = val;
                const packInfo = btn.closest('.supplier-item')?.querySelector('.pack-info');
                if (packInfo) packInfo.innerText = `(${val * packSize} ${unit})`;
            }
        };
    });
    
    document.querySelectorAll('.add-to-cart-btn').forEach(btn => {
        btn.onclick = () => {
            const supplierId = parseInt(btn.dataset.supplier);
            const ingredientId = btn.dataset.ingredient;
            const price = parseFloat(btn.dataset.price);
            const name = btn.dataset.name;
            const unit = btn.dataset.unit;
            const packSize = parseFloat(btn.dataset.packSize) || 1;
            const supplierName = btn.dataset.supplierName;
            
            const qtyInput = document.getElementById(`qty_${supplierId}_${ingredientId}`);
            const packs = parseFloat(qtyInput.value);
            
            if (isNaN(packs) || packs <= 0) {
                UI.showAutoMessage('❌ Введите количество', 'error');
                return;
            }
            
            const totalQuantity = packs * packSize;
            
            let supplierInCart = currentCart.find(c => c.supplier_id === supplierId);
            if (!supplierInCart) {
                supplierInCart = {
                    supplier_id: supplierId,
                    supplier_name: supplierName,
                    items: []
                };
                currentCart.push(supplierInCart);
            }
            
            const existingIndex = supplierInCart.items.findIndex(i => i.ingredient_id === ingredientId);
            if (existingIndex !== -1) {
                supplierInCart.items[existingIndex].packs = packs;
                supplierInCart.items[existingIndex].quantity = totalQuantity;
                supplierInCart.items[existingIndex].totalPrice = totalQuantity * price;
                UI.showAutoMessage(`✅ ${name}: ${packs} уп.`, 'success');
            } else {
                supplierInCart.items.push({
                    ingredient_id: ingredientId,
                    name: name,
                    packs: packs,
                    pack_size: packSize,
                    quantity: totalQuantity,
                    price: price,
                    unit: unit,
                    totalPrice: totalQuantity * price
                });
                UI.showAutoMessage(`✅ ${name} добавлен (${packs} уп.)`, 'success');
            }
            
            const countSpan = document.getElementById(`cart_count_${supplierId}_${ingredientId}`);
            if (countSpan) {
                const totalPacks = supplierInCart.items
                    .filter(i => i.ingredient_id === ingredientId)
                    .reduce((sum, i) => sum + i.packs, 0);
                countSpan.innerText = totalPacks > 0 ? totalPacks : '';
            }
            
            updateCartDisplay();
            updateCartCount();
        };
    });
}

function updateCartDisplay() {
    const cartDiv = document.getElementById('orderCart');
    const itemsDiv = document.getElementById('cartItems');
    const totalDiv = document.getElementById('cartTotal');
    
    if (currentCart.length === 0) {
        if (cartDiv) cartDiv.style.display = 'none';
        return;
    }
    
    if (cartDiv) cartDiv.style.display = 'block';
    let itemsHtml = '';
    let totalSum = 0;
    let deliveryTotal = 0;
    
    for (let supplier of currentCart) {
        let supplierTotal = 0;
        let totalUnits = 0;
        
        itemsHtml += `<div style="font-weight: bold; margin-top: 12px; margin-bottom: 8px; border-left: 3px solid var(--accent); padding-left: 8px;">📦 ${supplier.supplier_name}</div>`;
        
        for (let item of supplier.items) {
            const cost = item.totalPrice;
            supplierTotal += cost;
            totalUnits += item.quantity;
            
            itemsHtml += `
                <div class="cart-item" data-supplier="${supplier.supplier_id}" data-ingredient="${item.ingredient_id}" style="margin-bottom: 10px; padding-bottom: 8px; border-bottom: 1px solid var(--border);">
                    <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
                        <div style="flex: 2;">
                            <div style="font-weight: bold;">${item.name}</div>
                            <div style="font-size: 0.7rem;">${item.packs} уп. (${item.quantity} ${item.unit}) × ${Game.formatMoney(item.price)} ₽</div>
                        </div>
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <button class="cart-qty-minus-mini btn-sm" data-supplier="${supplier.supplier_id}" data-ingredient="${item.ingredient_id}" data-pack-size="${item.pack_size}" data-price="${item.price}" data-name="${item.name}" style="min-width: 28px; height: 28px;">−</button>
                            <span class="cart-qty-value-mini" style="min-width: 30px; text-align: center;">${item.packs}</span>
                            <button class="cart-qty-plus-mini btn-sm" data-supplier="${supplier.supplier_id}" data-ingredient="${item.ingredient_id}" data-pack-size="${item.pack_size}" data-price="${item.price}" data-name="${item.name}" style="min-width: 28px; height: 28px;">+</button>
                        </div>
                        <div style="min-width: 80px; text-align: right; font-weight: bold;">
                            ${Game.formatMoney(cost)} ₽
                        </div>
                        <button class="cart-item-remove-mini btn-sm btn-red" data-supplier="${supplier.supplier_id}" data-ingredient="${item.ingredient_id}" style="padding: 4px 8px;">🗑️</button>
                    </div>
                </div>
            `;
        }
        
        const supplierData = Game.state?.suppliers?.find(s => s.id === supplier.supplier_id);
        if (supplierData) {
            let deliveryCost = supplierData.delivery_cost || 0;
            const freeFrom = supplierData.free_delivery_from || 0;
            if (freeFrom > 0 && totalUnits >= freeFrom) {
                deliveryCost = 0;
                itemsHtml += `<div style="font-size:0.7rem; color:var(--positive); text-align:right; margin-bottom: 8px;">✅ Бесплатная доставка</div>`;
            } else if (freeFrom > 0) {
                itemsHtml += `<div style="font-size:0.7rem; opacity:0.7; text-align:right; margin-bottom: 8px;">💡 Добавьте ещё ${(freeFrom - totalUnits).toFixed(1)} ед. для бесплатной доставки</div>`;
            }
            deliveryTotal += deliveryCost;
        }
        
        totalSum += supplierTotal;
    }
    
    const grandTotal = totalSum + deliveryTotal;
    
    if (itemsDiv) itemsDiv.innerHTML = itemsHtml;
    if (totalDiv) {
        totalDiv.innerHTML = `
            <div style="margin-top: 10px; padding: 8px; background: var(--stat-bg); border-radius: 12px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                    <span>📦 Товары:</span>
                    <span>${Game.formatMoney(totalSum)} ₽</span>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                    <span>🚚 Доставка:</span>
                    <span>${deliveryTotal === 0 ? 'Бесплатно' : Game.formatMoney(deliveryTotal) + ' ₽'}</span>
                </div>
                <div style="display: flex; justify-content: space-between; padding-top: 5px; border-top: 1px solid var(--border); font-weight: bold;">
                    <span>💰 Итого:</span>
                    <span>${Game.formatMoney(grandTotal)} ₽</span>
                </div>
            </div>
        `;
    }
    
    attachCartMiniEvents();
}

function attachCartMiniEvents() {
    document.querySelectorAll('.cart-qty-plus-mini').forEach(btn => {
        btn.onclick = () => {
            const supplierId = parseInt(btn.dataset.supplier);
            const ingredientId = btn.dataset.ingredient;
            const packSize = parseFloat(btn.dataset.packSize);
            const price = parseFloat(btn.dataset.price);
            const name = btn.dataset.name;
            
            const supplierIndex = currentCart.findIndex(c => c.supplier_id === supplierId);
            if (supplierIndex !== -1) {
                const itemIndex = currentCart[supplierIndex].items.findIndex(i => i.ingredient_id === ingredientId);
                if (itemIndex !== -1) {
                    currentCart[supplierIndex].items[itemIndex].packs += 1;
                    const newPacks = currentCart[supplierIndex].items[itemIndex].packs;
                    currentCart[supplierIndex].items[itemIndex].quantity = newPacks * packSize;
                    currentCart[supplierIndex].items[itemIndex].totalPrice = currentCart[supplierIndex].items[itemIndex].quantity * price;
                    
                    updateCartDisplay();
                    updateCartCount();
                    
                    const countSpan = document.getElementById(`cart_count_${supplierId}_${ingredientId}`);
                    if (countSpan) {
                        const totalPacks = currentCart[supplierIndex].items
                            .filter(i => i.ingredient_id === ingredientId)
                            .reduce((sum, i) => sum + i.packs, 0);
                        countSpan.innerText = totalPacks > 0 ? totalPacks : '';
                    }
                }
            }
        };
    });
    
    document.querySelectorAll('.cart-qty-minus-mini').forEach(btn => {
        btn.onclick = () => {
            const supplierId = parseInt(btn.dataset.supplier);
            const ingredientId = btn.dataset.ingredient;
            const packSize = parseFloat(btn.dataset.packSize);
            const price = parseFloat(btn.dataset.price);
            const name = btn.dataset.name;
            
            const supplierIndex = currentCart.findIndex(c => c.supplier_id === supplierId);
            if (supplierIndex !== -1) {
                const itemIndex = currentCart[supplierIndex].items.findIndex(i => i.ingredient_id === ingredientId);
                if (itemIndex !== -1) {
                    let newPacks = currentCart[supplierIndex].items[itemIndex].packs - 1;
                    
                    if (newPacks <= 0) {
                        currentCart[supplierIndex].items.splice(itemIndex, 1);
                        UI.showAutoMessage(`❌ ${name} удалён`, 'error');
                        if (currentCart[supplierIndex].items.length === 0) {
                            currentCart.splice(supplierIndex, 1);
                        }
                    } else {
                        currentCart[supplierIndex].items[itemIndex].packs = newPacks;
                        currentCart[supplierIndex].items[itemIndex].quantity = newPacks * packSize;
                        currentCart[supplierIndex].items[itemIndex].totalPrice = currentCart[supplierIndex].items[itemIndex].quantity * price;
                    }
                    
                    updateCartDisplay();
                    updateCartCount();
                    
                    const countSpan = document.getElementById(`cart_count_${supplierId}_${ingredientId}`);
                    if (countSpan) {
                        const totalPacks = currentCart[supplierIndex]?.items
                            .filter(i => i.ingredient_id === ingredientId)
                            .reduce((sum, i) => sum + i.packs, 0) || 0;
                        countSpan.innerText = totalPacks > 0 ? totalPacks : '';
                    }
                }
            }
        };
    });
    
    document.querySelectorAll('.cart-item-remove-mini').forEach(btn => {
        btn.onclick = () => {
            const supplierId = parseInt(btn.dataset.supplier);
            const ingredientId = btn.dataset.ingredient;
            
            const supplierIndex = currentCart.findIndex(c => c.supplier_id === supplierId);
            if (supplierIndex !== -1) {
                const itemIndex = currentCart[supplierIndex].items.findIndex(i => i.ingredient_id === ingredientId);
                if (itemIndex !== -1) {
                    const removed = currentCart[supplierIndex].items[itemIndex];
                    currentCart[supplierIndex].items.splice(itemIndex, 1);
                    UI.showAutoMessage(`❌ ${removed.name} удалён`, 'error');
                    
                    if (currentCart[supplierIndex].items.length === 0) {
                        currentCart.splice(supplierIndex, 1);
                    }
                    
                    const countSpan = document.getElementById(`cart_count_${supplierId}_${ingredientId}`);
                    if (countSpan) {
                        const totalPacks = currentCart[supplierIndex]?.items
                            .filter(i => i.ingredient_id === ingredientId)
                            .reduce((sum, i) => sum + i.packs, 0) || 0;
                        countSpan.innerText = totalPacks > 0 ? totalPacks : '';
                    }
                }
            }
            
            updateCartDisplay();
            updateCartCount();
        };
    });
}

function updateCartCount() {
    const cartCountSpan = document.getElementById('cartCount');
    const cartBtn = document.getElementById('cartBtn');
    if (cartCountSpan) {
        let totalItems = 0;
        for (let supplier of currentCart) {
            totalItems += supplier.items.reduce((sum, item) => sum + item.packs, 0);
        }
        cartCountSpan.innerText = totalItems;
        if (cartBtn) cartBtn.style.display = totalItems > 0 ? 'inline-flex' : 'none';
    }
}

async function checkoutOrder() {
    if (currentCart.length === 0) {
        UI.showAutoMessage('Добавьте товары в корзину', 'error');
        return;
    }
    
    let totalSum = 0;
    let suppliersInfo = [];
    
    for (let supplier of currentCart) {
        let supplierTotal = 0;
        let totalUnits = 0;
        
        for (let item of supplier.items) {
            supplierTotal += item.totalPrice;
            totalUnits += item.quantity;
        }
        
        const supplierData = Game.state?.suppliers?.find(s => s.id === supplier.supplier_id);
        let deliveryCost = supplierData?.delivery_cost || 0;
        const freeFrom = supplierData?.free_delivery_from || 0;
        if (freeFrom > 0 && totalUnits >= freeFrom) {
            deliveryCost = 0;
        }
        
        const grandTotal = supplierTotal + deliveryCost;
        totalSum += grandTotal;
        
        suppliersInfo.push({
            supplier_id: supplier.supplier_id,
            items: supplier.items,
            delivery_cost: deliveryCost,
            total_cost: grandTotal,
            supplier_name: supplier.supplier_name
        });
    }
    
    if (Game.state.balance < totalSum) {
        UI.showAutoMessage(`❌ Недостаточно средств! Нужно ${Game.formatMoney(totalSum)} ₽`, 'error');
        return;
    }
    
    let allSuccess = true;
    for (let info of suppliersInfo) {
        const success = await Game.createOrder(info.supplier_id, info.items, info.delivery_cost, info.total_cost);
        if (!success) {
            allSuccess = false;
            break;
        }
    }
    
    if (allSuccess) {
        // Очищаем корзину
        currentCart = [];
        updateCartDisplay();
        updateCartCount();
        
        // Закрываем модальные окна
        document.getElementById('suppliersModal')?.classList.remove('active');
        document.getElementById('cartOnlyModal')?.classList.remove('active');
        
        // Перезагружаем состояние игры
        const gameData = await API.loadGame();
        Game.updateState(gameData);
        
        UI.showAutoMessage(`✅ Заказ оформлен! Общая сумма: ${Game.formatMoney(totalSum)} ₽`, 'success');
    }
}

function showCartOnlyModal() {
    const cartItemsDiv = document.getElementById('cartOnlyItems');
    const modal = document.getElementById('cartOnlyModal');
    
    if (!cartItemsDiv) return;
    
    if (currentCart.length === 0) {
        cartItemsDiv.innerHTML = '<div style="text-align:center; padding:40px;">🛒 Корзина пуста</div>';
        modal?.classList.add('active');
        return;
    }
    
    let html = '';
    let totalSum = 0;
    let deliveryTotal = 0;
    
    for (let supplier of currentCart) {
        const supplierData = Game.state?.suppliers?.find(s => s.id === supplier.supplier_id);
        let deliveryCost = supplierData?.delivery_cost || 0;
        let freeFrom = supplierData?.free_delivery_from || 0;
        let totalUnits = 0;
        let supplierSum = 0;
        
        for (let item of supplier.items) {
            totalUnits += item.quantity;
            supplierSum += item.totalPrice;
        }
        
        if (freeFrom > 0 && totalUnits >= freeFrom) {
            deliveryCost = 0;
        }
        
        deliveryTotal += deliveryCost;
        totalSum += supplierSum;
        
        html += `
            <div class="cart-supplier-group" style="margin-bottom: 20px; border: 1px solid var(--border); border-radius: 16px; overflow: hidden; background: var(--bg-card);">
                <div class="cart-supplier-header" style="background: var(--accent); color: #2a1a0c; padding: 10px 15px; font-weight: bold; font-size: 1rem;">
                    📦 ${supplier.supplier_name}
                    <span style="float: right; font-size: 0.8rem;">🚚 Доставка: ${deliveryCost === 0 ? 'Бесплатно' : Game.formatMoney(deliveryCost) + ' ₽'}</span>
                </div>
                <div style="padding: 12px;">
        `;
        
        for (let i = 0; i < supplier.items.length; i++) {
            const item = supplier.items[i];
            const cost = item.totalPrice;
            
            html += `
                <div class="cart-item-row" data-supplier="${supplier.supplier_id}" data-ingredient="${item.ingredient_id}" style="display: flex; align-items: center; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid var(--border); flex-wrap: wrap; gap: 10px;">
                    <div style="flex: 2; min-width: 140px;">
                        <div style="font-weight: bold;">${item.name}</div>
                        <div style="font-size: 0.7rem; opacity: 0.7;">${item.pack_size} ${item.unit} × ${Game.formatMoney(item.price)} ₽</div>
                    </div>
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <button class="cart-qty-minus btn-sm" data-supplier="${supplier.supplier_id}" data-ingredient="${item.ingredient_id}" data-pack-size="${item.pack_size}" data-price="${item.price}" data-name="${item.name}" data-unit="${item.unit}" style="min-width: 32px; height: 32px; background: var(--btn-bg); border-radius: 50%;">−</button>
                        <span class="cart-qty-value" style="min-width: 40px; text-align: center; font-weight: bold;">${item.packs}</span>
                        <button class="cart-qty-plus btn-sm" data-supplier="${supplier.supplier_id}" data-ingredient="${item.ingredient_id}" data-pack-size="${item.pack_size}" data-price="${item.price}" data-name="${item.name}" data-unit="${item.unit}" style="min-width: 32px; height: 32px; background: var(--btn-bg); border-radius: 50%;">+</button>
                    </div>
                    <div style="min-width: 90px; text-align: right; font-weight: bold;">
                        ${Game.formatMoney(cost)} ₽
                    </div>
                </div>
            `;
        }
        
        if (freeFrom > 0 && totalUnits < freeFrom) {
            html += `
                <div style="font-size: 0.7rem; padding: 8px 0; color: #ffaa44; text-align: right;">
                    💡 Добавьте ещё ${(freeFrom - totalUnits).toFixed(1)} ед. для бесплатной доставки
                </div>
            `;
        }
        
        html += `</div></div>`;
    }
    
    const grandTotal = totalSum + deliveryTotal;
    
    const fixedFooterHtml = `
        <div style="position: sticky; bottom: 0; background: var(--modal-bg); border-top: 2px solid var(--accent); padding: 15px; margin-top: 15px; border-radius: 0 0 28px 28px;">
            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 15px;">
                <div>
                    <div style="font-size: 0.8rem;">📦 Товары: <strong>${Game.formatMoney(totalSum)} ₽</strong></div>
                    <div style="font-size: 0.8rem;">🚚 Доставка: <strong>${deliveryTotal === 0 ? 'Бесплатно' : Game.formatMoney(deliveryTotal) + ' ₽'}</strong></div>
                    <div style="font-size: 1.1rem; font-weight: bold;">💰 Итого: ${Game.formatMoney(grandTotal)} ₽</div>
                </div>
                <button id="checkoutFromCartFixedBtn" class="btn-green" style="padding: 10px 24px; font-size: 1rem;">✅ Оформить заказ</button>
            </div>
        </div>
    `;
    
    cartItemsDiv.innerHTML = html + fixedFooterHtml;
    modal?.classList.add('active');
    
    attachCartModalEvents();
}

function attachCartModalEvents() {
    document.querySelectorAll('.cart-qty-plus').forEach(btn => {
        btn.onclick = () => {
            const supplierId = parseInt(btn.dataset.supplier);
            const ingredientId = btn.dataset.ingredient;
            const packSize = parseFloat(btn.dataset.packSize);
            const price = parseFloat(btn.dataset.price);
            const name = btn.dataset.name;
            const unit = btn.dataset.unit;
            
            const supplierIndex = currentCart.findIndex(c => c.supplier_id === supplierId);
            if (supplierIndex !== -1) {
                const itemIndex = currentCart[supplierIndex].items.findIndex(i => i.ingredient_id === ingredientId);
                if (itemIndex !== -1) {
                    currentCart[supplierIndex].items[itemIndex].packs += 1;
                    const newPacks = currentCart[supplierIndex].items[itemIndex].packs;
                    currentCart[supplierIndex].items[itemIndex].quantity = newPacks * packSize;
                    currentCart[supplierIndex].items[itemIndex].totalPrice = currentCart[supplierIndex].items[itemIndex].quantity * price;
                    
                    showCartOnlyModal();
                    updateCartCount();
                    updateCartDisplay();
                }
            }
        };
    });
    
    document.querySelectorAll('.cart-qty-minus').forEach(btn => {
        btn.onclick = () => {
            const supplierId = parseInt(btn.dataset.supplier);
            const ingredientId = btn.dataset.ingredient;
            const packSize = parseFloat(btn.dataset.packSize);
            const price = parseFloat(btn.dataset.price);
            const name = btn.dataset.name;
            
            const supplierIndex = currentCart.findIndex(c => c.supplier_id === supplierId);
            if (supplierIndex !== -1) {
                const itemIndex = currentCart[supplierIndex].items.findIndex(i => i.ingredient_id === ingredientId);
                if (itemIndex !== -1) {
                    let newPacks = currentCart[supplierIndex].items[itemIndex].packs - 1;
                    
                    if (newPacks <= 0) {
                        currentCart[supplierIndex].items.splice(itemIndex, 1);
                        UI.showAutoMessage(`❌ ${name} удалён`, 'error');
                        
                        if (currentCart[supplierIndex].items.length === 0) {
                            currentCart.splice(supplierIndex, 1);
                        }
                    } else {
                        currentCart[supplierIndex].items[itemIndex].packs = newPacks;
                        currentCart[supplierIndex].items[itemIndex].quantity = newPacks * packSize;
                        currentCart[supplierIndex].items[itemIndex].totalPrice = currentCart[supplierIndex].items[itemIndex].quantity * price;
                    }
                    
                    showCartOnlyModal();
                    updateCartCount();
                    updateCartDisplay();
                }
            }
        };
    });
    
    const checkoutBtn = document.getElementById('checkoutFromCartFixedBtn');
    if (checkoutBtn) {
        const newCheckoutBtn = checkoutBtn.cloneNode(true);
        checkoutBtn.parentNode.replaceChild(newCheckoutBtn, checkoutBtn);
        
        newCheckoutBtn.onclick = async () => {
            await checkoutOrder();
        };
    }
}

async function setupElectricityRatesForAdmin() {
    const isAdmin = await checkIsAdmin();
    const adminBlock = document.getElementById('electricityAdminBlock');
    const saveBtn = document.getElementById('saveElecRatesBtn');
    
    if (adminBlock) {
        adminBlock.style.display = 'block';
    }
    
    const summer1 = document.getElementById('elecRate1Summer');
    const winter1 = document.getElementById('elecRate1Winter');
    const summer2 = document.getElementById('elecRate2Summer');
    const winter2 = document.getElementById('elecRate2Winter');
    const summer3 = document.getElementById('elecRate3Summer');
    const winter3 = document.getElementById('elecRate3Winter');
    
    if (summer1 && Game.state) {
        const rates = Game.state.electricityRates || {};
        summer1.value = rates.summer1 || 6.43;
        winter1.value = rates.winter1 || 7.15;
        summer2.value = rates.summer2 || 9.18;
        winter2.value = rates.winter2 || 10.23;
        summer3.value = rates.summer3 || 11.05;
        winter3.value = rates.winter3 || 13.47;
    }
    
    const allInputs = [summer1, winter1, summer2, winter2, summer3, winter3].filter(i => i);
    
    if (isAdmin) {
        allInputs.forEach(input => {
            if (input) input.removeAttribute('readonly');
        });
        if (saveBtn) {
            saveBtn.style.display = 'block';
            saveBtn.style.width = '160px';
            saveBtn.style.margin = '12px auto 0 auto';
        }
        
        if (saveBtn) {
            const newSaveBtn = saveBtn.cloneNode(true);
            saveBtn.parentNode.replaceChild(newSaveBtn, saveBtn);
            
            newSaveBtn.onclick = async () => {
                const newRates = {
                    summer1: parseFloat(document.getElementById('elecRate1Summer')?.value) || 6.43,
                    winter1: parseFloat(document.getElementById('elecRate1Winter')?.value) || 7.15,
                    summer2: parseFloat(document.getElementById('elecRate2Summer')?.value) || 9.18,
                    winter2: parseFloat(document.getElementById('elecRate2Winter')?.value) || 10.23,
                    summer3: parseFloat(document.getElementById('elecRate3Summer')?.value) || 11.05,
                    winter3: parseFloat(document.getElementById('elecRate3Winter')?.value) || 13.47
                };
                
                if (Game.state) {
                    Game.state.electricityRates = newRates;
                    await Game.forceSave();
                    UI.showAutoMessage('⚡ Тарифы на электричество сохранены', 'success');
                }
            };
        }
    } else {
        allInputs.forEach(input => {
            if (input) input.setAttribute('readonly', 'readonly');
        });
        if (saveBtn) {
            saveBtn.style.display = 'none';
        }
    }
}

async function forceSyncFromServer() {
    try {
        const response = await fetch('load_game.php?' + Date.now(), {
            cache: 'no-cache',
            credentials: 'same-origin'
        });
        const gameData = await response.json();
        if (gameData && !gameData.error) {
            Game.updateState(gameData);
            const summer1 = document.getElementById('elecRate1Summer');
            if (summer1 && gameData.electricityRates) {
                summer1.value = gameData.electricityRates.summer1 || 6.43;
                const winter1 = document.getElementById('elecRate1Winter');
                const summer2 = document.getElementById('elecRate2Summer');
                const winter2 = document.getElementById('elecRate2Winter');
                const summer3 = document.getElementById('elecRate3Summer');
                const winter3 = document.getElementById('elecRate3Winter');
                if (winter1) winter1.value = gameData.electricityRates.winter1 || 7.15;
                if (summer2) summer2.value = gameData.electricityRates.summer2 || 9.18;
                if (winter2) winter2.value = gameData.electricityRates.winter2 || 10.23;
                if (summer3) summer3.value = gameData.electricityRates.summer3 || 11.05;
                if (winter3) winter3.value = gameData.electricityRates.winter3 || 13.47;
            }
            return true;
        }
    } catch(e) {
        console.error('Sync error:', e);
    }
    return false;
}

window.forceSyncFromServer = forceSyncFromServer;

// ========== СОРТИРОВКА ПРЕДЛОЖЕНИЙ ==========
let currentSuggestionsFilter = 'all';

function renderSuggestions(suggestions, isAdmin) {
    const container = document.getElementById('suggestionsList');
    if (!container) return;
    
    let filtered = suggestions;
    if (currentSuggestionsFilter !== 'all') {
        filtered = suggestions.filter(s => s.status === currentSuggestionsFilter);
    }
    
    const sorted = [...filtered];
    sorted.sort((a, b) => {
        const order = { 'in_work': 1, 'new': 2, 'completed': 3, 'rejected': 3 };
        return (order[a.status] || 2) - (order[b.status] || 2);
    });
    
    // КНОПКИ ФИЛЬТРОВ — ВСЕГДА ПОКАЗЫВАЕМ
    let filtersHtml = '<div style="display: flex; gap: 10px; margin-bottom: 15px; flex-wrap: wrap;">';
    const filters = [
        { value: 'all', label: '📋 Все' },
        { value: 'new', label: '🆕 Новые' },
        { value: 'in_work', label: '🔧 В работе' },
        { value: 'completed', label: '✅ Выполненные' },
        { value: 'rejected', label: '❌ Отклонённые' }
    ];
    for (let f of filters) {
        filtersHtml += `<button class="suggestions-filter-btn btn-sm ${currentSuggestionsFilter === f.value ? 'btn-green' : 'btn-blue'}" data-filter="${f.value}">${f.label}</button>`;
    }
    filtersHtml += '</div>';
    
    // СПИСОК ПРЕДЛОЖЕНИЙ
    let itemsHtml = '<div id="suggestionsListItems">';
    
    if (sorted.length === 0) {
        itemsHtml += '<div style="text-align:center; padding:20px;">😴 Нет предложений в этой категории</div>';
    } else {
        for (let s of sorted) {
            let statusText = '';
            let statusClass = '';
            switch (s.status) {
                case 'new': statusText = '🆕 Новое'; statusClass = 'status-new'; break;
                case 'in_work': statusText = '🔧 В работе'; statusClass = 'status-work'; break;
                case 'completed': statusText = '✅ Выполнено'; statusClass = 'status-completed'; break;
                case 'rejected': statusText = '❌ Отклонено'; statusClass = 'status-rejected'; break;
                default: statusText = '🆕 Новое'; statusClass = 'status-new';
            }
            itemsHtml += `
                <div class="suggestion-item" data-id="${s.id}" style="background:var(--stat-bg); border-radius:16px; padding:12px; margin-bottom:12px;">
                    <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap;">
                        <div><strong>${escapeHtml(s.username)}</strong> · <span class="${statusClass}" style="font-size:0.7rem;">${statusText}</span></div>
                        <div style="font-size:0.7rem; opacity:0.6;">${new Date(s.created_at).toLocaleString()}</div>
                    </div>
                    <div style="margin-top:8px;">${escapeHtml(s.message)}</div>
                    ${isAdmin ? `
                    <div style="margin-top:10px; display:flex; gap:8px; justify-content:flex-end;">
                        <select class="suggestion-status-select" data-id="${s.id}" style="width:120px;">
                            <option value="new" ${s.status === 'new' ? 'selected' : ''}>🆕 Новое</option>
                            <option value="in_work" ${s.status === 'in_work' ? 'selected' : ''}>🔧 В работе</option>
                            <option value="completed" ${s.status === 'completed' ? 'selected' : ''}>✅ Выполнено</option>
                            <option value="rejected" ${s.status === 'rejected' ? 'selected' : ''}>❌ Отклонено</option>
                        </select>
                        <button class="delete-suggestion-btn btn-sm btn-red" data-id="${s.id}">🗑️</button>
                    </div>
                    ` : ''}
                </div>
            `;
        }
    }
    itemsHtml += '</div>';
    
    container.innerHTML = filtersHtml + itemsHtml;
    
    document.querySelectorAll('.suggestions-filter-btn').forEach(btn => {
        btn.onclick = () => {
            currentSuggestionsFilter = btn.dataset.filter;
            loadAndRenderSuggestions();
        };
    });
    
    if (isAdmin) {
        document.querySelectorAll('.suggestion-status-select').forEach(select => {
            select.addEventListener('change', async (e) => {
                const id = select.dataset.id;
                const newStatus = select.value;
                await API.updateSuggestionStatus(id, newStatus);
                loadAndRenderSuggestions();
            });
        });
        document.querySelectorAll('.delete-suggestion-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = btn.dataset.id;
                if (confirm('Удалить предложение?')) {
                    await API.deleteSuggestion(id);
                    loadAndRenderSuggestions();
                }
            });
        });
    }
}

async function loadAndRenderSuggestions() {
    try {
        const data = await API.getSuggestions();
        if (data.success && data.suggestions) {
            renderSuggestions(data.suggestions, data.is_admin);
        }
    } catch(e) {
        console.error('Ошибка загрузки предложений:', e);
    }
}

// ========== ФУНКЦИИ НОВОСТЕЙ ==========
async function loadNewsList() {
    const response = await fetch('get_news.php');
    return await response.json();
}

async function saveNews(action, id, version, date, description) {
    const res = await fetch('save_news.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, id, version, date, description })
    });
    return await res.json();
}

function editNewsHeader() {
    const currentTitle = document.getElementById('newsModalTitle')?.innerText || 'История обновлений';
    const currentDesc = document.getElementById('newsModalDesc')?.innerText || '';
    
    const newTitle = prompt('Редактировать заголовок:', currentTitle);
    if (!newTitle) return;
    
    const newDesc = prompt('Редактировать описание (подзаголовок):', currentDesc);
    
    localStorage.setItem('newsHeaderTitle', newTitle);
    localStorage.setItem('newsHeaderDesc', newDesc || '');
    
    const titleEl = document.getElementById('newsModalTitle');
    const descEl = document.getElementById('newsModalDesc');
    
    if (titleEl) titleEl.innerText = newTitle;
    if (descEl) {
        if (newDesc) {
            descEl.innerText = newDesc;
            descEl.style.display = 'block';
        } else {
            descEl.style.display = 'none';
        }
    }
    
    alert('✅ Заголовок и описание обновлены');
}

function openEditNewsModal(news) {
    let modal = document.getElementById('editNewsModal');
    if (!modal) {
        const div = document.createElement('div');
        div.id = 'editNewsModal';
        div.className = 'modal';
        div.innerHTML = `
            <div class="modal-content" style="max-width: 500px;">
                <div class="modal-header">✏️ Редактирование новости</div>
                <div class="modal-body">
                    <label>Версия:</label>
                    <input type="text" id="editNewsVersion" style="width:100%; margin-bottom:10px;">
                    <label>Дата:</label>
                    <input type="text" id="editNewsDate" style="width:100%; margin-bottom:10px;">
                    <label>Описание:</label>
                    <textarea id="editNewsDesc" rows="4" style="width:100%; margin-bottom:10px;"></textarea>
                </div>
                <div style="margin-top:15px; display:flex; gap:10px; justify-content:flex-end;">
                    <button id="saveNewsBtn" class="btn-green">💾 Сохранить</button>
                    <button id="cancelEditNewsBtn" class="btn-red">Отмена</button>
                </div>
            </div>
        `;
        document.body.appendChild(div);
        
        div.addEventListener('click', (e) => {
            if (e.target === div) div.classList.remove('active');
        });
        
        document.getElementById('cancelEditNewsBtn')?.addEventListener('click', () => {
            div.classList.remove('active');
        });
        
        modal = div;
    }
    
    const modalEl = modal;
    const versionInput = document.getElementById('editNewsVersion');
    const dateInput = document.getElementById('editNewsDate');
    const descInput = document.getElementById('editNewsDesc');
    const saveBtn = document.getElementById('saveNewsBtn');
    
    if (versionInput) versionInput.value = news.version;
    if (dateInput) dateInput.value = news.date;
    if (descInput) descInput.value = news.description;
    
    const oldSaveBtn = saveBtn.cloneNode(true);
    if (saveBtn) saveBtn.parentNode.replaceChild(oldSaveBtn, saveBtn);
    
    oldSaveBtn.onclick = async () => {
        const result = await saveNews('edit', news.id, versionInput.value, dateInput.value, descInput.value);
        if (result.success) {
            alert('✅ Новость обновлена');
            modalEl.classList.remove('active');
            document.getElementById('newsBtn').click();
        } else {
            alert('❌ Ошибка: ' + result.error);
        }
    };
    
    modalEl.classList.add('active');
}

function openAddNewsModal() {
    let modal = document.getElementById('addNewsModal');
    if (!modal) {
        const div = document.createElement('div');
        div.id = 'addNewsModal';
        div.className = 'modal';
        div.innerHTML = `
            <div class="modal-content" style="max-width: 500px;">
                <div class="modal-header">➕ Добавление новости</div>
                <div class="modal-body">
                    <label>Версия:</label>
                    <input type="text" id="addNewsVersion" style="width:100%; margin-bottom:10px;" placeholder="например: v2.5 — Новое обновление">
                    <label>Дата:</label>
                    <input type="text" id="addNewsDate" style="width:100%; margin-bottom:10px;" placeholder="например: 19 Мая 2026">
                    <label>Описание:</label>
                    <textarea id="addNewsDesc" rows="4" style="width:100%; margin-bottom:10px;" placeholder="Текст новости..."></textarea>
                </div>
                <div style="margin-top:15px; display:flex; gap:10px; justify-content:flex-end;">
                    <button id="confirmAddNewsBtn" class="btn-green">➕ Добавить</button>
                    <button id="cancelAddNewsBtn" class="btn-red">Отмена</button>
                </div>
            </div>
        `;
        document.body.appendChild(div);
        
        div.addEventListener('click', (e) => {
            if (e.target === div) div.classList.remove('active');
        });
        
        document.getElementById('cancelAddNewsBtn')?.addEventListener('click', () => {
            div.classList.remove('active');
        });
        
        modal = div;
    }
    
    const modalEl = modal;
    const versionInput = document.getElementById('addNewsVersion');
    const dateInput = document.getElementById('addNewsDate');
    const descInput = document.getElementById('addNewsDesc');
    const addBtn = document.getElementById('confirmAddNewsBtn');
    
    if (versionInput) versionInput.value = '';
    if (dateInput) dateInput.value = new Date().toLocaleDateString('ru');
    if (descInput) descInput.value = '';
    
    const oldAddBtn = addBtn.cloneNode(true);
    if (addBtn) addBtn.parentNode.replaceChild(oldAddBtn, addBtn);
    
    oldAddBtn.onclick = async () => {
        if (!versionInput.value || !descInput.value) {
            alert('Заполните версию и описание');
            return;
        }
        const result = await saveNews('add', 0, versionInput.value, dateInput.value || new Date().toLocaleDateString('ru'), descInput.value);
        if (result.success) {
            alert('✅ Новость добавлена');
            modalEl.classList.remove('active');
            document.getElementById('newsBtn').click();
        } else {
            alert('❌ Ошибка: ' + result.error);
        }
    };
    
    modalEl.classList.add('active');
}

async function deleteNewsItem(id) {
    if (!confirm('Удалить эту новость?')) return;
    const result = await saveNews('delete', id, '', '', '');
    if (result.success) {
        alert('✅ Новость удалена');
        document.getElementById('newsBtn').click();
    } else {
        alert('❌ Ошибка: ' + result.error);
    }
}

// ========== ОСНОВНАЯ ЗАГРУЗКА ==========
async function checkSessionAndStart() {
    try {
        const loggedIn = await API.checkSession();
        if (loggedIn) {
            await checkIsAdmin();
            if (window.showGameUI) window.showGameUI();
            const gameData = await API.loadGame();
            Game.updateState(gameData);
            
            const buyAllBtn = document.getElementById('buyAllIngredientsBtn');
            if (buyAllBtn) {
                buyAllBtn.style.display = isAdminCache ? 'inline-flex' : 'none';
            }
            
            const addIngredientBtn = document.getElementById('addIngredientBtn');
            if (addIngredientBtn) {
                addIngredientBtn.style.display = isAdminCache ? 'inline-flex' : 'none';
            }
            
            // Скрываем поле налога для обычных игроков
            const taxPercentInput = document.getElementById('taxPercent');
            const updateTaxBtn = document.getElementById('updateTaxBtn');
            if (taxPercentInput && updateTaxBtn) {
                if (!isAdminCache) {
                    taxPercentInput.setAttribute('readonly', 'readonly');
                    updateTaxBtn.style.display = 'none';
                }
            }

            window.openSupplierForIngredient = async (ingredientId, ingredientName, ingredientUnit) => {
                await loadSuppliersForIngredient(ingredientId, ingredientName, ingredientUnit);
                document.getElementById('suppliersModal')?.classList.add('active');
            };
            
            window.isAdminCache = isAdminCache;
            window.openAddIngredientModal = openAddIngredientModal;
            
            const usernameDisplay = document.getElementById('usernameDisplay');
            if (usernameDisplay && gameData && gameData.username) {
                usernameDisplay.innerText = '👤 ' + gameData.username;
            } else if (usernameDisplay) {
                try {
                    const userRes = await fetch('get_user.php');
                    const userData = await userRes.json();
                    if (userData.username) {
                        usernameDisplay.innerText = '👤 ' + userData.username;
                    }
                } catch(e) {}
            }
            
            await setupElectricityRatesForAdmin();
            
            await checkIsAdminForSettings();
            initAdminPanel();
            
            Game.startSales();
            Game.startAutoSync();
            Game.startGameLoop();
            gameInitialized = true;
        } else {
            if (window.showLoginUI) window.showLoginUI();
        }
    } catch (error) {
        console.error(error);
        if (window.showLoginUI) window.showLoginUI();
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    UI.initTheme();
    
    await checkIsAdmin();
    
    document.querySelectorAll('input[type="text"], input[type="number"]').forEach(input => {
        const key = `input_${input.id}`;
        if (localStorage.getItem(key)) input.value = localStorage.getItem(key);
        input.addEventListener('change', () => localStorage.setItem(key, input.value));
    });
    
    const loginBtn = document.getElementById('loginBtn');
    const loginErrorDiv = document.getElementById('loginError');
    
    if (loginBtn) {
        loginBtn.onclick = null;
        
        loginBtn.addEventListener('click', async (e) => {
            const username = document.getElementById('loginUsername').value;
            const password = document.getElementById('loginPassword').value;
            
            if (!username || !password) {
                if (loginErrorDiv) loginErrorDiv.innerText = '❌ Заполните оба поля';
                return;
            }
            
            try {
                await API.login(username, password);
                location.reload();
            } catch(err) {
                if (loginErrorDiv) loginErrorDiv.innerText = '❌ ' + (err.message || 'Неверный логин или пароль');
                console.error('Login error:', err);
            }
        });
    }
    
    document.getElementById('registerBtn')?.addEventListener('click', async () => {
        const username = document.getElementById('loginUsername').value;
        const password = document.getElementById('loginPassword').value;
        const errorDiv = document.getElementById('loginError');
        
        let ref = sessionStorage.getItem('pendingRef') || '';
        console.log('📤 Регистрация с ref:', ref);
        
        try {
            await API.register(username, password, ref);
            sessionStorage.removeItem('pendingRef');
            alert('Регистрация успешна! Войдите.');
        } catch(e) {
            if (errorDiv) errorDiv.innerText = e.message;
        }
    });
    
    document.getElementById('logoutBtn')?.addEventListener('click', async () => {
        await API.logout();
        location.reload();
    });
    
    document.getElementById('buyAllIngredientsBtn')?.addEventListener('click', async () => {
        await Game.buyAllToThreshold();
    });
    
    document.getElementById('clearLogsBtn')?.addEventListener('click', async () => {
        if (confirm('Очистить журнал событий?')) {
            const result = await API.clearLogs();
            Game.updateState(result);
            UI.renderLogs(result);
        }
    });
    
    document.getElementById('addIngredientBtn')?.addEventListener('click', () => {
        if (window.openAddIngredientModal) {
            window.openAddIngredientModal();
        } else {
            UI.showAutoMessage('❌ Функция добавления ингредиентов не загружена', 'error');
        }
    });
    
    document.getElementById('addDrinkBtn')?.addEventListener('click', () => {
        if (Game.openCreateDrinkModal) {
            Game.openCreateDrinkModal();
        } else {
            UI.showAutoMessage('❌ Ошибка: функция создания напитков не загружена', 'error');
        }
    });
    
    document.getElementById('buyMachineBtn')?.addEventListener('click', () => {
        Game.buyMachine();
    });
    
    document.getElementById('updateTaxBtn')?.addEventListener('click', async () => {
        const value = parseFloat(document.getElementById('taxPercent')?.value);
        if (!isNaN(value) && isAdminCache) {
            const result = await API.updateTax(value);
            Game.updateState(result);
        } else if (!isAdminCache) {
            UI.showAutoMessage('❌ Изменение налога доступно только администратору', 'error');
        }
    });
    
    document.getElementById('statsBtn')?.addEventListener('click', () => UI.showFullStats(Game.state));
    
    document.getElementById('themeToggle')?.addEventListener('click', () => UI.toggleTheme());
    document.getElementById('closeStatsModal')?.addEventListener('click', () => document.getElementById('statsModal')?.classList.remove('active'));
    
    document.getElementById('exportDataBtn')?.addEventListener('click', () => document.getElementById('exportModal')?.classList.add('active'));
    document.getElementById('confirmExportBtn')?.addEventListener('click', () => {
        const format = document.querySelector('input[name="expFormat"]:checked')?.value || 'json';
        UI.exportFullData(format, Game.state);
        document.getElementById('exportModal')?.classList.remove('active');
    });
    document.getElementById('cancelExportBtn')?.addEventListener('click', () => document.getElementById('exportModal')?.classList.remove('active'));
    
    document.getElementById('exportLogsBtnLocal')?.addEventListener('click', () => {
        UI.exportLogs(prompt('Формат (json, csv, txt)', 'json'), Game.state);
    });
    
    document.getElementById('profileBtn')?.addEventListener('click', async () => {
        try {
            const res = await fetch('get_user.php');
            const data = await res.json();
            if (data.username) document.getElementById('profileLogin').value = data.username;
            if (data.created_at) {
                const days = Math.floor((new Date() - new Date(data.created_at)) / 86400000);
                const adminBadge = data.is_admin ? '<div>👑 Администратор</div>' : '';
                document.getElementById('profileInfo').innerHTML = `<div>📅 Дней в игре: ${days}</div>${adminBadge}`;
            }
        } catch(e) {}
        document.getElementById('profileModal')?.classList.add('active');
    });
    
    document.getElementById('closeProfileModal')?.addEventListener('click', () => document.getElementById('profileModal')?.classList.remove('active'));
    
    document.getElementById('changeLoginBtn')?.addEventListener('click', async () => {
        const newLogin = document.getElementById('profileLogin')?.value.trim();
        if (!newLogin) return;
        const res = await fetch('change_login.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ new_login: newLogin })
        });
        const data = await res.json();
        document.getElementById('profileMessage').innerHTML = data.success ? '✅ Логин изменён!' : '❌ ' + data.error;
        if (data.success) setTimeout(() => location.reload(), 1500);
    });
    
    document.getElementById('changePasswordBtn')?.addEventListener('click', async () => {
        const newPass = document.getElementById('profileNewPassword')?.value;
        const confirmPass = document.getElementById('profileConfirmPassword')?.value;
        if (!newPass || newPass.length < 4) {
            document.getElementById('profileMessage').innerHTML = '❌ Минимум 4 символа';
            return;
        }
        if (newPass !== confirmPass) {
            document.getElementById('profileMessage').innerHTML = '❌ Пароли не совпадают';
            return;
        }
        const res = await fetch('change_password.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ new_password: newPass, confirm_password: confirmPass })
        });
        const data = await res.json();
        document.getElementById('profileMessage').innerHTML = data.success ? '✅ Пароль изменён!' : '❌ ' + data.error;
    });
    
    document.getElementById('deleteAccountBtn')?.addEventListener('click', async () => {
        if (confirm('Удалить аккаунт?')) {
            await fetch('delete_account.php', { method: 'POST' });
            location.reload();
        }
    });
    
    document.getElementById('exportDataBtnInProfile')?.addEventListener('click', () => {
        document.getElementById('profileModal')?.classList.remove('active');
        document.getElementById('exportModal')?.classList.add('active');
    });
    
    document.getElementById('resetGameBtnInProfile')?.addEventListener('click', async () => {
        document.getElementById('profileModal')?.classList.remove('active');
        
        if (isAdminCache) {
            const userInput = prompt('Введите стартовый баланс:', '50000');
            if (userInput === null) return;
            const newBalance = parseFloat(userInput);
            if (!isNaN(newBalance) && newBalance > 0) {
                const newState = await API.resetGame(newBalance);
                Game.updateState(newState);
                location.reload();
            } else {
                alert('Введите корректную сумму');
            }
        } else {
            const newState = await API.resetGame(50000);
            Game.updateState(newState);
            location.reload();
        }
    });
    
    document.getElementById('newsBtn')?.addEventListener('click', async () => {
        const data = await loadNewsList();
        if (data.news) {
            const modalBody = document.getElementById('newsModalBody');
            
            const savedTitle = localStorage.getItem('newsHeaderTitle') || 'История обновлений';
            const savedDesc = localStorage.getItem('newsHeaderDesc') || '';
            
            const addNewsBtn = document.getElementById('addNewsFullBtn');
            if (addNewsBtn) {
                addNewsBtn.style.display = data.is_admin ? 'inline-flex' : 'none';
                if (data.is_admin) {
                    addNewsBtn.onclick = () => openAddNewsModal();
                }
            }
            
            const headerEditBtn = document.getElementById('editNewsHeaderBtn');
            if (headerEditBtn && data.is_admin) {
                headerEditBtn.style.display = 'inline-flex';
                headerEditBtn.onclick = (e) => {
                    e.preventDefault();
                    editNewsHeader();
                };
            } else if (headerEditBtn) {
                headerEditBtn.style.display = 'none';
            }
            
            let html = `
                <div style="margin-bottom:20px; border-bottom:2px solid var(--accent); padding-bottom:10px;">
                    <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
                        <h2 id="newsModalTitle" style="margin:0; font-size:1.4rem;">${escapeHtml(savedTitle)}</h2>
                    </div>
                    ${savedDesc ? `<div id="newsModalDesc" style="opacity:0.7; margin-top:5px;">${escapeHtml(savedDesc)}</div>` : '<div id="newsModalDesc" style="display:none;"></div>'}
                </div>
                <div id="newsListContainer">
            `;
            
            for (let i = 0; i < data.news.length; i++) {
                const n = data.news[i];
                html += `
                    <div style="border-left:4px solid var(--accent); padding-left:12px; margin-bottom:20px;">
                        <div style="font-weight:bold; font-size:1.1rem;">${escapeHtml(n.version)}</div>
                        <div style="font-size:0.75rem; opacity:0.7; margin:5px 0;">📅 ${escapeHtml(n.date)}</div>
                        <div style="margin-top:8px; white-space:pre-line;">${escapeHtml(n.description).replace(/\n/g, '<br>')}</div>
                `;
                
                if (data.is_admin) {
                    html += `
                        <div style="margin-top:12px; display:flex; gap:8px;">
                            <button class="btn-sm btn-blue edit-news-full-btn" data-id="${n.id}" data-version="${escapeHtml(n.version)}" data-date="${escapeHtml(n.date)}" data-desc="${escapeHtml(n.description)}">📌 Редактировать</button>
                            <button class="btn-sm btn-red delete-news-btn" data-id="${n.id}">🗑️ Удалить</button>
                        </div>
                    `;
                }
                
                html += `</div>`;
            }
            
            html += `</div>`;
            modalBody.innerHTML = html;
            document.getElementById('newsModal')?.classList.add('active');
            
            if (data.is_admin) {
                document.querySelectorAll('.edit-news-full-btn').forEach(btn => {
                    btn.onclick = () => {
                        openEditNewsModal({
                            id: parseInt(btn.dataset.id),
                            version: btn.dataset.version,
                            date: btn.dataset.date,
                            description: btn.dataset.desc
                        });
                    };
                });
                
                document.querySelectorAll('.delete-news-btn').forEach(btn => {
                    btn.onclick = () => deleteNewsItem(parseInt(btn.dataset.id));
                });
            }
        }
    });
    
    document.getElementById('closeNewsModal')?.addEventListener('click', () => document.getElementById('newsModal')?.classList.remove('active'));
    
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => Game.setActiveFilter(btn.dataset.filter));
        btn.addEventListener('touchstart', () => Game.setActiveFilter(btn.dataset.filter));
    });
    
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => { if (e.target === modal) modal.classList.remove('active'); });
        modal.addEventListener('touchstart', (e) => { if (e.target === modal) modal.classList.remove('active'); });
    });
    
    document.getElementById('cartBtn')?.addEventListener('click', () => {
        showCartOnlyModal();
    });
    
    document.getElementById('closeCartOnlyModal')?.addEventListener('click', () => {
        document.getElementById('cartOnlyModal')?.classList.remove('active');
    });
    
    document.getElementById('checkoutFromCartBtn')?.addEventListener('click', async () => {
        await checkoutOrder();
    });
    
    document.getElementById('closeSuppliersModal')?.addEventListener('click', () => {
        document.getElementById('suppliersModal')?.classList.remove('active');
    });
    
    document.getElementById('checkoutOrderBtn')?.addEventListener('click', checkoutOrder);
    
    // Предложения и пожелания
    const suggestionsBtn = document.getElementById('suggestionsBtn');
    const suggestionsModal = document.getElementById('suggestionsModal');
    const closeSuggestionsModal = document.getElementById('closeSuggestionsModal');
    const submitSuggestionBtn = document.getElementById('submitSuggestionBtn');
    const suggestionText = document.getElementById('suggestionText');
    
    if (suggestionsBtn && suggestionsModal) {
        suggestionsBtn.onclick = () => {
            loadAndRenderSuggestions();
            suggestionsModal.classList.add('active');
        };
        if (closeSuggestionsModal) {
            closeSuggestionsModal.onclick = () => suggestionsModal.classList.remove('active');
        }
        if (submitSuggestionBtn) {
            submitSuggestionBtn.onclick = async () => {
                const msg = suggestionText.value.trim();
                if (!msg) {
                    alert('Введите текст предложения');
                    return;
                }
                try {
                    const res = await API.addSuggestion(msg);
                    if (res.success) {
                        suggestionText.value = '';
                        loadAndRenderSuggestions();
                        alert('Предложение отправлено!');
                    } else {
                        alert('Ошибка: ' + (res.error || 'Неизвестная ошибка'));
                    }
                } catch(e) {
                    alert('Ошибка отправки');
                }
            };
        }
    }
    
    // Контакты
    const contactsBtn = document.getElementById('contactsBtn');
    const contactsModal = document.getElementById('contactsModal');
    const closeContactsModal = document.getElementById('closeContactsModal');
    const contactsContent = document.getElementById('contactsContent');

    async function loadContacts() {
        if (!contactsContent) return;
        contactsContent.innerHTML = '<div>Загрузка...</div>';
        
        try {
            const res = await fetch('get_contacts.php');
            const data = await res.json();
            
            if (data.success && data.contacts) {
                let text = data.contacts;
                let html = text.replace(/\n/g, '<br>');
                html = html.replace(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g, '<a href="mailto:$1" class="contact-link">$1</a>');
                html = html.replace(/@([a-zA-Z0-9_]+)/g, '<a href="https://t.me/$1" target="_blank" class="contact-link">@$1</a>');
                contactsContent.innerHTML = `<div style="line-height:1.6;">${html}</div>`;
            } else {
                contactsContent.innerHTML = '<div>Контакты временно недоступны</div>';
            }
        } catch(e) {
            console.error('Ошибка загрузки контактов:', e);
            contactsContent.innerHTML = '<div>Ошибка загрузки контактов</div>';
        }
    }

    if (contactsBtn && contactsModal) {
        contactsBtn.onclick = () => {
            loadContacts();
            contactsModal.classList.add('active');
        };
        if (closeContactsModal) {
            closeContactsModal.onclick = () => contactsModal.classList.remove('active');
        }
    }
    
    // Пригласить друзей
    const shareBtn = document.getElementById('shareBtn');
    if (shareBtn) {
        shareBtn.addEventListener('click', async () => {
            try {
                const userRes = await fetch('get_user.php');
                const userData = await userRes.json();
                
                if (!userData.username) {
                    alert('Ошибка: не удалось определить ваш логин');
                    return;
                }
                
                const username = userData.username;
                const refLink = `https://coffeesim.ru/?ref=${encodeURIComponent(username)}`;
                const text = '☕ CoffeeSim — реалистичный симулятор кофейного бизнеса. Всё как в жизни: автоматы, рецепты, цены, прибыль. Играй бесплатно!';
                
                let modal = document.getElementById('shareModal');
                if (!modal) {
                    const div = document.createElement('div');
                    div.id = 'shareModal';
                    div.className = 'modal';
                    div.innerHTML = `
                        <div class="modal-content" style="max-width: 500px;">
                            <div class="modal-header">📢 Пригласить друга</div>
                            <div class="modal-body" style="text-align: center;">
                                <p style="margin-bottom: 15px;">Отправь ссылку другу. Когда он зарегистрируется,<br>ты получишь <strong style="color: #e0a45e;">10% от его первых налогов</strong>!</p>
                                <div style="background: var(--stat-bg); padding: 12px; border-radius: 16px; margin-bottom: 15px; word-break: break-all;">
                                    <code id="refLinkCode" style="font-size: 0.8rem;">${refLink}</code>
                                </div>
                                <div style="display: flex; gap: 12px; justify-content: center; flex-wrap: wrap;">
                                    <button id="copyRefLinkBtn" class="btn-green" style="min-width: 110px;">📋 Скопировать ссылку</button>
                                    <button id="shareTelegramBtn" class="btn-blue" style="min-width: 110px;">✈️ Telegram</button>
                                    <button id="shareVKBtn" class="btn-blue" style="min-width: 110px;">📱 VK</button>
                                    <button id="shareWhatsAppBtn" class="btn-green" style="min-width: 110px;">💬 WhatsApp</button>
                                </div>
                                <div id="shareMessage" style="margin-top: 12px; font-size: 0.8rem; color: var(--accent);"></div>
                            </div>
                            <div style="margin-top: 15px; text-align: right;">
                                <button id="closeShareModal" class="btn-orange">Закрыть</button>
                            </div>
                        </div>
                    `;
                    document.body.appendChild(div);
                    div.addEventListener('click', (e) => { if (e.target === div) div.classList.remove('active'); });
                }
                
                const modalEl = document.getElementById('shareModal');
                const codeSpan = document.getElementById('refLinkCode');
                if (codeSpan) codeSpan.innerText = refLink;
                
                const copyBtn = document.getElementById('copyRefLinkBtn');
                if (copyBtn) {
                    const newCopy = copyBtn.cloneNode(true);
                    copyBtn.parentNode.replaceChild(newCopy, copyBtn);
                    newCopy.onclick = () => {
                        navigator.clipboard.writeText(refLink).then(() => {
                            const msg = document.getElementById('shareMessage');
                            if (msg) {
                                msg.innerText = '✅ Ссылка скопирована! Отправь другу.';
                                setTimeout(() => msg.innerText = '', 3000);
                            }
                        });
                    };
                }
                
                const tgBtn = document.getElementById('shareTelegramBtn');
                if (tgBtn) {
                    const newTg = tgBtn.cloneNode(true);
                    tgBtn.parentNode.replaceChild(newTg, tgBtn);
                    newTg.onclick = () => {
                        window.open(`https://t.me/share/url?url=${encodeURIComponent(refLink)}&text=${encodeURIComponent(text)}`, '_blank');
                    };
                }
                
                const vkBtn = document.getElementById('shareVKBtn');
                if (vkBtn) {
                    const newVk = vkBtn.cloneNode(true);
                    vkBtn.parentNode.replaceChild(newVk, vkBtn);
                    newVk.onclick = () => {
                        window.open(`https://vk.com/share.php?url=${encodeURIComponent(refLink)}&title=CoffeeSim&description=${encodeURIComponent(text)}`, '_blank');
                    };
                }
                
                const waBtn = document.getElementById('shareWhatsAppBtn');
                if (waBtn) {
                    const newWa = waBtn.cloneNode(true);
                    waBtn.parentNode.replaceChild(newWa, waBtn);
                    newWa.onclick = () => {
                        window.open(`https://wa.me/?text=${encodeURIComponent(text + ' ' + refLink)}`, '_blank');
                    };
                }
                
                const closeBtn = document.getElementById('closeShareModal');
                if (closeBtn) {
                    closeBtn.onclick = () => modalEl.classList.remove('active');
                }
                
                modalEl.classList.add('active');
                
            } catch (e) {
                console.error('Ошибка:', e);
                alert('Не удалось создать ссылку для приглашения');
            }
        });
    }
    
    document.querySelectorAll('.collapse-card-btn').forEach(btn => {
        const targetId = btn.getAttribute('data-target');
        const card = document.getElementById('card_' + targetId);
        const isCollapsed = localStorage.getItem('collapsed_card_' + targetId) === 'true';
        
        if (card) {
            if (isCollapsed) {
                card.style.display = 'none';
                btn.innerHTML = '📈 Развернуть';
            }
            
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (card.style.display === 'none') {
                    card.style.display = '';
                    btn.innerHTML = '📉 Свернуть';
                    localStorage.setItem('collapsed_card_' + targetId, 'false');
                } else {
                    card.style.display = 'none';
                    btn.innerHTML = '📈 Развернуть';
                    localStorage.setItem('collapsed_card_' + targetId, 'true');
                }
            });
        }
    });
    
    document.querySelectorAll('.card-header[data-card]').forEach(header => {
        const targetId = header.getAttribute('data-card');
        const card = document.getElementById('card_' + targetId);
        const btn = header.querySelector('.collapse-card-btn');
        
        if (card && btn) {
            header.addEventListener('click', (e) => {
                if (e.target.tagName !== 'BUTTON' && !e.target.closest('button')) {
                    if (card.style.display === 'none') {
                        card.style.display = '';
                        btn.innerHTML = '📉 Свернуть';
                        localStorage.setItem('collapsed_card_' + targetId, 'false');
                    } else {
                        card.style.display = 'none';
                        btn.innerHTML = '📈 Развернуть';
                        localStorage.setItem('collapsed_card_' + targetId, 'true');
                    }
                }
            });
        }
    });
    
    const helpBtn = document.getElementById('helpBtn');
    const helpModal = document.getElementById('helpModal');
    const closeHelpModal = document.getElementById('closeHelpModal');
    
    if (helpBtn && helpModal) {
        helpBtn.onclick = () => {
            helpModal.classList.add('active');
        };
        if (closeHelpModal) {
            closeHelpModal.onclick = () => helpModal.classList.remove('active');
        }
    }
    
    const loginNewsBtn = document.getElementById('loginNewsBtn');
    if (loginNewsBtn) {
        loginNewsBtn.addEventListener('click', async () => {
            const newsModal = document.getElementById('newsModal');
            const modalBody = document.getElementById('newsModalBody');
            
            if (!newsModal || !modalBody) return;
            
            if (modalBody.innerHTML === '' || modalBody.innerHTML.includes('Нет новостей')) {
                try {
                    const res = await fetch('get_news.php');
                    const data = await res.json();
                    if (data.news && data.news.length > 0) {
                        const savedTitle = localStorage.getItem('newsHeaderTitle') || 'История обновлений';
                        const savedDesc = localStorage.getItem('newsHeaderDesc') || '';
                        
                        const addNewsBtn = document.getElementById('addNewsFullBtn');
                        if (addNewsBtn) {
                            addNewsBtn.style.display = data.is_admin ? 'inline-flex' : 'none';
                            if (data.is_admin) {
                                addNewsBtn.onclick = () => openAddNewsModal();
                            }
                        }
                        
                        let html = `
                            <div style="margin-bottom:20px; border-bottom:2px solid var(--accent); padding-bottom:10px;">
                                <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
                                    <h2 id="newsModalTitle" style="margin:0; font-size:1.4rem;">${escapeHtml(savedTitle)}</h2>
                                </div>
                                ${savedDesc ? `<div id="newsModalDesc" style="opacity:0.7; margin-top:5px;">${escapeHtml(savedDesc)}</div>` : '<div id="newsModalDesc" style="display:none;"></div>'}
                            </div>
                            <div id="newsListContainer">
                        `;
                        
                        for (let i = 0; i < data.news.length; i++) {
                            const n = data.news[i];
                            html += `
                                <div style="border-left:4px solid var(--accent); padding-left:12px; margin-bottom:20px;">
                                    <div style="font-weight:bold; font-size:1.1rem;">${escapeHtml(n.version)}</div>
                                    <div style="font-size:0.75rem; opacity:0.7; margin:5px 0;">📅 ${escapeHtml(n.date)}</div>
                                    <div style="margin-top:8px; white-space:pre-line;">${escapeHtml(n.description).replace(/\n/g, '<br>')}</div>
                            `;
                            if (data.is_admin) {
                                html += `
                                    <div style="margin-top:12px; display:flex; gap:8px;">
                                        <button class="btn-sm btn-blue edit-news-full-btn" data-id="${n.id}" data-version="${escapeHtml(n.version)}" data-date="${escapeHtml(n.date)}" data-desc="${escapeHtml(n.description)}">📌 Редактировать</button>
                                        <button class="btn-sm btn-red delete-news-btn" data-id="${n.id}">🗑️ Удалить</button>
                                    </div>
                                `;
                            }
                            html += `</div>`;
                        }
                        
                        html += `</div>`;
                        modalBody.innerHTML = html;
                        
                        if (data.is_admin) {
                            document.querySelectorAll('.edit-news-full-btn').forEach(btn => {
                                btn.onclick = () => {
                                    openEditNewsModal({
                                        id: parseInt(btn.dataset.id),
                                        version: btn.dataset.version,
                                        date: btn.dataset.date,
                                        description: btn.dataset.desc
                                    });
                                };
                            });
                            document.querySelectorAll('.delete-news-btn').forEach(btn => {
                                btn.onclick = () => deleteNewsItem(parseInt(btn.dataset.id));
                            });
                        }
                    } else {
                        modalBody.innerHTML = '<div style="text-align:center; padding:20px;">Нет новостей</div>';
                    }
                } catch(e) {
                    console.warn('Ошибка загрузки новостей:', e);
                    modalBody.innerHTML = '<div style="text-align:center; padding:20px;">Ошибка загрузки новостей</div>';
                }
            }
            
            newsModal.classList.add('active');
        });
    }
    
    await checkSessionAndStart();
});

window.addEventListener('beforeunload', () => {
    if (gameInitialized && Game?.forceSave) Game.forceSave();
});

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m] || m));
}
