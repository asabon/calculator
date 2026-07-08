class Calculator {
  constructor(displayFormulaElement, displayInputElement, historyListElement) {
    this.displayFormulaElement = displayFormulaElement;
    this.displayInputElement = displayInputElement;
    this.historyListElement = historyListElement;
    
    this.history = JSON.parse(localStorage.getItem('calc_history')) || [];
    this.clear();
    this.renderHistory();
  }

  // 状態初期化 (AC)
  clear() {
    this.currentValue = '0';
    this.previousValue = '';
    this.operation = undefined;
    this.formula = '';
    this.isCalculated = false;
    this.updateDisplay();
  }

  // 1文字削除 (DEL)
  delete() {
    if (this.isCalculated) {
      this.clear();
      return;
    }
    if (this.currentValue === 'Error' || this.currentValue === 'Cannot divide by zero') {
      this.currentValue = '0';
      this.updateDisplay();
      return;
    }
    
    this.currentValue = this.currentValue.toString().slice(0, -1);
    if (this.currentValue === '' || this.currentValue === '-') {
      this.currentValue = '0';
    }
    this.updateDisplay();
  }

  // 数字入力
  appendNumber(number) {
    // エラー状態からの入力はクリアしてから開始
    if (this.currentValue === 'Error' || this.currentValue === 'Cannot divide by zero') {
      this.currentValue = '0';
    }

    // イコール計算後の入力は、新しい数値入力として扱う
    if (this.isCalculated) {
      this.currentValue = number === '.' ? '0.' : number.toString();
      this.isCalculated = false;
      this.updateDisplay();
      return;
    }

    // 小数点の複数入力を防ぐ
    if (number === '.' && this.currentValue.includes('.')) return;

    // 初期値が0で、小数点が入力された場合
    if (this.currentValue === '0' && number !== '.') {
      this.currentValue = number.toString();
    } else {
      this.currentValue = this.currentValue.toString() + number.toString();
    }
    this.updateDisplay();
  }

  // 演算子の選択
  chooseOperation(op) {
    if (this.currentValue === 'Error' || this.currentValue === 'Cannot divide by zero') return;

    // 計算直後は結果に対してそのまま次の計算を続けられる
    if (this.isCalculated) {
      this.isCalculated = false;
    }

    // すでに前の入力があり、現在の入力もある場合は、連続計算を行う
    if (this.previousValue !== '' && this.currentValue !== '') {
      this.compute(false); // 履歴には追加しない中間計算
    }

    this.operation = op;
    this.previousValue = this.currentValue;
    this.currentValue = '';
    this.updateDisplay();
  }

  // パーセント演算 (%)
  percent() {
    if (this.currentValue === 'Error' || this.currentValue === 'Cannot divide by zero') return;
    
    const current = parseFloat(this.currentValue);
    if (isNaN(current)) return;
    
    // 計算結果後のパーセントは、再度その値を%にする
    this.currentValue = this.roundNumber(current / 100).toString();
    this.isCalculated = false;
    this.updateDisplay();
  }

  // 精度の高い数値丸め（JSの 0.1 + 0.2 などの誤差対策）
  roundNumber(num) {
    return Math.round(num * 1e12) / 1e12;
  }

  // 計算の実行
  compute(saveToHistory = true) {
    let computation;
    const prev = parseFloat(this.previousValue);
    const current = parseFloat(this.currentValue);

    // 数値が無効な場合は終了
    if (isNaN(prev) || isNaN(current)) return;

    switch (this.operation) {
      case 'add':
        computation = prev + current;
        break;
      case 'subtract':
        computation = prev - current;
        break;
      case 'multiply':
        computation = prev * current;
        break;
      case 'divide':
        if (current === 0) {
          this.currentValue = 'Cannot divide by zero';
          this.previousValue = '';
          this.operation = undefined;
          this.formula = '';
          this.isCalculated = true;
          this.updateDisplay();
          return;
        }
        computation = prev / current;
        break;
      default:
        return;
    }

    // 計算結果の保存
    const roundedResult = this.roundNumber(computation);
    
    if (saveToHistory) {
      // 履歴登録用のフォーミュラ文字列を作成
      const formulaStr = `${this.formatDisplayValue(prev)} ${this.getOperatorSymbol(this.operation)} ${this.formatDisplayValue(current)}`;
      this.addHistoryItem(formulaStr, roundedResult.toString());
      this.isCalculated = true;
    }

    this.currentValue = roundedResult.toString();
    this.operation = undefined;
    this.previousValue = '';
    this.updateDisplay();
  }

  // 演算子のシンボル取得
  getOperatorSymbol(op) {
    switch (op) {
      case 'add': return '+';
      case 'subtract': return '−';
      case 'multiply': return '×';
      case 'divide': return '÷';
      default: return '';
    }
  }

  // ディスプレイ表示用のフォーマット（カンマ区切りなど）
  formatDisplayValue(val) {
    if (val === 'Error' || val === 'Cannot divide by zero') return val;
    if (val === '') return '';
    
    const stringValue = val.toString();
    const integerDigits = parseFloat(stringValue.split('.')[0]);
    const decimalDigits = stringValue.split('.')[1];
    
    let integerDisplay;
    if (isNaN(integerDigits)) {
      integerDisplay = '';
    } else {
      integerDisplay = integerDigits.toLocaleString('en', { maximumFractionDigits: 0 });
    }
    
    if (decimalDigits != null) {
      return `${integerDisplay}.${decimalDigits}`;
    } else {
      return integerDisplay;
    }
  }

  // ディスプレイ更新
  updateDisplay() {
    this.displayInputElement.innerText = this.formatDisplayValue(this.currentValue);
    
    if (this.operation != null) {
      this.displayFormulaElement.innerText = `${this.formatDisplayValue(this.previousValue)} ${this.getOperatorSymbol(this.operation)}`;
    } else {
      this.displayFormulaElement.innerText = '';
    }

    // フォントサイズの自動調整（文字数が多くなったらフォントサイズを下げる）
    const len = this.displayInputElement.innerText.length;
    if (len > 12) {
      this.displayInputElement.style.fontSize = '1.8rem';
    } else if (len > 8) {
      this.displayInputElement.style.fontSize = '2.3rem';
    } else {
      this.displayInputElement.style.fontSize = '3rem';
    }
  }

  // 計算履歴の追加
  addHistoryItem(formula, result) {
    const newItem = { formula, result, id: Date.now() };
    this.history.unshift(newItem); // 最新を先頭に追加
    
    // 履歴の上限を20件に制限
    if (this.history.length > 20) {
      this.history.pop();
    }
    
    localStorage.setItem('calc_history', JSON.stringify(this.history));
    this.renderHistory();
  }

  // 履歴リストの描画
  renderHistory() {
    this.historyListElement.innerHTML = '';
    
    if (this.history.length === 0) {
      this.historyListElement.innerHTML = '<li class="history-empty">履歴がありません</li>';
      return;
    }

    this.history.forEach(item => {
      const li = document.createElement('li');
      li.className = 'history-item';
      li.setAttribute('tabindex', '0');
      li.setAttribute('role', 'button');
      li.setAttribute('aria-label', `計算式: ${item.formula}、結果: ${item.result}`);
      
      li.innerHTML = `
        <span class="history-item-formula">${item.formula}</span>
        <span class="history-item-result">${this.formatDisplayValue(item.result)}</span>
      `;
      
      // クリックしたら履歴の数値を電卓にロード
      li.addEventListener('click', () => {
        this.currentValue = item.result;
        this.previousValue = '';
        this.operation = undefined;
        this.isCalculated = true; // イコール計算後と同じ状態にし、次に数値が押されたらリセット
        this.updateDisplay();
        
        // モバイルなどの場合、履歴をクリックした後にパネルを閉じる
        if (window.innerWidth < 768) {
          document.querySelector('.app-container').classList.remove('history-open');
        }
      });

      // キーボードでのエンター・スペースキー操作対応
      li.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          li.click();
        }
      });

      this.historyListElement.appendChild(li);
    });
  }

  // 履歴の全削除
  clearHistory() {
    this.history = [];
    localStorage.removeItem('calc_history');
    this.renderHistory();
  }
}

