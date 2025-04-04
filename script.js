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
    const shareButtonGroup = document.getElementById('share-button-group'); // Share button group

    // --- 獲取【所有】欄位元素 ---
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
    const displayRentPaymentMethodEl = document.getElementById('display_rentPaymentMethod');
    const displayBrokerageFeeAmountEl = document.getElementById('display_brokerageFeeAmount');
    const displayRemarksEl = document.getElementById('display_remarks');
    // -- Hidden Input Fields --
    const landlordNameEl = document.getElementById('landlordName');
    const landlordPhoneEl = document.getElementById('landlordPhone');
    const leaseAddressEl = document.getElementById('leaseAddress');
    const leaseStartDateEl = document.getElementById('leaseStartDate');
    const leaseEndDateEl = document.getElementById('leaseEndDate');
    const monthlyRentEl = document.getElementById('monthlyRent');
    const depositAmountEl = document.getElementById('depositAmount');
    const rentPaymentMethodEl = document.getElementById('rentPaymentMethod');
    const remarksEl = document.getElementById('remarks');
    const depositPaymentMethodEl = document.getElementById('depositPaymentMethod');
    const depositPaymentDateEl = document.getElementById('depositPaymentDate');
    const expectedSigningDateEl = document.getElementById('expectedSigningDate');
    const brokerageFeeAmountEl = document.getElementById('brokerageFeeAmount');
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
    // let isTenantMode = false; // No longer explicitly needed

    // --- 主要執行流程 ---
    if (typeof liff === 'undefined' || typeof SignaturePad === 'undefined') {
         console.error("錯誤：LIFF SDK 或 SignaturePad 庫未成功加載。");
         if(statusMessage) statusMessage.textContent = "錯誤：頁面初始化失敗。";
         if(confirmButton) confirmButton.disabled = true;
         if(clearButton) clearButton.disabled = true;
         if(shareButtonGroup) shareButtonGroup.style.display = 'none'; // Hide share if error
         return;
    }
    initializeLiffAndSignaturePad(myLiffId);


    // --- 函式定義 ---

    async function initializeLiffAndSignaturePad(liffId) {
        if(!statusMessage) { console.error("Status message element not found"); return; }
        statusMessage.textContent = "正在初始化 LIFF...";
        try {
            await liff.init({ liffId: liffId });
            console.log("LIFF 初始化成功！");

            // 1. Get Folder ID from URL (Always required)
            const urlParams = new URLSearchParams(window.location.search);
            currentSaveFolderId = urlParams.get('pdfSaveFolderId');

            if (!currentSaveFolderId) {
                console.error("URL 缺少 pdfSaveFolderId 參數！");
                statusMessage.textContent = "錯誤：缺少必要的 Folder ID，請從房東提供的正確連結開啟。";
                disableAllInteractions(); // Disable everything
                return;
            }
            console.log("讀取到 Save Folder ID:", currentSaveFolderId);

            // 2. Populate fields (display spans AND hidden inputs) from URL parameters
            populateFieldsFromUrlParams(urlParams);

            // 3. Initialize Signature Pad
            initializeSignaturePad();

            statusMessage.textContent = "請填寫您的資訊並簽名確認。"; // Tenant focused message

        } catch (error) {
             console.error("LIFF 初始化或設定錯誤:", error);
             statusMessage.textContent = `錯誤：頁面載入失敗 (${error.message})。`;
             disableAllInteractions();
        }
    }

    // ** UPDATED Function: Populate BOTH display spans AND hidden inputs **
    function populateFieldsFromUrlParams(params) {
        console.log("檢查 URL 參數以預填欄位...");
        // Map URL param name to { displayElement, hiddenInputElement }
         const fieldsToPopulate = {
            name: { display: displayLandlordNameEl, input: landlordNameEl },
            phone: { display: displayLandlordPhoneEl, input: landlordPhoneEl },
            addr: { display: displayLeaseAddressEl, input: leaseAddressEl },
            start: { display: displayLeaseStartDateEl, input: leaseStartDateEl },
            end: { display: displayLeaseEndDateEl, input: leaseEndDateEl },
            rent: { display: displayMonthlyRentEl, input: monthlyRentEl },
            deposit: { display: displayDepositAmountEl, input: depositAmountEl },
            depMethod: { display: displayDepositPaymentMethodEl, input: depositPaymentMethodEl },
            depDate: { display: displayDepositPaymentDateEl, input: depositPaymentDateEl },
            signDate: { display: displayExpectedSigningDateEl, input: expectedSigningDateEl },
            rentMethod: { display: displayRentPaymentMethodEl, input: rentPaymentMethodEl },
            brokerage: { display: displayBrokerageFeeAmountEl, input: brokerageFeeAmountEl },
            remarks: { display: displayRemarksEl, input: remarksEl }
        };

        let prefilledCount = 0;
        let hasAnyPrefillParam = false; // Flag to check if landlord data exists

        for (const paramName in fieldsToPopulate) {
             const elements = fieldsToPopulate[paramName];
             const value = decodeURIComponent(params.get(paramName) || ''); // Get value or empty string

             // Always try to populate both display and hidden input if they exist
             if (elements.display) {
                 elements.display.textContent = value || '-'; // Display '-' if empty
             }
             if (elements.input) {
                 elements.input.value = value; // Set hidden input value
             }

             // Check if this param indicates prefilled data
             if (params.has(paramName) && value !== '') {
                 hasAnyPrefillParam = true;
                 prefilledCount++;
                 if (elements.input) console.log(`已預填欄位 #${elements.input.id} 使用參數 '${paramName}'`);
             }
        }

         if (hasAnyPrefillParam) {
             console.log(`偵測到預填資料，總共 ${prefilledCount} 個欄位。`);
              // Show share button only if data is prefilled? (Landlord might re-share)
             if (shareButtonGroup) shareButtonGroup.style.display = 'flex'; // Or 'block'
         } else {
             console.log("未在 URL 中找到預填參數。");
             // Hide share button if no prefilled data
              if (shareButtonGroup) shareButtonGroup.style.display = 'none';
             // Clear display fields if no params found
              Object.values(fieldsToPopulate).forEach(elements => {
                  if (elements.display) elements.display.textContent = '';
                   // Hidden inputs are already empty or will be '' from get() default
              });
         }
    }


     // ** NEW Function: Disable all interactions **
     function disableAllInteractions() {
         document.querySelectorAll('button').forEach(btn => btn.disabled = true);
         document.querySelectorAll('input, textarea').forEach(el => {
             // Keep hidden fields enabled so their value can be read if needed
             if (el.type !== 'hidden') {
                 el.disabled = true;
             }
         });
         document.querySelectorAll('input[type="checkbox"]').forEach(el => el.disabled = true);
         if (signaturePad) signaturePad.off();
         console.error("頁面互動功能已禁用。");
     }


    function initializeSignaturePad() {
        // (Initialization using new SignaturePad - unchanged)
         if (!canvas || !placeholder) { /* ... */ return; }
         try {
             const ratio = Math.max(window.devicePixelRatio || 1, 1);
             canvas.width = canvas.offsetWidth * ratio;
             canvas.height = canvas.offsetHeight * ratio;
             const ctx = canvas.getContext("2d");
             if (!ctx) throw new Error("無法獲取 Canvas 2D 上下文。");
             ctx.scale(ratio, ratio);
             signaturePad = new SignaturePad(canvas, { penColor: "rgb(0, 0, 0)" });

             function updatePlaceholderVisibility() { /* ... */
                  if (placeholder && signaturePad) placeholder.style.display = signaturePad.isEmpty() ? 'block' : 'none';
             }
             signaturePad.addEventListener("beginStroke", () => { if(placeholder) placeholder.style.display = 'none'; });
             signaturePad.addEventListener("clear", updatePlaceholderVisibility);
             updatePlaceholderVisibility();

             if (clearButton) {
                 clearButton.addEventListener('click', () => { if(signaturePad) signaturePad.clear(); });
             } else { console.error("找不到清除按鈕"); }

             if (confirmButton) {
                 confirmButton.addEventListener('click', handleSubmitSignature);
             } else { console.error("找不到確認按鈕"); }

             window.addEventListener('resize', resizeCanvas);
             console.log("Signature Pad initialized.");

         } catch (error) { /* ... */ }
    }

    async function handleSubmitSignature() {
        // (Check signaturePad empty - unchanged)
        if (!signaturePad || signaturePad.isEmpty()) { alert("請承租人簽名確認！"); return; }

        // ** Collect data: Reads from HIDDEN inputs for landlord/lease info **
        // ** and VISIBLE inputs for tenant info **
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

        // ** Validation (Ensure required fields, including potentially prefilled ones, are not empty) **
         const requiredFieldData = {
             "房東姓名": formData.landlordName, // Check prefilled data too
             "租賃地址": formData.leaseAddress, // Check prefilled data too
             "月租金": formData.monthlyRent,   // Check prefilled data too
             "訂金金額": formData.depositAmount, // Check prefilled data too
             "承租人姓名": formData.tenantName, // Check tenant input
             "承租人電話": formData.tenantPhone, // Check tenant input
             "承租人Email": formData.tenantEmail, // Check tenant input
              // Add other fields that MUST have a value before submitting
             "訂金付款方式": formData.depositPaymentMethod,
             "訂金付款日期": formData.depositPaymentDate,
             "預定簽約日": formData.expectedSigningDate,
         };
        const missingFields = Object.keys(requiredFieldData).filter(key => !requiredFieldData[key]);
        if (missingFields.length > 0) {
            alert(`資料不完整！請檢查以下欄位：${missingFields.join(', ')} (可能是房東提供的連結資料不齊，或您未填寫承租人資訊)`);
            return;
        }


        // Check Folder ID
        if (!currentSaveFolderId) { alert("錯誤：缺少 Folder ID。"); return; }

        // Check Checkboxes
        const term4Checked = term4Checkbox?.checked;
        // ... check terms 5, 6, 7 ...
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
        // ... disable confirm/clear buttons ...
        if (confirmButton) confirmButton.disabled = true;
        if (clearButton) clearButton.disabled = true;


        try {
            const signatureImageBase64 = signaturePad.toDataURL('image/png');
            // Construct the FULL payload - unchanged
            const payload = {
                ...formData,
                signatureImage: signatureImageBase64,
                pdfSaveFolderId: currentSaveFolderId,
                submittedAt: new Date().toISOString(),
                termsAgreed: { term4: term4Checked, term5: term5Checked, term6: term6Checked, term7: term7Checked },
                sendEmailBackup: sendEmailBackup
            };

            console.log("準備發送 Payload:", "...", JSON.stringify(payload).length, "bytes");
            // Execute fetch POST - unchanged
            const response = await fetch(submitApiUrl, { /* ... */
                method: 'POST',
                 headers: { 'Content-Type': 'application/json' },
                 body: JSON.stringify(payload)
             });

            // Handle response - unchanged
            if (!response.ok) { throw new Error(`伺服器錯誤 ${response.status}`); }
            const result = await response.json();
            console.log("Submission successful:", result);
            let successMsg = "資料與簽名已成功提交！";
            if (result.drive_web_view_link) { /* ... */
                successMsg += ` <a href="${result.drive_web_view_link}" target="_blank" rel="noopener noreferrer">點此查看 PDF</a>`;
            }
            if(statusMessage) statusMessage.innerHTML = successMsg;
            if(signaturePad) signaturePad.off();

            if (typeof liff !== 'undefined' && liff.isInClient()) {
               setTimeout(() => { liff.closeWindow(); }, 5000);
            }

        } catch (error) {
            // ... Error handling - unchanged ...
             console.error("提交時發生錯誤:", error);
            if(statusMessage) statusMessage.textContent = `錯誤：提交失敗 (${error.message})。`;
            if (confirmButton) confirmButton.disabled = false;
            if (clearButton) clearButton.disabled = false;
        }
    }

    function resizeCanvas() {
        // (Unchanged)
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

    // ** UPDATED Share Function: Reads from HIDDEN inputs **
    window.shareCurrentDataToLine = () => {
        console.log("正在準備分享連結 (讀取隱藏欄位)...");
         // Read values from the hidden input fields using their standard IDs
         const name = encodeURIComponent(landlordNameEl?.value || '');
         const phone = encodeURIComponent(landlordPhoneEl?.value || '');
         const addr = encodeURIComponent(leaseAddressEl?.value || '');
         const start = encodeURIComponent(leaseStartDateEl?.value || '');
         const end = encodeURIComponent(leaseEndDateEl?.value || '');
         const rent = encodeURIComponent(monthlyRentEl?.value || '');
         const deposit = encodeURIComponent(depositAmountEl?.value || '');
         const depMethod = encodeURIComponent(depositPaymentMethodEl?.value || '');
         const depDate = encodeURIComponent(depositPaymentDateEl?.value || '');
         const signDate = encodeURIComponent(expectedSigningDateEl?.value || '');
         const rentMethod = encodeURIComponent(rentPaymentMethodEl?.value || '');
         const brokerage = encodeURIComponent(brokerageFeeAmountEl?.value || '');
         const remarksVal = encodeURIComponent(remarksEl?.value || '');

        const base = window.location.origin + window.location.pathname;
        const params = new URLSearchParams();
         // Add parameters based on hidden input values
         if (decodeURIComponent(name)) params.set('name', decodeURIComponent(name));
         if (decodeURIComponent(phone)) params.set('phone', decodeURIComponent(phone));
         if (decodeURIComponent(addr)) params.set('addr', decodeURIComponent(addr));
         if (decodeURIComponent(start)) params.set('start', decodeURIComponent(start));
         if (decodeURIComponent(end)) params.set('end', decodeURIComponent(end));
         if (decodeURIComponent(rent)) params.set('rent', decodeURIComponent(rent));
         if (decodeURIComponent(deposit)) params.set('deposit', decodeURIComponent(deposit));
         if (decodeURIComponent(depMethod)) params.set('depMethod', decodeURIComponent(depMethod));
         if (decodeURIComponent(depDate)) params.set('depDate', decodeURIComponent(depDate));
         if (decodeURIComponent(signDate)) params.set('signDate', decodeURIComponent(signDate));
         if (decodeURIComponent(rentMethod)) params.set('rentMethod', decodeURIComponent(rentMethod));
         if (decodeURIComponent(brokerage)) params.set('brokerage', decodeURIComponent(brokerage));
         if (decodeURIComponent(remarksVal)) params.set('remarks', decodeURIComponent(remarksVal));


         // ** Crucially, include the Folder ID **
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