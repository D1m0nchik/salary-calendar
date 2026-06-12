// Конфігурація розрахунків заробітної плати
const SETTINGS = {
    taxRatePercent: 19.5,    // Податки (18% ПДФО + 1.5% Військовий збір)
    overtimeThreshold: 8,    // Стандартна тривалість зміни в годинах
    overtimeMultiplier: 1.5  // Коефіцієнт за переробіток (1.5х)
};

// Українські назви місяців
const MONTH_NAMES = [
    "Січень", "Лютий", "Березень", "Квітень", "Травень", "Червень",
    "Липень", "Серпень", "Вересень", "Жовтень", "Листопад", "Грудень"
];

// Наша база даних у LocalStorage
let workDays = JSON.parse(localStorage.getItem('salary_calendar_days')) || [];

// Поточний перегляд календаря
let currentYear = new Date().getFullYear();
let currentMonth = new Date().getMonth(); // 0-11
let selectedDateStr = "";

// Елементи DOM
const calendarScreen = document.getElementById('calendar-screen');
const reportsScreen = document.getElementById('reports-screen');
const tabCalendar = document.getElementById('tab-calendar');
const tabReports = document.getElementById('tab-reports');
const startDateInput = document.getElementById('start-date');
const endDateInput = document.getElementById('end-date');

// Елементи Календаря
const calendarGrid = document.getElementById('calendar-grid');
const calendarMonthYearText = document.getElementById('calendar-month-year');
const btnPrevMonth = document.getElementById('btn-prev-month');
const btnNextMonth = document.getElementById('btn-next-month');

// Елементи Модального Вікна
const modalEditShift = document.getElementById('modal-edit-shift');
const modalDateTitle = document.getElementById('modal-date-title');
const modalBtnClose = document.getElementById('modal-btn-close');
const modalBtnDelete = document.getElementById('modal-btn-delete');
const shiftForm = document.getElementById('shift-form');
const formDayType = document.getElementById('form-day-type');
const workParamsBlock = document.getElementById('work-params-block');
const formStartTime = document.getElementById('form-start-time');
const formEndTime = document.getElementById('form-end-time');
const formRate = document.getElementById('form-rate');
const formBonus = document.getElementById('form-bonus');
const formNotes = document.getElementById('form-notes');

// НАВІГАЦІЯ: Перемикання вкладок
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
    calculateAndRenderReports();
});

// МОДАЛЬНЕ ВІКНО: Показ/Приховування додаткових полів для робочих днів
formDayType.addEventListener('change', () => {
    if (formDayType.value === 'WORK') {
        workParamsBlock.classList.remove('hidden');
    } else {
        workParamsBlock.classList.add('hidden');
    }
});

// КАЛЕНДАР: Навігація по місяцях
btnPrevMonth.addEventListener('click', () => {
    currentMonth--;
    if (currentMonth < 0) {
        currentMonth = 11;
        currentYear--;
    }
    renderCalendar();
});

btnNextMonth.addEventListener('click', () => {
    currentMonth++;
    if (currentMonth > 11) {
        currentMonth = 0;
        currentYear++;
    }
    renderCalendar();
});

// ГЕНЕРАЦІЯ СІТКИ КАЛЕНДАРЯ
function renderCalendar() {
    calendarGrid.innerHTML = "";
    calendarMonthYearText.innerText = `${MONTH_NAMES[currentMonth]} ${currentYear}`;

    // Визначаємо перший день місяця та кількість днів
    const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay(); // 0 (Нд) - 6 (Сб)
    const totalDaysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    
    // Перетворюємо неділю (0) у 7-й день для нашого Пн-Нд формату
    const startOffset = firstDayIndex === 0 ? 6 : firstDayIndex - 1;

    // Створюємо порожні клітинки для попереднього місяця
    for (let i = 0; i < startOffset; i++) {
        const emptyCell = document.createElement('div');
        calendarGrid.appendChild(emptyCell);
    }

    // Рендеримо самі дні місяця
    for (let day = 1; day <= totalDaysInMonth; day++) {
        const dayCell = document.createElement('div');
        
        // Формуємо рядок дати в ISO форматі (YYYY-MM-DD) з урахуванням локальної таймзони
        const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        
        // Шукаємо, чи є збережені дані для цієї дати
        const dayData = workDays.find(d => d.date === dateStr);

        dayCell.className = "bg-white aspect-square rounded-xl p-1 flex flex-col justify-between items-center text-center border border-gray-100 shadow-xs hover:border-blue-400 active:scale-95 transition-all cursor-pointer relative group";
        
        // Текст номера дня
        const dayNum = document.createElement('span');
        dayNum.innerText = day;
        dayNum.className = "text-sm font-bold text-gray-800";
        dayCell.appendChild(dayNum);

        // Підсвічування кольором та виведення годин, якщо є дані
        if (dayData) {
            if (dayData.dayType === 'WORK') {
                dayCell.classList.add('bg-green-50/70', 'border-green-200');
                dayNum.classList.add('text-green-700');
                
                if (dayData.startTime && dayData.endTime) {
                    const hoursText = document.createElement('span');
                    hoursText.className = "text-xxs font-semibold text-green-600 block";
                    hoursText.innerText = `${dayData.startTime}-${dayData.endTime}`;
                    dayCell.appendChild(hoursText);
                }
            } else if (dayData.dayType === 'OFF') {
                dayCell.classList.add('bg-gray-50', 'border-gray-200');
                dayNum.classList.add('text-gray-400');
            } else if (dayData.dayType === 'VACATION') {
                dayCell.classList.add('bg-blue-50', 'border-blue-200');
                dayNum.classList.add('text-blue-700');
            } else if (dayData.dayType === 'SICK') {
                dayCell.classList.add('bg-yellow-50', 'border-yellow-200');
                dayNum.classList.add('text-yellow-700');
            } else if (dayData.dayType === 'HOLIDAY') {
                dayCell.classList.add('bg-red-50', 'border-red-200');
                dayNum.classList.add('text-red-700');
            }
        }

        // Обробник кліку по дню календаря
        dayCell.addEventListener('click', () => openShiftModal(dateStr));
        calendarGrid.appendChild(dayCell);
    }
}

