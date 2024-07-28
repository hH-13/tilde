'use strict';

const $ = {
    bodyClassAdd: (c) => $.el('body').classList.add(c),
    bodyClassRemove: (c) => $.el('body').classList.remove(c),
    el: (s) => document.querySelector(s),
    els: (s) => [].slice.call(document.querySelectorAll(s) || []),
    escapeRegex: (s) => s?.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'),
    flattenAndUnique: (arr) => [...new Set([].concat.apply([], arr))],
    isDown: (e) => /^(ArrowDown|Tab|c-n)$/.test($.prefix(e) + e.key),
    isEscape: (e) => /^Escape$/.test(e.key),
    isModifier: (e) => /^(Alt|Control|Enter|Meta|Shift)$/.test(e.key),
    isRemove: (e) => /^(Backspace|Delete)$/.test(e.key),
    isUp: (e) => /^(ArrowUp|c-p|s-Tab)$/.test($.prefix(e) + e.key),
    prefix: (e) => (e.ctrlKey ? 'c-' : '') + (e.shiftKey ? 's-' : ''),
};

class Clock {
    static #EL = $.el('#clock');

    #amPm = false;
    #delimiter = ':';
    #showSeconds = false;
    #timeZone = null;
    #twentyFourHour = true;

    constructor(options) {
        this.#amPm = options.amPm;
        this.#delimiter = options.delimiter;
        this.#showSeconds = options.showSeconds;
        this.#timeZone = options.timeZone;
        this.#twentyFourHour = options.twentyFourHour;
        Clock.#EL.addEventListener('click', options.onClick);
        this.#start();
    }

    #setTime = () => {
        const date = new Date();

        Clock.#EL.innerHTML = date
            .toLocaleString('en-US', {
                hour12: !this.#twentyFourHour,
                hour: 'numeric',
                minute: 'numeric',
                second: this.#showSeconds ? 'numeric' : undefined,
                timeZone: this.#timeZone,
            })
            .replace(this.#amPm ? '' : / (AM|PM)/, '')
            .replace(/:/g, this.#delimiter)
            .replace(/^0/, '');

        Clock.#EL.setAttribute('datetime', date.toTimeString());
    };

    #start() {
        this.#setTime();
        setInterval(this.#setTime, 1000);
    }
}

class Help {
    static #CN_COMMAND = 'command';
    static #CN_COMMAND_KEY = 'command-key';
    static #CN_COMMAND_LIST = 'command-list';
    static #CN_COMMAND_NAME = 'command-name';
    static #CN_HELP = 'help';
    static #EL = $.el('#help');

    #commands = [];
    #newTab = false;
    #toggled = false;

    constructor(options) {
        this.#commands = options.commands;
        this.#newTab = options.newTab;
        this.#buildCommands();
        this.#registerEvents();
    }

    toggle = (show) => {
        this.#toggled = typeof show !== 'undefined' ? show : !this.#toggled;
        if (this.#toggled) $.bodyClassAdd(Help.#CN_HELP);
        else $.bodyClassRemove(Help.#CN_HELP);
    };

    #buildCommands() {
        const list = document.createElement('ul');
        list.classList.add(Help.#CN_COMMAND_LIST);

        list.insertAdjacentHTML(
            'beforeend',
            this.#commands.reduce((acc, { color, name, key, url }, i) => {
                if (!name) return acc;
                const target = this.#newTab ? '_blank' : '_self';

                return `
            ${acc}
            <style>
              .command-key-${i},
              .command-${i}:hover {
                background: ${color};
                color: var(--command-color-complementary);
              }
            </style>
            <li>
              <a
                class="${Help.#CN_COMMAND} command-${i}"
                href="${url}"
                rel="noopener noreferrer"
                target="${target}"
              >
                <span
                  class="${Help.#CN_COMMAND_KEY} command-key-${i}"
                >
                  ${key}
                </span>
                <span class="${Help.#CN_COMMAND_NAME}">${name}</span>
              </a>
            </li>
          `;
            }, '')
        );

        Help.#EL.appendChild(list);
    }

    #handleKeydown = (e) => {
        if ($.isEscape(e)) this.toggle(false);
    };

    #registerEvents() {
        document.addEventListener('keydown', this.#handleKeydown);
    }
}

