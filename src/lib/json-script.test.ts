import { describe, expect, it } from 'vitest';
import { jsonForScript } from './json-script';

describe('jsonForScript', () => {
  it('cannot close the script tag', () => {
    const out = jsonForScript({ name: '</script><script>alert(1)</script>' });
    expect(out).not.toContain('<');
    expect(out).not.toContain('>');
    expect(JSON.parse(out)).toEqual({ name: '</script><script>alert(1)</script>' });
  });
  it('escapes ampersands and line separators but round-trips', () => {
    const value = { a: 'x & y', b: 'one\u2028two\u2029' };
    const out = jsonForScript(value);
    expect(out).not.toMatch(/[&\u2028\u2029]/);
    expect(JSON.parse(out)).toEqual(value);
  });
});
