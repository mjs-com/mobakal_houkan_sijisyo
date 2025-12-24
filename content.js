// 日付をYYYY-MM-DD形式でフォーマットする関数
function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// 実行した月の22日を取得
function getCurrentMonth22nd() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 22);
}

// 翌月の1日を取得
function getNextMonthFirst() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 1, 1);
}

// 翌月の末日を取得
function getNextMonthLast() {
  const now = new Date();
  // 翌月の1日を取得し、そこから1日引くと今月の末日になる
  // 翌月の末日を取得するには、翌々月の1日から1日引く
  return new Date(now.getFullYear(), now.getMonth() + 2, 0);
}

// 入力欄に値を設定し、イベントを発火する関数
function setInputValue(inputElement, value, fieldName) {
  if (!inputElement) {
    // エラーではなく、単に失敗として返す（エラーログは出さない）
    return false;
  }

  // 値を設定
  inputElement.value = value;

  // inputイベントを発火
  const inputEvent = new Event('input', {
    bubbles: true,
    cancelable: true
  });
  inputElement.dispatchEvent(inputEvent);

  // changeイベントを発火
  const changeEvent = new Event('change', {
    bubbles: true,
    cancelable: true
  });
  inputElement.dispatchEvent(changeEvent);

  console.log(`${fieldName} に ${value} を設定しました。`);
  return true;
}

// content.jsが読み込まれたことを確認
const isTopFrame = (window.self === window.top);
const frameInfo = isTopFrame ? "[TopFrame]" : "[SubFrame]";
console.log(`[Content]${frameInfo} content.js が読み込まれました。URL:`, window.location.href);

// 入力欄を検索する関数（リトライ機能付き）
function findInputFields(maxRetries = 10, delay = 200) {
  const fieldNames = ['disp_date', 'char1_kinyubi', 'char1_houkanstart', 'char1_houkanend'];
  const fields = {};
  
  for (const fieldName of fieldNames) {
    const element = document.querySelector(`input[name="${fieldName}"]`);
    fields[fieldName] = element;
  }
  
  // すべての入力欄が見つかったか確認
  const allFound = fieldNames.every(name => fields[name] !== null);
  
  return { fields, allFound };
}

// メッセージを受信したときの処理
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log(`[Content]${frameInfo} メッセージを受信:`, request);
  
  if (request.action === "fillDates") {
    console.log(`[Content]${frameInfo} 日付入力処理を開始します...`);
    
    // 日付を計算
    const currentMonth22nd = formatDate(getCurrentMonth22nd());
    const nextMonthFirst = formatDate(getNextMonthFirst());
    const nextMonthLast = formatDate(getNextMonthLast());
    
    console.log(`[Content]${frameInfo} 計算された日付:`);
    console.log("  - 今月22日:", currentMonth22nd);
    console.log("  - 翌月1日:", nextMonthFirst);
    console.log("  - 翌月末日:", nextMonthLast);

    // 入力欄を検索（リトライ機能付き）
    let retryCount = 0;
    const maxRetries = 10;
    const retryDelay = 200;
    
    function attemptFillDates() {
      const { fields, allFound } = findInputFields();
      
      // 見つかった入力欄を確認
      const foundFields = Object.keys(fields).filter(key => fields[key] !== null);
      
      if (allFound) {
        // すべて見つかった場合は処理を実行
        console.log(`[Content]${frameInfo} ★全ての入力欄が見つかりました！`);
        
        let successCount = 0;
        if (setInputValue(fields.disp_date, currentMonth22nd, "disp_date")) successCount++;
        if (setInputValue(fields.char1_kinyubi, currentMonth22nd, "char1_kinyubi")) successCount++;
        if (setInputValue(fields.char1_houkanstart, nextMonthFirst, "char1_houkanstart")) successCount++;
        if (setInputValue(fields.char1_houkanend, nextMonthLast, "char1_houkanend")) successCount++;

        const result = { 
          success: successCount === 4,
          filled: successCount,
          total: 4,
          frame: isTopFrame ? "top" : "sub"
        };
        
        console.log(`[Content]${frameInfo} 処理成功:`, result);

        // 結果を返す
        sendResponse(result);
      } else if (retryCount < maxRetries - 1) {
        // まだ見つからない場合はリトライ
        retryCount++;
        if (foundFields.length > 0) {
          console.log(`[Content]${frameInfo} 一部の入力欄のみ発見 (${foundFields.join(", ")}). リトライ ${retryCount}/${maxRetries}...`);
        } else {
          console.log(`[Content]${frameInfo} 入力欄が見つかりません。リトライ ${retryCount}/${maxRetries}...`);
        }
        setTimeout(attemptFillDates, retryDelay);
      } else {
        // 最大リトライ回数に達した場合
        // 入力欄が見つからなかったフレームでは、エラーログを出さずに静かに終了
        // （成功したフレームからのレスポンスが既に返されているため）
        const foundFields = Object.keys(fields).filter(key => fields[key] !== null);
        if (foundFields.length === 0) {
          // このフレームには入力欄がない（正常な状態）
          // レスポンスを返さない（成功したフレームからのレスポンスのみを有効にする）
          return;
        }
        
        // 一部見つかった場合は処理を実行（通常はここには来ないはず）
        let successCount = 0;
        if (setInputValue(fields.disp_date, currentMonth22nd, "disp_date")) successCount++;
        if (setInputValue(fields.char1_kinyubi, currentMonth22nd, "char1_kinyubi")) successCount++;
        if (setInputValue(fields.char1_houkanstart, nextMonthFirst, "char1_houkanstart")) successCount++;
        if (setInputValue(fields.char1_houkanend, nextMonthLast, "char1_houkanend")) successCount++;

        const result = { 
          success: successCount === 4,
          filled: successCount,
          total: 4,
          frame: isTopFrame ? "top" : "sub"
        };
        
        // 成功した場合のみログを出す
        if (successCount > 0) {
          console.log(`[Content]${frameInfo} 処理結果:`, result);
          sendResponse(result);
        }
        // 失敗した場合は何も返さない（エラーログも出さない）
      }
    }
    
    // 最初の試行を開始
    attemptFillDates();

    return true; // 非同期レスポンスを示す
  }
  
  return false; // メッセージを処理しなかった場合
});

