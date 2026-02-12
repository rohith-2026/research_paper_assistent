import { STRINGS, type Lang } from "./strings";

const SKIP_TAGS = new Set(["SCRIPT", "STYLE", "CODE", "PRE", "TEXTAREA", "INPUT"]);
const ORIGINAL_TEXT_ATTR = "data-i18n-original";
const ORIGINAL_PLACEHOLDER_ATTR = "data-i18n-placeholder";
const ORIGINAL_TITLE_ATTR = "data-i18n-title";
const ORIGINAL_ARIA_ATTR = "data-i18n-aria";

const shouldPseudoTranslate = (value: string) => {
  if (!value) return false;
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (trimmed.length < 3) return false;
  if (/^[0-9\-_.:/+]+$/.test(trimmed)) return false;
  if (/^[A-Z0-9_]{2,}$/.test(trimmed)) return false;
  return /[A-Za-z]/.test(trimmed);
};

const pseudoTranslate = (value: string, lang: Lang) => {
  if (lang === "hi") return `HI: ${value}`;
  if (lang === "te") return `TE: ${value}`;
  return value;
};


const originalText = new WeakMap<Text, string>();
const originalAttrs = new WeakMap<Element, { placeholder?: string; title?: string; ariaLabel?: string }>();

const getOriginalAttr = (el: Element) => {
  const cached = originalAttrs.get(el);
  if (cached) return cached;
  const record = {
    placeholder: "placeholder" in el ? (el as HTMLInputElement).placeholder : undefined,
    title: el.getAttribute("title") || undefined,
    ariaLabel: el.getAttribute("aria-label") || undefined,
  };
  originalAttrs.set(el, record);
  return record;
};

const getOriginalTextFromElement = (el: Element) => {
  const stored = el.getAttribute(ORIGINAL_TEXT_ATTR);
  if (stored) return stored;
  const onlyText =
    el.childNodes.length === 1 && el.childNodes[0]?.nodeType === Node.TEXT_NODE
      ? (el.childNodes[0] as Text).nodeValue || ""
      : "";
  if (onlyText.trim()) {
    el.setAttribute(ORIGINAL_TEXT_ATTR, onlyText);
    return onlyText;
  }
  return "";
};

const translateTextNode = (node: Text, lang: Lang) => {
  const parent = node.parentElement;
  const raw =
    (parent && parent.getAttribute(ORIGINAL_TEXT_ATTR)) ||
    originalText.get(node) ||
    node.nodeValue;
  if (!raw) return;
  if (lang === "en" && !originalText.has(node)) originalText.set(node, raw);
  const trimmed = raw.trim();
  if (!trimmed) return;
  const dict = STRINGS[lang] || {};
  const translated = dict[trimmed];
  const leading = raw.match(/^\s*/)?.[0] || "";
  const trailing = raw.match(/\s*$/)?.[0] || "";
  if (lang === "en") {
    node.nodeValue = `${leading}${trimmed}${trailing}`;
    return;
  }
  if (translated && translated !== trimmed) {
    node.nodeValue = `${leading}${translated}${trailing}`;
    return;
  }
  if (shouldPseudoTranslate(trimmed)) {
    node.nodeValue = `${leading}${pseudoTranslate(trimmed, lang)}${trailing}`;
  }
};

const translateElement = (el: Element, lang: Lang) => {
  const dict = STRINGS[lang] || {};
  if (lang === "en") getOriginalTextFromElement(el);
  if ("placeholder" in el) {
    const orig =
      el.getAttribute(ORIGINAL_PLACEHOLDER_ATTR) ||
      getOriginalAttr(el).placeholder ||
      "";
    if (!el.getAttribute(ORIGINAL_PLACEHOLDER_ATTR) && orig) {
      el.setAttribute(ORIGINAL_PLACEHOLDER_ATTR, orig);
    }
    if (lang === "en" && orig) {
      (el as HTMLInputElement).placeholder = orig;
    } else if (orig && dict[orig]) {
      (el as HTMLInputElement).placeholder = dict[orig];
    } else if (orig && shouldPseudoTranslate(orig)) {
      (el as HTMLInputElement).placeholder = pseudoTranslate(orig, lang);
    } else if (orig) {
      (el as HTMLInputElement).placeholder = orig;
    }
  }
  if (el.hasAttribute("title")) {
    const orig =
      el.getAttribute(ORIGINAL_TITLE_ATTR) || getOriginalAttr(el).title || "";
    if (!el.getAttribute(ORIGINAL_TITLE_ATTR) && orig) {
      el.setAttribute(ORIGINAL_TITLE_ATTR, orig);
    }
    if (lang === "en" && orig) {
      el.setAttribute("title", orig);
    } else if (orig && dict[orig]) {
      el.setAttribute("title", dict[orig]);
    } else if (orig && shouldPseudoTranslate(orig)) {
      el.setAttribute("title", pseudoTranslate(orig, lang));
    } else if (orig) {
      el.setAttribute("title", orig);
    }
  }
  if (el.hasAttribute("aria-label")) {
    const orig =
      el.getAttribute(ORIGINAL_ARIA_ATTR) || getOriginalAttr(el).ariaLabel || "";
    if (!el.getAttribute(ORIGINAL_ARIA_ATTR) && orig) {
      el.setAttribute(ORIGINAL_ARIA_ATTR, orig);
    }
    if (lang === "en" && orig) {
      el.setAttribute("aria-label", orig);
    } else if (orig && dict[orig]) {
      el.setAttribute("aria-label", dict[orig]);
    } else if (orig && shouldPseudoTranslate(orig)) {
      el.setAttribute("aria-label", pseudoTranslate(orig, lang));
    } else if (orig) {
      el.setAttribute("aria-label", orig);
    }
  }
};

export const applyDomTranslations = (lang: Lang, root: ParentNode = document.body) => {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: (node) => {
      const parent = node.parentElement;
      if (!parent) return NodeFilter.FILTER_REJECT;
      if (SKIP_TAGS.has(parent.tagName)) return NodeFilter.FILTER_REJECT;
      if (parent.closest("[data-no-translate='true']")) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    },
  });

  let current = walker.nextNode();
  while (current) {
    translateTextNode(current as Text, lang);
    current = walker.nextNode();
  }

  const elements = root instanceof Element ? root.querySelectorAll("*") : document.querySelectorAll("*");
  elements.forEach((el) => {
    if (SKIP_TAGS.has(el.tagName)) return;
    if ((el as HTMLElement).closest("[data-no-translate='true']")) return;
    translateElement(el, lang);
  });
};

export const startDomTranslationObserver = (lang: Lang) => {
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === "childList") {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.TEXT_NODE) {
            translateTextNode(node as Text, lang);
          } else if (node.nodeType === Node.ELEMENT_NODE) {
            applyDomTranslations(lang, node as Element);
          }
        });
      } else if (mutation.type === "attributes") {
        const el = mutation.target as Element;
        translateElement(el, lang);
      }
    }
  });

  observer.observe(document.body, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ["placeholder", "title", "aria-label"],
  });

  return observer;
};
