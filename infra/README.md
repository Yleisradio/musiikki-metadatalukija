# Kubernetes-ympäristö

Frontend ja backend ajetaan erillisinä Deployment-resursseina arkistohaun
tapaan. Molemmilla on klusterin sisäinen Service ja valmius- sekä
elossaolotarkistukset. Frontendin nginx välittää `/api/`-pyynnöt saman
namespacen `backend`-palveluun. Backendissä on tällä hetkellä vain
terveystarkistus `/health`; esimerkiksi MusicBrainz-haku tehdään selaimesta.

`kubernetes/base` sisältää yhteiset resurssit. `local`-ympäristö käyttää
paikallisesti ladattuja kuvia ja yhtä replikaa; `server` käyttää kahta replikaa
ja hakee puuttuvat kuvat rekisteristä. Kumpikin kuva toimii ilman
root-oikeuksia, myös OpenShiftin määräämällä käyttäjätunnuksella.

## Paikallinen Kubernetes

Tarvitset Dockerin ja sen buildx-lisäosan, `kubectl`-komennon sekä
[kindin](https://kind.sigs.k8s.io/). Komennot suoritetaan projektin juuresta.
Esimerkki käyttää erillistä kubeconfig-tiedostoa, jotta muut klusterikontekstit
eivät muutu.

```bash
export KUBECONFIG="$HOME/.kube/metatietolukija-kind"
mkdir -p "$HOME/.kube"
kind create cluster --name metatietolukija --kubeconfig "$KUBECONFIG"
CONTEXT=kind-metatietolukija
NAMESPACE=metatietolukija
IMAGE_PREFIX=musiikki-metadatalukija
TAG=local

kubectl --context="$CONTEXT" create namespace "$NAMESPACE"
./infra/build-images.sh "$IMAGE_PREFIX" "$TAG"
kind load docker-image --name metatietolukija \
  "${IMAGE_PREFIX}-backend:${TAG}" "${IMAGE_PREFIX}-frontend:${TAG}"
./infra/kubernetes/deploy.sh local "$CONTEXT" "$NAMESPACE" "$IMAGE_PREFIX" "$TAG"
./infra/kubernetes/smoke-test.sh "$CONTEXT" "$NAMESPACE"
kubectl --context="$CONTEXT" -n "$NAMESPACE" port-forward service/frontend 3000:80
```

Sovellus on osoitteessa http://localhost:3000 ja backendin terveystarkistus
osoitteessa http://localhost:3000/api/health. Porttiohjaus pysyy käynnissä
komennon ajan. Kun koodia muutetaan, rakenna ja lataa kuvat uudelleen ja aja
`deploy.sh local` samoilla argumenteilla: se käynnistää podit uudelleen myös
silloin, kun kuvan tagi ei muutu. Tämä ei ole automaattisesti päivittyvä
kehityspalvelin.

Paikallisen klusterin voi lopuksi poistaa komennolla
`kind delete cluster --name metatietolukija --kubeconfig "$KUBECONFIG"`.

## Asennus palvelimelle

Palvelimella tai sen saatavilla on oltava Kubernetes-klusteri (esimerkiksi
[k3s](https://docs.k3s.io/)), johon `kubectl` voi muodostaa yhteyden. Kuvat
voidaan hakea konttirekisteristä tai tuoda suoraan yksittäiselle
k3s-palvelimelle. Ulkoinen käyttö edellyttää Ingress-ohjainta ja DNS-nimeä tai
OpenShiftin routeria. Asennus ei itsessään asenna Kubernetesia eikä avaa
palomuuria. Varmista valittu konteksti ennen komentoja: skriptit vaativat
kontekstin ja namespacen erikseen.

### Asennus konttirekisteristä

Klusterin solmujen on voitava muodostaa yhteys rekisteriin.

```bash
kubectl config get-contexts
CONTEXT=korvaa-palvelimen-kontekstilla
NAMESPACE=metatietolukija
IMAGE_PREFIX=registry.example.com/organisaatio/musiikki-metadatalukija
TAG=v1.0.0

# Tee namespace kerran tai käytä klusteriin valmiiksi luotua namespacea.
kubectl --context="$CONTEXT" create namespace "$NAMESPACE"

# Kirjaudu ensin rekisteriin. Valitse palvelimen arkkitehtuuria vastaava alusta.
PLATFORM=linux/amd64 ./infra/build-images.sh "$IMAGE_PREFIX" "$TAG" --push
```

Korvaa esimerkkiarvot ympäristön todellisilla arvoilla. Käytä jokaiselle
julkaisulle uutta tagia, jotta myös päivitykset lataavat oikeat kuvat. Jos
rekisteri on yksityinen, luo ensin namespaceen `kubernetes.io/dockerconfigjson`
-tyyppinen image pull secret, jonka sisältämässä Dockerin asetustiedostossa on
rekisterin tunnistetiedot. Dockerin paikallinen credential helper ei sellaisenaan
toimi klusterissa. Luo secret ja anna sen nimi jokaisella asennuskerralla:

```bash
kubectl --context="$CONTEXT" -n "$NAMESPACE" create secret generic registry-auth \
  --type=kubernetes.io/dockerconfigjson \
  --from-file=.dockerconfigjson=/polku/rekisterin-dockerconfig.json
export IMAGE_PULL_SECRET=registry-auth
```

Asenna kuvat klusteriin ja tarkista niiden toiminta:

```bash
./infra/kubernetes/deploy.sh server "$CONTEXT" "$NAMESPACE" "$IMAGE_PREFIX" "$TAG"
./infra/kubernetes/smoke-test.sh "$CONTEXT" "$NAMESPACE"
```

Myös rekisteritunnusten voimassaolosta ja tarvittaessa uusimisesta on
huolehdittava. Älä tallenna tunnuksia tai varmenteiden yksityisiä avaimia
versionhallintaan. Kahden replikan ajaminen yhdellä palvelimella ei suojaa
palvelimen vikaantumiselta.

### Yksittäinen k3s-palvelin ilman rekisteriä

Vaihtoehtoisesti kuvat voi tuoda palvelimen containerdiin SSH:n kautta.
Esimerkki edellyttää, että SSH-käyttäjä voi ajaa `sudo k3s` ilman salasanaa;
muussa tapauksessa siirrä `docker save` -tiedosto palvelimelle esimerkiksi
`scp`:llä ja suorita `sudo k3s ctr --namespace k8s.io images import` siellä.
Valitse palvelimen arkkitehtuuria vastaava `PLATFORM` ja uusi tagi jokaiselle
julkaisulle.

```bash
CONTEXT=korvaa-palvelimen-kontekstilla
NAMESPACE=metatietolukija
IMAGE_PREFIX=musiikki-metadatalukija
TAG=v1.0.0
SERVER=kayttaja@palvelin
unset IMAGE_PULL_SECRET

PLATFORM=linux/amd64 ./infra/build-images.sh "$IMAGE_PREFIX" "$TAG"
docker save "${IMAGE_PREFIX}-backend:${TAG}" "${IMAGE_PREFIX}-frontend:${TAG}" |
  ssh "$SERVER" 'sudo -n k3s ctr --namespace k8s.io images import -'
kubectl --context="$CONTEXT" create namespace "$NAMESPACE"
./infra/kubernetes/deploy.sh server "$CONTEXT" "$NAMESPACE" "$IMAGE_PREFIX" "$TAG"
./infra/kubernetes/smoke-test.sh "$CONTEXT" "$NAMESPACE"
```

Namespace luodaan vain ensimmäisellä asennuskerralla. Kuvat on tuotava
jokaiselle solmulle, jolla podeja ajetaan. Jos Kubernetes poistaa paikallisen
kuvan välimuististaan, kuva on tuotava uudelleen; useamman solmun ympäristössä
konttirekisteri on suositeltava.

### Ulkoinen osoite ja TLS

Tavallisessa Kubernetesissa kopioi `kubernetes/ingress.example.yaml`
ympäristökohtaiseksi tiedostoksi. Vaihda molemmat esimerkkihostit oikeaksi
DNS-nimeksi ja tarvittaessa TLS-secretin nimi; lisää `ingressClassName`, jos
klusterissa ei ole oletusluokkaa. Luo namespaceen vastaava TLS-secret
varmenteesta ja avaimesta tai käytä klusterin sertifikaattihallintaa. DNS:n
pitää osoittaa Ingress-ohjaimeen ja palomuurin sallia HTTPS-liikenne.

```bash
kubectl --context="$CONTEXT" -n "$NAMESPACE" create secret tls metatietolukija-tls \
  --cert=/polku/varmenneketju.pem --key=/polku/yksityinen-avain.pem
kubectl --context="$CONTEXT" -n "$NAMESPACE" apply -f /polku/ingress.yaml
curl --fail https://metatietolukija.example.com/
curl --fail https://metatietolukija.example.com/api/health
```

Varmista Ingress-ohjaimen asetuksista, että HTTP ohjataan HTTPS:ään.
OpenShiftissä voi Ingressin sijasta käyttää arkistohaun tapaan edge-TLS-routea:

```bash
kubectl --context="$CONTEXT" -n "$NAMESPACE" apply -f infra/kubernetes/openshift-route.yaml
kubectl --context="$CONTEXT" -n "$NAMESPACE" get route frontend
```

Esimerkki käyttää routerin automaattisesti antamaa hostia ja
oletusvarmennetta. Oman DNS-nimen ja luotetun varmenteen käyttöönotto riippuu
klusterin reitittimen asetuksista. Frontend ja backend eivät muuten ole
ulkoverkossa; `smoke-test.sh` tarkistaa yhteyden Kubernetesin porttiohjauksen
kautta, mutta ei korvaa ulkoisen HTTPS-osoitteen testaamista.
Sovelluksessa ei ole käyttäjätunnistusta, joten rajoita pääsy esimerkiksi
palomuurilla, VPN:llä tai Ingressin tunnistuksella ennen ulkoista julkaisua.

## Infraskriptien testit

Skriptien ja Kubernetes-määritysten testit voi ajaa ilman klusteriyhteyttä
komennolla `node --test infra/kubernetes/tests/*.test.js`. Testit vaativat
`node`- ja `kubectl`-komennot.
