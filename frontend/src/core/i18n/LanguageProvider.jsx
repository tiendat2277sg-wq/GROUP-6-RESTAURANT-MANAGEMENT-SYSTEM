import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import messages from './messages.json';
import { createTranslator } from './translateCore.js';

const storageKey = 'fuku.language';
const LanguageContext = createContext(null);
const { translateWith } = createTranslator(messages);

function readPreference() {
  try {
    return localStorage.getItem(storageKey) === 'en' ? 'en' : 'vi';
  } catch {
    return 'vi';
  }
}

/** alert / confirm / prompt are native dialogs (not in the DOM), so translate their text here. */
function installDialogTranslator(language) {
  if (typeof window === 'undefined') return () => {};
  const originals = { alert: window.alert, confirm: window.confirm, prompt: window.prompt };
  const tr = message => (typeof message === 'string' ? (translateWith(language, message) ?? message) : message);
  window.alert = message => originals.alert.call(window, tr(message));
  window.confirm = message => originals.confirm.call(window, tr(message));
  window.prompt = (message, fallback) => originals.prompt.call(window, tr(message), fallback);
  return () => { Object.assign(window, originals); };
}

const TRANSLATED_ATTRIBUTES = ['placeholder', 'title', 'aria-label', 'alt'];
const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'TEXTAREA', 'NOSCRIPT', 'CODE', 'PRE']);

/**
 * Safety net for text that is not wrapped in translateLabel(): API messages,
 * toasts and hard-coded labels. Exact (whole-string) matches are swapped with the
 * dictionary translation for the active language. Originals are remembered so the
 * text can be restored when the language changes.
 */
function installDomTranslator(language) {
  if (typeof document === 'undefined' || !document.body) return () => {};
  const originalText = new WeakMap();
  const originalAttrs = new WeakMap();
  const touchedText = new Set();
  const touchedElements = new Set();

  const lookup = raw => {
    if (!raw || !/\S/.test(raw)) return null;
    const hit = translateWith(language, raw);
    if (hit === null) return null;
    const lead = raw.match(/^\s*/)[0];
    const trail = raw.match(/\s*$/)[0];
    return lead + hit + trail;
  };

  const translateTextNode = node => {
    const parent = node.parentNode;
    if (!parent || SKIP_TAGS.has(parent.nodeName)) return;
    const current = node.nodeValue;
    const known = originalText.get(node);
    if (known !== undefined && lookup(known) === current) return;
    const translated = lookup(current);
    if (translated !== null && translated !== current) {
      originalText.set(node, current);
      touchedText.add(node);
      node.nodeValue = translated;
    }
  };

  const translateAttributes = element => {
    for (const name of TRANSLATED_ATTRIBUTES) {
      if (!element.hasAttribute?.(name)) continue;
      const current = element.getAttribute(name);
      const translated = lookup(current);
      if (translated !== null && translated !== current) {
        const stored = originalAttrs.get(element) || {};
        stored[name] = current;
        originalAttrs.set(element, stored);
        touchedElements.add(element);
        element.setAttribute(name, translated);
      }
    }
  };

  const walk = root => {
    if (root.nodeType === Node.TEXT_NODE) {
      translateTextNode(root);
      return;
    }
    if (root.nodeType !== Node.ELEMENT_NODE || SKIP_TAGS.has(root.nodeName)) return;
    translateAttributes(root);
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT, {
      acceptNode: node => (node.nodeType === Node.ELEMENT_NODE && SKIP_TAGS.has(node.nodeName)
        ? NodeFilter.FILTER_REJECT
        : NodeFilter.FILTER_ACCEPT),
    });
    let node = walker.nextNode();
    while (node) {
      if (node.nodeType === Node.TEXT_NODE) translateTextNode(node);
      else translateAttributes(node);
      node = walker.nextNode();
    }
  };

  let scheduled = false;
  const pending = new Set();
  const flush = () => {
    scheduled = false;
    const batch = [...pending];
    pending.clear();
    batch.forEach(item => { if (item.isConnected) walk(item); });
  };
  const schedule = item => {
    pending.add(item);
    if (!scheduled) {
      scheduled = true;
      (window.requestAnimationFrame || (cb => setTimeout(cb, 16)))(flush);
    }
  };

  const observer = new MutationObserver(records => {
    for (const record of records) {
      if (record.type === 'childList') record.addedNodes.forEach(schedule);
      else if (record.type === 'characterData') schedule(record.target);
      else if (record.type === 'attributes') schedule(record.target);
    }
  });

  walk(document.body);
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true,
    attributes: true,
    attributeFilter: TRANSLATED_ATTRIBUTES,
  });

  return () => {
    observer.disconnect();
    // Put untouched originals back so the next language starts from clean text.
    touchedText.forEach(node => {
      const original = originalText.get(node);
      if (node.isConnected && original !== undefined && lookup(original) === node.nodeValue) {
        node.nodeValue = original;
      }
    });
    touchedElements.forEach(element => {
      const stored = originalAttrs.get(element) || {};
      Object.entries(stored).forEach(([name, original]) => {
        if (element.isConnected && lookup(original) === element.getAttribute(name)) {
          element.setAttribute(name, original);
        }
      });
    });
    touchedText.clear();
    touchedElements.clear();
  };
}

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState(readPreference);

  useEffect(() => {
    document.documentElement.lang = language;
    document.title = language === 'en' ? 'FUKU | Japanese Omakase' : 'FUKU | Omakase Nhật Bản';
  }, [language]);

  useEffect(() => {
    // Reload-free language switch: React re-renders wrapped labels, while the
    // DOM translator (re)translates any unwrapped text for the new language.
    const removeDom = installDomTranslator(language);
    const removeDialogs = installDialogTranslator(language);
    return () => { removeDom(); removeDialogs(); };
  }, [language]);

  useEffect(() => {
    const sync = event => {
      if (event.key === storageKey || event.key === null) setLanguage(readPreference());
    };
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, []);

  const changeLanguage = useCallback(value => {
    if (!['vi', 'en'].includes(value)) return;
    setLanguage(value);
    try { localStorage.setItem(storageKey, value); } catch { /* Session preference still applies. */ }
  }, []);

  const translateLabel = useCallback(value => {
    if (typeof value !== 'string') return value;
    return translateWith(language, value) ?? value;
  }, [language]);

  const value = useMemo(() => ({ language, changeLanguage, translateLabel }), [language, changeLanguage, translateLabel]);

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}

export function LanguageSelect({ floating = false }) {
  const { language, changeLanguage } = useLanguage();
  return (
    <label className={floating ? 'fuku-language fuku-language--floating' : 'fuku-language'}>
      <span aria-hidden="true">{language === 'vi' ? 'VI' : 'EN'} ▾</span>
      <select aria-label="Ngôn ngữ / Language" value={language} onChange={e => changeLanguage(e.target.value)}>
        <option value="vi" lang="vi">Tiếng Việt</option>
        <option value="en" lang="en">English</option>
      </select>
    </label>
  );
}
