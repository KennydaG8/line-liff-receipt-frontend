// 使用嚴格模式
'use strict';

// 等待 HTML 文件完全加載並解析完成後再執行
document.addEventListener('DOMContentLoaded', () => {

    // --- 基本設定 (來自舊腳本) ---
    // ****** 請務必確認這是您正確的 LIFF ID ******
    const myLiffId = "2007188640-8vEWkonp";
    // ****** 請務必確認這是您正確的後端 API 網址 ******
    const submitApiUrl = "https://line-liff-receipt-backend.onrender.com/api/submit-receipt";

    // --- 獲取 DOM 元素 (來自舊腳本 - 請確保您的 index.html 有這些 ID) ---
    const canvas = document.getElementById('signature-pad');
    const clearButton = document.getElementById('clear-button');     // 假設清除按鈕 ID
    const confirmButton = document.getElementById('confirm-button'); // 假設確認按鈕 ID
    const statusMessage = document.getElementById('status-message'); // 假設狀態訊息 P 標籤 ID

    // *** 獲取所有輸入欄位元素 (來自舊腳本 - 請確保您的 index.html 有這些 ID) ***
    // (注意：這些 ID 可能與之前簡單版 HTML 不同，請核對！)
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
    const brokerageFeeAmountEl = document.getElementById('brokerageFeeAmount');
    // 假設條款同意的 checkbox IDs (來自舊腳本 - 請確保您的 index.html 有這些 ID)
    const term4Checkbox = document.getElementById('term4-agree');
    const term5Checkbox = document.getElementById('term5-agree');
    const term6Checkbox = document.getElementById('term6-agree');
    const term7Checkbox = document.getElementById('term7-agree');

    // --- 變數宣告 (來自舊腳本) ---
    let signaturePad; // 用於 SignaturePad 實例
    let currentSaveFolderId = null; // 從 URL 讀取的 Folder ID

    // --- 主要執行流程 (來自舊腳本) ---
    // 確保 liff 和 SignaturePad 都已加載 (需要在 HTML 中引入)
    if (typeof liff !== 'undefined' && typeof SignaturePad !== 'undefined') {
        initializeLiffAndSignaturePad(myLiffId);
    } else {
        console.error("錯誤：LIFF SDK 或 SignaturePad 庫未成功加載。請檢查 index.html 中的 <script> 標籤。");
        if(statusMessage) statusMessage.textContent = "錯誤：頁面初始化失敗，缺少必要組件。";
        if(confirmButton) confirmButton.disabled = true;
        if(clearButton) clearButton.disabled = true;
    }

    // --- 函式定義 (主要來自舊腳本) ---

    async function initializeLiffAndSignaturePad(liffId) {
        if(statusMessage) statusMessage.textContent = "正在初始化 LIFF...";
        try {
            await liff.init({ liffId: liffId });
            if(statusMessage) statusMessage.textContent = "LIFF 初始化成功！";

            // 讀取 URL 參數 (來自舊腳本)
            const urlParams = new URLSearchParams(window.location.search);
            currentSaveFolderId = urlParams.get('pdfSaveFolderId');

            if (!currentSaveFolderId) {
                console.error("URL 缺少 pdfSaveFolderId 參數！");
                if(statusMessage) statusMessage.textContent = "錯誤：啟動連結不完整，缺少必要的參數 (Folder ID)。";
                if(confirmButton) confirmButton.disabled = true;
                if(clearButton) clearButton.disabled = true;
                return;
            }
            console.log("讀取到 Save Folder ID:", currentSaveFolderId);

            // 初始化簽名版 (來自舊腳本)
            initializeSignaturePad();

            if(statusMessage) statusMessage.textContent = "請填寫表單資訊並簽名確認。";

        } catch (error) {
             console.error("LIFF 初始化時發生錯誤:", error);
             if(statusMessage) statusMessage.textContent = `錯誤：初始化失敗 (${error.message})。`;
             if(confirmButton) confirmButton.disabled = true;
             if(clearButton) clearButton.disabled = true;
        }
    }

    function initializeSignaturePad() {
        if (!canvas) {
            console.error("錯誤：找不到 Canvas 元素 (ID: signature-pad)");
            if(statusMessage) statusMessage.textContent = "錯誤：無法載入簽名區域。";
            if(confirmButton) confirmButton.disabled = true;
            if(clearButton) clearButton.disabled = true;
            return;
        }

        try {
            const ratio = Math.max(window.devicePixelRatio || 1, 1);
            canvas.width = canvas.offsetWidth * ratio;
            canvas.height = canvas.offsetHeight * ratio;
            const ctx = canvas.getContext("2d");
             if (!ctx) {
                  console.error("錯誤：無法獲取 Canvas 繪圖上下文。");
                  if(statusMessage) statusMessage.textContent = "錯誤：無法初始化簽名區域。";
                  if(confirmButton) confirmButton.disabled = true;
                  if(clearButton) clearButton.disabled = true;
                  return;
             }
            ctx.scale(ratio, ratio);
            // 使用 SignaturePad 庫 (來自舊腳本)
            signaturePad = new SignaturePad(canvas, {
                penColor: "rgb(0, 0, 0)"
                // 可以根據需要添加更多 SignaturePad 選項
            });

            // 設定按鈕事件監聽 (來自舊腳本，取代舊的 onclick)
            if (clearButton) {
                clearButton.addEventListener('click', () => {
                     if(signaturePad) {
                          signaturePad.clear(); // 使用 SignaturePad 的 clear 方法
                          console.log("簽名已清除");
                     }
                });
            } else {
                 console.error("錯誤：找不到清除按鈕 (ID: clear-button)");
            }

            if (confirmButton) {
                confirmButton.addEventListener('click', handleSubmitSignature); // 點擊確認按鈕時觸發提交
            } else {
                 console.error("錯誤：找不到確認按鈕 (ID: confirm-button)");
            }

            // 監聽視窗大小變化 (來自舊腳本)
            window.addEventListener('resize', resizeCanvas);
            console.log("Signature Pad initialized using SignaturePad library.");

        } catch (initError) {
             console.error("Signature Pad 初始化時發生錯誤:", initError);
             if(statusMessage) statusMessage.textContent = "錯誤：簽名功能初始化失敗。";
             if(confirmButton) confirmButton.disabled = true;
             if(clearButton) clearButton.disabled = true;
        }
    }

    // 調整畫布大小的函數 (使用 SignaturePad 的方法 - 來自舊腳本)
    function resizeCanvas() {
         if (!signaturePad) return; // 確保 signaturePad 已初始化
         if (!canvas) return;      // 確保 canvas 存在

        // 暫存當前簽名數據
        const data = signaturePad.toData();

        const ratio = Math.max(window.devicePixelRatio || 1, 1);
        // 確保 offsetWidth/Height 不是 0
        if (canvas.offsetWidth > 0 && canvas.offsetHeight > 0) {
            canvas.width = canvas.offsetWidth * ratio;
            canvas.height = canvas.offsetHeight * ratio;
            canvas.getContext("2d").scale(ratio, ratio);

             // 清除並從數據恢復簽名
             signaturePad.clear();
             signaturePad.fromData(data);
             console.log("Canvas resized and signature restored.");
        } else {
             console.warn("Canvas dimensions are zero, skipping resize.");
        }
    }


    // 提交簽名和表單數據的函數 (來自舊腳本)
    async function handleSubmitSignature() {
        if (!signaturePad) {
             alert("簽名功能尚未準備好。");
             return;
        }
        // 使用 SignaturePad 的 isEmpty 方法
        if (signaturePad.isEmpty()) {
            alert("請承租人簽名確認！");
            return;
        }

        // 收集表單數據 (來自舊腳本 - 確保元素存在)
        const formData = {
            tenantName: tenantNameEl ? tenantNameEl.value.trim() : '',
            tenantPhone: tenantPhoneEl ? tenantPhoneEl.value.trim() : '',
            tenantEmail: tenantEmailEl ? tenantEmailEl.value.trim() : '',
            landlordName: landlordNameEl ? landlordNameEl.value.trim() : '',
            landlordPhone: landlordPhoneEl ? landlordPhoneEl.value.trim() : '',
            leaseAddress: leaseAddressEl ? leaseAddressEl.value.trim() : '',
            leaseStartDate: leaseStartDateEl ? leaseStartDateEl.value.trim() : '',
            leaseEndDate: leaseEndDateEl ? leaseEndDateEl.value.trim() : '',
            monthlyRent: monthlyRentEl ? monthlyRentEl.value.trim() : '',
            rentPaymentMethod: rentPaymentMethodEl ? rentPaymentMethodEl.value.trim() : '',
            remarks: remarksEl ? remarksEl.value.trim() : '',
            depositAmount: depositAmountEl ? depositAmountEl.value.trim() : '',
            depositPaymentMethod: depositPaymentMethodEl ? depositPaymentMethodEl.value.trim() : '',
            depositPaymentDate: depositPaymentDateEl ? depositPaymentDateEl.value.trim() : '',
            expectedSigningDate: expectedSigningDateEl ? expectedSigningDateEl.value.trim() : '',
            brokerageFeeAmount: brokerageFeeAmountEl ? brokerageFeeAmountEl.value.trim() : '',
        };

        // 檢查必填欄位 (來自舊腳本)
        const requiredKeys = Object.keys(formData).filter(key =>
            // 排除非必填欄位
            key !== 'remarks' && key !== 'brokerageFeeAmount'
        );
        const missingFields = requiredKeys.filter(key => !formData[key]);

        if (missingFields.length > 0) {
            // 嘗試獲取 label 文字以提供更友好的提示
            const missingLabels = missingFields.map(id => {
                const label = document.querySelector(`label[for='${id}']`);
                return label ? label.textContent.replace('：', '') : id; // 清理 label 文字
            }).join(', ');
            alert(`請填寫所有必填欄位！(缺少: ${missingLabels})`);
            return;
        }

        // 檢查 Folder ID (來自舊腳本)
        if (!currentSaveFolderId) {
             alert("錯誤：缺少必要的設定參數(Folder ID)，無法提交。");
             return;
        }

        // 檢查條款 Checkbox (來自舊腳本 - 確保元素存在)
        const term4Checked = term4Checkbox?.checked;
        const term5Checked = term5Checkbox?.checked;
        const term6Checked = term6Checkbox?.checked;
        const term7Checked = term7Checkbox?.checked;

        if (!term4Checked || !term5Checked || !term6Checked || !term7Checked) {
            alert("請勾選同意所有條款 (項目 4、5、6、7) 後再提交！");
            return;
        }

        // 更新狀態並禁用按鈕 (來自舊腳本)
        if(statusMessage) statusMessage.textContent = "正在處理並提交簽名...";
        if (confirmButton) confirmButton.disabled = true;
        if (clearButton) clearButton.disabled = true;

        try {
            // 使用 SignaturePad 的 toDataURL 方法獲取簽名圖像 (來自舊腳本)
            const signatureImageBase64 = signaturePad.toDataURL('image/png');

            // 準備發送到後端的 payload (來自舊腳本)
            const payload = {
                ...formData,
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

            console.log("準備發送到後端的 Payload:", JSON.stringify(payload));

            // 發送 Fetch 請求到後端 API (來自舊腳本)
            const response = await fetch(submitApiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            // 處理 API 回應 (來自舊腳本)
             if (!response.ok) {
                let errorMsg = `提交失敗 (${response.status})`;
                try {
                    const errorData = await response.json();
                    errorMsg += `: ${errorData.error || JSON.stringify(errorData)}`;
                } catch (e) {
                     // 如果回應不是 JSON，嘗試讀取文字
                     try { errorMsg += `: ${await response.text()}`; } catch (e2) {}
                }
                throw new Error(errorMsg); // 拋出錯誤以便 catch 區塊處理
             }

            // 成功處理
            const result = await response.json();
            console.log("Submission successful:", result);
            let successMsg = "資料與簽名已成功提交！";
            if (result.drive_web_view_link) {
                 // 顯示 PDF 連結 (來自舊腳本)
                 successMsg += ` <a href="${result.drive_web_view_link}" target="_blank" rel="noopener noreferrer">點此查看已產生的 PDF</a>`;
            }
            if(statusMessage) statusMessage.innerHTML = successMsg; // 使用 innerHTML 以顯示連結
            if(signaturePad) signaturePad.off(); // 禁用簽名版 (來自舊腳本)
            // 按鈕保持禁用狀態

            // 如果在 LINE App 內，延遲後關閉視窗 (來自舊腳本)
            if (typeof liff !== 'undefined' && liff.isInClient()) {
                setTimeout(() => {
                    liff.closeWindow();
                }, 5000); // 延長到 5 秒方便查看連結
            }

        } catch (error) {
             // 錯誤處理 (來自舊腳本)
             console.error("提交簽名時發生錯誤:", error);
             if(statusMessage) statusMessage.textContent = `錯誤：提交失敗 (${error.message})。請稍後再試。`;
             // 允許用戶重試
             if (confirmButton) confirmButton.disabled = false;
             if (clearButton) clearButton.disabled = false;
        }
    }

    // --- 不再需要的舊函數 (來自新分離的 script.js) ---
    // window.clearSignature = ... (已被 clearButton 的 event listener 取代)
    // window.submitForm = ... (已被 handleSubmitSignature 和 confirmButton 的 event listener 取代)
    // window.shareToLine = ... (這個功能未包含在舊腳本中，如果仍需要，可以保留或重新整合)
     window.shareToLine = () => {
        console.warn("shareToLine function is basic and not part of the original API script.");
        const url = encodeURIComponent(window.location.href);
        const text = encodeURIComponent('這是您的租屋訂金表單連結，請填寫後簽名確認：');
        window.location.href = `https://line.me/R/msg/text/?${text}%0A${url}`;
     };


}); // DOMContentLoaded End