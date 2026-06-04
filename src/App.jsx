import SetupScreen from './screens/SetupScreen';
import GameScreen  from './screens/GameScreen';
import EndScreen   from './screens/EndScreen';
import { useGameState } from './hooks/useGameState';

export default function App() {
  const {
    game, startGame, resetGame,
    setPending, cancelPending,
    beginShift, selectShiftLine, selectShiftDirection,
    pickKillerIdentity,
    executeBoardAction,
    pickInspectorIdentity,
    beginExonerate, completeExonerate,
    executeDisguise,
    runAiTurn,
    getActingSecrets, isCoordTargetable,
  } = useGameState();

  const screen = !game ? 'setup' : game.gameOver ? 'end' : 'game';

  return (
    <div className="grain">
      {screen === 'setup' && <SetupScreen onStart={startGame} />}
      {screen === 'game' && (
        <GameScreen
          game={game}
          actions={{
            setPending, cancelPending,
            beginShift, selectShiftLine, selectShiftDirection,
            pickKillerIdentity,
            executeBoardAction,
            pickInspectorIdentity,
            beginExonerate, completeExonerate,
            executeDisguise,
            runAiTurn,
            getActingSecrets, isCoordTargetable,
          }}
        />
      )}
      {screen === 'end' && <EndScreen game={game} onReset={resetGame} />}
    </div>
  );
}
