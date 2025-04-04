// 使用嚴格模式
'use strict';

document.addEventListener('DOMContentLoaded', () => {

    // --- 基本設定 ---
    const myLiffId = "2007188640-8vEWkonp"; // **** 請確認 ****
    const submitApiUrl = "https://line-liff-receipt-backend.onrender.com/api/submit-receipt"; // **** 請確認 ****

    // --- 獲取 DOM 元素 (必須與上面的 index.html ID 匹配) ---
    const canvas = document.getElementById('signature-pad');
    const clearButton = document.getElementById('clear-button');
    const confirmButton = document.getElementById('confirm-button');
    const statusMessage = document.getElementById('status-message');
    const placeholder = document.getElementById('signature-placeholder'); // Placeholder

    // --- 獲取【所有】需要讀寫的欄位元素 ---
    // -- Landlord/Lease/Deposit Fields (Potentially pre-filled) --
    const landlordNameEl = document.getElementById('landlordName');
    const landlordPhoneEl = document.getElementById('landlordPhone');
    const leaseAddressEl = document.getElementById('leaseAddress');
    const leaseStartDateEl = document.getElementById('leaseStartDate');
    const leaseEndDateEl = document.getElementById('leaseEndDate');
    const monthlyRentEl = document.getElementById('monthlyRent');
    const depositAmountEl = document.getElementById('depositAmount');
    // -- Added based on previous full script --
    const rentPaymentMethodEl = document.getElementById('rentPaymentMethod');
    const remarksEl = document.getElementById('remarks');
    const depositPaymentMethodEl = document.getElementById('depositPaymentMethod');
    const depositPaymentDateEl = document.getElementById('depositPaymentDate');
    const expectedSigningDateEl = document.getElementById('expectedSigningDate');
    const brokerageFeeAmountEl = document.getElementById('brokerageFeeAmount');
    // -- Editable Tenant Fields --
    const tenantNameEl = document.getElementById('tenantName');
    const tenantPhoneEl = document.getElementById('tenantPhone');
    const tenantEmailEl = document.getElementById('tenantEmail');
    // -- Checkboxes --
    const term4Checkbox = document.getElementById('term4-agree');
    const term5Checkbox = document.getElementById('term5-agree');
    const term6Checkbox = document.getElementById('term6-agree');
    const term7Checkbox = document.getElementById('term7-agree');
    // -- Email Backup Checkbox (optional) --
    const emailBackupCheckbox = document.getElementById('emailBackup');


    // --- 變數宣告 ---
    let signaturePad;
    let currentSaveFolderId = null;

    // --- 主要執行流程 ---
    // Check dependencies first
    if (typeof liff === 'undefined' || typeof SignaturePad === 'undefined') {
         console.error("錯誤：LIFF SDK 或 SignaturePad 庫未成功加載。");
         if(statusMessage) statusMessage.textContent = "錯誤：頁面初始化失敗。";
         // Disable buttons immediately if dependencies missing
         if(confirmButton) confirmButton.disabled = true;
         if(clearButton) clearButton.disabled = true;
         // Optionally disable share button too
         const shareBtn = document.querySelector('button[onclick="shareCurrentDataToLine()"]');
         if(shareBtn) shareBtn.disabled = true;
         return; // Stop execution
    }
    // Proceed with initialization
    initializeLiffAndSignaturePad(myLiffId);


    // --- 函式定義 ---

    async function initializeLiffAndSignaturePad(liffId) {
        if(!statusMessage) { console.error("Status message element not found"); return; }
        statusMessage.textContent = "正在初始化 LIFF...";
        try {
            await liff.init({ liffId: liffId });
            statusMessage.textContent = "LIFF 初始化成功！";

            // 1. Get Folder ID from URL (required for API call)
            const urlParams = new URLSearchParams(window.location.search);
            currentSaveFolderId = urlParams.get('pdfSaveFolderId');

            if (!currentSaveFolderId) {
                console.error("URL 缺少 pdfSaveFolderId 參數！");
                statusMessage.textContent = "錯誤：缺少必要參數 (Folder ID)。";
                if(confirmButton) confirmButton.disabled = true;
                if(clearButton) clearButton.disabled = true;
                return;
            }
            console.log("讀取到 Save Folder ID:", currentSaveFolderId);

            // 2. Populate fields from URL parameters (Landlord's pre-fill mechanism)
            populateFieldsFromUrlParams(urlParams);

            // 3. Initialize Signature Pad
            initializeSignaturePad();

            statusMessage.textContent = "請填寫承租人資訊並簽名確認。";

        } catch (error) {
             console.error("LIFF 初始化錯誤:", error);
             statusMessage.textContent = `錯誤：初始化失敗 (${error.message})。`;
             if(confirmButton) confirmButton.disabled = true;
             if(clearButton) clearButton.disabled = true;
        }
    }

     // ** NEW Function: Populate fields based on URL parameters **
     function populateFieldsFromUrlParams(params) {
        console.log("檢查 URL 參數以預填欄位...");
        const fieldsToPopulate = {
            name: landlordNameEl, // URL 'name' fills landlordName input
            // Note: The original landlord HTML didn't have a landlordPhone input ID.
            // Assuming the new 'landlordPhone' input should be filled if a 'phone' param exists?
            // phone: landlordPhoneEl, // Example: if URL has ?phone=...
            addr: leaseAddressEl, // URL 'addr' fills leaseAddress input
            start: leaseStartDateEl,
            end: leaseEndDateEl,
            rent: monthlyRentEl,
            deposit: depositAmountEl
            // Add mappings for other fields if they can be pre-filled via URL
            // e.g., rentMethod: rentPaymentMethodEl,
        };

        let prefilledCount = 0;
        for (const paramName in fieldsToPopulate) {
            if (params.has(paramName)) {
                const element = fieldsToPopulate[paramName];
                const value = decodeURIComponent(params.get(paramName) || '');
                if (element) {
                    element.value = value;
                    console.log(`已預填欄位 #${element.id} 使用參數 '${paramName}' = '${value}'`);
                    prefilledCount++;
                    // ** REMOVED **: element.setAttribute('readonly', true); // Don't make read-only if script needs it
                } else {
                    console.warn(`找不到用於預填的元素 ID，對應參數 '${paramName}'`);
                }
            }
        }
         if (prefilledCount > 0) {
             console.log(`總共預填了 ${prefilledCount} 個欄位。`);
             // Optionally disable the "Share" button if data is already filled from URL
              // const shareBtn = document.querySelector('button[onclick="shareCurrentDataToLine()"]');
              // if(shareBtn) shareBtn.disabled = true; // Or hide it
         } else {
             console.log("未在 URL 中找到用於預填的參數。");
         }
    }


    function initializeSignaturePad() {
        // ... (Initialization using new SignaturePad - mostly unchanged) ...
         if (!canvas || !placeholder) { /* ... error handling ... */ return; }
         try {
             // ... (Get context, scale, etc.) ...
             const ratio = Math.max(window.devicePixelRatio || 1, 1);
             canvas.width = canvas.offsetWidth * ratio;
             canvas.height = canvas.offsetHeight * ratio;
             const ctx = canvas.getContext("2d");
             if (!ctx) throw new Error("無法獲取 Canvas 2D 上下文。");
             ctx.scale(ratio, ratio);

             signaturePad = new SignaturePad(canvas, { penColor: "rgb(0, 0, 0)" });

             // Placeholder Logic integration with SignaturePad events
             function updatePlaceholderVisibility() { /* ... */
                  if (placeholder && signaturePad) {
                      placeholder.style.display = signaturePad.isEmpty() ? 'block' : 'none';
                  }
             }
             signaturePad.addEventListener("beginStroke", () => { if(placeholder) placeholder.style.display = 'none'; });
             signaturePad.addEventListener("clear", updatePlaceholderVisibility);
             updatePlaceholderVisibility(); // Initial check

             // Button Listeners (no onclick needed in HTML)
             if (clearButton) {
                 clearButton.addEventListener('click', () => { if(signaturePad) signaturePad.clear(); });
             } else { console.error("找不到清除按鈕"); }

             if (confirmButton) {
                 confirmButton.addEventListener('click', handleSubmitSignature);
             } else { console.error("找不到確認按鈕"); }

             window.addEventListener('resize', resizeCanvas);
             console.log("Signature Pad initialized.");

         } catch (error) { /* ... error handling ... */ }
    }

    async function handleSubmitSignature() {
        // ... (Check signaturePad empty - unchanged) ...
        if (!signaturePad || signaturePad.isEmpty()) { /* ... */ return; }

        // ** Collect data from ALL relevant fields **
        const formData = {
            landlordName: landlordNameEl?.value.trim() ?? '',
            landlordPhone: landlordPhoneEl?.value.trim() ?? '', // Now collected
            leaseAddress: leaseAddressEl?.value.trim() ?? '',
            leaseStartDate: leaseStartDateEl?.value.trim() ?? '',
            leaseEndDate: leaseEndDateEl?.value.trim() ?? '',
            monthlyRent: monthlyRentEl?.value.trim() ?? '', // Collect raw value
            depositAmount: depositAmountEl?.value.trim() ?? '', // Collect raw value

            rentPaymentMethod: rentPaymentMethodEl?.value.trim() ?? '',
            remarks: remarksEl?.value.trim() ?? '',
            depositPaymentMethod: depositPaymentMethodEl?.value.trim() ?? '',
            depositPaymentDate: depositPaymentDateEl?.value.trim() ?? '',
            expectedSigningDate: expectedSigningDateEl?.value.trim() ?? '',
            brokerageFeeAmount: brokerageFeeAmountEl?.value.trim() ?? '', // Collect as string/number

            tenantName: tenantNameEl?.value.trim() ?? '',
            tenantPhone: tenantPhoneEl?.value.trim() ?? '',
            tenantEmail: tenantEmailEl?.value.trim() ?? '',
        };


        // ** Validation: Check required fields based on the FULL form now **
        // Adjust this list based on actual requirements
         const requiredFieldData = {
             "房東姓名": formData.landlordName,
             "房東電話": formData.landlordPhone,
             "租賃地址": formData.leaseAddress,
             "租期起": formData.leaseStartDate,
             "租期迄": formData.leaseEndDate,
             "月租金": formData.monthlyRent,
             "訂金金額": formData.depositAmount,
             "訂金付款方式": formData.depositPaymentMethod,
             "訂金付款日期": formData.depositPaymentDate,
             "預定簽約日": formData.expectedSigningDate,
             "承租人姓名": formData.tenantName,
             "承租人電話": formData.tenantPhone,
             "承租人Email": formData.tenantEmail,
         };
         // Exclude optional fields like remarks, brokerageFeeAmount from this basic check
        const missingFields = Object.keys(requiredFieldData).filter(key => !requiredFieldData[key]);

        if (missingFields.length > 0) {
            alert(`請填寫所有必填欄位！(缺少: ${missingFields.join(', ')})`);
            return;
        }

        // Check Folder ID
        if (!currentSaveFolderId) { /* ... */ return; }

        // Check Checkboxes
        const term4Checked = term4Checkbox?.checked;
        const term5Checked = term5Checkbox?.checked;
        const term6Checked = term6Checkbox?.checked;
        const term7Checked = term7Checkbox?.checked;
        if (!term4Checked || !term5Checked || !term6Checked || !term7Checked) {
           alert("請勾選同意所有條款後再提交！");
           return;
        }
        // Optional: Check email backup preference
        const sendEmailBackup = emailBackupCheckbox?.checked ?? false;


        // Update status & disable buttons
        if(statusMessage) statusMessage.textContent = "正在處理並提交...";
        if (confirmButton) confirmButton.disabled = true;
        if (clearButton) clearButton.disabled = true;

        try {
            const signatureImageBase64 = signaturePad.toDataURL('image/png');

            // Construct the FULL payload
            const payload = {
                ...formData, // Includes all fields collected above
                signatureImage: signatureImageBase64,
                pdfSaveFolderId: currentSaveFolderId,
                submittedAt: new Date().toISOString(),
                termsAgreed: {
                   term4: term4Checked, term5: term5Checked, term6: term6Checked, term7: term7Checked,
                },
                sendEmailBackup: sendEmailBackup // Include email preference
            };

            console.log("準備發送到後端的【完整】Payload:", "...", JSON.stringify(payload).length, "bytes");

            // Execute fetch POST to submitApiUrl
            const response = await fetch(submitApiUrl, {
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
            if(signaturePad) signaturePad.off(); // Disable signature pad

            if (typeof liff !== 'undefined' && liff.isInClient()) {
               setTimeout(() => { liff.closeWindow(); }, 5000);
            }

        } catch (error) {
            console.error("提交時發生錯誤:", error);
            if(statusMessage) statusMessage.textContent = `錯誤：提交失敗 (${error.message})。`;
            // Re-enable buttons on failure
            if (confirmButton) confirmButton.disabled = false;
            if (clearButton) clearButton.disabled = false;
        }
    }

    function resizeCanvas() {
        // (Unchanged - uses signaturePad.toData/fromData)
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

    // ** NEW Function for the specific share button in the merged HTML **
    // This reads current values from the fields meant to be pre-filled
     window.shareCurrentDataToLine = () => {
        console.log("正在準備分享連結...");
        const name = encodeURIComponent(landlordNameEl?.value || '');
        const addr = encodeURIComponent(leaseAddressEl?.value || '');
        const start = encodeURIComponent(leaseStartDateEl?.value || '');
        const end = encodeURIComponent(leaseEndDateEl?.value || '');
        const rent = encodeURIComponent(monthlyRentEl?.value || '');
        const deposit = encodeURIComponent(depositAmountEl?.value || '');

        // Construct URL with current data as parameters
        const base = window.location.origin + window.location.pathname;
         // Only include non-empty parameters
         const params = new URLSearchParams();
         if (name) params.set('name', decodeURIComponent(name)); // Decode for readability if needed in logs
         if (addr) params.set('addr', decodeURIComponent(addr));
         if (start) params.set('start', decodeURIComponent(start));
         if (end) params.set('end', decodeURIComponent(end));
         if (rent) params.set('rent', decodeURIComponent(rent));
         if (deposit) params.set('deposit', decodeURIComponent(deposit));
         // Crucially, add the folder ID so the recipient page can use it
         if (currentSaveFolderId) params.set('pdfSaveFolderId', currentSaveFolderId);


        const urlToShare = `${base}?${params.toString()}`;

        const text = encodeURIComponent('這是您的租屋訂金表單連結，請填寫後簽名確認：');
        const lineUrl = `https://line.me/R/msg/text/?${text}%0A${encodeURIComponent(urlToShare)}`;

        console.log("分享的 URL:", urlToShare); // Log the URL being shared
        window.location.href = lineUrl;
    };

    // Remove the old shareToLine if it exists, to avoid confusion
    // delete window.shareToLine; // Optional cleanup


}); // DOMContentLoaded End