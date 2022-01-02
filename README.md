# BPPM - BitBurner Package Manager
An experimental package manager for the game Bitburner.

## Install Instructions
1. Download the [latest release](https://github.com/jojotastic777/bitburner-bbpm/releases) of `bbpm.js`.
2. Copy the contents of `bbpm.js` to the in-game script `/bin/bbpm.js`

## Build Instructions
1. Run `yarn run defs`.
    - (On Windows, download [this](https://github.com/danielyxie/bitburner/raw/dev/src/ScriptEditor/NetscriptDefinitions.d.ts) file, and place it in the base directory with `package.json`.)
2. Run `yarn install`.
3. Run `yarn build`.
4. Copy the contents of `dist/bin/bbpm.js` to the in-game script `/bin/bbpm.js`.

## Package List Installation Instructions
1. Add a link pointing to a correctly-formatted JSON file to a new line in the in-game file `/etc/bbpm/pkl_url_list.txt`.
2. Run `bbpm update`.

## Other Notes
- Documentation what exactly your own packages and package lists should consist of can be found at the top of the `src/bin/bbpm.ts` file.
    - The `official-bbpm` package list at `.bbpm/package-list.json` can also be used as an example.