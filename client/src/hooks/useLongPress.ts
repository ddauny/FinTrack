import { useState, useRef, useCallback } from 'react'

export function useLongPress(
  onLongPress: (e: any) => void,
  onClick: (e: any) => void,
  { shouldPreventDefault = true, delay = 500 } = {}
) {
  const [longPressTriggered, setLongPressTriggered] = useState(false);
  const timeout = useRef<any>();
  const target = useRef<EventTarget>();
  const startCoord = useRef<{x: number, y: number} | null>(null);
  const isScrolling = useRef(false);

  const start = useCallback(
    (event: any) => {
      if (shouldPreventDefault && event.target) {
        event.target.addEventListener('touchend', preventDefault, { passive: false });
        target.current = event.target;
      }
      
      if (event.touches && event.touches.length > 0) {
        startCoord.current = { x: event.touches[0].clientX, y: event.touches[0].clientY };
        isScrolling.current = false;
      }

      timeout.current = setTimeout(() => {
        onLongPress(event);
        setLongPressTriggered(true);
      }, delay);
    },
    [onLongPress, delay, shouldPreventDefault]
  );

  const move = useCallback((event: any) => {
      if (startCoord.current && event.touches && event.touches.length > 0) {
          const x = event.touches[0].clientX;
          const y = event.touches[0].clientY;
          const diffX = Math.abs(x - startCoord.current.x);
          const diffY = Math.abs(y - startCoord.current.y);
          if (diffX > 10 || diffY > 10) {
              isScrolling.current = true;
              timeout.current && clearTimeout(timeout.current);
          }
      }
  }, []);

  const clear = useCallback(
    (event: any, shouldTriggerClick = true) => {
      timeout.current && clearTimeout(timeout.current);
      if (shouldTriggerClick && !longPressTriggered && !isScrolling.current) {
        onClick(event);
      }
      setLongPressTriggered(false);
      isScrolling.current = false;
      if (shouldPreventDefault && target.current) {
        target.current.removeEventListener('touchend', preventDefault);
      }
    },
    [shouldPreventDefault, onClick, longPressTriggered]
  );

  return {
    onMouseDown: (e: any) => start(e),
    onTouchStart: (e: any) => start(e),
    onTouchMove: (e: any) => move(e),
    onMouseUp: (e: any) => clear(e),
    onMouseLeave: (e: any) => clear(e, false),
    onTouchEnd: (e: any) => clear(e)
  };
}

const preventDefault = (e: Event) => {
  if (!isTouchEvent(e)) return;
  if (e.touches.length < 2 && e.preventDefault) {
    e.preventDefault();
  }
};

const isTouchEvent = (e: Event): e is TouchEvent => {
  return e && 'touches' in e;
};
