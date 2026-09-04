// Resizing changes visibility, never the media elements or their playback state.
export function resolveMediaView({ mobile, selected, cameraActive }) {
  const choice = cameraActive || selected !== 'demo' ? 'performance' : 'demo';
  return {
    selected: choice,
    showDemo: !mobile || choice === 'demo',
    showPerformance: !mobile || choice === 'performance',
  };
}
