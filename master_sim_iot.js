(function () {
    const $ = (sel) => document.querySelector(sel);
    const dropEl = $('#srDrop');
    const fileEl = $('#srFile');
    const statusEl = $('#srStatus');
    const dbTable = $('#srDbTable');
    const countEl = $('#srCount');
    const searchEl = $('#srSearch');

    let allRecords = [];

    const API_BASE = 'api/';

    function showStatus(msg, type) {
        statusEl.textContent = msg;
        statusEl.className = 'status show ' + type;
    }
    function hideStatus() { statusEl.className = 'status'; }

    function normBrandValue(raw) {
        const s = (raw || '').toString().trim().toUpperCase();
        if (s.includes('SELECT')) return 1;
        return 0; // default / ALL CAFE
    }

    function findHeader(headers, target) {
        const clean = (h) => (h || '').toString().replace(/\s+/g, '').trim();
        const t = clean(target);
        for (const h of headers) { if (clean(h) === t) return h; }
        for (const h of headers) { if (clean(h).includes(t) || t.includes(clean(h))) return h; }
        return null;
    }

    function formatSimNumber(value) {
        if (!value) return '';
        const digits = value.toString().replace(/\D/g, '');
        if (digits.length === 10) {
            return digits.replace(/^(\d{3})(\d{3})(\d{4})$/, '$1-$2-$3');
        }

        return value.toString().trim();
    }

    function mapRow(row, headers) {
        const col = {};
        col.brand = findHeader(headers, 'Brand');
        col.recipe = findHeader(headers, 'สูตร');
        col.code3 = findHeader(headers, 'StoreCode3');
        col.name = findHeader(headers, 'StoreName');
        col.sim = findHeader(headers, 'หมายเลขซิม');
        col.board = findHeader(headers, 'SNเครื่องชงกาแฟ');

        const branchCode = col.code3 ? (row[col.code3] || '').toString().trim() : '';
        if (!branchCode) return null;

        return {
            BRAND: normBrandValue(col.brand ? row[col.brand] : ''),
            RECIPE: normBrandValue(col.recipe ? row[col.recipe] : ''),
            BRANCH_CODE: branchCode,
            BRANCH_NAME: col.name ? (row[col.name] || '').toString().trim() : '',
            SIM_NUMBER: col.sim ? formatSimNumber(row[col.sim]) : '',
            BOARD_CODE: col.board ? (row[col.board] || '').toString().trim() : '',
        };
    }

    function parseFile(file) {
        const reader = new FileReader();
        reader.onload = async function (e) {
            try {
                showStatus('Reading file…', 'info');
                const data = new Uint8Array(e.target.result);
                const wb = XLSX.read(data, { type: 'array' });
                const sheet = wb.Sheets[wb.SheetNames[0]];
                const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
                if (!rows.length) {
                    showStatus('The file has no data rows.', 'err');
                    return;
                }
                const headers = Object.keys(rows[0]);
                const mapped = rows.map(r => mapRow(r, headers)).filter(Boolean);
                if (!mapped.length) {
                    showStatus('Could not find a Store Code3 column, or every row was empty.', 'err');
                    return;
                }

                showStatus('Importing new data…', 'info');
                await importRecords(mapped, rows.length);
            } catch (err) {
                console.error(err);
                showStatus('Could not read that file: ' + err.message, 'err');
            }
        };
        reader.onerror = function () { showStatus('Failed to read the file.', 'err'); };
        reader.readAsArrayBuffer(file);
    }

    function brandChip(v) {
        return (v === 1 || v === '1') ? '<span class="chip select">ALL SELECT</span>' : '<span class="chip cafe">ALL CAFÉ</span>';
    }

    function escapeHtml(s) {
        return (s === undefined || s === null ? '' : s.toString()).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    }

    async function importRecords(records, rowCount) {
        showStatus('Importing…', 'info');
        try {
            const res = await fetch(API_BASE + 'import.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(records)
            });
            const data = await res.json();
            if (!res.ok || data.error) {
                throw new Error(data.error || ('Server returned ' + res.status));
            }
            const parsedNote = rowCount ? `Parsed ${rowCount} row(s). ` : '';
            showStatus(`${parsedNote}Imported ${data.ok || 0} record(s)${data.fail ? `, ${data.fail} failed` : ''}.`, data.fail ? 'err' : 'ok');
        } catch (err) {
            console.error(err);
            showStatus('Import failed: ' + err.message, 'err');
        }
        fileEl.value = '';
        await loadDatabase();
    }

    async function loadDatabase() {
        dbTable.innerHTML = `<tbody><tr><td class="empty">Loading…</td></tr></tbody>`;
        try {
            const res = await fetch(API_BASE + 'list.php');
            if (!res.ok) throw new Error('Server returned ' + res.status);
            const records = await res.json();
            if (records.error) throw new Error(records.error);
            allRecords = records;
            countEl.textContent = records.length;
            renderDatabase(records);
        } catch (err) {
            console.error(err);
            dbTable.innerHTML = `<tbody><tr><td class="empty">Could not load database: ${escapeHtml(err.message)}</td></tr></tbody>`;
        }
    }

    function renderDatabase(records) {
        if (!records.length) {
            dbTable.innerHTML = `<tbody><tr><td class="empty">No records yet — upload a file above to get started.</td></tr></tbody>`;
            return;
        }
        let html = '<thead><tr><th>ID</th><th>Branch Code</th><th>Branch Name</th><th>Brand</th><th>Recipe</th><th>SIM Number</th><th>Board Code</th><th>Created</th><th></th></tr></thead><tbody>';
        for (const r of records) {
            html += `<tr>
        <td class="mono">${r.COFFEE_SIM_ID}</td>
        <td class="mono">${escapeHtml(r.BRANCH_CODE)}</td>
        <td>${escapeHtml(r.BRANCH_NAME)}</td>
        <td>${brandChip(r.BRAND)}</td>
        <td>${brandChip(r.RECIPE)}</td>
        <td class="mono">${escapeHtml(r.SIM_NUMBER)}</td>
        <td class="mono">${escapeHtml(r.BOARD_CODE)}</td>
        <td class="mono">${escapeHtml((r.CREATED_AT || '').toString().slice(0, 19).replace('T', ' '))}</td>
        <td><button class="del-btn" data-id="${r.COFFEE_SIM_ID}" title="Delete">✕</button></td>
      </tr>`;
        }
        html += '</tbody>';
        dbTable.innerHTML = html;
        dbTable.querySelectorAll('.del-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const id = btn.getAttribute('data-id');
                if (!confirm(`Delete record #${id}?`)) return;
                try {
                    const res = await fetch(API_BASE + 'delete.php?id=' + encodeURIComponent(id), { method: 'POST' });
                    const data = await res.json();
                    if (!res.ok || data.error) throw new Error(data.error || ('Server returned ' + res.status));
                    await loadDatabase();
                } catch (e) { alert('Could not delete: ' + e.message); }
            });
        });
    }

    function toCsv(records) {
        const headers = ['COFFEE_SIM_ID', 'BRANCH_CODE', 'BRANCH_NAME', 'BOARD_CODE', 'BRAND', 'RECIPE', 'SIM_NUMBER', 'CREATED_AT'];
        const lines = [headers.join(',')];
        for (const r of records) {
            lines.push(headers.map(h => {
                const v = (r[h] === undefined || r[h] === null) ? '' : r[h].toString();
                return '"' + v.replace(/"/g, '""') + '"';
            }).join(','));
        }
        return lines.join('\n');
    }

    function download(filename, content, mime) {
        const blob = new Blob([content], { type: mime });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = filename;
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    dropEl.addEventListener('click', () => fileEl.click());
    dropEl.addEventListener('dragover', (e) => { e.preventDefault(); dropEl.classList.add('drag'); });
    dropEl.addEventListener('dragleave', () => dropEl.classList.remove('drag'));
    dropEl.addEventListener('drop', (e) => {
        e.preventDefault(); dropEl.classList.remove('drag');
        if (e.dataTransfer.files.length) parseFile(e.dataTransfer.files[0]);
    });
    fileEl.addEventListener('change', (e) => {
        if (e.target.files.length) parseFile(e.target.files[0]);
    });
    $('#srRefresh').addEventListener('click', loadDatabase);
    $('#srExportCsv').addEventListener('click', () => download('store_registry.csv', toCsv(allRecords), 'text/csv'));
    $('#srExportJson').addEventListener('click', () => download('store_registry.json', JSON.stringify(allRecords, null, 2), 'application/json'));
    searchEl.addEventListener('input', () => {
        const q = searchEl.value.trim().toLowerCase();
        if (!q) { renderDatabase(allRecords); return; }
        const filtered = allRecords.filter(r =>
            Object.values(r).some(v => (v || '').toString().toLowerCase().includes(q))
        );
        renderDatabase(filtered);
    });

    loadDatabase();
})();
