// --- 基本設定・初期化 ---
let FLAT_ALL_ISOTOPES = []; let FLAT_RI_ISOTOPES = [];  
const JAPANESE_ELEMENT_MAP = {
    "水素":"H", "リチウム":"Li", "ベリリウム":"Be", "ホウ素":"B", "炭素":"C", "窒素":"N", "酸素":"O", "フッ素":"F", "ナトリウム":"Na", "アルミニウム":"Al", "リン":"P", "硫黄":"S", "カリウム":"K", "カルシウム":"Ca", "スカンジウム":"Sc", "クロム":"Cr", "マンガン":"Mn", "鉄":"Fe", "コバルト":"Co", "ニッケル":"Ni", "銅":"Cu", "亜鉛":"Zn", "ガリウム":"Ga", "ゲルマニウム":"Ge", "ヒ素":"As", "セレン":"Se", "ストロンチウム":"Sr", "イットリウム":"Y", "ジルコニウム":"Zr", "ニオブ":"Nb", "モリブデン":"Mo", "テクネチウム":"Tc", "ルテニウム":"Ru", "ロジウム":"Rh", "パラジウム":"Pd", "銀":"Ag", "カドミウム":"Cd", "インジウム":"In", "スズ":"Sn", "アンチモン":"Sb", "ヨウ素":"I", "キセノン":"Xe", "セシウム":"Cs", "バリウム":"Ba", "ランタン":"La", "プラセオジム":"Pr", "プロメチウム":"Pm", "サマリウム":"Sm", "テルビウム":"Tb", "ホルミウム":"Ho", "ツリウム":"Tm", "ルテチウム":"Lu", "レニウム":"Re", "イリジウム":"Ir", "金":"Au", "タリウム":"Tl", "ポロニウム":"Po", "ラドン":"Rn", "アスタチン":"At", "ラジウム":"Ra", "アクチニウム":"Ac", "トリウム":"Th", "ウラン":"U", "アメリシウム":"Am", "カリホルニウム":"Cf"
};

window.onload = () => {
    if(typeof NUCLIDE_DATABASE !== 'undefined') {
        const select = document.getElementById('calcNuclide');
        for(let el in NUCLIDE_DATABASE) {
            NUCLIDE_DATABASE[el].isotopes.forEach(iso => {
                let obj = { ...iso, element: el, elementName: NUCLIDE_DATABASE[el].elementName, halfLife: iso.halfLifeValue === "安定" ? "安定" : `${iso.halfLifeValue}${iso.unit}` };
                FLAT_ALL_ISOTOPES.push(obj);
                if(iso.halfLifeValue !== "安定") {
                    FLAT_RI_ISOTOPES.push(obj);
                    if(select) {
                        let opt = document.createElement('option');
                        opt.value = `${el}-${iso.mass}`;
                        opt.innerText = `${el}-${iso.mass} (半減期: ${iso.halfLifeValue}${iso.unit})`;
                        select.appendChild(opt);
                    }
                }
            });
        }
        updateDecayHalfLife();
        
        document.querySelectorAll('.periodic-table td').forEach(td => {
            let sym = "";
            const clickAttr = td.getAttribute('onclick');
            if (clickAttr && clickAttr.includes('clickPeriodic')) sym = clickAttr.match(/'(.*?)'/)[1];
            else if (td.textContent && td.textContent.trim().length > 0 && td.colSpan === 1) sym = td.textContent.trim();

            if (sym && NUCLIDE_DATABASE[sym]) {
                td.classList.add('has-data');
                td.setAttribute('onclick', `clickPeriodic('${sym}')`);
            }
        });
    }
    executeAdvancedSearch(); 
};

function updateDecayHalfLife() {
    const val = document.getElementById('calcNuclide')?.value;
    if(!val || typeof NUCLIDE_DATABASE === 'undefined') return;
    const [el, mass] = val.split('-');
    const iso = NUCLIDE_DATABASE[el].isotopes.find(i => i.mass === mass);
    if(iso && document.getElementById('decayHalfLife')) {
        document.getElementById('decayHalfLife').value = iso.halfLifeValue;
        document.getElementById('decayHalfLifeUnit').value = iso.unit;
    }
}

function switchTab(id) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    document.querySelector(`.tab[onclick="switchTab('${id}')"]`).classList.add('active');
}

let currentSearchMode = 'nuclide';
function switchSearchMode(mode) {
    currentSearchMode = mode;
    const btnN = document.getElementById('btn-nuclide-mode');
    const btnP = document.getElementById('btn-pharma-mode');
    const btnD = document.getElementById('btn-detector-mode');
    const filtersN = document.getElementById('nuclide-filters');
    const filtersP = document.getElementById('pharma-filters');
    const filtersD = document.getElementById('detector-filters');
    const title = document.getElementById('search-title');
    
    resetSearch();
    [btnN, btnP, btnD].forEach(b => b.style.cssText = "flex:1; padding:10px; background-color:#ecf0f1; color:#7f8c8d; border:2px solid #bdc3c7; font-size:13px;");
    filtersN.style.display = 'none'; filtersP.style.display = 'none'; if(filtersD) filtersD.style.display = 'none';

    if (mode === 'nuclide') { btnN.style.cssText = "flex:1; padding:10px; background-color:#3498db; color:white; border:none; font-size:13px;"; filtersN.style.display = 'block'; title.innerText = '🔍 核種データベース検索'; }
    else if (mode === 'pharma') { btnP.style.cssText = "flex:1; padding:10px; background-color:#3498db; color:white; border:none; font-size:13px;"; filtersP.style.display = 'block'; title.innerText = '💊 核医学データベース検索'; }
    else if (mode === 'detector') { btnD.style.cssText = "flex:1; padding:10px; background-color:#3498db; color:white; border:none; font-size:13px;"; if(filtersD) filtersD.style.display = 'block'; title.innerText = '📡 検出器データベース検索'; }
}

