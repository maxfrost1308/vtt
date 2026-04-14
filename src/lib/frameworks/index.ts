import { registerFramework, getFramework as _get } from './registry';
import { descendedFromQueenFramework } from './descended-from-queen/index';
import { genericCardDrawFramework } from './generic-card-draw/index';

if (!_get('generic-card-draw')) registerFramework(genericCardDrawFramework);
if (!_get('descended-from-queen')) registerFramework(descendedFromQueenFramework);

export { getFramework, listFrameworks, registerFramework } from './registry';
