// Main vocab app — manages state for one variant
const { useState: useStateApp, useEffect: useEffectApp, useMemo: useMemoApp, useRef: useRefApp, useCallback: useCallbackApp } = React;

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildQuestions(data) {
  return data.map((d) => ({
    word: d.word,
    correct: d.correct,
    choices: shuffle(d.choices),
  }));
}

function VocabApp({ variant, config = {} }) {
  const { timer = true, totalQuestions = 12 } = config;
  const [difficulty, setDifficulty] = useStateApp('normal');
  const [questions, setQuestions] = useStateApp(() => buildQuestions(window.VOCAB_DATA).slice(0, totalQuestions));
  const [idx, setIdx] = useStateApp(0);
  const [correct, setCorrect] = useStateApp(0);
  const [wrong, setWrong] = useStateApp(0);
  const [combo, setCombo] = useStateApp(0);
  const [bestCombo, setBestCombo] = useStateApp(0);
  const [feedback, setFeedback] = useStateApp(null);
  const [retry, setRetry] = useStateApp(null);
  const [ended, setEnded] = useStateApp(false);

  const timerMaxByDiff = { easy: 0, normal: 10, hard: 6 };
  const timerMax = timer ? timerMaxByDiff[difficulty] : 0;
  const [timeLeft, setTimeLeft] = useStateApp(timerMax);

  const q = questions[idx];

  useEffectApp(() => {
    setTimeLeft(timerMax);
  }, [idx, timerMax]);

  useEffectApp(() => {
    if (!timerMax || feedback || ended) return;
    if (timeLeft <= 0) {
      handleAnswer(null, null);
      return;
    }
    const t = setTimeout(() => setTimeLeft(tl => Math.max(0, tl - 1)), 1000);
    return () => clearTimeout(t);
  }, [timeLeft, timerMax, feedback, ended]);

  const restart = useCallbackApp(() => {
    setQuestions(buildQuestions(window.VOCAB_DATA).slice(0, totalQuestions));
    setIdx(0); setCorrect(0); setWrong(0); setCombo(0); setBestCombo(0);
    setFeedback(null); setRetry(null); setEnded(false);
    setTimeLeft(timerMaxByDiff[difficulty]);
  }, [difficulty, totalQuestions]);

  const handleAnswer = useCallbackApp((answer, dir) => {
    if (!q || feedback) return;
    const isCorrect = answer === q.correct;
    const rightDir = ['up','right','down','left'][q.choices.indexOf(q.correct)];

    if (isCorrect) {
      setCorrect(c => c + 1);
      const newCombo = combo + 1;
      setCombo(newCombo);
      setBestCombo(b => Math.max(b, newCombo));
      setFeedback({ dir, correct: true, rightDir });
      setTimeout(() => {
        setFeedback(null);
        if (idx + 1 >= questions.length) setEnded(true);
        else setIdx(i => i + 1);
      }, 380);
    } else {
      setWrong(w => w + 1);
      setCombo(0);
      setRetry({ rightDir });
    }
  }, [q, feedback, combo, idx, questions.length]);

  const handleRetrySwipe = useCallbackApp((answer, dir) => {
    if (!retry) return;
    if (dir !== retry.rightDir) return;
    setRetry(null);
    if (idx + 1 >= questions.length) setEnded(true);
    else setIdx(i => i + 1);
  }, [retry, idx, questions.length]);

  if (!q && !ended) return null;

  const total = questions.length;
  const answered = correct + wrong;
  const accPct = answered > 0 ? Math.round((correct / answered) * 100) : 0;

  return (
    <div className={`vocab-app variant-${variant.id}`}>
      <div className="diff-switch">
        {['easy','normal','hard'].map(d => (
          <button
            key={d}
            className={`diff-btn ${difficulty === d ? 'active' : ''}`}
            onClick={() => { setDifficulty(d); }}
          >{d === 'easy' ? 'やさしい' : d === 'normal' ? 'ふつう' : 'むずかしい'}</button>
        ))}
      </div>

      <StatsBar
        total={total}
        current={idx}
        correct={correct}
        wrong={wrong}
        combo={combo}
        bestCombo={bestCombo}
        timeLeft={timeLeft}
        timerMax={timerMax}
        variant={variant}
      />

      {!ended && !retry && (
        <SwipeCard
          question={q}
          onAnswer={handleAnswer}
          variant={variant}
          disabled={!!feedback}
          feedback={feedback}
        />
      )}

      {!ended && retry && (
        <SwipeCard
          question={q}
          onAnswer={handleRetrySwipe}
          variant={variant}
          disabled={false}
          feedback={null}
          retryMode
          rightDir={retry.rightDir}
        />
      )}

      {feedback && !feedback.correct && (
        <div className="reveal-banner">
          正解は <strong>{q.correct}</strong>
        </div>
      )}

      {combo >= 1 && (
        <ComboBurst
          combo={combo}
          active={!!(feedback && feedback.correct)}
        />
      )}

      {ended && (
        <div className="end-screen">
          <h1>Done!</h1>
          <div className="end-stats">
            <div className="end-stat">
              <span className="end-stat-num">{correct}/{total}</span>
              <span className="end-stat-label">Correct</span>
            </div>
            <div className="end-stat">
              <span className="end-stat-num">{accPct}%</span>
              <span className="end-stat-label">Accuracy</span>
            </div>
            <div className="end-stat">
              <span className="end-stat-num">{bestCombo}</span>
              <span className="end-stat-label">Best Combo</span>
            </div>
          </div>
          <button className="end-btn" onClick={restart}>もう一度</button>
        </div>
      )}
    </div>
  );
}

window.VocabApp = VocabApp;