function executeAdvancedSearch() {
    let q = document.getElementById('searchQuery').value.trim();
    let searchLogicEl = document.querySelector('input[name="searchLogic"]:checked');
    let searchLogic = searchLogicEl ? searchLogicEl.value : 'and';
    
    if (currentSearchMode === 'nuclide') {
        let exactSym = JAPANESE_ELEMENT_MAP[q] || q;
        let isExactElement = (typeof NUCLIDE_DATABASE !== 'undefined' && NUCLIDE_DATABASE[exactSym]);
        let selectedModes = Array.from(document.querySelectorAll('#mode-filters .filter-tag.active')).map(el => el.dataset.value);
        let selectedUsages = Array.from(document.querySelectorAll('#usage-filters .filter-tag.active')).map(el => el.dataset.value);
        
        let res = FLAT_ALL_ISOTOPES.filter(i => {
            let matchQuery = false;
            if (!q) matchQuery = true;
            else if (isExactElement) matchQuery = (i.element === exactSym);
            else matchQuery = (i.element.toLowerCase() === q.toLowerCase() || i.elementName.includes(q));

            let matchTags = (selectedModes.length + selectedUsages.length === 0) ? (i.halfLife !== '安定') : 
                (searchLogic === 'and' ? [...selectedModes, ...selectedUsages].every(t => (i.mode && i.mode.includes(t)) || (i.usage && i.usage.includes(t))) : 
                [...selectedModes, ...selectedUsages].some(t => (i.mode && i.mode.includes(t)) || (i.usage && i.usage.includes(t))));
            return matchQuery && matchTags;
        });

        let html = res.length ? `<h3>検索結果: ${res.length} 件</h3><table class="result-table"><thead><tr><th style="min-width:50px;">核種</th><th style="min-width:70px;">半減期</th><th style="min-width:50px;">壊変</th><th>エネルギー</th><th>特記事項</th></tr></thead><tbody>` : '<p style="color:red;text-align:center;font-weight:bold;">見つかりません</p>';
        res.forEach(i => {
            let notes = [];
            if (i.usage) notes.push(`<span style="color:#e67e22; font-weight:bold;">[${i.usage}]</span>`);
            if (i.production) notes.push(`<span style="color:#27ae60; font-weight:bold;">[${i.production}]</span>`);
            if (i.other) notes.push(`<span style="font-size:11px; color:#7f8c8d;">※ ${i.other}</span>`);
            html += `<tr style="${i.halfLife === "安定" ? 'background:#f0fdf4;' : ''}"><td><strong><sup>${i.mass}</sup>${i.element}</strong></td><td>${i.halfLife}</td><td>${i.mode}</td><td style="font-size:12px;">${i.energy || '-'}</td><td style="font-size:13px; line-height:1.5;">${notes.join(' ')}</td></tr>`;
        });
        document.getElementById('searchResult').innerHTML = html + (res.length ? '</tbody></table>' : '');
        highlightPeriodic([...new Set(res.map(i => i.element))]);

    } else if (currentSearchMode === 'pharma') {
        let selectedTypes = Array.from(document.querySelectorAll('#type-filters .filter-tag.active')).map(el => el.dataset.value);
        let selectedOrgans = Array.from(document.querySelectorAll('#organ-filters .filter-tag.active')).map(el => el.dataset.value);
        
        let res = PHARMA_DATABASE.filter(p => {
            let matchQuery = false;
            let exactSym = JAPANESE_ELEMENT_MAP[q] || q;
            let isExactElement = (typeof NUCLIDE_DATABASE !== 'undefined' && NUCLIDE_DATABASE[exactSym]);
            
            if (!q) matchQuery = true;
            else if (isExactElement) {
                matchQuery = (p.nuclide === exactSym || p.drugName.startsWith(exactSym + '-'));
            } else {
                matchQuery = (p.organ.includes(q) || p.drugName.toLowerCase().includes(q.toLowerCase()) || p.nuclide.toLowerCase().includes(q.toLowerCase()) || p.disease.some(d => d.includes(q)));
            }
            
            let matchType = selectedTypes.length === 0 || selectedTypes.includes(p.type);
            
            let matchOrgan = true;
            if (selectedOrgans.length > 0) {
                let organChecks = selectedOrgans.map(o => p.category.includes(o) || p.organ.includes(o));
                matchOrgan = searchLogic === 'and' ? organChecks.every(chk => chk) : organChecks.some(chk => chk);
            }
            
            return matchQuery && matchType && matchOrgan;
        });

        // テーブルヘッダーと表示順の変更（使用核種を削除、指定された順序へ）
        let html = res.length ? `<h3>検索結果: ${res.length} 件</h3><table class="result-table"><thead><tr><th style="min-width:60px;">部位</th><th style="min-width:180px;">放射性医薬品 (薬剤名)</th><th style="min-width:120px;">対象疾患</th><th>投与方法・特記事項</th><th>集積機序 (メカニズム)</th></tr></thead><tbody>` : '<p style="color:red;text-align:center;font-weight:bold;">見つかりません</p>';
        let matchedElements = [];
        res.forEach(p => {
            matchedElements.push(p.nuclide);
            
            // 箇条書きHTMLの生成
            let diseaseHtml = `<ul style="margin:0; padding-left:16px; line-height:1.4;">` + p.disease.map(d => `<li>${d}</li>`).join('') + `</ul>`;
            
            // 薬剤名表示ロジック（核種部分の強調と臨床名のドッキング）
            let boldDrugName = p.drugName.replace(p.nuclide, `<strong style="color:#2980b9; font-size:16px;">${p.nuclide}</strong>`);
            if (p.clinicalName) {
                boldDrugName += `<br><span style="font-size:12px; color:#555; font-weight:normal;">（臨床名: ${p.clinicalName}）</span>`;
            }

            html += `<tr>
                <td style="font-weight:bold; color:#2c3e50; font-size:15px;">${p.organ}</td>
                <td style="font-weight:bold;">${boldDrugName}</td>
                <td style="color:#27ae60; font-weight:bold;">${diseaseHtml}</td>
                <td style="font-size:12px; line-height:1.4; color:#7f8c8d;">${p.notes || '-'}</td>
                <td style="font-size:13px; line-height:1.4;">${p.mechanism}</td>
            </tr>`;
        });
        document.getElementById('searchResult').innerHTML = html + (res.length ? '</tbody></table>' : '');
        highlightPeriodic([...new Set(matchedElements)]);

    } else if (currentSearchMode === 'detector') {
        let selectedCat = Array.from(document.querySelectorAll('#det-category-filters .filter-tag.active')).map(el => el.dataset.value);
        let selectedRad = Array.from(document.querySelectorAll('#det-radiation-filters .filter-tag.active')).map(el => el.dataset.value);
        let selectedEne = Array.from(document.querySelectorAll('#det-energy-filters .filter-tag.active')).map(el => el.dataset.value);
        let selectedCnt = Array.from(document.querySelectorAll('#det-count-filters .filter-tag.active')).map(el => el.dataset.value);
        let isFiltering = (selectedCat.length > 0 || selectedRad.length > 0 || selectedEne.length > 0 || selectedCnt.length > 0);

        let res = DETECTOR_DATABASE.filter(d => {
            let matchQuery = false;
            if (!q) matchQuery = true;
            else matchQuery = (d.name.toLowerCase().includes(q.toLowerCase()) || d.radiation.includes(q) || d.desc.includes(q));

            let matchTags = true;
            if (isFiltering) {
                let catChecks = selectedCat.map(c => d.category.includes(c));
                let radChecks = selectedRad.map(r => d.radiation.includes(r));
                let eneChecks = selectedEne.map(e => d.energy === e || (e === '△' && d.energy.includes('△')));
                let cntChecks = selectedCnt.map(c => d.count === c);
                let allChecks = [...catChecks, ...radChecks, ...eneChecks, ...cntChecks];
                matchTags = searchLogic === 'and' ? allChecks.every(chk => chk === true) : allChecks.some(chk => chk === true);
            }
            return matchQuery && matchTags;
        });

        let html = res.length ? `<h3>検索結果: ${res.length} 件</h3><table class="result-table"><thead><tr><th style="min-width:110px;">検出器の種類</th><th style="min-width:60px;">主な線種</th><th style="min-width:45px;">エネ</th><th style="min-width:45px;">計数</th><th>主な特徴・原理・用途</th></tr></thead><tbody>` : '<p style="color:red;text-align:center;font-weight:bold;">見つかりません</p>';
        res.forEach(d => {
            html += `<tr><td style="font-weight:bold; color:#2c3e50;">${d.name}</td><td style="font-size:13px; color:#c0392b; font-weight:bold;">${d.radiation}</td><td style="text-align:center; font-weight:bold; color:${d.energy==='○'?'#27ae60':(d.energy==='×'?'#e74c3c':'#f39c12')};">${d.energy}</td><td style="text-align:center; font-weight:bold; color:${d.count==='○'?'#27ae60':(d.count==='×'?'#e74c3c':'#f39c12')};">${d.count}</td><td style="font-size:13px; line-height:1.5;">${d.desc}</td></tr>`;
        });
        document.getElementById('searchResult').innerHTML = html + (res.length ? '</tbody></table>' : '');

        let matchedElements = [];
        if (selectedRad.length > 0) {
            FLAT_ALL_ISOTOPES.forEach(i => {
                let match = false;
                if (selectedRad.includes('α') && i.mode && i.mode.includes('α')) match = true;
                if (selectedRad.includes('β') && i.mode && (i.mode.includes('β-') || i.mode.includes('β+'))) match = true;
                if (selectedRad.includes('γ') && ((i.mode && i.mode.includes('γ')) || (i.energy && i.energy.includes('γ')))) match = true;
                if (selectedRad.includes('X') && i.mode && (i.mode.includes('EC') || i.mode.includes('IT'))) match = true;
                if (selectedRad.includes('中性子') && (i.element === 'Cf' || (i.other && i.other.includes('中性子')) || (i.other && i.other.includes('自発核分裂')))) match = true;
                if (match) matchedElements.push(i.element);
            });
        }
        if (matchedElements.length === 0) matchedElements.push("_NONE_");
        highlightPeriodic([...new Set(matchedElements)]);
    }
}

