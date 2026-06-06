import { API } from './api.js';
import { UI } from './ui.js';
import { Charts } from './charts.js';

export const Game = {
    state: null,
    activeFilter: 'day',
    currentEditingDrink: null,
    saleInterval: null,
    autoSyncInterval: null,
    gameLoopInterval: null,
    loanCheckInterval: null,
    monthCheckInterval: null,
    deliveryCheckInterval: null,

    updateState(newState) {
        if (!newState) return;
        if (newState.error) {
            console.warn('API error:', newState.error);
            return;
        }
        this.state = newState;
        this.checkDeliveriesOnLoad();
        UI.renderAll(this.state);
        Charts.renderStatsAndChart(this.state);
        this.syncWithServer();
    },

    async checkDeliveriesOnLoad() {
        if (!this.state?.orders?.length) return;
        
        let changed = false;
        const now = new Date();
        
        for (let order of this.state.orders) {
            if (order.status === 'pending' && order.delivery_date) {
                const deliveryDate = new Date(order.delivery_date);
                if (deliveryDate <= now) {
                    order.status = 'delivered';
                    changed = true;
                    
                    for (let item of order.items) {
                        const ing = this.state.ingredients.find(i => i.id === item.ingredient_id);
                        if (ing) {
                            ing.stock += item.quantity;
                            if (!ing.batches) ing.batches = [];
                            ing.batches.push({ quantity: item.quantity, price: item.price });
                            
                            let totalCost = 0, totalQty = 0;
                            for (let batch of ing.batches) {
                                totalCost += batch.quantity * batch.price;
                                totalQty += batch.quantity;
                            }
                            ing.avgCost = totalQty > 0 ? totalCost / totalQty : item.price;
                        }
                    }
                    
                    let detailsText = '';
                    if (order.items_details && order.items_details.length > 0) {
                        detailsText = order.items_details.join('; ');
                    } else {
                        detailsText = order.items.map(item => `${item.name}: ${item.quantity} ${item.unit}`).join('; ');
                    }
                    
                    this.state.transactions.unshift({
                        timestamp: new Date().toISOString(),
                        amount: 0,
                        description: `✅ Доставлен заказ от ${order.supplier_name}: ${detailsText}`,
                        category: 'info'
                    });
                }
            }
        }
        
        if (changed) {
            if (this.state.transactions.length > 500) this.state.transactions.pop();
            if (this.state.transactionHistory.length > 5000) this.state.transactionHistory.pop();
            await this.forceSave();
            if (UI.showAutoMessage) UI.showAutoMessage('📦 Заказы доставлены! Товары добавлены на склад.', 'success');
            UI.renderIngredients(this.state);
            UI.renderLogs(this.state);
        }
    },

    async forceSave() {
        if (!this.state) return;
        try {
            await API.saveGameState(this.state);
            console.log('💾 Сохранено:', new Date().toLocaleTimeString());
            if (UI.showSavingIndicator) UI.showSavingIndicator();
        } catch(e) {
            console.warn('Ошибка сохранения:', e);
        }
    },

    startSales() {
        if (this.saleInterval) clearInterval(this.saleInterval);
        this.saleInterval = setInterval(() => {
            this.attemptSale();
        }, 60000);
    },

    attemptSale() {
        if (!this.state) return;
        if (this.state.drinks.length === 0 || this.state.machines.length === 0) return;
        
        let chance = 0.18 + (this.state.machines.length - 1) * 0.06;
        if (chance > 0.7) chance = 0.7;
        
        const hour = new Date().getHours();
        let timeFactor = 1.0;
        if (hour >= 7 && hour <= 10) timeFactor = 1.5;
        else if (hour >= 23 || hour <= 5) timeFactor = 0.3;
        else if (hour >= 17 && hour <= 20) timeFactor = 1.2;
        
        chance = chance * timeFactor;
        if (Math.random() > chance) return;
        
        const randomMachine = this.state.machines[Math.floor(Math.random() * this.state.machines.length)];
        const randomDrink = this.state.drinks[Math.floor(Math.random() * this.state.drinks.length)];
        
        let canMake = true;
        for (const [ingId, amount] of Object.entries(randomDrink.recipe)) {
            const ing = this.state.ingredients.find(i => i.id === ingId);
            if (!ing || ing.stock < amount) { canMake = false; break; }
        }
        const cups = this.state.ingredients.find(i => i.id === 'cups');
        if (!cups || cups.stock < 1) canMake = false;
        
        if (canMake) {
            let drinkCost = 0;
            for (const [ingId, amount] of Object.entries(randomDrink.recipe)) {
                const ing = this.state.ingredients.find(i => i.id === ingId);
                if (ing) {
                    const price = ing.avgCost || ing.currentBuyPrice;
                    drinkCost += amount * price;
                }
            }
            
            for (const [ingId, amount] of Object.entries(randomDrink.recipe)) {
                const ing = this.state.ingredients.find(i => i.id === ingId);
                ing.stock -= amount;
                this.updateBatches(ing, amount);
            }
            
            cups.stock -= 1;
            this.updateBatches(cups, 1);
            
            const stir = this.state.ingredients.find(i => i.id === 'stirSticks');
            const lids = this.state.ingredients.find(i => i.id === 'lids');
            const nap = this.state.ingredients.find(i => i.id === 'napkins');
            if (stir && Math.random() < 0.55 && stir.stock > 0) {
                stir.stock--;
                this.updateBatches(stir, 1);
            }
            if (lids && Math.random() < 0.45 && lids.stock > 0) {
                lids.stock--;
                this.updateBatches(lids, 1);
            }
            if (nap && Math.random() < 0.6 && nap.stock > 0) {
                nap.stock--;
                this.updateBatches(nap, 1);
            }
            
            const income = randomDrink.price;
            
            const machineConfig = this.getMachineConfig(randomMachine.name);
            const acquirerPercent = machineConfig?.acquirerPercent || randomMachine.acquirerPercent || 1.8;
            const isCashless = Math.random() < 0.99;
            let acquirerFee = 0;
            
            if (isCashless) {
                acquirerFee = income * (acquirerPercent / 100);
                this.state.totalAcquirerFees = (this.state.totalAcquirerFees || 0) + acquirerFee;
            }
            
            const taxPercent = this.state.taxPercent || 6;
            const tax = income * (taxPercent / 100);
            const afterTax = income - acquirerFee - tax;
            
            this.state.balance += afterTax;
            this.state.totalIncomeEver += income;
            this.state.totalCupsSold++;
            
            this.state.totalTaxThisMonth = (this.state.totalTaxThisMonth || 0) + tax;
            this.state.totalTaxPaid = (this.state.totalTaxPaid || 0) + tax;
            
            if (tax > 0) {
                (async () => {
                    try {
                        const res = await fetch('get_referrer.php');
                        const data = await res.json();
                        if (data.referrer_id && data.referrer_id > 0) {
                            const bonus = tax * 0.10;
                            await fetch('add_referral_bonus.php', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    referrer_id: data.referrer_id,
                                    bonus: bonus,
                                    tax_amount: tax
                                })
                            });
                        }
                    } catch(e) {
                        console.warn('Referral bonus error:', e);
                    }
                })();
            }
            
            randomMachine.totalSales = (randomMachine.totalSales || 0) + 1;
            randomMachine.totalIncome = (randomMachine.totalIncome || 0) + income;
            randomMachine.totalExpense = (randomMachine.totalExpense || 0) + drinkCost + acquirerFee + tax;
            
            const transaction = {
                timestamp: new Date().toISOString(),
                amount: income,
                acquirerFee: acquirerFee,
                description: `☕ Продажа: ${randomDrink.name}${acquirerFee > 0 ? ` (эквайринг: ${acquirerFee.toFixed(2)} ₽)` : ''} (налог: ${tax.toFixed(2)} ₽)`,
                category: 'income',
                cups: 1,
                tax: tax,
                subcategory: 'tax'
            };
            this.state.transactions.unshift(transaction);
            this.state.transactionHistory.unshift(transaction);
            if (this.state.transactions.length > 500) this.state.transactions.pop();
            if (this.state.transactionHistory.length > 5000) this.state.transactionHistory.pop();
            
            UI.updateFinanceUI(this.state);
            UI.renderIngredients(this.state);
            UI.renderDrinks(this.state);
            UI.renderMachines(this.state);
            UI.renderLogs(this.state);
            Charts.renderStatsAndChart(this.state);
            
            UI.checkAndShowDeficitModal(this.state);
            
            this.forceSave();
        }
    },
    
    getMachineConfig(machineName) {
        const realMachines = this.state.realMachines || [];
        return realMachines.find(m => m.name === machineName);
    },
    
    updateBatches(ing, amount) {
        if (!ing.batches || ing.batches.length === 0) return;
        let need = amount;
        const newBatches = [];
        for (let batch of ing.batches) {
            if (need <= 0) {
                newBatches.push(batch);
                continue;
            }
            if (batch.quantity <= need) {
                need -= batch.quantity;
            } else {
                batch.quantity -= need;
                newBatches.push(batch);
                need = 0;
            }
        }
        ing.batches = newBatches;
        let totalCost = 0, totalQty = 0;
        for (let batch of ing.batches) {
            totalCost += batch.quantity * batch.price;
            totalQty += batch.quantity;
        }
        ing.avgCost = totalQty > 0 ? totalCost / totalQty : ing.currentBuyPrice;
    },
    
    syncWithServer() {
        if (!this.state) return;
        API.saveGameState(this.state).catch(e => console.warn('Sync error:', e));
    },
    
    startAutoSync() {
        if (this.autoSyncInterval) clearInterval(this.autoSyncInterval);
        this.autoSyncInterval = setInterval(() => {
            this.syncWithServer();
        }, 30000);
    },
    
    startLoanCheck() {
        if (this.loanCheckInterval) clearInterval(this.loanCheckInterval);
        this.loanCheckInterval = setInterval(() => this.processLoanPayments(), 86400000);
    },
    
    processLoanPayments() {
        if (!this.state?.loans?.length) return;
        const now = new Date();
        let hasChanges = false;
        const newLoans = [];
        
        for (const loan of this.state.loans) {
            if (loan.remainingMonths <= 0) continue;
            
            const lastPaymentDate = loan.lastPaymentDate ? new Date(loan.lastPaymentDate) : new Date(loan.startDate);
            const monthsPassed = (now.getFullYear() - lastPaymentDate.getFullYear()) * 12 + (now.getMonth() - lastPaymentDate.getMonth());
            
            if (monthsPassed >= 1) {
                if (this.state.balance >= loan.monthlyPayment) {
                    this.state.balance -= loan.monthlyPayment;
                    loan.remainingMonths--;
                    loan.lastPaymentDate = now.toISOString();
                    this.state.transactions.unshift({
                        timestamp: now.toISOString(),
                        amount: loan.monthlyPayment,
                        description: `💸 Кредитный платёж (осталось ${loan.remainingMonths} мес.)`,
                        category: 'expense'
                    });
                    hasChanges = true;
                    if (loan.remainingMonths > 0) newLoans.push(loan);
                } else {
                    loan.lastPaymentDate = now.toISOString();
                    newLoans.push(loan);
                    this.state.transactions.unshift({
                        timestamp: now.toISOString(),
                        amount: 0,
                        description: `⚠️ Недостаточно средств для кредитного платежа. Платёж перенесён на следующий месяц.`,
                        category: 'info'
                    });
                    hasChanges = true;
                }
            } else {
                newLoans.push(loan);
            }
        }
        
        this.state.loans = newLoans;
        if (hasChanges) {
            UI.updateFinanceUI(this.state);
            UI.renderLogs(this.state);
            this.forceSave();
        }
    },
    
    calculateEndOfMonthExpenses() {
        const now = new Date();
        const lastMonth = this.state.lastMonthProcessed;
        
        if (lastMonth) {
            const lastDate = new Date(lastMonth);
            if (lastDate.getMonth() === now.getMonth() && 
                lastDate.getFullYear() === now.getFullYear()) {
                return;
            }
        }
        
        const month = now.getMonth();
        const isWinter = (month >= 9);
        
        const rates = this.state.electricityRates || {
            summer1: 6.43, winter1: 7.15,
            summer2: 9.18, winter2: 10.23,
            summer3: 11.05, winter3: 13.47
        };
        
        const rate1 = isWinter ? rates.winter1 : rates.summer1;
        const rate2 = isWinter ? rates.winter2 : rates.summer2;
        const rate3 = isWinter ? rates.winter3 : rates.summer3;
        
        let totalElectricity = 0;
        let totalRent = 0;
        let totalService = 0;
        let totalMaintenance = 0;
        let totalKwh = 0;
        
        for (let machine of this.state.machines) {
            const powerKwh = machine.powerKwh || 2.5;
            const monthlyKwh = powerKwh * 30;
            totalKwh += monthlyKwh;
            
            let electricityCost = 0;
            let remainingKwh = monthlyKwh;
            
            if (remainingKwh > 0) {
                const firstRange = Math.min(remainingKwh, 3900);
                electricityCost += firstRange * rate1;
                remainingKwh -= firstRange;
            }
            if (remainingKwh > 0) {
                const secondRange = Math.min(remainingKwh, 2100);
                electricityCost += secondRange * rate2;
                remainingKwh -= secondRange;
            }
            if (remainingKwh > 0) {
                electricityCost += remainingKwh * rate3;
            }
            
            totalElectricity += electricityCost;
            totalRent += machine.rent || 0;
            totalMaintenance += machine.maintenanceCost || 3000;
            totalService += (machine.serviceCost || 800) * 4;
        }
        
        const totalExpenses = totalElectricity + totalRent + totalService + totalMaintenance;
        
        if (totalExpenses > 0) {
            this.state.balance -= totalExpenses;
            this.state.totalExpenseEver += totalExpenses;
            
            const seasonText = isWinter ? '(зимний тариф)' : '(летний тариф)';
            const transactions = [];
            
            if (totalElectricity > 0) {
                transactions.push({
                    timestamp: new Date().toISOString(),
                    amount: totalElectricity,
                    description: `⚡ Электроэнергия за месяц ${seasonText}: ${totalKwh.toFixed(0)} кВт·ч`,
                    category: 'expense',
                    subcategory: 'electricity'
                });
            }
            
            if (totalRent > 0) {
                transactions.push({
                    timestamp: new Date().toISOString(),
                    amount: totalRent,
                    description: `🏢 Аренда автоматов за месяц`,
                    category: 'expense',
                    subcategory: 'rent'
                });
            }
            
            if (totalService > 0) {
                transactions.push({
                    timestamp: new Date().toISOString(),
                    amount: totalService,
                    description: `🧼 Промывка и очистка (4 раза)`,
                    category: 'expense',
                    subcategory: 'service'
                });
            }
            
            if (totalMaintenance > 0) {
                transactions.push({
                    timestamp: new Date().toISOString(),
                    amount: totalMaintenance,
                    description: `🔧 Плановое ТО автоматов`,
                    category: 'expense',
                    subcategory: 'maintenance'
                });
            }
            
            for (let i = transactions.length - 1; i >= 0; i--) {
                this.state.transactions.unshift(transactions[i]);
                this.state.transactionHistory.unshift(transactions[i]);
            }
            
            if (this.state.transactions.length > 500) this.state.transactions.pop();
            if (this.state.transactionHistory.length > 5000) this.state.transactionHistory.pop();
            
            UI.showAutoMessage(`📅 Списаны расходы за месяц: ${this.formatMoney(totalExpenses)} ₽ (аренда, электричество, ТО, промывка)`, 'info');
        }
        
        if (this.state.totalTaxThisMonth > 0) {
            this.state.transactions.unshift({
                timestamp: new Date().toISOString(),
                amount: 0,
                description: `📅 Налоговый период завершён. Налог за месяц составил: ${this.formatMoney(this.state.totalTaxThisMonth)} ₽`,
                category: 'info'
            });
            this.state.totalTaxThisMonth = 0;
        }
        
        this.state.lastMonthProcessed = now.toISOString();
        this.forceSave();
        UI.renderLogs(this.state);
        UI.updateFinanceUI(this.state);
    },

    startMonthCheck() {
        if (this.monthCheckInterval) clearInterval(this.monthCheckInterval);
        let lastMonth = new Date().getMonth();
        this.monthCheckInterval = setInterval(() => {
            const now = new Date();
            if (now.getMonth() !== lastMonth) {
                this.calculateEndOfMonthExpenses();
                lastMonth = now.getMonth();
                this.syncWithServer();
            }
        }, 3600000);
    },
    
    async purchaseIngredient(ingId, qty) {
        try {
            const ing = this.state.ingredients.find(i => i.id === ingId);
            if (!ing) return;
            const cost = ing.currentBuyPrice * qty;
            if (this.state.balance >= cost) {
                this.state.balance -= cost;
                this.state.totalExpenseEver += cost;
                ing.stock += qty;
                if (!ing.batches) ing.batches = [];
                ing.batches.push({ quantity: qty, price: ing.currentBuyPrice });
                let totalCost = 0, totalQty = 0;
                for (let batch of ing.batches) {
                    totalCost += batch.quantity * batch.price;
                    totalQty += batch.quantity;
                }
                ing.avgCost = totalQty > 0 ? totalCost / totalQty : ing.currentBuyPrice;
                
                const transaction = {
                    timestamp: new Date().toISOString(),
                    amount: cost,
                    description: 'Закупка ' + ing.name + ' x' + qty + ' ' + ing.unit,
                    category: 'expense'
                };
                this.state.transactions.unshift(transaction);
                this.state.transactionHistory.unshift(transaction);
                if (this.state.transactions.length > 500) this.state.transactions.pop();
                if (this.state.transactionHistory.length > 5000) this.state.transactionHistory.pop();
                
                UI.renderIngredients(this.state);
                UI.updateFinanceUI(this.state);
                UI.renderLogs(this.state);
                Charts.renderStatsAndChart(this.state);
                await this.forceSave();
                
                UI.showAutoMessage(`✅ Закуплено ${ing.name} x${qty} ${ing.unit}`, 'success');
                
                UI.checkAndShowDeficitModal(this.state);
            } else {
                UI.showAutoMessage('❌ Недостаточно средств!', 'error');
            }
        } catch(e) {
            console.error(e);
            UI.showAutoMessage('❌ Ошибка: ' + e.message, 'error');
        }
    },
    
    async createOrder(supplierId, items, deliveryCost, totalCost) {
        try {
            const res = await fetch('order_supplier.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    supplier_id: supplierId,
                    items: items,
                    delivery_cost: deliveryCost,
                    total_cost: totalCost
                })
            });
            const data = await res.json();
            if (data.success) {
                UI.showAutoMessage(data.message, 'success');
                const gameData = await API.loadGame();
                this.updateState(gameData);
                return true;
            } else {
                UI.showAutoMessage(data.error || 'Ошибка заказа', 'error');
                return false;
            }
        } catch(e) {
            console.error('Order error:', e);
            UI.showAutoMessage('Ошибка оформления заказа', 'error');
            return false;
        }
    },
    
    async checkDeliveries() {
        try {
            const res = await fetch('check_deliveries.php');
            const data = await res.json();
            if (data.success && data.changed) {
                const gameData = await API.loadGame();
                this.updateState(gameData);
                UI.showAutoMessage('📦 Заказ доставлен! Товары добавлены на склад.', 'success');
            }
        } catch(e) {
            console.warn('Ошибка проверки доставки:', e);
        }
    },
    
    getSuppliers() {
        return this.state?.suppliers || [];
    },
    
    getActiveOrders() {
        return this.state?.orders?.filter(o => o.status !== 'delivered') || [];
    },
    
    async checkIsAdmin() {
        try {
            const res = await fetch('get_user.php');
            const data = await res.json();
            return data.is_admin === true;
        } catch(e) {
            return false;
        }
    },
    
    async setIngredientPrice(ingId, newPrice) {
        const isAdmin = await this.checkIsAdmin();
        if (!isAdmin) {
            UI.showAutoMessage('❌ Изменение цен поставщиков доступно только администратору!', 'error');
            return;
        }
        if (newPrice < 0.01 || newPrice > 10000) {
            UI.showAutoMessage('❌ Некорректная цена ингредиента', 'error');
            return;
        }
        const ing = this.state.ingredients.find(i => i.id === ingId);
        if (ing) {
            ing.currentBuyPrice = newPrice;
            UI.renderIngredients(this.state);
            await this.forceSave();
            UI.showAutoMessage(`✅ Цена закупки "${ing.name}" изменена на ${this.formatMoney(newPrice)} ₽/${ing.unit}`, 'success');
        }
    },
    
    async addIngredient(name, cost, unit, type) {
        const isAdmin = await this.checkIsAdmin();
        if (!isAdmin) {
            UI.showAutoMessage('❌ Добавление ингредиентов доступно только администратору!', 'error');
            return;
        }
        const newId = 'ing' + (this.state.nextIngId++);
        this.state.ingredients.push({
            id: newId,
            name: name,
            currentBuyPrice: cost,
            unit: unit,
            stock: 0,
            type: type,
            alertThreshold: (type === 'ingredient' ? 1 : 20),
            batches: [],
            avgCost: cost
        });
        UI.renderIngredients(this.state);
        await this.forceSave();
        UI.showAutoMessage(`✅ Ингредиент "${name}" добавлен`, 'success');
    },
    
    async deleteIngredient(ingId) {
        const isAdmin = await this.checkIsAdmin();
        if (!isAdmin) {
            UI.showAutoMessage('❌ Удаление ингредиентов доступно только администратору!', 'error');
            return;
        }
        const used = this.state.drinks.some(d => d.recipe[ingId]);
        if (used) {
            UI.showAutoMessage('❌ Ингредиент используется в напитках!', 'error');
            return;
        }
        if (!confirm('Удалить ингредиент?')) return;
        this.state.ingredients = this.state.ingredients.filter(i => i.id !== ingId);
        UI.renderIngredients(this.state);
        await this.forceSave();
        UI.showAutoMessage(`✅ Ингредиент удалён`, 'success');
    },
    
    openCreateDrinkModal() {
        const modal = document.getElementById('createDrinkModal');
        if (!modal) {
            console.error('Модальное окно createDrinkModal не найдено!');
            UI.showAutoMessage('❌ Ошибка: модальное окно не найдено', 'error');
            return;
        }
        
        const container = document.getElementById('ingredientsForDrink');
        if (!container) {
            console.error('Контейнер ingredientsForDrink не найден');
            return;
        }
        
        const ingredients = this.state.ingredients.filter(i => i.type === 'ingredient');
        
        let html = '';
        for (let ing of ingredients) {
            html += `
                <div style="display: flex; align-items: center; gap: 10px; padding: 8px; border-bottom: 1px solid var(--border);">
                    <span style="flex: 2;">${this.escapeHtml(ing.name)} (${ing.unit})</span>
                    <input type="number" id="ing_${ing.id}" class="drink-ing-qty" data-id="${ing.id}" data-unit="${ing.unit}" data-price="${ing.avgCost || ing.currentBuyPrice}" value="0" step="0.001" style="width: 80px; padding: 5px; border-radius: 40px;">
                    <span style="width: 40px;">${ing.unit}</span>
                </div>
            `;
        }
        container.innerHTML = html;
        
        const inputs = document.querySelectorAll('.drink-ing-qty');
        for (let input of inputs) {
            input.oninput = () => this.updateDrinkPreview();
        }
        
        const nameInput = document.getElementById('newDrinkName');
        const priceInput = document.getElementById('newDrinkPrice');
        if (nameInput) nameInput.value = '';
        if (priceInput) priceInput.value = '';
        
        this.updateDrinkPreview();
        
        const confirmBtn = document.getElementById('confirmCreateDrinkBtn');
        if (confirmBtn) {
            const newConfirmBtn = confirmBtn.cloneNode(true);
            confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
            
            newConfirmBtn.onclick = async () => {
                const nameElem = document.getElementById('newDrinkName');
                const name = nameElem ? nameElem.value.trim() : '';
                if (!name) {
                    UI.showAutoMessage('❌ Введите название напитка', 'error');
                    return;
                }
                
                const recipe = {};
                for (let ing of ingredients) {
                    const qtyInput = document.getElementById(`ing_${ing.id}`);
                    const qty = parseFloat(qtyInput ? qtyInput.value : 0);
                    if (qty > 0) {
                        recipe[ing.id] = qty;
                    }
                }
                
                if (Object.keys(recipe).length === 0) {
                    UI.showAutoMessage('❌ Добавьте хотя бы один ингредиент', 'error');
                    return;
                }
                
                const cost = this.calculateDrinkCostFromRecipe(recipe);
                let priceElem = document.getElementById('newDrinkPrice');
                let price = parseFloat(priceElem ? priceElem.value : 0);
                
                const minPrice = cost;
                const maxPrice = cost * 3;
                
                if (isNaN(price) || price < minPrice) {
                    price = cost * 2;
                }
                if (price > maxPrice) {
                    price = maxPrice;
                }
                
                await this.createDrinkWithRecipe(name, price, recipe);
                modal.classList.remove('active');
            };
        }
        
        const cancelBtn = document.getElementById('cancelCreateDrinkModalBtn');
        if (cancelBtn) {
            const newCancelBtn = cancelBtn.cloneNode(true);
            cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);
            
            newCancelBtn.onclick = () => {
                modal.classList.remove('active');
            };
        }
        
        modal.classList.add('active');
    },

    updateDrinkPreview() {
        const ingredients = this.state.ingredients.filter(i => i.type === 'ingredient');
        const recipe = {};
        
        for (let ing of ingredients) {
            const qtyInput = document.getElementById(`ing_${ing.id}`);
            if (qtyInput) {
                const qty = parseFloat(qtyInput.value);
                if (qty > 0) {
                    recipe[ing.id] = qty;
                }
            }
        }
        
        const cost = this.calculateDrinkCostFromRecipe(recipe);
        const recommended = cost * 2;
        const minPrice = cost;
        const maxPrice = cost * 3;
        
        const costElem = document.getElementById('previewCost');
        const recommendedElem = document.getElementById('previewRecommended');
        const minElem = document.getElementById('previewMin');
        const maxElem = document.getElementById('previewMax');
        
        if (costElem) costElem.innerText = this.formatMoney(cost);
        if (recommendedElem) recommendedElem.innerText = this.formatMoney(recommended);
        if (minElem) minElem.innerText = this.formatMoney(minPrice);
        if (maxElem) maxElem.innerText = this.formatMoney(maxPrice);
        
        const priceInput = document.getElementById('newDrinkPrice');
        if (priceInput && (!priceInput.value || parseFloat(priceInput.value) < minPrice)) {
            priceInput.value = recommended;
        }
    },

    calculateDrinkCostFromRecipe(recipe) {
        let cost = 0;
        for (const [ingId, amount] of Object.entries(recipe)) {
            const ing = this.state.ingredients.find(i => i.id === ingId);
            if (ing) {
                cost += amount * (ing.avgCost || ing.currentBuyPrice);
            }
        }
        return cost;
    },

    async createDrinkWithRecipe(name, price, recipe) {
        const newId = 'drink' + (this.state.nextDrinkId++);
        
        const newDrink = {
            id: newId,
            name: name,
            price: price,
            recipe: recipe
        };
        
        this.state.drinks.push(newDrink);
        UI.renderDrinks(this.state);
        await this.forceSave();
        UI.showAutoMessage(`✅ Напиток "${name}" создан! Цена: ${this.formatMoney(price)} ₽`, 'success');
    },
    
    async addDrink(name, price) {
        const isAdmin = await this.checkIsAdmin();
        if (!isAdmin) {
            UI.showAutoMessage('❌ Добавление напитков доступно только администратору!', 'error');
            return;
        }
        const newId = 'drink' + (this.state.nextDrinkId++);
        
        const newDrink = {
            id: newId,
            name: name,
            price: 0,
            recipe: {}
        };
        this.state.drinks.push(newDrink);
        
        const cost = this.getDrinkCost(this.state, newDrink);
        newDrink.price = cost * 2;
        
        UI.renderDrinks(this.state);
        await this.forceSave();
        UI.showAutoMessage(`✅ Напиток "${name}" добавлен с ценой ${this.formatMoney(newDrink.price)} ₽`, 'success');
    },
    
    async deleteDrink(drinkId) {
        if (!confirm('Удалить напиток?')) return;
        this.state.drinks = this.state.drinks.filter(d => d.id !== drinkId);
        UI.renderDrinks(this.state);
        await this.forceSave();
        UI.showAutoMessage(`✅ Напиток удалён`, 'success');
    },
    
    async updateDrinkPrice(drinkId, newPrice) {
        if (newPrice < 5 || newPrice > 500) {
            UI.showAutoMessage('❌ Цена напитка должна быть от 5 до 500 ₽', 'error');
            return;
        }
        
        const drink = this.state.drinks.find(d => d.id === drinkId);
        if (drink) {
            const cost = this.getDrinkCost(this.state, drink);
            const minPrice = cost;
            const maxPrice = cost * 3;
            
            if (newPrice < minPrice) {
                UI.showAutoMessage(`❌ Цена не может быть ниже себестоимости (${this.formatMoney(minPrice)} ₽)`, 'error');
                return;
            }
            if (newPrice > maxPrice) {
                UI.showAutoMessage(`❌ Цена не может быть выше себестоимости более чем в 3 раза (макс. ${this.formatMoney(maxPrice)} ₽)`, 'error');
                return;
            }
            
            drink.price = newPrice;
            UI.renderDrinks(this.state);
            await this.forceSave();
            UI.showAutoMessage(`✅ Цена напитка "${drink.name}" изменена на ${this.formatMoney(newPrice)} ₽ (себестоимость ${this.formatMoney(cost)} ₽)`, 'success');
        }
    },
    
    async updateDrinkRecipe(drinkId, recipe) {
        const drink = this.state.drinks.find(d => d.id === drinkId);
        if (drink) {
            drink.recipe = recipe;
            const cost = this.getDrinkCost(this.state, drink);
            const newPrice = cost * 2;
            drink.price = newPrice;
            
            UI.renderDrinks(this.state);
            await this.forceSave();
            UI.showAutoMessage(`✅ Рецепт напитка "${drink.name}" обновлён. Новая цена: ${this.formatMoney(newPrice)} ₽ (себестоимость ${this.formatMoney(cost)} ₽)`, 'success');
        }
    },
    
    async setIngredientThreshold(ingId, threshold) {
        const ing = this.state.ingredients.find(i => i.id === ingId);
        if (ing) {
            ing.alertThreshold = threshold;
            UI.updateLowStockHighlight(this.state);
            await this.forceSave();
            UI.showAutoMessage(`✅ Порог для "${ing.name}" установлен на ${threshold} ${ing.unit}`, 'success');
        }
    },
    
    async buyAllToThreshold() {
        if (!this.state) return;
        
        const suppliers = this.state.suppliers || [];
        if (suppliers.length === 0) {
            UI.showAutoMessage('❌ Нет поставщиков', 'error');
            return;
        }
        
        let purchases = [];
        let totalCost = 0;
        let totalItems = 0;
        
        for (let ing of this.state.ingredients) {
            let bestSupplier = null;
            let bestItem = null;
            let bestPrice = Infinity;
            
            for (let sup of suppliers) {
                const item = sup.items.find(i => i.ingredient_id === ing.id);
                if (item && item.price < bestPrice) {
                    bestPrice = item.price;
                    bestSupplier = sup;
                    bestItem = item;
                }
            }
            
            if (!bestItem) {
                console.warn(`Нет поставщика для ${ing.name}`);
                continue;
            }
            
            const packSize = bestItem.pack_size || 1;
            const minPacks = bestItem.min_quantity;
            const pricePerUnit = bestItem.price;
            
            const packs = minPacks;
            const quantity = packs * packSize;
            const cost = quantity * pricePerUnit;
            
            purchases.push({
                id: ing.id,
                name: ing.name,
                packs: packs,
                pack_size: packSize,
                quantity: quantity,
                price: pricePerUnit,
                unit: ing.unit,
                supplier_id: bestSupplier.id,
                supplier_name: bestSupplier.name,
                totalPrice: cost
            });
            
            totalCost += cost;
            totalItems += packs;
        }
        
        if (purchases.length === 0) {
            UI.showAutoMessage('✅ Нет ингредиентов для закупки', 'success');
            const deficitModal = document.getElementById('deficitModal');
            if (deficitModal) deficitModal.classList.remove('active');
            return;
        }
        
        if (this.state.balance < totalCost) {
            UI.showAutoMessage(`❌ Недостаточно средств! Нужно ${this.formatMoney(totalCost)} ₽`, 'error');
            return;
        }
        
        const msg = purchases.map(p => `${p.name}: ${p.quantity} ${p.unit} (${this.formatMoney(p.totalPrice)} ₽)`).join('\n');
        if (!confirm(`Закупить у поставщиков:\n${msg}\n\nИтого: ${this.formatMoney(totalCost)} ₽`)) return;
        
        this.state.balance -= totalCost;
        this.state.totalExpenseEver += totalCost;
        
        for (let p of purchases) {
            const ing = this.state.ingredients.find(i => i.id === p.id);
            if (ing) {
                ing.stock += p.quantity;
                if (!ing.batches) ing.batches = [];
                ing.batches.push({ quantity: p.quantity, price: p.price });
                
                let totalCostBatch = 0, totalQty = 0;
                for (let batch of ing.batches) {
                    totalCostBatch += batch.quantity * batch.price;
                    totalQty += batch.quantity;
                }
                ing.avgCost = totalQty > 0 ? totalCostBatch / totalQty : p.price;
            }
        }
        
        let details = purchases.map(p => `${p.name}: ${p.quantity} ${p.unit} (${Game.formatMoney(p.totalPrice)} ₽)`).join('; ');
        
        const transaction = {
            timestamp: new Date().toISOString(),
            amount: totalCost,
            description: `📦 Автозакупка: ${details}`,
            category: 'expense',
            subcategory: 'auto_purchase'
        };
        
        this.state.transactions.unshift(transaction);
        this.state.transactionHistory.unshift(transaction);
        
        if (this.state.transactions.length > 500) this.state.transactions.pop();
        if (this.state.transactionHistory.length > 5000) this.state.transactionHistory.pop();
        
        UI.renderIngredients(this.state);
        UI.updateFinanceUI(this.state);
        UI.renderLogs(this.state);
        Charts.renderStatsAndChart(this.state);
        
        await this.forceSave();
        
        UI.showAutoMessage(`✅ Закупка завершена! Потрачено ${this.formatMoney(totalCost)} ₽`, 'success');
        
        const deficitModal = document.getElementById('deficitModal');
        if (deficitModal) deficitModal.classList.remove('active');
        
        setTimeout(() => {
            UI.checkAndShowDeficitModal(this.state);
        }, 500);
    },
    
    buyMachine() {
        this.showRealMachineSelection();
    },
    
    showRealMachineSelection() {
        let modal = document.getElementById('realMachineModal');
        if (!modal) {
            const div = document.createElement('div');
            div.id = 'realMachineModal';
            div.className = 'modal';
            div.innerHTML = `
                <div class="modal-content" style="max-width: 600px;">
                    <div class="modal-header">🤖 Выберите кофейный автомат</div>
                    <div class="modal-body" id="realMachineList"></div>
                    <div style="margin-top:15px; text-align:right;">
                        <button id="closeRealMachineModal" class="btn-orange">Закрыть</button>
                    </div>
                </div>
            `;
            document.body.appendChild(div);
            modal = div;
        }
        
        const container = document.getElementById('realMachineList');
        const realMachines = this.state.realMachines || [];
        
        let html = '<div style="display:flex; flex-direction:column; gap:12px;">';
        for (let i = 0; i < realMachines.length; i++) {
            const m = realMachines[i];
            html += `
                <div style="border:1px solid var(--border); border-radius:16px; padding:12px; cursor:pointer; background:var(--stat-bg);" class="machine-select-item" data-name="${this.escapeHtml(m.name)}" data-price="${m.price}" data-rent="${m.rent}" data-acquirer="${m.acquirerPercent}" data-maintenance="${m.maintenanceCost}" data-service="${m.serviceCost}" data-power="${m.powerKwh}">
                    <div style="font-weight:bold; font-size:1rem;">🤖 ${this.escapeHtml(m.name)}</div>
                    <div style="font-size:0.7rem; opacity:0.8;">${this.escapeHtml(m.description)}</div>
                    <div style="margin-top:8px; display:flex; justify-content:space-between; flex-wrap:wrap; gap:8px;">
                        <span>💰 ${this.formatMoney(m.price)} ₽</span>
                        <span>🏷️ Аренда: ${this.formatMoney(m.rent)} ₽/мес</span>
                        <span>💳 Эквайринг: ${m.acquirerPercent}%</span>
                    </div>
                    <div style="margin-top:4px; display:flex; justify-content:space-between; flex-wrap:wrap; gap:8px; font-size:0.7rem;">
                        <span>🔧 ТО: ${this.formatMoney(m.maintenanceCost)} ₽/мес</span>
                        <span>🧼 Промывка: ${this.formatMoney(m.serviceCost)} ₽/нед</span>
                        <span>⚡ ${m.powerKwh} кВт·ч/день</span>
                    </div>
                </div>
            `;
        }
        html += '</div>';
        container.innerHTML = html;
        modal.classList.add('active');
        
        document.querySelectorAll('.machine-select-item').forEach(el => {
            el.onclick = () => {
                const name = el.dataset.name;
                const price = parseFloat(el.dataset.price);
                const rent = parseFloat(el.dataset.rent);
                const acquirerPercent = parseFloat(el.dataset.acquirer);
                const maintenanceCost = parseFloat(el.dataset.maintenance);
                const serviceCost = parseFloat(el.dataset.service);
                const powerKwh = parseFloat(el.dataset.power);
                modal.classList.remove('active');
                this.processMachinePurchase(name, price, rent, acquirerPercent, maintenanceCost, serviceCost, powerKwh);
            };
        });
        
        const closeBtn = document.getElementById('closeRealMachineModal');
        if (closeBtn) {
            closeBtn.onclick = () => {
                modal.classList.remove('active');
            };
        }
    },
    
    async processMachinePurchase(name, price, rent, acquirerPercent, maintenanceCost, serviceCost, powerKwh) {
        if (this.state.balance >= price) {
            this.state.balance -= price;
            this.state.totalExpenseEver += price;
            
            const transaction = {
                timestamp: new Date().toISOString(),
                amount: price,
                description: '🛒 Покупка автомата «' + name + '» (аренда ' + this.formatMoney(rent) + ' ₽/мес)',
                category: 'expense'
            };
            this.state.transactions.unshift(transaction);
            this.state.transactionHistory.unshift(transaction);
        } else {
            if (this.state.loans && this.state.loans.length > 0) {
                UI.showAutoMessage('❌ У вас уже есть активный кредит! Погасите его перед покупкой нового автомата.', 'error');
                return;
            }
            
            const monthsChoice = prompt(
                'Недостаточно средств. Оформить кредит?\n' +
                '6 - 6 месяцев (25% годовых)\n' +
                '12 - 12 месяцев (22% годовых)\n' +
                '24 - 24 месяца (18% годовых)\n\n' +
                'Введите 6, 12 или 24:', '24'
            );
            if (!monthsChoice) return;
            
            let creditMonths = parseInt(monthsChoice);
            if (creditMonths !== 6 && creditMonths !== 12 && creditMonths !== 24) {
                UI.showAutoMessage('❌ Выберите 6, 12 или 24 месяца', 'error');
                return;
            }
            
            let annualRate = 0.25;
            if (creditMonths === 12) annualRate = 0.22;
            if (creditMonths === 24) annualRate = 0.18;
            
            const monthlyRate = annualRate / 12;
            const monthlyPayment = price * (monthlyRate * Math.pow(1 + monthlyRate, creditMonths)) / (Math.pow(1 + monthlyRate, creditMonths) - 1);
            
            if (!this.state.loans) this.state.loans = [];
            this.state.loans.push({
                machineId: this.state.machineCounter || 1,
                totalOwed: price,
                monthlyPayment: monthlyPayment,
                remainingMonths: creditMonths,
                startDate: new Date().toISOString(),
                lastPaymentDate: new Date().toISOString(),
                interestRate: annualRate
            });
            
            const transaction = {
                timestamp: new Date().toISOString(),
                amount: 0,
                description: '💰 Кредит на автомат «' + name + '»: ' + this.formatMoney(price) + ' ₽, ' + creditMonths + ' мес., ставка ' + (annualRate * 100) + '% годовых, ежемес. платёж ' + this.formatMoney(monthlyPayment) + ' ₽',
                category: 'info'
            };
            this.state.transactions.unshift(transaction);
            this.state.transactionHistory.unshift(transaction);
        }
        
        if (!this.state.machines) this.state.machines = [];
        if (this.state.machineCounter === undefined) this.state.machineCounter = 1;
        
        this.state.machines.push({
            id: this.state.machineCounter++,
            name: name,
            buyPrice: price,
            rent: rent,
            acquirerPercent: acquirerPercent,
            maintenanceCost: maintenanceCost,
            serviceCost: serviceCost,
            powerKwh: powerKwh,
            totalSales: 0,
            totalIncome: 0,
            totalExpense: 0
        });
        
        if (this.state.transactions.length > 500) this.state.transactions = this.state.transactions.slice(0, 500);
        if (this.state.transactionHistory.length > 5000) this.state.transactionHistory = this.state.transactionHistory.slice(0, 5000);
        
        UI.renderMachines(this.state);
        UI.updateFinanceUI(this.state);
        UI.renderLogs(this.state);
        Charts.renderStatsAndChart(this.state);
        await this.forceSave();
        
        UI.showAutoMessage(`✅ Автомат «${name}» успешно добавлен!`, 'success');
    },
    
    async updateMachineMaintenance(machineId, value) {
        const machine = this.state.machines.find(m => m.id === machineId);
        if (machine && !isNaN(value) && value >= 0) {
            machine.maintenance = parseFloat(value);
            UI.renderMachines(this.state);
            await this.forceSave();
            return machine.maintenance;
        }
        return null;
    },
    
    async updateMachineAmortization(machineId, percent) {
        const machine = this.state.machines.find(m => m.id === machineId);
        if (machine && !isNaN(percent) && percent >= 0 && percent <= 100) {
            machine.amortization = parseFloat(percent);
            UI.renderMachines(this.state);
            await this.forceSave();
            return machine.amortization;
        }
        return null;
    },
    
    async renameMachine(machineId, newName) {
        const m = this.state.machines.find(m => m.id === machineId);
        if (m && newName.trim()) {
            m.name = newName.trim();
            UI.renderMachines(this.state);
            await this.forceSave();
            UI.showAutoMessage(`✅ Автомат переименован в «${m.name}»`, 'success');
        }
    },
    
    async changeMachineRent(machineId, newRent) {
        const m = this.state.machines.find(m => m.id === machineId);
        if (m && !isNaN(newRent) && newRent >= 0) {
            m.rent = newRent;
            UI.renderMachines(this.state);
            UI.updateUpcomingExpenses(this.state);
            await this.forceSave();
            UI.showAutoMessage(`✅ Аренда изменена на ${this.formatMoney(newRent)} ₽/мес`, 'success');
        }
    },
    
    async cancelOrder(orderId) {
        if (!this.state?.orders) return false;
        
        const orderIndex = this.state.orders.findIndex(o => o.id == orderId);
        if (orderIndex === -1) return false;
        
        const order = this.state.orders[orderIndex];
        if (order.status === 'delivered') return false;
        
        const refundAmount = order.total_cost;
        this.state.balance += refundAmount;
        
        // Удаляем расходную транзакцию
        const originalTransactionIndex = this.state.transactions.findIndex(t => 
            t.description && t.description.includes('Заказ у поставщика') && 
            t.description.includes(order.supplier_name) &&
            t.amount === order.total_cost &&
            t.category === 'expense'
        );
        
        if (originalTransactionIndex !== -1) {
            this.state.transactions.splice(originalTransactionIndex, 1);
            
            const historyIndex = this.state.transactionHistory.findIndex(t => 
                t.description && t.description.includes('Заказ у поставщика') && 
                t.description.includes(order.supplier_name) &&
                t.amount === order.total_cost &&
                t.category === 'expense'
            );
            if (historyIndex !== -1) {
                this.state.transactionHistory.splice(historyIndex, 1);
            }
            
            this.state.totalExpenseEver -= order.total_cost;
        }
        
        // Запись об отмене
        this.state.transactions.unshift({
            timestamp: new Date().toISOString(),
            amount: refundAmount,
            description: `🔄 Отмена заказа у ${order.supplier_name} (возврат ${this.formatMoney(refundAmount)} ₽)`,
            category: 'income',
            subcategory: 'refund'
        });
        
        this.state.transactionHistory.unshift({
            timestamp: new Date().toISOString(),
            amount: refundAmount,
            description: `🔄 Отмена заказа у ${order.supplier_name} (возврат ${this.formatMoney(refundAmount)} ₽)`,
            category: 'income',
            subcategory: 'refund'
        });
        
        this.state.orders.splice(orderIndex, 1);
        
        if (this.state.transactions.length > 500) this.state.transactions.pop();
        if (this.state.transactionHistory.length > 5000) this.state.transactionHistory.pop();
        
        await this.forceSave();
        UI.renderOrders(this.state);
        UI.updateFinanceUI(this.state);
        UI.renderLogs(this.state);
        
        return true;
    },
    
    async updateTax(percent) {
        if (!isNaN(percent) && percent >= 0 && percent <= 100) {
            this.state.taxPercent = percent;
            await this.forceSave();
            UI.showAutoMessage(`✅ Ставка налога изменена на ${percent}%`, 'success');
        }
    },
    
    async clearLogs() {
        if (!confirm('Очистить историю операций?')) return;
        this.state.transactions = [];
        UI.renderLogs(this.state);
        await this.forceSave();
        UI.showAutoMessage('✅ Журнал очищен', 'success');
    },
    
    formatMoney(num) {
        if (num === undefined || num === null) return '0.00';
        let number = parseFloat(num);
        if (isNaN(number)) return '0.00';
        let parts = number.toFixed(2).split('.');
        parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
        return parts.join('.');
    },
    
    formatIngredient(num) {
        if (num === undefined || num === null) return '0.000';
        let parts = num.toFixed(3).split('.');
        parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
        return parts.join('.');
    },
    
    formatConsumable(num) {
        if (num === undefined || num === null) return '0';
        return Math.floor(num).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    },
    
    getFilteredData(state, filter) {
        const now = new Date();
        let start = new Date(now);
        if (filter === 'day') {
            start.setHours(0, 0, 0, 0);
        } else if (filter === 'week') {
            const day = now.getDay();
            const diff = (day === 0 ? 6 : day - 1);
            start.setDate(now.getDate() - diff);
            start.setHours(0, 0, 0, 0);
        } else if (filter === 'month') {
            start = new Date(now.getFullYear(), now.getMonth(), 1);
        } else if (filter === 'year') {
            start = new Date(now.getFullYear(), 0, 1);
        }
        const filtered = (state.transactionHistory || []).filter(t => new Date(t.timestamp) >= start);
        const income = filtered.filter(t => t.category === 'income').reduce((a, b) => a + b.amount, 0);
        const expense = filtered.filter(t => t.category === 'expense').reduce((a, b) => a + b.amount, 0);
        const cups = filtered.filter(t => t.category === 'income').reduce((a, b) => a + (b.cups || 0), 0);
        return { income, expense, profit: income - expense, cups };
    },
    
    getSalesByDrink(state, filter) {
        const now = new Date();
        let start = new Date(now);
        if (filter === 'day') start.setHours(0, 0, 0, 0);
        else if (filter === 'week') {
            const day = now.getDay();
            const diff = (day === 0 ? 6 : day - 1);
            start.setDate(now.getDate() - diff);
            start.setHours(0, 0, 0, 0);
        } else if (filter === 'month') start = new Date(now.getFullYear(), now.getMonth(), 1);
        else if (filter === 'year') start = new Date(now.getFullYear(), 0, 1);
        else if (filter === 'allTime') start = new Date(0);
        const sales = {};
        for (const t of state.transactionHistory || []) {
            if (t.category === 'income' && t.description?.startsWith('☕ Продажа:')) {
                if (filter !== 'allTime' && new Date(t.timestamp) < start) continue;
                const drinkName = t.description.replace('☕ Продажа:', '').trim();
                const taxIndex = drinkName.indexOf('(налог');
                const cleanName = taxIndex > 0 ? drinkName.substring(0, taxIndex).trim() : drinkName;
                sales[cleanName] = (sales[cleanName] || 0) + 1;
            }
        }
        return sales;
    },
    
    getDrinkCost(state, drink) {
        let cost = 0;
        if (!drink.recipe) return 0;
        for (const [ingId, amount] of Object.entries(drink.recipe)) {
            const ing = state.ingredients.find(i => i.id === ingId);
            if (ing) cost += amount * (ing.avgCost || ing.currentBuyPrice);
        }
        return cost;
    },
    
    setActiveFilter(filter) {
        this.activeFilter = filter;
        document.querySelectorAll('.filter-btn').forEach(btn => {
            if (btn.dataset.filter === filter) btn.classList.add('active');
            else btn.classList.remove('active');
        });
        Charts.renderStatsAndChart(this.state);
    },
    
    startGameLoop() {
        if (this.gameLoopInterval) clearInterval(this.gameLoopInterval);
        this.gameLoopInterval = setInterval(() => {
            const now = new Date();
            const clockElem = document.getElementById('clockDisplay');
            const dateElem = document.getElementById('dateDisplay');
            if (clockElem && clockElem.innerHTML === '--:--:--') {
                clockElem.innerHTML = now.toLocaleTimeString('ru', { hour12: false });
            }
            if (dateElem) {
                const days = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];
                dateElem.innerHTML = now.toLocaleDateString('ru') + ' · ' + days[now.getDay()];
            }
        }, 1000);
        this.startSales();
        this.startAutoSync();
        this.startLoanCheck();
        this.startMonthCheck();
        
        if (this.deliveryCheckInterval) clearInterval(this.deliveryCheckInterval);
        this.deliveryCheckInterval = setInterval(() => {
            this.checkDeliveries();
        }, 60000);
    },
    
    escapeHtml(str) {
        if (!str) return '';
        return str.replace(/[&<>]/g, function(m) {
            if (m === '&') return '&amp;';
            if (m === '<') return '&lt;';
            if (m === '>') return '&gt;';
            return m;
        });
    }
};
