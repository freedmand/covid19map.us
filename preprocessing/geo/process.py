from topojson2geojson import topojson_to_geojson
import os

topojson_to_geojson("states.topo.json", "states.geo.json")
topojson_to_geojson("counties.topo.json", "counties.geo.json")

os.system(
    "node_modules/d3-geo-projection/bin/geoproject 'd3.geoAlbersUsa()' counties.geo.json > counties.json"
)

os.system(
    "node_modules/d3-geo-projection/bin/geoproject 'd3.geoAlbersUsa()' states.geo.json > states.json"
)