function highlightPeriodic(matchedElements) {
    document.querySelectorAll('.periodic-table td.has-data').forEach(td => {
        let sym = td.textContent.trim().split('\n')[0].trim();
        td.classList.remove('match', 'no-match');
        if (matchedElements.includes(sym)) td.classList.add('match');
        else if (matchedElements.length > 0) td.classList.add('no-match');
    });
}

function clickPeriodic(sym) { document.getElementById('searchQuery').value = sym; executeAdvancedSearch(); }
function resetSearch() { document.getElementById('searchQuery').value = ''; document.querySelectorAll('.filter-tag').forEach(el => el.classList.remove('active')); executeAdvancedSearch(); }
function toggleFilter(el) { el.classList.toggle('active'); executeAdvancedSearch(); }

// --- 計算システム ---
function getSeconds(v, u) { return u==='秒'?v : u==='分'?v*60 : u==='時間'?v*3600 : u==='日'?v*86400 : v*31536000; }
function convertFromSeconds(v, u) { return u==='秒'?v : u==='分'?v/60 : u==='時間'?v/3600 : u==='日'?v/86400 : v/31536000; }

function switchCalcForm() {
    const type = document.getElementById('calcType').value;
    document.querySelectorAll('.calc-form-group').forEach(el => el.style.display = 'none');
    const form = document.getElementById('form-' + type);
    if(form) form.style.display = 'block';
    document.getElementById('calcResult').style.display = 'none';
    toggleInputs(type);
}

