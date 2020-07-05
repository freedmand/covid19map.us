# Special processing to convert NYT format into appropriate JSON format

import csv
import collections
import json
from datetime import date

    def nyt_process():
    historical_fn = "historical.csv"
    live_fn = "live.csv"

    counts = collections.defaultdict(collections.Counter)
    places = collections.OrderedDict()

    start_date = date(2020, 1, 21)
    max_day = 0

    with open(historical_fn) as f:
        reader = csv.reader(f)
        next(reader)
        for row in reader:
            timestamp, county, state, fips, cases, deaths = row
            cases, deaths = int(cases), int(deaths)
            day_offset = (date(*map(int, timestamp.split("-"))) - start_date).days
            if day_offset > max_day:
                max_day = day_offset
            key = (county, state, fips)
            places[key] = True
            counts[key][day_offset] = (cases, deaths)

    puerto_rico_totals = [0, 0]

    with open(live_fn) as f:
        reader = csv.reader(f)
        next(reader)
        for row in reader:
            timestamp, county, state, fips, cases, deaths = row[:6]
            if state == "Puerto Rico":
                # For some reason Puerto Rico is split up only in live data.
                # Here, we consolidate it to make it match historical data.
                if cases == "":
                    cases = 0
                if deaths == "":
                    deaths = 0
                puerto_rico_totals[0] += int(cases)
                puerto_rico_totals[1] += int(deaths)
                cases, deaths = puerto_rico_totals
                county = "Unknown"
                fips = ""
            else:
                cases, deaths = int(cases), int(deaths)
            day_offset = max_day + 1
            key = (county, state, fips)
            places[key] = True
            counts[key][day_offset] = (cases, deaths)

    data = []
    for key in places:
        row_data = []
        for i in range(max_day + 2):
            value = counts[key][i]
            if value == 0:
                value = (0, 0)
            row_data.append(value)
        data.append(
            {
                "countyFIPS": key[2],
                "county": key[0],
                "state": key[1],
                "confirmed": [x[0] for x in row_data],
                "deaths": [x[1] for x in row_data],
            }
        )
        # Fix Puerto Rico deaths if 0
        if data[-1]["state"] == "Puerto Rico" and data[-1]["deaths"][-1] == 0:
            data[-1]["deaths"][-1] = data[-1]["deaths"][-2]

    with open("nyt_data.json", "w") as f:
        json.dump(data, f)

if __name__ == '__main__':
    nyt_process()
