import { Game } from './game.js';
import { Charts } from './charts.js';

export const UI = {
    currentEditingDrink: null,
    currentDrinksFilter: 'allTime',
    notifTimeout: null,
    ingredientsBuilt: false,
    orderTimerInterval: null,

    showTopNotification: function(msg, type) {
        type = type || 'info';
        var banner = document.getElementById('topNotification');
        if (!banner) return;
        var colors = { warning: '#ffaa44', error: '#ff6b6b', info: '#7bcfa0' };
        banner.style.backgroundColor = colors[type] || colors.info;
        banner.style.borderLeftColor = colors[type] || colors.info;
        banner.innerHTML = msg.replace(/\n/g, '<br>');
        banner.style.display = 'block';
        if (this.notifTimeout) clearInterval(this.notifTimeout);
        this.notifTimeout = setTimeout(function() {
            banner.style.display = 'none';
        }, 7000);
        banner.onclick = function() { banner.style.display = 'none'; };
    },

    showAutoMessage: function(msg, type) {
        type = type || 'info';
        let oldMsg = document.getElementById('autoNotification');
        if (oldMsg) oldMsg.remove();
        
        let colors = {
            success: '#4d7a4a',
            error: '#9e4a3a',
            info: '#3f7e8c',
            warning: '#c27e3a'
        };
        
        let div = document.createElement('div');
        div.id = 'autoNotification';
        div.innerHTML = msg;
        div.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${colors[type] || colors.info};
            color: white;
            padding: 10px 16px;
            border-radius: 8px;
            font-size: 0.85rem;
            font-weight: bold;
            z-index: 100000;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            text-align: center;
            max-width: 300px;
            word-break: break-word;
            animation: fadeInOut 2s ease forwards;
            cursor: pointer;
        `;
        document.body.appendChild(div);
        
        if (!document.querySelector('#autoFadeStyle')) {
            let style = document.createElement('style');
            style.id = 'autoFadeStyle';
            style.textContent = `
                @keyframes fadeInOut {
                    0% { opacity: 0; }
                    15% { opacity: 1; }
                    85% { opacity: 1; }
                    100% { opacity: 0; visibility: hidden; }
                }
            `;
            document.head.appendChild(style);
        }
        
        div.onclick = function() {
            div.remove();
        };
        
        setTimeout(function() {
            if (div) div.remove();
        }, 2000);
    },

    showSavingIndicator: function() {
        let indicator = document.getElementById('savingIndicator');
        if (!indicator) {
            indicator = document.createElement('div');
            indicator.id = 'savingIndicator';
            indicator.style.cssText = 'position:fixed; bottom:10px; right:10px; background:#4d7a4a; color:white; padding:5px 12px; border-radius:20px; font-size:12px; z-index:9999; opacity:0; transition:opacity 0.3s;';
            document.body.appendChild(indicator);
        }
        indicator.style.opacity = '1';
        indicator.innerHTML = '💾 Сохранено ' + new Date().toLocaleTimeString();
        setTimeout(function() {
            indicator.style.opacity = '0';
        }, 2000);
    },

    renderAll: function(state) {
        if (!state) return;
        this.updateFinanceUI(state);
        this.renderIngredients(state);
        this.renderDrinks(state);
        this.renderMachines(state);
        this.renderOrders(state);
        this.renderLogs(state);
        this.updateUpcomingExpenses(state);
        Charts.renderStatsAndChart(state);
    },

    updateFinanceUI: function(state) {
        var balanceElem = document.getElementById('balanceVal');
        var incomeElem = document.getElementById('totalIncome');
        var expenseElem = document.getElementById('totalExpense');
        var profitElem = document.getElementById('totalProfit');
        
        if (balanceElem) {
            balanceElem.innerHTML = Game.formatMoney(state.balance) + ' ₽';
            balanceElem.className = 'stat-value ' + (state.balance >= 0 ? 'positive' : 'negative');
        }
        if (incomeElem) incomeElem.innerHTML = Game.formatMoney(state.totalIncomeEver) + ' ₽';
        if (expenseElem) expenseElem.innerHTML = Game.formatMoney(state.totalExpenseEver) + ' ₽';
        
        var profitVal = state.totalIncomeEver - state.totalExpenseEver;
        if (profitElem) {
            profitElem.innerHTML = Game.formatMoney(profitVal) + ' ₽';
            profitElem.className = 'stat-value ' + (profitVal >= 0 ? 'positive' : 'negative');
        }
        
        const profitCard = document.getElementById('profitCard');
        if (profitCard) {
            if (profitVal >= 0) {
                profitCard.classList.remove('negative');
                profitCard.classList.add('positive');
            } else {
                profitCard.classList.remove('positive');
                profitCard.classList.add('negative');
            }
        }
    },

    updateUpcomingExpenses: function(state) {
        const container = document.getElementById('upcomingExpensesContent');
        if (!container) return;
        
        const now = new Date();
        const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        const daysLeft = daysInMonth - now.getDate();
        const isWinter = (now.getMonth() >= 9);
        
        const rates = state.electricityRates || {
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
        
        for (let machine of state.machines) {
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
        const currentBalance = state.balance;
        const willBeNegative = currentBalance < totalExpenses;
        
        let html = `
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px;">
                <div style="background: var(--stat-bg); border-radius: 16px; padding: 10px; text-align: center;">
                    <div style="font-size: 0.7rem; opacity: 0.8;">📅 Дней до списания</div>
                    <div style="font-size: 1.2rem; font-weight: bold;">${daysLeft}</div>
                </div>
                <div style="background: var(--stat-bg); border-radius: 16px; padding: 10px; text-align: center;">
                    <div style="font-size: 0.7rem; opacity: 0.8;">🏢 Аренда</div>
                    <div style="font-size: 1rem; font-weight: bold;">${Game.formatMoney(totalRent)} ₽</div>
                </div>
                <div style="background: var(--stat-bg); border-radius: 16px; padding: 10px; text-align: center;">
                    <div style="font-size: 0.7rem; opacity: 0.8;">⚡ Электричество</div>
                    <div style="font-size: 1rem; font-weight: bold;">${Game.formatMoney(totalElectricity)} ₽</div>
                    <div style="font-size: 0.6rem;">${totalKwh.toFixed(0)} кВт·ч</div>
                </div>
                <div style="background: var(--stat-bg); border-radius: 16px; padding: 10px; text-align: center;">
                    <div style="font-size: 0.7rem; opacity: 0.8;">🧼 Промывка/очистка</div>
                    <div style="font-size: 1rem; font-weight: bold;">${Game.formatMoney(totalService)} ₽</div>
                </div>
                <div style="background: var(--stat-bg); border-radius: 16px; padding: 10px; text-align: center;">
                    <div style="font-size: 0.7rem; opacity: 0.8;">🔧 Плановое ТО</div>
                    <div style="font-size: 1rem; font-weight: bold;">${Game.formatMoney(totalMaintenance)} ₽</div>
                </div>
            </div>
            <div style="margin-top: 12px; padding: 10px; background: ${willBeNegative ? 'rgba(255, 68, 68, 0.2)' : 'rgba(107, 191, 76, 0.2)'}; border-radius: 12px; text-align: center;">
                <div style="font-size: 0.8rem;">💰 Предстоящие расходы: <strong>${Game.formatMoney(totalExpenses)} ₽</strong></div>
                <div style="font-size: 0.7rem; margin-top: 5px;">
                    ${willBeNegative 
                        ? `<span style="color: var(--negative);">⚠️ Внимание! Баланс (${Game.formatMoney(currentBalance)} ₽) может не покрыть расходы!</span>` 
                        : `<span style="color: var(--positive);">✅ Баланс (${Game.formatMoney(currentBalance)} ₽) покрывает расходы</span>`}
                </div>
            </div>
        `;
        
        container.innerHTML = html;
        
        if (daysLeft <= 3 && daysLeft > 0 && willBeNegative) {
            this.showAutoMessage(`⚠️ Через ${daysLeft} дня спишутся расходы на ${Game.formatMoney(totalExpenses)} ₽, а на балансе ${Game.formatMoney(currentBalance)} ₽. Пополните склад!`, 'warning');
        }
    },

    renderIngredients: function(state) {
        var container = document.getElementById('ingredientsList');
        if (!container) return;
        
        var oldThresholds = {};
        var oldInputs = container.querySelectorAll('.threshold-input');
        for (var i = 0; i < oldInputs.length; i++) {
            var inp = oldInputs[i];
            oldThresholds[inp.getAttribute('data-id')] = inp.value;
        }
        
        container.innerHTML = '';
        if (!state || !state.ingredients) return;
        
        var uniqueIngredients = [];
        var ids = {};
        for (var i = 0; i < state.ingredients.length; i++) {
            var ing = state.ingredients[i];
            if (!ids[ing.id]) {
                ids[ing.id] = true;
                uniqueIngredients.push(ing);
            }
        }
        state.ingredients = uniqueIngredients;
        
        var ingList = [];
        var consList = [];
        for (var i = 0; i < state.ingredients.length; i++) {
            if (state.ingredients[i].type === 'ingredient') {
                ingList.push(state.ingredients[i]);
            } else {
                consList.push(state.ingredients[i]);
            }
        }
        
        if (ingList.length > 0) {
            var ingGroup = document.createElement('div');
            ingGroup.className = 'ingredient-group';
            ingGroup.innerHTML = '<div class="group-title" style="font-weight:bold; margin:5px 0;">☕ Ингредиенты</div>';
            for (var j = 0; j < ingList.length; j++) {
                var ing = ingList[j];
                var threshold = ing.alertThreshold !== undefined ? ing.alertThreshold : 1;
                var savedThreshold = oldThresholds[ing.id];
                if (savedThreshold !== undefined) threshold = savedThreshold;
                var div = this.createIngredientRow(ing, threshold);
                ingGroup.appendChild(div);
            }
            container.appendChild(ingGroup);
        }
        
        if (consList.length > 0) {
            var consGroup = document.createElement('div');
            consGroup.className = 'consumable-group';
            consGroup.innerHTML = '<div class="group-title" style="font-weight:bold; margin:5px 0;">🧾 Расходники</div>';
            for (var k = 0; k < consList.length; k++) {
                var ing = consList[k];
                var threshold = ing.alertThreshold !== undefined ? ing.alertThreshold : 100;
                var savedThreshold = oldThresholds[ing.id];
                if (savedThreshold !== undefined) threshold = savedThreshold;
                var div = this.createIngredientRow(ing, threshold);
                consGroup.appendChild(div);
            }
            container.appendChild(consGroup);
        }
        
        this.attachIngredientEvents();
        this.attachThresholdEvents();
        this.updateLowStockHighlight(state);
    },
    
    createIngredientRow: function(ing, threshold) {
        var div = document.createElement('div');
        div.className = 'list-item';
        div.setAttribute('data-id', ing.id);
        var avgCost = (ing.avgCost !== undefined && ing.avgCost !== null) ? ing.avgCost : ing.currentBuyPrice;
        var stockDisplay = ing.type === 'consumable' ? Game.formatConsumable(ing.stock) : Game.formatIngredient(ing.stock);
        
        var step = ing.unit === 'кг' ? 0.1 : 1;
        var thresholdUnit = ing.unit;
        var thresholdValue = threshold;
        
        div.innerHTML = `
            <div class="item-main">
                <div class="item-title">${this.escapeHtml(ing.name)}</div>
                <div class="item-sub">📦 <span class="stock-val">${stockDisplay}</span> ${ing.unit}</div>
                <div class="item-sub">💰 Закупка: ${Game.formatMoney(ing.currentBuyPrice)} ₽/${ing.unit}</div>
                <div class="item-sub">📊 Средняя с/с остатка: <span class="avgcost-val">${Game.formatMoney(avgCost)}</span> ₽/${ing.unit}</div>
            </div>
            <div class="btn-group">
                <button class="buy-ing btn-green btn-sm" data-id="${ing.id}" data-name="${this.escapeHtml(ing.name)}" data-unit="${ing.unit}">📦 Заказать у поставщиков</button>
                <button class="price-chip btn-sm" data-id="${ing.id}" style="display: none;">💰 Цена</button>
                <button class="del-ing btn-red btn-sm" data-id="${ing.id}">🗑️</button>
            </div>
            <div style="display:flex; gap:5px; align-items:center; margin-top:5px;">
                <span>📉 мин.</span>
                <input type="number" class="threshold-input" data-id="${ing.id}" value="${thresholdValue}" step="${step}" style="width: 75px;"> 
                <span style="font-size:0.6rem;">${thresholdUnit}</span>
                <button class="set-threshold btn-sm" data-id="${ing.id}">✅</button>
            </div>
        `;
        return div;
    },
    
    updateLowStockHighlight: function(state) {
        for (var i = 0; i < state.ingredients.length; i++) {
            var ing = state.ingredients[i];
            var row = document.querySelector('.list-item[data-id="' + ing.id + '"]');
            if (!row) continue;
            
            var threshold = ing.alertThreshold !== undefined ? ing.alertThreshold : (ing.type === 'ingredient' ? 1 : 100);
            var stockForCompare = ing.stock;
            
            if (ing.unit === 'кг') {
                stockForCompare = ing.stock;
            }
            
            row.classList.remove('stock-zero', 'stock-low');
            
            if (ing.stock <= 0) {
                row.classList.add('stock-zero');
            } else if (stockForCompare < threshold) {
                row.classList.add('stock-low');
            }
        }
    },

    getDefaultQuantity: function(ingId) {
        var defaults = {
            coffeeBeans: 1,
            water: 19,
            milkPowder: 1,
            sugar: 1,
            chocolate: 1,
            cocoa: 1,
            vanillaSyrup: 1,
            nutSyrup: 1,
            fruitSyrup: 1,
            stirSticks: 100,
            cups: 100,
            lids: 100,
            napkins: 100
        };
        return defaults[ingId] || 1;
    },

    attachIngredientEvents: function() {
        var self = this;
        var isAdmin = window.isAdminCache || false;
        
        var priceBtns = document.querySelectorAll('.price-chip');
        for (var i = 0; i < priceBtns.length; i++) {
            var btn = priceBtns[i];
            if (!isAdmin) {
                btn.style.display = 'none';
            } else {
                btn.style.display = 'inline-flex';
                btn.onclick = function() {
                    var id = this.dataset.id;
                    var ing = Game.state.ingredients.find(function(i) { return i.id === id; });
                    var newP = prompt('Новая цена за ' + ing.unit + ' "' + ing.name + '":', ing.currentBuyPrice);
                    if (newP && !isNaN(parseFloat(newP))) Game.setIngredientPrice(id, parseFloat(newP));
                };
            }
        }
        
        var buyBtns = document.querySelectorAll('.buy-ing');
        for (var j = 0; j < buyBtns.length; j++) {
            var btn = buyBtns[j];
            btn.onclick = function() {
                var id = this.dataset.id;
                var name = this.dataset.name;
                var unit = this.dataset.unit;
                
                if (typeof window.openSupplierForIngredient === 'function') {
                    window.openSupplierForIngredient(id, name, unit);
                } else {
                    UI.showAutoMessage('❌ Система поставщиков не загружена', 'error');
                }
            };
        }
        
        var delBtns = document.querySelectorAll('.del-ing');
        for (var k = 0; k < delBtns.length; k++) {
            var btn = delBtns[k];
            btn.onclick = function() {
                Game.deleteIngredient(this.dataset.id);
            };
        }
    },

    attachThresholdEvents: function() {
        var btns = document.querySelectorAll('.set-threshold');
        for (var i = 0; i < btns.length; i++) {
            var btn = btns[i];
            btn.onclick = function() {
                var id = this.dataset.id;
                var input = document.querySelector('.threshold-input[data-id="' + id + '"]');
                var val = parseFloat(input ? input.value : 0);
                if (isNaN(val)) val = 0;
                Game.setIngredientThreshold(id, val);
            };
        }
        var thresholdInputs = document.querySelectorAll('.threshold-input');
        for (var j = 0; j < thresholdInputs.length; j++) {
            var input = thresholdInputs[j];
            input.onblur = function() {
                var id = this.getAttribute('data-id');
                var val = parseFloat(this.value);
                if (isNaN(val)) val = 0;
                Game.setIngredientThreshold(id, val);
            };
        }
    },

    renderDrinks: function(state) {
        var container = document.getElementById('drinksList');
        if (!container) return;
        container.innerHTML = '';
        for (var i = 0; i < state.drinks.length; i++) {
            var drink = state.drinks[i];
            var recipeParts = [];
            for (var ingId in drink.recipe) {
                if (drink.recipe.hasOwnProperty(ingId)) {
                    var amt = drink.recipe[ingId];
                    var ing = null;
                    for (var j = 0; j < state.ingredients.length; j++) {
                        if (state.ingredients[j].id === ingId) {
                            ing = state.ingredients[j];
                            break;
                        }
                    }
                    var ingName = ing ? ing.name : ingId;
                    recipeParts.push(ingName + ': ' + amt.toFixed(3));
                }
            }
            var recipeFull = recipeParts.join(', ');
            var cost = Game.getDrinkCost(state, drink);
            var margin = drink.price - cost;
            var marginPercent = cost > 0 ? (margin / cost * 100).toFixed(0) : 0;
            var div = document.createElement('div');
            div.className = 'list-item';
            div.innerHTML = `
                <div class="item-main">
                    <div class="item-title">${this.escapeHtml(drink.name)}</div>
                    <div class="item-sub">📜 ${recipeFull || 'нет рецепта'}</div>
                    <div class="item-sub" style="font-size:0.65rem;">💰 Себест.: ${Game.formatMoney(cost)} ₽ | Наценка: +${marginPercent}%</div>
                </div>
                <div><strong>${Game.formatMoney(drink.price)} ₽</strong></div>
                <div class="btn-group">
                    <button class="edit-price btn-sm" data-id="${drink.id}">💰 Цена</button>
                    <button class="edit-recipe btn-sm btn-blue" data-id="${drink.id}">📝 Рецепт</button>
                    <button class="del-drink btn-red btn-sm" data-id="${drink.id}">❌</button>
                </div>
            `;
            container.appendChild(div);
        }
        this.attachDrinkEvents();
    },

    attachDrinkEvents: function() {
        var self = this;
        var editPriceBtns = document.querySelectorAll('.edit-price');
        for (var i = 0; i < editPriceBtns.length; i++) {
            var btn = editPriceBtns[i];
            btn.onclick = function() {
                var drinkId = this.dataset.id;
                var drink = Game.state.drinks.find(function(d) { return d.id === drinkId; });
                if (!drink) return;
                var newP = prompt('Новая цена:', drink.price);
                if (newP && !isNaN(parseFloat(newP))) Game.updateDrinkPrice(drinkId, parseFloat(newP));
            };
        }
        var editRecipeBtns = document.querySelectorAll('.edit-recipe');
        for (var j = 0; j < editRecipeBtns.length; j++) {
            var btn = editRecipeBtns[j];
            btn.onclick = function() {
                var drinkId = this.dataset.id;
                var drink = Game.state.drinks.find(function(d) { return d.id === drinkId; });
                if (drink) self.openRecipeModal(drink);
            };
        }
        var delBtns = document.querySelectorAll('.del-drink');
        for (var k = 0; k < delBtns.length; k++) {
            var btn = delBtns[k];
            btn.onclick = function() {
                Game.deleteDrink(this.dataset.id);
            };
        }
    },

    openRecipeModal: function(drink) {
        this.currentEditingDrink = drink;
        var modal = document.getElementById('recipeModal');
        var title = document.getElementById('modalDrinkName');
        var container = document.getElementById('modalRecipeList');
        if (title) title.innerHTML = '📝 Рецепт: ' + drink.name;
        if (!container) return;
        container.innerHTML = '';
        var recIng = Game.state.ingredients.filter(function(i) { return i.type === 'ingredient'; });
        for (var i = 0; i < recIng.length; i++) {
            var ing = recIng[i];
            var amt = drink.recipe[ing.id] || 0;
            var row = document.createElement('div');
            row.className = 'ingredient-row';
            row.style.display = 'flex';
            row.style.justifyContent = 'space-between';
            row.style.alignItems = 'center';
            row.style.marginBottom = '8px';
            row.innerHTML = `
                <span><strong>${this.escapeHtml(ing.name)}</strong> (${ing.unit})</span>
                <div><input type="number" id="recipe-${ing.id}" value="${amt}" step="0.001" style="width:80px;"> ${ing.unit}</div>
            `;
            container.appendChild(row);
        }
        if (modal) modal.classList.add('active');
    },

    closeRecipeModal: function() {
        var modal = document.getElementById('recipeModal');
        if (modal) modal.classList.remove('active');
        this.currentEditingDrink = null;
    },

    saveRecipeFromModal: function() {
        if (!this.currentEditingDrink) return;
        var newRecipe = {};
        var recIng = Game.state.ingredients.filter(function(i) { return i.type === 'ingredient'; });
        for (var i = 0; i < recIng.length; i++) {
            var ing = recIng[i];
            var input = document.getElementById('recipe-' + ing.id);
            if (input) {
                var val = parseFloat(input.value);
                if (!isNaN(val) && val > 0) newRecipe[ing.id] = val;
            }
        }
        Game.updateDrinkRecipe(this.currentEditingDrink.id, newRecipe);
        this.closeRecipeModal();
        this.showAutoMessage('✅ Рецепт сохранён', 'success');
    },

    renderMachines: function(state) {
        var container = document.getElementById('machinesList');
        var countDisplay = document.getElementById('machineCountDisplay');
        if (!container) return;
        if (state.machines.length === 0) {
            container.innerHTML = '<div style="text-align:center; padding:10px;">😴 Нет автоматов. Купите первый!</div>';
        } else {
            var html = '';
            for (var i = 0; i < state.machines.length; i++) {
                var m = state.machines[i];
                var profit = (m.totalIncome || 0) - (m.totalExpense || 0);
                var profitClass = profit >= 0 ? 'positive' : 'negative';
                html += `
                    <div class="machine-card" style="margin-bottom: 12px; padding: 12px; background: var(--stat-bg); border-radius: 20px; border: 1px solid var(--border);">
                        <div class="machine-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; flex-wrap: wrap;">
                            <div class="machine-name" style="font-weight: 700;">🤖 ${this.escapeHtml(m.name)}</div>
                            <div>💰 ${Game.formatMoney(m.buyPrice)} ₽</div>
                        </div>
                        <div class="machine-stats" style="font-size: 0.7rem; display: flex; flex-wrap: wrap; gap: 12px; margin-bottom: 8px; opacity: 0.8;">
                            <div>📊 продаж: ${m.totalSales || 0}</div>
                            <div>💰 доход: ${Game.formatMoney(m.totalIncome || 0)} ₽</div>
                            <div>💸 расход: ${Game.formatMoney(m.totalExpense || 0)} ₽</div>
                            <div class="${profitClass}">⭐ прибыль: ${Game.formatMoney(profit)} ₽</div>
                            <div>🏷️ аренда: ${Game.formatMoney(m.rent)} ₽/мес</div>
                            <div>💳 эквайринг: ${m.acquirerPercent || 1.8}%</div>
                            <div>⚡ ${m.powerKwh || 2.5} кВт·ч/день</div>
                        </div>
                        <div class="machine-settings-individual" style="display: flex; flex-wrap: wrap; gap: 12px; margin-top: 8px; padding-top: 8px; border-top: 1px solid var(--border); font-size: 0.7rem;">
                            <div>
                                <span>🏷️ Аренда:</span>
                                <input type="number" id="rent-${m.id}" value="${m.rent}" step="100" style="width: 80px;"> ₽
                                <button class="btn-sm btn-orange save-rent" data-id="${m.id}">💾</button>
                            </div>
                            <button class="btn-sm btn-blue rename-machine" data-id="${m.id}" data-name="${m.name}">✏️ Переименовать</button>
                        </div>
                    </div>
                `;
            }
            container.innerHTML = html;
            
            var saveRentBtns = document.querySelectorAll('.save-rent');
            for (var r = 0; r < saveRentBtns.length; r++) {
                var btn = saveRentBtns[r];
                btn.onclick = function() {
                    var id = parseInt(this.dataset.id);
                    var input = document.getElementById('rent-' + id);
                    var newRent = parseFloat(input ? input.value : 0);
                    if (!isNaN(newRent) && newRent >= 0) {
                        Game.changeMachineRent(id, newRent);
                    } else {
                        UI.showAutoMessage('❌ Введите корректную сумму аренды', 'error');
                    }
                };
            }
            
            var renameBtns = document.querySelectorAll('.rename-machine');
            for (var n = 0; n < renameBtns.length; n++) {
                var btn = renameBtns[n];
                btn.onclick = function() {
                    var id = parseInt(this.dataset.id);
                    var oldName = this.dataset.name;
                    var newName = prompt('Новое имя автомата:', oldName);
                    if (newName && newName.trim()) Game.renameMachine(id, newName);
                };
            }
        }
        if (countDisplay) countDisplay.innerHTML = '🤖 Автоматов: ' + state.machines.length;
        
        this.updateUpcomingExpenses(state);
    },

    // ========== ОТОБРАЖЕНИЕ ЗАКАЗОВ С КНОПКОЙ ОТМЕНЫ ==========
    renderOrders: function(state) {
        const container = document.getElementById('ordersList');
        if (!container) return;
        
        const activeOrders = (state.orders || []).filter(order => order.status !== 'delivered');
        
        if (activeOrders.length === 0) {
            container.innerHTML = '<div style="text-align:center; padding:20px;">Нет активных заказов</div>';
            return;
        }
        
        let html = '';
        for (let order of activeOrders) {
            const createdDate = new Date(order.created_at).toLocaleString();
            
            let deliveryHtml = '';
            let canCancel = false;
            if (order.delivery_date) {
                const deliveryDate = new Date(order.delivery_date);
                const now = new Date();
                const diffMs = deliveryDate - now;
                
                if (diffMs > 0) {
                    const diffMin = Math.floor(diffMs / 60000);
                    const diffHours = Math.floor(diffMin / 60);
                    const diffMinutes = diffMin % 60;
                    let timeLeft = diffHours > 0 ? `${diffHours} ч ${diffMinutes} мин` : `${diffMin} мин`;
                    deliveryHtml = `<span style="color: var(--accent);">⏱️ Осталось: ${timeLeft}</span>`;
                    canCancel = true;
                } else {
                    deliveryHtml = `<span style="color: var(--positive);">✅ Доставлен</span>`;
                }
            }
            
            let itemsHtml = '<ul style="margin: 5px 0 0 20px; font-size: 0.7rem;">';
            for (let item of order.items) {
                itemsHtml += `<li>${item.name}: ${item.quantity} ${item.unit} × ${Game.formatMoney(item.price)} ₽ = ${Game.formatMoney(item.totalPrice)} ₽</li>`;
            }
            itemsHtml += '</ul>';
            
            html += `
                <div class="list-item" style="margin-bottom: 12px;" data-order-id="${order.id}">
                    <div style="flex: 1;">
                        <div style="font-weight: bold;">📦 Заказ у ${order.supplier_name}</div>
                        <div style="font-size: 0.7rem; opacity: 0.7;">📅 Заказан: ${createdDate}</div>
                        <div style="font-size: 0.7rem;">💰 Сумма: ${Game.formatMoney(order.total_cost)} ₽ (доставка: ${order.delivery_cost === 0 ? 'Бесплатно' : Game.formatMoney(order.delivery_cost) + ' ₽'})</div>
                        <div style="font-size: 0.7rem; margin-top: 4px;">${deliveryHtml}</div>
                        ${itemsHtml}
                    </div>
                    ${canCancel ? `<button class="cancel-order-btn btn-sm btn-red" data-order-id="${order.id}" style="margin-left: 10px; align-self: center;">❌ Отменить</button>` : ''}
                </div>
            `;
        }
        
        container.innerHTML = html;
        
        document.querySelectorAll('.cancel-order-btn').forEach(btn => {
            btn.onclick = async (e) => {
                e.stopPropagation();
                const orderId = btn.dataset.orderId;
                if (confirm('Отменить этот заказ? Деньги будут возвращены на счёт.')) {
                    const success = await Game.cancelOrder(parseInt(orderId));
                    if (success) {
                        this.showAutoMessage('✅ Заказ отменён. Деньги возвращены.', 'success');
                        this.renderOrders(Game.state);
                        this.updateFinanceUI(Game.state);
                    } else {
                        this.showAutoMessage('❌ Не удалось отменить заказ', 'error');
                    }
                }
            };
        });
        
        if (this.orderTimerInterval) clearInterval(this.orderTimerInterval);
        this.orderTimerInterval = setInterval(() => {
            if (document.getElementById('ordersList') && Game.state) {
                this.renderOrders(Game.state);
            }
        }, 60000);
    },

    renderLogs: function(state) {
        var container = document.getElementById('logsContainer');
        if (!container) return;
        var transactions = state.transactions || [];
        if (transactions.length === 0) {
            container.innerHTML = '<div style="text-align:center; padding:20px;">Нет операций</div>';
            return;
        }
        var recent = transactions.slice(0, 50);
        var html = '';
        
        for (var i = 0; i < recent.length; i++) {
            var t = recent[i];
            var date = new Date(t.timestamp);
            var timeStr = date.toLocaleTimeString('ru', { hour12: false });
            var dateStr = date.toLocaleDateString('ru');
            var sign = t.category === 'income' ? '+' : (t.category === 'expense' ? '−' : '');
            var amountDisplay = t.category !== 'info' ? sign + ' ' + Game.formatMoney(t.amount) + ' ₽' : '';
            var logClass = '';
            var bgColor = '';
            var textColor = '#ffffff';
            var inlineStyle = '';
            
            var isCredit = t.description && (t.description.includes('Кредит') || t.description.includes('кредитный платёж'));
            
            if (isCredit) {
                logClass = 'log-credit';
                bgColor = '#ffcc00';
                var isLightTheme = document.body.classList.contains('light-theme');
                textColor = isLightTheme ? '#b5432e' : '#8b3a3a';
                inlineStyle = 'background: #ffcc00; color: ' + textColor + '; font-weight: bold; border-left: 4px solid #ff6600;';
            } else if (t.category === 'income') {
                logClass = 'log-income';
                bgColor = document.body.classList.contains('light-theme') ? '#3d7a3a' : '#2a5a2a';
                textColor = '#ffffff';
                inlineStyle = 'background: ' + bgColor + '; color: ' + textColor + '; border-left: 4px solid #6fbf4c;';
            } else if (t.category === 'expense') {
                logClass = 'log-expense';
                bgColor = document.body.classList.contains('light-theme') ? '#b5432e' : '#8b3a3a';
                textColor = '#ffffff';
                inlineStyle = 'background: ' + bgColor + '; color: ' + textColor + '; border-left: 4px solid #ff6b6b;';
            } else {
                logClass = 'log-info';
                bgColor = document.body.classList.contains('light-theme') ? '#8d6b5c' : '#8b6b3a';
                textColor = '#ffffff';
                inlineStyle = 'background: ' + bgColor + '; color: ' + textColor + '; border-left: 4px solid var(--accent);';
            }
            
            html += '<div class="log-entry ' + logClass + '" style="' + inlineStyle + '">';
            html += '<div class="log-time" style="color: ' + textColor + ';">' + dateStr + ' ' + timeStr + '</div>';
            html += '<div class="log-desc" style="color: ' + textColor + ';">' + this.escapeHtml(t.description) + '</div>';
            html += '<div class="log-amount" style="color: ' + textColor + ';">' + amountDisplay + '</div>';
            html += '</div>';
        }
        container.innerHTML = html;
    },

    showFullStats: async function(state) {
        const modal = document.getElementById('statsModal');
        const modalBody = document.getElementById('statsModalBody');
        if (!modal || !modalBody) return;
        
        const filter = Game.activeFilter || 'month';
        const filtered = Game.getFilteredData(state, filter);
        
        let totalRent = 0, totalTax = 0, totalPurchases = 0, totalMachinesCost = 0;
        let totalAcquirerFees = state.totalAcquirerFees || 0;
        let totalElectricity = 0, totalService = 0, totalMaintenance = 0;
        let history = state.transactionHistory || [];
        let monthlyTax = 0;
        
        for (let i = 0; i < history.length; i++) {
            let t = history[i];
            if (t.category === 'expense') {
                if (t.subcategory === 'rent') totalRent += t.amount;
                else if (t.subcategory === 'electricity') totalElectricity += t.amount;
                else if (t.subcategory === 'service') totalService += t.amount;
                else if (t.subcategory === 'maintenance') totalMaintenance += t.amount;
                else if (t.description && t.description.includes('Покупка автомата')) totalMachinesCost += t.amount;
                else if (t.description && t.description.includes('Закупка')) totalPurchases += t.amount;
            }
            if (t.category === 'income' && t.subcategory === 'tax') {
                monthlyTax += t.tax || 0;
                totalTax += t.tax || 0;
            }
        }
        
        let html = `
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px;">
                <div style="background: var(--stat-bg); border-radius: 20px; padding: 15px;">
                    <h3 style="margin-bottom: 15px;">📊 Общая статистика</h3>
                    <div style="display: flex; flex-direction: column; gap: 10px;">
                        <div><strong>💰 Баланс:</strong> ${Game.formatMoney(state.balance)} ₽</div>
                        <div><strong>📈 Общий доход:</strong> ${Game.formatMoney(state.totalIncomeEver)} ₽</div>
                        <div><strong>📉 Общий расход:</strong> ${Game.formatMoney(state.totalExpenseEver)} ₽</div>
                        <div><strong>⭐ Общая прибыль:</strong> ${Game.formatMoney(state.totalIncomeEver - state.totalExpenseEver)} ₽</div>
                        <div><strong>🥤 Всего чашек:</strong> ${state.totalCupsSold || 0}</div>
                        <div><strong>🤖 Всего автоматов:</strong> ${state.machines?.length || 0}</div>
                        <div><strong>☕ Напитков в меню:</strong> ${state.drinks?.length || 0}</div>
                        <div><strong>📦 Ингредиентов:</strong> ${state.ingredients?.length || 0}</div>
                    </div>
                </div>
                
                <div style="background: var(--stat-bg); border-radius: 20px; padding: 15px;">
                    <h3 style="margin-bottom: 15px;">📅 Статистика за ${this.getFilterName(Game.activeFilter)}</h3>
                    <div style="display: flex; flex-direction: column; gap: 10px;">
                        <div><strong>💰 Доход:</strong> <span class="positive">${Game.formatMoney(filtered.income)} ₽</span></div>
                        <div><strong>📉 Расход:</strong> <span class="negative">${Game.formatMoney(filtered.expense)} ₽</span></div>
                        <div><strong>⭐ Прибыль:</strong> <span class="${filtered.profit >= 0 ? 'positive' : 'negative'}">${Game.formatMoney(filtered.profit)} ₽</span></div>
                        <div><strong>🥤 Чашек продано:</strong> ${filtered.cups}</div>
                        <div><strong>💰 Средний чек:</strong> ${filtered.cups > 0 ? Game.formatMoney(filtered.income / filtered.cups) : '0.00'} ₽</div>
                    </div>
                </div>
            </div>
            
            <div style="background: var(--stat-bg); border-radius: 20px; padding: 15px; margin-top: 20px;">
                <h3 style="margin-bottom: 15px;">💰 Детальная финансовая статистика</h3>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 12px;">
                    <div><strong>💳 Эквайринг:</strong> ${Game.formatMoney(totalAcquirerFees)} ₽</div>
                    <div><strong>⚡ Электричество:</strong> ${Game.formatMoney(totalElectricity)} ₽</div>
                    <div><strong>🏢 Аренда:</strong> ${Game.formatMoney(totalRent)} ₽</div>
                    <div><strong>🧼 Промывка/очистка:</strong> ${Game.formatMoney(totalService)} ₽</div>
                    <div><strong>🔧 Плановое ТО:</strong> ${Game.formatMoney(totalMaintenance)} ₽</div>
                    <div><strong>📑 Налоги (всего):</strong> ${Game.formatMoney(totalTax)} ₽</div>
                    <div><strong>📑 Налог за месяц:</strong> ${Game.formatMoney(monthlyTax)} ₽</div>
                    <div><strong>🛒 Закупка товаров:</strong> ${Game.formatMoney(totalPurchases)} ₽</div>
                    <div><strong>🤖 Покупка автоматов:</strong> ${Game.formatMoney(totalMachinesCost)} ₽</div>
                    <div><strong>💳 Активных кредитов:</strong> ${(state.loans || []).length}</div>
                </div>
                <div style="margin-top: 8px;">
                    ${(state.loans || []).map(loan => `
                        <div style="background: var(--bg-card); border-radius: 12px; padding: 8px 12px; margin-bottom: 8px; border-left: 3px solid var(--accent);">
                            <div style="font-weight: bold; font-size: 1rem;">🏦 ${Game.formatMoney(loan.totalOwed)} ₽</div>
                            <div style="margin-top: 4px;">
                                <span style="font-size: 0.7rem; background: var(--accent); color: #2a1a0c; padding: 2px 8px; border-radius: 20px;">${loan.remainingMonths} мес.</span>
                            </div>
                            <div style="margin-top: 6px;">
                                <span style="font-size: 0.7rem;">💳 платёж:</span>
                                <strong style="font-size: 0.9rem; margin-left: 5px;">${Game.formatMoney(loan.monthlyPayment)} ₽</strong>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
        
        let drinksHtml = `
            <div style="background: var(--stat-bg); border-radius: 20px; padding: 15px; margin-top: 20px;">
                <h3 style="margin-bottom: 15px;">📈 Продажи по напиткам</h3>
                <div class="drinks-filter-bar" style="display:flex; flex-wrap:wrap; gap:8px; margin-bottom:15px; justify-content:center;">
                    <button data-drinks-filter="allTime" class="drinks-filter-btn ${this.currentDrinksFilter === 'allTime' ? 'active' : ''}" style="border-radius:40px; padding:6px 12px;">📅 Всё время</button>
                    <button data-drinks-filter="day" class="drinks-filter-btn ${this.currentDrinksFilter === 'day' ? 'active' : ''}" style="border-radius:40px; padding:6px 12px;">📅 Сегодня</button>
                    <button data-drinks-filter="week" class="drinks-filter-btn ${this.currentDrinksFilter === 'week' ? 'active' : ''}" style="border-radius:40px; padding:6px 12px;">📆 Неделя</button>
                    <button data-drinks-filter="month" class="drinks-filter-btn ${this.currentDrinksFilter === 'month' ? 'active' : ''}" style="border-radius:40px; padding:6px 12px;">🗓️ Месяц</button>
                    <button data-drinks-filter="year" class="drinks-filter-btn ${this.currentDrinksFilter === 'year' ? 'active' : ''}" style="border-radius:40px; padding:6px 12px;">📅 Год</button>
                </div>
                <div id="drinksStatsTable"></div>
            </div>
        `;
        
        html += drinksHtml;
        
        if (state.machines && state.machines.length > 0) {
            html += `
                <div style="background: var(--stat-bg); border-radius: 20px; padding: 15px; margin-top: 20px;">
                    <h3 style="margin-bottom: 15px;">🤖 Статистика по автоматам</h3>
                    <div style="display: flex; flex-direction: column; gap: 12px;">
            `;
            for (const m of state.machines) {
                const profit = (m.totalIncome || 0) - (m.totalExpense || 0);
                html += `
                    <div style="background: var(--stat-bg); border-radius: 16px; padding: 12px; border: 1px solid var(--border);">
                        <div style="font-weight: bold; font-size: 16px; margin-bottom: 8px;">🤖 ${this.escapeHtml(m.name)}</div>
                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 8px; font-size: 0.85rem;">
                            <div>💰 Цена: ${Game.formatMoney(m.buyPrice)} ₽</div>
                            <div>🏷️ Аренда: ${Game.formatMoney(m.rent)} ₽/мес</div>
                            <div>📊 Продаж: ${m.totalSales || 0} шт</div>
                            <div>💰 Доход: ${Game.formatMoney(m.totalIncome || 0)} ₽</div>
                            <div>💸 Расход: ${Game.formatMoney(m.totalExpense || 0)} ₽</div>
                            <div class="${profit >= 0 ? 'positive' : 'negative'}">⭐ Прибыль: ${Game.formatMoney(profit)} ₽</div>
                        </div>
                    </div>
                `;
            }
            html += `</div></div>`;
        }
        
        try {
            const res = await fetch('get_referral_stats.php');
            const refData = await res.json();
            
            if (refData.success) {
                let referredTable = '';
                if (refData.referrals && refData.referrals.length > 0) {
                    referredTable = `
                        <div style="margin-top: 15px; overflow-x: auto;">
                            <table style="width: 100%; border-collapse: collapse; font-size: 0.85rem;">
                                <thead><tr style="border-bottom: 2px solid var(--border);">
                                    <th style="text-align: left; padding: 8px;">👤 Друг</th>
                                    <th style="text-align: left; padding: 8px;">📅 Дата</th>
                                    <th style="text-align: right; padding: 8px;">💰 Бонус (10%)</th>
                                   </tr></thead>
                                <tbody>
                    `;
                    for (let ref of refData.referrals) {
                        let date = ref.invited_date;
                        let bonus = parseFloat(ref.bonus_earned);
                        if (isNaN(bonus)) bonus = 0;
                        referredTable += `<tr style="border-bottom: 1px solid var(--border);">
                            <td style="padding: 8px;">${this.escapeHtml(ref.referred_username)}</td>
                            <td style="padding: 8px;">${date}</td>
                            <td style="text-align: right; padding: 8px; font-weight: bold; color: var(--accent);">${bonus.toFixed(2)} ₽</td>
                        </tr>`;
                    }
                    referredTable += `</tbody></table></div>`;
                } else {
                    referredTable = `<div style="text-align: center; padding: 20px; opacity: 0.7;">🤝 Пока нет приглашённых друзей. Нажмите «📢 Пригласить друзей»!</div>`;
                }
                
                let totalBonus = parseFloat(refData.total_bonus);
                if (isNaN(totalBonus)) totalBonus = 0;
                
                html += `
                    <div style="background: var(--stat-bg); border-radius: 20px; padding: 15px; margin-top: 20px;">
                        <h3 style="margin-bottom: 10px;">👥 Реферальная статистика</h3>
                        <div style="display: flex; justify-content: space-between; flex-wrap: wrap; gap: 10px;">
                            <div>📢 Приглашено: <strong>${refData.count}</strong></div>
                            <div>💰 Бонусов: <strong class="positive">${Game.formatMoney(totalBonus)} ₽</strong></div>
                        </div>
                        ${referredTable}
                        <div style="margin-top: 10px; font-size: 0.7rem; opacity: 0.7;">💡 Бонус: 10% от налогов приглашённого</div>
                    </div>
                `;
            }
        } catch(e) {
            console.warn('Referral stats error:', e);
        }
        
        modalBody.innerHTML = html;
        modal.classList.add('active');
        
        this.attachDrinksFilterEvents(state);
        this.updateDrinksStats(state);
    },

    getFilterName: function(filter) {
        var names = { 'day': 'день', 'week': 'неделю', 'month': 'месяц', 'year': 'год', 'allTime': 'всё время' };
        return names[filter] || 'период';
    },

    attachDrinksFilterEvents: function(state) {
        var self = this;
        var btns = document.querySelectorAll('[data-drinks-filter]');
        for (var i = 0; i < btns.length; i++) {
            var btn = btns[i];
            btn.onclick = null;
            btn.addEventListener('click', function(e) {
                e.preventDefault();
                self.currentDrinksFilter = this.dataset.drinksFilter;
                var allBtns = document.querySelectorAll('[data-drinks-filter]');
                for (var j = 0; j < allBtns.length; j++) {
                    if (allBtns[j].dataset.drinksFilter === self.currentDrinksFilter) {
                        allBtns[j].classList.add('active');
                    } else {
                        allBtns[j].classList.remove('active');
                    }
                }
                self.updateDrinksStats(state);
            });
        }
    },

    updateDrinksStats: function(state) {
        var sales = Game.getSalesByDrink(state, this.currentDrinksFilter);
        Charts.updateDrinksChartAndTable(sales);
    },

    exportFullData: function(format, state) {
        var content, ext;
        if (format === 'json') {
            content = JSON.stringify(state, null, 2);
            ext = 'json';
        } else if (format === 'csv') {
            var flat = {
                balance: state.balance,
                totalIncomeEver: state.totalIncomeEver,
                totalExpenseEver: state.totalExpenseEver,
                totalCupsSold: state.totalCupsSold,
                totalAcquirerFees: state.totalAcquirerFees,
                ingredients: JSON.stringify(state.ingredients),
                drinks: JSON.stringify(state.drinks),
                machines: JSON.stringify(state.machines),
                transactions: JSON.stringify(state.transactions)
            };
            var headers = Object.keys(flat);
            var row = headers.map(function(h) { return JSON.stringify(flat[h]); }).join(',');
            content = headers.join(',') + '\n' + row;
            ext = 'csv';
        } else {
            content = '--- COFFEE SIM BACKUP ---\nДата: ' + new Date().toLocaleString() + '\nБаланс: ' + state.balance + '\nДоход: ' + state.totalIncomeEver + '\nРасход: ' + state.totalExpenseEver + '\nЧашек: ' + state.totalCupsSold + '\nЭквайринг: ' + state.totalAcquirerFees + '\n--- Полные данные ---\n' + JSON.stringify(state, null, 2);
            ext = 'txt';
        }
        var blob = new Blob([content], { type: 'text/plain' });
        var a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'coffee_sim_export.' + ext;
        a.click();
        URL.revokeObjectURL(a.href);
    },

    exportLogs: function(format, state) {
        var content, ext;
        var transactions = state.transactions || [];
        if (format === 'json') {
            content = JSON.stringify(transactions, null, 2);
            ext = 'json';
        } else if (format === 'csv') {
            var headers = ['timestamp', 'amount', 'description', 'category', 'cups', 'acquirerFee'];
            var rows = [];
            for (var i = 0; i < transactions.length; i++) {
                rows.push([transactions[i].timestamp, transactions[i].amount, transactions[i].description, transactions[i].category, transactions[i].cups || 0, transactions[i].acquirerFee || 0]);
            }
            var csvRows = [headers.join(',')];
            for (var j = 0; j < rows.length; j++) {
                csvRows.push(rows[j].join(','));
            }
            content = csvRows.join('\n');
            ext = 'csv';
        } else {
            var lines = [];
            for (var k = 0; k < transactions.length; k++) {
                var l = transactions[k];
                lines.push(l.timestamp + ' | ' + l.category + ' | ' + Game.formatMoney(l.amount) + ' | ' + l.description);
            }
            content = lines.join('\n');
            ext = 'txt';
        }
        var blob = new Blob([content], { type: 'text/plain' });
        var a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'coffee_sim_logs_' + new Date().toISOString() + '.' + ext;
        a.click();
        URL.revokeObjectURL(a.href);
    },

    toggleTheme: function() {
        var isLight = document.body.classList.toggle('light-theme');
        localStorage.setItem('coffeeTheme', isLight ? 'light' : 'dark');
    },

    initTheme: function() {
        var saved = localStorage.getItem('coffeeTheme');
        if (saved === 'light') document.body.classList.add('light-theme');
    },

    escapeHtml: function(str) {
        if (!str) return '';
        return str.replace(/[&<>]/g, function(m) {
            if (m === '&') return '&amp;';
            if (m === '<') return '&lt;';
            if (m === '>') return '&gt;';
            return m;
        });
    },

    checkAndShowDeficitModal: function(state) {
        if (!state || !state.ingredients) return;
        
        var packSizes = {
            coffeeBeans: 1, water: 19, milkPowder: 1, sugar: 1,
            chocolate: 1, cocoa: 1, vanillaSyrup: 1, nutSyrup: 1, fruitSyrup: 1,
            stirSticks: 100, cups: 100, lids: 100, napkins: 100
        };
        
        var deficitIngredients = [];
        
        for (var i = 0; i < state.ingredients.length; i++) {
            var ing = state.ingredients[i];
            var threshold = ing.alertThreshold || (ing.type === 'ingredient' ? 1 : 100);
            var stockForCompare = ing.stock;
            
            if (stockForCompare < threshold || ing.stock <= 0) {
                var pack = packSizes[ing.id] || 1;
                deficitIngredients.push({
                    id: ing.id,
                    name: ing.name,
                    unit: ing.unit,
                    currentPrice: ing.currentBuyPrice,
                    stock: ing.stock,
                    threshold: threshold,
                    recommendedQty: pack,
                    step: ing.unit === 'кг' ? 0.1 : 1
                });
            }
        }
        
        if (deficitIngredients.length === 0) return;
        
        var modal = document.getElementById('deficitModal');
        var container = document.getElementById('deficitList');
        
        if (!modal || !container) return;
        
        var html = '<div style="margin-bottom: 10px; font-size: 0.85rem; opacity: 0.8;">Следующие ингредиенты на исходе или закончились:</div>';
        html += '<div style="display: flex; flex-direction: column; gap: 12px;">';
        
        for (var j = 0; j < deficitIngredients.length; j++) {
            var ing = deficitIngredients[j];
            var step = ing.step;
            var defaultQty = ing.recommendedQty;
            var isZero = ing.stock <= 0;
            
            html += '<div class="deficit-item" data-id="' + ing.id + '" style="background: var(--stat-bg); border-radius: 16px; padding: 12px; border-left: 4px solid ' + (isZero ? '#ff4444' : '#ff9900') + ';">';
            html += '<div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; margin-bottom: 8px;">';
            html += '<div><strong>' + this.escapeHtml(ing.name) + '</strong>';
            html += '<span style="font-size: 0.7rem; margin-left: 8px; ' + (isZero ? 'color:#ff4444' : 'color:#ff9900') + '">' + (isZero ? '❌ закончился' : '⚠️ осталось: ' + Game.formatIngredient(ing.stock) + ' ' + ing.unit) + '</span></div>';
            html += '<div style="font-size: 0.7rem;">💰 ' + Game.formatMoney(ing.currentPrice) + ' ₽/' + ing.unit + '</div>';
            html += '</div>';
            html += '<div style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">';
            html += '<div style="display: flex; align-items: center; gap: 5px;"><span style="font-size: 0.7rem;">Кол-во:</span><input type="number" id="deficit_qty_' + ing.id + '" value="' + defaultQty + '" step="' + step + '" style="width: 80px; padding: 4px; text-align: center;"><span style="font-size: 0.7rem;">' + ing.unit + '</span></div>';
            html += '<div style="display: flex; align-items: center; gap: 5px;"><span style="font-size: 0.7rem;">Цена/ед:</span><input type="number" id="deficit_price_' + ing.id + '" value="' + ing.currentPrice + '" step="10" style="width: 80px; padding: 4px; text-align: center;"><span style="font-size: 0.7rem;">₽</span></div>';
            html += '<button class="btn-sm btn-green buy-deficit-single" data-id="' + ing.id + '" data-name="' + ing.name + '" data-unit="' + ing.unit + '">💰 Купить</button>';
            html += '</div>';
            html += '<div id="deficit_msg_' + ing.id + '" style="font-size: 0.7rem; margin-top: 5px; color: var(--accent);"></div>';
            html += '</div>';
        }
        
        html += '<div style="margin-top: 5px; font-size: 0.7rem; opacity: 0.7;">💡 Подсказка: можно изменить количество и цену перед покупкой</div>';
        html += '</div>';
        
        container.innerHTML = html;
        modal.classList.add('active');
        
        var self = this;
        document.querySelectorAll('.buy-deficit-single').forEach(function(btn) {
            btn.onclick = async function() {
                var id = this.dataset.id;
                var name = this.dataset.name;
                var unit = this.dataset.unit;
                var qtyInput = document.getElementById('deficit_qty_' + id);
                var priceInput = document.getElementById('deficit_price_' + id);
                
                var qty = parseFloat(qtyInput.value);
                var price = parseFloat(priceInput.value);
                
                if (isNaN(qty) || qty <= 0) {
                    var msgDiv = document.getElementById('deficit_msg_' + id);
                    if (msgDiv) msgDiv.innerHTML = '<span style="color: #ff4444;">❌ Введите корректное количество</span>';
                    return;
                }
                
                if (isNaN(price) || price <= 0) {
                    var msgDiv = document.getElementById('deficit_msg_' + id);
                    if (msgDiv) msgDiv.innerHTML = '<span style="color: #ff4444;">❌ Введите корректную цену</span>';
                    return;
                }
                
                var cost = price * qty;
                
                if (Game.state.balance < cost) {
                    var msgDiv = document.getElementById('deficit_msg_' + id);
                    if (msgDiv) msgDiv.innerHTML = '<span style="color: #ff4444;">❌ Недостаточно средств! Нужно ' + Game.formatMoney(cost) + ' ₽</span>';
                    return;
                }
                
                var ing = Game.state.ingredients.find(function(i) { return i.id === id; });
                if (ing) {
                    var oldPrice = ing.currentBuyPrice;
                    ing.currentBuyPrice = price;
                    await Game.purchaseIngredient(id, qty);
                    ing.currentBuyPrice = oldPrice;
                    
                    var msgDiv = document.getElementById('deficit_msg_' + id);
                    if (msgDiv) msgDiv.innerHTML = '<span style="color: #6fbf4c;">✅ Куплено ' + qty + ' ' + unit + ' за ' + Game.formatMoney(cost) + ' ₽</span>';
                    setTimeout(function() { if (msgDiv) msgDiv.innerHTML = ''; }, 3000);
                    
                    self.renderIngredients(Game.state);
                    self.updateFinanceUI(Game.state);
                    
                    setTimeout(function() {
                        var stillDeficit = false;
                        for (var k = 0; k < Game.state.ingredients.length; k++) {
                            var ingChk = Game.state.ingredients[k];
                            var threshold = ingChk.alertThreshold || (ingChk.type === 'ingredient' ? 1 : 100);
                            var stockCompare = ingChk.stock;
                            if (stockCompare < threshold || ingChk.stock <= 0) {
                                stillDeficit = true;
                                break;
                            }
                        }
                        if (!stillDeficit) {
                            modal.classList.remove('active');
                        }
                    }, 500);
                }
            };
        });
        
        var buySelectedBtn = document.getElementById('buySelectedDeficitBtn');
        if (buySelectedBtn) {
            var newBtn = buySelectedBtn.cloneNode(true);
            buySelectedBtn.parentNode.replaceChild(newBtn, buySelectedBtn);
            
            newBtn.onclick = async function() {
                var totalCost = 0;
                var purchases = [];
                
                for (var p = 0; p < deficitIngredients.length; p++) {
                    var ing = deficitIngredients[p];
                    var qtyInput = document.getElementById('deficit_qty_' + ing.id);
                    var priceInput = document.getElementById('deficit_price_' + ing.id);
                    
                    var qty = parseFloat(qtyInput ? qtyInput.value : 0);
                    var price = parseFloat(priceInput ? priceInput.value : 0);
                    
                    if (!isNaN(qty) && qty > 0 && !isNaN(price) && price > 0) {
                        var cost = price * qty;
                        totalCost += cost;
                        purchases.push({ id: ing.id, name: ing.name, qty: qty, price: price, cost: cost, unit: ing.unit });
                    }
                }
                
                if (purchases.length === 0) {
                    self.showAutoMessage('❌ Нет выбранных товаров для покупки', 'error');
                    return;
                }
                
                if (Game.state.balance < totalCost) {
                    self.showAutoMessage('❌ Недостаточно средств! Нужно ' + Game.formatMoney(totalCost) + ' ₽', 'error');
                    return;
                }
                
                if (!confirm('Купить всё выбранное на сумму ' + Game.formatMoney(totalCost) + ' ₽?')) return;
                
                for (var r = 0; r < purchases.length; r++) {
                    var pItem = purchases[r];
                    var ing = Game.state.ingredients.find(function(i) { return i.id === pItem.id; });
                    if (ing) {
                        var oldPrice = ing.currentBuyPrice;
                        ing.currentBuyPrice = pItem.price;
                        await Game.purchaseIngredient(pItem.id, pItem.qty);
                        ing.currentBuyPrice = oldPrice;
                    }
                }
                
                self.showAutoMessage('✅ Куплено ' + purchases.length + ' товаров на сумму ' + Game.formatMoney(totalCost) + ' ₽', 'success');
                self.renderIngredients(Game.state);
                self.updateFinanceUI(Game.state);
                
                modal.classList.remove('active');
            };
        }
        
        var closeBtn = document.getElementById('closeDeficitModal');
        if (closeBtn) {
            closeBtn.onclick = function() {
                modal.classList.remove('active');
            };
        }
    }
};