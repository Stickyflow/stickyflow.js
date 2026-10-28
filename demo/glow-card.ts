import { defineStickyflowDiagram, type StickyflowDiagram } from '../src/runtime/webComponent';

defineStickyflowDiagram();

const query = new URLSearchParams(location.search);
const angle = Number(query.get('angle') ?? 0);

const defs = (name: string, colors: [string, string, string]) => `
  Shader ${name}_glow {
    program: glowCard
    angle: ${angle}
    colorA: "${colors[0]}"
    colorB: "${colors[1]}"
    colorC: "${colors[2]}"
  }

  Style ${name}_face {
    shape: rounded_rectangle
    shader: ${name}_glow
  }
`;

const card = (name: string, x: number, title: string, text: string, icon: string) => `
  Shape ${name} : ${name}_face {
    text: ""
    layout { position: ${x}, 80; size: 280, 340; order: 1 }
  }

  Shape ${name}_icon {
    text: "${icon}"
    layout { position: ${x + 28}, 104; size: 48, 48; order: 2 }
    style { shape: circle; fill: "#14141c"; stroke: "#2c2c38"; strokeWidth: 1; textColor: "#ffffff"; fontSize: 18 }
  }

  Text ${name}_title {
    text: "${title}"
    layout { position: ${x + 28}, 190; size: 224, 60; order: 2 }
    style { fontSize: 22; fontWeight: 600; textColor: "#ffffff"; textAlign: left }
  }

  Text ${name}_text {
    text: "${text}"
    layout { position: ${x + 28}, 266; size: 224, 60; order: 2 }
    style { fontSize: 13; textColor: "#b9bccb"; textAlign: left }
  }

  Text ${name}_link {
    text: "Learn more"
    layout { position: ${x + 28}, 340; size: 120, 20; order: 2 }
    style { fontSize: 13; fontWeight: 600; textColor: "#ffffff"; textAlign: left }
  }
`;

const blue: [string, string, string] = ['#2f6bff', '#8f5cff', '#34d3c4'];
const violet: [string, string, string] = ['#6a3df0', '#c75cff', '#ff7fc8'];
const teal: [string, string, string] = ['#1fb5c9', '#2f6bff', '#8f5cff'];

const sfl = () => `sfl 1.5

Style tpl_canvas {
  fill: "#000000"
}
${defs('blue', blue)}${defs('violet', violet)}${defs('teal', teal)}
Model board {
${card('blue', 40, 'Industry best practices', 'Supporting the most popular digital currencies.', '✦')}
${card('violet', 360, 'AI-Powered Inbox Sorting', 'Email management with AI-driven sorting, boosting productivity and accessibility.', '✺')}
${card('teal', 680, 'Quiet by default', 'Notifications arrive only when something needs you.', '◐')}
}
`;

(document.getElementById('cards') as StickyflowDiagram).source = sfl();
