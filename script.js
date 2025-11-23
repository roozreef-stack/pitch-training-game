// ==================== 音声生成 (Web Audio API) ====================
class AudioGenerator {
    constructor() {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }

    // 周波数を計算（A4 = 440Hz を基準）
    getFrequency(note) {
        // A4 = 440Hz (MIDI note 69)
        // C4 = MIDI note 60
        const A4 = 440;
        const C4 = 261.63; // C4の周波数
        return C4 * Math.pow(2, note / 12);
    }

    // 音を鳴らす
    playNote(note, duration = 1.5) {
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);

        oscillator.frequency.value = this.getFrequency(note);
        oscillator.type = 'sine'; // ピアノに近い音色

        // エンベロープ（音の立ち上がりと減衰）
        const now = this.audioContext.currentTime;
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(0.3, now + 0.01); // アタック
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + duration); // リリース

        oscillator.start(now);
        oscillator.stop(now + duration);
    }

    // 複数の音を順番に鳴らす
    async playSequence(notes, interval = 1000) {
        for (const note of notes) {
            this.playNote(note);
            await this.delay(interval);
        }
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// ==================== スケール定義 ====================
class ScaleManager {
    constructor() {
        // 12種類のメジャースケール（半音階での位置）
        this.majorScales = [
            { name: 'C Major', root: 0, notes: [0, 2, 4, 5, 7, 9, 11, 12] },
            { name: 'C# Major', root: 1, notes: [1, 3, 5, 6, 8, 10, 12, 13] },
            { name: 'D Major', root: 2, notes: [2, 4, 6, 7, 9, 11, 13, 14] },
            { name: 'Eb Major', root: 3, notes: [3, 5, 7, 8, 10, 12, 14, 15] },
            { name: 'E Major', root: 4, notes: [4, 6, 8, 9, 11, 13, 15, 16] },
            { name: 'F Major', root: 5, notes: [5, 7, 9, 10, 12, 14, 16, 17] },
            { name: 'F# Major', root: 6, notes: [6, 8, 10, 11, 13, 15, 17, 18] },
            { name: 'G Major', root: 7, notes: [7, 9, 11, 12, 14, 16, 18, 19] },
            { name: 'Ab Major', root: 8, notes: [8, 10, 12, 13, 15, 17, 19, 20] },
            { name: 'A Major', root: 9, notes: [9, 11, 13, 14, 16, 18, 20, 21] },
            { name: 'Bb Major', root: 10, notes: [10, 12, 14, 15, 17, 19, 21, 22] },
            { name: 'B Major', root: 11, notes: [11, 13, 15, 16, 18, 20, 22, 23] }
        ];

        // 12種類のナチュラルマイナースケール
        this.minorScales = [
            { name: 'A Minor', root: 9, notes: [9, 11, 12, 14, 16, 17, 19, 21] },
            { name: 'Bb Minor', root: 10, notes: [10, 12, 13, 15, 17, 18, 20, 22] },
            { name: 'B Minor', root: 11, notes: [11, 13, 14, 16, 18, 19, 21, 23] },
            { name: 'C Minor', root: 0, notes: [0, 2, 3, 5, 7, 8, 10, 12] },
            { name: 'C# Minor', root: 1, notes: [1, 3, 4, 6, 8, 9, 11, 13] },
            { name: 'D Minor', root: 2, notes: [2, 4, 5, 7, 9, 10, 12, 14] },
            { name: 'Eb Minor', root: 3, notes: [3, 5, 6, 8, 10, 11, 13, 15] },
            { name: 'E Minor', root: 4, notes: [4, 6, 7, 9, 11, 12, 14, 16] },
            { name: 'F Minor', root: 5, notes: [5, 7, 8, 10, 12, 13, 15, 17] },
            { name: 'F# Minor', root: 6, notes: [6, 8, 9, 11, 13, 14, 16, 18] },
            { name: 'G Minor', root: 7, notes: [7, 9, 10, 12, 14, 15, 17, 19] },
            { name: 'G# Minor', root: 8, notes: [8, 10, 11, 13, 15, 16, 18, 20] }
        ];

        this.allScales = [...this.majorScales, ...this.minorScales];
    }

    getRandomScale() {
        const randomIndex = Math.floor(Math.random() * this.allScales.length);
        return this.allScales[randomIndex];
    }

    getNoteName(note) {
        const noteNames = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
        return noteNames[note % 12];
    }
}

// ==================== ゲーム管理 ====================
class PitchTrainingGame {
    constructor() {
        this.audioGen = new AudioGenerator();
        this.scaleManager = new ScaleManager();

        // ゲーム状態
        this.currentScale = null;
        this.currentRootNote = null;
        this.currentQuestionNote = null;
        this.currentQuestionIndex = null;
        this.isPlaying = false;

        // スコア
        this.totalQuestions = 0;
        this.correctAnswers = 0;
        this.currentStreak = 0;

        this.initElements();
        this.attachEventListeners();
    }

    initElements() {
        // UI要素の取得
        this.scaleNameEl = document.getElementById('scaleName');
        this.startBtn = document.getElementById('startBtn');
        this.replayBtn = document.getElementById('replayBtn');
        this.nextBtn = document.getElementById('nextBtn');
        this.feedbackEl = document.getElementById('feedback');
        this.keyboardEl = document.getElementById('keyboard');
        this.correctCountEl = document.getElementById('correctCount');
        this.totalCountEl = document.getElementById('totalCount');
        this.accuracyEl = document.getElementById('accuracy');
        this.streakEl = document.getElementById('streak');

        this.keys = Array.from(this.keyboardEl.querySelectorAll('.key'));
    }

    attachEventListeners() {
        this.startBtn.addEventListener('click', () => this.startNewQuestion());
        this.replayBtn.addEventListener('click', () => this.replayQuestion());
        this.nextBtn.addEventListener('click', () => this.startNewQuestion());

        this.keys.forEach((key, index) => {
            key.addEventListener('click', () => {
                if (!this.isPlaying && this.currentQuestionNote !== null) {
                    this.handleAnswer(index);
                }
            });
        });
    }

    async startNewQuestion() {
        if (this.isPlaying) return;

        this.isPlaying = true;
        this.disableAllControls();
        this.clearFeedback();
        this.clearKeyboardHighlights();

        // ランダムなスケールを選択
        this.currentScale = this.scaleManager.getRandomScale();
        this.currentRootNote = this.currentScale.root;
        this.scaleNameEl.textContent = this.currentScale.name;

        // スケール内のランダムな音を選択（1〜8度）
        this.currentQuestionIndex = Math.floor(Math.random() * 8);
        this.currentQuestionNote = this.currentScale.notes[this.currentQuestionIndex];

        // 音を再生（基音 → 問題音）
        await this.playQuestionSequence();

        this.isPlaying = false;
        this.enableKeyboard();
        this.replayBtn.disabled = false;
    }

    async playQuestionSequence() {
        // 基音を鳴らす
        this.audioGen.playNote(this.currentRootNote);
        await this.audioGen.delay(1000);

        // 問題音を鳴らす
        this.audioGen.playNote(this.currentQuestionNote);
    }

    async replayQuestion() {
        if (this.isPlaying || this.currentQuestionNote === null) return;

        this.isPlaying = true;
        this.disableAllControls();

        await this.playQuestionSequence();

        this.isPlaying = false;
        this.enableKeyboard();
        this.replayBtn.disabled = false;
    }

    handleAnswer(selectedIndex) {
        const selectedNote = this.currentScale.notes[selectedIndex];
        const isCorrect = selectedIndex === this.currentQuestionIndex;

        this.totalQuestions++;

        // 選択した鍵盤をハイライト
        this.keys[selectedIndex].classList.add('pressed');

        if (isCorrect) {
            this.correctAnswers++;
            this.currentStreak++;
            this.showFeedback(true, selectedNote);

            // 正解音を鳴らす
            this.audioGen.playNote(selectedNote, 1.0);
        } else {
            this.currentStreak = 0;
            this.showFeedback(false, selectedNote, this.currentQuestionNote);

            // 正解の鍵盤もハイライト
            this.keys[this.currentQuestionIndex].classList.add('pressed');
        }

        this.updateScore();
        this.disableKeyboard();
        this.nextBtn.disabled = false;
        this.replayBtn.disabled = true;
    }

    showFeedback(isCorrect, selectedNote, correctNote = null) {
        const selectedNoteName = this.scaleManager.getNoteName(selectedNote);

        if (isCorrect) {
            this.feedbackEl.textContent = `✓ 正解！${selectedNoteName}の音でした`;
            this.feedbackEl.className = 'feedback correct';
        } else {
            const correctNoteName = this.scaleManager.getNoteName(correctNote);
            this.feedbackEl.textContent = `✗ 不正解。正解は${correctNoteName}でした（選択: ${selectedNoteName}）`;
            this.feedbackEl.className = 'feedback incorrect';
        }
    }

    clearFeedback() {
        this.feedbackEl.textContent = '';
        this.feedbackEl.className = 'feedback';
    }

    clearKeyboardHighlights() {
        this.keys.forEach(key => key.classList.remove('pressed'));
    }

    updateScore() {
        this.correctCountEl.textContent = this.correctAnswers;
        this.totalCountEl.textContent = this.totalQuestions;

        const accuracy = this.totalQuestions > 0
            ? Math.round((this.correctAnswers / this.totalQuestions) * 100)
            : 0;
        this.accuracyEl.textContent = `${accuracy}%`;

        this.streakEl.textContent = this.currentStreak;
    }

    disableAllControls() {
        this.startBtn.disabled = true;
        this.replayBtn.disabled = true;
        this.nextBtn.disabled = true;
        this.disableKeyboard();
    }

    enableKeyboard() {
        this.keys.forEach(key => key.disabled = false);
    }

    disableKeyboard() {
        this.keys.forEach(key => key.disabled = true);
    }
}

// ==================== アプリ起動 ====================
document.addEventListener('DOMContentLoaded', () => {
    const game = new PitchTrainingGame();
});
