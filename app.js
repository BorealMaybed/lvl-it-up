document.addEventListener('DOMContentLoaded', () => {
    const path = location.pathname.split('/').pop();

    if (path === 'index.html' || path === '' || path === '/') {
        initAuth();
    } else if (path === 'main.html') {
        initMain();
    } else if (path === 'cabinet.html') {
        initCabinet();
    }
});

function initAuth() {
    const forms = document.querySelectorAll('form');

    forms[0]?.addEventListener('submit', e => {
        e.preventDefault();
        const inputs = forms[0].querySelectorAll('input');
        const email = inputs[0]?.value.trim();
        const password = inputs[1]?.value;

        console.log('🔍 Попытка входа:', { email, password });

        const user = DB.findUser(email, password);
        if (user) {
            DB.setCurrentUser(user.id);
            alert('Вход выполнен! Добро пожаловать, ' + user.name);
            location.href = 'main.html';
        } else {
            alert('Неверный email или пароль.\n\nПопробуй демо-аккаунт:\nalina@demo.ru / demo1234');
        }
    });

    forms[1]?.addEventListener('submit', e => {
        e.preventDefault();
        const inputs = forms[1].querySelectorAll('input');
        const name = inputs[0]?.value.trim();
        const email = inputs[1]?.value.trim();
        const password = inputs[2]?.value;
        const passwordConfirm = inputs[3]?.value;

        if (password !== passwordConfirm) {
            alert('Пароли не совпадают');
            return;
        }
        if (!name || !email || !password) {
            alert('Заполни все поля');
            return;
        }

        try {
            const user = DB.createUser({ name, email, password });
            DB.setCurrentUser(user.id);
            alert('Аккаунт создан! Добро пожаловать, ' + user.name);
            location.href = 'main.html';
        } catch (err) {
            alert(err.message);
        }
    });
}
function initMain() {
    const user = DB.getCurrentUser();
    if (!user) { location.href = 'index.html'; return; }

    const title = document.querySelector('.page-title');
    if (title) title.textContent = `Привет, ${user.name.split(' ')[0]}!`;

    const statValues = document.querySelectorAll('.stat-value');
    const stats = [user.points, user.workoutsCount, user.streak, user.calories];
    statValues.forEach((el, i) => {
        if (stats[i] !== undefined) el.textContent = stats[i].toLocaleString('ru-RU');
    });

    const ratingList = document.querySelector('.rating-list');
    if (ratingList) {
        ratingList.innerHTML = DB.getRating(5).map((u, i) => `
      <li class="rating-item ${i === 0 ? 'rating-item--top' : ''} ${u.id === user.id ? 'rating-item--me' : ''}">
        <span class="rank">${i + 1}</span>
        <span class="avatar">${u.name.split(' ').map(w => w[0]).join('').slice(0, 2)}</span>
        <div class="user-info">
          <div class="user-name">${u.name} ${u.id === user.id ? '<span class="you-tag">(ты)</span>' : ''}</div>
          <div class="user-meta">Серия ${u.streak} дней · ${u.workoutsCount} тренировок</div>
        </div>
        <div class="score">
          <span class="points-value">${u.points}</span>
          <span class="points-label">очков</span>
        </div>
      </li>
    `).join('');
    }
}

