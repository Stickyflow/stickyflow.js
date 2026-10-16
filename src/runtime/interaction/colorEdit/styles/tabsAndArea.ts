export const TABS_AND_AREA_CSS = `
.sf-cp-tabs {
  display: flex;
  gap: 3px;
  padding: 3px;
  border-radius: 8px;
  background: var(--sf-cp-tabs-bg);
}

.sf-cp-tabs[hidden] {
  display: none;
}

.sf-cp-tab {
  flex: 1;
  padding: 3px 12px;
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

`;
