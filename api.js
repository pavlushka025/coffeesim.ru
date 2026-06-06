export const API = {
    async call(url, method, body) {
        const res = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: body ? JSON.stringify(body) : undefined,
            cache: 'no-cache'
        });
        if (!res.ok) {
            const errorText = await res.text();
            throw new Error(errorText || `Ошибка ${res.status}`);
        }
        return res.json();
    },

    async loadGame() {
        const res = await fetch('load_game.php?' + Date.now(), {
            method: 'GET',
            cache: 'no-cache',
            headers: {
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache'
            }
        });
        if (!res.ok) {
            throw new Error(`Ошибка ${res.status}`);
        }
        return res.json();
    },

    async saveGameState(state) {
        const res = await fetch('save_game.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ state: state }),
            cache: 'no-cache'
        });
        if (!res.ok) throw new Error(`Ошибка ${res.status}`);
        return res.json();
    },

    async purchaseIngredient(ingId, quantity) {
        return await this.call('purchase_ingredient.php', 'POST', { ing_id: ingId, quantity: quantity });
    },

    async updateIngredientPrice(ingId, newPrice) {
        return await this.call('update_ingredient_price.php', 'POST', { ing_id: ingId, price: newPrice });
    },

    async updateIngredientThreshold(ingId, threshold) {
        return await this.call('update_threshold.php', 'POST', { ing_id: ingId, threshold: threshold });
    },

    async deleteIngredient(ingId) {
        return await this.call('delete_ingredient.php', 'POST', { ing_id: ingId });
    },

    async addIngredient(name, costPerUnit, unit, type) {
        return await this.call('add_ingredient.php', 'POST', { name: name, cost_per_unit: costPerUnit, unit: unit, type: type });
    },

    async updateDrinkPrice(drinkId, newPrice) {
        return await this.call('update_drink_price.php', 'POST', { drink_id: drinkId, price: newPrice });
    },

    async updateDrinkRecipe(drinkId, recipe) {
        return await this.call('update_drink_recipe.php', 'POST', { drink_id: drinkId, recipe: recipe });
    },

    async deleteDrink(drinkId) {
        return await this.call('delete_drink.php', 'POST', { drink_id: drinkId });
    },

    async addDrink(name, price) {
        return await this.call('add_drink.php', 'POST', { name: name, price: price });
    },

    async buyMachine(name, price, rent, useCredit, months) {
        return await this.call('buy_machine.php', 'POST', { 
            name: name, 
            price: price, 
            rent: rent, 
            use_credit: useCredit || false, 
            months: months || 6 
        });
    },

    async renameMachine(machineId, newName) {
        return await this.call('rename_machine.php', 'POST', { machine_id: machineId, name: newName });
    },

    async changeMachineRent(machineId, newRent) {
        return await this.call('change_rent.php', 'POST', { machine_id: machineId, rent: newRent });
    },

    async updateTax(percent) {
        return await this.call('update_tax.php', 'POST', { percent: percent });
    },

    async resetGame(startBalance) {
        return await this.call('reset_game.php', 'POST', { start_balance: startBalance });
    },

    async clearLogs() {
        return await this.call('clear_logs.php', 'POST', {});
    },

    async login(username, password) {
        const data = await this.call('login.php', 'POST', { username: username, password: password });
        if (!data.success) throw new Error(data.error);
        return true;
    },

    async register(username, password, ref) {
        let url = 'register.php';
        if (ref) {
            url += '?ref=' + encodeURIComponent(ref);
        }
        const data = await this.call(url, 'POST', { username: username, password: password });
        if (!data.success) throw new Error(data.error);
        return true;
    },

    async logout() {
        await this.call('logout.php', 'GET');
    },

    async checkSession() {
        try {
            const data = await this.call('check_session.php', 'GET');
            return data.logged_in === true;
        } catch (e) {
            return false;
        }
    },

    async addSuggestion(message) {
        return await this.call('add_suggestion.php', 'POST', { message });
    },

    async getSuggestions() {
        return await this.call('get_suggestions.php', 'GET');
    },

    async updateSuggestionStatus(id, status) {
        return await this.call('update_suggestion_status.php', 'POST', { id, status });
    },

    async deleteSuggestion(id) {
        return await this.call('delete_suggestion.php', 'POST', { id });
    },

    async getContacts() {
        return await this.call('get_contacts.php', 'GET');
    },

    async getReferralStats() {
        return await this.call('get_referral_stats.php', 'GET');
    }
};