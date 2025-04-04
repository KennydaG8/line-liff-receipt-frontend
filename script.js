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

    // **僅獲取當前 HTML 中存在的欄位**
    const tenantNameEl = document.getElementById('tenantName');
    const tenantPhoneEl = document.getElementById('tenantPhone');
    const tenantEmailEl = document.getElementById('tenantEmail');
    // **注意：不再獲取 landlordNameEl, leaseAddressEl 等不存在的元素**

    // 獲取 Checkbox 元素
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
        if(!statusMessage) return; // Guard against missing status message element
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

            statusMessage.textContent = "請填寫表單資訊並簽名確認。";

        } catch (error) {
             console.error("LIFF 初始化錯誤:", error);
             statusMessage.textContent = `錯誤：初始化失敗 (${error.message})。`;
             if(confirmButton) confirmButton.disabled = true;
             if(clearButton) clearButton.disabled = true;
        }
    }

    function initializeSignaturePad() {
         if (!canvas || !placeholder) {
             console.error("找不到 Canvas 或 Placeholder");
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
             if (!ctx) throw new Error("無法獲取 Canvas 2D 上下文。");
             ctx.scale(ratio, ratio);

             signaturePad = new SignaturePad(canvas, { penColor: "rgb(0, 0, 0)" });

             // Placeholder Logic
             function updatePlaceholderVisibility() {
                 if (placeholder && signaturePad) {
                     placeholder.style.display = signaturePad.isEmpty() ? 'block' : 'none';
                 }
             }
             signaturePad.addEventListener("beginStroke", () => { if(placeholder) placeholder.style.display = 'none'; });
             signaturePad.addEventListener("clear", updatePlaceholderVisibility);
             updatePlaceholderVisibility(); // Initial check

             // Button Listeners
             if (clearButton) {
                 clearButton.addEventListener('click', () => {
                      if(signaturePad) signaturePad.clear(); // clear event will update placeholder
                 });
             } else { console.error("找不到清除按鈕"); }

             if (confirmButton) {
                 confirmButton.addEventListener('click', handleSubmitSignature);
             } else { console.error("找不到確認按鈕"); }

             window.addEventListener('resize', resizeCanvas);
             console.log("Signature Pad initialized.");

         } catch (error) {
             console.error("Signature Pad 初始化失敗:", error);
             if(statusMessage) statusMessage.textContent = "錯誤：簽名功能載入失敗。";
             if(confirmButton) confirmButton.disabled = true;
             if(clearButton) clearButton.disabled = true;
         }
    }

    // **MODIFIED handleSubmitSignature**
    async function handleSubmitSignature() {
        if (!signaturePad || signaturePad.isEmpty()) {
            alert("請承租人簽名確認！");
            return;
        }

        // **收集【僅存在於目前 HTML 的】表單數據**
        const formData = {
            tenantName: tenantNameEl ? tenantNameEl.value.trim() : '',
            tenantPhone: tenantPhoneEl ? tenantPhoneEl.value.trim() : '',
            tenantEmail: tenantEmailEl ? tenantEmailEl.value.trim() : '',
            // **注意：不再包含 landlordName, leaseAddress 等欄位**
        };

        // **修改：只檢查目前存在的必填欄位**
        const requiredKeys = ['tenantName', 'tenantPhone', 'tenantEmail']; // Adjust if requirements differ
        const missingFields = requiredKeys.filter(key => !formData[key]);

        if (missingFields.length > 0) {
             const missingLabels = missingFields.map(id => {
                const label = document.querySelector(`label[for='${id}']`);
                return label ? label.textContent.replace('：', '').trim() : id;
             }).join(', ');
            alert(`請填寫承租人資訊！(缺少: ${missingLabels})`);
            return;
        }

        // 檢查 Folder ID (仍然需要)
        if (!currentSaveFolderId) {
            alert("錯誤：缺少必要的設定參數(Folder ID)，無法提交。");
            return;
        }

        // 檢查條款 Checkbox (仍然需要)
        const term4Checked = term4Checkbox?.checked;
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

            // **修改：Payload 只包含有限的 formData**
            const payload = {
                ...formData, // 只包含 tenantName, tenantPhone, tenantEmail
                signatureImage: signatureImageBase64,
                pdfSaveFolderId: currentSaveFolderId, // 仍然需要 Folder ID
                submittedAt: new Date().toISOString(),
                termsAgreed: { // 條款同意狀態仍然需要
                   term4: term4Checked,
                   term5: term5Checked,
                   term6: term6Checked,
                   term7: term7Checked,
                }
                // **注意：Payload 中缺少了 landlord, lease, deposit 等資訊**
            };

            console.log("準備發送到後端的【簡化版】Payload:", JSON.stringify(payload)); // Log simplified payload

            // 執行 fetch POST 到 submitApiUrl (發送簡化後的 payload)
            const response = await fetch(submitApiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            // 處理 API 回應 (與之前相同)
             if (!response.ok) {
                let errorMsg = `提交失敗 (${response.status})`;
                try { /* ... 嘗試解析錯誤訊息 ... */
                    const errorData = await response.json();
                    errorMsg += `: ${errorData.error || JSON.stringify(errorData)}`;
                } catch(e){ try {errorMsg += `: ${await response.text()}`;} catch(e2){} }
                throw new Error(errorMsg);
             }

             const result = await response.json();
             console.log("Submission successful (with limited data):", result);
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
        // (與之前版本相同，使用 signaturePad.toData/fromData)
        if (!signaturePad || !canvas || !placeholder) return;
         const data = signaturePad.toData();
         const ratio = Math.max(window.devicePixelRatio || 1, 1);
          if (canvas.offsetWidth > 0 && canvas.offsetHeight > 0) {
             canvas.width = canvas.offsetWidth * ratio;
             canvas.height = canvas.offsetHeight * ratio;
             canvas.getContext("2d").scale(ratio, ratio);
             signaturePad.clear();
             signaturePad.fromData(data);
             placeholder.style.display = signaturePad.isEmpty() ? 'block' : 'none'; // Update placeholder
          }
    }

     // Share to Line Function (for onclick)
      window.shareToLine = () => {
         const url = encodeURIComponent(window.location.href);
         const text = encodeURIComponent('這是您的租屋訂金收據連結，請填寫後簽名確認：');
         window.location.href = `https://line.me/R/msg/text/?${text}%0A${url}`;
         console.log("Attempting to share to LINE.");
      };

      // Ensure initial placeholder visibility is set
      const initialPlaceholder = document.getElementById('signature-placeholder');
      if (initialPlaceholder) initialPlaceholder.style.display = 'block';


}); // DOMContentLoaded End