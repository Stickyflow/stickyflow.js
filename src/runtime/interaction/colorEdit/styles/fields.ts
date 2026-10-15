export const FIELDS_CSS = `
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

`;
