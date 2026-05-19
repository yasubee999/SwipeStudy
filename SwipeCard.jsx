// Swipeable card + 4-direction choices
const { useState, useEffect, useRef, useCallback } = React;

function SwipeCard({ question, onAnswer, variant, disabled, feedback, retryMode, rightDir }) {
  const [drag, setDrag] = useState({ x: 0, y: 0, active: false });
  const [flying, setFlying] = useState(null);
  const [flyVec, setFlyVec] = useState({ x: 0, y: 0 });
  const startRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    setDrag({ x: 0, y: 0, active: false });
    setFlying(null);
    setFlyVec({ x: 0, y: 0 });
  }, [question?.word]);

  const THRESHOLD = 90;

  const commitDirection = useCallback((dir, vec) => {
    if (flying || disabled) return;
    setFlying(dir);
    setFlyVec(vec);
    const idx = { up: 0, right: 1, down: 2, left: 3 }[dir];
    const answer = question.choices[idx];
    setTimeout(() => {
      onAnswer(answer, dir);
      if (retryMode && dir !== rightDir) {
        setFlying(null);
        setFlyVec({ x: 0, y: 0 });
        setDrag({ x: 0, y: 0, active: false });
      }
    }, 280);
  }, [flying, disabled, question, onAnswer, retryMode, rightDir]);

  const onPointerDown = (e) => {
    if (disabled || flying) return;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    startRef.current = { x: e.clientX, y: e.clientY };
    setDrag({ x: 0, y: 0, active: true });
  };
  const onPointerMove = (e) => {
    if (!drag.active) return;
    const dx = e.clientX - startRef.current.x;
    const dy = e.clientY - startRef.current.y;
    setDrag({ x: dx, y: dy, active: true });
  };
  const onPointerUp = () => {
    if (!drag.active) return;
    const { x, y } = drag;
    const ax = Math.abs(x), ay = Math.abs(y);
    if (Math.max(ax, ay) > THRESHOLD) {
      let dir;
      if (ax > ay) dir = x > 0 ? 'right' : 'left';
      else dir = y > 0 ? 'down' : 'up';
      const mag = 900;
      const scale = mag / Math.max(ax, ay, 1);
      commitDirection(dir, { x: x * scale, y: y * scale });
    } else {
      setDrag({ x: 0, y: 0, active: false });
    }
  };

  useEffect(() => {
    if (disabled) return;
    const onKey = (e) => {
      const map = { ArrowUp: 'up', ArrowRight: 'right', ArrowDown: 'down', ArrowLeft: 'left' };
      const dir = map[e.key];
      if (!dir) return;
      e.preventDefault();
      const vec = { up:{x:0,y:-900}, right:{x:900,y:0}, down:{x:0,y:900}, left:{x:-900,y:0} }[dir];
      commitDirection(dir, vec);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [commitDirection, disabled]);

  const rot = flying ? (flyVec.x * 0.02) : (drag.x * 0.08);
  const tx = flying ? flyVec.x * 0.18 : drag.x;
  const ty = flying ? flyVec.y * 0.18 : drag.y;
  const scale = flying ? 0 : 1;
  const transition = flying
    ? 'transform 260ms cubic-bezier(.5,.0,.85,.15)'
    : drag.active ? 'none' : 'transform 280ms cubic-bezier(.2,.9,.3,1.3)';
  const opacity = 1;

  const aim = (() => {
    if (flying) return flying;
    if (!drag.active) return null;
    const { x, y } = drag;
    const ax = Math.abs(x), ay = Math.abs(y);
    if (Math.max(ax, ay) < 30) return null;
    if (ax > ay) return x > 0 ? 'right' : 'left';
    return y > 0 ? 'down' : 'up';
  })();

  const accent = variant?.accent || '#FF5B8A';
  const cardBg = variant?.cardBg || '#fff';
  const cardFg = variant?.cardFg || '#111';
  const wordFont = variant?.wordFont || "'Fraunces', 'Georgia', serif";

  return (
    <div className="swipe-stage">
      {['up','right','down','left'].map((dir, i) => {
        const label = question.choices[i];
        const isAim = aim === dir;
        const isCorrect = feedback && feedback.dir === dir && feedback.correct;
        const isWrong = feedback && feedback.dir === dir && !feedback.correct;
        const isRight = feedback && feedback.rightDir === dir && !feedback.correct;
        return (
          <button
            key={dir}
            className={`choice choice-${dir} ${isAim ? 'aim' : ''} ${isCorrect?'correct':''} ${isWrong?'wrong':''} ${isRight?'reveal':''}`}
            onClick={() => !disabled && !flying && commitDirection(dir, { up:{x:0,y:-900}, right:{x:900,y:0}, down:{x:0,y:900}, left:{x:-900,y:0} }[dir])}
            style={{ '--accent': accent }}
            disabled={disabled}
          >
            <span className="choice-arrow" aria-hidden>
              {dir === 'up' ? '↑' : dir === 'right' ? '→' : dir === 'down' ? '↓' : '←'}
            </span>
            <span className="choice-label">{label}</span>
          </button>
        );
      })}

      <div
        className={`word-card word-card-${variant?.id || 'bubble'} ${retryMode ? 'retry-card' : ''}`}
        style={{
          transform: `translate(${tx}px, ${ty}px) scale(${scale}) rotate(${rot}deg)`,
          transition,
          opacity,
          background: retryMode ? undefined : cardBg,
          color: retryMode ? undefined : cardFg,
          fontFamily: wordFont,
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        {variant?.id === 'neo' && !retryMode && <div className="card-dots" aria-hidden>
          {Array.from({length: 12}).map((_,i)=>(<span key={i}/>))}
        </div>}
        <div className="card-word">{question.word}</div>
        {retryMode && (
          <div className="card-translation">{question.correct}</div>
        )}
        {variant?.id !== 'neo' && !retryMode && (
          <div className="card-hint">スワイプで回答</div>
        )}
      </div>
    </div>
  );
}

window.SwipeCard = SwipeCard;
