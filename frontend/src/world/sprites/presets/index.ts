// Temporary preset sprites, loaded from the test fixtures until the presets
// plan replaces them with real ones.
import fern from '../../../../test/fixtures/fern.sprite.json';
import rowanFixture from '../../../../test/fixtures/rowan.sprite.json';

// The rowan fixture carries an unknown key on purpose (it tests that unknown
// keys survive); a preset someone starts from shouldn't.
const { futureTrait: _unknown, ...rowan } = rowanFixture;

export const PRESETS = { fern, rowan };
