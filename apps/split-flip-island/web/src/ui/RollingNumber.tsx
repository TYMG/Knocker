import { useEffect, useState } from 'react';
import NumberFlow from '@number-flow/react';
import { useCalm } from '../hooks';

/**
 * A number whose digits roll to their new value, like a score reel. Commas are added for you.
 *
 * It rolls whenever `value` changes while it is on screen. With `rollIn` it also rolls up from
 * zero when it first appears: keep that for the one or two big numbers on a page, not for lists.
 * In calm mode it simply shows the number.
 *
 * The digits are drawn inside the component, so a test or a screen reader cannot read them as
 * plain text. Give the surrounding element an aria-label with the number (ScoreDisplay does).
 */
export default function RollingNumber({ value, rollIn = false }: { value: number; rollIn?: boolean }) {
  const calm = useCalm();
  const [shown, setShown] = useState(rollIn && !calm ? 0 : value);
  useEffect(() => {
    setShown(value);
  }, [value]);
  return <NumberFlow value={shown} locales="en-US" animated={!calm} willChange={false} />;
}
