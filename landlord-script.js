'use strict';

document.addEventListener('DOMContentLoaded', () => {
    // --- Configuration ---
    // !!! IMPORTANT: Set this to the base URL of your TENANT'S signing page !!!
    const tenantPageBaseUrl = 'https://kennydag8.github.io/line-liff-receipt-frontend/'; // Include trailing slash if needed

    // --- Get Elements ---
    // Input Fields
    const pdfSaveFolderIdInput = document.getElementById('pdfSaveFolderIdInput');
    const landlordNameInput = document.getElementById('landlordNameInput');
    const landlordPhoneInput = document.getElementById('landlordPhoneInput');
    const leaseAddressInput = document.getElementById('leaseAddressInput');
    const leaseStartDateInput = document.getElementById('leaseStartDateInput');
    const leaseEndDateInput = document.getElementById('leaseEndDateInput');
    const monthlyRentInput = document.getElementById('monthlyRentInput');
    const rentPaymentMethodInput = document.getElementById('rentPaymentMethodInput');
    const remarksInput = document.getElementById('remarksInput');
    const depositAmountInput = document.getElementById('depositAmountInput');
    const depositPaymentMethodInput = document.getElementById('depositPaymentMethodInput');
    const depositPaymentDateInput = document.getElementById('depositPaymentDateInput');
    const expectedSigningDateInput = document.getElementById('expectedSigningDateInput');
    const brokerageFeeAmountInput = document.getElementById('brokerageFeeAmountInput');

    // Buttons & Output Area
    const generateButton = document.getElementById('generate-button');
    const resultArea = document.getElementById('result-area');
    const generatedUrlTextarea = document.getElementById('generated-url');
    const copyButton = document.getElementById('copy-button');
    const shareGeneratedButton = document.getElementById('share-generated-button');

    // Check if elements exist
    if (!generateButton || !resultArea || !generatedUrlTextarea || !copyButton || !shareGeneratedButton || !pdfSaveFolderIdInput) {
        console.error("頁面缺少必要的按鈕或輸出區域元素！");
        alert("頁面載入錯誤，缺少元件。");
        return;
    }

    // --- Event Listener for Generate Button ---
    generateButton.addEventListener('click', () => {
        console.log("產生連結按鈕被點擊");

        // 1. Read values from all input fields
        const formData = {
            pdfSaveFolderId: pdfSaveFolderIdInput.value.trim(),
            name: landlordNameInput.value.trim(),
            phone: landlordPhoneInput.value.trim(),
            addr: leaseAddressInput.value.trim(),
            start: leaseStartDateInput.value.trim(),
            end: leaseEndDateInput.value.trim(),
            rent: monthlyRentInput.value.trim(),
            rentMethod: rentPaymentMethodInput.value.trim(),
            remarks: remarksInput.value.trim(), // Read remarks
            deposit: depositAmountInput.value.trim(),
            depMethod: depositPaymentMethodInput.value.trim(),
            depDate: depositPaymentDateInput.value.trim(),
            signDate: expectedSigningDateInput.value.trim(),
            brokerage: brokerageFeeAmountInput.value.trim()
        };

        // 2. Basic Validation (Check required fields)
        // Add more fields here if they become mandatory for the link
        const requiredFields = {
            "Google Drive 資料夾 ID": formData.pdfSaveFolderId,
            "房東姓名": formData.name,
            "租屋地址": formData.addr,
            "租期起": formData.start,
            "租期迄": formData.end,
            "月租金": formData.rent,
            "訂金金額": formData.deposit
        };
        const missing = Object.keys(requiredFields).filter(key => !requiredFields[key]);

        if (missing.length > 0) {
            alert(`請填寫所有必填欄位（有紅色*號標示）：\n- ${missing.join('\n- ')}`);
            resultArea.style.display = 'none'; // Hide result area if validation fails
            return;
        }

        // 3. Construct the URL with parameters
        const params = new URLSearchParams();
        // Add parameters only if they have a value
        if (formData.name) params.set('name', formData.name);
        if (formData.phone) params.set('phone', formData.phone);
        if (formData.addr) params.set('addr', formData.addr);
        if (formData.start) params.set('start', formData.start);
        if (formData.end) params.set('end', formData.end);
        if (formData.rent) params.set('rent', formData.rent);
        if (formData.rentMethod) params.set('rentMethod', formData.rentMethod);
        if (formData.remarks) params.set('remarks', formData.remarks); // Include remarks
        if (formData.deposit) params.set('deposit', formData.deposit);
        if (formData.depMethod) params.set('depMethod', formData.depMethod);
        if (formData.depDate) params.set('depDate', formData.depDate);
        if (formData.signDate) params.set('signDate', formData.signDate);
        if (formData.brokerage) params.set('brokerage', formData.brokerage);
        // ** Crucially, add the pdfSaveFolderId **
        params.set('pdfSaveFolderId', formData.pdfSaveFolderId);

        const finalUrl = `${tenantPageBaseUrl}?${params.toString()}`;

        console.log("產生的租客連結:", finalUrl);

        // 4. Display the generated URL and buttons
        generatedUrlTextarea.value = finalUrl;
        resultArea.style.display = 'block'; // Show the result area
    });

    // --- Event Listener for Copy Button ---
    copyButton.addEventListener('click', () => {
        if (!generatedUrlTextarea.value) return;
        navigator.clipboard.writeText(generatedUrlTextarea.value)
            .then(() => {
                alert("連結已複製到剪貼簿！");
            })
            .catch(err => {
                console.error('無法複製連結: ', err);
                alert("複製失敗，請手動複製。");
            });
    });

    // --- Event Listener for Share Generated URL Button ---
    shareGeneratedButton.addEventListener('click', () => {
        const urlToShare = generatedUrlTextarea.value;
        if (!urlToShare) {
            alert("請先產生連結。");
            return;
        }
        const text = encodeURIComponent('這是您的租屋訂金表單連結，請填寫後簽名確認：');
        const lineUrl = `https://line.me/R/msg/text/?${text}%0A${encodeURIComponent(urlToShare)}`;
        console.log("透過 LINE 分享產生的連結...");
        window.location.href = lineUrl; // Or use window.open(lineUrl, '_blank');
    });

}); // End DOMContentLoaded