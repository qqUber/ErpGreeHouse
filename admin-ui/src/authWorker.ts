type MsgIn =
  | { type: 'start'; steps: Array<{ label: string }> }
  | { type: 'setStep'; step: number; label: string }
  | { type: 'completeStep'; step: number }
  | { type: 'stop' };

type MsgOut = { type: 'progress'; step: number; percent: number; label: string } | { type: 'done' };

let timer: any = null;
let step = 0;
let percent = 0;
let label = '';

function emit() {
  (self as any).postMessage({ type: 'progress', step, percent, label } satisfies MsgOut);
}

function startTimer() {
  stopTimer();
  timer = setInterval(() => {
    const target = Math.min(95, 5 + step * 30);
    if (percent < target) {
      percent = Math.min(target, percent + 1);
      emit();
    }
  }, 40);
}

function stopTimer() {
  if (timer) clearInterval(timer);
  timer = null;
}

(self as any).onmessage = (e: MessageEvent<MsgIn>) => {
  const m = e.data;
  if (m.type === 'start') {
    step = 0;
    percent = 0;
    label = m.steps[0]?.label || '';
    emit();
    startTimer();
    return;
  }
  if (m.type === 'setStep') {
    step = m.step;
    label = m.label;
    percent = Math.max(percent, step * 33);
    emit();
    startTimer();
    return;
  }
  if (m.type === 'completeStep') {
    percent = Math.max(percent, (m.step + 1) * 33);
    emit();
    return;
  }
  if (m.type === 'stop') {
    stopTimer();
    (self as any).postMessage({ type: 'done' } satisfies MsgOut);
  }
};
