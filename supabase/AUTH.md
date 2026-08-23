# PigeonX auth configuration

Project `wnmrcngjsdlyddrdiqtj`. Applied with the Management API on 2026-08-23 and
verified by reading the config back:

    curl -s -H "Authorization: Bearer $(cat ~/.supabase/access-token)" \
      https://api.supabase.com/v1/projects/wnmrcngjsdlyddrdiqtj/config/auth

Anything set here is also mirrored in `supabase/config.toml`, so a local stack
behaves the same way. The cloud project is the one that counts; `config.toml` is
not pushed by `db push`.

## Applied and verified

| setting                                | value                                              |
| -------------------------------------- | -------------------------------------------------- |
| `external_apple_enabled`               | `true`                                             |
| `external_apple_client_id`             | `org.pigeonx.app`                                  |
| `external_apple_additional_client_ids` | `""`                                               |
| `external_apple_secret`                | `null`                                             |
| `site_url`                             | `https://pigeonx.org`                              |
| `uri_allow_list`                       | `https://pigeonx.org/app/**,pigeonx://**,exp://**` |
| `security_manual_linking_enabled`      | `false`                                            |
| `mailer_autoconfirm`                   | `false`                                            |

`mailer_autoconfirm` false means a magic link has to actually be followed;
nobody is signed in by merely claiming an address. `security_manual_linking_enabled`
false means identities can only be linked by proving both, never by an API call.

## Sign in with Apple

The API stores the Apple audience in **one** field. Sending
`external_apple_additional_client_ids` does not create a second list: the value
is folded into `external_apple_client_id`, and the GET always reports
`external_apple_additional_client_ids` as empty. Sending both at once appends
them, which is how `org.pigeonx.app,org.pigeonx.app,host.exp.Exponent` briefly
appeared before being set back to the single bundle id. If a second audience is
ever needed, add it as a comma-separated value on `external_apple_client_id`.

No secret is set, and none is needed for what the app does. Native Sign in with
Apple sends an identity token to `signInWithIdToken`, and GoTrue validates that
token's `aud` against the client id. The Apple client secret is only required
for the **web** OAuth redirect flow (`signInWithOAuth({ provider: 'apple' })`),
which needs, from the Apple Developer account:

1. a Services ID (a separate identifier from the bundle id, e.g. `org.pigeonx.web`),
2. that Services ID's return URL set to
   `https://wnmrcngjsdlyddrdiqtj.supabase.co/auth/v1/callback`,
3. a Sign in with Apple private key (`.p8`) plus its Key ID and the Team ID,
4. a client secret JWT signed with that key, which **expires after six months**
   and has to be regenerated.

None of that exists yet, so the web dashboard signs in by magic link only, and
the mobile app uses the native flow. Adding web Apple later is a config change,
not a code change.

## Email templates: blocked, and why

Setting `mailer_subjects_magic_link` to `Your PigeonX sign-in link` (and the
matching body) is **refused** by the Management API on this project:

    PATCH /v1/projects/wnmrcngjsdlyddrdiqtj/config/auth
    { "mailer_subjects_magic_link": "Your PigeonX sign-in link" }

    → {"message":"Email template modification is not available for free tier
       projects using the default email provider. Please upgrade your plan or
       configure a custom SMTP provider."}

The subject alone is refused, not just the HTML body. The mailer therefore still
sends Supabase's default: subject **"Your sign-in link"**, which is close to what
we want and says nothing wrong, just nothing about PigeonX.

Either unblocks it, and the owner has to pick one:

1. **Custom SMTP** (free, and the better answer anyway). Supabase's built-in
   mailer is rate limited to a handful of messages an hour and is not meant for
   production sign-ins. Point auth at Resend, Postmark or SES:
   Dashboard → Authentication → Emails → SMTP Settings, or the same
   `config/auth` endpoint with `smtp_host`, `smtp_port`, `smtp_user`,
   `smtp_pass`, `smtp_admin_email`, `smtp_sender_name`.
2. **Upgrade the project to Pro.**

Once either is in place, apply the wording with:

```bash
curl -X PATCH \
  -H "Authorization: Bearer $(cat ~/.supabase/access-token)" \
  -H 'Content-Type: application/json' \
  https://api.supabase.com/v1/projects/wnmrcngjsdlyddrdiqtj/config/auth \
  -d '{
    "mailer_subjects_magic_link": "Your PigeonX sign-in link",
    "mailer_templates_magic_link_content": "<p>Follow this link to sign in to PigeonX.</p>\n<p><a href=\"{{ .ConfirmationURL }}\">Sign in to PigeonX</a></p>\n<p>The link works once and expires in an hour. If you did not ask for it, you can ignore this email.</p>"
  }'
```

Short, plain, one link, no em dashes, no marketing.

## Redirect URLs

`uri_allow_list` covers the three places a link can legitimately land:

- `https://pigeonx.org/app/**` — the web dashboard,
- `pigeonx://**` — the installed mobile app's scheme,
- `exp://**` — Expo Go and dev clients during development.

`site_url` is `https://pigeonx.org`, which is where a link goes when nothing more
specific is asked for.

Account deletion, which App Review requires to be available inside the app, is
the `delete_my_account()` RPC (migration `20260823000001`), not an auth setting.
