# ShadowRoute

ShadowRoute is a first-year data-structures-and-algorithms project that compares a pedestrian's shortest-distance route with a route that accounts for approximate sun exposure and flood risk. It uses Node.js, Express, plain HTML/CSS/JavaScript, Leaflet, and OpenStreetMap data. It supports selectable walking areas in major Indian cities and a separate intercity driving mode.

## Problem statement

The shortest walking route is not always the most comfortable route. ShadowRoute models the pedestrian street network as a weighted graph and offers two choices:

- **Shortest:** minimize total segment distance.
- **ShadowRoute:** minimize distance adjusted by sun-exposure and flood-risk scores.

The scores are simple approximations derived from OpenStreetMap tags, with optional per-way manual overrides. They are intended for a learning project, not safety-critical navigation.

## Edge-cost formula

For an edge of length `d` metres, sun penalty `s` in `[0, 1]`, flood penalty `f` in `[0, 1]`, and user-selected non-negative weights `w1` and `w2`, the comfort-aware cost is:

```text
cost = d × (1 + w1 × s + w2 × f)
```

Higher weights make the corresponding penalty more influential. The shortest route uses `distance` alone. ShadowRoute reports route distance, distance-weighted average sun and flood scores, and the sum of edge costs.

## Algorithms and data structures

| Structure / algorithm | Role in ShadowRoute |
|---|---|
| Adjacency-list graph (`Map`) | Stores OSM nodes and bidirectional pedestrian edges |
| Binary min-heap | Efficiently selects the next lowest-priority route candidate |
| Dijkstra | Finds minimum-cost paths; also computes the plain shortest-distance route |
| A* | Finds a minimum-cost path using haversine distance as an admissible heuristic |
| Breadth-first search (BFS) | Finds connected components and retains the largest |
| Depth-first search (DFS) | Provides an alternate connected-component traversal |
| Haversine distance | Measures distances between geographic coordinates and snaps input points to graph nodes |

## Setup and run

Requirements: a current Node.js release with built-in `fetch` support and npm.

```sh
npm install
npm run fetch-data
npm start
```

Open [http://localhost:3000](http://localhost:3000). The project includes a small hand-made `data/pilot_area.json`, so the app can start without fetching live data. `npm run fetch-data` refreshes the default sample area from Overpass; downloading live data requires an internet connection.

If port 3000 is already in use, choose another port in PowerShell before starting:

```powershell
$env:PORT = "3001"
npm start
```

Then open [http://localhost:3001](http://localhost:3001).

The city selector includes Connaught Place (sample) plus central walking areas for Delhi, Mumbai, Bengaluru, Chennai, Hyderabad, Kolkata, Pune, Ahmedabad, Jaipur, and Lucknow. These city boxes are bounded areas, not complete metropolitan boundaries. Download the OpenStreetMap data for a city before selecting it. For example:

```sh
npm run fetch-data -- --area=mumbai
npm run fetch-data -- --area=bengaluru
```

The downloaded city files are stored under `data/areas/` and are not committed to source control. The default sample area remains available for local development.

Run the built-in tests with:

```sh
npm test
```

## API

All endpoints are served by the same Express server.

### `GET /api/graph-info`

Returns the loaded graph size, configured bounding box, and default route weights.

Example:

```sh
curl http://localhost:3000/api/graph-info
```

Example response:

```json
{
  "nodeCount": 12,
  "edgeCount": 17,
  "bbox": {
    "south": 28.624,
    "west": 77.21,
    "north": 28.642,
    "east": 77.23
  },
  "defaultWeights": { "w1": 1.5, "w2": 2 }
}
```

### `GET /api/route`

Required query parameters: `fromLat`, `fromLon`, `toLat`, and `toLon`. Optional parameters: `w1` and `w2` (non-negative numbers; default to configured weights), and `algo` (`astar` or `dijkstra`; default `astar`). Coordinates are snapped to their nearest graph nodes.

```sh
curl "http://localhost:3000/api/route?fromLat=28.631&fromLon=77.215&toLat=28.635&toLon=77.221&w1=1.5&w2=2&algo=astar"
```

Example response shape (coordinates and metrics vary with the data):

```json
{
  "shortest": {
    "coordinates": [[28.631, 77.215], [28.633, 77.215]],
    "distance": 444.8,
    "avgSun": 0.6,
    "avgFlood": 0.2,
    "cost": 444.8
  },
  "shadow": {
    "coordinates": [[28.631, 77.215], [28.631, 77.217]],
    "distance": 196.2,
    "avgSun": 0.3,
    "avgFlood": 0.2,
    "cost": 342.0
  },
  "stats": {
    "dijkstra": { "nodesExplored": 10, "timeMs": 0.4 },
    "astar": { "nodesExplored": 8, "timeMs": 0.3 }
  }
}
```

Invalid input returns HTTP `400`; an unreachable pair of points returns `404`; unexpected server errors return `500`.

### `GET /api/network`

Returns up to 500 graph segments, each with two `[latitude, longitude]` coordinates and its `sunPenalty` and `floodPenalty`. `truncated` indicates whether additional segments were omitted.

```sh
curl http://localhost:3000/api/network
```

## Changing or adding a walking area

Each supported region is defined in [`config.js`](./config.js) with an ID, display name, bounding box, and data-file path. Bounds are decimal degrees. To add a city, add a reasonably sized region entry, then fetch it with `npm run fetch-data -- --area=<id>`. The fetcher uses the configured box and writes a separate file for that region. Restart the server after downloading or replacing a region's data.

The regions are independent pedestrian graphs; a walking route works only within one selected region. Do not fetch one bounding box for all of India: Overpass queries and an in-memory pedestrian graph at that scale are too large for this project.

## Intercity driving

Choose **Driving across India** and click two points on the map for driving directions. This mode calls the public OSRM demo service and does not use this project's walking graph or shade/flood scoring. The demo service is best-effort and rate-limited; for a production deployment, use a hosted or self-hosted routing service with an appropriate usage policy.

## Manual score overrides

Edit `data/manual_scores.json` as valid JSON. Keys are way IDs represented as strings; either score may be omitted to keep its tag-derived value. Values must be numbers from `0` to `1`.

```json
{
  "1001": { "sun": 0.9, "flood": 0.1 },
  "1002": { "flood": 0.8 }
}
```

Manual values override the corresponding derived score for every edge of that way. Restart the server after editing this file. JSON does not allow comments.

## Screenshots

_Screenshot placeholder: add a screenshot of the map with both routes and the comparison panel here._

## Limitations

- Sun exposure and flood risk are approximations inferred from available OSM tags, not live weather, shade, terrain, or flood measurements.
- The Overpass dataset may be incomplete, stale, or temporarily unavailable.
- Selected points are snapped to the nearest graph node; snapping distance is not currently limited.
- The sample graph is intentionally small and hand-made, not a complete street network.
- The model treats edges as bidirectional and does not currently enforce all pedestrian access rules or crossing constraints.

## Future work

- Improve shade and flood estimates with verified local data, elevation, and time-of-day inputs.
- Add maximum snap distance and clearer feedback when a selected point is far from a mapped way.
- Model one-way pedestrian access, crossings, barriers, and turn restrictions.
- Add additional automated API and browser tests and expose richer route explanations.
