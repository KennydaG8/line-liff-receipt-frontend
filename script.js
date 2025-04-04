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

    // **獲取【所有】需要傳送的欄位元素**
    // -- Readonly Fields --
    const landlordNameRoEl = document.getElementById('landlordName_ro'); // Added
    const leaseAddressRoEl = document.getElementById('leaseAddress_ro'); // Added
    const leaseStartDateRoEl = document.getElementById('leaseStartDate_ro'); // Added
    const leaseEndDateRoEl = document.getElementById('leaseEndDate_ro');   // Added
    const monthlyRentRoEl = document.getElementById('monthlyRent_ro');   // Added
    const depositAmountRoEl = document.getElementById('depositAmount_ro');  // Added
    // -- Editable Tenant Fields --
    const tenantNameEl = document.getElementById('tenantName');
    const tenantPhoneEl = document.getElementById('tenantPhone');
    const tenantEmailEl = document.getElementById('tenantEmail');
    // -- Checkboxes --
    const term4Checkbox = document.getElementById('term4-agree');
    const term5Checkbox = document.getElementById('term5-agree');
    const term6Checkbox = document.getElementById('term6-agree');
    const term7Checkbox = document.getElementById('term7-agree');

    // --- 變數宣告 ---
    let signaturePad;
    let currentSaveFolderId = null;

    // --- 主要執行流程 ---
    if (typeof liff !== 'undefined' && typeof SignaturePad !== 'undefined') {
        initializeLiffAndSignaturePad(myLiffId);
    } else {
        console.error("錯誤：LIFF SDK 或 SignaturePad 庫未成功加載。");
        if(statusMessage) statusMessage.textContent = "錯誤：頁面初始化失敗。";
        if(confirmButton) confirmButton.disabled = true;
        if(clearButton) clearButton.disabled = true;
    }

    // --- 函式定義 ---

    async function initializeLiffAndSignaturePad(liffId) {
        // ... (LIFF 初始化, 讀取 URL Folder ID - 保持不變) ...
        if(!statusMessage) return;
        statusMessage.textContent = "正在初始化 LIFF...";
        try {
            await liff.init({ liffId: liffId });
            statusMessage.textContent = "LIFF 初始化成功！";

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

            initializeSignaturePad();

            statusMessage.textContent = "請填寫承租人資訊並簽名確認。"; // Updated text

        } catch (error) {
             console.error("LIFF 初始化錯誤:", error);
             statusMessage.textContent = `錯誤：初始化失敗 (${error.message})。`;
             if(confirmButton) confirmButton.disabled = true;
             if(clearButton) clearButton.disabled = true;
        }
    }

    function initializeSignaturePad() {
        // ... (SignaturePad 初始化, 按鈕監聽, Resize - 保持不變) ...
         if (!canvas || !placeholder) { /* ... */ return; }
         try {
             const ratio = Math.max(window.devicePixelRatio || 1, 1);
             canvas.width = canvas.offsetWidth * ratio;
             canvas.height = canvas.offsetHeight * ratio;
             const ctx = canvas.getContext("2d");
             if (!ctx) throw new Error("無法獲取 Canvas 2D 上下文。");
             ctx.scale(ratio, ratio);

             signaturePad = new SignaturePad(canvas, { penColor: "rgb(0, 0, 0)" });

             // Placeholder Logic
             function updatePlaceholderVisibility() { /* ... */
                 if (placeholder && signaturePad) {
                     placeholder.style.display = signaturePad.isEmpty() ? 'block' : 'none';
                 }
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

         } catch (error) { /* ... */ }
    }

    // **MODIFIED handleSubmitSignature**
    async function handleSubmitSignature() {
        if (!signaturePad || signaturePad.isEmpty()) {
            alert("請承租人簽名確認！");
            return;
        }

        // **收集【所有需要的】表單數據 (包括 readonly 的)**
        const formData = {
            // --- Readonly fields ---
            // Use default value '' if element not found or value is null/undefined
            landlordName: landlordNameRoEl?.value.trim() ?? '',
            leaseAddress: leaseAddressRoEl?.value.trim() ?? '',
            leaseStartDate: leaseStartDateRoEl?.value.trim() ?? '',
            leaseEndDate: leaseEndDateRoEl?.value.trim() ?? '',
            monthlyRent: monthlyRentRoEl?.value.trim() ?? '',
            depositAmount: depositAmountRoEl?.value.trim() ?? '',
             // --- Editable fields ---
            tenantName: tenantNameEl?.value.trim() ?? '',
            tenantPhone: tenantPhoneEl?.value.trim() ?? '',
            tenantEmail: tenantEmailEl?.value.trim() ?? '',
            // --- Fields missing in current HTML (will be empty string) ---
             rentPaymentMethod: '', // Example: If needed by backend but not in HTML
             remarks: '',
             depositPaymentMethod: '',
             depositPaymentDate: '',
             expectedSigningDate: '',
             brokerageFeeAmount: '',
        };

        // **修改：只驗證【用戶需要填寫的】欄位**
        const requiredUserData = {
             "承租人姓名": formData.tenantName,
             "承租人電話": formData.tenantPhone,
             "承租人Email": formData.tenantEmail,
        };
        const missingUserFields = Object.keys(requiredUserData).filter(key => !requiredUserData[key]);

        if (missingUserFields.length > 0) {
            alert(`請填寫承租人資訊！(缺少: ${missingUserFields.join(', ')})`);
            return;
        }

        // 檢查 Folder ID
        if (!currentSaveFolderId) { /* ... */ return; }

        // 檢查條款 Checkbox
        const term4Checked = term4Checkbox?.checked;
        // ... (檢查 term5, term6, term7) ...
        const term5Checked = term5Checkbox?.checked;
        const term6Checked = term6Checkbox?.checked;
        const term7Checked = term7Checkbox?.checked;
        if (!term4Checked || !term5Checked || !term6Checked || !term7Checked) {
           alert("請勾選同意所有條款 (項目 4、5、6、7) 後再提交！");
           return;
        }

        // 更新狀態並禁用按鈕
        if(statusMessage) statusMessage.textContent = "正在處理並提交簽名...";
        if (confirmButton) confirmButton.disabled = true;
        if (clearButton) clearButton.disabled = true;

        try {
            const signatureImageBase64 = signaturePad.toDataURL('image/png');

            // **修改：Payload 現在包含【所有】 formData (包括從 readonly 讀取的)**
            const payload = {
                ...formData, // Now includes landlord, lease details etc.
                signatureImage: signatureImageBase64,
                pdfSaveFolderId: currentSaveFolderId,
                submittedAt: new Date().toISOString(),
                termsAgreed: {
                   term4: term4Checked,
                   term5: term5Checked,
                   term6: term6Checked,
                   term7: term7Checked,
                }
            };

            console.log("準備發送到後端的【完整版】Payload:", JSON.stringify(payload)); // Log full payload

            // 執行 fetch POST 到 submitApiUrl
            const response = await fetch(submitApiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            // 處理 API 回應 (與之前相同)
            if (!response.ok) { /* ... 錯誤處理 ... */ throw new Error(`伺服器錯誤 ${response.status}`); }

            const result = await response.json();
            console.log("Submission successful:", result);
            let successMsg = "資料與簽名已成功提交！";
            if (result.drive_web_view_link) {
                successMsg += ` <a href="${result.drive_web_view_link}" target="_blank" rel="noopener noreferrer">點此查看已產生的 PDF</a>`;
            }
            if(statusMessage) statusMessage.innerHTML = successMsg;
            if(signaturePad) signaturePad.off(); // 禁用簽名

            if (typeof liff !== 'undefined' && liff.isInClient()) {
               setTimeout(() => { liff.closeWindow(); }, 5000);
            }

        } catch (error) {
            console.error("提交簽名時發生錯誤:", error);
            if(statusMessage) statusMessage.textContent = `錯誤：提交失敗 (${error.message})。請稍後再試。`;
            // 允許重試
            if (confirmButton) confirmButton.disabled = false;
            if (clearButton) clearButton.disabled = false;
        }
    }

    function resizeCanvas() {
        // (與之前版本相同)
        if (!signaturePad || !canvas || !placeholder) return;
         const data = signaturePad.toData();
         const ratio = Math.max(window.devicePixelRatio || 1, 1);
          if (canvas.offsetWidth > 0 && canvas.offsetHeight > 0) {
             canvas.width = canvas.offsetWidth * ratio;
             canvas.height = canvas.offsetHeight * ratio;
             canvas.getContext("2d").scale(ratio, ratio);
             signaturePad.clear();
             signaturePad.fromData(data);
             placeholder.style.display = signaturePad.isEmpty() ? 'block' : 'none';
          }
    }

     // Share to Line Function (for onclick)
      window.shareToLine = () => {
         const url = encodeURIComponent(window.location.href);
         const text = encodeURIComponent('這是您的租屋訂金收據連結，請填寫後簽名確認：');
         window.location.href = `https://line.me/R/msg/text/?${text}%0A${url}`;
         console.log("Attempting to share to LINE.");
      };

    // Initial placeholder visibility
    const initialPlaceholder = document.getElementById('signature-placeholder');
    if (initialPlaceholder) initialPlaceholder.style.display = 'block';


}); // DOMContentLoaded End