// 使用嚴格模式
'use strict';

document.addEventListener('DOMContentLoaded', () => {

    // --- 基本設定 ---
    const myLiffId = "2007188640-8vEWkonp"; // **** 請確認 ****
    const submitApiUrl = "https://line-liff-receipt-backend.onrender.com/api/submit-receipt"; // **** 請確認 ****

    // --- 獲取 DOM 元素 ---
    const canvas = document.getElementById('signature-pad');
    const clearButton = document.getElementById('clear-button');
    const confirmButton = document.getElementById('confirm-button');
    const statusMessage = document.getElementById('status-message');
    const placeholder = document.getElementById('signature-placeholder');

    // --- 獲取【所有】需要讀/寫的欄位元素 (包括隱藏欄位和顯示區域) ---
    // -- Display Elements --
    const displayLandlordNameEl = document.getElementById('display_landlordName');
    const displayLandlordPhoneEl = document.getElementById('display_landlordPhone');
    const displayLeaseAddressEl = document.getElementById('display_leaseAddress');
    const displayLeaseStartDateEl = document.getElementById('display_leaseStartDate');
    const displayLeaseEndDateEl = document.getElementById('display_leaseEndDate');
    const displayMonthlyRentEl = document.getElementById('display_monthlyRent');
    const displayDepositAmountEl = document.getElementById('display_depositAmount');
    const displayDepositPaymentMethodEl = document.getElementById('display_depositPaymentMethod');
    const displayDepositPaymentDateEl = document.getElementById('display_depositPaymentDate');
    const displayExpectedSigningDateEl = document.getElementById('display_expectedSigningDate');
    // -- Hidden Input Fields (using standard IDs script expects) --
    const landlordNameEl = document.getElementById('landlordName');
    const landlordPhoneEl = document.getElementById('landlordPhone');
    const leaseAddressEl = document.getElementById('leaseAddress');
    const leaseStartDateEl = document.getElementById('leaseStartDate');
    const leaseEndDateEl = document.getElementById('leaseEndDate');
    const monthlyRentEl = document.getElementById('monthlyRent');
    const depositAmountEl = document.getElementById('depositAmount');
    const rentPaymentMethodEl = document.getElementById('rentPaymentMethod'); // Assuming hidden or prefilled
    const remarksEl = document.getElementById('remarks'); // Assuming hidden or prefilled
    const depositPaymentMethodEl = document.getElementById('depositPaymentMethod'); // Assuming hidden or prefilled
    const depositPaymentDateEl = document.getElementById('depositPaymentDate'); // Assuming hidden or prefilled
    const expectedSigningDateEl = document.getElementById('expectedSigningDate'); // Assuming hidden or prefilled
    const brokerageFeeAmountEl = document.getElementById('brokerageFeeAmount'); // Assuming hidden or prefilled
    // -- Tenant Editable Fields --
    const tenantNameEl = document.getElementById('tenantName');
    const tenantPhoneEl = document.getElementById('tenantPhone');
    const tenantEmailEl = document.getElementById('tenantEmail');
    // -- Checkboxes --
    const term4Checkbox = document.getElementById('term4-agree');
    const term5Checkbox = document.getElementById('term5-agree');
    const term6Checkbox = document.getElementById('term6-agree');
    const term7Checkbox = document.getElementById('term7-agree');
    const emailBackupCheckbox = document.getElementById('emailBackup');

    // --- 變數宣告 ---
    let signaturePad;
    let currentSaveFolderId = null;

    // --- 主要執行流程 ---
    if (typeof liff === 'undefined' || typeof SignaturePad === 'undefined') {
         console.error("錯誤：LIFF SDK 或 SignaturePad 庫未成功加載。");
         // ... (Error handling, disable buttons) ...
         if(statusMessage) statusMessage.textContent = "錯誤：頁面初始化失敗。";
         if(confirmButton) confirmButton.disabled = true;
         if(clearButton) clearButton.disabled = true;
         const shareBtn = document.querySelector('button[onclick="shareCurrentDataToLine()"]');
         if(shareBtn) shareBtn.disabled = true;
         return;
    }
    initializeLiffAndSignaturePad(myLiffId);


    // --- 函式定義 ---

    async function initializeLiffAndSignaturePad(liffId) {
        // ... (LIFF Init, Get Folder ID - unchanged) ...
        if(!statusMessage) { /*...*/ return; }
        statusMessage.textContent = "正在初始化 LIFF...";
        try {
            await liff.init({ liffId: liffId });
            statusMessage.textContent = "LIFF 初始化成功！";

            const urlParams = new URLSearchParams(window.location.search);
            currentSaveFolderId = urlParams.get('pdfSaveFolderId');

            if (!currentSaveFolderId) { /* ... Error Handling ... */ return; }
            console.log("讀取到 Save Folder ID:", currentSaveFolderId);

            // ** MODIFIED: Populate BOTH display elements AND hidden inputs **
            populateFieldsFromUrlParams(urlParams);

            initializeSignaturePad();

            statusMessage.textContent = "請填寫承租人資訊並簽名確認。";

        } catch (error) { /* ... Error Handling ... */ }
    }

    // ** UPDATED Function: Populate BOTH display spans AND hidden inputs **
    function populateFieldsFromUrlParams(params) {
        console.log("檢查 URL 參數以預填欄位...");
        // Map URL param name to { displayElement, hiddenInputElement }
        const fieldsToPopulate = {
            name: { display: displayLandlordNameEl, input: landlordNameEl },
            phone: { display: displayLandlordPhoneEl, input: landlordPhoneEl }, // Assuming URL param 'phone' maps to landlordPhone
            addr: { display: displayLeaseAddressEl, input: leaseAddressEl },
            start: { display: displayLeaseStartDateEl, input: leaseStartDateEl },
            end: { display: displayLeaseEndDateEl, input: leaseEndDateEl },
            rent: { display: displayMonthlyRentEl, input: monthlyRentEl },
            deposit: { display: displayDepositAmountEl, input: depositAmountEl },
            // Add mappings for other pre-fillable fields
             depMethod: { display: displayDepositPaymentMethodEl, input: depositPaymentMethodEl }, // Example param name
             depDate: { display: displayDepositPaymentDateEl, input: depositPaymentDateEl },       // Example param name
             signDate: { display: displayExpectedSigningDateEl, input: expectedSigningDateEl },    // Example param name
             rentMethod: { display: null, input: rentPaymentMethodEl }, // Example: Only fill hidden if display element doesn't exist
             remarks: { display: null, input: remarksEl },
             brokerage: { display: null, input: brokerageFeeAmountEl }
        };

        let prefilledCount = 0;
        for (const paramName in fieldsToPopulate) {
            if (params.has(paramName)) {
                const elements = fieldsToPopulate[paramName];
                const value = decodeURIComponent(params.get(paramName) || '');

                // Populate display element (if it exists)
                if (elements.display) {
                    elements.display.textContent = value || '(未提供)'; // Set text content
                }

                // Populate hidden input element (if it exists)
                if (elements.input) {
                    elements.input.value = value; // Set hidden input value
                    console.log(`已預填隱藏欄位 #${elements.input.id} 使用參數 '${paramName}'`);
                    prefilledCount++;
                }
            } else {
                 // Set default for display elements if param missing
                 const elements = fieldsToPopulate[paramName];
                 if (elements.display) {
                     elements.display.textContent = '(未提供)';
                 }
                  // Set default for hidden input if param missing (important!)
                 if (elements.input) {
                     elements.input.value = ''; // Set to empty string if not provided
                 }
            }
        }
         if (prefilledCount > 0) {
             console.log(`總共預填了 ${prefilledCount} 個欄位。`);
         } else {
             console.log("未在 URL 中找到用於預填的參數。");
             // Optionally clear display fields if no params found
              Object.values(fieldsToPopulate).forEach(elements => {
                  if (elements.display) elements.display.textContent = '';
                   if (elements.input) elements.input.value = ''; // Clear hidden inputs too
              });
         }
    }


    function initializeSignaturePad() {
        // ... (Initialization using new SignaturePad - unchanged) ...
        if (!canvas || !placeholder) { /*...*/ return; }
        try {
            // ... (Get context, scale, create SignaturePad instance) ...
             const ratio = Math.max(window.devicePixelRatio || 1, 1);
             canvas.width = canvas.offsetWidth * ratio;
             canvas.height = canvas.offsetHeight * ratio;
             const ctx = canvas.getContext("2d");
             if (!ctx) throw new Error("無法獲取 Canvas 2D 上下文。");
             ctx.scale(ratio, ratio);
             signaturePad = new SignaturePad(canvas, { penColor: "rgb(0, 0, 0)" });


            // Placeholder Logic
            function updatePlaceholderVisibility() { /*...*/
                 if (placeholder && signaturePad) placeholder.style.display = signaturePad.isEmpty() ? 'block' : 'none';
            }
            signaturePad.addEventListener("beginStroke", () => { if(placeholder) placeholder.style.display = 'none'; });
            signaturePad.addEventListener("clear", updatePlaceholderVisibility);
            updatePlaceholderVisibility();

            // Button Listeners
            if (clearButton) {
                clearButton.addEventListener('click', () => { if(signaturePad) signaturePad.clear(); });
            } else { console.error("找不到清除按鈕"); }

            if (confirmButton) {
                confirmButton.addEventListener('click', handleSubmitSignature);
            } else { console.error("找不到確認按鈕"); }

            window.addEventListener('resize', resizeCanvas);
            console.log("Signature Pad initialized.");

        } catch (error) { /*...*/ }
    }

    async function handleSubmitSignature() {
        // ... (Check signaturePad empty - unchanged) ...
        if (!signaturePad || signaturePad.isEmpty()) { alert("請承租人簽名確認！"); return; }

        // ** Collect data from ALL hidden and visible inputs using their standard IDs **
        const formData = {
            // Reads from hidden inputs (filled by URL params or empty)
            landlordName: landlordNameEl?.value.trim() ?? '',
            landlordPhone: landlordPhoneEl?.value.trim() ?? '',
            leaseAddress: leaseAddressEl?.value.trim() ?? '',
            leaseStartDate: leaseStartDateEl?.value.trim() ?? '',
            leaseEndDate: leaseEndDateEl?.value.trim() ?? '',
            monthlyRent: monthlyRentEl?.value.trim() ?? '',
            depositAmount: depositAmountEl?.value.trim() ?? '',
            rentPaymentMethod: rentPaymentMethodEl?.value.trim() ?? '',
            remarks: remarksEl?.value.trim() ?? '',
            depositPaymentMethod: depositPaymentMethodEl?.value.trim() ?? '',
            depositPaymentDate: depositPaymentDateEl?.value.trim() ?? '',
            expectedSigningDate: expectedSigningDateEl?.value.trim() ?? '',
            brokerageFeeAmount: brokerageFeeAmountEl?.value.trim() ?? '',
            // Reads from visible tenant inputs
            tenantName: tenantNameEl?.value.trim() ?? '',
            tenantPhone: tenantPhoneEl?.value.trim() ?? '',
            tenantEmail: tenantEmailEl?.value.trim() ?? '',
        };

        // ** Validation - Check required fields (adjust list as needed) **
        const requiredFieldData = {
            // Example: Check fields that MUST be present, even if prefilled
             "房東姓名": formData.landlordName,
             "租賃地址": formData.leaseAddress,
             "月租金": formData.monthlyRent,
             "訂金金額": formData.depositAmount,
             // Tenant fields are still required to be filled by user
             "承租人姓名": formData.tenantName,
             "承租人電話": formData.tenantPhone,
             "承租人Email": formData.tenantEmail,
        };
        const missingFields = Object.keys(requiredFieldData).filter(key => !requiredFieldData[key]);
        if (missingFields.length > 0) {
            alert(`請填寫所有必填欄位！(缺少: ${missingFields.join(', ')})`);
            return;
        }


        // Check Folder ID
        if (!currentSaveFolderId) { /* ... Error Handling ... */ return; }

        // Check Checkboxes
        const term4Checked = term4Checkbox?.checked;
        // ... (Check term5, term6, term7) ...
        const term5Checked = term5Checkbox?.checked;
        const term6Checked = term6Checkbox?.checked;
        const term7Checked = term7Checkbox?.checked;
        if (!term4Checked || !term5Checked || !term6Checked || !term7Checked) {
           alert("請勾選同意所有條款後再提交！");
           return;
        }
        const sendEmailBackup = emailBackupCheckbox?.checked ?? false;


        // Update status & disable buttons
        if(statusMessage) statusMessage.textContent = "正在處理並提交...";
        // ... (disable buttons) ...
        if (confirmButton) confirmButton.disabled = true;
        if (clearButton) clearButton.disabled = true;


        try {
            const signatureImageBase64 = signaturePad.toDataURL('image/png');

            // Construct the FULL payload using collected formData
            const payload = {
                ...formData, // Includes all fields now
                signatureImage: signatureImageBase64,
                pdfSaveFolderId: currentSaveFolderId,
                submittedAt: new Date().toISOString(),
                termsAgreed: { term4: term4Checked, term5: term5Checked, term6: term6Checked, term7: term7Checked },
                sendEmailBackup: sendEmailBackup
            };

            console.log("準備發送到後端的【完整】Payload:", "...", JSON.stringify(payload).length, "bytes");

            // Execute fetch POST to submitApiUrl - unchanged
            const response = await fetch(submitApiUrl, { /* ... */
                 method: 'POST',
                 headers: { 'Content-Type': 'application/json' },
                 body: JSON.stringify(payload)
             });

            // Handle response (success/error, close window) - unchanged
            if (!response.ok) { /* ... error handling ... */ throw new Error(`伺服器錯誤 ${response.status}`); }
             const result = await response.json();
             console.log("Submission successful:", result);
             let successMsg = "資料與簽名已成功提交！";
             if (result.drive_web_view_link) {
                 successMsg += ` <a href="${result.drive_web_view_link}" target="_blank" rel="noopener noreferrer">點此查看 PDF</a>`;
             }
             if(statusMessage) statusMessage.innerHTML = successMsg;
             if(signaturePad) signaturePad.off();

             if (typeof liff !== 'undefined' && liff.isInClient()) {
                setTimeout(() => { liff.closeWindow(); }, 5000);
             }


        } catch (error) {
             // ... (Error handling - unchanged, re-enable buttons) ...
            console.error("提交時發生錯誤:", error);
            if(statusMessage) statusMessage.textContent = `錯誤：提交失敗 (${error.message})。`;
            if (confirmButton) confirmButton.disabled = false;
            if (clearButton) clearButton.disabled = false;

        }
    }

    function resizeCanvas() {
        // (Unchanged - uses signaturePad methods)
         if (!signaturePad || !canvas || !placeholder) return;
         const data = signaturePad.toData();
         const ratio = Math.max(window.devicePixelRatio || 1, 1);
          if (canvas.offsetWidth > 0 && canvas.offsetHeight > 0) {
             canvas.width = canvas.offsetWidth * ratio;
             canvas.height = canvas.offsetHeight * ratio;
             canvas.getContext("2d").scale(ratio, ratio);
             signaturePad.clear();
             signaturePad.fromData(data);
             if(placeholder) placeholder.style.display = signaturePad.isEmpty() ? 'block' : 'none';
          }
    }

    // ** UPDATED Share Function: Reads from HIDDEN inputs to create URL **
     window.shareCurrentDataToLine = () => {
        console.log("正在準備分享連結 (讀取隱藏欄位)...");
         // Read values from the hidden input fields
         const name = encodeURIComponent(landlordNameEl?.value || '');
         const phone = encodeURIComponent(landlordPhoneEl?.value || ''); // Get landlord phone
         const addr = encodeURIComponent(leaseAddressEl?.value || '');
         const start = encodeURIComponent(leaseStartDateEl?.value || '');
         const end = encodeURIComponent(leaseEndDateEl?.value || '');
         const rent = encodeURIComponent(monthlyRentEl?.value || '');
         const deposit = encodeURIComponent(depositAmountEl?.value || '');
         // Add other parameters as needed, reading from hidden inputs
         const depMethod = encodeURIComponent(depositPaymentMethodEl?.value || '');
         const depDate = encodeURIComponent(depositPaymentDateEl?.value || '');
         const signDate = encodeURIComponent(expectedSigningDateEl?.value || '');
         const rentMethod = encodeURIComponent(rentPaymentMethodEl?.value || '');
         const brokerage = encodeURIComponent(brokerageFeeAmountEl?.value || '');


        const base = window.location.origin + window.location.pathname;
        const params = new URLSearchParams();
         // Add parameters to share based on hidden input values
         if (decodeURIComponent(name)) params.set('name', decodeURIComponent(name));
         if (decodeURIComponent(phone)) params.set('phone', decodeURIComponent(phone)); // Added phone
         if (decodeURIComponent(addr)) params.set('addr', decodeURIComponent(addr));
         if (decodeURIComponent(start)) params.set('start', decodeURIComponent(start));
         if (decodeURIComponent(end)) params.set('end', decodeURIComponent(end));
         if (decodeURIComponent(rent)) params.set('rent', decodeURIComponent(rent));
         if (decodeURIComponent(deposit)) params.set('deposit', decodeURIComponent(deposit));
         // Add others if needed in the URL for the recipient
         if (decodeURIComponent(depMethod)) params.set('depMethod', decodeURIComponent(depMethod));
         if (decodeURIComponent(depDate)) params.set('depDate', decodeURIComponent(depDate));
         if (decodeURIComponent(signDate)) params.set('signDate', decodeURIComponent(signDate));
         if (decodeURIComponent(rentMethod)) params.set('rentMethod', decodeURIComponent(rentMethod));
         if (decodeURIComponent(brokerage)) params.set('brokerage', decodeURIComponent(brokerage));

         // ** Crucially, include the Folder ID in the shared link **
         if (currentSaveFolderId) {
             params.set('pdfSaveFolderId', currentSaveFolderId);
         } else {
             console.warn("無法分享 Folder ID，因為它尚未從 URL 讀取。");
             alert("頁面缺少必要的 Folder ID，無法產生分享連結。");
             return;
         }

        const urlToShare = `${base}?${params.toString()}`;
        const text = encodeURIComponent('這是您的租屋訂金表單連結，請填寫後簽名確認：');
        const lineUrl = `https://line.me/R/msg/text/?${text}%0A${encodeURIComponent(urlToShare)}`;

        console.log("分享的 URL:", urlToShare);
        window.location.href = lineUrl;
    };

}); // DOMContentLoaded End