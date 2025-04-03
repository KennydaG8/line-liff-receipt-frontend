// 使用嚴格模式，有助於捕捉潛在錯誤
'use strict';

// 等待 HTML 文件完全加載並解析完成後再執行
document.addEventListener('DOMContentLoaded', () => {

    // --- 基本設定 ---
    // ****** 請務必替換成您自己的 LIFF ID ******
    const myLiffId = "2007188640-8vEWkonp";
    // ****** 請務必替換成您未來後端接收簽名+收據資料的 API 網址 ******
    const submitApiUrl = "https://line-liff-receipt-backend.onrender.com/api/submit-receipt";
    // ****** 請務必替換成您未來後端提供收據資料的 API 基礎網址 ******
    // 注意：後面的 /${id} 會在 fetchReceiptData 函式中加上
    // const getReceiptApiBaseUrl = "https://line-liff-receipt-backend.onrender.com/api/receipts";

    // --- 獲取 DOM 元素 ---
    const canvas = document.getElementById('signature-canvas');
    const clearButton = document.getElementById('clear-button');
    const confirmButton = document.getElementById('confirm-button');
    const statusMessage = document.getElementById('status-message');
    // *** 新增：獲取所有輸入欄位元素 ***
    const tenantNameEl = document.getElementById('tenantName');
    const tenantPhoneEl = document.getElementById('tenantPhone');
    const tenantEmailEl = document.getElementById('tenantEmail');
    const landlordNameEl = document.getElementById('landlordName');
    const landlordPhoneEl = document.getElementById('landlordPhone');
    const leaseAddressEl = document.getElementById('leaseAddress');
    const leaseStartDateEl = document.getElementById('leaseStartDate');
    const leaseEndDateEl = document.getElementById('leaseEndDate');
    const monthlyRentEl = document.getElementById('monthlyRent');
    const rentPaymentMethodEl = document.getElementById('rentPaymentMethod');
    const remarksEl = document.getElementById('remarks');
    const depositAmountEl = document.getElementById('depositAmount');
    const depositPaymentMethodEl = document.getElementById('depositPaymentMethod');
    const depositPaymentDateEl = document.getElementById('depositPaymentDate');
    const expectedSigningDateEl = document.getElementById('expectedSigningDate');
    // const repCompanyNameEl = document.getElementById('rep-company-name'); // 如果您之前有加這個，也要獲取

    // --- 變數宣告 ---
    let signaturePad;
    // let currentLogoFileId = null; // 暫時不用 Logo ID
    let currentSaveFolderId = null; // 用於儲存從 URL 讀取的 Save Folder ID

    // --- 主要執行流程 ---
    initializeLiffAndSignaturePad(myLiffId);

    // --- 函式定義 ---

    async function initializeLiffAndSignaturePad(liffId) {
        statusMessage.textContent = "正在初始化...";
        try {
            await liff.init({ liffId: liffId });
            statusMessage.textContent = "初始化成功！";

            // *** 修改：只檢查 pdfSaveFolderId ***
            const urlParams = new URLSearchParams(window.location.search);
            currentSaveFolderId = urlParams.get('pdfSaveFolderId');

            if (!currentSaveFolderId) { // 只檢查這個
                console.error("URL 缺少 pdfSaveFolderId 參數！");
                statusMessage.textContent = "錯誤：啟動連結不完整，缺少必要的參數 (Folder ID)。";
                confirmButton.disabled = true;
                clearButton.disabled = true;
                return;
            }
            // console.log("讀取到 Logo File ID:", currentLogoFileId); // 註解掉
            console.log("讀取到 Save Folder ID:", currentSaveFolderId);

            initializeSignaturePad(); // 直接初始化

            statusMessage.textContent = "請填寫表單資訊並簽名確認。"; // 更新提示

        } catch (error) {
             // ... (錯誤處理不變) ...
        }
    }

    function initializeSignaturePad() {
        // ... (初始化 SignaturePad 的程式碼不變) ...
        const ratio = Math.max(window.devicePixelRatio || 1, 1);
        canvas.width = canvas.offsetWidth * ratio;
        canvas.height = canvas.offsetHeight * ratio;
        canvas.getContext("2d").scale(ratio, ratio);
        signaturePad = new SignaturePad(canvas, { /* ...options... */ });
        clearButton.addEventListener('click', () => { /* ... */ });
        confirmButton.addEventListener('click', handleSubmitSignature);
        window.addEventListener('resize', resizeCanvas);
        console.log("Signature Pad initialized.");
    }

    async function handleSubmitSignature() {
        if (signaturePad.isEmpty()) {
            alert("請承租人簽名確認！"); // 更新提示
            return;
        }

        // *** 新增：從所有 input 欄位讀取資料 ***
        const formData = {
            // repCompanyName: repCompanyNameEl.value.trim(), // 如果您之前有加業務公司欄位
            tenantName: tenantNameEl.value.trim(),
            tenantPhone: tenantPhoneEl.value.trim(),
            tenantEmail: tenantEmailEl.value.trim(),
            landlordName: landlordNameEl.value.trim(),
            landlordPhone: landlordPhoneEl.value.trim(),
            leaseAddress: leaseAddressEl.value.trim(),
            leaseStartDate: leaseStartDateEl.value.trim(),
            leaseEndDate: leaseEndDateEl.value.trim(),
            monthlyRent: monthlyRentEl.value.trim(),
            rentPaymentMethod: rentPaymentMethodEl.value.trim(),
            remarks: remarksEl.value.trim(),
            depositAmount: depositAmountEl.value.trim(),
            depositPaymentMethod: depositPaymentMethodEl.value.trim(),
            depositPaymentDate: depositPaymentDateEl.value.trim(),
            expectedSigningDate: expectedSigningDateEl.value.trim(),
        };

        // *** 基本檢查：確保必填欄位都有填寫 (這裡檢查所有欄位，除了 remarks) ***
        const requiredKeys = Object.keys(formData).filter(key => key !== 'remarks');
        const missingFields = requiredKeys.filter(key => !formData[key]);

        if (missingFields.length > 0) {
            alert(`請填寫所有必填欄位！(缺少: ${missingFields.join(', ')})`);
            return;
        }
        // 檢查 Folder ID
        if (!currentSaveFolderId) {
             alert("錯誤：缺少必要的設定參數(Folder ID)，無法提交。");
             return;
        }

        statusMessage.textContent = "正在處理並提交簽名...";
        confirmButton.disabled = true;
        clearButton.disabled = true;

        try {
            const signatureImageBase64 = signaturePad.toDataURL('image/png');

            // *** 修改：準備 payload，包含所有新欄位和 Folder ID ***
            const payload = {
                ...formData, // 將 formData 物件的所有屬性複製到 payload
                signatureImage: signatureImageBase64,
                // logoFileId: currentLogoFileId, // 暫時不傳 Logo ID
                pdfSaveFolderId: currentSaveFolderId, // 傳送 Folder ID
                submittedAt: new Date().toISOString(),
            };

            console.log("準備發送到後端的 Payload:", JSON.stringify(payload));

            // *** Fetch 呼叫，確認 URL 正確，移除 ngrok header ***
            const response = await fetch(submitApiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    // 'ngrok-skip-browser-warning': 'true' // 已部署到 Render，移除此行
                },
                body: JSON.stringify(payload)
            });

            // ... (處理回應的邏輯不變) ...
             if (!response.ok) { /* ... 錯誤處理 ... */ throw new Error(/*...*/); }
            const result = await response.json();
            console.log("Submission successful:", result);
            let successMsg = "資料與簽名已成功提交！";
            if (result.drive_web_view_link) {
                 successMsg += ` <a href="${result.drive_web_view_link}" target="_blank">點此查看已產生的 PDF</a>`;
            }
            statusMessage.innerHTML = successMsg;
            signaturePad.off();
            if (liff.isInClient()) { setTimeout(() => { liff.closeWindow(); }, 3000); }


        } catch (error) {
            // ... (錯誤處理不變) ...
             console.error("提交簽名時發生錯誤:", error);
             statusMessage.textContent = `錯誤：提交失敗 (${error.message})。請稍後再試。`;
             confirmButton.disabled = false;
             clearButton.disabled = false;
        }
    }

    function resizeCanvas() {
        // ... (resizeCanvas 程式碼不變) ...
    }

}); // DOMContentLoaded End