class Influencer {
    limit = 0;
    minChars = 0;

    constructor(options) {
        this.limit = options.limit;
        this.minChars = options.minChars;
    }

    addItem() {
        // noop
    }

    getSuggestions() {
        return Promise.resolve([]);
    }

    isTooShort(query) {
        return query.length < this.minChars;
    }

    static addSearchPrefix(items, { isSearch, key, split }) {
        const searchPrefix = isSearch ? `${key}${split}` : false;
        return items.map((s) => (searchPrefix ? searchPrefix + s : s));
    }
}

class DefaultInfluencer extends Influencer {
    #suggestionDefaults = {};

    constructor(options) {
        super(...arguments);
        this.#suggestionDefaults = options.suggestionDefaults;
    }

    getSuggestions({ raw }) {
        return new Promise((resolve) =>
            resolve((this.#suggestionDefaults[raw] || []).slice(0, this.limit))
        );
    }
}

class DuckDuckGoInfluencer extends Influencer {
    constructor() {
        super(...arguments);
    }

    getSuggestions(parsedQuery) {
        const { lower, query } = parsedQuery;
        if (this.isTooShort(query)) return Promise.resolve([]);

        return new Promise((resolve) => {
            window.autocompleteCallback = (res) =>
                resolve(
                    Influencer.addSearchPrefix(
                        res
                            .map((s) => s.phrase)
                            .filter((s) => s.toLowerCase() !== lower)
                            .slice(0, this.limit),
                        parsedQuery
                    )
                );

            const script = document.createElement('script');
            script.src = `https://duckduckgo.com/ac/?callback=autocompleteCallback&q=${query}`;
            $.el('head').appendChild(script);
        });
    }
}

class HistoryInfluencer extends Influencer {
    static #LOCALSTORAGE_KEY = 'history';

    #history = null;

    constructor() {
        super(...arguments);
    }

    addItem({ isPath, lower }) {
        if (isPath || this.isTooShort(lower)) return;
        let exists;

        const history = this.#getHistory().map(([item, count]) => {
            const match = item === lower;
            if (match) exists = true;
            return [item, match ? count + 1 : count];
        });

        if (!exists) history.push([lower, 1]);
        this.#setHistory(history.sort((a, b) => b[1] - a[1]));
    }

    getSuggestions(parsedQuery) {
        const { lower } = parsedQuery;
        if (this.isTooShort(lower)) return Promise.resolve([]);

        return new Promise((resolve) =>
            resolve(
                Influencer.addSearchPrefix(
                    this.#getHistory()
                        .filter(([item]) => item !== lower && item.includes(lower))
                        .slice(0, this.limit)
                        .map(([item]) => item),
                    parsedQuery
                )
            )
        );
    }

    #getHistory() {
        this.#history =
            this.#history ||
            JSON.parse(localStorage.getItem(HistoryInfluencer.#LOCALSTORAGE_KEY)) ||
            [];

        return this.#history;
    }

    #setHistory(history) {
        this.#history = history;

        localStorage.setItem(
            HistoryInfluencer.#LOCALSTORAGE_KEY,
            JSON.stringify(history)
        );
    }
}

class Suggester {
    static #ATTR_DATA_SUGGESTION = 'data-suggestion';
    static #CN_HIGHLIGHT = 'highlight';
    static #CN_SEARCH_SUGGESTION = 'search-suggestion';
    static #CN_SEARCH_SUGGESTION_MATCH = 'search-suggestion-match';
    static #CN_SUGGESTIONS = 'suggestions';
    static #EL = $.el('#search-suggestions');

    #highlightedSuggestion = null;
    #influencers = [];
    #limit = 0;
    #onSuggestionClick = () => { };
    #onSuggestionHighlight = () => { };
    #onSuggestionUnhighlight = () => { };
    #parsedQuery = '';
    #suggestionEls = [];

    constructor(options) {
        this.#influencers = options.influencers;
        this.#limit = options.limit;
        this.#registerEvents();
    }

    onSuccess(parsedQuery) {
        this.#influencers.forEach((i) => i.addItem(parsedQuery));
        this.#clearSuggestions();
    }

    setOnClick(callback) {
        this.#onSuggestionClick = callback;
    }

