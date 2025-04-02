// 使用嚴格模式，有助於捕捉潛在錯誤
'use strict';

// 等待 HTML 文件完全加載並解析完成後再執行
document.addEventListener('DOMContentLoaded', () => {

    // --- 基本設定 ---
    // ****** 請務必替換成您自己的 LIFF ID ******
    const myLiffId = "2007188640-8vEWkonp";
    // ****** 請務必替換成您未來後端接收簽名+收據資料的 API 網址 ******
    const submitApiUrl = "https://bb64-111-249-19-98.ngrok-free.app/api/submit-receipt";
    // ****** 請務必替換成您未來後端提供收據資料的 API 基礎網址 ******
    // 注意：後面的 /${id} 會在 fetchReceiptData 函式中加上
    const getReceiptApiBaseUrl = "https://bb64-111-249-19-98.ngrok-free.app/api/receipts";

    // --- 獲取 DOM 元素 ---
    const canvas = document.getElementById('signature-canvas');
    const clearButton = document.getElementById('clear-button');
    const confirmButton = document.getElementById('confirm-button');
    const statusMessage = document.getElementById('status-message');
    const customerNameEl = document.getElementById('customer-name');
    const amountEl = document.getElementById('amount');
    const descriptionEl = document.getElementById('description');
    const receiptIdEl = document.getElementById('receipt-id');

    // --- 變數宣告 ---
    let signaturePad; // SignaturePad 實例
    let currentReceiptData = {}; // 從後端獲取的當前收據資料

    // --- 主要執行流程 ---
    initializeLiffAndSignaturePad(myLiffId);

    // --- 函式定義 ---

    /**
     * 初始化 LIFF SDK 並在成功後初始化簽名版
     * @param {string} liffId - 您的 LIFF App ID
     */
    async function initializeLiffAndSignaturePad(liffId) {
        statusMessage.textContent = "正在初始化 LIFF...";
        try {
            // 1. 初始化 LIFF
            await liff.init({ liffId: liffId });
            statusMessage.textContent = "LIFF 初始化成功！";

            // 2. 檢查登入狀態 (可選，取決於您的需求)
            if (!liff.isLoggedIn()) {
                // 如果您的應用需要用戶登入才能操作，可以在這裡處理
                // 例如：顯示提示訊息或呼叫 liff.login()
                console.log("User not logged in.");
                // statusMessage.textContent = "請先登入 LINE 以繼續。";
                // 禁用按鈕
                // confirmButton.disabled = true;
                // clearButton.disabled = true;
                // return; // 可能需要中斷後續流程
            }

            // (可選) 獲取用戶 Profile 資訊
            // try {
            //     const profile = await liff.getProfile();
            //     console.log("User Profile:", profile);
            //     // 或許可以用 profile.displayName 預填客戶名稱？
            // } catch (profileError) {
            //     console.error("Failed to get profile:", profileError);
            // }


            // 3. 從 URL 獲取收據 ID
            const urlParams = new URLSearchParams(window.location.search);
            const receiptId = urlParams.get('receiptId');

            if (!receiptId) {
                throw new Error("URL 中缺少 'receiptId' 參數");
            }
            receiptIdEl.textContent = receiptId; // 在頁面上顯示收據 ID

            // 4. 根據收據 ID 從您的後端獲取收據詳細資料
            statusMessage.textContent = `正在載入收據 ${receiptId} 的資料...`;
            await fetchReceiptData(receiptId); // 等待資料載入完成

            // 5. 初始化簽名版
            initializeSignaturePad();

            statusMessage.textContent = "請在下方區域簽名。";

        } catch (error) {
            console.error("初始化或載入資料時發生錯誤:", error);
            statusMessage.textContent = `錯誤：${error.message}`;
            // 初始化失敗時禁用按鈕
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
        // 根據容器大小調整 Canvas 解析度，以獲得更清晰的簽名
        const ratio = Math.max(window.devicePixelRatio || 1, 1);
        canvas.width = canvas.offsetWidth * ratio;
        canvas.height = canvas.offsetHeight * ratio;
        canvas.getContext("2d").scale(ratio, ratio);

        // 建立 SignaturePad 實例
        signaturePad = new SignaturePad(canvas, {
            backgroundColor: 'rgb(255, 255, 255)', // 白色背景
            penColor: 'rgb(0, 0, 0)', // 黑色畫筆
            minWidth: 0.5, // 筆劃最小寬度
            maxWidth: 2.5, // 筆劃最大寬度
        });

        // 清除按鈕的事件監聽
        clearButton.addEventListener('click', () => {
            signaturePad.clear();
            statusMessage.textContent = "簽名已清除，請重新簽名。";
        });

        // 確認按鈕的事件監聽
        confirmButton.addEventListener('click', handleSubmitSignature);

        // 監聽視窗大小改變事件，重新調整 Canvas 大小
        window.addEventListener('resize', resizeCanvas);
        console.log("Signature Pad initialized.");
    }

    /**
     * 處理提交簽名的邏輯
     */
    async function handleSubmitSignature() {
        if (signaturePad.isEmpty()) {
            alert("請先簽名！");
            return;
        }

        statusMessage.textContent = "正在處理並提交簽名...";
        confirmButton.disabled = true; // 防止重複提交
        clearButton.disabled = true;

        try {
            // 將簽名轉換為 Base64 編碼的 PNG 圖片數據 URL
            // 您也可以使用 'image/jpeg' 或其他格式，但 PNG 通常用於簽名
            const signatureImageBase64 = signaturePad.toDataURL('image/png');

            // 準備要發送到後端的資料 payload
            const payload = {
                receiptId: currentReceiptData.id || receiptIdEl.textContent, // 從載入的資料或頁面元素獲取 ID
                signatureImage: signatureImageBase64, // Base64 簽名圖
                submittedAt: new Date().toISOString(), // 提交時間 (ISO 格式)
                // 您可以根據需要加入其他資訊
                // customerName: currentReceiptData.customerName,
                // amount: currentReceiptData.amount,
            };

            console.log("準備發送到後端的 Payload:", JSON.stringify(payload));

            // **** 注意：您需要自行開發這個後端 API ****
            // 這個 API 應該接收 POST 請求，包含 JSON payload，並處理儲存和 PDF 生成
            // 例如: POST https://your-backend.com/api/submit-receipt
            console.log(`Submitting signature to: ${submitApiUrl}`);
            const response = await fetch(submitApiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'ngrok-skip-browser-warning': 'true'
                    // 如果您的後端需要驗證，可以考慮加入 Authorization Header
                    // 例如，傳遞 LIFF 的 ID Token:
                    // 'Authorization': `Bearer ${liff.getIDToken()}`
                },
                body: JSON.stringify(payload) // 將 payload 轉為 JSON 字串
            });

            // 檢查後端回應狀態
            if (!response.ok) {
                // 嘗試讀取後端回傳的錯誤訊息
                let errorMsg = `提交失敗 (狀態碼: ${response.status})`;
                try {
                    const errorData = await response.json(); // 假設後端錯誤時回傳 JSON
                    errorMsg += `: ${errorData.message || JSON.stringify(errorData)}`;
                } catch (e) {
                    // 如果後端沒回傳 JSON，嘗試讀取文字
                    errorMsg += `: ${await response.text()}`;
                }
                throw new Error(errorMsg);
            }

            // 假設後端成功時回傳 JSON，包含成功訊息或下一步指示
            const result = await response.json();
            console.log("Submission successful:", result);
            statusMessage.textContent = "簽名已成功提交！";
            signaturePad.off(); // 禁用簽名版

            // (可選) 提交成功後自動關閉 LIFF 視窗
            if (liff.isInClient()) { // 檢查是否在 LINE App 內執行
                alert("簽名已成功提交！此視窗將會關閉。"); // 提示用戶
                setTimeout(() => { liff.closeWindow(); }, 500); // 稍微延遲後關閉
            } else {
                alert("簽名已成功提交！"); // 在外部瀏覽器顯示提示
            }

        } catch (error) {
            console.error("提交簽名時發生錯誤:", error);
            statusMessage.textContent = `錯誤：提交失敗 (${error.message})。請稍後再試。`;
            // 讓用戶可以重試
            confirmButton.disabled = false;
            clearButton.disabled = false;
        }
    }

    /**
     * 響應視窗大小改變，重新設置 Canvas 尺寸
     * 這是為了確保在高 DPI 螢幕和視窗縮放時，簽名線條不會模糊
     */
    function resizeCanvas() {
        if (!signaturePad) return; // 如果簽名版還沒初始化，就不執行

        const ratio = Math.max(window.devicePixelRatio || 1, 1);
        const canvasWidth = canvas.offsetWidth;
        const canvasHeight = canvas.offsetHeight;

        // 檢查寬高是否有效，避免在隱藏元素上操作
        if (canvasWidth === 0 || canvasHeight === 0) {
            console.warn("Canvas dimensions are zero, skipping resize.");
            return;
        }

        // 先記錄目前的簽名數據 (如果有的話)
        const data = signaturePad.toData();

        // 根據設備像素比例調整內部畫布的實際像素大小
        canvas.width = canvasWidth * ratio;
        canvas.height = canvasHeight * ratio;
        // 調整畫布的縮放比例
        canvas.getContext("2d").scale(ratio, ratio);
        // 清除當前畫布 (因為尺寸變了)
        signaturePad.clear();
        // 將之前記錄的簽名數據畫回到新的畫布上
        signaturePad.fromData(data);
        console.log("Canvas resized.");
    }

}); // DOMContentLoaded End