function toggleInputs(formId) {
    const targetSel = document.querySelector(`#form-${formId} .target-box select`);
    const target = targetSel ? targetSel.value : null;
    document.querySelectorAll(`#form-${formId} .input-wrap`).forEach(w => w.style.display = w.dataset.var === target ? 'none' : 'block');
    document.querySelectorAll(`#form-${formId} .input-var`).forEach(v => v.style.display = v.dataset.var === target ? 'none' : 'block');
    document.querySelectorAll(`#form-${formId} .calc-hint`).forEach(h => h.style.display = h.dataset.var === target ? 'inline' : 'none');
    const nBox = document.getElementById('decayNuclideBox');
    if (formId === 'decay' && nBox) nBox.style.display = (target === 'T') ? 'none' : 'block';
}

function updateDisplayDigits(val) {
    const d = document.getElementById('digitDisplay');
    if(d) d.innerText = val + "桁";
    if(document.getElementById('calcResult').style.display === 'block') runSelectedCalc();
}

function runSelectedCalc() {
    const type = document.getElementById('calcType').value;
    const targetSel = document.querySelector(`#form-${type} .target-box select`);
    const target = targetSel ? targetSel.value : null;
    const sig = parseInt(document.getElementById('digitSlider').value) || 3;
    let processText = ""; let answerText = "";

    function fmt(val) {
        if(val === null || isNaN(val) || !isFinite(val)) return "計算不可 (数値を正しく入力してください)";
        let num = Number(val);
        if(num === 0) return "0";
        return num.toPrecision(sig);
    }

    switch(type) {
        case 'decay': {
            let A0 = Number(document.getElementById('decayA0').value); let A = Number(document.getElementById('decayA').value);
            let t_v = Number(document.getElementById('decayT').value); let t_u = document.getElementById('decayTUnit').value;
            let T_v = Number(document.getElementById('decayHalfLife').value); let T_u = document.getElementById('decayHalfLifeUnit').value;
            let t_sec = getSeconds(t_v, t_u); let T_sec = getSeconds(T_v, T_u);
            if(target === 'A') { res = A0 * Math.pow(0.5, t_sec/T_sec); processText = `A = ${A0} × (1/2)^(${t_v}${t_u}/${T_v}${T_u})`; answerText = `${fmt(res)} MBq`; }
            else if(target === 'A0') { res = A / Math.pow(0.5, t_sec/T_sec); processText = `A₀ = ${A} / (1/2)^(${t_v}${t_u}/${T_v}${T_u})`; answerText = `${fmt(res)} MBq`; }
            else if(target === 't') { res = convertFromSeconds(T_sec * (Math.log(A0/A)/Math.LN2), t_u); processText = `t = ${T_v}${T_u} × ln(${A0}/${A}) / ln2`; answerText = `${fmt(res)} ${t_u}`; }
            else { res = convertFromSeconds(t_sec / (Math.log(A0/A)/Math.LN2), T_u); processText = `T = ${t_v}${t_u} / (ln(${A0}/${A})/ln2)`; answerText = `${fmt(res)} ${T_u}`; }
            break;
        }
        case 'shielding': {
            let hvl = Number(document.getElementById('shieldHvl').value); let x = Number(document.getElementById('shieldX').value);
            let I0 = Number(document.getElementById('shieldI0').value); let I = Number(document.getElementById('shieldI').value);
            if(target === 'I') { res = I0 * Math.pow(0.5, x/hvl); processText = `I = ${I0} × (1/2)^(${x}/${hvl})`; answerText = `${fmt(res)}`; }
            else if(target === 'I0') { res = I / Math.pow(0.5, x/hvl); processText = `I₀ = ${I} / (1/2)^(${x}/${hvl})`; answerText = `${fmt(res)}`; }
            else if(target === 'x') { res = hvl * (Math.log(I0/I)/Math.LN2); processText = `x = ${hvl} × ln(${I0}/${I}) / ln2`; answerText = `${fmt(res)} (厚さ)`; }
            else { res = x / (Math.log(I0/I)/Math.LN2); processText = `HVL = ${x} / (ln(${I0}/${I})/ln2)`; answerText = `${fmt(res)} (半価層)`; }
            break;
        }
        case 'dose': {
            let g = Number(document.getElementById('doseGamma').value); let A = Number(document.getElementById('doseA').value);
            let r = Number(document.getElementById('doseR').value); let D = Number(document.getElementById('doseD').value);
            if(target === 'D') { res = (g*A)/(r*r); processText = `D = (${g} × ${A}) / ${r}²`; answerText = `${fmt(res)} μSv/h`; }
            else if(target === 'A') { res = (D*r*r)/g; processText = `A = (${D} × ${r}²) / ${g}`; answerText = `${fmt(res)} MBq`; }
            else if(target === 'r') { res = Math.sqrt((g*A)/D); processText = `r = √ ((${g} × ${A}) / ${D})`; answerText = `${fmt(res)} m`; }
            else { res = (D*r*r)/A; processText = `Γ = (${D} × ${r}²) / ${A}`; answerText = `${fmt(res)} μSv·m²/MBq·h`; }
            break;
        }
        case 'effHl': {
            let Tp_v = Number(document.getElementById('effTp').value); let Tp_u = document.getElementById('effTpUnit').value;
            let Tb_v = Number(document.getElementById('effTb').value); let Tb_u = document.getElementById('effTbUnit').value;
            let Teff_v = Number(document.getElementById('effTeff').value); let Teff_u = document.getElementById('effTeffUnit').value;
            if(target === 'Teff') { let res_s = (getSeconds(Tp_v,Tp_u)*getSeconds(Tb_v,Tb_u))/(getSeconds(Tp_v,Tp_u)+getSeconds(Tb_v,Tb_u)); processText = `Teff = (Tp × Tb) / (Tp + Tb)`; answerText = `${fmt(convertFromSeconds(res_s, Teff_u))} ${Teff_u}`; }
            else if(target === 'Tp') { let res_s = (getSeconds(Teff_v,Teff_u)*getSeconds(Tb_v,Tb_u))/(getSeconds(Tb_v,Tb_u)-getSeconds(Teff_v,Teff_u)); if(res_s<=0){answerText="計算不可";break;} processText = `Tp = (Teff × Tb) / (Tb - Teff)`; answerText = `${fmt(convertFromSeconds(res_s, Tp_u))} ${Tp_u}`; }
            else { let res_s = (getSeconds(Teff_v,Teff_u)*getSeconds(Tp_v,Tp_u))/(getSeconds(Tp_v,Tp_u)-getSeconds(Teff_v,Teff_u)); if(res_s<=0){answerText="計算不可";break;} processText = `Tb = (Teff × Tp) / (Tp - Teff)`; answerText = `${fmt(convertFromSeconds(res_s, Tb_u))} ${Tb_u}`; }
            break;
        }
        case 'deadTime': {
            let n0 = Number(document.getElementById('dtN0').value); let n = Number(document.getElementById('dtN').value);
            let tau_us = Number(document.getElementById('dtTau').value); let tau_s = tau_us * 1e-6;
            if(target === 'n') { res = n0 / (1 - n0*tau_s); processText = `n = ${n0} / (1 - ${n0}×${tau_us}μs)`; answerText = `${fmt(res)} cps`; }
            else if(target === 'n0') { res = n / (1 + n*tau_s); processText = `n₀ = ${n} / (1 + ${n}×${tau_us}μs)`; answerText = `${fmt(res)} cps`; }
            else { res = ((1 - (n0/n))/n0)*1e6; processText = `τ = [1 - (${n0}/${n})] / ${n0}`; answerText = `${fmt(res)} μs`; }
            break;
        }
        case 'equilibrium': {
            let Tp_s = getSeconds(Number(document.getElementById('eqTp').value), document.getElementById('eqTpUnit').value);
            let Td_s = getSeconds(Number(document.getElementById('eqTd').value), document.getElementById('eqTdUnit').value);
            let t_s = getSeconds(Number(document.getElementById('eqTime').value), document.getElementById('eqTimeUnit').value);
            let A0 = Number(document.getElementById('eqA0').value); let Ad = Number(document.getElementById('eqAd').value);
            if(Tp_s === Td_s) { answerText = "計算不可"; break; }
            let F = (Tp_s / (Tp_s - Td_s)) * (Math.pow(0.5, t_s/Tp_s) - Math.pow(0.5, t_s/Td_s));
            if(target === 'Ad') { processText = `Ad = A₀ × [Tp/(Tp-Td)] × (0.5^(t/Tp) - 0.5^(t/Td))`; answerText = `${fmt(A0 * F)} MBq`; }
            else { processText = `A₀ = Ad / [平衡ファクター F]`; answerText = `${fmt(Ad / F)} MBq`; }
            break;
        }
        case 'specAct': {
            let T_s = getSeconds(Number(document.getElementById('saT').value), document.getElementById('saTUnit').value);
            let M = Number(document.getElementById('saM').value); let As = Number(document.getElementById('saAs').value);
            const K = 4.1743156e11;
            if(target === 'As') { res = K / (T_s * M); processText = `As = (ln2 × Na) / (T × M)`; answerText = `${fmt(res)} TBq/g`; }
            else if(target === 'M') { res = K / (T_s * As); processText = `M = (ln2 × Na) / (T × As)`; answerText = `${fmt(res)} g/mol`; }
            else { res_s = K / (As * M); processText = `T = (ln2 × Na) / (As × M)`; answerText = `${fmt(convertFromSeconds(res_s, document.getElementById('saTUnit').value))} ${document.getElementById('saTUnit').value}`; }
            break;
        }
        case 'stat': {
            let Ns = Number(document.getElementById('statNs').value); let ts = Number(document.getElementById('statTs').value);
            let Nb = Number(document.getElementById('statNb').value); let tb = Number(document.getElementById('statTb').value);
            if(ts<=0 || tb<=0) { answerText="時間は1以上を入力してください"; break; }
            let net = (Ns/ts) - (Nb/tb); let sd = Math.sqrt((Ns/ts)/ts + (Nb/tb)/tb);
            processText = `正味計数率 = (Ns/ts) - (Nb/tb)`;
            answerText = `<div style="font-size:16px;line-height:1.6;">正味計数率: <strong style="color:#2980b9;font-size:20px;">${fmt(net)}</strong> cpm<br>標準偏差 (σ): <strong style="color:#e67e22;">± ${fmt(sd)}</strong> cpm<br>相対誤差: <strong style="color:#c0392b;">${fmt((sd/net)*100)} %</strong></div>`;
            break;
        }
        case 'energyRes': {
            let dE = Number(document.getElementById('erDelta').value); let E = Number(document.getElementById('erE').value); let R = Number(document.getElementById('erR').value);
            if(target === 'R') { processText = `R = (ΔE / E) × 100`; answerText = `${fmt((dE/E)*100)} %`; }
            else if(target === 'deltaE') { processText = `ΔE = E × (R% / 100)`; answerText = `${fmt(E*(R/100))}`; }
            else { processText = `E = ΔE / (R% / 100)`; answerText = `${fmt(dE/(R/100))}`; }
            break;
        }
        case 'wValue': {
            let E = Number(document.getElementById('wvE').value); let W = Number(document.getElementById('wvW').value); let Q = Number(document.getElementById('wvQ').value);
            const C = 1.60217663e-13;
            if(target === 'Q') { processText = `Q = (E / W) × 素電荷`; answerText = `${fmt((E*C)/W)} C`; }
            else if(target === 'E') { processText = `E = (Q × W) / 素電荷`; answerText = `${fmt((Q*W)/C)} MeV`; }
            else { processText = `W = (E / Q) × 素電荷`; answerText = `${fmt((E*C)/Q)} eV`; }
            break;
        }
        case 'braggGray': {
            let Dm = Number(document.getElementById('bgDm').value); let Dg = Number(document.getElementById('bgDg').value); let Smg = Number(document.getElementById('bgSmg').value);
            if(target === 'Dm') { processText = `Dm = Sm,g × Dg`; answerText = `${fmt(Smg*Dg)} Gy`; }
            else if(target === 'Dg') { processText = `Dg = Dm / Sm,g`; answerText = `${fmt(Dm/Smg)} Gy`; }
            else { processText = `Sm,g = Dm / Dg`; answerText = `${fmt(Dm/Dg)}`; }
            break;
        }
        case 'twoSource': {
            let n1 = Number(document.getElementById('tsN1').value); let n2 = Number(document.getElementById('tsN2').value);
            let n12 = Number(document.getElementById('tsN12').value); let nb = Number(document.getElementById('tsNb').value)||0;
            let den = 2 * (n1 - nb) * (n2 - nb); if(den===0){answerText="計算不可";break;}
            processText = `τ ≈ (n₁ + n₂ - n₁₂ - nb) / 2(n₁-nb)(n₂-nb)`; answerText = `${fmt(((n1+n2-n12-nb)/den)*1e6)} μs`;
            break;
        }
        case 'activation': {
            let sig_b = Number(document.getElementById('actSigma').value); let f = Number(document.getElementById('actF').value);
            let N = Number(document.getElementById('actN').value); let A = Number(document.getElementById('actA').value);
            let T_s = getSeconds(Number(document.getElementById('actT').value), document.getElementById('actTUnit').value);
            let t_s = getSeconds(Number(document.getElementById('actTime').value), document.getElementById('actTimeUnit').value);
            if(target === 'A') { res = N * (sig_b*1e-24) * f * (1 - Math.pow(0.5, t_s/T_s)); processText = `A = N·σ·f × (1 - (1/2)^(t/T))`; answerText = `${fmt(res)} Bq`; }
            else { let grow = 1 - Math.pow(0.5, t_s/T_s); if(grow===0){answerText="時間短すぎ";break;} processText = `σ = (A / 減衰項) / (N × f)`; answerText = `${fmt(((A/grow)/(N*f))*1e24)} barn`; }
            break;
        }
        case 'injectionVol': {
            let T_min = Number(document.getElementById('injHalfLife').value); let Acal = Number(document.getElementById('injAcal').value);
            let Vcal = Number(document.getElementById('injVcal').value); let t_min = Number(document.getElementById('injTime').value);
            let Atarget = Number(document.getElementById('injTargetA').value);
            if(!Vcal || Vcal<=0) { answerText="バイアル液量を入力してください"; break; }
            let A_now = Acal * Math.pow(0.5, t_min / T_min); let conc_now = A_now / Vcal;
            processText = `減衰後全放射能 = ${Acal} × (1/2)^(${t_min}/${T_min}) = ${fmt(A_now)} MBq<br>現在の放射能濃度 = ${fmt(conc_now)} MBq/mL`;
            answerText = `吸い上げ液量: <strong style="color:#e74c3c; font-size:26px;">${fmt(Atarget / conc_now)}</strong> mL <span style="font-size:14px; color:#7f8c8d;">(きっかり ${Atarget} MBq分)</span>`;
            break;
        }
        case 'molyBreakthrough': {
            let Tc_MBq = Number(document.getElementById('mbTc').value); let Mo_kBq = Number(document.getElementById('mbMo').value);
            if(Tc_MBq<=0) { answerText="Tcの総放射能を入力してください"; break; }
            let ratio = Mo_kBq / Tc_MBq; let isPass = ratio <= 0.15;
            processText = `含有率 = ${Mo_kBq} kBq ÷ ${Tc_MBq} MBq`;
            answerText = `<div style="line-height:1.6;">核種純度比: <strong>${fmt(ratio)}</strong> kBq/MBq (${fmt((Mo_kBq/(Tc_MBq*1000))*100)} %)<br><span style="display:inline-block; margin-top:8px; padding:6px 12px; border-radius:4px; color:#fff; font-weight:bold; background-color:${isPass?'#27ae60':'#c0392b'};">${isPass?'⭕ 合格 (法定基準 0.15 kBq/MBq 以下 クリア)':'❌ 不合格 (法定基準を超過しています)'}</span></div>`;
            break;
        }
        case 'suvCalc': {
            let Ctissue = Number(document.getElementById('suvCtissue').value); let Ainj = Number(document.getElementById('suvAinj').value);
            let t_min = Number(document.getElementById('suvTime').value); let W_kg = Number(document.getElementById('suvWeight').value);
            if(Ainj<=0 || W_kg<=0) { answerText="投与量と体重を入力してください"; break; }
            let A_actual_kBq = (Ainj * Math.pow(0.5, t_min / 109.8)) * 1000;
            processText = `減衰後実投与量 = ${Ainj} × (1/2)^(${t_min}/109.8) MBq<br>SUV = 組織濃度 ÷ (実投与量Bq ÷ 体重g)`;
            answerText = `病変部 SUV: <strong style="color:#2980b9; font-size:28px;">${fmt(Ctissue / (A_actual_kBq / (W_kg * 1000)))}</strong><br><span style="font-size:12px; color:#7f8c8d;">※一般にSUV 2.5〜3.0以上で悪性腫瘍の可能性が強く示唆されます</span>`;
            break;
        }
    }

    document.getElementById('calcProcessArea').innerHTML = `<p style="font-size:13px; color:#7f8c8d; margin:0 0 5px 0;">[計算式] ${processText}</p>`;
    document.getElementById('calcAnswerArea').innerHTML = `<div style="font-size:22px; font-weight:bold; color:#2c3e50; border-top:1px dashed #bdc3c7; padding-top:10px;">${answerText}</div>`;
    document.getElementById('calcResult').style.display = 'block';
}

