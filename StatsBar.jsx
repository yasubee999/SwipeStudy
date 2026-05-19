// Top stats bar: progress, accuracy, combo, timer
const { useEffect: useEffectS, useState: useStateS } = React;

function StatsBar({ total, current, correct, wrong, combo, bestCombo, timeLeft, timerMax, variant }) {
  const answered = correct + wrong;
  const progress = total > 0 ? answered / total : 0;
  const acc = answered > 0 ? correct / answered : 0;
  const accent = variant?.accent || '#FF5B8A';
  const accent2 = variant?.accent2 || '#3E7BFA';

  return (
    <div className="stats-bar" style={{ '--accent': accent, '--accent2': accent2 }}>
      <div className="stats-top">
        <div className="stats-counter">
          <span className="stats-counter-cur">{Math.min(current + 1, total)}</span>
          <span className="stats-counter-sep">/</span>
          <span className="stats-counter-total">{total}</span>
        </div>
        <div className="stats-pills">
          <div className="pill pill-correct" title="正答">
            <span className="pill-dot"/> {correct}
          </div>
          <div className="pill pill-wrong" title="誤答">
            <span className="pill-dot"/> {wrong}
          </div>
          <div className="pill pill-remain" title="残り">
            残 {Math.max(0, total - answered)}
          </div>
          <div className="pill pill-acc">
            <span>正答率</span>
            <strong>{Math.round(acc * 100)}%</strong>
          </div>
        </div>
      </div>

      <div className="stats-bars">
        <div className="bar bar-progress">
          <div className="bar-label">進捗</div>
          <div className="bar-track">
            <div className="bar-fill bar-fill-progress" style={{ width: `${progress * 100}%` }} />
          </div>
        </div>
        <div className="bar bar-acc">
          <div className="bar-label">正答率</div>
          <div className="bar-track">
            <div className="bar-fill bar-fill-acc" style={{ width: `${acc * 100}%` }} />
          </div>
        </div>
      </div>

      <div className="stats-bottom">
        <div id="combo-target" className={`combo ${combo >= 3 ? 'hot' : ''}`}>
          <span className="combo-flame">{combo >= 5 ? '🔥' : combo >= 3 ? '✨' : '•'}</span>
          <span id="combo-target-num" className="combo-num">{combo}</span>
          <span className="combo-label">COMBO</span>
          {bestCombo > 0 && <span className="combo-best">best {bestCombo}</span>}
        </div>
        {timerMax > 0 && (
          <div className={`timer ${timeLeft <= 3 ? 'danger' : ''}`}>
            <svg viewBox="0 0 36 36" className="timer-ring">
              <circle cx="18" cy="18" r="15" className="timer-track"/>
              <circle cx="18" cy="18" r="15" className="timer-fill"
                style={{ strokeDasharray: `${(timeLeft/timerMax)*94.2} 94.2` }}/>
            </svg>
            <span className="timer-num">{Math.ceil(timeLeft)}</span>
          </div>
        )}
      </div>
    </div>
  );
}

window.StatsBar = StatsBar;
