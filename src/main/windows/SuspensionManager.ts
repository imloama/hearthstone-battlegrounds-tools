import { EventEmitter } from 'events';
import {
  BrowserWindow,
  BrowserWindowConstructorOptions,
  screen,
} from 'electron';
import { is } from 'electron-util';

import { getAppHTML } from '../utils';

interface Params {
  onInit: (window: BrowserWindow) => void;
  onDestroy?: () => void;
}

class SuspensionManager extends EventEmitter {
  option: BrowserWindowConstructorOptions;

  window: BrowserWindow | null;

  screenSize: Electron.Size;

  constructor({ onInit, onDestroy }: Params) {
    super();

    this.screenSize = screen.getPrimaryDisplay().workAreaSize;
    this.option = {
      width: 260,
      height:
        this.screenSize.height > 1200 ? 1200 : this.screenSize.height - 100,
      type: 'toolbar',
      transparent: true,
      frame: false,
      resizable: true,
      show: false,
      webPreferences: {
        nodeIntegration: true,
        enableRemoteModule: true,
      },
      alwaysOnTop: true,
    };
    this.window = null;
    this.init(this.option, onInit, onDestroy);
  }

  init(
    options: BrowserWindowConstructorOptions,
    onInit: Params['onInit'] = () => {},
    onDestroy?: Params['onDestroy']
  ) {
    this.window = new BrowserWindow(options);

    // 获取显示器的宽高
    const winSize = this.window.getSize(); // 获取窗口宽高

    const x = this.screenSize.width - winSize[0];
    const y = 100;
    this.window.setPosition(x, y);
    this.window.setAlwaysOnTop(true, 'screen-saver', 1000);
    if (is.macos) {
      this.window.setVisibleOnAllWorkspaces(true, {
        visibleOnFullScreen: true,
      });
    }
    this.window.loadURL(getAppHTML('suspension'));
    onInit(this.window);

    let boundWidth: number | null = null;
    this.window.on('will-resize', (e, newBounds) => {
      if (!is.development) {
        if (!boundWidth) {
          boundWidth = newBounds.width;
          e.preventDefault();
        } else if (
          // 限制最大变化幅度
          newBounds.width + 80 <= boundWidth ||
          newBounds.width >= boundWidth
        ) {
          e.preventDefault();
        }
      }
    });
    this.window.on('closed', () => {
      this.window = null;
      onDestroy?.();
    });
  }

  destroy() {
    this.window?.destroy();
  }

  show() {
    if (this.window) {
      if (!this.window.isVisible()) {
        this.window.show();
      }
    } else {
      this.init(this.option);
    }
  }

  hide() {
    if (this.window) {
      setTimeout(() => {
        this.window?.hide();
      }, 300);
    }
  }
}

export default SuspensionManager;
