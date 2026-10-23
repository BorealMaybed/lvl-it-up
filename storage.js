const KEYS = {
    USERS: 'lvl_users',
    CURRENT_USER: 'lvl_current',
    WORKOUTS: 'lvl_workouts',
    SESSIONS: 'lvl_sessions'
};
const DB = {
    get(key, fallback = []) {
        try {
            const raw = localStorage.getItem(key);
            return raw ? JSON.parse(raw) : fallback;
        } catch (e) {
            console.error('DB.get error:', e);
            return fallback;
        }
    },
    set(key, value) {
        localStorage.setItem(key, JSON.stringify(value));
    },
    uid() {
        return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
    },

    getUsers() { return this.get(KEYS.USERS, []); },

    createUser({ name, email, password, goal = 'Тонус', about = '' }) {
        const users = this.getUsers();
        if (users.some(u => u.email === email)) {
            throw new Error('Пользователь с таким email уже существует');
        }
        const user = {
            id: this.uid(),
            name, email, password,
            handle: '@' + email.split('@')[0],
            level: 1,
            points: 0,
            workoutsCount: 0,
            streak: 0,
            bestStreak: 0,
            calories: 0,
            goal,
            about,
            city: '',
            createdAt: new Date().toISOString(),
            lastWorkoutDate: null
        };
        users.push(user);
        this.set(KEYS.USERS, users);
        return user;
    },

    findUser(email, password) {
        return this.getUsers().find(u => u.email === email && u.password === password);
    },

    updateUser(id, patch) {
        const users = this.getUsers();
        const idx = users.findIndex(u => u.id === id);
        if (idx === -1) return null;
        users[idx] = { ...users[idx], ...patch };
        this.set(KEYS.USERS, users);
        return users[idx];
    },

    deleteUser(id) {
        this.set(KEYS.USERS, this.getUsers().filter(u => u.id !== id));
    },

    setCurrentUser(id) {
        localStorage.setItem(KEYS.CURRENT_USER, id);
    },
    getCurrentUser() {
        const id = localStorage.getItem(KEYS.CURRENT_USER);
        if (!id) return null;
        return this.getUsers().find(u => u.id === id) || null;
    },
    logout() {
        localStorage.removeItem(KEYS.CURRENT_USER);
    },

    getWorkouts(userId) {
        return this.get(KEYS.WORKOUTS, []).filter(w => w.userId === userId);
    },
    createWorkout(userId, data) {
        const list = this.get(KEYS.WORKOUTS, []);
        const w = {
            id: this.uid(),
            userId,
            name: data.name || 'Новая тренировка',
            type: data.type || 'Сила',
            duration: +data.duration || 30,
            difficulty: data.difficulty || 'Средний',
            tags: data.tags || [],
            description: data.description || '',
            exercises: data.exercises || [],
            status: 'active', // active | draft | completed
            createdAt: new Date().toISOString()
        };
        list.push(w);
        this.set(KEYS.WORKOUTS, list);
        return w;
    },
    updateWorkout(id, patch) {
        const list = this.get(KEYS.WORKOUTS, []);
        const idx = list.findIndex(w => w.id === id);
        if (idx === -1) return null;
        list[idx] = { ...list[idx], ...patch };
        this.set(KEYS.WORKOUTS, list);
        return list[idx];
    },
    deleteWorkout(id) {
        this.set(KEYS.WORKOUTS, this.get(KEYS.WORKOUTS, []).filter(w => w.id !== id));
    },

    getSessions(userId) {
        return this.get(KEYS.SESSIONS, [])
            .filter(s => s.userId === userId)
            .sort((a, b) => new Date(b.date) - new Date(a.date));
    },
    createSession(userId, data) {
        const list = this.get(KEYS.SESSIONS, []);
        const s = {
            id: this.uid(),
            userId,
            workoutId: data.workoutId || null,
            workoutName: data.workoutName || 'Свободная запись',
            date: data.date || new Date().toISOString(),
            type: data.type || 'Силовая',
            duration: +data.duration || 0,
            sets: data.sets || [],
            points: +data.points || 0,
            calories: +data.calories || 0,
            avgPulse: +data.avgPulse || 0,
            feeling: data.feeling || 'Хорошо',
            technique: +data.technique || 5,
            notes: data.notes || '',
            isDraft: !!data.isDraft
        };
        list.push(s);
        this.set(KEYS.SESSIONS, list);

        if (!s.isDraft) {
            const user = this.getCurrentUser();
            if (user && user.id === userId) {
                const today = new Date().toDateString();
                const last = user.lastWorkoutDate ? new Date(user.lastWorkoutDate).toDateString() : null;
                const yesterday = new Date(Date.now() - 86400000).toDateString();

                let newStreak = user.streak;
                if (last === yesterday || last === today) {
                    if (last !== today) newStreak += 1;
                } else {
                    newStreak = 1;
                }

                this.updateUser(userId, {
                    points: user.points + s.points,
                    workoutsCount: user.workoutsCount + 1,
                    calories: user.calories + s.calories,
                    streak: newStreak,
                    bestStreak: Math.max(user.bestStreak, newStreak),
                    lastWorkoutDate: new Date().toISOString(),
                    level: Math.floor((user.points + s.points) / 300) + 1
                });
            }
        }
        return s;
    },

    updateSession(id, patch) {
        const list = this.get(KEYS.SESSIONS, []);
        const idx = list.findIndex(s => s.id === id);
        if (idx === -1) return null;


        const oldSession = list[idx];
        const newSession = { ...oldSession, ...patch };

        list[idx] = newSession;
        this.set(KEYS.SESSIONS, list);

        const user = this.getCurrentUser();
        if (user && user.id === newSession.userId && !newSession.isDraft) {
            const pointsDiff = (newSession.points || 0) - (oldSession.points || 0);
            const caloriesDiff = (newSession.calories || 0) - (oldSession.calories || 0);

            this.updateUser(user.id, {
                points: Math.max(0, user.points + pointsDiff),
                calories: Math.max(0, user.calories + caloriesDiff),
                level: Math.floor((user.points + pointsDiff) / 300) + 1
            });
        }

        return newSession;
    },

    deleteSession(id) {
        const list = this.get(KEYS.SESSIONS, []);
        const session = list.find(s => s.id === id);


        if (session && !session.isDraft) {
            const user = this.getCurrentUser();
            if (user && user.id === session.userId) {
                this.updateUser(user.id, {
                    points: Math.max(0, user.points - session.points),
                    calories: Math.max(0, user.calories - session.calories),
                    workoutsCount: Math.max(0, user.workoutsCount - 1)
                });
            }
        }

        this.set(KEYS.SESSIONS, list.filter(s => s.id !== id));
    },

    getRating(limit = 10) {
        return this.getUsers()
            .slice()
            .sort((a, b) => b.points - a.points)
            .slice(0, limit);
    },

    seedIfEmpty() {
        if (this.getUsers().length > 0) return;
        const demo = [
            { name: 'Марина К.', email: 'marina@demo.ru', password: 'demo1234', points: 3420, workoutsCount: 14, streak: 21, bestStreak: 25, calories: 42000 },
            { name: 'Дмитрий Л.', email: 'dima@demo.ru', password: 'demo1234', points: 2980, workoutsCount: 12, streak: 16, bestStreak: 18, calories: 38000 },
            { name: 'София В.', email: 'sofia@demo.ru', password: 'demo1234', points: 2610, workoutsCount: 10, streak: 9, bestStreak: 12, calories: 31000 },
            { name: 'Артём Р.', email: 'artem@demo.ru', password: 'demo1234', points: 1890, workoutsCount: 8, streak: 5, bestStreak: 7, calories: 22000 },
            { name: 'Алина Ростова', email: 'alina@demo.ru', password: 'demo1234', points: 1280, workoutsCount: 36, streak: 7, bestStreak: 12, calories: 18420 }
        ];
        const users = demo.map(d => ({
            id: this.uid(),
            ...d,
            handle: '@' + d.email.split('@')[0],
            level: Math.floor(d.points / 300) + 1,
            goal: 'Тонус',
            about: '',
            city: '',
            createdAt: new Date().toISOString(),
            lastWorkoutDate: new Date().toISOString()
        }));
        this.set(KEYS.USERS, users);
    }
};

DB.seedIfEmpty();