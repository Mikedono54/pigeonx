import * as fs from 'fs';
import * as path from 'path';

// Guard the engine source itself: it must use the shared constant, not an inline list.
describe('nativeEngine session config', () => {
  const src = fs.readFileSync(path.join(__dirname, '../src/audio/nativeEngine.ts'), 'utf8');
  it('uses PLAYBACK_SESSION_OPTIONS and does not inline PlayAndRecord-only options', () => {
    expect(src).toContain('PLAYBACK_SESSION_OPTIONS');
    expect(src).not.toMatch(/allowAirPlay|allowBluetoothA2DP/);
  });
  it('does not swallow session activation errors', () => {
    expect(src).not.toContain('A failure here only costs background playback');
  });
});
