# Augmented Headings

Add H4, H5, and H6 headings to your Roam Research graph.

Augmented Headings lets you mark any block as H4-H6 and style those headings independently. It integrates with Roam's native headings (H1-H3) without changing your workflow.

## How it works

- New headings are stored as a block property: `ah-level` with values `h4`, `h5`, or `h6`.
- Legacy headings created with tags like `#h4^^Heading^^` are still supported.
- Legacy tag names are configurable and synced to localStorage so other extensions (Sticky Headings, Table of Contents) can detect them.

## Features

- Toggle H4-H6 via Command Palette or block context menu
- Optional H4/H5/H6 buttons in the block context menu alongside native H1/H2/H3
- Per-level font size, weight, style, and variant controls
- Works alongside Roam native headings (H1-H3)
- Theme-aware context menu buttons — active state uses the same inline styling as native heading buttons, so custom CSS themes apply automatically
- Backward compatible with legacy tag-based headings

## Usage

1. Click into a block.
2. Use Command Palette:
   - Toggle Heading - H4
   - Toggle Heading - H5
   - Toggle Heading - H6
3. Or right-click the block bullet and use the same toggle commands under Plugins.

Toggling the same level again clears the heading. Toggling a different level replaces the current one.

## Settings

### Legacy H4/H5/H6 Tag
Configure the legacy tag token used by older versions (default: `h4`, `h5`, `h6`). Examples:

- `h4` (default) -> `#h4^^Heading^^`
- `.h4` -> `#.h4^^Heading^^`
- `purple_elephant` -> `#purple_elephant^^Heading^^`

These tag names are synced to localStorage (`augmented_headings:h4`, `:h5`, `:h6`) so other extensions can detect them.

### Font settings
Each level lets you set:

- Font size
- Font weight
- Font style
- Font variant

If you do not change any font settings, you may not see a visual difference even when a block is marked as H4-H6.

## Extension Tools API

Augmented Headings registers on `window.RoamExtensionTools["augmented-headings"]` so other extensions can query and set heading levels programmatically. The registration follows the standard Extension Tools contract (`name`, `version`, `tools[]` with `name`, `description`, `parameters`, `execute`).

### Tools

- **`ah_get_heading_level`** — Get the augmented heading level for a block. Takes `{ uid }`, returns `{ success, uid, level }` where level is `"h4"`, `"h5"`, `"h6"`, or `null`.
- **`ah_set_heading_level`** — Set or clear the heading level. Takes `{ uid, level }` where level is `"h4"`, `"h5"`, `"h6"`, or `""` to clear. Returns `{ success, level }` or `{ error }`.

The [Export Document](https://github.com/mlava/export-document) extension uses this data automatically — H4-H6 headings are exported as `####`, `#####`, and `######` in markdown before conversion.

## Compatibility

- Export Document (H4-H6 heading export)
- Sticky Headings (H4-H6 support)
- Table of Contents (H4-H6 support)
- Roam user-defined hotkeys

## Migration notes

If you previously used legacy tags like `#h4^^Heading^^`, those blocks still work. The preferred path going forward is using the toggle commands so the block property is stored directly.

## Troubleshooting

### I toggled a heading but nothing changed visually
Update the font settings for H4-H6 so the styling is visible.

### My legacy tags are not detected in other extensions
Make sure your legacy tag settings are saved in Augmented Headings and then reload Roam so localStorage is updated.
