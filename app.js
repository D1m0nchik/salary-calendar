// Налаштування розрахунків за замовчуванням
const SETTINGS = {
    taxRatePercent: 19.5,    // 18% ПДФО + 1.5% Військовий збір
    overtimeThreshold: 8,    // Нормальний робочий день — 8 годин
    overtimeMultiplier: 1.5  // Понаднормовий коефіцієнт 1.5х
};

// Ініціалізація бази даних у браузері (LocalStorage)
let workDays = JSON.parse(localStorage.getItem('salary_calendar_days')) || [];

// Елементи інтерфейсу
const calendarScreen = document.getElementById('calendar-screen');
const reportsScreen = document.getElementById('reports-screen');
const tabCalendar = document.getElementById('tab-calendar');
const tabReports = document.getElementById('tab-reports');
const btnAddDemo = document.getElementById('btn-add-demo');
const startDateInput = document.getElementById('start-date');
const endDateInput = document.getElementById('end-date');

// Функція збереження даних у пам'ять телефону
function saveToStorage() {
    localStorage.setItem('salary_calendar_days', JSON.stringify(workDays));
    calculateAndRender();
}

// Перемикання екранів (вкладок)
tabCalendar.addEventListener('click', () => {
    calendarScreen.classList.remove('hidden');
    reportsScreen.classList.add('hidden');
    tabCalendar.className = "flex flex-col items-center justify-center text-blue-600 font-bold w-1/2 py-1 cursor-pointer";
    tabReports.className = "flex flex-col items-center justify-center text-gray-400 w-1/2 py-1 cursor-pointer";
});

tabReports.addEventListener('click', () => {
    reportsScreen.classList.remove('hidden');
    calendarScreen.classList.add('hidden');
    tabReports.className = "flex flex-col items-center justify-center text-blue-600 font-bold w-1/2 py-1 cursor-pointer";
    tabCalendar.className = "flex flex-col items-center justify-center text-gray-400 w-1/2 py-1 cursor-pointer";
});

// Додавання тестової зміни
btnAddDemo.addEventListener('click', () => {
    const today = new Date().toISOString().split('T')[0];
    
    // Перевірка на дублікат
    if (workDays.some(d => d.date === today)) {
        alert("Зміну на сьогодні вже додано!");
        return;
    }

    const newShift = {
        date: today,
        dayType: 'WORK',
        startTime: '08:00',
        endTime: '18:00', // 10 годин (2 години понаднормових)
        hourlyRate: 150,  // 150 грн/год
        bonus: 200,       // Премія 200 грн
        deduction: 0,
        notes: 'Автоматична зміна'
    };

    workDays.push(newShift);
    saveToStorage();
});

// Логіка підрахунку фінансів
function calculateAndRender() {
    const startFilter = startDateInput.value;
    const endFilter = endDateInput.value;

    let totalDaysWorked = 0;
    let totalHoursWorked = 0;
    let grossSalary = 0;
    let overtimePay = 0;

    workDays.forEach(day => {
        // Фільтрація по обраним датам
        if (startFilter && day.date < startFilter) return;
        if (endFilter && day.date > endFilter) return;

        if (day.dayType === 'WORK') {
            totalDaysWorked++;

            if (day.startTime && day.endTime) {
                const [startH, startM] = day.startTime.split(':').map(Number);
                const [endH, endM] = day.endTime.split(':').map(Number);
                
                let hours = (endH + endM / 60) - (startH + startM / 60);
                if (hours < 0) hours += 24; // Нічна зміна

                totalHoursWorked += hours;

                if (hours > SETTINGS.overtimeThreshold) {
                    const regularHours = SETTINGS.overtimeThreshold;
                    const overtimeHours = hours - SETTINGS.overtimeThreshold;
                    
                    const regularPay = regularHours * day.hourlyRate;
                    const currentOvertimePay = overtimeHours * day.hourlyRate * SETTINGS.overtimeMultiplier;
                    
                    grossSalary += (regularPay + currentOvertimePay);
                    overtimePay += currentOvertimePay;
                } else {
                    grossSalary += (hours * day.hourlyRate);
                }
            }
            grossSalary += Number(day.bonus || 0);
            grossSalary -= Number(day.deduction || 0);
        }
    });

    const taxAmount = grossSalary * (SETTINGS.taxRatePercent / 100);
    const netSalary = grossSalary - taxAmount;

    // Виведення результатів на екран
    document.getElementById('stat-days').innerText = totalDaysWorked;
    document.getElementById('stat-hours').innerText = `${totalHoursWorked.toFixed(1)} год.`;
    document.getElementById('stat-gross').innerText = `${grossSalary.toFixed(2)} ₴`;
    document.getElementById('stat-net').innerText = `${netSalary.toFixed(2)} ₴`;
    document.getElementById('stat-overtime').innerText = `${overtimePay.toFixed(2)} ₴`;
}

// Слідкуємо за зміною фільтру дат
startDateInput.addEventListener('change', calculateAndRender);
endDateInput.addEventListener('change', calculateAndRender);

// Перший запуск розрахунку при завантаженні сторінки
calculateAndRender();