// --- 🚀 国試対策オリジナル4択クイズ ---
const PRESET_EXAM_QUESTIONS = [
    { q: "放射平衡において「永続平衡」が成立するための親核種の半減期(Tp)と娘核種の半減期(Td)の条件として正しいものはどれか？", opts: ["Tp ≫ Td", "Tp ＞ Td (その差は数倍程度)", "Tp ＝ Td", "Tp ＜ Td"], ans: 0, exp: "親核種の半減期が娘核種に比べてきわめて長い場合（Tp ≫ Td）に成立する平衡を「永続平衡」と呼びます。代表例は 226Ra(1600年) と 222Rn(3.82日) や、90Sr(28.8年) と 90Y(64時間) です。" },
    { q: "原子質量の基準（きっかり 12.0000 u）として国際的に定義されている安定同位体はどれか？", opts: ["炭素12 (12C)", "酸素16 (16O)", "水素1 (1H)", "窒素14 (14N)"], ans: 0, exp: "現在の国際基準では、基底状態にある unbound な炭素12(12C)の静止質量を正確に 12 ダルトン(u) と定義しています。" },
    { q: "次の放射性核種のうち、壊変に伴って「純粋なβ-線（γ線を伴わない）」を放出する純β-放出体はどれか？", opts: ["32P (リン32)", "60Co (コバルト60)", "131I (ヨウ素131)", "24Na (ナトリウム24)"], ans: 0, exp: "純β-放出体の代表例は 3H, 14C, 32P, 35S, 45Ca, 89Sr, 90Sr, 90Y などです。60Co, 131I, 24Na はβ-壊変の直後に強いγ線を放出します。" },
    { q: "ジェネレータ（ミルキングシステム）を利用して院内で抽出・調製される核種として【誤っているもの】はどれか？", opts: ["18F (フッ素18)", "99mTc (テクネチウム99m)", "81mKr (クリプトン81m)", "68Ga (ガリウム68)"], ans: 0, exp: "18F は半減期が109.8分と短く適当な親核種が存在しないため、サイクロトロンでそのつど製造されます。他の3つはジェネレータで溶出可能です。" },
    { q: "「去勢抵抗性前立腺癌の骨転移」に対するアルファ線内用療法（ゾーフィゴ静注）に用いられる核種はどれか？", opts: ["223Ra (ラジウム223)", "89Sr (ストロンチウム89)", "131I (ヨウ素131)", "90Y (イットリウム90)"], ans: 0, exp: "223Ra はカルシウムと同族元素であるため骨転移病巣に集積し、飛程の短い強力なα線を放出して腫瘍を叩きます。" },
    { q: "次の核医学シンチグラフィ用医薬品のうち、「Na+, K+-ATPaseを介した能動輸送」によって心筋細胞内に取り込まれるものはどれか？", opts: ["201TlCl (塩化タリウム)", "99mTc-MIBI", "123I-BMIPP", "99mTc-PYP (ピロリン酸)"], ans: 0, exp: "タリウムイオン(Tl+)は生体内においてカリウムイオン(K+)と極めてよく似た挙動をとるため、心筋細胞膜の Na+,K+-ATPase によって能動的に取り込まれます。" },
    { q: "半減期が「6.02時間」であり、141 keV の単一γ線を放出するためSPECT検査の主役となっている核種はどれか？", opts: ["99mTc (テクネチウム99m)", "123I (ヨウ素123)", "111In (インジウム111)", "67Ga (ガリウム67)"], ans: 0, exp: "99mTc はγ線エネルギーが141keVとカメラ感度に最も適しており、かつβ線を放出しないため患者被曝を低く抑えられる理想的な核種です。" },
    { q: "消滅γ線（511 keV）を互いに180度反対方向へ同時放出する性質を利用する画像診断法はどれか？", opts: ["PET", "SPECT", "オートラジオグラフィ", "コンプトンカメラ"], ans: 0, exp: "PETは、β+壊変で放出された陽電子(e+)が電子(e-)と結合・消滅する際に生じる「511 keV の消滅光子2本」を同時計数リングで捉えます。" }
];