    setOnHighlight(callback) {
        this.#onSuggestionHighlight = callback;
    }

    setOnUnhighlight(callback) {
        this.#onSuggestionUnhighlight = callback;
    }

    suggest(parsedQuery) {
        this.#parsedQuery = parsedQuery;
        this.#highlightedSuggestion = null;

        if (!parsedQuery.query) {
            this.#clearSuggestions();
            return;
        }

        Promise.all(this.#getInfluencerSuggestions()).then(this.#setSuggestions);
    }

    #buildSuggestionsHtml(suggestions) {
        return suggestions.slice(0, this.#limit).reduce((acc, suggestion) => {
            const match = new RegExp($.escapeRegex(this.#parsedQuery.query), 'i');
            const matched = suggestion.match(match);

            const suggestionHtml = matched
                ? suggestion.replace(
                    match,
                    `
                <span class="${Suggester.#CN_SEARCH_SUGGESTION_MATCH}">
                  ${matched[0]}
                </span>
              `
                )
                : suggestion;

            return `
          ${acc}
          <li>
            <button
              ${Suggester.#ATTR_DATA_SUGGESTION}="${suggestion}"
              class=${Suggester.#CN_SEARCH_SUGGESTION}
              tabindex="-1"
              type="button"
            >
              ${suggestionHtml}
            </button>
          </li>
        `;
        }, '');
    }

    #clearSuggestionClickEvents() {
        this.#suggestionEls.forEach((el) =>
            el.removeEventListener('click', this.#onSuggestionClick)
        );
    }

    #clearSuggestionHighlightEvents() {
        this.#suggestionEls.forEach((el) => {
            el.removeEventListener('mouseover', this.#highlightSuggestion);
            el.removeEventListener('mouseout', this.#unhighlightSuggestion);
        });
    }

    #clearSuggestions() {
        $.bodyClassRemove(Suggester.#CN_SUGGESTIONS);
        this.#clearSuggestionHighlightEvents();
        this.#clearSuggestionClickEvents();
        Suggester.#EL.innerHTML = '';
        this.#highlightedSuggestion = null;
        this.#suggestionEls = [];
    }

    #focusNext(e) {
        const exists = this.#suggestionEls.some((el, i) => {
            if (el.classList.contains(Suggester.#CN_HIGHLIGHT)) {
                this.#highlightSuggestion(this.#suggestionEls[i + 1], e);
                return true;
            }
        });

        if (!exists) this.#highlightSuggestion(this.#suggestionEls[0], e);
    }

    #focusPrevious(e) {
        const exists = this.#suggestionEls.some((el, i) => {
            if (el.classList.contains(Suggester.#CN_HIGHLIGHT) && i) {
                this.#highlightSuggestion(this.#suggestionEls[i - 1], e);
                return true;
            }
        });

        if (!exists) this.#unhighlightSuggestion(e);
    }

    #getInfluencerSuggestions() {
        return this.#influencers.map((influencer) =>
            influencer.getSuggestions(this.#parsedQuery)
        );
    }

    #handleKeydown = (e) => {
        if ($.isDown(e)) this.#focusNext(e);
        if ($.isUp(e)) this.#focusPrevious(e);
    };

    #highlightSuggestion(el, e) {
        this.#unhighlightSuggestion();
        if (!el) return;

        this.#highlightedSuggestion = el.getAttribute(
            Suggester.#ATTR_DATA_SUGGESTION
        );

        this.#onSuggestionHighlight(this.#highlightedSuggestion);
        el.classList.add(Suggester.#CN_HIGHLIGHT);
        if (e) e.preventDefault();
    }

    #registerEvents() {
        document.addEventListener('keydown', this.#handleKeydown);
    }

    #registerSuggestionClickEvents() {
        this.#suggestionEls.forEach((el) =>
            el.addEventListener('click', () =>
                this.#onSuggestionClick(
                    el.getAttribute(Suggester.#ATTR_DATA_SUGGESTION)
                )
            )
        );
    }

    #registerSuggestionHighlightEvents() {
        const noHighlightUntilMouseMove = () => {
            window.removeEventListener('mousemove', noHighlightUntilMouseMove);

            this.#suggestionEls.forEach((el) => {
                el.addEventListener('mouseover', () => this.#highlightSuggestion(el));
                el.addEventListener('mouseout', this.#unhighlightSuggestion);
            });
        };

        window.addEventListener('mousemove', noHighlightUntilMouseMove);
    }

    #rehighlightSuggestion() {
        if (!this.#highlightedSuggestion) return;
        const attr = Suggester.#ATTR_DATA_SUGGESTION;
        const value = this.#highlightedSuggestion;
        this.#highlightSuggestion($.el(`[${attr}="${value}"]`));
    }

    #setSuggestions = (newSuggestions) => {
        const suggestions = $.flattenAndUnique(newSuggestions);
        Suggester.#EL.innerHTML = this.#buildSuggestionsHtml(suggestions);
        this.#suggestionEls = $.els(`.${Suggester.#CN_SEARCH_SUGGESTION}`);
        this.#registerSuggestionHighlightEvents();
        this.#registerSuggestionClickEvents();
        if (this.#suggestionEls.length) $.bodyClassAdd(Suggester.#CN_SUGGESTIONS);
        this.#rehighlightSuggestion();
    };

    #unhighlightSuggestion(e) {
        const el = $.el(`.${Suggester.#CN_HIGHLIGHT}`);
        if (!el) return;
        this.#onSuggestionUnhighlight();
        el.classList.remove(Suggester.#CN_HIGHLIGHT);
        if (e) e.preventDefault();
    }
}