// DOM Elements Initialization
document.addEventListener('DOMContentLoaded', () => {
  const displayFormulaElement = document.getElementById('display-formula');
  const displayInputElement = document.getElementById('display-input');
  const historyListElement = document.getElementById('history-list');
  
  const calculator = new Calculator(displayFormulaElement, displayInputElement, historyListElement);
  
  // キーパッドのイベント紐付け
  const keypad = document.querySelector('.calculator-keypad');
  keypad.addEventListener('click', (e) => {
    const target = e.target.closest('.key');
    if (!target) return;

    const { value, action, operator } = target.dataset;

    if (value != null) {
      calculator.appendNumber(value);
    } else if (operator != null) {
      calculator.chooseOperation(operator);
    } else if (action != null) {
      if (action === 'clear') {
        calculator.clear();
      } else if (action === 'delete') {
        calculator.delete();
      } else if (action === 'percent') {
        calculator.percent();
      } else if (action === 'calculate') {
        calculator.compute();
      }
    }
  });

  // 履歴パネルの表示切り替え制御
  const toggleHistoryBtn = document.getElementById('toggle-history-btn');
  const closeHistoryBtn = document.getElementById('close-history-btn');
  const clearHistoryBtn = document.getElementById('clear-history-btn');
  const appContainer = document.querySelector('.app-container');

  const toggleHistory = () => {
    appContainer.classList.toggle('history-open');
  };

  toggleHistoryBtn.addEventListener('click', toggleHistory);
  closeHistoryBtn.addEventListener('click', () => {
    appContainer.classList.remove('history-open');
  });

  clearHistoryBtn.addEventListener('click', () => {
    if (confirm('計算履歴をすべてクリアしますか？')) {
      calculator.clearHistory();
    }
  });

  // キーボードショートカットのサポート
  document.addEventListener('keydown', (e) => {
    // 入力フォームやボタンへのフォーカス中にショートカットが誤爆するのをある程度防ぐ
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    const key = e.key;

    // 数字と小数点
    if ((key >= '0' && key <= '9') || key === '.') {
      calculator.appendNumber(key);
      animateKey(key);
    }
    // 演算子
    else if (key === '+') {
      calculator.chooseOperation('add');
      animateKey('add');
    }
    else if (key === '-') {
      calculator.chooseOperation('subtract');
      animateKey('subtract');
    }
    else if (key === '*') {
      calculator.chooseOperation('multiply');
      animateKey('multiply');
    }
    else if (key === '/') {
      e.preventDefault(); // ブラウザ標準の検索窓などを防ぐ
      calculator.chooseOperation('divide');
      animateKey('divide');
    }
    // 計算実行 (Enter, =)
    else if (key === 'Enter' || key === '=') {
      e.preventDefault();
      calculator.compute();
      animateKey('calculate');
    }
    // 1文字削除 (Backspace)
    else if (key === 'Backspace') {
      calculator.delete();
      animateKey('delete');
    }
    // クリア (Escape, c, C)
    else if (key === 'Escape' || key === 'c' || key === 'C') {
      calculator.clear();
      animateKey('clear');
    }
    // パーセント (%)
    else if (key === '%') {
      calculator.percent();
      animateKey('percent');
    }
  });

  // キー押下時のビジュアルフィードバック（アニメーション）
  function animateKey(actionOrValue) {
    let button;
    if (['add', 'subtract', 'multiply', 'divide'].includes(actionOrValue)) {
      button = document.getElementById(`key-${actionOrValue}`);
    } else if (['clear', 'delete', 'percent', 'calculate'].includes(actionOrValue)) {
      if (actionOrValue === 'calculate') {
        button = document.getElementById('key-equals');
      } else {
        button = document.getElementById(`key-${actionOrValue}`);
      }
    } else {
      // 数字キー
      button = Array.from(document.querySelectorAll('.number-key'))
        .find(btn => btn.dataset.value === actionOrValue);
    }

    if (button) {
      button.classList.add('key-active-feedback');
      // CSSで設定されたアクティブ時と同様の効果を一時的に付与
      button.style.transform = 'scale(0.92)';
      button.style.filter = 'brightness(0.8)';
      
      setTimeout(() => {
        button.style.transform = '';
        button.style.filter = '';
        button.classList.remove('key-active-feedback');
      }, 150);
    }
  }
});