function initCabinet() {
    const user = DB.getCurrentUser();
    if (!user) { location.href = 'index.html'; return; }

    const nameEl = document.querySelector('.profile-name');
    if (nameEl) nameEl.textContent = user.name;

    const handleEl = document.querySelector('.profile-handle');
    if (handleEl) handleEl.textContent = user.handle;

    const levelEl = document.querySelector('.profile-level');
    if (levelEl) levelEl.textContent = user.level;

    const nextLevel = user.level + 1;
    const nextLevelEl = document.querySelector('.next-level');
    if (nextLevelEl) nextLevelEl.textContent = nextLevel;

    const pointsForNext = nextLevel * 300;
    const pointsLeft = Math.max(0, pointsForNext - user.points);
    const pointsLeftEl = document.querySelector('.points-left');
    if (pointsLeftEl) pointsLeftEl.textContent = pointsLeft;

    const pointsEl = document.querySelector('.stat-points');
    if (pointsEl) pointsEl.textContent = user.points.toLocaleString('ru-RU');

    const workoutsEl = document.querySelector('.stat-workouts');
    if (workoutsEl) workoutsEl.textContent = user.workoutsCount;

    const streakEl = document.querySelector('.stat-streak');
    if (streakEl) streakEl.textContent = user.streak;

    const rating = DB.getRating(100);
    const myPlace = rating.findIndex(u => u.id === user.id) + 1;
    const ratingEl = document.querySelector('.stat-rating');
    if (ratingEl && myPlace > 0) ratingEl.textContent = myPlace;

    function renderWorkouts() {
        const list = document.querySelector('.workout-list');
        if (!list) return;
        const workouts = DB.getWorkouts(user.id);

        if (!workouts.length) {
            list.innerHTML = '<p class="hint">Пока нет тренировок. Создай первую!</p>';
            return;
        }

        list.innerHTML = workouts.map(w => `
      <article class="workout-card" data-workout-id="${w.id}">
        <div class="workout-card-head">
          <h3 class="workout-title">${w.name}</h3>
          <span class="badge">${w.status === 'draft' ? 'Черновик' : 'Активна'}</span>
        </div>
        <p class="workout-meta">${w.exercises.length} упражнений · ${w.duration} мин · +${w.duration * 4} очков</p>
        <div class="card-actions">
          <button class="cab-btn cab-btn--small" data-complete="${w.id}">Завершить</button>
          <button class="cab-btn cab-btn--small cab-btn--ghost" data-edit-workout="${w.id}">Редактировать</button>
          <button class="cab-btn cab-btn--small cab-btn--ghost" data-delete="${w.id}">Удалить</button>
        </div>
        <div class="edit-workout-form" style="display:none; margin-top:12px;">
          <form class="inline-form">
            <div class="field">
              <label class="field-label">Название</label>
              <input type="text" name="name" value="${w.name}" class="set-input">
            </div>
            <div class="field">
              <label class="field-label">Тип</label>
              <select name="type" class="select">
                <option value="Сила" ${w.type === 'Сила' ? 'selected' : ''}>Сила</option>
                <option value="Кардио" ${w.type === 'Кардио' ? 'selected' : ''}>Кардио</option>
                <option value="Мобильность" ${w.type === 'Мобильность' ? 'selected' : ''}>Мобильность</option>
              </select>
            </div>
            <div class="field">
              <label class="field-label">Длительность, мин</label>
              <input type="number" name="duration" value="${w.duration}" class="set-input">
            </div>
            <div class="field">
              <label class="field-label">Сложность</label>
              <select name="difficulty" class="select">
                <option value="Новичок" ${w.difficulty === 'Новичок' ? 'selected' : ''}>Новичок</option>
                <option value="Средний" ${w.difficulty === 'Средний' ? 'selected' : ''}>Средний</option>
                <option value="Продвинутый" ${w.difficulty === 'Продвинутый' ? 'selected' : ''}>Продвинутый</option>
              </select>
            </div>
            <div class="form-actions">
              <button type="submit" class="cab-btn cab-btn--small">Сохранить</button>
              <button type="button" class="cab-btn cab-btn--small cab-btn--ghost" data-cancel-edit>Отмена</button>
            </div>
          </form>
        </div>
      </article>
    `).join('');

        list.querySelectorAll('[data-complete]').forEach(btn => {
            btn.onclick = () => {
                const w = workouts.find(x => x.id === btn.dataset.complete);
                DB.createSession(user.id, {
                    workoutId: w.id,
                    workoutName: w.name,
                    type: w.type,
                    duration: w.duration,
                    points: w.duration * 4,
                    calories: w.duration * 9
                });
                alert('Тренировка записана! +' + (w.duration * 4) + ' очков');
                renderWorkouts();
            };
        });

        list.querySelectorAll('[data-edit-workout]').forEach(btn => {
            btn.onclick = () => {
                const card = btn.closest('.workout-card');
                const form = card.querySelector('.edit-workout-form');
                form.style.display = form.style.display === 'none' ? 'block' : 'none';
            };
        });

        list.querySelectorAll('[data-cancel-edit]').forEach(btn => {
            btn.onclick = () => {
                const form = btn.closest('.edit-workout-form');
                form.style.display = 'none';
            };
        });

        list.querySelectorAll('.edit-workout-form form').forEach(form => {
            form.onsubmit = (e) => {
                e.preventDefault();
                const fd = new FormData(form);
                const workoutId = form.closest('.workout-card').dataset.workoutId;

                DB.updateWorkout(workoutId, {
                    name: fd.get('name'),
                    type: fd.get('type'),
                    duration: +fd.get('duration'),
                    difficulty: fd.get('difficulty')
                });

                alert('Тренировка обновлена!');
                renderWorkouts();
            };
        });

        list.querySelectorAll('[data-delete]').forEach(btn => {
            btn.onclick = () => {
                if (confirm('Удалить тренировку?')) {
                    DB.deleteWorkout(btn.dataset.delete);
                    renderWorkouts();
                }
            };
        });
    }
    renderWorkouts();

    const createForm = document.querySelector('.create-form');
    createForm?.addEventListener('submit', (e) => {
        e.preventDefault();
        const fd = new FormData(createForm);
        DB.createWorkout(user.id, {
            name: fd.get('name'),
            type: fd.get('type'),
            duration: fd.get('duration'),
            difficulty: fd.get('difficulty'),
            description: fd.get('description')
        });
        createForm.reset();
        renderWorkouts();
    });

    function renderHistory() {
        const historyList = document.querySelector('.history-list');
        if (!historyList) return;

        const sessions = DB.getSessions(user.id);

        if (!sessions.length) {
            historyList.innerHTML = '<p class="hint">Пока нет записей о тренировках.</p>';
            return;
        }

        historyList.innerHTML = sessions.map(s => `
      <li class="history-item">
        <div class="history-date">${new Date(s.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}</div>
        <div class="session-card" data-session-id="${s.id}">
          <div class="session-head">
            <h3 class="session-title">${s.workoutName}</h3>
            <span class="badge ${s.isDraft ? 'badge--muted' : ''}">${s.isDraft ? 'Черновик' : 'Завершено'}</span>
          </div>
          <p class="session-meta">${s.type} · ${s.duration} мин · техника ${s.technique}/10 · ${s.feeling}</p>
          <div class="session-metrics">
            <span class="metric-pill"><strong>+${s.points}</strong> очков</span>
            <span class="metric-pill"><strong>${s.calories}</strong> ккал</span>
          </div>
          <div class="card-actions" style="margin-top:10px;">
            <button class="cab-btn cab-btn--small cab-btn--ghost" data-edit-session="${s.id}">Редактировать</button>
            <button class="cab-btn cab-btn--small cab-btn--ghost" data-delete-session="${s.id}">Удалить</button>
          </div>
          <div class="edit-session-form" style="display:none; margin-top:12px;">
            <form class="inline-form">
              <div class="field">
                <label class="field-label">Название тренировки</label>
                <input type="text" name="workoutName" value="${s.workoutName}" class="set-input">
              </div>
              <div class="field">
                <label class="field-label">Тип нагрузки</label>
                <select name="type" class="select">
                  <option value="Силовая" ${s.type === 'Силовая' ? 'selected' : ''}>Силовая</option>
                  <option value="Кардио" ${s.type === 'Кардио' ? 'selected' : ''}>Кардио</option>
                  <option value="Смешанная" ${s.type === 'Смешанная' ? 'selected' : ''}>Смешанная</option>
                  <option value="Восстановительная" ${s.type === 'Восстановительная' ? 'selected' : ''}>Восстановительная</option>
                </select>
              </div>
              <div class="field">
                <label class="field-label">Длительность, мин</label>
                <input type="number" name="duration" value="${s.duration}" class="set-input">
              </div>
              <div class="field">
                <label class="field-label">Очки роста</label>
                <input type="number" name="points" value="${s.points}" class="set-input">
              </div>
              <div class="field">
                <label class="field-label">Калории</label>
                <input type="number" name="calories" value="${s.calories}" class="set-input">
              </div>
              <div class="field">
                <label class="field-label">Самочувствие</label>
                <select name="feeling" class="select">
                  <option value="Отлично" ${s.feeling === 'Отлично' ? 'selected' : ''}>Отлично</option>
                  <option value="Хорошо" ${s.feeling === 'Хорошо' ? 'selected' : ''}>Хорошо</option>
                  <option value="Нормально" ${s.feeling === 'Нормально' ? 'selected' : ''}>Нормально</option>
                  <option value="Устал" ${s.feeling === 'Устал' ? 'selected' : ''}>Устал</option>
                  <option value="Перегруз" ${s.feeling === 'Перегруз' ? 'selected' : ''}>Перегруз</option>
                </select>
              </div>
              <div class="field">
                <label class="field-label">Техника, 1-10</label>
                <input type="number" name="technique" min="1" max="10" value="${s.technique}" class="set-input">
              </div>
              <div class="form-actions">
                <button type="submit" class="cab-btn cab-btn--small">Сохранить</button>
                <button type="button" class="cab-btn cab-btn--small cab-btn--ghost" data-cancel-edit>Отмена</button>
              </div>
            </form>
          </div>
        </div>
      </li>
    `).join('');

        historyList.querySelectorAll('[data-edit-session]').forEach(btn => {
            btn.onclick = () => {
                const card = btn.closest('.session-card');
                const form = card.querySelector('.edit-session-form');
                form.style.display = form.style.display === 'none' ? 'block' : 'none';
            };
        });

        historyList.querySelectorAll('[data-cancel-edit]').forEach(btn => {
            btn.onclick = () => {
                const form = btn.closest('.edit-session-form');
                form.style.display = 'none';
            };
        });

        historyList.querySelectorAll('.edit-session-form form').forEach(form => {
            form.onsubmit = (e) => {
                e.preventDefault();
                const fd = new FormData(form);
                const sessionId = form.closest('.session-card').dataset.sessionId;

                DB.updateSession(sessionId, {
                    workoutName: fd.get('workoutName'),
                    type: fd.get('type'),
                    duration: +fd.get('duration'),
                    points: +fd.get('points'),
                    calories: +fd.get('calories'),
                    feeling: fd.get('feeling'),
                    technique: +fd.get('technique')
                });

                alert('Результат обновлён!');
                renderHistory();
            };
        });
        historyList.querySelectorAll('[data-delete-session]').forEach(btn => {
            btn.onclick = () => {
                if (confirm('Удалить эту запись о тренировке?')) {
                    DB.deleteSession(btn.dataset.deleteSession);
                    renderHistory();
                }
            };
        });
    }
    renderHistory();
}