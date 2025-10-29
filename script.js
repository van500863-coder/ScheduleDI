document.addEventListener('DOMContentLoaded', () => {

    // --- CONFIGURATION ---
    const SHEET_ID = '1eRyPoifzyvB4oBmruNyXcoKMKPRqjk6xDD6-bPNW6pc';
    const SHEET_NAME = 'DIList';
    const DATA_RANGE = 'L9:AI381'; 
    
    // --- DOM ELEMENTS ---
    const daySelect = document.getElementById('day-select');
    const shiftSelect = document.getElementById('shift-select');
    const classSelect = document.getElementById('class-select');
    const scheduleContainer = document.getElementById('schedule-table-container');
    const entryCountEl = document.getElementById('entry-count');
    const classCountEl = document.getElementById('class-count');
    const downloadBtn = document.getElementById('download-pdf-btn');
    const loader = document.getElementById('loader');

    // --- GLOBAL STATE ---
    let fullData = [];

    // --- COLUMN MAPPING ---
    const columnMap = {
        'ឈ្មោះ': 0, 'ថ្នាក់': 6, 'AC': 17, 'AD': 18, 'AE': 19, 'AF': 20, 'AG': 21, 'AH': 22, 'AI': 23
    };
    
    const dayNames = {
        'AC': 'ថ្ងៃចន្ទ', 'AD': 'ថ្ងៃអង្គារ៍', 'AE': 'ថ្ងៃពុធ', 'AF': 'ថ្ងៃព្រហស្បតិ៍',
        'AG': 'ថ្ងៃសុក្រ', 'AH': 'ថ្ងៃសៅរ៍', 'AI': 'ថ្ងៃអាទិត្យ'
    };


    async function fetchData() {
        loader.style.display = 'block';
        scheduleContainer.innerHTML = '';

        const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=${SHEET_NAME}&range=${DATA_RANGE}`;

        try {
            const response = await fetch(url);
            let text = await response.text();
            
            const jsonString = text.match(/google\.visualization\.Query\.setResponse\((.*)\)/s)[1];
            const data = JSON.parse(jsonString);

            fullData = data.table.rows.map(row => {
                const nameValue = row.c[columnMap['ឈ្មោះ']] ? row.c[columnMap['ឈ្មោះ']].v : null;
                const classValue = row.c[columnMap['ថ្នាក់']] ? row.c[columnMap['ថ្នាក់']].v : null;
                
                if (!nameValue || !classValue) return null;

                return {
                    studentName: nameValue,
                    className: classValue,
                    schedule: {
                        'AC': row.c[columnMap['AC']] ? row.c[columnMap['AC']].v : '---',
                        'AD': row.c[columnMap['AD']] ? row.c[columnMap['AD']].v : '---',
                        'AE': row.c[columnMap['AE']] ? row.c[columnMap['AE']].v : '---',
                        'AF': row.c[columnMap['AF']] ? row.c[columnMap['AF']].v : '---',
                        'AG': row.c[columnMap['AG']] ? row.c[columnMap['AG']].v : '---',
                        'AH': row.c[columnMap['AH']] ? row.c[columnMap['AH']].v : '---',
                        'AI': row.c[columnMap['AI']] ? row.c[columnMap['AI']].v : '---',
                    }
                };
            }).filter(item => item !== null);

            populateClassDropdown();

        } catch (error) {
            console.error('Error fetching data:', error);
            scheduleContainer.innerHTML = `<p style="color: red; text-align: center;">Error: មិនអាចទាញទិន្នន័យបានទេ។</p>`;
        } finally {
            loader.style.display = 'none';
        }
    }

    function populateClassDropdown() {
        const selectedDay = daySelect.value;
        const selectedShift = shiftSelect.value;
        let availableClasses = new Set(); 

        if (selectedShift === 'all') {
            fullData.forEach(item => availableClasses.add(item.className));
        } else {
            fullData.forEach(item => {
                if (item.schedule[selectedDay] === selectedShift) {
                    availableClasses.add(item.className);
                }
            });
        }
        
        classSelect.innerHTML = '';
        const sortedClasses = [...availableClasses].sort();

        const allOption = document.createElement('option');
        allOption.value = 'all';
        allOption.textContent = 'គ្រប់ថ្នាក់';
        classSelect.appendChild(allOption);

        sortedClasses.forEach(className => {
            const option = document.createElement('option');
            option.value = className;
            option.textContent = className;
            classSelect.appendChild(option);
        });
        
        renderSchedule();
    }

    function renderSchedule() {
        const selectedDay = daySelect.value;
        const selectedShift = shiftSelect.value;
        const selectedClass = classSelect.value;
        const selectedDayName = dayNames[selectedDay];
        let dataToShow = fullData;

        if (selectedShift !== 'all') {
            dataToShow = dataToShow.filter(item => item.schedule[selectedDay] === selectedShift);
        }
        if (selectedClass !== 'all') {
            dataToShow = dataToShow.filter(item => item.className === selectedClass);
        }
        
        const classNamesInView = dataToShow.map(item => item.className);
        const uniqueClassCount = new Set(classNamesInView).size;
        
        entryCountEl.textContent = `ចំនួនសរុប: ${dataToShow.length} នាក់`;
        classCountEl.textContent = `ចំនួនថ្នាក់: ${uniqueClassCount} ថ្នាក់`;
        
        let tableHTML = `
            <table id="schedule-table">
                <thead>
                    <tr>
                        <th>ល.រ</th>
                        <th>ឈ្មោះ</th>
                        <th>ថ្នាក់</th>
                        <th>កាលវិភាគ (${selectedDayName})</th>
                    </tr>
                </thead>
                <tbody>`;

        if (dataToShow.length === 0) {
            tableHTML += `<tr><td colspan="4" style="text-align: center;">មិនមានទិន្នន័យទេ។</td></tr>`;
        } else {
            dataToShow.forEach((item, index) => {
                tableHTML += `
                    <tr>
                        <td>${index + 1}</td>
                        <td>${item.studentName}</td>
                        <td>${item.className}</td>
                        <td>${item.schedule[selectedDay]}</td>
                    </tr>`;
            });
        }
        tableHTML += `</tbody></table>`;
        scheduleContainer.innerHTML = tableHTML;
    }

    async function downloadPDF() {
        // --- NEW DEBUGGING CODE ---
        console.log("Starting PDF Download...");
        console.log("Checking for jsPDF library:", window.jspdf);
        console.log("Checking for autoTable plugin:", window.jspdf.autoTable);
        // --- END DEBUGGING CODE ---

        // Check if the libraries are loaded before trying to use them
        if (typeof window.jspdf === 'undefined' || typeof window.jspdf.autoTable === 'undefined') {
            console.error("jsPDF or autoTable plugin is not loaded correctly!");
            alert("Error: មិនអាចបង្កើត PDF បានទេ, Library មិនបានផ្ទុកត្រឹមត្រូវ។");
            return;
        }

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        doc.setFont('Helvetica'); 
        doc.text("Kastevichea", 14, 15);
        
        doc.autoTable({
            html: '#schedule-table',
            startY: 25,
            theme: 'grid',
            headStyles: { fillColor: [74, 144, 226] }
        });

        doc.save(`Schedule.pdf`);
    }

    // --- EVENT LISTENERS ---
    daySelect.addEventListener('change', populateClassDropdown);
    shiftSelect.addEventListener('change', populateClassDropdown);
    classSelect.addEventListener('change', renderSchedule);
    downloadBtn.addEventListener('click', downloadPDF);

    // --- INITIALIZATION ---
    fetchData();
});