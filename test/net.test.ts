import { describe, expect, it } from 'vitest';
import { sflToCanvasState } from '../src/index';

// Schematics category (stickyflow-atlas parity, SFL 1.4 §3.5 "Muster C"): a
// `Net` block is a multi-terminal net (e.g. a shared power rail) authored
// once instead of as N-1 hand-written Links. It is PARSE-ONLY - deterministic
// star decomposition (first member = hub, every other member connects to it,
// all synthetic links share the Net's `text`) into ordinary Link output.
// There is no Net representation in the canvas model and no re-emission.

const SFL = `sfl 1.4

Model board {
  Entity amp1 { shape: rectangle; layout { position: 0, 0; size: 100, 60 } }
  Entity amp2 { shape: rectangle; layout { position: 300, 0; size: 100, 60 } }
  Entity psu  { shape: rectangle; layout { position: 600, 0; size: 100, 60 } }

  Net vcc { members: [amp1, amp2, psu]; text: "+5V" }
}`;

describe('Net (§3.5, star decomposition)', () => {
  it('decomposes N members into N-1 links, first member as hub', () => {
    const state = sflToCanvasState(SFL);
    const netLinks = state.links.filter(l => l.id.startsWith('vcc_'));
    expect(netLinks).toHaveLength(2);
  });

  it('names synthetic links "<netName>_<index>" and connects hub -> each other member', () => {
    const state = sflToCanvasState(SFL);
    const link1 = state.links.find(l => l.id === 'vcc_1');
    const link2 = state.links.find(l => l.id === 'vcc_2');
    expect(link1?.fromId).toBe('amp1');
    expect(link1?.toId).toBe('amp2');
    expect(link2?.fromId).toBe('amp1');
    expect(link2?.toId).toBe('psu');
  });

  it('applies the Net text to every synthetic link', () => {
    const state = sflToCanvasState(SFL);
    const netLinks = state.links.filter(l => l.id.startsWith('vcc_'));
    for (const link of netLinks) {
      expect(link.text).toBe('+5V');
    }
  });

  it('produces no links for a Net with fewer than 2 members', () => {
    const single = `sfl 1.4

Model board {
  Entity a { shape: rectangle; layout { position: 0, 0; size: 100, 60 } }
  Net lonely { members: [a] }
}`;
    const state = sflToCanvasState(single);
    expect(state.links).toHaveLength(0);
  });

  it('does not add a canvas entity for the Net block itself', () => {
    const state = sflToCanvasState(SFL);
    expect(state.entities.find(e => e.id === 'vcc')).toBeUndefined();
  });
});
