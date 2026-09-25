# Troškovi 🏠⚡💧

Mala Android aplikacija (Capacitor + čist HTML/JS) za praćenje režija – struja, voda,
grejanje, gas, Infostan, internet, porez... – za **Stan 1, Stan 2 i Kuću**.

## Šta aplikacija radi

- **Pregled** – ukupno za mesec, neplaćeno, raspodela po nekretnini i kategoriji, grafikon za 12 meseci
- **Unos** – nekretnina, kategorija, iznos, mesec na koji se račun odnosi, potrošnja (kWh, m³), rok plaćanja, napomena, plaćeno da/ne
- **Istorija** – svi računi po mesecima, filteri; tap na račun = izmena, tap na status = označi plaćeno/neplaćeno; računi kojima je prošao rok su crveni
- **Podešavanja** – preimenuj/dodaj nekretnine i kategorije, valuta, izvoz (JSON/CSV) i uvoz rezervne kopije

Podaci se čuvaju **samo na telefonu**. Povremeno uradi *Izvezi (JSON)* i sačuvaj fajl na Drive.

## Struktura

```
www/                 ← cela aplikacija (index.html, styles.css, app.js)
www/vendor/          ← Capacitor runtime (kopira ga `npm run vendor`)
android/             ← Android projekat koji je napravio `npx cap add android`
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

# Posle izmena u www/ – prebaci u Android projekat
npm run sync

git add -A && git commit -m "opis izmene" && git push
```

> Capacitor 8 traži **Java 21** za Android build (`pkg install openjdk-21`) – ali ako APK pravi
> GitHub Actions, Java ti u Termuxu nije ni potrebna.

## Ideje za dalje

- podsetnici za rok plaćanja (`@capacitor/local-notifications`)
- slikanje računa kamerom
- poređenje potrošnje sa istim mesecom prošle godine