let activeQuizPool = [];
let currentQIdx = 0; let correctQCount = 0;
let quizHistory = [];

function buildDynamicQuizPool(genre) {
    let pool = [];
    if(genre === 'original_4choice') return [...PRESET_EXAM_QUESTIONS].sort(()=>Math.random()-0.5);

    for(let i=0; i<10; i++) {
        if(genre === 'pharma_combination' || (genre === 'random' && Math.random()<0.4)) {
            let p = PHARMA_DATABASE[Math.floor(Math.random()*PHARMA_DATABASE.length)];
            let decoys = PHARMA_DATABASE.filter(x=>x.mechanism!==p.mechanism).sort(()=>Math.random()-0.5).slice(0,3).map(x=>x.mechanism);
            let opts = [p.mechanism, ...decoys].sort(()=>Math.random()-0.5);
            pool.push({
                q: `核医学領域で用いられる医薬品「<strong style="color:#e74c3c;">${p.drugName}</strong>」の【集積機序（メカニズム）】として正しいものはどれか？`,
                opts: opts, ans: opts.indexOf(p.mechanism),
                exp: `【解説】 ${p.drugName} は「${p.mechanism}」により ${p.organ} (${p.disease.join(', ')}) に集積します。`
            });
        } else if(genre === 'mode_combination' || (genre === 'random' && Math.random()<0.5)) {
            let iso = FLAT_RI_ISOTOPES[Math.floor(Math.random()*FLAT_RI_ISOTOPES.length)];
            let wrongModes = ["α壊変","β-壊変","β+壊変","EC","IT"].filter(m => !iso.mode.includes(m[0]));
            let decoys = FLAT_RI_ISOTOPES.filter(x=>x.element!==iso.element).sort(()=>Math.random()-0.5).slice(0,3);
            let optC = `<sup>${iso.mass}</sup>${iso.element} ── ${iso.mode}`;
            let optD = decoys.map((d,idx) => `<sup>${d.mass}</sup>${d.element} ── ${wrongModes[idx%wrongModes.length]}`);
            let opts = [optC, ...optD].sort(()=>Math.random()-0.5);
            pool.push({
                q: "放射性核種と【主たる壊変形式】の組合せとして正しいものはどれか？",
                opts: opts, ans: opts.indexOf(optC),
                exp: `【正解：<sup>${iso.mass}</sup>${iso.element} (${iso.mode})】\n${iso.elementName}（半減期: ${iso.halfLife}）。${iso.other ? '※'+iso.other : ''}`
            });
        } else {
            let ri = FLAT_RI_ISOTOPES[Math.floor(Math.random()*FLAT_RI_ISOTOPES.length)];
            let decoys = FLAT_RI_ISOTOPES.filter(x=>x.element!==ri.element).sort(()=>Math.random()-0.5).slice(0,3);
            let optC = `<sup>${ri.mass}</sup>${ri.element} (${ri.elementName}) ： ${ri.halfLife}`;
            let optD = decoys.map(d => `<sup>${d.mass}</sup>${d.element} (${d.elementName}) ： ${d.halfLife}`);
            let opts = [optC, ...optD].sort(()=>Math.random()-0.5);
            pool.push({
                q: `次のうち、半減期が「<strong style="color:#2980b9;">${ri.halfLife}</strong>」である核種はどれか？`,
                opts: opts, ans: opts.indexOf(optC),
                exp: `正解は <sup>${ri.mass}</sup>${ri.element} です。（主な用途：${ri.usage||'一般RI'} / 壊変：${ri.mode}）`
            });
        }
    }
    return pool;
}

