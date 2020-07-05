from topojson2geojson import topojson_to_geojson
import os

topojson_to_geojson("states.topo.json", "states.geo.json")
topojson_to_geojson("counties.topo.json", "counties.geo.json")

os.system(
    "cat counties-processed.geo.json | node_modules/d3-geo-projection/bin/geoproject -r projection=./geoAlbersUsaPr.js -n 'projection().scale(1300).translate([487.5, 305])' > counties.json"
)

os.system(
    "cat states.geo.json | node_modules/d3-geo-projection/bin/geoproject -r projection=./geoAlbersUsaPr.js -n 'projection().scale(1300).translate([487.5, 305])' > states.json"
)
