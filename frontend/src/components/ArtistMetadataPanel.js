import {
    getAliasesByType,
    getCurrentMembers,
    getFormerMembers,
    getMeaningfulSearchHints,
    getMemberOfBands,
    getRelationValues
} from "../utils/artistMetadata";
import { formatFinnishDate } from "../utils/metadata";
import RelationList from "./RelationList";

function ArtistMetadataPanel({ artist }) {
    const legalNameAliases = getAliasesByType(artist, "Legal name");
    const artistNameAliases = getAliasesByType(artist, "Artist name");
    const searchHintAliases = getMeaningfulSearchHints(artist);
    const currentMembers = getCurrentMembers(artist);
    const formerMembers = getFormerMembers(artist).slice(0, 8);
    const memberOfBands = getMemberOfBands(artist);
    const founders = getRelationValues(artist, "founder");
    const subgroups = getRelationValues(artist, "subgroup");
    const isGroup = artist.type === "Group";
    const isPerson = artist.type === "Person";
    const beginLabel = isGroup ? "Perustettu" : isPerson ? "Syntynyt" : "Syntynyt/Perustettu";
    const endLabel = isGroup ? "Lakkautettu" : isPerson ? "Kuollut" : "Kuollut/Lakkautettu";

    return (
        <section className="panel artist-metadata-clean">
            <h2>Esittäjän lisätiedot</h2>
            <div className="artist-metadata-columns">
                <div className="artist-metadata-column">
                    <p><strong>Nimi:</strong><br />{artist.name || ""}</p>
                    {artist.type && <p><strong>Tyyppi:</strong><br />{artist.type}</p>}
                    {artist["life-span"]?.begin && (
                        <p><strong>{beginLabel}:</strong><br />{formatFinnishDate(artist["life-span"].begin)}</p>
                    )}
                    {artist["life-span"]?.end && (
                        <p><strong>{endLabel}:</strong><br />{formatFinnishDate(artist["life-span"].end)}</p>
                    )}
                    {artist.gender && isPerson && <p><strong>Sukupuoli:</strong><br />{artist.gender}</p>}
                    {legalNameAliases.length > 0 && (
                        <p><strong>Oikea (koko) nimi:</strong><br /><RelationList items={legalNameAliases} /></p>
                    )}
                    {artistNameAliases.length > 0 && (
                        <p><strong>Alias:</strong><br /><RelationList items={artistNameAliases} /></p>
                    )}
                    {searchHintAliases.length > 0 && (
                        <p><strong>Tunnetaan myös nimellä:</strong><br /><RelationList items={searchHintAliases} /></p>
                    )}
                </div>
                <div className="artist-metadata-column">
                    {artist.area?.name && <p><strong>Asuinalue:</strong><br />{artist.area.name}</p>}
                    {artist["begin-area"]?.name && <p><strong>Kotoisin:</strong><br />{artist["begin-area"].name}</p>}
                    {artist.disambiguation && <p><strong>Täsmennys:</strong><br />{artist.disambiguation}</p>}
                    {isGroup && currentMembers.length > 0 && (
                        <p><strong>Yhtyeen jäsen (tällä hetkellä):</strong><br /><RelationList members={currentMembers} /></p>
                    )}
                    {isGroup && formerMembers.length > 0 && (
                        <p><strong>Yhtyeen jäsen (entinen):</strong><br /><RelationList members={formerMembers} /></p>
                    )}
                    {isGroup && founders.length > 0 && (
                        <p><strong>Perustaja:</strong><br /><RelationList items={founders} /></p>
                    )}
                    {isGroup && subgroups.length > 0 && (
                        <p><strong>Muut projektit:</strong><br /><RelationList items={subgroups} /></p>
                    )}
                    {isPerson && memberOfBands.length > 0 && (
                        <p><strong>Yhtyeen jäsen:</strong><br /><RelationList items={memberOfBands} /></p>
                    )}
                </div>
            </div>
        </section>
    );
}

export default ArtistMetadataPanel;