function startQuiz() {
    const g = document.getElementById('quizGenre').value;
    activeQuizPool = buildDynamicQuizPool(g).slice(0,10);
    currentQIdx = 0; correctQCount = 0; quizHistory = [];
    document.getElementById('quiz-start-screen').style.display = 'none';
    document.getElementById('quiz-result-screen').style.display = 'none';
    document.getElementById('quiz-play-screen').style.display = 'block';
    showNextQuestion();
}

function showNextQuestion() {
    const qObj = activeQuizPool[currentQIdx];
    document.getElementById('quizProgress').innerText = `🏆 第 ${currentQIdx + 1} / ${activeQuizPool.length} 問`;
    document.getElementById('quizQuestion').innerHTML = qObj.q;
    const optArea = document.getElementById('quizOptions'); optArea.innerHTML = '';
    qObj.opts.forEach((text, idx) => {
        let b = document.createElement('button'); b.className = 'quiz-btn'; b.innerHTML = text;
        b.onclick = () => judgeQuizAnswer(idx); optArea.appendChild(b);
    });
    document.getElementById('quizExplanation').style.display = 'none';
    document.getElementById('nextQuizBtn').style.display = 'none';
}

function judgeQuizAnswer(userPickedIdx) {
    const qObj = activeQuizPool[currentQIdx];
    const isOk = (userPickedIdx === qObj.ans);
    if(isOk) correctQCount++;
    quizHistory.push({ qNum: currentQIdx+1, qText: qObj.q, user: qObj.opts[userPickedIdx], ans: qObj.opts[qObj.ans], isOk: isOk, exp: qObj.exp });
    document.querySelectorAll('#quizOptions .quiz-btn').forEach((btn, idx) => {
        btn.disabled = true;
        if(idx === qObj.ans) btn.classList.add('correct');
        else if(idx === userPickedIdx) btn.classList.add('incorrect');
    });
    const expDiv = document.getElementById('quizExplanation');
    expDiv.innerHTML = `<div style="font-size:18px; font-weight:bold; margin-bottom:8px; color:${isOk?'#27ae60':'#c0392b'};">${isOk?'⭕ 大正解！':'❌ ざんねん...'}</div><div>${qObj.exp.replace(/\n/g,'<br>')}</div>`;
    expDiv.style.display = 'block';
    document.getElementById('nextQuizBtn').style.display = 'block';
}

