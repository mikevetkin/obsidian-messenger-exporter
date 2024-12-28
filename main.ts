import { fromMarkdown } from 'mdast-util-from-markdown';
import { toTelegram } from 'mdast-util-to-telegram';
import { Notice, Plugin } from 'obsidian';

interface ClipboardContent {
  htmlContent: string;
  plainText: string;
}

const replaceBlockquotesWithTelegramStyle = (
  text: string,
): ClipboardContent => {
  const lines = text.split(/\r?\n/); // Разбиваем текст на строки
  const result: string[] = [];
  let quoteBuffer: string[] = []; // Буфер для текущей цитаты

  for (const line of lines) {
    if (line.startsWith('>')) {
      // Убираем символ '>' и пробел, добавляем строку в буфер
      quoteBuffer.push(line.slice(1).trim());
    } else {
      if (quoteBuffer.length > 0) {
        // Если буфер заполнен, обрабатываем цитату
        result.push(
          `<blockquote class="blockquote" data-entity-type="MessageEntityBlockquote">${quoteBuffer.join(' ')}</blockquote>`,
        );
        quoteBuffer = []; // Очищаем буфер
      }
      result.push(line); // Добавляем текущую строку (не цитату)
    }
  }

  // Если текст заканчивается цитатой, обрабатываем оставшийся буфер
  if (quoteBuffer.length > 0) {
    result.push(`<div>${quoteBuffer.join(' ')}</div>`);
  }

  const resultHTML = result.join('\n');

  return {
    htmlContent: resultHTML,
    plainText: text,
  };
};

const addBaseName = (text: string, baseName: string): string => {
  return `**${baseName}**\n\n${text}`;
};

const makeTelegramClipboardItem = (
  telegramMessage: string,
  basename: string,
): ClipboardItem => {
  const { plainText, htmlContent } =
    replaceBlockquotesWithTelegramStyle(telegramMessage);

  const text = plainText.replace(
    /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
    '$1 ($2)',
  );

  const html = htmlContent.replace(
    /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
    `<a class="text-entity-link" href="$2" data-entity-type="MessageEntityTextUrl" dir="auto">$1</a>`,
  );

  return new ClipboardItem({
    'text/plain': new Blob([addBaseName(text, basename)], {
      type: 'text/plain',
    }),
    'text/html': new Blob([addBaseName(html, basename)], { type: 'text/html' }),
  });
};

interface ObsidianTelegramPluginSettings {
  mySetting: string;
}

const DEFAULT_SETTINGS: ObsidianTelegramPluginSettings = {
  mySetting: 'default',
};

export default class ObsidianTelegramPlugin extends Plugin {
  settings: ObsidianTelegramPluginSettings;

  private async perform() {
    const file = this.app.workspace.getActiveFile();

    const markdownText = file && (await this.app.vault.read(file));

    const basename = file && file.basename;

    if (markdownText) {
      const ast = fromMarkdown(markdownText);

      const telegramMessage = toTelegram(ast);
      const clipboardContent = makeTelegramClipboardItem(
        telegramMessage,
        basename,
      );

      navigator.clipboard
        .write([clipboardContent])
        .then(() => {
          new Notice('Text was copied in Telegram message format!');
        })
        .catch((err) => {
          new Notice('Could not export text to Telegram');
        });
    } else {
      new Notice('Could not export text to Telegram');
    }
  }

  async onload() {
    await this.loadSettings();

    /**
     * This creates an icon in the left ribbon.
     */

    // const ribbonIconEl = this.addRibbonIcon('dice', 'Obsidian-Telegram', (evt: MouseEvent) => {
    // 	this.perform();
    // });

    /**
     * Perform additional things with the ribbon
     */

    // ribbonIconEl.addClass('my-plugin-ribbon-class');

    /**
     * This creates line in the "file-menu"
     */
    this.registerEvent(
      this.app.workspace.on('file-menu', (menu, file) => {
        menu.addItem((item) => {
          item
            .setTitle('Export to Telegram')
            .setIcon('export')
            .onClick(async () => {
              this.perform();
            });
        });
      }),
    );

    /**
     * This adds a status bar item to the bottom of the app.
     * Does not work on mobile apps.
     */

    // const statusBarItemEl = this.addStatusBarItem();
    // statusBarItemEl.setText('Status Bar Text');

    /**
     * This adds a simple command that can be triggered anywhere
     */

    // this.addCommand({
    // 	id: 'open-sample-modal-simple',
    // 	name: 'Open sample modal (simple)',
    // 	callback: () => {
    // 		new SampleModal(this.app).open();
    // 	}
    // });

    /**
     * This adds an editor command that can perform
     * some operation on the current editor instance
     */

    // this.addCommand({
    // 	id: 'sample-editor-command',
    // 	name: 'Sample editor command',
    // 	editorCallback: (editor: Editor, view: MarkdownView) => {
    // 		console.log(editor.getSelection());
    // 		editor.replaceSelection('Sample Editor Command');
    // 	}
    // });

    /**
     * This adds a complex command that can check whether the current state of the app allows execution of the command
     */

    // this.addCommand({
    // 	id: 'open-sample-modal-complex',
    // 	name: 'Open sample modal (complex)',
    // 	checkCallback: (checking: boolean) => {
    // 		// Conditions to check
    // 		const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
    // 		if (markdownView) {
    // 			// If checking is true, we're simply "checking" if the command can be run.
    // 			// If checking is false, then we want to actually perform the operation.
    // 			if (!checking) {
    // 				new SampleModal(this.app).open();
    // 			}

    // 			// This command will only show up in Command Palette when the check function returns true
    // 			return true;
    // 		}
    // 	}
    // });

    /**
     * This adds a settings tab so the user can configure various aspects of the plugin
     */

    // this.addSettingTab(new SampleSettingTab(this.app, this));

    /**
     * If the plugin hooks up any global DOM events (on parts of the app that doesn't belong to this plugin)
     * Using this function will automatically remove the event listener when this plugin is disabled.
     */

    // this.registerDomEvent(document, 'click', (evt: MouseEvent) => {
    // 	console.log('click', evt);
    // });

    /**
     * When registering intervals, this function will automatically clear the interval when the plugin is disabled.
     */

    // this.registerInterval(window.setInterval(() => console.log('setInterval'), 5 * 60 * 1000));
  }

  // onunload() {}

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }
}

// class SampleModal extends Modal {
// 	constructor(app: App) {
// 		super(app);
// 	}

// 	onOpen() {
// 		const {contentEl} = this;
// 		contentEl.setText('Woah!');
// 	}

// 	onClose() {
// 		const {contentEl} = this;
// 		contentEl.empty();
// 	}
// }

// class SampleSettingTab extends PluginSettingTab {
// 	plugin: ObsidianTelegramPlugin;

// 	constructor(app: App, plugin: ObsidianTelegramPlugin) {
// 		super(app, plugin);
// 		this.plugin = plugin;
// 	}

// 	display(): void {
// 		const {containerEl} = this;

// 		containerEl.empty();

// 		new Setting(containerEl)
// 			.setName('Setting #1')
// 			.setDesc('It\'s a secret')
// 			.addText(text => text
// 				.setPlaceholder('Enter your secret')
// 				.setValue(this.plugin.settings.mySetting)
// 				.onChange(async (value) => {
// 					this.plugin.settings.mySetting = value;
// 					await this.plugin.saveSettings();
// 				}));
// 	}
// }
