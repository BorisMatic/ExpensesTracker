# Kitchen 3D model

Kitchen interior, 228 × 235 cm, traced from the floor plan and checked against a photo of the site.

- `kitchen-plan.svg`: 2D floor plan in centimetres.
- `index.html`: WebGL (three.js) 3D model with walls, a tiled floor, pipes and outlets from the photo, and the planned units.

## Open it

```sh
cd kitchen-3d
python3 -m http.server 8000
# then open http://localhost:8000
```

three.js loads from the jsDelivr CDN, so the page needs an internet connection.
The **Export .glb** button downloads the model for Blender, SketchUp and similar tools.
