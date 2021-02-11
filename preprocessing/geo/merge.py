import json
import shapely.geometry


def merge_geojson():
    with open("counties.geo.json", "r") as f:
        geo = json.load(f)
    features = geo["features"]

    # merges
    merges = [
        [
            ("02", "060"),
            ("02", "164"),
            "Bristol Bay plus Lake and Peninsula",
            ("02", "997"),
        ],
        [
            ("02", "282"),
            ("02", "105"),
            "Yakutat plus Hoonah-Angoon",
            ("02", "998"),
        ],
    ]

    def lookup(state_fips, county_fips):
        feature = [
            x
            for x in features
            if x["properties"]["STATE"] == state_fips
            and x["properties"]["COUNTY"] == county_fips
        ]
        assert len(feature) == 1, f"{feature}, {state_fips}, {county_fips}"
        return feature[0]

    for merge in merges:
        place1 = lookup(*merge[0])
        place2 = lookup(*merge[1])
        shape1 = shapely.geometry.asShape(place1["geometry"])
        shape2 = shapely.geometry.asShape(place2["geometry"])
        merged_shape = shape1.union(shape2)
        new_geometry = json.dumps(shapely.geometry.mapping(merged_shape))
        new_feature = {
            "id": place1["id"],
            "type": "Feature",
            "properties": {
                **place1["properties"],
                "STATE": merge[3][0],
                "COUNTY": merge[3][1],
                "NAME": merge[2],
            },
            "geometry": new_geometry,
        }

        # Filter out old features
        features = [
            x
            for x in features
            if (
                x["properties"]["STATE"] != merge[0][0]
                or x["properties"]["COUNTY"] != merge[0][1]
            )
            and (
                x["properties"]["STATE"] != merge[1][0]
                or x["properties"]["COUNTY"] != merge[1][1]
            )
        ]
        # Add in new feature
        features.append(new_feature)

    geo["features"] = features

    with open("counties.geo.json", "w") as f:
        f.write(json.dumps(geo))
