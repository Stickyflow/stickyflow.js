export const FIELDS_CSS = `
.sf-cp-rows {
  display: flex;
  flex-direction: column;
  gap: 5px;
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

.sf-cp-fluid {
  --sf-ratio: 0;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  height: 26px;
  padding: 0 8px;
  border-radius: 8px;
  background: var(--sf-cp-row-bg);
  overflow: hidden;
  user-select: none;
}

.sf-cp-fluid[hidden] {
  display: none;
}

.sf-cp-fluid-fill {
  position: absolute;
  inset: 0 auto 0 0;
  width: calc(var(--sf-ratio) * 100%);
  border-radius: 8px;
  background: linear-gradient(90deg, color-mix(in srgb, currentColor 5%, transparent), color-mix(in srgb, currentColor 18%, transparent));
  pointer-events: none;
}

.sf-cp-fluid--alpha .sf-cp-fluid-fill {
  display: none;
}

.sf-cp-fluid-thumb {
  position: absolute;
  top: 50%;
  left: calc(var(--sf-ratio) * 100% - var(--sf-ratio) * 5px);
  width: 5px;
  height: 14px;
  border-radius: 999px;
  background: var(--sf-cp-fg);
  box-shadow: 0 0 0 1px var(--sf-cp-bg);
  transform: translateY(-50%);
  pointer-events: none;
  transition: height 180ms cubic-bezier(0.22, 1, 0.36, 1), box-shadow 220ms ease;
}

.sf-cp-fluid:hover .sf-cp-fluid-thumb,
.sf-cp-fluid:focus-within .sf-cp-fluid-thumb {
  height: 20px;
}

.sf-cp-fluid:has(.sf-cp-fluid-range:active) .sf-cp-fluid-thumb {
  height: 26px;
  box-shadow: 0 0 0 1px var(--sf-cp-bg), 0 0 0 5px color-mix(in srgb, var(--sf-cp-fg) 15%, transparent);
}

.sf-cp-fluid-label {
  position: relative;
  color: var(--sf-cp-muted);
  font-size: 11px;
  font-weight: 600;
  pointer-events: none;
}

.sf-cp-fluid-range {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  margin: 0;
  opacity: 0;
  cursor: ew-resize;
}

.sf-cp-number.sf-cp-fluid-number {
  position: relative;
  z-index: 2;
  width: 44px;
  padding: 1px 6px;
  border: none;
  background: transparent;
  text-align: right;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  -moz-appearance: textfield;
  appearance: textfield;
}

.sf-cp-fluid-number::-webkit-inner-spin-button,
.sf-cp-fluid-number::-webkit-outer-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.sf-cp-fluid-number:hover {
  background: var(--sf-cp-hover);
}

.sf-cp-number.sf-cp-fluid-number:focus {
  background: var(--sf-cp-field-bg);
  box-shadow: 0 0 0 1px var(--sf-cp-accent);
}

.sf-cp-number,
.sf-cp-eyedropper {
  flex: none;
  display: grid;
  place-items: center;
  width: 24px;
  height: 24px;
  margin-left: auto;
  padding: 0;
  border: 1px solid var(--sf-cp-field-border);
  border-radius: 6px;
  background: var(--sf-cp-field-bg);
  color: var(--sf-cp-fg);
  cursor: pointer;
}

.sf-cp-eyedropper:hover {
  background: var(--sf-cp-hover);
}

.sf-cp-text {
  flex: none;
  width: 52px;
  padding: 3px 8px;
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

`;
