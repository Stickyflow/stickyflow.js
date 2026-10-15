export const GRADIENT_CSS = `
.sf-cp-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding-top: 12px;
  border-top: 1px solid var(--sf-cp-border);
}

.sf-cp-section[hidden] {
  display: none;
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
