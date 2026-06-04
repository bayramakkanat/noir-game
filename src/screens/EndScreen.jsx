import { SUSPECTS } from '../data/suspects';

export default function EndScreen({ game, onReset }) {
  const playerWon =
    (game.humanRole === 'inspector' && game.winner === 'inspector') ||
    (game.humanRole === 'killer' && game.winner === 'killer');

  const killerSuspect = SUSPECTS[game.killer.identitySuspectId];
  const humanIdentityId =
    game.humanRole === 'killer'
      ? game.killer.identitySuspectId
      : game.inspector.secretIdentitySuspectId;
  const humanName = SUSPECTS[humanIdentityId]?.name;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm text-center anim-fade-in">
        <div className="font-mono text-xs tracking-[0.3em] text-noir-muted mb-4 uppercase">
          Oyun Bitti
        </div>

        <h2
          className={`font-display text-5xl font-bold mb-3 ${playerWon ? 'text-noir-accent' : 'text-noir-red'}`}
        >
          {playerWon ? 'Kazandın' : 'Kaybettin'}
        </h2>

        <div className="w-16 h-px bg-noir-border mx-auto mb-6" />

        <p className="font-body text-sm text-noir-muted leading-relaxed mb-8">
          {game.humanRole === 'inspector' && game.winner === 'inspector' &&
            `${killerSuspect.name} yakalandı.`}
          {game.humanRole === 'inspector' && game.winner === 'killer' &&
            `Katil ${killerSuspect.name} kaçtı veya hedefe ulaştı.`}
          {game.humanRole === 'killer' && game.winner === 'killer' &&
            `Kimliğin ifşa edilmeden (${humanName}) hedefe ulaştın.`}
          {game.humanRole === 'killer' && game.winner === 'inspector' &&
            `Dedektif seni yakaladı. Katil: ${killerSuspect.name}.`}
        </p>

        <button
          onClick={onReset}
          className="
            w-full py-3 rounded-xl font-mono text-sm tracking-widest uppercase
            bg-noir-card border border-noir-border text-noir-muted
            hover:border-noir-accent hover:text-noir-accent
            transition-all duration-200
          "
        >
          Yeni Oyun
        </button>
      </div>
    </div>
  );
}
