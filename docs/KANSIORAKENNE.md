# Kansiorakenne

Tama ohje kuvaa projektin rakenteen kahdesta nakokulmasta:

- `tilitin-next/` on sovelluksen lahdekoodirepo
- `../data/` on oletussijainti yrityskohtaiselle datalle ja PDF-aineistolle

Nämä kannattaa erottaa toisistaan, koska sovellus ajetaan reposta, mutta varsinainen kirjanpitoaineisto tallennetaan oletuksena repohakemiston ulkopuolelle.

## 1) Kokonaiskuva

Oletusrakenne on tama:

```text
parent/
|- data/
|  |- <datasource>/
|  |  |- kirjanpito.sqlite
|  |  `- pdf/
|  |     |- tositteet/
|  |     |  `- <YYYY-YYYY>/
|  |     |     |- MU1.pdf
|  |     |     |- MU2.pdf
|  |     |     `- ...
|  |     |- tiliotteet/
|  |     |  `- <MM-YYYY>.pdf
|  |     |- myyntilaskut/
|  |     |  `- ML1.pdf
|  |     `- kirjanpito-raportit/
|  |        `- <raportti>.pdf
|  `- <toinen-datasource>/
`- tilitin-next/
   |- src/
   |- docs/
   |- public/
   |- package.json
   `- README.md
```

## 2) Repon rakenne

Sovelluksen varsinainen koodi on repossa `tilitin-next/`.

- `src/` sovelluksen kaikki lahdekoodit
- `docs/` projektin dokumentaatio

## 3) Datahakemiston perusmalli

Jokainen yritys eli `datasource` saa oman kansion:

- `data/<datasource>/kirjanpito.sqlite`
- `data/<datasource>/pdf/tositteet/<YYYY-YYYY>/MU<number>.pdf`
- `data/<datasource>/pdf/tiliotteet/<MM-YYYY>.pdf`
- `data/<datasource>/pdf/myyntilaskut/ML<number>.pdf`
- `data/<datasource>/pdf/kirjanpito-raportit/<raportti>.pdf`

Esimerkki:

- `data/assariina/kirjanpito.sqlite`
- `data/assariina/pdf/tositteet/2024-2025/MU24.pdf`

## 4) Nimeamissaannot PDF-tiedostoille

Pakolliset nimeamissaannot:

- Tositteet: `MU<number>.pdf` kuten `MU1.pdf`, `MU24.pdf`
- Myyntilaskut: `ML<number>.pdf`
- Ei valilyonteja, lisateksteja tai paivamaaria tiedostonimeen
- Tiedostopaate on aina `.pdf`

Huom: kuittien automaattinen linkitys toimii vain, jos tositteet noudattavat muotoa `MU<number>.pdf`.

## 5) Oletukset ja poikkeukset

Oletuksena sovellus hakee datan polusta `../data/<datasource>/`.

Ymparistomuuttujilla voi ohittaa oletuspolut:

- `DATABASE_PATH` osoittaa suoraan tiettyyn SQLite-tiedostoon
- `RECEIPT_PDF_ROOT` osoittaa erilliseen PDF-juurihakemistoon

Jos nama ovat kaytossa, fyysinen tallennusrakenne voi poiketa taman dokumentin oletusmallista.

## 6) Manuaalinen tyotapa

1. Valitse oikea `datasource` sovelluksesta.
2. Vie kauden MU-PDF:t kansioon `data/<datasource>/pdf/tositteet/<YYYY-YYYY>/`.
3. Tarkista, etta nimet ovat juoksevia kuten `MU1.pdf`, `MU2.pdf`, `MU3.pdf`.
4. Avaa sovelluksessa kuittien tai tositteiden tarkistusnakyma.
5. Korjaa puuttuvat tai vaarin nimetyt tiedostot.

## 7) Import-ohje agentille tai skriptille

Kun tuot aineistoa automaattisesti:

1. Selvita kohdeyritys eli `datasource` ennen tallennusta.
2. Luo tarvittaessa kansiot:
   - `data/<datasource>/pdf/tositteet/<YYYY-YYYY>/`
   - `data/<datasource>/pdf/tiliotteet/`
   - `data/<datasource>/pdf/myyntilaskut/`
3. Tallenna tositteet aina nimella `MU<number>.pdf`.
4. Ala ylikirjoita olemassa olevaa tiedostoa ilman erillista syyta.
5. Varmista lopuksi sovelluksesta, etta linkitys toimii oikein.

## 8) Hyvaksyttava lopputulos

- Jokaiselle tositenumerolle loytyy vastaava `MU<number>.pdf`
- Tiedostot ovat oikean yrityksen `datasource`-kansiossa
- Kausikohtaiset tositteet ovat oikeassa `YYYY-YYYY`-alikansiossa
- Tiedostonimet noudattavat sovittua nimeamismallia
