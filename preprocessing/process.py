import csv
import math
import collections
import json
import struct
from datetime import datetime
import pytz


# FIP renaming
renames = {
    "02270": "02158",
    "46113": "46102",
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
        fips_id = feature["properties"]["STATE"] + feature["properties"].get(
            "COUNTY", ""
        )
        if fips_id in renames:
            fips_id = renames[fips_id]
        if feature["geometry"] is None:
            continue
        coords = feature["geometry"]["coordinates"]
        features_by_id[fips_id] = pack_coords(coords, bounds)

    return features_by_id


def int_convert(num):
    if num == " ":
        num = "0"
    return int(num.replace(",", ""))


populations = {}
state_populations = {}


def lpad(s, desired_length):
    return "0" * max(desired_length - len(s), 0) + s


# Process census populations
with open("population/co-est2018-alldata.csv", "r", encoding="latin-1") as f:
    csvreader = csv.reader(f)
    next(csvreader)  # Skip header
    for row in csvreader:
        state_fips = lpad(row[3], 2)
        county_fips = lpad(row[4], 3)
        population = int_convert(row[17])
        if county_fips == "000":
            state_populations[row[5]] = population
        else:
            combined_fips = state_fips + county_fips
            if combined_fips in renames:
                combined_fips = renames[combined_fips]
            populations[combined_fips] = population


bounds = get_bounds(["geo/states.json", "geo/counties.json"])

states_poly = process_map("geo/states.json", bounds)
county_poly = process_map("geo/counties.json", bounds)

states_by_fips = {}

# First COVID-19 case in the US
first_date = "1/22/2020"

fips_map = {}


def add_data(obj, key, state, county, data, data_type):
    if key not in obj:
        obj[key] = {
            "state": state,
            "county": county,
            "data": {data_type: data},
            "fips": key,
        }
    else:
        previous_data = obj[key]["data"].get(data_type, None)
        if previous_data is None:
            obj[key]["data"][data_type] = data
        else:
            obj[key]["data"][data_type] = [sum(x) for x in zip(previous_data, data)]


with open("all_data.json") as f:
    data = json.load(f)

    for row in data:
        county_fips = row["countyFIPS"]
        if county_fips in renames:
            county_fips = renames[county_fips]
        county = row["county"]
        state = row["stateAbbr"]
        state_fips = row["stateFIPS"]
        states_by_fips[state] = state_fips

        cases = row["confirmed"]
        deaths = row["deaths"]

        key = (state_fips, county_fips)
        add_data(fips_map, key, state, county, cases, "cases")
        add_data(fips_map, key, state, county, deaths, "deaths")

# Hack: Ensure strict less than relationship between deaths and cases
for key in fips_map:
    data = fips_map[key]["data"]
    for i in range(len(data["cases"])):
        cases = data["cases"][i]
        deaths = data["deaths"][i]
        # Only show unmatched deaths on normal FIPS codes
        if deaths > cases and key[1] != "00":
            # Assume it's an error
            print(
                f"UNMATCHED DEATHS, {deaths} deaths > {cases} cases [{i}], {fips_map[key]['county']}, {fips_map[key]['state']}"
            )
            data["deaths"][i] = cases


# Organize into states/counties
states = collections.defaultdict(list)
for x in fips_map.values():
    states[x["state"]].append(x)

with open("last_updated.txt", "r") as f:
    last_updated = f.read().strip()

# # Get last updated time
# def floor_dt(dt, interval):
#     # Courtesy of https://stackoverflow.com/a/56387775
#     replace = (dt.minute // interval) * interval
#     return dt.replace(minute=replace, second=0, microsecond=0)


# dt = floor_dt(datetime.now(tz=pytz.utc), 30).astimezone(timezone("US/Pacific"))
# last_updated = dt.strftime("%b %d, %Y at %I:%M %p %Z").replace(" 0", " ")


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

    def out_poly(p, population=None):
        while position % 4 != 0:
            write(b" ")
        write(struct.pack("i", len(p) // 2))
        if len(p) > 0:
            write(struct.pack("i", population))
        write(p)
        write(b"\n")

    out_str(last_updated)
    out_str(first_date)
    for state in states:
        counties = states[state]
        counties = sorted(counties, key=lambda x: x["county"])
        out_str(">" + state + "-" + shortcodes[state])
        population = state_populations[shortcodes[state]]
        out_poly(states_poly[states_by_fips[state]], population)

        for row in counties:
            county = row["county"]
            county_fips = row["fips"][1]
            confirmed_data = row["data"]["cases"]
            deaths_data = row["data"]["deaths"]
            if county.endswith(SUFFIX):
                county = county[: -len(SUFFIX)]
            out_str(county)

            if (
                county_fips == "00"
                or county.lower() == "new york city unallocated"
                or county_fips == "06000"  # Grand Princess Cruise Ship
            ):
                out_poly(b"")
            else:
                population = populations[county_fips]
                out_poly(county_poly[county_fips], population)
            out_str(display_nums(process_runs(confirmed_data)))
            out_str(display_nums(process_runs(deaths_data)))

print("---\nSUCCESSFULLY WROTE output.bin")