class QueryParser {
    static #DEFAULT_PROTOCOL = 'http://';
    static #PROTOCOL_REGEX = /^[a-zA-Z]+:\/\//i;

    static #URL_REGEX =
        /^((https?:\/\/)?[\w-]+(\.[\w-]+)+\.?(:\d+)?(\/\S*)?)$/i;

    #commands = [];
    #pathDelimiter = '/';
    #scripts = {};
    #searchDelimiter = "'";

    constructor(options) {
        this.#commands = options.commands;
        this.#searchDelimiter = options.searchDelimiter;
        this.#pathDelimiter = options.pathDelimiter;
        this.#scripts = options.scripts;
    }

    parse = (query) => {
        const res = [];
        res.raw = query.trim();
        res.query = res.raw;
        res.lower = res.raw.toLowerCase();
        res.split = null;

        if (QueryParser.#URL_REGEX.test(query)) {
            const hasProtocol = QueryParser.#PROTOCOL_REGEX.test(query);

            res.redirect = hasProtocol
                ? query
                : QueryParser.#DEFAULT_PROTOCOL + query;

            res.color = QueryParser.#getColorFromUrl(this.#commands, res.redirect);
            return res;
        }

        const splitSearch = res.query.split(this.#searchDelimiter);
        const splitPath = res.query.split(this.#pathDelimiter);

        const isScript = Object.entries(this.#scripts).some(([key, script]) => {
            if (query === key) {
                res.key = key;
                res.isKey = true;
                script.forEach((command) => res.push(this.parse(command)));
                return true;
            }

            if (splitSearch[0] === key) {
                res.key = key;
                res.isSearch = true;
                res.split = this.#searchDelimiter;
                res.query = QueryParser.#shiftAndTrim(splitSearch, res.split);
                res.lower = res.query.toLowerCase();

                script.forEach((command) =>
                    res.push(this.parse(`${command}${res.split}${res.query}`))
                );

                return true;
            }

            if (splitPath[0] === key) {
                res.key = key;
                res.isPath = true;
                res.split = this.#pathDelimiter;
                res.path = QueryParser.#shiftAndTrim(splitPath, res.split);

                script.forEach((command) =>
                    res.push(this.parse(`${command}${this.#pathDelimiter}${res.path}`))
                );

                return true;
            }
        });

        if (isScript) return res;

        this.#commands.some(({ key, search, url }) => {
            if (query === key) {
                res.key = key;
                res.isKey = true;
                res.redirect = url;
                return true;
            }

            if (splitSearch[0] === key) {
                res.key = key;
                res.isSearch = true;
                res.split = this.#searchDelimiter;
                res.query = QueryParser.#shiftAndTrim(splitSearch, res.split);
                res.lower = res.query.toLowerCase();
                res.redirect = QueryParser.#prepSearch(url, search, res.query);
                return true;
            }

            if (splitPath[0] === key) {
                res.key = key;
                res.isPath = true;
                res.split = this.#pathDelimiter;
                res.path = QueryParser.#shiftAndTrim(splitPath, res.split);
                res.redirect = QueryParser.#prepPath(url, res.path);
                return true;
            }

            if (key === '*') {
                res.redirect = QueryParser.#prepSearch(url, search, query);
            }
        });

