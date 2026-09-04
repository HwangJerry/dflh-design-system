# Social Menu Icon Set

## Scope

The authenticated social-style menu may only use the icon set below. The set is
based on the approved Instagram-style reference image and is registered as the
`DSMenuIcon` registry in the iOS design-system implementation.

## Allowed Icons

| Registry case | iOS SF Symbol | Intended use |
| --- | --- | --- |
| `DSMenuIcon.home` | `house` | Home / feed |
| `DSMenuIcon.create` | `plus.app` | Create |
| `DSMenuIcon.bookmark` | `bookmark` | Saved items |
| `DSMenuIcon.search` | `magnifyingglass` | Search |
| `DSMenuIcon.heart` | `heart` | Activity / profile fallback |
| `DSMenuIcon.messenger` | `message.circle` | Messenger-style inbox |
| `DSMenuIcon.comment` | `bubble.right` | Comments |
| `DSMenuIcon.reels` | `movieclapper` | Reels / video |
| `DSMenuIcon.paperPlane` | `paperplane` | Direct messages |
| `DSMenuIcon.tv` | `tv` | TV / media |

## Rules

- Do not use raw SF Symbol names directly in app menu code.
- Do not introduce profile, person, settings, or app-specific icons into the
  social menu without updating this registry and the navigation contract first.
- Visible menu items may be icon-only, but accessibility labels must remain
  text-based and localized.
- The My Page tab may replace `DSMenuIcon.heart` with the current user's circular
  profile image when a valid profile image URL is available.
- Platform-specific substitutions are allowed only when the platform does not
  provide an exact matching glyph, and the substitution must preserve the
  approved icon's silhouette and product meaning.
