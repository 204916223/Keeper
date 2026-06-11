const INPUT_HIDE_DELAY_MS = 1400;

function loadKeyboardHook() {
  try {
    return require('uiohook-napi');
  } catch (error) {
    console.warn('[keyboard-input] Failed to load uiohook-napi:', error.message);
    return null;
  }
}

function createKeyMaps(keys) {
  const normal = new Map([
    [keys.Space, ' '],
    [keys.Enter, '\n'],
    [keys.NumpadEnter, '\n'],
    [keys.NumpadAdd, '+'],
    [keys.NumpadSubtract, '-'],
    [keys.NumpadMultiply, '*'],
    [keys.NumpadDivide, '/'],
    [keys.NumpadDecimal, '.'],
    [keys.Semicolon, ';'],
    [keys.Equal, '='],
    [keys.Comma, ','],
    [keys.Minus, '-'],
    [keys.Period, '.'],
    [keys.Slash, '/'],
    [keys.Backquote, '`'],
    [keys.BracketLeft, '['],
    [keys.Backslash, '\\'],
    [keys.BracketRight, ']'],
    [keys.Quote, "'"],
  ]);

  const shifted = new Map([
    [keys.Space, ' '],
    [keys.Enter, '\n'],
    [keys.NumpadEnter, '\n'],
    [keys.Semicolon, ':'],
    [keys.Equal, '+'],
    [keys.Comma, '<'],
    [keys.Minus, '_'],
    [keys.Period, '>'],
    [keys.Slash, '?'],
    [keys.Backquote, '~'],
    [keys.BracketLeft, '{'],
    [keys.Backslash, '|'],
    [keys.BracketRight, '}'],
    [keys.Quote, '"'],
  ]);

  for (let digit = 0; digit <= 9; digit += 1) {
    normal.set(keys[digit], String(digit));
    normal.set(keys[`Numpad${digit}`], String(digit));
  }

  const shiftedDigits = {
    1: '!',
    2: '@',
    3: '#',
    4: '$',
    5: '%',
    6: '^',
    7: '&',
    8: '*',
    9: '(',
    0: ')',
  };

  for (const [digit, value] of Object.entries(shiftedDigits)) {
    shifted.set(keys[digit], value);
  }

  for (let code = 'A'.charCodeAt(0); code <= 'Z'.charCodeAt(0); code += 1) {
    const letter = String.fromCharCode(code);
    normal.set(keys[letter], letter.toLowerCase());
    shifted.set(keys[letter], letter);
  }

  return { normal, shifted };
}

function createKeyboardInputController({ getWindow }) {
  const hook = loadKeyboardHook();
  let isRunning = false;
  let onKeyDown;

  if (!hook) {
    return {
      start: () => {},
      stop: () => {},
    };
  }

  const { uIOhook, UiohookKey } = hook;
  const keyMaps = createKeyMaps(UiohookKey);

  function toInputPayload(event) {
    if (event.ctrlKey || event.metaKey || event.altKey) {
      return null;
    }

    if (event.keycode === UiohookKey.Backspace) {
      return { type: 'backspace' };
    }

    const map = event.shiftKey ? keyMaps.shifted : keyMaps.normal;
    const value = map.get(event.keycode);

    if (!value) {
      return null;
    }

    return {
      type: 'text',
      value,
      hideDelayMs: INPUT_HIDE_DELAY_MS,
    };
  }

  function sendInput(payload) {
    const window = getWindow();

    if (!window || window.isDestroyed() || !window.isVisible()) {
      return;
    }

    window.webContents.send('keyboard:text-input', payload);
  }

  return {
    start() {
      if (isRunning) {
        return;
      }

      onKeyDown = (event) => {
        const payload = toInputPayload(event);

        if (payload) {
          sendInput(payload);
        }
      };

      uIOhook.on('keydown', onKeyDown);

      try {
        uIOhook.start();
        isRunning = true;
      } catch (error) {
        uIOhook.off?.('keydown', onKeyDown);
        onKeyDown = undefined;
        console.warn('[keyboard-input] Failed to start global keyboard hook:', error.message);
      }
    },

    stop() {
      if (!isRunning) {
        return;
      }

      if (onKeyDown) {
        uIOhook.off?.('keydown', onKeyDown);
      }

      try {
        uIOhook.stop();
      } catch (error) {
        console.warn('[keyboard-input] Failed to stop global keyboard hook:', error.message);
      }

      onKeyDown = undefined;
      isRunning = false;
    },
  };
}

module.exports = {
  createKeyboardInputController,
};