        res.color = QueryParser.#getColorFromUrl(this.#commands, res.redirect);
        return res;
    };

    static #getColorFromUrl(commands, url) {
        const domain = new URL(url).hostname;
        const domainRegex = new RegExp(`${domain}$`);

        return commands.find((c) => domainRegex.test(new URL(c.url).hostname))
            ?.color;
    }

    static #prepPath(url, path) {
        return QueryParser.#stripUrlPath(url) + '/' + path;
    }

    static #prepSearch(url, searchPath, query) {
        if (!searchPath) return url;
        const baseUrl = QueryParser.#stripUrlPath(url);
        const urlQuery = encodeURIComponent(query);
        searchPath = searchPath.replace(/{}/g, urlQuery);
        return baseUrl + searchPath;
    }

    static #shiftAndTrim(arr, delimiter) {
        arr.shift();
        return arr.join(delimiter).trim();
    }

    static #stripUrlPath(url) {
        const parser = document.createElement('a');
        parser.href = url;
        return `${parser.protocol}//${parser.hostname}`;
    }
}

class Form {
    static #CL_COLOR = 'color';
    static #CL_FORM = 'form';
    static #EL_FORM = $.el('#search-input');
    static #EL_INPUT = $.el('#search-form');
    static #URL_PARAM_Q = 'q';

    #helpKey = '?';
    #instantRedirect = false;
    #toggleHelp = () => { };
    #inputValue = '';
    #suggester;
    #parseQuery = () => { };
    #newTab = false;

    constructor(options) {
        this.#helpKey = options.helpKey;
        this.#instantRedirect = options.instantRedirect;
        this.#newTab = options.newTab;
        this.#parseQuery = options.parseQuery;
        this.#suggester = options.suggester;
        this.#toggleHelp = options.toggleHelp;
        this.#registerEvents();
        this.#loadQueryParam();
    }

    hide() {
        $.bodyClassRemove(Form.#CL_FORM);
        Form.#EL_FORM.value = '';
        this.#inputValue = '';
        this.#suggester.suggest('');
        this.#setColorsFromQuery('');
    }

    show() {
        $.bodyClassAdd(Form.#CL_FORM);
        Form.#EL_FORM.focus();
    }

    #clearPreview = () => {
        this.#previewValue(this.#inputValue);
        Form.#EL_FORM.focus();
    };

    #handleInput = () => {
        const newQuery = Form.#EL_FORM.value;
        const isHelp = newQuery === this.#helpKey;
        const parsedQuery = this.#parseQuery(newQuery);
        this.#inputValue = newQuery;
        this.#suggester.suggest(parsedQuery);
        this.#setColorsFromQuery(newQuery);
        if (!newQuery || isHelp) this.hide();
        if (isHelp) this.#toggleHelp();

        if (this.#instantRedirect && parsedQuery.isKey) {
            this.#submitWithValue(newQuery);
        }
    };

    #handleKeydown = (e) => {
        if (
            $.isDown(e) ||
            $.isModifier(e) ||
            $.isRemove(e) ||
            $.isUp(e) ||
            e.ctrlKey ||
            e.metaKey
        ) {
            return;
        }

        if ($.isEscape(e)) {
            this.hide();
            return;
        }

