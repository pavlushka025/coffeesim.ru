import { Game } from './game.js';

export const Charts = {
    chart: null,

    renderStatsAndChart(state) {
        const filtered = Game.getFilteredData(state, Game.activeFilter);
        const statBody = document.getElementById('statBody');
        if (statBody) {
            let periodName = 'Период';
            if (Game.activeFilter === 'day') periodName = 'Сегодня';
            else if (Game.activeFilter === 'week') periodName = 'Неделя';
            else if (Game.activeFilter === 'month') periodName = 'Месяц';
            else if (Game.activeFilter === 'year') periodName = 'Год';
            
            statBody.innerHTML = `
                <tr>
                    <td>${periodName}</td>
                    <td>${Game.formatMoney(filtered.income)} ₽</td>
                    <td>${Game.formatMoney(filtered.expense)} ₽</td>
                    <td style="color:${filtered.profit >= 0 ? 'var(--positive)' : 'var(--negative)'}">${Game.formatMoney(filtered.profit)} ₽</td>
                    <td>🥤 ${filtered.cups} шт</td>
                </tr>
            `;
        }
        this.updateChartData(state);
    },

    updateChartData(state) {
        const now = new Date();
        let labels = [], incomeData = [], expenseData = [];

        if (Game.activeFilter === 'day') {
            const currentHour = now.getHours();
            for (let i = 0; i <= currentHour; i++) {
                labels.push(i + ':00');
                incomeData.push(0);
                expenseData.push(0);
            }
            const history = state.transactionHistory || [];
            for (let i = 0; i < history.length; i++) {
                const t = history[i];
                const tDate = new Date(t.timestamp);
                if (tDate.toDateString() === now.toDateString()) {
                    const h = tDate.getHours();
                    if (h <= currentHour) {
                        if (t.category === 'income') incomeData[h] += t.amount;
                        else if (t.category === 'expense') expenseData[h] += t.amount;
                    }
                }
            }
        } else if (Game.activeFilter === 'week') {
            // Начинаем с понедельника
            const days = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
            const dayOfWeek = now.getDay(); // 0 = воскресенье
            const startOfWeek = new Date(now);
            const diff = (dayOfWeek === 0 ? 6 : dayOfWeek - 1);
            startOfWeek.setDate(now.getDate() - diff);
            startOfWeek.setHours(0, 0, 0, 0);
            
            // Показываем все 7 дней недели
            for (let i = 0; i < 7; i++) {
                labels.push(days[i]);
                incomeData.push(0);
                expenseData.push(0);
            }
            
            const history = state.transactionHistory || [];
            for (let i = 0; i < history.length; i++) {
                const t = history[i];
                const tDate = new Date(t.timestamp);
                const weekStart = new Date(startOfWeek);
                const weekEnd = new Date(startOfWeek);
                weekEnd.setDate(startOfWeek.getDate() + 7);
                
                if (tDate >= weekStart && tDate < weekEnd) {
                    let dayIndex = tDate.getDay();
                    // Конвертируем: пн=0, вт=1, ..., вс=6
                    dayIndex = dayIndex === 0 ? 6 : dayIndex - 1;
                    if (dayIndex >= 0 && dayIndex < 7) {
                        if (t.category === 'income') incomeData[dayIndex] += t.amount;
                        else if (t.category === 'expense') expenseData[dayIndex] += t.amount;
                    }
                }
            }
        } else if (Game.activeFilter === 'month') {
            const currentDate = now.getDate();
            const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
            const endDay = Math.min(currentDate, daysInMonth);
            for (let i = 1; i <= endDay; i++) {
                labels.push(i);
                incomeData.push(0);
                expenseData.push(0);
            }
            const history = state.transactionHistory || [];
            for (let i = 0; i < history.length; i++) {
                const t = history[i];
                const tDate = new Date(t.timestamp);
                if (tDate.getMonth() === now.getMonth() && tDate.getFullYear() === now.getFullYear()) {
                    const d = tDate.getDate() - 1;
                    if (d < endDay) {
                        if (t.category === 'income') incomeData[d] += t.amount;
                        else if (t.category === 'expense') expenseData[d] += t.amount;
                    }
                }
            }
        } else if (Game.activeFilter === 'year') {
            const currentMonth = now.getMonth();
            const months = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];
            for (let i = 0; i <= currentMonth; i++) {
                labels.push(months[i]);
                incomeData.push(0);
                expenseData.push(0);
            }
            const history = state.transactionHistory || [];
            for (let i = 0; i < history.length; i++) {
                const t = history[i];
                const tDate = new Date(t.timestamp);
                if (tDate.getFullYear() === now.getFullYear()) {
                    const m = tDate.getMonth();
                    if (m <= currentMonth) {
                        if (t.category === 'income') incomeData[m] += t.amount;
                        else if (t.category === 'expense') expenseData[m] += t.amount;
                    }
                }
            }
        }
        
        const hasNonZero = incomeData.some(v => v !== 0) || expenseData.some(v => v !== 0);
        const ctx = document.getElementById('financeChart')?.getContext('2d');
        if (!ctx) return;
        
        if (!hasNonZero) {
            if (this.chart) {
                this.chart.destroy();
                this.chart = null;
            }
            ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
            ctx.font = '14px sans-serif';
            ctx.fillStyle = '#888';
            ctx.textAlign = 'center';
            ctx.fillText('Нет данных за выбранный период', ctx.canvas.width / 2, ctx.canvas.height / 2);
            return;
        }
        
        const profitData = incomeData.map((v, i) => v - expenseData[i]);
        
        if (this.chart) {
            this.chart.data.labels = labels;
            this.chart.data.datasets[0].data = incomeData;
            this.chart.data.datasets[1].data = expenseData;
            this.chart.data.datasets[2].data = profitData;
            this.chart.update();
        } else {
            this.chart = new Chart(ctx, {
                data: {
                    labels: labels,
                    datasets: [
                        { label: 'Доход', data: incomeData, type: 'bar', backgroundColor: '#4d7a4a', borderColor: '#2d5a2a', borderWidth: 1, borderRadius: 4 },
                        { label: 'Расход', data: expenseData, type: 'bar', backgroundColor: '#9e4a3a', borderColor: '#7a3a2a', borderWidth: 1, borderRadius: 4 },
                        { label: 'Прибыль', data: profitData, type: 'line', borderColor: '#e0a45e', backgroundColor: 'rgba(224, 164, 94, 0.1)', borderWidth: 3, tension: 0.3, fill: true, pointBackgroundColor: '#e0a45e', pointBorderColor: '#c27e3a' }
                    ]
                },
                options: { 
                    responsive: true, 
                    maintainAspectRatio: true,
                    plugins: {
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    return context.dataset.label + ': ' + Game.formatMoney(context.raw) + ' ₽';
                                }
                            }
                        }
                    }
                }
            });
        }
    },

    updateDrinksChartAndTable(sales) {
        const drinksTableContainer = document.getElementById('drinksStatsTable');
        if (!drinksTableContainer) return;
        
        const entries = Object.entries(sales);
        if (entries.length === 0) {
            drinksTableContainer.innerHTML = '<div style="text-align:center; padding:20px;">Нет продаж за выбранный период</div>';
            return;
        }
        
        entries.sort((a, b) => b[1] - a[1]);
        
        const totalSales = entries.reduce((sum, [, count]) => sum + count, 0);
        
        let html = '<div style="display:flex; flex-direction:column; gap:8px;">';
        
        for (let [name, count] of entries) {
            name = name.replace(/\s*\(эквайринг:\s*[\d.]+ ₽\)/g, '');
            const percent = totalSales > 0 ? (count / totalSales * 100).toFixed(1) : 0;
            
            html += `
                <div style="background:var(--stat-bg); border-radius:12px; padding:8px 12px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
                    <div style="font-weight:500; font-size:0.85rem;">🍵 ${escapeHtml(name)}</div>
                    <div style="display:flex; gap:12px; align-items:center;">
                        <span style="font-weight:bold; font-size:0.8rem;">${count} шт</span>
                        <span style="font-size:0.7rem; opacity:0.7;">${percent}%</span>
                    </div>
                </div>
            `;
        }
        
        html += '</div>';
        drinksTableContainer.innerHTML = html;
    }
};

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m] || m));
}