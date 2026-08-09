'use strict';

globalThis.TildeSettings = (() => {
    const STORAGE_KEY = 'tilde.settings.v1';
    const VERSION = 1;

    const CLOCK_ACTIONS = ['Help', 'Search'];
    const DENSITIES = ['compact', 'default', 'spacious'];
    const INFLUENCERS = ['Default', 'History', 'DuckDuckGo'];
    const THEMES = [
        'ashes-dark',
        'gruvbox-dark',
        'lovelace-dark',
        'nord-dark',
        'ocean-light',
        'tilde-dark',
        'tokyo-dark',
    ];

    const THEME_CLASSES = THEMES;
    const DENSITY_CLASSES = DENSITIES
        .filter((density) => density !== 'default')
        .map((density) => `density-${density}`);

    class ValidationError extends Error {
        constructor(errors) {
            super(errors.join('\n'));
            this.name = 'ValidationError';
            this.errors = errors;
        }
    }

    const clone = (value) => JSON.parse(JSON.stringify(value));

    const hasOwn = (object, key) =>
        Object.prototype.hasOwnProperty.call(object || {}, key);

    const escapeHtml = (value) =>
        String(value ?? '').replace(/[&<>"']/g, (char) => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;',
        })[char]);

    const option = (value, selected, label = value) => `
        <option value="${escapeHtml(value)}"${value === selected ? ' selected' : ''}>
            ${escapeHtml(label)}
        </option>
    `;

    const checked = (value) => (value ? ' checked' : '');

    const qs = (selector, root = document) => root.querySelector(selector);

    const qsa = (selector, root = document) =>
        [].slice.call(root.querySelectorAll(selector) || []);

    const toStringValue = (value) => String(value ?? '').trim();

    const toBoolean = (value) => Boolean(value);

    const toNonNegativeInteger = (value, fallback = 0) => {
        const number = Number(value);
        return Number.isInteger(number) && number >= 0 ? number : fallback;
    };

    const parseListText = (value) =>
        String(value ?? '')
            .split(/\r?\n/)
            .map((item) => item.trim())
            .filter(Boolean);

    const formatListText = (value) =>
        Array.isArray(value) ? value.join('\n') : '';

    const normalizeHues = (value) => {
        if (Array.isArray(value)) {
            return value.map(toStringValue).filter(Boolean);
        }

        return String(value ?? '')
            .split(/[,\s]+/)
            .map((hue) => hue.trim())
            .filter(Boolean);
    };

    const formatHues = (value) => normalizeHues(value).join(', ');

    const normalizeStringArrayMap = (source) => {
        if (!source || typeof source !== 'object' || Array.isArray(source)) {
            return {};
        }

        return Object.entries(source).reduce((acc, [key, values]) => {
            const normalizedKey = toStringValue(key);
            if (!normalizedKey) return acc;

            acc[normalizedKey] = Array.isArray(values)
                ? values.map(toStringValue).filter(Boolean)
                : parseListText(values);

            return acc;
        }, {});
    };

    const normalizeInfluencers = (source) => {
        if (!Array.isArray(source)) return [];

        return source.map((influencer) => ({
            name: toStringValue(influencer?.name),
            limit: toNonNegativeInteger(influencer?.limit),
            minChars: toNonNegativeInteger(influencer?.minChars),
        }));
    };

    const normalizeCommands = (source) => {
        if (!Array.isArray(source)) return [];

        return source.map((command) => ({
            key: toStringValue(command?.key),
            name: toStringValue(command?.name),
            url: toStringValue(command?.url),
            search: toStringValue(command?.search),
            hues: normalizeHues(command?.hues),
            color: toStringValue(command?.color),
        }));
    };

    const normalizeSettings = (settings) => ({
        version: VERSION,
        theme: THEMES.includes(settings?.theme) ? settings.theme : THEMES[0],
        density: DENSITIES.includes(settings?.density)
            ? settings.density
            : 'default',
        clockOnClickAction: CLOCK_ACTIONS.includes(settings?.clockOnClickAction)
            ? settings.clockOnClickAction
            : 'Help',
        clockDelimiter: String(settings?.clockDelimiter ?? ':'),
        clockShowSeconds: toBoolean(settings?.clockShowSeconds),
        clockShowAmPm: toBoolean(settings?.clockShowAmPm),
        clockTwentyFourHour: toBoolean(settings?.clockTwentyFourHour),
        clockTimeZone: toStringValue(settings?.clockTimeZone),
        helpKey: String(settings?.helpKey ?? '/'),
        queryInstantRedirect: toBoolean(settings?.queryInstantRedirect),
        queryNewTab: toBoolean(settings?.queryNewTab),
        queryPathDelimiter: String(settings?.queryPathDelimiter ?? '/'),
        querySearchDelimiter: String(settings?.querySearchDelimiter ?? "'"),
        scripts: normalizeStringArrayMap(settings?.scripts),
        suggestionInfluencers: normalizeInfluencers(settings?.suggestionInfluencers),
        suggestionLimit: toNonNegativeInteger(settings?.suggestionLimit),
        suggestionDefaults: normalizeStringArrayMap(settings?.suggestionDefaults),
        commands: normalizeCommands(settings?.commands),
    });

    const configToSettings = (config) =>
        normalizeSettings({
            version: VERSION,
            theme: config.theme,
            density: config.density || 'default',
            clockOnClickAction: config.clockOnClickAction,
            clockDelimiter: config.clockDelimiter,
            clockShowSeconds: config.clockShowSeconds,
            clockShowAmPm: config.clockShowAmPm,
            clockTwentyFourHour: config.clockTwentyFourHour,
            clockTimeZone: config.clockTimeZone || '',
            helpKey: config.helpKey,
            queryInstantRedirect: config.queryInstantRedirect,
            queryNewTab: config.queryNewTab,
            queryPathDelimiter: config.queryPathDelimiter,
            querySearchDelimiter: config.querySearchDelimiter,
            scripts: config.scripts,
            suggestionInfluencers: config.suggestionInfluencers,
            suggestionLimit: config.suggestionLimit,
            suggestionDefaults: config.suggestionDefaults,
            commands: config.commands,
        });

    const mergeSettings = (defaults, overrides) => {
        const result = clone(defaults);
        if (!overrides || typeof overrides !== 'object') return result;

        Object.keys(result).forEach((key) => {
            if (hasOwn(overrides, key)) {
                result[key] = clone(overrides[key]);
            }
        });

        return result;
    };

    const settingsToRuntimeConfig = (settings) => {
        const normalized = normalizeSettings(settings);
        const runtime = clone(normalized);
        delete runtime.version;
        runtime.clockTimeZone = runtime.clockTimeZone || undefined;
        return runtime;
    };

    const isNonNegativeInteger = (value) => {
        if (value === '') return false;
        const number = Number(value);
        return Number.isInteger(number) && number >= 0;
    };

    const isHttpUrl = (value) => {
        try {
            const url = new URL(value);
            return ['http:', 'https:'].includes(url.protocol);
        } catch (_error) {
            return false;
        }
    };

    const isValidTimeZone = (value) => {
        if (!toStringValue(value)) return true;

        try {
            new Intl.DateTimeFormat('en-US', { timeZone: value }).format(
                new Date()
            );
            return true;
        } catch (_error) {
            return false;
        }
    };

    const findDuplicates = (values) => {
        const seen = new Set();
        const duplicates = new Set();

        values.forEach((value) => {
            if (!value) return;
            if (seen.has(value)) duplicates.add(value);
            else seen.add(value);
        });

        return [...duplicates];
    };

    const validateSettings = (settings) => {
        const errors = [];

        if (settings?.version !== VERSION) {
            errors.push(`Settings version must be ${VERSION}.`);
        }

        if (!THEMES.includes(settings?.theme)) {
            errors.push('Theme must be one of the preset themes.');
        }

        if (!DENSITIES.includes(settings?.density)) {
            errors.push('Density must be compact, default, or spacious.');
        }

        if (!CLOCK_ACTIONS.includes(settings?.clockOnClickAction)) {
            errors.push('Clock click action must be Help or Search.');
        }

        if (!isValidTimeZone(settings?.clockTimeZone)) {
            errors.push('Clock timezone must be a valid IANA timezone.');
        }

        [
            ['helpKey', 'Help key'],
            ['queryPathDelimiter', 'Path delimiter'],
            ['querySearchDelimiter', 'Search delimiter'],
        ].forEach(([key, label]) => {
            if (!String(settings?.[key] ?? '')) {
                errors.push(`${label} cannot be empty.`);
            }
        });

        if (!isNonNegativeInteger(settings?.suggestionLimit)) {
            errors.push('Suggestion limit must be a non-negative integer.');
        }

        if (!Array.isArray(settings?.suggestionInfluencers)) {
            errors.push('Suggestion influencers must be a list.');
        } else {
            const influencerNames = settings.suggestionInfluencers.map(
                (influencer) => influencer.name
            );

            findDuplicates(influencerNames).forEach((name) =>
                errors.push(`Suggestion influencer "${name}" is duplicated.`)
            );

            settings.suggestionInfluencers.forEach((influencer, index) => {
                if (!INFLUENCERS.includes(influencer.name)) {
                    errors.push(`Suggestion influencer ${index + 1} is invalid.`);
                }

                if (!isNonNegativeInteger(influencer.limit)) {
                    errors.push(
                        `Suggestion influencer ${index + 1} limit must be a non-negative integer.`
                    );
                }

                if (!isNonNegativeInteger(influencer.minChars)) {
                    errors.push(
                        `Suggestion influencer ${index + 1} minimum characters must be a non-negative integer.`
                    );
                }
            });
        }

        if (!Array.isArray(settings?.commands)) {
            errors.push('Commands must be a list.');
        } else {
            const commandKeys = settings.commands.map((command) =>
                toStringValue(command.key)
            );

            findDuplicates(commandKeys).forEach((key) =>
                errors.push(`Command key "${key}" is duplicated.`)
            );

            if (!commandKeys.includes('*')) {
                errors.push('Commands must include the "*" fallback command.');
            }

            settings.commands.forEach((command, index) => {
                const label = command.key || `#${index + 1}`;

                if (!toStringValue(command.key)) {
                    errors.push(`Command ${index + 1} must have a key.`);
                }

                if (!isHttpUrl(command.url)) {
                    errors.push(`Command "${label}" must have an http(s) URL.`);
                }

                normalizeHues(command.hues).forEach((hue) => {
                    const number = Number(hue);
                    if (!Number.isInteger(number) || number < 0 || number > 359) {
                        errors.push(
                            `Command "${label}" hue "${hue}" must be an integer from 0 to 359.`
                        );
                    }
                });
            });
        }

        if (
            !settings?.scripts ||
            typeof settings.scripts !== 'object' ||
            Array.isArray(settings.scripts)
        ) {
            errors.push('Scripts must be an object.');
        } else {
            Object.entries(settings.scripts).forEach(([key, commands]) => {
                if (!toStringValue(key)) {
                    errors.push('Script keys cannot be empty.');
                }

                if (!Array.isArray(commands)) {
                    errors.push(`Script "${key}" commands must be a list.`);
                }
            });
        }

        if (
            !settings?.suggestionDefaults ||
            typeof settings.suggestionDefaults !== 'object' ||
            Array.isArray(settings.suggestionDefaults)
        ) {
            errors.push('Default suggestions must be an object.');
        } else {
            Object.entries(settings.suggestionDefaults).forEach(
                ([key, suggestions]) => {
                    if (!toStringValue(key)) {
                        errors.push('Default suggestion keys cannot be empty.');
                    }

                    if (!Array.isArray(suggestions)) {
                        errors.push(
                            `Default suggestions for "${key}" must be a list.`
                        );
                    }
                }
            );
        }

        return errors;
    };

    const createStore = (config, storage = localStorage) => {
        const defaults = configToSettings(config);

        return {
            loadError: null,

            getDefaultSettings() {
                return clone(defaults);
            },

            load() {
                const raw = storage.getItem(STORAGE_KEY);
                this.loadError = null;

                if (!raw) return clone(defaults);

                try {
                    const parsed = JSON.parse(raw);
                    const merged = mergeSettings(defaults, parsed);
                    const errors = validateSettings(merged);
                    if (errors.length) throw new ValidationError(errors);
                    return normalizeSettings(merged);
                } catch (error) {
                    this.loadError = error;
                    return clone(defaults);
                }
            },

            save(settings) {
                const merged = mergeSettings(defaults, settings);
                const errors = validateSettings(merged);
                if (errors.length) throw new ValidationError(errors);

                const normalized = normalizeSettings(merged);
                storage.setItem(STORAGE_KEY, JSON.stringify(normalized, null, 2));
                this.loadError = null;

                return normalized;
            },

            reset() {
                storage.removeItem(STORAGE_KEY);
                this.loadError = null;
            },

            export(settings) {
                return JSON.stringify(normalizeSettings(settings), null, 2);
            },

            import(raw) {
                let parsed;

                try {
                    parsed = JSON.parse(raw);
                } catch (_error) {
                    throw new ValidationError(['Imported settings must be valid JSON.']);
                }

                return this.save(parsed);
            },

            validate(settings) {
                return validateSettings(mergeSettings(defaults, settings));
            },

            toRuntimeConfig(settings) {
                return settingsToRuntimeConfig(settings);
            },
        };
    };

    const applyBodyClasses = (settings, body = document.body) => {
        const normalized = normalizeSettings(settings);

        body.classList.remove(...THEME_CLASSES, ...DENSITY_CLASSES);
        body.classList.add(normalized.theme);

        if (normalized.density !== 'default') {
            body.classList.add(`density-${normalized.density}`);
        }
    };

    class SettingsPanel {
        #activeTab = 'appearance';
        #el = null;
        #resetPending = false;
        #settings = null;
        #store = null;

        constructor(options) {
            this.#store = options.store;
            this.#settings = clone(options.settings);
            this.#el = qs('#settings');

            if (!this.#el) return;

            this.#render();
            this.#registerEvents();
        }

        isOpen() {
            return document.body.classList.contains('settings');
        }

        show = () => {
            this.#settings = this.#store.load();
            this.#render();
            this.#setVisible(true);
        };

        hide = () => {
            this.#setVisible(false);
            applyBodyClasses(this.#settings);
        };

        #setVisible(show) {
            this.#el.setAttribute('aria-hidden', show ? 'false' : 'true');
            document.body.classList.toggle('settings', show);

            if (show) {
                document.body.classList.remove('form', 'help', 'suggestions', 'color');
                const firstField = qs('input, select, textarea, button', this.#el);
                if (firstField) firstField.focus();
            }
        }

        #registerEvents() {
            document.addEventListener('keydown', this.#handleKeydown);
            this.#el.addEventListener('click', this.#handleClick);
            this.#el.addEventListener('input', this.#handlePreview);
            this.#el.addEventListener('change', this.#handlePreview);
            this.#el.addEventListener('submit', this.#handleSubmit);
        }

        #handleKeydown = (event) => {
            if (event.ctrlKey && event.key === '/') {
                event.preventDefault();
                this.show();
                return;
            }

            if (this.isOpen() && event.key === 'Escape') {
                event.preventDefault();
                this.hide();
            }
        };

        #handleClick = (event) => {
            const button = event.target.closest('[data-settings-action]');
            if (!button || !this.#el.contains(button)) return;

            event.preventDefault();
            this.#handleAction(button);
        };

        #handlePreview = (event) => {
            if (!['theme', 'density'].includes(event.target.name)) return;
            applyBodyClasses(this.#collectForm().settings);
        };

        #handleSubmit = (event) => {
            event.preventDefault();
            this.#clearResetConfirmation();
            this.#save();
        };

        #handleAction(button) {
            const action = button.dataset.settingsAction;
            const index = Number(button.dataset.index);

            if (action !== 'reset') this.#clearResetConfirmation();

            if (action === 'close') this.hide();
            if (action === 'tab') this.#setTab(button.dataset.settingsTab);
            if (action === 'reset') this.#reset(button);
            if (action === 'export') this.#export();
            if (action === 'import') this.#import();
            if (action === 'add-command') this.#addCommand();
            if (action === 'remove-command') this.#removeCommand(index);
            if (action === 'move-command-up') this.#moveCommand(index, -1);
            if (action === 'move-command-down') this.#moveCommand(index, 1);
            if (action === 'add-influencer') this.#addInfluencer();
            if (action === 'remove-influencer') this.#removeInfluencer(index);
            if (action === 'move-influencer-up') this.#moveInfluencer(index, -1);
            if (action === 'move-influencer-down') this.#moveInfluencer(index, 1);
            if (action === 'add-script') this.#addScript();
            if (action === 'remove-script') this.#removeScript(index);
            if (action === 'add-default-suggestion') this.#addDefaultSuggestion();
            if (action === 'remove-default-suggestion') {
                this.#removeDefaultSuggestion(index);
            }
        }

        #save() {
            const collected = this.#collectForm();
            const errors = collected.errors.concat(
                this.#store.validate(collected.settings)
            );

            if (errors.length) {
                this.#setStatus(errors, 'error');
                return;
            }

            try {
                this.#store.save(collected.settings);
                this.#setStatus(['Saved. Reloading.'], 'success');
                globalThis.location.reload();
            } catch (error) {
                this.#setStatus(error.errors || [error.message], 'error');
            }
        }

        #reset(button) {
            if (!this.#resetPending) {
                this.#resetPending = true;
                button.textContent = 'Confirm Reset';
                button.classList.add('settings-danger');
                this.#setStatus(['Click Confirm Reset to discard local settings.']);
                return;
            }

            this.#store.reset();
            globalThis.location.reload();
        }

        #clearResetConfirmation() {
            if (!this.#resetPending) return;

            this.#resetPending = false;
            const button = qs('[data-settings-action="reset"]', this.#el);

            if (button) {
                button.textContent = 'Reset';
                button.classList.remove('settings-danger');
            }

            const status = qs('#settings-status', this.#el);
            if (
                status &&
                status.textContent === 'Click Confirm Reset to discard local settings.'
            ) {
                status.textContent = '';
            }
        }

        #export() {
            const collected = this.#collectForm();
            const textarea = qs('[name="settings-json"]', this.#el);
            textarea.value = this.#store.export(collected.settings);
            textarea.focus();
            textarea.select();
        }

        #import() {
            const textarea = qs('[name="settings-json"]', this.#el);

            try {
                this.#store.import(textarea.value);
                this.#setStatus(['Imported. Reloading.'], 'success');
                globalThis.location.reload();
            } catch (error) {
                this.#setStatus(error.errors || [error.message], 'error');
            }
        }

        #addCommand() {
            const collected = this.#collectForm();
            collected.settings.commands.push({
                key: '',
                name: '',
                url: '',
                search: '',
                hues: [],
                color: '',
            });
            this.#rerender(collected.settings, 'shortcuts');
        }

        #removeCommand(index) {
            const collected = this.#collectForm();
            collected.settings.commands.splice(index, 1);
            this.#rerender(collected.settings, 'shortcuts');
        }

        #moveCommand(index, direction) {
            const collected = this.#collectForm();
            this.#move(collected.settings.commands, index, direction);
            this.#rerender(collected.settings, 'shortcuts');
        }

        #addInfluencer() {
            const collected = this.#collectForm();
            const used = new Set(
                collected.settings.suggestionInfluencers.map(({ name }) => name)
            );
            const name = INFLUENCERS.find((item) => !used.has(item)) || INFLUENCERS[0];

            collected.settings.suggestionInfluencers.push({
                name,
                limit: 4,
                minChars: name === 'Default' ? 0 : 1,
            });
            this.#rerender(collected.settings, 'suggestions');
        }

        #removeInfluencer(index) {
            const collected = this.#collectForm();
            collected.settings.suggestionInfluencers.splice(index, 1);
            this.#rerender(collected.settings, 'suggestions');
        }

        #moveInfluencer(index, direction) {
            const collected = this.#collectForm();
            this.#move(collected.settings.suggestionInfluencers, index, direction);
            this.#rerender(collected.settings, 'suggestions');
        }

        #addScript() {
            const collected = this.#collectForm();
            collected.scriptRows.push({ key: '', commands: [] });
            this.#rerenderWithRows(collected, 'data');
        }

        #removeScript(index) {
            const collected = this.#collectForm();
            collected.scriptRows.splice(index, 1);
            this.#rerenderWithRows(collected, 'data');
        }

        #addDefaultSuggestion() {
            const collected = this.#collectForm();
            collected.defaultSuggestionRows.push({ key: '', suggestions: [] });
            this.#rerenderWithRows(collected, 'suggestions');
        }

        #removeDefaultSuggestion(index) {
            const collected = this.#collectForm();
            collected.defaultSuggestionRows.splice(index, 1);
            this.#rerenderWithRows(collected, 'suggestions');
        }

        #move(items, index, direction) {
            const nextIndex = index + direction;
            if (nextIndex < 0 || nextIndex >= items.length) return;
            const [item] = items.splice(index, 1);
            items.splice(nextIndex, 0, item);
        }

        #setTab(tab) {
            this.#activeTab = tab;
            this.#activateTab();
        }

        #rerender(settings, tab) {
            this.#settings = settings;
            this.#activeTab = tab;
            this.#render();
            applyBodyClasses(settings);
        }

        #rerenderWithRows(collected, tab) {
            collected.settings.scripts = this.#rowsToMap(
                collected.scriptRows,
                'commands'
            );
            collected.settings.suggestionDefaults = this.#rowsToMap(
                collected.defaultSuggestionRows,
                'suggestions'
            );
            this.#rerender(collected.settings, tab);
        }

        #rowsToMap(rows, valueKey) {
            return rows.reduce((acc, row) => {
                acc[row.key] = row[valueKey];
                return acc;
            }, {});
        }

        #collectForm() {
            const form = qs('#settings-form', this.#el);
            const errors = [];

            if (!form) {
                return {
                    defaultSuggestionRows: this.#defaultSuggestionRows(this.#settings),
                    errors,
                    scriptRows: this.#scriptRows(this.#settings),
                    settings: clone(this.#settings),
                };
            }

            const commandRows = qsa('[data-command-row]', form).map((row) => ({
                key: this.#field(row, 'command-key'),
                name: this.#field(row, 'command-name'),
                url: this.#field(row, 'command-url'),
                search: this.#field(row, 'command-search'),
                hues: normalizeHues(this.#field(row, 'command-hues')),
                color: this.#field(row, 'command-color'),
            }));

            const influencerRows = qsa('[data-influencer-row]', form).map((row) => ({
                name: this.#field(row, 'influencer-name'),
                limit: this.#field(row, 'influencer-limit'),
                minChars: this.#field(row, 'influencer-min-chars'),
            }));

            const scriptRows = qsa('[data-script-row]', form).map((row) => ({
                key: this.#field(row, 'script-key'),
                commands: parseListText(this.#field(row, 'script-commands')),
            }));

            const defaultSuggestionRows = qsa('[data-default-suggestion-row]', form).map(
                (row) => ({
                    key: this.#field(row, 'default-suggestion-key'),
                    suggestions: parseListText(this.#field(row, 'default-suggestions')),
                })
            );

            findDuplicates(scriptRows.map(({ key }) => key)).forEach((key) =>
                errors.push(`Script key "${key}" is duplicated.`)
            );

            scriptRows.forEach((row, index) => {
                if (!row.key) errors.push(`Script ${index + 1} must have a key.`);
            });

            findDuplicates(defaultSuggestionRows.map(({ key }) => key)).forEach((key) =>
                errors.push(`Default suggestion key "${key}" is duplicated.`)
            );

            defaultSuggestionRows.forEach((row, index) => {
                if (!row.key) {
                    errors.push(`Default suggestion ${index + 1} must have a key.`);
                }
            });

            return {
                defaultSuggestionRows,
                errors,
                scriptRows,
                settings: {
                    version: VERSION,
                    theme: this.#formField(form, 'theme'),
                    density: this.#formField(form, 'density'),
                    clockOnClickAction: this.#formField(form, 'clockOnClickAction'),
                    clockDelimiter: this.#formField(form, 'clockDelimiter'),
                    clockShowSeconds: this.#formChecked(form, 'clockShowSeconds'),
                    clockShowAmPm: this.#formChecked(form, 'clockShowAmPm'),
                    clockTwentyFourHour: this.#formChecked(
                        form,
                        'clockTwentyFourHour'
                    ),
                    clockTimeZone: this.#formField(form, 'clockTimeZone'),
                    helpKey: this.#formField(form, 'helpKey'),
                    queryInstantRedirect: this.#formChecked(
                        form,
                        'queryInstantRedirect'
                    ),
                    queryNewTab: this.#formChecked(form, 'queryNewTab'),
                    queryPathDelimiter: this.#formField(form, 'queryPathDelimiter'),
                    querySearchDelimiter: this.#formField(form, 'querySearchDelimiter'),
                    scripts: this.#rowsToMap(scriptRows, 'commands'),
                    suggestionInfluencers: influencerRows,
                    suggestionLimit: this.#formField(form, 'suggestionLimit'),
                    suggestionDefaults: this.#rowsToMap(
                        defaultSuggestionRows,
                        'suggestions'
                    ),
                    commands: commandRows,
                },
            };
        }

        #formField(form, name) {
            return form.elements[name]?.value ?? '';
        }

        #formChecked(form, name) {
            return Boolean(form.elements[name]?.checked);
        }

        #field(root, name) {
            return qs(`[name="${name}"]`, root)?.value ?? '';
        }

        #setStatus(messages, type = 'neutral') {
            const status = qs('#settings-status', this.#el);
            if (!status) return;

            status.className = `settings-status settings-status-${type}`;
            status.textContent = messages.join('\n');
        }

        #render() {
            const scriptRows = this.#scriptRows(this.#settings);
            const defaultSuggestionRows = this.#defaultSuggestionRows(this.#settings);

            this.#el.innerHTML = `
                <div class="settings-panel" role="dialog" aria-modal="true" aria-labelledby="settings-title">
                    <header class="settings-header">
                        <h1 id="settings-title">Settings</h1>
                        <button type="button" class="settings-button" data-settings-action="close">Close</button>
                    </header>
                    <form id="settings-form" class="settings-form">
                        <nav class="settings-tabs" aria-label="Settings sections">
                            ${this.#renderTabs()}
                        </nav>
                        ${this.#renderAppearanceSection()}
                        ${this.#renderShortcutsSection()}
                        ${this.#renderClockSection()}
                        ${this.#renderSearchSection()}
                        ${this.#renderSuggestionsSection(defaultSuggestionRows)}
                        ${this.#renderDataSection(scriptRows)}
                        <footer class="settings-footer">
                            <button type="submit" class="settings-button settings-primary">Save</button>
                            <button type="button" class="settings-button" data-settings-action="reset">Reset</button>
                            <div aria-live="polite" class="settings-status" id="settings-status"></div>
                        </footer>
                    </form>
                </div>
            `;

            this.#activateTab();

            if (this.#store.loadError) {
                this.#setStatus(
                    ['Stored settings were ignored. Save or reset to replace them.'],
                    'error'
                );
            }
        }

        #renderTabs() {
            return [
                ['appearance', 'Appearance'],
                ['shortcuts', 'Shortcuts'],
                ['clock', 'Clock'],
                ['search', 'Search'],
                ['suggestions', 'Suggestions'],
                ['data', 'Data'],
            ]
                .map(([tab, label]) => `
                    <button
                        type="button"
                        class="settings-tab"
                        data-settings-tab="${tab}"
                        data-settings-action="tab"
                    >
                        ${label}
                    </button>
                `)
                .join('');
        }

        #activateTab() {
            qsa('[data-settings-tab]', this.#el).forEach((tab) => {
                const active = tab.dataset.settingsTab === this.#activeTab;
                tab.classList.toggle('active', active);
                tab.setAttribute('aria-selected', active ? 'true' : 'false');
            });

            qsa('[data-settings-section]', this.#el).forEach((section) => {
                section.classList.toggle(
                    'active',
                    section.dataset.settingsSection === this.#activeTab
                );
            });
        }

        #renderSection(name, title, content) {
            return `
                <section class="settings-section" data-settings-section="${name}">
                    <h2>${title}</h2>
                    ${content}
                </section>
            `;
        }

        #renderAppearanceSection() {
            return this.#renderSection(
                'appearance',
                'Appearance',
                `
                    <div class="settings-grid">
                        <label>
                            Theme
                            <select name="theme">
                                ${THEMES.map((theme) =>
                                    option(theme, this.#settings.theme)
                                ).join('')}
                            </select>
                        </label>
                        <label>
                            Density
                            <select name="density">
                                ${DENSITIES.map((density) =>
                                    option(density, this.#settings.density)
                                ).join('')}
                            </select>
                        </label>
                    </div>
                `
            );
        }

        #renderShortcutsSection() {
            return this.#renderSection(
                'shortcuts',
                'Shortcuts',
                `
                    <div class="settings-command-list">
                        ${this.#settings.commands
                            .map((command, index) =>
                                this.#renderCommandRow(command, index)
                            )
                            .join('')}
                    </div>
                    <button type="button" class="settings-button" data-settings-action="add-command">Add Command</button>
                `
            );
        }

        #renderCommandRow(command, index) {
            return `
                <div class="settings-command-row" data-command-row>
                    <label>
                        Key
                        <input name="command-key" value="${escapeHtml(command.key)}" />
                    </label>
                    <label>
                        Name
                        <input name="command-name" value="${escapeHtml(command.name)}" />
                    </label>
                    <label>
                        URL
                        <input name="command-url" value="${escapeHtml(command.url)}" />
                    </label>
                    <label>
                        Search
                        <input name="command-search" value="${escapeHtml(command.search)}" />
                    </label>
                    <label>
                        Hues
                        <input name="command-hues" value="${escapeHtml(formatHues(command.hues))}" />
                    </label>
                    <label>
                        Color
                        <input name="command-color" value="${escapeHtml(command.color)}" />
                    </label>
                    <div class="settings-row-actions">
                        <button type="button" class="settings-button" data-settings-action="move-command-up" data-index="${index}" aria-label="Move command up" title="Move up">&uarr;</button>
                        <button type="button" class="settings-button" data-settings-action="move-command-down" data-index="${index}" aria-label="Move command down" title="Move down">&darr;</button>
                        <button type="button" class="settings-button" data-settings-action="remove-command" data-index="${index}" aria-label="Remove command" title="Remove">&times;</button>
                    </div>
                </div>
            `;
        }

        #renderClockSection() {
            return this.#renderSection(
                'clock',
                'Clock',
                `
                    <div class="settings-grid">
                        <label>
                            Click
                            <select name="clockOnClickAction">
                                ${CLOCK_ACTIONS.map((action) =>
                                    option(action, this.#settings.clockOnClickAction)
                                ).join('')}
                            </select>
                        </label>
                        <label>
                            Delimiter
                            <input name="clockDelimiter" value="${escapeHtml(this.#settings.clockDelimiter)}" />
                        </label>
                        <label>
                            Timezone
                            <input name="clockTimeZone" value="${escapeHtml(this.#settings.clockTimeZone)}" />
                        </label>
                    </div>
                    <div class="settings-checks">
                        <label><input type="checkbox" name="clockShowSeconds"${checked(this.#settings.clockShowSeconds)} /> Seconds</label>
                        <label><input type="checkbox" name="clockShowAmPm"${checked(this.#settings.clockShowAmPm)} /> AM/PM</label>
                        <label><input type="checkbox" name="clockTwentyFourHour"${checked(this.#settings.clockTwentyFourHour)} /> 24-hour</label>
                    </div>
                `
            );
        }

        #renderSearchSection() {
            return this.#renderSection(
                'search',
                'Search',
                `
                    <div class="settings-grid">
                        <label>
                            Help key
                            <input name="helpKey" value="${escapeHtml(this.#settings.helpKey)}" />
                        </label>
                        <label>
                            Path delimiter
                            <input name="queryPathDelimiter" value="${escapeHtml(this.#settings.queryPathDelimiter)}" />
                        </label>
                        <label>
                            Search delimiter
                            <input name="querySearchDelimiter" value="${escapeHtml(this.#settings.querySearchDelimiter)}" />
                        </label>
                    </div>
                    <div class="settings-checks">
                        <label><input type="checkbox" name="queryInstantRedirect"${checked(this.#settings.queryInstantRedirect)} /> Instant redirect</label>
                        <label><input type="checkbox" name="queryNewTab"${checked(this.#settings.queryNewTab)} /> New tab</label>
                    </div>
                `
            );
        }

        #renderSuggestionsSection(defaultSuggestionRows) {
            return this.#renderSection(
                'suggestions',
                'Suggestions',
                `
                    <div class="settings-grid settings-grid-small">
                        <label>
                            Limit
                            <input min="0" name="suggestionLimit" type="number" value="${escapeHtml(this.#settings.suggestionLimit)}" />
                        </label>
                    </div>
                    <h3>Influencers</h3>
                    <div class="settings-stack">
                        ${this.#settings.suggestionInfluencers
                            .map((influencer, index) =>
                                this.#renderInfluencerRow(influencer, index)
                            )
                            .join('')}
                    </div>
                    <button type="button" class="settings-button" data-settings-action="add-influencer">Add Influencer</button>
                    <h3>Defaults</h3>
                    <div class="settings-stack">
                        ${defaultSuggestionRows
                            .map((row, index) =>
                                this.#renderDefaultSuggestionRow(row, index)
                            )
                            .join('')}
                    </div>
                    <button type="button" class="settings-button" data-settings-action="add-default-suggestion">Add Default</button>
                `
            );
        }

        #renderInfluencerRow(influencer, index) {
            return `
                <div class="settings-list-row" data-influencer-row>
                    <label>
                        Name
                        <select name="influencer-name">
                            ${INFLUENCERS.map((name) =>
                                option(name, influencer.name)
                            ).join('')}
                        </select>
                    </label>
                    <label>
                        Limit
                        <input min="0" name="influencer-limit" type="number" value="${escapeHtml(influencer.limit)}" />
                    </label>
                    <label>
                        Min chars
                        <input min="0" name="influencer-min-chars" type="number" value="${escapeHtml(influencer.minChars)}" />
                    </label>
                    <div class="settings-row-actions">
                        <button type="button" class="settings-button" data-settings-action="move-influencer-up" data-index="${index}" aria-label="Move influencer up" title="Move up">&uarr;</button>
                        <button type="button" class="settings-button" data-settings-action="move-influencer-down" data-index="${index}" aria-label="Move influencer down" title="Move down">&darr;</button>
                        <button type="button" class="settings-button" data-settings-action="remove-influencer" data-index="${index}" aria-label="Remove influencer" title="Remove">&times;</button>
                    </div>
                </div>
            `;
        }

        #renderDefaultSuggestionRow(row, index) {
            return `
                <div class="settings-list-row settings-list-row-wide settings-text-row" data-default-suggestion-row>
                    <label>
                        Key
                        <input name="default-suggestion-key" value="${escapeHtml(row.key)}" />
                    </label>
                    <label>
                        Suggestions
                        <textarea name="default-suggestions" rows="4">${escapeHtml(formatListText(row.suggestions))}</textarea>
                    </label>
                    <div class="settings-row-actions">
                        <button type="button" class="settings-button" data-settings-action="remove-default-suggestion" data-index="${index}" aria-label="Remove default suggestion" title="Remove">&times;</button>
                    </div>
                </div>
            `;
        }

        #renderDataSection(scriptRows) {
            return this.#renderSection(
                'data',
                'Data',
                `
                    <h3>Scripts</h3>
                    <div class="settings-stack">
                        ${scriptRows
                            .map((row, index) => this.#renderScriptRow(row, index))
                            .join('')}
                    </div>
                    <button type="button" class="settings-button" data-settings-action="add-script">Add Script</button>
                    <h3>Import / Export</h3>
                    <textarea name="settings-json" rows="12" spellcheck="false">${escapeHtml(this.#store.export(this.#settings))}</textarea>
                    <div class="settings-actions">
                        <button type="button" class="settings-button" data-settings-action="export">Export</button>
                        <button type="button" class="settings-button" data-settings-action="import">Import</button>
                    </div>
                `
            );
        }

        #renderScriptRow(row, index) {
            return `
                <div class="settings-list-row settings-list-row-wide settings-text-row" data-script-row>
                    <label>
                        Key
                        <input name="script-key" value="${escapeHtml(row.key)}" />
                    </label>
                    <label>
                        Commands
                        <textarea name="script-commands" rows="4">${escapeHtml(formatListText(row.commands))}</textarea>
                    </label>
                    <div class="settings-row-actions">
                        <button type="button" class="settings-button" data-settings-action="remove-script" data-index="${index}" aria-label="Remove script" title="Remove">&times;</button>
                    </div>
                </div>
            `;
        }

        #scriptRows(settings) {
            return Object.entries(settings.scripts || {}).map(([key, commands]) => ({
                key,
                commands,
            }));
        }

        #defaultSuggestionRows(settings) {
            return Object.entries(settings.suggestionDefaults || {}).map(
                ([key, suggestions]) => ({
                    key,
                    suggestions,
                })
            );
        }
    }

    return {
        ValidationError,
        applyBodyClasses,
        createStore,
        normalizeSettings,
        settingsToRuntimeConfig,
        storageKey: STORAGE_KEY,
        validateSettings,
        SettingsPanel,
    };
})();