        this.show();
    };

    #loadQueryParam() {
        const q = new URLSearchParams(window.location.search).get(
            Form.#URL_PARAM_Q
        );

        if (q) this.#submitWithValue(q);
    }

    #previewValue = (value) => {
        Form.#EL_FORM.value = value;
        this.#setColorsFromQuery(value);
    };

    #redirect(redirect, forceNewTab) {
        if (this.#newTab || forceNewTab) {
            window.open(redirect, '_blank', 'noopener noreferrer');
        } else {
            window.location.href = redirect;
        }
    }

    #registerEvents() {
        document.addEventListener('keydown', this.#handleKeydown);
        Form.#EL_FORM.addEventListener('input', this.#handleInput);
        Form.#EL_INPUT.addEventListener('submit', this.#submitForm, false);

        if (this.#suggester) {
            this.#suggester.setOnClick(this.#submitWithValue);
            this.#suggester.setOnHighlight(this.#previewValue);
            this.#suggester.setOnUnhighlight(this.#clearPreview);
        }
    }

    #setColorsFromQuery(query) {
        const { color } = this.#parseQuery(query);

        if (color) {
            Form.#EL_INPUT.style.background = color;
            $.bodyClassAdd(Form.#CL_COLOR);
        } else {
            Form.#EL_INPUT.style.background = '';
            $.bodyClassRemove(Form.#CL_COLOR);
        }
    }

    #submitForm = (e) => {
        if (e) e.preventDefault();
        const parsedQuery = this.#parseQuery(Form.#EL_FORM.value);

        if (parsedQuery.length) {
            parsedQuery.forEach((r) => this.#redirect(r.redirect, true));
        } else {
            this.#redirect(parsedQuery.redirect);
        }

        this.#suggester.onSuccess(parsedQuery);
        this.hide();
    };

    #submitWithValue = (value) => {
        Form.#EL_FORM.value = value;
        this.#submitForm();
    };
}

class CommandFormatter {
    static #CSS_VAR_COMMAND_COLOR_LIGHTNESS = 'var(--command-color-lightness)';

    static #CSS_VAR_COMMAND_COLOR_SATURATION =
        'var(--command-color-saturation)';

    static format(commands) {
        return commands.map((command) => {
            if (command.color || !command.name) return command;
            command.color = CommandFormatter.#huesToGradient(command.hues);
            return command;
        });
    }

    static #huesToGradient(hues) {
        if (!Array.isArray(hues) || !hues.length) {
            return CommandFormatter.#hsla(0, '0%');
        }

        if (hues.length === 1) {
            return CommandFormatter.#hsla(hues[0]);
        }

        const c = hues.reduce((a, h) => `${a}, ${CommandFormatter.#hsla(h)}`, '');
        return `linear-gradient(135deg ${c})`;
    }

    static #hsla(
        hue,
        saturation = CommandFormatter.#CSS_VAR_COMMAND_COLOR_SATURATION
    ) {
        const lightness = CommandFormatter.#CSS_VAR_COMMAND_COLOR_LIGHTNESS;
        return `hsla(${hue}, ${saturation}, ${lightness}, 1)`;
    }
}

(() => {
    $.bodyClassAdd(CONFIG.theme);
    const commands = CommandFormatter.format(CONFIG.commands);
    const help = new Help({ commands, newTab: CONFIG.queryNewTab });

    const form = new Form({
        helpKey: CONFIG.helpKey,
        instantRedirect: CONFIG.queryInstantRedirect,
        newTab: CONFIG.queryNewTab,
        parseQuery: new QueryParser({
            commands,
            pathDelimiter: CONFIG.queryPathDelimiter,
            scripts: CONFIG.scripts,
            searchDelimiter: CONFIG.querySearchDelimiter,
        }).parse,
        suggester: new Suggester({
            influencers: CONFIG.suggestionInfluencers.map(
                (influencerConfig) =>
                    new {
                        Default: DefaultInfluencer,
                        DuckDuckGo: DuckDuckGoInfluencer,
                        History: HistoryInfluencer,
                    }[influencerConfig.name]({
                        limit: influencerConfig.limit,
                        minChars: influencerConfig.minChars,
                        suggestionDefaults: CONFIG.suggestionDefaults,
                    })
            ),
            limit: CONFIG.suggestionLimit,
        }),
        toggleHelp: help.toggle,
    });

    new Clock({
        amPm: CONFIG.clockShowAmPm,
        delimiter: CONFIG.clockDelimiter,
        onClick: CONFIG.clockOnClickAction === 'Search' ? form.show : help.toggle,
        showSeconds: CONFIG.clockShowSeconds,
        timeZone: CONFIG.clockTimeZone,
        twentyFourHour: CONFIG.clockTwentyFourHour,
    });
})();