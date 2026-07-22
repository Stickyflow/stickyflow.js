import { render, DOM_CONTRACT_VERSION } from '../dist/index.js';

const SFL = `sfl 1.2

Model M {
  Entity a {
    kind: process
    text: "Hi"
    layout {
      position: 0, 0
      size: 100, 50
    }
  }
}
`;

const { svg, width, height, diagnostics } = render(SFL);
const checks = {
  contractConst: DOM_CONTRACT_VERSION === 1,
  isSvg: svg.startsWith('<?xml') || svg.startsWith('<svg'),
  hasContractAttr: svg.includes('data-sf-contract="1"'),
  hasEntity: svg.includes('data-sf-id="a"'),
  hasText: svg.includes('>Hi</tspan>'),
  sized: width > 0 && height > 0,
  noDiag: diagnostics.length === 0,
};
console.log(checks);
const ok = Object.values(checks).every(Boolean);
console.log(ok ? 'SMOKE OK — built ESM renders headless' : 'SMOKE FAILED');
process.exit(ok ? 0 : 1);
