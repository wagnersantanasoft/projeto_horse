// Sistema de notificações flash reutilizável
export function showFlashNotification(title, message, type = 'info', duration = 4000) {
  // Remove notificações anteriores
  const existingNotifications = document.querySelectorAll('.flash-notification');
  existingNotifications.forEach(notification => {
    notification.remove();
  });

  // Cria a nova notificação
  const notification = document.createElement('div');
  notification.className = `flash-notification ${type}`;

  // Define ícones para cada tipo
  const icons = {
    success: '✅',
    error: '❌', 
    warning: '⚠️',
    info: 'ℹ️'
  };

  notification.innerHTML = `
    <div class="flash-icon">${icons[type] || icons.info}</div>
    <div class="flash-content">
      <div class="flash-title">${title}</div>
      <div class="flash-message">${message}</div>
    </div>
    <button class="flash-close" type="button">×</button>
    <div class="flash-progress"></div>
  `;

  // Adiciona ao DOM
  document.body.appendChild(notification);

  // Mostra a notificação após um pequeno delay
  setTimeout(() => {
    notification.classList.add('show');
  }, 100);

  // Adiciona evento de fechar
  const closeBtn = notification.querySelector('.flash-close');
  closeBtn.addEventListener('click', () => {
    hideFlashNotification(notification);
  });

  // Auto-remove após o tempo especificado
  if (duration > 0) {
    setTimeout(() => {
      hideFlashNotification(notification);
    }, duration);
  }

  return notification;
}

export function hideFlashNotification(notification) {
  notification.classList.add('hide');
  setTimeout(() => {
    if (notification.parentNode) {
      notification.parentNode.removeChild(notification);
    }
  }, 400);
}

// Funções de conveniência
export const flashNotification = {
  success: (title, message, duration) => showFlashNotification(title, message, 'success', duration),
  error: (title, message, duration) => showFlashNotification(title, message, 'error', duration),
  warning: (title, message, duration) => showFlashNotification(title, message, 'warning', duration),
  info: (title, message, duration) => showFlashNotification(title, message, 'info', duration)
};