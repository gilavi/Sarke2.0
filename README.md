# Sarke 2.0

iOS app for შრომის უსაფრთხოების ექსპერტები (labor safety experts). Lets an expert create a project, fill a checklist-style questionnaire on their iPhone, collect signatures, and generate a PDF inspection report.

MVP scope: two seeded templates, both in ქართული:
- **ფასადის ხარაჩოს შემოწმების აქტი** (façade scaffolding inspection)
- **დამცავი ქამრების შემოწმების აქტი** (fall-protection harness inspection)

## Stack

- SwiftUI (iOS 17+), Swift 5.9, Xcode 15+
- Supabase (Postgres + Auth + Storage)
- TPPDF (PDF generation)
- PencilKit (signature canvas)

## First-time setup

### 1. Tooling

Install **XcodeGen** (generates `Sarke2.xcodeproj` from `project.yml`):

```sh
# via Mint
brew install mint
mint install yonaskolb/xcodegen

# or from source
git clone https://github.com/yonaskolb/XcodeGen.git && cd XcodeGen && make install
```

### 2. Supabase

Create a project at https://supabase.com, then:

```sh
supabase link --project-ref <your-ref>
supabase db push          # applies migrations/0001_init.sql
psql $DB_URL -f supabase/seed/01_system_templates.sql
```

In the Supabase dashboard → Storage, create four public-read buckets:
- `certificates`
- `answer-photos`
- `pdfs`
- `signatures`

### 3. Secrets

```sh
cp Config/Secrets.sample.xcconfig Config/Secrets.xcconfig
# edit Secrets.xcconfig with SUPABASE_URL and SUPABASE_ANON_KEY
```

### 4. Generate & open

```sh
xcodegen
open Sarke2.xcodeproj
```

Select the **Sarke2** scheme and an iPhone simulator → Cmd+R.

### 5. Fonts

Download [Noto Sans Georgian](https://fonts.google.com/noto/specimen/Noto+Sans+Georgian) Regular + Bold and drop the `.ttf` files into `Sarke2/Resources/Fonts/` before building. Without them the PDF will fall back to a system font that sometimes drops ქართული glyphs.

## TestFlight

1. Xcode → Product → Archive
2. Organizer → Distribute App → App Store Connect → Upload
3. appstoreconnect.apple.com → TestFlight → add testers

Requires an active Apple Developer Program membership on the signing team.

## Directory layout

```
Sarke2/                 SwiftUI app sources
  App/                  Entry, router, session gate
  Core/                 Supabase client, theme, localization
  Features/             Feature-per-folder
    Auth/
    Home/
    Projects/
    Questionnaire/
      Wizard/
      Signing/
      PDF/
    Certificates/
    History/
    Regulations/
    Templates/
  Models/               Codable DB models
  Services/             Data services
  Shared/               Reusable UI
  Resources/            Assets, localizations, fonts
supabase/
  migrations/           Schema + RLS
  seed/                 System templates
Config/                 xcconfig files (Secrets.xcconfig gitignored)
project.yml             XcodeGen manifest
```

## License

Private — all rights reserved.
