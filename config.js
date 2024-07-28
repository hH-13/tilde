const CONFIG = {
    /**
     * Choose a predefined theme:
     *
     * - "ashes-dark"
     * - "gruvbox-dark"
     * - "lovelace-dark"
     * - "nord-dark"
     * - "ocean-light"
     * - "tilde-dark"
     * - "tokyo-dark"
     *
     * Alternatively, create your own in the <style> tag below!
     */
    theme: 'lovelace-dark',

    /**
     * Action to take when the clock is clicked. Options include:
     *
     * - "Help" to show the help menu
     * - "Search" to show the search input (useful on mobile)
     */
    clockOnClickAction: 'Help',

    /**
     * The delimiter between the hours, minutes and seconds on the clock.
     */
    clockDelimiter: ' : ',

    /**
     * Show seconds on the clock. A monospaced font is recommended for this.
     */
    clockShowSeconds: true,

    /**
     * Show AM/PM indication when CONFIG.clockTwentyFourHours is false.
     */
    clockShowAmPm: true,

    /**
     * Show a twenty-four-hour clock instead of a twelve-hour clock.
     */
    clockTwentyFourHour: true,

    /**
     * Force an IANA timezone. Useful when attempting to prevent browser
     * fingerprinting. For example, "America/Los_Angeles" would force Pacific
     * Time, "Asia/Kolkata" would force Indian Standard Time, etc. Read:
     *
     * https://en.wikipedia.org/wiki/List_of_tz_database_time_zones
     */
    clockTimeZone: undefined,

    /**
     * Type this to toggle the help menu.
     */
    helpKey: '/',

    /**
     * Instantly redirect when a key is matched. Put a space before any other
     * queries to prevent unwanted redirects.
     */
    queryInstantRedirect: false,

    /**
     * Open triggered queries in a new tab.
     */
    queryNewTab: false,

    /**
     * The delimiter between a command key and a path. For example, you'd type
     * "r/r/unixporn" to go to "https://reddit.com/r/unixporn".
     */
    queryPathDelimiter: '/',

    /**
     * The delimiter between a command key and your search query. For example,
     * to search GitHub for tilde, you'd type "g'tilde".
     */
    querySearchDelimiter: "'",

    /**
     * Scripts allow you to open or search multiple sites at once. For example,
     * to search Google, Bing, DuckDuckGo, Ecosia and Yahoo for cats at the same
     * time, you'd type "q'cats".
     */
    scripts: {
        q: ['bin', 'yah', 'eco', 'ddg', '*'],
    },

    /**
     * The order, limit and minimum characters for each suggestion influencer.
     *
     * An "influencer" is just a suggestion source. "limit" is the max number of
     * suggestions an influencer will produce. "minChars" determines how many
     * characters need to be typed before the influencer kicks in.
     *
     * The following influencers are available:
     *
     * - "Default" suggestions come from CONFIG.suggestionDefaults (sync)
     * - "History" suggestions come from your previously entered queries (sync)
     * - "DuckDuckGo" suggestions come from the DuckDuckGo search API (async)
     *
     * To disable suggestions, remove all influencers.
     */
    suggestionInfluencers: [
        { name: 'Default', limit: 4 },
        { name: 'History', limit: 4, minChars: 1 },
        { name: 'DuckDuckGo', limit: 6, minChars: 1 },
    ],

    /**
     * Max number of suggestions that will ever be shown.
     */
    suggestionLimit: 5,

    /**
     * Default search suggestions for the specified queries.
     */
    suggestionDefaults: {
        g: ['g/FallenDeity/code-jam-2024', 'g/hH-13/unnecessary-c-scripts', 'g/hH-13/jobs-scraper', 'g/inkontoasty/the-neverending-loops', 'g/hH-13/tilde', 'g/hH-13/snow-wise', 'g/hH-13/mischevious-mummies', 'g/hH-13/FM-CRS-90.8MHz', 'g/yagueto/code-jam-2021'],
        i: ['inbox.google.com/'],
        c: ['c/events'],
        l: ['l/editor', 'l/paste'],
        o: ['o/calendar'],
        r: ['r/u/hh13scrt/saved'],
        s: ['s/playlist/3c94qKLDq78cy6FJM1a8u6'],
        y: ['y/playlist?list=WL'],
    },

    /**
     * The name, key, url, search path and color for your commands. If none of
     * the specified keys are matched, the * key is used. Commands without a
     * name don't show up in the help menu.
     *
     * "hues" is an array of HSL hues that will be converted into a linear
     * gradient. CSS variables defined below, prefixed with --command-color-,
     * determine the saturation and lightness for each generated color.
     *
     * "color", if defined, will be applied to the command as-is.
     */
    commands: [
        {
            key: '*',
            search: '/search?q={ }',
            url: 'https://www.google.com',
        },
        {
            key: 'bin',
            search: '/search?q={ }',
            url: 'https://www.bing.com',
        },
        {
            key: 'ddg',
            search: '/?q={ }',
            url: 'https://duckduckgo.com',
        },
        {
            key: 'eco',
            search: '/search?q={ }',
            url: 'https://www.ecosia.org',
        },
        {
            key: 'yah',
            search: '/search?p={ }',
            url: 'https://search.yahoo.com',
        },
        //    =========================================
        {
            hues: ['338', '11'],
            key: 'm',
            name: 'GMail',
            search: '/mail/u/0/?q={ }#search/{ }',
            url: 'https://inbox.google.com/',
        },
        {
            hues: ['2', '35'],
            key: 'y',
            name: 'YouTube',
            search: '/results?search_query={ }',
            url: 'https://youtube.com/',
        },
        {
            hues: ['26', '59'],
            key: 's',
            name: 'Spotify',
            search: '/search/{ }',
            url: 'https://open.spotify.com',
        },
        {
            hues: ['50', '83'],
            key: 'o',
            name: 'Outlook',
            url: 'https://outlook.office.com/',
        },
        {
            hues: ['74', '107'],
            key: 'g',
            name: 'GitHub',
            url: 'https://github.com/',
        },
        {
            hues: ['98', '131'],
            key: 'n',
            name: 'LinkedIn',
            url: 'https://www.linkedin.com/jobs/',
        },
        {
            hues: ['122', '155'],
            key: 'i',
            name: 'Instagram',
            url: 'https://www.instagram.com',
        },
        {
            hues: ['146', '179'],
            key: 'f',
            name: 'Facebook',
            search: '/search/?q={ }',
            url: 'https://www.facebook.com/',
        },
        {
            hues: ['170', '203'],
            key: 'r',
            name: 'Reddit',
            search: '/search?q={ }',
            url: 'https://www.reddit.com',
        },
        {
            hues: ['194', '227'],
            key: 'd',
            name: 'Discord',
            search: '/guild-discovery?query={ }',
            url: 'https://discord.com/app',
        },
        {
            hues: ['218', '251'],
            key: 'w',
            name: 'Whatsapp',
            url: 'https://web.whatsapp.com',
        },
        {
            hues: ['242', '275'],
            key: 't',
            name: 'Teams',
            url: 'https://teams.microsoft.com/v2/',
        },
        {
            hues: ['266', '299'],
            key: 'k',
            name: 'Keep',
            search: '/u/0/#search/text={ }',
            url: 'https://keep.google.com/u/0',
        },
        {
            hues: ['290', '323'],
            key: 'l',
            name: 'lichess',
            url: 'https://lichess.org/',
        },
        {
            hues: ['314', '347'],
            key: 'c',
            name: 'Chess',
            url: 'https://chess.com/',
        },
    ],
};