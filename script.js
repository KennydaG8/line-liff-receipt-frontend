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
    const getReceiptApiBaseUrl = "https://line-liff-receipt-backend.onrender.com/api/receipts";

    // --- 獲取 DOM 元素 ---
    const canvas = document.getElementById('signature-canvas');
    const clearButton = document.getElementById('clear-button');
    const confirmButton = document.getElementById('confirm-button');
    const statusMessage = document.getElementById('status-message');
    const repCompanyNameEl = document.getElementById('rep-company-name');
    const customerNameEl = document.getElementById('customer-name');
    const amountEl = document.getElementById('amount');
    const descriptionEl = document.getElementById('description');
    

    // --- 變數宣告 ---
    let signaturePad; // SignaturePad 實例
    let currentLogoFileId = null;    // 用於儲存從 URL 讀取的 Logo File ID
    let currentSaveFolderId = null; // 用於儲存從 URL 讀取的 Save Folder ID

    // --- 主要執行流程 ---
    initializeLiffAndSignaturePad(myLiffId);

    // --- 函式定義 ---

    /**
     * 初始化 LIFF SDK 並在成功後初始化簽名版
     * @param {string} liffId - 您的 LIFF App ID
     */
    async function initializeLiffAndSignaturePad(liffId) {
        statusMessage.textContent = "正在初始化...";
        try {
            await liff.init({ liffId: liffId });
            statusMessage.textContent = "初始化成功！";

            // *** 新增：從 URL 讀取必要的 ID ***
            const urlParams = new URLSearchParams(window.location.search);
            currentLogoFileId = urlParams.get('logoFileId');
            currentSaveFolderId = urlParams.get('pdfSaveFolderId');

            if (!currentLogoFileId || !currentSaveFolderId) {
                // 如果 URL 中缺少必要的 ID，顯示錯誤或提示
                // 這裡先簡單提示，您可以做得更完善
                console.error("URL 缺少 logoFileId 或 pdfSaveFolderId 參數！");
                statusMessage.textContent = "錯誤：啟動連結不完整，缺少必要的參數。";
                confirmButton.disabled = true; // 禁用提交按鈕
                clearButton.disabled = true;
                return; // 中斷後續執行
            }
            console.log("讀取到 Logo File ID:", currentLogoFileId);
            console.log("讀取到 Save Folder ID:", currentSaveFolderId);

            // 直接初始化簽名版 (不再需要 fetchReceiptData)
            initializeSignaturePad();

            statusMessage.textContent = "請業務填寫公司名稱，然後交由客戶填寫資料並簽名。";

        } catch (error) {
            console.error("初始化時發生錯誤:", error);
            statusMessage.textContent = `錯誤：${error.message}`;
            confirmButton.disabled = true;
            clearButton.disabled = true;
        }
    }

    /**
     * 從後端 API 獲取收據資料並更新畫面
     * @param {string} id - 收據的唯一 ID
     */
    async function fetchReceiptData(id) {
        // **** 注意：您需要自行開發這個後端 API ****
        // 這個 API 應該接收 GET 請求，並根據 id 回傳收據的 JSON 資料
        // 例如: GET https://your-backend.com/api/receipts/{id}
        const apiUrl = `${getReceiptApiBaseUrl}/${id}`; // 組合完整的 API URL
        console.log(`Workspaceing receipt data from: ${apiUrl}`);

        try {
            const response = await fetch(apiUrl, {
                // **** 加入 headers ****
                headers: {
                    'ngrok-skip-browser-warning': 'true' // 加入這個標頭
                }
            });  
            if (!response.ok) {
                // 如果伺服器回傳錯誤 (例如 404 Not Found, 500 Server Error)
                throw new Error(`無法獲取收據資料 (狀態碼: ${response.status})`);
            }
            currentReceiptData = await response.json(); // 解析 JSON 資料

            // 將獲取的資料更新到 HTML 頁面上
            customerNameEl.textContent = currentReceiptData.customerName || '未提供';
            amountEl.textContent = currentReceiptData.amount || '未提供';
            descriptionEl.textContent = currentReceiptData.description || '未提供';
            // 更新您在 index.html 中定義的其他收據欄位...

            console.log("Receipt data loaded:", currentReceiptData);

        } catch (error) {
            console.error("獲取收據資料失敗:", error);
            // 將錯誤訊息顯示給使用者，並重新拋出錯誤，讓主流程知道載入失敗
            statusMessage.textContent = `錯誤：無法載入收據資料 (${error.message})。請檢查收據 ID 或聯繫管理員。`;
            //throw error; // 重新拋出錯誤，中斷後續的簽名版初始化
        }
    }

    /**
     * 初始化 Signature Pad 函式庫
     */
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

    /**
     * 處理提交簽名的邏輯
     */
    async function handleSubmitSignature() {
        if (signaturePad.isEmpty()) {
            alert("客戶簽名欄位不可空白！");
            return;
        }

        // *** 從所有 input 欄位讀取資料 ***
        const repCompanyNameValue = repCompanyNameEl.value.trim();
        const customerNameValue = customerNameEl.value.trim();
        const amountValue = amountEl.value.trim();
        const descriptionValue = descriptionEl.value.trim();

        // *** 基本檢查 ***
        if (!repCompanyNameValue || !customerNameValue || !amountValue || !descriptionValue) {
            alert("請確認所有資訊欄位都已填寫！");
            return;
        }
        // 檢查 ID 是否已成功讀取
        if (!currentLogoFileId || !currentSaveFolderId) {
             alert("錯誤：缺少必要的設定參數，無法提交。");
             return;
        }

        statusMessage.textContent = "正在處理並提交簽名...";
        confirmButton.disabled = true;
        clearButton.disabled = true;

        try {
            const signatureImageBase64 = signaturePad.toDataURL('image/png');

            // *** 修改：準備 payload，包含所有欄位和 ID ***
            const payload = {
                repCompanyName: repCompanyNameValue,   // 業務公司名稱
                customerName: customerNameValue,     // 客戶姓名
                amount: amountValue,                 // 金額
                description: descriptionValue,       // 事由
                signatureImage: signatureImageBase64,  // 簽名圖
                logoFileId: currentLogoFileId,       // Logo 的 Google Drive File ID
                pdfSaveFolderId: currentSaveFolderId, // 儲存 PDF 的 Google Drive Folder ID
                submittedAt: new Date().toISOString(),
            };

            console.log("準備發送到後端的 Payload:", JSON.stringify(payload));

            // *** 修改：fetch 呼叫，如果後端部署了，不需要 ngrok skip header ***
            const response = await fetch(submitApiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    // 'ngrok-skip-browser-warning': 'true' // 如果後端已部署到 Render，這行可以移除
                },
                body: JSON.stringify(payload)
            });

            // ... (處理回應的邏輯不變，可以顯示 Drive 連結) ...
             if (!response.ok) {
                let errorMsg = `提交失敗 (${response.status})`;
                try {
                    const errorData = await response.json();
                    errorMsg += `: ${errorData.message || JSON.stringify(errorData)}`;
                } catch (e) { errorMsg += `: ${await response.text()}`; }
                throw new Error(errorMsg);
             }
            const result = await response.json();
            console.log("Submission successful:", result);
            let successMsg = "資料與簽名已成功提交！";
            if (result.drive_web_view_link) {
                 successMsg += ` <a href="${result.drive_web_view_link}" target="_blank">點此查看已產生的 PDF</a>`;
            }
            statusMessage.innerHTML = successMsg;
            signaturePad.off();
            if (liff.isInClient()) { setTimeout(() => { liff.closeWindow(); }, 3000); } // 延長一點時間看連結

        } catch (error) {
            console.error("提交簽名時發生錯誤:", error);
            statusMessage.textContent = `錯誤：提交失敗 (${error.message})。請稍後再試。`;
            confirmButton.disabled = false;
            clearButton.disabled = false;
        }
    }

    /**
     * 響應視窗大小改變，重新設置 Canvas 尺寸
     * 這是為了確保在高 DPI 螢幕和視窗縮放時，簽名線條不會模糊
     */
    function resizeCanvas() {
        // ... (resizeCanvas 程式碼不變) ...
        if (!signaturePad) return;
        const ratio = Math.max(window.devicePixelRatio || 1, 1);
        const canvasWidth = canvas.offsetWidth;
        const canvasHeight = canvas.offsetHeight;
        if (canvasWidth === 0 || canvasHeight === 0) { return; }
        const data = signaturePad.toData();
        canvas.width = canvasWidth * ratio;
        canvas.height = canvasHeight * ratio;
        canvas.getContext("2d").scale(ratio, ratio);
        signaturePad.clear();
        signaturePad.fromData(data);
    }

}); // DOMContentLoaded End