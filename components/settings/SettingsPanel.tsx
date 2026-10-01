'use client';

import { useSettings } from './SettingsProvider';

/**
 * Scripture version is World English Bible for v1.
 * NKJV is named as a future preference only — its text is not included.
 */
export function SettingsPanel() {
  const { settings, update } = useSettings();

  return (
    <div className="settings-page">
      <h1>Settings</h1>
      <p className="settings-note">
        <em>Open the Book. See the story. Meet Jesus.</em> Read the passage before the study notes.
        Family-safe. Christ-centered.
      </p>

      <label htmlFor="version">Scripture version</label>
      <select id="version" value="web" name="version" onChange={() => undefined}>
        <option value="web">World English Bible (WEB) — full text</option>
        <option value="nkjv" disabled>
          NKJV (preferred later — license pending)
        </option>
      </select>
      <p className="settings-note">
        This reader ships the World English Bible, which is in the public domain. NKJV is the
        preferred translation for a later release once a license is in place. NKJV text is not
        included. “World English Bible” is a trademark of eBible.org.
      </p>

      <label className="check-row">
        <input
          type="checkbox"
          checked={settings.scriptureFirst}
          name="scriptureFirst"
          onChange={(event) => update({ scriptureFirst: event.target.checked })}
        />
        Scripture-first mode (show the passage before study notes)
      </label>

      <label className="check-row">
        <input
          type="checkbox"
          checked={settings.largeTargets}
          name="largeTaps"
          onChange={(event) => update({ largeTargets: event.target.checked })}
        />
        Large tap targets
      </label>

      <label className="check-row">
        <input
          type="checkbox"
          checked={settings.reducedMotion}
          name="reducedMotion"
          onChange={(event) => update({ reducedMotion: event.target.checked })}
        />
        Reduce page-turn motion
      </label>

      <p className="settings-note">
        Your place in the book is remembered on this device. Arrow keys turn the page. Shift plus
        an arrow key jumps a chapter. Swipe the book, or tap a page.
      </p>
    </div>
  );
}
