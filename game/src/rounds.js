// Round flow, money economy, buy menu management, and score keeping.
export function createRounds() {
  const state = {
    round: 1,
    scorePlayer: 0,
    scoreBots: 0,
    money: 800,
    phase: 'buy', // 'buy' or 'active'
    timer: 120,   // 2 minutes per round
  };

  return {
    state,
    resetRound() {
      state.phase = 'buy';
      state.timer = 120;
    },
    winRound(team) {
      if (team === 'player') {
        state.scorePlayer += 1;
        state.money += 3250;
      } else {
        state.scoreBots += 1;
        state.money += 1400;
      }
      state.round += 1;
    },
    buy(item, cost) {
      if (state.money >= cost) {
        state.money -= cost;
        return true;
      }
      return false;
    },
    step(dt) {
      if (state.phase === 'active') {
        state.timer = Math.max(0, state.timer - dt);
      }
    },
  };
}
