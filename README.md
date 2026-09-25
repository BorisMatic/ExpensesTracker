# Troškovi 🏠⚡💧

Mala Android aplikacija (Capacitor + čist HTML/JS) za praćenje režija – struja, voda,
komunalije, internet, porez... – za **Stan 1, Stan 2 i Kuću**.

## Šta aplikacija radi

- **Pregled** – ukupno za mesec i godinu, raspodela po nekretnini i kategoriji, grafikon za 12 meseci
- **Unos** – nekretnina, kategorija, iznos i mesec na koji se račun odnosi; datum uplate se upisuje automatski
- **Istorija** – svi računi po mesecima, datum uplate, filter po kategoriji; tap na račun = izmena ili brisanje
- **Podešavanja** – valuta je KM (konvertibilna marka), preimenuj/dodaj nekretnine i kategorije, valuta, izvoz (JSON/CSV) i uvoz rezervne kopije

Podaci se čuvaju **samo na telefonu**. Povremeno uradi *Izvezi (JSON)* i sačuvaj fajl na Drive.

## Struktura

```
www/                 ← cela aplikacija (index.html, styles.css, app.js)
www/vendor/          ← Capacitor runtime (automatski ga kopira `npm install`, nije u gitu)
android/             ← Android projekat, pravi ga `npm run sync` (nije u gitu)
capacitor.config.json
.github/workflows/   ← GitHub automatski pravi APK
```

## Kako do APK-a (najlakše) – GitHub Actions

Pravljenje APK-a direktno u Termuxu je problematično (Gradle-ov `aapt2` ne radi na ARM telefonu),
pa ga pravi GitHub:

1. Pushuj izmene na GitHub (ili na repou: **Actions → Build APK → Run workflow**).
2. Otvori završen run u **Actions** tabu, dole pod **Artifacts** preuzmi `troskovi-apk`.
3. Raspakuj zip, instaliraj `app-debug.apk` (dozvoli instalaciju iz nepoznatih izvora).

## Rad u Termuxu

```bash
pkg install nodejs git
git clone https://github.com/BorisMatic/ExpensesTracker.git
cd ExpensesTracker
npm install

# Pregled u browseru telefona: otvori http://localhost:8080
npm run serve

# Napravi android/ folder (prvi put) i prebaci izmene iz www/ u njega
npm run sync

git add -A && git commit -m "opis izmene" && git push
```

> Capacitor 8 traži **Java 21** za Android build (`pkg install openjdk-21`) – ali ako APK pravi
> GitHub Actions, Java ti u Termuxu nije ni potrebna.

## Ideje za dalje

- podsetnici za rok plaćanja (`@capacitor/local-notifications`)
- slikanje računa kamerom
- poređenje potrošnje sa istim mesecom prošle godine
