# Crediti e licenze dei materiali di terze parti

## Modello 3D del paziente

`assets/models/patient.glb` è il personaggio **"X Bot"** distribuito da Adobe Mixamo e incluso
negli esempi del progetto three.js (`examples/models/gltf/Xbot.glb`).

- Origine: <https://github.com/mrdoob/three.js/tree/dev/examples/models/gltf>
- Autore originale: Adobe Mixamo (<https://www.mixamo.com>)
- Uso: figura umana neutra a scopo didattico, senza texture, con i materiali sostituiti a runtime.
- Il file qui incluso è stato alleggerito per il telefono con `@gltf-transform/cli`
  (`dedup`, `prune`, `weld`, `simplify --ratio 0.45`, `quantize`): da 2,9 MB e 49.000 triangoli
  a 1,4 MB e 22.000 triangoli. La quantizzazione usa `KHR_mesh_quantization`, che three.js
  legge da sé senza decodificatori aggiuntivi.

La licenza Mixamo consente l'uso dei personaggi all'interno di un progetto, ma **non** la loro
ridistribuzione come asset a sé stante. Se questo diventasse un problema, il modello si sostituisce
in un passaggio solo: basta mettere un altro file glTF binario in `assets/models/patient.glb`.
Il codice misura da sé l'altezza del modello e aggancia i contenuti alle ossa dello scheletro
(nomi Mixamo: `Head`, `Neck`, `Spine`, `Spine1`, `Spine2`, `LeftHand`, `RightHand`, …), quindi non
c'è nessuna coordinata da ritoccare a mano.

Alternative già pronte, con licenza esplicita per la ridistribuzione:

- **CesiumMan** — CC BY 4.0, Cesium GS Inc.
  <https://github.com/KhronosGroup/glTF-Sample-Assets/tree/main/Models/CesiumMan>
- Qualunque figura umana rigata con scheletro Mixamo esportata da MakeHuman (mesh di base CC0).

## Librerie

- **three.js** r160.1 — licenza MIT — <https://github.com/mrdoob/three.js>
  (`vendor/three.module.js`, `vendor/GLTFLoader.js`, `vendor/BufferGeometryUtils.js`;
  in `GLTFLoader.js` è stato modificato solo il percorso di import di `BufferGeometryUtils.js`).

## Caratteri

Barlow Condensed, IBM Plex Mono e Inter, serviti da Google Fonts, tutti con licenza SIL Open Font
License 1.1. Il sito funziona anche senza rete: in quel caso il browser ricade sui caratteri di
sistema dichiarati nelle variabili CSS.

## Contenuti didattici

Gli appunti in `content/manuale.md` sono una rielaborazione personale delle lezioni del corso TSSA,
integrate con il *Manuale TSSA 2022* di Davide Bolognin (linee guida ERC 2021). Il manuale originale
non è incluso in questo repository e resta dei rispettivi autori: qui ci sono solo appunti riscritti,
con i riferimenti di pagina per chi voglia risalire alla fonte.
