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

export const BASE_CSS = `
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
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 10px;
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

`;
