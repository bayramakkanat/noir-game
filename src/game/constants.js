export const BOARD_SIZE = 5;
export const KILLER_WIN_DEATH_COUNT = 16;
export const INSPECTOR_HAND_SIZE = 4;
export const KILLER_SETUP_CARDS = 2;

export const GAME_MODE = {
  CLASSIC: 'classic',
};

export const PHASE = {
  KILLER_PICK_IDENTITY:    'killer_pick_identity',    // katil kimlik seçiyor
  KILLER_PICK_DISGUISE:    'killer_pick_disguise',    // katil kılık değiştiriyor
  KILLER_FIRST_KILL:       'killer_first_kill',
  INSPECTOR_PICK_IDENTITY: 'inspector_pick_identity',
  PLAY:                    'play',
};

export const TURN = {
  KILLER:    'killer',
  INSPECTOR: 'inspector',
};

export const CELL_STATUS = {
  ALIVE:    'alive',
  DECEASED: 'deceased',
};
