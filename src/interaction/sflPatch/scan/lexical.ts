export function stripStringsAndComments(line: string): string {
  return line.replace(/\/\/.*$/, '').replace(/"(?:[^"\\]|\\.)*"/g, '""');
}

export function maskStringsAndComments(line: string): string {
  return line
    .replace(/\/\/.*$/, m => ' '.repeat(m.length))
    .replace(/"(?:[^"\\]|\\.)*"/g, m => `"${' '.repeat(m.length - 2)}"`);
}

export function braceDelta(line: string): number {
  let delta = 0;
  for (const ch of stripStringsAndComments(line)) {
    if (ch === '{') delta++;
    else if (ch === '}') delta--;
  }
  return delta;
}
