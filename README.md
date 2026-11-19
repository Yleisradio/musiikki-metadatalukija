# Metatietolukija
(Tuotantokäytössä Yle Arkistossa)

React-sovellus lukee audiotiedoston metatiedot ja esittää oleellisimmat niistä jäsenneltynä, käyttämällä kirjastoa music-metadata-browser. Sovellus esittää myös kirjaston palauttamat metatiedot muokkaamattomana omassa sarakkeessaan (pois lukien kuvien binääridata), ja hakee lisäksi täydentäviä metatietoja MusicBrainzista.

Metatiedot on vain luettavissa. Ne kopioidaan tästä sovelluksesta ja liitetään Tempo CMS:ään, jossa niitä voidaan myös editoida. Sovellus on päivittäisessä tuotantokäytössä Yle Arkistossa.

## Ominaisuudet

- **Tiedoston valinta:** Audiotiedoston voi avata raahaamalla sen sovellukseen tai valitsemalla sen tiedostovalitsimesta.
- **Tiedostoon tallennettujen metatietojen lukeminen:** Hyödyntää `music-metadata-browser`-kirjastoa esimerkiksi kappaleen nimen, esittäjien, albumin, uranumeron, tekijöiden, julkaisuvuoden, ISRC-koodin, musiikkilajin ja levymerkkitietojen lukemiseen, kun tiedot ovat saatavilla.
- **Unicode-normalisointi:** Normalisoi tekstikenttiä Unicode NFC -muotoon. Esimerkiksi ä-, ö- ja å-kirjainten erilliset kirjain- ja tarkemerkit yhdistetään yhtenäiseen esitysmuotoon.
- **Yleistiedot:** Näyttää tiedostosta saadut (oleelliset) metatiedot jäsenneltynä.
- **MusicBrainz-haku:** Hakee ISRC-tunnuksen perusteella MusicBrainzista täydentäviä metatietoja.
- **Esittäjän lisätiedot:** Näyttää MusicBrainzista löytyviä metatietoja esittäjästä.
- **Kaksi JSON-esitystapaa:** Metatietoja voi tarkastella tekstimuotoisena JSONina tai avattavana puurakenteena.
- **Kappale- ja albumitietojen Apple Music -linkit:** Muodostaa linkit julkaisun Apple Music -sivulle, jos tiedostoon on tallennettu vastaavat Apple-tunnisteet.


## Projektirakenne

- `frontend/` sisältää React-käyttöliittymän.
- `backend/` sisältää TypeScriptillä toteutetun Node.js-taustapalvelun.

## Käynnistys

Tarvitset Node.js:n ja npm:n. Suorita projektin juurihakemistossa:

```bash
cd frontend
npm install
npm start
```

Avaa selaimessa http://localhost:3000.

## Käynnistys Docker Composella

Käynnistä frontend ja backend projektin juurihakemistosta:

```bash
docker compose up --build
```

Frontend avautuu osoitteessa http://localhost:3000. Backendin terveystarkistuksen
voi tarkistaa osoitteesta http://localhost:3001/health; frontendin `/api/`-pyynnöt
välitetään backendille.

Backendin TypeScript-koodin voi kääntää hakemistossa `backend/` komennolla
`npm run build`.