// ВІДКРИТТЯ ВІКНА РЕДАГУВАННЯ ДНЯ
function openShiftModal(dateStr) {
    selectedDateStr = dateStr;
    
    // Форматуємо дату для заголовка вікна
    const [y, m, d] = dateStr.split('-');
    modalDateTitle.innerText = `${d}.${m}.${y}`;

    // Шукаємо дані дня в сховищі
    const dayData = workDays.find(d => d.date === dateStr);

    if (dayData) {
        formDayType.value = dayData.dayType;
        formStartTime.value = dayData.startTime || "08:00";
        formEndTime.value = dayData.endTime || "17:00";
        formRate.value = dayData.hourlyRate || 150;
        formBonus.value = dayData.bonus || 0;
        formNotes.value = dayData.notes || "";
    } else {
        // Значення за замовчуванням для нового порожнього дня
        formDayType.value = "OFF";
        formStartTime.value = "08:00";
        formEndTime.value = "17:00";
        formRate.value = 150;
        formBonus.value = 0;
        formNotes.value = "";
    }

    // Тригеримо показ блоку годин
    if (formDayType.value === 'WORK') {
        workParamsBlock.classList.remove('hidden');
    } else {
        workParamsBlock.classList.add('hidden');
    }

    modalEditShift.classList.remove('hidden');
}

// ЗАКРИТТЯ МОДАЛЬНОГО ВІКНА
modalBtnClose.addEventListener('click', () => modalEditShift.classList.add('hidden'));

// ЗБЕРЕЖЕННЯ ФОРМИ
shiftForm.addEventListener('submit', (e) => {
    e.preventDefault();

    // Видаляємо стару версію запису для цієї дати, якщо вона існувала
    workDays = workDays.filter(d => d.date !== selectedDateStr);

    const newDayData = {
        date: selectedDateStr,
        dayType: formDayType.value,
        notes: formNotes.value
    };

    if (formDayType.value === 'WORK') {
        newDayData.startTime = formStartTime.value;
        newDayData.endTime = formEndTime.value;
        newDayData.hourlyRate = Number(formRate.value) || 0;
        newDayData.bonus = Number(formBonus.value) || 0;
        newDayData.deduction = 0;
    }

    workDays.push(newDayData);
    localStorage.setItem('salary_calendar_days', JSON.stringify(workDays));
    
    modalEditShift.classList.add('hidden');
    renderCalendar();
});

// СКИНУТИ (ВИДАЛИТИ) ДАНІ ДНЯ
modalBtnDelete.addEventListener('click', () => {
    workDays = workDays.filter(d => d.date !== selectedDateStr);
    localStorage.setItem('salary_calendar_days', JSON.stringify(workDays));
    modalEditShift.classList.add('hidden');
    renderCalendar();
});

// ЗВІТИ: Розрахунок та виведення фінансів за вибраний термін
function calculateAndRenderReports() {
    const startFilter = startDateInput.value;
    const endFilter = endDateInput.value;

    let totalDaysWorked = 0;
    let totalHoursWorked = 0;
    let grossSalary = 0;
    let overtimePay = 0;

    workDays.forEach(day => {
        if (startFilter && day.date < startFilter) return;
        if (endFilter && day.date > endFilter) return;

        if (day.dayType === 'WORK') {
            totalDaysWorked++;

            if (day.startTime && day.endTime) {
                const [startH, startM] = day.startTime.split(':').map(Number);
                const [endH, endM] = day.endTime.split(':').map(Number);
                
                let hours = (endH + endM / 60) - (startH + startM / 60);
                if (hours < 0) hours += 24; 

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

    document.getElementById('stat-days').innerText = totalDaysWorked;
    document.getElementById('stat-hours').innerText = `${totalHoursWorked.toFixed(1)} год.`;
    document.getElementById('stat-gross').innerText = `${grossSalary.toFixed(2)} ₴`;
    document.getElementById('stat-net').innerText = `${netSalary.toFixed(2)} ₴`;
    document.getElementById('stat-overtime').innerText = `${overtimePay.toFixed(2)} ₴`;
}

// Автоматично оновлювати звіт при зміні інпуту дат
startDateInput.addEventListener('change', calculateAndRenderReports);
endDateInput.addEventListener('change', calculateAndRenderReports);

// Старт додатку
renderCalendar();
