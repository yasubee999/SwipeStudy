// ComboBurst: big center combo number that flies to top-left combo pill when feedback clears

function ComboBurst({ combo, active }) {
  const ref = React.useRef(null);
  const [state, setState] = React.useState('hidden');
  const [transform, setTransform] = React.useState('');
  const prevActive = React.useRef(false);

  React.useEffect(() => {
    let t;
    if (active && !prevActive.current) {
      setState('center');
      setTransform('');
    } else if (!active && prevActive.current) {
      const el = ref.current;
      const numEl = el?.querySelector('.combo-burst-num');
      const target = document.getElementById('combo-target-num');
      if (el && numEl && target) {
        const er = numEl.getBoundingClientRect();
        const tr = target.getBoundingClientRect();
        const ecx = er.left + er.width/2;
        const ecy = er.top + er.height/2;
        const tcx = tr.left + tr.width/2;
        const tcy = tr.top + tr.height/2;
        const dx = tcx - ecx;
        const dy = tcy - ecy;
        const scale = tr.height / er.height;
        setTransform(`translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(${scale})`);
        setState('flying');
        t = setTimeout(() => setState('hidden'), 360);
      } else {
        setState('hidden');
      }
    }
    prevActive.current = active;
    return () => clearTimeout(t);
  }, [active]);

  if (state === 'hidden') return null;

  const tier = combo >= 10 ? 'mega' : combo >= 5 ? 'hot' : combo >= 3 ? 'warm' : 'start';
  const label = combo >= 10 ? 'UNSTOPPABLE' : combo >= 5 ? 'ON FIRE' : combo >= 3 ? 'NICE!' : 'COMBO';

  return (
    <div
      ref={ref}
      className={`combo-burst combo-burst-${tier} ${state === 'flying' ? 'flying' : ''}`}
      style={state === 'flying' ? { transform, opacity: 0.85 } : undefined}
    >
      <div className="combo-burst-num">{combo}</div>
      {state === 'center' && (
        <div className="combo-burst-label">{label}</div>
      )}
    </div>
  );
}

window.ComboBurst = ComboBurst;
