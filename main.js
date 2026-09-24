// Состояние приложения
let state = {
  gistId: localStorage.getItem('gistId'),
  token: localStorage.getItem('githubToken'),
  data: {
    shopping: [],
    plans: []
  }
};

// Элементы DOM
const setupScreen = document.getElementById('setupScreen');
const mainScreen = document.getElementById('mainScreen');
const settingsModal = document.getElementById('settingsModal');
const notification = document.getElementById('notification');
// Инициализация
function init() {
  if (state.gistId && state.token) {
    showMainScreen();
    loadData();
  } else {
    showSetupScreen();
  }

  setupEventListeners();
}
// Показать экран настройки
function showSetupScreen() {
  setupScreen.classList.remove('hidden');
  mainScreen.classList.add('hidden');
}
// Показать главный экран
function showMainScreen() {
  setupScreen.classList.add('hidden');
  mainScreen.classList.remove('hidden');
}
// Настройка обработчиков событий
function setupEventListeners() {
  // Кнопка сохранения настроек
  document.getElementById('saveSettings').addEventListener('click', saveInitialSettings);
  // Кнопка настроек
  document.getElementById('settingsBtn').addEventListener('click', openSettings);

  // Закрытие настроек
  document.getElementById('closeSettings').addEventListener('click', closeSettings);
  document.getElementById('saveSettingsModal').addEventListener('click', saveSettings);

  // Вкладки
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => switchTab(tab.dataset.tab));
  });

  // Добавление товаров
  document.getElementById('addShoppingItem').addEventListener('click', () => addItem('shopping'));
  document.getElementById('newShoppingItem').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') addItem('shopping');
  });

  // Добавление планов
  document.getElementById('addPlanItem').addEventListener('click', () => addItem('plans'));
  document.getElementById('newPlanItem').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') addItem('plans');
  });

  // Синхронизация
  document.getElementById('syncBtn').addEventListener('click', () => loadData());
  document.getElementById('syncPlansBtn').addEventListener('click', () => loadData());
}
// Сохранить первоначальные настройки
function saveInitialSettings() {
  const gistId = document.getElementById('gistId').value.trim();
  const token = document.getElementById('githubToken').value.trim();
  if (!gistId || !token) {
    showNotification('Заполните все поля', 'error');
    return;
  }

  state.gistId = gistId;
  state.token = token;
  
  localStorage.setItem('gistId', gistId);
  localStorage.setItem('githubToken', token);
  
  showMainScreen();
  loadData();
  showNotification('Настройки сохранены!');
}
// Открыть настройки
function openSettings() {
  document.getElementById('editGistId').value = state.gistId;
  document.getElementById('editToken').value = state.token;
  settingsModal.classList.remove('hidden');
}
// Закрыть настройки
function closeSettings() {
  settingsModal.classList.add('hidden');
}
// Сохранить настройки
function saveSettings() {
  const gistId = document.getElementById('editGistId').value.trim();
  const token = document.getElementById('editToken').value.trim();
  if (!gistId || !token) {
    showNotification('Заполните все поля', 'error');
    return;
  }

  state.gistId = gistId;
  state.token = token;
  
  localStorage.setItem('gistId', gistId);
  localStorage.setItem('githubToken', token);
  
  closeSettings();
  loadData();
  showNotification('Настройки обновлены!');
}
// Переключение вкладок
function switchTab(tabName) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
  document.querySelectorAll('.list-container').forEach(l => l.classList.remove('active'));
  document.getElementById(`${tabName}List`).classList.add('active');
}
// Загрузка данных из Gist
async function loadData() {
  try {
    const response = await fetch(`https://api.github.com/gists/${state.gistId}`, {
    headers: {
      'Authorization': `token ${state.token}`,
      'Accept': 'application/vnd.github.v3+json'
    }
    });

    if (!response.ok) {
      throw new Error('Ошибка загрузки данных');
    }
    
    const gist = await response.json();
    const file = gist.files['family_data.json'];
    
    if (file) {
        state.data = JSON.parse(file.content);
    } else {
        state.data = { shopping: [], plans: [] };
    }
    
    renderLists();
    showNotification('Данные загружены');
  } catch (error) {
    showNotification('Ошибка загрузки: ' + error.message, 'error');
  }
}
// Сохранение данных в Gist
async function saveData() {
  try {
    const url = `https://api.github.com/gists/${state.gistId}`;
    console.log("Попытка сохранения в:", url); // Отладка
    
    const response = await fetch(url, {
      method: 'PATCH',
      headers: {
        'Authorization': `token ${state.token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        files: {
          'family_data.json': {
            content: JSON.stringify(state.data, null, 2)
          }
        }
      })
    });
    
    if (!response.ok) {
      const errorDetails = await response.text();
      console.error("Детали ошибки от GitHub:", response.status, errorDetails);
      throw new Error(`GitHub вернул ошибку ${response.status}. Проверьте ID Gist и токен.`);
    }
    
    showNotification('Данные сохранены');
  } catch (error) {
    showNotification('Ошибка сохранения: ' + error.message, 'error');
  }
}
// Добавить элемент
function addItem(type) {
  const input = document.getElementById(type === 'shopping' ? 'newShoppingItem' : 'newPlanItem');
  const text = input.value.trim();
  if (!text) return;

  state.data[type].push({
      id: Date.now(),
      text: text,
      completed: false,
      createdAt: new Date().toISOString()
  });

  input.value = '';
  renderLists();
  saveData();

}
// Переключить статус элемента
function toggleItem(type, id) {
  const item = state.data[type].find(i => i.id === id);
  if (item) {
    item.completed = !item.completed;
    renderLists();
    saveData();
  }
}
// Удалить элемент
function deleteItem(type, id) {
  state.data[type] = state.data[type].filter(i => i.id !== id);
  renderLists();
  saveData();
}
// Отрисовка списков
function renderLists() {
  renderList('shopping', 'shoppingItems');
  renderList('plans', 'planItems');
}
function renderList(type, containerId) {
  const container = document.getElementById(containerId);
  const items = state.data[type] || [];

  container.innerHTML = items.map(item => `
    <li class="item ${item.completed ? 'completed' : ''}">
        <input 
            type="checkbox" 
            class="item-checkbox" 
            ${item.completed ? 'checked' : ''}
            onchange="toggleItem('${type}', ${item.id})"
        >
        <span class="item-text">${escapeHtml(item.text)}</span>
        <button class="item-delete" onclick="deleteItem('${type}', ${item.id})">×</button>
    </li>
  `).join('');
}
// Экранирование HTML
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
// Показать уведомление
function showNotification(message, type = 'success') {
  notification.textContent = message;
  notification.className = 'notification';
  if (type === 'error') {
    notification.classList.add('error');
  }
  notification.classList.remove('hidden');
  setTimeout(() => {
    notification.classList.add('hidden');
  }, 3000);
}
// Сделать функции глобальными для onclick
window.toggleItem = toggleItem;
window.deleteItem = deleteItem;
// Запуск
init();
