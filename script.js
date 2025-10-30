document.addEventListener('DOMContentLoaded', () => {
    // --- Sidenav Menu Logic ---
    const menuToggleBtn = document.getElementById('menu-toggle-btn');
    const sidenav = document.getElementById('sidenav-controls');
    const overlay = document.getElementById('menu-overlay');
    const desktopControlsContainer = document.querySelector('.desktop-controls');
    const sidenavControlsContent = document.querySelector('.sidenav');
    desktopControlsContainer.innerHTML = sidenavControlsContent.innerHTML;
    function openMenu() { sidenav.classList.add('open'); overlay.classList.add('show'); }
    function closeMenu() { sidenav.classList.remove('open'); overlay.classList.remove('show'); }
    menuToggleBtn.addEventListener('click', openMenu);
    overlay.addEventListener('click', closeMenu);
    
    // --- Configuration (NO API KEY) ---
    const PUBLISHED_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRny6z0kXP2O7d1Yl4tUk0m9J-vo-Ebw72MZIm5Nq2veCqFu18F-0Wgj06XeKyhABjbG1jQmWyQd-Sa/pub?gid=1542294647&single=true&output=csv';

    // --- HTML Elements ---
    const daySelects = document.querySelectorAll('#day-select');
    const classSelects = document.querySelectorAll('#class-select');
    const shiftSelects = document.querySelectorAll('#shift-select');
    const scheduleTableContainer = document.getElementById('schedule-table-container');
    const classNameDisplay = document.getElementById('class-name-display');
    const memberCountDisplay = document.getElementById('member-count');
    const classCountDisplay = document.getElementById('class-count-display');
    const loader = document.getElementById('loader');
    const downloadBtns = document.querySelectorAll('.download-pdf-btn');

    // --- Data Storage ---
    let fullData = [];
    let classInfo = {};

    async function fetchSheetData() {
        loader.style.display = 'block';
        classSelects.forEach(sel => sel.disabled = true);
        clearOutput();
        try {
            const response = await fetch(PUBLISHED_CSV_URL);
            if (!response.ok) throw new Error(`Network response was not ok: ${response.statusText}`);
            const csvText = await response.text();
            const allRows = csvText.split(/\r?\n/).map(row => row.split(','));
            const dataRows = allRows.slice(8);
            processData(dataRows);
            const dayMap = ['AI', 'AC', 'AD', 'AE', 'AF', 'AG', 'AH'];
            const todayIndex = new Date().getDay();
            const todayValue = dayMap[todayIndex];
            daySelects.forEach(sel => sel.value = todayValue);
            classSelects.forEach(sel => sel.value = 'all');
            shiftSelects.forEach(sel => sel.value = 'all');
            displaySchedule();
        } catch (error) {
            console.error('Failed to fetch or process data:', error);
            scheduleTableContainer.innerHTML = `<p style="color: red;"><strong>มีปัญหาในการดึงข้อมูล:</strong> ${error.message}.</p>`;
        } finally {
            loader.style.display = 'none';
        }
    }

    function processData(dataRows) {
        fullData = [];
        const classAggregator = {};
        dataRows.forEach(row => {
            const personName = row[11];
            const className = row[17];
            if (className && personName) {
                if (!classAggregator[className]) classAggregator[className] = { count: 0 };
                classAggregator[className].count++;
                fullData.push({
                    personName, className,
                    schedules: { AC: row[28] || '-', AD: row[29] || '-', AE: row[30] || '-', AF: row[31] || '-', AG: row[32] || '-', AH: row[33] || '-', AI: row[34] || '-' }
                });
            }
        });
        classInfo = classAggregator;
        populateClassDropdown();
    }
    
    function populateClassDropdown() {
        const optionsHTML = `
            <option value="" disabled>-- សូម​ជ្រើសរើស --</option>
            <option value="all">គ្រប់ថ្នាក់</option>
            ${Object.keys(classInfo).sort().map(name => `<option value="${name}">${name}</option>`).join('')}
        `;
        classSelects.forEach(sel => { sel.innerHTML = optionsHTML; sel.disabled = false; });
    }

    function displaySchedule(event) {
        if (event) {
            const source = event.target;
            const value = source.value;
            const selectorId = '#' + source.id;
            document.querySelectorAll(selectorId).forEach(sel => { if (sel !== source) sel.value = value; });
        }
        
        const selectedDay = daySelects[0].value;
        const selectedClass = classSelects[0].value;
        const selectedShift = shiftSelects[0].value;

        if (window.innerWidth <= 768 && event) closeMenu();
        if (!selectedDay || !selectedClass) { clearOutput(); return; }
        
        let tableHTML = '';
        let baseData = fullData.filter(item => item.schedules[selectedDay] && item.schedules[selectedDay].trim() !== '-');
        
        let filteredByShift = baseData.filter(item => {
            if (selectedShift === 'all') return true;
            
            // --- THE FIX IS HERE ---
            // It now checks if the schedule CONTAINS the selected shift word, instead of an exact match.
            return item.schedules[selectedDay].includes(selectedShift);
        });
        
        if (selectedClass === "all") {
            const totalClasses = Object.keys(classInfo).length;
            classNameDisplay.textContent = `កាលវិភាគសម្រាប់: គ្រប់ថ្នាក់`;
            classCountDisplay.textContent = `ចំនួនថ្នាក់សរុប: ${totalClasses} ថ្នាក់`;
            memberCountDisplay.textContent = `សមាជិកដែលត្រូវវេន: ${filteredByShift.length} នាក់`;
            
            tableHTML = `<table><thead><tr><th>ឈ្មោះ</th><th>ថ្នាក់</th><th>កាលវិភាគ (${daySelects[0].options[daySelects[0].selectedIndex].text})</th></tr></thead><tbody>`;
            filteredByShift.forEach(item => tableHTML += `<tr><td>${item.personName}</td><td>${item.className}</td><td>${item.schedules[selectedDay]}</td></tr>`);
        } else {
            let finalData = filteredByShift.filter(item => item.className === selectedClass);
            classNameDisplay.textContent = `ថ្នាក់: ${selectedClass}`;
            classCountDisplay.textContent = `សមាជិកសរុបក្នុងថ្នាក់: ${classInfo[selectedClass].count} នាក់`;
            memberCountDisplay.textContent = `សមាជិកដែលត្រូវវេន: ${finalData.length} នាក់`;

            tableHTML = `<table><thead><tr><th>ឈ្មោះ</th><th>កាលវិភាគ (${daySelects[0].options[daySelects[0].selectedIndex].text})</th></tr></thead><tbody>`;
            finalData.forEach(item => tableHTML += `<tr><td>${item.personName}</td><td>${item.schedules[selectedDay]}</td></tr>`);
        }
        
        let finalDataForCheck = (selectedClass === 'all') ? filteredByShift : filteredByShift.filter(item => item.className === selectedClass);

        if (finalDataForCheck.length === 0) {
           tableHTML += `<tr><td colspan="${(selectedClass === 'all') ? 3 : 2}">មិន​មាន​កាលវិភាគ​សម្រាប់​វេន​នេះ</td></tr>`;
        }
        
        tableHTML += `</tbody></table>`;
        scheduleTableContainer.innerHTML = tableHTML;
        downloadBtns.forEach(btn => btn.style.display = 'block');
    }

    function clearOutput() {
        scheduleTableContainer.innerHTML = ''; classNameDisplay.textContent = '';
        classCountDisplay.textContent = ''; memberCountDisplay.textContent = '';
        downloadBtns.forEach(btn => btn.style.display = 'none');
    }

    function downloadPDF() {
        const element = document.getElementById('schedule-output');
        const selectedClass = classSelects[0].value;
        const selectedDayText = daySelects[0].options[daySelects[0].selectedIndex].text;
        let filename = (selectedClass === 'all') 
            ? `កាលវិភាគ-គ្រប់ថ្នាក់-${selectedDayText}.pdf`
            : `កាលវិភាគ-${selectedClass}-${selectedDayText}.pdf`;
        const opt = {
          margin: 1, filename: filename, image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true },
          jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
        };
        downloadBtns.forEach(btn => btn.style.display = 'none');
        html2pdf().from(element).set(opt).save().then(() => {
            downloadBtns.forEach(btn => btn.style.display = 'block');
        });
    }

    // --- Event Listeners ---
    daySelects.forEach(sel => sel.addEventListener('change', displaySchedule));
    classSelects.forEach(sel => sel.addEventListener('change', displaySchedule));
    shiftSelects.forEach(sel => sel.addEventListener('change', displaySchedule));
    downloadBtns.forEach(btn => btn.addEventListener('click', downloadPDF));

    fetchSheetData();
});
