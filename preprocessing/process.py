import csv
import math
import collections
import json
import struct

states = collections.defaultdict(list)

# Custom FIPS
custom_fips = [
    ["New York City Unallocated", "NY", "9900001"],
]

# Renames
renames = {
    2270: [2158, "Kusilvak"],
    46113: [46102, "Oglala Lakota"],
    51515: [51019],  # Bedford County -> Bedford City
}


shortcodes = {
    "AK": "Alaska",
    "AL": "Alabama",
    "AR": "Arkansas",
    "AZ": "Arizona",
    "CA": "California",
    "CO": "Colorado",
    "CT": "Connecticut",
    "DC": "District of Columbia",
    "DE": "Delaware",
    "FL": "Florida",
    "GA": "Georgia",
    "HI": "Hawaii",
    "IA": "Iowa",
    "ID": "Idaho",
    "IL": "Illinois",
    "IN": "Indiana",
    "KS": "Kansas",
    "KY": "Kentucky",
    "LA": "Louisiana",
    "MA": "Massachusetts",
    "MD": "Maryland",
    "ME": "Maine",
    "MI": "Michigan",
    "MN": "Minnesota",
    "MO": "Missouri",
    "MS": "Mississippi",
    "MT": "Montana",
    "NC": "North Carolina",
    "ND": "North Dakota",
    "NE": "Nebraska",
    "NH": "New Hampshire",
    "NJ": "New Jersey",
    "NM": "New Mexico",
    "NV": "Nevada",
    "NY": "New York",
    "OH": "Ohio",
    "OK": "Oklahoma",
    "OR": "Oregon",
    "PA": "Pennsylvania",
    "RI": "Rhode Island",
    "SC": "South Carolina",
    "SD": "South Dakota",
    "TN": "Tennessee",
    "TX": "Texas",
    "UT": "Utah",
    "VA": "Virginia",
    "VT": "Vermont",
    "WA": "Washington",
    "WI": "Wisconsin",
    "WV": "West Virginia",
    "WY": "Wyoming",
}


def depth(l):
    if not isinstance(l, list) or len(l) == 0:
        return 0
    return 1 + depth(l[0])


def is_clockwise(coords):
    # From https://stackoverflow.com/a/1165943
    total = 0
    for i in range(len(coords)):
        x1 = coords[i]["x"]
        x2 = coords[(i + 1) % len(coords)]["x"]
        y1 = coords[i]["y"]
        y2 = coords[(i + 1) % len(coords)]["y"]
        total += (x2 - x1) * (y2 + y1)
    return total >= 0


def pack_simple_coords(coords, bounds):
    [x_min, x_max, y_min, y_max] = bounds
    width = x_max - x_min
    height = y_max - y_min
    max_scale = max(width, height)

    result = b""
    for coord in coords:
        x = math.floor((coord["x"] - x_min) / (max_scale) * (256 * 256 - 1))
        y = math.floor((coord["y"] - y_min) / (max_scale) * (256 * 256 - 1))
        result += struct.pack("2H", x, y)
    return result


def pack_coords(coords, bounds, is_hole=False):
    if depth(coords) > 2:
        results = b""
        for i, coord in enumerate(coords):
            results = results + pack_coords(coord, bounds, is_hole=i != 0)
        return results

    results = []

    for x, y in coords:
        results.append({"x": x, "y": y})

    if is_hole:
        # Force hole to be CCW
        if is_clockwise(results):
            results = results[::-1]
    else:
        # Force non-hole to be CW
        if not is_clockwise(results):
            results = results[::-1]

    # Ensure closed loop
    if results[0]["x"] != results[-1]["x"] or results[0]["y"] != results[-1]["y"]:
        results.append(results[0])

    return pack_simple_coords(results, bounds)


def get_bounds(maps):
    x_min = None
    y_min = None
    x_max = None
    y_max = None

    def process_coords(coords):
        nonlocal x_min
        nonlocal y_min
        nonlocal x_max
        nonlocal y_max

        if depth(coords) > 2:
            for coord in coords:
                process_coords(coord)
            return

        for x, y in coords:
            if x_min is None or x < x_min:
                x_min = x
            if x_max is None or x > x_max:
                x_max = x
            if y_min is None or y < y_min:
                y_min = y
            if y_max is None or y > y_max:
                y_max = y

    for fn in maps:
        with open(fn) as f:
            contents = json.load(f)

        for feature in contents["features"]:
            if feature["geometry"] is None:
                continue
            coords = feature["geometry"]["coordinates"]
            process_coords(coords)

    return [x_min, x_max, y_min, y_max]


def process_map(fn, bounds):
    with open(fn) as f:
        contents = json.load(f)

    features_by_id = {}
    for feature in contents["features"]:
        fips_id = int(
            feature["properties"]["STATE"] + feature["properties"].get("COUNTY", "")
        )
        if feature["geometry"] is None:
            continue
        coords = feature["geometry"]["coordinates"]
        features_by_id[fips_id] = pack_coords(coords, bounds)

    return features_by_id


def int_convert(num):
    if num == " ":
        num = "0"
    return int(num.replace(",", ""))


bounds = get_bounds(["geo/states.json", "geo/counties.json"])

states_poly = process_map("geo/states.json", bounds)
county_poly = process_map("geo/counties.json", bounds)

states_by_fips = {}

