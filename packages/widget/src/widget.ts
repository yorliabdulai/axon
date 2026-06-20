const LANG_FLAGS: Record<string, string> = {
  en: '🇬🇧',
  tw: '🇬🇭',
  dag: '🇬🇭',
  ga: '🇬🇭',
  ee: '🇬🇭',
};

const LANG_NAMES: Record<string, string> = {
  en: 'English',
  tw: 'Twi',
  dag: 'Dagbani',
  ga: 'Ga',
  ee: 'Ewe',
};

interface WidgetConfig {
  agentId: string;
  apiUrl: string;
  primaryColor: string;
  position: 'bottom-right' | 'bottom-left';
  languages: string[];
  welcomeMessage?: string;
}

interface StoredMessage {
  role: 'user' | 'assistant';
  content: string;
  escalated?: boolean;
}

class AxonChatWidget {
  private config: WidgetConfig;
  private sessionId: string;
  private language: string;
  private isOpen = false;
  private container!: HTMLElement;
  private messagesEl!: HTMLElement;
  private inputEl!: HTMLInputElement;

  constructor(config: WidgetConfig) {
    this.config = config;
    this.sessionId = sessionStorage.getItem('axon-session') ?? crypto.randomUUID();
    sessionStorage.setItem('axon-session', this.sessionId);
    this.language = sessionStorage.getItem('axon-language') ?? config.languages[0] ?? 'en';
    this.injectStyles();
    this.render();
    this.restoreMessages();
  }

  private injectStyles() {
    const style = document.createElement('style');
    style.textContent = `
      .axon-widget { --axon-primary: ${this.config.primaryColor}; font-family: system-ui, sans-serif; }
      .axon-bubble { position: fixed; ${this.config.position === 'bottom-right' ? 'right:20px' : 'left:20px'}; bottom: 20px; width: 56px; height: 56px; border-radius: 50%; background: var(--axon-primary); color: white; border: none; cursor: pointer; box-shadow: 0 4px 12px rgba(0,0,0,0.2); z-index: 99999; font-size: 24px; }
      .axon-panel { position: fixed; ${this.config.position === 'bottom-right' ? 'right:20px' : 'left:20px'}; bottom: 88px; width: 360px; max-width: calc(100vw - 40px); height: 480px; max-height: calc(100vh - 120px); background: white; border-radius: 12px; box-shadow: 0 8px 32px rgba(0,0,0,0.15); display: none; flex-direction: column; z-index: 99999; overflow: hidden; }
      .axon-panel.open { display: flex; }
      .axon-header { background: var(--axon-primary); color: white; padding: 12px 16px; display: flex; justify-content: space-between; align-items: center; }
      .axon-header select { background: rgba(255,255,255,0.2); color: white; border: none; border-radius: 4px; padding: 4px 8px; }
      .axon-messages { flex: 1; overflow-y: auto; padding: 12px; display: flex; flex-direction: column; gap: 8px; }
      .axon-msg { max-width: 85%; padding: 8px 12px; border-radius: 12px; font-size: 14px; line-height: 1.4; }
      .axon-msg.user { align-self: flex-end; background: var(--axon-primary); color: white; }
      .axon-msg.assistant { align-self: flex-start; background: #f0f0f0; color: #333; }
      .axon-input-row { display: flex; padding: 12px; border-top: 1px solid #eee; gap: 8px; }
      .axon-input-row input { flex: 1; border: 1px solid #ddd; border-radius: 8px; padding: 8px 12px; font-size: 14px; }
      .axon-input-row button { background: var(--axon-primary); color: white; border: none; border-radius: 8px; padding: 8px 16px; cursor: pointer; }
      .axon-rate { font-size: 11px; color: #888; cursor: pointer; margin-top: 4px; }
      @media (max-width: 480px) { .axon-panel { width: calc(100vw - 20px); ${this.config.position === 'bottom-right' ? 'right:10px' : 'left:10px'}; } }
    `;
    document.head.appendChild(style);
  }

