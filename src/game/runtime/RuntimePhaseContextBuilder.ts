import { createRuntimePhaseContexts } from '@/game/runtime/RuntimePhaseContexts';
import type { BuildRuntimePhaseContextsOptions } from '@/game/runtime/RuntimePhaseBuilderOptions';
import {
  buildEnemyLoopContext,
  buildGameplayPreludeContext,
  buildPlayerFrameContext,
  buildRuntimeLoopTailContext,
} from '@/game/runtime/RuntimePhaseBuilders';

export type { BuildRuntimePhaseContextsOptions } from '@/game/runtime/RuntimePhaseBuilderOptions';

export function buildRuntimePhaseContexts(options: BuildRuntimePhaseContextsOptions) {
  return createRuntimePhaseContexts({
    gameplayPreludeContext: buildGameplayPreludeContext(options),
    playerFrameContext: buildPlayerFrameContext(options),
    enemyLoopContext: buildEnemyLoopContext(options),
    runtimeLoopTailContext: buildRuntimeLoopTailContext(options),
  });
}
