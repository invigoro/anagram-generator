import { useId } from 'react';

interface ControlsProps {
  text: string;
  onText: (text: string) => void;
  seed: number;
  onReroll: () => void;
}

export function Controls({ text, onText, seed, onReroll }: ControlsProps) {
  const id = useId();
  return (
    <div className="controls">
      <div className="field">
        <label className="label" htmlFor={`${id}-text`}>
          Word or phrase
        </label>
        {/* A password shouldn't be corrected, or sent off to be spell-checked. */}
        <input
          id={`${id}-text`}
          type="text"
          value={text}
          placeholder="Open sesame"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          aria-describedby={`${id}-text-hint`}
          onChange={(event) => onText(event.target.value)}
        />
        <small className="hint" id={`${id}-text-hint`}>
          Its letters and digits are scrambled, in capitals. Spaces and punctuation are left out.
        </small>
      </div>

      <div className="reroll-row">
        <button type="button" className="reroll" onClick={onReroll}>
          <span aria-hidden="true">🎲</span> Reroll
        </button>
        <span className="seed" title="The same seed and text always give the same arrangements">
          Seed {seed}
        </span>
      </div>
    </div>
  );
}
