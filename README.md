# Metatietolukija

React-sovellus lukee audiotiedoston metatiedot ja esittää oleellisimmat niistä jäsenneltynä, käyttämällä kirjastoa music-metadata-browser. Sovellus esittää myös kirjaston palauttamat metatiedot muokkaamattomana omassa sarakkeessaan (pois lukien kuvien binääridata).

Metatiedot on vain luettavissa. Ne kopioidaan tästä sovelluksesta ja liitetään Tempo CMS:ään, jossa niitä voidaan myös editoida. Sovellus on päivittäisessä tuotantokäytössä Yle Arkistossa.

## Ominaisuudet

- **Tiedoston valinta:** Audiotiedoston voi avata raahaamalla sen sovellukseen tai valitsemalla sen tiedostovalitsimesta.
- **Tiedostoon tallennettujen metatietojen lukeminen:** Hyödyntää `music-metadata-browser`-kirjastoa esimerkiksi kappaleen nimen, esittäjien, albumin, uranumeron, tekijöiden, julkaisuvuoden, ISRC-koodin, musiikkilajin ja levymerkkitietojen lukemiseen, kun tiedot ovat saatavilla.
- **Unicode-normalisointi:** Normalisoi tekstikenttiä Unicode NFC -muotoon. Esimerkiksi ä-, ö- ja å-kirjainten erilliset kirjain- ja tarkemerkit yhdistetään yhtenäiseen esitysmuotoon.
- **Yleistiedot:** Näyttää tiedostosta saadut (oleelliset) metatiedot jäsenneltynä.
- **Metadatanäkymä:** Muuntaa tiedostometadatan track.json-rakenteeseen saatavilla olevien kappale-, albumi-, esittäjä- ja custom-tietojen osalta. Järjestelmäkohtaisia tunnisteita ja oikeustietoja ei päätellä puuttuvasta lähdedatasta.
- **Muokkaus ja lähetys:** Track-metadataa voi muokata lomakkeella ja kopioida Tempo CMS:ään.
- **Kaksi JSON-esitystapaa:** Metatietoja voi tarkastella tekstimuotoisena JSONina tai avattavana puurakenteena.
- **Kappale- ja albumitietojen Apple Music -linkit:** Muodostaa linkit julkaisun Apple Music -sivulle, jos tiedostoon on tallennettu vastaavat Apple-tunnisteet.


## Projektirakenne

- `frontend/` sisältää React-käyttöliittymän.
- `backend/` sisältää TypeScriptillä toteutetun Node.js-taustapalvelun.

Backendissä `src/server.ts` alustaa ja käynnistää palvelimen, `src/routes.ts`
määrittelee rajapinnat ja `src/errors.ts` käsittelee niiden virheet.

Käyttöliittymä käyttää Bootstrap 5:n responsiivista ruudukkoa, kortteja,
välilehtiä, painikkeita ja apuluokkia. Bootstrapin CSS tuodaan npm-paketista
tiedostossa `frontend/src/index.js`; näkymien tila hallitaan Reactilla ilman
Bootstrapin JavaScript-lisäosia. Sovelluskohtaiset tyylit ovat tiedostossa
`frontend/src/App.css`.

## Käynnistys Docker Composella

Käynnistä frontend ja backend projektin juurihakemistosta:

```bash
docker compose up --build
```

Frontend avautuu osoitteessa http://localhost:3000. 
frontendin `/api/`-pyynnöt välitetään backendille.

Backendin TypeScript-koodin voi kääntää hakemistossa `backend/` komennolla
`npm run build`.

## Track-rajapinta

Backend tarjoaa rajapinnan `POST /tracks`, joka näkyy Docker Composessa
käyttöliittymälle osoitteessa `/api/tracks`. Se välittää JSON-objektin
sellaisenaan ulkoiseen rajapintaan HTTP POST -pyyntönä. Esimerkiksi frontendin
muodostama `{ "tracks": [...] }` -rakenne sopii pyyntöön. Backend ei tallenna
trackia itse eikä tarkista sen sisältöä ulkoisen rajapinnan skeemaa vasten.

Aseta ympäristömuuttujaan `TRACK_API_URL` ulkoisen POST-rajapinnan koko
HTTP(S)-osoite ennen käynnistystä, esimerkiksi:

```bash
TRACK_API_URL=https://example.com/tracks docker compose up --build
```

Rajapintaa voi kutsua esimerkiksi näin:

```bash
curl -X POST http://localhost:3000/api/tracks \
  -H 'Content-Type: application/json' \
  -d '{"tracks":[{"title":"Esimerkki"}]}'
```

Ilman osoitetta rajapinta palauttaa 503. Ulkoisen rajapinnan vastauskoodi,
vastaussisältö ja mahdolliset `Content-Type`- ja `Location`-otsakkeet
välitetään kutsujalle. Yhteysvirhe palauttaa 502 ja 10 sekunnin aikakatkaisu
504. Pyyntökoon yläraja on 1 MiB. Ulkoisen palvelun autentikointia ei ole
vielä toteutettu. Lokituksen tasoa voi säätää ympäristömuuttujalla `LOG_LEVEL`
(oletus `info`).

Backendin testit voi suorittaa hakemistossa `backend/` komennolla `npm test`.
