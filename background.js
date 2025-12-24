// サービスワーカーが起動したことを確認
console.log("[Background] サービスワーカーが起動しました");

// メッセージを送信する関数（リトライ機能付き）
function sendMessageWithRetry(tabId, message, maxRetries = 3, delay = 500) {
  return new Promise((resolve, reject) => {
    let retryCount = 0;
    
    function attemptSend() {
      chrome.tabs.sendMessage(tabId, message, (response) => {
        if (chrome.runtime.lastError) {
          if (retryCount < maxRetries) {
            retryCount++;
            console.log(`[Background] リトライ ${retryCount}/${maxRetries}... (${delay}ms待機)`);
            setTimeout(attemptSend, delay);
          } else {
            console.error("[Background] エラー:", chrome.runtime.lastError.message);
            console.error("[Background] 考えられる原因:");
            console.error("  1. content.jsが読み込まれていない");
            console.error("  2. ページが完全に読み込まれていない");
            console.error("  3. content.jsでメッセージリスナーが設定されていない");
            console.error("  4. ページをリロードしてから再度お試しください");
            reject(chrome.runtime.lastError);
          }
        } else if (response) {
          console.log("[Background] レスポンスを受信:", response);
          if (response.success) {
            console.log("[Background] ✓ すべての日付が正常に設定されました");
          } else {
            console.warn("[Background] ⚠ 一部の日付が設定できませんでした:", response);
          }
          resolve(response);
        } else {
          console.warn("[Background] ⚠ レスポンスがありませんでした");
          resolve(null);
        }
      });
    }
    
    attemptSend();
  });
}

// 拡張機能アイコンがクリックされたときの処理
chrome.action.onClicked.addListener((tab) => {
  console.log("[Background] アイコンがクリックされました。タブID:", tab.id, "URL:", tab.url);
  
  // まず、タブが完全に読み込まれているか確認
  chrome.tabs.get(tab.id, (tabInfo) => {
    if (chrome.runtime.lastError) {
      console.error("[Background] タブ情報の取得に失敗:", chrome.runtime.lastError.message);
      return;
    }
    
    // タブが完全に読み込まれていない場合は、読み込み完了を待つ
    if (tabInfo.status !== 'complete') {
      console.log("[Background] ページが読み込み中です。読み込み完了を待機します...");
      chrome.tabs.onUpdated.addListener(function listener(tabId, changeInfo) {
        if (tabId === tab.id && changeInfo.status === 'complete') {
          chrome.tabs.onUpdated.removeListener(listener);
          console.log("[Background] ページの読み込みが完了しました。メッセージを送信します...");
          sendMessageWithRetry(tab.id, { action: "fillDates" });
        }
      });
    } else {
      // ページが既に読み込まれている場合は、少し待ってからメッセージを送信
      console.log("[Background] ページは読み込み済みです。メッセージを送信します...");
      setTimeout(() => {
        sendMessageWithRetry(tab.id, { action: "fillDates" });
      }, 100);
    }
  });
});

