export function paginate(items, page, perPage) {
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * perPage;
  const end = start + perPage;
  return {
    page: safePage,
    perPage,
    total,
    totalPages,
    slice: items.slice(start, end)
  };
}

export function buildPagination(container, state, onChange) {
  container.innerHTML = '';
  if (state.totalPages <= 1) return;

  function btn(label, page, disabled = false, className = '') {
    const b = document.createElement('button');
    b.textContent = label;
    if (className) b.classList.add(className);
    b.disabled = disabled;
    b.addEventListener('click', () => onChange(page));
    container.appendChild(b);
  }

  btn('«', 1, state.page === 1);
  btn('‹', state.page - 1, state.page === 1);

  // janela adaptativa
  const windowSize = 5;
  let start = Math.max(1, state.page - Math.floor(windowSize / 2));
  let end = start + windowSize - 1;
  if (end > state.totalPages) {
    end = state.totalPages;
    start = Math.max(1, end - windowSize + 1);
  }

  for (let p = start; p <= end; p++) {
    const b = document.createElement('button');
    b.textContent = String(p);
    if (p === state.page) b.classList.add('active');
    b.addEventListener('click', () => onChange(p));
    container.appendChild(b);
  }

  btn('›', state.page + 1, state.page === state.totalPages);
  btn('»', state.totalPages, state.page === state.totalPages);
}