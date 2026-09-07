const DARK_TOKENS = `
  --sf-cp-bg: #1a1a1a;
  --sf-cp-border: rgba(255, 255, 255, 0.08);
  --sf-cp-shadow: 0 8px 24px rgba(0, 0, 0, 0.6);
  --sf-cp-fg: rgba(255, 255, 255, 0.92);
  --sf-cp-muted: rgba(255, 255, 255, 0.6);
  --sf-cp-tabs-bg: rgba(255, 255, 255, 0.04);
  --sf-cp-tab-active-bg: rgba(255, 255, 255, 0.12);
  --sf-cp-field-bg: rgba(255, 255, 255, 0.04);
  --sf-cp-field-border: rgba(255, 255, 255, 0.08);
  --sf-cp-row-bg: rgba(255, 255, 255, 0.04);
  --sf-cp-hover: rgba(255, 255, 255, 0.08);
  --sf-cp-track: linear-gradient(to right, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.4));
  --sf-cp-thumb-bg: #e8e8e8;
  --sf-cp-thumb-border: #555;
  --sf-cp-danger: #ff7a77;
`;

export const COLOR_PICKER_CSS = `
.sf-cp {
  --sf-cp-bg: #ffffff;
  --sf-cp-border: #e0e0e0;
  --sf-cp-shadow: 0 8px 24px rgba(15, 23, 42, 0.16);
  --sf-cp-fg: #333333;
  --sf-cp-muted: #666666;
  --sf-cp-tabs-bg: #f5f5f5;
  --sf-cp-tab-active-bg: #ffffff;
  --sf-cp-field-bg: #f8f8f8;
  --sf-cp-field-border: #e0e0e0;
  --sf-cp-row-bg: #f8f8f8;
  --sf-cp-hover: rgba(0, 0, 0, 0.05);
  --sf-cp-track: linear-gradient(to right, #e0e0e0, #606060);
  --sf-cp-thumb-bg: #ffffff;
  --sf-cp-thumb-border: #666666;
  --sf-cp-danger: #e53935;
  --sf-cp-accent: #9b42df;

  position: fixed;
  z-index: 10000;
  box-sizing: border-box;
  width: 268px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  border: 1px solid var(--sf-cp-border);
  border-radius: 12px;
  background: var(--sf-cp-bg);
  box-shadow: var(--sf-cp-shadow);
  color: var(--sf-cp-fg);
  font: 12px/1.4 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
}

.sf-cp[data-sf-theme="dark"] {${DARK_TOKENS}}

@media (prefers-color-scheme: dark) {
  .sf-cp[data-sf-theme="auto"] {${DARK_TOKENS}}
}

.sf-cp *,
.sf-cp *::before,
.sf-cp *::after {
  box-sizing: border-box;
}

.sf-cp-tabs {
  display: flex;
  gap: 4px;
  padding: 4px;
  border-radius: 8px;
  background: var(--sf-cp-tabs-bg);
}

.sf-cp-tab {
  flex: 1;
  padding: 5px 12px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--sf-cp-muted);
  font: inherit;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease;
}

.sf-cp-tab:hover {
  color: var(--sf-cp-fg);
  background: var(--sf-cp-hover);
}

.sf-cp-tab[aria-selected="true"] {
  background: var(--sf-cp-tab-active-bg);
  color: var(--sf-cp-accent);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
}

.sf-cp-area {
  display: flex;
  gap: 12px;
  height: 148px;
}

.sf-cp-matrix {
  position: relative;
  flex: 1;
  border-radius: 8px;
  overflow: hidden;
  cursor: crosshair;
  user-select: none;
}

.sf-cp-matrix-white,
.sf-cp-matrix-black {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.sf-cp-matrix-white {
  background: linear-gradient(to right, #ffffff, rgba(255, 255, 255, 0));
}

.sf-cp-matrix-black {
  background: linear-gradient(to bottom, rgba(0, 0, 0, 0), #000000);
}

.sf-cp-matrix-cursor {
  position: absolute;
  width: 14px;
  height: 14px;
  border: 2px solid #ffffff;
  border-radius: 50%;
  transform: translate(-50%, -50%);
  pointer-events: none;
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.3), 0 2px 4px rgba(0, 0, 0, 0.2);
}

.sf-cp-hue {
  position: relative;
  width: 12px;
  border-radius: 6px;
  cursor: pointer;
  user-select: none;
  background: linear-gradient(to bottom, #ff0000 0%, #ffff00 17%, #00ff00 33%, #00ffff 50%, #0000ff 67%, #ff00ff 83%, #ff0000 100%);
}

.sf-cp-hue-thumb {
  position: absolute;
  left: 50%;
  width: 18px;
  height: 5px;
  border: 2px solid #ffffff;
  border-radius: 3px;
  background: transparent;
  transform: translate(-50%, -50%);
  pointer-events: none;
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.35);
}

.sf-cp-rows {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.sf-cp-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.sf-cp-label {
  flex: none;
  width: 34px;
  color: var(--sf-cp-muted);
  font-weight: 600;
}

.sf-cp-range {
  flex: 1;
  min-width: 0;
  height: 6px;
  border-radius: 3px;
  outline: none;
  background: var(--sf-cp-track);
  -webkit-appearance: none;
  appearance: none;
}

.sf-cp-range::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 15px;
  height: 15px;
  border: 2px solid var(--sf-cp-thumb-border);
  border-radius: 50%;
  background: var(--sf-cp-thumb-bg);
  cursor: pointer;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.25);
}

.sf-cp-range::-moz-range-thumb {
  width: 15px;
  height: 15px;
  border: 2px solid var(--sf-cp-thumb-border);
  border-radius: 50%;
  background: var(--sf-cp-thumb-bg);
  cursor: pointer;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.25);
}

.sf-cp-number,
.sf-cp-text {
  flex: none;
  width: 52px;
  padding: 4px 8px;
  border: 1px solid var(--sf-cp-field-border);
  border-radius: 6px;
  background: var(--sf-cp-field-bg);
  color: var(--sf-cp-fg);
  font: inherit;
  font-weight: 500;
  text-align: center;
}

.sf-cp-text {
  flex: 1;
  width: auto;
  min-width: 0;
  text-align: left;
  font-family: ui-monospace, "SF Mono", Menlo, Consolas, monospace;
  text-transform: uppercase;
}

.sf-cp-number:focus,
.sf-cp-text:focus {
  outline: none;
  border-color: var(--sf-cp-accent);
}

.sf-cp-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding-top: 12px;
  border-top: 1px solid var(--sf-cp-border);
}

.sf-cp-preview {
  height: 34px;
  border: 1px solid var(--sf-cp-field-border);
  border-radius: 8px;
}

.sf-cp-section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.sf-cp-heading {
  color: var(--sf-cp-muted);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.5px;
  text-transform: uppercase;
}

.sf-cp-icon-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  padding: 0;
  border: 1px solid var(--sf-cp-field-border);
  border-radius: 5px;
  background: var(--sf-cp-field-bg);
  color: var(--sf-cp-muted);
  font: inherit;
  font-size: 15px;
  line-height: 1;
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease, border-color 0.15s ease;
}

.sf-cp-icon-btn:hover:not(:disabled) {
  background: var(--sf-cp-hover);
  color: var(--sf-cp-fg);
}

.sf-cp-icon-btn:disabled {
  opacity: 0.4;
  cursor: default;
}

.sf-cp-stops {
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 132px;
  overflow-y: auto;
}

.sf-cp-stop {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 5px 8px;
  border: 1px solid transparent;
  border-radius: 6px;
  background: var(--sf-cp-row-bg);
  cursor: pointer;
}

.sf-cp-stop[aria-selected="true"] {
  border-color: var(--sf-cp-accent);
}

.sf-cp-stop-swatch {
  flex: none;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.18), 0 1px 2px rgba(0, 0, 0, 0.2);
}

.sf-cp-stop-hex {
  flex: 1;
  min-width: 0;
  color: var(--sf-cp-fg);
  font-family: ui-monospace, "SF Mono", Menlo, Consolas, monospace;
  text-transform: uppercase;
}

.sf-cp-stop-pos {
  flex: none;
  width: 46px;
  padding: 2px 4px;
  border: 1px solid var(--sf-cp-field-border);
  border-radius: 4px;
  background: var(--sf-cp-bg);
  color: var(--sf-cp-muted);
  font: inherit;
  text-align: center;
}

.sf-cp-stop-pos:focus {
  outline: none;
  border-color: var(--sf-cp-accent);
}

.sf-cp-stop-remove {
  flex: none;
  width: 20px;
  height: 20px;
  padding: 0;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: var(--sf-cp-muted);
  font: inherit;
  font-size: 15px;
  line-height: 1;
  cursor: pointer;
}

.sf-cp-stop-remove:hover:not(:disabled) {
  background: var(--sf-cp-hover);
  color: var(--sf-cp-danger);
}

.sf-cp-stop-remove:disabled {
  opacity: 0.3;
  cursor: default;
}

.sf-cp-reset {
  padding: 4px 0 0;
  border: none;
  border-top: 1px solid var(--sf-cp-border);
  background: transparent;
  color: var(--sf-cp-muted);
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.sf-cp-reset:hover {
  color: var(--sf-cp-accent);
}
`;