function nextQuiz() {
    currentQIdx++;
    if(currentQIdx < activeQuizPool.length) showNextQuestion();
    else finishQuiz();
}

function finishQuiz() {
    document.getElementById('quiz-play-screen').style.display = 'none';
    document.getElementById('quiz-result-screen').style.display = 'block';
    document.getElementById('quizScore').innerText = `${correctQCount} / ${activeQuizPool.length}`;
    const rev = document.getElementById('quizReviewArea'); rev.innerHTML = '';
    quizHistory.forEach(h => {
        let d = document.createElement('div');
        d.style.cssText = `background:#fff; border-left:5px solid ${h.isOk?'#2ecc71':'#e74c3c'}; padding:15px; margin-bottom:15px; border-radius:4px; box-shadow:0 1px 3px rgba(0,0,0,0.1);`;
        d.innerHTML = `<div style="font-size:12px; color:#777; font-weight:bold;">Q${h.qNum}. ${h.isOk?'⭕ 正解':'❌ 不正解'}</div><div style="font-weight:bold; font-size:15px; margin:6px 0;">${h.qText}</div><div style="font-size:13px; color:#444;">あなたの解答: <span style="color:${h.isOk?'#27ae60':'#c0392b'}; font-weight:bold;">${h.user}</span><br>正解の選択肢: <span style="color:#27ae60; font-weight:bold;">${h.ans}</span></div><div style="margin-top:8px; font-size:12px; color:#666; background:#f8f9fa; padding:8px; border-radius:4px;">${h.exp.replace(/\n/g,'<br>')}</div>`;
        rev.appendChild(d);
    });
}

function abortQuiz() { document.getElementById('quiz-play-screen').style.display = 'none'; document.getElementById('quiz-start-screen').style.display = 'block'; }
function resetQuiz() { document.getElementById('quiz-result-screen').style.display = 'none'; document.getElementById('quiz-start-screen').style.display = 'block'; }

function toggleFilter(el) { el.classList.toggle('active'); executeAdvancedSearch(); }