  private render() {
    this.container = document.createElement('div');
    this.container.className = 'axon-widget';

    const bubble = document.createElement('button');
    bubble.className = 'axon-bubble';
    bubble.innerHTML = '💬';
    bubble.onclick = () => this.toggle();

    const panel = document.createElement('div');
    panel.className = 'axon-panel';

    const header = document.createElement('div');
    header.className = 'axon-header';
    header.innerHTML = `<span>Support</span>`;

    const langSelect = document.createElement('select');
    for (const lang of this.config.languages) {
      const opt = document.createElement('option');
      opt.value = lang;
      opt.textContent = `${LANG_FLAGS[lang] ?? ''} ${LANG_NAMES[lang] ?? lang}`;
      if (lang === this.language) opt.selected = true;
      langSelect.appendChild(opt);
    }
    langSelect.onchange = () => {
      this.language = langSelect.value;
      sessionStorage.setItem('axon-language', this.language);
    };
    header.appendChild(langSelect);

    this.messagesEl = document.createElement('div');
    this.messagesEl.className = 'axon-messages';

    const inputRow = document.createElement('div');
    inputRow.className = 'axon-input-row';
    this.inputEl = document.createElement('input');
    this.inputEl.placeholder = 'Type your message...';
    this.inputEl.onkeydown = (e) => {
      if (e.key === 'Enter') this.send();
    };
    const sendBtn = document.createElement('button');
    sendBtn.textContent = 'Send';
    sendBtn.onclick = () => this.send();
    inputRow.append(this.inputEl, sendBtn);

    panel.append(header, this.messagesEl, inputRow);
    this.container.append(bubble, panel);
    document.body.appendChild(this.container);

    if (this.config.welcomeMessage) {
      this.addMessage('assistant', this.config.welcomeMessage);
    }
  }

  private toggle() {
    this.isOpen = !this.isOpen;
    const panel = this.container.querySelector('.axon-panel') as HTMLElement;
    panel.classList.toggle('open', this.isOpen);
  }

  private addMessage(role: 'user' | 'assistant', content: string, escalated?: boolean) {
    const msg = document.createElement('div');
    msg.className = `axon-msg ${role}`;
    msg.textContent = content;
    this.messagesEl.appendChild(msg);

    if (role === 'assistant' && !escalated) {
      const rate = document.createElement('div');
      rate.className = 'axon-rate';
      rate.textContent = 'Not helpful?';
      rate.onclick = () => this.sendUnhelpful();
      msg.appendChild(rate);
    }

    this.messagesEl.scrollTop = this.messagesEl.scrollHeight;
    this.saveMessages();
  }

  private saveMessages() {
    const messages: StoredMessage[] = [];
    this.messagesEl.querySelectorAll('.axon-msg').forEach((el) => {
      const role = el.classList.contains('user') ? 'user' : 'assistant';
      messages.push({ role, content: (el as HTMLElement).childNodes[0]?.textContent ?? '' });
    });
    sessionStorage.setItem('axon-messages', JSON.stringify(messages));
  }

  private restoreMessages() {
    const stored = sessionStorage.getItem('axon-messages');
    if (!stored) return;
    try {
      const messages: StoredMessage[] = JSON.parse(stored);
      for (const m of messages) {
        this.addMessage(m.role, m.content, m.escalated);
      }
    } catch {
      // ignore
    }
  }

  private async send() {
    const text = this.inputEl.value.trim();
    if (!text) return;
    this.inputEl.value = '';
    this.addMessage('user', text);

    try {
      const res = await fetch(`${this.config.apiUrl}/agents/${this.config.agentId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          sessionId: this.sessionId,
          language: this.language,
          channel: 'web',
        }),
      });
      const data = await res.json();
      this.addMessage('assistant', data.content, data.escalated);
    } catch {
      this.addMessage('assistant', 'Sorry, I am having trouble connecting. Please try again.');
    }
  }

  private async sendUnhelpful() {
    await fetch(`${this.config.apiUrl}/agents/${this.config.agentId}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'This response was not helpful',
        sessionId: this.sessionId,
        language: this.language,
        channel: 'web',
        unhelpfulRating: true,
      }),
    });
    this.addMessage('assistant', 'I understand. Let me connect you with a human agent who will follow up shortly.', true);
  }
}

function initFromScript() {
  const scripts = document.querySelectorAll('script[data-agent-id]');
  const script = scripts[scripts.length - 1] as HTMLScriptElement;
  if (!script) return;

  const config: WidgetConfig = {
    agentId: script.dataset.agentId ?? 'default',
    apiUrl: script.dataset.apiUrl ?? 'http://localhost:3000',
    primaryColor: script.dataset.primaryColor ?? '#1B4332',
    position: (script.dataset.position as WidgetConfig['position']) ?? 'bottom-right',
    languages: (script.dataset.languages ?? 'en,tw,dag,ga,ee').split(','),
    welcomeMessage: script.dataset.welcomeMessage,
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => new AxonChatWidget(config));
  } else {
    new AxonChatWidget(config);
  }
}

initFromScript();

export { AxonChatWidget };
