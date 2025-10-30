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
    
    // --- ការ​កំណត់​ค่า ---
    const API_KEY = 'AIzaSyANp_N7Jtj8EKeBQCYj9Kq4L6pZw-kodko';
    const SPREADSHEET_ID = '1eRyPoifzyvB4oBmruNyXcoKMKPRqjk6xDD6-bPNW6pc';
    const SHEET_NAME = 'DIList';

    // --- ធាតុ​ HTML ---
    const daySelects = document.querySelectorAll('#day-select');
    const classSelects = document.querySelectorAll('#class-select');
    const scheduleTableContainer = document.getElementById('schedule-table-container');
    const classNameDisplay = document.getElementById('class-name-display');
    const memberCountDisplay = document.getElementById('member-count');
    const classCountDisplay = document.getElementById('class-count-display');
    const loader = document.getElementById('loader');
    const downloadBtns = document.querySelectorAll('.download-pdf-btn');

    // --- កន្លែង​ផ្ទុក​ទិន្នន័យ ---
    let fullData = [];
    let classInfo = {};

    async function fetchSheetData() {
        loader.style.display = 'block';
        classSelects.forEach(sel => sel.disabled = true);
        clearOutput();
        const ranges = [`${SHEET_NAME}!L9:L381`, `${SHEET_NAME}!R9:R381`, `${SHEET_NAME}!AC9:AI381`];
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values:batchGet?ranges=${ranges.join('&ranges=')}&key=${API_KEY}`;
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`Error ${response.status}: ${response.statusText}`);
            const json = await response.json();
            processData(json.valueRanges[0].values || [], json.valueRanges[1].values || [], json.valueRanges[2].values || []);

            // --- START: NEW LOGIC TO DISPLAY TODAY'S SCHEDULE ON LOAD ---
            const dayMap = ['AI', 'AC', 'AD', 'AE', 'AF', 'AG', 'AH']; // អាទិត្យ=0, ចន្ទ=1...
            const todayIndex = new Date().getDay();
            const todayValue = dayMap[todayIndex];

            // កំណត់ Dropdown ថ្ងៃ ឲ្យ​ត្រូវ​នឹង​ថ្ងៃ​នេះ
            daySelects.forEach(sel => sel.value = todayValue);

            // កំណត់ Dropdown ថ្នាក់ ឲ្យ​ទៅ​ជា "គ្រប់ថ្នាក់" ជា​ค่า​เริ่มต้น
            classSelects.forEach(sel => sel.value = 'all');

            // បន្ទាប់​ពី​កំណត់​ค่า​រួចរាល់ សូម​สั่ง​ឲ្យ​បង្ហាញ​កាលវិភាគ
            displaySchedule();
            // --- END: NEW LOGIC ---

        } catch (error) {
            console.error('Failed to fetch data:', error);
            scheduleTableContainer.innerHTML = `<p style="color: red;"><strong>มีปัญหาในการดึงข้อมูล:</strong> ${error.message}.</p>`;
        } finally {
            loader.style.display = 'none';
        }
    }

    function processData(nameValues, classValues, scheduleValues) {
        fullData = [];
        const classAggregator = {};
        for (let i = 0; i < classValues.length; i++) {
            const className = classValues[i]?.[0];
            const personName = nameValues[i]?.[0];
            if (className && personName) {
                if (!classAggregator[className]) classAggregator[className] = { count: 0 };
                classAggregator[className].count++;
                const scheduleRow = scheduleValues[i] || [];
                fullData.push({
                    personName, className,
                    schedules: { AC: scheduleRow[0] || '-', AD: scheduleRow[1] || '-', AE: scheduleRow[2] || '-', AF: scheduleRow[3] || '-', AG: scheduleRow[4] || '-', AH: scheduleRow[5] || '-', AI: scheduleRow[6] || '-' }
                });
            }
        }
        classInfo = classAggregator;
        populateClassDropdown();
    }
    
    function populateClassDropdown() {
        const optionsHTML = `
            <option value="" disabled selected>-- សូម​ជ្រើសរើស --</option>
            <option value="all">គ្រប់ថ្នាក់</option>
            ${Object.keys(classInfo).sort().map(name => `<option value="${name}">${name}</option>`).join('')}
        `;
        classSelects.forEach(sel => { sel.innerHTML = optionsHTML; sel.disabled = false; });
    }

    // <<<<<<< CHANGED: Made the 'event' parameter optional
    function displaySchedule(event) { 
        // Sync dropdowns only if a real user event triggered this function
        if (event) {
            const source = event.target;
            const value = source.value;
            const selectorId = '#' + source.id;
            document.querySelectorAll(selectorId).forEach(sel => { if (sel !== source) sel.value = value; });
        }
        
        const selectedDay = daySelects[0].value;
        const selectedClass = classSelects[0].value;

        if (window.innerWidth <= 768 && event) closeMenu(); // Only close menu on user action
        if (!selectedDay || !selectedClass) { clearOutput(); return; }
        
        let tableHTML = '';
        let relevantEntries = [];
        
        if (selectedClass === "all") {
            const totalClasses = Object.keys(classInfo).length;
            classNameDisplay.textContent = `កាលវិភាគសម្រាប់: គ្រប់ថ្នាក់`;
            classCountDisplay.textContent = `ចំនួនថ្នាក់សរុប: ${totalClasses} ថ្នាក់`;
            memberCountDisplay.textContent = `សមាជិកសរុប: ${fullData.length} នាក់`;
            
            tableHTML = `<table><thead><tr><th>ឈ្មោះ</th><th>ថ្នាក់</th><th>កាលវិភាគ (${daySelects[0].options[daySelects[0].selectedIndex].text})</th></tr></thead><tbody>`;
            relevantEntries = fullData.filter(item => item.schedules[selectedDay] && item.schedules[selectedDay].trim() !== '-');
            relevantEntries.forEach(item => tableHTML += `<tr><td>${item.personName}</td><td>${item.className}</td><td>${item.schedules[selectedDay]}</td></tr>`);
        } else {
            classNameDisplay.textContent = `ថ្នាក់: ${selectedClass}`;
            classCountDisplay.textContent = '';
            memberCountDisplay.textContent = `ចំនួនសមាជិក: ${classInfo[selectedClass].count} នាក់`;

            tableHTML = `<table><thead><tr><th>ឈ្មោះ</th><th>កាលវិភាគ (${daySelects[0].options[daySelects[0].selectedIndex].text})</th></tr></thead><tbody>`;
            relevantEntries = fullData.filter(item => item.className === selectedClass && item.schedules[selectedDay] && item.schedules[selectedDay].trim() !== '-');
            relevantEntries.forEach(item => tableHTML += `<tr><td>${item.personName}</td><td>${item.schedules[selectedDay]}</td></tr>`);
        }
        
        if (relevantEntries.length === 0) tableHTML += `<tr><td colspan="${(selectedClass === 'all') ? 3 : 2}">មិន​មាន​កាលវិភាគ​សម្រាប់​ថ្ងៃ​នេះ</td></tr>`;
        tableHTML += `</tbody></table>`;
        scheduleTableContainer.innerHTML = tableHTML;
        downloadBtns.forEach(btn => btn.style.display = 'block');
    }

    function clearOutput() {
        scheduleTableContainer.innerHTML = '';
        classNameDisplay.textContent = '';
        classCountDisplay.textContent = '';
        memberCountDisplay.textContent = '';
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
    downloadBtns.forEach(btn => btn.addEventListener('click', downloadPDF));

    fetchSheetData();
});