with open("covid_confirmed_usafacts.csv", "r", encoding="latin-1") as confirmed_file:
    with open("covid_deaths_usafacts.csv", "r", encoding="latin-1") as deaths_file:
        confirmed_reader = csv.reader(confirmed_file)
        deaths_reader = csv.reader(deaths_file)

        skip_header = True
        for confirmed_row in confirmed_reader:
            if skip_header:
                # First day in the dataset
                # Subsequent columns are subsequent days
                first_date = confirmed_row[4]
                num_dates = len(
                    [datum for datum in confirmed_row[4:] if len(datum.strip()) > 0]
                )
                skip_header = False
                continue

            county_fips = int_convert(confirmed_row[0])
            county = confirmed_row[1]
            state = confirmed_row[2].strip()
            state_fips = int_convert(confirmed_row[3])
            confirmed_counts = [
                int_convert(x) for x in confirmed_row[4 : 4 + num_dates]
            ]
            if county_fips != 0 and all(count == 0 for count in confirmed_counts):
                continue

            # Map FIPS
            for mapped_county, mapped_state, new_fips in custom_fips:
                if county.lower() == mapped_county.lower() and state == mapped_state:
                    county_fips = new_fips

            # Renames
            if county_fips in renames:
                rename_data = renames[county_fips]
                county_fips = rename_data[0]
                if len(rename_data) == 2:
                    county = rename_data[1]

            found = False
            for old_county, old_county_fips, _ in states[state]:
                if county == old_county and county_fips == old_county_fips:
                    found = True
                    states[state][2] = [
                        sum(x) for x in zip(states[state][2], confirmed_counts)
                    ]

            if not found:
                states[state].append([county, county_fips, confirmed_counts])

            states_by_fips[state] = state_fips

        skip_header = True
        for deaths_row in deaths_reader:
            if skip_header:
                skip_header = False
                continue

            if deaths_row[0].strip() == "":
                continue
            deaths_county, state, county_fips = (
                deaths_row[1],
                deaths_row[2].strip(),
                int_convert(deaths_row[0]),
            )
            deaths_counts = [int_convert(x) for x in deaths_row[4 : 4 + num_dates]]

            # Map FIPS
            for mapped_county, mapped_state, new_fips in custom_fips:
                if (
                    deaths_county.lower() == mapped_county.lower()
                    and state == mapped_state
                ):
                    county_fips = new_fips

            # Renames
            if county_fips in renames:
                rename_data = renames[county_fips]
                county_fips = rename_data[0]
                if len(rename_data) == 2:
                    deaths_county = rename_data[1]

            found = False
            for county in states[state]:
                if county[1] == county_fips:
                    if len(county) == 3:
                        county.append(deaths_counts)
                        found = True
                    elif len(county) == 4:
                        # Sum in deaths county
                        county[3] = [sum(x) for x in zip(county[3], deaths_counts)]

            if not found:
                if not all(count == 0 for count in deaths_counts):
                    print(state, deaths_county, county_fips, deaths_counts)
                    raise Exception("non-matching death count")

        # Fill in unfound death data
        for state in states:
            for county in states[state]:
                if len(county) == 3:
                    county.append(["0"] * len(county[2]))

with open("last_updated.txt", "r") as f:
    last_updated = f.read().strip()


def expand_runs(data):
    result = []
    for i in range(0, len(data), 2):
        count, value = data[i], data[i + 1]
        for _ in range(count):
            result.append(value)
    return result


def compress_runs(data):
    for i in range(0, len(data), 2):
        total = 0
        for j in range(i, len(data), 2):
            total += data[j]
        if total + 1 < len(data) - i:
            return data[:i] + [0] + expand_runs(data[i:])

    return data


def process_runs(data):
    run = []

    runs = []

    def push_run():
        if len(run) == 0:
            return
        runs.append(len(run))
        runs.append(run[0])

    for datum in data:
        if len(run) != 0 and datum != run[-1]:
            push_run()
            run = []
        run.append(datum)

    push_run()
    return compress_runs(runs)


def display_nums(nums):
    return ",".join([str(num) for num in nums])


SUFFIX = " County"

with open("../public/output.bin", "wb") as f:
    position = 0

    def write(contents):
        global position
        f.write(contents)
        position += len(contents)

    def out_str(s):
        write((s + "\n").encode("utf8"))

    def out_poly(p):
        while position % 4 != 0:
            write(b" ")
        write(struct.pack("i", len(p) // 2))
        write(p)
        write(b"\n")

    out_str(last_updated)
    out_str(first_date)
    for state in states:
        counties = states[state]
        counties = sorted(counties, key=lambda x: x[0])
        out_str(">" + state + "-" + shortcodes[state])
        out_poly(states_poly[states_by_fips[state]])
        for county in counties:
            if len(county) != 4:
                print(county)
        for county, county_fips, confirmed_data, deaths_data in counties:
            if county.endswith(SUFFIX):
                county = county[: -len(SUFFIX)]
            out_str(county)
            if county_fips == 20710:
                county_fips = 20107  # Fix data error for Linn County, KS
            elif county_fips == 20713:
                county_fips = 20173  # Fix data error for Sedgwick County, KS
            elif county_fips == 49040:
                county_fips = 49049  # Fix data error for Utah County, UT

            if (
                county_fips == 0
                or county_fips == 6000
                or county_fips in [fips[-1] for fips in custom_fips]
            ):  # Grand Princess Cruise Ship
                out_poly(b"")
            else:
                out_poly(county_poly[county_fips])
            out_str(display_nums(process_runs(confirmed_data)))
            out_str(display_nums(process_runs(deaths_data)))
