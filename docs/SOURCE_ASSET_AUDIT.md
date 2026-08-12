# Source ZIP audit

Audited source: `saveweb2zip-com-aihairstyles-com (2).zip` supplied with the task.

## Findings used as product/UX reference

- Content-rich long-form landing rather than a one-screen generator.
- Clear good/bad portrait guidance close to upload.
- Long product demo video with a poster/lazy-loading opportunity.
- Face-shape content as a style education concept.
- Hairstyle/color examples, FAQ, pricing, trust and privacy UI.
- Mobile-first guided product flow.

The new site does **not** copy the reference brand, pink/orange UI, pricing model, screen-recorded interface, logo, wording, or page structure verbatim.

## Source media analyzed

Reference demo MP4:

```text
codec: H.264 + AAC
size: ~9.5 MB
resolution: 524×1080
length: ~112.3 s
```

Reference WEBM variant:

```text
codec: VP9 + Opus
size: ~6.7 MB
resolution: 524×1080
length: ~112.4 s
```

The screen recording visibly contains the competitor domain/brand and therefore is not shipped in the public project.

Reference face-shape graphic:

```text
500×500 PNG
```

It contains a competitor-specific annotated portrait and explanatory copy. The public HairLook AI site replaces it with an original CSS/SVG-style educational illustration and avoids automatic biometric claims.

## Photo guidance assets retained

The master specification explicitly asks to integrate these source assets:

```text
public/media/upload-good-1.png
public/media/upload-good-2.png
public/media/upload-bad-1.png
public/media/upload-bad-2.png
```

They are used only for photo quality guidance. For more editorial sections, cropped derivatives are used:

```text
public/media/style-portrait-1.jpg
public/media/style-portrait-2.jpg
public/media/style-portrait-3.jpg
public/media/style-portrait-4.jpg
```

### Commercial rights checkpoint

Technical inclusion is not proof of a commercial image license. Before launch, confirm that the operator has rights to use the supplied source photographs and any derivative stills/montage. If not, replace `upload-*`, `style-portrait-*`, `product-tour.mp4` and its poster with owned or commercially licensed media; filenames and layout can remain unchanged. The application intentionally treats these as replaceable presentation assets, not as evidence of generated customer results.

## Replacement product demo

Instead of embedding the competitor-branded 112-second screen recording, the project ships:

```text
public/media/product-tour.mp4
public/media/product-tour-poster.jpg
```

It is a lightweight, brand-neutral visual montage derived from supplied reference visuals and is lazy-loaded below the fold. It remains subject to the commercial-rights checkpoint above.
