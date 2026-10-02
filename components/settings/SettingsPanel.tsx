'use client';

import { useSettings } from './SettingsProvider';

/**
 * The pages are the World English Bible.
 * NKJV is named only as a future preference — its text is not included.
 */
export function SettingsPanel() {
  const { settings, update } = useSettings();

  return (
    <div className="settings-page">
      <h1>Settings</h1>
      <p className="settings-note">
        You are reading the World English Bible. Study notes sit beside the passage. They do not
        replace it.
      </p>

      <label htmlFor="version">Translation</label>
      <select id="version" value="web" name="version" onChange={() => undefined}>
        <option value="web">World English Bible — the text on the pages</option>
        <option value="nkjv" disabled>
          New King James Version — not in this copy
        </option>
      </select>
      <p className="settings-note">
        These pages are the World English Bible, a public-domain translation from eBible.org. A
        New King James Version edition needs a license, so it is not here yet. “World English
        Bible” is a trademark of eBible.org.
      </p>

      <label className="check-row">
        <input
          type="checkbox"
          checked={settings.scriptureFirst}
          name="scriptureFirst"
          onChange={(event) => update({ scriptureFirst: event.target.checked })}
        />
        Show the passage above the notes
      </label>

      <label className="check-row">
        <input
          type="checkbox"
          checked={settings.largeTargets}
          name="largeTaps"
          onChange={(event) => update({ largeTargets: event.target.checked })}
        />
        Larger buttons
      </label>

      <label className="check-row">
        <input
          type="checkbox"
          checked={settings.reducedMotion}
          name="reducedMotion"
          onChange={(event) => update({ reducedMotion: event.target.checked })}
        />
        Turn pages instantly
      </label>

      <p className="settings-note">
        On the reading page, choose By the fire, Morning, Rain, or Night. Sound plays after your
        first click. Your place is saved in this browser. The right arrow turns forward. The left
        arrow turns back. Hold Shift and an arrow to change chapter. You can also drag a page
        across the middle of the book. Press F to hide the menus. Press M to turn sound off or on.
      </p>
    </div>
  );
}
